## Building with Vitavision

Vitavision is the design system behind a computer-vision **Atlas** (algorithm, model, and
concept reference pages), a technical blog, an image-annotation editor, and a calibration-target
generator. The visual language is "The Technical Journal": a light, paper-like reading surface
with blueprint-blue accents, deliberately tight corner radii, and mono type wherever a number
or an identifier appears. It should read as *engineered*, not decorative.

### Wrap everything in `DesignPreviewProvider`

```jsx
<DesignPreviewProvider>
  <YourScreen />
</DesignPreviewProvider>
```

It supplies three contexts the components read. Skip it and the failure is silent — a blank
screen with no error in the console:

- **Router** — anything rendering a link (`Footer`, `SourceCard`, `AlgorithmsSidebar`, `TagFilter`).
- **Tooltip provider** — `Tooltip` throws during render without it.
- **Papers index** — `SourceCard` / `SourceStrip` look a paper up by ID and render `null` when
  the lookup misses. Pass a real ID from the index, e.g. `primary="zhang2000-flexible"`,
  `"harris1988-corner"`, `"rosten2006-fast"`, `"detone2018-superpoint"`.

### Styling: Tailwind utilities over semantic tokens

Never hard-code a colour. Every colour is an HSL custom property with a matching utility, and
each has a dark-mode value that swaps automatically under a `.dark` ancestor — so using the
token names is what makes a design work in both themes.

| Purpose | Utilities |
|---|---|
| Surfaces | `bg-background` (page), `bg-surface` (raised card), `bg-bg-soft`, `bg-muted` |
| Text | `text-foreground`, `text-muted-foreground` (secondary), `text-primary`, `text-accent` |
| Hairlines | `border-border` (default), `border-border-strong` (kbd, inputs) |
| Accent / brand | `bg-primary` + `text-primary-foreground`, `bg-accent`, `bg-accent-soft`, `text-brand` (cyan — the logo pupil; use sparingly) |
| Danger | `text-destructive`, `bg-destructive` |
| Type | `font-sans` (Inter, UI), `font-serif` (Source Serif 4, article body + headings), `font-mono` (Geist Mono, all numbers/IDs/keys) |
| Radius | `rounded-sm` / `rounded-md` / `rounded-lg` — all tight (2–6px). Do not reach for `rounded-xl`+; soft corners break the engineered feel. |

Two caveats worth knowing:

1. **The stylesheet is compiled from what the app already uses.** A utility no vitavision
   component ever used may have no rule — `bg-surface-hi` is a real token with no class, for
   instance. Prefer the names in the table; if you need something outside it, set the value with
   an inline `style` rather than trusting an arbitrary class to resolve.
2. **Uppercase mono micro-labels are the house signature.** Section kickers use `Eyebrow`
   (11px) or `TinyBrow` (10px) — mono, uppercase, wide tracking, muted. Use them instead of
   inventing small-caps headings.

### Compose from the primitives

`Panel` (gradient card) and `PanelFlat` (solid, for nesting) are the containers; `FloatingPanel`
is overlay chrome for anything sitting above a canvas. `MetricCell` is the numeric readout, with
a `tone` of `neutral` / `good` / `warn` / `bad`. `Pill`, `Kbd`, and `Note` cover tags, key hints,
and asides. Atlas surfaces get `EntryIcon`, `QualityBadge`, `SourceCard`, and `SourceStrip`.

```jsx
<Panel className="p-5">
  <Eyebrow>Calibration run</Eyebrow>
  <h3 className="mt-1 font-serif text-lg text-foreground">Zhang planar, 14 views</h3>
  <div className="mt-4 grid grid-cols-3 gap-2">
    <MetricCell label="RMS reproj" value="0.184 px" tone="good" />
    <MetricCell label="Views" value="14" />
    <MetricCell label="Outliers" value="7" tone="warn" />
  </div>
  <Note className="mt-4">Assumes the target is planar to within 0.1 mm.</Note>
</Panel>
```

### Where the truth is

Read `styles.css` and its imports for the full token and utility set, and each component's
`<Name>.prompt.md` and `<Name>.d.ts` for its real props before using it. Those files are
generated from the shipped source, so they are always ahead of this summary.
