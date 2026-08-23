import type { AuthorRef } from "../../generated/authors-index.ts";

/**
 * Lowercase, diacritic-free, punctuation-free comparison key.
 *
 * German umlauts and eszett are transliterated first (ü→ue, ß→ss), because the
 * two sources spell them differently: `docs/papers/index.yaml` display names
 * keep the original glyph ("P. Fürsattel") while OpenAlex records often carry
 * the ASCII transliteration ("Peter Fuersattel"). Plain diacritic stripping
 * would yield "fursattel" vs "fuersattel" and lose the match.
 */
function normalizeToken(token: string): string {
    return token
        .replace(/[äÄ]/g, "ae")
        .replace(/[öÖ]/g, "oe")
        .replace(/[üÜ]/g, "ue")
        .replace(/ß/g, "ss")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z]/g, "")
        .toLowerCase();
}

/** Surname key: last whitespace-separated token of a display name. */
function surnameKey(name: string): string {
    const parts = name.trim().split(/\s+/);
    return normalizeToken(parts[parts.length - 1] ?? name);
}

/** First-initial key: first letter of the first token, or "" when unavailable. */
function initialKey(name: string): string {
    const first = name.trim().split(/\s+/)[0] ?? "";
    return normalizeToken(first).slice(0, 1);
}

/**
 * Aligns a paper's display author strings (from the papers index, e.g. `"K. He"`)
 * with its OpenAlex author ids (from the authors index).
 *
 * The two arrays are *usually* position-aligned, but OpenAlex occasionally drops
 * an author, so lengths can differ (8 of 135 linked papers as of writing) and a
 * naive positional zip would mis-attribute every name after the gap. Matching is
 * therefore done on surname, in display order, consuming each id at most once:
 *
 * - exact surname match wins; when several unused ids share a surname, the one
 *   whose first initial also matches is preferred, else the earliest unused one;
 * - a display name with no surviving id match yields `undefined` (plain text).
 *
 * Returns an array parallel to `authors`, holding the author id or `undefined`.
 */
export function resolveAuthorIds(
    authors: string[],
    authorIds: string[] | undefined,
    authorsById: Record<string, AuthorRef>,
): (string | undefined)[] {
    if (!authorIds || authorIds.length === 0) return authors.map(() => undefined);

    const candidates = authorIds.map((id) => {
        const name = authorsById[id]?.name ?? "";
        return { id, surname: surnameKey(name), initial: initialKey(name), used: false };
    });

    return authors.map((display) => {
        const surname = surnameKey(display);
        if (!surname) return undefined;
        const matches = candidates.filter((c) => !c.used && c.surname === surname);
        if (matches.length === 0) return undefined;
        const initial = initialKey(display);
        const pick = matches.find((c) => c.initial === initial) ?? matches[0];
        pick.used = true;
        return pick.id;
    });
}
