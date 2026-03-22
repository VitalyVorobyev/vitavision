import { useParams, Link } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import { algorithmPages } from "../generated/content-index.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";

const algoHtmlLoaders = (typeof import.meta.glob === "function"
    ? import.meta.glob("../generated/content/algorithms/*.ts")
    : {}) as Record<string, () => Promise<{ html: string }>>;

export default function AlgorithmPost() {
    const { slug } = useParams<{ slug: string }>();
    const page = algorithmPages.find((p) => p.slug === slug);
    const articleRef = useRef<HTMLElement>(null);
    const [html, setHtml] = useState<string | null>(null);
    useMermaid(articleRef, [html]);

    useEffect(() => {
        if (!slug) return;
        const key = `../generated/content/algorithms/${slug}.ts`;
        const loader = algoHtmlLoaders[key];
        if (!loader) return;
        let cancelled = false;
        loader().then((mod) => {
            if (!cancelled) setHtml(mod.html);
        });
        return () => { cancelled = true; };
    }, [slug]);

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
                    to="/algorithms"
                    className="inline-block text-primary underline hover:text-primary/80"
                >
                    Back to algorithms
                </Link>
            </div>
        );
    }

    const { frontmatter } = page;

    return (
        <div className="max-w-[760px] mx-auto py-16 px-4 sm:px-8 animate-in fade-in">
            <SeoHead
                title={frontmatter.title}
                description={frontmatter.summary}
                ogType="article"
                url={`/algorithms/${slug}`}
            />
            <header className="space-y-4 mb-8">
                <Link
                    to="/algorithms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to algorithms
                </Link>
                <h1 className="text-[clamp(1.875rem,4vw,2.625rem)] font-bold tracking-[-0.03em] leading-[1.2]">
                    {frontmatter.title}
                </h1>
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

            <RelatedPosts slugs={frontmatter.relatedPosts} type="blog" />

            {(frontmatter.repoLinks?.length || frontmatter.demoLink) && (
                <footer className="mt-12 pt-6 border-t border-border space-y-3">
                    {frontmatter.demoLink && (
                        <a
                            href={frontmatter.demoLink}
                            className="block text-primary underline hover:text-primary/80 text-sm"
                        >
                            Try it in the editor
                        </a>
                    )}
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
