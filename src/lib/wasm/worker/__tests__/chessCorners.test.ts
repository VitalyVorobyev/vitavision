import { describe, it, expect } from "vitest";
import { adaptChessCornersResult } from "../chessCorners";

/** Build a synthetic stride-7 `detect_rgba` output: x, y, response,
 * axis0_angle, axis0_sigma, axis1_angle, axis1_sigma per corner. */
function makeRaw(corners: Array<{ x: number; y: number; response: number }>): Float32Array {
    const out = new Float32Array(corners.length * 7);
    corners.forEach((c, i) => {
        out.set([c.x, c.y, c.response, 0.1 * i, 0.02, 0.1 * i + Math.PI / 2, 0.03], i * 7);
    });
    return out;
}

describe("adaptChessCornersResult", () => {
    it("throws when the buffer length is not a multiple of the stride", () => {
        const bad = new Float32Array(10); // not a multiple of 7
        expect(() => adaptChessCornersResult(bad, 100, 100, {}, 1)).toThrow(/unexpected output length/i);
    });

    it("maps a stride-7 buffer into corners with normalized coords and axes", () => {
        const raw = makeRaw([{ x: 10, y: 20, response: 50 }]);
        const result = adaptChessCornersResult(raw, 100, 200, {}, 5);

        expect(result.status).toBe("success");
        expect(result.image_width).toBe(100);
        expect(result.image_height).toBe(200);
        expect(result.corners).toHaveLength(1);

        const c = result.corners[0];
        expect(c.x).toBe(10);
        expect(c.y).toBe(20);
        expect(c.x_norm).toBeCloseTo(0.1);
        expect(c.y_norm).toBeCloseTo(0.1);
        expect(c.response).toBe(50);
        expect(c.axes).toHaveLength(2);
        expect(c.axes[0].direction.dx).toBeCloseTo(Math.cos(c.axes[0].angle_rad));
        expect(c.axes[0].direction.dy).toBeCloseTo(Math.sin(c.axes[0].angle_rad));
        // Single corner: response range is zero, so confidence defaults to 1 ("high").
        expect(c.confidence).toBe(1);
        expect(c.confidence_level).toBe("high");
    });

    it("sorts corners by confidence descending and buckets confidence levels", () => {
        const raw = makeRaw([
            { x: 0, y: 0, response: 10 },
            { x: 1, y: 1, response: 100 },
            { x: 2, y: 2, response: 55 },
        ]);
        const result = adaptChessCornersResult(raw, 10, 10, {}, 1);

        expect(result.corners.map((c) => c.response)).toEqual([100, 55, 10]);
        expect(result.corners[0].confidence).toBe(1);
        expect(result.corners[0].confidence_level).toBe("high");
        expect(result.corners[2].confidence).toBe(0);
        expect(result.corners[2].confidence_level).toBe("low");
    });

    it("drops non-finite corners", () => {
        const raw = makeRaw([{ x: NaN, y: 0, response: 10 }, { x: 1, y: 1, response: 20 }]);
        const result = adaptChessCornersResult(raw, 10, 10, {}, 1);
        expect(result.corners).toHaveLength(1);
        expect(result.summary.count).toBe(1);
    });

    it("handles an empty detection", () => {
        const result = adaptChessCornersResult(new Float32Array(0), 10, 10, {}, 1);
        expect(result.corners).toHaveLength(0);
        expect(result.summary.count).toBe(0);
        expect(result.summary.response_min).toBeNull();
        expect(result.summary.response_max).toBeNull();
        expect(result.summary.confidence_min).toBeNull();
    });

    it("falls back to config defaults when fields are absent", () => {
        const result = adaptChessCornersResult(new Float32Array(0), 10, 10, {}, 1);
        expect(result.config).toEqual({
            threshold: 30,
            nms_radius: 2,
            broad_mode: false,
            min_cluster_size: 2,
            pyramid_levels: 4,
            pyramid_min_size: 128,
            upscale_factor: 0,
            refiner: "center_of_mass",
        });
    });

    it("echoes explicit config overrides", () => {
        const result = adaptChessCornersResult(
            new Float32Array(0),
            10,
            10,
            { threshold: 15, nmsRadius: 3, broadMode: true, minClusterSize: 4, pyramidLevels: 2, pyramidMinSize: 64, upscaleFactor: 3, refiner: "forstner" },
            1,
        );
        expect(result.config).toEqual({
            threshold: 15,
            nms_radius: 3,
            broad_mode: true,
            min_cluster_size: 4,
            pyramid_levels: 2,
            pyramid_min_size: 64,
            upscale_factor: 3,
            refiner: "forstner",
        });
    });

    it("stamps runtime_ms into the summary", () => {
        const result = adaptChessCornersResult(new Float32Array(0), 10, 10, {}, 42.5);
        expect(result.summary.runtime_ms).toBe(42.5);
    });
});
