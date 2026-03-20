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

## Up Next


## Backlog

Editor — Phase 2: Algorithm Canvas Overlays

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-017~~ | done | P2 | feature | ~~Add overlay visibility toggle to left rail~~ | Implementer | Layers popover with Features + Algorithm Overlay toggles. |

Editor — Phase 3: Diagnostics + Progressive Disclosure + Presets

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-018~~ | done | P2 | feature | ~~Add diagnostics interface and structured run status to ResultsPanel~~ | Implementer | DiagnosticEntry with info/warning/error levels. All 4 adapters provide diagnostics. |
| ~~EDITOR-019~~ | done | P2 | feature | ~~Add preset configurations to AlgorithmDefinition and ConfigurePanel~~ | Implementer | AlgorithmPreset type, presets on all 4 adapters, PresetPicker UI. |
| ~~EDITOR-020~~ | done | P2 | enhancement | ~~Add progressive disclosure (CollapsibleSection) to config forms~~ | Implementer | CollapsibleSection in formFields.tsx. Advanced params collapsed in Chessboard, ChArUco, MarkerBoard. |

Editor — Phase 4: Feature Model Extension

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~EDITOR-021~~ | done | P2 | feature | ~~Add PolygonFeature to feature model and Zod schema~~ | Implementer | PolygonFeature with points[] + closed. Added to union + Zod + groups. |
| ~~EDITOR-022~~ | done | P2 | feature | ~~Add polygon renderer to FeatureLayer (closed Line with fill)~~ | Implementer | Closed Konva Line with semi-transparent purple fill. Selection + drag. |
| ~~EDITOR-023~~ | done | P2 | feature | ~~Add POLYGON drawing tool to left rail and CanvasWorkspace~~ | Implementer | Click vertices, double-click to close. Pentagon icon on left rail. |

Editor — Phase 5: Deep Links + Blog Integration

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-024 | todo | P2 | feature | Deep link serialization: read/write URL params for algo+config+image | Implementer | Read URL params on mount. serializeConfig/deserializeConfig on AlgorithmDefinition. history.replaceState on change. Deps: EDITOR-019. |
| EDITOR-025 | todo | P2 | feature | Add blogSlug to AlgorithmDefinition, render "Learn more" links | Implementer | blogSlug field. "Learn more" link in ConfigurePanel pointing to /blog/{slug}. Independent. |
| EDITOR-026 | todo | P3 | feature | Add "Try in Editor" buttons in blog post content | Implementer | Standardized links to /editor?algo=...&image=... in blog markdown. Deps: EDITOR-024. |

Editor — Phase 6: Responsive Layout + Touch Support

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-027 | todo | P2 | enhancement | Responsive breakpoints: stack panels vertically on narrow screens | Implementer | Below ~768px: canvas on top (60vh), right panel below. Left rail → bottom bar or hamburger. Deps: EDITOR-013. |
| EDITOR-028 | todo | P2 | enhancement | Left rail tooltips + touch-friendly tap targets (44x44px min) | Implementer | Proper tooltips on hover. Min 44x44px touch targets. Independent. |
| EDITOR-029 | todo | P3 | enhancement | Touch canvas: pinch-to-zoom, tap-to-select, single-finger pan | Implementer | Konva touch support. Pinch-to-zoom, tap-to-select features, pan in SELECT mode. Independent. |
| EDITOR-030 | todo | P3 | enhancement | Hide drawing tools on touch-only devices | Implementer | Detect no fine pointer. Hide POINT/LINE/POLYLINE/BBOX/ELLIPSE/POLYGON tools. Keep SELECT + zoom + visibility. Deps: EDITOR-028. |

Editor — Phase 7: UX Improvements

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| EDITOR-037 | todo | P3 | feature | Canvas config summary overlay | Implementer | Optional Konva text in canvas corner showing algo name + key config values. Deferred. |

Target Generator — Future

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| ~~TGEN-009~~ | done | P2 | feature | ~~Add ring grid target type (client-side SVG)~~ | Implementer | Hex-lattice concentric ring markers with 16-sector code bands. Codebook loader, layout generator, SVG/DXF export, config panel, 3 presets. |
| ~~TGEN-023~~ | done | P2 | feature | ~~Add scale line to all target types~~ | Implementer | Minimal reference bar with label. Optional toggle in Paper config (default ON). SVG + DXF. |
| TGEN-010 | todo | P2 | feature | Add ZIP bundle download (all artifacts in one file) | Implementer | Client-side JSZip. Bundle SVG + PNG + JSON + DXF. Deps: TGEN-018. |
| TGEN-011 | todo | P2 | feature | Prerender target generator page for SEO | Implementer | Extend `postbuild.ts` for `/tools/target-generator`. Deps: TGEN-003. |

Other

| ID | Status | Priority | Type | Title | Role | Notes |
|----|--------|----------|------|-------|------|-------|
| DEV-002 | todo | P3 | enhancement | Add Vite dev server proxy for zero-config local API routing | Implementer | Would eliminate the need for the devCspPlugin by proxying /api/v1 through the Vite dev server. Requires backend to return relative local-upload URLs. |

## API / Interface Tracking

## Acceptance Scenarios (Attached to Tasks)

## Done

| ID | Date | Type | Title | Notes |
|----|------|------|-------|-------|
| EDITOR-017 | 2026-03-20 | feature | Add overlay visibility toggle to left rail | Layers popover for Features + Algorithm Overlay. |
| EDITOR-018 | 2026-03-20 | feature | Add diagnostics interface to ResultsPanel | DiagnosticEntry with info/warning/error levels. |
| EDITOR-019 | 2026-03-20 | feature | Add preset configurations to ConfigurePanel | AlgorithmPreset type + PresetPicker UI. |
| EDITOR-020 | 2026-03-20 | enhancement | Add CollapsibleSection to config forms | Progressive disclosure for advanced parameters. |
| EDITOR-021 | 2026-03-20 | feature | Add PolygonFeature to feature model and Zod schema | PolygonFeature with points[] + closed. |
| EDITOR-022 | 2026-03-20 | feature | Add polygon renderer to FeatureLayer | Closed Konva Line with semi-transparent fill. |
| EDITOR-023 | 2026-03-20 | feature | Add POLYGON drawing tool to left rail and CanvasWorkspace | Click vertices, dblClick to close. |
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
