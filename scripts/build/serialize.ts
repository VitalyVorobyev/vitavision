/**
 * Frontmatter serialization for content:build.
 *
 * `processDirectory` (scripts/build/render.ts) returns zod-parsed frontmatter
 * with `date`/`updated` still as `Date` objects. Every content kind needs the
 * same transform before it can be JSON-serialized into a generated module:
 * stringify `date` (and `updated`, when present) to `YYYY-MM-DD`, leave every
 * other field untouched. `serializeContentEntry` is that one transform,
 * replacing five previously near-identical `serialize<Kind>Entry` copies.
 */

export function serializeDate(value: unknown): string {
    if (value instanceof Date) return value.toISOString().split("T")[0];
    return String(value);
}

/** Rewrites `frontmatter.date`/`frontmatter.updated` to ISO date strings, preserving all other fields and their order. */
function serializeFrontmatterDates(frontmatter: Record<string, unknown>): Record<string, unknown> {
    const { date, updated, ...rest } = frontmatter;
    return {
        ...rest,
        date: serializeDate(date),
        ...(updated !== undefined ? { updated: serializeDate(updated) } : {}),
    };
}

/**
 * Serializes one processed entry `{ slug, frontmatter, html }` into its output
 * shape `TOut` (e.g. `BlogEntry`, `AlgorithmEntry`, ...), stringifying dates.
 * Callers pin `TOut` via an explicit type argument — the runtime shape is
 * identical across every content kind that uses this serializer.
 */
export function serializeContentEntry<TOut extends { slug: string; frontmatter: unknown; html: string }>(
    entry: { slug: string; frontmatter: Record<string, unknown>; html: string },
): TOut {
    return {
        slug: entry.slug,
        frontmatter: serializeFrontmatterDates(entry.frontmatter),
        html: entry.html,
    } as TOut;
}

/**
 * Same date-serialization as `serializeContentEntry`, but for narratives, whose
 * caller (content-build.ts) needs the serialized frontmatter on its own —
 * ahead of chapter-slicing and graph resolution — rather than wrapped with slug/html.
 */
export function serializeNarrativeFrontmatter<TOut>(frontmatter: Record<string, unknown>): TOut {
    return serializeFrontmatterDates(frontmatter) as TOut;
}

/** Ascending by `frontmatter.title` — the sort every content kind but blog posts uses. */
export function byTitleAsc<T extends { frontmatter: { title: string } }>(a: T, b: T): number {
    return a.frontmatter.title.localeCompare(b.frontmatter.title);
}

/** Descending by `frontmatter.date` (already an ISO string) — blog posts' sort. */
export function byDateDesc<T extends { frontmatter: { date: string } }>(a: T, b: T): number {
    return b.frontmatter.date.localeCompare(a.frontmatter.date);
}

/**
 * The serialize → draft-filter → sort pipeline every content kind applies to its
 * `processDirectory` output before use. Replaces six previously near-identical
 * `.map(serialize*Entry).filter(...).sort(...)` chains in content-build.ts (one
 * per content kind) with one call each.
 */
export function serializeFilterSort<TOut extends { frontmatter: { draft?: boolean } }>(
    raw: { slug: string; frontmatter: Record<string, unknown>; html: string }[],
    includeDrafts: boolean,
    compare: (a: TOut, b: TOut) => number,
): TOut[] {
    return raw
        .map((e) => serializeContentEntry<TOut>(e))
        .filter((e) => includeDrafts || !e.frontmatter.draft)
        .sort(compare);
}
