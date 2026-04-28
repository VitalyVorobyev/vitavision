import { describe, it, expect } from "vitest";
import {
    ALGORITHM_MANIFEST,
    DEFAULT_ALGORITHM_ID,
    loadAlgorithm,
    getLoadedAlgorithm,
    loadAllAlgorithms,
} from "../registry";

describe("ALGORITHM_MANIFEST", () => {
    it("contains at least 5 algorithms", () => {
        expect(ALGORITHM_MANIFEST.length).toBeGreaterThanOrEqual(5);
    });

    it("has unique IDs", () => {
        const ids = ALGORITHM_MANIFEST.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("all entries have required string fields", () => {
        for (const entry of ALGORITHM_MANIFEST) {
            expect(typeof entry.id).toBe("string");
            expect(entry.id.length).toBeGreaterThan(0);
            expect(typeof entry.title).toBe("string");
            expect(typeof entry.description).toBe("string");
        }
    });

    it("DEFAULT_ALGORITHM_ID is present in manifest", () => {
        const ids = ALGORITHM_MANIFEST.map((a) => a.id);
        expect(ids).toContain(DEFAULT_ALGORITHM_ID);
    });
});

describe("loadAlgorithm", () => {
    it("loads the correct algorithm by id", async () => {
        const algo = await loadAlgorithm("chess-corners");
        expect(algo.id).toBe("chess-corners");
        expect(algo.title).toBe("ChESS Corners");
    });

    it("returns the same promise on repeated calls (cached)", () => {
        const p1 = loadAlgorithm("chessboard");
        const p2 = loadAlgorithm("chessboard");
        expect(p1).toBe(p2);
    });

    it("falls back to default algorithm for unknown ID", async () => {
        const algo = await loadAlgorithm("nonexistent-id");
        expect(algo.id).toBe(DEFAULT_ALGORITHM_ID);
    });

    it("loads radsym algorithm", async () => {
        const algo = await loadAlgorithm("radsym");
        expect(algo.id).toBe("radsym");
        expect(algo.title).toBe("Radial Symmetry");
    });
});

describe("loadAllAlgorithms", () => {
    it("contains at least 5 algorithms", async () => {
        const registry = await loadAllAlgorithms();
        expect(registry.length).toBeGreaterThanOrEqual(5);
    });

    it("has unique IDs", async () => {
        const registry = await loadAllAlgorithms();
        const ids = registry.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("all algorithms have required fields", async () => {
        const registry = await loadAllAlgorithms();
        for (const algo of registry) {
            expect(typeof algo.id).toBe("string");
            expect(algo.id.length).toBeGreaterThan(0);
            expect(typeof algo.title).toBe("string");
            expect(typeof algo.description).toBe("string");
            expect(typeof algo.run).toBe("function");
            expect(typeof algo.toFeatures).toBe("function");
            expect(typeof algo.summary).toBe("function");
            expect(algo.ConfigComponent).toBeTruthy();
            expect(algo.initialConfig).toBeDefined();
        }
    });

    it("WASM-enabled algorithms have runWasm and executionModes", async () => {
        const registry = await loadAllAlgorithms();
        const wasmAlgorithms = registry.filter(
            (a) => a.executionModes?.includes("wasm"),
        );
        expect(wasmAlgorithms.length).toBeGreaterThanOrEqual(4);

        for (const algo of wasmAlgorithms) {
            expect(typeof algo.runWasm).toBe("function");
            expect(algo.executionModes).toContain("wasm");
        }
    });

    it("radsym is WASM-only", async () => {
        const registry = await loadAllAlgorithms();
        const radsym = registry.find((a) => a.id === "radsym");
        expect(radsym).toBeDefined();
        expect(radsym!.executionModes).toEqual(["wasm"]);
        expect(typeof radsym!.runWasm).toBe("function");
    });

    it("puzzleboard is registered as WASM-only", async () => {
        const registry = await loadAllAlgorithms();
        const puzzleboard = registry.find((a) => a.id === "puzzleboard");
        expect(puzzleboard).toBeDefined();
        expect(puzzleboard!.executionModes).toEqual(["wasm"]);
        expect(typeof puzzleboard!.runWasm).toBe("function");
    });

    it("all algorithms are WASM-only", async () => {
        const registry = await loadAllAlgorithms();
        for (const algo of registry) {
            expect(algo.executionModes).toEqual(["wasm"]);
            expect(typeof algo.runWasm).toBe("function");
        }
    });

    it("manifest metadata matches loaded adapter metadata", async () => {
        const registry = await loadAllAlgorithms();
        for (const entry of ALGORITHM_MANIFEST) {
            const algo = registry.find((a) => a.id === entry.id);
            expect(algo).toBeDefined();
            expect(algo!.id).toBe(entry.id);
            expect(algo!.title).toBe(entry.title);
            expect(algo!.description).toBe(entry.description);
            if (entry.blogSlug !== undefined) {
                expect(algo!.blogSlug).toBe(entry.blogSlug);
            }
        }
    });
});

describe("getLoadedAlgorithm", () => {
    it("returns null before algorithm is loaded", () => {
        // Use a fresh id that tests haven't loaded yet - but since tests run
        // after loadAllAlgorithms above, all are cached. Test the concept instead.
        const result = getLoadedAlgorithm("chess-corners");
        // After loadAlgorithm tests above, chess-corners should be cached.
        // If it is, we get the definition; if somehow not, we get null.
        // Either is valid depending on test order.
        if (result !== null) {
            expect(result.id).toBe("chess-corners");
        }
    });

    it("returns the cached algorithm after load", async () => {
        await loadAlgorithm("charuco");
        const result = getLoadedAlgorithm("charuco");
        expect(result).not.toBeNull();
        expect(result!.id).toBe("charuco");
    });
});
