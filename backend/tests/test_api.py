"""API tests against the processed NASA features (app/data/processed/nasa_features.json)."""

import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

DEM_FEATURES = ["slope", "roughness", "elevation_relief", "terrain_variability"]


def analyze(**overrides):
    payload = {"body": "moon", "target_id": "moon_flat_plain", "mission_id": "rover_mobility", "features": DEM_FEATURES}
    payload.update(overrides)
    return client.post("/api/analyze", json=payload)


def test_meta_reports_real_data_and_patch_counts():
    m = client.get("/api/meta").json()
    assert m["data_mode"] == "real" and m["provider"] == "nasa"
    assert m["counts"]["patches"]["lunar_fine"] > 100
    assert m["counts"]["patches"]["mars_regional"] > 20


def test_no_synthetic_measurements_anywhere():
    for t in client.get("/api/targets").json():
        assert t["data_status"] == "real"
        assert t["measurements"], t["id"]
        assert all(m["provenance"] == "nasa_processed" for m in t["measurements"].values())
    for s in client.get("/api/sites").json():
        assert "measurements" not in s  # catalogue only


def test_targets_carry_their_scale_and_dataset():
    moon = client.get("/api/targets", params={"body": "moon"}).json()
    mars = client.get("/api/targets", params={"body": "mars"}).json()
    assert {t["scale_profile"] for t in moon} == {"lunar_fine"}
    assert {t["scale_profile"] for t in mars} == {"mars_regional"}
    assert all(m["dataset_id"] == "lola_ldem_85s_40m" for t in moon for m in t["measurements"].values())
    assert all(m["dataset_id"] == "mola_megdr_32ppd" for t in mars for m in t["measurements"].values())


def test_shackleton_is_a_steep_bowl_and_meridiani_is_flat():
    ts = {t["id"]: t for t in client.get("/api/targets").json()}
    assert ts["moon_shackleton"]["measurements"]["slope"]["value"] > 15
    assert ts["mars_meridiani"]["measurements"]["slope"]["value"] < 1
    assert ts["mars_meridiani"]["measurements"]["elevation_relief"]["value"] < 150


def test_analysis_searches_all_patches_and_ranks_conservatively():
    data = analyze().json()
    s = data["search"]
    assert s["patches_total"] == len(s["all"]) > 100
    assert s["scale_profile"]["id"] == "lunar_fine"
    assert len(data["results"]) == 10
    assert sum(w["weight"] for w in data["weights"]) == pytest.approx(1.0)
    bounds = [x["lower_bound"] for x in s["all"] if x["score"] is not None]
    assert bounds == sorted(bounds, reverse=True)
    top = data["results"][0]
    assert top["site"]["site_id"] == "atacama" and top["site"]["bounds"]
    assert all(f["status"] == "scored" for f in top["features"])
    assert "does not imply complete environmental equivalence" in data["disclaimer"]


def test_flat_target_matches_better_than_steep_crater():
    flat = analyze(target_id="moon_flat_plain").json()["results"][0]["score"]
    crater = analyze(target_id="moon_shackleton").json()["results"][0]["score"]
    assert flat > crater


def test_mars_comparisons_are_regional_and_exclude_roughness():
    rows = {r["feature_id"]: r for r in client.get("/api/targets/mars_gale/features").json()}
    assert rows["slope"]["available"] and rows["slope"]["scale_note"]
    assert not rows["roughness"]["available"]
    assert "too coarse" in rows["roughness"]["reason"]
    data = analyze(body="mars", target_id="mars_gale", features=["slope", "elevation_relief", "terrain_variability"]).json()
    assert data["search"]["scale_profile"]["id"] == "mars_regional"
    assert all(r["scale_limited"] and r["confidence"] != "high" for r in data["results"])


