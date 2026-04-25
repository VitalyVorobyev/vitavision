# Handoff: Algorithms index redesign — sidebar rail (desktop) + filter sheet (mobile)

## Overview

Redesign of the `/algorithms` index page on Vitavision. The current page spends the top ~320px on a hero, a segmented Classical/Models control, and a flat 32-chip tag cloud — cards don't appear until below the fold. This redesign moves the entire taxonomy (Kind / Category / Tags) **out of the vertical flow** and into a persistent left sidebar on desktop, and behind a single "Filters" bottom sheet on mobile. Cards become the dominant element from y≈80 on desktop and y≈240 on mobile.

Two layouts are in scope:

- **Desktop — Option A · Sidebar rail.** 220px left sidebar with Kind, Category, and popular Tags. Main column is a compact one-line title + search + view toggle + the card grid.
- **Mobile — M1 · Title + segment + filter pill, with M2 · Filter bottom sheet.** One-line title, full-width segmented Classical/Models, and a single "Filters" pill that opens a bottom sheet containing the same sections as the sidebar.

## About the Design Files

The files in this bundle are **design references created in HTML** — static React/Babel prototypes rendered on a design canvas. They are **not** production code to copy wholesale. The task is to recreate the same visual result inside the live Vitavision app (`src/pages/Algorithms.tsx` or equivalent) using the project's existing stack — React + TypeScript + Tailwind 4 + framer-motion + lucide + React Router — and its CSS variables (`--brand`, `--surface`, `--border`, `--foreground`, `--muted-foreground`, etc.), reusing existing components where they exist.

Open `reference-desktop.html` and `reference-mobile.html` in a browser to pan/zoom the design canvas and pixel-compare each artboard.

## Fidelity

**High-fidelity.** Colors, sizing, type scale, borders, radii, and interaction states are final. Ship pixel-close to the reference. Motion durations and easing can follow the project's existing conventions — no specific motion spec here beyond the bottom-sheet slide-up (~250ms ease-out).

## Scope

- `Algorithms.tsx` page layout (and whichever nested components currently render the tag cloud + segmented control).
- A new `AlgorithmsSidebar` component (desktop).
- A new `AlgorithmsFilterSheet` component (mobile, opens on "Filters" pill tap).
- Responsive breakpoint switch between the two.
- No changes to algorithm card markup other than what's noted below.
- No changes to routing, data fetching, or the algorithm detail pages.

## Responsive strategy

- **`lg` and up (≥1024px):** Desktop A layout — sidebar + main.
- **Below `lg`:** Mobile M1 layout — no sidebar; filter UI collapses into the "Filters" pill + bottom sheet.

