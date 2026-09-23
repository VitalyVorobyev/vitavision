import { Link } from "react-router-dom";
import OrcidLink from "../../atlas/OrcidLink.tsx";
import PeopleEraBar from "./PeopleEraBar.tsx";
import { domainLabel, type PeopleRow as PeopleRowData } from "../../../lib/atlas/peopleDirectory.ts";

const COLUMNS = "grid grid-cols-[minmax(0,1fr)_56px_64px] sm:grid-cols-[minmax(0,1fr)_170px_150px_90px_90px] items-center gap-3 sm:gap-4 px-4 sm:px-5";

export { COLUMNS as PEOPLE_ROW_COLUMNS };

interface PeopleRowProps {
    row: PeopleRowData;
    bordered?: boolean;
}

/** One row of the People directory table: name (+ ORCID tag), top-3
 *  domains, an era bar, papers, and Atlas pages. */
export default function PeopleRow({ row, bordered = false }: PeopleRowProps) {
    const domains = row.domains.slice(0, 3).map(domainLabel).join(" · ") || "—";
    return (
        <Link
            to={`/authors/${row.id}`}
            className={`${COLUMNS} min-h-[48px] py-1.5 text-decoration-none hover:bg-[hsl(var(--surface-hi)/0.4)] ${
                bordered ? "border-t border-border" : ""
            }`}
        >
            <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[14px] sm:text-[15px] font-semibold text-foreground">{row.name}</span>
                {row.orcid && <OrcidLink orcid={row.orcid} size={12} />}
            </span>
            <span className="hidden sm:block truncate text-[12.5px] text-muted-foreground">{domains}</span>
            <span className="hidden sm:block">
                <PeopleEraBar firstYear={row.firstYear} lastYear={row.lastYear} />
            </span>
            <span className="text-right font-mono text-[13px] text-foreground/80 tabular-nums">{row.papers}</span>
            <span className="text-right font-mono text-[13px] font-semibold text-foreground tabular-nums">{row.pages}</span>
        </Link>
    );
}
