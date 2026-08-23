import { usePaperById } from "../../lib/atlas/usePaperById.ts";
import AuthorByline from "./AuthorByline.tsx";

interface SourceStripProps {
    /** A paper ID, optionally prefixed with `paper:`. Other prefixes (`repo:`, `doc:`) render nothing. */
    primary: string | undefined;
}

/** Compact "Based on … paper title … link" strip rendered above the article body. */
export default function SourceStrip({ primary }: SourceStripProps) {
    const paper = usePaperById(primary);
    if (!primary) return null;
    if (!paper || !paper.url) return null;

    const ctaLabel = paper.arxiv ? "arXiv ↗" : paper.doi ? "DOI ↗" : "Open ↗";
    const hasAuthors = paper.authors.length > 0;
    const venueYear = [paper.venue, paper.year].filter(Boolean).join(" ");

    // The whole strip stays clickable, but the byline now contains its own
    // author links — and anchors cannot nest. So the paper link is a stretched
    // overlay (`absolute inset-0`) rather than the strip's outer element, and
    // the author links sit above it on `z-10`.
    return (
        <div className="relative flex items-stretch border border-blue-500/25 rounded-lg overflow-hidden bg-gradient-to-r from-blue-500/[0.06] to-blue-500/[0.02] no-underline hover:border-blue-500/40 transition-colors">
            <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Open source paper: ${paper.title}`}
                className="absolute inset-0"
            />
            <div className="flex items-center bg-blue-500/[0.06] border-r border-blue-500/[0.18] px-3.5 py-2.5">
                <span className="font-mono font-semibold text-[9.5px] tracking-[0.16em] uppercase text-blue-300">
                    Based on
                </span>
            </div>
            <div className="flex-1 min-w-0 px-3.5 py-2.5">
                <div className="text-[13.5px] text-foreground font-medium leading-[1.35] truncate">
                    {paper.title}
                </div>
                {(hasAuthors || venueYear) && (
                    <div className="text-[11.5px] text-muted-foreground font-mono mt-0.5 truncate">
                        {hasAuthors && (
                            <AuthorByline
                                paperId={paper.id}
                                authors={paper.authors}
                                linkClassName="relative z-10"
                            />
                        )}
                        {hasAuthors && venueYear && " · "}
                        {venueYear}
                    </div>
                )}
            </div>
            <div className="px-4 py-2.5 border-l border-blue-500/[0.18] flex items-center text-[12px] font-mono text-blue-300 whitespace-nowrap">
                {ctaLabel}
            </div>
        </div>
    );
}
