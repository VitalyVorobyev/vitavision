---
category: Primitives
---
Label-over-value readout for numeric telemetry — mono value, uppercase mono label, tinted by `tone`.

`tone` is the variant axis: `neutral` (default) uses plain foreground; `good` / `warn` / `bad` tint the border, background, and value emerald / amber / rose. Lay several out in a grid to form a stat row.

```jsx
<div className="grid grid-cols-3 gap-2">
  <MetricCell label="RMS" value="0.184 px" tone="good" />
  <MetricCell label="Views" value="12" />
  <MetricCell label="Outliers" value="7" tone="warn" />
</div>
```
