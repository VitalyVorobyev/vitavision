import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { algorithmPages, modelPages } from "../generated/content-index.ts";
import TagFilter from "../components/blog/TagFilter.tsx";
import SeoHead from "../components/seo/SeoHead.tsx";
import AlgorithmCard from "../components/blog/AlgorithmCard.tsx";
import ModelCard from "../components/blog/ModelCard.tsx";
import {
    algorithmCategoryValues,
    modelCategoryValues,
    type AlgorithmCategory,
    type AlgorithmIndexEntry,
    type ModelCategory,
    type ModelIndexEntry,
} from "../lib/content/schema.ts";
import { categoryLabel, modelCategoryLabel } from "../components/algorithms/categoryLabels.ts";
import { useIsAdmin } from "../lib/auth/useIsAdmin.ts";

type Tab = "classical" | "models";

const TABS: { key: Tab; label: string }[] = [
    { key: "classical", label: "Classical" },
    { key: "models", label: "Models" },
];

function parseTab(raw: string | null): Tab {
    return raw === "models" ? "models" : "classical";
}

export default function AlgorithmIndex() {
    const [searchParams, setSearchParams] = useSearchParams();
    const tab = parseTab(searchParams.get("tab"));
    const [selectedTag, setSelectedTag] = useState<string | null>(null);
    const isAdmin = useIsAdmin();

    const visibleAlgorithms = useMemo(
        () => algorithmPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );
    const visibleModels = useMemo(
        () => modelPages.filter((p) => isAdmin || !p.frontmatter.draft),
        [isAdmin],
    );

    const allTags = useMemo(() => {
        const tagSet = new Set<string>();
        for (const page of visibleAlgorithms) {
            for (const tag of page.frontmatter.tags) tagSet.add(tag);
        }
        for (const page of visibleModels) {
            for (const tag of page.frontmatter.tags) tagSet.add(tag);
        }
        return [...tagSet].sort();
    }, [visibleAlgorithms, visibleModels]);

    const filteredAlgorithms = useMemo(
        () =>
            selectedTag
                ? visibleAlgorithms.filter((p) => p.frontmatter.tags.includes(selectedTag))
                : visibleAlgorithms,
        [selectedTag, visibleAlgorithms],
    );
    const filteredModels = useMemo(
        () =>
            selectedTag
                ? visibleModels.filter((p) => p.frontmatter.tags.includes(selectedTag))
                : visibleModels,
        [selectedTag, visibleModels],
    );

    const groupedAlgorithms = useMemo(() => {
        const byCategory = new Map<AlgorithmCategory, AlgorithmIndexEntry[]>();
        for (const entry of filteredAlgorithms) {
            const bucket = byCategory.get(entry.frontmatter.category) ?? [];
            bucket.push(entry);
            byCategory.set(entry.frontmatter.category, bucket);
        }
        return algorithmCategoryValues
            .map((category) => ({ category, entries: byCategory.get(category) ?? [] }))
            .filter((group) => group.entries.length > 0);
    }, [filteredAlgorithms]);

    const groupedModels = useMemo(() => {
        const byCategory = new Map<ModelCategory, ModelIndexEntry[]>();
        for (const entry of filteredModels) {
            const bucket = byCategory.get(entry.frontmatter.category) ?? [];
            bucket.push(entry);
            byCategory.set(entry.frontmatter.category, bucket);
        }
        return modelCategoryValues
            .map((category) => ({ category, entries: byCategory.get(category) ?? [] }))
            .filter((group) => group.entries.length > 0);
    }, [filteredModels]);

    const setTab = (next: Tab) => {
        const params = new URLSearchParams(searchParams);
        if (next === "classical") params.delete("tab");
        else params.set("tab", next);
        setSearchParams(params, { replace: false });
    };

    return (
        <div className="max-w-screen-xl mx-auto py-16 px-4 lg:px-8 space-y-10 animate-in fade-in">
            <SeoHead
                title="Algorithms"
                description="Classical computer vision algorithms and deep-learning models — explore, understand, and experiment."
            />
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Algorithms</h1>
                <p className="text-muted-foreground text-lg">
                    Classical computer vision algorithms and deep-learning models — explore, understand, and experiment.
                </p>
            </div>

            <div
                role="tablist"
                aria-label="Algorithm family"
                className="inline-flex rounded-lg border border-border overflow-hidden"
            >
                {TABS.map(({ key, label }) => {
                    const active = tab === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={active}
                            onClick={() => setTab(key)}
                            className={`px-4 py-1.5 text-sm font-medium transition-colors ${
                                active
                                    ? "bg-primary/10 text-primary"
                                    : "bg-background text-muted-foreground hover:bg-muted/60"
                            }`}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            <TagFilter tags={allTags} selected={selectedTag} onSelect={setSelectedTag} />

            {tab === "classical" ? (
                groupedAlgorithms.length > 0 ? (
                    groupedAlgorithms.map(({ category, entries }) => (
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
                ) : visibleAlgorithms.length === 0 ? (
                    <p className="text-muted-foreground">No algorithm pages yet. Stay tuned!</p>
                ) : (
                    <p className="text-muted-foreground">No algorithms match the selected tag.</p>
                )
            ) : groupedModels.length > 0 ? (
                groupedModels.map(({ category, entries }) => (
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
            ) : visibleModels.length === 0 ? (
                <p className="text-muted-foreground">No model pages yet. Stay tuned!</p>
            ) : (
                <p className="text-muted-foreground">No models match the selected tag.</p>
            )}
        </div>
    );
}
