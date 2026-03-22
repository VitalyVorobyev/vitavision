import { describe, it, expect, beforeEach } from "vitest";
import { useEditorStore, normalizeImportedFeatures, type Feature } from "./useEditorStore";

function makePoint(id: string, opts?: Partial<Feature>): Feature {
    return {
        id,
        type: "point",
        source: "manual",
        x: 10,
        y: 20,
        ...opts,
    } as Feature;
}

function makeAlgoPoint(id: string, algorithmId: string, runId: string): Feature {
    return {
        id,
        type: "point",
        source: "algorithm",
        algorithmId,
        runId,
        readonly: true,
        x: 10,
        y: 20,
    } as Feature;
}

describe("replaceAlgorithmFeatures", () => {
    beforeEach(() => {
        useEditorStore.setState({
            features: [],
            selectedFeatureId: null,
        });
    });

    it("replaces features for a specific algorithm", () => {
        const manual = makePoint("m1");
        const algoA = makeAlgoPoint("a1", "chess-corners", "run-1");
        const algoB = makeAlgoPoint("b1", "chessboard", "run-2");

        useEditorStore.setState({ features: [manual, algoA, algoB] });

        const newFeatures = [makePoint("a2"), makePoint("a3")];
        useEditorStore.getState().replaceAlgorithmFeatures("chess-corners", newFeatures);

        const result = useEditorStore.getState().features;
        expect(result).toHaveLength(4); // manual + algoB + 2 new
        expect(result.find((f) => f.id === "m1")).toBeDefined();
        expect(result.find((f) => f.id === "b1")).toBeDefined();
        expect(result.find((f) => f.id === "a1")).toBeUndefined();
        expect(result.find((f) => f.id === "a2")?.source).toBe("algorithm");
        expect(result.find((f) => f.id === "a2")?.readonly).toBe(true);
    });

    it("clears selected feature if it was replaced", () => {
        const algoA = makeAlgoPoint("a1", "chess-corners", "run-1");
        useEditorStore.setState({ features: [algoA], selectedFeatureId: "a1" });
        useEditorStore.getState().replaceAlgorithmFeatures("chess-corners", []);

        expect(useEditorStore.getState().selectedFeatureId).toBeNull();
    });

    it("preserves selected feature if it still exists", () => {
        const manual = makePoint("m1");
        useEditorStore.setState({ features: [manual], selectedFeatureId: "m1" });
        useEditorStore.getState().replaceAlgorithmFeatures("chess-corners", [makePoint("a1")]);

        expect(useEditorStore.getState().selectedFeatureId).toBe("m1");
    });
});

describe("normalizeImportedFeatures", () => {
    it("returns empty array for non-array input", () => {
        expect(normalizeImportedFeatures("not an array")).toEqual([]);
        expect(normalizeImportedFeatures(null)).toEqual([]);
        expect(normalizeImportedFeatures(42)).toEqual([]);
    });

    it("parses valid features", () => {
        const input = [
            { type: "point", x: 1, y: 2 },
            { type: "bbox", x: 0, y: 0, width: 10, height: 10, rotation: 0 },
        ];
        const result = normalizeImportedFeatures(input);
        expect(result).toHaveLength(2);
        expect(result[0].type).toBe("point");
        expect(result[1].type).toBe("bbox");
    });

    it("filters out invalid features", () => {
        const input = [
            { type: "point", x: 1, y: 2 },
            { type: "invalid_type", foo: "bar" },
            { type: "point" }, // missing x, y
        ];
        const result = normalizeImportedFeatures(input);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("point");
    });

    it("normalizes source and readonly for algorithm features", () => {
        const input = [
            { type: "point", x: 1, y: 2, source: "algorithm", algorithmId: "test", runId: "r1" },
        ];
        const result = normalizeImportedFeatures(input);
        expect(result[0].source).toBe("algorithm");
        expect(result[0].readonly).toBe(true);
    });

    it("parses ring_marker features", () => {
        const input = [{
            type: "ring_marker",
            x: 100,
            y: 200,
            outerEllipse: { cx: 100, cy: 200, a: 30, b: 20, angleDeg: 0 },
            innerEllipse: { cx: 100, cy: 200, a: 15, b: 10, angleDeg: 0 },
        }];
        const result = normalizeImportedFeatures(input);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("ring_marker");
    });

    it("parses aruco_marker features", () => {
        const input = [{
            type: "aruco_marker",
            x: 50,
            y: 60,
            corners: [0, 0, 10, 0, 10, 10, 0, 10],
        }];
        const result = normalizeImportedFeatures(input);
        expect(result).toHaveLength(1);
        expect(result[0].type).toBe("aruco_marker");
    });
});
