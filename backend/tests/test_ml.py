import numpy as np
import pytest

from app.engine.ml import knn_distances, rankdata, spearman, standardize, top_overlap

sklearn = pytest.importorskip("sklearn")  # clustering is an offline (dev) dependency
from app.pipeline.clustering import fit_profile  # noqa: E402


def entity(eid, relief, slope, rough, var):
    vals = {"elevation_relief": relief, "slope": slope, "roughness": rough, "terrain_variability": var}
    return {"id": eid, "measurements": {k: {"value": v} for k, v in vals.items()}}


def test_knn_orders_by_standardized_distance():
    X = np.array([[0.0, 0.0], [1.0, 0.0], [5.0, 5.0]])
    mean, scale = X.mean(axis=0), X.std(axis=0)
    Z = standardize(X, mean, scale)
    d = knn_distances(Z[0], Z)
    assert d[0] == 0 and d[1] < d[2]


def test_rankdata_and_spearman():
    assert rankdata(np.array([10, 30, 20, 20])).tolist() == [1, 4, 2.5, 2.5]
    assert spearman(np.array([1, 2, 3, 4]), np.array([10, 20, 30, 40])) == pytest.approx(1.0)
    assert spearman(np.array([1, 2, 3, 4]), np.array([4, 3, 2, 1])) == pytest.approx(-1.0)
    assert spearman(np.array([1, 2]), np.array([1, 2])) is None
    assert spearman(np.array([1, 1, 1]), np.array([1, 2, 3])) is None


def test_top_overlap():
    assert top_overlap(["a", "b", "c"], ["c", "x", "a"], 3) == 2


def test_kmeans_recovers_three_obvious_terrain_groups():
    rng = np.random.default_rng(0)
    groups = [(50, 2, 0.5, 1.5), (400, 8, 1.5, 5), (1500, 20, 3, 9)]
    patches = [
        entity(f"p{g}_{i}", *(np.array(c) * rng.uniform(0.9, 1.1, 4)))
        for g, c in enumerate(groups) for i in range(30)
    ]
    targets = [entity("t_flat", 55, 2.1, 0.5, 1.4), entity("t_steep", 1450, 19, 3, 9)]
    model = fit_profile("lunar_fine", targets, patches)
    assert model["k"] == 3
    assert model["silhouette"] > 0.6
    assert [c["label"].split()[0] for c in model["clusters"]] == ["Gentle", "Moderate", "Steep"]
    # clusters are ordered by slope, so the flat target is in 0 and the steep one in 2
    assert targets[0]["cluster"] == 0 and targets[1]["cluster"] == 2
    assert sum(c["size"] for c in model["clusters"]) == len(patches) + len(targets)


def test_mars_profile_excludes_roughness():
    patches = [entity(f"p{i}", 100 + 50 * i, 1 + 0.3 * i, 50, 0.5 + 0.1 * i) for i in range(20)]
    model = fit_profile("mars_regional", [], patches)
    assert "roughness" not in model["features"]
    assert len(set(c["label"] for c in model["clusters"])) == model["k"]  # names are distinct
