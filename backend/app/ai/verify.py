"""Reject generated text that contains numbers absent from the fact sheet.

Proposal §8.5: the summary "must not invent measurements". Every number in the
output must match a number in the facts (allowing the usual roundings), apart
from small counting numbers like "3 features" (integers 0-10).
"""

from __future__ import annotations

import json
import re

# Integers or decimals, with optional thousands separators ("1,634"); not parts of words like "s23w069".
_NUM = re.compile(r"(?<![\w.])[-+]?\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w])|(?<![\w.])[-+]?\d+(?:\.\d+)?(?![\w])")


def numbers_in(text: str) -> list[float]:
    return [float(m.replace(",", "")) for m in _NUM.findall(text)]


def allowed_numbers(facts: dict) -> set[float]:
    allowed: set[float] = set(float(i) for i in range(11))
    for v in numbers_in(json.dumps(facts, ensure_ascii=False)):
        for x in (v, abs(v)):
            allowed |= {round(x, 2), round(x, 1), float(round(x))}
        if 0 <= v <= 1:  # a similarity of 0.85 may be written as "85%"
            allowed.add(float(round(v * 100)))
    return allowed


def unverified_numbers(text: str, facts: dict) -> list[float]:
    ok = allowed_numbers(facts)
    return [v for v in numbers_in(text) if round(v, 2) not in ok]
