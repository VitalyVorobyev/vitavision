import { useMemo } from "react";
import { Link } from "react-router-dom";
import { searchEntities } from "../../lib/atlas/searchClient.ts";

const MAX_PER_GROUP = 3;

interface PeoplePapersMatchesProps {
    query: string;
}

function SectionLabel({ children }: { children: string }) {
    return (
        <h2 className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {children}
        </h2>
    );
}

/** A compact "People & papers" block shown above the catalog results when
 *  the reader has an active search query — up to 3 matching people and 3
 *  matching papers, each group linking through to the full People/Papers
 *  view pre-filtered by the same query (`?view=people|papers&q=<query>`,
 *  which atlasFilters.ts's `q` param already carries). Renders nothing when
 *  neither record type has a hit. */
export default function PeoplePapersMatches({ query }: PeoplePapersMatchesProps) {
    const people = useMemo(() => searchEntities(query, { types: ["author"], limit: MAX_PER_GROUP }), [query]);
    const papers = useMemo(() => searchEntities(query, { types: ["paper"], limit: MAX_PER_GROUP }), [query]);

    if (people.length === 0 && papers.length === 0) return null;

    const q = encodeURIComponent(query);

    return (
        <div className="mb-5 grid min-w-0 gap-3 sm:grid-cols-2">
            {people.length > 0 && (
                <div className="min-w-0 rounded-lg border border-border bg-surface p-3.5">
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <SectionLabel>People</SectionLabel>
                        <Link
                            to={`/atlas?view=people&q=${q}`}
                            className="flex min-h-11 shrink-0 items-center text-[12.5px] font-medium text-foreground hover:underline"
                        >
                            All matching people →
                        </Link>
                    </div>
                    <ul className="flex flex-col">
                        {people.map((p) => (
                            <li key={p.path} className="min-w-0">
                                <Link
                                    to={p.path}
                                    className="flex min-h-11 min-w-0 items-center justify-between gap-3 rounded-md px-2 py-1.5 hover:bg-[hsl(var(--surface-hi)/0.4)]"
                                >
                                    <span className="min-w-0 truncate text-[13.5px] font-semibold text-foreground">
                                        {p.title}
                                    </span>
                                    <span className="shrink-0 font-mono text-[11.5px] text-muted-foreground">
                                        {p.summary}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {papers.length > 0 && (
                <div className="min-w-0 rounded-lg border border-border bg-surface p-3.5">
                    <div className="mb-1.5 flex items-baseline justify-between gap-3">
                        <SectionLabel>Papers</SectionLabel>
                        <Link
                            to={`/atlas?view=papers&q=${q}`}
                            className="flex min-h-11 shrink-0 items-center text-[12.5px] font-medium text-foreground hover:underline"
                        >
                            All matching papers →
                        </Link>
                    </div>
                    <ul className="flex flex-col">
                        {papers.map((p) => (
                            <li key={p.path} className="min-w-0">
                                <Link
                                    to={p.path}
                                    className="flex min-h-11 min-w-0 flex-col justify-center gap-0.5 rounded-md px-2 py-1.5 hover:bg-[hsl(var(--surface-hi)/0.4)]"
                                >
                                    <span className="min-w-0 truncate font-serif text-[14px] font-semibold leading-tight text-foreground">
                                        {p.title}
                                    </span>
                                    <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                                        {p.authors && p.authors.length > 0 ? `${p.authors.join(", ")} · ` : ""}
                                        {p.summary}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
