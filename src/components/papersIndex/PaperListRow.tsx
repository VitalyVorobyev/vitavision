import { Link } from "react-router-dom";
import { PaperPageTag, NoPageTag } from "./PaperPageTag.tsx";
import type { PaperRow } from "../../lib/atlas/papersDirectory.ts";

const COLUMNS = "grid grid-cols-[40px_minmax(0,1fr)] sm:grid-cols-[48px_minmax(0,1fr)_240px_110px] items-center gap-3 sm:gap-4 px-4 sm:px-5";

export { COLUMNS as PAPER_ROW_COLUMNS };

function pluralize(n: number, singular: string, plural: string): string {
    return n === 1 ? singular : plural;
}

interface PaperListRowProps {
    row: PaperRow;
    maxCitedBy: number;
    bordered?: boolean;
}

/** One row of the Papers index: year, serif title + byline, its Atlas
 *  page(s) (or "No page yet"), and a small bar + count for registry
 *  cited-by. */
export default function PaperListRow({ row, maxCitedBy, bordered = false }: PaperListRowProps) {
    const extra = row.primaryPages.length - 1;
    const barWidth = maxCitedBy > 0 ? Math.max(row.citedByCount > 0 ? 6 : 0, (row.citedByCount / maxCitedBy) * 100) : 0;

    return (
        <Link
            to={`/papers/${row.id}`}
            className={`${COLUMNS} min-h-[60px] py-2 text-decoration-none hover:bg-[hsl(var(--surface-hi)/0.4)] ${
                bordered ? "border-t border-border" : ""
            }`}
        >
            <span className="self-start pt-0.5 font-mono text-[13px] text-muted-foreground">{row.year}</span>

            <span className="flex min-w-0 flex-col gap-0.5">
                <span className="font-serif text-[15.5px] sm:text-[16.5px] font-semibold leading-tight text-foreground">
                    {row.title}
                </span>
                <span className="truncate text-[12.5px] text-muted-foreground">
                    {row.authorsShort} · {row.venue}
                </span>
                {/* Page tags render inline on mobile, in their own column on desktop */}
                <span className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5 sm:hidden">
                    {row.primaryPages.length > 0 ? <PaperPageTag page={row.primaryPages[0]} /> : <NoPageTag />}
                    {extra > 0 && <span className="font-mono text-[11.5px] text-muted-foreground">+{extra}</span>}
                    {row.citingPageCount > 0 && (
                        <span className="whitespace-nowrap text-[12px] text-muted-foreground">
                            · cited by {row.citingPageCount} {pluralize(row.citingPageCount, "page", "pages")}
                        </span>
                    )}
                </span>
            </span>

            <span className="hidden min-w-0 items-center gap-1.5 sm:flex">
                {row.primaryPages.length > 0 ? <PaperPageTag page={row.primaryPages[0]} /> : <NoPageTag />}
                {extra > 0 && <span className="font-mono text-[11.5px] text-muted-foreground">+{extra}</span>}
                {row.citingPageCount > 0 && (
                    <span className="whitespace-nowrap text-[12px] text-muted-foreground">
                        · cited by {row.citingPageCount} {pluralize(row.citingPageCount, "page", "pages")}
                    </span>
                )}
            </span>

            <span className="hidden items-center justify-end gap-2 sm:flex">
                <svg width={70} height={8} aria-hidden="true">
                    <rect width={70} height={8} rx={2} fill="hsl(var(--surface-hi))" />
                    <rect width={barWidth * 0.7} height={8} rx={2} fill="hsl(var(--graph-icon-tint-model))" />
                </svg>
                <span className="w-[22px] text-right font-mono text-[12px] text-foreground/80 tabular-nums">
                    {row.citedByCount}
                </span>
            </span>
        </Link>
    );
}
