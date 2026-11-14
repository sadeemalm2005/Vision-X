"""HTTP routes. Thin layer: validation + delegation to services."""

from __future__ import annotations

from dataclasses import asdict
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from .engine.bodies import BODIES, DISCLAIMER, environmental_differences
from .engine.features import FEATURES
from .engine.missions import MISSIONS
from .engine.similarity import MIN_COVERAGE
from .providers.base import DataProvider
from .providers.registry import get_provider
from .services.analysis import AnalysisError, feature_availability, run_analysis
from .services.serializers import candidate_dict, target_dict

router = APIRouter(prefix="/api")


class AnalyzeRequest(BaseModel):
    body: Literal["moon", "mars"]
    target_id: str = Field(min_length=1, max_length=64)
    mission_id: str = Field(min_length=1, max_length=64)
    features: list[str] = Field(min_length=1, max_length=len(FEATURES))
    weights: dict[str, float] | None = None
    candidate_ids: list[str] | None = None


@router.get("/health")
def health(provider: DataProvider = Depends(get_provider)) -> dict:
    return {"status": "ok", "provider": provider.name, "data_mode": provider.mode}


@router.get("/meta")
def meta(provider: DataProvider = Depends(get_provider)) -> dict:
    return {
        "provider": provider.name,
        "data_mode": provider.mode,
        "disclaimer": DISCLAIMER,
        "min_coverage": MIN_COVERAGE,
        "counts": {
            "candidates": len(provider.list_candidates()),
            "targets": len(provider.list_targets()),
            "datasets": len(provider.list_datasets()),
        },
    }


@router.get("/bodies")
def bodies() -> dict:
    return {
        "bodies": BODIES,
        "differences": {b: environmental_differences(b) for b in ("moon", "mars")},
    }


@router.get("/features")
def features() -> list[dict]:
    return [asdict(f) for f in FEATURES.values()]


@router.get("/missions")
def missions() -> list[dict]:
    return [asdict(m) for m in MISSIONS.values()]


@router.get("/datasets")
def datasets(provider: DataProvider = Depends(get_provider)) -> list[dict]:
    return [asdict(d) for d in provider.list_datasets()]


@router.get("/targets")
def targets(
    body: Literal["moon", "mars"] | None = Query(default=None),
    provider: DataProvider = Depends(get_provider),
) -> list[dict]:
    return [target_dict(t) for t in provider.list_targets(body)]


@router.get("/targets/{target_id}/features")
def target_features(target_id: str, provider: DataProvider = Depends(get_provider)) -> list[dict]:
    target = provider.get_target(target_id)
    if target is None:
        raise HTTPException(404, f"Unknown target '{target_id}'")
    return feature_availability(provider, target)


@router.get("/candidates")
def candidates(provider: DataProvider = Depends(get_provider)) -> list[dict]:
    return [candidate_dict(c) for c in provider.list_candidates()]


@router.get("/candidates/{site_id}")
def candidate(site_id: str, provider: DataProvider = Depends(get_provider)) -> dict:
    c = provider.get_candidate(site_id)
    if c is None:
        raise HTTPException(404, f"Unknown site '{site_id}'")
    return candidate_dict(c)


@router.get("/terrain/{entity_id}")
def terrain(entity_id: str, provider: DataProvider = Depends(get_provider)) -> dict:
    s = provider.get_terrain_summary(entity_id)
    if s is None:
        raise HTTPException(404, f"No terrain summary for '{entity_id}'")
    return asdict(s)


@router.post("/analyze")
def analyze(req: AnalyzeRequest, provider: DataProvider = Depends(get_provider)) -> dict:
    try:
        return run_analysis(
            provider,
            body=req.body,
            target_id=req.target_id,
            mission_id=req.mission_id,
            features=req.features,
            weights=req.weights,
            candidate_ids=req.candidate_ids,
        )
    except AnalysisError as exc:
        raise HTTPException(422, str(exc)) from exc
