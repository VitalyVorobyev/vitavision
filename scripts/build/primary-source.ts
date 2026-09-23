/**
 * `sources.primary` resolution helpers for content:build.
 *
 * Three call sites in content-build.ts need to turn a page's `sources.primary`
 * (a `paper:<id>` source-ref, or a bare id for backward compatibility) into
 * something derived from the registered papers index: the paper's year (to
 * backfill `frontmatter.year`), its display metadata (authors/venue, for the
 * search index), or just its id (to detect papers referenced but not
 * registered). These factories share that one lookup step.
 */
import { primaryPaperId } from "../lib/source-ref.ts";
import type { PaperRefRecord } from "../lib/papers-index.ts";

export type PrimarySourceFrontmatter = { sources?: { primary?: string } };

/** Resolves a page's primary paper id to its registered publication year, if known and positive. */
export function makePrimaryYearResolver(
    papersById: Map<string, PaperRefRecord>,
): (fm: PrimarySourceFrontmatter) => number | undefined {
    return (fm) => {
        const id = primaryPaperId(fm.sources?.primary);
        if (!id) return undefined;
        const y = papersById.get(id)?.year;
        return typeof y === "number" && y > 0 ? y : undefined;
    };
}

/** Resolves a page's primary paper id to its display metadata (authors/venue) for the search index. */
export function makePrimaryDisplayResolver(
    papersById: Map<string, PaperRefRecord>,
): (fm: PrimarySourceFrontmatter) => { authors?: string[]; venue?: string } | undefined {
    return (fm) => {
        const id = primaryPaperId(fm.sources?.primary);
        if (!id) return undefined;
        const paper = papersById.get(id);
        if (!paper) return undefined;
        return {
            ...(paper.authors.length > 0 ? { authors: paper.authors } : {}),
            ...(paper.venue ? { venue: paper.venue } : {}),
        };
    };
}

/** Collects every distinct primary paper id referenced across several published-entry lists. */
export function collectUsedPrimaryIds(entryLists: { frontmatter: PrimarySourceFrontmatter }[][]): Set<string> {
    const used = new Set<string>();
    for (const entries of entryLists) {
        for (const e of entries) {
            const id = primaryPaperId(e.frontmatter.sources?.primary);
            if (id) used.add(id);
        }
    }
    return used;
}
