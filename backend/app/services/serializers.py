"""Convert provider dataclasses into JSON-friendly dicts."""

from __future__ import annotations

from dataclasses import asdict

from ..engine.similarity import Measurement
from ..providers.base import CandidateSite, TargetRegion


def _measurements(ms: dict[str, Measurement]) -> dict[str, dict]:
    return {fid: asdict(m) for fid, m in ms.items()}


def target_dict(t: TargetRegion) -> dict:
    return {
        "id": t.id,
        "body": t.body,
        "name": t.name,
        "region_type": t.region_type,
        "lat": t.lat,
        "lon": t.lon,
        "description": t.description,
        "data_status": t.data_status,
        "measurements": _measurements(t.measurements),
    }


def candidate_dict(c: CandidateSite) -> dict:
    return {
        "id": c.id,
        "name": c.name,
        "country": c.country,
        "lat": c.lat,
        "lon": c.lon,
        "relevant_bodies": list(c.relevant_bodies),
        "description": c.description,
        "terrain": list(c.terrain),
        "potential_comparison": c.potential_comparison,
        "applications": list(c.applications),
        "caution": c.caution,
        "data_status": c.data_status,
        "data_quality": c.data_quality,
        "measurements": _measurements(c.measurements),
    }
