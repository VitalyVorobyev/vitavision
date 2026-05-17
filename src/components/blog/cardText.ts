/** Card body text: the tagline if authored, else the summary truncated to ~140 chars. */
export function cardBody(tagline?: string, summary?: string): string | undefined {
    if (tagline) return tagline;
    if (!summary) return undefined;
    return summary.length > 140 ? `${summary.slice(0, 140)}…` : summary;
}

/** Per-kind text colours for the kind label — kept in sync with AtlasPageHeader's KIND_CLASSES. */
export const KIND_TEXT_CLASSES: Record<"algorithm" | "model" | "concept", string> = {
    algorithm: "text-brand",
    model:     "text-violet-600 dark:text-violet-400",
    concept:   "text-muted-foreground",
};

export const KIND_LABEL: Record<"algorithm" | "model" | "concept", string> = {
    algorithm: "Algorithm",
    model:     "Model",
    concept:   "Concept",
};