A single `useMediaQuery('(min-width: 1024px)')` (or the project's existing hook) picks which filter surface to mount. The filter **state** is shared — switching breakpoints preserves active filters.

---

## Desktop — Option A · Sidebar rail

### Layout

- Full-bleed page. Existing top nav untouched.
- Content area is a CSS grid: `grid-template-columns: 220px 1fr`, full height below the nav.
- Sidebar: `border-right: 1px solid hsl(var(--border) / 0.38)`, padding `20px 18px 20px 22px`.
- Main: padding `20px 40px`.

### Sidebar — sections, top to bottom

All section labels share this treatment: `font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.3px; color: hsl(var(--muted-foreground)); margin-bottom: 10px`.

Rows share this treatment: `padding: 5px 8px; border-radius: 5px; font-size: 13px; display: flex; justify-content: space-between; align-items: center`. Active row gets `background: hsl(var(--surface-hi))` (or `surface` one step brighter than the page bg), `color: hsl(var(--foreground))`, `font-weight: 600`. Inactive: `color: hsl(var(--foreground) / 0.8)`, regular weight. Right-side counts: `font-size: 11px; color: hsl(var(--muted-foreground))`.

1. **Kind** (radio — single select)
   - `Classical` (28) · active by default
   - `Models` (14)

2. **Category** (radio — single select)
   - `All` (28) · active by default
   - Then one row per category, from data. Example order today: Corner Detection (6), Calibration Targets (8), Feature Matching (5), Geometry & Homography (4), Learned Models (7), Robotics & Hand-Eye (3).

3. **Tags** (multi-select, popular-only)
   - Label row includes a right-aligned `all 32 →` link in `hsl(var(--brand))` that opens a full tag picker (modal or popover — see "Full tag picker" below).
   - Show the **6 most-used tags** as small chips (compact variant): `padding: 3px 9px; font-size: 11px; border-radius: 9999px; border: 1px solid hsl(var(--border) / 0.5); color: hsl(var(--foreground) / 0.8); white-space: nowrap`.
   - Active chip: `background: hsl(var(--surface-hi)); border-color: hsl(var(--border)); color: hsl(var(--foreground)); font-weight: 600`.
   - Popular tag set today: `corner-detection, feature-detection, calibration, checkerboard, homography, cnn` (first 6 of `TAGS_POPULAR` in `algorithms-primitives.jsx`). Compute from tag frequency at build time if possible; otherwise hardcode.

### Main column — header row

- Page title: `Algorithms` — `font-size: 22px; font-weight: 700; letter-spacing: -0.4px`, followed by a muted count (`28`) in `font-size: 15px; font-weight: 400; color: hsl(var(--muted-foreground)); margin-left: 6px`.
- Right-aligned cluster:
  - **Search input** (controlled, triggers live filter): 200px wide, `padding: 5px 10px`, `border: 1px solid hsl(var(--border) / 0.7)`, `border-radius: 6px`, `background: hsl(var(--bg-soft))`, `font-size: 12px`, leading lucide `Search` icon (13px). Placeholder: `Search…`.
  - **View toggle** (Grid / List): 2-button segmented, `padding: 2px`, `border: 1px solid hsl(var(--border) / 0.7)`, `border-radius: 6px`. Active button: `background: hsl(var(--surface-hi)); color: hsl(var(--foreground))`. Icons from lucide — `LayoutGrid` and `List`, 13px.
- Subtitle below header: `font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 20px`. Copy: "Classical computer vision algorithms and deep-learning models."

### Main column — card grid

- Section header: existing `SectionHeader` style — `font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.4px; color: muted`, with the count beside it at regular weight & dimmer color.
- Grid: `grid-template-columns: repeat(3, 1fr); gap: 12px`. Card target width ~230px.
- Between sections: `margin-top: 22px`.

### Card (unchanged from current unless noted)

- `width: 230px; min-height: 112px; background: hsl(var(--surface)); border: 1px solid hsl(var(--border)); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px`.
- Top row: 30×30 glyph tile (`background: hsl(var(--bg)); border-radius: 4px; border: 1px solid hsl(var(--border) / 0.7)`) + optional `DRAFT` badge + title (`font-size: 13px; font-weight: 600`).
- Description: `font-size: 11.5px; color: muted; line-height: 1.4; clamp to 2 lines`.
- Footer (auto-margin-top): brand cyan 5px dot + level label in muted 11px.

### Full tag picker (triggered by sidebar `all 32 →` link)

- Centered modal or `Popover` anchored to the link, 420px wide, `background: hsl(var(--surface)); border: 1px solid hsl(var(--border)); border-radius: 10px; padding: 14px 16px; shadow: 0 20px 50px -10px rgba(0,0,0,0.6)`.
- Top: search input ("Filter tags…") with right-aligned `32 tags` count, 12px muted.
- **Popular** section (uppercase muted label, 6px bottom margin) — 6 popular tags as compact chips.
- **All tags** section — remaining tags as compact chips, wrapping. Vertically scrollable if they overflow.
- Selection updates sidebar immediately; close on outside click / Esc.

---

## Mobile — M1 + M2

Viewport: 375–430px. Designs are drawn at iPhone 15 Pro width (402px) but should scale fluidly.

### M1 — Default state

From top:

1. **Top nav** — existing site nav, dense variant: `padding: 10px 16px`, V-mark logo at 22px, trailing icons (search, profile avatar, menu) at 18px.
2. **Title row** — `padding: 14px 16px 0`. `Algorithms` at `font-size: 22px; font-weight: 700; letter-spacing: -0.5px` with the right-aligned entry count (`28 entries`) in `font-size: 12px; color: muted`.
3. **Segmented control** — `margin-top: 12px`, full-width 2-column grid, `padding: 3px; gap: 3px; background: hsl(var(--bg-soft)); border: 1px solid hsl(var(--border) / 0.8); border-radius: 8px`. Each cell: `padding: 7px 0; border-radius: 5px; font-size: 13px; text-align: center`. Active cell: `background: hsl(var(--surface-hi)); color: foreground; font-weight: 600`. Inactive: `color: muted`.
4. **Filter row** — `margin-top: 12px; display: flex; gap: 8px`.
   - `Filters` pill (`flex: 1`): `padding: 8px 12px; font-size: 13px; border: 1px solid border; background: hsl(var(--bg-soft)); border-radius: 8px; display: flex; justify-content: space-between`. Leading lucide `SlidersHorizontal` (13px), label, then an active-count **badge** (`font-size: 10px; font-weight: 700; background: hsl(var(--brand)); color: hsl(var(--bg)); padding: 0 5px; border-radius: 9999px`), trailing chevron-down.
   - `Sort` pill (intrinsic width): same visual treatment, leading lucide `ArrowUpDown`.
5. **Section header** — same `SectionHeader` type; `padding: 16px 2px 10px`.
6. **Card list** — vertical stack, `gap: 10px; padding: 0 16px`. Cards span full width.

#### Mobile card variant

Single layout — horizontal: 34×34 glyph tile on the left, content column on the right. Content column: `DRAFT` badge (if applicable) + title (14px, 600, tracking -0.1, ellipsis on overflow), then description (12px muted, 2-line clamp), then brand dot + level (11px muted) as footer.

### M2 — Filter bottom sheet (opens when "Filters" pill is tapped)

- Underlying page dims to ~40% brightness.
- Sheet: `position: fixed; left: 0; right: 0; bottom: 0; height: 82%; background: hsl(var(--bg-soft)); border-top: 1px solid border; border-radius: 18px 18px 0 0; padding-bottom: 34px` (safe area).
- **Grabber**: 40×4 rounded pill, centered, `padding-top: 10px`.
- **Header row** — `padding: 10px 18px 14px; border-bottom: 1px solid hsl(var(--border) / 0.8)`. `Filters` on the left (17px, 600), `Reset` on the right (13px, `color: hsl(var(--brand))`).
- **Scrollable body** — `padding: 4px 18px 10px`, contains:
  - **Kind** (section label 10.5px muted uppercase, 1.3px tracking, 600; 14px top margin, 8px bottom margin). Two side-by-side cards (`flex: 1; padding: 9px 12px; border-radius: 8px`). Active card: `border: 1px solid hsl(var(--brand) / 0.5); background: hsl(var(--brand) / 0.08); font-weight: 600`. Inactive: `border: 1px solid border; background: hsl(var(--surface))`. Each card: label on the left, count on the right (11px muted).
  - **Category** (same label style). Stack of rows (9px 10px padding, 6px radius, 13.5px label). Active row: `background: surface-hi; color: foreground; font-weight: 600`. Shown: `All (28)` active by default, then each category with its count.
  - **Tags · 32** (same label style; the "· 32" is regular-weight, lowercase, muted). Wrapped row of compact chips — show the same 6 popular tags. Selected chips use the active chip style from the sidebar. A trailing `+ more tags` button (ghost) opens a full-screen tag picker (a second screen with an `IOSNavBar`-style header + search + scrollable chip wrap).
- **Sticky apply bar** — `padding: 10px 16px; border-top: 1px solid border; background: hsl(var(--bg-soft))`. Primary button full-width: `padding: 12px 0; background: hsl(var(--brand)); color: hsl(var(--bg)); border-radius: 10px; font-size: 14px; font-weight: 600`. Label: `Show N results`, where N is the live count that would match the current sheet selections. Tapping applies and dismisses. Swipe-down on the grabber or tap outside the sheet also dismisses (confirm, not cancel — selections are live).

### Interaction notes

- **Kind** and **Category** are single-select radios. Tapping one replaces the active selection.
- **Tags** is multi-select. Tapping toggles.
- The filter **badge count** on M1's "Filters" pill = (# tags selected) + (1 if category ≠ All). Kind is excluded (it's always one value and is shown separately in the segmented control).
- Applying filters on the sheet updates the list behind it with a 200ms cross-fade.

