/**
 * Build-time content guards for content:build.
 */

export interface EmptyDivGuardEntry {
    slug: string;
    html: string;
}

/**
 * Fail if any rendered page still contains `<div></div>`: the exact signature of
 * an unclaimed remark-directive node. Legitimate vv-block `<div>`s always carry
 * a className and KaTeX output always has content — so this string is a zero-
 * false-positive sentinel for stray prose colons that leaked through as directives.
 */
export function checkEmptyDivGuard(entries: EmptyDivGuardEntry[]): void {
    const emptyDivViolations: { slug: string; count: number }[] = [];
    for (const { slug, html } of entries) {
        const count = (html.match(/<div><\/div>/g) ?? []).length;
        if (count > 0) emptyDivViolations.push({ slug, count });
    }
    if (emptyDivViolations.length > 0) {
        const details = emptyDivViolations
            .map(({ slug, count }) => `  ${slug}: ${count} occurrence(s)`)
            .join("\n");
        throw new Error(
            `content:build — ${emptyDivViolations.length} page(s) contain <div></div> ` +
            `(unclaimed remark-directive — a stray colon in prose triggers an empty div):\n${details}`,
        );
    }
}
