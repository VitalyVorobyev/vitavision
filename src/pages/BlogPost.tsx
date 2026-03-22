import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { blogPosts } from "../generated/content-index.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";

const blogHtmlLoaders = (typeof import.meta.glob === "function"
    ? import.meta.glob("../generated/content/blog/*.ts")
    : {}) as Record<string, () => Promise<{ html: string }>>;

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const post = blogPosts.find((p) => p.slug === slug);
    const articleRef = useRef<HTMLElement>(null);
    const [html, setHtml] = useState<string | null>(null);
    useMermaid(articleRef, [html]);

    useEffect(() => {
        if (!slug) return;
        const key = `../generated/content/blog/${slug}.ts`;
        const loader = blogHtmlLoaders[key];
        if (!loader) return;
        let cancelled = false;
        loader().then((mod) => {
            if (!cancelled) setHtml(mod.html);
        });
        return () => { cancelled = true; };
    }, [slug]);

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

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: frontmatter.title,
        description: frontmatter.summary,
        datePublished: frontmatter.date,
        ...(frontmatter.updated && { dateModified: frontmatter.updated }),
        author: { "@type": "Person", name: frontmatter.author },
        ...(frontmatter.coverImage && { image: frontmatter.coverImage }),
        keywords: frontmatter.tags.join(", "),
    };

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
                </div>
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </header>

            <div className="border-t border-border mb-10" />

            {html === null ? (
                <div className="flex items-center justify-center py-16">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
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
