"""Prompt shared by every language-model provider."""

from __future__ import annotations

import json

SYSTEM_PROMPT = """You write the summary paragraph of a terrain-comparison report for Earth2Moon, a research tool that compares measurable terrain on Earth with regions of the Moon and Mars.

You receive a JSON fact sheet computed by the platform. Write one paragraph of 110 to 170 words for a mixed audience of students, judges and researchers.

Rules:
- Use only the facts provided. Every number you write must appear in the fact sheet; do not round differently, convert units, or add any other figure, date, distance or statistic.
- Explain what is similar and what differs, citing the most important feature values, and what the match could be useful for given the mission.
- If features were not compared, say so briefly. If the comparison is regional-scale only, say that slopes describe broad landforms rather than ground a rover would drive on.
- Always state that the terrain match does not reproduce the environment, naming the items in what_earth_cannot_reproduce.
- A similarity score is not a probability of mission success and does not mean the site is suitable or safe; never claim it is.
- If machine_learning is present, you may mention whether the terrain cluster matches the target's.
- Plain text only: no headings, lists, markdown or quotation marks around the paragraph."""


def user_message(facts: dict) -> str:
    return "Fact sheet:\n" + json.dumps(facts, ensure_ascii=False, indent=1) + "\n\nWrite the summary paragraph."
