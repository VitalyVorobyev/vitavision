# design-sync notes — vitavision

Repo-specific gotchas for future `/design-sync` runs. Read this **before** anything else.

## What this repo is (and isn't)

vitavision is an **application**, not a published component package: `private: true`,
no `exports` map, no `dist/` of components. There is therefore no shipped entry for the
converter to bundle. The design-system surface is defined by hand:

- `.design-sync/ds-entry.tsx` — the curated export list (`bun run ds:validate` prints the
  component count). Adding a component to the sync means adding it **here**, to
  `componentSrcMap` in `config.json`, *and* writing `previews/<Name>.tsx`. Miss one and it
  silently won't appear — so `ds:validate` fails when the three disagree.
  Two sources: the app's own presentational components (`src/`), and the interactive
  controls re-exported from `@vitavision/ui` (Button, Select, Field, NumberInput,
  SegmentedControl, Checkbox, Dialog, Callout, Tooltip, InfoHint), whose
  `componentSrcMap` entries point into `node_modules/@vitavision/ui/src`. ui's `Panel`
  is deliberately not re-exported: the name belongs to the illustration primitive.
- `.design-sync/tsconfig.ds.json` — declaration-only `tsc` project rooted at that entry.
- `.design-sync/build-ds.mjs` — esbuild pre-bundle + stylesheet rewrite.

`buildCmd` runs `bun run content:build`, `vite build`, then those three. Run it before the converter
on every re-sync.

## Gotchas that cost real debugging time

- **Root `tsconfig.json` carries no `compilerOptions.jsx`.** It is a solution file
  (`"files": []`, project references only). esbuild discovers it walking up from `src/**`,
  finds no `jsx` setting, and falls back to the CLASSIC transform — which emits
  `React.createElement` into components that never import React, so every card dies with
  "React is not defined". `build-ds.mjs` pre-bundles with an explicit `jsx: 'automatic'`
  so the converter only ever sees plain ESM. **Do not** point `--entry` straight at `src/`.

- **Vite emits root-absolute font urls** (`url(/assets/ibm-plex-sans-….woff2)`). The converter
  resolves `url()` relative to the stylesheet, so those never resolve: every font file
  silently fails to copy and every design renders in a fallback font. `build-ds.mjs`
  rewrites them to `../assets/` and writes the sheet to `dist/ds/styles.css`, next to
  `dist/assets/`, which makes them resolvable. Verify after any build:
  `ls ds-bundle/fonts | wc -l` should be several dozen (IBM Plex, Source Serif 4, KaTeX), not 1.

- **`buildCmd` starts with `content:build`, and has to.** `ds-entry.tsx` seeds `PapersContext`
  from `public/papers-index.json`, which `content:build` generates and git ignores; on a fresh
  clone both the `tsc` step and the esbuild step fail with "Cannot find module" until it
  exists. (`content:build` is ~5 s and leaves the tree clean; the old KaTeX-float churn in
  `src/generated` is gone.) The rest of `bun run build` (`tsc -b`) adds nothing here.

- **Grouping is capped by the converter.** A doc's frontmatter `category` only overrides
  the group when the *source-directory* group is empty (`package-build.mjs:777` — it
  applies only for `''`/`general`/`misc`). So `ui/` → `general` → `UI` works, but
  `illustrations/_shared/` → `shared` and `targetgen/panels/` → `panels` win over their
  `category:` lines. Net effect: the 9 illustration primitives share the `shared` group
  with the brand chrome, and TargetPreview sits alone in `targetgen` apart from its
  panels. Cosmetic only. Fixing it needs a `lib/source-kit.mjs` fork — judged not worth it.

## Deliberately excluded

- **RelationsSidebar / RelationshipPanel** — reaches Clerk via
  `src/lib/auth/useIsAdmin.ts` (`useUser`), which throws outside a `ClerkProvider`.
  The publishable key lives only in gitignored `.env.local`, so wiring it would mean
  committing a key. Add it later only if the key is sourced some other way.
