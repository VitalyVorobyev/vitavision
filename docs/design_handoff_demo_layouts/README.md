# Handoff: vitavision.dev demo layouts (ChESS + Delaunay)

## Overview
Redesigns of the two interactive demos on vitavision.dev:
- **ChESS detector response** — interactive figure exploring the SR / DR / MR terms of the ChESS corner-detector score.
- **Delaunay & Voronoi** — direct-manipulation editor for points, triangulation, dual cells, and a draggable projective grid.

For each demo, **one selected desktop layout** and **one selected mobile layout** are included:
- ChESS desktop → **Layout A · Canvas-first inspector**
- ChESS mobile → **M1 · Stacked panel**
- Delaunay desktop → **Layout D · Floating tool palette + live camera-pose readout**
- Delaunay mobile → **M1 · Tool dock + pose chip**

## About the Design Files
The files in `references/` are **design references created in HTML/JSX prototypes** — they show the intended look, structure, and behavior. They are **not production code to copy directly**. Recreate them in the target codebase (the existing `vitavision.dev` React/Vite project that owns `ChessResponseDemo.tsx`, `DelaunayVoronoiDemo.tsx`, etc.) using its established components, hooks, Tailwind tokens, and design system.

The original demo source already lives in the codebase under `illustrations/` — keep using those hooks (`useChessResponse`, `useDelaunayVoronoi`, `useChessResponseAnimation`, `ChessResponseSvg`, `DelaunayVoronoiCanvas`). Only the **container layout, chrome, and readouts** are being redesigned.

## Fidelity
**High-fidelity** for layout, chrome, spacing, and visual treatment. The colors and typography match the existing site (deep slate-blue background, warm-amber primary accent, mono-uppercase eyebrows, monospace metric values). The interactive *content* (canvas SVGs, math) is unchanged — keep using the existing engines.

The static SVG mocks in `references/canvases.jsx` are illustrative only; do **not** ship them — they exist so the prototype could render without depending on `d3-delaunay` etc.

---

## Design Tokens (already in the codebase)

Reuse the existing Tailwind/CSS variables. The references encode them as:

| Token              | Value (HSL)               | Notes                              |
|--------------------|---------------------------|------------------------------------|
| `--background`     | `222 28% 9%`              | Page background, deep slate-blue   |
| `--surface`        | `222 24% 12%`             | Panel base                         |
| `--surface-2`      | `222 22% 14%`             | Slightly elevated                  |
| `--muted`          | `222 18% 22%`             | Slider track, dividers             |
| `--muted-foreground` | `222 10% 62%`           | Eyebrow / secondary text           |
| `--border`         | `222 20% 20%`             | Default 1px borders                |
| `--border-strong`  | `222 18% 28%`             | kbd outlines                       |
| `--foreground`     | `210 30% 95%`             | Primary text                       |
| `--primary`        | `28 92% 60%`              | Warm amber accent                  |
| `--emerald`        | `152 60% 48%`             | "Strong corner" / good min-angle   |
| `--rose`           | `350 80% 62%`             | Destructive / DR overlay accent    |
| `--amber`          | `38 92% 60%`              | (alias)                            |
| `--violet`         | `260 70% 70%`             | Phase φ2                           |
| `--teal`           | `180 60% 55%`             | Voronoi / phase φ3                 |

Phase swatch palette (used for SR φ0..φ3 across both desktop and mobile):
`#f9a04a` (φ0) · `#7da7ff` (φ1) · `#9b7dff` (φ2) · `#36c4a8` (φ3)

Radii: `0.6rem` metric cells, `0.75rem` buttons, `1rem` flat panels, `1.5rem` outer panels, `999px` pills.

Typography: existing `ui-sans-serif` body, `ui-monospace` for eyebrows, metric values, kbd, formulas. Eyebrow style: `11px / uppercase / letter-spacing 0.22em / muted-foreground`.

---

## Selected designs

### 1. ChESS — Desktop · Layout A (canvas-first inspector)

**File:** `references/layouts/chess-a.jsx`

**Thesis:** the diagram **is** the interface. Make the canvas hero-sized; collapse parameters into a floating, draggable inspector; surface the live readout as a HUD pinned to the canvas; keep the most-tweaked controls in a bottom dock.

