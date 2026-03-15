# Task Handoff Report

**Title:** Build prerender postbuild script + SSR entry point
**Task ID:** TASK-19-prerender-postbuild-ssr
**Backlog ID:** BLOG-006
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`, `CLAUDE.md`, `docs/blogspec.md`
- `src/App.tsx`, `index.html`, `src/main.tsx`
- `src/components/layout/Navbar.tsx`, `src/components/layout/Footer.tsx`
- `src/generated/content-manifest.ts`

---

## Summary

Create SSR entry point and postbuild prerendering script to generate static HTML for blog routes. This gives search engines fully rendered HTML pages instead of an empty SPA shell, satisfying the static-first architecture requirement from blogspec.md.

---

## Decisions

- Use `MemoryRouter` instead of `StaticRouter` (removed in react-router v7)
- SSR entry renders only blog routes (not editor/home) to avoid heavy dependencies
- Wrap with `ThemeProvider` (defaultTheme="dark", enableSystem=false) for SSR compatibility
- Postbuild reads `dist/index.html` as template, injects SSR HTML into `<div id="root">`
- Generated pages: `dist/blog/index.html` + `dist/blog/:slug/index.html` per post

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/entry-server.tsx` | Create — SSR render function using MemoryRouter + renderToString |
| `scripts/postbuild.ts` | Create — reads template, generates static HTML for blog routes |
| `package.json` | Modify — add `postbuild` script |

---

## API Contract

n/a

---

## Next Handoff

**To:** Implementer
