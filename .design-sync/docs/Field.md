---
category: UI
---
A labelled control: `label`, the control as `children`, and optionally a `description` (always visible, read with the control), an `error` (verdict red, announced as an alert, sets `aria-invalid`), `required`, and a compact `annotation` — a range, a unit, or an `InfoHint`. The description and error are wired to the control through `aria-describedby` for ui's own controls (`Input`, `NumberInput`, `Select`, `SegmentedControl`, `Checkbox`, …).

The default `as="label"` wraps the control in a `<label>`. For a control a label cannot name (a `SegmentedControl`, a set of radios) or one that has an `InfoHint` (a button must not sit inside a `<label>`), use `as="group"` and give the control an `aria-label`.

```jsx
<Field label="Square size" description="Edge length of one printed square." error={tooBig && "Does not fit the sheet."}>
  <NumberInput value={size} onChange={onSize} unit="mm" min={1} />
</Field>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
