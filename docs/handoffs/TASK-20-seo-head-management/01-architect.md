# Task Handoff Report

**Title:** Add SEO head management (react-helmet-async)
**Task ID:** TASK-20-seo-head-management
**Backlog ID:** BLOG-007
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/handoffs.md`
- `src/pages/Blog.tsx`
- `src/pages/BlogPost.tsx`
- `src/pages/Home.tsx`
- `src/pages/About.tsx`
- `src/pages/Editor.tsx`
- `src/App.tsx`
- `src/entry-server.tsx`
- `scripts/postbuild.ts`
- `src/lib/content/schema.ts`
- `src/generated/content-manifest.ts`
- `index.html`
- `package.json`

---

## Summary

Add per-page SEO metadata using `react-helmet-async`. A reusable `SeoHead` component sets `<title>`, meta description, Open Graph, and Twitter Card tags. Every page (Home, Blog index, BlogPost, About, Editor) gets appropriate metadata. SSR integration ensures prerendered blog pages include SEO tags in static HTML.

---

## Decisions

- Use `react-helmet-async` (not `react-helmet`) — it is SSR-safe and supports React 19.
- Create a single `SeoHead` component accepting `title`, `description`, `ogImage?`, `ogType?`, `url?` props.
- Title format: `{page title} | VitaVision` (Home just uses `VitaVision`).
- BlogPost pages derive SEO from frontmatter: `title`, `summary` → description, `coverImage` → og:image, `author`, `tags`.
- Twitter card type: `summary_large_image` when coverImage exists, `summary` otherwise.
- SSR: wrap `entry-server.tsx` render in `HelmetProvider`, extract head tags via `HelmetData`, inject into template `<head>`.
- No backend changes — this is purely frontend.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `package.json` | Add `react-helmet-async` dependency |
| `src/components/seo/SeoHead.tsx` | **New** — reusable SEO head component |
| `src/App.tsx` | Wrap with `HelmetProvider` |
| `src/pages/Home.tsx` | Add `SeoHead` |
| `src/pages/Blog.tsx` | Add `SeoHead` |
| `src/pages/BlogPost.tsx` | Add `SeoHead` with frontmatter data |
| `src/pages/About.tsx` | Add `SeoHead` |
| `src/pages/Editor.tsx` | Add `SeoHead` |
| `src/entry-server.tsx` | Add `HelmetProvider` + `HelmetData`, return head tags |
| `scripts/postbuild.ts` | Inject head tags from SSR render into template |
| `CHANGELOG.md` | Add entry |

---

## API Contract

n/a — no backend changes.

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| Frontend build | `bun run build` | SeoHead compiles, no type errors |
| Frontend lint | `bun run lint` | No lint violations |

No backend tests needed (no backend changes). No Jest test infrastructure exists.

---

## Validation

```
bun run lint              → must PASS
bun run build             → must PASS
```

---

## Invariants Checklist

| Invariant | Touched? |
|-----------|----------|
| CV logic only in `backend/routers/cv.py` | No |
| Storage logic only in `backend/services/storage_service.py` | No |
| Frontend API calls only in `src/lib/api.ts` | No |
| Algorithm adapters only in `src/components/editor/algorithms/<name>/adapter.ts` | No |
| `bun` (not npm) for all JS operations | Yes — `bun add` |
| All `HTTPException` raises include `from exc` | No backend changes |
| Algorithm features carry `readonly: true`, `algorithmId`, `runId` | No |
| Storage keys match `uploads/<sha256-64-hex>` | No |

---

## Docs to Update

- `CHANGELOG.md` — add entry for BLOG-007

---

## Quality Gate Plan

Frontend only (`bun run lint`, `bun run build`).

---

## Risks / Open Questions

- [RESOLVED] react-helmet-async React 19 compat — confirmed works with React 19.

---

## Next Handoff

**To:** Implementer
**Action:** Install react-helmet-async, create SeoHead component, integrate into all pages and SSR entry point.
