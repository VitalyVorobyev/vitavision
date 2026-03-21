import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Rect, Ellipse, Transformer } from "react-konva";
import useImage from "use-image";
import type Konva from "konva";

import FeatureLayer from "./canvas/FeatureLayer";
import FeatureTooltip, { type DirectedPointTooltipState } from "./canvas/FeatureTooltip";
import { isReadonlyFeature, useEditorStore } from "../../store/editor/useEditorStore";
import { getAlgorithmById } from "./algorithms/registry";
import CanvasControlsHint from "../shared/CanvasControlsHint";
import { usePixelSampler } from "./hooks/usePixelSampler";
import { useCanvasGestures } from "./hooks/useCanvasGestures";
import { useDrawingHandlers } from "./hooks/useDrawingHandlers";

export default function CanvasWorkspace() {
    const {
        imageSrc,
        imageWidth,
        imageHeight,
        zoom,
        pan,
        setZoom,
        setPan,
        setImage,
        activeTool,
        features,
        addFeature,
        updateFeature,
        selectedFeatureId,
        setSelectedFeatureId,
        showFeatures,
        lastAlgorithmResult,
        featureGroupVisibility,
        overlayVisibility,
        overlayToggles,
    } = useEditorStore();

    const [image] = useImage(imageSrc || "", "anonymous");
    const stageRef = useRef<Konva.Stage | null>(null);
    const layerRef = useRef<Konva.Layer | null>(null);
    const transformerRef = useRef<Konva.Transformer | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const [hoveredDirectedPoint, setHoveredDirectedPoint] = useState<DirectedPointTooltipState | null>(null);

    const hoveredDirectedPointId = hoveredDirectedPoint?.feature.id ?? null;
    const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;
    const canTransformSelectedFeature = selectedFeature !== null
        && !isReadonlyFeature(selectedFeature)
        && (selectedFeature.type === "bbox" || selectedFeature.type === "ellipse");
    const hasActiveAlgorithmOverlay = lastAlgorithmResult !== null
        && !!getAlgorithmById(lastAlgorithmResult.algorithmId).OverlayComponent;

    /* ── Extracted hooks ── */

    const { hoverPixel, sampleAt, clearPixel } = usePixelSampler(imageSrc, imageWidth, imageHeight);

    const {
        isPanning, touchOnly,
        startPan, handleWheel, handleTouchMove, handleTouchEnd,
    } = useCanvasGestures({ pan, setZoom, setPan });

    const getRelativePointerPosition = () => {
        const stage = stageRef.current;
        if (!stage) return null;
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const position = stage.getPointerPosition();
        if (!position) return null;
        return transform.point(position);
    };

    const {
        isDrawing, currentLinePoints, currentBBoxPos, currentBBoxDims, currentLinePos,
        updateDrawingOnMove,
        handleStageMouseDown: drawingMouseDown,
        handleStageMouseUp,
        handleStageClick,
        handleStageDblClick,
    } = useDrawingHandlers({ activeTool, addFeature, setSelectedFeatureId, getRelativePointerPosition });

    /* ── Derived ── */

    const controlHints = [
        activeTool === "SELECT" ? "Left click selects or edits" : "Left click uses the active tool",
        "Right drag pans",
        "Wheel zooms",
        ...(activeTool === "POLYLINE" || activeTool === "POLYGON" ? ["Double click finishes the shape"] : []),
    ];
    const workspaceCursor = isPanning ? "cursor-grabbing" : activeTool !== "SELECT" ? "cursor-crosshair" : "cursor-default";

    /* ── Effects ── */

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) return;
            setContainerSize({
                width: containerRef.current.clientWidth,
                height: containerRef.current.clientHeight,
            });
        };
        handleResize();
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    useEffect(() => {
        if (
            activeTool === "SELECT"
            && selectedFeatureId
            && canTransformSelectedFeature
            && transformerRef.current
        ) {
            const node = layerRef.current?.findOne(`#transformable-${selectedFeatureId}`);
            if (node) {
                transformerRef.current.nodes([node]);
                transformerRef.current.getLayer()?.batchDraw();
                return;
            }
        }

        if (transformerRef.current) {
            transformerRef.current.nodes([]);
            transformerRef.current.getLayer()?.batchDraw();
        }
    }, [activeTool, selectedFeatureId, canTransformSelectedFeature]);

    /* ── Event handlers ── */

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();

        if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) return;

        const file = event.dataTransfer.files[0];
        if (!file.type.startsWith("image/")) return;

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setImage(url, img.width, img.height, file.name);
            if (!containerRef.current) return;
            const scale = Math.min(
                containerRef.current.clientWidth / img.width,
                containerRef.current.clientHeight / img.height,
            ) * 0.9;
            setZoom(scale);
            setPan({
                x: (containerRef.current.clientWidth - img.width * scale) / 2,
                y: (containerRef.current.clientHeight - img.height * scale) / 2,
            });
        };
        img.src = url;
    };

    const handleMouseMove = () => {
        const pos = getRelativePointerPosition();
        if (!pos) return;
        sampleAt(pos);
        updateDrawingOnMove(pos);
    };

    const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
        if (event.evt.button === 2) {
            event.evt.preventDefault();
            startPan(event.evt);
            return;
        }
        drawingMouseDown(event);
    };

    const handleTransformEnd = (event: Konva.KonvaEventObject<Event>) => {
        const node = event.target as Konva.Node;
        if (!selectedFeatureId) return;

        const feature = features.find((item) => item.id === selectedFeatureId);
        if (!feature || isReadonlyFeature(feature)) return;

        const scaleX = node.scaleX();
        const scaleY = node.scaleY();
        node.scaleX(1);
        node.scaleY(1);

        if (feature.type === "ellipse") {
            const ellipseNode = node as Konva.Ellipse;
            updateFeature(selectedFeatureId, {
                x: ellipseNode.x(),
                y: ellipseNode.y(),
                radiusX: Math.max(5, ellipseNode.radiusX() * scaleX),
                radiusY: Math.max(5, ellipseNode.radiusY() * scaleY),
                rotation: ellipseNode.rotation(),
            });
            return;
        }

        if (feature.type === "bbox") {
            updateFeature(selectedFeatureId, {
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
                rotation: node.rotation(),
            });
        }
    };

    const handleDirectedPointHover = (feature: DirectedPointTooltipState["feature"], event: Konva.KonvaEventObject<MouseEvent>) => {
        const stage = event.target.getStage();
        const pointer = stage?.getPointerPosition();
        if (!pointer) return;
        setHoveredDirectedPoint({ feature, left: pointer.x + 12, top: pointer.y + 12 });
    };

    const clearDirectedPointHover = () => setHoveredDirectedPoint(null);

    /* ── Render ── */

    return (
        <div
            ref={containerRef}
            className={`w-full h-full relative overflow-hidden ${workspaceCursor}`}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
            onContextMenu={(event) => event.preventDefault()}
        >
            {!imageSrc && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground z-10 pointer-events-none">
                    Drag & Drop an image here
                </div>
            )}

            {hoverPixel && hoveredDirectedPoint === null && (
                <div className="absolute top-4 left-4 z-20 bg-background/90 border border-border backdrop-blur-sm p-2 rounded-md shadow-xs text-xs font-mono flex items-center space-x-4 pointer-events-none">
                    <div>
                        <span className="text-muted-foreground">X:</span> {hoverPixel.x.toFixed(2)} <span className="text-muted-foreground">Y:</span> {hoverPixel.y.toFixed(2)}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">|</span>
                        <span>{Math.round(0.299 * hoverPixel.r + 0.587 * hoverPixel.g + 0.114 * hoverPixel.b)}</span>
                    </div>
                </div>
            )}

            <FeatureTooltip tooltip={hoveredDirectedPoint} />
            <CanvasControlsHint lines={controlHints} className="bottom-4 right-4 max-w-52" />

            {containerSize.width > 0 && (
                <Stage
                    ref={stageRef}
                    width={containerSize.width}
                    height={containerSize.height}
                    onWheel={handleWheel}
                    onMouseMove={handleMouseMove}
                    onMouseDown={handleStageMouseDown}
                    onMouseUp={handleStageMouseUp}
                    onClick={handleStageClick}
                    onDblClick={handleStageDblClick}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseLeave={() => {
                        clearPixel();
                        clearDirectedPointHover();
                    }}
                    scaleX={zoom}
                    scaleY={zoom}
                    x={pan.x}
                    y={pan.y}
                    draggable={touchOnly && activeTool === "SELECT"}
                    onDragEnd={(event) => {
                        if (event.target === stageRef.current) {
                            setPan({ x: event.target.x(), y: event.target.y() });
                        }
                    }}
                >
                    <Layer ref={layerRef} imageSmoothingEnabled={false}>
                        {image && (
                            <KonvaImage
                                image={image}
                                width={imageWidth}
                                height={imageHeight}
                                listening={false}
                            />
                        )}

                        {activeTool === "POLYLINE" && isDrawing && currentLinePoints.length > 0 && (
                            <Line
                                points={currentLinePoints}
                                stroke="#00ff00"
                                strokeWidth={2 / zoom}
                                tension={0}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}

                        {activeTool === "POLYGON" && isDrawing && currentLinePoints.length > 0 && (
                            <Line
                                points={currentLinePoints}
                                closed={currentLinePoints.length >= 6}
                                fill={currentLinePoints.length >= 6 ? "rgba(139,92,246,0.1)" : undefined}
                                stroke="#8b5cf6"
                                strokeWidth={2 / zoom}
                                dash={[5 / zoom, 5 / zoom]}
                                tension={0}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}

                        {activeTool === "LINE" && isDrawing && currentLinePos && (
                            <Line
                                points={[currentLinePos.x1, currentLinePos.y1, currentLinePos.x2, currentLinePos.y2]}
                                stroke="#00ffff"
                                strokeWidth={2 / zoom}
                            />
                        )}

                        {activeTool === "BBOX" && isDrawing && currentBBoxPos && currentBBoxDims && (
                            <Rect
                                x={currentBBoxDims.w < 0 ? currentBBoxPos.x + currentBBoxDims.w : currentBBoxPos.x}
                                y={currentBBoxDims.h < 0 ? currentBBoxPos.y + currentBBoxDims.h : currentBBoxPos.y}
                                width={Math.abs(currentBBoxDims.w)}
                                height={Math.abs(currentBBoxDims.h)}
                                stroke="#ffaa00"
                                strokeWidth={2 / zoom}
                                dash={[5 / zoom, 5 / zoom]}
                            />
                        )}

                        {activeTool === "ELLIPSE" && isDrawing && currentBBoxPos && currentBBoxDims && (
                            <Ellipse
                                x={currentBBoxPos.x + currentBBoxDims.w / 2}
                                y={currentBBoxPos.y + currentBBoxDims.h / 2}
                                radiusX={Math.abs(currentBBoxDims.w) / 2}
                                radiusY={Math.abs(currentBBoxDims.h) / 2}
                                stroke="#ff00ff"
                                strokeWidth={2 / zoom}
                                dash={[5 / zoom, 5 / zoom]}
                            />
                        )}

                        {/* Algorithm overlay (grid edges, labels, markers) */}
                        {overlayVisibility.algorithmOverlay && lastAlgorithmResult && (() => {
                            const algo = getAlgorithmById(lastAlgorithmResult.algorithmId);
                            const Overlay = algo.OverlayComponent;
                            if (!Overlay) return null;
                            return (
                                <Overlay
                                    result={lastAlgorithmResult.result}
                                    zoom={zoom}
                                    showFeatures={showFeatures}
                                    featureGroupVisibility={featureGroupVisibility}
                                    toggles={overlayToggles}
                                />
                            );
                        })()}

                        <FeatureLayer
                            features={features}
                            showFeatures={showFeatures}
                            showAlgorithmFeatures={!overlayVisibility.algorithmOverlay || !hasActiveAlgorithmOverlay}
                            featureGroupVisibility={featureGroupVisibility}
                            zoom={zoom}
                            activeTool={activeTool}
                            selectedFeatureId={selectedFeatureId}
                            hoveredDirectedPointId={hoveredDirectedPointId}
                            setSelectedFeatureId={setSelectedFeatureId}
                            updateFeature={updateFeature}
                            onTransformEnd={handleTransformEnd}
                            onDirectedPointHover={handleDirectedPointHover}
                            onDirectedPointLeave={clearDirectedPointHover}
                        />

                        {activeTool === "SELECT" && canTransformSelectedFeature && (
                            <Transformer
                                ref={transformerRef}
                                boundBoxFunc={(oldBox, newBox) => {
                                    if (newBox.width < 5 || newBox.height < 5) {
                                        return oldBox;
                                    }
                                    return newBox;
                                }}
                            />
                        )}
                    </Layer>
                </Stage>
            )}
        </div>
    );
}
