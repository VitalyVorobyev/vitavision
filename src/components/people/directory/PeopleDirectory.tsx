import { useMemo } from "react";
import { ArrowRight } from "lucide-react";
import PeopleRow, { PEOPLE_ROW_COLUMNS } from "./PeopleRow.tsx";
import {
    computeDomainChips,
    groupPeopleByDomain,
    matchesPeopleSearch,
    normalizeSearchText,
    paperTitlesForAuthor,
    sortPeopleRows,
    type PeopleRow as PeopleRowData,
    type PeopleSort,
} from "../../../lib/atlas/peopleDirectory.ts";
import type { AuthorsIndex } from "../../../generated/authors-index.ts";
import type { PapersById } from "../../../lib/atlas/paperRefTypes.ts";

const GROUP_PREVIEW_SIZE = 5;

interface PeopleDirectoryProps {
    rows: PeopleRowData[];
    authorsIndex: AuthorsIndex;
    papersById: PapersById;
    query: string;
    sort: PeopleSort;
    selectedDomain: string | null;
    onSelectDomain: (domain: string | null) => void;
}

function ColumnHeader() {
    return (
        <div
            className={`${PEOPLE_ROW_COLUMNS} font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground`}
        >
            <span>Name</span>
            <span className="hidden sm:block">Domains</span>
            <span className="hidden sm:block">Active 1980 → now</span>
            <span className="text-right">Papers</span>
            <span className="text-right">Atlas pages</span>
        </div>
    );
}

/** Directory table body: domain chips, column header, and either grouped
 *  sections (default), a single expanded domain section, or a flat ranked
 *  search-result list. */
export default function PeopleDirectory({
    rows,
    authorsIndex,
    papersById,
    query,
    sort,
    selectedDomain,
    onSelectDomain,
}: PeopleDirectoryProps) {
    const needle = normalizeSearchText(query.trim());
    const searching = needle.length > 0;

    const chips = useMemo(() => computeDomainChips(rows), [rows]);

    const searchResults = useMemo(() => {
        if (!searching) return [];
        const matched = rows.filter((row) =>
            matchesPeopleSearch(row, needle, paperTitlesForAuthor(row.id, authorsIndex, papersById)),
        );
        return sortPeopleRows(matched, sort);
    }, [rows, needle, searching, sort, authorsIndex, papersById]);

    const domainFiltered = useMemo(() => {
        if (searching || !selectedDomain) return [];
        return sortPeopleRows(rows.filter((r) => r.mainDomain === selectedDomain), sort);
    }, [rows, sort, selectedDomain, searching]);

    const groups = useMemo(() => {
        if (searching || selectedDomain) return [];
        return groupPeopleByDomain(sortPeopleRows(rows, sort), chips);
    }, [rows, sort, chips, searching, selectedDomain]);

    return (
        <div className="flex flex-col gap-4">
            {!searching && (
                <div className="flex flex-wrap gap-1.5">
                    <button
                        type="button"
                        onClick={() => onSelectDomain(null)}
                        className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] font-medium transition-colors ${
                            selectedDomain === null
                                ? "bg-[hsl(var(--foreground)/0.85)] text-background"
                                : "border border-border bg-surface text-foreground hover:bg-[hsl(var(--surface-hi)/0.5)]"
                        }`}
                    >
                        All domains
                        <span className="font-mono tabular-nums opacity-80">{rows.length}</span>
                    </button>
                    {chips.map((chip) => (
                        <button
                            key={chip.domain}
                            type="button"
                            onClick={() => onSelectDomain(chip.domain)}
                            className={`inline-flex h-8 items-center gap-1.5 rounded-[5px] px-2.5 text-[13px] font-medium transition-colors ${
                                selectedDomain === chip.domain
                                    ? "bg-[hsl(var(--foreground)/0.85)] text-background"
                                    : "border border-border bg-surface text-foreground hover:bg-[hsl(var(--surface-hi)/0.5)]"
                            }`}
                        >
                            {chip.label}
                            <span className="font-mono tabular-nums text-muted-foreground">{chip.count}</span>
                        </button>
                    ))}
                </div>
            )}

            <ColumnHeader />

            {searching && (
                <div className="rounded-lg border border-border bg-surface">
                    {searchResults.length === 0 ? (
                        <p className="px-4 py-8 text-center text-[13px] text-muted-foreground">
                            No person or paper matches “{query}”.
                        </p>
                    ) : (
                        searchResults.map((row, i) => <PeopleRow key={row.id} row={row} bordered={i > 0} />)
                    )}
                </div>
            )}

            {!searching && selectedDomain && (
                <section className="flex flex-col gap-2">
                    <h2 className="text-[17px] font-bold text-foreground">
                        {chips.find((c) => c.domain === selectedDomain)?.label ?? selectedDomain}{" "}
                        <span className="font-mono text-[13px] font-normal text-muted-foreground">
                            {domainFiltered.length}
                        </span>
                    </h2>
                    <div className="rounded-lg border border-border bg-surface">
                        {domainFiltered.map((row, i) => (
                            <PeopleRow key={row.id} row={row} bordered={i > 0} />
                        ))}
                    </div>
                </section>
            )}

            {!searching &&
                !selectedDomain &&
                groups.map((group) => (
                    <section key={group.domain} className="flex flex-col gap-2">
                        <div className="flex items-baseline justify-between">
                            <h2 className="text-[17px] font-bold text-foreground">
                                {group.label}{" "}
                                <span className="font-mono text-[13px] font-normal text-muted-foreground">
                                    {group.rows.length}
                                </span>
                            </h2>
                            {group.rows.length > GROUP_PREVIEW_SIZE && (
                                <button
                                    type="button"
                                    onClick={() => onSelectDomain(group.domain)}
                                    className="flex items-center gap-1.5 text-[13px] font-medium text-foreground hover:underline"
                                >
                                    All {group.rows.length} in {group.label.toLowerCase()}
                                    <ArrowRight size={14} />
                                </button>
                            )}
                        </div>
                        <div className="rounded-lg border border-border bg-surface">
                            {group.rows.slice(0, GROUP_PREVIEW_SIZE).map((row, i) => (
                                <PeopleRow key={row.id} row={row} bordered={i > 0} />
                            ))}
                        </div>
                    </section>
                ))}
        </div>
    );
}
