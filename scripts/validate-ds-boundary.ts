/**
 * Design-system boundary validation.
 *
 * The 40 components exported from `.design-sync/ds-entry.tsx` are synced to
 * claude.ai/design and rendered there in isolation — no Zustand store, no
 * react-konva stage, no WASM worker, no Clerk session. Nothing in the type
 * system enforces that. A component that grows a `useEditorStore()` call still
 * type-checks, builds, lints, and passes tests; it only fails at the next
 * design sync, and it fails SILENTLY — the component throws during render,
 * React swallows it, and the preview card comes up blank with a clean log.
 * That failure mode is expensive to diagnose precisely because nothing reports
 * it. This script reports it, at the commit that causes it.
 *
 * The check runs on the real runtime module graph: esbuild bundles the entry
 * with `packages: "external"`, and the metafile is inspected for forbidden
 * source paths and forbidden bare specifiers. Type-only imports are erased by
 * the transform and so are correctly ignored — `import type` from the store is
 * harmless, since it contributes nothing at runtime.
 *
 * Exit code 1 on any violation.
 */
import { build } from "esbuild";
import { join, relative } from "node:path";

const REPO = join(import.meta.dir, "..");
const ENTRY = join(REPO, ".design-sync", "ds-entry.tsx");

/** Source trees a synced component must never reach at runtime. */
const FORBIDDEN_PATHS: { prefix: string; why: string }[] = [
    {
        prefix: "src/store/",
        why: "the editor Zustand store — no store provider exists in a design render",
    },
    {
        prefix: "src/lib/wasm/",
        why: "the WASM worker proxy — no worker or .wasm asset is served to a design render",
    },
];

/** Bare package specifiers a synced component must never import at runtime. */
const FORBIDDEN_PACKAGES: { match: (spec: string) => boolean; label: string; why: string }[] = [
    {
        match: (s) => s === "zustand" || s.startsWith("zustand/"),
        label: "zustand",
        why: "pulls in editor state that a design render cannot provide",
    },
    {
        match: (s) => s === "konva" || s === "react-konva" || s.startsWith("react-konva/"),
        label: "konva / react-konva",
        why: "requires a canvas Stage ancestor; renders blank or throws outside one",
    },
    {
        match: (s) => s.startsWith("@clerk/"),
        label: "@clerk/*",
        why: "needs VITE_CLERK_PUBLISHABLE_KEY, which lives only in gitignored .env.local",
    },
];

type Violation = { file: string; detail: string; why: string };

const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    write: false,
    metafile: true,
    format: "esm",
    platform: "browser",
    target: "es2020",
    // Must match .design-sync/build-ds.mjs — the root tsconfig is a solution
    // file with no `jsx` option, so esbuild would otherwise fall back to the
    // classic transform and fail on components that never import React.
    jsx: "automatic",
    // Bare imports stay external: node_modules is never traversed (fast), and
    // the specifiers are still recorded in the metafile, which is all we need.
    packages: "external",
    loader: { ".svg": "dataurl", ".png": "dataurl", ".woff": "dataurl", ".woff2": "dataurl" },
    logLevel: "silent",
});

const inputs = result.metafile.inputs;
const violations: Violation[] = [];

/** file -> files that import it, for attributing a forbidden path to a culprit. */
const importers = new Map<string, Set<string>>();
for (const [file, meta] of Object.entries(inputs)) {
    for (const im of meta.imports ?? []) {
        if (im.external) continue;
        if (!importers.has(im.path)) importers.set(im.path, new Set());
        importers.get(im.path)!.add(file);
    }
}

const inForbiddenTree = (p: string) => FORBIDDEN_PATHS.some(({ prefix }) => p.startsWith(prefix));

for (const [file, meta] of Object.entries(inputs)) {
    const path = relative(REPO, join(REPO, file));

    for (const { prefix, why } of FORBIDDEN_PATHS) {
        if (!path.startsWith(prefix)) continue;
        // Report only the boundary CROSSING — importers that live outside the
        // forbidden tree. Once the tree is pulled in, its own internal files match
        // the prefix too, and reporting those would bury one root cause under a
        // pile of consequences.
        const crossings = [...(importers.get(file) ?? [])]
            .filter((f) => !inForbiddenTree(f))
            .sort();
        if (crossings.length === 0 && !importers.has(file)) {
            violations.push({ file: path, detail: `${path} is the entry graph root`, why });
        }
        for (const from of crossings) {
            violations.push({ file: from, detail: `reaches ${path}`, why });
        }
    }

    // A file inside a forbidden tree importing a forbidden package is that tree
    // doing its job (the store imports zustand — of course it does). The real
    // violation is whatever reached into the tree, and that is reported above.
    if (inForbiddenTree(path)) continue;

    for (const im of meta.imports ?? []) {
        if (!im.external) continue;
        for (const { match, label, why } of FORBIDDEN_PACKAGES) {
            if (match(im.path)) violations.push({ file: path, detail: `imports ${label}`, why });
        }
    }
}

const count = Object.keys(inputs).length;

if (violations.length === 0) {
    console.log(`✓ design-system boundary clean — ${count} modules, no forbidden dependencies`);
    process.exit(0);
}

console.error(`\n✗ design-system boundary violated (${violations.length}):\n`);
for (const v of violations) {
    console.error(`  ${v.file}`);
    console.error(`    ${v.detail}`);
    console.error(`    ${v.why}\n`);
}
console.error(
    "These components are synced to claude.ai/design and render in isolation there.\n" +
        "A forbidden dependency makes the preview card render BLANK with no error in\n" +
        "any log, so this will not surface anywhere else.\n\n" +
        "Fix by removing the dependency from the component, or — if the component\n" +
        "genuinely belongs to the app rather than the design system — by dropping its\n" +
        "export from .design-sync/ds-entry.tsx and its entry from\n" +
        ".design-sync/config.json → componentSrcMap.\n",
);
process.exit(1);
