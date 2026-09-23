import { lazy, Suspense } from "react";
import SeoHead from "../seo/SeoHead.tsx";
import AlgorithmsViewToggle from "./AlgorithmsViewToggle.tsx";
import type { AlgorithmsView } from "../../hooks/useAlgorithmsFilters.ts";

// Code-split: the graph explorer is only needed when the reader picks the
// graph view, so it ships as its own chunk.
const GraphExplorer = lazy(() => import("../atlas/GraphExplorer.tsx"));

// Same box as GraphExplorer's own root container, so the Suspense fallback
// doesn't cause a layout jump while the chunk loads.
const GRAPH_BOX_CLASS = "flex flex-col h-[calc(100vh-11rem)] min-h-[460px]";

function GraphFallback() {
    return (
        <div className={`${GRAPH_BOX_CLASS} items-center justify-center text-[13px] text-muted-foreground`}>
            Loading graph…
        </div>
    );
}

interface AtlasGraphViewProps {
    isDesktop: boolean;
    view: AlgorithmsView;
    setView: (view: AlgorithmsView) => void;
    focusParam?: string;
}

/** The Atlas graph-explorer view — full-width, no sidebar/facets. */
export default function AtlasGraphView({ isDesktop, view, setView, focusParam }: AtlasGraphViewProps) {
    if (isDesktop) {
        return (
            <div className="flex flex-1 flex-col">
                <SeoHead
                    title="Atlas"
                    description="Practical computer vision atlas — algorithms, models, and concepts."
                />
                <main className="flex flex-1 flex-col min-w-0 px-6 py-5">
                    <div className="flex items-baseline justify-between mb-3">
                        <h1 className="text-[22px] font-bold -tracking-[0.4px]">Atlas</h1>
                        <AlgorithmsViewToggle view={view} onChange={setView} />
                    </div>
                    {/* key remounts on external ?focus= change so the
                        graph re-centers; internal trail nav never touches
                        ?focus=, so it does not trigger a remount. */}
                    <Suspense fallback={<GraphFallback />}>
                        <GraphExplorer key={focusParam ?? ""} focusSlug={focusParam} />
                    </Suspense>
                </main>
            </div>
        );
    }

    // Mobile graph view — render focused entry + neighbor lists, skip catalog
    return (
        <div className="w-full min-w-0 max-w-[640px] mx-auto px-4 py-5">
            <SeoHead
                title="Atlas"
                description="Practical computer vision atlas — algorithms, models, and concepts."
            />

            {/* Title row */}
            <div className="flex items-baseline justify-between mb-4">
                <h1 className="text-[22px] font-bold -tracking-[0.5px]">Atlas</h1>
                <AlgorithmsViewToggle view={view} onChange={setView} />
            </div>

            <Suspense fallback={<GraphFallback />}>
                <GraphExplorer key={focusParam ?? ""} focusSlug={focusParam} />
            </Suspense>
        </div>
    );
}
