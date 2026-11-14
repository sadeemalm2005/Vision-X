"""Provider backed by the project's NASA datasets.

Reads ``app/data/processed/nasa_features.json`` produced by
``python -m app.pipeline.build`` plus the catalogues in ``app/data/catalog``.
Only measurements computed from real data are served.
"""

from __future__ import annotations

import json
from functools import cached_property
from pathlib import Path

from ..engine.similarity import Measurement
from .base import Body, Dataset, EarthPatch, Histogram, ScaleProfile, Site, TargetRegion, TerrainSummary

DATA = Path(__file__).resolve().parent.parent / "data"
PROCESSED = DATA / "processed" / "nasa_features.json"
PROVENANCE = "nasa_processed"


class MissingProcessedData(RuntimeError):
    pass


def _load(path: Path) -> dict:
    with open(path, encoding="utf-8") as fh:
        return json.load(fh)


def _measurements(raw: dict) -> dict[str, Measurement]:
    return {
        fid: Measurement(value=m["value"], resolution_m=m["resolution_m"], dataset_id=m["dataset"], provenance=PROVENANCE)
        for fid, m in raw.items()
    }


class NasaDataProvider:
    name = "nasa"
    mode = "real"

    def __init__(self, processed: Path = PROCESSED, catalog: Path = DATA / "catalog") -> None:
        if not processed.is_file():
            raise MissingProcessedData(
                f"{processed} not found. Run `python -m app.pipeline.build --raw <NASA-DATA folder>` in backend/."
            )
        self._processed_path = processed
        self._catalog = catalog

    @cached_property
    def _doc(self) -> dict:
        return _load(self._processed_path)

    @cached_property
    def _datasets(self) -> list[Dataset]:
        return [Dataset(**d) for d in _load(self._catalog / "datasets.json")["datasets"]]

    @cached_property
    def _sites(self) -> dict[str, Site]:
        out = {}
        for s in _load(self._catalog / "sites.json")["sites"]:
            out[s["id"]] = Site(
                id=s["id"], name=s["name"], country=s["country"], lat=s["lat"], lon=s["lon"],
                relevant_bodies=tuple(s["relevant_bodies"]), description=s["description"], terrain=tuple(s["terrain"]),
                potential_comparison=s["potential_comparison"], applications=tuple(s["applications"]), caution=s["caution"],
                tiles=tuple(s["tiles"]), suggested_tile=s.get("suggested_tile"),
            )
        return out

    @cached_property
    def _profiles(self) -> dict[str, ScaleProfile]:
        return {k: ScaleProfile(id=k, name=v["name"], grid_m=v["grid_m"], window_m=v["window_m"], stride_m=v["stride_m"], description=v["description"]) for k, v in self._doc["profiles"].items()}

    @cached_property
    def _targets(self) -> dict[str, TargetRegion]:
        return {
            t["id"]: TargetRegion(
                id=t["id"], body=t["body"], name=t["name"], region_type=t["region_type"], lat=t["lat"], lon=t["lon"],
                description=t["description"], scale_profile=t["scale_profile"], window_m=t["window_m"], image=t["image"],
                measurements=_measurements(t["measurements"]), cluster=t.get("cluster"),
            )
            for t in self._doc["targets"]
        }

    @cached_property
    def _tile_site(self) -> dict[str, str]:
        return {t["id"]: t["site_id"] for t in self._doc["earth_tiles"]}

    @cached_property
    def _patches(self) -> dict[str, list[EarthPatch]]:
        out: dict[str, list[EarthPatch]] = {}
        for profile, items in self._doc["patches"].items():
            out[profile] = [
                EarthPatch(
                    id=p["id"], name=p["name"], tile_id=p["id"].split("_")[0], site_id=self._tile_site[p["id"].split("_")[0]],
                    scale_profile=profile, lat=p["lat"], lon=p["lon"],
                    bounds=(tuple(p["bounds"][0]), tuple(p["bounds"][1])), image_box=tuple(p["image_box"]),
                    measurements=_measurements(p["measurements"]), cluster=p.get("cluster"),
                )
                for p in items
            ]
        return out

    @cached_property
    def _terrain_raw(self) -> dict[str, tuple[dict, float]]:
        out = {t["id"]: (t["terrain"], t["window_m"]) for t in self._doc["targets"]}
        for profile, items in self._doc["patches"].items():
            w = self._doc["profiles"][profile]["window_m"]
            out.update({p["id"]: (p["terrain"], w) for p in items})
        return out

    # ---------------------------------------------------------------- interface

    def list_datasets(self) -> list[Dataset]:
        return list(self._datasets)

    def list_profiles(self) -> list[ScaleProfile]:
        return list(self._profiles.values())

    def get_profile(self, profile_id: str) -> ScaleProfile | None:
        return self._profiles.get(profile_id)

    def list_targets(self, body: Body | None = None) -> list[TargetRegion]:
        return [t for t in self._targets.values() if body is None or t.body == body]

    def get_target(self, target_id: str) -> TargetRegion | None:
        return self._targets.get(target_id)

    def list_sites(self) -> list[Site]:
        return list(self._sites.values())

    def get_site(self, site_id: str) -> Site | None:
        return self._sites.get(site_id)

    def list_patches(self, scale_profile: str) -> list[EarthPatch]:
        return list(self._patches.get(scale_profile, []))

    def get_terrain_summary(self, entity_id: str) -> TerrainSummary | None:
        hit = self._terrain_raw.get(entity_id)
        if hit is None:
            return None
        t, window_m = hit
        n = len(t["transect_m"])
        return TerrainSummary(
            entity_id=entity_id,
            provenance=PROVENANCE,
            elevation_histogram=Histogram("m above window minimum", t["elev_edges"], t["elev_hist"]),
            slope_histogram=Histogram("degrees", t["slope_edges"], t["slope_hist"]),
            profile_distance_m=[round(i * window_m / (n - 1), 1) for i in range(n)],
            profile_elevation_m=t["transect_m"],
        )

    def ml_model(self, scale_profile: str) -> dict | None:
        return self._doc.get("ml", {}).get(scale_profile)

    def map_layers(self) -> dict:
        return {
            "moon_overview": self._doc["moon_overview"],
            "earth_tiles": self._doc["earth_tiles"],
            "generated_at": self._doc["generated_at"],
            "pipeline_version": self._doc["pipeline_version"],
        }
