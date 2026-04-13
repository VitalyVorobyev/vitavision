import { useState, useMemo } from "react";
import { blogPosts } from "../generated/content-index.ts";
import PostCard from "../components/blog/PostCard.tsx";
import TagFilter from "../components/blog/TagFilter.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";

export default function Blog() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const isAdmin = useIsAdmin();

    const visiblePosts = useMemo(
        () => blogPosts.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const post of visiblePosts) {
            for (const tag of post.frontmatter.tags) tagSet.add(tag);
        }
        return [...tagSet].sort();
    }, [visiblePosts]);

    const filtered = selectedTag
        ? visiblePosts.filter((p) => p.frontmatter.tags.includes(selectedTag))
        : visiblePosts;

    return (
        <div className="max-w-[800px] mx-auto py-16 space-y-8 animate-in fade-in px-4">
            <SeoHead
                title="Blog"
                description="Articles on computer vision algorithms, calibration, and building intelligent systems."
            />
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Blog</h1>
                <p className="text-muted-foreground text-lg">
                    Thoughts on algorithms, computer vision, and building
                    intelligent systems.
                </p>
            </div>

            <TagFilter
                tags={allTags}
                selected={selectedTag}
                onSelect={setSelectedTag}
            />

            <div className="space-y-6">
                {filtered.length > 0 ? (
                    filtered.map((post) => (
                        <PostCard key={post.slug} post={post} />
                    ))
                ) : visiblePosts.length === 0 ? (
                    <p className="text-muted-foreground">
                        No posts yet. Stay tuned!
                    </p>
                ) : (
                    <p className="text-muted-foreground">
                        No posts match the selected tag.
                    </p>
                )}
            </div>
        </div>
    );
}
