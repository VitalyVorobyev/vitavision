import { useCallback, useEffect, useRef, useState } from "react";
import type Konva from "konva";

interface GestureParams {
    pan: { x: number; y: number };
    setZoom: (z: number) => void;
    setPan: (p: { x: number; y: number }) => void;
}

export function useCanvasGestures({ pan, setZoom, setPan }: GestureParams) {
    const [isPanning, setIsPanning] = useState(false);
    const [touchOnly, setTouchOnly] = useState(() =>
        typeof window !== "undefined" && !window.matchMedia("(pointer: fine)").matches,
    );
    const lastPanPointerRef = useRef<{ x: number; y: number } | null>(null);
    const panRef = useRef(pan);
    const lastTouchDist = useRef<number | null>(null);
    const lastTouchCenter = useRef<{ x: number; y: number } | null>(null);

    useEffect(() => {
        panRef.current = pan;
    }, [pan]);

    useEffect(() => {
        const mql = window.matchMedia("(pointer: fine)");
        const handler = (event: MediaQueryListEvent) => setTouchOnly(!event.matches);
        mql.addEventListener("change", handler);
        return () => mql.removeEventListener("change", handler);
    }, []);

    const stopMousePan = useCallback(() => {
        setIsPanning(false);
        lastPanPointerRef.current = null;
    }, []);

    useEffect(() => {
        if (!isPanning) return;

        const handleWindowMouseMove = (event: MouseEvent) => {
            if ((event.buttons & 2) !== 2) {
                stopMousePan();
                return;
            }

            const last = lastPanPointerRef.current;
            if (!last) {
                lastPanPointerRef.current = { x: event.clientX, y: event.clientY };
                return;
            }

            const dx = event.clientX - last.x;
            const dy = event.clientY - last.y;
            if (dx === 0 && dy === 0) return;

            const nextPan = {
                x: panRef.current.x + dx,
                y: panRef.current.y + dy,
            };
            panRef.current = nextPan;
            lastPanPointerRef.current = { x: event.clientX, y: event.clientY };
            setPan(nextPan);
        };

        const handleWindowMouseUp = (event: MouseEvent) => {
            if (event.button === 2 || (event.buttons & 2) === 0) {
                stopMousePan();
            }
        };

        window.addEventListener("mousemove", handleWindowMouseMove);
        window.addEventListener("mouseup", handleWindowMouseUp);
        return () => {
            window.removeEventListener("mousemove", handleWindowMouseMove);
            window.removeEventListener("mouseup", handleWindowMouseUp);
        };
    }, [isPanning, setPan, stopMousePan]);

    const startPan = (event: MouseEvent) => {
        lastPanPointerRef.current = { x: event.clientX, y: event.clientY };
        setIsPanning(true);
    };

    const handleWheel = (event: Konva.KonvaEventObject<WheelEvent>) => {
        event.evt.preventDefault();
        const stage = event.target.getStage();
        if (!stage) return;

        const scaleBy = 1.1;
        const oldScale = stage.scaleX();
        const pointer = stage.getPointerPosition();
        if (!pointer) return;

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

    const handleTouchMove = (event: Konva.KonvaEventObject<TouchEvent>) => {
        const touches = event.evt.touches;
        if (touches.length < 2) return;
        event.evt.preventDefault();

        const stage = event.target.getStage();
        if (!stage) return;

        const t0 = { x: touches[0].clientX, y: touches[0].clientY };
        const t1 = { x: touches[1].clientX, y: touches[1].clientY };
        const dist = Math.hypot(t1.x - t0.x, t1.y - t0.y);
        const center = { x: (t0.x + t1.x) / 2, y: (t0.y + t1.y) / 2 };

        if (lastTouchDist.current !== null && lastTouchCenter.current !== null) {
            const oldScale = stage.scaleX();
            const newScale = oldScale * (dist / lastTouchDist.current);

            const rect = (stage.container() as HTMLDivElement).getBoundingClientRect();
            const stageCenter = { x: center.x - rect.left, y: center.y - rect.top };
            const mousePointTo = {
                x: (stageCenter.x - stage.x()) / oldScale,
                y: (stageCenter.y - stage.y()) / oldScale,
            };

            setZoom(newScale);
            setPan({
                x: stageCenter.x - mousePointTo.x * newScale + (center.x - lastTouchCenter.current.x),
                y: stageCenter.y - mousePointTo.y * newScale + (center.y - lastTouchCenter.current.y),
            });
        }

        lastTouchDist.current = dist;
        lastTouchCenter.current = center;
    };

    const handleTouchEnd = () => {
        lastTouchDist.current = null;
        lastTouchCenter.current = null;
    };

    return {
        isPanning,
        touchOnly,
        startPan,
        handleWheel,
        handleTouchMove,
        handleTouchEnd,
    };
}
