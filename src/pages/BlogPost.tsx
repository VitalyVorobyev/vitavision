import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { useAuth, SignInButton } from "@clerk/clerk-react";
import { Lock } from "lucide-react";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";
import { blogPosts } from "../generated/content-index.ts";
import { blogHtmlLoaders } from "../generated/blog-loaders.ts";
import NotFound from "./NotFound.tsx";
import TagBadge from "../components/blog/TagBadge.tsx";
import DifficultyBadge from "../components/blog/DifficultyBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";
import { useStaticContent } from "../lib/content/ssr-content.tsx";
import { buildBlogJsonLd } from "../lib/content/publication.ts";
import { useArticleIllustrations } from "../lib/content/useArticleIllustrations.tsx";
import { useArticleImageZoom } from "../lib/content/useArticleImageZoom.tsx";

function MembersGate() {
    return (
        <div className="border border-border rounded-xl p-8 text-center space-y-4 my-10">
            <Lock className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="text-xl font-semibold">This post is for members</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
                Sign in to read the full article. Membership is by invitation.
            </p>
            <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                    Sign in to continue
                </button>
            </SignInButton>
        </div>
    );
}

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const post = blogPosts.find((p) => p.slug === slug);
    const staticContent = useStaticContent();
    const articleRef = useRef<HTMLElement>(null);
    const { isLoaded, isSignedIn } = useAuth();
    const isAdmin = useIsAdmin();

    // Resolve content synchronously from SSR context (postbuild prerender).
    // On the client useStaticContent() returns null, so the async loader runs instead.
    const syncHtml = slug
        ? staticContent?.blogHtmlBySlug?.[slug] ?? null
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
    const loadFailed = html === null && (!slug || !(slug in blogHtmlLoaders) || asyncFailed);

    useMermaid(articleRef, [html]);
    useArticleIllustrations(articleRef, [html]);
    useArticleImageZoom(articleRef, [html]);

    // Load content asynchronously when not available from SSR or hydration.
    useEffect(() => {
        if (syncHtml !== null || !slug) return;
        const loader = blogHtmlLoaders[slug];
        if (!loader) return;

        let cancelled = false;
        loader()
            .then((mod) => { if (!cancelled) setAsyncHtml(mod.html); })
            .catch(() => { if (!cancelled) setAsyncFailed(true); });
        return () => { cancelled = true; };
    }, [slug, syncHtml]);

    if (!post) {
        return (
            <div className="max-w-[800px] mx-auto py-16 px-4 text-center space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">
                    Post not found
                </h1>
                <p className="text-muted-foreground">
                    The post you're looking for doesn't exist.
                </p>
                <Link
                    to="/blog"
                    className="inline-block text-primary underline hover:text-primary/80"
                >
                    Back to blog
                </Link>
            </div>
        );
    }

    const { frontmatter } = post;

    // Draft posts are invisible to non-admin users — treat as 404.
    if (frontmatter.draft && !isAdmin) {
        return <NotFound />;
    }

    const jsonLd = buildBlogJsonLd(frontmatter, slug ?? post.slug);

    return (
        <div className="max-w-[760px] mx-auto py-16 px-4 sm:px-8 animate-in fade-in">
            <SeoHead
                title={frontmatter.title}
                description={frontmatter.summary}
                ogImage={frontmatter.coverImage}
                ogType="article"
                url={`/blog/${slug}`}
            />
            <Helmet>
                <script type="application/ld+json">
                    {JSON.stringify(jsonLd)}
                </script>
            </Helmet>
            <header className="space-y-4 mb-8">
                <Link
                    to="/blog"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to blog
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
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </header>

            <div className="border-t border-border mb-10" />

            {frontmatter.access === "members" && !isLoaded ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
            ) : frontmatter.access === "members" && !isSignedIn ? (
                <MembersGate />
            ) : html === null ? (
                loadFailed ? (
                    <div className="py-10 text-sm text-muted-foreground">
                        Post content failed to load.
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

            <RelatedPosts slugs={frontmatter.relatedAlgorithms} type="algorithm" />

            {(frontmatter.repoLinks?.length || frontmatter.demoLinks?.length) && (
                <footer className="mt-12 pt-6 border-t border-border space-y-3">
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
                </footer>
            )}
        </div>
    );
}
