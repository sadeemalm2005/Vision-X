"""Demonstration data provider.

Serves the hand-authored SYNTHETIC values in ``app/data/demo``. Every
measurement it returns carries ``provenance="synthetic_demo"`` so the API and
UI can label it. Terrain distributions are generated procedurally from the
synthetic summary values purely so the charts have something to draw; they are
not terrain data.

Replace with a real provider (see ``providers/base.py``) once datasets arrive.
"""

from __future__ import annotations

import json
import math
import random
from functools import cached_property
from pathlib import Path

from ..engine.similarity import Measurement
from .base import Body, CandidateSite, Dataset, Histogram, TargetRegion, TerrainSummary

DEMO_DIR = Path(__file__).resolve().parent.parent / "data" / "demo"
PROVENANCE = "synthetic_demo"


class DemoDataProvider:
    name = "demo"
    mode = "demo"

    def __init__(self, data_dir: Path = DEMO_DIR) -> None:
        self._dir = data_dir

    # ------------------------------------------------------------------ loading

    def _load(self, filename: str) -> dict:
        with open(self._dir / filename, encoding="utf-8") as fh:
            return json.load(fh)

    @cached_property
    def _datasets(self) -> dict[str, Dataset]:
        raw = self._load("datasets.json")["datasets"]
        return {d["id"]: Dataset(**d) for d in raw}

    def _measurements(self, raw: dict[str, dict]) -> dict[str, Measurement]:
        out: dict[str, Measurement] = {}
        for fid, m in raw.items():
            ds = self._datasets.get(m["dataset"])
            if ds is None:
                raise ValueError(f"Measurement references unknown dataset '{m['dataset']}'")
            out[fid] = Measurement(
                value=m["value"],
                resolution_m=ds.nominal_resolution_m,
                dataset_id=ds.id,
                provenance=PROVENANCE,
            )
        return out

    @cached_property
    def _targets(self) -> dict[str, TargetRegion]:
        out = {}
        for t in self._load("targets.json")["targets"]:
            out[t["id"]] = TargetRegion(
                id=t["id"],
                body=t["body"],
                name=t["name"],
                region_type=t["region_type"],
                lat=t["lat"],
                lon=t["lon"],
                description=t["description"],
                data_status="demo",
                measurements=self._measurements(t["measurements"]),
            )
        return out

    @cached_property
    def _candidates(self) -> dict[str, CandidateSite]:
        out = {}
        for c in self._load("candidates.json")["candidates"]:
            out[c["id"]] = CandidateSite(
                id=c["id"],
                name=c["name"],
                country=c["country"],
                lat=c["lat"],
                lon=c["lon"],
                relevant_bodies=tuple(c["relevant_bodies"]),
                description=c["description"],
                terrain=tuple(c["terrain"]),
                potential_comparison=c["potential_comparison"],
                applications=tuple(c["applications"]),
                caution=c["caution"],
                data_status="demo",
                data_quality=c["data_quality"],
                measurements=self._measurements(c["measurements"]),
            )
        return out

    # -------------------------------------------------------------- interface

    def list_datasets(self) -> list[Dataset]:
        return list(self._datasets.values())

    def list_targets(self, body: Body | None = None) -> list[TargetRegion]:
        return [t for t in self._targets.values() if body is None or t.body == body]

    def get_target(self, target_id: str) -> TargetRegion | None:
        return self._targets.get(target_id)

    def list_candidates(self) -> list[CandidateSite]:
        return list(self._candidates.values())

    def get_candidate(self, site_id: str) -> CandidateSite | None:
        return self._candidates.get(site_id)

    def get_terrain_summary(self, entity_id: str) -> TerrainSummary | None:
        entity = self._targets.get(entity_id) or self._candidates.get(entity_id)
        if entity is None:
            return None
        m = entity.measurements
        relief = float(m["elevation_relief"].value) if "elevation_relief" in m else 100.0
        slope = float(m["slope"].value) if "slope" in m else 3.0
        crater = "crater_morphology" in m and float(m["crater_morphology"].value) >= 0.14
        rng = random.Random(entity_id)  # deterministic per entity
        return TerrainSummary(
            entity_id=entity_id,
            provenance=PROVENANCE,
            elevation_histogram=_elevation_hist(relief, rng),
            slope_histogram=_slope_hist(slope),
            profile_distance_m=[i * 50.0 for i in range(81)],
            profile_elevation_m=_profile(relief, crater, rng),
        )


# ----------------------------------------------------- synthetic shapes (demo only)


def _normalize(xs: list[float]) -> list[float]:
    total = sum(xs) or 1.0
    return [round(x / total, 4) for x in xs]


def _elevation_hist(relief: float, rng: random.Random) -> Histogram:
    n = 12
    edges = [round(relief * 1.1 * i / n, 1) for i in range(n + 1)]
    skew = rng.uniform(0.3, 0.6)
    counts = [math.exp(-((i / n - skew) ** 2) / 0.06) + 0.05 for i in range(n)]
    return Histogram(unit="m above local minimum", bin_edges=edges, counts=_normalize(counts))


def _slope_hist(mean_slope: float) -> Histogram:
    # Gamma(k=2, theta=mean/2) evaluated at bin centres.
    theta = max(mean_slope, 0.5) / 2
    edges = [float(i * 2) for i in range(16)]
    centres = [(edges[i] + edges[i + 1]) / 2 for i in range(15)]
    counts = [c * math.exp(-c / theta) for c in centres]
    return Histogram(unit="degrees", bin_edges=edges, counts=_normalize(counts))


def _profile(relief: float, crater: bool, rng: random.Random) -> list[float]:
    phases = [rng.uniform(0, 2 * math.pi) for _ in range(3)]
    out = []
    for i in range(81):
        x = i / 80
        y = 0.5 + 0.25 * math.sin(2 * math.pi * x + phases[0]) + 0.12 * math.sin(6 * math.pi * x + phases[1]) + 0.05 * math.sin(14 * math.pi * x + phases[2])
        if crater:
            d = abs(x - 0.5) / 0.22
            y = (0.15 + 0.85 * d**2) if d < 1 else 1.0 - 0.35 * (d - 1)
        out.append(round(max(y, 0.0) * relief, 1))
    return out
