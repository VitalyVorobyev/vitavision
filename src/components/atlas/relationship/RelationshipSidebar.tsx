import type { RelationDisplayResult } from "../../../lib/atlas/relationDisplay.ts";
import { SECTION_ORDER } from "../../../lib/atlas/relationDisplay.ts";
import SidebarSection from "./SidebarSection.tsx";
import TypedRelationSection from "./TypedRelationSection.tsx";
import LinkSection from "./LinkSection.tsx";
import SupersededBy from "./SupersededBy.tsx";

export type ResolvedLink = { slug: string; title: string; href: string };

interface RelationshipSidebarProps {
    result: RelationDisplayResult;
    supersededBy?: string;
    sectionsOpen: boolean;
    resolvedNarratives: ResolvedLink[];
    resolvedPosts: ResolvedLink[];
    resolvedDemos: ResolvedLink[];
}

export default function RelationshipSidebar({
    result,
    supersededBy,
    sectionsOpen,
    resolvedNarratives,
    resolvedPosts,
    resolvedDemos,
}: RelationshipSidebarProps) {
    const hasAlsoSee = resolvedPosts.length + resolvedDemos.length + resolvedNarratives.length > 0;
    if (!result.hasGraphContent && !hasAlsoSee && !result.hasSuccessor) return null;

    // Determine which "Also see" section renders first (gets the border-top separator).
    const narrativesFirst = resolvedNarratives.length > 0;
    const postsFirst = !narrativesFirst && resolvedPosts.length > 0;

    return (
        <div className="border border-border rounded-[10px] bg-card p-[18px]">
            {result.hasSuccessor && <SupersededBy successor={supersededBy!} variant="sidebar" />}
            <SidebarSection
                heading="Prerequisites"
                slugs={result.prerequisites}
                itemColor="text-foreground"
                defaultOpen={sectionsOpen}
            />
            {SECTION_ORDER.map((label) => {
                const items = result.grouped.get(label) ?? [];
                if (items.length === 0) return null;
                return (
                    <TypedRelationSection
                        key={label}
                        heading={label}
                        items={items}
                        defaultOpen={sectionsOpen}
                    />
                );
            })}
            <SidebarSection
                heading="Used by"
                slugs={result.usedBy}
                itemColor="text-blue-600 dark:text-blue-400"
                maxItems={4}
                defaultOpen={sectionsOpen}
            />
            <LinkSection
                heading="Narratives"
                items={resolvedNarratives}
                icon="✦"
                defaultOpen={sectionsOpen}
                borderTop={narrativesFirst}
            />
            <LinkSection
                heading="Blog posts"
                items={resolvedPosts}
                icon="📝"
                defaultOpen={sectionsOpen}
                borderTop={postsFirst}
            />
            <LinkSection
                heading="Demos"
                items={resolvedDemos}
                icon="▶"
                defaultOpen={sectionsOpen}
                borderTop={!narrativesFirst && !postsFirst && resolvedDemos.length > 0}
            />
        </div>
    );
}
