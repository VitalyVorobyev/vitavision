import { describe, it, expect } from "vitest";
import { computeHomography, applyHomography } from "../homography";

describe("computeHomography", () => {
    it("identity: unit square corners map to themselves", () => {
        const corners: [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
        ] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
        const H = computeHomography(corners);
        const result = applyHomography(H, { x: 0.5, y: 0.5 });
        expect(result.x).toBeCloseTo(0.5, 9);
        expect(result.y).toBeCloseTo(0.5, 9);
    });

    it("identity: corner (0,0) maps to (0,0)", () => {
        const corners: [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
        ] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
        const H = computeHomography(corners);
        const r = applyHomography(H, { x: 0, y: 0 });
        expect(r.x).toBeCloseTo(0, 9);
        expect(r.y).toBeCloseTo(0, 9);
    });

    it("translation: corners shifted by (10,5)", () => {
        const dx = 10, dy = 5;
        const corners: [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
        ] = [
            { x: 0 + dx, y: 0 + dy },
            { x: 1 + dx, y: 0 + dy },
            { x: 1 + dx, y: 1 + dy },
            { x: 0 + dx, y: 1 + dy },
        ];
        const H = computeHomography(corners);
        const r00 = applyHomography(H, { x: 0, y: 0 });
        expect(r00.x).toBeCloseTo(dx, 9);
        expect(r00.y).toBeCloseTo(dy, 9);
        const r11 = applyHomography(H, { x: 1, y: 1 });
        expect(r11.x).toBeCloseTo(1 + dx, 9);
        expect(r11.y).toBeCloseTo(1 + dy, 9);
    });

    it("non-affine trapezoid: corners map exactly to themselves", () => {
        // Trapezoid: TL=(0,0), TR=(4,0), BR=(3,2), BL=(1,2)
        const corners: [
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
            { x: number; y: number },
        ] = [{ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 3, y: 2 }, { x: 1, y: 2 }];
        const H = computeHomography(corners);
        const srcCorners = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
        for (let i = 0; i < 4; i++) {
            const r = applyHomography(H, srcCorners[i]);
            expect(r.x).toBeCloseTo(corners[i].x, 9);
            expect(r.y).toBeCloseTo(corners[i].y, 9);
        }
    });
});
