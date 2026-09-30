import { Link } from "react-router";
import { contentGraph } from "../../../generated/content-graph.ts";

// ── Superseded-by section (historical pages only) ──────────────────────────────

export default function SupersededBy({ successor, variant }: { successor: string; variant: "block" | "sidebar" }) {
    const node = contentGraph.nodes[successor];
    if (!node) return null;

    if (variant === "sidebar") {
        return (
            <div className="mb-[18px] rounded-control border border-ink-amber/40 bg-ink-amber/10 px-3 py-2.5">
                <h3 className="text-[10.5px] font-semibold tracking-[0.12em] uppercase text-ink-amber mb-1.5">
                    Superseded by
                </h3>
                <Link
                    to={node.path}
                    className="flex items-center justify-between gap-2 text-[14px] font-semibold text-ink-amber no-underline hover:underline"
                >
                    <span className="truncate">{node.title}</span>
                    <span aria-hidden="true" className="text-ink-amber/70 text-[11px] flex-shrink-0">↗</span>
                </Link>
            </div>
        );
    }

    return (
        <div className="rounded-control border border-ink-amber/40 bg-ink-amber/10 px-4 py-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-ink-amber mb-1.5">
                Superseded by
            </h3>
            <Link
                to={node.path}
                className="text-base font-semibold text-ink-amber no-underline hover:underline"
            >
                {node.title}
            </Link>
        </div>
    );
}
