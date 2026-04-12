import { Suspense, useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { demoPages } from "../generated/content-index.ts";
import { demoHtmlLoaders } from "../generated/demo-loaders.ts";
import { demoRegistry } from "../lib/content/demoRegistry.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";
import { useStaticContent } from "../lib/content/ssr-content.tsx";
import { buildDemoJsonLd } from "../lib/content/publication.ts";
import { useArticleIllustrations } from "../lib/content/useArticleIllustrations.tsx";
import NotFound from "./NotFound.tsx";

export default function DemoPage() {
    const { slug } = useParams<{ slug: string }>();
    const demo = demoPages.find((d) => d.slug === slug);
    const staticContent = useStaticContent();
    const articleRef = useRef<HTMLElement>(null);

    // Resolve content synchronously from SSR context (postbuild prerender).
    // On the client useStaticContent() returns null, so the async loader runs instead.
    const syncHtml = slug
        ? staticContent?.demoHtmlBySlug?.[slug] ?? null
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

    const html = syncHtml ?? asyncHtml;
    const loadFailed = html === null && (!slug || !(slug in demoHtmlLoaders) || asyncFailed);

    useArticleIllustrations(articleRef, [html]);

    // Load content asynchronously when not available from SSR or hydration.
    useEffect(() => {
        if (syncHtml !== null || !slug) return;
        const loader = demoHtmlLoaders[slug];
        if (!loader) return;

        let cancelled = false;
        loader()
            .then((mod) => { if (!cancelled) setAsyncHtml(mod.html); })
            .catch(() => { if (!cancelled) setAsyncFailed(true); });
        return () => { cancelled = true; };
    }, [slug, syncHtml]);

    if (!demo || !slug) {
        return <NotFound />;
    }

    const { frontmatter } = demo;
    const registryEntry = demoRegistry[slug];
    const DemoComponent = registryEntry?.component ?? null;

    if (!DemoComponent) {
        console.warn("[demos] missing registry entry for slug:", slug);
    }

    const jsonLd = buildDemoJsonLd(frontmatter, slug);

    return (
        <div className="w-full animate-in fade-in">
            {/* Header block */}
            <div className="max-w-screen-xl mx-auto px-4 lg:px-8 py-8 space-y-4">
                <SeoHead
                    title={frontmatter.title}
                    description={frontmatter.summary}
                    ogImage={frontmatter.coverImage}
                    ogType="article"
                    url={`/demos/${slug}`}
                />
                <Helmet>
                    <script type="application/ld+json">
                        {JSON.stringify(jsonLd)}
                    </script>
                </Helmet>
                <Link
                    to="/demos"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Demos
                </Link>
                <h1 className="text-[clamp(1.875rem,4vw,2.625rem)] font-bold tracking-[-0.03em] leading-[1.2]">
                    {frontmatter.title}
                </h1>
                <p className="text-muted-foreground">{frontmatter.summary}</p>
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </div>

            {/* Embedded demo component — full width, owns its own layout */}
            {DemoComponent && (
                <Suspense
                    fallback={
                        <div className="flex items-center justify-center py-16">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    }
                >
                    <DemoComponent />
                </Suspense>
            )}

            {/* Prose body + related posts — readable column width */}
            <div className="max-w-[760px] mx-auto px-4 sm:px-8 pb-16">
                {html === null ? (
                    loadFailed ? (
                        <div className="py-10 text-sm text-muted-foreground">
                            Demo content failed to load.
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-16">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                        </div>
                    )
                ) : html.trim() ? (
                    <ErrorBoundary>
                        <article
                            ref={articleRef}
                            className={proseClasses}
                            dangerouslySetInnerHTML={{ __html: html }}
                        />
                    </ErrorBoundary>
                ) : null}

                <RelatedPosts slugs={frontmatter.relatedAlgorithms} type="algorithm" />
                <RelatedPosts slugs={frontmatter.relatedPosts} type="blog" />

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
        </div>
    );
}
