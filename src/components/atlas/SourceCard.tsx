import { usePaperById } from "../../lib/atlas/usePaperById.ts";

interface SourceCardProps {
    /** A paper ID, optionally prefixed with `paper:`. Other prefixes (`repo:`, `doc:`) render nothing. */
    primary: string | undefined;
}

/** First 4 last-names joined by ", " — keeps the byline compact. */
function formatAuthorsShort(authors: string[]): string {
    if (authors.length === 0) return "";
    const lastNames = authors.map((a) => a.trim().split(/\s+/).pop() ?? a);
    if (lastNames.length <= 4) return lastNames.join(", ");
    return `${lastNames.slice(0, 4).join(", ")} et al.`;
}

/**
 * Compact vertical source card sized for a ~260 px-wide column (the graph-view
 * right rail). Uses `SourceStrip`'s same paper-resolution logic but stacks the
 * title, meta, and link vertically so nothing truncates in the narrow panel.
 */
export function SourceCard({ primary }: SourceCardProps) {
    const paper = usePaperById(primary);
    if (!primary) return null;
    if (!paper || !paper.url) return null;

    const ctaLabel = paper.arxiv ? "arXiv ↗" : paper.doi ? "DOI ↗" : "Open ↗";
    const authorsShort = formatAuthorsShort(paper.authors);
    const venueYear = [paper.venue, paper.year].filter(Boolean).join(" ");
    const meta = [authorsShort, venueYear].filter(Boolean).join(" · ");

    return (
        <div className="rounded-lg border border-border bg-muted/40 p-3 flex flex-col gap-1.5">
            {/* Eyebrow */}
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Source
            </span>

            {/* Title — wraps; capped at 3 lines */}
            <p className="text-[12.5px] font-medium text-foreground leading-snug line-clamp-3 m-0">
                {paper.title}
            </p>

            {/* Authors · Venue Year */}
            {meta && (
                <p className="text-[11px] text-muted-foreground font-mono leading-snug m-0">
                    {meta}
                </p>
            )}

            {/* Link button */}
            <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-border bg-muted text-[11px] font-mono text-foreground hover:bg-surface hover:border-border transition-colors self-start mt-0.5"
            >
                {ctaLabel}
            </a>
        </div>
    );
}
