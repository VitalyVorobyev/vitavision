# Handoff: Home tile row — v3 "Reveal" with content specimens

## Overview

Redesign of the 4-tile navigation row on the Vitavision home page (`src/pages/Home.tsx`). The tiles today are a generic grid with lucide icons and a tiny brand dot. This handoff replaces them with:

1. A **bespoke content specimen** per destination (text stack, DAG, annotated image, checkerboard) instead of a generic icon, and
2. A **reveal hover treatment** — radial brand-tinted sweep from the top-right + a sliding arrow that fades in.

The layout, grid, motion budget, palette, and token usage are unchanged.

## About the Design Files

The files in this bundle are **design references created in HTML** — a static React/Babel prototype rendered via a design canvas. They are **not** production code to copy wholesale. The task is to implement the same visual result inside the real app (`src/pages/Home.tsx`) using the project's existing stack (React + TypeScript + Tailwind 4 + framer-motion + lucide + React Router), its CSS variables (`--brand`, `--surface`, `--border`, `--foreground`, `--muted-foreground`), and its component patterns.

The `tile-row-reference.html` file lets you open the prototype in a browser and pixel-compare. The `Home.tsx.target.tsx` file is a drop-in React component in the real stack that is very close to the final form — use it as a starting point, but validate class names and imports against the current repo.

## Fidelity

**High-fidelity.** Colors, sizing, motion durations, and interaction states are final. Ship pixel-close to the reference.

## Scope

Only the 4-tile grid inside `Home.tsx` changes. The surrounding hero (logo, title, subtitle, page spacing, SEO head) is untouched.

## Tiles

Four tiles in a fixed order. All route via React Router `<Link>`.

| # | Label | Route | Specimen |
|---|---|---|---|
| 1 | Blog | `/blog` | Stack of text lines (first line = brand on hover) |
| 2 | Algorithms | `/algorithms` | Small directed graph (entry node highlights on hover) |
| 3 | Editor | `/editor` | Image frame with feature points + dashed bbox |
| 4 | Targets | `/tools/target-generator` | Miniature 7×4 checkerboard (one cell brand on hover) |

## Layout

Unchanged from today:

- Outer container: `grid grid-cols-2 gap-3 sm:grid-cols-4`, `max-w-2xl`, `w-full`, appears below the subtitle inside the existing `motion.div` wrapper.
- Framer-motion wrapper: preserve `initial={{ opacity: 0, y: 12 }}`, `animate={{ opacity: 1, y: 0 }}`, `transition={{ duration: 0.5, delay: 1.2 }}`.

## Tile anatomy

Each tile is a `<Link>` rendered as a card. Default and hover states:

### Default state

- Box: `relative overflow-hidden rounded-xl border border-border/70 bg-surface/80`, padding `16px 14px 14px`, `min-height: 116px`.
- **Specimen row** (top): 40px tall, `display: flex; align-items: center;` — specimen is left-aligned.
- **Label row** (bottom): `flex items-end justify-between`, pushed to `margin-top: auto` with `padding-top: 12px`.
  - Label: `text-[13px] font-semibold tracking-tight text-foreground`.
  - Arrow: `opacity: 0; transform: translateX(-4px);` (hidden).

### Hover state

Transition duration: `300ms`, property: `all` (or at minimum: `border-color`, `background`, `box-shadow`, `color`, `opacity`, `transform`).

- Border: `border-[hsl(var(--brand)/0.45)]`.
- Box shadow: `0 10px 28px -16px hsl(var(--brand) / 0.5)`.
- Overlay: add an absolutely-positioned sibling `<span>` with `inset-0 pointer-events-none` and background `radial-gradient(120% 80% at 100% 0%, hsl(var(--brand) / 0.14), transparent 60%)`. Render only on hover, or keep mounted with `opacity: 0 → 1` transition. Mounted-with-opacity is simpler; prefer that.
- Arrow: `opacity: 1; transform: translateX(0); stroke: hsl(var(--brand))`.
- Specimen: passes `hot=true`, which re-colors the accent element of each specimen to `hsl(var(--brand))` (see specimens below).

### Specimens

All specimens are inline SVGs. They are pure, take a single `hot: boolean` prop, and switch one-or-two accent elements to brand cyan when `hot` is true. Use `hsl(var(--brand))` (not a hardcoded hex) so it stays theme-aware.

**Blog — `<SpecBlog hot={hot} />`**
- 44×28 SVG, viewBox `0 0 44 28`.
- Row 1: `<rect x=0 y=2 w=32 h=3 rx=1>` — fill = foreground at 85% / brand at 100% when hot.
- Rows 2–5: thin 1.5px-tall rects (widths 44, 40, 36, 22 at y = 9, 14, 19, 24), all filled with muted-foreground at fading opacities (0.8, 0.6, 0.45, 0.3).

