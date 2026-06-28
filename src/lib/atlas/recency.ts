export const RECENT_WINDOW_DAYS = 30;
export const RECENT_SECTION_MAX = 8;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * True when `dateStr` (an ISO date string from frontmatter, e.g. "2026-06-27")
 * falls within the last RECENT_WINDOW_DAYS of `now`, OR is in the future.
 * Invalid/unparseable dates return false.
 */
export function isRecentlyAdded(dateStr: string, now: Date = new Date()): boolean {
    const t = new Date(dateStr).getTime();
    if (Number.isNaN(t)) return false;
    // Frontmatter dates are date-only, parsed at UTC midnight. Compare at
    // calendar-day granularity by flooring `now` to its UTC midnight before
    // applying the window — otherwise a date exactly RECENT_WINDOW_DAYS ago
    // falls just outside the cutoff for any `now` past 00:00 UTC, dropping
    // boundary-day entries for most of the day.
    const nowDay = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
    const cutoff = nowDay - RECENT_WINDOW_DAYS * DAY_MS;
    return t >= cutoff;
}

/**
 * Entries authored within the recency window, newest-first (tie-break title asc),
 * capped at RECENT_SECTION_MAX. Generic so it preserves the caller's entry shape
 * (including any discriminator like `kind`).
 */
export function selectRecentlyAdded<
    T extends { frontmatter: { date: string; title: string } },
>(entries: T[], now: Date = new Date()): T[] {
    return entries
        .filter((e) => isRecentlyAdded(e.frontmatter.date, now))
        .sort((a, b) => {
            const ta = new Date(a.frontmatter.date).getTime();
            const tb = new Date(b.frontmatter.date).getTime();
            if (tb !== ta) return tb - ta;
            return a.frontmatter.title.localeCompare(b.frontmatter.title, undefined, { sensitivity: "base" });
        })
        .slice(0, RECENT_SECTION_MAX);
}
