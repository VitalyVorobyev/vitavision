/**
 * Content graph builder.
 * Builds a bidirectional relationship graph over all content nodes (algorithms, models, concepts).
 * Emits src/generated/content-graph.ts as a typed TypeScript literal.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";

export type NodeType = "algorithm" | "model" | "concept" | "failure-mode";

/** Single fixed vocabulary of typed inter-page relations. See CLAUDE.md → "Relations field". */
export const RELATION_TYPES = [
    "generalized_by",
    "alternative_formulation_of",
    "parallel_foundation_with",
    "extended_by",
    "compared_with",
    "feeds_into",
    "learned_alternative_of",
] as const;
export type RelationType = (typeof RELATION_TYPES)[number];

/** Symmetric relation types — the build mirrors them onto the target's forward edges. */
export const SYMMETRIC_RELATION_TYPES: ReadonlySet<RelationType> = new Set<RelationType>([
    "alternative_formulation_of",
    "parallel_foundation_with",
    "compared_with",
]);

/** Asymmetric reverse-edge labels — used by the renderer to pick a heading on the target's panel. */
export const ASYMMETRIC_REVERSE_OF: Partial<Record<RelationType, "generalises" | "extends" | "fedBy" | "hasLearnedAlternative">> = {
    generalized_by: "generalises",
    extended_by: "extends",
    feeds_into: "fedBy",
    learned_alternative_of: "hasLearnedAlternative",
};

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

/** Entry shape consumed by buildContentGraph. */
export interface ContentEntry {
    slug: string;
    type: NodeType;
    title: string;
    summary: string;
    draft?: boolean;
    prerequisites?: string[];
    failureModes?: string[];
    relations?: TypedRelation[];
}

function nodePath(slug: string, type: NodeType): string {
    // All atlas content shares the global slug namespace, so all kinds route
    // through /atlas/<slug>. failure-mode routing is reserved for the future.
    switch (type) {
        case "algorithm":
        case "model":
        case "concept":
            return `/atlas/${slug}`;
        case "failure-mode": return `/failure-modes/${slug}`;
    }
}

function emptyForward(): ForwardEdges {
    return { prerequisites: [], failureModes: [], relations: [] };
}

function emptyReverse(): ReverseEdges {
    return {
        usedBy: [],
        affects: [],
        generalises: [],
        extending: [],
        fedBy: [],
        hasLearnedAlternative: [],
    };
}

