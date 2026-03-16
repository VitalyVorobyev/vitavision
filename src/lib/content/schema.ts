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

/** Manifest entry for a blog post (dates serialized as ISO strings). */
export interface BlogEntry {
    slug: string;
    frontmatter: Omit<BlogFrontmatter, "date" | "updated"> & {
        date: string;
        updated?: string;
    };
    html: string;
}

/** Manifest entry for an algorithm page. */
export interface AlgorithmEntry {
    slug: string;
    frontmatter: AlgorithmFrontmatter;
    html: string;
}
