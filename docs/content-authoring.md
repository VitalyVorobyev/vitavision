# Content Authoring Guide

How to add new blog posts, algorithm pages, and CV algorithm plugins to Vitavision.

## Blog Posts

### 1. Create a markdown file

Add a `.md` file in `content/blog/`. The filename becomes the slug after stripping an optional date prefix:

```
content/blog/02-my-topic.md      →  slug: "02-my-topic"
content/blog/2026-03-16-foo.md   →  slug: "foo"
```

### 2. Add frontmatter

Every blog post **must** have this YAML frontmatter at the top:

```yaml
---
title: "My Post Title"
date: 2026-03-16
summary: "One-sentence summary shown in the blog list."
tags: ["calibration", "geometry"]
author: "Vitaly Vorobyev"
# Optional fields:
draft: true              # hidden unless INCLUDE_DRAFTS=true
updated: 2026-03-20
coverImage: "/content/images/my-cover.jpg"
repoLinks: ["https://github.com/user/repo"]
demoLinks: ["https://vitavision.app/editor"]
relatedAlgorithms: ["chess-corners"]
---
```

Required: `title`, `date`, `summary`, `tags` (≥1), `author`.

### 3. Write content

Standard markdown + GFM (tables, strikethrough, task lists). Headings get auto-generated `id` attributes for anchor links.

Both blog posts and algorithm pages share the same rich body renderer:
- KaTeX math via `$...$` and `$$...$$`
- Mermaid code fences
- syntax-highlighted code blocks
- semantic directive blocks such as `:::note`, `:::warning`, `:::definition`, and `:::algorithm`
- interactive illustration mounts via `:::illustration[...]`

**Images**: place files in `content/images/` and reference them as `./images/foo.png` — the build script rewrites paths to `/content/images/foo.png`.

### Equation Numbering and References

Display equations can carry LaTeX-style labels and be referenced later in prose:

```md
Equation \eqref{eq:dlt} is the homogeneous system solved by SVD.

$$
A \mathbf{h} = 0
\label{eq:dlt}
$$

The null-space solution of \ref{eq:dlt} defines the homography parameters.
```

Supported commands:
- `\label{eq:name}` inside a display-math block
- `\eqref{eq:name}` for a linked reference like `(1)`
- `\ref{eq:name}` for a linked reference like `1`

Only labeled display equations are numbered. Unlabeled `$$...$$` blocks render normally without equation numbers.

### Interactive illustrations

For article pages that need a client-side React figure without switching the whole content system to MDX, use the illustration directive:

```md
:::illustration[chess-response]{preset="article" pattern="corner" rotation="22.5"}
:::
```

Current supported value:
- `chess-response` — the interactive ChESS SR/DR/MR explainer

Supported attributes:
- `preset="article|compact"`
- `pattern="corner|edge|stripe"`
- `rotation="<degrees>"`
- `controls="true|false"`
- `animate="true|false"`

These directives render as safe HTML placeholders during `bun run content:build` and hydrate client-side on `/blog/:slug` and `/algorithms/:slug`.

### 4. Build the manifest

```bash
bun run content:build
```

This generates `src/generated/content-index.ts` plus per-slug HTML modules in `src/generated/content/`. The dev server picks them up automatically.

To include draft posts during development:

```bash
INCLUDE_DRAFTS=true bun run content:build
```

### 5. Preview

Run `bun run dev` and visit `/blog/<slug>`.

---

## Algorithm Pages

Algorithm pages live in `content/algorithms/` and follow the same workflow as blog posts.

### Frontmatter schema

```yaml
---
title: "Algorithm Name"
date: 2026-03-16
summary: "Brief description."
tags: ["detection", "subpixel"]
author: "Vitaly Vorobyev"
# Optional fields:
draft: true
updated: 2026-03-20
coverImage: "/content/images/my-cover.jpg"
repoLinks: ["https://github.com/user/repo"]
demoLinks: ["https://vitavision.dev/editor"]
relatedPosts: ["02-my-topic"]
relatedAlgorithms: ["another-algorithm"]
---
```

