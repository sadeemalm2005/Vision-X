import math

import pytest

from app.engine.features import FEATURES
from app.engine.missions import MISSIONS
from app.engine.similarity import (
    DEFAULT_EXTRA_WEIGHT,
    MIN_COVERAGE,
    Measurement,
    categorical_similarity,
    effective_resolution,
    log_ratio_similarity,
    normalize_weights,
    numeric_similarity,
    rank_key,
    resolve_weights,
    score_candidate,
)


def m(value, res=30.0, ds="test"):
    return Measurement(value=value, resolution_m=res, dataset_id=ds, provenance="test")


# ------------------------------------------------------------------ weights


def test_normalize_weights_sums_to_one():
    w = normalize_weights({"a": 3, "b": 1})
    assert w == {"a": 0.75, "b": 0.25}
    assert math.isclose(sum(w.values()), 1.0)


@pytest.mark.parametrize("bad", [{"a": 0, "b": 0}, {"a": -1, "b": 2}, {"a": float("nan")}])
def test_normalize_weights_rejects_invalid(bad):
    with pytest.raises(ValueError):
        normalize_weights(bad)


def test_rover_profile_matches_proposal_weights():
    rover = MISSIONS["rover_mobility"].weights
    assert rover == {
        "slope": 0.30,
        "roughness": 0.30,
        "elevation_relief": 0.15,
        "rock_obstacles": 0.15,
        "terrain_variability": 0.10,
    }


@pytest.mark.parametrize("mission", list(MISSIONS))
def test_every_mission_profile_sums_to_one_and_uses_known_features(mission):
    weights = MISSIONS[mission].weights
    assert math.isclose(sum(weights.values()), 1.0)
    assert set(weights) <= set(FEATURES)


def test_resolve_weights_renormalizes_subset():
    w = resolve_weights(["slope", "roughness"], MISSIONS["rover_mobility"].weights)
    assert w == pytest.approx({"slope": 0.5, "roughness": 0.5})


def test_resolve_weights_extra_feature_gets_default_then_normalized():
    w = resolve_weights(["slope", "geology"], {"slope": 0.3})
    assert w["geology"] == pytest.approx(DEFAULT_EXTRA_WEIGHT / (0.3 + DEFAULT_EXTRA_WEIGHT))
    assert math.isclose(sum(w.values()), 1.0)


def test_resolve_weights_overrides_are_normalized():
    w = resolve_weights(["slope", "roughness"], {"slope": 0.3, "roughness": 0.3}, {"slope": 80, "roughness": 20})
    assert w == pytest.approx({"slope": 0.8, "roughness": 0.2})


def test_resolve_weights_rejects_empty_and_unknown():
    with pytest.raises(ValueError):
        resolve_weights([], {})
    with pytest.raises(ValueError):
        resolve_weights(["not_a_feature"], {})


# ---------------------------------------------------------- feature similarity


def test_numeric_similarity_identical_is_one_and_decays():
    assert numeric_similarity(5, 5, 3) == 1.0
    assert numeric_similarity(5, 8, 3) == pytest.approx(math.exp(-0.5))
    assert numeric_similarity(5, 20, 3) < numeric_similarity(5, 8, 3)
    assert numeric_similarity(2, 5, 3) == numeric_similarity(5, 2, 3)  # symmetric


def test_log_ratio_similarity_is_scale_invariant():
    assert log_ratio_similarity(100, 100, 1.8) == 1.0
    assert log_ratio_similarity(60, 120, 1.8) == pytest.approx(log_ratio_similarity(600, 1200, 1.8))
    assert log_ratio_similarity(100, 180, 1.8) == pytest.approx(math.exp(-0.5))
    assert log_ratio_similarity(0, 10, 1.8) == 0.0


def test_categorical_similarity_families():
    geo = FEATURES["geology"]
    assert categorical_similarity("mare_basalt", "mare_basalt", geo) == 1.0
    assert categorical_similarity("mare_basalt", "basaltic_lava", geo) == geo.family_similarity
    assert categorical_similarity("mare_basalt", "impact_ejecta", geo) == 0.0


def test_effective_resolution_is_coarsest():
    assert effective_resolution(1.0, 30.0) == 30.0
    assert effective_resolution(None, 30.0) == 30.0
    assert effective_resolution(None, None) is None


# --------------------------------------------------------------------- scoring


