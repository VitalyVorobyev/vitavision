import { useEffect, useRef, useState } from "react";
import { Stage, Layer, Image as KonvaImage, Line, Rect, Ellipse, Transformer } from "react-konva";
import useImage from "use-image";
import { v4 as uuidv4 } from "uuid";
import type Konva from "konva";

import FeatureLayer from "./canvas/FeatureLayer";
import FeatureTooltip, { type DirectedPointTooltipState } from "./canvas/FeatureTooltip";
import { isReadonlyFeature, useEditorStore } from "../../store/editor/useEditorStore";
import { getAlgorithmById } from "./algorithms/registry";

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

    const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hoverPixel, setHoverPixel] = useState<{ x: number; y: number; r: number; g: number; b: number } | null>(null);
    const [hoveredDirectedPoint, setHoveredDirectedPoint] = useState<DirectedPointTooltipState | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentLinePoints, setCurrentLinePoints] = useState<number[]>([]);
    const [currentBBoxPos, setCurrentBBoxPos] = useState<{ x: number; y: number } | null>(null);
    const [currentBBoxDims, setCurrentBBoxDims] = useState<{ w: number; h: number } | null>(null);
    const [currentLinePos, setCurrentLinePos] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);

    const hoveredDirectedPointId = hoveredDirectedPoint?.feature.id ?? null;
    const selectedFeature = features.find((feature) => feature.id === selectedFeatureId) ?? null;
    const canTransformSelectedFeature = selectedFeature !== null
        && !isReadonlyFeature(selectedFeature)
        && (selectedFeature.type === "bbox" || selectedFeature.type === "ellipse");
    const hasActiveAlgorithmOverlay = lastAlgorithmResult !== null
        && !!getAlgorithmById(lastAlgorithmResult.algorithmId).OverlayComponent;

    useEffect(() => {
        if (!imageSrc || !imageWidth || !imageHeight) {
            hiddenCanvasRef.current = null;
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = imageWidth;
        canvas.height = imageHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
            hiddenCanvasRef.current = null;
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            hiddenCanvasRef.current = canvas;
        };
        img.src = imageSrc;
    }, [imageSrc, imageWidth, imageHeight]);

    useEffect(() => {
        const handleResize = () => {
            if (!containerRef.current) {
                return;
            }
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

    const handleDrop = (event: React.DragEvent) => {
        event.preventDefault();

        if (!event.dataTransfer.files || event.dataTransfer.files.length === 0) {
            return;
        }

        const file = event.dataTransfer.files[0];
        if (!file.type.startsWith("image/")) {
            return;
        }

        const url = URL.createObjectURL(file);
        const img = new Image();
        img.onload = () => {
            setImage(url, img.width, img.height, file.name);
            if (!containerRef.current) {
                return;
            }
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

    const getRelativePointerPosition = () => {
        const stage = stageRef.current;
        if (!stage) {
            return null;
        }
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const position = stage.getPointerPosition();
        if (!position) {
            return null;
        }
        return transform.point(position);
    };

    const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
        event.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) {
            return;
        }

        const scaleBy = 1.1;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) {
            return;
        }

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = event.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        setZoom(newScale);
        setPan({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    const handleMouseMove = () => {
        const pos = getRelativePointerPosition();
        if (!pos) {
            return;
        }

        if (hiddenCanvasRef.current && pos.x >= 0 && pos.x < imageWidth && pos.y >= 0 && pos.y < imageHeight) {
            const ctx = hiddenCanvasRef.current.getContext("2d");
            if (ctx) {
                const px = Math.floor(pos.x);
                const py = Math.floor(pos.y);
                const pixel = ctx.getImageData(px, py, 1, 1).data;
                setHoverPixel({ x: pos.x, y: pos.y, r: pixel[0], g: pixel[1], b: pixel[2] });
            }
        } else {
            setHoverPixel(null);
        }

        if ((activeTool === "BBOX" || activeTool === "ELLIPSE") && isDrawing && currentBBoxPos) {
            setCurrentBBoxDims({
                w: pos.x - currentBBoxPos.x,
                h: pos.y - currentBBoxPos.y,
            });
        } else if (activeTool === "LINE" && isDrawing && currentLinePos) {
            setCurrentLinePos({ ...currentLinePos, x2: pos.x, y2: pos.y });
        }
    };

    const handleStageMouseDown = (event: Konva.KonvaEventObject<MouseEvent>) => {
        const pos = getRelativePointerPosition();
        if (!pos) {
            return;
        }

        if (activeTool === "SELECT") {
            const clickedOnEmpty = event.target === event.target.getStage() || event.target.index === 0;
            if (clickedOnEmpty) {
                setSelectedFeatureId(null);
            }
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

    const handleStageMouseUp = () => {
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

    const handleStageClick = () => {
        const pos = getRelativePointerPosition();
        if (!pos) {
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

    const handleStageDblClick = () => {
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
    };

    const handleTransformEnd = (event: Konva.KonvaEventObject<Event>) => {
        const node = event.target as Konva.Node;
        if (!selectedFeatureId) {
            return;
        }

        const feature = features.find((item) => item.id === selectedFeatureId);
        if (!feature || isReadonlyFeature(feature)) {
            return;
        }

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
        if (!pointer) {
            return;
        }
        setHoveredDirectedPoint({
            feature,
            left: pointer.x + 12,
            top: pointer.y + 12,
        });
    };

    const clearDirectedPointHover = () => {
        setHoveredDirectedPoint(null);
    };

    return (
        <div
            ref={containerRef}
            className={`w-full h-full relative overflow-hidden ${activeTool !== "SELECT" ? "cursor-crosshair" : "cursor-default"}`}
            onDrop={handleDrop}
            onDragOver={(event) => event.preventDefault()}
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
                    onMouseLeave={() => {
                        setHoverPixel(null);
                        clearDirectedPointHover();
                    }}
                    scaleX={zoom}
                    scaleY={zoom}
                    x={pan.x}
                    y={pan.y}
                    draggable={activeTool === "SELECT"}
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
