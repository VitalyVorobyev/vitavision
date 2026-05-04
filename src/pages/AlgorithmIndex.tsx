import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, ChevronDown } from "lucide-react";
import { algorithmPages, modelPages, conceptPages } from "../generated/content-index.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import AlgorithmCard from "../components/blog/AlgorithmCard.tsx";
import ModelCard from "../components/blog/ModelCard.tsx";
import ConceptCard from "../components/blog/ConceptCard.tsx";
import AlgorithmsSidebar from "../components/algorithms/AlgorithmsSidebar.tsx";
import AlgorithmsTagPicker from "../components/algorithms/AlgorithmsTagPicker.tsx";
import AlgorithmsFilterSheet from "../components/algorithms/AlgorithmsFilterSheet.tsx";
import AlgorithmsViewToggle from "../components/algorithms/AlgorithmsViewToggle.tsx";
import AtlasMapView from "../components/atlas/AtlasMapView.tsx";
import AtlasConstellationView from "../components/atlas/AtlasConstellationView.tsx";
import useAlgorithmsFilters, {
    filterAlgorithms,
    filterModels,
    filterConcepts,
    computeFacets,
    type AlgorithmsFilters,
    type AlgorithmsKind,
    type AlgorithmsView,
} from "../hooks/useAlgorithmsFilters.ts";
import {
    type AlgorithmIndexEntry,
    type ModelIndexEntry,
    type ConceptIndexEntry,
} from "../lib/content/schema.ts";
import { domainLabels, domainOrder } from "../components/algorithms/domainLabels.ts";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";
import { searchSlugs } from "../lib/atlas/searchClient.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

type DomainGroup<T> = { domain: string; entries: T[] };

function computeGroupedAlgorithms(filtered: AlgorithmIndexEntry[]): DomainGroup<AlgorithmIndexEntry>[] {
    const byDomain = new Map<string, AlgorithmIndexEntry[]>();
    for (const entry of filtered) {
        const dom = entry.frontmatter.domain ?? "unknown";
        const bucket = byDomain.get(dom) ?? [];
        bucket.push(entry);
        byDomain.set(dom, bucket);
    }
    return domainOrder
        .map((dom) => ({ domain: dom, entries: byDomain.get(dom) ?? [] }))
        .filter((g) => g.entries.length > 0);
}

function computeGroupedModels(filtered: ModelIndexEntry[]): DomainGroup<ModelIndexEntry>[] {
    const byDomain = new Map<string, ModelIndexEntry[]>();
    for (const entry of filtered) {
        const dom = entry.frontmatter.domain ?? "unknown";
        const bucket = byDomain.get(dom) ?? [];
        bucket.push(entry);
        byDomain.set(dom, bucket);
    }
    return domainOrder
        .map((dom) => ({ domain: dom, entries: byDomain.get(dom) ?? [] }))
        .filter((g) => g.entries.length > 0);
}

function computeGroupedConcepts(filtered: ConceptIndexEntry[]): DomainGroup<ConceptIndexEntry>[] {
    const byDomain = new Map<string, ConceptIndexEntry[]>();
    for (const entry of filtered) {
        const dom = entry.frontmatter.domain ?? "unknown";
        const bucket = byDomain.get(dom) ?? [];
        bucket.push(entry);
        byDomain.set(dom, bucket);
    }
    return domainOrder
        .map((dom) => ({ domain: dom, entries: byDomain.get(dom) ?? [] }))
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
    kind: AlgorithmsKind;
    filteredAlgorithms: AlgorithmIndexEntry[];
    filteredModels: ModelIndexEntry[];
    filteredConcepts: ConceptIndexEntry[];
    filters: AlgorithmsFilters;
    groupedAlgorithms: DomainGroup<AlgorithmIndexEntry>[];
    groupedModels: DomainGroup<ModelIndexEntry>[];
    groupedConcepts: DomainGroup<ConceptIndexEntry>[];
    layout: "grid" | "list";
}

