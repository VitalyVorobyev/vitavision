import { Link } from "react-router-dom";
import { contentGraph } from "../../../generated/content-graph.ts";

// ── Superseded-by section (historical pages only) ──────────────────────────────

export default function SupersededBy({ successor, variant }: { successor: string; variant: "block" | "sidebar" }) {
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
