# TASK-23: Generate RSS and Atom feeds
Backlog: BLOG-010 | Date: 2026-03-16

## Plan

**Summary:** Install the `feed` package and generate RSS (`rss.xml`) and Atom (`atom.xml`) feeds during postbuild from the blog post manifest. Add feed autodiscovery `<link>` tags to `index.html`.

**Affected Files:**
- `package.json` — add `feed` dependency
- `scripts/postbuild.ts` — add feed generation after sitemap
- `index.html` — add `<link rel="alternate">` for RSS/Atom autodiscovery

**Implementation Steps:**
1. `bun add feed`
2. In `postbuild.ts`: import `Feed` from `feed`, build feed with site metadata, add items from `blogPosts`, write `dist/rss.xml` and `dist/atom.xml`
3. In `index.html`: add RSS and Atom autodiscovery links in `<head>`

## Implementation
- **Files changed:** `scripts/postbuild.ts`, `index.html`, `package.json`, `bun.lock`, `CHANGELOG.md`
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
