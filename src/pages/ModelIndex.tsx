import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { modelPages } from "../generated/content-index.ts";
import TagFilter from "../components/blog/TagFilter.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import ModelCard from "../components/blog/ModelCard.tsx";
import {
    modelCategoryValues,
    type ModelCategory,
    type ModelIndexEntry,
} from "../lib/content/schema.ts";
import { modelCategoryLabel } from "../components/algorithms/categoryLabels.ts";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";

export default function ModelIndex() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const isAdmin = useIsAdmin();

    const visiblePages = useMemo(
        () => modelPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const page of visiblePages) {
            for (const tag of page.frontmatter.tags) tagSet.add(tag);
        }
        return [...tagSet].sort();
    }, [visiblePages]);

    const filtered = useMemo(
        () =>
            selectedTag
                ? visiblePages.filter((p) => p.frontmatter.tags.includes(selectedTag))
                : visiblePages,
        [selectedTag, visiblePages],
    );

    const grouped = useMemo(() => {
        const byCategory = new Map<ModelCategory, ModelIndexEntry[]>();
        for (const entry of filtered) {
            const category = entry.frontmatter.category;
            const bucket = byCategory.get(category) ?? [];
            bucket.push(entry);
            byCategory.set(category, bucket);
        }
        return modelCategoryValues
            .map((category) => ({ category, entries: byCategory.get(category) ?? [] }))
            .filter((group) => group.entries.length > 0);
    }, [filtered]);

    return (
        <div className="max-w-screen-xl mx-auto py-16 px-4 lg:px-8 space-y-10 animate-in fade-in">
            <SeoHead
                title="Models"
                description="Deep-learning models for computer vision — reference cards covering architecture, training, implementations, and assessment."
            />
            <div className="space-y-2">
                <Link
                    to="/algorithms"
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    &larr; Back to algorithms
                </Link>
                <h1 className="text-4xl font-bold tracking-tight">Models</h1>
                <p className="text-muted-foreground text-lg">
                    Deep-learning models for computer vision — reference cards covering architecture, training, implementations, and assessment.
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
                            {modelCategoryLabel(category)}
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                            {entries.map((entry) => (
                                <ModelCard key={entry.slug} entry={entry} />
                            ))}
                        </div>
                    </section>
                ))
            ) : visiblePages.length === 0 ? (
                <p className="text-muted-foreground">
                    No model pages yet. Stay tuned!
                </p>
            ) : (
                <p className="text-muted-foreground">
                    No models match the selected tag.
                </p>
            )}
        </div>
    );
}
