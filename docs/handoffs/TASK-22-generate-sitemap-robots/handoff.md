# TASK-22: Generate sitemap.xml and robots.txt
Backlog: BLOG-009 | Date: 2026-03-16

## Plan

**Summary:** Add sitemap.xml generation to the postbuild script and create a static robots.txt. The sitemap lists all public routes (/, /blog, /blog/:slug) with absolute URLs. Base URL comes from `SITE_URL` env var (default: `https://vitavision.dev`).

**Affected Files:**
- `scripts/postbuild.ts` — add sitemap generation after page rendering
- `public/robots.txt` — new static file pointing to sitemap

**Implementation Steps:**
1. Create `public/robots.txt` with `User-agent: *`, `Allow: /`, and `Sitemap:` directive
2. In `postbuild.ts`: after generating all pages, build sitemap XML with all routes and write to `dist/sitemap.xml`
3. Use `SITE_URL` env var (or default) for absolute URL prefix

## Implementation
- **Files changed:** `scripts/postbuild.ts`, `public/robots.txt` (new), `CHANGELOG.md`
- **Deviations:** None
- **Gate results:**

| Gate | Result |
|------|--------|
| bun lint | PASS |
| bun build | PASS |

## Review
- **Verdict:** approved
- **Issues found & fixed:** None
- **Residual risks:** None
