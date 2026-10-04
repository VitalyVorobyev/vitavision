import { useCallback, useState } from "react";
import type { DraftShapeSpec } from "@vitavision/stage2d";

import type { Feature, ToolType } from "../../../store/editor/useEditorStore";
import {
    featureFromDrag,
    featureFromPoint,
    featureFromVertices,
    isDragTool,
    isVertexTool,
    type DragTool,
    type Point2,
    type VertexTool,
} from "../annotations/drawing";
import type { Gesture, Press } from "../annotations/ToolSurface";

/** The shape being drawn: a drag between two corners, or the vertices placed so far. */
type Draft =
    | { tool: DragTool; from: Point2; to: Point2 }
    | { tool: VertexTool; points: number[] };

const DRAG_KINDS = { LINE: "line", BBOX: "rect", ELLIPSE: "ellipse" } as const;

export interface DrawingController {
    /** The gesture a press starts with the active drawing tool; `null` for SELECT, which the selection handles. */
    begin: (press: Press) => Gesture | null;
    /** The mouse moved: the segment on from the last vertex follows it. */
    hover: (point: Point2) => void;
    /** Finish a polyline or polygon with the vertices placed so far; whether there was a shape to finish. */
    finish: () => boolean;
    /** The dashed preview of what is being drawn. */
    preview: DraftShapeSpec | null;
    /** Vertices have been placed: the touch "Finish shape" button is there to be pressed. */
    hasVertices: boolean;
}

/**
 * The drawing tools' state: the draft, and what each press, drag and double-click does with it.
 *
 * The draft belongs to one tool activation: switching tools (which bumps `toolVersion`) drops it,
 * without an effect, by ignoring a draft made under another version.
 */
export function useDrawing(tool: ToolType, toolVersion: number, addFeature: (feature: Feature) => void): DrawingController {
    const [state, setState] = useState<{ version: number; draft: Draft | null }>({ version: toolVersion, draft: null });
    const [cursor, setCursor] = useState<Point2 | undefined>(undefined);
    const draft = state.version === toolVersion ? state.draft : null;

    const setDraft = useCallback((next: Draft | null) => setState({ version: toolVersion, draft: next }), [toolVersion]);

    const vertexTool = isVertexTool(tool) ? tool : null;

    const finish = useCallback((): boolean => {
        if (!vertexTool || !draft || !("points" in draft)) return false;
        const feature = featureFromVertices(vertexTool, draft.points);
        if (!feature) return false;
        addFeature(feature);
        setDraft(null);
        return true;
    }, [vertexTool, draft, addFeature, setDraft]);

    const begin = (press: Press): Gesture | null => {
        const at = press.point;
        if (tool === "POINT") {
            return { onEnd: (_delta, moved) => { if (!moved) addFeature(featureFromPoint(at)); } };
        }
        if (isDragTool(tool)) {
            const to = (delta: Point2): Point2 => ({ x: at.x + delta.x, y: at.y + delta.y });
            return {
                onMove: (delta) => setDraft({ tool, from: at, to: to(delta) }),
                onEnd: (delta, moved) => {
                    setDraft(null);
                    const feature = moved ? featureFromDrag(tool, at, to(delta)) : null;
                    if (feature) addFeature(feature);
                },
                onCancel: () => setDraft(null),
            };
        }
        if (vertexTool) {
            return {
                onEnd: (_delta, moved) => {
                    if (moved) return;
                    const placed = draft && "points" in draft ? draft.points : [];
                    setDraft({ tool: vertexTool, points: [...placed, at.x, at.y] });
                },
            };
        }
        return null;
    };

    const preview: DraftShapeSpec | null = !draft
        ? null
        : "points" in draft
          ? { kind: draft.tool === "POLYLINE" ? "polyline" : "polygon", points: draft.points, cursor }
          : { kind: DRAG_KINDS[draft.tool], from: draft.from, to: draft.to };

    return {
        begin,
        hover: (point) => {
            if (draft && "points" in draft) setCursor(point);
        },
        finish,
        preview,
        hasVertices: draft !== null && "points" in draft && draft.points.length > 0,
    };
}
