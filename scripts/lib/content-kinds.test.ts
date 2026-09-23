import { describe, it, expect } from "vitest";
import {
    slugFromFile,
    algoSlug,
    modelSlug,
    conceptSlug,
    narrativeSlug,
    demoSlug,
    blogSlug,
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