**Structure (top → bottom):**
1. Page header (existing pattern): `← Demos` crumb · `<h1>ChESS detector response</h1>` · subtitle · 3 tags (`computer-vision`, `feature-detection`, `interactive`).
2. **Hero canvas panel** (rounded-[1.5rem], existing `panel` gradient, position:relative, overflow:hidden) — the existing `<ChessResponseSvg>` rendered at `min(100%, 720px)` width, centered.
3. **Floating Inspector — top-right** (`absolute; top:18px; right:18px; width:280px; bg: hsl(var(--surface) / 0.92); border; rounded-2xl; backdrop-blur(8px)`). Header row: `tinybrow` "Inspector" + small "Pin" / collapse buttons. Body: three custom slider rows (Rotation / Blur / Contrast) followed by a 2×2 toggle grid for Overlays (Samples / SR / DR / MR). Reuse the existing `ChessResponseControls` markup; only the wrapping chrome changes.
4. **HUD readout — bottom-left** (`absolute; left:18px; bottom:60px; width:220px`). 2×2 grid of `MetricCell` (SR / DR / MR / R), with R cell using the `r-pos` accent (emerald) when positive. Below the grid, the formula `R = SR − DR − 16·MR` in 10px mono.
5. **Bottom dock — centered** (`absolute; bottom:14px; left:50%; transform:translateX(-50%); display:flex; gap:10; rounded-full; backdrop-blur(8px)`). From left: pattern segmented (Corner / Edge / Stripe — pill buttons), divider, primary `▶ Play` button, 220px-wide θ scrub slider, mono `θ = 22.5°` readout.
6. Below the panel: 1-paragraph explanation + a `note` callout.

**Behavioral notes:**
- All overlay keys (`showSampleLabels`, `showSrPairs`, `showDrPairs`, `showMrRegions`) wire directly to existing component props.
- Inspector should be optionally collapsible (post `__edit_mode_dismissed`-style behavior or a local state toggle) — the "—" button hides everything except the pin.
- The bottom-dock θ slider mirrors the inspector's Rotation slider (same state).
- HUD must remain readable on all canvas backgrounds — keep the `0.92` alpha + 8px backdrop-blur.

**Edge cases:**
- When the canvas is narrower than ~700px, fall back to the M1 mobile layout.
- The Inspector should not occlude critical pixels of the corner pattern — clamp its position to stay outside a center 60% region of the SVG.

---

### 2. ChESS — Mobile · M1 (stacked panel)

**File:** `references/layouts/chess-mobile.jsx` → `ChessMobileV1`

**Thesis:** straightforward vertical scroll, optimized for one-handed use. Canvas first, metrics next, then the controls a thumb naturally reaches.

