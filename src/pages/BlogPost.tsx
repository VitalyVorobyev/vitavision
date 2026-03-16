import { useParams, Link } from "react-router-dom";
import { useRef } from "react";
import { Helmet } from "react-helmet-async";
import { blogPosts } from "../generated/content-manifest.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useMermaid } from "../hooks/useMermaid.ts";

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const post = blogPosts.find((p) => p.slug === slug);
    const articleRef = useRef<HTMLElement>(null);
    useMermaid(articleRef, [post?.html]);

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

    const { frontmatter, html } = post;

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
        <div className="max-w-[800px] mx-auto py-16 px-4 animate-in fade-in">
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
            <header className="space-y-4 mb-10">
                <Link
                    to="/blog"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to blog
                </Link>
                <h1 className="text-4xl font-bold tracking-tight">
                    {frontmatter.draft && (
                        <span className="text-sm font-mono uppercase tracking-wider text-amber-500 border border-amber-500/40 rounded px-2 py-1 mr-3 align-middle">
                            draft
                        </span>
                    )}
                    {frontmatter.title}
                </h1>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
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

            <article
                ref={articleRef}
                className="prose prose-neutral dark:prose-invert max-w-none
                    prose-headings:tracking-tight prose-headings:font-semibold
                    prose-h1:text-3xl prose-h1:mt-8 prose-h1:mb-4
                    prose-h2:text-2xl prose-h2:mt-8 prose-h2:mb-4
                    prose-h3:text-xl prose-h3:mt-6 prose-h3:mb-3
                    prose-p:leading-7 prose-p:text-muted-foreground
                    prose-a:text-primary prose-a:underline hover:prose-a:text-primary/80
                    prose-li:text-muted-foreground
                    prose-blockquote:border-primary prose-blockquote:text-muted-foreground
                    prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-sm prose-code:text-sm prose-code:font-mono
                    prose-pre:bg-muted prose-pre:border prose-pre:border-border prose-pre:rounded-md"
                dangerouslySetInnerHTML={{ __html: html }}
            />

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
