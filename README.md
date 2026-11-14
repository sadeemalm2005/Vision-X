# 🌍 Earth2Moon
### AI-Powered Space Analog Site Finder

**Find Earth. Explore Beyond.** Earth2Moon is an AI-assisted geospatial platform that ranks places on Earth by measurable terrain similarity to selected regions of the Moon and Mars, for a chosen mission objective, and explains where each match ends.

The project aims to help researchers and space enthusiasts discover potential Earth-based analog sites that can be used to test space exploration technologies before future lunar and Martian missions.

## 👥 Team

**Team Name:** Vision-X · **Project:** Earth2Moon – AI-Powered Space Analog Site Finder

- Sadeem Almohsen
- Hayat Mohammed
- Renad
- Raghad
- KM

## ⚠️ Important Note

Earth cannot fully reproduce the environmental conditions of the Moon or Mars. Earth2Moon compares selected terrain characteristics and identifies potential analog sites; it never claims that these locations are exact planetary equivalents.

> **Status: Phase 1 (interface and engine) complete. Project datasets not yet connected.**
> Every terrain measurement in the app is a **synthetic demonstration value**, labelled as such in the API (`provenance: "synthetic_demo"`) and the UI (amber *Demo* badges). Region names, coordinates and planetary imagery are real; the numbers compared are not. Do not cite any result.

---

## Quick start

Requirements: Python 3.11+ and Node 20+.

