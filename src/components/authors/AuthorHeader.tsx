import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import type { AuthorSummary } from "../../lib/atlas/authorView.ts";

interface AuthorHeaderProps {
    id: string;
    name: string;
    orcid?: string;
    summary: AuthorSummary;
}

const btnClass =
    "inline-flex h-9 items-center gap-1.5 rounded-md border border-border bg-surface px-3.5 text-[13px] font-medium text-foreground no-underline transition-colors hover:border-border-strong hover:bg-muted";

/** Breadcrumb, name, ORCID/OpenAlex links, and the one/two-sentence Atlas
 *  footprint summary — the top of the author page, in the same visual
 *  register as `PaperHeader`. */
export default function AuthorHeader({ id, name, orcid, summary }: AuthorHeaderProps) {
    return (
        <header className="flex flex-col gap-4">
            <nav aria-label="Breadcrumb" className="flex items-center gap-2 font-mono text-[12px] text-muted-foreground">
                <Link to="/atlas" className="transition-colors hover:text-foreground">
                    Atlas
                </Link>
                <span aria-hidden="true">/</span>
                <Link to="/atlas?view=people" className="transition-colors hover:text-foreground">
                    People
                </Link>
            </nav>

            <div className="flex flex-wrap items-center gap-3">
                <h1 className="m-0 text-[clamp(1.75rem,4.5vw,2.5rem)] font-bold tracking-[-0.4px] text-foreground">
                    {name}
                </h1>
                <div className="flex flex-wrap items-center gap-2">
                    {orcid && (
                        <a
                            href={`https://orcid.org/${orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={btnClass}
                        >
                            ORCID
                            <ExternalLink size={12} aria-hidden="true" />
                        </a>
                    )}
                    <a
                        href={`https://openalex.org/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={btnClass}
                    >
                        OpenAlex
                        <ExternalLink size={12} aria-hidden="true" />
                    </a>
                </div>
            </div>

            <p className="m-0 max-w-[760px] text-[15.5px] leading-[1.55] text-foreground/85 sm:text-[16px]">
                {summary.first}
                {summary.second && (
                    <>
                        {" "}
                        {summary.second.before}
                        <strong className="font-semibold text-foreground">{summary.second.bold}</strong>
                        {summary.second.after}
                    </>
                )}
            </p>
        </header>
    );
}
