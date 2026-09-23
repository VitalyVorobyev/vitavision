/**
 * Pure derivations for the author page (`/authors/:id`).
 *
 * Everything here is a plain function over already-loaded index data — no
 * fetching, no React. `AuthorPage.tsx` and its subcomponents call these to
 * turn `ScholarlyAuthor` / `ScholarlyPaper` + `PapersById` records into the
 * exact rows and layouts the UI renders. Modelled on `paperView.ts`.
 */
import { domainLabels } from "../../components/algorithms/domainLabels.ts";
import type { ScholarlyAuthor, ScholarlyPageMeta, ScholarlyNarrativeRef, ScholarlyPaper } from "./scholarlyTypes.ts";
import type { PapersById } from "../../generated/papers-index.ts";

function pluralize(n: number, singular: string, plural = `${singular}s`): string {
    return n === 1 ? singular : plural;
}

// ── Summary sentence ─────────────────────────────────────────────────────────

export interface AuthorSummarySecondSentence {
    before: string;
    bold: string;
    after: string;
}

export interface AuthorSummary {
    /** "9 papers in the Atlas registry, 2015–2021." — always present. */
    first: string;
    /** `null` when the author has no Atlas footprint at all (pageCount 0). */
    second: AuthorSummarySecondSentence | null;
}

/** Oxford-comma join of 1–3 clauses ("a.", "a and b.", "a, b, and c."). */
function joinClauses(clauses: string[]): string {
    if (clauses.length === 1) return clauses[0];
    if (clauses.length === 2) return `${clauses[0]} and ${clauses[1]}`;
    return `${clauses.slice(0, -1).join(", ")}, and ${clauses[clauses.length - 1]}`;
}

/**
 * Builds the header summary sentence(s). The first sentence always renders;
 * the second (the Atlas-footprint sentence) is omitted entirely when the
 * author's papers underpin no Atlas page yet, and each of its clauses is
 * itself omitted when its count is zero.
 */
export function buildAuthorSummary(
    author: ScholarlyAuthor | undefined,
    paperCount: number,
    narrativeCount: number,
): AuthorSummary {
    const paperWord = pluralize(paperCount, "paper");
    const years =
        author && author.firstYear === author.lastYear
            ? `${author.firstYear}`
            : author
              ? `${author.firstYear}–${author.lastYear}`
              : undefined;
    const first = years
        ? `${paperCount} ${paperWord} in the Atlas registry, ${years}.`
        : `${paperCount} ${paperWord} in the Atlas registry.`;

    const pageCount = author?.pageCount ?? 0;
    if (pageCount === 0) return { first, second: null };

    const domainCount = author?.domains.length ?? 0;
    const primaryCount = author?.primaryPages.length ?? 0;

    const bold = `${pageCount} Atlas ${pluralize(pageCount, "page")}`;
    let mainClause = `underpins ${bold}`;
    if (domainCount > 0) mainClause += ` across ${domainCount} ${pluralize(domainCount, "domain")}`;

    const clauses = [mainClause];
    if (primaryCount > 0) clauses.push(`is the primary source of ${primaryCount}`);
    if (narrativeCount > 0) clauses.push(`runs through ${narrativeCount} ${pluralize(narrativeCount, "narrative")}`);

    const sentence = `Their work ${joinClauses(clauses)}.`;
    const boldIdx = sentence.indexOf(bold);
    return {
        first,
        second: {
            before: sentence.slice(0, boldIdx),
            bold,
            after: sentence.slice(boldIdx + bold.length),
        },
    };
}

// ── Contribution to the Atlas, grouped by domain ────────────────────────────

export interface ContributionEntry {
    slug: string;
    title: string;
    kind: ScholarlyPageMeta["kind"];
    /** True when one of the author's papers is this page's primary source. */
    isPrimary: boolean;
}

export interface ContributionGroup {
    domain: string;
    label: string;
    entries: ContributionEntry[];
}

/**
 * Groups every Atlas page touched by any of the author's papers (primary or
 * reference-only) by domain. A page reached as both primary (via one paper)
 * and reference-only (via another) counts as primary. Within a group, primary
 * pages sort first, then A–Z by title; groups sort by size desc, then label.
 */
