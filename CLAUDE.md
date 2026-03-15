# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Workflow

Planning and implementation use a structured handoff process documented in `docs/handoffs.md`.
Run `/implement <backlog-id>` (e.g. `/implement CV-001`) to execute the full
Architect → Implementer → Reviewer → commit pipeline for a backlog task.

Handoff reports live in `docs/handoffs/<task-id>/` (separate files per role).
The backlog is at `docs/backlog.md`; IDs follow the pattern `CV-NNN`, `EDITOR-NNN`, etc.

## Commands

### Frontend
```bash
bun run dev       # Dev server at http://localhost:5173
bun run build     # Type-check + Vite production build
bun run lint      # ESLint
bun run preview   # Preview production build
```

### Backend
```bash
cd backend
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# Run backend smoke test / demo script
python test_chess.py
```

### Backend quality gates
```bash
cd backend && source .venv/bin/activate
ruff check .                        # lint
ruff format --check .               # formatting
mypy . --ignore-missing-imports     # type check
STORAGE_MODE=local LOCAL_STORAGE_ROOT=/tmp pytest tests/ -v   # tests
```
Install dev deps first: `uv pip install -r requirements-test.txt`

### Backend setup (first time)
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
source ../setenv.sh   # loads R2 credentials (gitignored)
```

### Docker (local dev)
```bash
# Build image locally
docker build -t vitavision-backend ./backend

# Run with a local .env file
docker run --env-file backend/.env -p 8000:8000 vitavision-backend
```

Copy `backend/.env.example` → `backend/.env` and fill in credentials before running Docker.

## Architecture Overview

This is a computer vision web app with an image annotation editor and algorithm runner.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand (`src/store/editor/useEditorStore.ts`)
- **Canvas**: react-konva (Konva.js wrapper)
- **Backend**: FastAPI (Python) + uvicorn
- **Storage**: Cloudflare R2 (presigned PUT) or local filesystem fallback

### Frontend Routes
- `/` — Home
- `/blog`, `/blog/:slug` — Blog with Markdown rendering
- `/editor` — Main image editor (the primary feature)

### Editor Layout (`src/pages/Editor.tsx`)
The editor has two modes controlled by `galleryMode` in the Zustand store:
1. **Gallery mode** — `EditorGallery` for browsing and uploading images
2. **Editor mode** — Three-panel layout:
   - Left sidebar: tool palette (select, point, line, polyline, bbox, ellipse), zoom controls, import/export JSON
   - Center: `CanvasWorkspace` — react-konva canvas with pan/zoom; `FeatureLayer` renders all features
   - Right panel: `EditorRightPanel` with "Features" tab (`FeatureListPanel`) and "Algorithms" tab (`AlgorithmPanel`)

### Zustand Store (`src/store/editor/useEditorStore.ts`)
Single store manages all editor state: image source/dimensions, active tool, selected feature ID, features list, zoom/pan, gallery images, and gallery mode toggle.

**Feature model**: Every drawn or detected item is a `Feature` union type. Features have a `source` field (`'manual'` | `'algorithm'`). Algorithm features are `readonly: true` and tagged with `algorithmId` + `runId`. Use `replaceAlgorithmFeatures(algorithmId, features)` to swap out a run's results without affecting manual features.

### Algorithm Plugin System
New CV algorithms are added by:
1. Creating an adapter in `src/components/editor/algorithms/<name>/adapter.ts` implementing `AlgorithmDefinition`:
   - `run(key, storageMode, config)` → calls backend API via `src/lib/api.ts`
   - `toFeatures(result, runId)` → converts API response to `Feature[]`
   - `summary(result)` → returns label/value pairs for the run summary UI
   - `ConfigComponent` → React form for the algorithm's config
2. Registering in `src/components/editor/algorithms/registry.ts`

Currently registered: `chess-corners` (ChESS X-junction keypoint detector).

### Storage Upload Flow
Images are stored under a **content-addressed key** (`uploads/<sha256-of-bytes>`), so the same file is never stored twice.

1. Frontend hashes the image bytes with WebCrypto SHA-256 (`sha256Hex` in `src/lib/storage.ts`)
2. Frontend calls `POST /api/v1/storage/upload-ticket` with `{ sha256, content_type, size }` → backend does a HEAD check
   - Object already exists → `{ exists: true, key }` — no upload needed
   - Object missing → `{ exists: false, key, upload: { url, method, headers } }` — presigned PUT URL returned
3. Frontend uploads only when `exists: false` (direct PUT to R2, or to local backend endpoint)
4. Storage key is passed to CV endpoints for image retrieval

Re-running an algorithm on the same image skips steps 2–3 entirely (ticket returns `exists: true`).

Storage modes: `r2` (Cloudflare R2), `local` (filesystem at `backend/local_storage/`), `auto` (prefers R2, falls back to local).

### Backend Structure
```
backend/
  main.py                    # FastAPI app, CORS config, router registration, size-limit middleware, lifespan (cache cleanup)
  auth.py                    # X-API-Key dependency (verify_api_key); reads API_KEY env var
  limiter.py                 # Shared slowapi Limiter instance (IP-keyed rate limiting)
  routers/
    cv.py                    # POST /api/v1/cv/chess-corners (10/min), POST /api/v1/cv/calibration-targets/detect (10/min)
    storage.py               # upload-ticket, local-upload, local-object endpoints (20-60 req/min)
  services/
    storage_service.py       # Storage mode resolution, R2 client, local file I/O, content-addressed keys, R2 cache
