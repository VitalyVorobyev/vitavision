import { Link } from "react-router-dom";
import { X } from "lucide-react";
import type { NarrativeNode } from "../../lib/content/schema.ts";
import { areaColor } from "../../lib/narratives/narrativeLayout.ts";

interface NodeInspectorProps {
    node: NarrativeNode;
    areas: { id: string; label: string }[];
    onClose: () => void;
}

/**
 * Detail panel for the selected constellation node. Page nodes link into the
 * atlas; paper nodes ("page debt") render a compact citation with an external
 * link, mirroring SourceCard's shape without needing the papers index.
 */
export default function NodeInspector({ node, areas, onClose }: NodeInspectorProps) {
    const areaIds = areas.map((a) => a.id);
    const areaLabel = areas.find((a) => a.id === node.area)?.label ?? node.area;

    return (
        <div className="relative rounded-lg border border-border bg-surface p-3.5">
            <button
                type="button"
                onClick={onClose}
                aria-label="Close node details"
                className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
                <X size={13} />
            </button>

            <div className="flex items-center gap-1.5 pr-7 text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground">
                <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: areaColor(areaIds, node.area) }}
                />
                <span className="truncate">{areaLabel}</span>
                <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                <span>{node.kind === "paper" ? "Paper" : node.pageKind}</span>
                {node.year != null && (
                    <>
                        <span aria-hidden="true" className="text-muted-foreground/60">·</span>
                        <span className="font-mono normal-case tracking-normal">{node.year}</span>
                    </>
                )}
            </div>

            <p className="m-0 mt-1.5 text-[14px] font-semibold leading-snug text-foreground">
                {node.title}
            </p>

            {node.kind === "paper" && node.authorsShort && (
                <p className="m-0 mt-1 font-mono text-[11px] leading-snug text-muted-foreground">
                    {node.authorsShort}
                </p>
            )}

            {node.role && (
                <p className="m-0 mt-2 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
                    Role · <span className="normal-case tracking-normal">{node.role}</span>
                </p>
            )}

            {node.takeaway && (
                <p className="m-0 mt-2 text-[12.5px] leading-[1.55] text-foreground">{node.takeaway}</p>
            )}

            {node.remark && (
                <p className="m-0 mt-2 text-[11.5px] italic leading-snug text-muted-foreground">{node.remark}</p>
            )}

            {node.kind === "page" ? (
                <Link
                    to={node.path}
                    className="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-border bg-muted px-3 text-[12px] font-medium text-foreground no-underline transition-colors hover:bg-surface"
                >
                    Open page →
                </Link>
            ) : (
                <a
                    href={node.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex h-8 items-center justify-center rounded-md border border-border bg-muted px-3 font-mono text-[11px] text-foreground no-underline transition-colors hover:bg-surface"
                >
                    Read the paper ↗
                </a>
            )}
        </div>
    );
}
