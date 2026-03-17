# TASK-24: Draft post support
Backlog: BLOG-011 | Date: 2026-03-16

## Plan

**Summary:** Add draft post filtering to the content build pipeline. Posts with `draft: true` in frontmatter are excluded from the production manifest by default, but included when `INCLUDE_DRAFTS=true` is set (for dev/preview). Draft posts show a "DRAFT" badge in the BlogIndex and BlogPost pages.

**Affected Files:**
- `scripts/content-build.ts` — filter drafts unless `INCLUDE_DRAFTS=true`
- `src/components/blog/PostCard.tsx` — show "DRAFT" badge
- `src/pages/BlogPost.tsx` — show "DRAFT" badge in header

**Implementation Steps:**
1. In `content-build.ts`: after processing blog posts, filter out entries with `draft: true` unless `process.env.INCLUDE_DRAFTS === "true"`
2. In `PostCard.tsx`: conditionally render a "DRAFT" badge next to the title
3. In `BlogPost.tsx`: conditionally render a "DRAFT" badge in the header

## Implementation
- **Files changed:** `scripts/content-build.ts`, `src/components/blog/PostCard.tsx`, `src/pages/BlogPost.tsx`, `CHANGELOG.md`
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
