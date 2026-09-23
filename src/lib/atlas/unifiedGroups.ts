import {
    type AlgorithmIndexEntry,
    type ModelIndexEntry,
    type ConceptIndexEntry,
} from "../content/schema.ts";
import { domainLabels, domainOrder } from "../../components/algorithms/domainLabels.ts";
import { contentGraph } from "../../generated/content-graph.ts";
import type { AlgorithmsKind } from "./atlasFilters.ts";

// ── Discriminated entry type ───────────────────────────────────────────────────

export type UnifiedEntry =
    | { kind: "algorithm"; slug: string; frontmatter: AlgorithmIndexEntry["frontmatter"] }
    | { kind: "model";     slug: string; frontmatter: ModelIndexEntry["frontmatter"] }
    | { kind: "concept";   slug: string; frontmatter: ConceptIndexEntry["frontmatter"] };

// ── Depth-based comparator ────────────────────────────────────────────────────

export function byDepthThenDate(depth: Record<string, number>) {
    return (a: UnifiedEntry, b: UnifiedEntry): number => {
        const da = depth[a.slug] ?? Number.MAX_SAFE_INTEGER;
        const db = depth[b.slug] ?? Number.MAX_SAFE_INTEGER;
        if (da !== db) return da - db;
        // tie-break: date descending then title ascending
        const ta = new Date(a.frontmatter.date).getTime();
        const tb = new Date(b.frontmatter.date).getTime();
        if (tb !== ta) return tb - ta;
        return a.frontmatter.title.localeCompare(b.frontmatter.title, undefined, { sensitivity: "base" });
    };
}

// ── Unified catalog grouping ──────────────────────────────────────────────────

export type CatalogGroup = { id: string; label: string; entries: UnifiedEntry[] };

export function computeUnifiedGroups(
    filteredAlgorithms: AlgorithmIndexEntry[],
    filteredModels: ModelIndexEntry[],
    filteredConcepts: ConceptIndexEntry[],
    kind: AlgorithmsKind,
): CatalogGroup[] {
    const depth = contentGraph.depth;
    const comparator = byDepthThenDate(depth);

    // When kind === "all": three top-level groups by type.
    if (kind === "all") {
        const groups: CatalogGroup[] = [];

        const algoEntries: UnifiedEntry[] = filteredAlgorithms.map((e) => ({
            kind: "algorithm", slug: e.slug, frontmatter: e.frontmatter,
        }));
        algoEntries.sort(comparator);
        if (algoEntries.length > 0) groups.push({ id: "algorithm", label: "Algorithms", entries: algoEntries });

        const modelEntries: UnifiedEntry[] = filteredModels.map((e) => ({
            kind: "model", slug: e.slug, frontmatter: e.frontmatter,
        }));
        modelEntries.sort(comparator);
        if (modelEntries.length > 0) groups.push({ id: "model", label: "Models", entries: modelEntries });

        const conceptEntries: UnifiedEntry[] = filteredConcepts.map((e) => ({
            kind: "concept", slug: e.slug, frontmatter: e.frontmatter,
        }));
        conceptEntries.sort(comparator);
        if (conceptEntries.length > 0) groups.push({ id: "concept", label: "Concepts", entries: conceptEntries });

        return groups;
    }

    // When a specific kind is selected: group by domain over domainOrder.
    const sourceItems: UnifiedEntry[] = [];
    if (kind === "algorithm") {
        for (const e of filteredAlgorithms) sourceItems.push({ kind: "algorithm", slug: e.slug, frontmatter: e.frontmatter });
    } else if (kind === "model") {
        for (const e of filteredModels) sourceItems.push({ kind: "model", slug: e.slug, frontmatter: e.frontmatter });
    } else {
        for (const e of filteredConcepts) sourceItems.push({ kind: "concept", slug: e.slug, frontmatter: e.frontmatter });
    }

    const byDomain = new Map<string, UnifiedEntry[]>();
    for (const entry of sourceItems) {
        const dom = entry.frontmatter.domain ?? "unknown";
        const bucket = byDomain.get(dom) ?? [];
        bucket.push(entry);
        byDomain.set(dom, bucket);
    }

    return domainOrder
        .map((dom) => {
            const entries = (byDomain.get(dom) ?? []).sort(comparator);
            return { id: dom, label: domainLabels[dom as keyof typeof domainLabels] ?? dom, entries };
        })
        .filter((g) => g.entries.length > 0);
}
