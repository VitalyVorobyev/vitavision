import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { algorithmFrontmatterSchema, blogFrontmatterSchema, modelFrontmatterSchema, tagValues, taskValues } from "./schema.ts";
import { taskLabels } from "./taskLabels.ts";

describe("blogFrontmatterSchema", () => {
    it("accepts updated metadata", () => {
        const parsed = blogFrontmatterSchema.parse({
            title: "Demo Post",
            date: "2026-03-29",
            summary: "Testing updated metadata.",
            tags: ["classical"],
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
            tags: ["classical"],
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
            tags: ["classical"],
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
            tags: ["classical"],
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
            tags: ["classical"],
        })).toThrow();
    });

    it("rejects malformed demoLinks", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Broken Demo Links",
            date: "2026-03-29",
            summary: "Testing invalid demo URLs.",
            tags: ["classical"],
            author: "Vitaly Vorobyev",
            demoLinks: ["not-a-url"],
        })).toThrow();
    });

    it("accepts quality: historical with a typed relations entry", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Historical Method",
            date: "2026-05-03",
            summary: "Preserved for citation lineage.",
            tags: ["classical"],
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
            tags: ["classical"],
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
            tags: ["classical"],
            author: "Vitaly Vorobyev",
            quality: "deprecated",
        })).toThrow();
    });

    it("rejects unknown relation types", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Bad Relation",
            date: "2026-05-03",
            summary: "Testing rejection of unknown relation types.",
            tags: ["classical"],
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
            tags: ["classical"],
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
            tags: ["classical"],
            author: "Vitaly Vorobyev",
        });

        expect(parsed).not.toHaveProperty("relations");
    });

    it("accepts an empty tasks array and rejects unknown task slugs", () => {
        const ok = algorithmFrontmatterSchema.parse({
            title: "Tagged Algorithm",
            date: "2026-05-03",
            summary: "Tagged with a known task.",
            tags: ["classical"],
            author: "Vitaly Vorobyev",
            tasks: ["camera-calibration"],
        });
        expect(ok.tasks).toEqual(["camera-calibration"]);

        expect(() => algorithmFrontmatterSchema.parse({
            title: "Bad Task",
            date: "2026-05-03",
            summary: "Unknown task slug.",
            tags: ["classical"],
            author: "Vitaly Vorobyev",
            tasks: ["video-segmentation"],
        })).toThrow();
    });
});

describe("modelFrontmatterSchema", () => {
    it("accepts the tasks field for models too", () => {
        const parsed = modelFrontmatterSchema.parse({
            title: "Tagged Model",
            date: "2026-05-03",
            summary: "Model tagged with multi-valued tasks.",
            tags: ["classical"],
            author: "Vitaly Vorobyev",
            tasks: ["feature-detection", "local-feature-matching"],
        });
        expect(parsed.tasks).toEqual(["feature-detection", "local-feature-matching"]);
    });
});

describe("tasks vocabulary", () => {
    it("stays in sync between content/tasks.yaml and taskValues", () => {
        const yamlPath = path.join(process.cwd(), "content/tasks.yaml");
        const yaml = parseYaml(readFileSync(yamlPath, "utf8")) as { tasks: { slug: string }[] };
        const yamlSlugs = yaml.tasks.map((t) => t.slug).sort();
        const codeSlugs = [...taskValues].sort();
        expect(yamlSlugs).toEqual(codeSlugs);
    });

    it("taskLabels has a key for every taskValues entry and no extra keys", () => {
        const labelKeys = Object.keys(taskLabels).sort();
        const schemaKeys = [...taskValues].sort();
        expect(labelKeys).toEqual(schemaKeys);
    });
});

describe("tags vocabulary", () => {
    it("stays in sync between content/tags.yaml and tagValues", () => {
        const yamlPath = path.join(process.cwd(), "content/tags.yaml");
        const yaml = parseYaml(readFileSync(yamlPath, "utf8")) as { tags: { slug: string }[] };
        const yamlSlugs = yaml.tags.map((t) => t.slug).sort();
        const codeSlugs = [...tagValues].sort();
        expect(yamlSlugs).toEqual(codeSlugs);
    });

    it("rejects an unknown tag on algorithmFrontmatterSchema", () => {
        expect(() => algorithmFrontmatterSchema.parse({
            title: "Bad Tags",
            date: "2026-05-16",
            summary: "Testing rejection of unknown tags.",
            tags: ["not-a-real-tag"],
            author: "Vitaly Vorobyev",
        })).toThrow();
    });

    it("accepts a known tag on algorithmFrontmatterSchema", () => {
        const parsed = algorithmFrontmatterSchema.parse({
            title: "Good Tags",
            date: "2026-05-16",
            summary: "Testing acceptance of known tags.",
            tags: ["classical"],
            author: "Vitaly Vorobyev",
        });
        expect(parsed.tags).toEqual(["classical"]);
    });
});
