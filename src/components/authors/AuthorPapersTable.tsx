import { Link } from "react-router";
import { shortAuthorList } from "../../lib/atlas/paperView.ts";
import type { AuthorPaperRow } from "../../lib/atlas/authorView.ts";

const primaryTagClass =
    "inline-flex h-[22px] max-w-[220px] items-center overflow-hidden text-ellipsis whitespace-nowrap rounded px-1.5 text-[12px] font-semibold";
const noPageTagClass =
    "inline-flex h-[22px] items-center whitespace-nowrap rounded border border-dashed px-1.5 text-[12px] font-medium";

function PageTag({ row }: { row: AuthorPaperRow }) {
    if (row.primaryTags.length === 0) {
        return (
            <span
                className={noPageTagClass}
                style={{ color: "var(--fg-muted)", borderColor: "var(--line-strong)" }}
            >
                No page yet
            </span>
        );
    }
    return (
        <div className="flex flex-wrap gap-1.5">
            {row.primaryTags.map((tag) => (
                <span
                    key={tag.slug}
                    className={primaryTagClass}
                    style={{
                        color: "var(--graph-icon-tint-model)",
                        background: "var(--graph-icon-bg-model)",
                        border: "1px solid var(--graph-icon-border-model)",
                    }}
                >
                    {tag.title}
                </span>
            ))}
        </div>
    );
}

/** "Papers · N" card — every registry paper credited to the author, newest
 *  first. Each row is a link to the paper page. */
export default function AuthorPapersTable({ rows }: { rows: AuthorPaperRow[] }) {
    if (rows.length === 0) return null;

    return (
        <section className="flex flex-col gap-2.5">
            <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-fg-muted">
                Papers · {rows.length}
            </h2>
            <div className="rounded-panel border border-line bg-surface" data-testid="author-papers-table">
                {rows.map((row) => (
                    <Link
                        key={row.id}
                        to={`/papers/${row.id}`}
                        className="flex flex-col gap-2 border-t border-line px-4 py-3 no-underline first:border-t-0 sm:grid sm:min-h-[58px] sm:grid-cols-[56px_minmax(0,1fr)_auto_150px] sm:items-center sm:gap-4 sm:px-5 sm:py-0"
                    >
                        <div className="flex items-baseline gap-2.5 sm:contents">
                            <span className="shrink-0 font-mono text-[12.5px] text-fg-muted sm:text-[13px]">
                                {row.year}
                            </span>
                            <span className="flex min-w-0 flex-col gap-0.5">
                                <span className="font-serif text-[15px] font-semibold leading-[1.3] text-fg sm:text-[16.5px]">
                                    {row.title}
                                </span>
                                <span className="hidden text-[12.5px] text-fg-muted sm:block">
                                    {shortAuthorList(row.authors)} · {row.venue}
                                </span>
                            </span>
                        </div>
                        <PageTag row={row} />
                        <span className="hidden text-right text-[12.5px] text-fg sm:block">
                            {row.pageCount > 0 ? (
                                `in ${row.pageCount} Atlas page${row.pageCount === 1 ? "" : "s"}`
                            ) : (
                                <span className="text-fg-muted">not yet cited</span>
                            )}
                        </span>
                    </Link>
                ))}
            </div>
        </section>
    );
}
