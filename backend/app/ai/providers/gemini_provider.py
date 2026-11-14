"""Google Gemini generateContent over plain HTTP (no extra SDK dependency).

If EARTH2MOON_AI_MODEL is not set, the provider asks the API which models the
key can use and picks the newest stable "flash" model, so the free tier works
with only GEMINI_API_KEY set and nothing goes stale when Google renames models.
"""

from __future__ import annotations

import os
import re

import httpx

from .base import Generation, ProviderError

BASE = "https://generativelanguage.googleapis.com/v1beta"
_UNSTABLE = ("preview", "exp", "experimental", "tts", "image", "audio", "live", "thinking", "embedding", "lite")


def _version(name: str) -> tuple[float, ...]:
    m = re.search(r"gemini-(\d+(?:\.\d+)?)", name)
    return (float(m.group(1)),) if m else (0.0,)


def rank_models(models: list[dict]) -> list[str]:
    """Candidate models, best first: stable flash (newest first), then other flash, then the rest."""
    usable = [
        m["name"].removeprefix("models/")
        for m in models
        if "generateContent" in m.get("supportedGenerationMethods", []) and m.get("name", "").startswith("models/gemini")
    ]
    order = lambda n: (_version(n), -len(n))  # newest first; among equals the short alias first  # noqa: E731
    stable_flash = sorted((n for n in usable if "flash" in n and not any(t in n for t in _UNSTABLE)), key=order, reverse=True)
    other_flash = sorted((n for n in usable if "flash" in n and n not in stable_flash), key=order, reverse=True)
    rest = sorted((n for n in usable if "flash" not in n), key=order, reverse=True)
    return stable_flash + other_flash + rest


def pick_model(models: list[dict]) -> str | None:
    ranked = rank_models(models)
    return ranked[0] if ranked else None


# A listed model can still be unavailable to a key (e.g. a brand-new model overloaded
# or not served on the free tier). These statuses mean "try the next candidate".
_TRY_NEXT = {404, 429, 500, 503}
MAX_CANDIDATES = 4


class GeminiProvider:
    name = "gemini"

    def __init__(self, model: str | None, timeout_s: float = 60.0):
        self._key = os.getenv("GEMINI_API_KEY", "")
        self._timeout = timeout_s
        if not self._key:
            raise ProviderError("GEMINI_API_KEY is not set.")
        # An explicitly configured model is used as-is; otherwise try discovered candidates in order.
        self._candidates = [model] if model else self._discover_models()
        self.model = self._candidates[0]

    def _discover_models(self) -> list[str]:
        try:
            r = httpx.get(f"{BASE}/models", headers={"x-goog-api-key": self._key}, params={"pageSize": 200}, timeout=self._timeout)
        except httpx.HTTPError as e:
            raise ProviderError("Could not reach the Gemini API to list models.", retryable=True) from e
        if r.status_code in (400, 401, 403):
            raise ProviderError("Gemini rejected the API key (check GEMINI_API_KEY).")
        if r.status_code >= 400:
            raise ProviderError(f"Gemini model list failed ({r.status_code}).", retryable=r.status_code >= 500)
        ranked = rank_models(r.json().get("models", []))
        if not ranked:
            raise ProviderError("No Gemini text model is available for this key; set EARTH2MOON_AI_MODEL.")
        return ranked[:MAX_CANDIDATES]

    def _post(self, model: str, system: str, user: str) -> httpx.Response:
        return httpx.post(
            f"{BASE}/models/{model}:generateContent",
            headers={"x-goog-api-key": self._key},
            json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": user}]}],
            },
            timeout=self._timeout,
        )

    def generate(self, system: str, user: str) -> Generation:
        # Start with the model that last worked, then the remaining candidates.
        order = [self.model] + [m for m in self._candidates if m != self.model]
        r = None
        for model in order:
            try:
                r = self._post(model, system, user)
            except httpx.HTTPError as e:
                raise ProviderError("Could not reach the Gemini API.", retryable=True) from e
            if r.status_code in (401, 403):
                raise ProviderError("Gemini rejected the API key.")
            if r.status_code in _TRY_NEXT:
                continue
            self.model = model  # remember the model that answered
            break
        assert r is not None
        if r.status_code == 429:
            raise ProviderError("Gemini free-tier limit reached for now; try again in a minute.", retryable=True)
        if r.status_code >= 400:
            raise ProviderError(
                f"Gemini is unavailable right now ({r.status_code}) for all {len(order)} candidate models; try again later.",
                retryable=r.status_code >= 500,
            )
        try:
            parts = r.json()["candidates"][0]["content"]["parts"]
            # Skip any "thought" parts some models return; keep the answer text.
            text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
        except (KeyError, IndexError, ValueError) as e:
            raise ProviderError("Gemini returned no usable text (possibly blocked by its safety filters).") from e
        if not text:
            raise ProviderError("Gemini returned no text.", retryable=True)
        return Generation(text=text, provider=self.name, model=self.model)
