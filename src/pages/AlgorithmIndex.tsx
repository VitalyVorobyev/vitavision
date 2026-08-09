import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, SlidersHorizontal, ChevronDown, X } from "lucide-react";
import { algorithmPages, modelPages, conceptPages } from "../generated/content-index.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import AlgorithmCard from "../components/blog/AlgorithmCard.tsx";
import ModelCard from "../components/blog/ModelCard.tsx";
import ConceptCard from "../components/blog/ConceptCard.tsx";
import AlgorithmsSidebar from "../components/algorithms/AlgorithmsSidebar.tsx";
import AlgorithmsFilterSheet from "../components/algorithms/AlgorithmsFilterSheet.tsx";
import AlgorithmsViewToggle from "../components/algorithms/AlgorithmsViewToggle.tsx";
import GraphExplorer from "../components/atlas/GraphExplorer.tsx";
import useAlgorithmsFilters, {
    filterAlgorithms,
    filterModels,
    filterConcepts,
    computeFacets,
    type AlgorithmsKind,
    type AlgorithmsView,
} from "../hooks/useAlgorithmsFilters.ts";
import {
    type AlgorithmIndexEntry,
    type ModelIndexEntry,
    type ConceptIndexEntry,
} from "../lib/content/schema.ts";
import { domainLabels, domainOrder } from "../components/algorithms/domainLabels.ts";
import { contentGraph } from "../generated/content-graph.ts";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import useMediaQuery from "../hooks/useMediaQuery.ts";
import { searchSlugs } from "../lib/atlas/searchClient.ts";
import { selectRecentlyAdded } from "../lib/atlas/recency.ts";

// ── Discriminated entry type ───────────────────────────────────────────────────

type UnifiedEntry =
    | { kind: "algorithm"; slug: string; frontmatter: AlgorithmIndexEntry["frontmatter"] }
    | { kind: "model";     slug: string; frontmatter: ModelIndexEntry["frontmatter"] }
    | { kind: "concept";   slug: string; frontmatter: ConceptIndexEntry["frontmatter"] };

// ── Depth-based comparator ────────────────────────────────────────────────────

function byDepthThenDate(depth: Record<string, number>) {
    return (a: UnifiedEntry, b: UnifiedEntry): number => {
        const da = depth[a.slug] ?? Number.MAX_SAFE_INTEGER;
        const db = depth[b.slug] ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        // tie-break: date descending then title ascending
        const ta = new Date(a.frontmatter.date).getTime();
        const tb = new Date(b.frontmatter.date).getTime();
        if (tb !== ta) return tb - ta;
        return a.frontmatter.title.localeCompare(b.frontmatter.title, undefined, { sensitivity: "base" });
    };
}

// ── Unified catalog grouping ──────────────────────────────────────────────────

type CatalogGroup = { id: string; label: string; entries: UnifiedEntry[] };

function computeUnifiedGroups(
    filteredAlgorithms: AlgorithmIndexEntry[],
    filteredModels: ModelIndexEntry[],
    filteredConcepts: ConceptIndexEntry[],
    kind: AlgorithmsKind,
): CatalogGroup[] {
    const depth = contentGraph.depth;
    const comparator = byDepthThenDate(depth);

    // When kind === "all": three top-level groups by type.
    if (kind === "all") {
        const groups: CatalogGroup[] = [];

        const algoEntries: UnifiedEntry[] = filteredAlgorithms.map((e) => ({
            kind: "algorithm", slug: e.slug, frontmatter: e.frontmatter,
        }));
        algoEntries.sort(comparator);
        if (algoEntries.length > 0) groups.push({ id: "algorithm", label: "Algorithms", entries: algoEntries });

        const modelEntries: UnifiedEntry[] = filteredModels.map((e) => ({
            kind: "model", slug: e.slug, frontmatter: e.frontmatter,
        }));
        modelEntries.sort(comparator);
        if (modelEntries.length > 0) groups.push({ id: "model", label: "Models", entries: modelEntries });

        const conceptEntries: UnifiedEntry[] = filteredConcepts.map((e) => ({
            kind: "concept", slug: e.slug, frontmatter: e.frontmatter,
        }));
        conceptEntries.sort(comparator);
        if (conceptEntries.length > 0) groups.push({ id: "concept", label: "Concepts", entries: conceptEntries });

        return groups;
    }

    // When a specific kind is selected: group by domain over domainOrder.
    const sourceItems: UnifiedEntry[] = [];
    if (kind === "algorithm") {
        for (const e of filteredAlgorithms) sourceItems.push({ kind: "algorithm", slug: e.slug, frontmatter: e.frontmatter });
    } else if (kind === "model") {
        for (const e of filteredModels) sourceItems.push({ kind: "model", slug: e.slug, frontmatter: e.frontmatter });
    } else {
        for (const e of filteredConcepts) sourceItems.push({ kind: "concept", slug: e.slug, frontmatter: e.frontmatter });
    }

    const byDomain = new Map<string, UnifiedEntry[]>();
    for (const entry of sourceItems) {
        const dom = entry.frontmatter.domain ?? "unknown";
        const bucket = byDomain.get(dom) ?? [];
        bucket.push(entry);
        byDomain.set(dom, bucket);
    }

    return domainOrder
        .map((dom) => {
            const entries = (byDomain.get(dom) ?? []).sort(comparator);
            return { id: dom, label: domainLabels[dom as keyof typeof domainLabels] ?? dom, entries };
        })
        .filter((g) => g.entries.length > 0);
}

