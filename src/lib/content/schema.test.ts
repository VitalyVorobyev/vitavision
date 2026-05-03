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

    it("accepts quality: historical with a typed relations entry", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Historical Method",
            date: "2026-05-03",
            summary: "Preserved for citation lineage.",
            tags: ["calibration"],
            author: "Vitaly Vorobyev",
            quality: "historical",
            relations: [
                { type: "generalized_by", target: "modern-method", confidence: "high" },
            ],
        });

        expect(parsed.quality).toBe("historical");
        expect(parsed.relations).toEqual([
            { type: "generalized_by", target: "modern-method", confidence: "high" },
        ]);
    });

    it("accepts a relation with a caution string", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Borderline Method",
            date: "2026-05-03",
            summary: "Testing relation caution.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
            relations: [
                {
                    type: "alternative_formulation_of",
                    target: "older-method",
                    confidence: "high",
                    caution: "Newer and more coupled, but not a universal replacement.",
                },
            ],
        });

        expect(parsed.relations?.[0]?.caution).toContain("not a universal replacement");
    });

    it("rejects unknown quality values", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Bad Quality",
            date: "2026-05-03",
            summary: "Testing rejection of unknown quality.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
            quality: "deprecated",
        })).toThrow();
    });

    it("rejects unknown relation types", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Bad Relation",
            date: "2026-05-03",
            summary: "Testing rejection of unknown relation types.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
            relations: [
                { type: "supersedes", target: "x", confidence: "high" },
            ],
        })).toThrow();
    });

    it("rejects relations missing confidence", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Missing Confidence",
            date: "2026-05-03",
            summary: "Testing required confidence field.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
            relations: [
                { type: "generalized_by", target: "x" },
            ],
        })).toThrow();
    });

    it("treats relations as optional", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Living Method",
            date: "2026-05-03",
            summary: "No relations needed.",
            tags: ["demo"],
            author: "Vitaly Vorobyev",
        });

        expect(parsed).not.toHaveProperty("relations");
    });
});
