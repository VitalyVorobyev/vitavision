import { z } from "zod";

const publicationFrontmatterBaseObjectSchema = z.object({
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
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    readingTimeMinutes: z.number().int().positive().optional(),
    access: z.enum(["public", "members"]).default("public"),
});

/** Zod schema for blog post frontmatter. */
export const blogFrontmatterSchema = publicationFrontmatterBaseObjectSchema.extend({
    relatedAlgorithms: z.array(z.string().min(1)).optional(),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

/** Algorithm category — used to group cards on the /algorithms index. */
export const algorithmCategoryValues = [
    "corner-detection",
    "calibration-targets",
    "subpixel-refinement",
    "explainers",
] as const;
export type AlgorithmCategory = (typeof algorithmCategoryValues)[number];

/** Zod schema for algorithm page frontmatter. */
export const algorithmFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .extend({
        category: z.enum(algorithmCategoryValues),
        relatedPosts: z.array(z.string().min(1)).optional(),
        relatedAlgorithms: z.array(z.string().min(1)).optional(),
        // Transitional compatibility for older algorithm pages.
        demoLink: z.string().url().optional(),
    })
    .transform(({ demoLink, demoLinks, ...rest }) => ({
        ...rest,
        ...(demoLinks
            ? { demoLinks }
            : demoLink
                ? { demoLinks: [demoLink] }
                : {}),
    }));

export type AlgorithmFrontmatter = z.infer<typeof algorithmFrontmatterSchema>;

type SerializedFrontmatter<T extends { date: Date; updated?: Date }> =
    Omit<T, "date" | "updated"> & {
    date: string;
    updated?: string;
};

/** Serialized blog frontmatter (dates as ISO strings). */
export type BlogFrontmatterSerialized = SerializedFrontmatter<BlogFrontmatter>;
export type AlgorithmFrontmatterSerialized = SerializedFrontmatter<AlgorithmFrontmatter>;

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
    frontmatter: AlgorithmFrontmatterSerialized;
}

/** Full algorithm entry including rendered html. */
export interface AlgorithmEntry extends AlgorithmIndexEntry {
    html: string;
}

/** Zod schema for demo page frontmatter. */
export const demoFrontmatterSchema = publicationFrontmatterBaseObjectSchema.extend({
    componentId: z.string().min(1).optional(),
    category: z.enum(["interactive-figure", "tool", "playground"]).default("interactive-figure"),
    relatedAlgorithms: z.array(z.string().min(1)).optional(),
    relatedPosts: z.array(z.string().min(1)).optional(),
    initialProps: z.record(z.string(), z.unknown()).optional(),
});

export type DemoFrontmatter = z.infer<typeof demoFrontmatterSchema>;
export type DemoFrontmatterSerialized = SerializedFrontmatter<DemoFrontmatter>;

/** Index entry for a demo page (no html). Used by listing pages. */
export interface DemoIndexEntry {
    slug: string;
    frontmatter: DemoFrontmatterSerialized;
}

/** Full demo entry including rendered html. */
export interface DemoEntry extends DemoIndexEntry {
    html: string;
}
