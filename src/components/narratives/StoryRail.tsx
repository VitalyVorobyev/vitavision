import { ChevronLeft, ChevronRight } from "lucide-react";
import type { NarrativeNode } from "../../lib/content/schema.ts";
import type { NarrativeStep } from "../../lib/narratives/types.ts";
import { proseClasses } from "../../lib/prose-classes.ts";
import { areaColor } from "../../lib/narratives/narrativeLayout.ts";

interface StoryRailProps {
    steps: NarrativeStep[];
    /** Active step index, or `null` when the reader is browsing freely. */
    index: number | null;
    chapters: Record<string, string>;
    nodesById: Map<string, NarrativeNode>;
    areas: { id: string; label: string }[];
    onStep: (index: number | null) => void;
    onSelectNode: (id: string) => void;
}

/**
 * Guided-walkthrough rail: navigation-only stepper on top, the active step's
 * chapter prose below it, then a compact block for the nodes that step focuses.
 */
export default function StoryRail({
    steps,
    index,
    chapters,
    nodesById,
    areas,
    onStep,
    onSelectNode,
}: StoryRailProps) {
    if (steps.length === 0) return null;

    if (index === null) {
        return (
            <div className="rounded-lg border border-border bg-surface p-3.5">
                <h2 className="m-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Walkthrough
                </h2>
                <p className="m-0 mt-1.5 text-[12.5px] leading-[1.55] text-muted-foreground">
                    {steps.length} stops through the constellation. Each one dims the map to the
                    nodes it is about and pulls up that chapter.
                </p>
                <button
                    type="button"
                    onClick={() => onStep(0)}
                    className="mt-3 inline-flex h-8 items-center rounded-md bg-primary px-3 text-[12px] font-medium text-primary-foreground transition-opacity hover:opacity-90"
                >
                    Start the walkthrough
                </button>
            </div>
        );
    }

    const clamped = Math.min(Math.max(index, 0), steps.length - 1);
    const step = steps[clamped];
    const chapter = chapters[step.anchor];
    const areaIds = areas.map((a) => a.id);

    return (
        <div className="rounded-lg border border-border bg-surface">
            {/* Stepper — navigation only */}
            <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <button
                    type="button"
                    onClick={() => onStep(clamped - 1)}
                    disabled={clamped === 0}
                    aria-label="Previous step"
                    className="grid h-7 w-7 place-items-center rounded border border-border text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-40"
                >
                    <ChevronLeft size={14} />
                </button>
                <button
                    type="button"
                    onClick={() => onStep(clamped + 1)}
                    disabled={clamped === steps.length - 1}
                    aria-label="Next step"
                    className="grid h-7 w-7 place-items-center rounded border border-border text-muted-foreground transition-colors enabled:hover:bg-muted enabled:hover:text-foreground disabled:opacity-40"
                >
                    <ChevronRight size={14} />
                </button>
                <span className="font-mono text-[10.5px] tabular-nums text-muted-foreground">
                    Step {clamped + 1}/{steps.length}
                </span>
                <button
                    type="button"
                    onClick={() => onStep(null)}
                    className="ml-auto text-[11px] text-muted-foreground transition-colors hover:text-foreground"
                >
                    Exit
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-[2px] w-full bg-muted">
                <div
                    className="h-full bg-brand transition-[width] duration-300"
                    style={{ width: `${((clamped + 1) / steps.length) * 100}%` }}
                />
            </div>

            <div className="max-h-[46vh] overflow-y-auto p-3.5">
                <h2 className="m-0 text-[14px] font-semibold leading-snug -tracking-[0.2px] text-foreground">
                    {step.title}
                </h2>

                {chapter ? (
                    // The chapter slice repeats its own <h2>; the rail's heading above
                    // is the navigational one, so the slice's is hidden here.
                    <div
                        className={`${proseClasses} mt-2 !max-w-none !text-[13.5px] !leading-[1.65] [&>h2]:hidden`}
                        dangerouslySetInnerHTML={{ __html: chapter }}
                    />
                ) : (
                    <p className="m-0 mt-2 text-[12.5px] text-muted-foreground">
                        This step has no chapter text.
                    </p>
                )}

                <h3 className="mb-1.5 mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    In focus
                </h3>
                <div className="flex flex-col gap-1.5">
                    {step.focus.map((id) => {
                        const node = nodesById.get(id);
                        if (!node) return null;
                        return (
                            <button
                                key={id}
                                type="button"
                                onClick={() => onSelectNode(id)}
                                className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-left transition-colors hover:bg-muted"
                            >
                                <span
                                    aria-hidden="true"
                                    className="h-2 w-2 shrink-0 rounded-full"
                                    style={{ background: areaColor(areaIds, node.area) }}
                                />
                                <span className="min-w-0 flex-1 truncate text-[12px] text-foreground">
                                    {node.title}
                                </span>
                                <span className="shrink-0 font-mono text-[9.5px] tabular-nums text-muted-foreground">
                                    {node.year ?? ""}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
