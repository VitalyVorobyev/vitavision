import { useState } from "react";
import { Link } from "react-router-dom";
import { contentGraph } from "../../../generated/content-graph.ts";
import type { GraphNode } from "../../../generated/content-graph.ts";
import type { DisplayRelation } from "../../../lib/atlas/relationDisplay.ts";
import CollapsibleSection from "./CollapsibleSection.tsx";

// ── Typed-relation section (sidebar variant, collapsible) ─────────────────────

export default function TypedRelationSection({
    heading,
    items,
    defaultOpen = true,
}: {
    heading: string;
    items: DisplayRelation[];
    defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);

    const resolved = items
        .map((rel) => ({ rel, node: contentGraph.nodes[rel.target] }))
        .filter((r): r is { rel: DisplayRelation; node: GraphNode } => r.node !== undefined);
    if (resolved.length === 0) return null;

    return (
        <CollapsibleSection heading={heading} count={resolved.length} open={open} onToggle={setOpen} className="mb-[18px] group">
            <ul className="m-0 p-0 list-none space-y-2.5">
                {resolved.map(({ rel, node }, i) => (
                    <li key={`${rel.label}:${rel.target}:${i}`} className="border-b border-dashed border-foreground/10 last:border-b-0 pb-2 last:pb-0">
                        {rel.confidence !== "high" && (
                            <div className="text-[10px] font-mono uppercase tracking-[0.1em] text-muted-foreground/70 mb-0.5">
                                {rel.confidence}
                            </div>
                        )}
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
        </CollapsibleSection>
    );
}
