"""Terrain feature catalog.

Each feature declares *how* two measurements of it are compared. The catalog is
deliberately independent of any dataset: when real datasets are connected, the
data provider only has to emit measurements keyed by these feature ids.

Comparison kinds
----------------
numeric
    Similarity is a Gaussian kernel on the absolute difference:

        s = exp(-0.5 * (|a - b| / tolerance)^2)

    ``tolerance`` is the difference at which similarity falls to ~0.61. A
    Gaussian is used (rather than a clipped linear ramp) so that similarity
    decays smoothly and never jumps to exactly zero, which keeps rankings
    stable under small measurement changes. Tolerances below are PROTOTYPE
    values and must be revisited once real data distributions are known.

log_ratio
    For positive scale quantities (e.g. relief) where relative difference is
    what matters: 60 m vs 120 m is as different as 600 m vs 1200 m.

        s = exp(-0.5 * (ln(a / b) / ln(tolerance))^2)

    ``tolerance`` is a ratio (> 1); a ratio equal to it gives s ~ 0.61.

categorical
    Similarity is 1.0 for the same class, ``family_similarity`` for classes in
    the same family (e.g. two basaltic units), otherwise 0.0.

Resolution rule
---------------
``max_effective_resolution_m`` is the coarsest *effective* ground sampling at
which the feature can be meaningfully measured. The effective resolution of a
comparison is the coarser of the two inputs (proposal section 7: compare at a
scale appropriate to the coarsest input). If it exceeds this limit the feature
is reported as ``insufficient_resolution`` instead of being scored. Example: a
30 m DEM cannot resolve individual rocks.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

ComparisonKind = Literal["numeric", "log_ratio", "categorical"]


@dataclass(frozen=True)
class FeatureSpec:
    id: str
    name: str
    short_name: str
    unit: str | None
    kind: ComparisonKind
    description: str
    measured_as: str
    relevance: str
    tolerance: float | None = None
    max_effective_resolution_m: float | None = None
    # Finer scale at which the feature carries its full meaning; comparisons
    # coarser than this are allowed but flagged as regional-scale.
    recommended_resolution_m: float | None = None
    # What would be needed to measure the feature, if no dataset provides it.
    requirement: str | None = None
    # categorical only: class -> family
    families: dict[str, str] = field(default_factory=dict)
    family_similarity: float = 0.6


FEATURES: dict[str, FeatureSpec] = {
    f.id: f
    for f in [
        FeatureSpec(
            id="elevation_relief",
            name="Elevation / local relief",
            short_name="Relief",
            unit="m",
            kind="log_ratio",
            tolerance=1.8,
            max_effective_resolution_m=5000.0,
            description="Vertical range of terrain within the analysis window.",
            measured_as="Elevation range (95th minus 5th percentile) within the analysis window.",
            relevance="Topographic context, line-of-sight and route planning.",
        ),
        FeatureSpec(
            id="slope",
            name="Slope",
            short_name="Slope",
            unit="°",
            kind="numeric",
            tolerance=3.0,
            max_effective_resolution_m=2000.0,
            recommended_resolution_m=100.0,
            description="Mean terrain inclination derived from elevation.",
            measured_as="Mean slope angle from central differences on the harmonized DEM grid.",
            relevance="Rover traversability and hazard assessment.",
        ),
        FeatureSpec(
            id="roughness",
            name="Surface roughness",
            short_name="Roughness",
            unit="m",
            kind="numeric",
            tolerance=2.0,
            max_effective_resolution_m=100.0,
            description="Small-scale vertical variability of the surface.",
            measured_as="RMS of elevation minus its 3×3-cell local mean (small-scale relief at ~3 grid cells).",
            relevance="Mobility, wheel loading and landing-area screening.",
        ),
        FeatureSpec(
            id="terrain_variability",
            name="Terrain variability",
            short_name="Variability",
            unit="°",
            kind="numeric",
            tolerance=2.5,
            max_effective_resolution_m=2000.0,
            recommended_resolution_m=100.0,
            description="How much slope changes across the window.",
            measured_as="Standard deviation of slope within the analysis window.",
            relevance="Diversity of driving conditions and training scenarios.",
        ),
        FeatureSpec(
            id="crater_morphology",
            name="Crater morphology",
            short_name="Craters",
            unit="d/D",
            kind="numeric",
            tolerance=0.04,
            max_effective_resolution_m=100.0,
            description="Shape of the dominant crater(s): depth relative to diameter.",
            measured_as="Depth-to-diameter ratio of craters resolved in the DEM.",
            requirement="Needs a crater-detection step, which is not implemented yet.",
            relevance="Crater navigation, rim traverses and impact geology.",
        ),
        FeatureSpec(
            id="rock_obstacles",
            name="Rock / obstacle indicators",
            short_name="Rocks",
            unit="% area",
            kind="numeric",
            tolerance=4.0,
            max_effective_resolution_m=1.0,
            description="Fraction of surface covered by resolvable rocks.",
            measured_as="Rock cover from image-based detection; needs sub-metre imagery.",
            requirement="Needs sub-metre imagery (e.g. LROC NAC, HiRISE) for both sides.",
            relevance="Obstacle avoidance and hazard detection.",
        ),
        FeatureSpec(
            id="geology",
            name="Geological indicators",
            short_name="Geology",
            unit=None,
            kind="categorical",
            max_effective_resolution_m=None,
            families={
                "mare_basalt": "basaltic",
                "basaltic_lava": "basaltic",
                "basaltic_regolith": "basaltic",
                "impact_breccia": "impact",
                "impact_ejecta": "impact",
                "sedimentary_lacustrine": "sedimentary",
                "evaporite_sedimentary": "sedimentary",
                "highland_anorthosite": "anorthositic",
            },
            description="Dominant mapped surface unit class.",
            measured_as="Dominant unit from a published geological map, grouped into families.",
            requirement="Needs geological maps for the target and the Earth sites.",
            relevance="Geological field research and sampling practice.",
        ),
        FeatureSpec(
            id="regolith_proxy",
            name="Regolith-related proxies",
            short_name="Regolith",
            unit="index",
            kind="numeric",
            tolerance=0.15,
            max_effective_resolution_m=None,
            description="Indicators of loose surface material properties.",
            measured_as="Requires material maps, spectral data or laboratory samples.",
            requirement="Needs material maps, spectral data or laboratory samples.",
            relevance="Surface-material studies. Not a substitute for physical testing.",
        ),
    ]
}


def get_feature(feature_id: str) -> FeatureSpec:
    try:
        return FEATURES[feature_id]
    except KeyError as exc:  # pragma: no cover - guarded by API validation
        raise ValueError(f"Unknown feature '{feature_id}'") from exc
