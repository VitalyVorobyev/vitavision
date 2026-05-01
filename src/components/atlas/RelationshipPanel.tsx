import { Link } from "react-router-dom";
import { contentGraph } from "../../generated/content-graph.ts";
import type { GraphNode, NodeType } from "../../generated/content-graph.ts";

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
}

function Section({ heading, slugs }: SectionProps) {
    const nodes = slugs
        .map((s) => contentGraph.nodes[s])
        .filter((n): n is GraphNode => n !== undefined);

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

    // If all sections are empty, render nothing.
    const hasContent =
        prerequisites.length > 0 ||
        comparedWith.length > 0 ||
        related.length > 0 ||
        usedBy.length > 0 ||
        failureModes.length > 0 ||
        affects.length > 0;

    if (!hasContent) return null;

    return (
        <section className="mt-12 pt-6 border-t border-border space-y-5">
            <Section heading="Prerequisites" slugs={prerequisites} />
            <Section heading="Compared with" slugs={comparedWith} />
            <Section heading="Related" slugs={related} />
            <Section heading="Used by" slugs={usedBy} />
            <Section heading="Failure modes" slugs={failureModes} />
            <Section heading="Affects" slugs={affects} />
        </section>
    );
}
