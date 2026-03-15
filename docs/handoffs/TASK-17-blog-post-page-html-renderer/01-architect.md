# Task Handoff Report

**Title:** Create BlogPost page with enhanced MarkdownRenderer
**Task ID:** TASK-17-blog-post-page-html-renderer
**Backlog ID:** BLOG-004
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/blogspec.md` (section 10.2)
- `src/components/md/MarkdownRenderer.tsx` (existing renderer — not modified)
- `src/generated/content-manifest.ts`
- `src/lib/content/schema.ts`
- `scripts/content-build.ts`

---

## Summary

Create a BlogPost page component that renders pre-built HTML from the content manifest. The page looks up a post by slug (from URL params), displays metadata (title, date, author, tags), and renders sanitized HTML. Add `rehype-slug` to the build pipeline for heading anchor IDs. The existing MarkdownRenderer is for runtime markdown and stays untouched.

---

## Decisions

- **Render strategy:** Pre-built HTML via `dangerouslySetInnerHTML` — safe because the build pipeline sanitizes with rehype-sanitize.
- **Heading anchors:** Add `rehype-slug` to `scripts/content-build.ts` so headings get `id` attributes for linking.
- **404 handling:** Show "Post not found" with a link back to /blog when slug doesn't match.
- **Prose styling:** Reuse Tailwind prose classes matching existing MarkdownRenderer styling.
- **Existing MarkdownRenderer:** NOT modified — it serves runtime markdown (About page).

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `src/pages/BlogPost.tsx` | Create — blog post page component |
| `scripts/content-build.ts` | Modify — add rehype-slug for heading anchors |

---

## API Contract

n/a

---

## Test Plan / Tests Added

Frontend build smoke only (`bun run lint && bun run build`). Manual verification with `bun run content:build` to confirm heading IDs are generated.

---

## Quality Gate Plan

Frontend only: `bun run lint && bun run build`

---

## Risks / Open Questions

None.

---

## Next Handoff

**To:** Implementer
**Action:** Install rehype-slug, update build script, create BlogPost page, run quality gates.
