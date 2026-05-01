/**
 * Content graph builder.
 * Builds a bidirectional relationship graph over all content nodes (algorithms, models, concepts).
 * Emits src/generated/content-graph.ts as a typed TypeScript literal.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export type NodeType = "algorithm" | "model" | "concept" | "failure-mode";

export interface GraphNode {
    slug: string;
    type: NodeType;
    title: string;
    summary: string;
    path: string;
}

export interface ForwardEdges {
    prerequisites: string[];
    related: string[];       // includes normalized relatedAlgorithms
    comparedWith: string[];
    failureModes: string[];
}

export interface ReverseEdges {
    usedBy: string[];        // pages that list this slug as a prerequisite
    relatedFrom: string[];   // mirrored related
    comparedFrom: string[];  // mirrored comparedWith
    affects: string[];       // failure-mode → algorithms (reverse of failureModes)
}

export interface ContentGraph {
    nodes: Record<string, GraphNode>;
    forward: Record<string, ForwardEdges>;
    reverse: Record<string, ReverseEdges>;
}

/** Entry shape consumed by buildContentGraph. */
export interface ContentEntry {
    slug: string;
    type: NodeType;
    title: string;
    summary: string;
    /** Optional legacy field — normalized into forward.related. */
    relatedAlgorithms?: string[];
    prerequisites?: string[];
    related?: string[];
    comparedWith?: string[];
    failureModes?: string[];
}

function nodePath(slug: string, type: NodeType): string {
    switch (type) {
        case "algorithm": return `/algorithms/${slug}`;
        case "model": return `/algorithms/models/${slug}`;
        case "concept": return `/concepts/${slug}`;
        case "failure-mode": return `/failure-modes/${slug}`;
    }
}

function emptyForward(): ForwardEdges {
    return { prerequisites: [], related: [], comparedWith: [], failureModes: [] };
}

function emptyReverse(): ReverseEdges {
    return { usedBy: [], relatedFrom: [], comparedFrom: [], affects: [] };
}

/**
 * Build the full content graph from a flat list of entries.
 * Forward edges are authored; reverse edges are computed automatically.
 */
export function buildContentGraph(entries: ContentEntry[]): ContentGraph {
    const nodes: Record<string, GraphNode> = {};
    const forward: Record<string, ForwardEdges> = {};
    const reverse: Record<string, ReverseEdges> = {};

    // Initialise nodes and empty edge maps.
    for (const e of entries) {
        nodes[e.slug] = {
            slug: e.slug,
            type: e.type,
            title: e.title,
            summary: e.summary,
            path: nodePath(e.slug, e.type),
        };
        forward[e.slug] = emptyForward();
        reverse[e.slug] = emptyReverse();
    }

    // Populate forward edges (deduplicate as we go).
    for (const e of entries) {
        const fwd = forward[e.slug];

        // prerequisites
        const prereqs = e.prerequisites ?? [];
        fwd.prerequisites = [...new Set(prereqs)];

        // related: normalize relatedAlgorithms + related into one list
        const related = [...(e.relatedAlgorithms ?? []), ...(e.related ?? [])];
        fwd.related = [...new Set(related)];

        // comparedWith
        fwd.comparedWith = [...new Set(e.comparedWith ?? [])];

        // failureModes
        fwd.failureModes = [...new Set(e.failureModes ?? [])];
    }

    // Compute reverse edges by iterating over forward edges.
    for (const [slug, fwd] of Object.entries(forward)) {
        for (const target of fwd.prerequisites) {
            if (reverse[target]) reverse[target].usedBy.push(slug);
        }
        for (const target of fwd.related) {
            if (reverse[target]) reverse[target].relatedFrom.push(slug);
        }
        for (const target of fwd.comparedWith) {
            if (reverse[target]) reverse[target].comparedFrom.push(slug);
        }
        for (const target of fwd.failureModes) {
            if (reverse[target]) reverse[target].affects.push(slug);
        }
    }

    return { nodes, forward, reverse };
}

/**
 * Detect cycles in the prerequisites subgraph using iterative DFS with three-colour marking.
 * Returns a list of cycles (each cycle is an ordered list of slugs).
 * Returns [] if the graph is acyclic.
 */
export function detectPrerequisiteCycles(graph: ContentGraph): string[][] {
    const WHITE = 0; // unvisited
    const GRAY = 1;  // in current DFS path
    const BLACK = 2; // fully processed

    const color: Record<string, number> = {};
    const parent: Record<string, string | null> = {};
    const cycles: string[][] = [];

    for (const slug of Object.keys(graph.nodes)) {
        color[slug] = WHITE;
        parent[slug] = null;
    }

    function dfs(start: string): void {
        const stack: Array<{ slug: string; processed: boolean }> = [{ slug: start, processed: false }];

        while (stack.length > 0) {
            const top = stack[stack.length - 1];

            if (!top.processed) {
                color[top.slug] = GRAY;
                top.processed = true;

                const prereqs = graph.forward[top.slug]?.prerequisites ?? [];
                for (const next of prereqs) {
                    if (color[next] === undefined) continue; // unknown slug — skip
                    if (color[next] === GRAY) {
                        // Found a cycle — reconstruct it from parent chain
                        const cycle: string[] = [next];
                        let cur: string | null = top.slug;
                        while (cur !== null && cur !== next) {
                            cycle.unshift(cur);
                            cur = parent[cur] ?? null;
                        }
                        cycle.unshift(next);
                        cycles.push(cycle);
                    } else if (color[next] === WHITE) {
                        parent[next] = top.slug;
                        stack.push({ slug: next, processed: false });
                    }
                }
            } else {
                color[top.slug] = BLACK;
                stack.pop();
            }
        }
    }

    for (const slug of Object.keys(graph.nodes)) {
        if (color[slug] === WHITE) dfs(slug);
    }

    return cycles;
}

/**
 * Write src/generated/content-graph.ts as a typed TypeScript literal.
 */
export function emitContentGraph(graph: ContentGraph, outDir: string): void {
    const filePath = join(outDir, "content-graph.ts");

    const lines: string[] = [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        "",
        "export type NodeType = \"algorithm\" | \"model\" | \"concept\" | \"failure-mode\";",
        "",
        "export interface GraphNode {",
        "    slug: string;",
        "    type: NodeType;",
        "    title: string;",
        "    summary: string;",
        "    path: string;",
        "}",
        "",
        "export interface ForwardEdges {",
        "    prerequisites: string[];",
        "    related: string[];",
        "    comparedWith: string[];",
        "    failureModes: string[];",
        "}",
        "",
        "export interface ReverseEdges {",
        "    usedBy: string[];",
        "    relatedFrom: string[];",
        "    comparedFrom: string[];",
        "    affects: string[];",
        "}",
        "",
        "export interface ContentGraph {",
        "    nodes: Record<string, GraphNode>;",
        "    forward: Record<string, ForwardEdges>;",
        "    reverse: Record<string, ReverseEdges>;",
        "}",
        "",
        `export const contentGraph: ContentGraph = ${JSON.stringify(graph, null, 2)};`,
        "",
    ];

    writeFileSync(filePath, lines.join("\n"), "utf-8");
}
