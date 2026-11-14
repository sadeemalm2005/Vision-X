"""OpenAI Chat Completions over plain HTTP (no extra SDK dependency)."""

from __future__ import annotations

import os

import httpx

from .base import Generation, ProviderError

URL = "https://api.openai.com/v1/chat/completions"


class OpenAIProvider:
    name = "openai"

    def __init__(self, model: str | None, timeout_s: float = 60.0):
        if not model:
            raise ProviderError("Set EARTH2MOON_AI_MODEL to an OpenAI model name (see platform.openai.com/docs/models).")
        self.model = model
        self._key = os.getenv("OPENAI_API_KEY", "")
        self._timeout = timeout_s

    def generate(self, system: str, user: str) -> Generation:
        try:
            r = httpx.post(
                URL,
                headers={"Authorization": f"Bearer {self._key}"},
                json={"model": self.model, "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]},
                timeout=self._timeout,
            )
        except httpx.HTTPError as e:
            raise ProviderError("Could not reach the OpenAI API.", retryable=True) from e
        if r.status_code == 401:
            raise ProviderError("OpenAI rejected the API key.")
        if r.status_code == 429:
            raise ProviderError("OpenAI rate limit or quota reached.", retryable=True)
        if r.status_code >= 400:
            raise ProviderError(f"OpenAI API error ({r.status_code}).", retryable=r.status_code >= 500)
        try:
            text = (r.json()["choices"][0]["message"]["content"] or "").strip()
        except (KeyError, IndexError, ValueError) as e:
            raise ProviderError("Unexpected OpenAI response.") from e
        if not text:
            raise ProviderError("OpenAI returned no text.", retryable=True)
        return Generation(text=text, provider=self.name, model=self.model)
