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

> **Status: running on real NASA elevation data.**
> Every terrain measurement is computed by the project's pipeline from three datasets:
> **LOLA** lunar south-pole DEM (40 m), **MOLA MEGDR** global Mars topography (1.85 km) and one **NASADEM** tile in the Atacama Desert (30 m).
> Scores are research-discovery indicators, not validated findings: weights and tolerances are prototype values awaiting calibration.

## 📦 Data in use

| Body | Dataset | File | Resolution | Coverage |
|---|---|---|---|---|
| Moon | LRO LOLA gridded DEM (PDS Geosciences) | `ldem_85s_40m_float.img/.lbl` | 40 m | South pole, 85°S–90°S |
| Mars | MGS MOLA MEGDR (PDS Geosciences) | `megt90n000fb.img/.xml` | 32 px/deg ≈ 1.85 km | Global |
| Earth | NASADEM_HGT v001 (NASA Earthdata) | `s23w069.hgt` | 1″ ≈ 30 m | 23°S–22°S, 69°W–68°W (Atacama) |

**Targets.** Moon: Shackleton crater interior, the south pole on Shackleton's rim, and two windows picked automatically from the DEM (lowest-slope plain, highest-relief massif). Mars: the Curiosity, Perseverance and Opportunity landing sites.

**Earth search.** The Atacama tile is cut into overlapping analysis windows and every window is scored. That gives 399 windows of 10 km for lunar comparisons and 72 windows of 30 km for Mars comparisons; results appear as a heatmap.

**Scale harmonization.** Each comparison runs on one shared grid:
- **Moon vs Earth:** LOLA 40 m against NASADEM resampled to 40 m.
- **Mars vs Earth:** MOLA 1.85 km against NASADEM area-averaged to 1.85 km. Mars comparisons are therefore **regional**: slopes describe landforms, not rover-scale ground. Roughness is unavailable for Mars, and confidence is capped at medium.

**Machine learning.** Two unsupervised methods run alongside the weighted score; no model is trained on labelled sites, because no defensible labelled set exists yet.
- **K-means terrain clustering** (scikit-learn, offline). It groups every window at a scale (targets and Earth windows) by standardized features, with relief log-scaled. k is chosen by silhouette score: k = 3 for both scales, silhouette 0.46 (Moon scale) and 0.47 (Mars scale). Shown as a "Clusters" map layer.
- **Nearest-neighbour search** (NumPy, at runtime). It ranks Earth windows by distance to the target in the same standardized space, with equal feature weights.
- **Agreement.** Each analysis reports the top-10 overlap and the Spearman correlation between the two rankings. Rover-mobility tests gave ρ = 0.95–0.99 and 6–9 of 10 shared windows.

