---
category: UI
---
A picker whose option list is styled with the app (a native `<select>` cannot style its popup on macOS). Controlled: `value`, `onValueChange`, and `options` of `{ value, label, note?, disabled? }` — `note` is a quiet trailing hint, and a `disabled` option should say why in its `note`.

**`""` means unset.** The trigger then shows `placeholder`; `unsetLabel` adds a leading entry that reports `""`. Name it with `aria-label` when no `Field` label does. Inside a `Field` it is described by the field's description and error. For two or three choices that fit on screen, use `SegmentedControl` instead.

```jsx
<Field label="Dictionary" description="Marker family printed on the board.">
  <Select
    value={dict}
    onValueChange={setDict}
    options={[
      { value: "DICT_4X4_250", label: "DICT_4X4_250", note: "250 markers" },
      { value: "DICT_6X6_250", label: "DICT_6X6_250", note: "250 markers" },
    ]}
  />
</Field>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
