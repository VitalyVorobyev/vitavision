import { useMemo } from "react";
import { contentGraph } from "../generated/content-graph.ts";
import type {
    AlgorithmIndexEntry,
    ModelIndexEntry,
    ConceptIndexEntry,
} from "../lib/content/schema.ts";

export type AtlasNodeKind = "algorithm" | "model" | "concept";

export interface AtlasNode {
    slug: string;
    kind: AtlasNodeKind;
    title: string;
    summary: string;
    category: string;
    tags: readonly string[];
    path: string;
}

export interface AtlasEdge {
    /** Source slug (the page declaring the relation in its frontmatter). */
    from: string;
    /** Target slug. */
    to: string;
}

interface UseAtlasGraphArgs {
    algorithms: AlgorithmIndexEntry[];
    models: ModelIndexEntry[];
    concepts: ConceptIndexEntry[];
}

interface UseAtlasGraphReturn {
    nodes: AtlasNode[];
    edges: AtlasEdge[];
    /** Quick lookup for `nodes` by slug. */
    nodesBySlug: Record<string, AtlasNode>;
}

/**
 * Derive a deduplicated `{ nodes, edges }` view of the Atlas content graph.
 * Edges combine `prerequisites`, `comparedWith`, and `related` from
 * `contentGraph.forward` for every node we know about, deduped pair-wise so
 * each undirected relationship contributes a single edge.
 */
export default function useAtlasGraph({ algorithms, models, concepts }: UseAtlasGraphArgs): UseAtlasGraphReturn {
    return useMemo(() => {
        const nodes: AtlasNode[] = [];

        for (const e of algorithms) {
            nodes.push({
                slug: e.slug,
                kind: "algorithm",
                title: e.frontmatter.title,
                summary: e.frontmatter.summary,
                category: e.frontmatter.category,
                tags: e.frontmatter.tags,
                path: `/atlas/${e.slug}`,
            });
        }
        for (const e of models) {
            nodes.push({
                slug: e.slug,
                kind: "model",
                title: e.frontmatter.title,
                summary: e.frontmatter.summary,
                category: e.frontmatter.category,
                tags: e.frontmatter.tags,
                path: `/atlas/${e.slug}`,
            });
        }
        for (const e of concepts) {
            nodes.push({
                slug: e.slug,
                kind: "concept",
                title: e.frontmatter.title,
                summary: e.frontmatter.summary,
                category: e.frontmatter.category,
                tags: e.frontmatter.tags,
                path: `/atlas/${e.slug}`,
            });
        }

        const nodesBySlug: Record<string, AtlasNode> = {};
        for (const n of nodes) nodesBySlug[n.slug] = n;

        const seenPair = new Set<string>();
        const edges: AtlasEdge[] = [];
        const pushEdge = (a: string, b: string) => {
            if (a === b) return;
            if (!nodesBySlug[a] || !nodesBySlug[b]) return;
            const key = a < b ? `${a}|${b}` : `${b}|${a}`;
            if (seenPair.has(key)) return;
            seenPair.add(key);
            edges.push({ from: a, to: b });
        };

        for (const node of nodes) {
            const fwd = contentGraph.forward[node.slug];
            if (!fwd) continue;
            for (const t of fwd.prerequisites) pushEdge(node.slug, t);
            for (const t of fwd.related) pushEdge(node.slug, t);
            for (const t of fwd.comparedWith) pushEdge(node.slug, t);
        }

        return { nodes, edges, nodesBySlug };
    }, [algorithms, models, concepts]);
}
