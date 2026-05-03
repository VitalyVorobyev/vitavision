import { useState } from "react";
import { Link } from "react-router-dom";
import { contentGraph } from "../../generated/content-graph.ts";
import type { GraphNode, NodeType } from "../../generated/content-graph.ts";
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
}

function SidebarSection({ heading, slugs, showDrafts, itemColor, maxItems }: SidebarSectionProps) {
    const [expanded, setExpanded] = useState(false);

    const nodes = slugs
        .map((s) => contentGraph.nodes[s])
        .filter((n): n is GraphNode => n !== undefined)
        .filter((n) => showDrafts || !n.draft);

    if (nodes.length === 0) return null;

    const limit = maxItems ?? nodes.length;
    const visible = expanded ? nodes : nodes.slice(0, limit);
    const overflow = nodes.length - visible.length;

    return (
        <div className="mb-[18px]">
            <h3 className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2.5">
                <span>{heading}</span>
                <span className="text-slate-600 font-mono">{nodes.length}</span>
            </h3>
            <ul className="m-0 p-0 list-none">
                {visible.map((node) => (
                    <li
                        key={node.slug}
                        className="border-b border-dashed border-slate-400/10 last:border-b-0"
                    >
                        <Link
                            to={node.path}
                            className={`flex items-center justify-between gap-2 text-[13px] py-1.5 ${itemColor} no-underline hover:text-foreground transition-colors`}
                        >
                            <span className="truncate">{node.title}</span>
                            <span aria-hidden="true" className="text-slate-500 text-[11px] flex-shrink-0">↗</span>
                        </Link>
                    </li>
                ))}
            </ul>
            {(overflow > 0 || expanded) && nodes.length > limit && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    className="mt-1 text-[11px] font-mono text-slate-500 hover:text-foreground transition-colors"
                >
                    {expanded ? "Show fewer" : `+${overflow} more`}
                </button>
            )}
        </div>
    );
}

interface AlsoSeeProps {
    relatedPosts?: string[];
    relatedDemos?: string[];
}

function AlsoSee({ relatedPosts, relatedDemos }: AlsoSeeProps) {
    const postCount = relatedPosts?.length ?? 0;
    const demoCount = relatedDemos?.length ?? 0;
    if (postCount + demoCount === 0) return null;

    return (
        <div className="border-t border-white/[0.06] pt-3.5">
            <h3 className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-2.5">
                Also see
            </h3>
            <ul className="m-0 p-0 list-none space-y-1.5">
                {postCount > 0 && (
                    <li className="text-[12.5px] text-slate-400">
                        <span aria-hidden="true" className="mr-1.5">📝</span>
                        {postCount} blog post{postCount === 1 ? "" : "s"}
                    </li>
                )}
                {demoCount > 0 && (
                    <li className="text-[12.5px] text-slate-400">
                        <span aria-hidden="true" className="mr-1.5">▶</span>
                        {demoCount} demo{demoCount === 1 ? "" : "s"}
                    </li>
                )}
            </ul>
        </div>
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
            <div className="border border-white/[0.06] rounded-[10px] bg-white/[0.015] p-[18px]">
                <SidebarSection
                    heading="Prerequisites"
                    slugs={prerequisites}
                    showDrafts={isAdmin}
                    itemColor="text-slate-300"
                />
                <SidebarSection
                    heading="Compared with"
                    slugs={comparedWith}
                    showDrafts={isAdmin}
                    itemColor="text-amber-300"
                />
                <SidebarSection
                    heading="Related"
                    slugs={related}
                    showDrafts={isAdmin}
                    itemColor="text-blue-300"
                    maxItems={4}
                />
                <AlsoSee relatedPosts={relatedPosts} relatedDemos={relatedDemos} />
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
