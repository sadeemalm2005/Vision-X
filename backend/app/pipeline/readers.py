"""Readers for the project datasets (formats verified against their PDS labels).

Moon  LOLA LDEM_85S_40M (PDS3 label ldem_85s_40m_float.lbl)
      7584 x 7584 PC_REAL float32, km relative to 1737.4 km; polar stereographic
      centred on the south pole, 40 m/pixel true at the pole;
      LINE/SAMPLE_PROJECTION_OFFSET 3791.5. Orientation verified: Shackleton
      crater appears as a ~2.9 km deep bowl at 89.67 S, 129.8 E.
Mars  MOLA MEGDR megt90n000fb (PDS4 label megt90n000fb.xml)
      5760 lines x 11520 samples SignedMSB2 metres; equirectangular,
      90N..90S, 0..360E, 32 px/deg (1.8522 km/px at the equator).
Earth NASADEM_HGT 1 arc-second tile (e.g. s23w069.hgt)
      3601 x 3601 big-endian int16 metres, -32768 = void; tile named by its
      SW corner; row 0 is the northern edge.
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from pathlib import Path

import numpy as np

from .terrain import bilinear, block_mean

# ------------------------------------------------------------------- Moon


@dataclass(frozen=True)
class LolaPolar:
    path: Path
    n: int = 7584
    scale_m: float = 40.0
    offset_px: float = 3791.5
    radius_m: float = 1737400.0

    def array(self) -> np.memmap:
        return np.memmap(self.path, dtype="<f4", mode="r", shape=(self.n, self.n))

    def to_px(self, lat: float, lon: float) -> tuple[float, float]:
        """(row, col), 0-based, for a south-polar stereographic point."""
        rho = 2 * self.radius_m * math.tan(math.radians(90 + lat) / 2)
        x = rho * math.sin(math.radians(lon))
        y = rho * math.cos(math.radians(lon))
        return self.offset_px - y / self.scale_m, x / self.scale_m + self.offset_px

    def to_latlon(self, row: float, col: float) -> tuple[float, float]:
        x = (col - self.offset_px) * self.scale_m
        y = (self.offset_px - row) * self.scale_m
        rho = math.hypot(x, y)
        lat = -90 + math.degrees(2 * math.atan(rho / (2 * self.radius_m)))
        lon = math.degrees(math.atan2(x, y)) % 360
        return lat, lon

    def window(self, lat: float, lon: float, size_m: float) -> tuple[np.ndarray, float, float]:
        r, c = self.to_px(lat, lon)
        half = int(round(size_m / self.scale_m / 2))
        r0, c0 = int(round(r)) - half, int(round(c)) - half
        if r0 < 0 or c0 < 0 or r0 + 2 * half > self.n or c0 + 2 * half > self.n:
            raise ValueError(f"window at {lat},{lon} leaves the LOLA tile")
        z = np.array(self.array()[r0 : r0 + 2 * half, c0 : c0 + 2 * half], dtype=np.float64) * 1000.0
        return z, self.scale_m, self.scale_m


# ------------------------------------------------------------------- Mars


@dataclass(frozen=True)
class MolaMegdr:
    path: Path
    lines: int = 5760
    samples: int = 11520
    ppd: int = 32
    radius_m: float = 3396000.0

    @property
    def pixel_m(self) -> float:
        return 2 * math.pi * self.radius_m / 360 / self.ppd  # 1852.2 m

    def array(self) -> np.memmap:
        return np.memmap(self.path, dtype=">i2", mode="r", shape=(self.lines, self.samples))

    def window(self, lat: float, lon: float, size_m: float) -> tuple[np.ndarray, float, float]:
        dy = self.pixel_m
        dx = self.pixel_m * math.cos(math.radians(lat))
        nr = max(3, int(round(size_m / dy)))
        nc = max(3, int(round(size_m / dx)))
        r = (90 - lat) * self.ppd
        c = (lon % 360) * self.ppd
        rows = np.arange(int(round(r - nr / 2)), int(round(r - nr / 2)) + nr)
        cols = np.arange(int(round(c - nc / 2)), int(round(c - nc / 2)) + nc) % self.samples
        z = np.array(self.array()[rows][:, cols], dtype=np.float64)
        return z, dx, dy


# ------------------------------------------------------------------ Earth


@dataclass
class EarthGrid:
    """A metric grid covering one NASADEM tile."""

    z: np.ndarray
    dx: float
    dy: float
    north: float
    west: float
    lat_span: float = 1.0
    lon_span: float = 1.0

    def latlon(self, row: float, col: float) -> tuple[float, float]:
        lat = self.north - (row / self.z.shape[0]) * self.lat_span
        lon = self.west + (col / self.z.shape[1]) * self.lon_span
        return lat, lon


class NasademTile:
    SIZE = 3601
    VOID = -32768

    def __init__(self, path: Path):
        self.path = path
        m = re.match(r"([ns])(\d{2})([ew])(\d{3})", path.stem.lower())
        if not m:
            raise ValueError(f"cannot parse tile name {path.name}")
        south = int(m.group(2)) * (1 if m.group(1) == "n" else -1)
        west = int(m.group(4)) * (1 if m.group(3) == "e" else -1)
        self.north = south + 1
        self.west = west
        self.name = path.stem.lower()

    @property
    def center_lat(self) -> float:
        return self.north - 0.5

    def native(self) -> np.ndarray:
        z = np.fromfile(self.path, dtype=">i2").reshape(self.SIZE, self.SIZE).astype(np.float64)
        voids = z == self.VOID
        if voids.any():
            z[voids] = np.nan
        return z

    def native_spacing(self) -> tuple[float, float]:
        deg_m = 2 * math.pi * 6371000.0 / 360
        dy = deg_m / (self.SIZE - 1)
        dx = dy * math.cos(math.radians(self.center_lat))
        return dx, dy

    def resampled(self, spacing_m: float) -> EarthGrid:
        """Bilinear resampling onto a square metric grid (for spacing near native)."""
        z = self.native()
        dx0, dy0 = self.native_spacing()
        ny = int((self.SIZE - 1) * dy0 // spacing_m)
        nx = int((self.SIZE - 1) * dx0 // spacing_m)
        rows = (np.arange(ny) * spacing_m / dy0)[:, None] * np.ones((1, nx))
        cols = np.ones((ny, 1)) * (np.arange(nx) * spacing_m / dx0)[None, :]
        grid = bilinear(z, rows, cols)
        return EarthGrid(grid, spacing_m, spacing_m, self.north, self.west, ny * spacing_m / dy0 / (self.SIZE - 1), nx * spacing_m / dx0 / (self.SIZE - 1))

    def aggregated(self, spacing_m: float) -> EarthGrid:
        """Area-mean aggregation to a much coarser spacing (avoids aliasing)."""
        z = self.native()
        dx0, dy0 = self.native_spacing()
        rb = max(1, int(round(spacing_m / dy0)))
        cb = max(1, int(round(spacing_m / dx0)))
        g = block_mean(z, rb, cb)
        return EarthGrid(g, cb * dx0, rb * dy0, self.north, self.west, g.shape[0] * rb / (self.SIZE - 1), g.shape[1] * cb / (self.SIZE - 1))
