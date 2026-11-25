import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import type { ScholarlyNarrativeRef } from "../../lib/atlas/scholarlyTypes.ts";

/** "Appears in N narratives" — hidden entirely when the paper reaches none. */
export default function PaperNarratives({ narratives }: { narratives: ScholarlyNarrativeRef[] }) {
    if (narratives.length === 0) return null;

    return (
        <section className="flex flex-col gap-3">
            <h2 className="m-0 text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-fg-muted">
                Appears in {narratives.length} narrative{narratives.length === 1 ? "" : "s"}
            </h2>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {narratives.map((n) => (
                    <Link
                        key={n.slug}
                        to={`/atlas/narratives/${n.slug}`}
                        className="flex min-h-[44px] items-center justify-between gap-2.5 rounded-panel border border-line bg-surface px-3.5 py-3 no-underline transition-colors hover:border-line-strong"
                    >
                        <span className="flex flex-col gap-0.5">
                            <span className="text-[9.5px] font-mono font-semibold uppercase tracking-[0.12em] text-fg-muted">
                                Narrative
                            </span>
                            <span className="text-[14.5px] font-semibold text-fg">{n.title}</span>
                        </span>
                        <ArrowRight size={14} className="shrink-0 text-fg-muted" aria-hidden="true" />
                    </Link>
                ))}
            </div>
        </section>
    );
}
