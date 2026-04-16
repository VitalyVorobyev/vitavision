import { Link } from "react-router-dom";
import type { AlgorithmIndexEntry } from "../../lib/content/schema.ts";
import TagBadge from "./TagBadge.tsx";
import DifficultyBadge from "./DifficultyBadge.tsx";
import AlgorithmGlyph from "../algorithms/AlgorithmGlyph.tsx";

interface AlgorithmCardProps {
    entry: AlgorithmIndexEntry;
}

export default function AlgorithmCard({ entry }: AlgorithmCardProps) {
    const { slug, frontmatter } = entry;
    return (
        <Link
            to={`/algorithms/${slug}`}
            className="flex gap-4 rounded-xl border border-border hover:border-foreground/20 transition-colors overflow-hidden group p-3"
        >
            <div className="shrink-0 w-16 h-16 rounded-lg overflow-hidden">
                {frontmatter.coverImage ? (
                    <img
                        src={frontmatter.coverImage}
                        alt={frontmatter.title}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <AlgorithmGlyph slug={slug} category={frontmatter.category} />
                )}
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
                <div className="flex flex-wrap items-center gap-1 pt-0.5">
                    {frontmatter.difficulty && <DifficultyBadge level={frontmatter.difficulty} />}
                    {frontmatter.tags.slice(0, 3).map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </div>
        </Link>
    );
}
