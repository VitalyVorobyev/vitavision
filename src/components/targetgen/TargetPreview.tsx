import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { TargetGeneratorState, TargetGeneratorAction } from "./types";
import { resolvePageDimensions } from "./svg/paperConstants";
import { generateMarkers, markerOuterDrawRadius, markerBounds } from "./ringgrid/layout";
import ZoomControls from "../shared/ZoomControls";
import CanvasControlsHint from "../shared/CanvasControlsHint";
import useViewportMode from "../../hooks/useViewportMode";

const CSS_PX_PER_MM = 96 / 25.4;

function computeBoardDims(state: TargetGeneratorState) {
    const target = state.target;
    switch (target.targetType) {
        case "chessboard":
            return {
                w: (target.config.innerCols + 1) * target.config.squareSizeMm,
                h: (target.config.innerRows + 1) * target.config.squareSizeMm,
            };
        case "markerboard":
            return {
                w: (target.config.innerCols + 1) * target.config.squareSizeMm,
                h: (target.config.innerRows + 1) * target.config.squareSizeMm,
            };
        case "charuco":
            return {
                w: target.config.cols * target.config.squareSizeMm,
                h: target.config.rows * target.config.squareSizeMm,
            };
        case "ringgrid": {
            const markers = generateMarkers(target.config.rows, target.config.longRowCols, target.config.pitchMm);
            const drawRadius = markerOuterDrawRadius(target.config.markerOuterRadiusMm, target.config.markerRingWidthMm);
            const [minX, minY, maxX, maxY] = markerBounds(markers);
            return {
                w: (maxX - minX) + 2 * drawRadius,
                h: (maxY - minY) + 2 * drawRadius,
            };
        }
    }
}

interface Props {
    state: TargetGeneratorState;
    dispatch: React.Dispatch<TargetGeneratorAction>;
}

