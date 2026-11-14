"""Data-provider interface.

>>> THIS IS WHERE REAL DATASETS WILL BE CONNECTED. <<<

The rest of the application (similarity engine, API, frontend) depends only on
this interface. To integrate the project datasets:

1. Implement a new class (e.g. ``RasterDataProvider`` in ``providers/raster.py``)
   that satisfies ``DataProvider``. Its job is to turn files (DEMs, imagery,
   geological maps, ...) into ``Measurement`` objects keyed by feature id
   (see ``engine/features.py``) and optional ``TerrainSummary`` distributions.
2. Register it in ``providers/registry.py``.
3. Select it with the ``EARTH2MOON_DATA_PROVIDER`` environment variable.

No assumption is made here about file formats, projections or variable names:
those decisions belong inside the concrete provider once the files are known.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol

from ..engine.similarity import Measurement

Body = Literal["moon", "mars"]
DataStatus = Literal["demo", "real"]


@dataclass(frozen=True)
class Dataset:
    id: str
    name: str
    body: Literal["moon", "mars", "earth"]
    instrument: str
    product: str
    nominal_resolution_m: float | None
    source: str
    url: str
    status: Literal["planned", "imagery_only", "connected"]
    notes: str = ""


@dataclass(frozen=True)
class TargetRegion:
    id: str
    body: Body
    name: str
    region_type: str
    lat: float
    lon: float
    description: str
    data_status: DataStatus
    measurements: dict[str, Measurement] = field(default_factory=dict)


@dataclass(frozen=True)
class CandidateSite:
    id: str
    name: str
    country: str
    lat: float
    lon: float
    relevant_bodies: tuple[str, ...]
    description: str
    terrain: tuple[str, ...]
    potential_comparison: str
    applications: tuple[str, ...]
    caution: str
    data_status: DataStatus
    data_quality: str
    measurements: dict[str, Measurement] = field(default_factory=dict)


@dataclass(frozen=True)
class Histogram:
    unit: str
    bin_edges: list[float]
    counts: list[float]  # fraction of area per bin, sums to 1


@dataclass(frozen=True)
class TerrainSummary:
    entity_id: str
    provenance: str
    elevation_histogram: Histogram
    slope_histogram: Histogram
    profile_distance_m: list[float]
    profile_elevation_m: list[float]


class DataProvider(Protocol):
    name: str
    mode: DataStatus

    def list_datasets(self) -> list[Dataset]: ...

    def list_targets(self, body: Body | None = None) -> list[TargetRegion]: ...

    def get_target(self, target_id: str) -> TargetRegion | None: ...

    def list_candidates(self) -> list[CandidateSite]: ...

    def get_candidate(self, site_id: str) -> CandidateSite | None: ...

    def get_terrain_summary(self, entity_id: str) -> TerrainSummary | None: ...