- **Editor / canvas / WASM components** — coupled to the Zustand editor
  store, react-konva, or WASM workers; they cannot render standalone in the design
  agent's runtime.
- **`guidelinesGlob` is `[]` on purpose.** The default globs slurp `docs/*.md`, which here is
  Atlas and developer material, not design guidance. The real design language lives in
  `.design-sync/conventions.md`, which restates @vitavision/ui's tokens (lab-ui
  `docs/visual-language.md` is the source of truth) plus the editorial layer in
  `src/styles/editorial-tokens.css`.

## Ambient context the design system must supply

`DesignPreviewProvider` in `ds-entry.tsx` is wired as `cfg.provider`, so it wraps every
preview card **and every design built with this system**. It currently provides three
things, each for a concrete reason — do not trim it without re-checking these:

- `MemoryRouter` — several components render `<Link>`.
- ui's `TooltipProvider` — `Tooltip` (re-exported from `@vitavision/ui`; its
  `componentSrcMap` entry points into `node_modules/@vitavision/ui/src`) and `InfoHint`
  render `TooltipPrimitive.Root`, which reads Radix's provider context unconditionally.
  Radix gives that context no default, so without an ancestor Provider it throws during
  render. The app mounts one at its root; a design render has none, so this brings it.
- `PapersContext` seeded from `public/papers-index.json` — `SourceCard` / `SourceStrip`
  resolve papers through `usePaperById`, which the app fills by lazily fetching
  `/papers-index.json`. Nothing serves that during a design render.

**Context can only be provided from `ds-entry.tsx`, never from a preview file.** A preview
importing `papersContext.ts` by relative path gets a *second* `createContext()` instance,
invisible to the components reading the one baked into the bundle. The entry is inside the
same bundle, so its provider is the same instance.

## The failure mode to watch for: a silently blank card

Both blockers above produced a **completely blank cell with zero reported errors**. React
swallows a render throw at the root, the `try/catch` in the card's mount helper never fires,
and Playwright's `pageerror` hook sees nothing — so `package-capture.mjs` cheerfully reports
a normal capture. The render check's `bad` count does not catch it either when the card is
large enough to clear the blank-PNG threshold. **Reading the sheet pixels is the only thing
that catches this class of bug.** Never grade from the capture log alone.

## Tailwind classes in previews are NOT compiled

`dist/ds/styles.css` is Vite's compiled output, and Tailwind v4 only generates utilities it
finds in its scanned sources — which do **not** include `.design-sync/previews/`. A class
used only in a preview produces no rule at all, silently: no error, just unstyled output,
and for sizing utilities (`h-40`, `w-72`, `w-60`) a zero-size container that reads as a
blank card. Five preview files hit this in wave 1.

Guard: `node .design-sync/check-preview-classes.mjs [Name ...]` — greps every `className`
string literal against the shipped CSS and exits non-zero on anything with no rule. **Run it
after authoring previews and before capture.** Fix by switching to a class the app already
uses, or by setting the exact value with inline `style={{…}}`.

Not fixed at the source deliberately: adding `@source "../.design-sync/previews"` to
`src/index.css` would work, but it makes the *application's* production CSS carry utilities
it never uses, to serve tooling. Not worth it for the app.

## Component-specific gotchas (from wave 1)

- **Fixed-width rails** (`AlgorithmsSidebar` is a `w-[220px]` aside): wrap them in a
  container of the same explicit width. In a full-width wrapper the card is mostly empty
  space and reads as missing content even though the component is complete.
- **Portal / `position: fixed` overlays** (`AlgorithmsFilterSheet` portals to `document.body`)
  render correctly in the default grid card — `.ds-cell` sets `transform: translateZ(0)`,
  making the cell the containing block. No `cardMode: "single"` override needed.
- **Prop types are not exported** through the `vitcv` global (`AlgorithmsFilters`,
  `FacetCounts`, …). Previews build plain object literals matching the shapes in
  `src/hooks/useAlgorithmsFilters.ts`. The preview build is esbuild transpile-only with no
  type-check gate, so keep those literals honest by hand if the hook's shape changes.
