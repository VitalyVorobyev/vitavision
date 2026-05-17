# Atlas redesign — implementation handoff

This document specifies the changes designed for the Atlas index UI (and a
new Graph Explorer view) so they can be implemented in the real React
codebase. Designs live in `index.html` (this project) — open it to see the
artboards as a reference.

The visual system is the existing **"Technical Journal"** — same Inter +
Source Serif + Geist Mono type stack, same slate / blueprint colour
tokens. No new design system is being introduced.

---

## 1 · Data model additions

### 1.1 New optional frontmatter fields

Add to `algorithmFrontmatterSchema`, `modelFrontmatterSchema`, and where
sensible `conceptFrontmatterSchema` in `src/lib/content/schema.ts`:

| Field      | Type                | Purpose                                                                 |
|------------|---------------------|-------------------------------------------------------------------------|
| `year`     | `number` (optional) | Publication year of the **method**, distinct from `date` (article date) |
| `tagline`  | `string` (optional) | One-line, low-jargon summary (~80 chars max) — for cards and graph view |

`sources.primary` already exists. The graph view's center card renders a
compact citation from it; if it's a URL, render `host + last-path-segment`,
otherwise render the string verbatim.

### 1.2 The relations on cards & in the graph view come from existing fields

Nothing new required. The graph explorer uses:

- `relations[].type ∈ {extended_by, alternative_formulation_of, parallel_foundation_with, extended_by, compared_with, feeds_into, learned_alternative_of}`
- `prerequisites[]` (existing)

The view groups them into 4 lanes (see § 3.2). The reverse edges (e.g.
"extended_from") are computed at query time by scanning every entry's
`relations[]` for a target matching the focused slug.

### 1.3 Helper: `getNeighbors(slug)`

Add to `src/lib/atlas/` (e.g. `graphNeighbors.ts`):

```ts
export interface Neighbors {
  focus: AlgorithmIndexEntry | ModelIndexEntry | ConceptIndexEntry;
  prerequisites:  string[];   // concept/algorithm slugs from prerequisites[]
  extended_from:  string[];   // reverse extended_by + generalized_by
  compared_with:  string[];   // compared_with (symmetric)
  extended_by:    string[];   // forward extended_by + generalized_by
  feeds_into:     string[];   // feeds_into
  learned_by:     string[];   // reverse learned_alternative_of
                              //   (i.e. models that learn this algorithm's job)
}

export function getNeighbors(slug: string): Neighbors | null;
```

