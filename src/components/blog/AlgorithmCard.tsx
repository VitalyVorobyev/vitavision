import { Link } from "react-router-dom";
import type { AlgorithmIndexEntry } from "../../lib/content/schema.ts";
import { EntryIcon } from "../atlas/EntryIcon.tsx";
import { taskLabel } from "../../lib/content/taskLabels.ts";
import { domainLabels } from "../algorithms/domainLabels.ts";
import { DraftBadge, GraphChip, CardMeta, RelationLine } from "./AtlasCardParts.tsx";
import { cardBody } from "./cardText.ts";

interface AlgorithmCardProps {
    entry: AlgorithmIndexEntry;
    variant?: "compact" | "horizontal";
}

/** Meta label: humanised first task, else the domain label. */
function metaLabel(fm: AlgorithmIndexEntry["frontmatter"]): string | undefined {
    if (fm.tasks?.[0]) return taskLabel(fm.tasks[0]);
    if (fm.domain) return domainLabels[fm.domain] ?? fm.domain;
    return undefined;
}

// ── Variants ──────────────────────────────────────────────────────────────────

function CompactCard({ entry }: { entry: AlgorithmIndexEntry }) {
    const { slug, frontmatter: fm } = entry;
    return (
        <div className="relative flex flex-col gap-2 min-h-[112px] rounded-lg border border-border bg-surface p-3 hover:border-foreground/20 transition-colors group">
            <div className="flex items-start gap-2.5">
                <EntryIcon slug={slug} kind="algorithm" size={30} coverImage={fm.coverImage} />
                <div className="min-w-0 flex-1">
                    {fm.draft && <DraftBadge />}
                    {/* Stretched-link title — ::after covers the whole card */}
                    <Link
                        to={`/algorithms/${slug}`}
                        className="inline text-[13px] font-semibold leading-tight text-foreground -tracking-[0.1px] group-hover:underline after:absolute after:inset-0 after:content-['']"
                    >
                        {fm.title}
                    </Link>
                    <CardMeta label={metaLabel(fm)} year={fm.year} />
                </div>
                <GraphChip slug={slug} />
            </div>

            {cardBody(fm.tagline, fm.summary) && (
                <p className="text-[11.5px] text-muted-foreground leading-[1.45] line-clamp-2">
                    {cardBody(fm.tagline, fm.summary)}
                </p>
            )}

            <div className="mt-auto pt-0.5">
                <RelationLine slug={slug} />
            </div>
        </div>
    );
}

function HorizontalCard({ entry }: { entry: AlgorithmIndexEntry }) {
    const { slug, frontmatter: fm } = entry;
    return (
        <div className="relative flex items-start gap-3 rounded-[10px] border border-border bg-surface p-3.5 group transition-colors hover:border-foreground/20">
            <EntryIcon slug={slug} kind="algorithm" size={30} coverImage={fm.coverImage} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                        {fm.draft && <DraftBadge />}
                        <Link
                            to={`/algorithms/${slug}`}
                            className="text-[14px] font-semibold -tracking-[0.1px] truncate group-hover:underline text-foreground after:absolute after:inset-0 after:content-['']"
                        >
                            {fm.title}
                        </Link>
                    </div>
                    <GraphChip slug={slug} />
                </div>
                <CardMeta label={metaLabel(fm)} year={fm.year} />
                {cardBody(fm.tagline, fm.summary) && (
                    <p className="text-xs text-muted-foreground leading-[1.4] line-clamp-2 mt-[3px]">
                        {cardBody(fm.tagline, fm.summary)}
                    </p>
                )}
                <div className="mt-2 pt-0.5">
                    <RelationLine slug={slug} />
                </div>
            </div>
        </div>
    );
}

// ── Public export ─────────────────────────────────────────────────────────────

export default function AlgorithmCard({
    entry,
    variant = "compact",
}: AlgorithmCardProps) {
    if (variant === "horizontal") return <HorizontalCard entry={entry} />;
    return <CompactCard entry={entry} />;
}
