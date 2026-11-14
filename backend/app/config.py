"""Runtime configuration from environment variables (no secrets in code)."""

from __future__ import annotations

import os
from dataclasses import dataclass, field


def _csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


@dataclass(frozen=True)
class Settings:
    data_provider: str = field(default_factory=lambda: os.getenv("EARTH2MOON_DATA_PROVIDER", "nasa"))
    data_dir: str = field(default_factory=lambda: os.getenv("EARTH2MOON_DATA_DIR", "./data"))
    cors_origins: list[str] = field(
        default_factory=lambda: _csv(os.getenv("EARTH2MOON_CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173"))
    )


settings = Settings()
