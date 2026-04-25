import { useMemo, useState } from "react";
import { LayoutGrid, List, Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { algorithmPages, modelPages } from "../generated/content-index.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import AlgorithmCard from "../components/blog/AlgorithmCard.tsx";
import ModelCard from "../components/blog/ModelCard.tsx";
import AlgorithmsSidebar from "../components/algorithms/AlgorithmsSidebar.tsx";
import AlgorithmsTagPicker from "../components/algorithms/AlgorithmsTagPicker.tsx";
import AlgorithmsFilterSheet from "../components/algorithms/AlgorithmsFilterSheet.tsx";
import useAlgorithmsFilters, {
    filterAlgorithms,
    filterModels,
    computeFacets,
    type AlgorithmsFilters,
} from "../hooks/useAlgorithmsFilters.ts";
import {
    algorithmCategoryValues,
    modelCategoryValues,
    type AlgorithmCategory,
    type AlgorithmIndexEntry,
    type ModelCategory,
    type ModelIndexEntry,
} from "../lib/content/schema.ts";
import { categoryLabel, modelCategoryLabel } from "../components/algorithms/categoryLabels.ts";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function computeGroupedAlgorithms(filtered: AlgorithmIndexEntry[]) {
    const byCategory = new Map<AlgorithmCategory, AlgorithmIndexEntry[]>();
    for (const entry of filtered) {
        const bucket = byCategory.get(entry.frontmatter.category) ?? [];
        bucket.push(entry);
        byCategory.set(entry.frontmatter.category, bucket);
    }
    return algorithmCategoryValues
        .map((category) => ({ category, entries: byCategory.get(category) ?? [] }))
        .filter((g) => g.entries.length > 0);
}

function computeGroupedModels(filtered: ModelIndexEntry[]) {
    const byCategory = new Map<ModelCategory, ModelIndexEntry[]>();
    for (const entry of filtered) {
        const bucket = byCategory.get(entry.frontmatter.category) ?? [];
        bucket.push(entry);
        byCategory.set(entry.frontmatter.category, bucket);
    }
    return modelCategoryValues
        .map((category) => ({ category, entries: byCategory.get(category) ?? [] }))
        .filter((g) => g.entries.length > 0);
}

// ── Section header (shared across desktop + mobile) ───────────────────────────

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-baseline gap-2.5 mt-5 mb-3">
            <span>{label}</span>
            <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">
                {count}
            </span>
        </h2>
    );
}

// ── Card grid / list ──────────────────────────────────────────────────────────

interface CardGroupProps {
    kind: "classical" | "models";
    filteredAlgorithms: AlgorithmIndexEntry[];
    filteredModels: ModelIndexEntry[];
    filters: AlgorithmsFilters;
    groupedAlgorithms: ReturnType<typeof computeGroupedAlgorithms>;
    groupedModels: ReturnType<typeof computeGroupedModels>;
    layout: "grid" | "list";
}

