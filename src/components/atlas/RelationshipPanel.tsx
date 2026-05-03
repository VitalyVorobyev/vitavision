import { useState } from "react";
import { Link } from "react-router-dom";
import { contentGraph } from "../../generated/content-graph.ts";
import type { GraphNode, NodeType } from "../../generated/content-graph.ts";
import { blogPosts, demoPages } from "../../generated/content-index.ts";
import { useIsAdmin } from "../../lib/auth/useIsAdmin.ts";

interface RelationshipPanelProps {
    /** The slug of the page being rendered. */
    slug: string;
    /** Layout variant — "block" is the default bottom-of-page card; "sidebar" is the sticky right-rail design. */
    variant?: "block" | "sidebar";
    /** Sidebar-only: blog post slugs surfaced under "Also see". */
    relatedPosts?: string[];
    /** Sidebar-only: demo slugs surfaced under "Also see". */
    relatedDemos?: string[];
}

// ── Type-specific badge styling (block variant) ─────────────────────────────────

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

// ── Block-variant section ───────────────────────────────────────────────────────

interface BlockSectionProps {
    heading: string;
    slugs: string[];
    /** When false, draft target nodes are filtered out of the section. */
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

// ── Sidebar-variant section ─────────────────────────────────────────────────────

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
}: RelationshipPanelProps) {
    const isAdmin = useIsAdmin();
    const fwd = contentGraph.forward[slug];
    const rev = contentGraph.reverse[slug];

    // Sections open by default on ≥1024px viewports; collapsed on smaller viewports.
    // Read synchronously during render. Guard for SSR and test envs where matchMedia may be absent.
    const [sectionsOpen] = useState<boolean>(() =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(min-width: 1024px)").matches
            : true
    );

    if (!fwd && !rev) return null;

    // ── Compute sections (shared across variants) ──────────────────────────────

    const prerequisites = fwd?.prerequisites ?? [];

    // comparedWith = forward.comparedWith ∪ reverse.comparedFrom, deduped
    const comparedWith = Array.from(new Set([
        ...(fwd?.comparedWith ?? []),
        ...(rev?.comparedFrom ?? []),
    ]));

    // related = forward.related ∪ reverse.relatedFrom, deduped, minus
    // anything already in comparedWith or prerequisites to avoid duplication.
    const comparedOrPrereq = new Set([...comparedWith, ...prerequisites]);
    const related = Array.from(new Set([
        ...(fwd?.related ?? []),
        ...(rev?.relatedFrom ?? []),
    ])).filter((s) => !comparedOrPrereq.has(s));

    const usedBy = rev?.usedBy ?? [];
    const failureModes = fwd?.failureModes ?? [];
    const affects = rev?.affects ?? [];

    const visibleCount = (slugs: string[]) =>
        slugs
            .map((s) => contentGraph.nodes[s])
            .filter((n): n is GraphNode => n !== undefined && (isAdmin || !n.draft))
            .length;

    const hasGraphContent =
        visibleCount(prerequisites) > 0 ||
        visibleCount(comparedWith) > 0 ||
        visibleCount(related) > 0 ||
        visibleCount(usedBy) > 0 ||
        visibleCount(failureModes) > 0 ||
        visibleCount(affects) > 0;

    if (variant === "sidebar") {
        const hasAlsoSee = (relatedPosts?.length ?? 0) + (relatedDemos?.length ?? 0) > 0;
        if (!hasGraphContent && !hasAlsoSee) return null;

        return (
            <div className="border border-border rounded-[10px] bg-card p-[18px]">
                <SidebarSection
                    heading="Prerequisites"
                    slugs={prerequisites}
                    showDrafts={isAdmin}
                    itemColor="text-foreground"
                    defaultOpen={sectionsOpen}
                />
                <SidebarSection
                    heading="Compared with"
                    slugs={comparedWith}
                    showDrafts={isAdmin}
                    itemColor="text-amber-600 dark:text-amber-400"
                    defaultOpen={sectionsOpen}
                />
                <SidebarSection
                    heading="Related"
                    slugs={related}
                    showDrafts={isAdmin}
                    itemColor="text-blue-600 dark:text-blue-400"
                    maxItems={4}
                    defaultOpen={sectionsOpen}
                />
                <AlsoSee relatedPosts={relatedPosts} relatedDemos={relatedDemos} defaultOpen={sectionsOpen} />
            </div>
        );
    }

    if (!hasGraphContent) return null;

    return (
        <section className="mt-12 pt-6 border-t border-border space-y-5">
            <BlockSection heading="Prerequisites" slugs={prerequisites} showDrafts={isAdmin} />
            <BlockSection heading="Compared with" slugs={comparedWith} showDrafts={isAdmin} />
            <BlockSection heading="Related" slugs={related} showDrafts={isAdmin} />
            <BlockSection heading="Used by" slugs={usedBy} showDrafts={isAdmin} />
            <BlockSection heading="Failure modes" slugs={failureModes} showDrafts={isAdmin} />
            <BlockSection heading="Affects" slugs={affects} showDrafts={isAdmin} />
        </section>
    );
}