- **Glyph coverage is sparse by design.** `AlgorithmGlyph` has bespoke glyphs for only a
  handful of slugs; everything else falls through to `CategoryGlyph`, which special-cases
  only `features` / `targets` / `geometry` and renders a generic serif "ƒ" for every other
  domain. That is real current behaviour, not a preview defect.
- **`Tooltip` cards show the trigger only.** The popup is hover-gated and the wrapper
  exposes no `open` prop, so a static capture cannot show it. Deliberate, not a gap.
- **`Dialog` has exactly one story.** It is a modal portalled to `<body>` with a dimming backdrop,
  so a second cell in the same card would sit under the first one's overlay (verified in a
  Chromium render of all previews on one page). The open state is the useful one; closed is just
  a trigger.
- **The ui controls come from `node_modules/@vitavision/ui`**, so a ui version bump changes the
  design system without touching this repo's `src/`. Re-run the build and the previews after one,
  and keep the `.design-sync/docs/` pages (props, defaults) in step with ui's TSDoc.

- **`AlgorithmsFilterSheet` has no "closed" cell.** Closed means unmounted — nothing renders
  — so the state is documented in its `.prompt.md` rather than faked with a placeholder cell.

## Root-absolute asset paths don't resolve in a design render

Several components request assets from the app's web root. Those exist under `public/` and are
served by the real app, but nothing serves them to a preview card or a rendered design, and the
upload plan only carries `components/`, `tokens/`, `fonts/`, `_vendor/`, `_preview/`,
`guidelines/` plus a handful of named root files — so they cannot simply be shipped alongside.

- **`Footer`** — hardcodes `/github-mark.svg`, `/github-mark-light.svg`, `/InBug-Black.png`,
  `/InBug-White.png`. Not prop-driven, so unfixable from a preview. **Excluded from the sync**
  (see the comment in `ds-entry.tsx`). To re-add: inline the four icons as SVG, or accept them as
  props, then restore the export and the `componentSrcMap` entry.
- **`TargetPreview` / `TargetConfigPanel` / `DownloadBar`** — the app renders the preview SVG and
  runs the validation through the calib-targets / ringgrid WASM worker, and `validateConfig`,
  `svg/index.ts` and `puzzlepole/periods.ts` all reach `src/lib/wasm/`. The components themselves
  are presentational (they show `state.previewSvg` / `state.validation`; `generateDxf` and
  `puzzlepolePeriods` are injected props), so the previews feed them static data from
  `.design-sync/fixtures/targetgen.ts` — a sketched SVG per target kind, a hand-built fit check and a
  short real periods list. **Never import `validation.ts`, `svg/index.ts` or `periods.ts` from a
  preview.** (`ds:validate` now bundles every preview too and fails on exactly this.)
- **`SourceCard` / `SourceStrip`** — same class of problem, but solvable: fixed centrally by
  seeding `PapersContext` in `ds-entry.tsx` (see above) rather than by serving the JSON.

