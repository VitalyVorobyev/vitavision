import { useEffect, useRef, useState } from "react";

/**
 * Tracks an element's measured content-box width via `ResizeObserver`, for
 * layouts (SVG strips, canvases) that need their real pixel width rather than
 * scaling inside a `viewBox`. Returns `fallback` until the element is mounted
 * and observed (SSR, first paint) — callers should pick a fallback close to
 * the element's typical rendered width so the first paint doesn't visibly
 * jump once the real measurement arrives.
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
    const ref = useRef<T>(null);
    const [width, setWidth] = useState(fallback);
    useEffect(() => {
        const el = ref.current;
        if (!el || typeof ResizeObserver === "undefined") return;
        const ro = new ResizeObserver(([entry]) => {
            const w = Math.round(entry.contentRect.width);
            if (w > 0) setWidth(w);
        });
        ro.observe(el);
        return () => ro.disconnect();
    }, []);
    return [ref, width] as const;
}
