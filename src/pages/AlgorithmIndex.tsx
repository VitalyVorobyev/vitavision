import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { algorithmPages } from "../generated/content-index.ts";
import TagBadge from "../components/blog/TagBadge.tsx";
import TagFilter from "../components/blog/TagFilter.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import type { AlgorithmIndexEntry } from "../lib/content/schema.ts";

function AlgorithmCard({ entry }: { entry: AlgorithmIndexEntry }) {
    const { slug, frontmatter } = entry;
    return (
        <Link
            to={`/algorithms/${slug}`}
            className="block p-6 rounded-xl border border-border hover:border-foreground/20 transition-colors group"
        >
            <h2 className="text-2xl font-semibold group-hover:underline">
                {frontmatter.title}
            </h2>
            <p className="text-muted-foreground mt-2">{frontmatter.summary}</p>
            <div className="flex flex-wrap gap-1.5 mt-4">
                {frontmatter.tags.map((tag) => (
                    <TagBadge key={tag} tag={tag} />
                ))}
            </div>
        </Link>
    );
}

export default function AlgorithmIndex() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const page of algorithmPages) {
            for (const tag of page.frontmatter.tags) tagSet.add(tag);
        }
        return [...tagSet].sort();
    }, []);

    const filtered = selectedTag
        ? algorithmPages.filter((p) => p.frontmatter.tags.includes(selectedTag))
        : algorithmPages;

    return (
        <div className="max-w-[800px] mx-auto py-16 space-y-8 animate-in fade-in px-4">
            <SeoHead
                title="Algorithms"
                description="Interactive computer vision algorithms — explore, understand, and experiment."
            />
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Algorithms</h1>
                <p className="text-muted-foreground text-lg">
                    Computer vision algorithms — explore, understand,
                    and experiment.
                </p>
            </div>

            <TagFilter
                tags={allTags}
                selected={selectedTag}
                onSelect={setSelectedTag}
            />

            <div className="space-y-6">
                {filtered.length > 0 ? (
                    filtered.map((entry) => (
                        <AlgorithmCard key={entry.slug} entry={entry} />
                    ))
                ) : algorithmPages.length === 0 ? (
                    <p className="text-muted-foreground">
                        No algorithm pages yet. Stay tuned!
                    </p>
                ) : (
                    <p className="text-muted-foreground">
                        No algorithms match the selected tag.
                    </p>
                )}
            </div>
        </div>
    );
}
