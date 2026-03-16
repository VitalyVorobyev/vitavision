import { useState, useRef, useCallback, useMemo } from "react";
import type { TargetGeneratorState } from "./types";
import { resolvePageDimensions } from "./svg/paperConstants";

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
    }
}

interface Props {
    state: TargetGeneratorState;
}

export default function TargetPreview({ state }: Props) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [dragging, setDragging] = useState(false);
    const lastMouse = useRef({ x: 0, y: 0 });

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
        setZoom((z) => Math.max(0.1, Math.min(10, z * factor)));
    }, []);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        if (e.button !== 0) return;
        setDragging(true);
        lastMouse.current = { x: e.clientX, y: e.clientY };
    }, []);

    const handleMouseMove = useCallback(
        (e: React.MouseEvent) => {
            if (!dragging) return;
            const dx = e.clientX - lastMouse.current.x;
            const dy = e.clientY - lastMouse.current.y;
            lastMouse.current = { x: e.clientX, y: e.clientY };
            setPan((p) => ({ x: p.x + dx, y: p.y + dy }));
        },
        [dragging],
    );

    const handleMouseUp = useCallback(() => setDragging(false), []);

    const isCharucoPreview = state.target.targetType === "charuco" && !state.finalSvg;

    const dims = useMemo(() => {
        const page = resolvePageDimensions(state.page);
        const board = computeBoardDims(state);
        return { page, board };
    }, [state]);

    return (
        <div
            className="relative flex-1 overflow-hidden bg-muted/20 cursor-grab active:cursor-grabbing"
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
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

            {/* Preview badge for charuco */}
            {isCharucoPreview && (
                <div className="absolute top-3 left-3 rounded-md bg-amber-100 dark:bg-amber-900/60 border border-amber-300 dark:border-amber-700 px-2 py-1 text-[11px] text-amber-800 dark:text-amber-200">
                    Preview — click Generate for actual markers
                </div>
            )}

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

            {/* Zoom indicator */}
            <div className="absolute bottom-3 right-3 rounded-md bg-background/80 backdrop-blur-sm border border-border px-2 py-1 text-[11px] text-muted-foreground">
                {Math.round(zoom * 100)}%
            </div>
        </div>
    );
}
