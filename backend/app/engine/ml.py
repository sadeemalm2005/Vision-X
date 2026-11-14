"""Nearest-neighbour terrain search and agreement statistics (pure NumPy).

Proposal section 8.3: "Distance-based methods can compare a target planetary
patch with candidate Earth patches."

Uses the scaler fitted offline with the clustering model, so all vectors live
in the same standardized feature space. Distance is Euclidean over the
features the user selected (restricted to those the model was fitted on).
Every feature is treated equally here, unlike the mission-weighted score; the
two methods are deliberately independent so their agreement is informative.
"""

from __future__ import annotations

import math

import numpy as np


def vector(measurements: dict, features: list[str], log_features: set[str]) -> np.ndarray | None:
    vals = []
    for f in features:
        m = measurements.get(f)
        if m is None:
            return None
        v = float(m.value if hasattr(m, "value") else m["value"])
        vals.append(math.log10(max(v, 1e-3)) if f in log_features else v)
    return np.array(vals, dtype=float)


def standardize(X: np.ndarray, mean: np.ndarray, scale: np.ndarray) -> np.ndarray:
    return (X - mean) / scale


def knn_distances(target_z: np.ndarray, candidates_z: np.ndarray) -> np.ndarray:
    """Euclidean distance from the target to every candidate (standardized space)."""
    return np.sqrt(((candidates_z - target_z) ** 2).sum(axis=1))


def rankdata(x: np.ndarray) -> np.ndarray:
    """Average ranks (1-based), ties share their mean rank."""
    order = np.argsort(x, kind="mergesort")
    ranks = np.empty(len(x), dtype=float)
    ranks[order] = np.arange(1, len(x) + 1)
    for v in np.unique(x):
        idx = np.where(x == v)[0]
        if len(idx) > 1:
            ranks[idx] = ranks[idx].mean()
    return ranks


def spearman(a: np.ndarray, b: np.ndarray) -> float | None:
    """Spearman rank correlation; None if undefined (constant input or < 3 items)."""
    if len(a) < 3:
        return None
    ra, rb = rankdata(np.asarray(a, float)), rankdata(np.asarray(b, float))
    if ra.std() == 0 or rb.std() == 0:
        return None
    return float(np.corrcoef(ra, rb)[0, 1])


def top_overlap(ids_a: list[str], ids_b: list[str], n: int) -> int:
    return len(set(ids_a[:n]) & set(ids_b[:n]))
