import { describe, it, expect } from "vitest";
import { isRecentlyAdded, selectRecentlyAdded, RECENT_SECTION_MAX } from "./recency.ts";

// Anchor: 2026-06-28T00:00:00Z (midnight UTC so ISO date strings align exactly)
// 30 days before = 2026-05-29T00:00:00Z  →  "2026-05-29" is exactly on the boundary
// 31 days before = 2026-05-28T00:00:00Z  →  "2026-05-28" is one day outside
const NOW = new Date("2026-06-28T00:00:00Z");

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
