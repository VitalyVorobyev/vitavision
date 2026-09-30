import { Link } from "react-router";
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

    // The whole strip stays clickable (to the paper page), but the byline
    // contains its own author links and the CTA opens the external source —
    // and anchors/links cannot nest. So the paper-page link is a stretched
    // overlay (`absolute inset-0`) rather than the strip's outer element, and
    // the author links + external CTA sit above it on `z-10`.
    return (
        <div className="relative flex items-stretch border border-ink-blue/25 rounded-panel overflow-hidden bg-gradient-to-r from-ink-blue/[0.06] to-ink-blue/[0.02] no-underline hover:border-ink-blue/40 transition-colors">
            <Link
                to={`/papers/${paper.id}`}
                aria-label={`Open paper page: ${paper.title}`}
                className="absolute inset-0"
            />
            <div className="flex items-center bg-ink-blue/[0.06] border-r border-ink-blue/[0.18] px-3.5 py-2.5">
                <span className="font-mono font-semibold text-[9.5px] tracking-[0.16em] uppercase text-ink-blue">
                    Based on
                </span>
            </div>
            <div className="flex-1 min-w-0 px-3.5 py-2.5">
                <div className="text-[13.5px] text-fg font-medium leading-[1.35] truncate">
                    {paper.title}
                </div>
                {(hasAuthors || venueYear) && (
                    <div className="text-[11.5px] text-fg-muted font-mono mt-0.5 truncate">
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
            <a
                href={paper.url}
                target="_blank"
                rel="noopener noreferrer"
                className="relative z-10 px-4 py-2.5 border-l border-ink-blue/[0.18] flex items-center text-[12px] font-mono text-ink-blue whitespace-nowrap hover:underline"
            >
                {ctaLabel}
            </a>
        </div>
    );
}
