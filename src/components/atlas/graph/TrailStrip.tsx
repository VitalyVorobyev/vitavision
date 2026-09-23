// TrailStrip — full-width back/forward + breadcrumb trail bar above the
// desktop graph canvas. Extracted from GraphExplorer.tsx.

import { contentGraph } from "../../../generated/content-graph.ts";
import { shortTitle } from "../../../lib/atlas/graphNeighbors.ts";
import { GG } from "../../../lib/atlas/graphLayout.ts";

export interface TrailStripProps {
    history:   string[];
    current:   string;
    future:    string[];
    onBack:    () => void;
    onForward: () => void;
    onJump:    (i: number) => void;
}

export function TrailStrip({ history, current, future, onBack, onForward, onJump }: TrailStripProps) {
    const max = GG.trailMaxVisible;

    const histHidden  = Math.max(0, history.length - max);
    const histVisible = history.slice(-max);
    const histStart   = history.length - histVisible.length;
    const futHidden   = Math.max(0, future.length - max);
    const futVisible  = future.slice(0, max);

    const nodeTitle = (slug: string): string => {
        const node = contentGraph.nodes[slug];
        return node ? shortTitle(node.title) : slug;
    };

    return (
        <div className="flex items-center gap-2 h-10 px-4 border-y border-border bg-surface shrink-0">
            {/* Back button */}
            <button
                onClick={onBack}
                disabled={history.length === 0}
                className={`w-7 h-7 grid place-items-center rounded ${
                    history.length > 0
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/60 cursor-default"
                }`}
                title="Back (⌘[)"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="15 18 9 12 15 6" />
                </svg>
            </button>

            {/* Forward button */}
            <button
                onClick={onForward}
                disabled={future.length === 0}
                className={`w-7 h-7 grid place-items-center rounded ${
                    future.length > 0
                        ? "text-foreground hover:bg-muted"
                        : "text-muted-foreground/60 cursor-default"
                }`}
                title="Forward (⌘])"
            >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 18 15 12 9 6" />
                </svg>
            </button>

            <span className="w-px h-4 bg-border mx-1.5" />

            <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mr-2">Trail</div>

            {/* Trail entries */}
            <div className="flex items-center gap-1.5 text-[12px] overflow-x-auto min-w-0">
                {histHidden > 0 && (
                    <>
                        <span className="text-[10.5px] font-mono text-muted-foreground/60 whitespace-nowrap" title={`${histHidden} earlier`}>
                            +{histHidden} earlier
                        </span>
                        <span className="text-muted-foreground/60">·</span>
                    </>
                )}
                {histVisible.map((s, i) => (
                    <span key={`h-${s}-${histStart + i}`} className="contents">
                        <button
                            onClick={() => onJump(histStart + i)}
                            className="text-foreground hover:underline truncate text-[11.5px]"
                        >
                            {nodeTitle(s)}
                        </button>
                        <span className="text-muted-foreground/60">›</span>
                    </span>
                ))}
                <span className="text-foreground font-semibold whitespace-nowrap text-[11.5px]">
                    {nodeTitle(current)}
                </span>
                {futVisible.map((s, i) => (
                    <span key={`f-${s}-${i}`} className="contents">
                        <span className="text-muted-foreground/60">›</span>
                        <span className="text-muted-foreground/60 whitespace-nowrap text-[11.5px]">{nodeTitle(s)}</span>
                    </span>
                ))}
                {futHidden > 0 && (
                    <>
                        <span className="text-muted-foreground/60">·</span>
                        <span className="text-[10.5px] font-mono text-muted-foreground/60 whitespace-nowrap">+{futHidden} later</span>
                    </>
                )}
            </div>

            {/* Keyboard shortcut hint */}
            <div className="ml-auto flex items-center gap-1.5 text-[10.5px] text-muted-foreground shrink-0">
                <kbd className="font-mono px-1 py-0.5 rounded bg-surface border border-border-strong">⌘[</kbd>
                <span className="-ml-0.5">back</span>
                <kbd className="font-mono px-1 py-0.5 rounded bg-surface border border-border-strong ml-1.5">⌘]</kbd>
                <span className="-ml-0.5">forward</span>
            </div>
        </div>
    );
}
