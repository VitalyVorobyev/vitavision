import { z } from "zod";

const publicationFrontmatterBaseObjectSchema = z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
    tags: z.array(z.string().min(1)).min(1),
    author: z.string().min(1).optional(),
    draft: z.boolean().optional(),
    updated: z.coerce.date().optional(),
    coverImage: z.string().optional(),
    repoLinks: z.array(z.string().url()).optional(),
    demoLinks: z.array(z.string().url()).optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    readingTimeMinutes: z.number().int().positive().optional(),
    access: z.enum(["public", "members"]).default("public"),
});

/** Relationship fields mixin — applied to algorithm, model, and concept schemas. */
const relationshipFieldsSchema = z.object({
    prerequisites: z.array(z.string().min(1)).optional(),
    related: z.array(z.string().min(1)).optional(),
    comparedWith: z.array(z.string().min(1)).optional(),
    failureModes: z.array(z.string().min(1)).optional(),
    quality: z.enum(["stub", "canonical"]).optional(),
});

/** Zod schema for blog post frontmatter. */
export const blogFrontmatterSchema = publicationFrontmatterBaseObjectSchema.extend({
    relatedAlgorithms: z.array(z.string().min(1)).optional(),
    relatedDemos: z.array(z.string().min(1)).optional(),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

/** Unified domain taxonomy — orthogonal to kind. */
export const domainValues = [
    "image-formation",
    "features",
    "geometry",
    "targets",
    "calibration",
    "stitching",
    "depth",
    "detection",
] as const;
export type Domain = (typeof domainValues)[number];

/** Zod schema for algorithm page frontmatter. */
export const algorithmFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .merge(relationshipFieldsSchema)
    .extend({
        dev: z.boolean().optional(),
        domain: z.enum(domainValues).optional(),
        relatedPosts: z.array(z.string().min(1)).optional(),
        relatedAlgorithms: z.array(z.string().min(1)).optional(),
        relatedDemos: z.array(z.string().min(1)).optional(),
        editorAlgorithmId: z.string().min(1).optional(),
        sources: z.object({
            primary: z.string().min(1),
            references: z.array(z.string().min(1)).optional(),
            impl: z.object({
                repo: z.string().url(),
                commit: z.string().regex(/^[0-9a-f]{7,40}$/),
                files: z.array(z.string().min(1)).min(1),
            }).optional(),
            notes: z.string().optional(),
        }).optional(),
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

/** Zod schema for model page frontmatter. */
export const modelFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .merge(relationshipFieldsSchema)
    .extend({
        dev: z.boolean().optional(),
        domain: z.enum(domainValues).optional(),
        noPublicImpl: z.boolean().optional(),
        arch_family: z.enum(["cnn", "vit", "encoder-decoder", "diffusion", "gan", "hybrid"]).optional(),
        params: z.string().optional(),
        flops: z.string().optional(),
        sources: z.object({
            primary: z.string().min(1),
            references: z.array(z.string().min(1)).optional(),
            notes: z.string().optional(),
        }).optional(),
        implementations: z.array(z.object({
            role: z.enum(["official", "community", "port"]),
            repo: z.string().url(),
            commit: z.string().regex(/^[0-9a-f]{7,40}$/),
            framework: z.enum(["pytorch", "tensorflow", "jax", "caffe", "other"]),
            license: z.string().min(1),
            weights_url: z.string().url().optional(),
            weights_license: z.string().min(1).optional(),
        })).min(1).optional(), // required on non-drafts unless noPublicImpl: true; enforced in content-build
        relatedPosts: z.array(z.string().min(1)).optional(),
        relatedAlgorithms: z.array(z.string().min(1)).optional(),
        relatedDemos: z.array(z.string().min(1)).optional(),
    });

export type ModelFrontmatter = z.infer<typeof modelFrontmatterSchema>;
export type ModelFrontmatterSerialized = SerializedFrontmatter<ModelFrontmatter>;

/** Index entry for a model page (no html). Used by listing pages. */
export interface ModelIndexEntry {
    slug: string;
    frontmatter: ModelFrontmatterSerialized;
}

/** Full model entry including rendered html. */
export interface ModelEntry extends ModelIndexEntry {
    html: string;
}

/** Zod schema for concept page frontmatter. */
export const conceptFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .merge(relationshipFieldsSchema)
    .extend({
        dev: z.boolean().optional(),
        domain: z.enum(domainValues).optional(),
        sources: z.object({
            primary: z.string().min(1).optional(),
            references: z.array(z.string().min(1)).optional(),
            notes: z.string().optional(),
        }).optional(),
    });

export type ConceptFrontmatter = z.infer<typeof conceptFrontmatterSchema>;
export type ConceptFrontmatterSerialized = SerializedFrontmatter<ConceptFrontmatter>;

/** Index entry for a concept page (no html). Used by listing pages. */
export interface ConceptIndexEntry {
    slug: string;
    frontmatter: ConceptFrontmatterSerialized;
}

/** Full concept entry including rendered html. */
export interface ConceptEntry extends ConceptIndexEntry {
    html: string;
}
