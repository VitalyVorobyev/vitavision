import { contentGraph } from "../../../generated/content-graph.ts";
import type { GraphNode } from "../../../generated/content-graph.ts";
import RelationBadge from "./RelationBadge.tsx";

// ── Plain-slug section (used for prerequisites / usedBy / failureModes / affects) ───

interface BlockSectionProps {
    heading: string;
    /** Already visibility-filtered (draft/unknown excluded) by `buildRelationDisplay`. */
    slugs: string[];
}

export default function BlockSection({ heading, slugs }: BlockSectionProps) {
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
                    <RelationBadge key={node.slug} node={node} />
                ))}
            </div>
        </div>
    );
}
