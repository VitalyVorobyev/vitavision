import { describe, it, expect } from "vitest";
import { triangleArea, triangleMinAngle, circumcircle, pointInTriangle } from "../geometry";

describe("triangleArea", () => {
    it("right triangle (0,0),(1,0),(0,1) has area 0.5", () => {
        expect(triangleArea({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(0.5, 10);
    });

    it("larger right triangle (0,0),(4,0),(0,3) has area 6", () => {
        expect(triangleArea({ x: 0, y: 0 }, { x: 4, y: 0 }, { x: 0, y: 3 })).toBeCloseTo(6, 10);
    });
});

describe("triangleMinAngle", () => {
    it("equilateral triangle has min angle ≈ 60°", () => {
        const s = Math.sqrt(3) / 2;
        const minRad = triangleMinAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0.5, y: s });
        const minDeg = (minRad * 180) / Math.PI;
        expect(minDeg).toBeCloseTo(60, 5);
    });

    it("right isoceles triangle (0,0),(1,0),(0,1) min angle ≈ 45°", () => {
        const minRad = triangleMinAngle({ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 });
        const minDeg = (minRad * 180) / Math.PI;
        expect(minDeg).toBeCloseTo(45, 5);
    });
});

describe("circumcircle", () => {
    it("right triangle (0,0),(2,0),(0,2): center (1,1), radius √2", () => {
        const { cx, cy, r } = circumcircle({ x: 0, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 2 });
        expect(cx).toBeCloseTo(1, 9);
        expect(cy).toBeCloseTo(1, 9);
        expect(r).toBeCloseTo(Math.sqrt(2), 9);
    });

    it("equilateral triangle: all three vertices are on the circle", () => {
        const s = Math.sqrt(3) / 2;
        const a = { x: 0, y: 0 }, b = { x: 1, y: 0 }, c = { x: 0.5, y: s };
        const { cx, cy, r } = circumcircle(a, b, c);
        expect(Math.hypot(a.x - cx, a.y - cy)).toBeCloseTo(r, 9);
        expect(Math.hypot(b.x - cx, b.y - cy)).toBeCloseTo(r, 9);
        expect(Math.hypot(c.x - cx, c.y - cy)).toBeCloseTo(r, 9);
    });
});

describe("pointInTriangle", () => {
    const a = { x: 0, y: 0 }, b = { x: 4, y: 0 }, c = { x: 0, y: 4 };

    it("centroid is inside the triangle", () => {
        const centroid = { x: (0 + 4 + 0) / 3, y: (0 + 0 + 4) / 3 };
        expect(pointInTriangle(centroid, a, b, c)).toBe(true);
    });

    it("clearly outside point is not inside", () => {
        expect(pointInTriangle({ x: 5, y: 5 }, a, b, c)).toBe(false);
    });

    it("vertex is on the triangle boundary", () => {
        expect(pointInTriangle({ x: 0, y: 0 }, a, b, c)).toBe(true);
    });
});