```bash
# 1. Backend: similarity engine + API on http://127.0.0.1:8000
cd backend
python -m venv .venv
.venv/Scripts/activate            # Windows  (macOS/Linux: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 2. Frontend on http://localhost:5173 (proxies /api to the backend)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. API docs are at http://127.0.0.1:8000/docs.

### Tests

```bash
cd backend  && python -m pytest          # 41 tests: scoring engine + API
cd frontend && npx vitest run            # weight-normalization preview
cd frontend && npm run build             # type-check + production build
```

> Windows note: run vitest from a terminal whose path starts with an upper-case drive letter (`C:\…`). A lower-case `c:\` working directory, as some editors open, makes vitest load itself twice and report "Cannot read properties of undefined (reading 'config')".

---

## What is in the app

| Route | Purpose |
|---|---|
| `/` | Landing page: problem, workflow, mission objectives, transparency, data sources |
| `/app` | Overview dashboard: counts, latest analysis, top sites, history, data-integration status |
| `/app/explore` | Five-step workflow: body → target region (with NASA Trek map) → mission → features (availability-checked) → run. Optional custom weights, normalized live |
| `/app/results/:id` | Ranked results: map, split planetary/Earth view, ranking chart with uncertainty ranges, contribution chart, explanations |
| `/app/results/:id/site/:siteId` | Full comparison report: *Why this location matches*, score anatomy, fingerprint radar, measurements, distributions, *Where it differs*, provenance |
| `/app/atlas` | All candidate sites on a map, filterable by Moon/Mars, searchable |
| `/app/saved` | Saved sites and analysis history (browser-local) |
| `/app/methodology` | Data & Methodology: pipeline status, planned datasets, feature definitions, scoring rules, integration point |
| `/app/limitations` | Scientific limitations: similarity vs equivalence, Earth/Moon/Mars comparison |
| `/app/about` | Project overview, objectives, technologies, roadmap, credits |

---

## Architecture

```
backend/                      Python · FastAPI
  app/engine/                 PURE scientific logic (no I/O), unit-tested
    features.py               feature catalog: kernels, tolerances, resolution limits
    missions.py               mission profiles: weights, required features
    similarity.py             S = 100·Σ wᵢ sᵢ, coverage, withholding, conservative ranking
    explain.py                template explanations built only from computed values
    bodies.py                 environmental differences + mandatory disclaimer
  app/providers/              DATA LAYER: where datasets connect
    base.py                   DataProvider interface (format-agnostic)
    demo.py                   DemoDataProvider (synthetic values, clearly labelled)
    registry.py               selects provider via EARTH2MOON_DATA_PROVIDER
  app/data/demo/*.json        demo targets, candidates, planned-dataset catalogue
  app/services/               orchestration: provider → engine → report
  app/api.py, main.py         HTTP routes, CORS, validation
frontend/                     React 19 · TypeScript · Vite · Tailwind v4
  src/lib/                    typed API client, local persistence, formatting, weight preview
  src/components/             UI kit, maps (Leaflet), charts (Recharts + custom), result parts
  src/pages/                  landing + app pages (lazy-loaded)
  public/textures/            NASA global mosaics used for the planet spheres
```

### Technology choices

- **FastAPI + pure-Python engine.** Terrain processing (rasterio/GDAL/NumPy) belongs in Python. The engine itself needs no third-party packages yet, so none were added. Geospatial libraries will be added with the real data provider, chosen once the file formats are known.
- **React + TypeScript + Vite + Tailwind v4.** A typed, component-based UI with a single token-based design system (`src/index.css`).
- **Leaflet.** NASA Solar System Treks serves Moon/Mars tiles in an equirectangular grid that matches Leaflet's built-in `EPSG:4326` CRS exactly. MapLibre does not support non-Mercator raster grids as simply.
- **Recharts plus hand-built charts.** Recharts draws the radar, distributions and profiles. Uncertainty ranges and contribution tracks are custom HTML/SVG for clarity.
- **localStorage for history and saved sites.** There are no accounts in the prototype, so there is no fake login. The limitation is stated in the UI.
- **No database yet.** Catalogues are small JSON files behind the provider interface. PostgreSQL/PostGIS becomes worthwhile once patch-level search over large rasters is implemented.

---

## Scoring rules (implemented in `backend/app/engine/similarity.py`)

1. **Formula:** `S = 100 × Σ (wᵢ × sᵢ)`, with weights normalized over the selected features (Σwᵢ = 1).
2. **Feature similarity sᵢ ∈ [0,1]:**
   - Numeric features use the Gaussian kernel `exp(−½(Δ/τ)²)`.
   - Relief uses the same kernel on the **log ratio**, which is scale-invariant.
   - Geology is a class match: 1 for the same class, 0.6 for the same family, otherwise 0.
3. **Resolution rule:** the effective resolution is the coarser of the two inputs. A feature is not scored if the effective resolution exceeds that feature's limit; for example, rocks need ≤ 1 m.
4. **No silent matches:** missing features are excluded and reported. `coverage` is the weight of the features actually compared.
5. **Withholding:** the score is withheld in two cases:
   - coverage is below 60%
   - a mission-required feature (craters for crater navigation, geology for geological research) cannot be compared
6. **Conservative ranking:** sites are ranked by the **lower bound**, which treats missing weight as zero agreement. A data gap can therefore never lift a site above a fully measured one. The re-normalized score and its possible range are shown alongside.
7. **Explanations** are deterministic templates over computed values. No language model generates numbers or claims.

Mission weights, tolerances and kernels are **prototype values**. The rover profile reproduces the proposal's illustrative weights (30/30/15/15/10). They must be calibrated with sensitivity and ablation testing on real data.

---

## Integrating the project datasets (Phase 2 → 4)

The UI, API and engine do not need to change. Only the data provider does:

1. Inspect the provided files (formats, CRS, resolution, variables).
2. Create `backend/app/providers/<name>.py` implementing `DataProvider` (see `providers/base.py`). It must:
   - return `TargetRegion` / `CandidateSite` objects whose `measurements` map feature ids (`engine/features.py`) to `Measurement(value, resolution_m, dataset_id, provenance)`
   - optionally return `TerrainSummary` histograms and profiles computed from the DEMs
3. Register it in `providers/registry.py` and set `EARTH2MOON_DATA_PROVIDER=<name>`.
4. Update `datasets.json` statuses from `planned` to `connected`, and set `data_status="real"` on entities backed by data. The UI's demo badges then disappear automatically for those entities.
5. Recalibrate tolerances and weights; run the validation plan (reference cases, feature checks, resolution, sensitivity, ablation, expert review).

---

## Deployment (one public link)

The `Dockerfile` builds the frontend and serves it from the FastAPI backend, so the whole site runs as **one service at one URL**.

**Render (free):**
1. Sign in at https://render.com with GitHub.
2. Choose **New → Blueprint** and select this repository. Render reads `render.yaml`.
3. Click **Apply**. After the build (about 5 minutes) the site is live at `https://earth2moon-xxxx.onrender.com`.

The free tier sleeps after 15 minutes without visitors; the first visit after that takes about a minute to wake up. Each push to `main` redeploys automatically.

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `EARTH2MOON_DATA_PROVIDER` | backend | `demo` | Which data provider serves measurements |
| `EARTH2MOON_DATA_DIR` | backend | `./data` | Root folder for real datasets (used by future providers) |
| `EARTH2MOON_CORS_ORIGINS` | backend | `http://localhost:5173,…` | Allowed browser origins |
| `VITE_API_BASE_URL` | frontend build | *(same origin)* | Absolute API URL when hosted separately |
| `VITE_API_PROXY` | frontend dev | `http://127.0.0.1:8000` | Dev-server proxy target |

No API keys are needed. The tile services used (NASA Trek, NASA GIBS for the Earth texture, Esri, CARTO) are public. No secrets are stored in frontend code.

## Credits

Planet imagery: NASA Blue Marble via NASA GIBS; LRO WAC mosaic (NASA/GSFC/ASU); Viking MDIM 2.1 and MOLA shaded relief (NASA/JPL/USGS/GSFC) via NASA Solar System Treks. Earth basemaps © Esri and partners, © OpenStreetMap contributors, © CARTO. Earth2Moon is an independent project, not affiliated with or endorsed by NASA.