function CardGroup({
    kind,
    filteredAlgorithms,
    filteredModels,
    filters,
    groupedAlgorithms,
    groupedModels,
    layout,
}: CardGroupProps) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";

    if (kind === "classical") {
        if (filteredAlgorithms.length === 0) {
            return (
                <p className="text-[13px] text-muted-foreground py-6">
                    No algorithms match the current filters.
                </p>
            );
        }
        if (filters.categoryId !== "all") {
            // Flat, single category
            return (
                <div>
                    <SectionHeader
                        label={categoryLabel(filters.categoryId as AlgorithmCategory)}
                        count={filteredAlgorithms.length}
                    />
                    <div className={gridClass}>
                        {filteredAlgorithms.map((entry) => (
                            <AlgorithmCard
                                key={entry.slug}
                                entry={entry}
                                variant={layout === "list" ? "horizontal" : "compact"}
                            />
                        ))}
                    </div>
                </div>
            );
        }
        return (
            <>
                {groupedAlgorithms.map(({ category, entries }) => (
                    <div key={category}>
                        <SectionHeader
                            label={categoryLabel(category)}
                            count={entries.length}
                        />
                        <div className={gridClass}>
                            {entries.map((entry) => (
                                <AlgorithmCard
                                    key={entry.slug}
                                    entry={entry}
                                    variant={layout === "list" ? "horizontal" : "compact"}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </>
        );
    }

    // models
    if (filteredModels.length === 0) {
        return (
            <p className="text-[13px] text-muted-foreground py-6">
                No models match the current filters.
            </p>
        );
    }
    if (filters.categoryId !== "all") {
        return (
            <div>
                <SectionHeader
                    label={modelCategoryLabel(filters.categoryId as ModelCategory)}
                    count={filteredModels.length}
                />
                <div className={gridClass}>
                    {filteredModels.map((entry) => (
                        <ModelCard
                            key={entry.slug}
                            entry={entry}
                            variant={layout === "list" ? "horizontal" : "compact"}
                        />
                    ))}
                </div>
            </div>
        );
    }
    return (
        <>
            {groupedModels.map(({ category, entries }) => (
                <div key={category}>
                    <SectionHeader
                        label={modelCategoryLabel(category)}
                        count={entries.length}
                    />
                    <div className={gridClass}>
                        {entries.map((entry) => (
                            <ModelCard
                                key={entry.slug}
                                entry={entry}
                                variant={layout === "list" ? "horizontal" : "compact"}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlgorithmIndex() {
    const { filters, setKind, setCategoryId, toggleTag, setQuery, setView, reset } =
        useAlgorithmsFilters();
    // Per handoff: `lg` and up (≥1024px) = sidebar layout; below = sheet layout.
    // Width-based (not pointer/hover-based) so narrow desktop windows also get mobile UI.
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);
    const isAdmin = useIsAdmin();

    const [tagPickerOpen, setTagPickerOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    const visibleAlgorithms = useMemo(
        () => algorithmPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );
    const visibleModels = useMemo(
        () => modelPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const facets = useMemo(
        () => computeFacets(visibleAlgorithms, visibleModels, filters),
        [visibleAlgorithms, visibleModels, filters],
    );

    const allTags = useMemo(() => {
        const src = filters.kind === "classical" ? visibleAlgorithms : visibleModels;
        const set = new Set<string>();
        for (const e of src) for (const t of e.frontmatter.tags) set.add(t);
        return [...set].sort();
    }, [filters.kind, visibleAlgorithms, visibleModels]);

    const popularTags = useMemo(() => {
        const src = filters.kind === "classical" ? visibleAlgorithms : visibleModels;
        const freq = new Map<string, number>();
        for (const e of src)
            for (const t of e.frontmatter.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([t]) => t);
    }, [filters.kind, visibleAlgorithms, visibleModels]);

    const filteredAlgorithms = useMemo(
        () => filterAlgorithms(visibleAlgorithms, filters),
        [visibleAlgorithms, filters],
    );
    const filteredModels = useMemo(
        () => filterModels(visibleModels, filters),
        [visibleModels, filters],
    );

    const groupedAlgorithms = useMemo(
        () => computeGroupedAlgorithms(filteredAlgorithms),
        [filteredAlgorithms],
    );
    const groupedModels = useMemo(
        () => computeGroupedModels(filteredModels),
        [filteredModels],
    );

    const currentCategoryValues =
        filters.kind === "classical" ? algorithmCategoryValues : modelCategoryValues;
    const currentCategoryLabel = (id: string): string =>
        filters.kind === "classical"
            ? categoryLabel(id as AlgorithmCategory)
            : modelCategoryLabel(id as ModelCategory);

    // Mobile active filter badge count
    const activeCount =
        filters.tags.length + (filters.categoryId !== "all" ? 1 : 0);

    // ── Desktop layout ──────────────────────────────────────────────────────

    if (isDesktop) {
        return (
            <div className="min-h-screen">
                <SeoHead
                    title="Algorithms"
                    description="Classical computer vision algorithms and deep-learning models — explore, understand, and experiment."
                />

                <div className="grid grid-cols-[220px_minmax(0,1fr)]">
                    {/* Sidebar */}
                    <AlgorithmsSidebar
                        filters={filters}
                        facets={facets}
                        categoryValues={currentCategoryValues}
                        categoryLabel={currentCategoryLabel}
                        popularTags={popularTags}
                        tagSet={allTags}
                        onKindChange={setKind}
                        onCategoryChange={setCategoryId}
                        onTagToggle={toggleTag}
                        onOpenTagPicker={() => setTagPickerOpen(true)}
                    />

                    {/* Main column */}
                    <main className="px-10 py-5">
                        {/* Header row */}
                        <div className="flex items-baseline justify-between mb-1">
                            <h1 className="text-[22px] font-bold -tracking-[0.4px]">
                                Algorithms{" "}
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

                                {/* View toggle */}
                                <div className="flex gap-0.5 p-0.5 rounded-md border border-[hsl(var(--border)/0.7)]">
                                    <button
                                        type="button"
                                        aria-label="Grid view"
                                        aria-pressed={filters.view === "grid"}
                                        onClick={() => setView("grid")}
                                        className={`p-[3px] rounded transition-colors ${
                                            filters.view === "grid"
                                                ? "bg-[hsl(var(--surface-hi))] text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <LayoutGrid size={13} />
                                    </button>
                                    <button
                                        type="button"
                                        aria-label="List view"
                                        aria-pressed={filters.view === "list"}
                                        onClick={() => setView("list")}
                                        className={`p-[3px] rounded transition-colors ${
                                            filters.view === "list"
                                                ? "bg-[hsl(var(--surface-hi))] text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        <List size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Subtitle */}
                        <p className="text-[13px] text-muted-foreground mb-5">
                            Classical computer vision algorithms and deep-learning models.
                        </p>

                        {/* Results */}
                        <CardGroup
                            kind={filters.kind}
                            filteredAlgorithms={filteredAlgorithms}
                            filteredModels={filteredModels}
                            filters={filters}
                            groupedAlgorithms={groupedAlgorithms}
                            groupedModels={groupedModels}
                            layout={filters.view}
                        />
                    </main>
                </div>

                {/* Tag picker modal (desktop) */}
                <AlgorithmsTagPicker
                    open={tagPickerOpen}
                    onClose={() => setTagPickerOpen(false)}
                    allTags={allTags}
                    popularTags={popularTags}
                    selectedTags={filters.tags}
                    onToggle={toggleTag}
                />
            </div>
        );
    }

    // ── Mobile layout ───────────────────────────────────────────────────────

    return (
        <div className="max-w-[640px] mx-auto px-4 py-5 space-y-4">
            <SeoHead
                title="Algorithms"
                description="Classical computer vision algorithms and deep-learning models — explore, understand, and experiment."
            />

            {/* Title row */}
            <div className="flex items-baseline justify-between">
                <h1 className="text-[22px] font-bold -tracking-[0.5px]">Algorithms</h1>
                <span className="text-xs text-muted-foreground">
                    {facets.total} entries
                </span>
            </div>

            {/* Segmented Kind control */}
            <div
                role="radiogroup"
                aria-label="Kind"
                className="grid grid-cols-2 gap-[3px] p-[3px] bg-[hsl(var(--bg-soft))] border border-[hsl(var(--border)/0.8)] rounded-lg"
            >
                {(
                    [
                        ["classical", "Classical"],
                        ["models", "Models"],
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
                            className={`py-[7px] rounded-[5px] text-center text-[13px] transition-colors ${
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

            {/* Card sections */}
            <CardGroup
                kind={filters.kind}
                filteredAlgorithms={filteredAlgorithms}
                filteredModels={filteredModels}
                filters={filters}
                groupedAlgorithms={groupedAlgorithms}
                groupedModels={groupedModels}
                layout="list"
            />

            {/* Filter sheet (mobile) */}
            <AlgorithmsFilterSheet
                open={filterSheetOpen}
                onClose={() => setFilterSheetOpen(false)}
                filters={filters}
                facets={facets}
                categoryValues={currentCategoryValues}
                categoryLabel={currentCategoryLabel}
                popularTags={popularTags}
                allTags={allTags}
                totalResults={facets.total}
                onKindChange={setKind}
                onCategoryChange={setCategoryId}
                onTagToggle={toggleTag}
                onReset={reset}
            />

            {/* Tag picker — shared across desktop/mobile, mounted once */}
            <AlgorithmsTagPicker
                open={tagPickerOpen}
                onClose={() => setTagPickerOpen(false)}
                allTags={allTags}
                popularTags={popularTags}
                selectedTags={filters.tags}
                onToggle={toggleTag}
            />
        </div>
    );
}
