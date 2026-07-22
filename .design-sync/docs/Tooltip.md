---
category: UI
---
Radix-backed tooltip. Wraps its `children` as the trigger and shows `content` on hover or focus.

`side` picks the edge (`top` default) and `delayDuration` tunes the open delay in ms. Content is a plain string — for rich markup, compose Radix directly.

```jsx
<Tooltip content="Reset the view" side="bottom">
  <button className="rounded-md border border-border p-2">Reset</button>
</Tooltip>
```
