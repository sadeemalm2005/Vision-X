"""Selects the active data provider from configuration."""

from __future__ import annotations

from functools import lru_cache

from ..config import settings
from .base import DataProvider
from .demo import DemoDataProvider

# Register real providers here once implemented, e.g.
#   "raster": lambda: RasterDataProvider(settings.data_dir),
_PROVIDERS = {
    "demo": DemoDataProvider,
}


@lru_cache
def get_provider() -> DataProvider:
    try:
        factory = _PROVIDERS[settings.data_provider]
    except KeyError as exc:
        raise RuntimeError(
            f"Unknown EARTH2MOON_DATA_PROVIDER '{settings.data_provider}'. Available: {', '.join(_PROVIDERS)}"
        ) from exc
    return factory()
