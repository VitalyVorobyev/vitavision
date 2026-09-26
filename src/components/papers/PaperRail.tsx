import { Link } from "react-router-dom";
import type { PaperRef } from "../../generated/papers-index.ts";
import type { SameAuthorPaper } from "../../lib/atlas/paperView.ts";

export interface RailAuthor {
    id: string | undefined;
    name: string;
    /** Registry papers credited to this author (undefined when the id didn't resolve). */
    paperCount?: number;
    /** Distinct Atlas pages citing any of this author's papers. */
    pageCount?: number;
}

interface PaperRailProps {
    paper: PaperRef;
    authors: RailAuthor[];
    sameAuthorPapers: SameAuthorPaper[];
    /** Display name for each subject author id, for the "which of the authors" line. */
    nameOf: (authorId: string) => string;
}

function citeLine(paper: PaperRef): string {
    const authorsPart = paper.authors.join(", ");
    const venueYear = paper.venue.includes(String(paper.year)) ? paper.venue : `${paper.venue} ${paper.year}`;
    return `${authorsPart}. ${paper.title}. ${venueYear}.`;
}

const labelClass = "m-0 text-[10px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground";

export default function PaperRail({ paper, authors, sameAuthorPapers, nameOf }: PaperRailProps) {
    return (
        <aside className="flex flex-col gap-7">
            {authors.length > 0 && (
                <section className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
                    <h2 className={labelClass}>Authors</h2>
                    {authors.map((author) => (
                        <div key={author.id ?? author.name} className="border-t border-border pt-0">
                            {author.id ? (
                                <Link
                                    to={`/authors/${author.id}`}
                                    className="flex min-h-9 items-center justify-between gap-2 py-1.5 no-underline"
                                >
                                    <span className="text-[14px] font-medium text-foreground">{author.name}</span>
                                    <span className="whitespace-nowrap font-mono text-[11.5px] text-muted-foreground">
                                        {author.paperCount ?? 0} paper{(author.paperCount ?? 0) === 1 ? "" : "s"} ·{" "}
                                        {author.pageCount ?? 0} page{(author.pageCount ?? 0) === 1 ? "" : "s"}
                                    </span>
                                </Link>
                            ) : (
                                <div className="flex min-h-9 items-center py-1.5">
                                    <span className="text-[14px] font-medium text-foreground">{author.name}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </section>
            )}

            {sameAuthorPapers.length > 0 && (
                <section className="flex flex-col gap-2">
                    <h2 className={labelClass}>Same authors, also in the Atlas</h2>
                    {sameAuthorPapers.map((row) => (
                        <Link
                            key={row.id}
                            to={`/papers/${row.id}`}
                            className="flex flex-col gap-px border-t border-border py-[7px] no-underline"
                        >
                            <span className="font-serif text-[14.5px] leading-[1.3] text-foreground">{row.title}</span>
                            <span className="font-mono text-[11px] text-muted-foreground">
                                {row.year} · {row.authorIds.map(nameOf).join(", ")}
                            </span>
                        </Link>
                    ))}
                </section>
            )}

            <section className="flex flex-col gap-1.5">
                <h2 className={labelClass}>Cite</h2>
                <p className="m-0 font-mono text-[11.5px] leading-[1.6] text-foreground">{citeLine(paper)}</p>
            </section>
        </aside>
    );
}
