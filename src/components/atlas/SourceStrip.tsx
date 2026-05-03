import { usePaperById } from "../../lib/atlas/usePaperById.ts";

interface SourceStripProps {
    /** A paper ID, optionally prefixed with `paper:`. Other prefixes (`repo:`, `doc:`) render nothing. */
    primary: string | undefined;
}

/** First 4 last-names joined by ", " — keeps the byline compact without losing all attribution. */
function formatAuthorsShort(authors: string[]): string {
    if (authors.length === 0) return "";
    const lastNames = authors.map((a) => a.trim().split(/\s+/).pop() ?? a);
    if (lastNames.length <= 4) return lastNames.join(", ");
    return `${lastNames.slice(0, 4).join(", ")} et al.`;
}

/** Compact "Based on … paper title … link" strip rendered above the article body. */
export default function SourceStrip({ primary }: SourceStripProps) {
    const paper = usePaperById(primary);
    if (!primary) return null;
    if (!paper || !paper.url) return null;

    const ctaLabel = paper.arxiv ? "arXiv ↗" : paper.doi ? "DOI ↗" : "Open ↗";
    const authorsLine = formatAuthorsShort(paper.authors);
    const venueYear = [paper.venue, paper.year].filter(Boolean).join(" ");
    const meta = [authorsLine, venueYear].filter(Boolean).join(" · ");

    return (
        <a
            href={paper.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-stretch border border-blue-500/25 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500/[0.06] to-blue-500/[0.02] no-underline hover:border-blue-500/40 transition-colors"
        >
            <div className="flex items-center bg-blue-500/[0.06] border-r border-blue-500/[0.18] px-3.5 py-2.5">
                <span className="font-mono font-semibold text-[9.5px] tracking-[0.16em] uppercase text-blue-300">
                    Based on
                </span>
            </div>
            <div className="flex-1 min-w-0 px-3.5 py-2.5">
                <div className="text-[13.5px] text-foreground font-medium leading-[1.35] truncate">
                    {paper.title}
                </div>
                {meta && (
                    <div className="text-[11.5px] text-muted-foreground font-mono mt-0.5 truncate">
                        {meta}
                    </div>
                )}
            </div>
            <div className="px-4 py-2.5 border-l border-blue-500/[0.18] flex items-center text-[12px] font-mono text-blue-300 whitespace-nowrap">
                {ctaLabel}
            </div>
        </a>
    );
}
