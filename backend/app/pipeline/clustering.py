"""Unsupervised terrain clustering (K-means), fitted offline per scale profile.

Proposal section 8.3: "Unsupervised clustering, such as K-means, may group
terrain patches with similar feature profiles."

For each scale profile, every analysis window (planetary targets AND Earth
windows) is described by a feature vector, standardized, and clustered.
- Relief is log10-transformed: it spans two orders of magnitude.
- Features unusable at a profile's resolution are excluded (roughness for Mars).
- k is chosen by the silhouette score over k = 3..8, not by hand.
- Cluster names are generated from centroid values, relative to the profile's
  own distribution (tertiles), so they describe terrain type, NOT suitability.

The fitted scaler is stored so the API can place any vector in the same space
for nearest-neighbour search (engine/ml.py) without scikit-learn at runtime.
"""

from __future__ import annotations

import math

import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.preprocessing import StandardScaler

K_RANGE = range(3, 9)
SEED = 42

FEATURE_ORDER = {
    "lunar_fine": ["elevation_relief", "slope", "roughness", "terrain_variability"],
    "mars_regional": ["elevation_relief", "slope", "terrain_variability"],
}
LOG_FEATURES = {"elevation_relief"}


def transform(fid: str, v: float) -> float:
    return math.log10(max(v, 1e-3)) if fid in LOG_FEATURES else v


def matrix(entities: list[dict], features: list[str]) -> np.ndarray:
    return np.array([[transform(f, e["measurements"][f]["value"]) for f in features] for e in entities], dtype=float)


def _level(value: float, cuts: tuple[float, float], words: tuple[str, str, str]) -> str:
    return words[0] if value <= cuts[0] else words[1] if value <= cuts[1] else words[2]


def label_clusters(centroids_raw: np.ndarray, X_raw: np.ndarray, features: list[str]) -> list[str]:
    """Readable names. Centroids arrive sorted by slope, so the slope word is
    assigned by rank (always distinct); relief uses tertiles of this profile's
    data. Words are RELATIVE to the profile (a 'steep' Mars cluster at 1.85 km
    has gentler slopes than a 'gentle' lunar one at 40 m)."""
    si, ri = features.index("slope"), features.index("elevation_relief")
    r_cut = tuple(np.percentile(X_raw[:, ri], [33.3, 66.7]))
    k = len(centroids_raw)
    words = ["Gentle", "Moderate", "Steep"] if k <= 3 else ["Very gentle", "Gentle", "Moderate", "Steep", "Very steep"]
    names = []
    for i, c in enumerate(centroids_raw):
        slope = words[round(i * (len(words) - 1) / max(k - 1, 1))]
        relief = _level(c[ri], r_cut, ("low", "medium", "high"))
        names.append(f"{slope} slopes, {relief} relief")
    seen: dict[str, int] = {}
    out = []
    for n in names:  # disambiguate duplicates
        seen[n] = seen.get(n, 0) + 1
        out.append(n if seen[n] == 1 and names.count(n) == 1 else f"{n} ({chr(64 + seen[n])})")
    return out


def fit_profile(profile_id: str, targets: list[dict], patches: list[dict]) -> dict:
    features = FEATURE_ORDER[profile_id]
    entities = targets + patches
    X = matrix(entities, features)
    scaler = StandardScaler().fit(X)
    Z = scaler.transform(X)

    scores = {}
    models = {}
    for k in K_RANGE:
        km = KMeans(n_clusters=k, n_init=20, random_state=SEED).fit(Z)
        scores[k] = float(silhouette_score(Z, km.labels_))
        models[k] = km
    best_k = max(scores, key=scores.get)
    km = models[best_k]

    # Order clusters by mean slope so ids are stable and meaningful.
    centroids_z = km.cluster_centers_
    centroids_t = scaler.inverse_transform(centroids_z)
    order = np.argsort(centroids_t[:, features.index("slope")])
    remap = {int(old): new for new, old in enumerate(order)}
    labels = np.array([remap[int(l)] for l in km.labels_])
    centroids_t = centroids_t[order]
    # Back to original units for display (undo log on relief).
    X_raw = np.array([[e["measurements"][f]["value"] for f in features] for e in entities], dtype=float)
    centroids_raw = centroids_t.copy()
    for j, f in enumerate(features):
        if f in LOG_FEATURES:
            centroids_raw[:, j] = 10 ** centroids_raw[:, j]
    names = label_clusters(centroids_raw, X_raw, features)

    for e, lab in zip(entities, labels):
        e["cluster"] = int(lab)

    return {
        "method": "K-means (scikit-learn), standardized features, k chosen by silhouette score",
        "features": features,
        "log_features": sorted(LOG_FEATURES & set(features)),
        "scaler": {"mean": [round(float(x), 6) for x in scaler.mean_], "scale": [round(float(x), 6) for x in scaler.scale_]},
        "k": int(best_k),
        "silhouette_by_k": {str(k): round(v, 4) for k, v in scores.items()},
        "silhouette": round(scores[best_k], 4),
        "n_samples": len(entities),
        "clusters": [
            {
                "id": i,
                "label": names[i],
                "size": int((labels == i).sum()),
                "earth_windows": int((labels[len(targets):] == i).sum()),
                "centroid": {f: round(float(centroids_raw[i, j]), 3) for j, f in enumerate(features)},
            }
            for i in range(best_k)
        ],
    }
