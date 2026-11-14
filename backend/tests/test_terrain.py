import math
import zlib

import numpy as np
import pytest

from app.pipeline.png import write_gray_png
from app.pipeline.readers import LolaPolar, MolaMegdr, NasademTile
from app.pipeline.terrain import bilinear, block_mean, hillshade, relief_m, roughness_m, slope_deg, transect, window_features


def plane(ny=50, nx=60, dx=40.0, dy=40.0, east_grad=0.0, north_grad=0.0):
    """z rises east_grad m/m eastward and north_grad m/m northward (row 0 = north)."""
    x = np.arange(nx) * dx
    y = (ny - 1 - np.arange(ny)) * dy  # northing decreases with row
    return east_grad * x[None, :] + north_grad * y[:, None]


def test_slope_of_known_plane():
    z = plane(east_grad=math.tan(math.radians(10)))
    assert np.allclose(slope_deg(z, 40, 40), 10.0, atol=1e-6)


def test_slope_uses_anisotropic_spacing():
    z = plane(dx=20, dy=40, east_grad=1.0)  # 45 degrees
    assert np.allclose(slope_deg(z, 20, 40), 45.0, atol=1e-6)


def test_plane_has_zero_roughness_and_known_relief():
    z = plane(east_grad=0.1)
    assert roughness_m(z) == pytest.approx(0.0, abs=1e-9)
    xs = np.arange(60) * 40 * 0.1
    assert relief_m(z) == pytest.approx(np.percentile(np.tile(xs, 50), 95) - np.percentile(np.tile(xs, 50), 5))


def test_roughness_detects_small_scale_bumps():
    rng = np.random.default_rng(0)
    smooth = plane(east_grad=0.05)
    bumpy = smooth + rng.normal(0, 2.0, smooth.shape)
    assert roughness_m(bumpy) > 1.0 > roughness_m(smooth)


def test_window_features_keys():
    f = window_features(plane(east_grad=0.1), 40, 40)
    assert set(f) == {"elevation_relief", "slope", "terrain_variability", "roughness"}
    assert f["terrain_variability"] == pytest.approx(0.0, abs=1e-6)


def test_hillshade_lights_northwest_facing_slopes():
    # Sun from the NW: a slope facing west (z rises eastward) is brighter than one facing east.
    west_facing = hillshade(plane(east_grad=0.5), 40, 40).mean()
    east_facing = hillshade(plane(east_grad=-0.5), 40, 40).mean()
    assert west_facing > east_facing


def test_transect_is_relative_to_minimum():
    t = transect(plane(east_grad=0.1), n_points=11)
    assert min(t) == 0 and len(t) == 11 and t == sorted(t)


def test_block_mean_and_bilinear():
    g = np.arange(16, dtype=float).reshape(4, 4)
    assert block_mean(g, 2, 2).tolist() == [[2.5, 4.5], [10.5, 12.5]]
    assert bilinear(g, np.array([1.5]), np.array([1.5]))[0] == pytest.approx(7.5)


def test_png_writer(tmp_path):
    img = (np.arange(12, dtype=np.uint8).reshape(3, 4) * 20)
    p = tmp_path / "x.png"
    write_gray_png(p, img)
    data = p.read_bytes()
    assert data[:8] == b"\x89PNG\r\n\x1a\n"
    idat = data[data.index(b"IDAT") + 4 : data.index(b"IEND") - 8]
    raw = zlib.decompress(idat)
    assert raw[1:5] == img[0].tobytes()


def test_lola_projection_round_trip_and_pole():
    lola = LolaPolar(path=None)  # geometry only
    r, c = lola.to_px(-90, 0)
    assert (r, c) == pytest.approx((3791.5, 3791.5))
    lat, lon = lola.to_latlon(*lola.to_px(-89.67, 129.8))
    assert lat == pytest.approx(-89.67, abs=1e-6) and lon == pytest.approx(129.8, abs=1e-6)


def test_mola_pixel_size():
    assert MolaMegdr(path=None).pixel_m == pytest.approx(1852.2, abs=0.1)


def test_nasadem_tile_name_parsing(tmp_path):
    t = NasademTile(tmp_path / "s23w069.hgt")
    assert (t.north, t.west) == (-22, -69)
    t2 = NasademTile(tmp_path / "n35w112.hgt")
    assert (t2.north, t2.west) == (36, -112)
