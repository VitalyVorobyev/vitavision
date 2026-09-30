---
category: UI
---
@vitavision/ui's tooltip. Wraps one focusable child as the trigger and shows `content` on hover or focus, on an `overlay` surface with an arrow.

Use it for text that helps but is not needed to operate the control; anything the reader must have belongs in the field's description. There is no `side` or delay prop: Radix places it (top first, flipping on collision) and the 200 ms delay comes from the `TooltipProvider` that `DesignPreviewProvider` mounts. For the standard `?` affordance next to a label, use ui's `InfoHint` instead.

```jsx
<Tooltip content="Reset the view">
  <button className="rounded-control border border-line p-2">Reset</button>
</Tooltip>
```
