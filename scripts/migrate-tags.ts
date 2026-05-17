#!/usr/bin/env bun
/**
 * Dry-run migration: map each atlas page's current free-form `tags` array to
 * the closed vocabulary defined in `content/tags.yaml`. Prints a per-file
 * table and a summary to stdout, and writes /tmp/tag-migration.json. Does NOT
 * modify any content files.
 *
 * Run: `bun run scripts/migrate-tags.ts`
 *
 * After human review, run `scripts/apply-tag-migration.ts` to apply the map.
 */

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { parse as parseYaml } from "yaml";
import { tagMigrationMap, DROP } from "./tag-migration-map.ts";

// ── Types ────────────────────────────────────────────────────────────────────

type Kind = "algorithm" | "model" | "concept";

interface FileResult {
    slug: string;
    file: string;            // repo-relative path e.g. "content/algorithms/foo.md"
    absolutePath: string;
    kind: Kind;
    oldTags: string[];
    newTags: string[];
    dropped: string[];
    unmapped: string[];       // tags absent from tagMigrationMap → NEEDS_HUMAN_REVIEW
    invalidTargets: string[]; // mapped target slugs not in content/tags.yaml vocabulary
    tagless: boolean;         // true when newTags is empty after mapping
}

// JSON output shape (keyed by absolute file path).
interface JsonEntry {
    slug: string;
    oldTags: string[];
    newTags: string[];
    dropped: string[];
    unmapped: string[];
    tagless: boolean;
}

// ── Load the closed vocabulary from content/tags.yaml ────────────────────────

function loadVocabulary(): Set<string> {
    const tagsYamlPath = join(import.meta.dir, "..", "content", "tags.yaml");
    const raw = readFileSync(tagsYamlPath, "utf8");
    const parsed = parseYaml(raw) as { tags: { slug: string; description: string }[] };
    if (!Array.isArray(parsed?.tags)) {
        throw new Error("content/tags.yaml: expected top-level `tags:` list");
    }
    return new Set(parsed.tags.map((t) => t.slug));
}

// ── Load atlas pages ─────────────────────────────────────────────────────────

function loadPages(dir: string, kind: Kind): FileResult[] {
    const root = join(import.meta.dir, "..", "content", dir);
    return readdirSync(root)
        .filter((f) => f.endsWith(".md"))
        .map((f) => {
            const absolutePath = join(root, f);
            const file = join("content", dir, f);
            const slug = f.replace(/\.md$/, "");
            const raw = readFileSync(absolutePath, "utf8");
            const { data } = matter(raw);
            const fm = data as Record<string, unknown>;
            const oldTags: string[] = Array.isArray(fm.tags)
                ? (fm.tags as unknown[]).filter((t): t is string => typeof t === "string")
                : [];
            return {
                slug,
                file,
                absolutePath,
                kind,
                oldTags,
                newTags: [],
                dropped: [],
                unmapped: [],
                invalidTargets: [],
                tagless: false,
            };
        });
}

// ── Map tags for a single page ───────────────────────────────────────────────

function mapTags(
    oldTags: string[],
    vocabulary: Set<string>,
): Pick<FileResult, "newTags" | "dropped" | "unmapped" | "invalidTargets" | "tagless"> {
    const newTagsOrdered: string[] = [];
    const dropped: string[] = [];
    const unmapped: string[] = [];
    const invalidTargets: string[] = [];

    for (const tag of oldTags) {
        if (!(tag in tagMigrationMap)) {
            unmapped.push(tag);
            continue;
        }
        const mapped = tagMigrationMap[tag];
        if (mapped === DROP) {
            dropped.push(tag);
            continue;
        }
        if (!vocabulary.has(mapped)) {
            invalidTargets.push(mapped);
            continue;
        }
        // Dedupe, preserving first-seen order.
        if (!newTagsOrdered.includes(mapped)) {
            newTagsOrdered.push(mapped);
        }
    }

    return {
        newTags: newTagsOrdered,
        dropped,
        unmapped,
        invalidTargets,
        tagless: newTagsOrdered.length === 0,
    };
}

// ── Formatting helpers ────────────────────────────────────────────────────────

