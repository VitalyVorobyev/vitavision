import type { ReactNode } from "react";

/**
 * Shared collapsible `<details>` shell for the sidebar-variant relation
 * sections. Extracted from three near-identical blocks (plain slugs, typed
 * relations, and blog/demo/narrative links) that only differed in wrapper
 * className and list body — this component owns the shared header markup so
 * the DOM stays byte-identical across all three.
 */
interface CollapsibleSectionProps {
    heading: string;
    count: number;
    open: boolean;
    onToggle: (open: boolean) => void;
    className: string;
    children: ReactNode;
}

export default function CollapsibleSection({ heading, count, open, onToggle, className, children }: CollapsibleSectionProps) {
    return (
        <details
            open={open}
            onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
            className={className}
        >
            <summary className="flex items-center justify-between gap-2 cursor-pointer list-none mb-2.5 [&::-webkit-details-marker]:hidden">
                <h3 className="flex items-center gap-2 text-[10.5px] font-semibold tracking-[0.12em] uppercase text-muted-foreground">
                    <span>{heading}</span>
                    <span className="text-muted-foreground/70 font-mono">{count}</span>
                </h3>
                <span aria-hidden="true" className="text-muted-foreground/50 text-[10px] transition-transform group-open:rotate-90">
                    ▸
                </span>
            </summary>
            {children}
        </details>
    );
}
