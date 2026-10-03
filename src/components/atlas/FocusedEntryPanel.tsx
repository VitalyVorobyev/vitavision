// FocusedEntryPanel — right-rail panel for the desktop graph view.
//
// Shows the full focused-entry details (title, description, source, tasks, page link)
// that were previously crammed into the in-canvas center card.
// When isPreview=true the eyebrow reads "Preview" (muted) instead of "Focused" (brand).

import { Link } from "react-router";
import { ButtonLink } from "@vitavision/ui";
import { getFocusEntry } from "../../lib/atlas/focusEntry.ts";
import { EntryIcon } from "./EntryIcon.tsx";
import { SourceCard } from "./SourceCard.tsx";
import { taskLabel } from "../../lib/content/taskLabels.ts";
import { domainLabels } from "../algorithms/domainLabels.ts";
import TagBadge from "../blog/TagBadge.tsx";

const KIND_LABEL: Record<string, string> = {
    algorithm: "Algorithm",
    model:     "Model",
    concept:   "Concept",
};

interface FocusedEntryPanelProps {
    slug: string;
    isPreview?: boolean;
}

export function FocusedEntryPanel({ slug, isPreview }: FocusedEntryPanelProps) {
    const entry = getFocusEntry(slug);
    if (!entry) return null;

    const { node, kind, fm } = entry;

    const year    = (fm as { year?: number }).year;
    const tagline = (fm as { tagline?: string }).tagline;
    const tasks   = (fm as { tasks?: string[] }).tasks ?? [];
    const sources = (fm as { sources?: { primary?: string } }).sources;
    const domain  = fm.domain as string | undefined;
    const tags    = (fm.tags as string[] | undefined) ?? [];

    const description = tagline ?? node.summary;

    return (
        <div className="flex flex-col gap-3">
            {/* Header — icon + eyebrow + title */}
            <div className="flex items-start gap-3">
                <EntryIcon slug={slug} kind={kind} size={44} />
                <div className="min-w-0 flex-1">
                    {/* Eyebrow */}
                    <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.12em] text-fg-muted flex-wrap">
                        {isPreview
                            ? <span className="text-fg-muted font-semibold">Preview</span>
                            : <span className="text-signal font-semibold">Focused</span>
                        }
                        <span className="text-fg-muted/60">·</span>
                        <span>{KIND_LABEL[kind]}</span>
                        {year != null && (
                            <>
                                <span className="text-fg-muted/60">·</span>
                                <span className="font-mono normal-case tracking-normal">{year}</span>
                            </>
                        )}
                    </div>

                    {/* Title — full, no truncation */}
                    <div className="text-[16px] font-semibold leading-snug text-fg mt-0.5">
                        {node.title}
                    </div>
                </div>
            </div>

            {/* Description — full, no line-clamp */}
            <p className="text-[12.5px] text-fg-muted leading-[1.5]">
                {description}
            </p>

            {/* Source — vertical mini-card sized for the narrow rail (renders nothing when absent or repo:/doc:) */}
            <SourceCard primary={sources?.primary} />

            {/* Domain chip */}
            {domain && domainLabels[domain as keyof typeof domainLabels] && (
                <div>
                    <div className="text-[9.5px] uppercase tracking-[0.12em] text-fg-muted mb-1">Domain</div>
                    <span className="inline-flex items-center rounded px-2 py-0.5 text-[11px] bg-raised text-fg-muted">
                        {domainLabels[domain as keyof typeof domainLabels]}
                    </span>
                </div>
            )}

            {/* Task badges — all tasks */}
            {tasks.length > 0 && (
                <div>
                    <div className="text-[9.5px] uppercase tracking-[0.12em] text-fg-muted mb-1">Problems</div>
                    <div className="flex flex-wrap gap-1.5">
                        {tasks.map((t) => (
                            <span
                                key={t}
                                className="inline-flex items-center h-[20px] px-2 rounded-[3px] border border-signal/40 bg-signal/10 text-[10.5px] text-signal whitespace-nowrap"
                            >
                                {taskLabel(t)}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
                <div>
                    <div className="text-[9.5px] uppercase tracking-[0.12em] text-fg-muted mb-1">Tags</div>
                    <div className="flex flex-wrap gap-1.5">
                        {tags.map((t) => (
                            <TagBadge
                                key={t}
                                tag={t}
                                to={`/atlas?tags=${encodeURIComponent(t)}`}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Footer — open page button */}
            <ButtonLink variant="primary" asChild className="w-full">
                <Link to={node.path}>Open page →</Link>
            </ButtonLink>
        </div>
    );
}
