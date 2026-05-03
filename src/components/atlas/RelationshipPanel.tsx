import { useState } from "react";
import { Link } from "react-router-dom";
import { contentGraph } from "../../generated/content-graph.ts";
import type { GraphNode, NodeType, RelationType, TypedRelation } from "../../generated/content-graph.ts";
import { blogPosts, demoPages } from "../../generated/content-index.ts";
import { useIsAdmin } from "../../lib/auth/useIsAdmin.ts";

export type { TypedRelation };

// ── Type → display label ─────────────────────────────────────────────────────

/** Forward-direction label: how to describe a typed relation that the page itself authored. */
const FORWARD_LABEL: Record<RelationType, string> = {
    generalized_by: "Generalised by",
    alternative_formulation_of: "Alternative formulation of",
    parallel_foundation_with: "Parallel foundation with",
    extended_by: "Extended by",
    compared_with: "Compared with",
    feeds_into: "Feeds into",
    learned_alternative_of: "Learned alternative of",
};

/** Reverse-direction label for asymmetric types (when target's panel renders the entry). */
const REVERSE_LABEL: Partial<Record<RelationType, string>> = {
    generalized_by: "Generalises",
    extended_by: "Extends",
    feeds_into: "Fed by",
    learned_alternative_of: "Has learned alternative",
};

/** Which bucket the relation belongs to. Drives the section heading in the panel. */
const RELATION_CATEGORY: Record<RelationType, "lineage" | "practice" | "cross-paradigm"> = {
    generalized_by: "lineage",
    alternative_formulation_of: "lineage",
    parallel_foundation_with: "lineage",
    extended_by: "lineage",
    compared_with: "practice",
    feeds_into: "practice",
    learned_alternative_of: "cross-paradigm",
};

interface DisplayRelation {
    label: string;
    target: string;
    confidence: TypedRelation["confidence"];
    caution?: string;
    category: "lineage" | "practice" | "cross-paradigm";
}

interface RelationshipPanelProps {
    /** The slug of the page being rendered. */
    slug: string;
    /** Layout variant — "block" is the default bottom-of-page card; "sidebar" is the sticky right-rail design. */
    variant?: "block" | "sidebar";
    /** Sidebar-only: blog post slugs surfaced under "Also see". */
    relatedPosts?: string[];
    /** Sidebar-only: demo slugs surfaced under "Also see". */
    relatedDemos?: string[];
    /** When set, render a prominent "Superseded by" section linking this slug. The caller decides — typically only set when `quality: "historical"`. */
    supersededBy?: string;
}

// ── Type-specific badge styling (block variant) for plain slug lists ─────────

const TYPE_CLASSES: Record<NodeType, string> = {
    "algorithm":    "border-brand/30 bg-brand/10 text-brand hover:border-brand/60",
    "model":        "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:border-violet-500/60",
    "concept":      "border-border bg-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    "failure-mode": "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:border-amber-500/60",
};

