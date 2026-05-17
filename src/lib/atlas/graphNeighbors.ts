import { contentGraph } from "../../generated/content-graph";
import { algorithmPages, modelPages, conceptPages } from "../../generated/content-index";
import type { AlgorithmIndexEntry, ModelIndexEntry, ConceptIndexEntry } from "../content/schema";

export type AtlasIndexEntry = AlgorithmIndexEntry | ModelIndexEntry | ConceptIndexEntry;

export interface Neighbors {
    focus: AtlasIndexEntry;
    kind: "algorithm" | "model" | "concept";
    prerequisites: string[];
    extended_from: string[];
    compared_with: string[];
    extended_by:   string[];
    feeds_into:    string[];
    learned_by:    string[];
}

/**
 * Returns the short display title for a page: the text before ':' or '–',
 * or the first two words if neither delimiter is present.
 */
export function shortTitle(title: string): string {
    // Split on colon or en-dash
    const colonIdx = title.indexOf(":");
    const dashIdx  = title.indexOf("–"); // en-dash
    const splitIdx =
        colonIdx >= 0 && dashIdx >= 0 ? Math.min(colonIdx, dashIdx) :
        colonIdx >= 0                  ? colonIdx :
        dashIdx  >= 0                  ? dashIdx  :
        -1;

    if (splitIdx > 0) {
        return title.slice(0, splitIdx).trim();
    }

    // Fall back to first two words
    const words = title.trim().split(/\s+/);
    return words.slice(0, 2).join(" ");
}

/**
 * Returns the full neighbor structure for the given slug, or null if the slug
 * is not a published node in the content graph.
 *
 * Bucket mapping:
 *   prerequisites  — forward[slug].prerequisites
 *   extended_from  — reverse[slug].extending ∪ reverse[slug].generalises (by .slug)
 *   extended_by    — forward[slug].relations where type ∈ {extended_by, generalized_by}
 *   compared_with  — forward[slug].relations where type ∈ {compared_with,
 *                    alternative_formulation_of, parallel_foundation_with}
 *   feeds_into     — forward[slug].relations where type = feeds_into
 *   learned_by     — reverse[slug].hasLearnedAlternative (by .slug)
 *
 * All buckets are filtered to known nodes then deduplicated across buckets
 * with priority: learned_by > extended_by > extended_from > prerequisites >
 *                feeds_into > compared_with.
 */
export function getNeighbors(slug: string): Neighbors | null {
    if (!(slug in contentGraph.nodes)) {
        return null;
    }

    // Resolve focus entry and kind
    const algoEntry = algorithmPages.find((e) => e.slug === slug);
    if (algoEntry) {
        return _buildNeighbors(slug, algoEntry, "algorithm");
    }
    const modelEntry = modelPages.find((e) => e.slug === slug);
    if (modelEntry) {
        return _buildNeighbors(slug, modelEntry, "model");
    }
    const conceptEntry = conceptPages.find((e) => e.slug === slug);
    if (conceptEntry) {
        return _buildNeighbors(slug, conceptEntry, "concept");
    }

    // Node exists in the graph but is not in any published index — shouldn't
    // happen for published pages, but guard per the spec.
    return null;
}

function _buildNeighbors(
    slug: string,
    focus: AtlasIndexEntry,
    kind: "algorithm" | "model" | "concept",
): Neighbors {
    const forward = contentGraph.forward[slug] ?? { prerequisites: [], failureModes: [], relations: [] };
    const reverse = contentGraph.reverse[slug] ?? {
        usedBy: [], affects: [], generalises: [], extending: [], fedBy: [], hasLearnedAlternative: [],
    };

    // --- raw buckets (before dedup) ---
    const rawPrerequisites = forward.prerequisites;

    const rawExtendedFrom = [
        ...reverse.extending.map((r) => r.slug),
        ...reverse.generalises.map((r) => r.slug),
    ];

    const rawExtendedBy = forward.relations
        .filter((r) => r.type === "extended_by" || r.type === "generalized_by")
        .map((r) => r.target);

    const rawComparedWith = forward.relations
        .filter((r) =>
            r.type === "compared_with" ||
            r.type === "alternative_formulation_of" ||
            r.type === "parallel_foundation_with",
        )
        .map((r) => r.target);

    const rawFeedsInto = forward.relations
        .filter((r) => r.type === "feeds_into")
        .map((r) => r.target);

    const rawLearnedBy = reverse.hasLearnedAlternative.map((r) => r.slug);

    // --- filter to known nodes ---
    const known = (slugs: string[]) => slugs.filter((s) => s in contentGraph.nodes);

    const filteredLearnedBy    = known(rawLearnedBy);
    const filteredExtendedBy   = known(rawExtendedBy);
    const filteredExtendedFrom = known(rawExtendedFrom);
    const filteredPrereqs      = known(rawPrerequisites);
    const filteredFeedsInto    = known(rawFeedsInto);
    const filteredComparedWith = known(rawComparedWith);

    // --- cross-bucket deduplication ---
    // Priority (highest first): learned_by > extended_by > extended_from >
    //                           prerequisites > feeds_into > compared_with
    const seen = new Set<string>();
    const dedup = (slugs: string[]): string[] => {
        const result: string[] = [];
        for (const s of slugs) {
            if (!seen.has(s)) {
                seen.add(s);
                result.push(s);
            }
        }
        return result;
    };

    const learned_by    = dedup(filteredLearnedBy);
    const extended_by   = dedup(filteredExtendedBy);
    const extended_from = dedup(filteredExtendedFrom);
    const prerequisites = dedup(filteredPrereqs);
    const feeds_into    = dedup(filteredFeedsInto);
    const compared_with = dedup(filteredComparedWith);

    return {
        focus,
        kind,
        prerequisites,
        extended_from,
        compared_with,
        extended_by,
        feeds_into,
        learned_by,
    };
}