`alternative_formulation_of` and `parallel_foundation_with` are bundled
into `compared_with` for display (they're all "these are peers").

Deduplicate within the result: if a slug appears in two relation buckets,
keep the most specific one. Priority: `learned_by` > `extended_by` /
`extended_from` > `prerequisites` > `feeds_into` > `compared_with`.

---

## 2 · Refined Catalog (index page)

`src/pages/AlgorithmIndex.tsx` and `src/components/blog/AlgorithmCard.tsx`
(and the Model / Concept equivalents).

### 2.1 Card layout

```
┌─────────────────────────────────────────────────────┐
│ [icon]  Algorithm name (truncated)         [graph⬡] │
│         PROBLEM · YEAR                              │
│                                                     │
│ Tagline (1–2 lines, falls back to `summary[:140]`). │
│                                                     │
│ → extended by  SURF · ORB  +1                       │
└─────────────────────────────────────────────────────┘
```

- **Icon** (top-left, 30×30) — see § 4.
- **Title** — 13 px, `font-semibold`, line-clamp-2.
- **Graph chip** (top-right, 24×24) — opens Graph Explorer focused on this
  entry. Always visible, neutral until hover; on hover it shades to brand
  teal (`hsl(191 55% 28%)`).
- **Meta row** — `PROBLEM · YEAR` in 10.5 px uppercase mono. Problem is
  the entry's first task from `tasks[]` (humanised). Year is the new
  `year` field.
- **Body** — `tagline` if present, otherwise truncate `summary` to
  ~140 chars. 11.5 px, line-clamp-2.
- **Relation line** — bottom. Prefer `extended_by`; fall back to
  `compared_with`. Format: `→ extended by SHORT · SHORT · SHORT +N`.
  Each short name links to the target entry. The arrow glyph is `→`,
  rendered in `font-mono`. Show **max 3** named neighbors + `+N more`.

**Remove**: the `+` icon (replaced by per-entry icon), the difficulty pill
(too noisy for value), and the "Type letter" badge (we have a real icon now).

### 2.2 Sidebar — new "Problem" axis

Add a section between Type and Tags in `AlgorithmsSidebar.tsx`:

```
TYPE
  All ............ 76
  Algorithms ..... 46
  Models ......... 18
  Concepts ....... 12

PROBLEM
  Feature matching ........ 18
  Optical flow ............  3
  Robust estimation .......  6
  Two-view geometry .......  8
  Camera calibration ......  8
  Hand–eye calibration ....  2
  Image stitching .........  3
  Object detection ........ 14
  Segmentation ............  6
  …

TAGS
  …
```

Counts are derived from each entry's `tasks[]` frontmatter. One entry may
contribute to multiple problems. Selecting a problem filters the catalog
(intersection with Type). Active selection style: brand-teal text + soft
teal background, matching the design (`hsl(191 70% 94%)` bg).

---

## 3 · Graph Explorer (new view)

A new route, e.g. `/atlas/graph` (or query param `?view=graph` on the
existing atlas index). Lives in
`src/components/atlas/GraphExplorer.tsx` (new file).

Reachable from:
- The view-toggle row on the atlas index (next to grid/list).
- The graph chip on any catalog card → opens with that slug focused.
- `?focus=<slug>` query param.

### 3.1 Page structure

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header chrome (existing)                                                  │
├──────────────────────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌────────────────────────────────────────────────────────┐    │
│ │         │ │ Title row · ⌘K search · view toggle                    │    │
│ │ Sidebar │ ├────────────────────────────────────────────────────────┤    │
│ │         │ │ ← →  Trail  +N earlier · Harris › Shi-Tomasi › SIFT    │    │
│ │         │ ├────────────────────────────────────────────────────────┤    │
│ │         │ │                                                        │    │
│ │         │ │                                                        │    │
│ │         │ │              [Graph canvas — auto-fit]                 │    │
│ │         │ │                                                        │    │
│ │         │ └────────────────────────────────────────────────────────┘    │
│ └─────────┘                                                                │
└──────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Layout — four lanes

| Lane  | Relations                                  | Layout              |
|-------|--------------------------------------------|---------------------|
| West  | `prerequisites` then `extended_from`       | Single column, stacked |
| North | `compared_with`                            | Row, wraps every 5  |
| East  | `extended_by` then `feeds_into`            | Single column, stacked |
| South | `learned_by`                               | Row, wraps every 5  |

**No per-relation cap.** The canvas auto-grows to fit all neighbors.
Canvas minimum 1020 × 580; height grows with the tallest of W/E plus
N/S row blocks; width grows with N/S row width.

If the canvas exceeds its container, allow inner scroll. Do **not** add
pan/zoom in v1.

### 3.3 Center card

Width 360 px × height 208 px. Renders:

- Per-entry icon (40×40)
- Focused tag + Kind + Domain (10 px uppercase mono)
- Title (15 px semibold)
- **Tagline** (12.5 px, falls back to `summary[:160]`)
- **Primary source** — small mono row with a citation icon. Format from
  `sources.primary`. If URL → render `host` and a small "↗"; otherwise
  render verbatim.
- Bottom row: up to 2 problem chips on the left, `Open page →` link on
  the right.

### 3.4 Neighbor cards

184 × 68 px. Renders:

- Icon (18×18)
- Short title (use the part before `:` or `–` in the title; fall back to
  first two words)
- Year (mono, right-aligned)
- Bottom row: `KIND` (10 px uppercase) on the left, a colored relation
  badge with the relation's short label on the right (`prereq`, `vs`,
  `ext by`, `feeds`, `learn`).

Hover: border highlights, edge highlights, **all other edges dim to 18 %
opacity** so the relationship under the cursor is unambiguous.

### 3.5 Edges

- Cubic Bézier curves that exit each card edge perpendicularly.
  Endpoints clamped to card edges along the centerline. Control points
  offset perpendicular to the exited edge by `min(80, dist*0.45)`.
- Relation-tinted strokes (colors below). Default opacity 0.55; hover
  1.0; dimmed 0.18.
- Arrowhead on the "destination" end (where the lineage points to):
  - `out`: `extended_by`, `feeds_into`, `learned_by` → arrow on neighbor end
  - `in`:  `prerequisites`, `extended_from`           → arrow on center end
  - `none`: `compared_with` is symmetric → dashed line, no arrowhead
- Edge label sits at ~62 % along the curve toward the neighbor, on a
  small white pill with a 0.7-opacity colored border.

#### Colors

| Relation        | Color (HSL)         |
|-----------------|---------------------|
| `prerequisites` | `hsl(215 25% 45%)`  |
| `extended_from` | `hsl(215 19% 32%)`  |
| `compared_with` | `hsl(215 16% 55%)`  |
| `extended_by`   | `hsl(215 19% 32%)`  |
| `feeds_into`    | `hsl(215 25% 45%)`  |
| `learned_by`    | `hsl(191 55% 32%)`  |

### 3.6 Trail / undo-redo behavior

State:

```ts
const [history, setHistory] = useState<string[]>([]); // older → newer
const [current, setCurrent] = useState<string>(initialSlug);
const [future,  setFuture]  = useState<string[]>([]); // newer redo entries
```

- **navigate(slug)**:
  - If `slug === current`, no-op.
  - **Smart back**: if `slug === history.at(-1)`, run `back()` instead of pushing — avoids `a → b → a → b` zigzag.
  - **Smart forward**: if `slug === future[0]`, run `forward()` instead.
  - Otherwise: `setHistory([...history, current]); setCurrent(slug); setFuture([])`.
