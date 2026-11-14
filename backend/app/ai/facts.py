"""Build the fact sheet a language model may use, from server-computed values only.

The model never sees raw data or anything the client sent: the API recomputes
the analysis, then this module extracts exactly the numbers the report shows.
"""

from __future__ import annotations

from ..engine.features import FEATURES

GEOLOGY = {
    "mare_basalt": "mare basalt",
    "basaltic_lava": "basaltic lava",
    "impact_ejecta": "impact ejecta",
    "sedimentary_lacustrine": "lake sediments",
    "evaporite_sedimentary": "evaporite / sedimentary",
}


def _num(v: float | str | None, unit: str | None) -> str | None:
    if v is None:
        return None
    if isinstance(v, str):
        return GEOLOGY.get(v, v)
    txt = f"{v:.2f}" if abs(v) < 1 else (f"{v:.1f}" if abs(v) < 100 else f"{v:.0f}")
    return f"{txt}{unit}" if unit == "°" else f"{txt} {unit}" if unit else txt


def build_facts(analysis: dict, result: dict) -> dict:
    """Compact, human-readable facts for one Earth window in one analysis."""
    t = analysis["target"]
    site = result["site"]
    scale = analysis["search"]["scale_profile"]
    features = []
    for f in result["features"]:
        spec = FEATURES[f["feature_id"]]
        row = {
            "feature": spec.name,
            "weight_percent": round(f["weight"] * 100),
            "status": f["status"],
        }
        if f["status"] == "scored":
            row |= {
                "target_value": _num(f["target_value"], spec.unit),
                "earth_value": _num(f["candidate_value"], spec.unit),
                "similarity_0_to_1": round(f["similarity"], 2),
                "points_contributed": round(f["contribution"], 1),
            }
        else:
            row["why_not_compared"] = f["note"] or spec.requirement or "no data"
        features.append(row)

    ml = analysis.get("ml") or {}
    rml = result.get("ml") or {}
    facts = {
        "target": {
            "name": t["name"],
            "body": t["body"],
            "terrain_type": t["region_type"],
            "dataset": next(iter(t["measurements"].values()))["dataset_id"] if t["measurements"] else None,
        },
        "earth_window": {"name": site["name"], "country": site["country"], "site": site.get("site_name")},
        "mission": analysis["mission"]["name"],
        "mission_caveat": analysis["mission"]["caveat"],
        "comparison_scale": {
            "grid_metres": round(scale["grid_m"]),
            "window_km": scale["window_m"] / 1000,
            "regional_scale_only": result.get("scale_limited", False),
        },
        "score_out_of_100": result["score"],
        "score_withheld_reason": result.get("withheld_reason"),
        "rank": result["rank"],
        "windows_compared": analysis["search"]["patches_total"],
        "data_coverage_percent": round(result["coverage"] * 100),
        "confidence": result["confidence"],
        "features": features,
        "what_earth_cannot_reproduce": [d["factor"] for d in analysis["environmental_differences"]],
    }
    if ml.get("available") and rml:
        facts["machine_learning"] = {
            "terrain_cluster": rml.get("cluster_label"),
            "same_cluster_as_target": rml.get("same_cluster_as_target"),
            "nearest_neighbour_rank": rml.get("knn_rank"),
            "ranking_agreement_spearman": ml["agreement"]["spearman"],
        }
    return facts
