import { blogPosts } from "../../generated/content-index.ts";
import PostCard from "../../components/blog/PostCard.tsx";

const drafts = blogPosts.filter((p) => p.frontmatter.draft);

export default function AdminDrafts() {
    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight">Drafts</h1>
                <p className="text-sm text-muted-foreground">
                    Posts marked <code className="font-mono text-xs">draft: true</code> — only visible to admins.
                </p>
            </div>

            {drafts.length === 0 ? (
                <p className="text-muted-foreground py-10 text-center">No drafts.</p>
            ) : (
                <div className="space-y-4">
                    {drafts.map((post) => (
                        <PostCard key={post.slug} post={post} />
                    ))}
                </div>
            )}
        </div>
    );
}
