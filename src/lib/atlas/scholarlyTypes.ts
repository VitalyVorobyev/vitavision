/**
 * Scholarly-index type definitions — the people & papers layer of the Atlas.
 *
 * Describes `public/scholarly-index.json`, emitted by `scripts/build/scholarly.ts`
 * and lazy-loaded by the paper page, the author page and the People / Papers
 * Atlas views. Paper metadata itself (title, authors, venue…) stays in
 * `papers-index.json`; author identity stays in `authors-index.json`. This file
 * carries only the derived relationships between papers, people, Atlas pages and
 * narratives, so the two older indexes keep serving bylines and source strips
 * cheaply on every Atlas page.
 *
 * Every paper id / author id / slug here is canonical: author aliases are already
 * resolved, drafts and `dev` pages are excluded, and paper ids are registry
 * (`kind: paper`) entries only.
 */

import type { NodeType } from "./contentGraphTypes.ts";

/** One of the five communities the People network is coloured by — see `scholarlyGroups.ts`. */
export type ScholarlyGroup = "recognition" | "representation" | "features" | "geometry" | "calibration" | "other";

/** Minimal Atlas page metadata, for every published page referenced anywhere in this index. */
export interface ScholarlyPageMeta {
    title: string;
    kind: Exclude<NodeType, "failure-mode">;
    domain?: string;
}

export interface ScholarlyNarrativeRef {
    slug: string;
    title: string;
    /** `paper`: the narrative has this paper as a node of its own (page debt);
     *  `page`: it reaches the paper only through an Atlas page built on or citing it. */
    via: "paper" | "page";
}

export interface ScholarlyPaper {
    /** Published pages whose `sources.primary` is this paper, sorted by title. */
    primaryPages: string[];
    /** Published pages citing it in `sources.references` but not as primary, sorted by title. */
    citingPages: string[];
    /** Registry papers this paper cites (`cites:` in index.yaml, unknown ids dropped), oldest first. */
    cites: string[];
    /** Registry papers citing this one, oldest first. */
    citedBy: string[];
    /** Narratives the paper reaches, directly or through its pages; `paper` entries first, then by title. */
    narratives: ScholarlyNarrativeRef[];
}

export interface ScholarlyAuthor {
    /** Registry years of the author's papers. */
    firstYear: number;
    lastYear: number;
    /** Distinct published pages citing any of the author's papers (primary or reference). */
    pageCount: number;
    /** Pages for which one of the author's papers is `sources.primary`, sorted by title. */
    primaryPages: string[];
    /** Page counts per domain across those pages, largest first (ties: domain name). */
    domains: { domain: string; count: number }[];
    /** Community used by the directory grouping and the network colouring. */
    group: ScholarlyGroup;
}

export interface ScholarlyNetworkNode {
    id: string;
    /** Precomputed layout position in an abstract unit square-ish space (rounded to 0.1). */
    x: number;
    y: number;
}

export interface ScholarlyIndex {
    pages: Record<string, ScholarlyPageMeta>;
    papers: Record<string, ScholarlyPaper>;
    authors: Record<string, ScholarlyAuthor>;
    /** Symmetric: `coauthorPapers[a][b]` = paper ids a and b share, oldest first. */
    coauthorPapers: Record<string, Record<string, string[]>>;
    network: {
        nodes: ScholarlyNetworkNode[];
        /** `[a, b, sharedPaperCount]`, `a < b`. */
        edges: [string, string, number][];
        bounds: { minX: number; minY: number; maxX: number; maxY: number };
    };
}
