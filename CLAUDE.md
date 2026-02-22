# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Backend setup (first time)
```bash
cd backend
uv venv
source .venv/bin/activate
uv pip install -r requirements.txt
source ../setenv.sh   # loads R2 credentials (gitignored)
```

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
1. Frontend calls `POST /api/v1/storage/upload-ticket` → gets presigned PUT URL + storage key
2. Frontend uploads file bytes directly to R2 (or to local backend endpoint in local mode)
3. Storage key is passed to CV endpoints for image retrieval

Storage modes: `r2` (Cloudflare R2), `local` (filesystem at `backend/local_storage/`), `auto` (prefers R2, falls back to local).

### Backend Structure
```
backend/
  main.py                    # FastAPI app, CORS config, router registration
  routers/
    cv.py                    # POST /api/v1/cv/chess-corners
    storage.py               # upload-ticket, local-upload, local-object endpoints
  services/
    storage_service.py       # Storage mode resolution, R2 client, local file I/O
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
| `VITE_API_BASE_URL` | `http://localhost:8000/api/v1` | Frontend API base URL |

For local-only dev (no R2), set `STORAGE_MODE=local` and skip `setenv.sh`.
