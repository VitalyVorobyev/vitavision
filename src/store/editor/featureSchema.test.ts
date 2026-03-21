import { describe, it, expect } from "vitest";
import { featureSchema, featuresArraySchema } from "./featureSchema";

describe("featureSchema", () => {
    it("accepts a valid point feature", () => {
        const result = featureSchema.safeParse({
            type: "point",
            x: 10,
            y: 20,
        });
        expect(result.success).toBe(true);
    });

    it("accepts a valid bbox feature", () => {
        const result = featureSchema.safeParse({
            type: "bbox",
            x: 0,
            y: 0,
            width: 100,
            height: 50,
            rotation: 0,
        });
        expect(result.success).toBe(true);
    });

    it("accepts a valid line feature", () => {
        const result = featureSchema.safeParse({
            type: "line",
            points: [0, 0, 100, 100],
        });
        expect(result.success).toBe(true);
    });

    it("accepts a valid polygon feature", () => {
        const result = featureSchema.safeParse({
            type: "polygon",
            points: [0, 0, 100, 0, 50, 100],
            closed: true,
        });
        expect(result.success).toBe(true);
    });

    it("accepts a valid ellipse feature", () => {
        const result = featureSchema.safeParse({
            type: "ellipse",
            x: 50,
            y: 50,
            radiusX: 30,
            radiusY: 20,
            rotation: 45,
        });
        expect(result.success).toBe(true);
    });

    it("accepts a valid directed_point feature", () => {
        const result = featureSchema.safeParse({
            type: "directed_point",
            x: 10,
            y: 20,
            direction: { dx: 1, dy: 0 },
            score: 0.95,
        });
        expect(result.success).toBe(true);
    });

    it("rejects unknown feature type", () => {
        const result = featureSchema.safeParse({
            type: "unknown",
            x: 0,
            y: 0,
        });
        expect(result.success).toBe(false);
    });

    it("rejects point missing required fields", () => {
        const result = featureSchema.safeParse({
            type: "point",
            x: 10,
            // y is missing
        });
        expect(result.success).toBe(false);
    });

    it("rejects polygon with insufficient points", () => {
        const result = featureSchema.safeParse({
            type: "polygon",
            points: [0, 0, 100, 0], // needs at least 6
            closed: true,
        });
        expect(result.success).toBe(false);
    });

    it("defaults source to manual and generates id", () => {
        const result = featureSchema.safeParse({
            type: "point",
            x: 10,
            y: 20,
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.source).toBe("manual");
            expect(result.data.id).toBeDefined();
        }
    });

    it("preserves meta fields", () => {
        const result = featureSchema.safeParse({
            type: "point",
            x: 10,
            y: 20,
            meta: {
                kind: "corner",
                score: 0.99,
                grid: { i: 3, j: 4 },
            },
        });
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data.meta?.kind).toBe("corner");
            expect(result.data.meta?.grid?.i).toBe(3);
        }
    });
});

describe("featuresArraySchema", () => {
    it("accepts an empty array", () => {
        const result = featuresArraySchema.safeParse([]);
        expect(result.success).toBe(true);
    });

    it("accepts a mixed array of feature types", () => {
        const result = featuresArraySchema.safeParse([
            { type: "point", x: 1, y: 2 },
            { type: "bbox", x: 0, y: 0, width: 10, height: 10, rotation: 0 },
        ]);
        expect(result.success).toBe(true);
        if (result.success) {
            expect(result.data).toHaveLength(2);
        }
    });

    it("rejects if any element is invalid", () => {
        const result = featuresArraySchema.safeParse([
            { type: "point", x: 1, y: 2 },
            { type: "invalid" },
        ]);
        expect(result.success).toBe(false);
    });
});
