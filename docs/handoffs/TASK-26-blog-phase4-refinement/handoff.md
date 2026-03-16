# TASK-26: Blog Phase 4 — Refinement
Backlog: BLOG-015, BLOG-016, BLOG-017, BLOG-018 | Date: 2026-03-16

## Plan

### Summary
Complete Blog Phase 4 (Refinement): add AlgorithmIndex and AlgorithmPost pages with `/algorithms` routes and Navbar link (BLOG-015), add cross-linking between blog posts and algorithm pages via frontmatter fields (BLOG-016), prerender algorithm pages during postbuild with sitemap inclusion (BLOG-017), and wire `blogSlug` on AlgorithmDefinition with "Learn more" links in ConfigurePanel (BLOG-018).

### Affected Files
- `src/pages/AlgorithmIndex.tsx` — new: algorithm listing page with tag filtering
- `src/pages/AlgorithmPost.tsx` — new: individual algorithm page with Mermaid support and related posts
- `src/components/blog/RelatedPosts.tsx` — new: reusable cross-linking component
- `src/lib/content/schema.ts` — modified: add relatedAlgorithms to blog schema
- `src/App.tsx` — modified: add /algorithms routes
- `src/entry-server.tsx` — modified: add algorithm routes for SSR
- `src/components/layout/Navbar.tsx` — modified: add Algorithms link
- `src/pages/BlogPost.tsx` — modified: add RelatedPosts for algorithms
- `scripts/postbuild.ts` — modified: prerender algorithm pages, add to sitemap
- `src/components/editor/algorithms/types.ts` — modified: add blogSlug field
- `src/components/editor/panels/ConfigurePanel.tsx` — modified: render "Learn more" link

## Implementation
- **Files changed:** AlgorithmIndex.tsx, AlgorithmPost.tsx, RelatedPosts.tsx, schema.ts, App.tsx, entry-server.tsx, Navbar.tsx, BlogPost.tsx, postbuild.ts, types.ts, ConfigurePanel.tsx, CHANGELOG.md
- **Deviations:** None
- **Gate results:**

| Gate | Result |
|------|--------|
| bun run content:validate | pass |
| bun run lint | pass |
| bun run build | pass |

## Review
- **Verdict:** approved
- **Issues found & fixed:** None
- **Residual risks:** None