```

### Environment Variables
`setenv.sh` at repo root provides R2 credentials. Key backend vars:

| Variable | Default | Purpose |
|---|---|---|
| `STORAGE_MODE` | `auto` | `auto`, `r2`, or `local` |
| `S3_BUCKET` | `vitavision` | R2 bucket name |
| `S3_ENDPOINT` | none | R2 S3-compatible endpoint |
| `S3_KEY_ID` / `S3_KEY_SECRET` | none | R2 credentials |
| `LOCAL_STORAGE_ROOT` | `backend/local_storage` | Filesystem root for local mode |
| `CORS_ORIGINS` | `http://localhost:5173,...` | Comma-separated allowed origins |
| `API_KEY` | *(unset = auth disabled)* | `X-API-Key` value required on all `/api/v1/*` endpoints |
| `MAX_UPLOAD_BYTES` | `52428800` (50 MB) | Hard cap on request body size |
| `R2_CACHE_ROOT` | *(unset = disabled)* | Local directory for caching R2 downloads (e.g. `/data/cache` on Hetzner) |
| `R2_CACHE_MAX_AGE_HOURS` | `24` | Max age of cached R2 objects before cleanup |
| `LOG_FORMAT` | `text` | `json` for structured JSON logging (production), `text` for human-readable |
| `LOG_LEVEL` | `INFO` | Python log level (`DEBUG`, `INFO`, `WARNING`, `ERROR`) |
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Frontend API base URL (baked in at build time) |
| `VITE_API_KEY` | *(unset)* | Forwarded as `X-API-Key` header by the frontend; must match `API_KEY` |

For local-only dev (no R2), set `STORAGE_MODE=local` and skip `setenv.sh`.

To point the local frontend at the remote Hetzner backend, create `.env.local` (gitignored) in the repo root:
```
VITE_API_BASE_URL=https://<hetzner-domain>/api/v1
VITE_API_KEY=<same-value-as-backend-API_KEY>
```

### Production deployment (Hetzner)

The server runs at `/opt/demos/` and is managed via docker compose. The stack has two services:

- **`api`** — the FastAPI backend container (`ghcr.io/vitalyvorobyev/vitavision-backend`), exposed only on port 8000 internally, env loaded from `/opt/demos/.env`
- **`caddy`** — Caddy 2 reverse proxy, terminates TLS and forwards to `api`; config at `/opt/demos/Caddyfile`; data/config persisted in named volumes

```
/opt/demos/
  docker-compose.yml   # defines api + caddy services
  Caddyfile            # Caddy reverse proxy config
  .env                 # backend env vars (gitignored on server); must include API_KEY
```

CI pushes a new image to GHCR on every merge to `main`, captures the immutable `sha256` digest from the build step, then SSHes into the server and deploys by digest (not `:latest`) to prevent tag-swap attacks.

### Security model

- **Authentication**: All `/api/v1/*` endpoints require `X-API-Key` header matching `API_KEY` env var. Unset = auth disabled (dev only — always set in production).
- **Rate limiting**: Per-IP via `slowapi`. Limits: chess-corners 10/min, upload-ticket & local-upload 20/min, local-object 60/min.
- **Upload size**: Hard 50 MB cap enforced in HTTP middleware (checks `Content-Length`) and again inside `local_upload` endpoint. Configurable via `MAX_UPLOAD_BYTES`.
- **Error messages**: All exception details are stripped from API responses; exceptions are re-raised with `from exc` for server-side logging only.
- **Docker supply chain**: Base images pinned to specific patch versions (`python:3.12.9-slim-bookworm`, `uv:0.9.2`). Production deploys by image digest, not tag.
- **Frontend API key**: `VITE_API_KEY` is baked into the frontend bundle at build time and injected as `X-API-Key` via `apiHeaders()` in `src/lib/http.ts`. It is visible to anyone who inspects the bundle — this is acceptable for a personal/demo app but not for multi-tenant production use.
- **Remaining open items**: See `SECURITY_TASKS.md` (gitignored) for the full prioritised list. P2 tasks (CORS narrowing, security headers, Content-Type whitelist, zod import validation, image size limits in CV, CI permission scoping) and P3 tasks are still open.
