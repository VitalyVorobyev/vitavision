import { Fragment } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ExternalLink } from "lucide-react";
import type { PaperRef } from "../../generated/papers-index.ts";
import type { AuthorsIndex } from "../../generated/authors-index.ts";
import { resolveAuthorIds } from "../../lib/atlas/authorLinks.ts";

interface PaperHeaderProps {
    paper: PaperRef;
    authorsIndex: AuthorsIndex;
    /** First primary-source page's slug, when one exists — gates "View in graph". */
    primarySlug?: string;
}

const btnClass =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[13px] font-medium text-foreground no-underline transition-colors hover:border-border-strong hover:bg-muted";

export default function PaperHeader({ paper, authorsIndex, primarySlug }: PaperHeaderProps) {
    const authorIds = resolveAuthorIds(paper.authors, authorsIndex.paperAuthors[paper.id], authorsIndex.authors);
    const venueYear = [paper.venue, paper.year].filter(Boolean).join(" · ");

    return (
        <header className="flex flex-col gap-4">
            <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground"
            >
                <Link to="/atlas" className="hover:text-foreground transition-colors">
                    Atlas
                </Link>
                <span aria-hidden="true">/</span>
                <Link to="/atlas?view=papers" className="hover:text-foreground transition-colors">
                    Papers
                </Link>
                <span aria-hidden="true">/</span>
                <span>{paper.id}</span>
            </nav>

            <div className="flex items-center gap-2">
                <span className="inline-flex h-[18px] items-center rounded-[3px] border border-border bg-muted px-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                    Paper
                </span>
                {venueYear && <span className="font-mono text-[12.5px] text-foreground">{venueYear}</span>}
            </div>

            <h1 className="font-serif text-[clamp(1.75rem,4.5vw,2.625rem)] font-bold leading-[1.15] tracking-[-0.5px] text-foreground text-balance">
                {paper.title}
            </h1>

            {paper.authors.length > 0 && (
                <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[15px] sm:text-[16px]">
                    {paper.authors.map((display, i) => {
                        const id = authorIds[i];
                        const name = id ? (authorsIndex.authors[id]?.name ?? display) : display;
                        return (
                            <Fragment key={`${display}-${i}`}>
                                {id ? (
                                    <Link
                                        to={`/authors/${id}`}
                                        className="font-medium text-foreground underline decoration-border decoration-2 underline-offset-4 transition-colors hover:decoration-foreground"
                                    >
                                        {name}
                                    </Link>
                                ) : (
                                    <span className="font-medium text-foreground">{name}</span>
                                )}
                            </Fragment>
                        );
                    })}
                </div>
            )}

            <div className="flex flex-wrap items-center gap-2 pt-1">
                {paper.arxiv && (
                    <a
                        href={`https://arxiv.org/abs/${paper.arxiv}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass}
                    >
                        arXiv {paper.arxiv}
                        <ExternalLink size={12} aria-hidden="true" />
                    </a>
                )}
                {paper.doi && (
                    <a
                        href={`https://doi.org/${paper.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass}
                    >
                        DOI
                        <ExternalLink size={12} aria-hidden="true" />
                    </a>
                )}
                {!paper.arxiv && !paper.doi && paper.url && (
                    <a href={paper.url} target="_blank" rel="noopener noreferrer" className={btnClass}>
                        Open
                        <ExternalLink size={12} aria-hidden="true" />
                    </a>
                )}
                {primarySlug && (
                    <Link to={`/atlas?view=graph&focus=${primarySlug}`} className={btnClass}>
                        View in graph
                        <ArrowUpRight size={14} aria-hidden="true" />
                    </Link>
                )}
            </div>
        </header>
    );
}
