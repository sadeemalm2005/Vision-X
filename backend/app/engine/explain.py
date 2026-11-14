"""Deterministic, template-based explanations built only from computed values.

No language model is involved: every sentence is assembled from the feature
results so it can never state a number the engine did not calculate.
"""

from __future__ import annotations

from dataclasses import dataclass

from .features import FEATURES
from .similarity import STRONG_MATCH, WEAK_MATCH, FeatureResult, ScoreResult

GEOLOGY_LABELS = {
    "mare_basalt": "mare basalt",
    "basaltic_lava": "basaltic lava",
    "basaltic_regolith": "basaltic regolith",
    "impact_breccia": "impact breccia",
    "impact_ejecta": "impact ejecta",
    "sedimentary_lacustrine": "lake sediments",
    "evaporite_sedimentary": "evaporite / sedimentary",
    "highland_anorthosite": "highland anorthosite",
}

STATUS_TEXT = {
    "missing_target": "not measured for the planetary target",
    "missing_candidate": "not measured for this Earth site",
    "insufficient_resolution": "input resolution too coarse",
}


@dataclass
class Point:
    feature_id: str
    text: str
    similarity: float | None = None


@dataclass
class Explanation:
    headline: str
    summary: str
    strengths: list[Point]
    differences: list[Point]
    unavailable: list[Point]
    top_contributors: list[str]


def format_value(fid: str, value: float | str | None) -> str:
    if value is None:
        return "n/a"
    spec = FEATURES[fid]
    if spec.kind == "categorical":
        return GEOLOGY_LABELS.get(str(value), str(value))
    v = float(value)
    txt = f"{v:.2f}" if abs(v) < 1 else (f"{v:.1f}" if abs(v) < 100 else f"{v:.0f}")
    unit = spec.unit or ""
    return f"{txt}{unit}" if unit == "°" else f"{txt} {unit}".strip()


def _comparison(f: FeatureResult) -> str:
    name = FEATURES[f.feature_id].name
    return f"{name}: {format_value(f.feature_id, f.target_value)} (target) vs {format_value(f.feature_id, f.candidate_value)} (site)"


def _join(names: list[str]) -> str:
    if len(names) <= 1:
        return "".join(names)
    return ", ".join(names[:-1]) + " and " + names[-1]


def explain(result: ScoreResult, target_name: str, site_name: str) -> Explanation:
    scored = [f for f in result.features if f.status == "scored"]
    strengths = sorted((f for f in scored if (f.similarity or 0) >= STRONG_MATCH), key=lambda f: -(f.contribution or 0))
    differences = sorted((f for f in scored if (f.similarity or 0) < WEAK_MATCH), key=lambda f: f.similarity or 0)
    unavailable = [f for f in result.features if f.status != "scored"]
    top = sorted(scored, key=lambda f: -(f.contribution or 0))[:3]

    strong_names = [FEATURES[f.feature_id].name.lower() for f in strengths]
    diff_names = [FEATURES[f.feature_id].name.lower() for f in differences]

    if result.score is None:
        headline = f"Score withheld. {result.withheld_reason or ''}".strip()
    elif strong_names and diff_names:
        headline = f"Close in {_join(strong_names[:2])}; differs in {_join(diff_names[:2])}."
    elif strong_names:
        headline = f"Close in {_join(strong_names[:3])}."
    elif diff_names:
        headline = f"Weak terrain match; differs most in {_join(diff_names[:2])}."
    else:
        headline = "Moderate agreement across the compared features."

    parts = []
    if result.score is not None:
        parts.append(
            f"{site_name} scores {result.score:.0f}/100 against {target_name} across the selected features, "
            f"with {result.coverage:.0%} of the weight backed by data."
        )
    else:
        parts.append(
            f"{site_name} is not given an overall score against {target_name}. {result.withheld_reason or ''} "
            "Feature-level comparisons are still shown below."
        )
    if top:
        parts.append(
            "The largest contributions come from "
            + _join([f"{FEATURES[f.feature_id].name.lower()} ({f.contribution:.0f} pts)" for f in top])
            + "."
        )
    if unavailable:
        n = len(unavailable)
        noun, verb = ("feature", "is") if n == 1 else ("features", "are")
        parts.append(f"{n} selected {noun} could not be compared and {verb} excluded rather than counted as a match.")
    if result.score is not None and result.coverage < 1:
        parts.append(
            f"If the missing features were included the score could range from {result.lower_bound:.0f} to {result.upper_bound:.0f}."
        )

    return Explanation(
        headline=headline,
        summary=" ".join(parts),
        strengths=[Point(f.feature_id, _comparison(f), f.similarity) for f in strengths],
        differences=[Point(f.feature_id, _comparison(f), f.similarity) for f in differences],
        unavailable=[
            Point(f.feature_id, f"{FEATURES[f.feature_id].name}: {f.note or STATUS_TEXT[f.status]}") for f in unavailable
        ],
        top_contributors=[f.feature_id for f in top],
    )
