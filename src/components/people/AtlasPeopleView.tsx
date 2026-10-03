import { lazy, Suspense, use, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input, SegmentedControl, Select } from "@vitavision/ui";
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

const MODE_OPTIONS: { value: PeopleMode; label: string }[] = [
    { value: "directory", label: "Directory" },
    { value: "network", label: "Network" },
];

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
        <div className="flex h-[600px] items-center justify-center rounded-panel border border-line text-[13px] text-fg-muted">
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
    const papersById = use(PapersContext);

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
                            <p className="text-[14px] sm:text-[15px] text-fg-muted">{subtitle}</p>
                        </div>
                        <AtlasViewTabs view={view} onChange={setView} compact={!isDesktop} />
                    </div>
                </div>

                <div className={`flex gap-3 ${isDesktop ? "items-center justify-between" : "flex-col"}`}>
                    <div className={`flex gap-3 ${isDesktop ? "items-center" : "flex-col"}`}>
                        <div className="relative w-full sm:w-[320px]">
                            <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-muted" aria-hidden="true" />
                            <Input
                                type="search"
                                aria-label="Search people"
                                placeholder={`Search ${peopleCount || ""} people or a paper title`}
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                className="h-11 pl-10 text-[14px]"
                            />
                        </div>

                        <SegmentedControl
                            aria-label="People view"
                            value={mode}
                            options={MODE_OPTIONS}
                            onValueChange={(v) => setMode(v as PeopleMode)}
                        />
                    </div>

                    {mode === "directory" && (
                        <div className="flex items-center gap-2 text-[13px] text-fg-muted">
                            <span aria-hidden="true">Sort</span>
                            <Select
                                aria-label="Sort"
                                className="w-44"
                                value={sort}
                                options={SORT_OPTIONS.map((o) => ({ value: o.key, label: o.label }))}
                                onValueChange={(v) => setSort(v as PeopleSort)}
                            />
                        </div>
                    )}
                </div>

                {mode === "directory" ? (
                    status !== "ready" ? (
                        <p className="py-10 text-center text-[13px] text-fg-muted">
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