// ── Card renderer (picks the right component by kind) ────────────────────────

function EntryCard({ entry, layout }: { entry: UnifiedEntry; layout: "grid" | "list" }) {
    const variant = layout === "list" ? "horizontal" : "compact";
    if (entry.kind === "algorithm") {
        const full = algorithmPages.find((p) => p.slug === entry.slug);
        if (!full) return null;
        return <AlgorithmCard entry={full} variant={variant} />;
    }
    if (entry.kind === "model") {
        const full = modelPages.find((p) => p.slug === entry.slug);
        if (!full) return null;
        return <ModelCard entry={full} variant={variant} />;
    }
    const full = conceptPages.find((p) => p.slug === entry.slug);
    if (!full) return null;
    return <ConceptCard entry={full} variant={variant} />;
}

// ── Section header — sticky, spans full main column ──────────────────────────
// The nav bar is sticky top-0 h-16 (64px). Section headers stick just below it.

function SectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <div className="-mx-10 px-10 sticky top-16 z-10 bg-[hsl(var(--background))]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-baseline gap-2.5 pt-5 pb-3 border-b border-[hsl(var(--border)/0.25)]">
                <span>{label}</span>
                <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">
                    {count}
                </span>
            </h2>
        </div>
    );
}

// ── Mobile section header ─────────────────────────────────────────────────────

function MobileSectionHeader({ label, count }: { label: string; count: number }) {
    return (
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-baseline gap-2.5 mt-5 mb-3">
            <span>{label}</span>
            <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">
                {count}
            </span>
        </h2>
    );
}

// ── Unified grouped results ───────────────────────────────────────────────────

interface UnifiedResultsProps {
    groups: CatalogGroup[];
    layout: "grid" | "list";
    isMobile?: boolean;
}

function UnifiedResults({ groups, layout, isMobile = false }: UnifiedResultsProps) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";

    if (groups.length === 0) {
        return (
            <p className="text-[13px] text-muted-foreground py-6">
                No entries match the current filters.
            </p>
        );
    }

    return (
        <>
            {groups.map(({ id, label, entries }) => (
                <div key={id}>
                    {isMobile ? (
                        <MobileSectionHeader label={label} count={entries.length} />
                    ) : (
                        <SectionHeader label={label} count={entries.length} />
                    )}
                    <div className={`${gridClass} mt-3`}>
                        {entries.map((entry) => (
                            <EntryCard key={entry.slug} entry={entry} layout={layout} />
                        ))}
                    </div>
                </div>
            ))}
        </>
    );
}

// ── Recently added section ────────────────────────────────────────────────────

function RecentlyAddedSection({ entries, layout }: { entries: UnifiedEntry[]; layout: "grid" | "list" }) {
    const gridClass =
        layout === "grid"
            ? "grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
            : "flex flex-col gap-2.5";
    return (
        <section className="mb-6 pb-5 border-b border-[hsl(var(--border)/0.4)]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-center gap-2.5 mb-3">
                <span className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand" aria-hidden="true" />
                    Recently added
                </span>
                <span className="font-normal text-[hsl(var(--muted-foreground)/0.7)]">{entries.length}</span>
            </h2>
            <div className={gridClass}>
                {entries.map((entry) => (
                    <EntryCard key={entry.slug} entry={entry} layout={layout} />
                ))}
            </div>
        </section>
    );
}

// ── Active-tag chip row ───────────────────────────────────────────────────────

interface ActiveTagChipsProps {
    tags: string[];
    onRemove: (tag: string) => void;
    onClearAll: () => void;
}

