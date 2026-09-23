// nodeFinderSearch — NodeFinder search adapter for the Atlas content graph.
// Extracted from GraphExplorer.tsx.

import { searchSlugs } from "../../../lib/atlas/searchClient.ts";
import { contentGraph } from "../../../generated/content-graph.ts";
import { EntryIcon } from "../EntryIcon.tsx";
import type { NodeFinderItem } from "./NodeFinder.tsx";

const NODE_FINDER_MAX = 8;

export function nodeFinderSearch(query: string): NodeFinderItem[] {
    const matched = searchSlugs(query);
    if (!matched) return [];
    const out: NodeFinderItem[] = [];
    for (const slug of matched) {
        if (out.length >= NODE_FINDER_MAX) break;
        const node = contentGraph.nodes[slug];
        if (!node || node.draft) continue;
        // failure-mode nodes don't have a matching EntryIcon kind — fall back to algorithm
        const iconKind = (node.type === "algorithm" || node.type === "model" || node.type === "concept")
            ? node.type
            : "algorithm" as const;
        const kindLabel =
            node.type === "algorithm" ? "algo" :
            node.type === "model"     ? "model" :
            node.type === "concept"   ? "concept" : "other";
        out.push({
            id:       slug,
            title:    node.title,
            subtitle: kindLabel,
            icon:     <EntryIcon slug={slug} kind={iconKind} size={22} />,
        });
    }
    return out;
}
