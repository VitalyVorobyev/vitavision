// Pan/zoom viewport hook for the graph canvas — extracted from GraphExplorer.tsx.
//
// Owns the whiteboard-style pan/zoom state: pointer-capture panning on the
// background, zoom-to-cursor wheel handling, and a fit-to-bounds helper.
// Content-agnostic — the caller supplies the content's bounding box and a
// key that changes on navigation (to tell an animated re-fit apart from a
// resize-triggered one).
//
// Touch policy (see repo CLAUDE.md "Touch & mobile interaction"): the
// element `viewportRef` is attached to MUST set `touchAction: "none"` in its
// inline style. Without it, the browser claims touch drags as a page
// scroll/pan gesture before pointer-capture can win, and panning becomes
// impossible on touch devices. This hook does not render the element itself,
// so it cannot set that style for you — the caller must set it explicitly.

import { useCallback, useEffect, useRef, useState } from "react";

export interface ViewportBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

export interface ViewportState {
    x:     number;
    y:     number;
    scale: number;
}

export interface UseViewportOptions {
    /** Bounding box (content coordinates) to fit into the viewport, or null when there's nothing to fit yet. */
    bounds: ViewportBounds | null;
    /**
     * Changing this value (e.g. the focused node's slug) triggers an animated re-fit on the next
     * effect pass; an unchanged key (e.g. a resize or a bounds recompute) re-fits without animation.
     */
    refitKey: unknown;
    /** Padding (content px) added around `bounds` before fitting. Default 64. */
    fitPadding?: number;
    /** Min scale clamp used by fitView. Default 0.3. */
    fitScaleMin?: number;
    /** Max scale clamp used by fitView. Default 1.6. */
    fitScaleMax?: number;
    /** Min scale clamp used by wheel-zoom and zoomAroundCenter. Default 0.3. */
    zoomScaleMin?: number;
    /** Max scale clamp used by wheel-zoom and zoomAroundCenter. Default 2. */
    zoomScaleMax?: number;
    /** Called when a pan gesture starts on the background, before the drag begins. */
    onPanStart?: () => void;
}