function flags(r: FileResult): string {
    const f: string[] = [];
    if (r.unmapped.length > 0) f.push("NEEDS_HUMAN_REVIEW");
    if (r.tagless) f.push("TAGLESS");
    if (r.invalidTargets.length > 0) f.push("INVALID_TARGET");
    return f.join(", ");
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
    const vocabulary = loadVocabulary();

    const rows: FileResult[] = [
        ...loadPages("algorithms", "algorithm"),
        ...loadPages("models", "model"),
        ...loadPages("concepts", "concept"),
    ];

    // Map tags for each page.
    for (const r of rows) {
        const result = mapTags(r.oldTags, vocabulary);
        r.newTags = result.newTags;
        r.dropped = result.dropped;
        r.unmapped = result.unmapped;
        r.invalidTargets = result.invalidTargets;
        r.tagless = result.tagless;
    }

    // Sort by kind, then slug, for stable output.
    rows.sort((a, b) => a.kind.localeCompare(b.kind) || a.slug.localeCompare(b.slug));

    // ── Print per-file table ─────────────────────────────────────────────────
    const W = {
        kind: 10,
        slug: 42,
        old: 55,
        new: 45,
        dropped: 30,
        flags: 30,
    };
    const header =
        "kind".padEnd(W.kind) +
        "slug".padEnd(W.slug) +
        "old tags".padEnd(W.old) +
        "new tags".padEnd(W.new) +
        "dropped".padEnd(W.dropped) +
        "flags";
    const sep = "-".repeat(header.length + 10);
    console.log(sep);
    console.log(header);
    console.log(sep);

    for (const r of rows) {
        const k = r.kind.padEnd(W.kind);
        const s = r.slug.padEnd(W.slug);
        const o = r.oldTags.join(", ").padEnd(W.old);
        const n = r.newTags.join(", ").padEnd(W.new);
        const d = r.dropped.join(", ").padEnd(W.dropped);
        const f = flags(r);
        console.log(`${k}${s}${o}${n}${d}${f}`);
    }
    console.log(sep);

    // ── Summary counts ───────────────────────────────────────────────────────
    const total = rows.length;
    const needsReview = rows.filter((r) => r.unmapped.length > 0).length;
    const taglessCount = rows.filter((r) => r.tagless).length;
    const invalidCount = rows.filter((r) => r.invalidTargets.length > 0).length;

    // Collect the distinct unmapped tags across all files.
    const allUnmapped = new Set<string>();
    for (const r of rows) r.unmapped.forEach((t) => allUnmapped.add(t));

    // Collect tagless file slugs.
    const taglessSlugs = rows.filter((r) => r.tagless).map((r) => r.slug);

    console.log();
    console.log("═".repeat(80));
    console.log("SUMMARY");
    console.log("═".repeat(80));
    console.log(`  Total atlas pages :  ${total}`);
    console.log(`  Clean (no flags)  :  ${total - needsReview - taglessCount - invalidCount + rows.filter((r) => r.unmapped.length > 0 && r.tagless).length}`);
    console.log(`  NEEDS_HUMAN_REVIEW:  ${needsReview}`);
    console.log(`  TAGLESS           :  ${taglessCount}`);
    console.log(`  INVALID_TARGET    :  ${invalidCount}`);

    if (allUnmapped.size > 0) {
        console.log();
        console.log("  *** UNMAPPED TAGS — assign in scripts/tag-migration-map.ts ***");
        for (const t of [...allUnmapped].sort()) {
            console.log(`    - ${t}`);
        }
    } else {
        console.log();
        console.log("  All tags are mapped. No NEEDS_HUMAN_REVIEW items.");
    }

    if (taglessSlugs.length > 0) {
        console.log();
        console.log("  *** TAGLESS FILES — assign at least one tag by hand ***");
        for (const s of taglessSlugs.sort()) {
            console.log(`    - ${s}`);
        }
    } else {
        console.log();
        console.log("  No TAGLESS pages.");
    }

    if (invalidCount > 0) {
        console.log();
        console.log("  *** INVALID_TARGET — mapped slug not in content/tags.yaml ***");
        for (const r of rows.filter((r) => r.invalidTargets.length > 0)) {
            console.log(`    - ${r.slug}: ${r.invalidTargets.join(", ")}`);
        }
    }

    console.log("═".repeat(80));

    // ── Write JSON output ────────────────────────────────────────────────────
    const jsonOut: Record<string, JsonEntry> = {};
    for (const r of rows) {
        jsonOut[r.absolutePath] = {
            slug: r.slug,
            oldTags: r.oldTags,
            newTags: r.newTags,
            dropped: r.dropped,
            unmapped: r.unmapped,
            tagless: r.tagless,
        };
    }

    const outPath = "/tmp/tag-migration.json";
    writeFileSync(outPath, JSON.stringify(jsonOut, null, 2));
    console.log(`\nMigration map written to ${outPath}`);
}

main();
