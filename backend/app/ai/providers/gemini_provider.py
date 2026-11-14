"""Google Gemini generateContent over plain HTTP (no extra SDK dependency)."""

from __future__ import annotations

import os

import httpx

from .base import Generation, ProviderError

URL = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


class GeminiProvider:
    name = "gemini"

    def __init__(self, model: str | None, timeout_s: float = 60.0):
        if not model:
            raise ProviderError("Set EARTH2MOON_AI_MODEL to a Gemini model name (see ai.google.dev/gemini-api/docs/models).")
        self.model = model
        self._key = os.getenv("GEMINI_API_KEY", "")
        self._timeout = timeout_s

    def generate(self, system: str, user: str) -> Generation:
        try:
            r = httpx.post(
                URL.format(model=self.model),
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
            raise ProviderError("Gemini rate limit or free-tier quota reached.", retryable=True)
        if r.status_code >= 400:
            raise ProviderError(f"Gemini API error ({r.status_code}).", retryable=r.status_code >= 500)
        try:
            parts = r.json()["candidates"][0]["content"]["parts"]
            text = "".join(p.get("text", "") for p in parts).strip()
        except (KeyError, IndexError, ValueError) as e:
            raise ProviderError("Gemini returned no usable text (possibly blocked by its safety filters).") from e
        if not text:
            raise ProviderError("Gemini returned no text.", retryable=True)
        return Generation(text=text, provider=self.name, model=self.model)
