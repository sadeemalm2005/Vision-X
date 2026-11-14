"""Data-provider interface: the seam between datasets and the rest of the app.

The engine, API and frontend depend only on this interface. The active
implementation is ``NasaDataProvider`` (providers/nasa.py), which serves
features precomputed by ``app/pipeline/build.py`` from the project datasets.
To add data (e.g. more NASADEM tiles), extend the pipeline and rebuild; to
plug in a different source entirely, implement this protocol and register it
in providers/registry.py.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal, Protocol

from ..engine.similarity import Measurement

Body = Literal["moon", "mars"]


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
class ScaleProfile:
    id: str
    name: str
    grid_m: float
    window_m: float
    stride_m: float
    description: str


@dataclass(frozen=True)
class TargetRegion:
    id: str
    body: Body
    name: str
    region_type: str
    lat: float
    lon: float
    description: str
    scale_profile: str
    window_m: float
    image: dict
    measurements: dict[str, Measurement] = field(default_factory=dict)
    data_status: str = "real"
    cluster: int | None = None


@dataclass(frozen=True)
class Site:
    """A named research location (catalogue entry, no measurements of its own)."""

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
    tiles: tuple[str, ...]
    suggested_tile: str | None = None

    @property
    def data_status(self) -> str:
        return "real" if self.tiles else "no_data"


@dataclass(frozen=True)
class EarthPatch:
    """One analysis window on Earth: the unit that is scored and ranked."""

    id: str
    name: str
    site_id: str
    tile_id: str
    scale_profile: str
    lat: float
    lon: float
    bounds: tuple[tuple[float, float], tuple[float, float]]
    image_box: tuple[float, float, float, float]
    measurements: dict[str, Measurement] = field(default_factory=dict)
    cluster: int | None = None


@dataclass(frozen=True)
class Histogram:
    unit: str
    bin_edges: list[float]
    counts: list[float]


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
    mode: str

    def list_datasets(self) -> list[Dataset]: ...
    def list_profiles(self) -> list[ScaleProfile]: ...
    def list_targets(self, body: Body | None = None) -> list[TargetRegion]: ...
    def get_target(self, target_id: str) -> TargetRegion | None: ...
    def list_sites(self) -> list[Site]: ...
    def get_site(self, site_id: str) -> Site | None: ...
    def list_patches(self, scale_profile: str) -> list[EarthPatch]: ...
    def get_terrain_summary(self, entity_id: str) -> TerrainSummary | None: ...
    def map_layers(self) -> dict: ...
    def ml_model(self, scale_profile: str) -> dict | None: ...
