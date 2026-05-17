// FocusedEntryPanel — right-rail panel for the desktop graph view.
//
// Shows the full focused-entry details (title, description, source, tasks, page link)
// that were previously crammed into the in-canvas center card.

import { Link } from "react-router-dom";
import { getFocusEntry } from "../../lib/atlas/focusEntry.ts";
import { EntryIcon } from "./EntryIcon.tsx";
import { SourceCard } from "./SourceCard.tsx";
import { taskLabel } from "../../lib/content/taskLabels.ts";

const KIND_LABEL: Record<string, string> = {
    algorithm: "Algorithm",
    model:     "Model",
    concept:   "Concept",
};

interface FocusedEntryPanelProps {
    slug: string;
}

export function FocusedEntryPanel({ slug }: FocusedEntryPanelProps) {
    const entry = getFocusEntry(slug);
    if (!entry) return null;

    const { node, kind, fm } = entry;

    const year    = (fm as { year?: number }).year;
    const tagline = (fm as { tagline?: string }).tagline;
    const tasks   = (fm as { tasks?: string[] }).tasks ?? [];
    const sources = (fm as { sources?: { primary?: string } }).sources;

    const description = tagline ?? node.summary;

    return (
        <div className="flex flex-col gap-3">
            {/* Header — icon + eyebrow + title */}
            <div className="flex items-start gap-3">
                <EntryIcon slug={slug} kind={kind} size={44} />
                <div className="min-w-0 flex-1">
                    {/* Eyebrow */}
                    <div className="flex items-center gap-1 text-[9.5px] uppercase tracking-[0.12em] text-muted-foreground flex-wrap">
                        <span className="text-brand font-semibold">Focused</span>
                        <span className="text-muted-foreground/60">·</span>
                        <span>{KIND_LABEL[kind]}</span>
                        {year != null && (
                            <>
                                <span className="text-muted-foreground/60">·</span>
                                <span className="font-mono normal-case tracking-normal">{year}</span>
                            </>
                        )}
                    </div>

                    {/* Title — full, no truncation */}
                    <div className="text-[16px] font-semibold leading-snug text-foreground mt-0.5">
                        {node.title}
                    </div>
                </div>
            </div>

            {/* Description — full, no line-clamp */}
            <p className="text-[12.5px] text-muted-foreground leading-[1.5]">
                {description}
            </p>

            {/* Source — vertical mini-card sized for the narrow rail (renders nothing when absent or repo:/doc:) */}
            <SourceCard primary={sources?.primary} />

            {/* Task badges — all tasks */}
            {tasks.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tasks.map((t) => (
                        <span
                            key={t}
                            className="inline-flex items-center h-[20px] px-2 rounded-[3px] border border-brand/40 bg-brand/10 text-[10.5px] text-brand whitespace-nowrap"
                        >
                            {taskLabel(t)}
                        </span>
                    ))}
                </div>
            )}

            {/* Footer — open page button */}
            <Link
                to={node.path}
                className="flex items-center justify-center h-9 rounded-md bg-primary text-primary-foreground text-[13px] font-medium hover:opacity-90 active:opacity-80 transition-opacity"
            >
                Open page →
            </Link>
        </div>
    );
}
