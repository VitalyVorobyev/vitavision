import { useState } from "react";
import { Link } from "react-router-dom";
import { contentGraph } from "../../../generated/content-graph.ts";
import type { GraphNode } from "../../../generated/content-graph.ts";
import CollapsibleSection from "./CollapsibleSection.tsx";

interface SidebarSectionProps {
    heading: string;
    /** Already visibility-filtered (draft/unknown excluded) by `buildRelationDisplay`. */
    slugs: string[];
    /** Tailwind text-color utility applied to each item title. */
    itemColor: string;
    /** When set, collapses the list to this many items + a "Show all" toggle. */
    maxItems?: number;
    /** Whether the section starts open (controlled by viewport width on mount). */
    defaultOpen?: boolean;
}

export default function SidebarSection({ heading, slugs, itemColor, maxItems, defaultOpen = true }: SidebarSectionProps) {
    const [expanded, setExpanded] = useState(false);
    const [open, setOpen] = useState(defaultOpen);

    const nodes = slugs
        .map((s) => contentGraph.nodes[s])
        .filter((n): n is GraphNode => n !== undefined);

    if (nodes.length === 0) return null;

    const limit = maxItems ?? nodes.length;
    const visible = expanded ? nodes : nodes.slice(0, limit);
    const overflow = nodes.length - visible.length;

    return (
        <CollapsibleSection heading={heading} count={nodes.length} open={open} onToggle={setOpen} className="mb-[18px] group">
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
        </CollapsibleSection>
    );
}
