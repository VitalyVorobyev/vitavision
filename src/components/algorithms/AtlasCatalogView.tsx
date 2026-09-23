import { useState } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import SeoHead from "../seo/SeoHead.tsx";
import AlgorithmsSidebar from "./AlgorithmsSidebar.tsx";
import AlgorithmsFilterSheet from "./AlgorithmsFilterSheet.tsx";
import AlgorithmsViewToggle from "./AlgorithmsViewToggle.tsx";
import ActiveTagChips from "./ActiveTagChips.tsx";
import RecentlyAddedSection from "./RecentlyAddedSection.tsx";
import UnifiedResults from "./UnifiedResults.tsx";
import useAtlasCatalog from "../../hooks/useAtlasCatalog.ts";
import type { AlgorithmsFilters, AlgorithmsKind, AlgorithmsView } from "../../hooks/useAlgorithmsFilters.ts";

interface AtlasCatalogViewProps {
    isDesktop: boolean;
    isAdmin: boolean;
    filters: AlgorithmsFilters;
    setKind: (kind: AlgorithmsKind) => void;
    setQuery: (q: string) => void;
    setView: (view: AlgorithmsView) => void;
    setProblem: (problem: string) => void;
    toggleTag: (tag: string) => void;
    setTags: (tags: string[]) => void;
    reset: () => void;
}

/** The default Atlas view — sidebar/sheet facets + a filtered, grouped card grid or list. */
export default function AtlasCatalogView({
    isDesktop,
    isAdmin,
    filters,
    setKind,
    setQuery,
    setView,
    setProblem,
    toggleTag,
    setTags,
    reset,
}: AtlasCatalogViewProps) {
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);
    const { facets, unifiedGroups, recentEntries, showRecentlyAdded } = useAtlasCatalog(filters, isAdmin);

    // Mobile active filter badge count (problem filter only)
    const activeCount = filters.problem !== "all" ? 1 : 0;

    if (isDesktop) {
        return (
            <div className="flex flex-1 flex-col">
                <SeoHead
                    title="Atlas"
                    description="Practical computer vision atlas — algorithms, models, and concepts."
                />

                <div className="grid flex-1 grid-cols-[220px_minmax(0,1fr)]">
                    {/* Sidebar */}
                    <AlgorithmsSidebar
                        filters={filters}
                        facets={facets}
                        onKindChange={setKind}
                        onProblemChange={setProblem}
                    />

                    {/* Main column */}
                    <main className="px-10 py-5">
                        {/* Header row */}
                        <div className="flex items-baseline justify-between mb-1">
                            <h1 className="text-[22px] font-bold -tracking-[0.4px]">
                                Atlas{" "}
                                <span className="text-muted-foreground font-normal text-[15px] ml-1.5">
                                    {facets.total}
                                </span>
                            </h1>

                            {/* Right cluster */}
                            <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
                                {/* Search */}
                                <div className="w-[200px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[hsl(var(--border)/0.7)] bg-[hsl(var(--bg-soft))]">
                                    <Search size={13} className="shrink-0 text-muted-foreground" />
                                    <input
                                        type="search"
                                        placeholder="Search…"
                                        value={filters.query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        className="flex-1 bg-transparent outline-none text-xs placeholder:text-muted-foreground text-foreground min-w-0"
                                    />
                                </div>

                                <AlgorithmsViewToggle
                                    view={filters.view}
                                    onChange={setView}
                                />
                            </div>
                        </div>

                        {/* Subtitle */}
                        <p className="text-[13px] text-muted-foreground mb-3">
                            Practical computer vision atlas — algorithms, models, and concepts.
                        </p>

                        {/* Active tag chips */}
                        {filters.tags.length > 0 && (
                            <div className="mb-4">
                                <ActiveTagChips
                                    tags={filters.tags}
                                    onRemove={toggleTag}
                                    onClearAll={() => setTags([])}
                                />
                            </div>
                        )}

                        {/* Results */}
                        {showRecentlyAdded && (
                            <RecentlyAddedSection entries={recentEntries} layout={filters.view === "list" ? "list" : "grid"} />
                        )}
                        <UnifiedResults
                            groups={unifiedGroups}
                            layout={filters.view === "list" ? "list" : "grid"}
                        />
                    </main>
                </div>
            </div>
        );
    }

    // ── Mobile layout ───────────────────────────────────────────────────────

    return (
        <div className="w-full min-w-0 max-w-[640px] mx-auto px-4 py-5 space-y-4">
            <SeoHead
                title="Atlas"
                description="Practical computer vision atlas — algorithms, models, and concepts."
            />

            {/* Title row */}
            <div className="flex items-baseline justify-between">
                <h1 className="text-[22px] font-bold -tracking-[0.5px]">Atlas</h1>
                <span className="text-xs text-muted-foreground">
                    {facets.total} entries
                </span>
            </div>

            {/* Segmented Type control */}
            <div
                role="radiogroup"
                aria-label="Type"
                className="grid grid-cols-4 gap-[3px] p-[3px] bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border)/0.8)] rounded-lg"
            >
                {(
                    [
                        ["all",       "All"],
                        ["algorithm", "Algos"],
                        ["model",     "Models"],
                        ["concept",   "Concepts"],
                    ] as const
                ).map(([key, label]) => {
                    const active = filters.kind === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => setKind(key)}
                            className={`py-[7px] rounded-[5px] text-center text-[12px] transition-colors ${
                                active
                                    ? "bg-[hsl(var(--surface-hi))] text-foreground font-semibold"
                                    : "text-muted-foreground"
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* Filters pill */}
            <button
                type="button"
                onClick={() => setFilterSheetOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2 text-xs border border-[hsl(var(--border)/0.8)] bg-[hsl(var(--bg-soft))] rounded-lg text-[hsl(var(--foreground)/0.8)]"
            >
                <span className="flex items-center gap-1.5">
                    <SlidersHorizontal size={13} />
                    <span className="text-[13px]">Filters</span>
                    {activeCount > 0 && (
                        <span className="text-[10px] font-bold bg-brand text-background rounded-full px-1.5 leading-none py-[2px]">
                            {activeCount}
                        </span>
                    )}
                </span>
                <ChevronDown size={13} className="text-muted-foreground" />
            </button>

            {/* Active tag chips */}
            <ActiveTagChips
                tags={filters.tags}
                onRemove={toggleTag}
                onClearAll={() => setTags([])}
            />

            {/* Card sections */}
            {showRecentlyAdded && (
                <RecentlyAddedSection entries={recentEntries} layout="list" />
            )}
            <UnifiedResults
                groups={unifiedGroups}
                layout="list"
                isMobile={true}
            />

            {/* Filter sheet (mobile) */}
            <AlgorithmsFilterSheet
                open={filterSheetOpen}
                onClose={() => setFilterSheetOpen(false)}
                filters={filters}
                facets={facets}
                totalResults={facets.total}
                onKindChange={setKind}
                onProblemChange={setProblem}
                onReset={reset}
            />
        </div>
    );
}
