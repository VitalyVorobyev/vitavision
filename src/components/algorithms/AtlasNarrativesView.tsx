import { useMemo } from "react";
import { narrativePages } from "../../generated/content-index.ts";
import SeoHead from "../seo/SeoHead.tsx";
import NarrativeCard from "../narratives/NarrativeCard.tsx";
import AlgorithmsViewToggle from "./AlgorithmsViewToggle.tsx";
import type { AlgorithmsView } from "../../hooks/useAlgorithmsFilters.ts";

/**
 * Narratives are long-form essays over a small curated graph — they have no
 * kind/tag/problem facets, so this view ignores the catalog filters entirely
 * and just lists what's published, newest first.
 */
function NarrativesList({ showDrafts }: { showDrafts: boolean }) {
    const entries = useMemo(
        () =>
            narrativePages
                .filter((n) => showDrafts || !n.draft)
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        [showDrafts],
    );

    if (entries.length === 0) {
        return (
            <div className="rounded-[10px] border border-dashed border-border px-6 py-12 text-center">
                <p className="m-0 text-[14px] font-medium text-foreground">Narratives are coming soon</p>
                <p className="m-0 mt-1.5 text-[13px] text-muted-foreground">
                    Guided walks through the atlas — a handful of pages read in the order they
                    actually build on each other.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {entries.map((entry) => (
                <NarrativeCard key={entry.slug} entry={entry} />
            ))}
        </div>
    );
}

interface AtlasNarrativesViewProps {
    isDesktop: boolean;
    view: AlgorithmsView;
    setView: (view: AlgorithmsView) => void;
    isAdmin: boolean;
}

/** The Atlas narratives view — full-width, no sidebar/facets. */
export default function AtlasNarrativesView({ isDesktop, view, setView, isAdmin }: AtlasNarrativesViewProps) {
    if (isDesktop) {
        return (
            <div className="flex flex-1 flex-col">
                <SeoHead
                    title="Atlas narratives"
                    description="Guided walks through the computer vision atlas — long-form essays over a curated constellation of pages and papers."
                />
                <main className="mx-auto w-full min-w-0 max-w-[1000px] flex-1 px-6 py-5">
                    <div className="mb-1 flex items-baseline justify-between">
                        <h1 className="text-[22px] font-bold -tracking-[0.4px]">Narratives</h1>
                        <AlgorithmsViewToggle view={view} onChange={setView} />
                    </div>
                    <p className="mb-4 text-[13px] text-muted-foreground">
                        Long-form walks through the atlas — a constellation of pages and papers,
                        read in the order they build on each other.
                    </p>
                    <NarrativesList showDrafts={isAdmin} />
                </main>
            </div>
        );
    }

    // Mobile narratives view — card list, no facets
    return (
        <div className="mx-auto w-full min-w-0 max-w-[640px] px-4 py-5">
            <SeoHead
                title="Atlas narratives"
                description="Guided walks through the computer vision atlas — long-form essays over a curated constellation of pages and papers."
            />
            <div className="mb-4 flex items-baseline justify-between">
                <h1 className="text-[22px] font-bold -tracking-[0.5px]">Narratives</h1>
                <AlgorithmsViewToggle view={view} onChange={setView} />
            </div>
            <NarrativesList showDrafts={isAdmin} />
        </div>
    );
}
