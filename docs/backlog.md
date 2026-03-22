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
| ALGO-020 | in-progress | P1 | feature | Ringgrid detection algorithm for editor | Implementer | Backend endpoint + frontend adapter, overlay, config form. Uses ringgrid Python package. |
| UI-015 | in-progress | P2 | enhancement | Responsive target generator left panel | Implementer | Narrow left panel w-40 below lg breakpoint. |

## Up Next

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| FE-008 | todo | P1 | refactor | Split content manifest into index + per-article chunks | Implementer | content-build.ts emits single file with inlined HTML; split into metadata-only index + per-slug lazy chunks so blog listing doesn't force-download all article bodies. |
| FE-009 | todo | P1 | perf | Add Zustand selectors to useEditorStore calls | Implementer | 9 call sites use `useEditorStore()` without selectors, causing full re-renders on any state change. Use granular selectors with `shallow` equality. Hot paths: CanvasWorkspace, FeatureListPanel. |
| FE-010 | todo | P1 | perf | Conditional mermaid loading for blog posts | Implementer | Mermaid chunks (~1MB) load on every blog post. Only import mermaid when rendered HTML contains `.mermaid` code blocks. |
| FE-011 | todo | P2 | fix | Validate imported features with Zod instead of unsafe cast | Implementer | `normalizeImportedFeatures` in useEditorStore.ts:216 uses `as unknown as Feature`. Validate against existing Zod schema or check `type` against FeatureType union. |
| FE-012 | todo | P2 | perf | Use ResizeObserver in CanvasWorkspace | Implementer | CanvasWorkspace uses `window.addEventListener("resize")` which misses container-level resizes. Switch to ResizeObserver on containerRef. |
| FE-013 | todo | P2 | perf | Memoize FeatureLayer component | Implementer | FeatureLayer re-renders on every mouse move/wheel. Add React.memo with stable callback refs. |
| FE-014 | todo | P2 | test | Add tests for store actions and API mappers | Implementer | Critical untested: replaceAlgorithmFeatures, normalizeImportedFeatures, camelCase→snake_case mappers in api.ts. |
| FE-015 | todo | P2 | a11y | Add skip-to-content link and landmark audit | Implementer | No skip-nav link. Blog article content lacks consistent landmark structure. |

## Backlog

## API / Interface Tracking

## Acceptance Scenarios (Attached to Tasks)

## Done

| ID | Date | Type | Title | Notes |
|----|------|------|-------|-------|
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
