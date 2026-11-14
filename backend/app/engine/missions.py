"""Mission profiles and their default feature weights.

All weights are PROTOTYPE starting points (proposal section 10), not
scientifically validated values. The rover profile reproduces the illustrative
weights from the proposal exactly. Weights are stored as relative values and
always normalized to sum to 1 by the engine.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MissionProfile:
    id: str
    name: str
    summary: str
    focus: tuple[str, ...]
    weights: dict[str, float]
    caveat: str
    # Features without which the comparison is meaningless for this mission.
    # If selected but not comparable for a site, that site's score is withheld.
    required: tuple[str, ...] = ()


MISSIONS: dict[str, MissionProfile] = {
    m.id: m
    for m in [
        MissionProfile(
            id="rover_mobility",
            name="Rover mobility",
            summary="Where a rover can practise driving, climbing and avoiding obstacles on comparable ground.",
            focus=("Slope", "Surface roughness", "Local relief", "Obstacles", "Terrain variability"),
            weights={
                "slope": 0.30,
                "roughness": 0.30,
                "elevation_relief": 0.15,
                "rock_obstacles": 0.15,
                "terrain_variability": 0.10,
            },
            caveat="Traction and wheel sinkage also depend on soil mechanics and gravity, which terrain data cannot capture.",
        ),
        MissionProfile(
            id="crater_navigation",
            name="Crater navigation",
            summary="Sites with comparable crater shape and rim relief for path-planning and localisation tests.",
            focus=("Crater morphology", "Rim-to-floor relief", "Slope", "Local topography"),
            weights={
                "crater_morphology": 0.40,
                "elevation_relief": 0.25,
                "slope": 0.20,
                "terrain_variability": 0.15,
            },
            caveat="Terrestrial craters are modified by erosion; preserved morphology differs from lunar craters.",
            required=("crater_morphology",),
        ),
        MissionProfile(
            id="geological_research",
            name="Geological field research",
            summary="Locations whose mapped geology and surface context support field-science rehearsal.",
            focus=("Geological indicators", "Rock units", "Regolith proxies", "Surface context"),
            weights={
                "geology": 0.50,
                "regolith_proxy": 0.20,
                "roughness": 0.15,
                "terrain_variability": 0.15,
            },
            caveat="Similar unit classes can differ in chemistry and weathering; confirm with spectral or laboratory evidence.",
            required=("geology",),
        ),
        MissionProfile(
            id="astronaut_training",
            name="Astronaut field training",
            summary="Diverse terrain for walking traverses, sampling and operations rehearsal.",
            focus=("Terrain diversity", "Elevation", "Overall terrain character"),
            weights={
                "terrain_variability": 0.30,
                "elevation_relief": 0.25,
                "slope": 0.20,
                "roughness": 0.15,
                "geology": 0.10,
            },
            caveat="Accessibility, logistics and human safety require separate professional assessment.",
        ),
    ]
}


def get_mission(mission_id: str) -> MissionProfile:
    try:
        return MISSIONS[mission_id]
    except KeyError as exc:
        raise ValueError(f"Unknown mission '{mission_id}'") from exc
