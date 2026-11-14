import pytest
from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)

ROVER_FEATURES = ["slope", "roughness", "elevation_relief", "rock_obstacles", "terrain_variability"]


def analyze(**overrides):
    payload = {"body": "mars", "target_id": "mars_gale", "mission_id": "rover_mobility", "features": ROVER_FEATURES}
    payload.update(overrides)
    return client.post("/api/analyze", json=payload)


def test_meta_reports_demo_mode():
    r = client.get("/api/meta")
    assert r.status_code == 200
    assert r.json()["data_mode"] == "demo"


def test_all_demo_measurements_are_labelled_synthetic():
    for t in client.get("/api/targets").json():
        assert t["data_status"] == "demo"
        assert all(m["provenance"] == "synthetic_demo" for m in t["measurements"].values())
    for c in client.get("/api/candidates").json():
        assert c["data_status"] == "demo"
        assert all(m["provenance"] == "synthetic_demo" for m in c["measurements"].values())


def test_targets_filter_by_body():
    moon = client.get("/api/targets", params={"body": "moon"}).json()
    assert moon and all(t["body"] == "moon" for t in moon)


def test_analysis_returns_ranked_explained_results():
    r = analyze()
    assert r.status_code == 200
    data = r.json()
    assert data["data_mode"] == "demo"
    assert sum(w["weight"] for w in data["weights"]) == pytest.approx(1.0)
    results = data["results"]
    assert [x["rank"] for x in results] == list(range(1, len(results) + 1))
    bounds = [x["lower_bound"] for x in results if x["score"] is not None]
    assert bounds == sorted(bounds, reverse=True)  # conservative ranking
    for x in results:
        assert x["explanation"]["headline"]
        # No sub-metre Earth imagery is connected -> rocks are never scored
        rocks = next(f for f in x["features"] if f["feature_id"] == "rock_obstacles")
        assert rocks["status"] != "scored" and rocks["similarity"] is None
    assert "does not imply complete environmental equivalence" in data["disclaimer"]


def test_results_depend_on_mission_and_features():
    rover = analyze().json()
    crater = analyze(
        body="moon", target_id="moon_linne", mission_id="crater_navigation",
        features=["crater_morphology", "elevation_relief", "slope", "terrain_variability"],
    ).json()
    assert crater["results"][0]["site"]["id"] == "meteor_crater"
    assert [x["score"] for x in rover["results"]] != [x["score"] for x in crater["results"]]

    only_slope = analyze(features=["slope"]).json()
    assert [x["score"] for x in only_slope["results"]] != [x["score"] for x in rover["results"]]


def test_custom_weights_change_scores():
    base = analyze(features=["slope", "roughness"]).json()
    custom = analyze(features=["slope", "roughness"], weights={"slope": 90, "roughness": 10}).json()
    w = {x["feature_id"]: x["weight"] for x in custom["weights"]}
    assert w == pytest.approx({"slope": 0.9, "roughness": 0.1})
    assert [x["score"] for x in base["results"]] != [x["score"] for x in custom["results"]]


def test_withheld_when_coverage_too_low():
    # Craters are only measured at Meteor Crater, so every other site is withheld.
    data = analyze(body="moon", target_id="moon_linne", mission_id="crater_navigation", features=["crater_morphology"]).json()
    withheld = [x for x in data["results"] if x["withheld"]]
    assert len(withheld) == len(data["results"]) - 1
    assert all(x["score"] is None for x in withheld)
    assert data["results"][-1]["withheld"]


@pytest.mark.parametrize(
    "overrides",
    [
        {"target_id": "nope"},
        {"body": "moon"},  # Gale is on Mars
        {"mission_id": "nope"},
        {"features": ["nope"]},
        {"features": []},
        {"features": ["slope"], "weights": {"slope": 0}},
    ],
)
def test_invalid_requests_rejected(overrides):
    assert analyze(**overrides).status_code == 422


def test_feature_availability_flags_unavailable_features():
    rows = {r["feature_id"]: r for r in client.get("/api/targets/mars_gale/features").json()}
    assert rows["slope"]["available"]
    assert not rows["rock_obstacles"]["available"]
    assert not rows["regolith_proxy"]["available"]
    assert client.get("/api/targets/nope/features").status_code == 404


def test_terrain_summary_is_labelled_synthetic():
    data = client.get("/api/terrain/meteor_crater").json()
    assert data["provenance"] == "synthetic_demo"
    assert sum(data["slope_histogram"]["counts"]) == pytest.approx(1.0, abs=1e-3)
    assert client.get("/api/terrain/nope").status_code == 404
