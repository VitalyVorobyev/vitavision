import { v4 as uuidv4 } from "uuid";

import { ANNOTATION_COLORS } from "../../../store/editor/featureColors";
import type { Feature, ToolType } from "../../../store/editor/useEditorStore";

/*
 * What a finished drawing gesture turns into. Pure, so the minimum sizes and the vertex rules are
 * tested without a pointer. Coordinates are the stage's image coordinates (the centre of pixel
 * `i` at `i`), stored as they are.
 */

export interface Point2 {
    x: number;
    y: number;
}

/** A bbox or ellipse smaller than this on either side is a stray click, not a drawing (image pixels). */
export const MIN_SHAPE_SIZE = 5;
/** A line shorter than this on both axes is a stray click (image pixels). */
export const MIN_LINE_SPAN = 2;

/** The drag tools: a press, a drag and a release. */
export type DragTool = "LINE" | "BBOX" | "ELLIPSE";
/** The click-per-vertex tools. */
export type VertexTool = "POLYLINE" | "POLYGON";

export const isDragTool = (tool: ToolType): tool is DragTool => tool === "LINE" || tool === "BBOX" || tool === "ELLIPSE";
export const isVertexTool = (tool: ToolType): tool is VertexTool => tool === "POLYLINE" || tool === "POLYGON";

/** The feature a press-drag-release from `from` to `to` makes, or `null` when it was too small. */
export function featureFromDrag(tool: DragTool, from: Point2, to: Point2): Feature | null {
    if (tool === "LINE") {
        if (Math.abs(to.x - from.x) <= MIN_LINE_SPAN && Math.abs(to.y - from.y) <= MIN_LINE_SPAN) return null;
        return {
            id: uuidv4(),
            type: "line",
            source: "manual",
            points: [from.x, from.y, to.x, to.y],
            color: ANNOTATION_COLORS.line,
        };
    }

    const width = Math.abs(to.x - from.x);
    const height = Math.abs(to.y - from.y);
    if (!(width > MIN_SHAPE_SIZE && height > MIN_SHAPE_SIZE)) return null;
    if (tool === "BBOX") {
        return {
            id: uuidv4(),
            type: "bbox",
            source: "manual",
            x: Math.min(from.x, to.x),
            y: Math.min(from.y, to.y),
            width,
            height,
            rotation: 0,
            color: ANNOTATION_COLORS.bbox,
        };
    }
    return {
        id: uuidv4(),
        type: "ellipse",
        source: "manual",
        x: (from.x + to.x) / 2,
        y: (from.y + to.y) / 2,
        radiusX: width / 2,
        radiusY: height / 2,
        rotation: 0,
        color: ANNOTATION_COLORS.ellipse,
    };
}

/**
 * The vertices with a vertex that repeats the one before it dropped. A double-click that finishes a
 * shape is two clicks first, and each of them placed the same vertex.
 */
export function dedupeVertices(points: readonly number[]): number[] {
    const out: number[] = [];
    for (let i = 0; i + 1 < points.length; i += 2) {
        const x = points[i]!;
        const y = points[i + 1]!;
        if (out.length >= 2 && out[out.length - 2] === x && out[out.length - 1] === y) continue;
        out.push(x, y);
    }
    return out;
}

/** The feature a finished polyline or polygon makes, or `null` while it has too few vertices. */
export function featureFromVertices(tool: VertexTool, vertices: readonly number[]): Feature | null {
    const points = dedupeVertices(vertices);
    if (tool === "POLYLINE") {
        if (points.length < 4) return null;
        return { id: uuidv4(), type: "polyline", source: "manual", points, color: ANNOTATION_COLORS.polyline };
    }
    if (points.length < 6) return null;
    return { id: uuidv4(), type: "polygon", source: "manual", points, closed: true, color: ANNOTATION_COLORS.polygon };
}

/** The feature a click with the POINT tool makes. */
export function featureFromPoint(at: Point2): Feature {
    return { id: uuidv4(), type: "point", source: "manual", x: at.x, y: at.y, color: ANNOTATION_COLORS.point };
}

/** Whether a hand-drawn annotation can be picked up and moved: every manual annotation type that is not read-only. */
export function isMovable(feature: Feature): boolean {
    if (feature.readonly === true || feature.source !== "manual") return false;
    return ["point", "line", "polyline", "polygon", "bbox", "ellipse"].includes(feature.type);
}

/**
 * The geometry of a movable annotation after it moves by `delta`, as the partial an `updateFeature`
 * takes: a point, bbox or ellipse moves its anchor, a line, polyline or polygon every vertex.
 * A bbox turns about its corner and an ellipse about its centre, so moving the anchor moves the shape
 * whatever its rotation.
 */
export function movedGeometry(feature: Feature, delta: Point2): Partial<Feature> {
    switch (feature.type) {
        case "point":
        case "bbox":
        case "ellipse":
            return { x: feature.x + delta.x, y: feature.y + delta.y };
        case "line":
            return { points: feature.points.map((v, i) => v + (i % 2 === 0 ? delta.x : delta.y)) as typeof feature.points };
        case "polyline":
        case "polygon":
            return { points: feature.points.map((v, i) => v + (i % 2 === 0 ? delta.x : delta.y)) };
        default:
            return {};
    }
}
