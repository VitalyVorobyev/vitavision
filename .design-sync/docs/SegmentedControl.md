---
category: UI
---
A choice among two or three, shown all at once as a strip of segments (native radios in one group, so arrow keys move between them). Use it for a closed set the app can enumerate — orientation, paper size, an axis — where a `Select` would hide the options.

**`""` means unset.** The highlighted segment is always the *effective* value: `value`, or `defaultValue` while `value` is `""`; choosing the segment that matches `defaultValue` reports `""` again. Label the group with `aria-label`, or wrap it in `<Field as="group">`.

```jsx
<SegmentedControl
  aria-label="Orientation"
  value={orientation}
  onValueChange={setOrientation}
  options={[
    { value: "portrait", label: "Portrait" },
    { value: "landscape", label: "Landscape" },
  ]}
/>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
