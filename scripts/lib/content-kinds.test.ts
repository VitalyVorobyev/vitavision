import { describe, it, expect } from "vitest";
import {
    slugFromFile,
    algoSlug,
    modelSlug,
    conceptSlug,
    narrativeSlug,
    demoSlug,
    blogSlug,
    HTML_LOADER_KIND_DESCRIPTORS,
} from "./content-kinds.ts";

describe("slugFromFile", () => {
    it("strips the .md extension for non-blog kinds", () => {
        expect(slugFromFile("algorithm", "chess-corners.md")).toBe("chess-corners");
        expect(slugFromFile("model", "alexnet.md")).toBe("alexnet");
        expect(slugFromFile("concept", "homography.md")).toBe("homography");
        expect(slugFromFile("narrative", "one-homography-is-not-enough.md")).toBe(
            "one-homography-is-not-enough",
        );
        expect(slugFromFile("demo", "some-demo.md")).toBe("some-demo");
    });

    it("strips a leading YYYY-MM-DD- date prefix for blog posts", () => {
        expect(slugFromFile("blog", "2026-01-15-some-post.md")).toBe("some-post");
    });

    it("leaves a blog filename without a date prefix unchanged", () => {
        expect(slugFromFile("blog", "some-post.md")).toBe("some-post");
    });
});

describe("per-kind convenience wrappers", () => {
    it("match slugFromFile for their kind", () => {
        expect(algoSlug("chess-corners.md")).toBe("chess-corners");
        expect(modelSlug("alexnet.md")).toBe("alexnet");
        expect(conceptSlug("homography.md")).toBe("homography");
        expect(narrativeSlug("some-narrative.md")).toBe("some-narrative");
        expect(demoSlug("some-demo.md")).toBe("some-demo");
        expect(blogSlug("2026-01-15-some-post.md")).toBe("some-post");
    });
});

describe("HTML_LOADER_KIND_DESCRIPTORS", () => {
    const kinds = ["blog", "algorithm", "demo", "model", "concept"] as const;

    it("has exactly one descriptor per non-narrative content kind", () => {
        expect(Object.keys(HTML_LOADER_KIND_DESCRIPTORS).sort()).toEqual([...kinds].sort());
    });

    it("keys each descriptor under its own kind", () => {
        for (const kind of kinds) {
            expect(HTML_LOADER_KIND_DESCRIPTORS[kind].kind).toBe(kind);
        }
    });

    it("gives every descriptor distinct, non-empty dir/file/export names", () => {
        const descriptors = Object.values(HTML_LOADER_KIND_DESCRIPTORS);
        for (const d of descriptors) {
            expect(d.htmlDirName.length).toBeGreaterThan(0);
            expect(d.loaderFileName.endsWith("-loaders.ts")).toBe(true);
            expect(d.loaderExportName.endsWith("HtmlLoaders")).toBe(true);
        }
        expect(new Set(descriptors.map((d) => d.htmlDirName)).size).toBe(descriptors.length);
        expect(new Set(descriptors.map((d) => d.loaderFileName)).size).toBe(descriptors.length);
        expect(new Set(descriptors.map((d) => d.loaderExportName)).size).toBe(descriptors.length);
    });
});
