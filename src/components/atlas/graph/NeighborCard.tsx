// NeighborCard — one positioned neighbor card on the desktop graph canvas.
// Extracted from GraphExplorer.tsx.

import { contentGraph } from "../../../generated/content-graph.ts";
import { entryMeta, getFocusEntry } from "../../../lib/atlas/focusEntry.ts";
import { shortTitle } from "../../../lib/atlas/graphNeighbors.ts";
import { GG, KIND_ACCENT, type PositionedNode, RELATION_V3 } from "../../../lib/atlas/graphLayout.ts";
import { domainLabels } from "../../algorithms/domainLabels.ts";
import { EntryIcon } from "../EntryIcon.tsx";

export interface NeighborCardProps {
    pos:       PositionedNode;
    isHovered: boolean;
    isDimmed:  boolean;
    onClick:   (slug: string) => void;
    onHover:   (slug: string | null) => void;
}

export function NeighborCard({ pos, isHovered, isDimmed, onClick, onHover }: NeighborCardProps) {
    const node = contentGraph.nodes[pos.slug];
    const meta = RELATION_V3[pos.rel];
    const { kind, year } = entryMeta(pos.slug);

    if (!node || !meta) return null;

    // Touch: pin highlight on tap (pointer-type=touch/pen), clear on second tap or tap elsewhere
    const handlePointerDown = (e: React.PointerEvent) => {
        if (e.pointerType === "touch" || e.pointerType === "pen") {
            e.preventDefault();
            if (isHovered) {
                onHover(null);
            } else {
                onHover(pos.slug);
            }
        }
    };

    return (
        <button
            onClick={() => onClick(pos.slug)}
            onMouseEnter={() => onHover(pos.slug)}
            onMouseLeave={() => onHover(null)}
            onPointerDown={handlePointerDown}
            className={`absolute group rounded-md border bg-surface px-2.5 py-1.5 flex flex-col text-left transition-all overflow-hidden ${
                isHovered
                    ? "border-border-strong shadow-[0_6px_18px_-8px_rgba(15,23,42,0.22)]"
                    : "border-border"
            }`}
            style={{
                left:    pos.x,
                top:     pos.y,
                width:   GG.nodeW,
                height:  GG.nodeH,
                opacity: isDimmed ? 0.4 : 1,
                touchAction: "none",
            }}
        >
            <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: KIND_ACCENT[kind] }} />
            <div className="flex items-center gap-1.5">
                <EntryIcon slug={pos.slug} kind={kind} size={18} />
                <span className="text-[11.5px] font-semibold text-foreground truncate -tracking-[0.1px] flex-1 min-w-0">
                    {shortTitle(node.title)}
                </span>
                <span className="font-mono text-[9.5px] text-muted-foreground tabular-nums shrink-0">
                    {year ?? ""}
                </span>
            </div>
            <div className="flex items-center gap-1.5 mt-1 min-w-0">
                {(() => {
                    const nfm = getFocusEntry(pos.slug)?.fm;
                    const nDomain = nfm?.domain as string | undefined;
                    const nDomainLabel = nDomain ? domainLabels[nDomain as keyof typeof domainLabels] : undefined;
                    return nDomainLabel ? (
                        <span className="text-[9.5px] text-muted-foreground truncate">
                            {nDomainLabel}
                        </span>
                    ) : null;
                })()}
                <span className="ml-auto inline-flex items-center gap-1 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: meta.color }} />
                    <span className="font-mono text-[9px] uppercase tracking-wider" style={{ color: meta.color }}>
                        {meta.short}
                    </span>
                </span>
            </div>
        </button>
    );
}
