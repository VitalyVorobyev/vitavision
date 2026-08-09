import { useRef } from 'react';
import { TableOfContents } from 'vitcv';

// TableOfContents scrapes h1/h2/h3 (that carry an `id`) out of the element
// behind `articleRef`, so a truthful preview has to render a real article
// alongside it — that is also how the blog layout composes it.
function Article() {
    return (
        <article className="max-w-md space-y-3">
            <h1 id="zhang-calibration" className="text-lg font-serif font-semibold">
                Zhang&rsquo;s planar calibration
            </h1>
            <p className="text-sm text-muted-foreground">
                A closed-form solution from at least three views of a planar target,
                refined by nonlinear least squares.
            </p>
            <h2 id="homography" className="text-base font-serif font-semibold">
                Estimating the homography
            </h2>
            <p className="text-sm text-muted-foreground">
                Each view gives a homography between the model plane and the image.
            </p>
            <h3 id="normalisation" className="text-sm font-serif font-semibold">
                Data normalisation
            </h3>
            <h2 id="intrinsics" className="text-base font-serif font-semibold">
                Closed-form intrinsics
            </h2>
            <h2 id="refinement" className="text-base font-serif font-semibold">
                Nonlinear refinement
            </h2>
        </article>
    );
}

export const WithArticle = () => {
    const ref = useRef<HTMLElement>(null);
    return (
        <div className="flex gap-10">
            <div ref={ref as never}>
                <Article />
            </div>
            <div className="w-56 shrink-0">
                <TableOfContents articleRef={ref} deps={[]} />
            </div>
        </div>
    );
};

export const SidebarOnly = () => {
    const ref = useRef<HTMLElement>(null);
    return (
        <div style={{ width: 240 }}>
            <div ref={ref as never} className="hidden">
                <Article />
            </div>
            <TableOfContents articleRef={ref} deps={[]} />
        </div>
    );
};
