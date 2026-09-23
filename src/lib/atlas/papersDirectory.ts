/**
 * Pure derivations for the Atlas Papers index (`/atlas?view=papers`).
 *
 * Combines paper metadata (`PapersById` — title/authors/venue/year) with the
 * scholarly index's per-paper citation data (primary/citing Atlas pages,
 * registry `citedBy`) into flat, sortable, searchable, decade-grouped rows.
 * No React, no fetching — `AtlasPapersView.tsx` and its `papersIndex/**`
 * pieces call these over already-loaded index data.
 */
import type { PapersById } from "./paperRefTypes.ts";
import type { ScholarlyIndex, ScholarlyPageMeta } from "./scholarlyTypes.ts";
import { shortAuthorList } from "./paperView.ts";

export interface PaperPageTag {
    slug: string;
    title: string;
    kind: ScholarlyPageMeta["kind"];
}

export interface PaperRow {
    id: string;
    year: number;
    title: string;
    venue: string;
    /** "Surname, Surname et al." — display byline. */
    authorsShort: string;
    /** Raw author display names, for search. */
    authorsRaw: readonly string[];
    /** Pages whose `sources.primary` is this paper (build-order = title A–Z). */
    primaryPages: PaperPageTag[];
    /** Distinct pages citing it as a reference only, beyond `primaryPages`. */
    citingPageCount: number;
    /** Registry papers citing this one (`ScholarlyPaper.citedBy.length`). */
    citedByCount: number;
    hasPage: boolean;
}

/** One row per paper in `papers`; citation data defaults to zero/empty when
 *  the scholarly index hasn't loaded yet or the paper carries no scholarly
 *  information (cited by nothing, cites nothing — see scholarly.ts). */
export function buildPaperRows(papers: PapersById, scholarly: ScholarlyIndex | undefined): PaperRow[] {
    return Object.values(papers).map((p) => {
        const sp = scholarly?.papers[p.id];
        const primaryPages: PaperPageTag[] = (sp?.primaryPages ?? [])
            .map((slug) => {
                const meta = scholarly?.pages[slug];
                return meta ? { slug, title: meta.title, kind: meta.kind } : undefined;
            })
            .filter((t): t is PaperPageTag => t !== undefined);
        return {
            id: p.id,
            year: p.year,
            title: p.title,
            venue: p.venue,
            authorsShort: shortAuthorList(p.authors),
            authorsRaw: p.authors,
            primaryPages,
            citingPageCount: sp?.citingPages.length ?? 0,
            citedByCount: sp?.citedBy.length ?? 0,
            hasPage: primaryPages.length > 0,
        };
    });
}

export type PapersFilter = "all" | "has-page" | "no-page";

export function filterPaperRows(rows: PaperRow[], filter: PapersFilter): PaperRow[] {
    if (filter === "has-page") return rows.filter((r) => r.hasPage);
    if (filter === "no-page") return rows.filter((r) => !r.hasPage);
    return rows;
}

export type PapersSort = "citedBy" | "newest" | "oldest";

function comparePaperRows(sort: PapersSort): (a: PaperRow, b: PaperRow) => number {
    switch (sort) {
        case "newest":
            return (a, b) => b.year - a.year || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
        case "oldest":
            return (a, b) => a.year - b.year || a.title.localeCompare(b.title) || a.id.localeCompare(b.id);
        case "citedBy":
        default:
            return (a, b) =>
                b.citedByCount - a.citedByCount ||
                b.year - a.year ||
                a.title.localeCompare(b.title) ||
                a.id.localeCompare(b.id);
    }
}

/** Stable-sorted copy — never mutates the input. */
export function sortPaperRows(rows: PaperRow[], sort: PapersSort): PaperRow[] {
    return [...rows].sort(comparePaperRows(sort));
}

/** Diacritic-insensitive, lowercased comparison key. */
export function normalizeSearchText(s: string): string {
    return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/** True when the title, venue, or any author name contains the (already
 *  normalized) search needle. An empty needle always matches. */
export function matchesPaperSearch(row: PaperRow, needle: string): boolean {
    if (!needle) return true;
    const haystack = [row.title, row.venue, ...row.authorsRaw].map(normalizeSearchText).join(" ␟ ");
    return haystack.includes(needle);
}

export interface PaperDecadeGroup {
    /** e.g. 2020 for "2020s". */
    decade: number;
    label: string;
    rows: PaperRow[];
}

export function decadeOf(year: number): number {
    return Math.floor(year / 10) * 10;
}

/** Groups (already-sorted) rows by decade, newest decade first. */
export function groupPapersByDecade(rows: PaperRow[]): PaperDecadeGroup[] {
    const byDecade = new Map<number, PaperRow[]>();
    for (const row of rows) {
        const decade = decadeOf(row.year);
        const list = byDecade.get(decade) ?? [];
        list.push(row);
        byDecade.set(decade, list);
    }
    return [...byDecade.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([decade, decadeRows]) => ({ decade, label: `${decade}s`, rows: decadeRows }));
}
