import { describe, it, expect } from "vitest";
import { ALGORITHM_REGISTRY, getAlgorithmById, DEFAULT_ALGORITHM_ID } from "../registry";

describe("ALGORITHM_REGISTRY", () => {
    it("contains at least 5 algorithms", () => {
        expect(ALGORITHM_REGISTRY.length).toBeGreaterThanOrEqual(5);
    });

    it("has unique IDs", () => {
        const ids = ALGORITHM_REGISTRY.map((a) => a.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it("all algorithms have required fields", () => {
        for (const algo of ALGORITHM_REGISTRY) {
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

    it("WASM-enabled algorithms have runWasm and executionModes", () => {
        const wasmAlgorithms = ALGORITHM_REGISTRY.filter(
            (a) => a.executionModes?.includes("wasm"),
        );
        expect(wasmAlgorithms.length).toBeGreaterThanOrEqual(4);

        for (const algo of wasmAlgorithms) {
            expect(typeof algo.runWasm).toBe("function");
            expect(algo.executionModes).toContain("wasm");
        }
    });

    it("radsym is WASM-only", () => {
        const radsym = ALGORITHM_REGISTRY.find((a) => a.id === "radsym");
        expect(radsym).toBeDefined();
        expect(radsym!.executionModes).toEqual(["wasm"]);
        expect(typeof radsym!.runWasm).toBe("function");
    });

    it("puzzleboard is registered as WASM-only", () => {
        const puzzleboard = ALGORITHM_REGISTRY.find((a) => a.id === "puzzleboard");
        expect(puzzleboard).toBeDefined();
        expect(puzzleboard!.executionModes).toEqual(["wasm"]);
        expect(typeof puzzleboard!.runWasm).toBe("function");
    });

    it("all algorithms are WASM-only", () => {
        for (const algo of ALGORITHM_REGISTRY) {
            expect(algo.executionModes).toEqual(["wasm"]);
            expect(typeof algo.runWasm).toBe("function");
        }
    });
});

describe("getAlgorithmById", () => {
    it("returns the correct algorithm", () => {
        const algo = getAlgorithmById("chess-corners");
        expect(algo.id).toBe("chess-corners");
    });

    it("returns first algorithm for unknown ID", () => {
        const algo = getAlgorithmById("nonexistent");
        expect(algo.id).toBe(DEFAULT_ALGORITHM_ID);
    });

    it("returns radsym algorithm", () => {
        const algo = getAlgorithmById("radsym");
        expect(algo.id).toBe("radsym");
        expect(algo.title).toBe("Radial Symmetry");
    });
});
