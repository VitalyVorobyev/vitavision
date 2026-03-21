import { useParams, Link } from "react-router-dom";
import { useRef } from "react";
import { algorithmPages } from "../generated/content-manifest.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";
import RelatedPosts from "../components/blog/RelatedPosts.tsx";
import ErrorBoundary from "../components/ui/ErrorBoundary";
import { proseClasses } from "../lib/prose-classes";

export default function AlgorithmPost() {
    const { slug } = useParams<{ slug: string }>();
    const page = algorithmPages.find((p) => p.slug === slug);
    const articleRef = useRef<HTMLElement>(null);
    useMermaid(articleRef, [page?.html]);

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

    const { frontmatter, html } = page;

    return (
        <div className="max-w-[800px] mx-auto py-16 px-4 animate-in fade-in">
            <SeoHead
                title={frontmatter.title}
                description={frontmatter.summary}
                ogType="article"
                url={`/algorithms/${slug}`}
            />
            <header className="space-y-4 mb-10">
                <Link
                    to="/algorithms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to algorithms
                </Link>
                <h1 className="text-4xl font-bold tracking-tight">
                    {frontmatter.title}
                </h1>
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </header>

            <ErrorBoundary>
                <article
                    ref={articleRef}
                    className={proseClasses}
                    dangerouslySetInnerHTML={{ __html: html }}
                />
            </ErrorBoundary>

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
