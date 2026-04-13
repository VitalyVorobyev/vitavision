import { Link } from "react-router-dom";
import { Lock } from "lucide-react";
import type { BlogIndexEntry } from "../../lib/content/schema.ts";
import TagBadge from "./TagBadge.tsx";
import DifficultyBadge from "./DifficultyBadge.tsx";

interface PostCardProps {
    post: BlogIndexEntry;
}

export default function PostCard({ post }: PostCardProps) {
    const { slug, frontmatter } = post;

    return (
        <Link
            to={`/blog/${slug}`}
            className="block p-6 rounded-xl border border-border hover:border-foreground/20 transition-colors group"
        >
            <h2 className="text-2xl font-semibold group-hover:underline flex items-center gap-2">
                {frontmatter.draft && (
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-500 border border-amber-500/40 rounded px-1.5 py-0.5 align-middle">
                        draft
                    </span>
                )}
                {frontmatter.title}
                {frontmatter.access === "members" && (
                    <Lock className="inline-block h-4 w-4 text-muted-foreground shrink-0" aria-label="Members only" />
                )}
            </h2>
            <p className="text-muted-foreground mt-2">{frontmatter.summary}</p>
            <div className="flex items-center justify-between mt-4">
                <div className="flex flex-wrap items-center gap-1.5">
                    {frontmatter.difficulty && <DifficultyBadge level={frontmatter.difficulty} />}
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
                <time className="text-sm font-mono text-muted-foreground">
                    {frontmatter.date}
                    {frontmatter.readingTimeMinutes ? ` · ${frontmatter.readingTimeMinutes} min` : ""}
                </time>
            </div>
        </Link>
    );
}
