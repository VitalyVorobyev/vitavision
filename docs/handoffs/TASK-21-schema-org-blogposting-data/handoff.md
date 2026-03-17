# TASK-21: Add Schema.org BlogPosting structured data
Backlog: BLOG-008 | Date: 2026-03-16

## Plan

**Summary:** Add JSON-LD `<script type="application/ld+json">` with Schema.org BlogPosting schema to each blog post page. Must appear both client-side (Helmet) and in prerendered HTML (postbuild injection).

**Affected Files:**
- `src/pages/BlogPost.tsx` — add JSON-LD script via Helmet
- `scripts/postbuild.ts` — inject JSON-LD into prerendered blog post pages

**Implementation Steps:**
1. In `BlogPost.tsx`: build a BlogPosting JSON-LD object from frontmatter fields and render it inside `<Helmet>` as a `<script type="application/ld+json">` tag
2. In `postbuild.ts`: add a `buildJsonLd()` function that generates the same BlogPosting JSON-LD string; inject it as a `<script>` tag into the `<head>` of prerendered blog post pages

**Field mapping (frontmatter → Schema.org):**
- `title` → `headline`
- `author` → `author.name` (Person)
- `date` → `datePublished` (ISO 8601)
- `updated` → `dateModified` (ISO 8601, optional)
- `summary` → `description`
- `coverImage` → `image` (optional)
- `tags` → `keywords` (comma-separated string)

## Implementation
- **Files changed:** `src/pages/BlogPost.tsx`, `scripts/postbuild.ts`, `CHANGELOG.md`
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
