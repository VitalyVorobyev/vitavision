import { lazy, Suspense, useContext, useMemo, useState } from "react";
import { Search } from "lucide-react";
import SeoHead from "../seo/SeoHead.tsx";
import AtlasViewTabs from "../algorithms/AtlasViewTabs.tsx";
import PeopleDirectory from "./directory/PeopleDirectory.tsx";
import { useScholarlyIndex } from "../../lib/atlas/useScholarlyIndex.ts";
import { useAuthorsIndex } from "../../lib/atlas/useAuthorsIndex.ts";
import { PapersContext } from "../../lib/atlas/papersContext.ts";
import { buildPeopleRows, type PeopleSort } from "../../lib/atlas/peopleDirectory.ts";
import type { AlgorithmsView, PeopleMode } from "../../hooks/useAlgorithmsFilters.ts";

// Code-split: the co-author network (force layout + canvas/SVG rendering) is
// only needed when the reader picks Network mode.
const PeopleNetwork = lazy(() => import("./network/PeopleNetwork.tsx"));

const SORT_OPTIONS: { key: PeopleSort; label: string }[] = [
    { key: "reach", label: "Atlas reach" },
    { key: "name", label: "Name" },
    { key: "earliest", label: "Earliest paper" },
];

interface AtlasPeopleViewProps {
    isDesktop: boolean;
    view: AlgorithmsView;
    setView: (view: AlgorithmsView) => void;
    mode: PeopleMode;
    setMode: (mode: PeopleMode) => void;
    personId: string | undefined;
    setPersonFocus: (id: string | undefined) => void;
    /** URL-backed (`?q=`) search query — shared with the Catalog and Papers
     *  views so a "All matching people →" link from a catalog search lands
     *  here pre-filtered, and typing here updates the same `q` param. */
    query: string;
    setQuery: (q: string) => void;
}

function NetworkFallback() {
    return (
        <div className="flex h-[600px] items-center justify-center rounded-lg border border-border text-[13px] text-muted-foreground">
            Loading the co-author network…
        </div>
    );
}

/** The Atlas People view — a directory table (grouped by domain, searchable,
 *  sortable) plus a Network mode that hands off to the co-author graph. */
export default function AtlasPeopleView({
    isDesktop,
    view,
    setView,
    mode,
    setMode,
    personId,
    setPersonFocus,
    query,
    setQuery,
}: AtlasPeopleViewProps) {
    const { index: scholarly, status } = useScholarlyIndex();
    const authorsIndex = useAuthorsIndex();
    const papersById = useContext(PapersContext);

    const [sort, setSort] = useState<PeopleSort>("reach");
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

    const rows = useMemo(
        () => (scholarly ? buildPeopleRows(scholarly, authorsIndex) : []),
        [scholarly, authorsIndex],
    );

    const peopleCount = rows.length;
    const paperCount = Object.keys(papersById).length;
    const subtitle =
        status === "ready"
            ? `${peopleCount} researchers behind the ${paperCount} papers the Atlas is built on.`
            : "Loading the researcher register…";

    const containerClass = isDesktop
        ? "mx-auto w-full min-w-0 max-w-[1180px] flex-1 px-6 py-5"
        : "mx-auto w-full min-w-0 max-w-[640px] px-4 py-5";

    return (
        <div className="flex flex-1 flex-col">
            <SeoHead
                title="People"
                description="Every researcher behind the papers the VitaVision computer vision atlas is built on."
            />
            <main className={`${containerClass} flex flex-col gap-5`}>
                <div className={`flex flex-col gap-4 ${isDesktop ? "" : ""}`}>
                    <div className={isDesktop ? "flex items-end justify-between gap-4" : "flex flex-col gap-3"}>
                        <div className="flex flex-col gap-1.5">
                            <h1 className="text-[28px] sm:text-[34px] font-bold -tracking-[0.5px]">Atlas</h1>
                            <p className="text-[14px] sm:text-[15px] text-muted-foreground">{subtitle}</p>
                        </div>
                        <AtlasViewTabs view={view} onChange={setView} compact={!isDesktop} />
                    </div>
                </div>

                <div className={`flex gap-3 ${isDesktop ? "items-center justify-between" : "flex-col"}`}>
                    <div className={`flex gap-3 ${isDesktop ? "items-center" : "flex-col"}`}>
                        <label className="flex h-11 w-full items-center gap-2 rounded-md border border-border bg-surface px-3.5 text-muted-foreground sm:w-[320px]">
                            <Search size={16} className="shrink-0" aria-hidden="true" />
                            <span className="sr-only">Search people</span>
                            <input
                                type="search"
                                placeholder={`Search ${peopleCount || ""} people or a paper title`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="min-w-0 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                            />
                        </label>

                        <div role="tablist" aria-label="People view" className="inline-flex gap-0.5 rounded-lg border border-border bg-surface p-[3px]">
                            {(["directory", "network"] as const).map((m) => (
                                <button
                                    key={m}
                                    type="button"
                                    role="tab"
                                    aria-selected={mode === m}
                                    onClick={() => setMode(m)}
                                    className={`h-9 rounded-md px-4 text-[13px] transition-colors ${
                                        mode === m
                                            ? "bg-[hsl(var(--surface-hi))] font-semibold text-foreground"
                                            : "font-medium text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    {m === "directory" ? "Directory" : "Network"}
                                </button>
                            ))}
                        </div>
                    </div>

                    {mode === "directory" && (
                        <label className="flex items-center gap-2 text-[13px] text-muted-foreground">
                            Sort
                            <select
                                value={sort}
                                onChange={(e) => setSort(e.target.value as PeopleSort)}
                                className="h-9 rounded-md border border-border bg-surface px-2.5 text-[13px] text-foreground"
                            >
                                {SORT_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.key}>
                                        {opt.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}
                </div>

                {mode === "directory" ? (
                    status !== "ready" ? (
                        <p className="py-10 text-center text-[13px] text-muted-foreground">
                            {status === "error" ? "Couldn't load the researcher register." : "Loading the researcher register…"}
                        </p>
                    ) : (
                        <PeopleDirectory
                            rows={rows}
                            authorsIndex={authorsIndex}
                            papersById={papersById}
                            query={query}
                            sort={sort}
                            selectedDomain={selectedDomain}
                            onSelectDomain={setSelectedDomain}
                        />
                    )
                ) : (
                    <Suspense fallback={<NetworkFallback />}>
                        <PeopleNetwork focusId={personId} onFocusChange={setPersonFocus} />
                    </Suspense>
                )}
            </main>
        </div>
    );
}
