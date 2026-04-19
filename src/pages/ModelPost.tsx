import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { modelPages } from "../generated/content-index.ts";
import { modelHtmlLoaders } from "../generated/model-loaders.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import DifficultyBadge from "../components/blog/DifficultyBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";
import { useStaticContent } from "../lib/content/ssr-content.tsx";
import { buildModelJsonLd } from "../lib/content/publication.ts";
import { useArticleIllustrations } from "../lib/content/useArticleIllustrations.tsx";
import { useArticleImageZoom } from "../lib/content/useArticleImageZoom.tsx";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import NotFound from "./NotFound.tsx";
import type { ModelFrontmatterSerialized } from "../lib/content/schema.ts";

/** Parse "owner/repo" from a full GitHub URL. Falls back to the raw URL on failure. */
function parseRepoLabel(repoUrl: string): string {
    try {
        const parts = new URL(repoUrl).pathname.split("/").filter(Boolean);
        if (parts.length >= 2) return `${parts[parts.length - 2]}/${parts[parts.length - 1]}`;
    } catch {
        // fall through
    }
    return repoUrl;
}

interface ImplementationsTableProps {
    implementations: NonNullable<ModelFrontmatterSerialized["implementations"]>;
}

function ImplementationsTable({ implementations }: ImplementationsTableProps) {
    return (
        <section aria-label="Implementations" className="mb-10">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Implementations
            </h2>

            {/* Desktop table */}
            <table className="hidden sm:table w-full text-sm border border-border rounded-lg overflow-hidden">
                <thead>
                    <tr className="bg-muted/50">
                        <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">Repo</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">Role</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">Framework</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">License</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">Weights</th>
                        <th className="text-left px-3 py-2 font-semibold text-xs uppercase tracking-wider text-muted-foreground border-b border-border">Commit</th>
                    </tr>
                </thead>
                <tbody>
                    {implementations.map((impl, i) => (
                        <tr key={i} className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors">
                            <td className="px-3 py-2">
                                <a
                                    href={impl.repo}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline hover:text-primary/80 font-mono text-xs"
                                >
                                    {parseRepoLabel(impl.repo)}
                                </a>
                            </td>
                            <td className="px-3 py-2">
                                <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                                    {impl.role}
                                </span>
                            </td>
                            <td className="px-3 py-2 text-muted-foreground">{impl.framework}</td>
                            <td className="px-3 py-2 text-muted-foreground">{impl.license}</td>
                            <td className="px-3 py-2">
                                {impl.weights_url ? (
                                    <a
                                        href={impl.weights_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline hover:text-primary/80 text-xs"
                                    >
                                        {impl.weights_license ?? "link"}
                                    </a>
                                ) : (
                                    <span className="text-muted-foreground">&mdash;</span>
                                )}
                            </td>
                            <td className="px-3 py-2">
                                <a
                                    href={`${impl.repo}/commit/${impl.commit}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-xs text-primary underline hover:text-primary/80"
                                >
                                    {impl.commit.slice(0, 7)}
                                </a>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/* Mobile stacked list */}
            <ul className="sm:hidden space-y-3">
                {implementations.map((impl, i) => (
                    <li key={i} className="rounded-lg border border-border p-3 space-y-1.5 text-sm">
                        <div>
                            <a
                                href={impl.repo}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary underline hover:text-primary/80 font-mono text-xs font-semibold"
                            >
                                {parseRepoLabel(impl.repo)}
                            </a>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            <span><span className="font-semibold text-foreground">Role:</span>{" "}
                                <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider">
                                    {impl.role}
                                </span>
                            </span>
                            <span><span className="font-semibold text-foreground">Framework:</span> {impl.framework}</span>
                            <span><span className="font-semibold text-foreground">License:</span> {impl.license}</span>
                            <span>
                                <span className="font-semibold text-foreground">Weights:</span>{" "}
                                {impl.weights_url ? (
                                    <a
                                        href={impl.weights_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary underline hover:text-primary/80"
                                    >
                                        {impl.weights_license ?? "link"}
                                    </a>
                                ) : (
                                    <span>&mdash;</span>
                                )}
                            </span>
                            <span>
                                <span className="font-semibold text-foreground">Commit:</span>{" "}
                                <a
                                    href={`${impl.repo}/commit/${impl.commit}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="font-mono text-primary underline hover:text-primary/80"
                                >
                                    {impl.commit.slice(0, 7)}
                                </a>
                            </span>
                        </div>
                    </li>
                ))}
            </ul>
        </section>
    );
}

export default function ModelPost() {
    const { slug } = useParams<{ slug: string }>();
    const page = modelPages.find((p) => p.slug === slug);
    const isAdmin = useIsAdmin();
    const staticContent = useStaticContent();
    const articleRef = useRef<HTMLElement>(null);

    // Resolve content synchronously from SSR context (postbuild prerender).
    // On the client useStaticContent() returns null, so the async loader runs instead.
    const syncHtml = slug
        ? staticContent?.modelHtmlBySlug?.[slug] ?? null
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
    const loadFailed = !isDraftBlocked && html === null && (!slug || !(slug in modelHtmlLoaders) || asyncFailed);

    useMermaid(articleRef, [html]);
    useArticleIllustrations(articleRef, [html]);
    useArticleImageZoom(articleRef, [html]);

    // Load content asynchronously when not available from SSR or hydration.
    useEffect(() => {
        if (isDraftBlocked) return;
        if (syncHtml !== null || !slug) return;
        const loader = modelHtmlLoaders[slug];
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
                    Model not found
                </h1>
                <p className="text-muted-foreground">
                    The model page you're looking for doesn't exist.
                </p>
                <Link
                    to="/algorithms/models"
                    className="inline-block text-primary underline hover:text-primary/80"
                >
                    Back to models
                </Link>
            </div>
        );
    }

    if (isDraftBlocked) {
        return <NotFound />;
    }

    const { frontmatter } = page;
    const jsonLd = buildModelJsonLd(frontmatter, slug ?? page.slug);

    const hasModelBadges = frontmatter.arch_family || frontmatter.params || frontmatter.flops;

    return (
        <div className="max-w-[760px] mx-auto py-16 px-4 sm:px-8 animate-in fade-in">
            <SeoHead
                title={frontmatter.title}
                description={frontmatter.summary}
                ogImage={frontmatter.coverImage}
                ogType="article"
                url={`/algorithms/models/${slug}`}
            />
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>
            <header className="space-y-4 mb-8">
                <Link
                    to="/algorithms/models"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to models
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
                {frontmatter.difficulty && (
                    <div><DifficultyBadge level={frontmatter.difficulty} /></div>
                )}
                {hasModelBadges && (
                    <div className="flex flex-wrap gap-2">
                        {frontmatter.arch_family && (
                            <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                                {frontmatter.arch_family}
                            </span>
                        )}
                        {frontmatter.params && (
                            <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                                {frontmatter.params}
                            </span>
                        )}
                        {frontmatter.flops && (
                            <span className="inline-flex items-center rounded border border-border px-2 py-0.5 text-xs font-mono text-muted-foreground">
                                {frontmatter.flops}
                            </span>
                        )}
                    </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </header>

            <div className="border-t border-border mb-10" />

            {frontmatter.implementations && frontmatter.implementations.length >= 1 && (
                <ImplementationsTable implementations={frontmatter.implementations} />
            )}

            {html === null ? (
                loadFailed ? (
                    <div className="py-10 text-sm text-muted-foreground">
                        Model content failed to load.
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

            <RelatedPosts slugs={frontmatter.relatedPosts} type="blog" />
            <RelatedPosts slugs={frontmatter.relatedDemos} type="demo" />
            <RelatedPosts slugs={frontmatter.relatedAlgorithms} type="algorithm" />

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
