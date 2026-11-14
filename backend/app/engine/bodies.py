"""Environmental context that terrain matching can NOT reproduce.

Kept separate from terrain features on purpose (proposal sections 4 and 13):
these factors are reported alongside every result but never enter the score.
"""

from __future__ import annotations

BODIES = {
    "earth": {"name": "Earth", "gravity_ms2": 9.81},
    "moon": {
        "name": "Moon",
        "gravity_ms2": 1.62,
        "atmosphere": "Extremely tenuous exosphere",
        "surface_water": "Water ice in selected permanently shadowed regions",
        "erosion": "Impact gardening and space weathering; no wind or flowing liquid water",
        "materials": "Regolith and rock, including basalt and anorthosite",
        "craters": "Numerous, many well preserved",
    },
    "mars": {
        "name": "Mars",
        "gravity_ms2": 3.71,
        "atmosphere": "Thin, mostly carbon dioxide",
        "surface_water": "Water ice and evidence of past liquid water",
        "erosion": "Wind, impacts and evidence of ancient water-related processes",
        "materials": "Dust, regolith, basaltic and sedimentary rocks",
        "craters": "Numerous, with varying degrees of preservation",
    },
}

_DIFFERENCES = {
    "moon": [
        ("Gravity", "Lunar gravity is about 1.62 m/s², roughly one-sixth of Earth's 9.81 m/s². Mobility, traction and dust behaviour change."),
        ("Atmosphere", "The Moon has almost no atmosphere: no air drag, no weathering by wind, and extreme thermal swings."),
        ("Radiation", "No global magnetic field or atmosphere shields the lunar surface from solar and cosmic radiation."),
        ("Temperature", "Surface temperatures swing far beyond any Earth environment between lunar day and night."),
        ("Dust and regolith", "Lunar regolith is sharp, electrostatically charged and unweathered, unlike terrestrial soils."),
    ],
    "mars": [
        ("Gravity", "Martian gravity is about 3.71 m/s², roughly 38% of Earth's. Mobility and traction change."),
        ("Atmosphere", "Mars's atmosphere is thin and mostly carbon dioxide, at well under 1% of Earth's surface pressure."),
        ("Radiation", "Mars lacks a global magnetic field, so surface radiation is far higher than on Earth."),
        ("Temperature", "Martian surface temperatures are much colder on average, with large daily swings."),
        ("Dust and materials", "Martian dust and regolith chemistry (e.g. perchlorates) differ from terrestrial materials."),
    ],
}

DISCLAIMER = (
    "Earth2Moon evaluates similarities across selected measurable terrain characteristics. "
    "A high similarity score does not imply complete environmental equivalence, mission readiness, or operational safety."
)


def environmental_differences(body: str) -> list[dict[str, str]]:
    return [{"factor": f, "detail": d} for f, d in _DIFFERENCES[body]]
