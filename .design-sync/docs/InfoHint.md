---
category: UI
---
The standard `?` help mark: a small button that shows its children in a tooltip on hover or focus. Use it beside a label for context that helps but is not needed to operate the control; anything the reader must have belongs in the field's `description`. `label` is the button's accessible name (default "More information"); `icon` can be lucide's `Info` when the hint gives facts about the thing on screen rather than help with a control.

Needs the `TooltipProvider` that `DesignPreviewProvider` mounts. Inside a `Field`, place it in `annotation` and make the field `as="group"`.

```jsx
<Field label="Seam row" as="group" annotation={<InfoHint label="About seam row">Master-pattern row the strip is cut from.</InfoHint>}>
  <Select aria-label="Seam row" value={row} onValueChange={setRow} options={rows} />
</Field>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
