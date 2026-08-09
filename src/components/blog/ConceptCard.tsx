import { Link } from "react-router-dom";
import type { ConceptIndexEntry } from "../../lib/content/schema.ts";
import { EntryIcon } from "../atlas/EntryIcon.tsx";
import { domainLabels } from "../algorithms/domainLabels.ts";
import { CardBadges, GraphChip, CardMeta, RelationLine } from "./AtlasCardParts.tsx";
import { cardBody } from "./cardText.ts";

interface ConceptCardProps {
    entry: ConceptIndexEntry;
    variant?: "compact" | "horizontal";
}

/** Concepts carry no `tasks`; the meta label is the domain. */
function metaLabel(fm: ConceptIndexEntry["frontmatter"]): string | undefined {
    if (fm.domain) return domainLabels[fm.domain] ?? fm.domain;
    return undefined;
}

// ── Variants ──────────────────────────────────────────────────────────────────

function CompactCard({ entry }: { entry: ConceptIndexEntry }) {
    const { slug, frontmatter: fm } = entry;
    return (
        <div className="relative flex flex-col gap-2 min-h-[112px] rounded-lg border border-border bg-surface p-3 hover:border-foreground/20 transition-colors group">
            <div className="flex items-start gap-2.5">
                <EntryIcon slug={slug} kind="concept" size={30} coverImage={fm.coverImage} />
                <div className="min-w-0 flex-1">
                    <CardBadges draft={fm.draft} date={fm.date} />
                    {/* Stretched-link title — ::after covers the whole card */}
                    <Link
                        to={`/concepts/${slug}`}
                        className="inline text-[13px] font-semibold leading-tight text-foreground -tracking-[0.1px] group-hover:underline after:absolute after:inset-0 after:content-['']"
                    >
                        {fm.title}
                    </Link>
                    <CardMeta kind="concept" label={metaLabel(fm)} year={fm.year} />
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

function HorizontalCard({ entry }: { entry: ConceptIndexEntry }) {
    const { slug, frontmatter: fm } = entry;
    return (
        <div className="relative flex items-start gap-3 rounded-[10px] border border-border bg-surface p-3.5 group transition-colors hover:border-foreground/20">
            <EntryIcon slug={slug} kind="concept" size={30} coverImage={fm.coverImage} />
            <div className="min-w-0 flex-1">
                <div className="flex items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                        <CardBadges draft={fm.draft} date={fm.date} />
                        <Link
                            to={`/concepts/${slug}`}
                            className="text-[14px] font-semibold -tracking-[0.1px] truncate group-hover:underline text-foreground after:absolute after:inset-0 after:content-['']"
                        >
                            {fm.title}
                        </Link>
                    </div>
                    <GraphChip slug={slug} />
                </div>
                <CardMeta kind="concept" label={metaLabel(fm)} year={fm.year} />
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

export default function ConceptCard({
    entry,
    variant = "compact",
}: ConceptCardProps) {
    if (variant === "horizontal") return <HorizontalCard entry={entry} />;
    return <CompactCard entry={entry} />;
}
