# Task Handoff Report

**Title:** Build content processing pipeline
**Task ID:** TASK-15-content-processing-pipeline
**Backlog ID:** BLOG-002
**Role:** Architect
**Date:** 2026-03-15
**Status:** ready_for_implementer

---

## Inputs Consulted

- `docs/backlog.md`
- `CLAUDE.md`
- `docs/blogspec.md`
- `docs/handoffs.md`
- `src/lib/content/schema.ts` (Zod schemas from BLOG-001)
- `package.json` (current dependencies)
- `tsconfig.node.json` (script compilation context)
- `vite.config.ts`
- `.gitignore`

---

## Summary

Build a TypeScript build script (`scripts/content-build.ts`) that reads markdown content from `content/blog/` and `content/algorithms/`, parses frontmatter with gray-matter, validates against Zod schemas, renders markdown to sanitized HTML via the unified pipeline, and generates a typed manifest file (`src/generated/content-manifest.ts`). Add a `content:build` script to package.json. This unblocks BLOG-003 (BlogIndex), BLOG-004 (BlogPost), and all downstream blog tasks.

---

## Decisions

- **Runtime:** bun (native TS execution, no compilation step needed for build script)
- **Frontmatter parser:** gray-matter (industry standard, good TS support)
- **Markdown pipeline:** unified + remark-parse + remark-gfm + remark-rehype + rehype-sanitize + rehype-stringify
- **Slug derivation:** Blog: strip `YYYY-MM-DD-` prefix and `.md` extension from filename. Algorithms: strip `.md` extension from filename.
- **Date serialization:** Dates stored as ISO strings in the manifest (not Date objects) to avoid serialization issues. Manifest entry types defined in `src/lib/content/schema.ts` with string dates.
- **Generated file:** `src/generated/content-manifest.ts` — committed to git (not gitignored) since content changes are intentional and the manifest is a build artifact that should be versioned.
- **Blog sort order:** Sorted by date descending in the generated manifest.
- **Draft handling:** Draft posts (draft: true) are excluded from the manifest in production builds, included in dev. For now, always include since BLOG-011 handles draft filtering specifically.

---

## Files / Modules Affected

| File | Change |
|------|--------|
| `scripts/content-build.ts` | Create — content processing pipeline script |
| `src/lib/content/schema.ts` | Modify — add BlogEntry and AlgorithmEntry manifest types |
| `src/generated/content-manifest.ts` | Create (generated) — typed content manifest |
| `package.json` | Modify — add `content:build` script and devDependencies |

---

## API Contract

n/a

---

## Test Plan / Tests Added

| Test name | File | What it checks |
|-----------|------|----------------|
| n/a | n/a | No backend tests. Validated by: (1) running `bun run content:build` successfully with empty content dirs, (2) `bun run build` compiles the generated manifest, (3) `bun run lint` passes. |

---

## Implementation Steps

### Phase 1: Install dependencies
- `bun add -d gray-matter unified remark-parse remark-gfm remark-rehype rehype-sanitize rehype-stringify`

### Phase 2: Add manifest types to schema.ts
- Add `BlogEntry` and `AlgorithmEntry` interfaces with string dates
- Export them alongside existing schemas

### Phase 3: Create the build script
- `scripts/content-build.ts` with functions:
  - `slugFromFilename(filename, type)` — derives slug from filename
  - `renderMarkdown(content)` — unified pipeline, returns HTML string
  - `processDirectory(dir, schema, type)` — reads .md files, parses, validates, renders
  - `generateManifest(blogPosts, algorithmPages)` — writes the TS file
  - `main()` — orchestrates, logs results

### Phase 4: Add npm script
- `"content:build": "bun run scripts/content-build.ts"` in package.json

### Phase 5: Generate initial manifest
- Run `bun run content:build` to generate empty manifest
- Verify with `bun run lint && bun run build`

---

## Invariants Checklist

- CV logic only in `backend/routers/cv.py` — NOT TOUCHED
- Storage logic only in `backend/services/storage_service.py` — NOT TOUCHED
- Frontend API calls only in `src/lib/api.ts` — NOT TOUCHED
- Algorithm adapters — NOT TOUCHED
- `bun` (not npm) — YES
- All `HTTPException` raises include `from exc` — NOT TOUCHED
- Algorithm features carry `readonly: true`, `algorithmId`, `runId` — NOT TOUCHED
- Storage keys match `uploads/<sha256-64-hex>` — NOT TOUCHED

---

## Docs to Update

- `CHANGELOG.md` — add entry for BLOG-002

---

## Quality Gate Plan

Frontend only: `bun run lint && bun run build`

---

## Risks / Open Questions

- [RESOLVED] Bun can run TS scripts natively — confirmed, no transpilation needed
- [RESOLVED] gray-matter works with bun — widely used, pure JS, no native deps

---

## Next Handoff

**To:** Implementer
**Action:** Install deps, create script, add manifest types, generate initial manifest, run quality gates.
