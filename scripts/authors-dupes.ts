// scripts/authors-dupes.ts
//
// Reports candidate duplicate author identities in docs/papers/authors.yaml:
// same ORCID on different ids, same normalised surname + first initial on
// different ids, and initials-only display names. Read-only — never writes
// anything. Run with `bun run authors:dupes`; review and hand-fix
// docs/papers/authors.yaml (add `mergedInto:`) as a separate step.

import { loadAuthorsYaml, loadPaperAuthorIds } from "./authors-build.ts";
import type { AuthorRecord } from "./authors-build.ts";
import { deaccent } from "./lib/text.ts";

export interface AuthorDupeCandidate {
    ids: string[];
    names: string[];
    /** Paper ids credited to each id, keyed by id. */
    papers: Record<string, string[]>;
    reason: string;
}

/** `surname|first-initial` key, diacritic-free and lowercased. Middle tokens
 *  (middle names/initials) are ignored — only the first and last token count. */
function surnameInitialKey(name: string): string {
    const parts = deaccent(name.trim()).split(/\s+/).filter(Boolean);
    if (parts.length < 2) return deaccent(name).toLowerCase();
    const surname = parts[parts.length - 1].replace(/[.,]/g, "").toLowerCase();
    const firstInitial = parts[0].charAt(0).toLowerCase();
    return `${surname}|${firstInitial}`;
}

/** Cycle-safe id → canonical-id resolver built from `mergedInto` rows, mirroring
 *  scripts/authors-build.ts's internal resolver (kept local — this script only
 *  needs it to skip pairs already resolved). */
function buildResolver(records: AuthorRecord[]): (id: string) => string {
    const mergedInto = new Map<string, string>();
    for (const r of records) {
        if (r.mergedInto) mergedInto.set(r.id, r.mergedInto);
    }
    const cache = new Map<string, string>();
    return function resolve(id: string): string {
        const cached = cache.get(id);
        if (cached) return cached;
        const seen = new Set<string>([id]);
        let current = id;
        while (mergedInto.has(current)) {
            const next = mergedInto.get(current)!;
            if (seen.has(next)) break;
            seen.add(next);
            current = next;
        }
        cache.set(id, current);
        return current;
    };
}

/**
 * Pure duplicate-identity scan over authors.yaml rows + each id's papers.
 * Skips any group whose ids already resolve to the same canonical id via
 * `mergedInto` — those are already handled.
 */
export function findAuthorDupes(
    records: AuthorRecord[],
    paperAuthorIds: { paperId: string; authorIds: string[] }[],
): AuthorDupeCandidate[] {
    const resolve = buildResolver(records);
    const byId = new Map(records.map((r) => [r.id, r]));

    const papersByAuthor = new Map<string, string[]>();
    for (const { paperId, authorIds } of paperAuthorIds) {
        for (const id of authorIds) {
            const list = papersByAuthor.get(id);
            if (list) list.push(paperId);
            else papersByAuthor.set(id, [paperId]);
        }
    }

    const makeRow = (ids: string[], reason: string): AuthorDupeCandidate => {
        const sortedIds = [...ids].sort();
        return {
            ids: sortedIds,
            names: sortedIds.map((id) => byId.get(id)?.name ?? id),
            papers: Object.fromEntries(sortedIds.map((id) => [id, [...(papersByAuthor.get(id) ?? [])].sort()])),
            reason,
        };
    };

    const candidates: AuthorDupeCandidate[] = [];

    // (a) same ORCID on different ids.
    const byOrcid = new Map<string, string[]>();
    for (const r of records) {
        if (!r.orcid) continue;
        const list = byOrcid.get(r.orcid);
        if (list) list.push(r.id);
        else byOrcid.set(r.orcid, [r.id]);
    }
    for (const [orcid, ids] of byOrcid) {
        if (new Set(ids.map(resolve)).size > 1) {
            candidates.push(makeRow(ids, `same ORCID (${orcid}) on different ids`));
        }
    }

    // (b) same normalised surname + first initial on different ids.
    const byNameKey = new Map<string, string[]>();
    for (const r of records) {
        const key = surnameInitialKey(r.name);
        const list = byNameKey.get(key);
        if (list) list.push(r.id);
        else byNameKey.set(key, [r.id]);
    }
    for (const [key, ids] of byNameKey) {
        if (ids.length < 2) continue;
        if (new Set(ids.map(resolve)).size > 1) {
            candidates.push(makeRow(ids, `same surname + first initial ("${key.replace("|", " ")}") on different ids`));
        }
    }

    // (c) initials-only display names ("A. Something") not already merged away.
    for (const r of records) {
        if (/^[A-Z]\.\s/.test(r.name) && resolve(r.id) === r.id) {
            candidates.push(
                makeRow([r.id], `initials-only display name ("${r.name}") — possible fragmentary duplicate`),
            );
        }
    }

    return candidates;
}

function formatPapersCell(ids: string[], papers: Record<string, string[]>): string {
    return ids.map((id) => `${id}: ${papers[id]?.length ? papers[id].join(", ") : "(none)"}`).join("<br>");
}

function formatMarkdownTable(candidates: AuthorDupeCandidate[]): string {
    if (candidates.length === 0) return "No candidate duplicate author identities found.\n";
    const header = "| Ids | Names | Papers | Reason |\n| --- | --- | --- | --- |\n";
    const rows = candidates.map(
        (c) => `| ${c.ids.join(", ")} | ${c.names.join(", ")} | ${formatPapersCell(c.ids, c.papers)} | ${c.reason} |`,
    );
    return header + rows.join("\n") + "\n";
}

if (import.meta.main) {
    const records = loadAuthorsYaml();
    const paperAuthorIds = loadPaperAuthorIds();
    const candidates = findAuthorDupes(records, paperAuthorIds);
    process.stdout.write(`authors:dupes — ${candidates.length} candidate split(s) found.\n\n`);
    process.stdout.write(formatMarkdownTable(candidates));
}
