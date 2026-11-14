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


def pick_model(models: list[dict]) -> str | None:
    """Newest stable Gemini *flash* model that supports generateContent."""
    usable = [
        m["name"].removeprefix("models/")
        for m in models
        if "generateContent" in m.get("supportedGenerationMethods", []) and m.get("name", "").startswith("models/gemini")
    ]
    stable_flash = [n for n in usable if "flash" in n and not any(t in n for t in _UNSTABLE)]
    pool = stable_flash or [n for n in usable if "flash" in n] or usable
    if not pool:
        return None
    # Prefer the highest version; among equals prefer the shortest (alias like "gemini-X-flash").
    return sorted(pool, key=lambda n: (_version(n), -len(n)))[-1]


class GeminiProvider:
    name = "gemini"

    def __init__(self, model: str | None, timeout_s: float = 60.0):
        self._key = os.getenv("GEMINI_API_KEY", "")
        self._timeout = timeout_s
        if not self._key:
            raise ProviderError("GEMINI_API_KEY is not set.")
        self.model = model or self._discover_model()

    def _discover_model(self) -> str:
        try:
            r = httpx.get(f"{BASE}/models", headers={"x-goog-api-key": self._key}, params={"pageSize": 200}, timeout=self._timeout)
        except httpx.HTTPError as e:
            raise ProviderError("Could not reach the Gemini API to list models.", retryable=True) from e
        if r.status_code in (400, 401, 403):
            raise ProviderError("Gemini rejected the API key (check GEMINI_API_KEY).")
        if r.status_code >= 400:
            raise ProviderError(f"Gemini model list failed ({r.status_code}).", retryable=r.status_code >= 500)
        model = pick_model(r.json().get("models", []))
        if not model:
            raise ProviderError("No Gemini text model is available for this key; set EARTH2MOON_AI_MODEL.")
        return model

    def generate(self, system: str, user: str) -> Generation:
        try:
            r = httpx.post(
                f"{BASE}/models/{self.model}:generateContent",
                headers={"x-goog-api-key": self._key},
                json={
                    "systemInstruction": {"parts": [{"text": system}]},
                    "contents": [{"role": "user", "parts": [{"text": user}]}],
                },
                timeout=self._timeout,
            )
        except httpx.HTTPError as e:
            raise ProviderError("Could not reach the Gemini API.", retryable=True) from e
        if r.status_code in (401, 403):
            raise ProviderError("Gemini rejected the API key.")
        if r.status_code == 429:
            raise ProviderError("Gemini free-tier limit reached for now; try again in a minute.", retryable=True)
        if r.status_code >= 400:
            raise ProviderError(f"Gemini API error ({r.status_code}).", retryable=r.status_code >= 500)
        try:
            parts = r.json()["candidates"][0]["content"]["parts"]
            # Skip any "thought" parts some models return; keep the answer text.
            text = "".join(p.get("text", "") for p in parts if not p.get("thought")).strip()
        except (KeyError, IndexError, ValueError) as e:
            raise ProviderError("Gemini returned no usable text (possibly blocked by its safety filters).") from e
        if not text:
            raise ProviderError("Gemini returned no text.", retryable=True)
        return Generation(text=text, provider=self.name, model=self.model)
