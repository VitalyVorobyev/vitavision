import { Link } from "react-router-dom";
import { blogPosts, algorithmPages, demoPages } from "../../generated/content-index.ts";

interface RelatedPostsProps {
    slugs?: string[];
    type: "blog" | "algorithm" | "demo";
}

export default function RelatedPosts({ slugs, type }: RelatedPostsProps) {
    if (!slugs || slugs.length === 0) return null;

    const items = slugs
        .map((slug) => {
            if (type === "blog") {
                const post = blogPosts.find((p) => p.slug === slug);
                return post ? { slug, title: post.frontmatter.title, path: `/blog/${slug}` } : null;
            }
            if (type === "demo") {
                const demo = demoPages.find((p) => p.slug === slug);
                return demo ? { slug, title: demo.frontmatter.title, path: `/demos/${slug}` } : null;
            }
            const page = algorithmPages.find((p) => p.slug === slug);
            return page ? { slug, title: page.frontmatter.title, path: `/algorithms/${slug}` } : null;
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);

    if (items.length === 0) return null;

    const heading = type === "blog" ? "Related Posts" : type === "demo" ? "Related Demos" : "Related Algorithms";

    return (
        <section className="mt-12 pt-6 border-t border-border">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {heading}
            </h3>
            <ul className="space-y-1.5">
                {items.map((item) => (
                    <li key={item.slug}>
                        <Link
                            to={item.path}
                            className="text-primary underline hover:text-primary/80 text-sm"
                        >
                            {item.title}
                        </Link>
                    </li>
                ))}
            </ul>
        </section>
    );
}
