"""Earth2Moon API entry point.  Run: uvicorn app.main:app --reload"""

from __future__ import annotations

import os
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import router
from .config import settings

app = FastAPI(
    title="Earth2Moon API",
    version="0.1.0",
    description="Terrain-similarity engine for planetary analog site discovery, serving features computed from LOLA, MOLA and NASADEM elevation data.",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)

# --------------------------------------------------------------------------
# Single-service deployment: if the built frontend exists, serve it too, so
# the whole site runs from one URL. In development Vite serves the frontend
# instead and this block is skipped.
# --------------------------------------------------------------------------
_default_dist = Path(__file__).resolve().parents[2] / "frontend" / "dist"
FRONTEND_DIST = Path(os.getenv("EARTH2MOON_FRONTEND_DIST", _default_dist))

if (FRONTEND_DIST / "index.html").is_file():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{path:path}", include_in_schema=False)
    def spa(path: str) -> FileResponse:
        if path.startswith("api/"):
            raise HTTPException(404, "Not found")
        candidate = (FRONTEND_DIST / path).resolve()
        # Real files in dist (favicon, textures); everything else -> React router.
        if path and candidate.is_file() and FRONTEND_DIST.resolve() in candidate.parents:
            return FileResponse(candidate)
        return FileResponse(FRONTEND_DIST / "index.html")
