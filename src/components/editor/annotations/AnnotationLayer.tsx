import { useState } from "react";
import { DraftShape, ShapeEditor, useStageHitTest } from "@vitavision/stage2d";

import type { Feature, ToolType } from "../../../store/editor/useEditorStore";
import type { DrawingController } from "../hooks/useDrawing";
import AnnotationLayers, { type MoveDraft } from "./AnnotationLayers";
import { isMovable, movedGeometry, type Point2 } from "./drawing";
import { bboxToShape, ellipseToShape, shapeToBbox, shapeToEllipse } from "./shapeConvert";
import ToolSurface, { type Gesture, type Press } from "./ToolSurface";

interface AnnotationLayerProps {
    tool: ToolType;
    drawing: DrawingController;
    /** The visible hand-drawn annotations. */
    annotations: readonly Feature[];
    /** Every feature by id, so a hit on any layer (a detection's too) maps back to its feature. */
    featureById: ReadonlyMap<string, Feature>;
    selectedId: string | null;
    onSelect: (id: string | null) => void;
    onUpdate: (id: string, partial: Partial<Feature>) => void;
    /** A touch tap picked a feature (or the background): the touch counterpart of hovering it. */
    onTap?: ((feature: Feature | null, client: Point2) => void) | undefined;
}

/**
 * Everything the user draws and edits by hand, and the tool surface that drives it: the annotation
 * layers, the draft, the one press target and the shape editor, in the order they must stack (the
 * surface under the editor's handles, above every layer it hit-tests).
 *
 * In SELECT a press is a hit-test (`useStageHitTest`, across the detection overlay's layers too),
 * never a handler on an element: a hit selects, and on a hand-drawn shape also starts moving it.
 * A selected bbox or ellipse is edited by `ShapeEditor` (handles, rotation, move) instead.
 */
export default function AnnotationLayer({
    tool,
    drawing,
    annotations,
    featureById,
    selectedId,
    onSelect,
    onUpdate,
    onTap,
}: AnnotationLayerProps) {
    const { hitTest } = useStageHitTest();
    const [moving, setMoving] = useState<MoveDraft | null>(null);
    const [edit, setEdit] = useState<{ id: string; shape: ReturnType<typeof bboxToShape> } | null>(null);

    const selected = selectedId === null ? null : (featureById.get(selectedId) ?? null);
    const editable = tool === "SELECT" && selected !== null && isMovable(selected) && (selected.type === "bbox" || selected.type === "ellipse")
        ? selected
        : null;

    const beginSelect = (press: Press): Gesture => {
        const hit = hitTest(press.point, press.radius);
        const feature = hit ? featureById.get(String(hit.id)) : undefined;
        const pick = () => {
            onSelect(feature?.id ?? null);
            if (press.touch) onTap?.(feature ?? null, press.client);
        };
        if (!feature || !isMovable(feature)) return { immediate: pick };
        return {
            immediate: pick,
            // On touch only a shape that is already selected is picked up; a finger on any other starts a pan.
            claimsTouch: feature.id === selectedId,
            onMove: (delta) => setMoving({ id: feature.id, delta }),
            onEnd: (delta, moved) => {
                setMoving(null);
                if (moved) onUpdate(feature.id, movedGeometry(feature, delta));
            },
            onCancel: () => setMoving(null),
        };
    };

    const editorValue = editable
        ? edit?.id === editable.id
            ? edit.shape
            : editable.type === "bbox"
              ? bboxToShape(editable)
              : editable.type === "ellipse"
                ? ellipseToShape(editable)
                : null
        : null;

    return (
        <>
            <AnnotationLayers
                features={annotations}
                selectedId={selectedId}
                moving={moving}
                editingId={editable?.id ?? null}
            />
            <DraftShape shape={drawing.preview} />
            <ToolSurface
                begin={(press) => (tool === "SELECT" ? beginSelect(press) : drawing.begin(press))}
                cursor={tool === "SELECT" ? undefined : "crosshair"}
                onHover={drawing.hover}
                onDoubleClick={() => {
                    drawing.finish();
                }}
            />
            {editable && editorValue && (
                <ShapeEditor
                    kind={editable.type === "bbox" ? "rect" : "ellipse"}
                    value={editorValue}
                    label={editable.type === "bbox" ? "Bounding box" : "Ellipse"}
                    onValueChange={(shape) => setEdit({ id: editable.id, shape })}
                    onCommit={(shape) => {
                        onUpdate(editable.id, editable.type === "bbox" ? shapeToBbox(shape) : shapeToEllipse(shape));
                        setEdit(null);
                    }}
                />
            )}
        </>
    );
}
