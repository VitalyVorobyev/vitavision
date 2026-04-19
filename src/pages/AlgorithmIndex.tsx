import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { algorithmPages, modelPages } from "../generated/content-index.ts";
import TagFilter from "../components/blog/TagFilter.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import AlgorithmCard from "../components/blog/AlgorithmCard.tsx";
import {
    algorithmCategoryValues,
    type AlgorithmCategory,
    type AlgorithmIndexEntry,
} from "../lib/content/schema.ts";
import { categoryLabel } from "../components/algorithms/categoryLabels.ts";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";

export default function AlgorithmIndex() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const isAdmin = useIsAdmin();

    const visiblePages = useMemo(
        () => algorithmPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const visibleModelPages = useMemo(
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

            <Link
                to="/algorithms/models"
                className="flex gap-4 items-center rounded-xl border border-border hover:border-foreground/20 transition-colors p-4 group"
            >
                <div className="min-w-0 flex-1">
                    <p className="text-base font-semibold group-hover:underline">
                        Deep-learning models &rarr;
                    </p>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        Architecture, parameters, licenses, open-source impls.
                    </p>
                </div>
                <div className="shrink-0 text-sm text-muted-foreground font-mono">
                    {visibleModelPages.length >= 1
                        ? `${visibleModelPages.length} model${visibleModelPages.length === 1 ? "" : "s"}`
                        : "(coming soon)"}
                </div>
            </Link>

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
            ) : visiblePages.length === 0 ? (
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
