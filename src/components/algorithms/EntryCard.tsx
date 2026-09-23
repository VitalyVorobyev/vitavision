import { algorithmPages, modelPages, conceptPages } from "../../generated/content-index.ts";
import AlgorithmCard from "../blog/AlgorithmCard.tsx";
import ModelCard from "../blog/ModelCard.tsx";
import ConceptCard from "../blog/ConceptCard.tsx";
import type { UnifiedEntry } from "../../lib/atlas/unifiedGroups.ts";

/** Card renderer — picks the right component by entry kind. */
export default function EntryCard({ entry, layout }: { entry: UnifiedEntry; layout: "grid" | "list" }) {
    const variant = layout === "list" ? "horizontal" : "compact";
    if (entry.kind === "algorithm") {
        const full = algorithmPages.find((p) => p.slug === entry.slug);
        if (!full) return null;
        return <AlgorithmCard entry={full} variant={variant} />;
    }
    if (entry.kind === "model") {
        const full = modelPages.find((p) => p.slug === entry.slug);
        if (!full) return null;
        return <ModelCard entry={full} variant={variant} />;
    }
    const full = conceptPages.find((p) => p.slug === entry.slug);
    if (!full) return null;
    return <ConceptCard entry={full} variant={variant} />;
}
