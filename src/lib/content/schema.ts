import { z } from "zod";

/** Zod schema for blog post frontmatter. */
export const blogFrontmatterSchema = z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    author: z.string().min(1),
    draft: z.boolean().optional(),
    updated: z.coerce.date().optional(),
    coverImage: z.string().optional(),
    repoLinks: z.array(z.string().url()).optional(),
    demoLinks: z.array(z.string().url()).optional(),
    relatedAlgorithms: z.array(z.string().min(1)).optional(),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

/** Zod schema for algorithm page frontmatter. */
export const algorithmFrontmatterSchema = z.object({
    title: z.string().min(1),
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    demoLink: z.string().url().optional(),
    repoLinks: z.array(z.string().url()).optional(),
    relatedPosts: z.array(z.string().min(1)).optional(),
});

export type AlgorithmFrontmatter = z.infer<typeof algorithmFrontmatterSchema>;

/** Serialized blog frontmatter (dates as ISO strings). */
export type BlogFrontmatterSerialized = Omit<BlogFrontmatter, "date" | "updated"> & {
    date: string;
    updated?: string;
};

/** Index entry for a blog post (no html). Used by listing pages. */
export interface BlogIndexEntry {
    slug: string;
    frontmatter: BlogFrontmatterSerialized;
}

/** Full blog entry including rendered html. */
export interface BlogEntry extends BlogIndexEntry {
    html: string;
}

/** Index entry for an algorithm page (no html). Used by listing pages. */
export interface AlgorithmIndexEntry {
    slug: string;
    frontmatter: AlgorithmFrontmatter;
}

/** Full algorithm entry including rendered html. */
export interface AlgorithmEntry extends AlgorithmIndexEntry {
    html: string;
}
