"""Runtime configuration from environment variables (no secrets in code)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    data_provider: str = field(default_factory=lambda: os.getenv("EARTH2MOON_DATA_PROVIDER", "nasa"))
    cors_origins: list[str] = field(
        default_factory=lambda: _csv(os.getenv("EARTH2MOON_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"))
    )
    # AI summaries (proposal §8.5). Provider: auto | anthropic | openai | gemini | none.
    # The API key itself is read by each provider from its standard variable
    # (ANTHROPIC_API_KEY, OPENAI_API_KEY, GEMINI_API_KEY); never put keys in code.
    ai_provider: str = field(default_factory=lambda: os.getenv("EARTH2MOON_AI_PROVIDER", "auto"))
    ai_model: str | None = field(default_factory=lambda: os.getenv("EARTH2MOON_AI_MODEL") or None)
    ai_daily_limit: int = field(default_factory=lambda: int(os.getenv("EARTH2MOON_AI_DAILY_LIMIT", "200")))


settings = Settings()
