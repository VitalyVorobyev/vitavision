/**
 * The one loader for docs/papers/index.yaml.
 *
 * `loadIndexEntries` handles the read-and-parse step only; every call site
 * historically reacted differently to a missing file or a malformed
 * (non-list) document — some warn and return an empty list, some throw,
 * some `process.exit(1)` with a bespoke message. Rather than picking one
 * behaviour, `loadIndexEntries` takes optional `onMissing`/`onNotList`
 * callbacks so each caller can reproduce its original, byte-identical
 * message. Passing neither reproduces the "just read the file" shape used
 * by the scripts that never guarded against a missing/malformed index.
 *
 * Below the loader sit small, pure "view" functions that project the raw
 * entries into the shapes individual scripts need (years, titles,
 * author-id lists, ...). They take entries as a plain argument so they're
 * testable without touching disk.
 */
import { existsSync, readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";

import { PAPERS_INDEX_PATH } from "./paths.ts";

export type SourceKind = "paper" | "repo" | "doc";

/**
 * One entry of docs/papers/index.yaml, in its raw (as-parsed-from-YAML)
 * shape. `kind` is optional in the YAML itself (absent means "paper") —
 * callers that care must default it themselves, matching each original
 * call site's own `entry.kind ?? "paper"` (or equivalent) check.
 */
export interface RawIndexEntry {
    id: string;
    kind?: SourceKind;
    // paper fields
    title?: string;
    authors?: string[];
    authorIds?: string[];
    year?: number;
    venue?: string;
    url?: string;
    pdf?: string;
    arxiv?: string;
    doi?: string;
    cites?: string[];
    notes?: string;
    // repo fields
    repo?: string;
    commit?: string;
    license?: string;
    description?: string;
    // doc fields
    path?: string;
}

export interface LoadIndexEntriesOptions {
    /** Called when `path` does not exist. Defaults to returning `[]` silently
     *  (i.e. the file is read directly, so a missing file surfaces as a
     *  natural `readFileSync` throw unless this is provided). */
    onMissing?: () => RawIndexEntry[];
    /** Called when the parsed YAML document is not a list. Defaults to `[]`. */
    onNotList?: () => RawIndexEntry[];
}

/**
 * Reads and parses docs/papers/index.yaml (or `path`, for tests/other
 * indexes). See file header for the missing/malformed-file contract.
 */
export function loadIndexEntries(
    path: string = PAPERS_INDEX_PATH,
    opts: LoadIndexEntriesOptions = {},
): RawIndexEntry[] {
    if (opts.onMissing && !existsSync(path)) {
        return opts.onMissing();
    }
    const raw = readFileSync(path, "utf-8");
    const parsed = parseYaml(raw);
    if (!Array.isArray(parsed)) {
        return opts.onNotList ? opts.onNotList() : [];
    }
    return parsed as RawIndexEntry[];
}

/** Map<paperId, year> — entries with kind "paper" (or absent) and a numeric `year`. */
export function paperYears(entries: RawIndexEntry[]): Map<string, number> {
    const years = new Map<string, number>();
    for (const e of entries) {
        if (!e.id) continue;
        const kind = e.kind ?? "paper";
        if (kind !== "paper") continue;
        if (typeof e.year !== "number") continue;
        years.set(e.id, e.year);
    }
    return years;
}

/** Map<paperId, cites> — raw `cites:` list (unfiltered/unresolved ids, defaulting
 *  to `[]` when absent) for entries with kind "paper" (or absent). Callers that
 *  need only registry-resolved ids (e.g. scripts/build/scholarly.ts) filter
 *  against the known id set themselves. */
export function paperCites(entries: RawIndexEntry[]): Map<string, string[]> {
    const cites = new Map<string, string[]>();
    for (const e of entries) {
        if (!e.id) continue;
        const kind = e.kind ?? "paper";
        if (kind !== "paper") continue;
        cites.set(e.id, e.cites ?? []);
    }
    return cites;
}

/** Map<paperId, title> (falling back to id) — kind "paper" (or absent) only. */
export function paperTitles(entries: RawIndexEntry[]): Map<string, string> {
    const titles = new Map<string, string>();
    for (const e of entries) {
        if (!e.id) continue;
        const kind = e.kind ?? "paper";
        if (kind !== "paper") continue;
        titles.set(e.id, e.title ?? e.id);
    }
    return titles;
}

/** `{ paperId, authorIds }` for every kind:paper entry that already carries a non-empty `authorIds`. */
export function paperAuthorIds(entries: RawIndexEntry[]): { paperId: string; authorIds: string[] }[] {
    const out: { paperId: string; authorIds: string[] }[] = [];
    for (const entry of entries) {
        const kind = entry.kind ?? "paper";
        if (kind !== "paper") continue;
        if (!entry.id) continue;
        if (!Array.isArray(entry.authorIds) || entry.authorIds.length === 0) continue;
        out.push({ paperId: entry.id, authorIds: entry.authorIds });
    }
    return out;
}

/** Display-ready paper record used by content-build's papers-index.json emission. */
export interface PaperRefRecord {
    id: string;
    title: string;
    authors: string[];
    year: number;
    venue: string;
    url: string;
    arxiv?: string;
    doi?: string;
}

/** Projects kind:paper entries into the `PaperRefRecord` shape content-build emits
 *  to public/papers-index.json, filling in the same display fallbacks as the
 *  original `content-build.ts#loadPapersIndex`. */
export function paperRefRecords(entries: RawIndexEntry[]): PaperRefRecord[] {
    const papers: PaperRefRecord[] = [];
    for (const entry of entries) {
        const kind = entry.kind ?? "paper";
        if (kind !== "paper") continue;
        if (!entry.id) continue;
        papers.push({
            id: entry.id,
            title: entry.title ?? entry.id,
            authors: entry.authors ?? [],
            year: typeof entry.year === "number" ? entry.year : 0,
            venue: entry.venue ?? "",
            url: entry.url ?? "",
            ...(entry.arxiv ? { arxiv: entry.arxiv } : {}),
            ...(entry.doi ? { doi: entry.doi } : {}),
        });
    }
    return papers;
}

/**
 * Typed source registry keyed by canonical source-ref form
 * (`paper:<id>` | `repo:<repo>@<commit>` | `doc:<path>`), mirroring
 * validate-content.ts's `loadSourceIndex`. Validation errors (malformed
 * repo/doc entries, reserved-prefix paper ids) are pushed onto the caller's
 * `errors` array rather than thrown, matching validate-content's
 * collect-don't-throw error model.
 */
export function sourceKeyMap(entries: RawIndexEntry[], errors: string[]): Map<string, RawIndexEntry> {
    const index = new Map<string, RawIndexEntry>();

    for (const e of entries) {
        const id = e.id;
        if (!id) continue;
        const kind = e.kind ?? "paper";

        // Defensive rule: paper ids must not start with reserved prefixes.
        if (kind === "paper" && (id.startsWith("repo:") || id.startsWith("doc:"))) {
            errors.push(
                `[index.yaml] entry id "${id}" must not start with reserved prefix "repo:" or "doc:"`,
            );
            continue;
        }

        let key: string;
        if (kind === "paper") {
            key = `paper:${id}`;
        } else if (kind === "repo") {
            if (!e.repo || !e.commit) {
                errors.push(
                    `[index.yaml] entry id "${id}" (kind: repo) must have "repo" and "commit" fields`,
                );
                continue;
            }
            key = `repo:${e.repo}@${e.commit}`;
        } else {
            // doc
            if (!e.path) {
                errors.push(
                    `[index.yaml] entry id "${id}" (kind: doc) must have a "path" field`,
                );
                continue;
            }
            key = `doc:${e.path}`;
        }

        index.set(key, { ...e, kind });
    }
    return index;
}
