---
category: UI
---
A modal: `title` (required, names the dialog), an optional `description` (what the reader needs before answering — not decoration), a body as `children`, and a right-aligned `footer` of actions. Controlled: the caller owns `open` and gets `onOpenChange(false)` on Escape, an overlay click, or a `DialogClose`. The panel is an `overlay` surface, portalled to `<body>` with a dimmed backdrop; the body scrolls under a height cap so the footer stays on screen.

Put the safe action first and the committing one last (`Cancel`, then a `primary` or `danger` `Button`). For the destructive-confirmation arrangement there is also `ConfirmDialog` in ui.

```jsx
<Dialog
  open={open}
  onOpenChange={setOpen}
  title="Discard the current run?"
  description="The 42 detected corners are removed from the image."
  footer={
    <>
      <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      <Button variant="danger" onClick={discard}>Discard</Button>
    </>
  }
/>
```

Comes from `@vitavision/ui` (the lab-ui monorepo); its Storybook holds the full spec — every prop, state and accessibility note.