function RelBadge({ node }: { node: GraphNode }) {
    return (
        <Link
            to={node.path}
            className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-medium transition-colors ${TYPE_CLASSES[node.type]}`}
        >
            {node.title}
        </Link>
    );
}

// ── Plain-slug section (used for prerequisites / usedBy / affects) ───────────

interface BlockSectionProps {
    heading: string;
    slugs: string[];
    showDrafts: boolean;
}

function BlockSection({ heading, slugs, showDrafts }: BlockSectionProps) {
    const nodes = slugs
        .map((s) => contentGraph.nodes[s])
        .filter((n): n is GraphNode => n !== undefined)
        .filter((n) => showDrafts || !n.draft);

    if (nodes.length === 0) return null;

    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {heading}
            </h3>
            <div className="flex flex-wrap gap-2">
                {nodes.map((node) => (
                    <RelBadge key={node.slug} node={node} />
                ))}
            </div>
        </div>
    );
}

interface SidebarSectionProps {
    heading: string;
    slugs: string[];
    showDrafts: boolean;
    /** Tailwind text-color utility applied to each item title. */
    itemColor: string;
    /** When set, collapses the list to this many items + a "Show all" toggle. */
    maxItems?: number;
    /** Whether the section starts open (controlled by viewport width on mount). */
    defaultOpen?: boolean;
}

function SidebarSection({ heading, slugs, showDrafts, itemColor, maxItems, defaultOpen = true }: SidebarSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const [open, setOpen] = useState(defaultOpen);

    const nodes = slugs
        .map((s) => contentGraph.nodes[s])
        .filter((n): n is GraphNode => n !== undefined)
        .filter((n) => showDrafts || !n.draft);

    if (nodes.length === 0) return null;

    const limit = maxItems ?? nodes.length;
    const visible = expanded ? nodes : nodes.slice(0, limit);
    const overflow = nodes.length - visible.length;

    return (
        <details
            open={open}
            onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
            className="mb-[18px] group"
        >
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none mb-2.5 [&::-webkit-details-marker]:hidden">
                <h3 className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                    <span>{heading}</span>
                    <span className="text-muted-foreground/70 font-mono">{nodes.length}</span>
                </h3>
                <span aria-hidden="true" className="text-muted-foreground/50 text-[10px] transition-transform group-open:rotate-90">
                    ▸
                </span>
            </summary>
            <ul className="m-0 p-0 list-none">
                {visible.map((node) => (
                    <li
                        key={node.slug}
                        className="border-b border-dashed border-foreground/10 last:border-b-0"
                    >
                        <Link
                            to={node.path}
                            className={`flex items-center justify-between gap-2 text-[13px] py-1.5 ${itemColor} no-underline hover:text-foreground transition-colors`}
                        >
                            <span className="truncate">{node.title}</span>
                            <span aria-hidden="true" className="text-muted-foreground text-[11px] flex-shrink-0">↗</span>
                        </Link>
                    </li>
                ))}
            </ul>
            {(overflow > 0 || expanded) && nodes.length > limit && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-1 text-[11px] font-mono text-muted-foreground hover:text-foreground transition-colors"
                >
                    {expanded ? "Show fewer" : `+${overflow} more`}
                </button>
            )}
        </details>
    );
}

// ── Typed-relations bucket section (Lineage / Practice / Cross-paradigm) ──────

function TypedBucket({
    heading,
    items,
    variant,
}: {
    heading: string;
    items: DisplayRelation[];
    variant: "block" | "sidebar";
}) {
    const resolved = items
        .map((rel) => ({ rel, node: contentGraph.nodes[rel.target] }))
        .filter((r): r is { rel: DisplayRelation; node: GraphNode } => r.node !== undefined);
    if (resolved.length === 0) return null;

    if (variant === "sidebar") {
        return (
            <div className="mb-[18px]">
                <h3 className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground mb-2.5">
                    {heading}
                </h3>
                <ul className="m-0 p-0 list-none space-y-2.5">
                    {resolved.map(({ rel, node }, i) => (
                        <li key={`${rel.label}:${rel.target}:${i}`} className="border-b border-dashed border-foreground/10 last:border-b-0 pb-2 last:pb-0">
                            <div className="flex items-baseline gap-2 text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground mb-0.5">
                                <span>{rel.label}</span>
                                {rel.confidence !== "high" && (
                                    <span className="text-muted-foreground/70">· {rel.confidence}</span>
                                )}
                            </div>
                            <Link
                                to={node.path}
                                className="block text-[13px] text-foreground hover:text-foreground/80 no-underline"
                            >
                                {node.title}
                            </Link>
                            {rel.caution && (
                                <p className="m-0 mt-1 text-[11.5px] text-muted-foreground italic leading-snug">
                                    {rel.caution}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        );
    }

    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {heading}
            </h3>
            <ul className="m-0 p-0 list-none space-y-3">
                {resolved.map(({ rel, node }, i) => (
                    <li key={`${rel.label}:${rel.target}:${i}`}>
                        <div className="flex items-baseline gap-2 text-[11px] font-mono uppercase tracking-wider text-muted-foreground mb-1">
                            <span>{rel.label}</span>
                            {rel.confidence !== "high" && (
                                <span className="text-muted-foreground/70">· {rel.confidence}</span>
                            )}
                        </div>
                        <Link to={node.path} className="text-sm font-medium text-foreground hover:underline">
                            {node.title}
                        </Link>
                        {rel.caution && (
                            <p className="m-0 mt-1 text-xs text-muted-foreground italic">{rel.caution}</p>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

// ── Superseded-by section (historical pages only) ──────────────────────────────

function SupersededBy({ successor, variant }: { successor: string; variant: "block" | "sidebar" }) {
    const node = contentGraph.nodes[successor];
    if (!node) return null;

    if (variant === "sidebar") {
        return (
            <div className="mb-[18px] rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2.5">
                <h3 className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-amber-700 dark:text-amber-400 mb-1.5">
                    Superseded by
                </h3>
                <Link
                    to={node.path}
                    className="flex items-center justify-between gap-2 text-[14px] font-semibold text-amber-700 dark:text-amber-400 no-underline hover:underline"
                >
                    <span className="truncate">{node.title}</span>
                    <span aria-hidden="true" className="text-amber-700/70 dark:text-amber-400/70 text-[11px] flex-shrink-0">↗</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                Superseded by
            </h3>
            <Link
                to={node.path}
                className="text-base font-semibold text-amber-700 dark:text-amber-400 no-underline hover:underline"
            >
                {node.title}
            </Link>
        </div>
    );
}

// ── "Also see" external panel (blog + demos) ─────────────────────────────────

interface AlsoSeeProps {
    relatedPosts?: string[];
    relatedDemos?: string[];
    defaultOpen?: boolean;
}

function AlsoSee({ relatedPosts, relatedDemos, defaultOpen = true }: AlsoSeeProps) {
    const [open, setOpen] = useState(defaultOpen);

    const resolvedPosts = (relatedPosts ?? []).map((slug) => {
        const entry = blogPosts.find((p) => p.slug === slug);
        if (!entry) {
            console.warn(`[RelationshipPanel] AlsoSee: blog post slug "${slug}" not found in content-index`);
            return null;
        }
        return { slug, title: entry.frontmatter.title, href: `/blog/${slug}` };
    }).filter((x): x is { slug: string; title: string; href: string } => x !== null);

    const resolvedDemos = (relatedDemos ?? []).map((slug) => {
        const entry = demoPages.find((p) => p.slug === slug);
        if (!entry) {
            console.warn(`[RelationshipPanel] AlsoSee: demo slug "${slug}" not found in content-index`);
            return null;
        }
        return { slug, title: entry.frontmatter.title, href: `/demos/${slug}` };
    }).filter((x): x is { slug: string; title: string; href: string } => x !== null);

    if (resolvedPosts.length + resolvedDemos.length === 0) return null;

    const totalCount = resolvedPosts.length + resolvedDemos.length;

    return (
        <details
            open={open}
            onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}
            className="border-t border-border pt-3.5 group"
        >
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none mb-2.5 [&::-webkit-details-marker]:hidden">
                <h3 className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                    <span>Also see</span>
                    <span className="text-muted-foreground/70 font-mono">{totalCount}</span>
                </h3>
                <span aria-hidden="true" className="text-muted-foreground/50 text-[10px] transition-transform group-open:rotate-90">
                    ▸
                </span>
            </summary>
            <ul className="m-0 p-0 list-none space-y-0">
                {resolvedPosts.map(({ slug, title, href }) => (
                    <li key={slug} className="border-b border-dashed border-foreground/10 last:border-b-0">
                        <Link
                            to={href}
                            className="flex items-center justify-between gap-2 text-[13px] py-1.5 text-foreground no-underline hover:text-foreground transition-colors"
                        >
                            <span className="inline-flex items-center gap-1.5 truncate">
                                <span aria-hidden="true" className="flex-shrink-0">📝</span>
                                <span className="truncate">{title}</span>
                            </span>
                            <span aria-hidden="true" className="text-muted-foreground text-[11px] flex-shrink-0">↗</span>
                        </Link>
                    </li>
                ))}
                {resolvedDemos.map(({ slug, title, href }) => (
                    <li key={slug} className="border-b border-dashed border-foreground/10 last:border-b-0">
                        <Link
                            to={href}
                            className="flex items-center justify-between gap-2 text-[13px] py-1.5 text-foreground no-underline hover:text-foreground transition-colors"
                        >
                            <span className="inline-flex items-center gap-1.5 truncate">
                                <span aria-hidden="true" className="flex-shrink-0">▶</span>
                                <span className="truncate">{title}</span>
                            </span>
                            <span aria-hidden="true" className="text-muted-foreground text-[11px] flex-shrink-0">↗</span>
                        </Link>
                    </li>
                ))}
            </ul>
        </details>
    );
}

// ── Main component ──────────────────────────────────────────────────────────────

export default function RelationshipPanel({
    slug,
    variant = "block",
    relatedPosts,
    relatedDemos,
    supersededBy,
}: RelationshipPanelProps) {
    const isAdmin = useIsAdmin();
    const fwd = contentGraph.forward[slug];
    const rev = contentGraph.reverse[slug];

    const [sectionsOpen] = useState<boolean>(() =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(min-width: 1024px)").matches
            : true
    );

    if (!fwd && !rev) return null;

    // ── Plain slug lists ───────────────────────────────────────────────────────
    const prerequisites = fwd?.prerequisites ?? [];
    const usedBy = rev?.usedBy ?? [];
    const failureModes = fwd?.failureModes ?? [];
    const affects = rev?.affects ?? [];

    // ── Typed relations (forward + asymmetric reverses), bucketed by category ─
    const display: DisplayRelation[] = [];

    for (const rel of fwd?.relations ?? []) {
        // Suppress the entry that drives the prominent "Superseded by" section.
        if (
            supersededBy !== undefined &&
            rel.target === supersededBy &&
            rel.type === "generalized_by" &&
            rel.confidence === "high"
        ) continue;
        display.push({
            label: FORWARD_LABEL[rel.type],
            target: rel.target,
            confidence: rel.confidence,
            caution: rel.caution,
            category: RELATION_CATEGORY[rel.type],
        });
    }

    type ReverseBucket = { slugs: string[]; type: RelationType };
    const reverseBuckets: ReverseBucket[] = [
        { slugs: rev?.generalises ?? [], type: "generalized_by" },
        { slugs: rev?.extending ?? [], type: "extended_by" },
        { slugs: rev?.fedBy ?? [], type: "feeds_into" },
        { slugs: rev?.hasLearnedAlternative ?? [], type: "learned_alternative_of" },
    ];
    for (const bucket of reverseBuckets) {
        const label = REVERSE_LABEL[bucket.type];
        if (!label) continue;
        for (const slug of bucket.slugs) {
            display.push({
                label,
                target: slug,
                confidence: "high",
                category: RELATION_CATEGORY[bucket.type],
            });
        }
    }

    const visibleDisplay = display.filter((d) => {
        const node = contentGraph.nodes[d.target];
        return node !== undefined && (isAdmin || !node.draft);
    });

    const lineage = visibleDisplay.filter((d) => d.category === "lineage");
    const practice = visibleDisplay.filter((d) => d.category === "practice");
    const crossParadigm = visibleDisplay.filter((d) => d.category === "cross-paradigm");

    // ── Visibility flags ──────────────────────────────────────────────────────
    const visibleCount = (slugs: string[]) =>
        slugs
            .map((s) => contentGraph.nodes[s])
            .filter((n): n is GraphNode => n !== undefined && (isAdmin || !n.draft))
            .length;

    const hasGraphContent =
        visibleCount(prerequisites) > 0 ||
        visibleCount(usedBy) > 0 ||
        visibleCount(failureModes) > 0 ||
        visibleCount(affects) > 0 ||
        lineage.length > 0 ||
        practice.length > 0 ||
        crossParadigm.length > 0;

    if (variant === "sidebar") {
        const hasAlsoSee = (relatedPosts?.length ?? 0) + (relatedDemos?.length ?? 0) > 0;
        const hasSuccessor = supersededBy !== undefined && contentGraph.nodes[supersededBy] !== undefined;
        if (!hasGraphContent && !hasAlsoSee && !hasSuccessor) return null;

        return (
            <div className="border border-border rounded-[10px] bg-card p-[18px]">
                {hasSuccessor && <SupersededBy successor={supersededBy!} variant="sidebar" />}
                <SidebarSection
                    heading="Prerequisites"
                    slugs={prerequisites}
                    showDrafts={isAdmin}
                    itemColor="text-foreground"
                    defaultOpen={sectionsOpen}
                />
                <TypedBucket heading="Lineage" items={lineage} variant="sidebar" />
                <TypedBucket heading="Practice" items={practice} variant="sidebar" />
                <TypedBucket heading="Cross-paradigm" items={crossParadigm} variant="sidebar" />
                <SidebarSection
                    heading="Used by"
                    slugs={usedBy}
                    showDrafts={isAdmin}
                    itemColor="text-blue-600 dark:text-blue-400"
                    maxItems={4}
                    defaultOpen={sectionsOpen}
                />
                <AlsoSee relatedPosts={relatedPosts} relatedDemos={relatedDemos} defaultOpen={sectionsOpen} />
            </div>
        );
    }

    const hasSuccessor = supersededBy !== undefined && contentGraph.nodes[supersededBy] !== undefined;
    if (!hasGraphContent && !hasSuccessor) return null;

    return (
        <section className="mt-12 pt-6 border-t border-border space-y-5">
            {hasSuccessor && <SupersededBy successor={supersededBy!} variant="block" />}
            <BlockSection heading="Prerequisites" slugs={prerequisites} showDrafts={isAdmin} />
            <TypedBucket heading="Lineage" items={lineage} variant="block" />
            <TypedBucket heading="Practice" items={practice} variant="block" />
            <TypedBucket heading="Cross-paradigm" items={crossParadigm} variant="block" />
            <BlockSection heading="Used by" slugs={usedBy} showDrafts={isAdmin} />
            <BlockSection heading="Failure modes" slugs={failureModes} showDrafts={isAdmin} />
            <BlockSection heading="Affects" slugs={affects} showDrafts={isAdmin} />
        </section>
    );
}
