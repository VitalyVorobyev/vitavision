import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import PaperListRow, { PAPER_ROW_COLUMNS } from "./PaperListRow.tsx";
import {
    filterPaperRows,
    groupPapersByDecade,
    matchesPaperSearch,
    normalizeSearchText,
    sortPaperRows,
    type PaperRow,
    type PapersFilter,
    type PapersSort,
} from "../../lib/atlas/papersDirectory.ts";

const GROUP_PREVIEW_SIZE = 5;

interface PapersListProps {
    rows: PaperRow[];
    query: string;
    filter: PapersFilter;
    sort: PapersSort;
}

function ColumnHeader() {
    return (
        <div
            className={`${PAPER_ROW_COLUMNS} font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}
        >
            <span>Year</span>
            <span>Paper</span>
            <span className="hidden sm:block">Atlas page</span>
            <span className="hidden text-right sm:block">Built upon by</span>
        </div>
    );
}

/** Decade-grouped (default) or flat ranked (while searching) list of papers,
 *  each decade showing 5 rows then an in-place "All N →" expansion. */
export default function PapersList({ rows, query, filter, sort }: PapersListProps) {
    const [expanded, setExpanded] = useState<Set<number>>(new Set());
    const needle = normalizeSearchText(query.trim());
    const searching = needle.length > 0;

    const maxCitedBy = useMemo(() => Math.max(1, ...rows.map((r) => r.citedByCount)), [rows]);

    const base = useMemo(() => filterPaperRows(rows, filter), [rows, filter]);

    const searchResults = useMemo(() => {
        if (!searching) return [];
        return sortPaperRows(base.filter((r) => matchesPaperSearch(r, needle)), sort);
    }, [base, needle, searching, sort]);

    const groups = useMemo(() => {
        if (searching) return [];
        return groupPapersByDecade(sortPaperRows(base, sort));
    }, [base, sort, searching]);

    const toggleExpanded = (decade: number) => {
        setExpanded((prev) => {
            const next = new Set(prev);
            if (next.has(decade)) next.delete(decade);
            else next.add(decade);
            return next;
        });
    };

    return (
        <div className="flex flex-col gap-4">
            <ColumnHeader />

            {searching && (
                <div className="rounded-lg border border-border bg-surface">
                    {searchResults.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                            No paper matches “{query}”.
                        </p>
                    ) : (
                        searchResults.map((row, i) => (
                            <PaperListRow key={row.id} row={row} maxCitedBy={maxCitedBy} bordered={i > 0} />
                        ))
                    )}
                </div>
            )}

            {!searching && groups.length === 0 && (
                <p className="px-1 py-8 text-center text-[13px] text-muted-foreground">No papers match this filter.</p>
            )}

            {!searching &&
                groups.map((group) => {
                    const isExpanded = expanded.has(group.decade);
                    const shown = isExpanded ? group.rows : group.rows.slice(0, GROUP_PREVIEW_SIZE);
                    return (
                        <section key={group.decade} className="flex flex-col gap-2">
                            <div className="flex items-baseline justify-between">
                                <h2 className="text-[17px] font-bold text-foreground">
                                    {group.label}{" "}
                                    <span className="font-mono text-[13px] font-normal text-muted-foreground">
                                        {group.rows.length}
                                    </span>
                                </h2>
                                {group.rows.length > GROUP_PREVIEW_SIZE && !isExpanded && (
                                    <button
                                        type="button"
                                        onClick={() => toggleExpanded(group.decade)}
                                        className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:underline"
                                    >
                                        All {group.rows.length}
                                        <ArrowRight size={14} />
                                    </button>
                                )}
                            </div>
                            <div className="rounded-lg border border-border bg-surface">
                                {shown.map((row, i) => (
                                    <PaperListRow key={row.id} row={row} maxCitedBy={maxCitedBy} bordered={i > 0} />
                                ))}
                            </div>
                        </section>
                    );
                })}
        </div>
    );
}
