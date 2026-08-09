import { useEffect, useRef } from 'react';
import { ReadingProgress } from 'vitcv';

// ReadingProgress computes its bar width from a real scroll event: it reads
// articleRef.current.getBoundingClientRect() and window.scrollY, and only
// renders once the first "scroll" event has fired. A static capture never
// scrolls, so this hook fakes the article's geometry (per-instance only —
// it never touches window.scrollY) and dispatches one synthetic scroll
// event, letting the real component compute a real, stable progress value
// for a chosen read-through fraction.
function useArticleReadAt(fraction: number) {
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const scrollable = 1400;
        const height = window.innerHeight + scrollable;
        const top = -(fraction * scrollable);
        Object.defineProperty(el, "offsetHeight", { configurable: true, value: height });
        el.getBoundingClientRect = () =>
            ({
                top,
                bottom: top + height,
                left: 0,
                right: 320,
                width: 320,
                height,
                x: 0,
                y: top,
                toJSON() {},
            }) as DOMRect;
        window.dispatchEvent(new Event("scroll"));
    }, [fraction]);

    return ref;
}

const ArticleTeaser = ({ heading, body }: { heading: string; body: string }) => (
    <div className="rounded-lg border border-border bg-background p-4" style={{ width: 320 }}>
        <p className="text-sm font-semibold text-foreground">{heading}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
);

export const EarlyInArticle = () => {
    const ref = useArticleReadAt(0.12);
    return (
        <div>
            <ReadingProgress articleRef={ref} />
            <div ref={ref}>
                <ArticleTeaser
                    heading="Zhang's Method: Camera Calibration from Planar Homographies"
                    body="A single planar checkerboard, observed from several viewpoints, is enough to recover both the intrinsic matrix and per-view extrinsics."
                />
            </div>
        </div>
    );
};

export const MidwayThroughArticle = () => {
    const ref = useArticleReadAt(0.52);
    return (
        <div>
            <ReadingProgress articleRef={ref} />
            <div ref={ref}>
                <ArticleTeaser
                    heading="Sub-Pixel Corner Refinement"
                    body="Once the coarse Harris response localizes a corner to the nearest pixel, a local quadratic fit over the response surface pulls the estimate to sub-pixel accuracy."
                />
            </div>
        </div>
    );
};

export const NearlyDoneReading = () => {
    const ref = useArticleReadAt(0.9);
    return (
        <div>
            <ReadingProgress articleRef={ref} />
            <div ref={ref}>
                <ArticleTeaser
                    heading="Brown-Conrady Distortion in Practice"
                    body="Radial terms k1-k3 dominate for wide-angle lenses; tangential p1-p2 correct for sensor tilt. Fitting all five at once on noisy detections can overfit."
                />
            </div>
        </div>
    );
};
