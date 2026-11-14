"""Build processed terrain features from the raw project datasets.

    python -m app.pipeline.build --raw data/raw/NASA-DATA

Outputs
  app/data/processed/nasa_features.json   features for targets and Earth patches
  ../frontend/public/terrain/*.png        hillshades rendered from the same DEMs

Scale harmonization (proposal section 7: compare at the coarsest input's scale)
  lunar_fine     Moon LOLA 40 m vs Earth NASADEM resampled 30 m -> 40 m.
                 10 km analysis windows; Earth searched with a 5 km stride.
  mars_regional  Mars MOLA 1.85 km vs Earth NASADEM area-averaged to ~1.85 km.
                 30 km analysis windows; Earth searched with a ~9 km stride.
Each target is only ever compared with Earth patches of the same profile.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from .clustering import fit_profile
from .png import write_gray_png
from .readers import EarthGrid, LolaPolar, MolaMegdr, NasademTile
from .terrain import block_mean, hillshade, histogram, slope_deg, transect, window_features

BACKEND = Path(__file__).resolve().parents[2]
OUT_JSON = BACKEND / "app" / "data" / "processed" / "nasa_features.json"
OUT_IMG = BACKEND.parent / "frontend" / "public" / "terrain"
PIPELINE_VERSION = "1.0"

PROFILES = {
    "lunar_fine": {
        "name": "Lunar fine scale",
        "grid_m": 40.0,
        "window_m": 10000.0,
        "stride_m": 5000.0,
        "slope_edges": [i * 2.5 for i in range(17)],  # 0..40 deg
        "elev_edges": [i * 100.0 for i in range(13)],  # 0..1200 m
        "description": "Moon (LOLA 40 m) vs Earth (NASADEM 30 m resampled to 40 m), 10 km windows.",
    },
    "mars_regional": {
        "name": "Mars regional scale",
        "grid_m": 1852.2,
        "window_m": 30000.0,
        "stride_m": 9300.0,
        "slope_edges": [i * 1.0 for i in range(16)],  # 0..15 deg
        "elev_edges": [i * 250.0 for i in range(13)],  # 0..3000 m
        "description": "Mars (MOLA 1.85 km) vs Earth (NASADEM area-averaged to ~1.85 km), 30 km windows.",
    },
}

# Named targets: coordinates of well-documented locations.
MARS_TARGETS = [
    ("mars_gale", "Gale Crater: Bradbury Landing", "Crater floor plains", -4.589, 137.441,
     "Aeolis Palus on the floor of Gale crater, where the Curiosity rover landed in 2012, north of Aeolis Mons (Mount Sharp)."),
    ("mars_jezero", "Jezero Crater: Octavia E. Butler Landing", "Crater floor and delta", 18.4447, 77.4508,
     "Floor of Jezero crater near its western delta, where the Perseverance rover landed in 2021."),
    ("mars_meridiani", "Meridiani Planum: Eagle crater", "Layered plains", -1.9462, 354.4734,
     "Very flat sulfate-bearing plains where the Opportunity rover landed in 2004."),
]


def r(x: float, n: int = 3) -> float:
    return round(float(x), n)


def measurements(feats: dict[str, float], resolution: float, dataset: str) -> dict:
    return {k: {"value": r(v, 3), "resolution_m": r(resolution, 1), "dataset": dataset} for k, v in feats.items()}


def terrain_summary(z: np.ndarray, dx: float, dy: float, profile: dict) -> dict:
    return {
        "slope_edges": profile["slope_edges"],
        "slope_hist": histogram(slope_deg(z, dx, dy), profile["slope_edges"]),
        "elev_edges": profile["elev_edges"],
        "elev_hist": histogram(z - np.nanmin(z), profile["elev_edges"]),
        "transect_m": transect(z),
    }


def to_u8(img: np.ndarray) -> np.ndarray:
    return np.clip(img, 0, 255).astype(np.uint8)


# ------------------------------------------------------------------- Moon


def build_moon(lola: LolaPolar) -> tuple[list[dict], dict]:
    prof = PROFILES["lunar_fine"]
    dem = lola.array()

    # Overview hillshade of the whole product (block-averaged to 320 m) for the polar map.
    k = 8
    overview = block_mean(np.asarray(dem, dtype=np.float32) * 1000.0, k, k)
    write_gray_png(OUT_IMG / "moon_south_pole.png", hillshade(overview, lola.scale_m * k, lola.scale_m * k, altitude=35))
    overview_meta = {"src": "/terrain/moon_south_pole.png", "px": overview.shape[0], "extent_m": lola.n * lola.scale_m, "scale_m": lola.scale_m * k}

    targets = [
        ("moon_shackleton", "Shackleton crater interior", "Permanently shadowed impact crater", -89.67, 129.8,
         "Floor and inner walls of the ~21 km Shackleton crater, adjacent to the lunar south pole. Verified in the DEM as a ~2.9 km deep bowl."),
        ("moon_pole_rim", "South pole: Shackleton rim", "Crater rim and ridge", -89.97, 0.0,
         "The geographic south pole lies on the rim of Shackleton crater; the window covers rim crest and outer slopes."),
    ]

    # Data-driven windows, chosen automatically from the DEM between 86 and 88.5 S.
    size_px = int(prof["window_m"] / lola.scale_m)
    best_flat, best_rugged = None, None
    for row in range(0, lola.n - size_px, size_px):
        for col in range(0, lola.n - size_px, size_px):
            lat, lon = lola.to_latlon(row + size_px / 2, col + size_px / 2)
            if not -88.5 <= lat <= -86.0:
                continue
            z = np.asarray(dem[row : row + size_px : 5, col : col + size_px : 5], dtype=np.float64) * 1000.0
            s = float(np.mean(slope_deg(z, lola.scale_m * 5, lola.scale_m * 5)))
            rel = float(np.percentile(z, 95) - np.percentile(z, 5))
            if best_flat is None or s < best_flat[0]:
                best_flat = (s, lat, lon)
            if best_rugged is None or rel > best_rugged[0]:
                best_rugged = (rel, lat, lon)
    _, la, lo = best_flat
    targets.append(("moon_flat_plain", f"Low-slope polar plain ({abs(la):.2f}° S, {lo:.1f}° E)", "Gentle highland terrain", la, lo,
                    "Selected automatically as the 10 km window with the lowest mean slope between 86° and 88.5° S in the LOLA DEM."))
    _, la, lo = best_rugged
    targets.append(("moon_massif", f"High-relief massif ({abs(la):.2f}° S, {lo:.1f}° E)", "Mountainous highland terrain", la, lo,
                    "Selected automatically as the 10 km window with the greatest elevation range between 86° and 88.5° S in the LOLA DEM."))

    out = []
    for tid, name, kind, lat, lon, desc in targets:
        z, dx, dy = lola.window(lat, lon, prof["window_m"])
        ctx, cdx, cdy = lola.window(lat, lon, prof["window_m"] * 3)
        write_gray_png(OUT_IMG / f"target_{tid}.png", hillshade(block_mean(ctx, 2, 2), cdx * 2, cdy * 2))
        out.append({
            "id": tid, "body": "moon", "name": name, "region_type": kind, "lat": r(lat, 4), "lon": r(lon if lon <= 180 else lon - 360, 4),
            "description": desc, "scale_profile": "lunar_fine", "window_m": prof["window_m"],
            "measurements": measurements(window_features(z, dx, dy), dx, "lola_ldem_85s_40m"),
            "terrain": terrain_summary(z, dx, dy, prof),
            "image": {"src": f"/terrain/target_{tid}.png", "window_frac": 1 / 3, "source": "Hillshade rendered from LOLA LDEM_85S_40M"},
        })
    return out, overview_meta


# ------------------------------------------------------------------- Mars


def build_mars(mola: MolaMegdr) -> list[dict]:
    prof = PROFILES["mars_regional"]
    out = []
    for tid, name, kind, lat, lon, desc in MARS_TARGETS:
        z, dx, dy = mola.window(lat, lon, prof["window_m"])
        ctx, cdx, cdy = mola.window(lat, lon, prof["window_m"] * 8)
        write_gray_png(OUT_IMG / f"target_{tid}.png", hillshade(ctx, cdx, cdy))
        out.append({
            "id": tid, "body": "mars", "name": name, "region_type": kind, "lat": lat, "lon": r(lon if lon <= 180 else lon - 360, 4),
            "description": desc, "scale_profile": "mars_regional", "window_m": prof["window_m"],
            "measurements": measurements(window_features(z, dx, dy), max(dx, dy), "mola_megdr_32ppd"),
            "terrain": terrain_summary(z, dx, dy, prof),
            "image": {"src": f"/terrain/target_{tid}.png", "window_frac": 1 / 8, "source": "Hillshade rendered from MOLA MEGDR (32 px/deg)"},
        })
    return out


# ------------------------------------------------------------------ Earth


def earth_patches(grid: EarthGrid, profile_id: str, tile: NasademTile, dataset: str, frame: tuple[float, float, float, float]) -> list[dict]:
    """``frame`` = (north, west, lat_span, lon_span) of the tile hillshade image, for crop boxes."""
    f_north, f_west, f_lat, f_lon = frame
    prof = PROFILES[profile_id]
    ny, nx = grid.z.shape
    wr = max(3, int(round(prof["window_m"] / grid.dy)))
    wc = max(3, int(round(prof["window_m"] / grid.dx)))
    sr = max(1, int(round(prof["stride_m"] / grid.dy)))
    sc = max(1, int(round(prof["stride_m"] / grid.dx)))
    res = max(grid.dx, grid.dy)
    out = []
    for r0 in range(0, ny - wr + 1, sr):
        for c0 in range(0, nx - wc + 1, sc):
            z = grid.z[r0 : r0 + wr, c0 : c0 + wc]
            if np.isnan(z).mean() > 0.05:
                continue
            z = np.where(np.isnan(z), np.nanmean(z), z)
            lat, lon = grid.latlon(r0 + wr / 2, c0 + wc / 2)
            north, west = grid.latlon(r0, c0)
            south, east = grid.latlon(r0 + wr, c0 + wc)
            out.append({
                "id": f"{tile.name}_{profile_id[:4]}_{r0:04d}_{c0:04d}",
                "name": f"Atacama {abs(lat):.2f}° S, {abs(lon):.2f}° W",
                "lat": r(lat, 4), "lon": r(lon, 4),
                "bounds": [[r(south, 5), r(west, 5)], [r(north, 5), r(east, 5)]],
                "image_box": [r((west - f_west) / f_lon, 5), r((f_north - north) / f_lat, 5), r((east - f_west) / f_lon, 5), r((f_north - south) / f_lat, 5)],
                "measurements": measurements(window_features(z, grid.dx, grid.dy), res, dataset),
                "terrain": terrain_summary(z, grid.dx, grid.dy, prof),
            })
    return out


def build_earth(tile: NasademTile) -> tuple[dict, dict[str, list[dict]]]:
    fine = tile.resampled(PROFILES["lunar_fine"]["grid_m"])
    regional = tile.aggregated(PROFILES["mars_regional"]["grid_m"])
    k = 3
    shade = hillshade(block_mean(fine.z, k, k), fine.dx * k, fine.dy * k)
    write_gray_png(OUT_IMG / f"earth_{tile.name}.png", shade)
    tile_meta = {
        "id": tile.name,
        "site_id": "atacama",
        "bounds": [[r(fine.north - fine.lat_span, 5), r(fine.west, 5)], [r(fine.north, 5), r(fine.west + fine.lon_span, 5)]],
        "image": f"/terrain/earth_{tile.name}.png",
        "image_px": [int(shade.shape[1]), int(shade.shape[0])],
        "native_resolution_m": r(max(tile.native_spacing()), 1),
    }
    dataset = f"nasadem_{tile.name}"
    frame = (fine.north, fine.west, fine.lat_span, fine.lon_span)
    return tile_meta, {
        "lunar_fine": earth_patches(fine, "lunar_fine", tile, dataset, frame),
        "mars_regional": earth_patches(regional, "mars_regional", tile, dataset, frame),
    }


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--raw", type=Path, default=BACKEND / "data" / "raw" / "NASA-DATA")
    args = ap.parse_args()
    raw: Path = args.raw

    lola = LolaPolar(raw / "moon" / "ldem_85s_40m_float.img")
    mola = MolaMegdr(raw / "mars" / "megt90n000fb.img")
    tile = NasademTile(raw / "earth" / "s23w069.hgt")

    moon_targets, moon_overview = build_moon(lola)
    print(f"moon: {len(moon_targets)} targets")
    mars_targets = build_mars(mola)
    print(f"mars: {len(mars_targets)} targets")
    tile_meta, patches = build_earth(tile)
    print("earth patches:", {k: len(v) for k, v in patches.items()})

    targets = moon_targets + mars_targets
    ml = {}
    for profile_id, items in patches.items():
        prof_targets = [t for t in targets if t["scale_profile"] == profile_id]
        ml[profile_id] = fit_profile(profile_id, prof_targets, items)
        print(f"k-means {profile_id}: k={ml[profile_id]['k']} silhouette={ml[profile_id]['silhouette']}")

    doc = {
        "_note": "Generated by app/pipeline/build.py from the project's NASA datasets. Do not edit by hand.",
        "pipeline_version": PIPELINE_VERSION,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "profiles": {k: {kk: vv for kk, vv in v.items() if not kk.endswith("_edges")} for k, v in PROFILES.items()},
        "moon_overview": moon_overview,
        "earth_tiles": [tile_meta],
        "targets": targets,
        "patches": patches,
        "ml": ml,
    }
    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    print(f"wrote {OUT_JSON.relative_to(BACKEND)} ({OUT_JSON.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
