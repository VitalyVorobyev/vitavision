import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import type { TargetGeneratorState, TargetGeneratorAction } from "./types";
import { resolvePageDimensions } from "./svg/paperConstants";
import { generateMarkers, markerOuterDrawRadius, markerBounds } from "./ringgrid/layout";
import ZoomControls from "../shared/ZoomControls";

/** CSS px per mm (CSS spec: 1in = 96px, 1in = 25.4mm). */
const CSS_PX_PER_MM = 96 / 25.4;

function computeBoardDims(state: TargetGeneratorState) {
    const t = state.target;
    switch (t.targetType) {
        case "chessboard":
            return {
                w: (t.config.innerCols + 1) * t.config.squareSizeMm,
                h: (t.config.innerRows + 1) * t.config.squareSizeMm,
            };
        case "markerboard":
            return {
                w: (t.config.innerCols + 1) * t.config.squareSizeMm,
                h: (t.config.innerRows + 1) * t.config.squareSizeMm,
            };
        case "charuco":
            return {
                w: t.config.cols * t.config.squareSizeMm,
                h: t.config.rows * t.config.squareSizeMm,
            };
        case "ringgrid": {
            const markers = generateMarkers(t.config.rows, t.config.longRowCols, t.config.pitchMm);
            const drawR = markerOuterDrawRadius(t.config.markerOuterRadiusMm, t.config.markerRingWidthMm);
            const [minX, minY, maxX, maxY] = markerBounds(markers);
            return {
                w: (maxX - minX) + 2 * drawR,
                h: (maxY - minY) + 2 * drawR,
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
    const containerRef = useRef<HTMLDivElement>(null);
    const hasAutoFit = useRef(false);

    const dims = useMemo(() => {
        const page = resolvePageDimensions(state.page);
        const board = computeBoardDims(state);
        return { page, board };
    }, [state]);

    /** Compute the zoom level that fits the page into the container. */
    const computeFitZoom = useCallback(() => {
        const container = containerRef.current;
        if (!container) return 1;
        const { clientWidth, clientHeight } = container;
        const padding = 40; // px breathing room
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
        setZoom((z) => Math.min(10, z * 1.1));
    }, []);

    const zoomOut = useCallback(() => {
        setZoom((z) => Math.max(0.1, z / 1.1));
    }, []);

    // Auto-fit on first render
    useEffect(() => {
        if (!containerRef.current) return;
        const id = requestAnimationFrame(() => {
            if (!hasAutoFit.current) {
                hasAutoFit.current = true;
                fitToScreen();
            }
        });
        return () => cancelAnimationFrame(id);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        setZoom((z) => Math.max(0.1, Math.min(10, z * factor)));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        // Right-click (button 2) to pan — works with trackpad two-finger click
        if (e.button !== 2) return;
        e.preventDefault();
        setDragging(true);
        lastMouse.current = { x: e.clientX, y: e.clientY };
        dragDistance.current = 0;
    }, []);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragging) return;
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            dragDistance.current += Math.abs(dx) + Math.abs(dy);
            lastMouse.current = { x: e.clientX, y: e.clientY };
            setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        },
        [dragging],
    );

    const handleMouseUp = useCallback(() => setDragging(false), []);

    // Click-to-place circles for markerboard.
    // Uses SVG getScreenCTM() to robustly convert viewport coordinates
    // to SVG user-space coordinates (which equal mm in our viewBox).
    const handleClick = useCallback(
        (e: React.MouseEvent) => {
            if (state.target.targetType !== "markerboard") return;

            const container = containerRef.current;
            if (!container) return;

            const svg = container.querySelector("svg") as SVGSVGElement | null;
            if (!svg) return;

            const ctm = svg.getScreenCTM();
            if (!ctm) return;

            // Convert viewport click to SVG user-space (viewBox units = mm)
            const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
            const mmX = pt.x;
            const mmY = pt.y;

            const config = state.target.config;
            const page = dims.page;

            // Board geometry
            const totalCols = config.innerCols + 1;
            const totalRows = config.innerRows + 1;
            const sq = config.squareSizeMm;
            const boardW = totalCols * sq;
            const boardH = totalRows * sq;
            const boardOx = (page.widthMm - boardW) / 2;
            const boardOy = (page.heightMm - boardH) / 2;

            // Check if inside board
            const bx = mmX - boardOx;
            const by = mmY - boardOy;
            if (bx < 0 || bx >= boardW || by < 0 || by >= boardH) return;

            const col = Math.floor(bx / sq);
            const row = Math.floor(by / sq);

            // Toggle circle at this cell
            const existing = config.circles.findIndex(
                (c) => c.cell.i === row && c.cell.j === col,
            );

            let next;
            if (existing >= 0) {
                next = config.circles.filter((_, i) => i !== existing);
            } else {
                next = [...config.circles, { cell: { i: row, j: col } }];
            }

            dispatch({ type: "UPDATE_CONFIG", partial: { circles: next } });
        },
        [state.target, dims.page, dispatch],
    );

    const isMarkerboard = state.target.targetType === "markerboard";

    const handleContextMenu = useCallback((e: React.MouseEvent) => {
        e.preventDefault(); // suppress context menu — right-click is used for panning
    }, []);

    return (
        <div
            ref={containerRef}
            className={
                "relative flex-1 overflow-hidden bg-muted/20 " +
                (isMarkerboard ? "cursor-crosshair" : "cursor-default")
            }
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onClick={handleClick}
            onContextMenu={handleContextMenu}
        >
            {/* SVG preview */}
            <div
                className="absolute inset-0 flex items-center justify-center"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "center center",
                }}
            >
                <div
                    className="shadow-lg bg-white"
                    dangerouslySetInnerHTML={{ __html: state.previewSvg }}
                />
            </div>

            {/* Board dimensions overlay */}
            <div className="absolute bottom-3 left-3 rounded-md bg-background/80 backdrop-blur-sm border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground leading-relaxed">
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

            {/* Zoom controls */}
            <div className="absolute top-3 right-3">
                <ZoomControls
                    onZoomIn={zoomIn}
                    onZoomOut={zoomOut}
                    onFit={fitToScreen}
                    onActual={zoomTo100}
                    zoomPercent={Math.round(zoom * 100)}
                />
            </div>
        </div>
    );
}