**AI summaries (language model).** Each site report has a **Generate AI summary** button that writes a readable paragraph from the report's numbers.
- **Facts recomputed on the server:** client data is never trusted.
- **Every number checked:** a summary containing any number not in the data is rejected and not shown.
- **Saved after generation:** results are cached on the server and saved in the browser, so repeat views cost nothing.
- **Daily limit:** a cap, 200 per day by default, protects your API budget.
- **Providers:** Claude, OpenAI or Gemini, chosen by setting. With no key set the button is hidden and the site works as before. Setup is under [Enabling AI summaries](#enabling-ai-summaries).

**Not available yet** (shown with the reason in the app):
- **Crater morphology:** needs a crater-detection step.
- **Rocks:** need sub-metre imagery.
- **Geology:** needs geological maps.
- **Regolith proxies:** need material or spectral data.

Because of this, the crater-navigation and geological-research missions are locked. Death Valley, Meteor Crater, Hawaii and Iceland have no elevation tile yet, so they are not scored.

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

The processed features (`backend/app/data/processed/nasa_features.json`) and hillshades (`frontend/public/terrain/`) are committed, so the site runs without the raw data. To **rebuild** them from the raw datasets (not in git; about 375 MB):

```bash
# unzip NASA-DATA.zip into backend/data/raw/ (and unzip the NASADEM tile inside earth/), then:
cd backend && python -m app.pipeline.build --raw data/raw/NASA-DATA    # ~10 s
```

### Tests

```bash
cd backend  && pip install -r requirements-dev.txt && python -m pytest   # 65 tests: terrain math, readers, ML, scoring, API
cd frontend && npx vitest run            # weight preview + polar projection
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
    ml.py                     nearest-neighbour search, Spearman agreement (NumPy)
    explain.py                template explanations built only from computed values
    bodies.py                 environmental differences + mandatory disclaimer
  app/pipeline/               OFFLINE DATA PROCESSING (NumPy)
    readers.py                LOLA (PDS3), MOLA MEGDR (PDS4), NASADEM (HGT) readers + projections
    terrain.py                relief, slope, roughness, variability, hillshade, resampling
    build.py                  harmonize scales, cut Earth windows, write features + PNGs
    clustering.py             K-means terrain clusters (scikit-learn), k by silhouette
  app/providers/              DATA LAYER
    base.py                   DataProvider interface
    nasa.py                   serves the processed features
  app/data/catalog/           datasets.json, sites.json (descriptions only, no numbers)
  app/data/processed/         nasa_features.json (generated, committed)
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
7. **Scale flag:** a feature compared above its recommended resolution (e.g. slope at 1.85 km) is scored but flagged as regional-scale, and the result's confidence is capped at medium.
8. **Explanations** are deterministic templates over computed values. No language model generates numbers or claims.

Mission weights, tolerances and kernels are **prototype values**. The rover profile reproduces the proposal's illustrative weights (30/30/15/15/10). They must be calibrated with sensitivity and ablation testing on real data.

---

## Adding more data

- **More Earth sites:** download the NASADEM tile (e.g. `n35w112` for Meteor Crater, `n36w117` for Death Valley, `n19w156` for Hawaii). Extend `build_earth` in `app/pipeline/build.py` to loop over tiles, add the tile id to the site in `catalog/sites.json`, and rebuild.
- **Rover-scale Mars:** a HiRISE DTM (~1 m) for a target would allow 40 m comparisons like the Moon's.
- **Geology / craters / rocks:** geological maps, a crater-detection step, or sub-metre imagery unlock the locked features and missions.
- Then recalibrate tolerances and weights and run the validation plan (reference cases, sensitivity, ablation, expert review).

---

## Deployment (one public link)

The `Dockerfile` builds the frontend and serves it from the FastAPI backend, so the whole site runs as **one service at one URL**.

**Render (free):**
1. Sign in at https://render.com with GitHub.
2. Choose **New → Blueprint** and select this repository. Render reads `render.yaml`.
3. Click **Apply**. After the build (about 5 minutes) the site is live at `https://earth2moon-xxxx.onrender.com`.

The free tier sleeps after 15 minutes without visitors; the first visit after that takes about a minute to wake up. Each push to `main` redeploys automatically.

## Enabling AI summaries

Set **one** API key as an environment variable. Locally, set it in the terminal before starting the backend; on Render, add it under **Environment**. Never commit a key.

| Provider | Key variable | Model |
|---|---|---|
| Claude (Anthropic) | `ANTHROPIC_API_KEY` | default `claude-opus-5-5`; set `EARTH2MOON_AI_MODEL=claude-haiku-5-5` for a much cheaper model |
| OpenAI | `OPENAI_API_KEY` | **required:** `EARTH2MOON_AI_MODEL=<current OpenAI model name>` |
| Gemini (Google AI Studio) | `GEMINI_API_KEY` | **required:** `EARTH2MOON_AI_MODEL=<current Gemini model name>` |

If several keys are set, pick one with `EARTH2MOON_AI_PROVIDER=anthropic|openai|gemini`, or switch the feature off with `none`.

**Claude settings:** the request uses `effort: low` and server-side refusal fallbacks. A report summary uses roughly 1–3 thousand tokens; check the provider's pricing page for current rates.

## Configuration

| Variable | Where | Default | Purpose |
|---|---|---|---|
| `EARTH2MOON_DATA_PROVIDER` | backend | `nasa` | Which data provider serves measurements |
| `EARTH2MOON_AI_PROVIDER` | backend | `auto` | `auto` (first key found), `anthropic`, `openai`, `gemini` or `none` |
| `EARTH2MOON_AI_MODEL` | backend | Claude: `claude-opus-5-5` | Model name for the chosen provider |
| `EARTH2MOON_AI_DAILY_LIMIT` | backend | `200` | Maximum new AI summaries per day (cache hits are free) |
| `EARTH2MOON_CORS_ORIGINS` | backend | `http://localhost:5173,…` | Allowed browser origins |
| `VITE_API_BASE_URL` | frontend build | *(same origin)* | Absolute API URL when hosted separately |
| `VITE_API_PROXY` | frontend dev | `http://127.0.0.1:8000` | Dev-server proxy target |

No API keys are needed for the core site; one is needed only for AI summaries. The tile services used (NASA Trek, NASA GIBS for the Earth texture, Esri, CARTO) are public. No secrets are stored in frontend code.

## Credits

Planet imagery: NASA Blue Marble via NASA GIBS; LRO WAC mosaic (NASA/GSFC/ASU); Viking MDIM 2.1 and MOLA shaded relief (NASA/JPL/USGS/GSFC) via NASA Solar System Treks. Earth basemaps © Esri and partners, © OpenStreetMap contributors, © CARTO. Earth2Moon is an independent project, not affiliated with or endorsed by NASA.
