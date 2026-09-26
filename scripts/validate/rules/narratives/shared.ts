/**
 * Shared shapes for Rule 11 (narratives), split across nodes/edges/lenses/steps.
 *
 * Narratives are NOT content-graph nodes (content-graph.ts is untouched by
 * this file). Each narrative frontmatter carries its own small graph
 * (nodes/edges/lenses/steps) whose ids live in a namespace local to that
 * one narrative — distinct from the global atlas slug namespace that
 * `page` nodes and the `paper` registry resolve into.
 */
import type { Diagnostic } from "../../types.ts";

export interface NarrativeNodeShape {
    id: string;
    page?: string;
    paper?: string;
    question?: string;
    area: string;
    label?: string;
}
export interface NarrativeEdgeShape {
    from: string;
    to: string;
    type: string;
}
export interface NarrativeLensShape {
    id: string;
    coords: Record<string, [number, number]>;
}
export interface NarrativeStepShape {
    title: string;
    focus: string[];
    anchor: string;
}

export interface NarrativeFrontmatterShape {
    areas?: { id: string; label: string }[];
    nodes?: NarrativeNodeShape[];
    edges?: NarrativeEdgeShape[];
    lenses?: NarrativeLensShape[];
    steps?: NarrativeStepShape[];
}

/** Result of processing a narrative's `nodes[]` — the maps downstream
 *  edges/lenses/steps checks are built on. */
export interface NodeCheckResult {
    diagnostics: Diagnostic[];
    nodeIds: Set<string>;
    /** Derived publication year, for `page` and `paper` nodes only. */
    nodeYear: Map<string, number | undefined>;
    /** Atlas slug, for `page` nodes only — used to cross-check edges against Atlas relations[]. */
    nodeSlug: Map<string, string>;
}
