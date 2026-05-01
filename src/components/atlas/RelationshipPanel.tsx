import { Link } from "react-router-dom";
import { contentGraph } from "../../generated/content-graph.ts";
import type { GraphNode, NodeType } from "../../generated/content-graph.ts";
import { useIsAdmin } from "../../lib/auth/useIsAdmin.ts";

interface RelationshipPanelProps {
    /** The slug of the page being rendered. */
    slug: string;
}

// ── Type-specific badge styling ───────────────────────────────────────────────

const TYPE_CLASSES: Record<NodeType, string> = {
    "algorithm":    "border-brand/30 bg-brand/10 text-brand hover:border-brand/60",
    "model":        "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:border-violet-500/60",
    "concept":      "border-border bg-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    "failure-mode": "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:border-amber-500/60",
};

// ── Relationship badge ────────────────────────────────────────────────────────

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

// ── Section ───────────────────────────────────────────────────────────────────

interface SectionProps {
    heading: string;
    slugs: string[];
    /** When false, draft target nodes are filtered out of the section. */
    showDrafts: boolean;
}

function Section({ heading, slugs, showDrafts }: SectionProps) {
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

// ── Main component ────────────────────────────────────────────────────────────

export default function RelationshipPanel({ slug }: RelationshipPanelProps) {
    const isAdmin = useIsAdmin();
    const fwd = contentGraph.forward[slug];
    const rev = contentGraph.reverse[slug];

    // Nothing to show if this slug is not in the graph yet.
    if (!fwd && !rev) return null;

    // ── Compute sections ─────────────────────────────────────────────────────

    const prerequisites = fwd?.prerequisites ?? [];

    // comparedWith = union of forward.comparedWith ∪ reverse.comparedFrom, deduped
    const comparedWith = Array.from(new Set([
        ...(fwd?.comparedWith ?? []),
        ...(rev?.comparedFrom ?? []),
    ]));

    // related = union of forward.related ∪ reverse.relatedFrom, deduped,
    // minus anything already in comparedWith or prerequisites to prevent duplicates
    const comparedOrPrereq = new Set([...comparedWith, ...prerequisites]);
    const related = Array.from(new Set([
        ...(fwd?.related ?? []),
        ...(rev?.relatedFrom ?? []),
    ])).filter((s) => !comparedOrPrereq.has(s));

    const usedBy = rev?.usedBy ?? [];

    const failureModes = fwd?.failureModes ?? [];

    const affects = rev?.affects ?? [];

    // After draft filtering, a section may collapse to zero — compute against the
    // post-filter target sets so we don't render an empty <section>.
    const visibleCount = (slugs: string[]) =>
        slugs
            .map((s) => contentGraph.nodes[s])
            .filter((n): n is GraphNode => n !== undefined && (isAdmin || !n.draft))
            .length;

    const hasContent =
        visibleCount(prerequisites) > 0 ||
        visibleCount(comparedWith) > 0 ||
        visibleCount(related) > 0 ||
        visibleCount(usedBy) > 0 ||
        visibleCount(failureModes) > 0 ||
        visibleCount(affects) > 0;

    if (!hasContent) return null;

    return (
        <section className="mt-12 pt-6 border-t border-border space-y-5">
            <Section heading="Prerequisites" slugs={prerequisites} showDrafts={isAdmin} />
            <Section heading="Compared with" slugs={comparedWith} showDrafts={isAdmin} />
            <Section heading="Related" slugs={related} showDrafts={isAdmin} />
            <Section heading="Used by" slugs={usedBy} showDrafts={isAdmin} />
            <Section heading="Failure modes" slugs={failureModes} showDrafts={isAdmin} />
            <Section heading="Affects" slugs={affects} showDrafts={isAdmin} />
        </section>
    );
}
