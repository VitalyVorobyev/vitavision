# Vitavision Quick Context (for future agents)

## What this repo is
- Frontend: React + Vite + TypeScript + Tailwind in `/src`.
- Backend: FastAPI in `/backend`.
- Goal of this branch: working chess-corner detection prototype with upload pipeline.

## Runtime layout
- Frontend route for prototype: `/chess-corners`.
- Existing editor route: `/editor` (independent annotation workspace).
- Backend API base: `http://localhost:8000/api/v1` (override via `VITE_API_BASE_URL`).

## Chess corners pipeline (implemented)
1. UI selects image file.
2. UI requests upload ticket from `POST /api/v1/storage/upload-ticket`.
3. UI uploads bytes directly with returned `upload.url` + method/headers.
- `storage_mode="r2"` uses presigned PUT to Cloudflare R2.
- `storage_mode="local"` uses backend local upload endpoint.
4. UI calls `POST /api/v1/cv/chess-corners` with:
- `key` (storage object key).
- `storage_mode` (`r2` or `local`).
- Optional detector config + ML toggle.
5. Backend loads image by key, runs `chess_corners`, returns:
- Subpixel coordinates.
- Orientation + direction vector.
- Derived confidence.
- Explicit frame semantics (`image_px_center`, top-left origin, x right, y down).
6. UI overlays detections and lists features in a side panel.

## Backend files to know
- `/backend/main.py`: app bootstrap, routers, CORS.
- `/backend/routers/storage.py`: upload-ticket, local upload fallback, local object serving.
- `/backend/routers/cv.py`: `chess-corners` endpoint and detector config handling.
- `/backend/services/storage_service.py`: storage mode resolution, R2 client, local path safety.
- `/backend/requirements.txt`: includes `chess-corners`, `numpy`, `pillow`, `boto3`.

## Frontend files to know
- `/src/pages/ChessCornersPage.tsx`: main prototype UI.
- `/src/lib/storage.ts`: upload ticket + direct upload client.
- `/src/lib/api.ts`: chess-corners API contract and request client.
- `/src/lib/http.ts`: API base constant.
- `/src/App.tsx`: route registration.
- `/src/components/layout/Navbar.tsx`: nav link.

## Environment and secrets
- Secrets are expected in `setenv.sh`.
- Known vars already present: `S3_KEY_ID`, `S3_KEY_SECRET`, `S3_ENDPOINT` (and `R2_AUTH_TOKEN` if needed externally).
- Default bucket: `vitavision` (override with `S3_BUCKET`).
- Default storage mode: `auto` (`STORAGE_MODE=auto|r2|local`).
- Default local storage root: `backend/local_storage` (override `LOCAL_STORAGE_ROOT`).

## Local run
- Backend commands:
- `cd backend`
- `python -m venv .venv && source .venv/bin/activate`
- `pip install -r requirements.txt`
- `uvicorn main:app --reload --port 8000`
- Frontend commands:
- `npm install`
- `npm run dev`

## Notes / guardrails
- Keep API contract explicit when changing request/response fields.
- Preserve frame semantics in responses; avoid implicit coordinate conversions.
- Local storage mode is for development fallback when R2 is unavailable or blocked by CORS.
