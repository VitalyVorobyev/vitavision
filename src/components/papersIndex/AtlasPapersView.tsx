import { useContext, useMemo, useState } from "react";
import { Search } from "lucide-react";
import SeoHead from "../seo/SeoHead.tsx";
import AtlasViewTabs from "../algorithms/AtlasViewTabs.tsx";
import PapersList from "./PapersList.tsx";
import { PapersContext } from "../../lib/atlas/papersContext.ts";
import { useScholarlyIndex } from "../../lib/atlas/useScholarlyIndex.ts";
import { buildPaperRows, type PapersFilter, type PapersSort } from "../../lib/atlas/papersDirectory.ts";
import type { AlgorithmsView } from "../../hooks/useAlgorithmsFilters.ts";

const FILTER_OPTIONS: { key: PapersFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "has-page", label: "Has a page" },
    { key: "no-page", label: "No page yet" },
];

const SORT_OPTIONS: { key: PapersSort; label: string }[] = [
    { key: "citedBy", label: "Most built upon" },
    { key: "newest", label: "Newest" },
    { key: "oldest", label: "Oldest" },
];

interface AtlasPapersViewProps {
    isDesktop: boolean;
    view: AlgorithmsView;
    setView: (view: AlgorithmsView) => void;
    /** URL-backed (`?q=`) search query — shared with the Catalog and People
     *  views so a "All matching papers →" link from a catalog search lands
     *  here pre-filtered, and typing here updates the same `q` param. */
    query: string;
    setQuery: (q: string) => void;
}

/** The Atlas Papers view — every registry paper, searchable, filterable by
 *  whether it anchors an Atlas page, sortable, grouped by decade. */
export default function AtlasPapersView({ isDesktop, view, setView, query, setQuery }: AtlasPapersViewProps) {
    const papersById = useContext(PapersContext);
    const { index: scholarly, status } = useScholarlyIndex();

    const [filter, setFilter] = useState<PapersFilter>("all");
    const [sort, setSort] = useState<PapersSort>("citedBy");

    const rows = useMemo(() => buildPaperRows(papersById, scholarly ?? undefined), [papersById, scholarly]);
    const withPageCount = useMemo(() => rows.filter((r) => r.hasPage).length, [rows]);

    const subtitle =
        rows.length > 0
            ? `${rows.length} papers the Atlas is built on — ${withPageCount} anchor a page of their own.`
            : "Loading the paper register…";

    const containerClass = isDesktop
        ? "mx-auto w-full min-w-0 max-w-[1180px] flex-1 px-6 py-5"
        : "mx-auto w-full min-w-0 max-w-[640px] px-4 py-5";

    return (
        <div className="flex flex-1 flex-col">
            <SeoHead
                title="Papers"
                description="Every paper the VitaVision computer vision atlas is built on."
            />
            <main className={`${containerClass} flex flex-col gap-5`}>
                <div className={isDesktop ? "flex items-end justify-between gap-4" : "flex flex-col gap-3"}>
                    <div className="flex flex-col gap-1.5">
                        <h1 className="text-[28px] sm:text-[34px] font-bold -tracking-[0.5px]">Atlas</h1>
                        <p className="text-[14px] sm:text-[15px] text-muted-foreground">{subtitle}</p>
                    </div>
                    <AtlasViewTabs view={view} onChange={setView} compact={!isDesktop} />
                </div>

                <div className={`flex gap-3 ${isDesktop ? "items-center justify-between" : "flex-col"}`}>
                    <label className="flex h-11 w-full items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-muted-foreground sm:w-[380px]">
                        <Search size={16} className="shrink-0" aria-hidden="true" />
                        <span className="sr-only">Search papers</span>
                        <input
                            type="search"
                            placeholder="Search titles, authors, venues"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                        />
                    </label>

                    <div className={`flex gap-3 ${isDesktop ? "items-center" : "flex-col"}`}>
                        <div role="group" aria-label="Filter" className="inline-flex gap-0.5 rounded-lg border border-border bg-surface p-[3px]">
                            {FILTER_OPTIONS.map((opt) => (
                                <button
                                    key={opt.key}
                                    type="button"
                                    aria-pressed={filter === opt.key}
                                    onClick={() => setFilter(opt.key)}
                                    className={`h-9 rounded-md px-3.5 text-[13px] transition-colors ${
                                        filter === opt.key
                                            ? "bg-[hsl(var(--surface-hi))] font-semibold text-foreground"
                                            : "font-medium text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            Sort
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as PapersSort)}
                                className="h-9 rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground"
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>

                {rows.length === 0 ? (
                    <p className="py-10 text-center text-[13px] text-muted-foreground">
                        {status === "error" ? "The paper register failed to load." : "Loading the paper register…"}
                    </p>
                ) : (
                    <PapersList rows={rows} query={query} filter={filter} sort={sort} />
                )}
            </main>
        </div>
    );
}
