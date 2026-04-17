import { Link } from "react-router-dom";
import { blogPosts, algorithmPages, demoPages } from "../../generated/content-index.ts";
import { useIsAdmin } from "../../lib/auth/useIsAdmin.ts";

interface RelatedPostsProps {
    slugs?: string[];
    type: "blog" | "algorithm" | "demo";
}

export default function RelatedPosts({ slugs, type }: RelatedPostsProps) {
    const isAdmin = useIsAdmin();

    if (!slugs || slugs.length === 0) return null;

    const items = slugs
        .map((slug) => {
            if (type === "blog") {
                const entity = blogPosts.find((p) => p.slug === slug);
                if (!entity) return null;
                if (entity.frontmatter.draft && !isAdmin) return null;
                return { slug, title: entity.frontmatter.title, path: `/blog/${slug}` };
            }
            if (type === "demo") {
                const entity = demoPages.find((p) => p.slug === slug);
                if (!entity) return null;
                if (entity.frontmatter.draft && !isAdmin) return null;
                return { slug, title: entity.frontmatter.title, path: `/demos/${slug}` };
            }
            const entity = algorithmPages.find((p) => p.slug === slug);
            if (!entity) return null;
            if (entity.frontmatter.draft && !isAdmin) return null;
            return { slug, title: entity.frontmatter.title, path: `/algorithms/${slug}` };
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
