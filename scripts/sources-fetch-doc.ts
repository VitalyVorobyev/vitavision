/**
 * sources-fetch-doc.ts — emit stub research notes for `kind: doc` entries
 * in docs/papers/index.yaml.
 *
 * No LLM calls. No file fetching. Deterministic and idempotent.
 *
 * Usage:
 *   bun run sources:fetch-doc            # process all kind:doc entries
 *   bun run sources:fetch-doc <id>       # process one entry by source-id
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { parse as parseYaml } from "yaml";

const REPO_ROOT = join(import.meta.dir, "..");
const INDEX_PATH = join(REPO_ROOT, "docs", "papers", "index.yaml");
const NOTES_DIR = join(REPO_ROOT, "docs", "research", "notes");

// ── Types ─────────────────────────────────────────────────────────────────────

type SourceKind = "paper" | "repo" | "doc";

interface IndexEntry {
    id: string;
    kind?: SourceKind;
    title?: string;
    path?: string;
    // paper / repo fields are present but irrelevant here
    [key: string]: unknown;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Today's date in YYYY-MM-DD format (local time). */
function todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/**
 * Validate that `relPath` is a relative path under docs/ or content/ that
 * does not escape the repo root with `..`.
 */
function isSafeRelativePath(relPath: string): boolean {
    if (isAbsolute(relPath)) return false;
    const normalized = join(relPath); // collapse . and redundant slashes
    // Must start with docs/ or content/
    if (!normalized.startsWith("docs/") && !normalized.startsWith("content/")) {
        return false;
    }
    // Must not escape repo root
    const resolved = join(REPO_ROOT, normalized);
    return resolved.startsWith(REPO_ROOT + "/");
}

/**
 * Build the stub note content from the index entry.
 * Mirrors the frontmatter in docs/research/templates/source-note-doc.md
 * with real values; section bodies are empty.
 */
function buildStubNote(entry: IndexEntry, created: string): string {
    const title = entry.title ?? entry.id;
    const path = entry.path ?? "";
    return `---
source_id: ${entry.id}
kind: doc
title: "${title}"
path: ${path}
created: ${created}
relevant_atlas_pages: []
---

# Doc scope



# Key claims

1.

# Applicability

- Cite when:
- Don't cite when:

# Connections

- Draws on: []
- Should be cited by: []

# Atlas update plan



# Provenance

`;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
    const filterId = process.argv[2];

    if (!existsSync(INDEX_PATH)) {
        process.stderr.write("sources:fetch-doc — docs/papers/index.yaml not found\n");
        process.exit(1);
    }

    const raw = readFileSync(INDEX_PATH, "utf-8");
    const allEntries = parseYaml(raw) as Array<IndexEntry>;

    if (!Array.isArray(allEntries)) {
        process.stderr.write("sources:fetch-doc — index.yaml is not a list\n");
        process.exit(1);
    }

    // Filter to kind:doc entries only
    const docEntries = allEntries.filter((e) => e.kind === "doc");

    // Apply optional id filter
    let targets: IndexEntry[];
    if (filterId) {
        targets = docEntries.filter((e) => e.id === filterId);
        if (targets.length === 0) {
            process.stderr.write(`sources:fetch-doc — id not found (or not kind:doc): ${filterId}\n`);
            process.exit(1);
        }
    } else {
        targets = docEntries;
    }

    let stubs = 0;
    let errors = 0;
    const created = todayIso();

    // Ensure notes directory exists
    if (!existsSync(NOTES_DIR)) {
        mkdirSync(NOTES_DIR, { recursive: true });
    }

    for (const entry of targets) {
        // 1. Validate path field
        if (!entry.path) {
            console.log(`[error] ${entry.id}: missing path field`);
            errors++;
            continue;
        }

        if (!isSafeRelativePath(entry.path)) {
            console.log(`[error] ${entry.id}: doc path "${entry.path}" is not a safe relative path`);
            errors++;
            continue;
        }

        // 2. Verify file exists on disk
        const absDocPath = join(REPO_ROOT, entry.path);
        if (!existsSync(absDocPath)) {
            console.log(`[error] ${entry.id}: doc path "${entry.path}" does not exist`);
            errors++;
            continue;
        }

        // 3. Emit stub note (create-only)
        const notePath = join(NOTES_DIR, `${entry.id}.md`);
        if (existsSync(notePath)) {
            console.log(`[ok] ${entry.id}`);
            continue;
        }

        const content = buildStubNote(entry, created);
        writeFileSync(notePath, content, "utf-8");
        console.log(`[stub] ${entry.id}`);
        stubs++;
    }

    // Summary
    console.log(`docs: ${targets.length}, stubs: ${stubs}, errors: ${errors}`);
}

main().catch((err) => {
    process.stderr.write(`sources:fetch-doc error: ${err}\n`);
    process.exit(1);
});
