#!/usr/bin/env bun
/**
 * Dry-run migration: compute proposed `domain` value for each Atlas page from
 * its current `category`. Prints a table to stdout and writes a JSON map to
 * /tmp/category-migration.json. Does NOT modify any content files.
 *
 * Run: `bun run scripts/migrate-categories.ts`
 *
 * After human review, a follow-up script (NOT this one) applies the map.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

type Kind = "algorithm" | "model" | "concept";
type Domain =
    | "image-formation"
    | "features"
    | "geometry"
    | "targets"
    | "calibration"
    | "stitching"
    | "depth"
    | "detection";

interface Row {
    kind: Kind;
    slug: string;
    file: string;
    title: string;
    currentCategory: string | undefined;
    proposedDomain: Domain | "NEEDS_HUMAN_REVIEW";
    note: string;
}

// Domain mapping per (kind, category). Keep this conservative — when the
// existing category does not map cleanly to a single domain, return
// NEEDS_HUMAN_REVIEW with a note explaining the ambiguity.
const ALGORITHM_MAP: Record<string, Domain | "PER_FILE"> = {
    "corner-detection": "features",
    "calibration-targets": "targets",
    "subpixel-refinement": "features",
    "calibration": "calibration",
    // explainers is per-file: lin-sva-stitching → stitching, gao-dual-homography-stitching → stitching, fundamental-matrix-eight-point → geometry, 02-demo-blocks → (skip; dev:true)
    "explainers": "PER_FILE",
};

const MODEL_MAP: Record<string, Domain> = {
    "detection": "detection",
    "depth-stereo": "depth",
    "pose-geometry": "geometry",
    "segmentation-flow": "detection",  // closest fit; tag-level can refine later
    "foundation-ssl": "features",
    "calibration-learning": "calibration",
};

const CONCEPT_MAP: Record<string, Domain> = {
    "image-formation": "image-formation",
    "geometry": "geometry",
    "feature-theory": "features",
    "calibration-theory": "calibration",
};

// Per-file overrides for explainers (algorithm pages with category: "explainers").
const EXPLAINER_OVERRIDES: Record<string, Domain | "SKIP_DEV"> = {
    "lin-sva-stitching": "stitching",
    "gao-dual-homography-stitching": "stitching",
    "fundamental-matrix-eight-point": "geometry",
    "02-demo-blocks": "SKIP_DEV",
};

function loadPages(dir: string, kind: Kind): (Row & { _fm: Record<string, unknown> })[] {
    const root = join(import.meta.dir, "..", "content", dir);
    return readdirSync(root)
        .filter((f) => f.endsWith(".md"))
        .map((f) => {
            const file = join("content", dir, f);
            const slug = f.replace(/\.md$/, "");
            const raw = readFileSync(join(root, f), "utf8");
            const { data } = matter(raw);
            const fm = data as Record<string, unknown>;
            return {
                kind,
                slug,
                file,
                title: (fm.title as string) ?? "",
                currentCategory: fm.category as string | undefined,
                proposedDomain: "NEEDS_HUMAN_REVIEW" as Domain | "NEEDS_HUMAN_REVIEW",
                note: "",
                _fm: fm,
            };
        });
}

function decide(row: Row & { _fm: Record<string, unknown> }): { domain: Domain | "NEEDS_HUMAN_REVIEW"; note: string } {
    // Skip dev-only pages
    if (row._fm.dev === true) {
        return { domain: "NEEDS_HUMAN_REVIEW", note: "dev:true — domain not required" };
    }
    const cat = row.currentCategory;
    if (!cat) return { domain: "NEEDS_HUMAN_REVIEW", note: "no category set" };

    if (row.kind === "algorithm") {
        const m = ALGORITHM_MAP[cat];
        if (m === undefined) return { domain: "NEEDS_HUMAN_REVIEW", note: `unknown algorithm category: ${cat}` };
        if (m === "PER_FILE") {
            const o = EXPLAINER_OVERRIDES[row.slug];
            if (!o) return { domain: "NEEDS_HUMAN_REVIEW", note: `explainer ${row.slug} not in overrides` };
            if (o === "SKIP_DEV") return { domain: "NEEDS_HUMAN_REVIEW", note: "should be dev:true" };
            return { domain: o, note: "from explainer override" };
        }
        return { domain: m, note: "" };
    }
    if (row.kind === "model") {
        const m = MODEL_MAP[cat];
        if (!m) return { domain: "NEEDS_HUMAN_REVIEW", note: `unknown model category: ${cat}` };
        return { domain: m, note: "" };
    }
    if (row.kind === "concept") {
        const m = CONCEPT_MAP[cat];
        if (!m) return { domain: "NEEDS_HUMAN_REVIEW", note: `unknown concept category: ${cat}` };
        return { domain: m, note: "" };
    }
    return { domain: "NEEDS_HUMAN_REVIEW", note: "unknown kind" };
}

function main() {
    const rows: (Row & { _fm: Record<string, unknown> })[] = [
        ...loadPages("algorithms", "algorithm"),
        ...loadPages("models", "model"),
        ...loadPages("concepts", "concept"),
    ];

    for (const r of rows) {
        const d = decide(r);
        r.proposedDomain = d.domain;
        r.note = d.note;
    }

    // Sort by kind, then slug, for stable output.
    rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug));

    // Print table.
    const header = `${"kind".padEnd(10)} ${"slug".padEnd(40)} ${"current category".padEnd(22)} ${"proposed domain".padEnd(20)} note`;
    console.log(header);
    console.log("-".repeat(header.length));
    let needsReview = 0;
    for (const r of rows) {
        const k = r.kind.padEnd(10);
        const s = r.slug.padEnd(40);
        const c = (r.currentCategory ?? "—").padEnd(22);
        const d = String(r.proposedDomain).padEnd(20);
        console.log(`${k} ${s} ${c} ${d} ${r.note}`);
        if (r.proposedDomain === "NEEDS_HUMAN_REVIEW") needsReview++;
    }
    console.log("-".repeat(header.length));
    console.log(`Total: ${rows.length} pages. NEEDS_HUMAN_REVIEW: ${needsReview}.`);

    // Write JSON map.
    const map = rows.map((r) => ({
        kind: r.kind,
        slug: r.slug,
        file: r.file,
        currentCategory: r.currentCategory,
        proposedDomain: r.proposedDomain,
        note: r.note,
    }));
    const outPath = "/tmp/category-migration.json";
    writeFileSync(outPath, JSON.stringify(map, null, 2));
    console.log(`Map written to ${outPath}`);
}

main();
