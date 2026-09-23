import type { AuthorsIndex } from "../../generated/authors-index.ts";

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

export interface CoAuthor {
    id: string;
    name: string;
    /** Papers this co-author shares with the subject author. */
    shared: number;
    /** Paper ids shared with the subject author, as given by the scholarly
     *  index's `coauthorPapers` table (oldest first). */
    sharedPaperIds: string[];
}

/**
 * Every other author sharing at least one paper with `authorId`, with the
 * shared-paper count (from the build-time `AuthorsIndex.coauthors` edge
 * table) and the shared paper ids themselves (from the scholarly index's
 * `coauthorPapers` table — no client-side scan over `paperAuthors`). Ordered
 * by shared count desc, then A–Z by surname.
 */
export function coAuthorsOf(
    authorId: string,
    index: AuthorsIndex,
    coauthorPapers: Record<string, Record<string, string[]>>,
): CoAuthor[] {
    const row = index.coauthors[authorId];
    if (!row) return [];
    const sharedWith = coauthorPapers[authorId] ?? {};
    return Object.entries(row)
        .map(([id, shared]) => ({
            id,
            name: index.authors[id]?.name ?? id,
            shared,
            sharedPaperIds: sharedWith[id] ?? [],
        }))
        .sort(
            (a, b) =>
                b.shared - a.shared ||
                authorSortKey(a.name).localeCompare(authorSortKey(b.name)) ||
                a.id.localeCompare(b.id),
        );
}
