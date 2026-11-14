"""Terrain similarity engine.

Implements the proposal's weighted model

    S = 100 * sum_i (w_i * s_i),   sum_i w_i = 1,   s_i in [0, 1]

with explicit handling of missing data and resolution limits.

Missing-data rule (documented, see README "Scoring rules")
-----------------------------------------------------------
1. Weights are normalized over the features the user selected.
2. A feature is *scored* only if both target and candidate have a measurement
   and the effective resolution satisfies the feature's resolution limit.
3. ``coverage`` = sum of normalized weights of scored features.
4. If coverage < MIN_COVERAGE the overall score is WITHHELD (``score=None``);
   feature-level similarities are still reported.
5. Otherwise the score uses the formula with weights re-normalized over the
   scored features, and the report also gives the bounds the score could take
   if the missing features were perfect (upper) or total mismatches (lower).
   Missing features are never silently treated as matches.
   A mission may also declare REQUIRED features (e.g. crater morphology for
   crater navigation); if one is selected but not comparable, the score is
   withheld as well.
6. Results are RANKED by the lower bound (see ``rank_key``), so a data gap
   can never lift a site above a fully measured one.

This module is pure: no I/O, no framework imports. It is unit-tested in
``tests/test_similarity.py``.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from typing import Literal

from .features import FEATURES, FeatureSpec

MIN_COVERAGE = 0.6
DEFAULT_EXTRA_WEIGHT = 0.10  # weight for a selected feature outside the mission profile
STRONG_MATCH = 0.75
WEAK_MATCH = 0.5

FeatureStatus = Literal["scored", "missing_target", "missing_candidate", "insufficient_resolution"]


@dataclass(frozen=True)
class Measurement:
    value: float | str
    resolution_m: float | None
    dataset_id: str
    provenance: str  # e.g. "synthetic_demo" until real datasets are connected


@dataclass
class FeatureResult:
    feature_id: str
    weight: float
    status: FeatureStatus
    similarity: float | None = None
    contribution: float | None = None  # points out of 100 in the unadjusted sum
    target_value: float | str | None = None
    candidate_value: float | str | None = None
    effective_resolution_m: float | None = None
    target_dataset: str | None = None
    candidate_dataset: str | None = None
    note: str | None = None
    scale_limited: bool = False


@dataclass
class ScoreResult:
    score: float | None
    withheld: bool
    withheld_reason: str | None
    coverage: float
    lower_bound: float
    upper_bound: float
    confidence: Literal["high", "medium", "low"]
    features: list[FeatureResult] = field(default_factory=list)
    scale_limited: bool = False


# --------------------------------------------------------------------------- weights


def normalize_weights(raw: dict[str, float]) -> dict[str, float]:
    """Scale non-negative weights so they sum to exactly 1."""
    if any(w < 0 or not math.isfinite(w) for w in raw.values()):
        raise ValueError("Weights must be finite and non-negative")
    total = sum(raw.values())
    if total <= 0:
        raise ValueError("At least one selected feature must have a positive weight")
    return {k: v / total for k, v in raw.items()}


def resolve_weights(
    selected: list[str],
    mission_weights: dict[str, float],
    overrides: dict[str, float] | None = None,
) -> dict[str, float]:
    """Combine mission defaults, user overrides and the selection into normalized weights."""
    if not selected:
        raise ValueError("Select at least one terrain feature")
    unknown = [f for f in selected if f not in FEATURES]
    if unknown:
        raise ValueError(f"Unknown features: {', '.join(unknown)}")
    raw: dict[str, float] = {}
    for fid in dict.fromkeys(selected):  # de-duplicate, keep order
        if overrides and fid in overrides:
            raw[fid] = float(overrides[fid])
        else:
            raw[fid] = mission_weights.get(fid, DEFAULT_EXTRA_WEIGHT)
    return normalize_weights(raw)


# ---------------------------------------------------------------- feature similarity


def numeric_similarity(a: float, b: float, tolerance: float) -> float:
    """Gaussian kernel on the absolute difference (see features.py)."""
    if tolerance <= 0:
        raise ValueError("tolerance must be positive")
    return math.exp(-0.5 * ((a - b) / tolerance) ** 2)


def log_ratio_similarity(a: float, b: float, tolerance_ratio: float) -> float:
    """Gaussian kernel on the log ratio, for positive scale quantities."""
    if tolerance_ratio <= 1:
        raise ValueError("tolerance ratio must be > 1")
    if a <= 0 or b <= 0:
        return 1.0 if a == b else 0.0
    return math.exp(-0.5 * (math.log(a / b) / math.log(tolerance_ratio)) ** 2)


def categorical_similarity(a: str, b: str, spec: FeatureSpec) -> float:
    if a == b:
        return 1.0
    fam_a, fam_b = spec.families.get(a), spec.families.get(b)
    if fam_a is not None and fam_a == fam_b:
        return spec.family_similarity
    return 0.0


def feature_similarity(spec: FeatureSpec, a: float | str, b: float | str) -> float:
    if spec.kind == "numeric":
        assert spec.tolerance is not None
        return numeric_similarity(float(a), float(b), spec.tolerance)
    if spec.kind == "log_ratio":
        assert spec.tolerance is not None
        return log_ratio_similarity(float(a), float(b), spec.tolerance)
    return categorical_similarity(str(a), str(b), spec)


def effective_resolution(a: float | None, b: float | None) -> float | None:
    """The comparison can be no finer than its coarsest input."""
    known = [r for r in (a, b) if r is not None]
    return max(known) if known else None


# ------------------------------------------------------------------------- scoring


def compare_feature(
    fid: str,
    weight: float,
    target: Measurement | None,
    candidate: Measurement | None,
) -> FeatureResult:
    spec = FEATURES[fid]
    res = FeatureResult(
        feature_id=fid,
        weight=weight,
        status="scored",
        target_value=target.value if target else None,
        candidate_value=candidate.value if candidate else None,
        target_dataset=target.dataset_id if target else None,
        candidate_dataset=candidate.dataset_id if candidate else None,
    )
    if target is None:
        res.status, res.note = "missing_target", "No measurement for the planetary target."
        return res
    if candidate is None:
        res.status, res.note = "missing_candidate", "No measurement for this Earth site."
        return res
    eff = effective_resolution(target.resolution_m, candidate.resolution_m)
    res.effective_resolution_m = eff
    limit = spec.max_effective_resolution_m
    if limit is not None and eff is not None and eff > limit:
        res.status = "insufficient_resolution"
        res.note = f"Effective resolution {eff:g} m is coarser than the {limit:g} m this feature needs."
        return res
    res.similarity = feature_similarity(spec, target.value, candidate.value)
    res.contribution = 100.0 * weight * res.similarity
    rec = spec.recommended_resolution_m
    if rec is not None and eff is not None and eff > rec:
        res.scale_limited = True
        res.note = f"Compared at {eff:g} m: a regional-scale value, coarser than the {rec:g} m this feature needs for rover-scale meaning."
    return res


def confidence_from_coverage(coverage: float) -> Literal["high", "medium", "low"]:
    if coverage >= 0.9:
        return "high"
    if coverage >= 0.75:
        return "medium"
    return "low"


def score_candidate(
    weights: dict[str, float],
    target: dict[str, Measurement],
    candidate: dict[str, Measurement],
    min_coverage: float = MIN_COVERAGE,
    required: tuple[str, ...] | list[str] = (),
) -> ScoreResult:
    """Score one candidate against one target with already-normalized weights.

    ``required``: feature ids that must be scored (if selected) for the overall
    score to be meaningful; see MissionProfile.required.
    """
    if abs(sum(weights.values()) - 1.0) > 1e-9:
        raise ValueError("weights must be normalized")
    features = [compare_feature(fid, w, target.get(fid), candidate.get(fid)) for fid, w in weights.items()]
    scored = [f for f in features if f.status == "scored"]
    coverage = sum(f.weight for f in scored)
    lower = sum(f.contribution or 0.0 for f in scored)
    upper = lower + 100.0 * (1.0 - coverage)
    scored_ids = {f.feature_id for f in scored}
    missing_required = [fid for fid in required if fid in weights and fid not in scored_ids]
    reason = None
    if coverage < min_coverage - 1e-12:
        reason = f"Only {coverage:.0%} of the weighted features could be compared (minimum {min_coverage:.0%})."
    elif missing_required:
        names = ", ".join(FEATURES[f].name.lower() for f in missing_required)
        reason = f"Required feature not comparable: {names}."
    withheld = reason is not None
    score = None if withheld or coverage == 0 else lower / coverage
    confidence = confidence_from_coverage(coverage)
    scale_limited = any(f.scale_limited for f in scored)
    if scale_limited and confidence == "high":
        confidence = "medium"  # regional-scale comparisons never earn high confidence
    return ScoreResult(
        score=score,
        withheld=withheld,
        withheld_reason=reason,
        coverage=coverage,
        lower_bound=lower,
        upper_bound=upper,
        confidence=confidence,
        features=features,
        scale_limited=scale_limited,
    )


def rank_key(r: ScoreResult) -> tuple[int, float, float]:
    """Conservative ranking: scored results by LOWER BOUND (descending), withheld last.

    Ranking on the re-normalized score alone would let a site with missing data
    outrank a fully measured one (its gaps would effectively count as matches).
    The lower bound treats unmeasured weight as zero agreement, so missing data
    can never move a site up. Ties are broken by the re-normalized score.
    """
    return (1 if r.score is None else 0, -r.lower_bound, -(r.score or 0.0))
