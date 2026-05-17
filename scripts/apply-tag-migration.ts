#!/usr/bin/env bun
/**
 * Apply the tag migration produced by `scripts/migrate-tags.ts`. Reads
 * /tmp/tag-migration.json and rewrites the `tags:` frontmatter line in each
 * atlas .md file whose mapping is clean (no unmapped tags, not tagless, no
 * invalid targets). Skips all other files with a warning.
 *
 * MUTATES content files. Run `scripts/migrate-tags.ts` first.
 *
 * Run: `bun run scripts/apply-tag-migration.ts`
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import matter from "gray-matter";

// ── Types (must match migrate-tags.ts JsonEntry) ─────────────────────────────

interface JsonEntry {
    slug: string;
    oldTags: string[];
    newTags: string[];
    dropped: string[];
    unmapped: string[];
    tagless: boolean;
}

type MigrationMap = Record<string, JsonEntry>;

// ── Helpers ───────────────────────────────────────────────────────────────────

const MIGRATION_PATH = "/tmp/tag-migration.json";

/** Read and parse the migration JSON produced by migrate-tags.ts. */
function loadMigrationMap(): MigrationMap {
    if (!existsSync(MIGRATION_PATH)) {
        console.error(
            `ERROR: ${MIGRATION_PATH} not found.\n` +
            `       Run \`bun run scripts/migrate-tags.ts\` first to generate it.`,
        );
        process.exit(1);
    }
    const raw = readFileSync(MIGRATION_PATH, "utf8");
    return JSON.parse(raw) as MigrationMap;
}

/**
 * Build the replacement `tags:` line in the existing flow-style format.
 * e.g. tags: ["deep-learning", "keypoint-detection"]
 */
function buildTagsLine(newTags: string[]): string {
    const items = newTags.map((t) => `"${t}"`).join(", ");
    return `tags: [${items}]`;
}

/**
 * Locate the YAML frontmatter region (between the first two `---` fences),
 * replace the `tags:` line within it, and return the updated file text.
 * Returns null if the frontmatter region or an existing `tags:` line cannot
 * be found.
 */
function rewriteTagsLine(raw: string, newTagsLine: string): string | null {
    // Split off the frontmatter region.
    // Frontmatter starts at position 0 with "---\n" and ends at the next "---".
    const fmStart = raw.startsWith("---") ? 0 : -1;
    if (fmStart === -1) return null;

    // Find the closing fence (skip the opening "---").
    const afterOpen = raw.indexOf("\n", fmStart) + 1;
    const closingFenceIdx = raw.indexOf("\n---", afterOpen);
    if (closingFenceIdx === -1) return null;

    const fmRegion = raw.slice(0, closingFenceIdx + 1); // includes up to (not past) "---"
    const bodyRegion = raw.slice(closingFenceIdx + 1);   // "\n---\n..." onward

    // Replace the `tags:` line within the frontmatter region only.
    const tagsLineRe = /^tags:.*$/m;
    if (!tagsLineRe.test(fmRegion)) return null;

    const updatedFm = fmRegion.replace(tagsLineRe, newTagsLine);
    return updatedFm + bodyRegion;
}

// ── main ─────────────────────────────────────────────────────────────────────

function main() {
    const migrationMap = loadMigrationMap();
    const entries = Object.entries(migrationMap);

    let rewritten = 0;
    let skipped = 0;
    let verifyFailed = 0;
    const skipReasons: { slug: string; reason: string }[] = [];
    const verifyErrors: { slug: string; detail: string }[] = [];

    for (const [absolutePath, entry] of entries) {
        const { slug, newTags, unmapped, tagless } = entry;

        // ── Skip files that are not clean ───────────────────────────────────
        const skipReasonParts: string[] = [];
        if (unmapped.length > 0) {
            skipReasonParts.push(`${unmapped.length} unmapped tag(s): ${unmapped.join(", ")}`);
        }
        if (tagless) {
            skipReasonParts.push("TAGLESS (zero tags after mapping)");
        }
        // Note: invalidTargets are not stored in the JSON schema for apply; the
        // dry-run records them as unmapped from the vocabulary's perspective.
        // Files with invalid targets will have been recorded with empty newTags
        // and non-empty unmapped from the perspective of the apply script, so
        // they are already caught by the unmapped check above. However, to be
        // safe, a tagless + no-unmapped file is still skipped via tagless flag.

        if (skipReasonParts.length > 0) {
            console.warn(`SKIP  ${slug}: ${skipReasonParts.join("; ")}`);
            skipReasons.push({ slug, reason: skipReasonParts.join("; ") });
            skipped++;
            continue;
        }

        // ── Read and rewrite the file ────────────────────────────────────────
        let raw: string;
        try {
            raw = readFileSync(absolutePath, "utf8");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.error(`ERROR reading ${absolutePath}: ${msg}`);
            skipped++;
            skipReasons.push({ slug, reason: `read error: ${msg}` });
            continue;
        }

        const newTagsLine = buildTagsLine(newTags);
        const updated = rewriteTagsLine(raw, newTagsLine);
        if (updated === null) {
            const reason = "could not locate frontmatter or tags: line";
            console.error(`ERROR ${slug}: ${reason}`);
            skipped++;
            skipReasons.push({ slug, reason });
            continue;
        }

        writeFileSync(absolutePath, updated, "utf8");

        // ── Verify the rewrite ───────────────────────────────────────────────
        const written = readFileSync(absolutePath, "utf8");
        const { data: verifiedFm } = matter(written);
        const verifiedTags: unknown = verifiedFm.tags;
        const ok =
            Array.isArray(verifiedTags) &&
            verifiedTags.length === newTags.length &&
            (verifiedTags as unknown[]).every(
                (t, i) => typeof t === "string" && t === newTags[i],
            );

        if (!ok) {
            const detail = `expected [${newTags.join(", ")}], got [${
                Array.isArray(verifiedTags)
                    ? (verifiedTags as unknown[]).join(", ")
                    : String(verifiedTags)
            }]`;
            console.error(`VERIFY FAILED ${slug}: ${detail}`);
            verifyErrors.push({ slug, detail });
            verifyFailed++;
        } else {
            console.log(`OK    ${slug}  →  [${newTags.join(", ")}]`);
            rewritten++;
        }
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    console.log();
    console.log("═".repeat(70));
    console.log("APPLY SUMMARY");
    console.log("═".repeat(70));
    console.log(`  Total entries in migration map: ${entries.length}`);
    console.log(`  Rewritten successfully        : ${rewritten}`);
    console.log(`  Skipped (not clean)           : ${skipped}`);
    console.log(`  Verify failed (bugs!)         : ${verifyFailed}`);

    if (skipReasons.length > 0) {
        console.log();
        console.log("  Skipped files:");
        for (const { slug, reason } of skipReasons) {
            console.log(`    - ${slug}: ${reason}`);
        }
    }

    if (verifyErrors.length > 0) {
        console.log();
        console.log("  *** VERIFY FAILURES — investigate immediately ***");
        for (const { slug, detail } of verifyErrors) {
            console.log(`    - ${slug}: ${detail}`);
        }
        process.exit(1);
    }

    if (skipped > 0 && rewritten === 0) {
        console.log();
        console.log(
            "  WARNING: No files were rewritten. Resolve all NEEDS_HUMAN_REVIEW and\n" +
            "           TAGLESS issues in scripts/tag-migration-map.ts, then re-run\n" +
            "           scripts/migrate-tags.ts followed by this script.",
        );
    }
}

main();
