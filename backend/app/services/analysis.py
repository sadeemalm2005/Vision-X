"""Analysis orchestration: provider data -> engine -> serializable report.

A target is compared with every Earth patch computed at the SAME scale profile
(same grid spacing and window size). Full explained results are returned for
the top ``top_n`` patches; a compact score list covers every patch so the map
can draw a similarity heatmap.
"""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from ..engine.bodies import DISCLAIMER, environmental_differences
from ..engine.explain import explain
from ..engine.features import FEATURES
from ..engine.missions import get_mission
from ..engine.similarity import MIN_COVERAGE, compare_feature, rank_key, resolve_weights, score_candidate
from ..providers.base import DataProvider, TargetRegion
from .serializers import patch_dict, target_dict

DEFAULT_TOP_N = 10


class AnalysisError(ValueError):
    """Raised for invalid analysis requests (mapped to HTTP 422)."""


def feature_availability(provider: DataProvider, target: TargetRegion) -> list[dict]:
    """For each feature: can it be compared for this target against at least one Earth patch?"""
    patches = provider.list_patches(target.scale_profile)
    out = []
    for fid, spec in FEATURES.items():
        tm = target.measurements.get(fid)
        statuses = [compare_feature(fid, 1.0, tm, p.measurements.get(fid)) for p in patches]
        comparable = sum(1 for s in statuses if s.status == "scored")
        with_data = sum(1 for p in patches if fid in p.measurements)
        if tm is None:
            reason = spec.requirement or "Not measured for this target in the connected datasets."
        elif comparable == 0 and any(s.status == "insufficient_resolution" for s in statuses):
            reason = f"Effective resolution is too coarse for this feature (needs ≤ {spec.max_effective_resolution_m:g} m)."
        elif comparable == 0:
            reason = spec.requirement or "No Earth data for this feature."
        else:
            reason = None
        scale_note = next((s.note for s in statuses if s.scale_limited), None)
        out.append(
            {
                "feature_id": fid,
                "available": comparable > 0,
                "target_measured": tm is not None,
                "target_dataset": tm.dataset_id if tm else None,
                "target_resolution_m": tm.resolution_m if tm else None,
                "candidates_with_data": with_data,
                "candidates_comparable": comparable,
                "candidates_total": len(patches),
                "reason": reason,
                "scale_note": scale_note,
            }
        )
    return out


def run_analysis(
    provider: DataProvider,
    *,
    body: str,
    target_id: str,
    mission_id: str,
    features: list[str],
    weights: dict[str, float] | None = None,
    top_n: int = DEFAULT_TOP_N,
) -> dict:
    target = provider.get_target(target_id)
    if target is None:
        raise AnalysisError(f"Unknown target region '{target_id}'")
    if target.body != body:
        raise AnalysisError(f"Target '{target.name}' is on the {target.body}, not the {body}")
    try:
        mission = get_mission(mission_id)
        norm = resolve_weights(features, mission.weights, weights)
    except ValueError as exc:
        raise AnalysisError(str(exc)) from exc

    patches = provider.list_patches(target.scale_profile)
    if not patches:
        raise AnalysisError("No Earth data has been processed at this target's scale")
    profile = next(p for p in provider.list_profiles() if p.id == target.scale_profile)

    scored = [(p, score_candidate(norm, target.measurements, p.measurements, required=mission.required)) for p in patches]
    scored.sort(key=lambda pair: rank_key(pair[1]))

    results = []
    for rank, (p, res) in enumerate(scored[:top_n], start=1):
        site = provider.get_site(p.site_id)
        exp = explain(res, target.name, p.name)
        results.append(
            {
                "rank": rank,
                "site": patch_dict(p, site, profile.window_m),
                "score": None if res.score is None else round(res.score, 1),
                "withheld": res.withheld,
                "withheld_reason": res.withheld_reason,
                "coverage": round(res.coverage, 4),
                "lower_bound": round(res.lower_bound, 1),
                "upper_bound": round(res.upper_bound, 1),
                "confidence": res.confidence,
                "scale_limited": res.scale_limited,
                "features": [asdict(f) for f in res.features],
                "explanation": asdict(exp),
            }
        )

    all_scores = [
        {
            "id": p.id,
            "rank": i,
            "lat": p.lat,
            "lon": p.lon,
            "bounds": [list(p.bounds[0]), list(p.bounds[1])],
            "score": None if r.score is None else round(r.score, 1),
            "lower_bound": round(r.lower_bound, 1),
        }
        for i, (p, r) in enumerate(scored, start=1)
    ]
    n_withheld = sum(1 for _, r in scored if r.withheld)

    used = sorted({m.dataset_id for m in target.measurements.values()} | {m.dataset_id for p in patches for m in p.measurements.values()})
    return {
        "id": uuid.uuid4().hex[:12],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data_mode": provider.mode,
        "provider": provider.name,
        "body": body,
        "target": target_dict(target),
        "mission": {"id": mission.id, "name": mission.name, "caveat": mission.caveat, "required": list(mission.required)},
        "weights": [
            {"feature_id": fid, "weight": round(w, 6), "default_weight": mission.weights.get(fid)} for fid, w in norm.items()
        ],
        "results": results,
        "search": {
            "scale_profile": asdict(profile),
            "patches_total": len(scored),
            "patches_withheld": n_withheld,
            "top_n": len(results),
            "all": all_scores,
        },
        "datasets_used": used,
        "environmental_differences": environmental_differences(body),
        "scoring": {
            "formula": "S = 100 × Σ (wᵢ × sᵢ)",
            "min_coverage": MIN_COVERAGE,
            "rule": (
                "Weights are normalized over the selected features. Only features measured on both sides at an adequate "
                "resolution are scored; the score is re-normalized over them and withheld if they carry less than "
                f"{MIN_COVERAGE:.0%} of the weight, or if a mission-required feature is missing. Patches are ranked by "
                "the conservative lower bound so missing data never moves a patch up."
            ),
        },
        "disclaimer": DISCLAIMER,
    }
