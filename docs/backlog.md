# Backlog

## Status Values
- `todo` — not started
- `in-progress` — actively being worked
- `blocked` — waiting on something
- `done` — completed

## Priority Values
- `P0` — blocking release or correctness
- `P1` — next up
- `P2` — planned
- `P3` — someday

## ID Model
- Backlog ids (`INFRA-011`, `ALGO-014`, `DOCS-003`) are the stable planning ids used in this file.
- Workflow handoff ids (`TASK-012-...`) are execution-trace ids used under `docs/handoffs/`.
- Handoff reports should record both ids when the work came from the backlog.

---

## Active Sprint

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
(empty — see Done table)

## Up Next

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
(all moved to Done — see FE-008..FE-015 below)

## Backlog

| ID | Status | Priority | Type | Title | Notes |
|----|--------|----------|------|-------|-------|
| SEC-001 | done | P0 | security | Add startup guard for API_KEY in production | Refuse to start when CORS has non-localhost origins and API_KEY is unset |
| SEC-002 | done | P0 | security | Bind Docker port to localhost | Change "8000:8000" → "127.0.0.1:8000:8000" |
| SEC-003 | done | P1 | security | Disable Swagger UI/OpenAPI in production | docs_url=None when API_KEY is set |
| SEC-004 | done | P1 | security | Create public/_headers for Cloudflare Pages | Security headers + CSP as HTTP headers |
| SEC-005 | done | P1 | security | Validate upload size in upload-ticket endpoint | Reject size > MAX_UPLOAD_BYTES with 413 |
| SEC-006 | todo | P2 | security | Remove style-src unsafe-inline from CSP | Replace with hashes via vite-plugin-csp |
| SEC-007 | done | P3 | security | Add /.well-known/security.txt | Contact info for vulnerability reports |
| SEC-008 | todo | P2 | security | Add CSP to subdomains | annotation, pong, scene3d have no CSP at all (separate repos) |
| SEC-009 | done | P3 | security | Remove Via header from API responses | Caddyfile `-Via` directive; confirmed by live verification |
| SEC-010 | done | P3 | security | Fix CORS credentials header for rejected origins | Set `allow_credentials=False` — API uses header auth, not cookies |
| SEC-011 | todo | P3 | security | Resolve Cloudflare beacon CSP violation | Add to CSP or disable Cloudflare Web Analytics |
| SEC-012 | done | P1 | security | Post-deployment security verification tool | scripts/verify-deployment.py — checks auth, headers, TLS, DNS |

## API / Interface Tracking

## Acceptance Scenarios (Attached to Tasks)

## Done

