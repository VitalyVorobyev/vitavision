import { useState } from "react";
import { Link } from "react-router";
import type { NarrativeNode, ResolvedNarrative } from "../../lib/content/schema.ts";
import type { NarrativeStep } from "../../lib/narratives/types.ts";
import { areaColor } from "../../lib/narratives/narrativeLayout.ts";
import { proseClasses } from "../../lib/prose-classes.ts";
import NarrativeLegend from "./NarrativeLegend.tsx";

interface MobileNarrativeViewProps {
    narrative: ResolvedNarrative;
    steps: NarrativeStep[];
    chapters: Record<string, string>;
}

/**
 * Mobile reshape of the narrative: no pan/zoom canvas. The walkthrough becomes
 * a stepped reading list — each step is a section with its chapter prose and
 * its focused nodes as tappable cards. Mirrors MobileGraphView's structure.
 */
export default function MobileNarrativeView({ narrative, steps, chapters }: MobileNarrativeViewProps) {
    const nodesById = new Map(narrative.nodes.map((n) => [n.id, n]));
    const areaIds = narrative.areas.map((a) => a.id);
    const edgeTypes = [...new Set(narrative.edges.map((e) => e.type))];
    const hasQuestionNodes = narrative.nodes.some((n) => n.kind === "question");

    return (
        <div className="flex flex-col">
            <div className="rounded-panel border border-line bg-surface px-3 py-2.5">
                <NarrativeLegend
                    edgeTypes={edgeTypes}
                    areas={narrative.areas}
                    variant="block"
                    hasQuestionNodes={hasQuestionNodes}
                />
            </div>

            <p className="mt-3 px-1 text-[10.5px] leading-snug text-fg-muted">
                The constellation map from desktop is reshaped into a reading list here — same
                stops, same order. Tap any node to see what it contributes.
            </p>

            {steps.map((step, i) => (
                <section key={step.anchor} className="mt-5">
                    <div className="mb-1.5 flex items-baseline gap-2">
                        <span className="font-mono text-[10px] tabular-nums text-fg-muted">
                            {String(i + 1).padStart(2, "0")}
                        </span>
                        <h2 className="m-0 text-[15px] font-semibold leading-tight -tracking-[0.2px] text-fg">
                            {step.title}
                        </h2>
                    </div>

                    {step.claim && (
                        <p className="mt-1.5 px-1 text-[14px] leading-[1.5] text-fg-muted">{step.claim}</p>
                    )}

                    {chapters[step.anchor] && (
                        <div
                            className={`${proseClasses} !max-w-none !text-[14.5px] !leading-[1.7] [&>h2]:hidden`}
                            dangerouslySetInnerHTML={{ __html: chapters[step.anchor] }}
                        />
                    )}

                    <div className="mt-3 flex flex-col gap-1.5">
                        {step.focus.map((id) => {
                            const node = nodesById.get(id);
                            if (!node) return null;
                            return <MobileNodeCard key={id} node={node} areaIds={areaIds} />;
                        })}
                    </div>
                </section>
            ))}
        </div>
    );
}

function MobileNodeCard({ node, areaIds }: { node: NarrativeNode; areaIds: string[] }) {
    const [open, setOpen] = useState(false);
    const accent = areaColor(areaIds, node.area);

    const meta =
        node.kind === "paper"
            ? [node.authorsShort, String(node.year)].filter(Boolean).join(" · ")
            : node.kind === "question"
              ? "question"
              : [node.pageKind, node.year != null ? String(node.year) : ""].filter(Boolean).join(" · ");

    return (
        <div
            className={`relative overflow-hidden rounded-panel bg-surface ${
                node.kind === "paper" || node.kind === "question"
                    ? "border border-dashed border-line"
                    : "border border-line"
            }`}
        >
            <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px]" style={{ background: accent }} />
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={open}
                className="flex w-full items-center gap-2 px-3 py-2.5 text-left"
            >
                <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-semibold text-fg">
                        {node.kind === "question" && <span aria-hidden="true">? </span>}
                        {node.title}
                    </span>
                    <span className="block truncate text-[10px] text-fg-muted">{meta}</span>
                </span>
                <span
                    aria-hidden="true"
                    className={`shrink-0 text-[10px] text-fg-muted transition-transform ${open ? "rotate-90" : ""}`}
                >
                    ▸
                </span>
            </button>

            {open && (
                <div className="border-t border-line px-3 py-2.5">
                    {node.takeaway && (
                        <p className="m-0 text-[12.5px] leading-[1.55] text-fg">{node.takeaway}</p>
                    )}
                    {node.remark && (
                        <p className="m-0 mt-1.5 text-[11.5px] italic leading-snug text-fg-muted">
                            {node.remark}
                        </p>
                    )}
                    {node.kind === "page" && (
                        <Link
                            to={node.path}
                            className="mt-2.5 flex h-9 items-center justify-center rounded-control bg-signal text-[13px] font-medium text-signal-fg no-underline active:opacity-90"
                        >
                            Open page →
                        </Link>
                    )}
                    {node.kind === "paper" && (
                        <a
                            href={node.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-2.5 flex h-9 items-center justify-center rounded-control border border-line bg-raised font-mono text-[12px] text-fg no-underline active:opacity-90"
                        >
                            Read the paper ↗
                        </a>
                    )}
                    {/* question nodes: no link — there is nothing to open. */}
                </div>
            )}
        </div>
    );
}
