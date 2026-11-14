"""AI-written report summaries (proposal §8.5), provider-agnostic.

- Provider chosen by EARTH2MOON_AI_PROVIDER (anthropic | openai | gemini | none),
  or auto-detected from whichever API key is set.
- Facts are recomputed on the server; the client's numbers are never trusted.
- Output is checked: any number not in the fact sheet rejects the summary.
- Results are cached in memory and a daily cap protects the API budget.
"""

from __future__ import annotations

import hashlib
import json
import os
import threading
from dataclasses import dataclass
from datetime import date, datetime, timezone

from ..config import settings
from .prompt import SYSTEM_PROMPT, user_message
from .providers.base import LLMProvider, ProviderError
from .verify import unverified_numbers

_KEYS = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY", "gemini": "GEMINI_API_KEY"}


class AIDisabled(RuntimeError):
    pass


class SummaryRejected(RuntimeError):
    pass


@dataclass
class Status:
    enabled: bool
    provider: str | None
    model: str | None
    reason: str | None = None


def _detect_provider() -> str | None:
    choice = settings.ai_provider.lower()
    if choice in ("none", "off", "disabled"):
        return None
    if choice in _KEYS:
        return choice
    for name, key in _KEYS.items():  # "auto": first provider whose key is set
        if os.getenv(key):
            return name
    return None


def make_provider() -> LLMProvider:
    name = _detect_provider()
    if name is None:
        raise AIDisabled("No AI provider configured. Set ANTHROPIC_API_KEY, OPENAI_API_KEY or GEMINI_API_KEY.")
    if name == "anthropic":
        from .providers.anthropic_provider import AnthropicProvider

        return AnthropicProvider(settings.ai_model)
    if name == "openai":
        from .providers.openai_provider import OpenAIProvider

        return OpenAIProvider(settings.ai_model)
    from .providers.gemini_provider import GeminiProvider

    return GeminiProvider(settings.ai_model)


class SummaryService:
    def __init__(self, provider_factory=make_provider, daily_limit: int | None = None):
        self._factory = provider_factory
        self._provider: LLMProvider | None = None
        self._cache: dict[str, dict] = {}
        self._lock = threading.Lock()
        self._day = date.today()
        self._count = 0
        self._limit = settings.ai_daily_limit if daily_limit is None else daily_limit

    def _get_provider(self) -> LLMProvider:
        if self._provider is None:
            try:
                self._provider = self._factory()
            except ProviderError as e:
                raise AIDisabled(str(e)) from e
        return self._provider

    def status(self) -> Status:
        try:
            p = self._get_provider()
        except AIDisabled as e:
            return Status(False, None, None, str(e))
        return Status(True, p.name, p.model)

    def summarize(self, facts: dict) -> dict:
        key = hashlib.sha256(json.dumps(facts, sort_keys=True).encode()).hexdigest()
        with self._lock:
            if key in self._cache:
                return self._cache[key] | {"cached": True}
            if date.today() != self._day:
                self._day, self._count = date.today(), 0
            if self._count >= self._limit:
                raise AIDisabled(f"Daily AI summary limit ({self._limit}) reached; try again tomorrow.")
            self._count += 1
        provider = self._get_provider()
        gen = provider.generate(SYSTEM_PROMPT, user_message(facts))
        bad = unverified_numbers(gen.text, facts)
        if bad:
            raise SummaryRejected(
                "The AI summary was discarded because it contained numbers not present in the computed data: "
                + ", ".join(f"{b:g}" for b in bad[:5])
            )
        out = {
            "summary": gen.text,
            "provider": gen.provider,
            "model": gen.model,
            "verified": True,
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "cached": False,
        }
        with self._lock:
            self._cache[key] = out
        return out


service = SummaryService()