export interface UseViewportResult {
    /**
     * Attach to the pannable/zoomable container element. MUST have
     * `touchAction: "none"` set in that element's inline style — see module docs above.
     */
    viewportRef: React.RefObject<HTMLDivElement | null>;
    /** Attach to the transformed content plane inside the viewport, so background clicks (pan) can be told apart from card clicks. */
    planeRef: React.RefObject<HTMLDivElement | null>;
    view:    ViewportState;
    animate: boolean;
    vp:      { w: number; h: number };
    fitView: (animated: boolean) => void;
    zoomAroundCenter: (factor: number) => void;
    onPointerDown:   (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove:   (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp:     (e: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (e: React.PointerEvent<HTMLDivElement>) => void;
}

function clamp(v: number, lo: number, hi: number): number {
    return Math.max(lo, Math.min(hi, v));
}

export function useViewport({
    bounds,
    refitKey,
    fitPadding = 64,
    fitScaleMin = 0.3,
    fitScaleMax = 1.6,
    zoomScaleMin = 0.3,
    zoomScaleMax = 2,
    onPanStart,
}: UseViewportOptions): UseViewportResult {
    const viewportRef = useRef<HTMLDivElement>(null);
    const planeRef    = useRef<HTMLDivElement>(null);

    const [view,    setView]    = useState<ViewportState>({ x: 0, y: 0, scale: 1 });
    const [animate, setAnimate] = useState(false);
    const [vp,      setVp]      = useState<{ w: number; h: number }>({ w: 0, h: 0 });

    // Track viewport size via ResizeObserver
    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const ro = new ResizeObserver((entries) => {
            const e = entries[0];
            if (e) setVp({ w: e.contentRect.width, h: e.contentRect.height });
        });
        ro.observe(el);
        // Read initial size synchronously
        setVp({ w: el.clientWidth, h: el.clientHeight });
        return () => ro.disconnect();
    }, []);

    // ── fitView ────────────────────────────────────────────────────────────────

    const fitView = useCallback((animated: boolean) => {
        if (!bounds || vp.w === 0 || vp.h === 0) return;

        let minX = bounds.minX, minY = bounds.minY, maxX = bounds.maxX, maxY = bounds.maxY;
        minX -= fitPadding; minY -= fitPadding; maxX += fitPadding; maxY += fitPadding;
        const bboxW = maxX - minX;
        const bboxH = maxY - minY;

        const scale = clamp(Math.min(vp.w / bboxW, vp.h / bboxH), fitScaleMin, fitScaleMax);
        const x = (vp.w - bboxW * scale) / 2 - minX * scale;
        const y = (vp.h - bboxH * scale) / 2 - minY * scale;

        setAnimate(animated);
        setView({ x, y, scale });
    }, [bounds, vp, fitPadding, fitScaleMin, fitScaleMax]);

    // Auto-fit on refocus / bounds change / viewport resize
    const prevKeyRef = useRef<unknown>(refitKey);
    useEffect(() => {
        if (vp.w === 0) return;
        const didNavigate = prevKeyRef.current !== refitKey;
        prevKeyRef.current = refitKey;
        fitView(didNavigate);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refitKey, bounds, vp.w, vp.h]);

    // ── Non-passive wheel listener for zoom-to-cursor ─────────────────────────

    const viewRef = useRef(view);
    useEffect(() => { viewRef.current = view; }, [view]);

    useEffect(() => {
        const el = viewportRef.current;
        if (!el) return;
        const onWheel = (e: WheelEvent) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            const v = viewRef.current;
            const newScale = clamp(v.scale * factor, zoomScaleMin, zoomScaleMax);
            const rect = el.getBoundingClientRect();
            const cx = e.clientX - rect.left;
            const cy = e.clientY - rect.top;
            const gx = (cx - v.x) / v.scale;
            const gy = (cy - v.y) / v.scale;
            const nx = cx - gx * newScale;
            const ny = cy - gy * newScale;
            setAnimate(false);
            setView({ x: nx, y: ny, scale: newScale });
        };
        el.addEventListener("wheel", onWheel, { passive: false });
        return () => el.removeEventListener("wheel", onWheel);
    }, [zoomScaleMin, zoomScaleMax]);

    // ── Pan (pointer drag on background) ─────────────────────────────────────

    const panState = useRef<{ startX: number; startY: number; startVx: number; startVy: number } | null>(null);

    const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        // Only pan when clicking on the viewport background or the plane itself (not cards)
        const t = e.target as HTMLElement;
        const isBackground = t === viewportRef.current || t === planeRef.current;
        if (!isBackground) return;

        onPanStart?.();

        e.currentTarget.setPointerCapture(e.pointerId);
        setAnimate(false);
        panState.current = {
            startX:  e.clientX,
            startY:  e.clientY,
            startVx: viewRef.current.x,
            startVy: viewRef.current.y,
        };
    }, [onPanStart]);

    const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        if (!panState.current) return;
        const dx = e.clientX - panState.current.startX;
        const dy = e.clientY - panState.current.startY;
        setView((v) => ({
            ...v,
            x: panState.current!.startVx + dx,
            y: panState.current!.startVy + dy,
        }));
    }, []);

    const onPointerUp = useCallback(() => {
        panState.current = null;
    }, []);

    // ── Zoom controls helper ───────────────────────────────────────────────────

    const zoomAroundCenter = useCallback((factor: number) => {
        const el = viewportRef.current;
        if (!el) return;
        const v = viewRef.current;
        const cx = el.clientWidth  / 2;
        const cy = el.clientHeight / 2;
        const newScale = clamp(v.scale * factor, zoomScaleMin, zoomScaleMax);
        const gx = (cx - v.x) / v.scale;
        const gy = (cy - v.y) / v.scale;
        setAnimate(true);
        setView({ x: cx - gx * newScale, y: cy - gy * newScale, scale: newScale });
    }, [zoomScaleMin, zoomScaleMax]);

    return {
        viewportRef,
        planeRef,
        view,
        animate,
        vp,
        fitView,
        zoomAroundCenter,
        onPointerDown,
        onPointerMove,
        onPointerUp,
        onPointerCancel: onPointerUp,
    };
}
