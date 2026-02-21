import { useEffect, useRef, useState } from 'react';
import { Stage, Layer, Image as KonvaImage, Circle, Line, Rect, Ellipse, Transformer } from 'react-konva';
import useImage from 'use-image';
import { v4 as uuidv4 } from 'uuid';
import { useEditorStore } from '../../store/editor/useEditorStore';

export default function CanvasWorkspace() {
    const {
        imageSrc, imageWidth, imageHeight,
        zoom, pan, setZoom, setPan, setImage,
        activeTool, features, addFeature, updateFeature,
        selectedFeatureId, setSelectedFeatureId, showFeatures
    } = useEditorStore();

    const [image] = useImage(imageSrc || '', 'anonymous');
    const stageRef = useRef<any>(null);
    const layerRef = useRef<any>(null);
    const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const transformerRef = useRef<any>(null);

    // Pixel inspection
    const hiddenCanvasRef = useRef<HTMLCanvasElement | null>(null);
    const [hoverPixel, setHoverPixel] = useState<{ x: number, y: number, r: number, g: number, b: number } | null>(null);

    // Drawing state
    const [isDrawing, setIsDrawing] = useState(false);
    const [currentLinePoints, setCurrentLinePoints] = useState<number[]>([]);
    const [currentBBoxPos, setCurrentBBoxPos] = useState<{ x: number, y: number } | null>(null);
    const [currentBBoxDims, setCurrentBBoxDims] = useState<{ w: number, h: number } | null>(null);
    const [currentLinePos, setCurrentLinePos] = useState<{ x1: number, y1: number, x2: number, y2: number } | null>(null);

    // Initialize hidden canvas for pixel reading
    useEffect(() => {
        if (imageSrc && imageWidth && imageHeight) {
            const canvas = document.createElement('canvas');
            canvas.width = imageWidth;
            canvas.height = imageHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    ctx.drawImage(img, 0, 0);
                    hiddenCanvasRef.current = canvas;
                };
                img.src = imageSrc;
            }
        }
    }, [imageSrc, imageWidth, imageHeight]);

    // Handle Resize
    useEffect(() => {
        const handleResize = () => {
            if (containerRef.current) {
                setContainerSize({
                    width: containerRef.current.clientWidth,
                    height: containerRef.current.clientHeight
                });
            }
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Sync Transformer with selected feature
    useEffect(() => {
        if (activeTool === 'SELECT' && selectedFeatureId && transformerRef.current) {
            const node = layerRef.current?.findOne(`#${selectedFeatureId}`);
            if (node) {
                transformerRef.current.nodes([node]);
                transformerRef.current.getLayer().batchDraw();
            } else {
                transformerRef.current.nodes([]);
            }
        } else if (transformerRef.current) {
            transformerRef.current.nodes([]);
        }
    }, [selectedFeatureId, activeTool]);


    // Drag & Drop
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const file = e.dataTransfer.files[0];
            if (file.type.startsWith('image/')) {
                const url = URL.createObjectURL(file);

                const img = new Image();
                img.onload = () => {
                    setImage(url, img.width, img.height);
                    if (containerRef.current) {
                        const scale = Math.min(
                            containerRef.current.clientWidth / img.width,
                            containerRef.current.clientHeight / img.height
                        ) * 0.9;
                        setZoom(scale);
                        setPan({
                            x: (containerRef.current.clientWidth - img.width * scale) / 2,
                            y: (containerRef.current.clientHeight - img.height * scale) / 2
                        });
                    }
                };
                img.src = url;
            }
        }
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        const stage = stageRef.current;
        if (!stage) return;

        const scaleBy = 1.1;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();

        const mousePointTo = {
            x: (pointer.x - stage.x()) / oldScale,
            y: (pointer.y - stage.y()) / oldScale,
        };

        const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
        setZoom(newScale);
        setPan({
            x: pointer.x - mousePointTo.x * newScale,
            y: pointer.y - mousePointTo.y * newScale,
        });
    };

    const getRelativePointerPosition = () => {
        const stage = stageRef.current;
        if (!stage) return null;
        const transform = stage.getAbsoluteTransform().copy();
        transform.invert();
        const pos = stage.getPointerPosition();
        return transform.point(pos);
    };

    const handleMouseMove = () => {
        const pos = getRelativePointerPosition();
        if (!pos) return;

        // 1. Pixel Inspection
        if (hiddenCanvasRef.current && pos.x >= 0 && pos.x < imageWidth && pos.y >= 0 && pos.y < imageHeight) {
            const ctx = hiddenCanvasRef.current.getContext('2d');
            if (ctx) {
                const px = Math.floor(pos.x);
                const py = Math.floor(pos.y);
                const pixel = ctx.getImageData(px, py, 1, 1).data;
                setHoverPixel({ x: pos.x, y: pos.y, r: pixel[0], g: pixel[1], b: pixel[2] });
            }
        } else {
            setHoverPixel(null);
        }

        // 2. Interactive Drawing BBox/Ellipse/Line
        if ((activeTool === 'BBOX' || activeTool === 'ELLIPSE') && isDrawing && currentBBoxPos) {
            setCurrentBBoxDims({
                w: pos.x - currentBBoxPos.x,
                h: pos.y - currentBBoxPos.y
            });
        } else if (activeTool === 'LINE' && isDrawing && currentLinePos) {
            setCurrentLinePos({ ...currentLinePos, x2: pos.x, y2: pos.y });
        }
    };

    const handleStageMouseDown = (e: any) => {
        const pos = getRelativePointerPosition();
        if (!pos) return;

        if (activeTool === 'SELECT') {
            const clickedOnEmpty = e.target === e.target.getStage() || e.target.index === 0; // bg or image
            if (clickedOnEmpty) {
                setSelectedFeatureId(null);
            }
            return;
        }

        // Tools that draw on click/drag
        if (activeTool === 'BBOX' || activeTool === 'ELLIPSE') {
            setIsDrawing(true);
            setCurrentBBoxPos({ x: pos.x, y: pos.y });
            setCurrentBBoxDims({ w: 0, h: 0 });
        } else if (activeTool === 'LINE') {
            setIsDrawing(true);
            setCurrentLinePos({ x1: pos.x, y1: pos.y, x2: pos.x, y2: pos.y });
        }
    };

    const handleStageMouseUp = () => {
        if ((activeTool === 'BBOX' || activeTool === 'ELLIPSE') && isDrawing && currentBBoxPos && currentBBoxDims) {
            setIsDrawing(false);
            const w = Math.abs(currentBBoxDims.w);
            const h = Math.abs(currentBBoxDims.h);

            if (w > 5 && h > 5) {
                if (activeTool === 'BBOX') {
                    const realX = currentBBoxDims.w < 0 ? currentBBoxPos.x + currentBBoxDims.w : currentBBoxPos.x;
                    const realY = currentBBoxDims.h < 0 ? currentBBoxPos.y + currentBBoxDims.h : currentBBoxPos.y;

                    addFeature({
                        id: uuidv4(),
                        type: 'bbox',
                        x: realX,
                        y: realY,
                        width: w,
                        height: h,
                        rotation: 0,
                        color: '#ffaa00'
                    });
                } else if (activeTool === 'ELLIPSE') {
                    // Ellipse origin is center
                    addFeature({
                        id: uuidv4(),
                        type: 'ellipse',
                        x: currentBBoxPos.x + currentBBoxDims.w / 2,
                        y: currentBBoxPos.y + currentBBoxDims.h / 2,
                        radiusX: w / 2,
                        radiusY: h / 2,
                        rotation: 0,
                        color: '#ff00ff'
                    });
                }
            }
            setCurrentBBoxPos(null);
            setCurrentBBoxDims(null);
        } else if (activeTool === 'LINE' && isDrawing && currentLinePos) {
            setIsDrawing(false);
            const dx = currentLinePos.x2 - currentLinePos.x1;
            const dy = currentLinePos.y2 - currentLinePos.y1;
            if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
                addFeature({
                    id: uuidv4(),
                    type: 'line',
                    points: [currentLinePos.x1, currentLinePos.y1, currentLinePos.x2, currentLinePos.y2],
                    color: '#00ffff'
                });
            }
            setCurrentLinePos(null);
        }
    }

    const handleStageClick = () => {
        const pos = getRelativePointerPosition();
        if (!pos) return;

        if (activeTool === 'POINT') {
            addFeature({
                id: uuidv4(),
                type: 'point',
                x: pos.x,
                y: pos.y,
                color: '#ff0000'
            });
        }

        if (activeTool === 'POLYLINE') {
            if (!isDrawing) {
                setIsDrawing(true);
                setCurrentLinePoints([pos.x, pos.y]);
            } else {
                setCurrentLinePoints([...currentLinePoints, pos.x, pos.y]);
            }
        }

        // We can add simple scaffold for others later.
    };

    const handleStageDblClick = () => {
        if (activeTool === 'POLYLINE' && isDrawing) {
            setIsDrawing(false);
            addFeature({
                id: uuidv4(),
                type: 'polyline',
                points: currentLinePoints,
                color: '#00ff00'
            });
            setCurrentLinePoints([]);
        }
    };

    // Helper to handle transformations from the Transformer tool
    const handleTransformEnd = (e: any) => {
        const node = e.target;
        if (!selectedFeatureId) return;

        const feature = features.find(f => f.id === selectedFeatureId);
        if (!feature) return;

        // Convert transformers scale to pure width/height so we don't have scaling artifacts over time
        const scaleX = node.scaleX();
        const scaleY = node.scaleY();

        // Reset scale to 1 to flush it to width/height properties
        node.scaleX(1);
        node.scaleY(1);

        if (feature.type === 'ellipse') {
            updateFeature(selectedFeatureId, {
                x: node.x(),
                y: node.y(),
                radiusX: Math.max(5, node.radiusX() * scaleX),
                radiusY: Math.max(5, node.radiusY() * scaleY),
                rotation: node.rotation()
            });
        } else {
            updateFeature(selectedFeatureId, {
                x: node.x(),
                y: node.y(),
                width: Math.max(5, node.width() * scaleX),
                height: Math.max(5, node.height() * scaleY),
                rotation: node.rotation()
            });
        }
    };

    return (
        <div
            ref={containerRef}
            className={`w-full h-full relative overflow-hidden ${activeTool !== 'SELECT' ? 'cursor-crosshair' : 'cursor-default'}`}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
        >
            {!imageSrc && (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground z-10 pointer-events-none">
                    Drag & Drop an image here
                </div>
            )}

            {/* Top Pixel Inspector Bar */}
            {hoverPixel && (
                <div className="absolute top-4 left-4 z-20 bg-background/90 border border-border backdrop-blur p-2 rounded-md shadow-sm text-xs font-mono flex items-center space-x-4 pointer-events-none">
                    <div>
                        <span className="text-muted-foreground">X:</span> {hoverPixel.x.toFixed(2)} <span className="text-muted-foreground">Y:</span> {hoverPixel.y.toFixed(2)}
                    </div>
                    <div className="flex items-center space-x-2">
                        <span className="text-muted-foreground">|</span>
                        <span>{Math.round(0.299 * hoverPixel.r + 0.587 * hoverPixel.g + 0.114 * hoverPixel.b)}</span>
                    </div>
                </div>
            )}

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
                    scaleX={zoom}
                    scaleY={zoom}
                    x={pan.x}
                    y={pan.y}
                    draggable={activeTool === 'SELECT'}
                    onDragEnd={(e) => {
                        if (e.target === stageRef.current) {
                            setPan({ x: e.target.x(), y: e.target.y() });
                        }
                    }}
                >
                    <Layer ref={layerRef} imageSmoothingEnabled={false}>
                        {image && (
                            <KonvaImage
                                image={image}
                                width={imageWidth}
                                height={imageHeight}
                                listening={false} // Don't intercept clicks so stage gets them
                            />
                        )}

                        {/* Draw active polyline */}
                        {activeTool === 'POLYLINE' && isDrawing && currentLinePoints.length > 0 && (
                            <Line
                                points={currentLinePoints}
                                stroke="#00ff00"
                                strokeWidth={2 / zoom}
                                tension={0}
                                lineCap="round"
                                lineJoin="round"
                            />
                        )}

                        {/* Draw active line */}
                        {activeTool === 'LINE' && isDrawing && currentLinePos && (
                            <Line
                                points={[currentLinePos.x1, currentLinePos.y1, currentLinePos.x2, currentLinePos.y2]}
                                stroke="#00ffff"
                                strokeWidth={2 / zoom}
                            />
                        )}

                        {/* Draw active BBox */}
                        {activeTool === 'BBOX' && isDrawing && currentBBoxPos && currentBBoxDims && (
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

                        {/* Draw active Ellipse */}
                        {activeTool === 'ELLIPSE' && isDrawing && currentBBoxPos && currentBBoxDims && (
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

                        {/* Render Features from Store */}
                        {showFeatures && features.map((feat) => {
                            const isSelected = selectedFeatureId === feat.id;

                            if (feat.type === 'point') {
                                return (
                                    <Circle
                                        key={feat.id}
                                        id={feat.id}
                                        x={feat.x}
                                        y={feat.y}
                                        radius={3 / zoom}
                                        fill={isSelected ? '#00ffff' : feat.color || "red"}
                                        draggable={activeTool === 'SELECT'}
                                        onDragEnd={(e) => {
                                            updateFeature(feat.id, { x: e.target.x(), y: e.target.y() });
                                        }}
                                        onClick={() => setSelectedFeatureId(feat.id)}
                                    />
                                );
                            }
                            if (feat.type === 'line') {
                                return (
                                    <Line
                                        key={feat.id}
                                        id={feat.id}
                                        points={feat.points}
                                        stroke={isSelected ? '#00ffff' : feat.color || '#00ffff'}
                                        strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                                        draggable={activeTool === 'SELECT'}
                                        onClick={() => setSelectedFeatureId(feat.id)}
                                    />
                                )
                            }
                            if (feat.type === 'polyline') {
                                return (
                                    <Line
                                        key={feat.id}
                                        id={feat.id}
                                        points={feat.points}
                                        stroke={isSelected ? '#00ffff' : feat.color || '#00ff00'}
                                        strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                                        draggable={activeTool === 'SELECT'}
                                        onClick={() => setSelectedFeatureId(feat.id)}
                                    />
                                )
                            }
                            if (feat.type === 'bbox') {
                                return (
                                    <Rect
                                        key={feat.id}
                                        id={feat.id}
                                        x={feat.x}
                                        y={feat.y}
                                        width={feat.width}
                                        height={feat.height}
                                        rotation={feat.rotation || 0}
                                        stroke={feat.color || '#ffaa00'}
                                        strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                                        draggable={activeTool === 'SELECT'}
                                        onClick={() => setSelectedFeatureId(feat.id)}
                                        onDragEnd={(e) => {
                                            updateFeature(feat.id, { x: e.target.x(), y: e.target.y() });
                                        }}
                                        onTransformEnd={handleTransformEnd}
                                    />
                                )
                            }
                            if (feat.type === 'ellipse') {
                                return (
                                    <Ellipse
                                        key={feat.id}
                                        id={feat.id}
                                        x={feat.x}
                                        y={feat.y}
                                        radiusX={feat.radiusX}
                                        radiusY={feat.radiusY}
                                        rotation={feat.rotation || 0}
                                        stroke={feat.color || '#ff00ff'}
                                        strokeWidth={isSelected ? 3 / zoom : 2 / zoom}
                                        draggable={activeTool === 'SELECT'}
                                        onClick={() => setSelectedFeatureId(feat.id)}
                                        onDragEnd={(e) => {
                                            updateFeature(feat.id, { x: e.target.x(), y: e.target.y() });
                                        }}
                                        onTransformEnd={handleTransformEnd}
                                    />
                                )
                            }
                            return null;
                        })}

                        {/* The Transformer overlay handles interactive rotation and resizing */}
                        {activeTool === 'SELECT' && (
                            <Transformer
                                ref={transformerRef}
                                boundBoxFunc={(oldBox, newBox) => {
                                    // Limit resize to a minimum dimension
                                    if (newBox.width < 5 || newBox.height < 5) return oldBox;
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
