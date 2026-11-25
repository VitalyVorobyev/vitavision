---
category: UI
---
A boxed message with a tone icon, an optional `title` and optional `actions`. `tone` is `info` (a fact; the default), `warning` (a caveat), `error` (a failure; announced as an alert) or `success`. The message says what happened and what to do about it; put the buttons for doing it in `actions`.

Use it for messages that belong to the screen. For a one-line aside inside an editorial illustration use the illustration `Note`, and for a transient confirmation use `toast()` from `@vitavision/ui`.

```jsx
<Callout tone="warning" title="Low view diversity">
  All 14 views are within 10 degrees of fronto-parallel; the focal length will be poorly constrained.
</Callout>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
