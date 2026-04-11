import { describe, it, expect } from "vitest";
import type { RadsymResult } from "../../types";
import type { CircleFeature } from "../../../store/editor/useEditorStore";

/** Mock a RadsymResult as the Worker would produce it. */
function mockRadsymResult(circleCount: number): RadsymResult {
    return {
        status: "success",
        key: "wasm://local",
        storage_mode: "local",
        image_width: 800,
        image_height: 600,
        frame: {
            name: "image_px_center",
            origin: "top_left",
            x_axis: "right",
            y_axis: "down",
            units: "pixels",
        },
        summary: {
            count: circleCount,
            runtime_ms: 25.3,
        },
        circles: Array.from({ length: circleCount }, (_, i) => ({
            id: crypto.randomUUID(),
            x: 100 + i * 40,
            y: 150 + i * 30,
            radius: 8 + i * 3,
            score: 0.9 - i * 0.1,
        })),
    };
}

/** Simulate the adapter's toFeatures logic. */
function toFeatures(result: RadsymResult, runId: string): CircleFeature[] {
    return result.circles.map((circle) => ({
        id: circle.id,
        type: "circle" as const,
        source: "algorithm" as const,
        algorithmId: "radsym",
        runId,
        readonly: true,
        x: circle.x + 0.5,
        y: circle.y + 0.5,
        radius: circle.radius,
        score: circle.score,
        label: `circle ${circle.id.slice(0, 8)}`,
    }));
}

/** Simulate the adapter's summary logic. */
function toSummary(result: RadsymResult) {
    return [
        { label: "Circles", value: `${result.summary.count}` },
        { label: "Runtime", value: `${result.summary.runtime_ms.toFixed(2)} ms` },
    ];
}

/** Simulate the adapter's diagnostics logic. */
function toDiagnostics(result: RadsymResult) {
    if (result.summary.count === 0) {
        return [{ level: "warning" as const, message: "No circles detected" }];
    }
    return [];
}

describe("Radsym toFeatures", () => {
    it("maps circles to CircleFeature array", () => {
        const result = mockRadsymResult(3);
        const features = toFeatures(result, "run-1");

        expect(features).toHaveLength(3);
        for (const f of features) {
            expect(f.type).toBe("circle");
            expect(f.source).toBe("algorithm");
            expect(f.algorithmId).toBe("radsym");
            expect(f.runId).toBe("run-1");
            expect(f.readonly).toBe(true);
            expect(typeof f.x).toBe("number");
            expect(typeof f.y).toBe("number");
            expect(f.radius).toBeGreaterThan(0);
            expect(typeof f.score).toBe("number");
        }
    });

    it("applies +0.5 pixel offset to center coordinates", () => {
        const result = mockRadsymResult(1);
        const features = toFeatures(result, "run-1");
        expect(features[0].x).toBe(result.circles[0].x + 0.5);
        expect(features[0].y).toBe(result.circles[0].y + 0.5);
    });

    it("preserves radius without modification", () => {
        const result = mockRadsymResult(1);
        const features = toFeatures(result, "run-1");
        expect(features[0].radius).toBe(result.circles[0].radius);
    });

    it("handles empty result", () => {
        const result = mockRadsymResult(0);
        const features = toFeatures(result, "run-1");
        expect(features).toHaveLength(0);
    });
});

describe("Radsym summary", () => {
    it("returns count and runtime", () => {
        const result = mockRadsymResult(5);
        const summary = toSummary(result);
        expect(summary).toHaveLength(2);
        expect(summary[0]).toEqual({ label: "Circles", value: "5" });
        expect(summary[1].label).toBe("Runtime");
        expect(summary[1].value).toContain("ms");
    });
});

describe("Radsym diagnostics", () => {
    it("warns when no circles detected", () => {
        const result = mockRadsymResult(0);
        const diags = toDiagnostics(result);
        expect(diags).toHaveLength(1);
        expect(diags[0].level).toBe("warning");
    });

    it("returns empty for successful detection", () => {
        const result = mockRadsymResult(5);
        const diags = toDiagnostics(result);
        expect(diags).toHaveLength(0);
    });
});
