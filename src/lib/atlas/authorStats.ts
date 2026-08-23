import type { AuthorsIndex } from "../../generated/authors-index.ts";

/** One row of the /authors listing. */
export interface AuthorRow {
    id: string;
    name: string;
    orcid?: string;
    /** Papers in docs/papers/index.yaml credited to this author. */
    paperCount: number;
    /** Distinct atlas pages citing any of those papers. */
    pageCount: number;
    /** Surname-first collation key, lowercased and diacritic-free. */
    sortKey: string;
    /** Grouping letter for the A–Z view; "#" for non-Latin initials. */
    initial: string;
}

function deaccent(s: string): string {
    return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Surname-first collation key. The authors index stores natural-order display
 * names ("Kaiming He"), so the last whitespace token is used as the surname —
 * imperfect for compound surnames but stable, cheap, and correct for the great
 * majority of the register.
 */
export function authorSortKey(name: string): string {
    const parts = name.trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[parts.length - 1] : parts[0] ?? "";
    const rest = parts.slice(0, -1).join(" ");
    return deaccent(`${surname} ${rest}`).trim().toLowerCase();
}

/** Grouping letter for the A–Z view, derived from the same surname key. */
export function authorInitial(name: string): string {
    const first = authorSortKey(name).charAt(0).toUpperCase();
    return /^[A-Z]$/.test(first) ? first : "#";
}

/** Distinct, sorted atlas slugs citing any of the given papers. */
export function atlasSlugsForPapers(
    papers: string[],
    pagesByPaper: Record<string, string[]>,
): string[] {
    const slugs = new Set<string>();
    for (const paperId of papers) {
        for (const slug of pagesByPaper[paperId] ?? []) slugs.add(slug);
    }
    return [...slugs].sort();
}

/** Builds every /authors row from the index. Unsorted — callers pick the order. */
export function buildAuthorRows(index: AuthorsIndex): AuthorRow[] {
    return Object.entries(index.authors).map(([id, ref]) => ({
        id,
        name: ref.name,
        ...(ref.orcid ? { orcid: ref.orcid } : {}),
        paperCount: ref.papers.length,
        pageCount: atlasSlugsForPapers(ref.papers, index.pagesByPaper).length,
        sortKey: authorSortKey(ref.name),
        initial: authorInitial(ref.name),
    }));
}

/** A–Z by surname key; ties broken by id so the order is total and stable. */
export function compareByName(a: AuthorRow, b: AuthorRow): number {
    return a.sortKey.localeCompare(b.sortKey) || a.id.localeCompare(b.id);
}

/** Most papers first; ties fall back to the A–Z order. */
export function compareByPaperCount(a: AuthorRow, b: AuthorRow): number {
    return b.paperCount - a.paperCount || compareByName(a, b);
}

export interface CoAuthor {
    id: string;
    name: string;
    /** Papers this co-author shares with the subject author. */
    shared: number;
}

/**
 * Every other author sharing at least one paper with `authorId`, with the
 * shared-paper count. Ordered by shared count desc, then A–Z by surname.
 */
export function coAuthorsOf(authorId: string, index: AuthorsIndex): CoAuthor[] {
    const ref = index.authors[authorId];
    if (!ref) return [];
    const counts = new Map<string, number>();
    for (const paperId of ref.papers) {
        for (const other of index.paperAuthors[paperId] ?? []) {
            if (other === authorId) continue;
            counts.set(other, (counts.get(other) ?? 0) + 1);
        }
    }
    return [...counts.entries()]
        .map(([id, shared]) => ({ id, name: index.authors[id]?.name ?? id, shared }))
        .sort(
            (a, b) =>
                b.shared - a.shared ||
                authorSortKey(a.name).localeCompare(authorSortKey(b.name)) ||
                a.id.localeCompare(b.id),
        );
}

/** Splits name-ordered rows into `#`/A–Z groups, preserving the incoming order. */
export function groupByInitial(rows: AuthorRow[]): { letter: string; rows: AuthorRow[] }[] {
    const groups: { letter: string; rows: AuthorRow[] }[] = [];
    for (const row of rows) {
        const last = groups[groups.length - 1];
        if (last && last.letter === row.initial) last.rows.push(row);
        else groups.push({ letter: row.initial, rows: [row] });
    }
    return groups;
}
