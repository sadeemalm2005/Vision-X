"""Terrain feature extraction from elevation grids (pure NumPy, unit-tested).

All functions take elevation ``z`` in METRES on a regular metric grid with
spacing ``dx`` (columns, east-west) and ``dy`` (rows, north-south), in metres.

Feature definitions (must stay in sync with engine/features.py):

relief              P95 - P5 of elevation in the window (robust to single spikes).
slope               Mean slope angle, degrees, from central differences.
terrain_variability Standard deviation of slope within the window, degrees.
roughness           RMS of the residual between elevation and its 3x3 local mean
                    (i.e. small-scale relief at ~3 grid cells), metres.

Because every feature depends on grid spacing, two windows are only comparable
when computed on the SAME spacing and window size. The build step guarantees
this by resampling the finer dataset to the coarser one's spacing.
"""

from __future__ import annotations

import math

import numpy as np


def slope_deg(z: np.ndarray, dx: float, dy: float) -> np.ndarray:
    gy, gx = np.gradient(z, dy, dx)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def box3(z: np.ndarray) -> np.ndarray:
    """3x3 mean with edge replication."""
    p = np.pad(z, 1, mode="edge")
    s = sum(p[i : i + z.shape[0], j : j + z.shape[1]] for i in range(3) for j in range(3))
    return s / 9.0


def roughness_m(z: np.ndarray) -> float:
    resid = z - box3(z)
    inner = resid[1:-1, 1:-1] if min(z.shape) > 2 else resid
    return float(np.sqrt(np.mean(inner**2)))


def relief_m(z: np.ndarray) -> float:
    p5, p95 = np.percentile(z, [5, 95])
    return float(p95 - p5)


def window_features(z: np.ndarray, dx: float, dy: float, include_roughness: bool = True) -> dict[str, float]:
    s = slope_deg(z, dx, dy)
    out = {
        "elevation_relief": relief_m(z),
        "slope": float(np.mean(s)),
        "terrain_variability": float(np.std(s)),
    }
    if include_roughness:
        out["roughness"] = roughness_m(z)
    return out


def histogram(values: np.ndarray, edges: list[float]) -> list[float]:
    """Fraction of values per bin; values beyond the last edge go in the last bin."""
    v = np.clip(values.ravel(), edges[0], edges[-1] - 1e-9)
    counts, _ = np.histogram(v, bins=edges)
    total = counts.sum() or 1
    return [round(float(c) / total, 4) for c in counts]


def transect(z: np.ndarray, n_points: int = 41) -> list[float]:
    """West-east profile through the window centre, relative to its minimum."""
    row = z[z.shape[0] // 2]
    idx = np.linspace(0, len(row) - 1, n_points)
    prof = np.interp(idx, np.arange(len(row)), row)
    return [round(float(v), 1) for v in prof - prof.min()]


def hillshade(z: np.ndarray, dx: float, dy: float, azimuth: float = 315.0, altitude: float = 45.0) -> np.ndarray:
    """Standard analytical hillshade, uint8. Rows run north -> south."""
    gy, gx = np.gradient(z, dy, dx)
    # Row index increases southward, so north-facing gradient is -gy.
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    zen = math.radians(90.0 - altitude)
    az = math.radians(azimuth)
    shade = np.cos(zen) * np.cos(slope) + np.sin(zen) * np.sin(slope) * np.cos(az - aspect)
    return (np.clip(shade, 0, 1) * 255).astype(np.uint8)


def bilinear(grid: np.ndarray, rows: np.ndarray, cols: np.ndarray) -> np.ndarray:
    """Sample ``grid`` at fractional (rows, cols) with bilinear interpolation."""
    r0 = np.clip(np.floor(rows).astype(int), 0, grid.shape[0] - 2)
    c0 = np.clip(np.floor(cols).astype(int), 0, grid.shape[1] - 2)
    fr = np.clip(rows - r0, 0, 1)
    fc = np.clip(cols - c0, 0, 1)
    a = grid[r0, c0]
    b = grid[r0, c0 + 1]
    c = grid[r0 + 1, c0]
    d = grid[r0 + 1, c0 + 1]
    return (a * (1 - fc) + b * fc) * (1 - fr) + (c * (1 - fc) + d * fc) * fr


def block_mean(grid: np.ndarray, rb: int, cb: int) -> np.ndarray:
    """Area-average aggregation into rb x cb blocks (drops incomplete edge blocks)."""
    h = (grid.shape[0] // rb) * rb
    w = (grid.shape[1] // cb) * cb
    g = grid[:h, :w]
    return g.reshape(h // rb, rb, w // cb, cb).mean(axis=(1, 3))
