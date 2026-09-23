/**
 * docs/papers/authors.yaml loading + alias resolution.
 *
 * Historically defined in scripts/authors-build.ts, which re-exports these
 * for backward compatibility (papers-backfill-authors.ts, authors-dupes.ts,
 * and authors-build.test.ts import them from "./authors-build.ts").
 */
import { readFileSync, existsSync } from "node:fs";
import { parse as parseYaml } from "yaml";

import { AUTHORS_YAML_PATH } from "./paths.ts";

/** One row of docs/papers/authors.yaml. Populated by `papers-backfill-authors.ts`
 *  (`bun run papers:backfill-authors`); hand-edited for corrections. Absence is
 *  still tolerated as a valid state (e.g. a fresh checkout before the first run). */
export interface AuthorRecord {
    id: string;
    name: string;
    orcid?: string;
    /** When set, this id is a duplicate identity merged into the canonical
     *  author id `mergedInto`. Merged rows never appear in `AuthorsIndex.authors`. */
    mergedInto?: string;
}

/** Reads docs/papers/authors.yaml. Tolerates absence or a malformed/non-list
 *  file by returning an empty array, for robustness on a checkout predating
 *  the registry or a corrupted edit — the file is normally present and populated. */
export function loadAuthorsYaml(): AuthorRecord[] {
    if (!existsSync(AUTHORS_YAML_PATH)) return [];
    const raw = readFileSync(AUTHORS_YAML_PATH, "utf-8");
    const parsed = parseYaml(raw);
    if (!Array.isArray(parsed)) {
        console.warn("authors:build — docs/papers/authors.yaml is not a list; authors will be empty");
        return [];
    }
    const records: AuthorRecord[] = [];
    for (const entry of parsed as AuthorRecord[]) {
        if (!entry?.id || !entry?.name) continue;
        records.push({
            id: entry.id,
            name: entry.name,
            ...(entry.orcid ? { orcid: entry.orcid } : {}),
            ...(entry.mergedInto ? { mergedInto: entry.mergedInto } : {}),
        });
    }
    return records;
}

/** Builds a cycle-safe id → canonical-id resolver from `mergedInto` rows, plus
 *  the flattened alias map (old id → final canonical id) for every id that
 *  resolves to something other than itself.
 *
 *  A normal chain (A→B→C, C has no `mergedInto`) resolves every id in it to
 *  the terminal id C. A cycle (A→B→A) has no terminal id, so every id in the
 *  cycle instead resolves to the lexicographically smallest id in that cycle
 *  — deterministic and stable regardless of which id is resolved first, so
 *  two ids that merge into each other never resolve to two different
 *  "canonical" ids. */
export function buildAliasResolver(authorRecords: AuthorRecord[]): {
    resolve: (id: string) => string;
    aliases: Record<string, string>;
} {
    const mergedInto = new Map<string, string>();
    for (const r of authorRecords) {
        if (r.mergedInto) mergedInto.set(r.id, r.mergedInto);
    }
    const canonical = new Map<string, string>();
    const resolve = (id: string): string => {
        const cached = canonical.get(id);
        if (cached) return cached;
        const path: string[] = [];
        let current = id;
        for (;;) {
            const already = canonical.get(current);
            if (already) {
                for (const p of path) canonical.set(p, already);
                return already;
            }
            const cycleStart = path.indexOf(current);
            if (cycleStart !== -1) {
                const cycle = path.slice(cycleStart);
                const cycleCanonical = [...cycle].sort()[0];
                for (const c of path) canonical.set(c, cycleCanonical);
                return cycleCanonical;
            }
            path.push(current);
            const next = mergedInto.get(current);
            if (!next) {
                for (const p of path) canonical.set(p, current);
                return current;
            }
            current = next;
        }
    };
    const aliases: Record<string, string> = {};
    for (const id of mergedInto.keys()) {
        const canonicalId = resolve(id);
        if (canonicalId !== id) aliases[id] = canonicalId;
    }
    return { resolve, aliases };
}
