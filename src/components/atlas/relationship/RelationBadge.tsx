import { Link } from "react-router-dom";
import type { GraphNode, NodeType } from "../../../generated/content-graph.ts";

// ── Type-specific badge styling (block variant) for plain slug lists ─────────

const TYPE_CLASSES: Record<NodeType, string> = {
    "algorithm":    "border-brand/30 bg-brand/10 text-brand hover:border-brand/60",
    "model":        "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:border-violet-500/60",
    "concept":      "border-border bg-muted text-muted-foreground hover:border-foreground/30 hover:text-foreground",
    "failure-mode": "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:border-amber-500/60",
};

export default function RelationBadge({ node }: { node: GraphNode }) {
    return (
        <Link
            to={node.path}
            className={`inline-flex items-center rounded border px-2.5 py-1 text-xs font-medium transition-colors ${TYPE_CLASSES[node.type]}`}
        >
            {node.title}
        </Link>
    );
}
