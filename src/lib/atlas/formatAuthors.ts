/** One rendered byline segment: the displayed last name plus the index of the
 *  author it came from, so callers can look up a parallel array (e.g. author ids). */
export interface AuthorBylineSegment {
    lastName: string;
    index: number;
}

/** Byline as structured segments: the first 4 last-names, plus an `etAl` flag.
 *  Consumed by `AuthorByline` to render a compact byline with per-name links. */
export function authorsShortSegments(authors: string[]): {
    segments: AuthorBylineSegment[];
    etAl: boolean;
} {
    const segments = authors.map((a, index) => ({
        lastName: a.trim().split(/\s+/).pop() ?? a,
        index,
    }));
    if (segments.length <= 4) return { segments, etAl: false };
    return { segments: segments.slice(0, 4), etAl: true };
}
