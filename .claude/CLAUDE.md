# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Development Workflow

**All work is tracked through the backlog at `docs/backlog.md`.** Before starting any task:

1. Check whether it already exists in the backlog. If not, add it.
2. Run `/implement <backlog-id>` to execute the full Architect → Implementer → Reviewer → commit pipeline.
3. Mark the task `done` in `docs/backlog.md` once merged.

Backlog IDs follow the pattern `CV-NNN`, `EDITOR-NNN`, `DEV-NNN`, `DOCS-NNN`, `TEST-NNN`, etc.
Handoff reports live in `docs/handoffs/<task-id>/` (separate files per role).
Full handoff process is documented in `docs/handoffs.md`.

For local dev setup, testing, and deployment details see `README.dev.md`.

## Commands

### Frontend
```bash
bun run dev       # Dev server at http://localhost:5173
bun run build     # Type-check + Vite production build
bun run lint      # ESLint
```

### Backend
```bash
cd backend && source .venv/bin/activate
uvicorn main:app --reload --port 8000          # start
STORAGE_MODE=local LOCAL_STORAGE_ROOT=/tmp pytest tests/ -v   # tests
ruff check . && ruff format --check . && mypy . --ignore-missing-imports  # quality gates
```

### Verification Checklist
After any code change, run **all** of the following before committing:
1. `bun run build` — frontend type-check + production build
2. `bun run lint` — ESLint
3. `cd backend && source .venv/bin/activate && STORAGE_MODE=local LOCAL_STORAGE_ROOT=/tmp pytest tests/ -v` — backend tests

## Architecture Overview

Computer vision web app: image annotation editor + algorithm runner.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS
- **State**: Zustand (`src/store/editor/useEditorStore.ts`)
- **Canvas**: react-konva
- **Backend**: FastAPI (Python) + uvicorn
- **Storage**: Cloudflare R2 (presigned PUT) or local filesystem

### Frontend Routes
- `/` — Home
- `/blog`, `/blog/:slug` — Blog
- `/editor` — Main image editor

### Editor Layout (`src/pages/Editor.tsx`)
Two modes via `galleryMode` in the Zustand store:
1. **Gallery mode** — `EditorGallery` for browsing/uploading images
2. **Editor mode** — three-panel layout:
   - Left: tool palette, zoom, import/export JSON
   - Center: `CanvasWorkspace` (react-konva, pan/zoom); `FeatureLayer` renders all features
   - Right: `EditorRightPanel` — scrollable guided rail (hint → algorithm → config → run/summary → features)

### Feature Model
Every drawn or detected item is a `Feature` union type with a `source` field (`'manual'` | `'algorithm'`). Algorithm features are `readonly: true` and tagged with `algorithmId` + `runId`. Use `replaceAlgorithmFeatures(algorithmId, features)` to swap a run's results without touching manual features.

### Algorithm Plugin System
Add a new CV algorithm by:
1. Creating `src/components/editor/algorithms/<name>/adapter.ts` implementing `AlgorithmDefinition`:
   - `run(key, storageMode, config)` → calls backend via `src/lib/api.ts`
   - `toFeatures(result, runId)` → converts API response to `Feature[]`
   - `summary(result)` → label/value pairs for the run summary UI
   - `ConfigComponent` → React form for the algorithm's config
2. Registering in `src/components/editor/algorithms/registry.ts`

Currently registered: `chess-corners`, `chessboard`, `charuco`, `markerboard`.

### Storage Upload Flow
Images use content-addressed keys (`uploads/<sha256>`). The frontend hashes bytes with WebCrypto SHA-256, calls `POST /api/v1/storage/upload-ticket`, and only uploads if the object doesn't already exist. Storage key is then passed to CV endpoints.

### Backend Structure
```
backend/
  main.py          # FastAPI app, middleware stack, router registration, lifespan
  auth.py          # X-API-Key dependency (verify_api_key)
  limiter.py       # slowapi rate limiter (IP-keyed)
  routers/
    cv.py          # /api/v1/cv/chess-corners, /api/v1/cv/calibration-targets/detect
    storage.py     # upload-ticket, local-upload, local-object
  services/
    storage_service.py  # R2/local resolution, content-addressed keys, R2 cache
```

### Security Model

#### Authentication & Authorization
- **API key**: All `/api/v1/*` routes require `X-API-Key` header matching `API_KEY` env var. Comparison uses `hmac.compare_digest` (timing-safe). Unset `API_KEY` = auth disabled (dev only).
- **Startup guard** (`auth.py`): refuses to start when `CORS_ORIGINS` contains non-loopback origins and `API_KEY` is unset.
- **Frontend key**: `VITE_API_KEY` is baked into the bundle (visible in source) — acceptable for a personal app.

#### Rate Limiting
- Per-IP via slowapi: CV endpoints 10/min, storage upload 20/min, storage read 60/min.

#### Upload Security
- 50 MB hard cap enforced in three layers: middleware (`Content-Length`), endpoint (declared `size`), and R2 presigned URL (`ContentLength` in signature).
- Content-type whitelist: only `image/bmp`, `image/gif`, `image/jpeg`, `image/png`, `image/tiff`, `image/webp`.
- Image magic-byte validation via `is_image_bytes()`.
- Pixel-count limit: `MAX_IMAGE_PIXELS=64000000` + Pillow `DecompressionBombError` guard.

#### HTTP Security Headers
- **Backend** (`main.py` middleware): `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy: default-src 'none'; frame-ancestors 'none'; base-uri 'none'`.
- **Frontend** (`public/_headers`): HSTS, nosniff, DENY, Referrer-Policy, Permissions-Policy, full CSP with script SHA-256 hash and `frame-ancestors 'none'`.
- **Caddy** (reverse proxy, not in this repo): adds HSTS, nosniff, Referrer-Policy, strips `Server` and `Via` headers.

#### Infrastructure
- **Caddy** reverse proxies to FastAPI on the backend server. Caddyfile is managed outside this repo on the deploy host.
- **Cloudflare Pages** serves the frontend. Security headers come from `public/_headers`.
- **Cloudflare edge**: HSTS, minimum TLS 1.2, Always Use HTTPS — configured in dashboard, not code.
- **Supply chain**: base Docker images pinned to patch versions; production deploys by image digest.
- Swagger UI / ReDoc / OpenAPI spec disabled when `API_KEY` is set (`docs_url=None`).

#### Security Verification
- Run `python scripts/verify-deployment.py` after each deploy to verify auth, headers, TLS, and DNS on the live site. See `--help` for options.
- Security backlog items use `SEC-NNN` IDs in `docs/backlog.md`.

#### When Modifying Security-Sensitive Code
When changing auth, middleware, upload validation, CORS, CSP, or storage:
1. Ensure `backend/tests/test_api.py` covers the change (auth enforcement, header presence, rate limits).
2. Run the full verification checklist (see Commands above).
3. After deploy, run `scripts/verify-deployment.py` against the live site.
