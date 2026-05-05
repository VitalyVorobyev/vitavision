import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { algorithmPages } from "../generated/content-index.ts";
import { algorithmHtmlLoaders } from "../generated/algorithm-loaders.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import RelationshipPanel from "../components/atlas/RelationshipPanel.tsx";
import RelationsSidebar from "../components/atlas/RelationsSidebar.tsx";
import AtlasPageHeader from "../components/atlas/AtlasPageHeader.tsx";
import AIDisclosure from "../components/atlas/AIDisclosure.tsx";
import QualityBadge from "../components/atlas/QualityBadge.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";
import { useStaticContent } from "../lib/content/ssr-content.tsx";
import { buildAlgorithmJsonLd } from "../lib/content/publication.ts";
import { useArticleIllustrations } from "../lib/content/useArticleIllustrations.tsx";
import { useArticleImageZoom } from "../lib/content/useArticleImageZoom.tsx";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import NotFound from "./NotFound.tsx";

export default function AlgorithmPost() {
    const { slug } = useParams<{ slug: string }>();
    const page = algorithmPages.find((p) => p.slug === slug);
    const isAdmin = useIsAdmin();
    const staticContent = useStaticContent();
    const articleRef = useRef<HTMLElement>(null);

    // Resolve content synchronously from SSR context (postbuild prerender).
    // On the client useStaticContent() returns null, so the async loader runs instead.
    const syncHtml = slug
        ? staticContent?.algorithmHtmlBySlug?.[slug] ?? null
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
    const loadFailed = !isDraftBlocked && html === null && (!slug || !(slug in algorithmHtmlLoaders) || asyncFailed);

    useMermaid(articleRef, [html]);
    useArticleIllustrations(articleRef, [html]);
    useArticleImageZoom(articleRef, [html]);

    // Load content asynchronously when not available from SSR or hydration.
    useEffect(() => {
        if (isDraftBlocked) return;
        if (syncHtml !== null || !slug) return;
        const loader = algorithmHtmlLoaders[slug];
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
                    Algorithm not found
                </h1>
                <p className="text-muted-foreground">
                    The algorithm page you're looking for doesn't exist.
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
    const jsonLd = buildAlgorithmJsonLd(frontmatter, slug ?? page.slug);
    const resolvedSlug = slug ?? page.slug;

    // The "Superseded by" amber section renders only on `quality: "historical"`
    // pages. The validator (Rule 4b) guarantees that such pages have at least
    // one `generalized_by` / `confidence: high` relation; pick the first such
    // entry as the supersession target.
    const supersededBy = frontmatter.quality === "historical"
        ? frontmatter.relations?.find((r) => r.type === "generalized_by" && r.confidence === "high")?.target
        : undefined;

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
                    kind="algorithm"
                />

                {html === null ? (
                    loadFailed ? (
                        <div className="py-10 text-sm text-muted-foreground">
                            Algorithm content failed to load.
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

                {frontmatter.editorAlgorithmId && (() => {
                    const id = frontmatter.editorAlgorithmId;
                    // Default sample image per algorithm — keeps the CTA runnable in one click.
                    const sample = ({
                        "chess-corners": "chessboard",
                        "chessboard": "chessboard",
                        "charuco": "charuco",
                        "markerboard": "markerboard",
                        "ringgrid": "ringgrid",
                        "radsym": "ringgrid",
                        "puzzleboard": "puzzleboard",
                    } as Record<string, string>)[id];
                    const qs = sample
                        ? `algo=${id}&sample=${sample}`
                        : `algo=${id}`;
                    return (
                        <div className="mt-10">
                            <Link
                                to={`/editor?${qs}`}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium"
                            >
                                Try in the editor →
                            </Link>
                        </div>
                    );
                })()}

                <div className="lg:hidden">
                    <RelatedPosts slugs={frontmatter.relatedPosts} type="blog" />
                    <RelatedPosts slugs={frontmatter.relatedDemos} type="demo" />
                    <RelationshipPanel
                        slug={resolvedSlug}
                        supersededBy={supersededBy}
                    />
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
                    <RelationsSidebar
                        slug={resolvedSlug}
                        relatedPosts={frontmatter.relatedPosts}
                        relatedDemos={frontmatter.relatedDemos}
                        supersededBy={supersededBy}
                    />
                    {frontmatter.sources?.primary && <AIDisclosure />}
                </div>
            </aside>
        </div>
    );
}