function ActiveTagChips({ tags, onRemove, onClearAll }: ActiveTagChipsProps) {
    if (tags.length === 0) return null;
    return (
        <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground mr-0.5">Tagged</span>
            {tags.map((tag) => (
                <button
                    key={tag}
                    type="button"
                    onClick={() => onRemove(tag)}
                    className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/60 px-2 py-0.5 text-xs text-foreground hover:bg-muted transition-colors"
                >
                    {tag}
                    <X size={12} aria-hidden="true" />
                </button>
            ))}
            {tags.length > 1 && (
                <button
                    type="button"
                    onClick={onClearAll}
                    className="text-[11px] text-muted-foreground hover:text-foreground transition-colors ml-0.5"
                >
                    Clear all
                </button>
            )}
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AlgorithmIndex() {
    const { filters, setKind, setQuery, setView, setProblem, toggleTag, setTags, reset } =
        useAlgorithmsFilters();
    const [searchParams] = useSearchParams();
    const focusParam = searchParams.get("focus") ?? undefined;

    // Per handoff: `lg` and up (≥1024px) = sidebar layout; below = sheet layout.
    const isDesktop = useMediaQuery("(min-width: 1024px)", true);
    const isAdmin = useIsAdmin();

    const effectiveView: AlgorithmsView = filters.view;

    const [filterSheetOpen, setFilterSheetOpen] = useState(false);

    // ── MiniSearch: derive slug set from query (client-side only) ───────────
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

    const recentEntries = useMemo<UnifiedEntry[]>(
        () =>
            selectRecentlyAdded<UnifiedEntry>([
                ...visibleAlgorithms.map((e) => ({ kind: "algorithm" as const, slug: e.slug, frontmatter: e.frontmatter })),
                ...visibleModels.map((e) => ({ kind: "model" as const, slug: e.slug, frontmatter: e.frontmatter })),
                ...visibleConcepts.map((e) => ({ kind: "concept" as const, slug: e.slug, frontmatter: e.frontmatter })),
            ]),
        [visibleAlgorithms, visibleModels, visibleConcepts],
    );

    const showRecentlyAdded =
        filters.kind === "all" &&
        filters.query.trim() === "" &&
        filters.tags.length === 0 &&
        filters.problem === "all" &&
        recentEntries.length > 0;

    const facets = useMemo(
        () => computeFacets(visibleAlgorithms, visibleModels, visibleConcepts, filters, searchMatchedSlugs),
        [visibleAlgorithms, visibleModels, visibleConcepts, filters, searchMatchedSlugs],
    );

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

    // ── Unified grouped results ──────────────────────────────────────────────
    const unifiedGroups = useMemo(
        () => computeUnifiedGroups(filteredAlgorithms, filteredModels, filteredConcepts, filters.kind),
        [filteredAlgorithms, filteredModels, filteredConcepts, filters.kind],
    );

    // Mobile active filter badge count (problem filter only)
    const activeCount = filters.problem !== "all" ? 1 : 0;

    // ── Desktop layout ──────────────────────────────────────────────────────

    if (isDesktop) {
        // ── Graph branch — full-width, no sidebar ──────────────────────────────
        if (effectiveView === "graph") {
            return (
                <div className="flex flex-1 flex-col">
                    <SeoHead
                        title="Atlas"
                        description="Practical computer vision atlas — algorithms, models, and concepts."
                    />
                    <main className="flex flex-1 flex-col min-w-0 px-6 py-5">
                        <div className="flex items-baseline justify-between mb-3">
                            <h1 className="text-[22px] font-bold -tracking-[0.4px]">Atlas</h1>
                            <AlgorithmsViewToggle view={effectiveView} onChange={setView} />
                        </div>
                        {/* key remounts on external ?focus= change so the
                            graph re-centers; internal trail nav never touches
                            ?focus=, so it does not trigger a remount. */}
                        <GraphExplorer key={focusParam ?? ""} focusSlug={focusParam} />
                    </main>
                </div>
            );
        }

        // ── Catalog branch — 2-column grid + sidebar ──────────────────────────
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
                                    view={effectiveView}
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
                            <RecentlyAddedSection entries={recentEntries} layout={effectiveView === "list" ? "list" : "grid"} />
                        )}
                        <UnifiedResults
                            groups={unifiedGroups}
                            layout={effectiveView === "list" ? "list" : "grid"}
                        />
                    </main>
                </div>
            </div>
        );
    }

    // ── Mobile layout ───────────────────────────────────────────────────────

    // Mobile graph view — render focused entry + neighbor lists, skip catalog
    if (effectiveView === "graph") {
        return (
            <div className="w-full min-w-0 max-w-[640px] mx-auto px-4 py-5">
                <SeoHead
                    title="Atlas"
                    description="Practical computer vision atlas — algorithms, models, and concepts."
                />

                {/* Title row */}
                <div className="flex items-baseline justify-between mb-4">
                    <h1 className="text-[22px] font-bold -tracking-[0.5px]">Atlas</h1>
                    <span className="text-xs text-muted-foreground">Graph view</span>
                </div>

                <GraphExplorer key={focusParam ?? ""} focusSlug={focusParam} />
            </div>
        );
    }

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
