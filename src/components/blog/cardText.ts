/** Card body text: the tagline if authored, else the summary truncated to ~140 chars. */
export function cardBody(tagline?: string, summary?: string): string | undefined {
    if (tagline) return tagline;
    if (!summary) return undefined;
    return summary.length > 140 ? `${summary.slice(0, 140)}…` : summary;
}
