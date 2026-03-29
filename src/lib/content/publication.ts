import type {
    AlgorithmFrontmatterSerialized,
    BlogFrontmatterSerialized,
} from "./schema.ts";

interface StructuredArticleFrontmatter {
    title: string;
    summary: string;
    author: string;
    date: string;
    updated?: string;
    coverImage?: string;
    tags: string[];
}

function buildStructuredArticleJsonLd(
    type: "BlogPosting" | "TechArticle",
    frontmatter: StructuredArticleFrontmatter,
    path: string,
): Record<string, unknown> {
    return {
        "@context": "https://schema.org",
        "@type": type,
        headline: frontmatter.title,
        description: frontmatter.summary,
        datePublished: frontmatter.date,
        ...(frontmatter.updated && { dateModified: frontmatter.updated }),
        author: { "@type": "Person", name: frontmatter.author },
        ...(frontmatter.coverImage && { image: frontmatter.coverImage }),
        keywords: frontmatter.tags.join(", "),
        mainEntityOfPage: { "@type": "WebPage", "@id": path },
    };
}

export function buildBlogJsonLd(
    frontmatter: BlogFrontmatterSerialized,
    slug: string,
): Record<string, unknown> {
    return buildStructuredArticleJsonLd(
        "BlogPosting",
        frontmatter,
        `/blog/${slug}`,
    );
}

export function buildAlgorithmJsonLd(
    frontmatter: AlgorithmFrontmatterSerialized,
    slug: string,
): Record<string, unknown> {
    return buildStructuredArticleJsonLd(
        "TechArticle",
        frontmatter,
        `/algorithms/${slug}`,
    );
}

export function comparePublicationDateDesc<T extends { frontmatter: { date: string } }>(
    a: T,
    b: T,
): number {
    return b.frontmatter.date.localeCompare(a.frontmatter.date);
}

export function formatFeedTitle(kind: "blog" | "algorithm", title: string): string {
    return kind === "algorithm" ? `[Algorithm] ${title}` : title;
}
