import type {
    AlgorithmFrontmatterSerialized,
    BlogFrontmatterSerialized,
    DemoFrontmatterSerialized,
    ModelFrontmatterSerialized,
} from "./schema.ts";

interface StructuredArticleFrontmatter {
    title: string;
    summary: string;
    author: string;
    date: string;
    updated?: string;
    coverImage?: string;
    tags: string[];
    difficulty?: "beginner" | "intermediate" | "advanced";
    readingTimeMinutes?: number;
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
        ...(frontmatter.readingTimeMinutes && { timeRequired: `PT${frontmatter.readingTimeMinutes}M` }),
        ...(frontmatter.difficulty && { educationalLevel: frontmatter.difficulty }),
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

export function buildDemoJsonLd(
    frontmatter: DemoFrontmatterSerialized,
    slug: string,
): Record<string, unknown> {
    return buildStructuredArticleJsonLd(
        "TechArticle",
        frontmatter,
        `/demos/${slug}`,
    );
}

export function buildModelJsonLd(
    frontmatter: ModelFrontmatterSerialized,
    slug: string,
): Record<string, unknown> {
    return buildStructuredArticleJsonLd(
        "TechArticle",
        frontmatter,
        `/algorithms/models/${slug}`,
    );
}

export function comparePublicationDateDesc<T extends { frontmatter: { date: string } }>(
    a: T,
    b: T,
): number {
    return b.frontmatter.date.localeCompare(a.frontmatter.date);
}

export function formatFeedTitle(kind: "blog" | "algorithm" | "demo" | "model", title: string): string {
    if (kind === "algorithm") return `[Algorithm] ${title}`;
    if (kind === "demo") return `[Demo] ${title}`;
    if (kind === "model") return `[Model] ${title}`;
    return title;
}
