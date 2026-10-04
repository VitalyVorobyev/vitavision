import { describe, expect, it } from "vitest";

import { bboxToShape, ellipseToShape, shapeRing, shapeToBbox, shapeToEllipse } from "./shapeConvert";

const close = (actual: number[], expected: number[]) => {
    expect(actual).toHaveLength(expected.length);
    expected.forEach((want, i) => expect(actual[i]).toBeCloseTo(want, 9));
};

describe("bbox <-> shape", () => {
    it("an unrotated bbox is centred on its middle", () => {
        expect(bboxToShape({ x: 10, y: 20, width: 40, height: 20, rotation: 0 })).toEqual({
            cx: 30,
            cy: 30,
            width: 40,
            height: 20,
            rotation: 0,
        });
    });

    it("turns about the top-left corner, as a rect always did here, not about the centre", () => {
        // 90 degrees clockwise about (10, 20): the width now runs down the screen, the height back to -x.
        const shape = bboxToShape({ x: 10, y: 20, width: 40, height: 20, rotation: 90 });
        expect(shape.rotation).toBeCloseTo(Math.PI / 2, 12);
        expect(shape.cx).toBeCloseTo(0, 9);
        expect(shape.cy).toBeCloseTo(40, 9);
        // The corner it turns about stays where it was: it is the shape's top-left corner.
        close(shapeRing(shape).slice(0, 2), [10, 20]);
    });

    it("round-trips x, y, size and degrees", () => {
        for (const rotation of [0, 15, 90, -40, 180, 359]) {
            const bbox = { x: 123.5, y: 45.25, width: 80, height: 30, rotation };
            const back = shapeToBbox(bboxToShape(bbox));
            close([back.x, back.y, back.width, back.height], [bbox.x, bbox.y, bbox.width, bbox.height]);
            // Degrees come back modulo a turn only through trigonometry, not through normalisation: compare the angle on the circle.
            expect(Math.cos((back.rotation * Math.PI) / 180)).toBeCloseTo(Math.cos((rotation * Math.PI) / 180), 9);
            expect(Math.sin((back.rotation * Math.PI) / 180)).toBeCloseTo(Math.sin((rotation * Math.PI) / 180), 9);
        }
    });

    it("keeps the degrees exactly when the shape is not turned past a half turn", () => {
        expect(shapeToBbox(bboxToShape({ x: 1, y: 2, width: 3, height: 4, rotation: 33 })).rotation).toBeCloseTo(33, 9);
    });
});

describe("ellipse <-> shape", () => {
    it("takes the radii to full axes and keeps the centre", () => {
        expect(ellipseToShape({ x: 50, y: 60, radiusX: 30, radiusY: 10, rotation: 0 })).toEqual({
            cx: 50,
            cy: 60,
            width: 60,
            height: 20,
            rotation: 0,
        });
    });

    it("turns about its centre: the centre does not move with the rotation", () => {
        const shape = ellipseToShape({ x: 50, y: 60, radiusX: 30, radiusY: 10, rotation: 70 });
        expect([shape.cx, shape.cy]).toEqual([50, 60]);
        expect(shape.rotation).toBeCloseTo((70 * Math.PI) / 180, 12);
    });

    it("round-trips", () => {
        const ellipse = { x: 50.5, y: 60.25, radiusX: 30, radiusY: 10, rotation: -25 };
        const back = shapeToEllipse(ellipseToShape(ellipse));
        close(
            [back.x, back.y, back.radiusX, back.radiusY, back.rotation],
            [ellipse.x, ellipse.y, ellipse.radiusX, ellipse.radiusY, ellipse.rotation],
        );
    });
});

describe("shapeRing", () => {
    it("lists the corners of an unrotated rectangle clockwise from the top-left", () => {
        close(shapeRing(bboxToShape({ x: 10, y: 20, width: 40, height: 20, rotation: 0 })), [10, 20, 50, 20, 50, 40, 10, 40]);
    });

    it("follows the rotation about the corner", () => {
        // 90 degrees clockwise about (10, 20): the top-left stays, the top-right goes straight down.
        close(shapeRing(bboxToShape({ x: 10, y: 20, width: 40, height: 20, rotation: 90 })), [10, 20, 10, 60, -10, 60, -10, 20]);
    });
});
