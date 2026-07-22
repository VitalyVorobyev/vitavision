---
category: UI
---
Class-based React error boundary. Wrap any subtree that can throw during render — canvas surfaces and algorithm result views in particular — so a failure degrades to a contained fallback instead of blanking the page.

```jsx
<ErrorBoundary>
  <TargetPreview {...config} />
</ErrorBoundary>
```
