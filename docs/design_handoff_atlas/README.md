# Atlas redesign — handoff bundle

Read **`HANDOFF.md`** first. It's the implementation spec.

The `.jsx` files in this bundle are **visual + behavioral reference**, not
source to copy verbatim:

- They run on plain React + browser-Babel + a Tailwind CDN, not on your
  TypeScript + Vite + Tailwind setup.
- They use a synthetic dataset to demonstrate the design. The component
  shapes, layout math, edge geometry, hover behavior, and copy are the
  ground truth — translate them into the codebase, don't copy them.

## File map

| File                         | What it shows                                                              |
|------------------------------|-----------------------------------------------------------------------------|
| `HANDOFF.md`                 | The spec. Entry point.                                                      |
| `atlas-data.jsx`             | Shape of `getNeighbors()`, the `EXTRA_META` tagline/source pattern, the Problem taxonomy. Entries themselves are placeholder data — don't import. |
| `atlas-icons.jsx`            | 12-primitive placeholder icon set keyed by `hash(slug)`. Lift verbatim into `EntryIcon.tsx`. |
| `atlas-shared.jsx`           | Sidebar with the new Problem axis (`AtlasSidebar`).                         |
| `direction-1-refined.jsx`    | Refined Catalog cards + grouping + sidebar wiring.                          |
| `direction-2-graph.jsx`      | Graph Explorer — desktop. Lane layout, edge math, smart-nav, trail cap.     |
| `direction-3-mobile.jsx`     | Graph Explorer — mobile. Sheet + grouped lists.                             |

## What to ignore

- Synthetic dataset (`ATLAS_ENTRIES`) in `atlas-data.jsx` — use the real
  content-graph from `src/generated/content-graph.ts` instead.
- Inline Tailwind classes use CDN class names; verify each against your
  Tailwind config. The HSL color tokens match the project's existing
  Technical-Journal theme.
- `useTweaks`, `EXTRA_RELATIONS`, lineage chains — design-only scaffolding.