- **back()**: pops history into current, pushes current onto future.
- **forward()**: shifts future into current, pushes current onto history.
- **jumpToHistory(i)**: makes `history[i]` current; everything after `i`
  in history (plus current) is pushed onto future (preserving redo).

**Trail rendering**:

- Max **4 visible** entries on each side of `current`. If more exist,
  show a small `+N earlier` / `+N later` indicator at the end. The full
  history stays in state — only display is capped.
- Keyboard shortcuts: `⌘[` / `⌘]` for back / forward (matches browser
  history conventions).

### 3.7 Mobile (graph)

Below the existing `lg` breakpoint, replace the visual graph with a
**focused-entry sheet + grouped neighbor lists** (same data, same
navigation semantics, different shape). See `direction-3-mobile.jsx`
in the design project.

- Top app bar: back chevron · "Atlas / graph" · current entry name
- Trail strip (capped at 3 visible + `+N earlier`)
- Focused entry hero card (full width): icon · kind / year · title ·
  tagline · primary source · problem chips · "Open page →"
- Sections per relation type, each titled `Builds on · N`, etc., with
  tappable neighbor rows. Same dedup priority as desktop.
- The visual graph is **desktop-only** by design. Not blocked; reshaped.

---

## 4 · Per-entry icons

Replace today's `+` placeholder on Algorithm cards (and the matching
glyphs on Model / Concept cards) with **one unique icon per entry**.

### Interim — deterministic placeholders

While real icons are being drawn, render one of 12 simple SVG primitives
selected by `hash(slug) % 12`. The set lives in `atlas-icons.jsx`
(design project) — concentric rings, dot grid, crosshair, triangle,
checker, corner brackets, diamond, wave, spokes, bars, arrow, nested
square. Stroke colour is tinted by `Kind`:

- Algorithm → `hsl(215 30% 28%)`
- Model     → `hsl(191 60% 30%)`
- Concept   → `hsl(215 16% 50%)`

Background is `hsl(214 32% 96%)` / `hsl(191 60% 96%)` / `hsl(210 40% 98%)`,
border is `hsl(214 32% 88%)` (kind-tinted to match).

### Long-term — real icons

Author hand-drawn SVG glyphs per entry, e.g. one per algorithm. Add an
optional `icon` field to frontmatter (filename in
`public/atlas-icons/<slug>.svg` or inline SVG) and prefer that when
present; fall back to the placeholder set otherwise. Glyphs are 24×24
viewBox, single-color stroke, ~1.4 stroke-width.

---

## 5 · Out of scope (explicit deferrals)

- **Reading paths**: skipped per design discussion. Needs editorial
  curation; revisit later.
- **"Status" / "superseded" badges**: too opinionated for now.
- **Global graph view**: removed. The Graph Explorer (local, steerable)
  replaces it.
- **Relation-type filter chips in the graph**: nice-to-have, deferred.
- **Recenter animation**: deferred. v1 snaps; later we can interpolate
  positions for a smooth recenter.
- **Graph mini-embed at the top of each entry page**: deferred but
  trivial once `GraphExplorer` exists.

---

## 6 · Files in the design project that map to source

| Design project file        | Maps to in `vitavision`                                        |
|----------------------------|-----------------------------------------------------------------|
| `atlas-shared.jsx`         | `AlgorithmsSidebar.tsx` (new "Problem" section)                |
| `atlas-icons.jsx`          | new `src/components/atlas/EntryIcon.tsx` + placeholder set     |
| `atlas-data.jsx`           | reference data + `EXTRA_META` (tagline + source samples)        |
| `direction-1-refined.jsx`  | `AlgorithmCard.tsx`, `ModelCard.tsx`, `ConceptCard.tsx`        |
| `direction-2-graph.jsx`    | new `src/components/atlas/GraphExplorer.tsx` + helpers          |
| `direction-3-mobile.jsx`   | mobile branch in `GraphExplorer.tsx`                            |

---

## 7 · Acceptance checklist

- [ ] Catalog cards render the icon, problem · year meta line, tagline-
      or-summary body, and relation line.
- [ ] Catalog cards have a graph chip in the top-right that opens
      `GraphExplorer` focused on that entry.
- [ ] Sidebar has the Problem axis with live counts.
- [ ] Difficulty is no longer rendered on cards.
- [ ] Graph Explorer renders ALL typed neighbors for any focused entry —
      no `+N more` truncation in v1.
- [ ] Curved bezier edges with relation tints and arrowheads; symmetric
      `compared_with` edges are dashed.
- [ ] Center card shows kind/domain, title, tagline, primary source,
      problem chips, and Open-page link.
- [ ] Trail shows max 4 visible + `+N earlier` / `+N later` indicators.
- [ ] Clicking a neighbor that is the immediate previous focus → goes
      back (does **not** push duplicate).
- [ ] Clicking a neighbor that is the next redo entry → goes forward
      (does **not** clear redo stack).
- [ ] Keyboard `⌘[` / `⌘]` back/forward.
- [ ] Mobile graph view renders neighbors as grouped lists; same
      navigation contract; no visual graph attempted.
