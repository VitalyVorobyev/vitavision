import { describe, expect, it } from "vitest";
import { getNeighbors, shortTitle } from "./graphNeighbors";

describe("getNeighbors", () => {
    it("returns null for an unknown slug", () => {
        expect(getNeighbors("does-not-exist")).toBeNull();
    });

    it("returns a valid Neighbors object for 'chess-corners'", () => {
        const result = getNeighbors("chess-corners");
        expect(result).not.toBeNull();
        expect(result!.focus.slug).toBe("chess-corners");
        expect(result!.kind).toBe("algorithm");
    });

    it("chess-corners has at least one non-empty relation bucket", () => {
        const result = getNeighbors("chess-corners")!;
        const allBuckets = [
            ...result.prerequisites,
            ...result.extended_from,
            ...result.compared_with,
            ...result.extended_by,
            ...result.feeds_into,
            ...result.learned_by,
        ];
        expect(allBuckets.length).toBeGreaterThan(0);
    });

    it("chess-corners learned_by contains ccdn-checkerboard-detector", () => {
        const result = getNeighbors("chess-corners")!;
        expect(result.learned_by).toContain("ccdn-checkerboard-detector");
    });

    it("chess-corners feeds_into contains zhang-planar-calibration", () => {
        const result = getNeighbors("chess-corners")!;
        expect(result.feeds_into).toContain("zhang-planar-calibration");
    });

    it("no slug appears in more than one bucket", () => {
        const result = getNeighbors("chess-corners")!;
        const all = [
            ...result.prerequisites,
            ...result.extended_from,
            ...result.compared_with,
            ...result.extended_by,
            ...result.feeds_into,
            ...result.learned_by,
        ];
        const unique = new Set(all);
        expect(all.length).toBe(unique.size);
    });
});

describe("shortTitle", () => {
    it("returns text before a colon", () => {
        expect(shortTitle("SURF: Speeded-Up Robust Features")).toBe("SURF");
    });

    it("returns text before an en-dash", () => {
        expect(shortTitle("Felzenszwalb–Huttenlocher Graph-Based Image Segmentation")).toBe("Felzenszwalb");
    });

    it("falls back to first two words when no delimiter is present", () => {
        expect(shortTitle("Harris Corner Detector")).toBe("Harris Corner");
    });

    it("handles a single-word title", () => {
        expect(shortTitle("RANSAC")).toBe("RANSAC");
    });
});
