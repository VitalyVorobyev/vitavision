import { describe, expect, it } from "vitest";
import { algorithmFrontmatterSchema, blogFrontmatterSchema } from "./schema.ts";

describe("blogFrontmatterSchema", () => {
    it("accepts updated metadata", () => {
        const parsed = blogFrontmatterSchema.parse({
            title: "Demo Post",
            date: "2026-03-29",
            summary: "Testing updated metadata.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
            updated: "2026-03-30",
        });

        expect(parsed.updated).toEqual(new Date("2026-03-30"));
    });
});

describe("algorithmFrontmatterSchema", () => {
    it("normalizes legacy demoLink into demoLinks", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Demo Algorithm",
            date: "2026-03-29",
            summary: "Testing legacy demo link normalization.",
            tags: ["demo"],
            category: "corner-detection",
            author: "Vitaly Vorobyev",
            demoLink: "https://vitavision.dev/editor?algo=demo",
        });

        expect(parsed.demoLinks).toEqual(["https://vitavision.dev/editor?algo=demo"]);
        expect(parsed).not.toHaveProperty("demoLink");
    });

    it("prefers demoLinks when both demoLinks and demoLink are provided", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Demo Algorithm",
            date: "2026-03-29",
            summary: "Testing demoLinks precedence.",
            tags: ["demo"],
            category: "corner-detection",
            author: "Vitaly Vorobyev",
            demoLink: "https://vitavision.dev/editor?algo=legacy",
            demoLinks: ["https://vitavision.dev/editor?algo=current"],
        });

        expect(parsed.demoLinks).toEqual(["https://vitavision.dev/editor?algo=current"]);
    });

    it("accepts updated metadata", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Demo Algorithm",
            date: "2026-03-29",
            summary: "Testing updated metadata.",
            tags: ["demo"],
            category: "corner-detection",
            author: "Vitaly Vorobyev",
            updated: "2026-03-30",
        });

        expect(parsed.updated).toEqual(new Date("2026-03-30"));
    });

    it("requires the same publication metadata as blog posts", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Incomplete Algorithm",
            summary: "Missing date and author.",
            tags: ["demo"],
        })).toThrow();
    });

    it("rejects malformed demoLinks", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Broken Demo Links",
            date: "2026-03-29",
            summary: "Testing invalid demo URLs.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
            demoLinks: ["not-a-url"],
        })).toThrow();
    });
});
