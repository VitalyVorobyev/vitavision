---
category: UI
---
The action control. `variant` is what the action *is*: `primary` for the one thing a screen is for (solid `signal`), `secondary` (the default; a `line-strong` ring on `surface`) for the rest, `ghost` for toolbar actions, `danger` for something destructive (a soft `defect` tint, not a solid red block). `size` is `md` or `sm` and defaults to the density in force. `loading` swaps the icon for a spinner and blocks the click; `icon` is a decorative leading icon; `asChild` renders the look onto a single child such as a router `<Link>`.

Use `Button` for every interactive action, never a hand-styled `<button>`. One `primary` per screen.

```jsx
<div className="flex gap-2">
  <Button variant="ghost">Cancel</Button>
  <Button variant="primary" loading={running}>Run detector</Button>
</div>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
