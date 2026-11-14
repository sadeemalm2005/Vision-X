"""Analysis orchestration: provider data -> engine -> serializable report."""

from __future__ import annotations

import uuid
from dataclasses import asdict
from datetime import datetime, timezone

from ..engine.bodies import DISCLAIMER, environmental_differences
from ..engine.explain import explain
from ..engine.features import FEATURES
from ..engine.missions import get_mission
from ..engine.similarity import MIN_COVERAGE, compare_feature, rank_key, resolve_weights, score_candidate
from ..providers.base import CandidateSite, DataProvider, TargetRegion
from .serializers import candidate_dict, target_dict


class AnalysisError(ValueError):
    """Raised for invalid analysis requests (mapped to HTTP 422)."""


def feature_availability(provider: DataProvider, target: TargetRegion) -> list[dict]:
    """For each feature: can it be compared for this target against at least one candidate?"""
    candidates = provider.list_candidates()
    out = []
    for fid, spec in FEATURES.items():
        tm = target.measurements.get(fid)
        comparable = 0
        with_data = 0
        reasons: set[str] = set()
        for c in candidates:
            cm = c.measurements.get(fid)
            if cm is not None:
                with_data += 1
            r = compare_feature(fid, 1.0, tm, cm)
            if r.status == "scored":
                comparable += 1
            else:
                reasons.add(r.status)
        if tm is None:
            reason = "No measurement for this target in the connected data."
        elif comparable == 0 and "insufficient_resolution" in reasons:
            reason = "Earth inputs are too coarse for this feature."
        elif comparable == 0:
            reason = "No Earth candidate has this measurement."
        else:
            reason = None
        out.append(
            {
                "feature_id": fid,
                "available": comparable > 0,
                "target_measured": tm is not None,
                "target_dataset": tm.dataset_id if tm else None,
                "target_resolution_m": tm.resolution_m if tm else None,
                "candidates_with_data": with_data,
                "candidates_comparable": comparable,
                "candidates_total": len(candidates),
                "reason": reason,
                "spec_name": spec.name,
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
    candidate_ids: list[str] | None = None,
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

    candidates: list[CandidateSite] = provider.list_candidates()
    if candidate_ids:
        wanted = set(candidate_ids)
        candidates = [c for c in candidates if c.id in wanted]
        if not candidates:
            raise AnalysisError("None of the requested candidate sites exist")

    scored = []
    for c in candidates:
        res = score_candidate(norm, target.measurements, c.measurements, required=mission.required)
        scored.append((c, res))
    scored.sort(key=lambda pair: rank_key(pair[1]))

    results = []
    for rank, (c, res) in enumerate(scored, start=1):
        exp = explain(res, target.name, c.name)
        results.append(
            {
                "rank": rank,
                "site": candidate_dict(c),
                "score": None if res.score is None else round(res.score, 1),
                "withheld": res.withheld,
                "withheld_reason": res.withheld_reason,
                "coverage": round(res.coverage, 4),
                "lower_bound": round(res.lower_bound, 1),
                "upper_bound": round(res.upper_bound, 1),
                "confidence": res.confidence,
                "features": [asdict(f) for f in res.features],
                "explanation": asdict(exp),
            }
        )

    used = sorted(
        {m.dataset_id for m in target.measurements.values()}
        | {m.dataset_id for c in candidates for m in c.measurements.values()}
    )
    return {
        "id": uuid.uuid4().hex[:12],
        "created_at": datetime.now(timezone.utc).isoformat(),
        "data_mode": provider.mode,
        "provider": provider.name,
        "body": body,
        "target": target_dict(target),
        "mission": {"id": mission.id, "name": mission.name, "caveat": mission.caveat, "required": list(mission.required)},
        "weights": [
            {"feature_id": fid, "weight": round(w, 6), "default_weight": mission.weights.get(fid)}
            for fid, w in norm.items()
        ],
        "results": results,
        "datasets_used": used,
        "environmental_differences": environmental_differences(body),
        "scoring": {
            "formula": "S = 100 × Σ (wᵢ × sᵢ)",
            "min_coverage": MIN_COVERAGE,
            "rule": (
                "Weights are normalized over the selected features. Only features measured on both sides at an adequate "
                "resolution are scored; the score is re-normalized over them and withheld if they carry less than "
                f"{MIN_COVERAGE:.0%} of the weight, or if a mission-required feature is missing. Sites are ranked by "
                "the conservative lower bound so missing data never moves a site up."
            ),
        },
        "disclaimer": DISCLAIMER,
    }