export function groupContributionByDomain(
    paperIds: readonly string[],
    scholarlyPapers: Record<string, ScholarlyPaper>,
    pages: Record<string, ScholarlyPageMeta>,
): ContributionGroup[] {
    const bySlug = new Map<string, ContributionEntry>();
    for (const paperId of paperIds) {
        const paper = scholarlyPapers[paperId];
        if (!paper) continue;
        for (const slug of paper.primaryPages) {
            const meta = pages[slug];
            if (!meta) continue;
            bySlug.set(slug, { slug, title: meta.title, kind: meta.kind, isPrimary: true });
        }
        for (const slug of paper.citingPages) {
            if (bySlug.has(slug)) continue;
            const meta = pages[slug];
            if (!meta) continue;
            bySlug.set(slug, { slug, title: meta.title, kind: meta.kind, isPrimary: false });
        }
    }

    const byDomain = new Map<string, ContributionEntry[]>();
    for (const entry of bySlug.values()) {
        const domain = pages[entry.slug]?.domain ?? "other";
        const list = byDomain.get(domain) ?? [];
        list.push(entry);
        byDomain.set(domain, list);
    }

    const groups: ContributionGroup[] = [...byDomain.entries()].map(([domain, entries]) => ({
        domain,
        label: domain === "other" ? "Other" : (domainLabels[domain as keyof typeof domainLabels] ?? domain),
        entries: entries
            .slice()
            .sort((a, b) => (a.isPrimary !== b.isPrimary ? (a.isPrimary ? -1 : 1) : a.title.localeCompare(b.title))),
    }));

    groups.sort((a, b) => b.entries.length - a.entries.length || a.label.localeCompare(b.label));
    return groups;
}

// ── Narratives union ─────────────────────────────────────────────────────────

/** Distinct narratives reached by any of the author's papers, A–Z by title. */
export function authorNarrativesUnion(
    paperIds: readonly string[],
    scholarlyPapers: Record<string, ScholarlyPaper>,
): ScholarlyNarrativeRef[] {
    const bySlug = new Map<string, ScholarlyNarrativeRef>();
    for (const paperId of paperIds) {
        for (const n of scholarlyPapers[paperId]?.narratives ?? []) {
            if (!bySlug.has(n.slug)) bySlug.set(n.slug, n);
        }
    }
    return [...bySlug.values()].sort((a, b) => a.title.localeCompare(b.title));
}

// ── Papers table ─────────────────────────────────────────────────────────────

export interface AuthorPaperRow {
    id: string;
    year: number;
    title: string;
    authors: string[];
    venue: string;
    /** Pages for which this paper is the primary source (usually 0 or 1). */
    primaryTags: { slug: string; title: string }[];
    /** Total Atlas pages touching this paper (primary + reference-only). */
    pageCount: number;
}

/** Newest first, then title, then id — the "Papers · N" table. */
export function buildAuthorPaperRows(
    paperIds: readonly string[],
    papers: PapersById,
    scholarlyPapers: Record<string, ScholarlyPaper>,
    pages: Record<string, ScholarlyPageMeta>,
): AuthorPaperRow[] {
    const rows: AuthorPaperRow[] = [];
    for (const id of paperIds) {
        const paper = papers[id];
        if (!paper) continue;
        const sp = scholarlyPapers[id];
        const primaryTags = (sp?.primaryPages ?? []).map((slug) => ({ slug, title: pages[slug]?.title ?? slug }));
        rows.push({
            id,
            year: paper.year,
            title: paper.title,
            authors: paper.authors,
            venue: paper.venue,
            primaryTags,
            pageCount: (sp?.primaryPages.length ?? 0) + (sp?.citingPages.length ?? 0),
        });
    }
    rows.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title) || a.id.localeCompare(b.id));
    return rows;
}

// ── "Papers over time" timeline strip ───────────────────────────────────────

export type TimelineState = "primary" | "cited" | "none";

export interface TimelineEntry {
    id: string;
    year: number;
    label: string;
    state: TimelineState;
}

/** Truncates before the first ":" (a common subtitle separator in paper
 *  titles), then hard-truncates to `max` characters so the strip stays legible. */
function shortPaperLabel(title: string, max = 28): string {
    const beforeColon = title.split(":")[0]?.trim() || title;
    return beforeColon.length > max ? `${beforeColon.slice(0, max - 1)}…` : beforeColon;
}

/** One entry per resolvable paper, oldest first (ties: label A–Z). The label
 *  is the paper's primary Atlas page title when it has one, else a truncated
 *  form of the paper's own title. */
export function buildTimelineEntries(
    paperIds: readonly string[],
    papers: PapersById,
    scholarlyPapers: Record<string, ScholarlyPaper>,
    pages: Record<string, ScholarlyPageMeta>,
): TimelineEntry[] {
    const entries: TimelineEntry[] = [];
    for (const id of paperIds) {
        const paper = papers[id];
        if (!paper) continue;
        const sp = scholarlyPapers[id];
        const primarySlug = sp?.primaryPages[0];
        let state: TimelineState;
        let label: string;
        if (primarySlug) {
            state = "primary";
            label = pages[primarySlug]?.title ?? shortPaperLabel(paper.title);
        } else if ((sp?.citingPages.length ?? 0) > 0) {
            state = "cited";
            label = shortPaperLabel(paper.title);
        } else {
            state = "none";
            label = shortPaperLabel(paper.title);
        }
        entries.push({ id, year: paper.year, label, state });
    }
    entries.sort((a, b) => a.year - b.year || a.label.localeCompare(b.label) || a.id.localeCompare(b.id));
    return entries;
}