Required: `title`, `date`, `summary`, `tags` (≥1), `author`.

Legacy compatibility: `demoLink: "https://..."` is still accepted during migration, but new pages should use `demoLinks`.

Slug is the filename without `.md` extension (no date stripping).

Build with the same `bun run content:build` command. Preview at `/algorithms/<slug>`.

---

## CV Algorithm Plugins (Editor)

To add a new algorithm to the interactive editor:

### 1. Add the backend endpoint

Create or extend a router in `backend/routers/`. The endpoint receives an image storage key and config, runs OpenCV/numpy logic, and returns JSON results.

Example pattern (in `backend/routers/cv.py`):

```python
@router.post("/api/v1/cv/my-algorithm")
async def my_algorithm(body: MyAlgorithmRequest, _=Depends(verify_api_key)):
    # load image, run detection, return results
    ...
```

### 2. Add the API client function

In `src/lib/api.ts`, add a typed function that calls your endpoint:

```typescript
export interface MyAlgorithmResult {
    // match your backend response shape
    detections: { x: number; y: number; label: string }[];
    summary: { count: number; runtime_ms: number };
}

export async function detectMyAlgorithm(params: {
    key: string;
    storageMode: StorageMode;
    config: { threshold: number };
}): Promise<MyAlgorithmResult> {
    return apiFetch("/api/v1/cv/my-algorithm", {
        method: "POST",
        body: JSON.stringify({ ...params }),
    });
}
```

### 3. Create the adapter

Create a directory `src/components/editor/algorithms/myAlgorithm/` with:

**`adapter.ts`** — implements `AlgorithmDefinition`:

```typescript
import type { AlgorithmDefinition, AlgorithmSummaryEntry } from "../types";
import type { Feature } from "../../../../store/editor/useEditorStore";
import { detectMyAlgorithm, type MyAlgorithmResult } from "../../../../lib/api";
import MyAlgorithmConfigForm, { type MyAlgorithmConfig } from "./ConfigForm";

const initialConfig: MyAlgorithmConfig = { threshold: 0.5 };

export const myAlgorithm: AlgorithmDefinition = {
    id: "my-algorithm",
    title: "My Algorithm",
    description: "Detects things in images.",
    blogSlug: "02-my-topic",          // optional: links to blog post
    initialConfig,
    ConfigComponent: MyAlgorithmConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async ({ key, storageMode, config }) => {
        const typed = config as MyAlgorithmConfig;
        return detectMyAlgorithm({ key, storageMode, config: typed });
    },
    toFeatures: (result, runId) => {
        const r = result as MyAlgorithmResult;
        return r.detections.map((d) => ({
            id: crypto.randomUUID(),
            type: "point",
            source: "algorithm",
            algorithmId: "my-algorithm",
            runId,
            readonly: true,
            x: d.x,
            y: d.y,
            label: d.label,
        })) as Feature[];
    },
    summary: (result) => {
        const r = result as MyAlgorithmResult;
        return [
            { label: "Count", value: `${r.summary.count}` },
            { label: "Runtime", value: `${r.summary.runtime_ms.toFixed(2)} ms` },
        ];
    },
};
```

**`ConfigForm.tsx`** — a React form for user-tunable parameters.

### 4. Register the algorithm

In `src/components/editor/algorithms/registry.ts`:

```typescript
import { myAlgorithm } from "./myAlgorithm/adapter";

export const ALGORITHM_REGISTRY: AlgorithmDefinition[] = [
    chessCornersAlgorithm,
    chessboardAlgorithm,
    charucoAlgorithm,
    markerboardAlgorithm,
    myAlgorithm,  // ← add here
];
```

That's it — the editor will automatically show it in the algorithm picker, render the config form, and display results on the canvas.

---

## Quick Reference

| Task | Command |
|---|---|
| Build content manifest | `bun run content:build` |
| Dev server | `bun run dev` |
| Lint frontend | `bun run lint` |
| Backend tests | `cd backend && pytest tests/ -v` |
| Backend quality | `ruff check . && ruff format --check . && mypy . --ignore-missing-imports` |
