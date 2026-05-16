import { useEffect, useState } from "react";

export interface ScrollSpyOptions {
    /**
     * Fraction of viewport height that defines the "active band" threshold.
     * A heading is considered active when its top edge has scrolled above
     * `window.innerHeight * bandFraction` pixels from the top of the viewport.
     *
     * Matches the 0.2 band used in `TableOfContents.tsx`.
     * @default 0.2
     */
    bandFraction?: number;
}

/**
 * Returns the `id` of the last element (from `ids`) whose top edge has
 * crossed above the active-band threshold, or `null` if none have.
 *
 * Strategy mirrors `TableOfContents.tsx`: a rAF-throttled listener on
 * `window` scroll and resize events walks `ids` in order and picks the
 * last element whose `getBoundingClientRect().top ≤ innerHeight * bandFraction`.
 * If no element has crossed the band yet, the first id in the list wins.
 *
 * SSR-safe: all `window`/`document` access is guarded; returns `null`
 * during server-side rendering.
 *
 * @param ids   Ordered array of DOM element `id` strings to watch.
 * @param options Optional configuration.
 */
export default function useScrollSpy(
    ids: string[],
    options?: ScrollSpyOptions,
): string | null {
    const bandFraction = options?.bandFraction ?? 0.2;

    const [activeId, setActiveId] = useState<string | null>(() => {
        if (typeof window === "undefined" || ids.length === 0) return null;
        return ids[0] ?? null;
    });

    useEffect(() => {
        if (typeof window === "undefined" || ids.length === 0) return;

        const update = () => {
            const threshold = window.innerHeight * bandFraction;
            let next: string | null = null;
            for (const id of ids) {
                const el = document.getElementById(id);
                if (!el) continue;
                if (el.getBoundingClientRect().top <= threshold) {
                    next = id;
                } else {
                    break;
                }
            }
            // If no heading has crossed the band yet, fall back to the first
            // visible id (first in the list), matching TableOfContents behaviour.
            setActiveId(next ?? ids[0] ?? null);
        };

        let rafId: number | null = null;
        const onScroll = () => {
            if (rafId !== null) return;
            rafId = requestAnimationFrame(() => {
                update();
                rafId = null;
            });
        };

        update();
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onScroll);
            if (rafId !== null) cancelAnimationFrame(rafId);
        };
    // Re-subscribe whenever the id list or band fraction changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ids.join(","), bandFraction]);

    // When `ids` is empty there is nothing to spy on — return null regardless
    // of whatever stale state was left from a previous non-empty list.
    return ids.length === 0 ? null : activeId;
}
