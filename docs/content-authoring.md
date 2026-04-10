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

**Images**: place files in `content/images/` and reference them as `./images/foo.png` — the build script rewrites paths to `/content/images/foo.png`.

### 4. Build the manifest

```bash
bun run content:build
```

This generates `src/generated/content-manifest.ts` with all posts rendered to HTML. The dev server picks it up automatically.

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
summary: "Brief description."
tags: ["detection", "subpixel"]
# Optional:
demoLink: "https://vitavision.app/editor"
repoLinks: ["https://github.com/user/repo"]
relatedPosts: ["02-my-topic"]
---
```

Required: `title`, `summary`, `tags` (≥1).

Slug is the filename without `.md` extension (no date stripping).

Build with the same `bun run content:build` command. Preview at `/algorithms/<slug>`.

---

## CV Algorithm Plugins (Editor)

All algorithms run client-side via WASM in Web Workers. To add a new algorithm:

### 1. Add the WASM handler

In `src/lib/wasm/wasmWorker.ts`, add a handler that loads your WASM module and calls the detection function. Start from WASM module defaults and deep-merge user overrides to avoid missing required fields.

### 2. Add the worker proxy function

In `src/lib/wasm/wasmWorkerProxy.ts`, add a typed function that sends pixels + config to the worker:

```typescript
export async function detectMyAlgorithmWasm(
    pixels: Uint8Array, width: number, height: number, config: object,
): Promise<MyAlgorithmResult> {
    return callWorker("detect", { algorithmId: "my-algorithm", pixels, width, height, config }, [pixels.buffer]);
}
```

### 3. Create the adapter

Create a directory `src/components/editor/algorithms/myAlgorithm/` with:

**`adapter.ts`** -- implements `AlgorithmDefinition`:

```typescript
import type { AlgorithmDefinition, AlgorithmSummaryEntry } from "../types";
import type { Feature } from "../../../../store/editor/useEditorStore";
import type { MyAlgorithmResult } from "../../../../lib/types";
import { detectMyAlgorithmWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import MyAlgorithmConfigForm, { type MyAlgorithmConfig } from "./ConfigForm";

const initialConfig: MyAlgorithmConfig = { threshold: 0.5 };

export const myAlgorithm: AlgorithmDefinition = {
    id: "my-algorithm",
    title: "My Algorithm",
    description: "Detects things in images.",
    initialConfig,
    executionModes: ["wasm"],
    ConfigComponent: MyAlgorithmConfigForm as AlgorithmDefinition["ConfigComponent"],
    run: async () => {
        throw new Error("Only available via client-side WASM.");
    },
    runWasm: async ({ pixels, width, height, config }) => {
        const c = config as MyAlgorithmConfig;
        return detectMyAlgorithmWasm(pixels, width, height, c);
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

**`ConfigForm.tsx`** -- a React form for user-tunable parameters.

### 4. Register the algorithm

In `src/components/editor/algorithms/registry.ts`:

```typescript
import { myAlgorithm } from "./myAlgorithm/adapter";

export const ALGORITHM_REGISTRY: AlgorithmDefinition[] = [
    // ...existing algorithms,
    myAlgorithm,  // <- add here
];
```

### 5. Add WASM schema tests

In `scripts/test-wasm-schemas.ts`, add a test that validates the config shape is accepted by the WASM module. Run with `bun run scripts/test-wasm-schemas.ts`.

That's it -- the editor will automatically show it in the algorithm picker, render the config form, and display results on the canvas.

---

## Quick Reference

| Task | Command |
|---|---|
| Build content manifest | `bun run content:build` |
| Dev server | `bun run dev` |
| Lint frontend | `bun run lint` |
| Unit tests | `npx vitest run` |
| WASM schema tests | `bun run scripts/test-wasm-schemas.ts` |