| ID | Date | Type | Title | Notes |
|----|------|------|-------|-------|
| BE-015 | 2026-03-22 | security | Bound CV concurrency with dedicated thread pool executor | ThreadPoolExecutor(max_workers=2), CV_TIMEOUT_SECONDS default 30s. |
| BE-016 | 2026-03-22 | security | Cap R2 object memory under concurrent load | Bounded by dedicated executor worker limit. |
| BE-017 | 2026-03-22 | security | Add total pixel count limit to image decode | MAX_IMAGE_PIXELS=64M + Pillow DecompressionBombError guard. |
| BE-018 | 2026-03-22 | security | Set uvicorn `--limit-concurrency` | `--limit-concurrency 20` in Dockerfile CMD. |
| BE-019 | 2026-03-22 | security | Sanitize native exception messages in calibration_targets | Generic error message, log actual exception at WARNING. |
| BE-020 | 2026-03-22 | test | Add ringgrid detection integration test | 3 tests: happy path, 404, invalid key. |
| BE-021 | 2026-03-22 | docs | Document CV_TIMEOUT_SECONDS in .env.example | Also added CV_MAX_WORKERS, MAX_IMAGE_PIXELS. |
| BE-022 | 2026-03-22 | quality | Remove `Any` return type from calibration_targets detection | Union of 3 detection result types. |
| ALGO-020 | 2026-03-22 | feature | Ringgrid detection algorithm for editor | Backend endpoint + frontend adapter, overlay, config form. |
| UI-015 | 2026-03-22 | enhancement | Responsive target generator left panel | Narrow left panel w-40 below lg breakpoint. |
| FE-008 | 2026-03-22 | refactor | Split content manifest into index + per-article chunks | content-index.ts + per-slug lazy imports via import.meta.glob. |
| FE-009 | 2026-03-22 | perf | Add Zustand selectors to useEditorStore calls | useShallow on all 9 call sites. |
| FE-010 | 2026-03-22 | perf | Conditional mermaid loading for blog posts | Early return in useMermaid if no mermaid blocks. |
| FE-011 | 2026-03-22 | fix | Validate imported features with Zod instead of unsafe cast | featureSchema.safeParse + ring_marker/aruco_marker schemas. |
| FE-012 | 2026-03-22 | perf | Use ResizeObserver in CanvasWorkspace | ResizeObserver on containerRef. |
| FE-013 | 2026-03-22 | perf | Memoize FeatureLayer component | React.memo + useCallback for stable refs. |
| FE-014 | 2026-03-22 | test | Add tests for store actions and feature schemas | 13 new tests: replaceAlgorithmFeatures, normalizeImportedFeatures, ring_marker, aruco_marker. |
| FE-015 | 2026-03-22 | a11y | Add skip-to-content link and landmark audit | Skip-nav + id="main-content" on main element. |
| FE-001 | 2026-03-21 | feature | Add React Error Boundaries | ErrorBoundary wrapping canvas, config, blog content. |
| FE-002 | 2026-03-21 | infra | Set up Vitest and add core logic tests | 26 tests for featureSchema + reducer. |
| FE-003 | 2026-03-21 | enhancement | Replace alert() with sonner toasts | 5 alert() calls replaced. Toaster in App. |
| FE-004 | 2026-03-21 | fix | Add error handling to useTargetGenerator and ConfigurePanel | .catch() + try/catch. |
| FE-005 | 2026-03-21 | feature | Add catch-all 404 page | NotFound component + Route path="*". |
| FE-006 | 2026-03-21 | enhancement | Add route-level code splitting | React.lazy + Suspense for 7 pages. |
| FE-007 | 2026-03-21 | refactor | Extract hooks from CanvasWorkspace | usePixelSampler, useCanvasGestures, useDrawingHandlers. |
| EDITOR-017 | 2026-03-20 | feature | Add overlay visibility toggle to left rail | Layers popover for Features + Algorithm Overlay. |
| EDITOR-018 | 2026-03-20 | feature | Add diagnostics interface to ResultsPanel | DiagnosticEntry with info/warning/error levels. |
| EDITOR-019 | 2026-03-20 | feature | Add preset configurations to ConfigurePanel | AlgorithmPreset type + PresetPicker UI. |
| EDITOR-020 | 2026-03-20 | enhancement | Add CollapsibleSection to config forms | Progressive disclosure for advanced parameters. |
| EDITOR-021 | 2026-03-20 | feature | Add PolygonFeature to feature model and Zod schema | PolygonFeature with points[] + closed. |
| EDITOR-022 | 2026-03-20 | feature | Add polygon renderer to FeatureLayer | Closed Konva Line with semi-transparent fill. |
| EDITOR-023 | 2026-03-20 | feature | Add POLYGON drawing tool to left rail and CanvasWorkspace | Click vertices, dblClick to close. |
| EDITOR-024 | 2026-03-20 | feature | Deep link serialization for editor | useEditorDeepLink hook with URL param sync. |
| EDITOR-025 | 2026-03-20 | feature | blogSlug on chess-corners adapter | "Learn more" link in ConfigurePanel. |
| EDITOR-026 | 2026-03-20 | feature | "Try in Editor" link in blog content | Deep link in 00-intro.md. |
| EDITOR-027 | 2026-03-20 | enhancement | Responsive breakpoints for editor | Vertical stack layout below 768px. |
| EDITOR-028 | 2026-03-20 | enhancement | Radix tooltips + 44px touch targets | @radix-ui/react-tooltip on all toolbar buttons. |
| EDITOR-029 | 2026-03-20 | enhancement | Touch canvas support | Pinch-to-zoom via Konva touch handlers. |
| EDITOR-030 | 2026-03-20 | enhancement | Hide drawing tools on touch-only | useTouchOnly() media query hook. |
| BLOG-001 | 2026-03-20 | content | Add frontmatter to 00-intro.md | Blog manifest now populated. |
| BLOG-002 | 2026-03-20 | content | Add frontmatter to 01-chess.md | Draft outline with repoLinks + relatedAlgorithms. |
| TGEN-010 | 2026-03-20 | feature | ZIP bundle download | JSZip bundles all 4 formats. |
| TGEN-011 | 2026-03-20 | feature | Prerender target generator | SSR stub + sitemap entry. |
| TGEN-012 | 2026-03-16 | fix | Fix default page orientation (portrait → landscape) | Changed INITIAL_STATE + presets. |
| TGEN-013 | 2026-03-16 | feature | ArUco dictionary loader + hex-to-bitgrid decoder | New aruco/ module with loader, decoder, types. |
| TGEN-014 | 2026-03-16 | feature | Client-side ChArUco SVG generation | Full marker rendering, removed backend dependency for generation. |
| TGEN-015 | 2026-03-16 | cleanup | Remove backend generate endpoint | Removed generate endpoint + frontend API types. calib_targets kept for detection. |
| TGEN-016 | 2026-03-16 | feature | MarkerBoard circle config — data model + list editor | circles[] in config, table editor with add/remove/polarity, validation, centered default triangle. |
| TGEN-018 | 2026-03-16 | feature | DXF export for all target types | Minimal DXF R12 writer. Geometry only. Added DXF button to download bar. |
| TGEN-017 | 2026-03-16 | feature | MarkerBoard interactive circle placement on canvas | Click squares on preview to toggle circles. Auto-polarity from square color. |
| TGEN-019 | 2026-03-16 | enhancement | Remove Generate button, use preview as final SVG | All generation is client-side; preview = final. Downloads use previewSvg directly. |
| TGEN-020 | 2026-03-16 | feature | Auto circle polarity from square color | Removed polarity from CircleSpec. White circle on black square, black on white. |
| TGEN-021 | 2026-03-16 | feature | Configurable PNG DPI | Added pngDpi to PageConfig. Exposed in Paper config panel (72–1200). |
| TGEN-022 | 2026-03-16 | feature | Inner white square in black squares (laser calibration) | innerSquareRel (0–0.95) on all target types. For reflective surface calibration. |
| TGEN-009 | 2026-03-20 | feature | Add ring grid target type (client-side SVG) | Hex-lattice concentric ring markers with 16-sector code bands. Baseline + extended codebook profiles. |
| TGEN-023 | 2026-03-20 | feature | Add scale line to all target types | Minimal reference bar with label. Optional toggle (default ON). SVG + DXF integration. |
| BE-001 | 2026-03-21 | fix | Fix Content-Length parsing crash | try/except around int(content_length), returns 400. |
| BE-002 | 2026-03-21 | fix | Add byte-size guard in _decode_grayscale_image | Rejects images exceeding max_upload_bytes before decode. |
| BE-003 | 2026-03-21 | fix | Move load_dotenv() before _configure_logging() | .env LOG_FORMAT/LOG_LEVEL now respected. |
| BE-004 | 2026-03-21 | test | Add rate limiting and middleware integration tests | 7 new tests: rate limits, security headers, request ID, malformed Content-Length. |
| BE-005 | 2026-03-21 | fix | Remove dummy /calibrate endpoint | Endpoint removed. |
| BE-006 | 2026-03-21 | fix | Use actual media type for local-object GET | Uses local_media_type_for_key(). |
| BE-007 | 2026-03-21 | refactor | Split cv.py into routers/cv/ package | models.py, corners.py, calibration_targets.py, _shared.py. |
| BE-008 | 2026-03-21 | fix | Make R2 cache writes atomic | Write to .tmp then rename. |
| BE-009 | 2026-03-21 | enhancement | Add timeout for CV algorithm calls | CV_TIMEOUT_SECONDS (default 120s). |
| BE-010 | 2026-03-21 | enhancement | Run blocking CV calls via run_in_executor | Both endpoints use asyncio.wait_for + run_in_executor. |
| BE-011 | 2026-03-21 | enhancement | Propagate request ID via contextvars | ContextVar set in middleware, read by _JSONFormatter. |
| BE-012 | 2026-03-21 | test | Add middleware integration tests | Security headers, request ID, body size tests. |
| BE-013 | 2026-03-21 | test | Add storage service unit tests | 7 tests: keys, validation, path traversal, cache. |
| BE-014 | 2026-03-21 | test | Test for /calibrate endpoint | Moot — endpoint removed in BE-005. |
