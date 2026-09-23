import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ScholarlyNarrativeRef } from "../../lib/atlas/scholarlyTypes.ts";

/** Right column of the contribution section: every narrative reached by the
 *  author's papers. Hidden entirely when there are none. */
export default function AuthorNarratives({ narratives }: { narratives: ScholarlyNarrativeRef[] }) {
    if (narratives.length === 0) return null;

    return (
        <aside className="flex flex-col gap-2.5">
            <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                In {narratives.length} narrative{narratives.length === 1 ? "" : "s"}
            </h2>
            <div className="flex flex-col">
                {narratives.map((n) => (
                    <Link
                        key={n.slug}
                        to={`/atlas/narratives/${n.slug}`}
                        className="flex min-h-10 items-center justify-between gap-3 border-t border-border py-2 text-[14px] font-medium text-foreground no-underline transition-colors first:border-t-0 hover:text-primary"
                    >
                        {n.title}
                        <ArrowRight size={14} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    </Link>
                ))}
            </div>
        </aside>
    );
}