export interface TimelinePoint {
    id: string;
    x: number;
    y: number;
    labelY: number;
    stackIndex: number;
}

export interface TimelineTick {
    year: number;
    x: number;
}

export interface TimelineLayout {
    width: number;
    height: number;
    axisY: number;
    axisX1: number;
    axisX2: number;
    ticks: TimelineTick[];
    points: TimelinePoint[];
}

const MARGIN_X = 28;
/** Horizontal nudge between dots that share a year, so they stay individually clickable. */
const DOT_SPACING = 15;
/** Vertical gap from the axis to the nearest (stack index 0) label. */
const LABEL_GAP = 18;
/** Additional vertical distance per further label stacked in the same year. */
const LABEL_STEP = 24;
/** Room below the axis for the tick line + year labels. */
const AXIS_LABEL_PAD = 30;
/** Headroom above the topmost possible label. */
const TOP_PAD = 14;

/**
 * Lays out one dot per entry on a single year axis, stacking same-year labels
 * upward (nearest-to-axis first) so they never collide, and nudging same-year
 * dots apart horizontally so each stays an individually clickable target.
 */
export function computeAuthorTimelineLayout(entries: readonly TimelineEntry[], width: number): TimelineLayout {
    const axisX1 = MARGIN_X;
    const axisX2 = Math.max(axisX1, width - MARGIN_X);

    if (entries.length === 0) {
        const axisY = TOP_PAD + LABEL_GAP;
        return { width, height: axisY + AXIS_LABEL_PAD, axisY, axisX1, axisX2, ticks: [], points: [] };
    }

    const years = entries.map((e) => e.year);
    const minYear = Math.min(...years);
    const maxYear = Math.max(...years);
    const span = maxYear - minYear;
    const xOfYear = (year: number): number =>
        span === 0 ? (axisX1 + axisX2) / 2 : axisX1 + ((year - minYear) / span) * (axisX2 - axisX1);

    const ticks: TimelineTick[] = [];
    for (let y = minYear; y <= maxYear; y++) ticks.push({ year: y, x: xOfYear(y) });

    const perYearCount = new Map<number, number>();
    for (const e of entries) perYearCount.set(e.year, (perYearCount.get(e.year) ?? 0) + 1);
    const maxStack = perYearCount.size === 0 ? 0 : Math.max(...perYearCount.values());

    const axisY = TOP_PAD + LABEL_GAP + Math.max(0, maxStack - 1) * LABEL_STEP;
    const height = axisY + AXIS_LABEL_PAD;

    const counters = new Map<number, number>();
    const points: TimelinePoint[] = entries.map((e) => {
        const stackIndex = counters.get(e.year) ?? 0;
        counters.set(e.year, stackIndex + 1);
        const count = perYearCount.get(e.year) ?? 1;
        const dx = (stackIndex - (count - 1) / 2) * DOT_SPACING;
        return {
            id: e.id,
            x: xOfYear(e.year) + dx,
            y: axisY,
            labelY: axisY - LABEL_GAP - stackIndex * LABEL_STEP,
            stackIndex,
        };
    });

    return { width, height, axisY, axisX1, axisX2, ticks, points };
}

// ── Co-authors rail ──────────────────────────────────────────────────────────

export interface CoAuthorSharedPaper {
    id: string;
    year: number;
    title: string;
}

export interface CoAuthorRow {
    id: string;
    name: string;
    shared: number;
    sharedPapers: CoAuthorSharedPaper[];
}

/** Resolves each `CoAuthor`'s shared-paper ids against `PapersById` for
 *  display, newest paper first. Unknown paper ids (should not happen — the
 *  scholarly build only lists registry papers) are dropped defensively. */
export function buildCoAuthorRows(
    coAuthors: readonly { id: string; name: string; shared: number; sharedPaperIds: string[] }[],
    papers: PapersById,
): CoAuthorRow[] {
    return coAuthors.map((co) => ({
        id: co.id,
        name: co.name,
        shared: co.shared,
        sharedPapers: co.sharedPaperIds
            .map((id) => papers[id])
            .filter((p): p is NonNullable<typeof p> => !!p)
            .map((p) => ({ id: p.id, year: p.year, title: p.title }))
            .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title)),
    }));
}

// ── SEO description ──────────────────────────────────────────────────────────

/** SeoHead / postbuild description for an author page — shared so the client
 *  render and the prerendered `<meta>` tags never drift apart. */
export function authorSeoDescription(name: string, paperCount: number, pageCount: number): string {
    const paperWord = pluralize(paperCount, "paper");
    return `${name} — ${paperCount} ${paperWord} underpinning ${pageCount} page${pageCount === 1 ? "" : "s"} of the VitaVision computer vision atlas.`;
}
