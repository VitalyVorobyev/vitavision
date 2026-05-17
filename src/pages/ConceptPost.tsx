import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { conceptPages } from "../generated/content-index.ts";
import { conceptHtmlLoaders } from "../generated/concept-loaders.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelationshipPanel from "../components/atlas/RelationshipPanel.tsx";
import RelationsSidebar from "../components/atlas/RelationsSidebar.tsx";
import AtlasPageHeader from "../components/atlas/AtlasPageHeader.tsx";
import AIDisclosure from "../components/atlas/AIDisclosure.tsx";
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
    const isDraftBlocked = Boolean(page?.frontmatter.draft || page?.frontmatter.dev) && !isAdmin;

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
                    to="/atlas"
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
    const resolvedSlug = slug ?? page.slug;

    return (
        <div className="w-full mx-auto max-w-[1140px] px-4 sm:px-8 py-8 lg:py-12 grid lg:grid-cols-[minmax(0,720px)_280px] lg:gap-14 animate-in fade-in">
            <SeoHead
                title={frontmatter.title}
                description={frontmatter.summary}
                ogImage={frontmatter.coverImage}
                ogType="article"
                url={`/atlas/${slug}`}
            />
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>
            <div className="min-w-0">
                <AtlasPageHeader
                    backTo="/atlas"
                    backLabel="Back to atlas"
                    frontmatter={frontmatter}
                    badges={frontmatter.quality ? <QualityBadge quality={frontmatter.quality} /> : undefined}
                    kind="concept"
                    slug={resolvedSlug}
                />

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
                            data-atlas-slug={resolvedSlug}
                            data-atlas-kind="concept"
                            className={proseClasses}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </ErrorBoundary>
                )}

                <div className="lg:hidden">
                    <RelationshipPanel slug={resolvedSlug} />
                </div>

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

            <aside className="hidden lg:block">
                <div className="sticky top-6">
                    <RelationsSidebar slug={resolvedSlug} />
                    {frontmatter.sources?.primary && <AIDisclosure />}
                </div>
            </aside>
        </div>
    );
}
