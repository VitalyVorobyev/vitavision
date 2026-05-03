import RelationshipPanel from "./RelationshipPanel.tsx";

interface RelationsSidebarProps {
    slug: string;
    relatedPosts?: string[];
    relatedDemos?: string[];
}

/**
 * Thin wrapper around `<RelationshipPanel variant="sidebar" />` for clarity at
 * call sites in the Atlas page layouts.
 */
export default function RelationsSidebar({ slug, relatedPosts, relatedDemos }: RelationsSidebarProps) {
    return (
        <RelationshipPanel
            slug={slug}
            variant="sidebar"
            relatedPosts={relatedPosts}
            relatedDemos={relatedDemos}
        />
    );
}
