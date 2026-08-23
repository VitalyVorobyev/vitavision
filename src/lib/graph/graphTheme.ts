// Graph canvas theme tokens — extracted from GraphExplorer.tsx.
//
// Maps relation keys / entry kinds to the `--graph-*` CSS custom properties
// defined in the site's stylesheet, so both GraphExplorer and other graph
// canvases (e.g. NarrativeCanvas) resolve the same tokens the same way.

export type GraphRelKey =
    | "prerequisites"
    | "extended_from"
    | "compared_with"
    | "extended_by"
    | "feeds_into"
    | "learned_by"
    | "used_by"
    | "fed_by"
    | "learned_alternative_of";

/** relation key → `--graph-rel-*` custom property name (without `var()`/`hsl()`). */
export const GRAPH_REL_COLOR_VAR: Record<GraphRelKey, string> = {
    prerequisites:          "--graph-rel-prereq",
    extended_from:          "--graph-rel-extend",
    compared_with:          "--graph-rel-compare",
    extended_by:            "--graph-rel-extend",
    feeds_into:              "--graph-rel-flow",
    learned_by:              "--graph-rel-learn",
    used_by:                 "--graph-rel-flow",
    fed_by:                  "--graph-rel-flow",
    learned_alternative_of:  "--graph-rel-learn",
};

/** Resolved `hsl(var(--graph-rel-*))` color string for a relation key. */
export function graphRelColor(rel: GraphRelKey): string {
    return `hsl(var(${GRAPH_REL_COLOR_VAR[rel]}))`;
}

export type GraphKind = "algorithm" | "model" | "concept";

/** entry kind → `--graph-kind-accent-*` custom property name. */
export const GRAPH_KIND_ACCENT_VAR: Record<GraphKind, string> = {
    algorithm: "--graph-kind-accent-algorithm",
    model:     "--graph-kind-accent-model",
    concept:   "--graph-kind-accent-concept",
};

/** Resolved `hsl(var(--graph-kind-accent-*))` color string for an entry kind. */
export function graphKindAccent(kind: GraphKind): string {
    return `hsl(var(${GRAPH_KIND_ACCENT_VAR[kind]}))`;
}

/** Radial-gradient background for the whiteboard canvas, using `--graph-canvas-*` tokens. */
export const GRAPH_CANVAS_GRADIENT =
    "radial-gradient(ellipse at center, hsl(var(--graph-canvas-from)) 0%, hsl(var(--graph-canvas-mid)) 70%, hsl(var(--graph-canvas-to)) 100%)";

/** Background fill for edge-label pills, using the `--graph-pill-bg` token. */
export const GRAPH_PILL_BG = "hsl(var(--graph-pill-bg))";
