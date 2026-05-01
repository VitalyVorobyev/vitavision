import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { conceptPages } from "../generated/content-index.ts";
import { conceptHtmlLoaders } from "../generated/concept-loaders.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import DifficultyBadge from "../components/blog/DifficultyBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelationshipPanel from "../components/atlas/RelationshipPanel.tsx";
import QualityBadge from "../components/atlas/QualityBadge.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";
import { useStaticContent } from "../lib/content/ssr-content.tsx";
import { buildConceptJsonLd } from "../lib/content/publication.ts";
import { useArticleIllustrations } from "../lib/content/useArticleIllustrations.tsx";
import { useArticleImageZoom } from "../lib/content/useArticleImageZoom.tsx";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import NotFound from "./NotFound.tsx";

export default function ConceptPost() {
    const { slug } = useParams<{ slug: string }>();
    const page = conceptPages.find((p) => p.slug === slug);
    const isAdmin = useIsAdmin();
    const staticContent = useStaticContent();
    const articleRef = useRef<HTMLElement>(null);

    // Resolve content synchronously from SSR context (postbuild prerender).
    // On the client useStaticContent() returns null, so the async loader runs instead.
    const syncHtml = slug
        ? staticContent?.conceptHtmlBySlug?.[slug] ?? null
        : null;

    // Async loading state — reset when slug changes (render-time state reset pattern).
    const [trackedSlug, setTrackedSlug] = useState(slug);
    const [asyncHtml, setAsyncHtml] = useState<string | null>(null);
    const [asyncFailed, setAsyncFailed] = useState(false);
    if (slug !== trackedSlug) {
        setTrackedSlug(slug);
        setAsyncHtml(null);
        setAsyncFailed(false);
    }

    // Draft gating must happen before the async loader fires, otherwise non-admins
    // download the draft HTML chunk even when the UI renders NotFound.
    const isDraftBlocked = Boolean(page?.frontmatter.draft) && !isAdmin;

    const html = isDraftBlocked ? null : syncHtml ?? asyncHtml;
    const loadFailed = !isDraftBlocked && html === null && (!slug || !(slug in conceptHtmlLoaders) || asyncFailed);

    useMermaid(articleRef, [html]);
    useArticleIllustrations(articleRef, [html]);
    useArticleImageZoom(articleRef, [html]);

    // Load content asynchronously when not available from SSR or hydration.
    useEffect(() => {
        if (isDraftBlocked) return;
        if (syncHtml !== null || !slug) return;
        const loader = conceptHtmlLoaders[slug];
        if (!loader) return;

        let cancelled = false;
        loader()
            .then((mod) => { if (!cancelled) setAsyncHtml(mod.html); })
            .catch(() => { if (!cancelled) setAsyncFailed(true); });
        return () => { cancelled = true; };
    }, [slug, syncHtml, isDraftBlocked]);

    if (!page) {
        return (
            <div className="max-w-[800px] mx-auto py-16 px-4 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">
                    Concept not found
                </h1>
                <p className="text-muted-foreground">
                    The concept page you're looking for doesn't exist.
                </p>
                <Link
                    to="/algorithms"
                    className="inline-block text-primary underline hover:text-primary/80"
                >
                    Back to atlas
                </Link>
            </div>
        );
    }

    if (isDraftBlocked) {
        return <NotFound />;
    }

    const { frontmatter } = page;
    const jsonLd = buildConceptJsonLd(frontmatter, slug ?? page.slug);

    return (
        <div className="w-full min-w-0 max-w-[760px] mx-auto py-16 px-4 sm:px-8 animate-in fade-in">
            <SeoHead
                title={frontmatter.title}
                description={frontmatter.summary}
                ogImage={frontmatter.coverImage}
                ogType="article"
                url={`/concepts/${slug}`}
            />
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>
            <header className="space-y-4 mb-8">
                <Link
                    to="/algorithms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to atlas
                </Link>
                <h1 className="text-[clamp(1.875rem,4vw,2.625rem)] font-bold tracking-[-0.03em] leading-[1.2]">
                    {frontmatter.draft && (
                        <span className="text-sm font-mono uppercase tracking-wider text-amber-500 border border-amber-500/40 rounded px-2 py-1 mr-3 align-middle">
                            draft
                        </span>
                    )}
                    {frontmatter.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground font-sans">
                    <span>{frontmatter.author}</span>
                    <span>&middot;</span>
                    <time>{frontmatter.date}</time>
                    {frontmatter.updated && (
                        <>
                            <span>&middot;</span>
                            <span>Updated {frontmatter.updated}</span>
                        </>
                    )}
                    {frontmatter.readingTimeMinutes && (
                        <>
                            <span>&middot;</span>
                            <span>{frontmatter.readingTimeMinutes} min read</span>
                        </>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {frontmatter.difficulty && (
                        <DifficultyBadge level={frontmatter.difficulty} />
                    )}
                    <QualityBadge quality={frontmatter.quality} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </header>

            <div className="border-t border-border mb-10" />

            {html === null ? (
                loadFailed ? (
                    <div className="py-10 text-sm text-muted-foreground">
                        Concept content failed to load.
                    </div>
                ) : (
                    <div className="flex items-center justify-center py-16">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    </div>
                )
            ) : (
                <ErrorBoundary>
                    <article
                        ref={articleRef}
                        className={proseClasses}
                        dangerouslySetInnerHTML={{ __html: html }}
                    />
                </ErrorBoundary>
            )}

            <RelationshipPanel slug={slug ?? page.slug} />

            {(frontmatter.sources?.primary || frontmatter.sources?.references?.length) && (
                <section className="mt-12 pt-6 border-t border-border space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                        Sources
                    </h3>
                    {frontmatter.sources.primary && (
                        <p className="text-sm text-muted-foreground">
                            Primary: <span className="font-mono">{frontmatter.sources.primary}</span>
                        </p>
                    )}
                    {frontmatter.sources.references && frontmatter.sources.references.length > 0 && (
                        <ul className="space-y-1">
                            {frontmatter.sources.references.map((ref) => (
                                <li key={ref} className="text-sm text-muted-foreground font-mono">
                                    {ref}
                                </li>
                            ))}
                        </ul>
                    )}
                </section>
            )}

            {(frontmatter.repoLinks?.length || frontmatter.demoLinks?.length) && (
                <footer className="mt-12 pt-6 border-t border-border space-y-3">
                    {frontmatter.demoLinks?.map((url) => (
                        <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-primary underline hover:text-primary/80 text-sm"
                        >
                            Demo: {url}
                        </a>
                    ))}
                    {frontmatter.repoLinks?.map((url) => (
                        <a
                            key={url}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-primary underline hover:text-primary/80 text-sm"
                        >
                            Repository: {url}
                        </a>
                    ))}
                </footer>
            )}
        </div>
    );
}