function AlgorithmsGroup({
    filteredAlgorithms,
    filters,
    groupedAlgorithms,
    layout,
}: {
    filteredAlgorithms: AlgorithmIndexEntry[];
    filters: AlgorithmsFilters;
    groupedAlgorithms: DomainGroup<AlgorithmIndexEntry>[];
    layout: "grid" | "list";
}) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";

    if (filteredAlgorithms.length === 0) {
        return (
            <p className="text-[13px] text-muted-foreground py-6">
                No algorithms match the current filters.
            </p>
        );
    }
    if (filters.categoryId !== "all") {
        return (
            <div>
                <SectionHeader
                    label={domainLabels[filters.categoryId as keyof typeof domainLabels] ?? filters.categoryId}
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
            {groupedAlgorithms.map(({ domain, entries }) => (
                <div key={domain}>
                    <SectionHeader
                        label={domainLabels[domain as keyof typeof domainLabels] ?? domain}
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

function ModelsGroup({
    filteredModels,
    filters,
    groupedModels,
    layout,
}: {
    filteredModels: ModelIndexEntry[];
    filters: AlgorithmsFilters;
    groupedModels: DomainGroup<ModelIndexEntry>[];
    layout: "grid" | "list";
}) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";

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
                    label={domainLabels[filters.categoryId as keyof typeof domainLabels] ?? filters.categoryId}
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
            {groupedModels.map(({ domain, entries }) => (
                <div key={domain}>
                    <SectionHeader
                        label={domainLabels[domain as keyof typeof domainLabels] ?? domain}
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

function ConceptsGroup({
    filteredConcepts,
    filters,
    groupedConcepts,
    layout,
}: {
    filteredConcepts: ConceptIndexEntry[];
    filters: AlgorithmsFilters;
    groupedConcepts: DomainGroup<ConceptIndexEntry>[];
    layout: "grid" | "list";
}) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";

    if (filteredConcepts.length === 0) {
        return (
            <p className="text-[13px] text-muted-foreground py-6">
                No concepts match the current filters.
            </p>
        );
    }
    if (filters.categoryId !== "all") {
        return (
            <div>
                <SectionHeader
                    label={domainLabels[filters.categoryId as keyof typeof domainLabels] ?? filters.categoryId}
                    count={filteredConcepts.length}
                />
                <div className={gridClass}>
                    {filteredConcepts.map((entry) => (
                        <ConceptCard
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
            {groupedConcepts.map(({ domain, entries }) => (
                <div key={domain}>
                    <SectionHeader
                        label={domainLabels[domain as keyof typeof domainLabels] ?? domain}
                        count={entries.length}
                    />
                    <div className={gridClass}>
                        {entries.map((entry) => (
                            <ConceptCard
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

function CardGroup({
    kind,
    filteredAlgorithms,
    filteredModels,
    filteredConcepts,
    filters,
    groupedAlgorithms,
    groupedModels,
    groupedConcepts,
    layout,
}: CardGroupProps) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";

    if (kind === "algorithm") {
        return (
            <AlgorithmsGroup
                filteredAlgorithms={filteredAlgorithms}
                filters={filters}
                groupedAlgorithms={groupedAlgorithms}
                layout={layout}
            />
        );
    }

    if (kind === "model") {
        return (
            <ModelsGroup
                filteredModels={filteredModels}
                filters={filters}
                groupedModels={groupedModels}
                layout={layout}
            />
        );
    }

    if (kind === "concept") {
        return (
            <ConceptsGroup
                filteredConcepts={filteredConcepts}
                filters={filters}
                groupedConcepts={groupedConcepts}
                layout={layout}
            />
        );
    }

    // kind === "all" — render all three groups stacked
    const totalCount = filteredAlgorithms.length + filteredModels.length + filteredConcepts.length;
    if (totalCount === 0) {
        return (
            <p className="text-[13px] text-muted-foreground py-6">
                No entries match the current filters.
            </p>
        );
    }

    return (
        <>
            {filteredAlgorithms.length > 0 && (
                <div>
                    <SectionHeader label="Algorithms" count={filteredAlgorithms.length} />
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
            )}
            {filteredModels.length > 0 && (
                <div>
                    <SectionHeader label="Models" count={filteredModels.length} />
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
            )}
            {filteredConcepts.length > 0 && (
                <div>
                    <SectionHeader label="Concepts" count={filteredConcepts.length} />
                    <div className={gridClass}>
                        {filteredConcepts.map((entry) => (
                            <ConceptCard
                                key={entry.slug}
                                entry={entry}
                                variant={layout === "list" ? "horizontal" : "compact"}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlgorithmIndex() {
    const { filters, setKind, setCategoryId, toggleTag, setQuery, setView, reset } =
        useAlgorithmsFilters();
    // Per handoff: `lg` and up (≥1024px) = sidebar layout; below = sheet layout.
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);
    const isAdmin = useIsAdmin();

    // Map/Constellation views are admin-only experimental modes. Coerce
    // non-admins viewing one (e.g. via a stale /atlas?view=map link) back to
    // a public-safe view without writing the change to localStorage.
    const effectiveView: AlgorithmsView =
        !isAdmin && (filters.view === "map" || filters.view === "constellation")
            ? "grid"
            : filters.view;

    const [tagPickerOpen, setTagPickerOpen] = useState(false);
    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    // ── MiniSearch: derive slug set from query (client-side only) ───────────
    // Using useMemo so the index is built lazily on first non-empty query.
    // searchSlugs() guards against SSR via the `typeof window` check inside.
    const searchMatchedSlugs = useMemo<Set<string> | null>(
        () => searchSlugs(filters.query),
        [filters.query],
    );

    // ── Visible items (draft-gated) ──────────────────────────────────────────
    const visibleAlgorithms = useMemo(
        () => algorithmPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );
    const visibleModels = useMemo(
        () => modelPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );
    const visibleConcepts = useMemo(
        () => conceptPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const facets = useMemo(
        () => computeFacets(visibleAlgorithms, visibleModels, visibleConcepts, filters, searchMatchedSlugs),
        [visibleAlgorithms, visibleModels, visibleConcepts, filters, searchMatchedSlugs],
    );

    const allTags = useMemo(() => {
        const sources =
            filters.kind === "algorithm" ? [visibleAlgorithms] :
            filters.kind === "model"     ? [visibleModels] :
            filters.kind === "concept"   ? [visibleConcepts] :
            [visibleAlgorithms, visibleModels, visibleConcepts];
        const set = new Set<string>();
        for (const src of sources)
            for (const e of src)
                for (const t of e.frontmatter.tags) set.add(t);
        return [...set].sort();
    }, [filters.kind, visibleAlgorithms, visibleModels, visibleConcepts]);

    const popularTags = useMemo(() => {
        const sources =
            filters.kind === "algorithm" ? [visibleAlgorithms] :
            filters.kind === "model"     ? [visibleModels] :
            filters.kind === "concept"   ? [visibleConcepts] :
            [visibleAlgorithms, visibleModels, visibleConcepts];
        const freq = new Map<string, number>();
        for (const src of sources)
            for (const e of src)
                for (const t of e.frontmatter.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
        return [...freq.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([t]) => t);
    }, [filters.kind, visibleAlgorithms, visibleModels, visibleConcepts]);

    const filteredAlgorithms = useMemo(
        () => filterAlgorithms(visibleAlgorithms, filters, searchMatchedSlugs),
        [visibleAlgorithms, filters, searchMatchedSlugs],
    );
    const filteredModels = useMemo(
        () => filterModels(visibleModels, filters, searchMatchedSlugs),
        [visibleModels, filters, searchMatchedSlugs],
    );
    const filteredConcepts = useMemo(
        () => filterConcepts(visibleConcepts, filters, searchMatchedSlugs),
        [visibleConcepts, filters, searchMatchedSlugs],
    );

    const groupedAlgorithms = useMemo(
        () => computeGroupedAlgorithms(filteredAlgorithms),
        [filteredAlgorithms],
    );
    const groupedModels = useMemo(
        () => computeGroupedModels(filteredModels),
        [filteredModels],
    );
    const groupedConcepts = useMemo(
        () => computeGroupedConcepts(filteredConcepts),
        [filteredConcepts],
    );

    // Domain values + label — shared across all kinds.
    // When kind === "all", the domain sidebar is hidden (categoryValues = []).
    const currentCategoryValues: readonly string[] =
        filters.kind !== "all" ? domainOrder : [];

    const currentCategoryLabel = (id: string): string =>
        domainLabels[id as keyof typeof domainLabels] ?? id;

    // Mobile active filter badge count
    const activeCount =
        filters.tags.length + (filters.categoryId !== "all" ? 1 : 0);

    // ── Desktop layout ──────────────────────────────────────────────────────

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
                                    view={effectiveView}
                                    onChange={setView}
                                    showExperimental={isAdmin}
                                />
                            </div>
                        </div>

                        {/* Subtitle */}
                        <p className="text-[13px] text-muted-foreground mb-5">
                            Practical computer vision atlas — algorithms, models, and concepts.
                        </p>

                        {/* Results */}
                        {effectiveView === "map" ? (
                            <AtlasMapView
                                algorithms={visibleAlgorithms}
                                models={visibleModels}
                                concepts={visibleConcepts}
                                filters={filters}
                                searchMatchedSlugs={searchMatchedSlugs}
                            />
                        ) : effectiveView === "constellation" ? (
                            <AtlasConstellationView
                                algorithms={visibleAlgorithms}
                                models={visibleModels}
                                concepts={visibleConcepts}
                                filters={filters}
                                searchMatchedSlugs={searchMatchedSlugs}
                            />
                        ) : (
                            <CardGroup
                                kind={filters.kind}
                                filteredAlgorithms={filteredAlgorithms}
                                filteredModels={filteredModels}
                                filteredConcepts={filteredConcepts}
                                filters={filters}
                                groupedAlgorithms={groupedAlgorithms}
                                groupedModels={groupedModels}
                                groupedConcepts={groupedConcepts}
                                layout={effectiveView === "list" ? "list" : "grid"}
                            />
                        )}
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

            {/* Card sections */}
            <CardGroup
                kind={filters.kind}
                filteredAlgorithms={filteredAlgorithms}
                filteredModels={filteredModels}
                filteredConcepts={filteredConcepts}
                filters={filters}
                groupedAlgorithms={groupedAlgorithms}
                groupedModels={groupedModels}
                groupedConcepts={groupedConcepts}
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
