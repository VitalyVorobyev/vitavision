/**
 * Pure derivations for the paper page (`/papers/:id`).
 *
 * Everything here is a plain function over already-loaded index data — no
 * fetching, no React. `PaperPage.tsx` and its subcomponents call these to
 * turn `ScholarlyPaper` + `PapersById` + `AuthorsIndex` records into the
 * exact rows the UI renders.
 */
import { domainLabels } from "../../components/algorithms/domainLabels.ts";
import type { ScholarlyPageMeta, ScholarlyPaper } from "./scholarlyTypes.ts";
import type { PapersById } from "../../generated/papers-index.ts";

// ── Stats strip ──────────────────────────────────────────────────────────────

export interface PaperStat {
    value: number;
    label: string;
}

function pluralize(value: number, singular: string, plural: string): string {
    return value === 1 ? singular : plural;
}

/** The four-stat strip under the header. `paper` is `undefined` for a
 *  registry paper the scholarly build dropped entirely (no page cites it at
 *  all, directly or as a reference) — every count is then 0. */
export function computePaperStats(paper: ScholarlyPaper | undefined): PaperStat[] {
    const primary = paper?.primaryPages.length ?? 0;
    const citing = paper?.citingPages.length ?? 0;
    const narratives = paper?.narratives.length ?? 0;
    const citedBy = paper?.citedBy.length ?? 0;
    return [
        { value: primary, label: pluralize(primary, "page built on it", "pages built on it") },
        { value: citing, label: pluralize(citing, "more page cites it", "more pages cite it") },
        { value: narratives, label: pluralize(narratives, "narrative", "narratives") },
        { value: citedBy, label: pluralize(citedBy, "registry paper cites it", "registry papers cite it") },
    ];
}

// ── "In the Atlas" — citing pages grouped by domain ─────────────────────────

export interface DomainGroupEntry {
    slug: string;
    title: string;
    kind: ScholarlyPageMeta["kind"];
}

export interface DomainGroup {
    domain: string;
    label: string;
    entries: DomainGroupEntry[];
}

/** Groups `citingPages` (reference-only pages, i.e. `ScholarlyPaper.citingPages`)
 *  by their `domain`, sorted by group size descending then label A–Z; entries
 *  within a group are sorted by title. Pages missing from `pages` (should not
 *  happen — the scholarly build only lists slugs it also has meta for) are
 *  skipped defensively. Domain-less pages fall into an "Other" bucket. */
export function groupCitingPagesByDomain(
    citingPages: readonly string[],
    pages: Record<string, ScholarlyPageMeta>,
): DomainGroup[] {
    const byDomain = new Map<string, DomainGroupEntry[]>();
    for (const slug of citingPages) {
        const meta = pages[slug];
        if (!meta) continue;
        const domain = meta.domain ?? "other";
        const list = byDomain.get(domain) ?? [];
        list.push({ slug, title: meta.title, kind: meta.kind });
        byDomain.set(domain, list);
    }

    const groups: DomainGroup[] = [...byDomain.entries()].map(([domain, entries]) => ({
        domain,
        label: domain === "other" ? "Other" : (domainLabels[domain as keyof typeof domainLabels] ?? domain),
        entries: entries.slice().sort((a, b) => a.title.localeCompare(b.title)),
    }));

    groups.sort((a, b) => b.entries.length - a.entries.length || a.label.localeCompare(b.label));
    return groups;
}

// ── "Same authors, also in the Atlas" (right rail) ──────────────────────────

export interface SameAuthorPaper {
    id: string;
    year: number;
    title: string;
    /** Subset of the subject `authorIds`, in subject order, credited on this paper. */
    authorIds: string[];
}

interface AuthorsLike {
    authors: Record<string, { papers: string[] }>;
}

/** Every other registry paper (co-)authored by any of `authorIds`, oldest
 *  first — the right-rail "Same authors, also in the Atlas" list. A paper
 *  reachable through more than one subject author is listed once, with
 *  `authorIds` naming every subject author credited on it. */
export function sameAuthorsPapers(
    currentPaperId: string,
    authorIds: readonly string[],
    authorsIndex: AuthorsLike,
    papers: PapersById,
): SameAuthorPaper[] {
    const creditedBy = new Map<string, Set<string>>();
    for (const authorId of authorIds) {
        const ref = authorsIndex.authors[authorId];
        if (!ref) continue;
        for (const paperId of ref.papers) {
            if (paperId === currentPaperId) continue;
            if (!papers[paperId]) continue;
            const set = creditedBy.get(paperId) ?? new Set<string>();
            set.add(authorId);
            creditedBy.set(paperId, set);
        }
    }

    const rows: SameAuthorPaper[] = [...creditedBy.entries()].map(([paperId, credited]) => ({
        id: paperId,
        year: papers[paperId].year,
        title: papers[paperId].title,
        authorIds: authorIds.filter((a) => credited.has(a)),
    }));

    rows.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    return rows;
}

// ── Short author list for lineage rows ──────────────────────────────────────

/** "Surname, Surname et al." — every surname for up to 3 authors, else the
 *  first two plus "et al.". A tighter truncation than `authorsShortSegments`
 *  (which keeps 4), sized for the lineage list's narrow row. */
export function shortAuthorList(authors: readonly string[]): string {
    const lastNames = authors.map((a) => a.trim().split(/\s+/).pop() ?? a);
    if (lastNames.length <= 3) return lastNames.join(", ");
    return `${lastNames.slice(0, 2).join(", ")} et al.`;
}

// ── Primary-card summary ─────────────────────────────────────────────────────

/** First sentence of a content-graph `summary`, truncated before any inline
 *  math (`$...$`) — the Atlas write-up voice often opens a sentence with a
 *  plain clause and continues into LaTeX, which reads poorly as a stub
 *  fragment on a card. When truncated before `$`, a trailing period is added
 *  if the cut text doesn't already end in sentence punctuation. */
export function firstSentence(summary: string): string {
    const dollarIdx = summary.indexOf("$");
    const scope = dollarIdx === -1 ? summary : summary.slice(0, dollarIdx);
    const match = scope.match(/^[\s\S]*?[.!?](?=\s|$)/);
    let sentence = (match ? match[0] : scope).trim();
    if (dollarIdx !== -1 && sentence.length > 0 && !/[.!?]$/.test(sentence)) {
        sentence += ".";
    }
    return sentence;
}

// ── SEO description ──────────────────────────────────────────────────────────

/** SeoHead / postbuild description for a paper page — shared so the client
 *  render and the prerendered `<meta>` tags never drift apart. */
export function paperSeoDescription(
    paper: { title: string; venue: string; year: number },
    primaryPageCount: number,
): string {
    if (primaryPageCount > 0) {
        return `${paper.title} (${paper.venue} ${paper.year}) — the paper behind ${primaryPageCount} VitaVision Atlas page${primaryPageCount === 1 ? "" : "s"}.`;
    }
    return `${paper.title} (${paper.venue} ${paper.year}) — cited across the VitaVision computer vision atlas.`;
}
