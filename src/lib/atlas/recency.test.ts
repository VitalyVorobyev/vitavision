import { describe, it, expect } from "vitest";
import { isRecentlyAdded, selectRecentlyAdded, RECENT_SECTION_MAX } from "./recency.ts";

// Anchor at NOON UTC on purpose: the comparison must be calendar-day granular,
// so a non-midnight `now` (the realistic case — `now` is wall-clock time) must
// not shift the window edge. 30 days before 2026-06-28 = 2026-05-29 (boundary in),
// 31 days before = 2026-05-28 (out).
const NOW = new Date("2026-06-28T12:00:00Z");

describe("isRecentlyAdded", () => {
    it("returns true for a date exactly 30 days before now (boundary in)", () => {
        expect(isRecentlyAdded("2026-05-29", NOW)).toBe(true);
    });

    it("returns false for a date 31 days before now (boundary out)", () => {
        expect(isRecentlyAdded("2026-05-28", NOW)).toBe(false);
    });

    it("returns true for the same day as now", () => {
        expect(isRecentlyAdded("2026-06-28", NOW)).toBe(true);
    });

    it("returns true for a future date", () => {
        expect(isRecentlyAdded("2026-07-15", NOW)).toBe(true);
    });

    it("returns false for an invalid date string", () => {
        expect(isRecentlyAdded("not-a-date", NOW)).toBe(false);
    });

    it("keeps the boundary day in-window regardless of now's time-of-day", () => {
        // Regression guard: a date exactly 30 days ago must stay in-window for any
        // `now` during that day, not just at 00:00 UTC.
        for (const now of [
            new Date("2026-06-28T00:00:00Z"),
            new Date("2026-06-28T12:00:00Z"),
            new Date("2026-06-28T23:59:59Z"),
        ]) {
            expect(isRecentlyAdded("2026-05-29", now)).toBe(true);
            expect(isRecentlyAdded("2026-05-28", now)).toBe(false);
        }
    });
});

describe("selectRecentlyAdded", () => {
    it("filters out entries outside the recency window", () => {
        const entries = [
            { frontmatter: { date: "2026-06-20", title: "Recent" } },
            { frontmatter: { date: "2026-05-28", title: "Old" } },
        ];
        const result = selectRecentlyAdded(entries, NOW);
        expect(result).toHaveLength(1);
        expect(result[0].frontmatter.title).toBe("Recent");
    });

    it("sorts newest-first", () => {
        const entries = [
            { frontmatter: { date: "2026-06-01", title: "Older" } },
            { frontmatter: { date: "2026-06-20", title: "Newer" } },
            { frontmatter: { date: "2026-06-10", title: "Middle" } },
        ];
        const result = selectRecentlyAdded(entries, NOW);
        expect(result[0].frontmatter.title).toBe("Newer");
        expect(result[1].frontmatter.title).toBe("Middle");
        expect(result[2].frontmatter.title).toBe("Older");
    });

    it("tie-breaks equal dates by title ascending", () => {
        const entries = [
            { frontmatter: { date: "2026-06-15", title: "Zebra" } },
            { frontmatter: { date: "2026-06-15", title: "Alpha" } },
            { frontmatter: { date: "2026-06-15", title: "Mango" } },
        ];
        const result = selectRecentlyAdded(entries, NOW);
        expect(result[0].frontmatter.title).toBe("Alpha");
        expect(result[1].frontmatter.title).toBe("Mango");
        expect(result[2].frontmatter.title).toBe("Zebra");
    });

    it("caps the result length at RECENT_SECTION_MAX and keeps the newest", () => {
        // Build 10 in-window entries (more than RECENT_SECTION_MAX=8), newest first
        const entries = Array.from({ length: 10 }, (_, i) => ({
            frontmatter: {
                // dates: 2026-06-27, 2026-06-26, ..., 2026-06-18
                date: new Date(NOW.getTime() - i * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .slice(0, 10),
                title: `Entry ${String(i).padStart(2, "0")}`,
            },
        }));
        const result = selectRecentlyAdded(entries, NOW);
        expect(result).toHaveLength(RECENT_SECTION_MAX);
        // The 8 newest (i=0..7) should be kept
        expect(result[0].frontmatter.title).toBe("Entry 00");
        expect(result[RECENT_SECTION_MAX - 1].frontmatter.title).toBe("Entry 07");
    });
});
