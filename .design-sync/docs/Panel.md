---
category: Primitives
---
Gradient surface card — the default container for illustration and dashboard chrome. Renders a `1.5rem` radius, a `border-border` hairline, and a vertical `--surface` → `--background` gradient.

Polymorphic via `as` (defaults to `div`); forwards all native HTML attributes. Use `PanelFlat` when you want a solid fill instead of the gradient, and `FloatingPanel` for overlay chrome.

```jsx
<Panel className="p-4">
  <Eyebrow>Detection</Eyebrow>
  <p className="mt-2 text-sm text-muted-foreground">42 corners found</p>
</Panel>
```