export default function TargetPreview({ state, dispatch }: Props) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const lastMouse = useRef({ x: 0, y: 0 });
    const dragDistance = useRef(0);
    const touchGesture = useRef<{
        lastCenter: { x: number; y: number } | null;
        lastDistance: number | null;
        moved: boolean;
        lastTouchPoint: { x: number; y: number } | null;
    }>({
        lastCenter: null,
        lastDistance: null,
        moved: false,
        lastTouchPoint: null,
    });
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAutoFit = useRef(false);
    const { isTouchPrimary } = useViewportMode();

    const dims = useMemo(() => {
        const page = resolvePageDimensions(state.page);
        const board = computeBoardDims(state);
        return { page, board };
    }, [state]);

    const computeFitZoom = useCallback(() => {
        const container = containerRef.current;
        if (!container) return 1;
        const { clientWidth, clientHeight } = container;
        const padding = 40;
        const svgNaturalW = dims.page.widthMm * CSS_PX_PER_MM;
        const svgNaturalH = dims.page.heightMm * CSS_PX_PER_MM;
        const scaleX = (clientWidth - padding) / svgNaturalW;
        const scaleY = (clientHeight - padding) / svgNaturalH;
        return Math.min(scaleX, scaleY);
    }, [dims.page]);

    const fitToScreen = useCallback(() => {
        setZoom(computeFitZoom());
        setPan({ x: 0, y: 0 });
    }, [computeFitZoom]);

    const zoomTo100 = useCallback(() => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    }, []);

    const zoomIn = useCallback(() => {
        setZoom((value) => Math.min(10, value * 1.1));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom((value) => Math.max(0.1, value / 1.1));
    }, []);

    useEffect(() => {
        if (!containerRef.current) return;
        const id = requestAnimationFrame(() => {
            if (!hasAutoFit.current) {
                hasAutoFit.current = true;
                fitToScreen();
            }
        });
        return () => cancelAnimationFrame(id);
    }, [fitToScreen]);

    const handleWheel = useCallback((event: React.WheelEvent) => {
        event.preventDefault();
        const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
        setZoom((value) => Math.max(0.1, Math.min(10, value * factor)));
    }, []);

    const getSvgPoint = useCallback((clientX: number, clientY: number) => {
        const container = containerRef.current;
        if (!container) return null;

        const svg = container.querySelector("svg") as SVGSVGElement | null;
        if (!svg) return null;

        const ctm = svg.getScreenCTM();
        if (!ctm) return null;

        return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    }, []);

    const toggleMarkerboardCircle = useCallback((clientX: number, clientY: number) => {
        if (state.target.targetType !== "markerboard") {
            return;
        }

        const point = getSvgPoint(clientX, clientY);
        if (!point) {
            return;
        }

        const config = state.target.config;
        const page = dims.page;
        const totalCols = config.innerCols + 1;
        const totalRows = config.innerRows + 1;
        const squareSize = config.squareSizeMm;
        const boardW = totalCols * squareSize;
        const boardH = totalRows * squareSize;
        const boardOx = (page.widthMm - boardW) / 2;
        const boardOy = (page.heightMm - boardH) / 2;
        const bx = point.x - boardOx;
        const by = point.y - boardOy;

        if (bx < 0 || bx >= boardW || by < 0 || by >= boardH) {
            return;
        }

        const col = Math.floor(bx / squareSize);
        const row = Math.floor(by / squareSize);
        const existing = config.circles.findIndex((circle) => circle.cell.i === row && circle.cell.j === col);
        const circles = existing >= 0
            ? config.circles.filter((_, index) => index !== existing)
            : [...config.circles, { cell: { i: row, j: col } }];

        dispatch({ type: "UPDATE_CONFIG", partial: { circles } });
    }, [dims.page, dispatch, getSvgPoint, state.target]);

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        if (event.button !== 2) {
            return;
        }

        event.preventDefault();
        setDragging(true);
        lastMouse.current = { x: event.clientX, y: event.clientY };
        dragDistance.current = 0;
    }, []);

    const handleMouseMove = useCallback((event: React.MouseEvent) => {
        if (!dragging) {
            return;
        }

        const dx = event.clientX - lastMouse.current.x;
        const dy = event.clientY - lastMouse.current.y;
        dragDistance.current += Math.abs(dx) + Math.abs(dy);
        lastMouse.current = { x: event.clientX, y: event.clientY };
        setPan((value) => ({ x: value.x + dx, y: value.y + dy }));
    }, [dragging]);

    const handleMouseUp = useCallback(() => setDragging(false), []);

    const handleClick = useCallback((event: React.MouseEvent) => {
        if (isTouchPrimary) {
            return;
        }
        toggleMarkerboardCircle(event.clientX, event.clientY);
    }, [isTouchPrimary, toggleMarkerboardCircle]);

    const handleTouchStart = useCallback((event: React.TouchEvent) => {
        if (!isTouchPrimary) {
            return;
        }

        const touches = event.touches;
        if (touches.length === 1) {
            touchGesture.current = {
                lastCenter: { x: touches[0].clientX, y: touches[0].clientY },
                lastDistance: null,
                moved: false,
                lastTouchPoint: { x: touches[0].clientX, y: touches[0].clientY },
            };
            return;
        }

        if (touches.length >= 2) {
            const t0 = touches[0];
            const t1 = touches[1];
            touchGesture.current = {
                lastCenter: {
                    x: (t0.clientX + t1.clientX) / 2,
                    y: (t0.clientY + t1.clientY) / 2,
                },
                lastDistance: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
                moved: true,
                lastTouchPoint: null,
            };
        }
    }, [isTouchPrimary]);

    const handleTouchMove = useCallback((event: React.TouchEvent) => {
        if (!isTouchPrimary) {
            return;
        }

        const touches = event.touches;
        if (touches.length === 1) {
            const current = touches[0];
            const previous = touchGesture.current.lastCenter;
            if (!previous) {
                touchGesture.current.lastCenter = { x: current.clientX, y: current.clientY };
                return;
            }

            const dx = current.clientX - previous.x;
            const dy = current.clientY - previous.y;
            if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                touchGesture.current.moved = true;
            }

            touchGesture.current.lastCenter = { x: current.clientX, y: current.clientY };
            touchGesture.current.lastTouchPoint = { x: current.clientX, y: current.clientY };
            setPan((value) => ({ x: value.x + dx, y: value.y + dy }));
            event.preventDefault();
            return;
        }

        if (touches.length < 2) {
            return;
        }

        event.preventDefault();
        const t0 = { x: touches[0].clientX, y: touches[0].clientY };
        const t1 = { x: touches[1].clientX, y: touches[1].clientY };
        const distance = Math.hypot(t1.x - t0.x, t1.y - t0.y);
        const center = { x: (t0.x + t1.x) / 2, y: (t0.y + t1.y) / 2 };
        const container = containerRef.current;
        const previousCenter = touchGesture.current.lastCenter;
        const previousDistance = touchGesture.current.lastDistance;

        if (!container) {
            return;
        }

        if (previousCenter && previousDistance) {
            const rect = container.getBoundingClientRect();
            const localCenter = { x: center.x - rect.left, y: center.y - rect.top };
            const containerCenter = { x: rect.width / 2 + pan.x, y: rect.height / 2 + pan.y };
            const oldScale = zoom;
            const pointTo = {
                x: (localCenter.x - containerCenter.x) / oldScale,
                y: (localCenter.y - containerCenter.y) / oldScale,
            };
            const newZoom = Math.max(0.1, Math.min(10, zoom * (distance / previousDistance)));
            const deltaCenter = {
                x: center.x - previousCenter.x,
                y: center.y - previousCenter.y,
            };

            setZoom(newZoom);
            setPan({
                x: localCenter.x - pointTo.x * newZoom - rect.width / 2 + deltaCenter.x,
                y: localCenter.y - pointTo.y * newZoom - rect.height / 2 + deltaCenter.y,
            });
        }

        touchGesture.current.lastCenter = center;
        touchGesture.current.lastDistance = distance;
        touchGesture.current.moved = true;
    }, [isTouchPrimary, pan.x, pan.y, zoom]);

    const handleTouchEnd = useCallback(() => {
        if (!isTouchPrimary) {
            return;
        }

        if (!touchGesture.current.moved && touchGesture.current.lastTouchPoint) {
            toggleMarkerboardCircle(touchGesture.current.lastTouchPoint.x, touchGesture.current.lastTouchPoint.y);
        }

        touchGesture.current = {
            lastCenter: null,
            lastDistance: null,
            moved: false,
            lastTouchPoint: null,
        };
    }, [isTouchPrimary, toggleMarkerboardCircle]);

    const isMarkerboard = state.target.targetType === "markerboard";
    const controlHints = isTouchPrimary
        ? [
            ...(isMarkerboard ? ["Tap toggles circles"] : []),
            "Drag pans",
            "Pinch zooms",
        ]
        : [
            ...(isMarkerboard ? ["Left click toggles circles"] : []),
            "Right drag pans",
            "Wheel zooms",
        ];

    const handleContextMenu = useCallback((event: React.MouseEvent) => {
        event.preventDefault();
    }, []);

    return (
        <div
            ref={containerRef}
            className={
                "relative h-full flex-1 overflow-hidden bg-muted/20 " +
                (isMarkerboard ? "cursor-crosshair" : "cursor-default")
            }
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                }}
            >
                <div
                    className="bg-white shadow-lg"
                    dangerouslySetInnerHTML={{ __html: state.previewSvg }}
                />
            </div>

            <div className="absolute bottom-3 left-3 rounded-md border border-border bg-background/80 px-2.5 py-1.5 text-[11px] leading-relaxed text-muted-foreground backdrop-blur-sm">
                <div>
                    Board: {dims.board.w.toFixed(1)} x {dims.board.h.toFixed(1)} mm
                </div>
                <div>
                    Page: {dims.page.widthMm.toFixed(1)} x {dims.page.heightMm.toFixed(1)} mm
                </div>
                <div>
                    Printable: {Math.max(0, dims.page.widthMm - 2 * dims.page.marginMm).toFixed(1)} x{" "}
                    {Math.max(0, dims.page.heightMm - 2 * dims.page.marginMm).toFixed(1)} mm
                </div>
            </div>

            <div className="absolute top-3 right-3">
                <ZoomControls
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onFit={fitToScreen}
                    onActual={zoomTo100}
                    zoomPercent={Math.round(zoom * 100)}
                    touchFriendly={isTouchPrimary}
                />
            </div>
            <CanvasControlsHint lines={controlHints} className="bottom-3 right-3 max-w-52" />
        </div>
    );
}
