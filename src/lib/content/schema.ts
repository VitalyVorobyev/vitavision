import { z } from "zod";

const publicationFrontmatterBaseObjectSchema = z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    summary: z.string().min(1),
    author: z.string().min(1).optional(),
    draft: z.boolean().optional(),
    updated: z.coerce.date().optional(),
    coverImage: z.string().optional(),
    tagline: z.string().max(120).optional(),
    repoLinks: z.array(z.string().url()).optional(),
    demoLinks: z.array(z.string().url()).optional(),
    difficulty: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    readingTimeMinutes: z.number().int().positive().optional(),
    access: z.enum(["public", "members"]).default("public"),
});

/**
 * Typed relation between two atlas pages (algorithm, model, or concept).
 * The vocabulary is deliberately small and fixed (no free-form types) so
 * authors don't proliferate one-off subtypes. Three semantic categories:
 *
 * Lineage (theoretical evolution):
 * - `generalized_by`             — same problem, target strictly more general.
 *                                  Asymmetric. Confidence=high + quality:"historical"
 *                                  drives the "Superseded by" badge.
 * - `alternative_formulation_of` — same problem, different mathematical formulation;
 *                                  both methods coexist. Symmetric.
 * - `parallel_foundation_with`   — concurrent peers that founded the field together;
 *                                  neither supersedes the other. Symmetric.
 * - `extended_by`                — target builds on this without replacing
 *                                  (e.g. FRST → RSD fused-radii). Asymmetric.
 *
 * Practice (practitioner choice / pipeline):
 * - `compared_with`              — peer practitioner choice; reader picks between
 *                                  A and B (e.g. Harris vs Shi-Tomasi). Symmetric.
 * - `feeds_into`                 — A's output is consumed by B in a typical
 *                                  pipeline (e.g. Harris → ChESS). Asymmetric.
 *
 * Cross-paradigm:
 * - `learned_alternative_of`     — model A is a deep-learning replacement for
 *                                  classical algorithm B (e.g. MATE → chess-corners).
 *                                  Asymmetric, model→algorithm only.
 */
export const relationTypeValues = [
    "generalized_by",
    "alternative_formulation_of",
    "parallel_foundation_with",
    "extended_by",
    "compared_with",
    "feeds_into",
    "learned_alternative_of",
] as const;
export type RelationType = (typeof relationTypeValues)[number];

/** Relation types whose semantic is direction-independent (build mirrors them). */
export const symmetricRelationTypes: ReadonlySet<RelationType> = new Set([
    "alternative_formulation_of",
    "parallel_foundation_with",
    "compared_with",
]);

const typedRelationSchema = z.object({
    type: z.enum(relationTypeValues),
    target: z.string().min(1),
    confidence: z.enum(["high", "medium", "low"]),
    caution: z.string().min(1).optional(),
});
export type TypedRelation = z.infer<typeof typedRelationSchema>;

/** Relationship fields mixin — applied to algorithm, model, and concept schemas. */
const relationshipFieldsSchema = z.object({
    prerequisites: z.array(z.string().min(1)).optional(),
    failureModes: z.array(z.string().min(1)).optional(),
    quality: z.enum(["stub", "canonical", "historical"]).optional(),
    relations: z.array(typedRelationSchema).optional(),
});

/** Zod schema for blog post frontmatter. */
export const blogFrontmatterSchema = publicationFrontmatterBaseObjectSchema.extend({
    tags: z.array(z.string().min(1)).min(1),
    /** Atlas slugs (algorithm/model/concept) referenced by this post. Untyped — blog posts mention atlas pages, they don't author atlas relations. */
    relatedAlgorithms: z.array(z.string().min(1)).optional(),
    relatedDemos: z.array(z.string().min(1)).optional(),
});

export type BlogFrontmatter = z.infer<typeof blogFrontmatterSchema>;

/** Unified domain taxonomy — orthogonal to kind. */
export const domainValues = [
    "image-formation",
    "features",
    "representation-learning",
    "geometry",
    "targets",
    "calibration",
    "stitching",
    "depth",
    "detection",
    "segmentation",
    "anomaly-detection",
] as const;
export type Domain = (typeof domainValues)[number];

/**
 * Closed vocabulary of computer-vision tasks for atlas page tagging.
 * Algorithms and models that solve a user-facing problem self-tag with one
 * or more tasks via the optional `tasks:` frontmatter field. Computational
 * primitives and tools (RANSAC, DLT, normalisation, NMS, gradient operators)
 * carry no `tasks:` value.
 *
 * Source of truth: `content/tasks.yaml` (documentation + descriptions).
 * The list below is the validation enforcer; keep the two in sync.
 */
