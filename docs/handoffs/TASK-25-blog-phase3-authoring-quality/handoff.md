# TASK-25: Blog Phase 3 — Authoring Quality
Backlog: BLOG-012, BLOG-013, BLOG-014 | Date: 2026-03-16

## Plan

### Summary
Add three authoring-quality features to the blog system: (1) client-side Mermaid diagram rendering for fenced mermaid code blocks, (2) a content image pipeline that copies `content/images/` to dist and resolves relative image paths in markdown, and (3) a content validation script + CI job that checks Zod frontmatter, image references, and internal blog links.

### Affected Files
- `src/hooks/useMermaid.ts` — new: hook that renders mermaid code blocks as SVG after mount
- `src/pages/BlogPost.tsx` — modified: wire useMermaid hook with article ref
- `scripts/content-build.ts` — modified: add relative image path resolution
- `scripts/postbuild.ts` — modified: copy content/images/ to dist
- `scripts/content-validate.ts` — new: Zod validation, image ref check, internal link check
- `package.json` — modified: add content:validate script, mermaid dependency
- `.github/workflows/ci.yml` — modified: add validate-content CI job
- `CHANGELOG.md` — modified: add entries for BLOG-012, BLOG-013, BLOG-014

## Implementation
- **Files changed:** src/hooks/useMermaid.ts, src/pages/BlogPost.tsx, scripts/content-build.ts, scripts/postbuild.ts, scripts/content-validate.ts, package.json, .github/workflows/ci.yml, CHANGELOG.md
- **Deviations:** None
- **Gate results:**

| Gate | Result |
|------|--------|
| bun run content:validate | pass (0 files, 0 errors) |
| bun run lint | pass |
| bun run build | pass |

## Review
- **Verdict:** approved
- **Issues found & fixed:** Hooks called after early return (rules-of-hooks violation) — moved useRef and useMermaid before the early return guard
- **Residual risks:** None
