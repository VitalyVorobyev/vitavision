import { useMemo, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import SeoHead from "../components/seo/SeoHead.tsx";
import OrcidLink from "../components/atlas/OrcidLink.tsx";
import { SourceCard } from "../components/atlas/SourceCard.tsx";
import { contentGraph } from "../generated/content-graph.ts";
import { useAuthorsIndex } from "../lib/atlas/useAuthorsIndex.ts";
import { atlasSlugsForPapers, coAuthorsOf } from "../lib/atlas/authorStats.ts";
import NotFound from "./NotFound.tsx";

function Section({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-2.5">
            <h2 className="text-[11px] font-mono font-semibold uppercase tracking-[0.14em] text-muted-foreground m-0">
                {title}
            </h2>
            {children}
        </section>
    );
}

export default function AuthorPage() {
    const { id } = useParams<{ id: string }>();
    const index = useAuthorsIndex();
    const author = id ? index.authors[id] : undefined;

    const atlasSlugs = useMemo(
        () => (author ? atlasSlugsForPapers(author.papers, index.pagesByPaper) : []),
        [author, index.pagesByPaper],
    );
    const coAuthors = useMemo(() => (id ? coAuthorsOf(id, index) : []), [id, index]);

    // The index arrives asynchronously on the client (SSR/prerender gets it
    // synchronously). An empty register means "still loading", not "unknown id".
    const indexLoaded = Object.keys(index.authors).length > 0;

    if (!author) {
        if (!indexLoaded) {
            return (
                <div className="max-w-[880px] mx-auto py-12 px-4 lg:px-8">
                    <p className="text-[13px] text-muted-foreground">Loading the author register…</p>
                </div>
            );
        }
        return <NotFound />;
    }

    const paperWord = author.papers.length === 1 ? "paper" : "papers";

    return (
        <div className="max-w-[880px] mx-auto py-12 px-4 lg:px-8 space-y-8 animate-in fade-in">
            <SeoHead
                title={author.name}
                description={`${author.name} — ${author.papers.length} ${paperWord} cited by the VitaVision computer vision atlas.`}
                url={`/authors/${id}`}
            />

            <header className="space-y-2">
                <Link
                    to="/authors"
                    className="text-[11.5px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                    ← Authors
                </Link>
                <div className="flex items-center gap-2">
                    <h1 className="text-[26px] font-bold -tracking-[0.4px] m-0">{author.name}</h1>
                    {author.orcid && <OrcidLink orcid={author.orcid} size={16} />}
                </div>
                <p className="text-[13px] text-muted-foreground m-0">
                    {author.papers.length} {paperWord} · {atlasSlugs.length} atlas page
                    {atlasSlugs.length === 1 ? "" : "s"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11.5px] font-mono">
                    <a
                        href={`https://openalex.org/${id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center h-7 px-2.5 rounded-md border border-border bg-muted text-foreground hover:bg-surface transition-colors no-underline"
                    >
                        OpenAlex ↗
                    </a>
                    {author.orcid && (
                        <a
                            href={`https://orcid.org/${author.orcid}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center h-7 px-2.5 rounded-md border border-border bg-muted text-foreground hover:bg-surface transition-colors no-underline"
                        >
                            ORCID ↗
                        </a>
                    )}
                </div>
            </header>

            <Section title={`Papers (${author.papers.length})`}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {author.papers.map((paperId) => (
                        <SourceCard key={paperId} primary={paperId} />
                    ))}
                </div>
            </Section>

            {atlasSlugs.length > 0 && (
                <Section title={`In the Atlas (${atlasSlugs.length})`}>
                    <div className="flex flex-wrap gap-1.5">
                        {atlasSlugs.map((slug) => (
                            <Link
                                key={slug}
                                to={`/atlas/${slug}`}
                                className="inline-flex items-center h-7 px-2.5 rounded-md border border-border bg-muted/40 text-[11.5px] text-foreground hover:bg-muted hover:border-primary/40 transition-colors no-underline"
                            >
                                {contentGraph.nodes[slug]?.title ?? slug}
                            </Link>
                        ))}
                    </div>
                </Section>
            )}

            {coAuthors.length > 0 && (
                <Section title={`Co-authors (${coAuthors.length})`}>
                    <ul className="list-none p-0 m-0">
                        {coAuthors.map((co) => (
                            <li
                                key={co.id}
                                className="flex items-baseline gap-2 py-1 border-b border-[hsl(var(--border)/0.4)] last:border-b-0"
                            >
                                <Link
                                    to={`/authors/${co.id}`}
                                    className="text-[13.5px] text-foreground hover:text-primary transition-colors"
                                >
                                    {co.name}
                                </Link>
                                <span className="flex-1" />
                                <span className="text-[11.5px] font-mono text-muted-foreground whitespace-nowrap tabular-nums">
                                    {co.shared} shared {co.shared === 1 ? "paper" : "papers"}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Section>
            )}
        </div>
    );
}