function dedupeRelations(rels: TypedRelation[]): TypedRelation[] {
    // Keep first occurrence per (type, target) — authored entries take precedence over mirrored ones.
    const seen = new Set<string>();
    const out: TypedRelation[] = [];
    for (const r of rels) {
        const key = `${r.type}:${r.target}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(r);
    }
    return out;
}

/**
 * Compute the longest-path depth of every slug in the prerequisites DAG.
 * depth = 0 if the node has no prerequisites, else 1 + max(depth(prereq)).
 * A visited-set guard prevents infinite recursion if a cycle somehow reaches this function
 * (cycles are caught by validation, but this keeps the function total in all cases).
 * Missing prerequisite slugs are treated as depth 0 and skipped gracefully.
 */
export function computePrerequisiteDepth(graph: ContentGraph): Record<string, number> {
    const memo: Record<string, number> = {};

    function dfs(slug: string, visiting: Set<string>): number {
        if (slug in memo) return memo[slug];
        if (visiting.has(slug)) return 0; // cycle guard — treat as leaf
        visiting.add(slug);
        const prereqs = graph.forward[slug]?.prerequisites ?? [];
        let max = -1;
        for (const p of prereqs) {
            if (!(p in graph.nodes)) continue; // missing slug — skip gracefully
            const d = dfs(p, visiting);
            if (d > max) max = d;
        }
        visiting.delete(slug);
        const depth = max < 0 ? 0 : max + 1;
        memo[slug] = depth;
        return depth;
    }

    for (const slug of Object.keys(graph.nodes)) {
        dfs(slug, new Set());
    }
    return memo;
}

/**
 * Build the full content graph from a flat list of entries.
 * Forward edges include authored + mirrored symmetric relations.
 * Reverse edges are typed buckets for asymmetric relations + the existing prerequisite / failure-mode reverses.
 */
export function buildContentGraph(entries: ContentEntry[]): ContentGraph {
    const nodes: Record<string, GraphNode> = {};
    const forward: Record<string, ForwardEdges> = {};
    const reverse: Record<string, ReverseEdges> = {};

    for (const e of entries) {
        nodes[e.slug] = {
            slug: e.slug,
            type: e.type,
            title: e.title,
            summary: e.summary,
            path: nodePath(e.slug, e.type),
            draft: e.draft === true,
        };
        forward[e.slug] = emptyForward();
        reverse[e.slug] = emptyReverse();
    }

    // First pass — populate authored forward edges.
    for (const e of entries) {
        const fwd = forward[e.slug];
        fwd.prerequisites = [...new Set(e.prerequisites ?? [])];
        fwd.failureModes = [...new Set(e.failureModes ?? [])];
        fwd.relations = (e.relations ?? []).map((r) => ({ ...r }));
    }

    // Second pass — mirror symmetric relations onto target pages.
    for (const [slug, fwd] of Object.entries(forward)) {
        for (const rel of fwd.relations) {
            if (rel.mirrored) continue; // safety; authored entries don't carry the flag
            if (!SYMMETRIC_RELATION_TYPES.has(rel.type)) continue;
            const targetForward = forward[rel.target];
            if (!targetForward) continue;
            const alreadyAuthored = targetForward.relations.some(
                (r) => r.type === rel.type && r.target === slug,
            );
            if (alreadyAuthored) continue;
            targetForward.relations.push({
                type: rel.type,
                target: slug,
                confidence: rel.confidence,
                caution: rel.caution,
                mirrored: true,
            });
        }
    }

    // Dedupe each forward.relations list (defensive — authored may contain dupes).
    for (const fwd of Object.values(forward)) {
        fwd.relations = dedupeRelations(fwd.relations);
    }

    // Third pass — compute reverse edges.
    for (const [slug, fwd] of Object.entries(forward)) {
        for (const target of fwd.prerequisites) {
            if (reverse[target]) reverse[target].usedBy.push(slug);
        }
        for (const target of fwd.failureModes) {
            if (reverse[target]) reverse[target].affects.push(slug);
        }
        for (const rel of fwd.relations) {
            if (rel.mirrored) continue; // mirrored entries don't generate further reverse edges
            const rev = reverse[rel.target];
            if (!rev) continue;
            const entry: ReverseRelation = { slug, confidence: rel.confidence };
            if (rel.caution !== undefined) entry.caution = rel.caution;
            switch (rel.type) {
                case "generalized_by":
                    rev.generalises.push(entry);
                    break;
                case "extended_by":
                    rev.extending.push(entry);
                    break;
                case "feeds_into":
                    rev.fedBy.push(entry);
                    break;
                case "learned_alternative_of":
                    rev.hasLearnedAlternative.push(entry);
                    break;
                // Symmetric types are already mirrored onto target's forward — no separate reverse bucket.
                case "alternative_formulation_of":
                case "parallel_foundation_with":
                case "compared_with":
                    break;
            }
        }
    }

    // Stable sort each list for deterministic output.
    const bySlug = (a: ReverseRelation, b: ReverseRelation) => a.slug.localeCompare(b.slug);
    for (const rev of Object.values(reverse)) {
        rev.usedBy.sort();
        rev.affects.sort();
        rev.generalises.sort(bySlug);
        rev.extending.sort(bySlug);
        rev.fedBy.sort(bySlug);
        rev.hasLearnedAlternative.sort(bySlug);
    }

    const graph: ContentGraph = { nodes, forward, reverse, depth: {} };
    graph.depth = computePrerequisiteDepth(graph);
    return graph;
}

/**
 * Detect cycles in the prerequisites subgraph using iterative DFS with three-colour marking.
 */
export function detectPrerequisiteCycles(graph: ContentGraph): string[][] {
    const WHITE = 0; const GRAY = 1; const BLACK = 2;
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
                    if (color[next] === undefined) continue;
                    if (color[next] === GRAY) {
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

/** Write src/generated/content-graph.ts as a typed TypeScript literal. */
export function emitContentGraph(graph: ContentGraph, outDir: string): void {
    const filePath = join(outDir, "content-graph.ts");

    const lines: string[] = [
        "// Auto-generated by scripts/content-build.ts — do not edit manually.",
        "",
        "export type NodeType = \"algorithm\" | \"model\" | \"concept\" | \"failure-mode\";",
        "",
        "export type RelationType =",
        "    | \"generalized_by\"",
        "    | \"alternative_formulation_of\"",
        "    | \"parallel_foundation_with\"",
        "    | \"extended_by\"",
        "    | \"compared_with\"",
        "    | \"feeds_into\"",
        "    | \"learned_alternative_of\";",
        "",
        "export interface TypedRelation {",
        "    type: RelationType;",
        "    target: string;",
        "    confidence: \"high\" | \"medium\" | \"low\";",
        "    caution?: string;",
        "    mirrored?: boolean;",
        "}",
        "",
        "export interface GraphNode {",
        "    slug: string;",
        "    type: NodeType;",
        "    title: string;",
        "    summary: string;",
        "    path: string;",
        "    draft: boolean;",
        "}",
        "",
        "export interface ForwardEdges {",
        "    prerequisites: string[];",
        "    failureModes: string[];",
        "    relations: TypedRelation[];",
        "}",
        "",
        "export interface ReverseRelation {",
        "    slug: string;",
        "    confidence: \"high\" | \"medium\" | \"low\";",
        "    caution?: string;",
        "}",
        "",
        "export interface ReverseEdges {",
        "    usedBy: string[];",
        "    affects: string[];",
        "    generalises: ReverseRelation[];",
        "    extending: ReverseRelation[];",
        "    fedBy: ReverseRelation[];",
        "    hasLearnedAlternative: ReverseRelation[];",
        "}",
        "",
        "export interface ContentGraph {",
        "    nodes: Record<string, GraphNode>;",
        "    forward: Record<string, ForwardEdges>;",
        "    reverse: Record<string, ReverseEdges>;",
        "    /** Longest-path depth in the prerequisites DAG. depth=0 means no prerequisites. */",
        "    depth: Record<string, number>;",
        "}",
        "",
        `export const contentGraph: ContentGraph = ${JSON.stringify(graph, null, 2)};`,
        "",
    ];

    writeFileSync(filePath, lines.join("\n"), "utf-8");
}
