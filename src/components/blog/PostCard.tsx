import { Link } from "react-router-dom";
import type { BlogEntry } from "../../lib/content/schema.ts";
import TagBadge from "./TagBadge.tsx";

interface PostCardProps {
    post: BlogEntry;
}

export default function PostCard({ post }: PostCardProps) {
    const { slug, frontmatter } = post;

    return (
        <Link
            to={`/blog/${slug}`}
            className="block p-6 rounded-xl border border-border hover:border-foreground/20 transition-colors group"
        >
            <h2 className="text-2xl font-semibold group-hover:underline">
                {frontmatter.title}
            </h2>
            <p className="text-muted-foreground mt-2">{frontmatter.summary}</p>
            <div className="flex items-center justify-between mt-4">
                <div className="flex flex-wrap gap-1.5">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
                <time className="text-sm font-mono text-muted-foreground">
                    {frontmatter.date}
                </time>
            </div>
        </Link>
    );
}
