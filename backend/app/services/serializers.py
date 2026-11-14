"""Convert provider dataclasses into JSON-friendly dicts."""

from __future__ import annotations

from dataclasses import asdict

from ..engine.similarity import Measurement
from ..providers.base import EarthPatch, Site, TargetRegion


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
        "scale_profile": t.scale_profile,
        "window_m": t.window_m,
        "image": t.image,
        "measurements": _measurements(t.measurements),
    }


def site_dict(s: Site) -> dict:
    return {
        "id": s.id,
        "name": s.name,
        "country": s.country,
        "lat": s.lat,
        "lon": s.lon,
        "relevant_bodies": list(s.relevant_bodies),
        "description": s.description,
        "terrain": list(s.terrain),
        "potential_comparison": s.potential_comparison,
        "applications": list(s.applications),
        "caution": s.caution,
        "data_status": s.data_status,
        "tiles": list(s.tiles),
        "suggested_tile": s.suggested_tile,
    }


def patch_dict(p: EarthPatch, site: Site, window_m: float) -> dict:
    """A scored Earth window, carrying its parent site's context."""
    return {
        "id": p.id,
        "name": p.name,
        "country": site.country,
        "lat": p.lat,
        "lon": p.lon,
        "bounds": [list(p.bounds[0]), list(p.bounds[1])],
        "image_box": list(p.image_box),
        "site_id": site.id,
        "site_name": site.name,
        "tile_id": p.tile_id,
        "relevant_bodies": list(site.relevant_bodies),
        "description": f"A {window_m / 1000:g} km × {window_m / 1000:g} km analysis window in the {site.name}. {site.description}",
        "terrain": list(site.terrain),
        "potential_comparison": site.potential_comparison,
        "applications": list(site.applications),
        "caution": site.caution,
        "data_status": "real",
        "data_quality": f"Measured from NASADEM tile {p.tile_id}; values computed on the harmonized grid of this comparison.",
        "measurements": _measurements(p.measurements),
    }