---

## State management

Single source of truth — a `useAlgorithmsFilters` hook or store with:

```ts
type Kind = 'classical' | 'models';
type Filters = {
  kind: Kind;            // default 'classical'
  categoryId: string;    // default 'all'
  tags: string[];        // default []
  query: string;         // default ''
  view: 'grid' | 'list'; // default 'grid'
  sort: 'az' | 'recent'; // default 'recent'
};
```

Serialize to URL query params (`?kind=classical&cat=corners&tags=corner-detection,homography&q=harris&view=grid&sort=az`) so filter state is shareable and survives reload. Clearing filters (mobile "Reset" or explicit "clear") resets everything except `kind` and `view`.

Filtering is client-side over the already-loaded algorithms list (same as today). Derived: `filteredAlgos = filterBy(kind, category, tags, query, sort)`. Count shown in the header, in each sidebar row (reflecting all _other_ facets — classic faceted-search UX), and on the mobile sheet's apply button.

---

## Design tokens

All from existing CSS variables in `src/index.css`. Do not hardcode hex values.

- `hsl(var(--brand))` — `191 75% 55%` (cyan)
- `hsl(var(--brand) / 0.5)`, `/ 0.3`, `/ 0.12`, `/ 0.08` — active states, badges, subtle tints
- `hsl(var(--foreground))` — `210 40% 96%`
- `hsl(var(--foreground) / 0.8)` — dim foreground used for inactive rows
- `hsl(var(--muted-foreground))` — `215 20% 65%`
- `hsl(var(--bg))` — `222 47% 11%` (page background; iOS safe-area)
- `hsl(var(--bg-soft))` — `222 40% 13%` (search input, sheet body)
- `hsl(var(--surface))` — `217 33% 17%` (cards, sheet "Kind" cards)
- `hsl(var(--surface-hi))` — `217 33% 21%` (active row background, active segment)
- `hsl(var(--border))` — `215 25% 27%`
- `hsl(var(--border) / 0.7)`, `/ 0.6`, `/ 0.38` — progressively softer dividers

