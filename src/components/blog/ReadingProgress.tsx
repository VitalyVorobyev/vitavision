import { useEffect, useRef, useState, type RefObject } from "react";

interface ReadingProgressProps {
    articleRef: RefObject<HTMLElement | null>;
}

/**
 * A 2px fixed progress bar that sits just below the sticky navbar (top-16 = 64px).
 * Progress is computed from the article element bounds:
 *   (scrollY - articleTop) / (articleHeight - viewportHeight), clamped to [0, 1].
 * Updates are throttled via requestAnimationFrame.
 * Respects prefers-reduced-motion — no CSS transition on the transform.
 * Hidden until the first scroll event fires to avoid a flash at 0%.
 */
export default function ReadingProgress({ articleRef }: ReadingProgressProps) {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);
    const rafId = useRef<number | null>(null);
    const hasScrolled = useRef(false);
    const prefersReducedMotion =
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
            : false;

    useEffect(() => {
        const compute = () => {
            const article = articleRef.current;
            if (!article) return;

            const rect = article.getBoundingClientRect();
            // articleTop in page coords
            const articleTop = rect.top + window.scrollY;
            const articleHeight = article.offsetHeight;
            const viewportHeight = window.innerHeight;

            const scrollable = articleHeight - viewportHeight;
            if (scrollable <= 0) {
                setProgress(1);
                return;
            }

            const raw = (window.scrollY - articleTop) / scrollable;
            setProgress(Math.min(1, Math.max(0, raw)));
        };

        const onScroll = () => {
            if (!hasScrolled.current) {
                hasScrolled.current = true;
                setVisible(true);
            }
            if (rafId.current !== null) return;
            rafId.current = requestAnimationFrame(() => {
                compute();
                rafId.current = null;
            });
        };

        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (rafId.current !== null) {
                cancelAnimationFrame(rafId.current);
                rafId.current = null;
            }
        };
        // articleRef is a stable ref object — its identity never changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    if (!visible) return null;

    return (
        <div
            aria-hidden="true"
            className="fixed left-0 top-16 z-30 h-[2px] w-full"
        >
            <div
                className="h-full w-full origin-left bg-[hsl(var(--brand))]"
                style={{
                    transform: `scaleX(${progress})`,
                    transition: prefersReducedMotion ? "none" : undefined,
                }}
            />
        </div>
    );
}
