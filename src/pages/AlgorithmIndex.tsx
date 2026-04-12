import { useState, useMemo } from "react";
import { algorithmPages } from "../generated/content-index.ts";
import TagFilter from "../components/blog/TagFilter.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import AlgorithmCard from "../components/blog/AlgorithmCard.tsx";
import {
    algorithmCategoryValues,
    type AlgorithmCategory,
    type AlgorithmIndexEntry,
} from "../lib/content/schema.ts";
import { categoryLabel } from "../components/algorithms/categoryLabels.ts";

export default function AlgorithmIndex() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const page of algorithmPages) {
            for (const tag of page.frontmatter.tags) tagSet.add(tag);
        }
        return [...tagSet].sort();
    }, []);

    const filtered = useMemo(
        () =>
            selectedTag
                ? algorithmPages.filter((p) => p.frontmatter.tags.includes(selectedTag))
                : algorithmPages,
        [selectedTag],
    );

    const grouped = useMemo(() => {
        const byCategory = new Map<AlgorithmCategory, AlgorithmIndexEntry[]>();
        for (const entry of filtered) {
            const category = entry.frontmatter.category;
            const bucket = byCategory.get(category) ?? [];
            bucket.push(entry);
            byCategory.set(category, bucket);
        }
        return algorithmCategoryValues
            .map((category) => ({ category, entries: byCategory.get(category) ?? [] }))
            .filter((group) => group.entries.length > 0);
    }, [filtered]);

    return (
        <div className="max-w-screen-xl mx-auto py-16 px-4 lg:px-8 space-y-10 animate-in fade-in">
            <SeoHead
                title="Algorithms"
                description="Interactive computer vision algorithms — explore, understand, and experiment."
            />
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Algorithms</h1>
                <p className="text-muted-foreground text-lg">
                    Computer vision algorithms — explore, understand, and experiment.
                </p>
            </div>

            <TagFilter
                tags={allTags}
                selected={selectedTag}
                onSelect={setSelectedTag}
            />

            {grouped.length > 0 ? (
                grouped.map(({ category, entries }) => (
                    <section key={category} className="space-y-4">
                        <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                            {categoryLabel(category)}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {entries.map((entry) => (
                                <AlgorithmCard key={entry.slug} entry={entry} />
                            ))}
                        </div>
                    </section>
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
    );
}
