// focusEntry.ts — shared resolution logic for the focused node in the graph view.
//
// Plain function (no React hooks) so it can be called anywhere without hook rules.

import { contentGraph } from "../../generated/content-graph.ts";
import { algorithmPages, modelPages, conceptPages } from "../../generated/content-index.ts";

export type FocusKind = "algorithm" | "model" | "concept";

export interface FocusEntry {
    node: (typeof contentGraph.nodes)[string];
    kind: FocusKind;
    /** Frontmatter from the matching page entry. Cast to a richer type at call site. */
    fm: Record<string, unknown>;
}

/**
 * Resolve the graph node, content kind, and frontmatter for a slug.
 * Returns null when the slug is unknown or has no frontmatter (draft not deployed).
 */
export function getFocusEntry(slug: string): FocusEntry | null {
    const node = contentGraph.nodes[slug];
    if (!node) return null;

    const algoPage = algorithmPages.find((p) => p.slug === slug);
    if (algoPage) {
        return { node, kind: "algorithm", fm: algoPage.frontmatter as Record<string, unknown> };
    }

    const modelPage = modelPages.find((p) => p.slug === slug);
    if (modelPage) {
        return { node, kind: "model", fm: modelPage.frontmatter as Record<string, unknown> };
    }

    const conceptPage = conceptPages.find((p) => p.slug === slug);
    if (conceptPage) {
        return { node, kind: "concept", fm: conceptPage.frontmatter as Record<string, unknown> };
    }

    return null;
}

export interface EntryMeta {
    kind: FocusKind;
    year: number | undefined;
}

/**
 * Convenience wrapper over `getFocusEntry` for the two fields the graph
 * cards need repeatedly (kind + year), with the same defaults the original
 * per-callsite scans used: kind falls back to "concept" and year to
 * `undefined` when the slug can't be resolved (shouldn't happen for a
 * neighbor slug pulled from the content graph, but kept for parity).
 */
export function entryMeta(slug: string): EntryMeta {
    const entry = getFocusEntry(slug);
    return {
        kind: entry?.kind ?? "concept",
        year: entry ? (entry.fm as { year?: number }).year : undefined,
    };
}