def test_perfect_match_scores_100():
    w = normalize_weights({"slope": 1, "roughness": 1})
    t = {"slope": m(5.0), "roughness": m(2.0)}
    r = score_candidate(w, t, dict(t))
    assert r.score == pytest.approx(100.0)
    assert r.coverage == pytest.approx(1.0)
    assert r.confidence == "high"


def test_score_follows_formula():
    w = normalize_weights({"slope": 0.3, "roughness": 0.7})
    t = {"slope": m(5.0), "roughness": m(2.0)}
    c = {"slope": m(8.0), "roughness": m(2.0)}
    r = score_candidate(w, t, c)
    expected = 100 * (0.3 * math.exp(-0.5 * (3 / FEATURES["slope"].tolerance) ** 2) + 0.7 * 1.0)
    assert r.score == pytest.approx(expected)


def test_missing_feature_is_not_counted_as_match():
    w = normalize_weights({"slope": 0.7, "roughness": 0.3})
    t = {"slope": m(5.0), "roughness": m(2.0)}
    c = {"slope": m(5.0)}  # roughness missing
    r = score_candidate(w, t, c)
    assert r.coverage == pytest.approx(0.7)
    assert r.lower_bound == pytest.approx(70.0)  # missing treated as 0 for the lower bound
    assert r.upper_bound == pytest.approx(100.0)
    assert r.score == pytest.approx(100.0)  # re-normalized over scored features
    rough = next(f for f in r.features if f.feature_id == "roughness")
    assert rough.status == "missing_candidate" and rough.similarity is None


def test_score_withheld_below_min_coverage():
    w = normalize_weights({"slope": 0.5, "roughness": 0.5})
    r = score_candidate(w, {"slope": m(5.0), "roughness": m(2.0)}, {"slope": m(5.0)})
    assert r.coverage == pytest.approx(0.5)
    assert r.coverage < MIN_COVERAGE
    assert r.withheld and r.score is None
    assert r.confidence == "low"


def test_insufficient_resolution_excludes_rocks_from_30m_dem():
    w = normalize_weights({"slope": 0.85, "rock_obstacles": 0.15})
    t = {"slope": m(5.0, res=1.0), "rock_obstacles": m(5.0, res=0.3)}
    c = {"slope": m(5.0, res=30.0), "rock_obstacles": m(5.0, res=30.0)}
    r = score_candidate(w, t, c)
    rocks = next(f for f in r.features if f.feature_id == "rock_obstacles")
    assert rocks.status == "insufficient_resolution"
    assert rocks.effective_resolution_m == 30.0
    assert r.coverage == pytest.approx(0.85)


def test_required_feature_missing_withholds_score():
    w = normalize_weights({"crater_morphology": 0.4, "slope": 0.6})
    t = {"crater_morphology": m(0.2), "slope": m(5.0)}
    r = score_candidate(w, t, {"slope": m(5.0)}, required=("crater_morphology",))
    assert r.coverage == pytest.approx(0.6)  # coverage alone would allow a score
    assert r.withheld and r.score is None
    assert "crater morphology" in (r.withheld_reason or "")
    # Not selected -> not enforced
    w2 = normalize_weights({"slope": 1})
    assert score_candidate(w2, t, {"slope": m(5.0)}, required=("crater_morphology",)).score == pytest.approx(100)


def test_requires_normalized_weights():
    with pytest.raises(ValueError):
        score_candidate({"slope": 0.5}, {}, {})


def test_rank_key_puts_withheld_last():
    w = normalize_weights({"slope": 0.5, "roughness": 0.5})
    t = {"slope": m(5.0), "roughness": m(2.0)}
    good = score_candidate(w, t, {"slope": m(6.0), "roughness": m(2.5)})
    great = score_candidate(w, t, dict(t))
    withheld = score_candidate(w, t, {"slope": m(5.0)})
    ordered = sorted([withheld, good, great], key=rank_key)
    assert ordered == [great, good, withheld]


def test_rank_key_missing_data_never_outranks_full_coverage():
    w = normalize_weights({"slope": 0.6, "roughness": 0.4})
    t = {"slope": m(5.0), "roughness": m(2.0)}
    partial_perfect = score_candidate(w, t, {"slope": m(5.0)})  # score 100 on 60% coverage
    full_good = score_candidate(w, t, {"slope": m(6.0), "roughness": m(2.5)})
    assert partial_perfect.score > full_good.score
    assert sorted([partial_perfect, full_good], key=rank_key)[0] is full_good