Radius: 4 (glyph tile), 5 (sidebar row, segment cell), 6 (view toggle button, compact pill), 8 (Filter pill, card, Kind card in sheet), 10 (search bar, Apply button, sheet body elements, Tag popover), 18 (sheet corner).

Typography: Inter. Sizes used: 10.5 (mobile labels), 11 (tiny meta), 11.5 (card desc desktop), 12 (compact chip, search, mobile card desc), 12.5–13 (body & button text), 13.5–14 (card title mobile / Apply button), 15 (dim count beside title), 17 (sheet header), 22 (page title), 34 (unused — baseline hero only).

---

## Assets

- `VMark` logo — the live `VitavisionLogo` component, variant `symbol` or `full`.
- Lucide icons (all sizes in parens refer to default on their usage above):
  - `Search` (13 desktop / 15 mobile / 13 in segmented search-leading)
  - `SlidersHorizontal` (13) — the mobile "Filters" pill leading icon. If the project currently uses `Filter`, keep that.
  - `ArrowUpDown` (13) — mobile "Sort" pill
  - `ChevronDown` (13) — Filter pill trailing
  - `ChevronRight` (12) — "Browse" links (unused in A but used if a category-detail page lands)
  - `LayoutGrid` / `List` (13) — desktop view toggle
  - `X` (9, stroke-width 2) — removable chip close
- Algorithm glyphs — the existing per-algorithm thumbnail system. The references show placeholder glyphs (`chess`, `fast`, `harris`, `cross`, `shi`, `charuco`, `dots`); use whatever the live app already has.

---

## Files in this bundle

- `README.md` — this file.
- `reference-desktop.html` — open to pan/zoom the **desktop** artboards (baseline, A). Ship **Option A**.
- `reference-mobile.html` — open to pan/zoom the **mobile** artboards (M1, M2, M3, M4). Ship **M1 + M2**.
- `algorithms-page.jsx` — the desktop prototype source. `Baseline` + `OptionA`; mirror `OptionA`.
- `algorithms-mobile.jsx` — the mobile prototype source. Port `MobileM1` + `MobileM2`.
- `algorithms-primitives.jsx` — shared atoms used by both: `VV` tokens, `TAGS_ALL`, `TAGS_POPULAR`, `CATEGORIES`, `ALGOS`, `Glyph`, `VMark`, `TopNav`, `Chip`, `AlgoCard`, `SectionHeader`, `Icon`. Good source of truth for exact values.
- `design-canvas.jsx`, `ios-frame.jsx` — just the canvas/device-frame scaffolding used by the prototypes; not needed in the real app.

---

## Implementation checklist

- [ ] Add the shared `useAlgorithmsFilters` hook / store backing all filter state + URL sync.
- [ ] Desktop: refactor `Algorithms.tsx` into a 220px / 1fr grid below the nav.
- [ ] Build `AlgorithmsSidebar` with Kind (radio), Category (radio), Tags (multi, popular 6 + "all 32 →" link).
- [ ] Build the "all 32" tag picker (modal or popover) with search + Popular + All.
- [ ] Replace the page's tag-cloud + segmented control with the new main-column header (title + count + search + view toggle).
- [ ] Mobile: build `AlgorithmsFilterPill` and `AlgorithmsFilterSheet` (grabber, Reset, Kind cards, Category rows, Tags chips, sticky Apply with live count).
- [ ] Wire `useMediaQuery('(min-width: 1024px)')` to choose desktop vs mobile UI; ensure filter state survives the switch.
- [ ] Verify light and dark themes (prototypes are dark-only; project supports both).
- [ ] Verify keyboard navigation and screen-reader labels: sidebar radios should be a real `<ul role="radiogroup">`-style structure (or native radios), tag chips should be toggle buttons, the sheet should trap focus and close on Esc.
- [ ] Verify `prefers-reduced-motion` — sheet open/close transitions should respect it.
