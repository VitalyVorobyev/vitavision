import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { CoauthorEgoGraph } from "../atlas/CoauthorEgoGraph.tsx";
import type { CoAuthor } from "../../lib/atlas/authorStats.ts";
import type { CoAuthorRow } from "../../lib/atlas/authorView.ts";

const TOP_SHOWN = 8;

function CoauthorRow({ row }: { row: CoAuthorRow }) {
    return (
        <div className="grid grid-cols-1 gap-1.5 border-t border-border py-2.5 first:border-t-0 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
            <Link to={`/authors/${row.id}`} className="flex flex-col gap-0.5 no-underline">
                <span className="text-[14.5px] font-semibold text-foreground">{row.name}</span>
                <span className="font-mono text-[11px] text-muted-foreground">
                    {row.shared} shared paper{row.shared === 1 ? "" : "s"}
                </span>
            </Link>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-[13.5px]">
                {row.sharedPapers.map((p) => (
                    <Link key={p.id} to={`/papers/${p.id}`} className="font-serif text-foreground/85 no-underline hover:text-foreground">
                        {p.title} <span className="font-mono text-[11px] text-muted-foreground">{p.year}</span>
                    </Link>
                ))}
            </div>
        </div>
    );
}

interface AuthorCoauthorsProps {
    subjectId: string;
    subjectName: string;
    coAuthors: CoAuthor[];
    rows: CoAuthorRow[];
}

/** Co-authors section: the ego graph + a link into the people network on the
 *  left, the top collaborators with their shared papers on the right, with
 *  an inline "All N co-authors" expansion for the rest. */
export default function AuthorCoauthors({ subjectId, subjectName, coAuthors, rows }: AuthorCoauthorsProps) {
    const [expanded, setExpanded] = useState(false);
    if (rows.length === 0) return null;

    const shown = expanded ? rows : rows.slice(0, TOP_SHOWN);
    const remaining = rows.length - shown.length;

    return (
        <section className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:items-start lg:gap-10">
            <div className="flex flex-col gap-2.5">
                <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Co-authors · {rows.length}
                </h2>
                <div className="flex justify-center rounded-lg border border-border bg-surface p-2">
                    <CoauthorEgoGraph subjectName={subjectName} coAuthors={coAuthors} />
                </div>
                <Link
                    to={`/atlas?view=people&mode=network&person=${subjectId}`}
                    className="flex items-center gap-1.5 text-[13px] font-medium text-foreground no-underline hover:text-primary"
                >
                    Open in the people network
                    <ArrowRight size={14} aria-hidden="true" />
                </Link>
            </div>

            <div className="flex flex-col" data-testid="author-coauthor-list">
                {shown.map((row) => (
                    <CoauthorRow key={row.id} row={row} />
                ))}
                {remaining > 0 && (
                    <button
                        type="button"
                        onClick={() => setExpanded(true)}
                        className="flex h-11 items-center gap-1.5 border-t border-border text-[13px] font-medium text-foreground"
                    >
                        All {rows.length} co-authors
                        <ArrowRight size={14} aria-hidden="true" />
                    </button>
                )}
            </div>
        </section>
    );
}