export const taskValues = [
    "anomaly-detection",
    "anomaly-segmentation",
    "camera-calibration",
    "chessboard-detection",
    "corner-detection",
    "feature-detection",
    "fundamental-matrix-estimation",
    "hand-eye-calibration",
    "image-classification",
    "image-segmentation",
    "image-stitching",
    "local-feature-matching",
    "stereo-rectification",
] as const;
export type Task = (typeof taskValues)[number];

/**
 * Closed vocabulary of cross-cutting facet tags for atlas page tagging.
 * Every algorithm, model, and concept page carries at least one tag.
 * Blog and demo pages keep free-form tags; only atlas pages validate here.
 *
 * Source of truth: `content/tags.yaml` (documentation + descriptions).
 * The list below is the validation enforcer; keep the two in sync.
 */
export const tagValues = [
    "classical",
    "deep-learning",
    "robust-estimation",
    "optimization",
    "linear-algebra",
    "probabilistic",
    "graph-based",
    "variational",
    "multi-scale",
    "voting",
    "boosting",
    "local-descriptors",
    "binary-descriptor",
    "keypoint-detection",
    "blob-detection",
    "dense-prediction",
    "region-based",
    "two-view-geometry",
    "camera-model",
    "pose-estimation",
    "chessboard",
    "fiducial-markers",
    "radial-pattern",
    "optical-flow",
    "stereo",
    "real-time",
    "subpixel",
    "survey",
] as const;
export type Tag = (typeof tagValues)[number];

/** Zod schema for algorithm page frontmatter. */
export const algorithmFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .merge(relationshipFieldsSchema)
    .extend({
        tags: z.array(z.enum(tagValues)).min(1),
        dev: z.boolean().optional(),
        domain: z.enum(domainValues).optional(),
        tasks: z.array(z.enum(taskValues)).optional(),
        relatedPosts: z.array(z.string().min(1)).optional(),
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
export type AlgorithmFrontmatterSerialized = SerializedFrontmatter<AlgorithmFrontmatter> & { year?: number };

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
    tags: z.array(z.string().min(1)).min(1),
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
        tags: z.array(z.enum(tagValues)).min(1),
        dev: z.boolean().optional(),
        domain: z.enum(domainValues).optional(),
        tasks: z.array(z.enum(taskValues)).optional(),
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
        relatedDemos: z.array(z.string().min(1)).optional(),
    });

export type ModelFrontmatter = z.infer<typeof modelFrontmatterSchema>;
export type ModelFrontmatterSerialized = SerializedFrontmatter<ModelFrontmatter> & { year?: number };

/** Index entry for a model page (no html). Used by listing pages. */
export interface ModelIndexEntry {
    slug: string;
    frontmatter: ModelFrontmatterSerialized;
}

/** Full model entry including rendered html. */
export interface ModelEntry extends ModelIndexEntry {
    html: string;
}

// ── Narratives ───────────────────────────────────────────────────────────────
// A narrative is a long-form essay (content/narratives/<slug>.md) whose
// frontmatter carries a small graph of nodes (atlas pages or bare papers)
// connected by typed edges, plus hand-authored "lenses" (alternate 2D
// layouts) and "steps" (a guided walkthrough anchored to body headings).
// Narratives are deliberately NOT content-graph nodes (see content-graph.ts)
// and do not carry prerequisites/failureModes/relations.

const narrativeAreaSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
});

const narrativeNodeSchema = z
    .object({
        id: z.string().min(1),
        /** An atlas slug (algorithm/model/concept). Exactly one of page/paper. */
        page: z.string().min(1).optional(),
        /** A registered paper id (docs/papers/index.yaml). Exactly one of page/paper. */
        paper: z.string().min(1).optional(),
        area: z.string().min(1),
        role: z.string().min(1).optional(),
        takeaway: z.string().max(280).optional(),
        remark: z.string().max(400).optional(),
        /** Display label. Required for paper nodes — enforced in validate-content.ts. */
        label: z.string().max(80).optional(),
    })
    .refine(
        (n) => (n.page !== undefined ? 1 : 0) + (n.paper !== undefined ? 1 : 0) === 1,
        { message: "narrative node must have exactly one of `page` or `paper`" },
    );

export const narrativeEdgeTypeValues = ["prerequisite", "evolution", "bridge", "contrast"] as const;
export type NarrativeEdgeType = (typeof narrativeEdgeTypeValues)[number];

const narrativeEdgeSchema = z.object({
    from: z.string().min(1),
    to: z.string().min(1),
    type: z.enum(narrativeEdgeTypeValues),
    label: z.string().max(24).optional(),
});

