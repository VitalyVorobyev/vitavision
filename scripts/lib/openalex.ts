/**
 * OpenAlex API helpers shared between papers-fetch-meta.ts and
 * papers-backfill-authors.ts.
 */

/** Strips the `https://openalex.org/` prefix from an OpenAlex author URL. */
export function bareAuthorId(authorUrl: string): string {
    return authorUrl.replace(/^https?:\/\/openalex\.org\//i, "");
}

/** Strips the `https://orcid.org/` prefix from an ORCID URL. */
export function bareOrcid(orcidUrl: string): string {
    return orcidUrl.replace(/^https?:\/\/orcid\.org\//i, "");
}

/**
 * Builds the OpenAlex polite-pool User-Agent string. `scriptName` is used
 * only in the stderr warning printed when `OPENALEX_EMAIL` is unset, so each
 * call site keeps its own bespoke message prefix (e.g. "papers:fetch-meta"
 * vs "papers:backfill-authors").
 */
export function userAgent(scriptName: string): string {
    const email = process.env.OPENALEX_EMAIL;
    if (!email) {
        process.stderr.write(
            `${scriptName} — OPENALEX_EMAIL not set; using default address. ` +
            "Set OPENALEX_EMAIL=you@example.com to join the polite pool for higher rate limits.\n"
        );
        return "vitavision/0.1 (mailto:vitavision@example.invalid)";
    }
    return `vitavision/0.1 (mailto:${email})`;
}

/** Appends `?api_key=...` (or `&api_key=...`) when `OPENALEX_API_KEY` is set. */
export function withAuth(url: string): string {
    const apiKey = process.env.OPENALEX_API_KEY;
    if (!apiKey) return url;
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}api_key=${encodeURIComponent(apiKey)}`;
}
