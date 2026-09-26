// scripts/notes-status.ts
//
// Research-note v2 migration progress (WS-H). A note is "v2" when it carries
// the structured-ingestion `# Stated relations` section. Prints v1/v2 totals
// and the v1 notes ranked by the Atlas degree (forward + reverse edges in
// src/generated/content-graph.ts) of the published pages citing the note as
// `sources.primary` — the migration order. Read-only.
//
// Run: bun run notes:status

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { contentGraph } from "../src/generated/content-graph.ts";
import { algoSlug, conceptSlug, loadMarkdownDir, modelSlug } from "./lib/content-kinds.ts";
import { CONTENT_DIR, RESEARCH_NOTES_DIR } from "./lib/paths.ts";

export type NoteVersion = "v1" | "v2";

export function noteVersion(markdown: string): NoteVersion {
    return /^# Stated relations\s*$/m.test(markdown) ? "v2" : "v1";
}

export interface NoteStatusRow {
    noteId: string;
    version: NoteVersion;
    /** Published pages citing the note as `sources.primary`. */
    pages: string[];
    /** Sum of the citing pages' degrees. */
    degree: number;
}

/**
 * Joins notes with the pages that cite them as primary source and ranks
 * the result: v1 before v2, then by descending degree, then by id.
 */
export function buildNoteStatus(
    notes: { noteId: string; version: NoteVersion }[],
    primaryBySlug: Map<string, string>,
    degreeBySlug: Map<string, number>,
): NoteStatusRow[] {
    const pagesByNote = new Map<string, string[]>();
    for (const [slug, noteId] of primaryBySlug) {
        const list = pagesByNote.get(noteId) ?? [];
        list.push(slug);
        pagesByNote.set(noteId, list);
    }
    return notes
        .map(({ noteId, version }) => {
            const pages = (pagesByNote.get(noteId) ?? []).sort();
            const degree = pages.reduce((sum, s) => sum + (degreeBySlug.get(s) ?? 0), 0);
            return { noteId, version, pages, degree };
        })
        .sort((a, b) =>
            a.version !== b.version
                ? a.version === "v1" ? -1 : 1
                : b.degree - a.degree || a.noteId.localeCompare(b.noteId),
        );
}

function countEdges(bucket: object | undefined): number {
    let n = 0;
    for (const v of Object.values(bucket ?? {})) if (Array.isArray(v)) n += v.length;
    return n;
}

function main(): void {
    const notes = readdirSync(RESEARCH_NOTES_DIR)
        .filter((f) => f.endsWith(".md"))
        .map((f) => ({
            noteId: f.replace(/\.md$/, ""),
            version: noteVersion(readFileSync(join(RESEARCH_NOTES_DIR, f), "utf-8")),
        }));

    const primaryBySlug = new Map<string, string>();
    for (const [dir, slugFn] of [
        ["algorithms", algoSlug],
        ["models", modelSlug],
        ["concepts", conceptSlug],
    ] as const) {
        for (const entry of loadMarkdownDir(join(CONTENT_DIR, dir), slugFn)) {
            if (entry.data.draft) continue;
            const primary = (entry.data.sources as { primary?: unknown } | undefined)?.primary;
            if (typeof primary === "string") primaryBySlug.set(entry.slug, primary.replace(/^paper:/, ""));
        }
    }

    const degreeBySlug = new Map<string, number>();
    for (const slug of Object.keys(contentGraph.nodes)) {
        degreeBySlug.set(slug, countEdges(contentGraph.forward[slug]) + countEdges(contentGraph.reverse[slug]));
    }

    const rows = buildNoteStatus(notes, primaryBySlug, degreeBySlug);
    const v2 = rows.filter((r) => r.version === "v2").length;
    console.log(`Research notes: ${rows.length} total · ${v2} v2 · ${rows.length - v2} v1\n`);
    console.log("| degree | note | primary of |");
    console.log("| --- | --- | --- |");
    for (const r of rows.filter((r) => r.version === "v1")) {
        console.log(`| ${r.degree} | \`${r.noteId}\` | ${r.pages.join(", ") || "—"} |`);
    }
}

if (import.meta.main) {
    main();
}
