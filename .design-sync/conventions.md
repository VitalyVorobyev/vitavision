## Building with Vitavision

Vitavision is the design system behind a computer-vision **Atlas** (algorithm, model, and
concept reference pages), a technical blog, an image-annotation editor, and a calibration-target
generator. Its chrome is **@vitavision/ui**'s *instrument* language: true-neutral greys, one
accent (`signal`, which means "you can act here"), and IBM Plex Sans with Plex Mono wherever a
number or an identifier appears. The editorial pages keep Source Serif 4 for body text. It should
read as *engineered*, not decorative.

### Wrap everything in `DesignPreviewProvider`

```jsx
<DesignPreviewProvider>
  <YourScreen />
</DesignPreviewProvider>
```

It supplies three contexts the components read. Skip it and the failure is silent — a blank
screen with no error in the console:

- **Router** — anything rendering a link (`SourceCard`, `AlgorithmsSidebar`, `TagFilter`).
- **Tooltip provider** — `Tooltip` and `InfoHint` throw during render without it.
- **Papers index** — `SourceCard` / `SourceStrip` look a paper up by ID and render `null` when
  the lookup misses. Pass a real ID from the index, e.g. `primary="zhang2000-flexible"`,
  `"harris1988-corner"`, `"rosten2006-fast"`, `"detone2018-superpoint"`.

### Styling: Tailwind utilities over semantic tokens

Never hard-code a colour. Every colour is a CSS custom property with a matching utility, and
each has a dark-mode value that swaps automatically under a `.dark` ancestor — so using the
token names is what makes a design work in both themes. The tokens are @vitavision/ui's
(`@vitavision/ui/styles.css`); the few the site adds for its editorial pages live in
`src/styles/editorial-tokens.css`.

| Purpose | Utilities |
|---|---|
| Surfaces | `bg-ground` (page), `bg-surface` (card, panel), `bg-raised` (inset, chip, hover), `bg-overlay` (anything floating: sheet, popover) |
| Text | `text-fg`, `text-fg-muted` (secondary), `text-fg-subtle` (least) |
| Hairlines | `border-line` (dividers, cards), `border-line-strong` (the boundary of a control: input, select, kbd) |
| Accent | `bg-signal` + `text-signal-fg` (primary action), `text-signal`, `bg-signal/10` (selected). Only for "you can act here": focus, selection, the active item. |
| Verdicts | `text-defect` / `bg-defect/10` (errors, destructive), `text-normal`, `text-warn` — only for a judgement the app made |
| Editorial | `text-article-body`, `text-article-heading`, `text-article-link`; `text-ink-blue` / `-amber` / `-green` / `-violet` / `-slate` (category and status labels on reading pages, never verdicts); `text-brand-mark` (the logo's cyan pupil; identity only) |
| Type | `font-sans` (IBM Plex Sans, UI and headings), `font-serif` (Source Serif 4, article body), `font-mono` (IBM Plex Mono, all numbers/IDs/keys) |
| Radius | `rounded-control` (6px: buttons, inputs, chips) and `rounded-panel` (10px: cards, panels). Do not reach for `rounded-xl`+ (only the illustration primitives below use larger radii). |

Two caveats worth knowing:

1. **The stylesheet is compiled from what the app already uses.** A utility no vitavision
   component ever used may have no rule. Prefer the names in the table; if you need something
   outside it, set the value with an inline `style` (`style={{ background: "var(--raised)" }}`)
   rather than trusting an arbitrary class to resolve.
2. **Uppercase mono micro-labels are the house signature.** Section kickers in figures and
   panels use `TinyBrow` (10px) or `Eyebrow` (11px) — mono, uppercase, wide tracking, muted. Use
   them instead of inventing small-caps headings.

### Interactive UI comes from `@vitavision/ui`

Every control a user operates is **@vitavision/ui**'s, re-exported here under its own name:
`Button` (`primary` / `secondary` / `ghost` / `danger`), `Select`, `Field` with `NumberInput`,
`SegmentedControl`, `Checkbox`, `Dialog`, `Callout`, `Tooltip` and `InfoHint`. Never hand-roll a
button, input, select or modal from utilities, and never hard-code their look: label every field
with `Field`, put a help mark in its `annotation`, keep a single `primary` `Button` per screen. Each
component's docs page lists its props; the full spec is in lab-ui's Storybook (https://vitalyvorobyev.github.io/lab-ui/).

### Editorial-illustration primitives (not for UI)

`Panel` (gradient card) and `PanelFlat` (solid, for nesting) are the containers; `FloatingPanel`
is overlay chrome for anything sitting above a canvas. `MetricCell` is the numeric readout, with
a `tone` of `neutral` / `good` / `warn` / `bad`. `Pill`, `Kbd`, and `Note` cover tags, key hints,
and asides, and `TinyBrow` / `Eyebrow` are the mono kickers. These nine are **editorial-illustration
primitives**: the chrome of article figures and home specimens, with their own larger radii. They are
not a second control set: anything interactive uses the `@vitavision/ui` components above (a message
is a `Callout`, not a `Note`). Atlas surfaces get `EntryIcon`, `QualityBadge`, `SourceCard`, and
`SourceStrip`.

```jsx
<Panel className="p-5">
  <Eyebrow>Calibration run</Eyebrow>
  <h3 className="mt-1 font-serif text-lg text-fg">Zhang planar, 14 views</h3>
  <div className="mt-4 grid grid-cols-3 gap-2">
    <MetricCell label="RMS reproj" value="0.184 px" tone="good" />
    <MetricCell label="Views" value="14" />
    <MetricCell label="Outliers" value="7" tone="warn" />
  </div>
  <Note className="mt-4">Assumes the target is planar to within 0.1 mm.</Note>
</Panel>
```

### The logo

`VitavisionLogo` is the brand mark: two nested, asymmetric "V" strokes (optical paths) that converge
on a solid central circle, the "pupil" of a sensor, so it reads as focus and detection. The strokes
use `currentColor`, so place it in a text colour (`text-fg`); the pupil is the one use of
`text-brand-mark`, an identity colour that is never an accent. Do not redraw or recolour it, and use
the `mark` variant at small sizes.

### Where the truth is

Read `styles.css` and its imports for the full token and utility set, and each component's
`<Name>.prompt.md` and `<Name>.d.ts` for its real props before using it. Those files are
generated from the shipped source, so they are always ahead of this summary.
