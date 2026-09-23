/**
 * Content-graph type definitions.
 *
 * These describe the shape of `src/generated/content-graph.ts`, the build-emitted
 * literal produced by `scripts/content-graph.ts`. They live here (rather than only
 * as string-literal text baked into the generated file) so the builder script and
 * the generated output share one real, type-checked source of truth. The generated
 * file re-exports these via `export type { ... }` so existing client imports from
 * `../../generated/content-graph.ts` keep working unchanged.
 */

export type NodeType = "algorithm" | "model" | "concept" | "failure-mode";

/** Single fixed vocabulary of typed inter-page relations. See CLAUDE.md → "Relations field". */
export type RelationType =
    | "generalized_by"
    | "alternative_formulation_of"
    | "parallel_foundation_with"
    | "extended_by"
    | "compared_with"
    | "feeds_into"
    | "learned_alternative_of";

export interface TypedRelation {
    type: RelationType;
    target: string;
    confidence: "high" | "medium" | "low";
    caution?: string;
    /** When true, this entry was mirrored from another page's symmetric relation, not authored on this page. */
    mirrored?: boolean;
}

export interface GraphNode {
    slug: string;
    type: NodeType;
    title: string;
    summary: string;
    path: string;
    /** True if the source page is marked draft. Public UI must hide these from non-admin users. */
    draft: boolean;
}

export interface ForwardEdges {
    prerequisites: string[];
    failureModes: string[];
    /** Authored relations + mirrored symmetric entries from other pages. */
    relations: TypedRelation[];
}

/**
 * One asymmetric reverse-edge entry. Preserves the authored confidence and caution
 * from the source page's forward relation so the target page renders the same
 * editorial nuance in its reverse view.
 */
export interface ReverseRelation {
    slug: string;
    confidence: TypedRelation["confidence"];
    caution?: string;
}

export interface ReverseEdges {
    /** Pages that list this slug as a prerequisite. */
    usedBy: string[];
    /** Pages that list this slug as a failure mode. */
    affects: string[];
    /** Pages where this slug is the target of a `generalized_by` forward — i.e., this page generalises those. */
    generalises: ReverseRelation[];
    /** Pages where this slug is the target of an `extended_by` forward — i.e., this page is extended by those. */
    extending: ReverseRelation[];
    /** Pages where this slug is the target of a `feeds_into` forward — i.e., those pages feed into this. */
    fedBy: ReverseRelation[];
    /** Pages where this slug is the target of a `learned_alternative_of` forward — i.e., those models replace this classical algo. */
    hasLearnedAlternative: ReverseRelation[];
}

export interface ContentGraph {
    nodes: Record<string, GraphNode>;
    forward: Record<string, ForwardEdges>;
    reverse: Record<string, ReverseEdges>;
    /** Longest-path depth in the prerequisites DAG. depth=0 means no prerequisites. */
    depth: Record<string, number>;
}
