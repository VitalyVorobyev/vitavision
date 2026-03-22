import { useCallback, useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import type Konva from "konva";
import type { Feature, ToolType } from "../../../store/editor/useEditorStore";

interface DrawingParams {
    activeTool: ToolType;
    addFeature: (feature: Feature) => void;
    setSelectedFeatureId: (id: string | null) => void;
    getRelativePointerPosition: () => { x: number; y: number } | null;
}

export function useDrawingHandlers({
    activeTool,
    addFeature,
    setSelectedFeatureId,
    getRelativePointerPosition,
}: DrawingParams) {
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentLinePoints, setCurrentLinePoints] = useState<number[]>([]);
    const [currentBBoxPos, setCurrentBBoxPos] = useState<{ x: number; y: number } | null>(null);
    const [currentBBoxDims, setCurrentBBoxDims] = useState<{ w: number; h: number } | null>(null);
    const [currentLinePos, setCurrentLinePos] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    const resetDrafts = useCallback(() => {
        setIsDrawing(false);
        setCurrentLinePoints([]);
        setCurrentBBoxPos(null);
        setCurrentBBoxDims(null);
        setCurrentLinePos(null);
    }, []);

    useEffect(() => {
        if (activeTool === "POINT" || activeTool === "SELECT") {
            setCurrentBBoxPos(null);
            setCurrentBBoxDims(null);
            setCurrentLinePos(null);
        }
        if (activeTool !== "POLYLINE" && activeTool !== "POLYGON") {
            setCurrentLinePoints([]);
            if (activeTool !== "LINE") {
                setIsDrawing(false);
            }
        }
    }, [activeTool]);

    const updateDrawingOnMove = (pos: { x: number; y: number }) => {
        if ((activeTool === "BBOX" || activeTool === "ELLIPSE") && isDrawing && currentBBoxPos) {
            setCurrentBBoxDims({
                w: pos.x - currentBBoxPos.x,
                h: pos.y - currentBBoxPos.y,
            });
        } else if (activeTool === "LINE" && isDrawing && currentLinePos) {
            setCurrentLinePos({ ...currentLinePos, x2: pos.x, y2: pos.y });
        }
    };

    const startDragShape = () => {
        const pos = getRelativePointerPosition();
        if (!pos) return;

        if (activeTool === "SELECT") {
            return;
        }

        if (activeTool === "BBOX" || activeTool === "ELLIPSE") {
            setIsDrawing(true);
            setCurrentBBoxPos({ x: pos.x, y: pos.y });
            setCurrentBBoxDims({ w: 0, h: 0 });
            return;
        }

        if (activeTool === "LINE") {
            setIsDrawing(true);
            setCurrentLinePos({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
        }
    };

    const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (event.evt.button !== 0) return;
        startDragShape();
    };

    const handleStageTouchStart = () => {
        startDragShape();
    };

    const completeDragShape = () => {
        if ((activeTool === "BBOX" || activeTool === "ELLIPSE") && isDrawing && currentBBoxPos && currentBBoxDims) {
            setIsDrawing(false);
            const width = Math.abs(currentBBoxDims.w);
            const height = Math.abs(currentBBoxDims.h);

            if (width > 5 && height > 5) {
                if (activeTool === "BBOX") {
                    const x = currentBBoxDims.w < 0 ? currentBBoxPos.x + currentBBoxDims.w : currentBBoxPos.x;
                    const y = currentBBoxDims.h < 0 ? currentBBoxPos.y + currentBBoxDims.h : currentBBoxPos.y;
                    addFeature({
                        id: uuidv4(),
                        type: "bbox",
                        source: "manual",
                        x,
                        y,
                        width,
                        height,
                        rotation: 0,
                        color: "#ffaa00",
                    });
                } else {
                    addFeature({
                        id: uuidv4(),
                        type: "ellipse",
                        source: "manual",
                        x: currentBBoxPos.x + currentBBoxDims.w / 2,
                        y: currentBBoxPos.y + currentBBoxDims.h / 2,
                        radiusX: width / 2,
                        radiusY: height / 2,
                        rotation: 0,
                        color: "#ff00ff",
                    });
                }
            }

            setCurrentBBoxPos(null);
            setCurrentBBoxDims(null);
            return;
        }

        if (activeTool === "LINE" && isDrawing && currentLinePos) {
            setIsDrawing(false);
            const dx = currentLinePos.x2 - currentLinePos.x1;
            const dy = currentLinePos.y2 - currentLinePos.y1;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                addFeature({
                    id: uuidv4(),
                    type: "line",
                    source: "manual",
                    points: [currentLinePos.x1, currentLinePos.y1, currentLinePos.x2, currentLinePos.y2],
                    color: "#00ffff",
                });
            }
            setCurrentLinePos(null);
        }
    };

    const handleStageMouseUp = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (event.evt.button !== 0) return;
        completeDragShape();
    };

    const handleStageTouchEnd = () => {
        completeDragShape();
    };

    const handleStageClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (event.evt.button !== 0) return;

        const pos = getRelativePointerPosition();
        if (!pos) return;

        if (activeTool === "SELECT") {
            const clickedOnEmpty = event.target === event.target.getStage() || event.target.index === 0;
            if (clickedOnEmpty) {
                setSelectedFeatureId(null);
            }
            return;
        }

        if (activeTool === "POINT") {
            addFeature({
                id: uuidv4(),
                type: "point",
                source: "manual",
                x: pos.x,
                y: pos.y,
                color: "#ff0000",
            });
            return;
        }

        if (activeTool === "POLYLINE" || activeTool === "POLYGON") {
            if (!isDrawing) {
                setIsDrawing(true);
                setCurrentLinePoints([pos.x, pos.y]);
            } else {
                setCurrentLinePoints([...currentLinePoints, pos.x, pos.y]);
            }
        }
    };

    const finishCurrentShape = useCallback(() => {
        if (activeTool === "POLYLINE" && isDrawing) {
            setIsDrawing(false);
            addFeature({
                id: uuidv4(),
                type: "polyline",
                source: "manual",
                points: currentLinePoints,
                color: "#00ff00",
            });
            setCurrentLinePoints([]);
        }

        if (activeTool === "POLYGON" && isDrawing && currentLinePoints.length >= 6) {
            setIsDrawing(false);
            addFeature({
                id: uuidv4(),
                type: "polygon",
                source: "manual",
                points: currentLinePoints,
                closed: true,
                color: "#8b5cf6",
            });
            setCurrentLinePoints([]);
        }
    }, [activeTool, addFeature, currentLinePoints, isDrawing]);

    const handleStageDblClick = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (event.evt.button !== 0) return;
        finishCurrentShape();
    };

    return {
        isDrawing,
        currentLinePoints,
        currentBBoxPos,
        currentBBoxDims,
        currentLinePos,
        updateDrawingOnMove,
        handleStageMouseDown,
        handleStageMouseUp,
        handleStageTouchStart,
        handleStageTouchEnd,
        handleStageClick,
        handleStageDblClick,
        finishCurrentShape,
        resetDrafts,
    };
}
