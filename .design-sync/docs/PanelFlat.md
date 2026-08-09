---
category: Primitives
---
Solid surface card — same family as `Panel` but with a flat `bg-surface` fill and a tighter `1rem` radius. Reach for it when panels nest, so the inner one doesn't repeat the outer gradient.

Polymorphic via `as`; forwards native HTML attributes.

```jsx
<PanelFlat as="section" className="p-3">
  <TinyBrow>Parameters</TinyBrow>
</PanelFlat>
```
