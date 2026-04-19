import { Link } from "react-router-dom";
import type { ModelIndexEntry } from "../../lib/content/schema.ts";
import DifficultyBadge from "./DifficultyBadge.tsx";

interface ModelCardProps {
    entry: ModelIndexEntry;
}

/** Derive a two-letter monogram from the slug.
 *  Takes the first letter of the first two hyphen-separated segments.
 *  E.g. "super-point" → "SP", "dinov2" → "DI".
 */
function slugMonogram(slug: string): string {
    const parts = slug.split("-");
    if (parts.length >= 2) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return slug.slice(0, 2).toUpperCase();
}

export default function ModelCard({ entry }: ModelCardProps) {
    const { slug, frontmatter } = entry;
    return (
        <Link
            to={`/algorithms/models/${slug}`}
            className="flex gap-4 rounded-xl border border-border hover:border-foreground/20 transition-colors overflow-hidden group p-3"
        >
            <div className="shrink-0 w-16 h-16 rounded-lg bg-muted text-muted-foreground flex items-center justify-center font-mono text-lg">
                {slugMonogram(slug)}
            </div>
            <div className="min-w-0 flex-1 space-y-1">
                <h3 className="text-base font-semibold group-hover:underline truncate">
                    {frontmatter.draft && (
                        <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 border border-amber-500/40 rounded px-1 py-0.5 mr-1.5 align-middle">
                            draft
                        </span>
                    )}
                    {frontmatter.title}
                </h3>
                {frontmatter.summary && (
                    <p className="text-muted-foreground text-xs line-clamp-2">
                        {frontmatter.summary}
                    </p>
                )}
                <div className="flex flex-wrap items-center gap-1.5">
                    {frontmatter.difficulty && <DifficultyBadge level={frontmatter.difficulty} />}
                    {frontmatter.arch_family && (
                        <span className="inline-flex items-center rounded border border-border px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                            {frontmatter.arch_family}
                        </span>
                    )}
                </div>
            </div>
        </Link>
    );
}
