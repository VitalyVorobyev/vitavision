import { describe, it, expect } from "vitest";
import { serializeDate, serializeContentEntry, serializeNarrativeFrontmatter, byTitleAsc, byDateDesc, serializeFilterSort } from "./serialize.ts";

describe("serializeDate", () => {
    it("formats a Date as YYYY-MM-DD", () => {
        expect(serializeDate(new Date("2024-03-15T00:00:00.000Z"))).toBe("2024-03-15");
    });

    it("stringifies a non-Date value as-is", () => {
        expect(serializeDate("already-a-string")).toBe("already-a-string");
        expect(serializeDate(undefined)).toBe("undefined");
    });
});

interface Fixture {
    slug: string;
    frontmatter: { title: string; date: string; updated?: string; summary: string };
    html: string;
}

describe("serializeContentEntry", () => {
    it("stringifies date and drops the Date object, keeping other fields and their order", () => {
        const raw = {
            slug: "chess-corners",
            frontmatter: { title: "Chess Corners", summary: "A summary", date: new Date("2024-01-01T00:00:00.000Z") },
            html: "<p>hi</p>",
        };
        const out = serializeContentEntry<Fixture>(raw);
        expect(out).toEqual({
            slug: "chess-corners",
            frontmatter: { title: "Chess Corners", summary: "A summary", date: "2024-01-01" },
            html: "<p>hi</p>",
        });
        expect(Object.keys(out.frontmatter)).toEqual(["title", "summary", "date"]);
    });

    it("serializes `updated` only when present", () => {
        const withUpdated = serializeContentEntry<Fixture>({
            slug: "s",
            frontmatter: { title: "T", summary: "S", date: new Date("2024-01-01"), updated: new Date("2024-02-02") },
            html: "",
        });
        expect(withUpdated.frontmatter.updated).toBe("2024-02-02");

        const withoutUpdated = serializeContentEntry<Fixture>({
            slug: "s",
            frontmatter: { title: "T", summary: "S", date: new Date("2024-01-01") },
            html: "",
        });
        expect(withoutUpdated.frontmatter).not.toHaveProperty("updated");
    });
});

describe("serializeNarrativeFrontmatter", () => {
    it("applies the same date transform without a slug/html wrapper", () => {
        const out = serializeNarrativeFrontmatter<{ title: string; date: string }>({
            title: "A Narrative",
            date: new Date("2025-06-01"),
        });
        expect(out).toEqual({ title: "A Narrative", date: "2025-06-01" });
    });
});

describe("byTitleAsc / byDateDesc", () => {
    it("sorts ascending by title", () => {
        const items = [{ frontmatter: { title: "Zebra" } }, { frontmatter: { title: "Apple" } }];
        expect(items.sort(byTitleAsc).map((i) => i.frontmatter.title)).toEqual(["Apple", "Zebra"]);
    });

    it("sorts descending by ISO date string", () => {
        const items = [{ frontmatter: { date: "2024-01-01" } }, { frontmatter: { date: "2025-01-01" } }];
        expect(items.sort(byDateDesc).map((i) => i.frontmatter.date)).toEqual(["2025-01-01", "2024-01-01"]);
    });
});

describe("serializeFilterSort", () => {
    it("serializes, drops drafts, and sorts in one pass", () => {
        const raw = [
            { slug: "b", frontmatter: { title: "Bravo", summary: "s", date: new Date("2024-01-01") }, html: "" },
            { slug: "a", frontmatter: { title: "Alpha", summary: "s", date: new Date("2024-01-01"), draft: true }, html: "" },
            { slug: "c", frontmatter: { title: "Charlie", summary: "s", date: new Date("2024-01-01") }, html: "" },
        ];
        const out = serializeFilterSort<{ slug: string; frontmatter: { title: string; draft?: boolean }; html: string }>(
            raw,
            false,
            byTitleAsc,
        );
        expect(out.map((e) => e.slug)).toEqual(["b", "c"]);
    });

    it("keeps drafts when includeDrafts is true", () => {
        const raw = [
            { slug: "a", frontmatter: { title: "Alpha", summary: "s", date: new Date("2024-01-01"), draft: true }, html: "" },
        ];
        const out = serializeFilterSort<{ slug: string; frontmatter: { title: string; draft?: boolean }; html: string }>(
            raw,
            true,
            byTitleAsc,
        );
        expect(out).toHaveLength(1);
    });
});