**Algorithms — `<SpecAlgorithms hot={hot} />`**
- 46×28 SVG.
- Nodes: `[4,14] [18,6] [18,22] [32,14] [42,8]`.
- Edges: `0→1, 0→2, 1→3, 2→3, 3→4`, `stroke-width: 1`, muted default, `hsl(var(--brand)/0.6)` when hot.
- Nodes: `r=2` default, `r=2.6` for the entry node (index 0) when hot. Entry node gets brand fill + brand stroke when hot; others keep foreground/background fill with a stroke that turns brand-colored when hot.

**Editor — `<SpecEditor hot={hot} />`**
- 44×30 SVG.
- Outer frame: `<rect x=0.5 y=0.5 w=43 h=29 rx=2>` stroke = muted / brand on hot, opacity 0.6 → 0.9.
- Horizon hint: `<line x1=2 y1=20 x2=42 y2=18>` muted, opacity 0.3.
- Feature points: 11 small `r=1` circles at `[8,6] [14,10] [22,8] [30,12] [35,7] [12,18] [20,22] [28,20] [34,24] [9,24] [18,14]`. Fill = foreground / brand on hot.
- Dashed bbox: `<rect x=16 y=6 w=18 h=10 stroke-dasharray="2 1.5" stroke-width=0.8>`, stroke foreground / brand on hot.

**Targets — `<SpecTargets hot={hot} />`**
- 44×28 SVG.
- 7 cols × 4 rows checkerboard at `translate(2,2)`, cell size = `40/7 × 24/4`.
- A cell is "dark" when `(row+col) % 2 === 0`; dark cells are filled with foreground; others are transparent.
- When hot, cell at `row=1, col=4` becomes `hsl(var(--brand))` regardless of checker parity.
- Outer frame rect drawn after cells, stroke muted default / brand on hot, stroke-width 0.8.

### Arrow

Reuse an existing `ArrowRight` from lucide if available — use 14×14, stroke-width 2. Place in the label row, right-aligned.

## Interactions

- Hover and focus-visible should produce the same visual state. Use `.group` on the `<Link>` and `group-hover:` + `group-focus-visible:` Tailwind variants so keyboard users see the reveal.
- No click animation beyond the standard router navigation.
- Motion respects `prefers-reduced-motion` — framer-motion handles this at the wrapper; within the tile, reduce transitions to `duration-0` if needed, or keep them — 300ms transitions are fine.

## Design Tokens

All from existing CSS variables in `src/index.css`. Do not hardcode hex values.

- `hsl(var(--brand))` — cyan, `191 75% 55%`.
- `hsl(var(--brand) / 0.45)` — hover border.
- `hsl(var(--brand) / 0.14)` — radial overlay.
- `hsl(var(--brand) / 0.5)` — box-shadow tint.
- `hsl(var(--foreground))`, `hsl(var(--muted-foreground))`, `hsl(var(--surface))`, `hsl(var(--border))`.
- Radius: `rounded-xl` (`0.75rem` in Tailwind defaults; project's `--radius-lg` is `0.375rem` but the existing tiles use `rounded-xl` so keep it).
- Transition: `300ms`.
- Tile min-height: `116px` (vs. current `py-7` implicit height).

## Things NOT to change

- Framer-motion entrance on the grid wrapper.
- The `tiles` array order and routes.
- The logo, title, subtitle, and their motion.
- Light/dark theme switching — specimens use `var(--brand)` and `currentColor` strategies so they work in both.

## Files in this handoff

- `README.md` — this file.
- `tile-row-reference.html` + `button-tiles.jsx` + `design-canvas.jsx` — the canvas prototype. Open `tile-row-reference.html` in a browser to interact.
- `Home.tsx.target.tsx` — a concrete implementation in the project's stack. Compare against the live `src/pages/Home.tsx` and port the diffs.
- `specimens/` — the four specimen components factored out for easy import.

## Implementation checklist

- [ ] Extract specimens into `src/components/home/specimens/` (one file each, default-exported React components).
- [ ] Replace the `tiles` array in `Home.tsx` — swap `icon` for `Spec`.
- [ ] Replace the tile `<Link>` class list with the v3 Reveal classes.
- [ ] Add the radial-overlay `<span>`.
- [ ] Add the sliding `ArrowRight` in the label row, default-hidden.
- [ ] Verify hover + focus-visible both trigger the reveal.
- [ ] Verify in both light and dark themes.
- [ ] Verify at `sm` breakpoint — two-column layout should still read well; the specimen row may need a touch more breathing room on narrow viewports.