def test_unmeasured_features_explain_what_is_needed():
    rows = {r["feature_id"]: r for r in client.get("/api/targets/moon_shackleton/features").json()}
    for fid in ("crater_morphology", "rock_obstacles", "geology", "regolith_proxy"):
        assert not rows[fid]["available"] and rows[fid]["reason"].startswith("Needs")


def test_results_depend_on_features_and_weights():
    base = [x["score"] for x in analyze().json()["results"]]
    slope_only = [x["score"] for x in analyze(features=["slope"]).json()["results"]]
    custom = analyze(features=["slope", "roughness"], weights={"slope": 90, "roughness": 10}).json()
    assert base != slope_only
    assert {w["feature_id"]: w["weight"] for w in custom["weights"]} == pytest.approx({"slope": 0.9, "roughness": 0.1})


def test_required_feature_without_data_withholds_every_patch():
    data = analyze(mission_id="crater_navigation", features=["slope", "elevation_relief"]).json()
    assert data["results"][0]["score"] is not None  # crater feature not selected -> not enforced
    data = analyze(mission_id="crater_navigation", features=["crater_morphology", "slope"]).json()
    assert data["search"]["patches_withheld"] == data["search"]["patches_total"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"target_id": "nope"},
        {"body": "mars"},  # moon target
        {"mission_id": "nope"},
        {"features": ["nope"]},
        {"features": []},
        {"features": ["slope"], "weights": {"slope": 0}},
        {"top_n": 0},
    ],
)
def test_invalid_requests_rejected(overrides):
    assert analyze(**overrides).status_code == 422


def test_terrain_summary_and_map_layers():
    t = client.get("/api/terrain/moon_shackleton").json()
    assert t["provenance"] == "nasa_processed"
    assert sum(t["slope_histogram"]["counts"]) == pytest.approx(1.0, abs=1e-3)
    assert t["profile_distance_m"][-1] == pytest.approx(10000)
    assert client.get("/api/terrain/nope").status_code == 404
    layers = client.get("/api/map-layers").json()
    assert layers["earth_tiles"][0]["id"] == "s23w069"
    assert layers["moon_overview"]["src"].endswith(".png")


def test_ml_cross_check_is_returned_and_consistent():
    data = analyze().json()
    ml = data["ml"]
    assert ml["available"]
    assert set(ml["features_used"]) == set(DEM_FEATURES)
    cl = ml["clustering"]
    assert cl["k"] >= 3 and 0 < cl["silhouette"] <= 1
    assert cl["target_cluster"] is not None and cl["target_cluster_label"]
    knn = ml["knn"]["top"]
    assert [x["knn_rank"] for x in knn] == list(range(1, len(knn) + 1))
    assert [x["distance"] for x in knn] == sorted(x["distance"] for x in knn)
    ag = ml["agreement"]
    assert 0 <= ag["top_overlap"] <= ag["top_n"]
    assert -1 <= ag["spearman"] <= 1
    # every result and heatmap cell carries its ML annotations
    assert all(r["ml"]["knn_rank"] and r["ml"]["cluster_label"] for r in data["results"])
    assert all(c["cluster"] is not None and c["knn_rank"] for c in data["search"]["all"])


def test_knn_uses_only_selected_features():
    ml = analyze(features=["slope", "elevation_relief"]).json()["ml"]
    assert ml["features_used"] == ["elevation_relief", "slope"]
    assert analyze(mission_id="crater_navigation", features=["crater_morphology", "slope"]).json()["ml"]["features_used"] == ["slope"]


def test_mars_ml_model_excludes_roughness():
    ml = analyze(body="mars", target_id="mars_meridiani", features=["slope", "elevation_relief", "terrain_variability"]).json()["ml"]
    assert "roughness" not in ml["clustering"]["features"]


def test_sites_catalogue_reports_data_status():
    sites = {s["id"]: s for s in client.get("/api/sites").json()}
    assert sites["atacama"]["data_status"] == "real"
    assert sites["meteor_crater"]["data_status"] == "no_data" and sites["meteor_crater"]["suggested_tile"]