If a future wave needs more of these, the general fix is to seed the data through
`ds-entry.tsx` (works, same-bundle) rather than to serve files (doesn't).

## `Link` in a preview file throws — use a plain `<a>`

A preview that imports `Link` from `react-router` bundles its **own** copy of react-router,
whose `NavigationContext` is a different instance from the one the ambient `MemoryRouter` writes
to — so `Link` throws, and (as always) the cell just goes blank with no reported error. Preview
files should use a plain `<a>` for visual chrome; navigation is meaningless in a static card
anyway. This affects preview files only — components inside the bundle share the entry's
react-router instance and work fine.

## `check-preview-classes.mjs` scans raw text

It regex-matches `className="…"` across the whole file, so a **comment** containing a literal
`className="…"` example gets scanned too and its contents reported as missing classes. Harmless
but confusing — write comments as prose rather than pasting markup into them.

## Known render warns (expected — not new)

- `[TOKENS_MISSING] --shiki-light, --shiki-dark, --shiki-light-bg, --shiki-dark-bg` —
  Shiki sets these inline on code blocks at runtime. Correctly absent from static CSS.
- `[RENDER_THIN] AlgorithmsFilterSheet: variants render identically` — **benign, confirmed from
  the screenshot.** The two cells differ clearly (`Show 33 results` vs `Show 9 results`, different
  facets highlighted). The component portals its sheet to `document.body` with `position: fixed`,
  which defeats the checker's per-cell measurement. Do not "fix" the preview for this.
- `[DOCS_UNMAPPED]` for the components without a file in `.design-sync/docs/` — they get
  a synthesized `.prompt.md` from the `.d.ts` + preview. Intentional; only the
  components needing a regroup or extra usage guidance have hand-written docs (the @vitavision/ui
  controls, the illustration primitives and the target-generator panels).

## Verifying tooling: simulate CI with a `git clone`, never an rsync

Landing the boundary guard (`scripts/validate-ds-boundary.ts`) took three red CI runs, all
from the same root cause: **treating the local working tree as representative of a clean
checkout.** In order — a stale `node_modules` (`@vitavision/calib-targets@0.8.0` against a
`^0.10.1` requirement) that produced a phantom "the build is broken on main"; an `esbuild`
import that resolved only because vite hoists it, absent from a fresh
`bun install --frozen-lockfile`; and a bundle of `public/papers-index.json`, which is
generated by `content:build` and **gitignored**, so it simply is not there before the build
step runs.

The middle one was "verified" by an rsync of the working tree minus `node_modules`. That
catches dependency drift and nothing else — every generated-but-gitignored file comes along
for the ride. The check that actually works:

```
git clone --depth 1 file://"$PWD" /tmp/ci-sim -b <branch>
cd /tmp/ci-sim && bun install --frozen-lockfile
# then run the CI job's steps in order
```

Worth knowing this repo generates, and gitignores, `public/papers-index.json`,
`src/generated/**` content HTML, and `dist/**`. Any tooling that runs before `bun run build`
must not depend on them.

Second half of the lesson: also confirm the guard still **fails** when it should, in that
same clean environment. Inject a forbidden import, watch it go red, revert. A check that
passes on everything is worse than no check, because it buys false confidence.

## Re-sync risks — what can silently go stale

- **The stylesheet is a snapshot of what the app currently uses.** Tailwind v4 compiles
  only the utilities present in the source at build time, so a class the design agent
  invents that the app never used has no rule. This is why `conventions.md` enumerates
  the token vocabulary instead of hand-waving at "use Tailwind".
- **`ds-entry.tsx` does not track `src/`.** A component deleted or renamed upstream
  breaks the `tsc` step loudly (good), but a *new* component worth syncing will never
  appear on its own — the entry is a hand-curated list.
- **Coupling can change under you.** A component that is standalone today starts
  throwing the moment someone adds a store/WASM/konva/Clerk import to it or to one of
  its children. Symptom is `[RENDER] root empty` on a component that used to pass —
  i.e. a blank card with a clean log, the most expensive failure mode here.
  `bun run ds:validate` (`scripts/validate-ds-boundary.ts`) now guards this in CI: it
  bundles `ds-entry.tsx` with esbuild and fails on any forbidden path or package in the
  **runtime** graph (type-only imports are erased, so they correctly pass). Extend the
  `FORBIDDEN_PATHS` / `FORBIDDEN_PACKAGES` tables at the top of that script when a new
  ambient dependency turns out to be unprovidable in a design render. It does not cover
  non-import coupling — a missing React context or a runtime `fetch` of an asset from
  `public/` still only shows up in the render check.
- **`dist/` is gitignored**, so a fresh clone has no stylesheet, no `.d.ts` tree, and no
  pre-bundle until `buildCmd` runs. Also recreate the fork symlink if overrides ever land:
  `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`.
- **Playwright/chromium is not in the repo toolchain** — it was installed into
  `.ds-sync/` (gitignored) purely for the render check. A fresh clone must reinstall it
  before validate, or the render check is skipped.