const narrativeLensSchema = z
    .object({
        id: z.string().min(1),
        title: z.string().min(1),
        coords: z.record(z.string(), z.tuple([z.number(), z.number()])),
    })
    .refine((l) => l.id !== "timeline", {
        message: 'lens id "timeline" is reserved for the build-generated timeline lens',
    });

const narrativeStepSchema = z.object({
    focus: z.array(z.string().min(1)).min(1),
    title: z.string().min(1),
    /** Must resolve to a `##` heading id (rehype-slug) in the narrative body. */
    anchor: z.string().min(1),
});

/** Zod schema for narrative page frontmatter. */
export const narrativeFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .extend({
        tags: z.array(z.string().min(1)).min(1),
        areas: z.array(narrativeAreaSchema).min(1),
        nodes: z.array(narrativeNodeSchema).min(1),
        edges: z.array(narrativeEdgeSchema).optional(),
        lenses: z.array(narrativeLensSchema).optional(),
        steps: z.array(narrativeStepSchema).min(2),
    })
    .refine(
        (fm) => new Set(fm.areas.map((a) => a.id)).size === fm.areas.length,
        { message: "areas[].id must be unique", path: ["areas"] },
    );

export type NarrativeFrontmatter = z.infer<typeof narrativeFrontmatterSchema>;
export type NarrativeFrontmatterSerialized = SerializedFrontmatter<NarrativeFrontmatter>;

/** Build-resolved narrative node referencing an atlas page. */
export interface NarrativePageNode {
    id: string;
    kind: "page";
    slug: string;
    title: string;
    pageKind: "algorithm" | "model" | "concept";
    year?: number;
    path: string;
    quality?: string;
    area: string;
    role?: string;
    takeaway?: string;
    remark?: string;
}

/** Build-resolved narrative node referencing a registered paper with no atlas page yet ("page debt"). */
export interface NarrativePaperNode {
    id: string;
    kind: "paper";
    paperId: string;
    title: string;
    authorsShort: string;
    year: number;
    url: string;
    debt: true;
    area: string;
    role?: string;
    takeaway?: string;
    remark?: string;
}

export type NarrativeNode = NarrativePageNode | NarrativePaperNode;

export interface NarrativeGraphEdge {
    from: string;
    to: string;
    type: NarrativeEdgeType;
    label?: string;
}

export interface NarrativeLens {
    id: string;
    title: string;
    coords: Record<string, [number, number]>;
}

/** Build-resolved narrative graph — the shape consumed by the reader UI. */
export interface ResolvedNarrative {
    areas: { id: string; label: string }[];
    nodes: NarrativeNode[];
    edges: NarrativeGraphEdge[];
    /** Authored lenses plus the build-generated `timeline` lens. */
    lenses: NarrativeLens[];
}

/** Full narrative entry including rendered html, per-chapter slices, and the resolved graph. */
export interface NarrativeEntry {
    slug: string;
    frontmatter: NarrativeFrontmatterSerialized;
    html: string;
    /** Per-`##`-chapter HTML slices, keyed by the rehype-slug heading id (== step anchor). */
    chapters: Record<string, string>;
    narrative: ResolvedNarrative;
}

/** Slim listing entry for narrative index/cards — no html, no full graph. */
export interface NarrativeIndexEntry {
    slug: string;
    title: string;
    summary: string;
    tagline?: string;
    date: string;
    /** Present (true) for drafts — emitted under INCLUDE_DRAFTS=true; UI consumers must filter. */
    draft?: boolean;
    stats: { nodes: number; steps: number; debt: number };
    areas: { id: string; label: string }[];
    /** `overview` lens coords normalized to [0,1] — for card thumbnails. */
    preview: Record<string, [number, number]>;
}

/** Zod schema for concept page frontmatter. */
export const conceptFrontmatterSchema = publicationFrontmatterBaseObjectSchema
    .merge(relationshipFieldsSchema)
    .extend({
        tags: z.array(z.enum(tagValues)).min(1),
        dev: z.boolean().optional(),
        domain: z.enum(domainValues).optional(),
        sources: z.object({
            primary: z.string().min(1).optional(),
            references: z.array(z.string().min(1)).optional(),
            notes: z.string().optional(),
        }).optional(),
    });

export type ConceptFrontmatter = z.infer<typeof conceptFrontmatterSchema>;
export type ConceptFrontmatterSerialized = SerializedFrontmatter<ConceptFrontmatter> & { year?: number };

/** Index entry for a concept page (no html). Used by listing pages. */
export interface ConceptIndexEntry {
    slug: string;
    frontmatter: ConceptFrontmatterSerialized;
}

/** Full concept entry including rendered html. */
export interface ConceptEntry extends ConceptIndexEntry {
    html: string;
}
