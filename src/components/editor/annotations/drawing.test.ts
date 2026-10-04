import { describe, expect, it } from "vitest";

import { dedupeVertices, featureFromDrag, featureFromPoint, featureFromVertices, isMovable, movedGeometry } from "./drawing";

describe("featureFromDrag", () => {
    it("makes a bbox from either diagonal of the drag, with its top-left corner as x, y", () => {
        const down = featureFromDrag("BBOX", { x: 150, y: 100 }, { x: 450, y: 30 });
        expect(down).toMatchObject({ type: "bbox", x: 150, y: 30, width: 300, height: 70, rotation: 0 });
    });

    it("makes an ellipse centred between the corners", () => {
        expect(featureFromDrag("ELLIPSE", { x: 150, y: 420 }, { x: 350, y: 520 })).toMatchObject({
            type: "ellipse",
            x: 250,
            y: 470,
            radiusX: 100,
            radiusY: 50,
            rotation: 0,
        });
    });

    it("refuses a bbox or ellipse of 5 px or less on either side", () => {
        expect(featureFromDrag("BBOX", { x: 0, y: 0 }, { x: 5, y: 100 })).toBeNull();
        expect(featureFromDrag("ELLIPSE", { x: 0, y: 0 }, { x: 100, y: 5 })).toBeNull();
        expect(featureFromDrag("BBOX", { x: 0, y: 0 }, { x: 5.5, y: 5.5 })).not.toBeNull();
    });

    it("makes a line, and refuses one of 2 px or less on both axes", () => {
        expect(featureFromDrag("LINE", { x: 1, y: 2 }, { x: 30, y: 2 })).toMatchObject({ type: "line", points: [1, 2, 30, 2] });
        expect(featureFromDrag("LINE", { x: 1, y: 2 }, { x: 3, y: 4 })).toBeNull();
    });
});

describe("vertices", () => {
    it("drops a vertex that repeats the one before it", () => {
        expect(dedupeVertices([1, 2, 3, 4, 3, 4])).toEqual([1, 2, 3, 4]);
        expect(dedupeVertices([1, 2, 1, 2, 3, 4])).toEqual([1, 2, 3, 4]);
    });

    it("keeps a vertex that returns to an earlier place", () => {
        expect(dedupeVertices([1, 2, 3, 4, 1, 2])).toEqual([1, 2, 3, 4, 1, 2]);
    });

    it("needs two vertices for a polyline and three for a polygon", () => {
        expect(featureFromVertices("POLYLINE", [1, 2, 1, 2])).toBeNull();
        expect(featureFromVertices("POLYLINE", [1, 2, 3, 4])).toMatchObject({ type: "polyline", points: [1, 2, 3, 4] });
        expect(featureFromVertices("POLYGON", [1, 2, 3, 4, 3, 4])).toBeNull();
        expect(featureFromVertices("POLYGON", [1, 2, 3, 4, 5, 0])).toMatchObject({ type: "polygon", closed: true });
    });
});

describe("featureFromPoint", () => {
    it("stores the position as given", () => {
        expect(featureFromPoint({ x: 299.5, y: 199.5 })).toMatchObject({ type: "point", x: 299.5, y: 199.5, source: "manual" });
    });
});

describe("movedGeometry", () => {
    const delta = { x: 40, y: 30 };

    it("moves the anchor of a point, bbox and ellipse and leaves their size and rotation", () => {
        expect(movedGeometry({ id: "b", type: "bbox", source: "manual", x: 450, y: 330, width: 150, height: 100, rotation: 20 }, delta)).toEqual({ x: 490, y: 360 });
        expect(movedGeometry({ id: "p", type: "point", source: "manual", x: 1, y: 2 }, delta)).toEqual({ x: 41, y: 32 });
    });

    it("moves every vertex of a line, polyline and polygon", () => {
        expect(movedGeometry({ id: "l", type: "line", source: "manual", points: [0, 0, 10, 0] }, delta)).toEqual({ points: [40, 30, 50, 30] });
        expect(movedGeometry({ id: "g", type: "polygon", source: "manual", points: [0, 0, 10, 0, 5, 5], closed: true }, delta)).toEqual({
            points: [40, 30, 50, 30, 45, 35],
        });
    });
});

describe("isMovable", () => {
    it("is true for manual annotations only", () => {
        expect(isMovable({ id: "p", type: "point", source: "manual", x: 0, y: 0 })).toBe(true);
        expect(isMovable({ id: "p", type: "point", source: "algorithm", readonly: true, x: 0, y: 0 })).toBe(false);
        expect(isMovable({ id: "p", type: "point", source: "manual", readonly: true, x: 0, y: 0 })).toBe(false);
    });
});
