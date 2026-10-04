import { useMemo } from "react";
import {
    AreaSet,
    EllipseSet,
    PointSet,
    PolylineSet,
    overlayRole,
    translatePoints,
    type AreaSetItem,
    type EllipseSetItem,
    type PointSetItem,
    type PolylineSetItem,
} from "@vitavision/stage2d";

import type { Feature } from "../../../store/editor/useEditorStore";
import { bboxToShape, ellipseItem, shapeRing } from "./shapeConvert";

/** A feature being moved by a drag: drawn shifted by `delta` until the drag commits. */
export interface MoveDraft {
    id: string;
    delta: { x: number; y: number };
}

interface AnnotationLayersProps {
    /** The annotations to draw: manual points, lines, polylines, polygons, bboxes and ellipses. */
    features: readonly Feature[];
    selectedId: string | null;
    moving: MoveDraft | null;
    /** A feature `ShapeEditor` is drawing; it is left out here so it is not drawn twice. */
    editingId: string | null;
}

/** The overlay role a hand-drawn annotation is painted in: the model's, as opposed to a detection's. */
const ROLE = "model";

interface Items {
    points: PointSetItem[];
    lines: PolylineSetItem[];
    areas: AreaSetItem[];
    ellipses: EllipseSetItem[];
}

function buildItems(features: readonly Feature[], moving: MoveDraft | null, editingId: string | null): Items {
    const items: Items = { points: [], lines: [], areas: [], ellipses: [] };
    for (const feature of features) {
        if (feature.id === editingId) continue;
        const delta = moving?.id === feature.id ? moving.delta : { x: 0, y: 0 };
        const { id } = feature;
        switch (feature.type) {
            case "point":
                items.points.push({ id, x: feature.x + delta.x, y: feature.y + delta.y, kind: "dot", role: ROLE });
                break;
            case "line":
            case "polyline":
                items.lines.push({ id, points: translatePoints(feature.points, delta) });
                break;
            case "polygon":
                if (feature.closed) items.areas.push({ id, points: translatePoints(feature.points, delta), role: ROLE });
                else items.lines.push({ id, points: translatePoints(feature.points, delta) });
                break;
            case "bbox":
                items.areas.push({
                    id,
                    points: shapeRing(bboxToShape({ ...feature, x: feature.x + delta.x, y: feature.y + delta.y })),
                    role: ROLE,
                });
                break;
            case "ellipse":
                items.ellipses.push(ellipseItem(id, { ...feature, x: feature.x + delta.x, y: feature.y + delta.y }));
                break;
            default:
                break;
        }
    }
    return items;
}

/**
 * The hand-drawn annotations, one stage2d layer per geometry. Hit-testing is the layers' own
 * (`PointSet`, `PolylineSet`, `AreaSet`) and `EllipseSet`. Nothing here handles a pointer: the tool surface above asks `useStageHitTest`.
 */
export default function AnnotationLayers({ features, selectedId, moving, editingId }: AnnotationLayersProps) {
    const items = useMemo(() => buildItems(features, moving, editingId), [features, moving, editingId]);
    const selection = useMemo(() => (selectedId === null ? [] : [selectedId]), [selectedId]);
    const { ellipses } = items;

    return (
        <>
            {ellipses.length > 0 && <EllipseSet items={ellipses} role={ROLE} selectedIds={selection} label="Ellipses" />}
            {items.areas.length > 0 && <AreaSet items={items.areas} role={ROLE} selectedIds={selection} label="Regions" />}
            {items.lines.length > 0 && <PolylineSet items={items.lines} stroke={overlayRole(ROLE)} selected={selection} label="Lines" />}
            {items.points.length > 0 && <PointSet items={items.points} selectedIds={selection} label="Points" />}
        </>
    );
}
