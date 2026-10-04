import { shapeCorner, shapeFromCorner, shapeHandlePoint, type RotatedShape } from "@vitavision/stage2d";

import type { BBoxFeature, EllipseFeature } from "../../../store/editor/useEditorStore";

/*
 * The store keeps a rotated bbox and ellipse the way the editor's previous canvas drew them, and the
 * exported feature JSON says so: `rotation` in DEGREES, clockwise on screen; a bbox is its top-left corner `(x, y)` plus
 * `width` and `height` and turns ABOUT THAT CORNER; an ellipse is its centre `(x, y)` plus radii and
 * turns about its centre. `ShapeEditor` works on a `RotatedShape` instead: centre, full extents and
 * RADIANS about the centre. These functions are the only place the two meet, so the JSON keeps its
 * meaning while the editor gets the stage's shape tools.
 */

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

/** The geometry of a bbox feature. */
export type BBoxGeometry = Pick<BBoxFeature, "x" | "y" | "width" | "height" | "rotation">;
/** The geometry of an ellipse feature. */
export type EllipseGeometry = Pick<EllipseFeature, "x" | "y" | "radiusX" | "radiusY" | "rotation">;

/** The shape a bbox draws as: the same rectangle, turned about its centre. */
export function bboxToShape(bbox: BBoxGeometry): RotatedShape {
    return shapeFromCorner({ x: bbox.x, y: bbox.y }, bbox.width, bbox.height, bbox.rotation * DEG_TO_RAD);
}

/** The bbox geometry of an edited shape: the corner the rotation is about, the size, and degrees. */
export function shapeToBbox(shape: RotatedShape): BBoxGeometry {
    const corner = shapeCorner(shape);
    return { x: corner.x, y: corner.y, width: shape.width, height: shape.height, rotation: shape.rotation * RAD_TO_DEG };
}

/** The shape an ellipse draws as: its full axes `2·radius`, turned about its centre. */
export function ellipseToShape(ellipse: EllipseGeometry): RotatedShape {
    return {
        cx: ellipse.x,
        cy: ellipse.y,
        width: 2 * ellipse.radiusX,
        height: 2 * ellipse.radiusY,
        rotation: ellipse.rotation * DEG_TO_RAD,
    };
}

/** The ellipse geometry of an edited shape. */
export function shapeToEllipse(shape: RotatedShape): EllipseGeometry {
    return {
        x: shape.cx,
        y: shape.cy,
        radiusX: shape.width / 2,
        radiusY: shape.height / 2,
        rotation: shape.rotation * RAD_TO_DEG,
    };
}

/** The four corners of a rotated rectangle as a flat ring `[x0, y0, …]`, clockwise from the top-left. */
export function shapeRing(shape: RotatedShape): number[] {
    return (["nw", "ne", "se", "sw"] as const).flatMap((handle) => {
        const p = shapeHandlePoint(shape, handle);
        return [p.x, p.y];
    });
}

/** An ellipse as the overlay layer draws it: centre, semi-axes and the turn of the first one, in radians. */
export interface EllipseItem {
    id: string;
    x: number;
    y: number;
    rx: number;
    ry: number;
    angle: number;
}

/** The ellipse item of an ellipse feature (degrees to radians, about the centre). */
export function ellipseItem(id: string, ellipse: EllipseGeometry): EllipseItem {
    return { id, x: ellipse.x, y: ellipse.y, rx: ellipse.radiusX, ry: ellipse.radiusY, angle: ellipse.rotation * DEG_TO_RAD };
}
