# design-sync notes — vitavision

Repo-specific gotchas for future `/design-sync` runs. Read this **before** anything else.

## What this repo is (and isn't)

vitavision is an **application**, not a published component package: `private: true`,
no `exports` map, no `dist/` of components. There is therefore no shipped entry for the
converter to bundle. The design-system surface is defined by hand:

- `.design-sync/ds-entry.tsx` — the curated export list (41 presentational components).
  Adding a component to the sync means adding it **here** *and* to `componentSrcMap`
  in `config.json`. Both, or it silently won't appear.
- `.design-sync/tsconfig.ds.json` — declaration-only `tsc` project rooted at that entry.
- `.design-sync/build-ds.mjs` — esbuild pre-bundle + stylesheet rewrite.

`buildCmd` chains all three after `vite build`. Run it before the converter on every re-sync.

## Gotchas that cost real debugging time

- **Root `tsconfig.json` carries no `compilerOptions.jsx`.** It is a solution file
  (`"files": []`, project references only). esbuild discovers it walking up from `src/**`,
  finds no `jsx` setting, and falls back to the CLASSIC transform — which emits
  `React.createElement` into components that never import React, so every card dies with
  "React is not defined". `build-ds.mjs` pre-bundles with an explicit `jsx: 'automatic'`
  so the converter only ever sees plain ESM. **Do not** point `--entry` straight at `src/`.

- **Vite emits root-absolute font urls** (`url(/assets/inter-….woff2)`). The converter
  resolves `url()` relative to the stylesheet, so those never resolve: all 117 font files
  silently fail to copy and every design renders in a fallback font. `build-ds.mjs`
  rewrites them to `../assets/` and writes the sheet to `dist/ds/styles.css`, next to
  `dist/assets/`, which makes them resolvable. Verify after any build:
  `ls ds-bundle/fonts | wc -l` should be ~138, not 1.

- **Do not run `bun run build` for this workflow — use `buildCmd`.** The full script starts
  with `content:build`, which regenerates `src/generated/content/**` and dirties ~121 tracked
  files. The diff is not content: it is KaTeX float precision inside the pre-rendered HTML
  (`0.0572em` → `0.05724em`), i.e. the installed KaTeX differs slightly from whatever
  generated the committed files. Harmless but noisy — `git checkout -- src/generated` to
  undo. `buildCmd` deliberately skips `content:build` and runs `vite build` alone.

- **The repo build is broken on `main`** (as of 2026-07-22): `bun run build` fails at
  `tsc -b` with TS2339 on `src/lib/wasm/wasmWorker.ts:803,963`
  (`detect_marker_board_with_diagnostics`, `detect_puzzleboard_with_diagnostics` missing
  from `@vitavision/calib-targets`). Unrelated to design-sync, and it does **not** block
  us: `npx vite build` alone succeeds, and no synced component's import graph touches
  `src/lib/wasm/**`, so `tsconfig.ds.json` type-checks clean. If someone fixes the WASM
  types, nothing here needs to change.

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
- **Editor / canvas / WASM components** (~54 of 95) — coupled to the Zustand editor
  store, react-konva, or WASM workers; they cannot render standalone in the design
  agent's runtime.
- **`guidelinesGlob` is `[]` on purpose.** The default globs slurp `docs/*.md`, which
  here is Atlas research material, not design guidance. Worse, `docs/brand_identity.md`
  is **stale**: it describes a dark-navy `#0B132B` / cyan `#33C6E3` palette, while
  `src/index.css` actually implements the light-first "Technical Journal" scheme. Only
  `--brand` (the cyan logo pupil) survived. Shipping that file would teach the design
  agent the wrong palette. The real design language lives in `.design-sync/conventions.md`.

## Ambient context the design system must supply

`DesignPreviewProvider` in `ds-entry.tsx` is wired as `cfg.provider`, so it wraps every
preview card **and every design built with this system**. It currently provides three
things, each for a concrete reason — do not trim it without re-checking these:

- `MemoryRouter` — several components render `<Link>`.
- `TooltipPrimitive.Provider` — `Tooltip` renders `TooltipPrimitive.Root`, which reads
  Radix's provider context unconditionally. Radix gives that context no default, so
  without an ancestor Provider it throws during render. In the app every call site
  (`src/pages/Editor.tsx`, `src/pages/Home.tsx`) supplies its own local Provider and
  there is no global one, so the requirement is invisible until you extract the component.
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
- **`TargetPreview`** — ChArUco and ring-grid fetch `/arucodict/*.json` and
  `/ringgrid/codebook_*.json` at render time; the other three target types are pure geometry.
  Kept in the sync, with the caveat documented in `.design-sync/docs/TargetPreview.md` so the
  design agent reads it. Its preview stubs `window.fetch` for exactly those two URLs, so the card
  shows full capability — deliberately more than a bare design gets.
- **`SourceCard` / `SourceStrip`** — same class of problem, but solvable: fixed centrally by
  seeding `PapersContext` in `ds-entry.tsx` (see above) rather than by serving the JSON.

If a future wave needs more of these, the general fix is to seed the data through
`ds-entry.tsx` (works, same-bundle) rather than to serve files (doesn't).

## `Link` in a preview file throws — use a plain `<a>`

A preview that imports `Link` from `react-router-dom` bundles its **own** copy of react-router,
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
  a synthesized `.prompt.md` from the `.d.ts` + preview. Intentional; only the 16
  components needing a regroup or extra usage guidance have hand-written docs.

## Re-sync risks — what can silently go stale

- **The stylesheet is a snapshot of what the app currently uses.** Tailwind v4 compiles
  only the utilities present in the source at build time, so a class the design agent
  invents that the app never used has no rule. This is why `conventions.md` enumerates
  the token vocabulary instead of hand-waving at "use Tailwind".
- **`ds-entry.tsx` does not track `src/`.** A component deleted or renamed upstream
  breaks the `tsc` step loudly (good), but a *new* component worth syncing will never
  appear on its own — the entry is a hand-curated list.
- **Coupling can change under you.** A component that is standalone today starts
  throwing the moment someone adds a store/router/Clerk import to it or to one of its
  children. Symptom is `[RENDER] root empty` on a component that used to pass. Re-check
  the transitive import graph rather than patching the preview.
- **`dist/` is gitignored**, so a fresh clone has no stylesheet, no `.d.ts` tree, and no
  pre-bundle until `buildCmd` runs. Also recreate the fork symlink if overrides ever land:
  `ln -sfn ../.ds-sync/node_modules .design-sync/node_modules`.
- **Playwright/chromium is not in the repo toolchain** — it was installed into
  `.ds-sync/` (gitignored) purely for the render check. A fresh clone must reinstall it
  before validate, or the render check is skipped.