**Structure:**
1. `← Demos` (12px muted) + `<h1>ChESS detector</h1>` (22px, weight 600) + 1-line description (12px muted).
2. **Canvas panel** — full width, `padding: 8px`, with two pills below the canvas: status (`strong corner`, emerald-tinted) and `θ = 22.5°` (mono).
3. **Metric chip strip** — 4-column grid (SR · DR · MR · R), 6px gap, R cell in emerald.
4. **Pattern** segmented (3 buttons, 10px vertical padding for 44pt-equivalent thumb target).
5. **Slider card** (`panel-flat`, 12px padding) — Rotation / Blur / Contrast. Slider thumbs are 18×18 (larger than desktop's 12×12) for touch.
6. **Primary `▶ Play rotation`** button — full width, 12px padding, `border-radius: 12px`.
7. **Overlays** — collapsible `<details>`/`<summary>` row showing "4 toggles ▾"; expanded reveals a 2×2 toggle grid.

**Behavioral notes:**
- All slider thumbs ≥ 44px tap target (visually 18px but use a larger invisible hit area).
- Page background is `hsl(var(--background))`; bottom padding 28px so the last button isn't flush with the home indicator.

---

### 3. Delaunay — Desktop · Layout D (floating tool palette + live pose)

**File:** `references/layouts/delaunay-d.jsx`

**Thesis:** the canvas owns the screen, like a spatial editor. Tools are modal (Figma-style), organized as a vertical palette. Layers are floating chips. Stats and the **new live camera-pose readout** sit in a single bottom-right HUD card.

**Structure:**
1. Page header (same pattern).
2. **Single canvas panel** filling content width — height `620px`, `position: relative`, `overflow: hidden`.
3. **Vertical tool palette — top-left** (`absolute; top:16; left:16; padding:6; rounded-2xl; backdrop-blur(8px)`). 40×40 buttons in order: `+` Add (A), `↔` Move (V), `✕` Delete (⌫), `▦` Grid warp (G), `⊙` Hover info (H), divider, `⚂` Random 30, `⌫` Clear.
4. **Grid config popover — anchored to the Grid tool** (`absolute; top:16; left:70; width:220`, with a primary-tinted border indicating it is anchored to the active tool). Header: `tinybrow` "Grid · 6 × 9" + close `×`. Body: Rows / Cols rows, each with `−` / number input / `+` stepper buttons (22×22). Footer: `Reset corners` button. **This solves the previous "where do I configure grid size?" feedback** — when the user activates the Grid tool, this popover opens automatically.
5. **Layer chips — top-center** (`absolute; top:16; left:50%; transform:translateX(-50%); rounded-full; backdrop-blur(8px)`). Pills for Delaunay / Voronoi / Circumcircles / Grid, each with a small color swatch matching its render color.
6. **Stats + Pose HUD — bottom-right** (`absolute; bottom:16; right:16; width:240`).
   - Top: `tinybrow` "Stats" + 2×2 metric grid (Points / Tris / Edges / Min ∠ — Min ∠ is emerald-tinted when ≥ 20°, amber 10–20°, rose <10°).
   - **NEW: `tinybrow` "Camera pose"** + a `panel-flat` card with rows: `yaw` / `pitch` / `roll` / divider / `f / focal` / `reproj. err` (emerald when good). All values in mono.
   - **Mini horizon visualization**: a `36px` tall sliver showing a faint `+` reticle in primary-amber and a rotated horizon line. Computed from the homography decomposition.
7. **Hover tooltip — bottom-left** (`absolute; bottom:16; left:80; width:220`). Shows the hovered triangle/cell, its index, area, min angle.
8. **Coord readout — top-right** (small mono pill: `x 412   y 287`).
9. Below the canvas: 5 `kbd` pills (`A` add · `V` move · `⌫` delete · `G` grid · `R` random) + `note` callout.

**Pose computation requirements (new feature):**
The user wants live camera pose computed from the projective grid. With 4 movable corner correspondences and a known grid-rectangle aspect, we have enough for a homography → camera-pose decomposition.

**Recommended approach:**
1. The existing code already computes a 3×3 homography `H` from the 4 grid corners (`computeHomography` in `homography.ts`).
2. With assumed intrinsics `K` (focal `f` ≈ canvas width, principal point at canvas center, square pixels), compute `K⁻¹·H` and decompose:
   - `r1 = (K⁻¹·H)[:,0] / λ`, `r2 = (K⁻¹·H)[:,1] / λ`, `r3 = r1 × r2`, `t = (K⁻¹·H)[:,2] / λ` where `λ = ‖K⁻¹·H[:,0]‖`.
   - Re-orthonormalize `[r1 r2 r3]` via SVD: `R = U·Vᵀ` where `[U,_,V] = svd([r1 r2 r1×r2])`. Force `det(R) = +1`.
3. Extract Tait-Bryan angles (yaw/pitch/roll) from `R`:
   - `pitch = asin(-R[2,0])`
   - `yaw   = atan2(R[1,0], R[0,0])`
   - `roll  = atan2(R[2,1], R[2,2])`
4. Reproject the 4 grid corners through `K·[R|t]` and report mean pixel error.
5. Allow the user to optionally enter the real-world grid aspect ratio (default `cols/rows`).

This belongs in a new `delaunay-voronoi/cameraPose.ts` next to `homography.ts`. Add a `usePoseFromHomography(grid)` hook that returns `{ yaw, pitch, roll, focalPx, reprojErrPx, R, t, valid }` and feeds the HUD card.

**Tool semantics:**
- `Add` (A): clicking canvas adds a free point.
- `Move` (V): default. Drag a free point to move it; drag a grid corner to warp.
- `Delete` (⌫): click a point to remove (or select + ⌫ key).
- `Grid warp` (G): toggles grid visibility AND opens the grid config popover.
- `Hover info` (H): toggles the bottom-left hover card.

---

### 4. Delaunay — Mobile · M1 (tool dock + pose chip)

**File:** `references/layouts/delaunay-mobile.jsx` → `DelaunayMobileV1`

**Thesis:** identical mental model to desktop D but with a 5-button bottom dock instead of a side palette. Pose readout collapses to a top-left chip. Layers as horizontal pills below the dock.

**Structure:**
1. Header (`← Demos` + 20px title).
2. **Canvas panel** — `400×460` (responsive: full width, fixed aspect).
   - **Pose chip top-left** (`absolute; top:10; left:10`, `padding: 6 10`): `tinybrow` "Pose" + `yaw -18.4°` / `pitch 12.7°` (just two values to keep it small; full readout in a sheet on tap).
   - **Stats chip top-right** (`absolute; top:10; right:10`, mono one-liner): `15 · 22 · 36 · 24.7°` (points · tris · edges · min∠).
3. **Tool dock** — `panel-flat`, 5-column grid, each cell `56px` tall with icon (18px) above label (10px). Buttons: `+` Add (active), `↔` Move, `✕` Delete, `▦` Grid, `⚙` More.
4. **Layer pill row** — wrap-able pills: Delaunay (active) / Voronoi / Circles / Grid (active).

**Behavioral notes:**
- Tapping the pose chip opens a full pose modal (yaw / pitch / roll / focal / reproj err + horizon).
- "More" opens a sheet with Random 30, Clear, grid size stepper (rows/cols ± buttons), reset corners.
- Long-press a point to select; tap-drag to move.

---

## State management (both demos)

Continue using the existing `useChessResponse` and `useDelaunayVoronoi` hooks. Add:
- `usePoseFromHomography(grid)` hook for the pose readout (Delaunay only).
- For Layout A: a small UI-state slice to track `inspectorOpen`, `inspectorPosition`.
- For Mobile M1 (Delaunay): UI-state for `activeTool`, `poseModalOpen`.

## Animations & transitions

- Floating panels: `transition: opacity 150ms, transform 150ms ease-out` on mount.
- Slider thumbs: no transition (instant tracking).
- Bottom-dock θ slider: tie to existing `useChessResponseAnimation` when Play is active.
- Layer toggle pills: `transition: background-color 150ms, color 150ms`.

## Files in `references/`

| Path                                        | Role                                              |
|---------------------------------------------|---------------------------------------------------|
| `Demo Layout Proposals.html`                | Wrapper page that renders all proposals on a design canvas. |
| `vv.css`                                    | Token + utility CSS used by every layout.         |
| `canvases.jsx`                              | **Static** SVG mocks for the ChESS pattern and Delaunay triangulation. **DO NOT SHIP.** Use the codebase's real `ChessResponseSvg` and `DelaunayVoronoiCanvas`. |
| `design-canvas.jsx`                         | Multi-artboard presentation shell. Not part of the product. |
| `ios-frame.jsx`                             | iPhone bezel used to present mobile mocks. Not shipped. |
| `layouts/chess-a.jsx`                       | **Selected ChESS desktop layout (A).**            |
| `layouts/chess-mobile.jsx` → `ChessMobileV1`| **Selected ChESS mobile layout.** (Ignore V2/V3.) |
| `layouts/delaunay-d.jsx`                    | **Selected Delaunay desktop layout (D)** with pose readout + grid popover. |
| `layouts/delaunay-mobile.jsx` → `DelaunayMobileV1` | **Selected Delaunay mobile layout.** (Ignore V2/V3.) |

## Implementation checklist

- [ ] Replace `ChessResponseDemo.tsx` body with Layout A structure (keep using `ChessResponseSvg`, `useChessResponse`, `useChessResponseAnimation`).
- [ ] Replace `DelaunayVoronoiDemo.tsx` body with Layout D structure (keep using `DelaunayVoronoiCanvas`, `useDelaunayVoronoi`).
- [ ] Add `cameraPose.ts` and `usePoseFromHomography` next to existing `homography.ts`.
- [ ] Add a `<PoseReadout />` component used by both desktop and mobile Delaunay.
- [ ] Wire grid-config popover to the Grid tool button — open on activation, close on outside click.
- [ ] Mobile breakpoint: under `lg` (or your existing breakpoint), render the M1 mobile component for each demo.
- [ ] Verify ≥ 44pt tap targets on all mobile interactive elements.
- [ ] Verify keyboard nav still works (existing controls already handle this — preserve `tabIndex`, `aria-pressed`).
- [ ] Verify the floating chrome doesn't occlude the SVG center on small viewports.

## Open questions for the user

- Pose computation: assumed intrinsics or an additional Tweaks panel for `f`?
- The grid's "real-world aspect" — should it default to `cols/rows` or be exposed as a control?
- Should the pose readout *also* appear on the desktop F-layout (currently only D)?
