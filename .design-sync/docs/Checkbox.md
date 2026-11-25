---
category: UI
---
A statement about a state you are about to commit ("keep this channel", "show the scale line"); a setting that changes behaviour from now on is a `Switch` in ui instead. Controlled: `checked` (`true`, `false`, or `"indeterminate"` for a partial selection over a set) and `onCheckedChange(boolean)`. With a `label` (and optional `description`) it renders its own row; without one it is a bare box and needs an `aria-label`, e.g. in a table cell.

```jsx
<Checkbox
  checked={cutMarks}
  onCheckedChange={setCutMarks}
  label="Include cut marks"
  description="Adds registration ticks at the corners of the printed area."
/>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
