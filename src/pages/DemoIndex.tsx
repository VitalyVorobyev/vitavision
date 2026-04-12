import { useState } from "react";
import { demoPages } from "../generated/content-index.ts";
import SeoHead from "../components/seo/SeoHead.tsx";
import TagFilter from "../components/blog/TagFilter.tsx";
import DemoCard from "../components/demos/DemoCard.tsx";

function uniqueTags(pages: typeof demoPages): string[] {
    const seen = new Set<string>();
    for (const page of pages) {
        for (const tag of page.frontmatter.tags) {
            seen.add(tag);
        }
    }
    return Array.from(seen);
}

export default function DemoIndex() {
    const [selectedTag, setSelectedTag] = useState<string | null>(null);

    const allTags = uniqueTags(demoPages);
    const filtered = selectedTag
        ? demoPages.filter((d) => d.frontmatter.tags.includes(selectedTag))
        : demoPages;

    return (
        <div className="max-w-screen-xl mx-auto py-16 px-4 lg:px-8 space-y-8 animate-in fade-in">
            <SeoHead
                title="Demos"
                description="Interactive demos of computer vision algorithms."
            />
            <div className="space-y-4">
                <h1 className="text-4xl font-bold tracking-tight">Demos</h1>
                <p className="text-muted-foreground text-lg">
                    Interactive demos of computer vision algorithms.
                </p>
            </div>

            <TagFilter
                tags={allTags}
                selected={selectedTag}
                onSelect={setSelectedTag}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((demo) => (
                    <DemoCard
                        key={demo.slug}
                        slug={demo.slug}
                        frontmatter={demo.frontmatter}
                    />
                ))}
            </div>
        </div>
    );
}
