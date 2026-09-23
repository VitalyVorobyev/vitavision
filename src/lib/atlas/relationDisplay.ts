/**
 * Pure builder for the relation-display data consumed by `RelationshipPanel`
 * and its sub-components. Extracted so the grouping/filtering/suppression
 * logic can be unit-tested against a synthetic content graph, independent of
 * React rendering.
 */
import { contentGraph as defaultContentGraph } from "../../generated/content-graph.ts";
import type { ContentGraph, RelationType, ReverseRelation, TypedRelation } from "../../generated/content-graph.ts";

export type { TypedRelation };

// ── Type → display label ─────────────────────────────────────────────────────

/** Forward-direction label: how to describe a typed relation that the page itself authored. */
export const FORWARD_LABEL: Record<RelationType, string> = {
    generalized_by: "Generalised by",
    alternative_formulation_of: "Alternative formulation of",
    parallel_foundation_with: "Parallel foundation with",
    extended_by: "Extended by",
    compared_with: "Compared with",
    feeds_into: "Feeds into",
    learned_alternative_of: "Learned alternative of",
};

/** Reverse-direction label for asymmetric types (when target's panel renders the entry). */
export const REVERSE_LABEL: Partial<Record<RelationType, string>> = {
    generalized_by: "Generalises",
    extended_by: "Extends",
    feeds_into: "Fed by",
    learned_alternative_of: "Has learned alternative",
};

export const SECTION_ORDER: readonly string[] = [
    "Generalised by",
    "Generalises",
    "Alternative formulation of",
    "Parallel foundation with",
    "Extended by",
    "Extends",
    "Compared with",
    "Feeds into",
    "Fed by",
    "Learned alternative of",
    "Has learned alternative",
];

export interface DisplayRelation {
    label: string;
    target: string;
    confidence: TypedRelation["confidence"];
    caution?: string;
}

export interface RelationDisplayOptions {
    /** When set, suppresses the forward `generalized_by`/high-confidence entry that drives the "Superseded by" section. */
    supersededBy?: string;
    /** Whether draft-page targets should be included (admin-only view). */
    showDrafts: boolean;
    /** Content graph to read from; defaults to the build-generated graph. Overridable for tests. */
    graph?: ContentGraph;
}

export interface RelationDisplayResult {
    prerequisites: string[];
    usedBy: string[];
    failureModes: string[];
    affects: string[];
    /** Typed relations (forward + asymmetric reverses), grouped by display label. Iterate via `SECTION_ORDER`. */
    grouped: Map<string, DisplayRelation[]>;
    /** True when any of the above has at least one visible entry. */
    hasGraphContent: boolean;
    /** True when `supersededBy` is set and resolves to a known node. */
    hasSuccessor: boolean;
}

/** True when the slug has any forward or reverse graph edges at all (used for the panel's early bail-out). */
export function hasRawGraphEdges(slug: string, graph: ContentGraph = defaultContentGraph): boolean {
    return graph.forward[slug] !== undefined || graph.reverse[slug] !== undefined;
}

function visibleSlugs(slugs: string[], graph: ContentGraph, showDrafts: boolean): string[] {
    return slugs.filter((s) => {
        const node = graph.nodes[s];
        return node !== undefined && (showDrafts || !node.draft);
    });
}

/**
 * Builds the grouped, filtered relation-display data for `slug`: plain slug
 * lists (prerequisites/usedBy/failureModes/affects) and typed relations
 * (forward + asymmetric reverse buckets), suppressing the entry driving a
 * "Superseded by" section and filtering out draft targets for non-admins.
 */
export function buildRelationDisplay(slug: string, options: RelationDisplayOptions): RelationDisplayResult {
    const graph = options.graph ?? defaultContentGraph;
    const { showDrafts, supersededBy } = options;

    const fwd = graph.forward[slug];
    const rev = graph.reverse[slug];

    const prerequisites = visibleSlugs(fwd?.prerequisites ?? [], graph, showDrafts);
    const usedBy = visibleSlugs(rev?.usedBy ?? [], graph, showDrafts);
    const failureModes = visibleSlugs(fwd?.failureModes ?? [], graph, showDrafts);
    const affects = visibleSlugs(rev?.affects ?? [], graph, showDrafts);

    const display: DisplayRelation[] = [];

    for (const rel of fwd?.relations ?? []) {
        // Suppress the entry that drives the prominent "Superseded by" section.
        if (
            supersededBy !== undefined &&
            rel.target === supersededBy &&
            rel.type === "generalized_by" &&
            rel.confidence === "high"
        ) continue;
        display.push({
            label: FORWARD_LABEL[rel.type],
            target: rel.target,
            confidence: rel.confidence,
            caution: rel.caution,
        });
    }

    type ReverseBucket = { entries: ReverseRelation[]; type: RelationType };
    const reverseBuckets: ReverseBucket[] = [
        { entries: rev?.generalises ?? [], type: "generalized_by" },
        { entries: rev?.extending ?? [], type: "extended_by" },
        { entries: rev?.fedBy ?? [], type: "feeds_into" },
        { entries: rev?.hasLearnedAlternative ?? [], type: "learned_alternative_of" },
    ];
    for (const bucket of reverseBuckets) {
        const label = REVERSE_LABEL[bucket.type];
        if (!label) continue;
        for (const entry of bucket.entries) {
            display.push({
                label,
                target: entry.slug,
                confidence: entry.confidence,
                caution: entry.caution,
            });
        }
    }

    const visibleDisplay = display.filter((d) => {
        const node = graph.nodes[d.target];
        return node !== undefined && (showDrafts || !node.draft);
    });

    // Group by relation label in SECTION_ORDER.
    const grouped = new Map<string, DisplayRelation[]>();
    for (const d of visibleDisplay) {
        const list = grouped.get(d.label) ?? [];
        list.push(d);
        grouped.set(d.label, list);
    }

    const hasGraphContent =
        prerequisites.length > 0 ||
        usedBy.length > 0 ||
        failureModes.length > 0 ||
        affects.length > 0 ||
        visibleDisplay.length > 0;

    const hasSuccessor = supersededBy !== undefined && graph.nodes[supersededBy] !== undefined;

    return { prerequisites, usedBy, failureModes, affects, grouped, hasGraphContent, hasSuccessor };
}
