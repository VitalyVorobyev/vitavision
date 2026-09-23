import { useState } from "react";
import { blogPosts, demoPages } from "../../generated/content-index.ts";
import { narrativeRefs } from "../../generated/narrative-refs.ts";
import { useIsAdmin } from "../../lib/auth/useIsAdmin.ts";
import { buildRelationDisplay, hasRawGraphEdges } from "../../lib/atlas/relationDisplay.ts";
import type { TypedRelation } from "../../lib/atlas/relationDisplay.ts";
import RelationshipSidebar from "./relationship/RelationshipSidebar.tsx";
import RelationshipBlock from "./relationship/RelationshipBlock.tsx";

export type { TypedRelation };

interface RelationshipPanelProps {
    /** The slug of the page being rendered. */
    slug: string;
    /** Layout variant — "block" is the default bottom-of-page card; "sidebar" is the sticky right-rail design. */
    variant?: "block" | "sidebar";
    /** Sidebar-only: blog post slugs surfaced under "Also see". */
    relatedPosts?: string[];
    /** Sidebar-only: demo slugs surfaced under "Also see". */
    relatedDemos?: string[];
    /** When set, render a prominent "Superseded by" section linking this slug. The caller decides — typically only set when `quality: "historical"`. */
    supersededBy?: string;
}

export default function RelationshipPanel({
    slug,
    variant = "block",
    relatedPosts,
    relatedDemos,
    supersededBy,
}: RelationshipPanelProps) {
    const isAdmin = useIsAdmin();

    const [sectionsOpen] = useState<boolean>(() =>
        typeof window !== "undefined" && typeof window.matchMedia === "function"
            ? window.matchMedia("(min-width: 1024px)").matches
            : true
    );

    // Narratives that feature this page (drafts already excluded by the build).
    const resolvedNarratives = (narrativeRefs[slug] ?? []).map((ref) => ({
        slug: ref.slug,
        title: ref.title,
        href: `/atlas/narratives/${ref.slug}`,
    }));

    if (!hasRawGraphEdges(slug) && resolvedNarratives.length === 0) return null;

    const result = buildRelationDisplay(slug, { supersededBy, showDrafts: isAdmin });

    // ── Resolve blog post + demo links ───────────────────────────────────────
    const resolvedPosts = (relatedPosts ?? []).map((s) => {
        const entry = blogPosts.find((p) => p.slug === s);
        if (!entry) {
            console.warn(`[RelationshipPanel] blog post slug "${s}" not found in content-index`);
            return null;
        }
        return { slug: s, title: entry.frontmatter.title, href: `/blog/${s}` };
    }).filter((x): x is { slug: string; title: string; href: string } => x !== null);

    const resolvedDemos = (relatedDemos ?? []).map((s) => {
        const entry = demoPages.find((p) => p.slug === s);
        if (!entry) {
            console.warn(`[RelationshipPanel] demo slug "${s}" not found in content-index`);
            return null;
        }
        return { slug: s, title: entry.frontmatter.title, href: `/demos/${s}` };
    }).filter((x): x is { slug: string; title: string; href: string } => x !== null);

    if (variant === "sidebar") {
        return (
            <RelationshipSidebar
                result={result}
                supersededBy={supersededBy}
                sectionsOpen={sectionsOpen}
                resolvedNarratives={resolvedNarratives}
                resolvedPosts={resolvedPosts}
                resolvedDemos={resolvedDemos}
            />
        );
    }

    return <RelationshipBlock result={result} supersededBy={supersededBy} />;
}
