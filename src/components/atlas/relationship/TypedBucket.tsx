import { Link } from "react-router-dom";
import { contentGraph } from "../../../generated/content-graph.ts";
import type { GraphNode } from "../../../generated/content-graph.ts";
import type { DisplayRelation } from "../../../lib/atlas/relationDisplay.ts";

// ── Typed-relations bucket section (block variant) ────────────────────────────

export default function TypedBucket({
    heading,
    items,
}: {
    heading: string;
    items: DisplayRelation[];
}) {
    const resolved = items
        .map((rel) => ({ rel, node: contentGraph.nodes[rel.target] }))
        .filter((r): r is { rel: DisplayRelation; node: GraphNode } => r.node !== undefined);
    if (resolved.length === 0) return null;

    return (
        <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {heading}
            </h3>
            <ul className="m-0 p-0 list-none space-y-3">
                {resolved.map(({ rel, node }, i) => (
                    <li key={`${rel.label}:${rel.target}:${i}`}>
                        {rel.confidence !== "high" && (
                            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground/70 mb-1">
                                {rel.confidence}
                            </div>
                        )}
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
