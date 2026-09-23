/**
 * Pure derivations for the Atlas People directory (`/atlas?view=people`).
 *
 * Combines the scholarly index (domains/pageCount/first-last year — see
 * `scholarlyTypes.ts`) with the authors index (display name/orcid/paper
 * count — `../../generated/authors-index.ts`) into flat, sortable,
 * searchable, groupable rows. No React, no fetching — `AtlasPeopleView.tsx`
 * and its `directory/**` pieces call these over already-loaded index data.
 */
import type { ScholarlyIndex } from "./scholarlyTypes.ts";
import type { AuthorsIndex } from "../../generated/authors-index.ts";
import type { PapersById } from "./paperRefTypes.ts";
import { authorSortKey } from "./authorStats.ts";
import { domainLabels } from "../../components/algorithms/domainLabels.ts";
import type { Domain } from "../content/schema.ts";

/** Sentinel "domain" for a person whose papers reach no published Atlas page. */
export const NOT_YET_CITED_DOMAIN = "__not-yet-cited__";

export function domainLabel(domain: string): string {
    return domain === NOT_YET_CITED_DOMAIN
        ? "Not yet cited"
        : (domainLabels[domain as Domain] ?? domain);
}

export interface PeopleRow {
    id: string;
    name: string;
    orcid?: string;
    papers: number;
    pages: number;
    /** Every domain reached, largest-page-count first (raw domain keys). */
    domains: string[];
    /** `domains[0]`, or `NOT_YET_CITED_DOMAIN` when the person reaches no page. */
    mainDomain: string;
    firstYear: number;
    lastYear: number;
    /** Surname-first collation key — `authorStats.ts#authorSortKey`. */
    sortKey: string;
}

/** Every canonical author in the scholarly index (already alias-resolved by
 *  the build), enriched with display name/orcid/paper count. */
export function buildPeopleRows(scholarly: ScholarlyIndex, authorsIndex: AuthorsIndex): PeopleRow[] {
    return Object.entries(scholarly.authors).map(([id, author]) => {
        const ref = authorsIndex.authors[id];
        const name = ref?.name ?? id;
        return {
            id,
            name,
            ...(ref?.orcid ? { orcid: ref.orcid } : {}),
            papers: ref?.papers.length ?? 0,
            pages: author.pageCount,
            domains: author.domains.map((d) => d.domain),
            mainDomain: author.domains[0]?.domain ?? NOT_YET_CITED_DOMAIN,
            firstYear: author.firstYear,
            lastYear: author.lastYear,
            sortKey: authorSortKey(name),
        };
    });
}

export interface DomainChip {
    domain: string;
    label: string;
    count: number;
}

/** One chip per main domain reached by at least one person, largest group
 *  first; "Not yet cited" always sorts last regardless of size. */
export function computeDomainChips(rows: PeopleRow[]): DomainChip[] {
    const counts = new Map<string, number>();
    for (const row of rows) counts.set(row.mainDomain, (counts.get(row.mainDomain) ?? 0) + 1);
    const chips = [...counts.entries()].map(([domain, count]) => ({
        domain,
        label: domainLabel(domain),
        count,
    }));
    chips.sort((a, b) => {
        if (a.domain === NOT_YET_CITED_DOMAIN) return 1;
        if (b.domain === NOT_YET_CITED_DOMAIN) return -1;
        return b.count - a.count || a.label.localeCompare(b.label);
    });
    return chips;
}

export type PeopleSort = "reach" | "name" | "earliest";

function comparePeopleRows(sort: PeopleSort): (a: PeopleRow, b: PeopleRow) => number {
    switch (sort) {
        case "name":
            return (a, b) => a.sortKey.localeCompare(b.sortKey) || a.id.localeCompare(b.id);
        case "earliest":
            return (a, b) => a.firstYear - b.firstYear || a.sortKey.localeCompare(b.sortKey) || a.id.localeCompare(b.id);
        case "reach":
        default:
            return (a, b) =>
                b.pages - a.pages ||
                b.papers - a.papers ||
                a.sortKey.localeCompare(b.sortKey) ||
                a.id.localeCompare(b.id);
    }
}

/** Stable-sorted copy — never mutates the input. */
export function sortPeopleRows(rows: PeopleRow[], sort: PeopleSort): PeopleRow[] {
    return [...rows].sort(comparePeopleRows(sort));
}

/** Diacritic-insensitive, lowercased comparison key, e.g. "Hervé Jégou" and
 *  "herve jegou" both normalize to "herve jegou". */
export function normalizeSearchText(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** Every registry paper title credited to an author, for the "name or a
 *  paper title" search — titles come from the papers index, not the
 *  scholarly/authors indexes, so this needs `papersById` too. */
export function paperTitlesForAuthor(
    authorId: string,
    authorsIndex: AuthorsIndex,
    papersById: PapersById,
): string[] {
    const ref = authorsIndex.authors[authorId];
    if (!ref) return [];
    return ref.papers.map((p) => papersById[p]?.title).filter((t): t is string => Boolean(t));
}

/** True when `row.name` or any of `paperTitles` contains the (already
 *  normalized) search needle. An empty needle always matches. */
export function matchesPeopleSearch(row: PeopleRow, needle: string, paperTitles: string[]): boolean {
    if (!needle) return true;
    if (normalizeSearchText(row.name).includes(needle)) return true;
    return paperTitles.some((t) => normalizeSearchText(t).includes(needle));
}

export interface PeopleDomainGroup {
    domain: string;
    label: string;
    rows: PeopleRow[];
}

/** Groups (already-sorted) rows by main domain; group order follows the
 *  domain-chip order (largest group first, "Not yet cited" last). Domains
 *  with no matching row (e.g. after a search) are omitted. */
export function groupPeopleByDomain(rows: PeopleRow[], chips: DomainChip[]): PeopleDomainGroup[] {
    const byDomain = new Map<string, PeopleRow[]>();
    for (const row of rows) {
        const list = byDomain.get(row.mainDomain) ?? [];
        list.push(row);
        byDomain.set(row.mainDomain, list);
    }
    return chips
        .filter((c) => byDomain.has(c.domain))
        .map((c) => ({ domain: c.domain, label: c.label, rows: byDomain.get(c.domain)! }));
}
