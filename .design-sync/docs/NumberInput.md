---
category: UI
---
A numeric text field in mono with tabular figures, so a column of quantities lines up. Takes every `<input>` prop (`type` is always `number`) plus `min` / `max` and an optional `unit` (`mm`, `°`, `px`) written inside the field after the number — the unit is a description of the field, not part of its value.

Control it with a **string** `value`: that is what the input holds while someone types `1.` or `-`. Convert at the boundary, not in the control. Put it in a `Field` for its label, description and error.

```jsx
<Field label="Marker radius" description="Outer radius of a ring marker.">
  <NumberInput value={radius} onChange={(e) => setRadius(e.target.value)} unit="mm" min={0.1} step={0.1} />
</Field>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
