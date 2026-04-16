import { Link } from "react-router-dom";
import type { DemoFrontmatterSerialized } from "../../lib/content/schema.ts";
import TagBadge from "../blog/TagBadge.tsx";
import DemoCover from "./DemoCover.tsx";
import { classNames } from "../../utils/helpers.ts";

interface DemoCardProps {
    slug: string;
    frontmatter: DemoFrontmatterSerialized;
}

export default function DemoCard({ slug, frontmatter }: DemoCardProps) {
    return (
        <Link
            to={`/demos/${slug}`}
            className={classNames(
                "block rounded-xl border border-border hover:border-foreground/20 transition-colors overflow-hidden",
                "group",
            )}
        >
            {frontmatter.coverImage ? (
                <img
                    src={frontmatter.coverImage}
                    alt={frontmatter.title}
                    className="w-full aspect-video object-cover"
                />
            ) : (
                <DemoCover slug={slug} className="w-full aspect-video" />
            )}
            <div className="p-5 space-y-2">
                <h2 className="text-xl font-semibold group-hover:underline">
                    {frontmatter.title}
                </h2>
                {frontmatter.summary && (
                    <p className="text-muted-foreground text-sm line-clamp-2">
                        {frontmatter.summary}
                    </p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                    {frontmatter.tags.map((tag) => (
                        <TagBadge key={tag} tag={tag} />
                    ))}
                </div>
            </div>
        </Link>
    );
}
