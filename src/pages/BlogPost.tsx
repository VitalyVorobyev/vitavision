import { useParams } from "react-router-dom";
import { MarkdownRenderer } from "../components/md/MarkdownRenderer";
// @ts-ignore
import examplePost from "../data/example.md?raw"; // Use Vite's raw import to load as string

export default function BlogPost() {
    const { slug } = useParams();

    // In a real app we would load the post dynamically based on the slug.
    // For now, we stub it with the example post.
    const content = examplePost;

    // Extracting frontmatter roughly for demo layout
    const titleMatch = content.match(/title:\s+(.*)/);
    const title = titleMatch ? titleMatch[1] : slug;

    const contentBody = content.replace(/---[\s\S]*?---/, '');

    return (
        <div className="max-w-[800px] mx-auto py-16 px-4 animate-in fade-in">
            <div className="mb-12 border-b border-border pb-8">
                <h1 className="text-4xl font-bold tracking-tight mb-4">{title}</h1>
                <div className="text-muted-foreground font-mono text-sm">Oct 24, 2026</div>
            </div>
            <MarkdownRenderer content={contentBody} />
        </div>
    );
}
