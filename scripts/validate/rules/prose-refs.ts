/**
 * Rule 10: prose references not in papers index (warning only).
 *
 * For every non-draft algorithm/model/concept page, scan the markdown body
 * for arXiv/DOI links or bare-text citations and flag any that do not
 * resolve to a docs/papers/index.yaml entry. Never an error — a page may
 * legitimately cite a paper in prose (e.g. a "# References" list) before
 * it has been run through paper-ingest.
 */
import { normalizeArxivId, normalizeDoiText, stripTrailingPunctuation } from "../../lib/text.ts";
import type { Diagnostic, ParsedEntry, ValidationContext } from "../types.ts";

// normalizeArxivId / normalizeDoi live in scripts/lib/text.ts as
// normalizeArxivId / normalizeDoiText (this file's DOI normalizer strips
// trailing prose punctuation, distinct from papers-backfill-authors.ts's
// URL-prefix-stripping normalizer — see that module's header).
const normalizeDoi = normalizeDoiText;

interface ProseRef {
    /** Human-readable form for the warning message, e.g. "arXiv:1706.03762" or "doi:10.1109/...". */
    display: string;
    normalized: string;
    kind: "arxiv" | "doi";
}

/**
 * Scan a page's raw markdown body for arXiv/DOI links or bare-text citations.
 * Matches (case-insensitive):
 *   - arxiv.org/abs/<id>
 *   - arxiv.org/pdf/<id>
 *   - doi.org/<doi>
 *   - bare "arXiv:<id>" or "arXiv <id>" text (no URL)
 * Deduplicates by normalized id within a single page.
 */
function scanProseReferences(content: string): ProseRef[] {
    const refs: ProseRef[] = [];
    const seen = new Set<string>();

    const pushRef = (rawId: string, kind: "arxiv" | "doi"): void => {
        const normalized = kind === "arxiv" ? normalizeArxivId(rawId) : normalizeDoi(rawId);
        const key = `${kind}:${normalized}`;
        if (seen.has(key)) return;
        seen.add(key);
        refs.push({
            display: kind === "arxiv" ? `arXiv:${normalized}` : `doi:${normalized}`,
            normalized,
            kind,
        });
    };

    const arxivUrlRe = /arxiv\.org\/(?:abs|pdf)\/([^\s)\]"'<>]+)/gi;
    for (const m of content.matchAll(arxivUrlRe)) {
        pushRef(stripTrailingPunctuation(m[1]), "arxiv");
    }

    const doiUrlRe = /doi\.org\/([^\s)\]"'<>]+)/gi;
    for (const m of content.matchAll(doiUrlRe)) {
        pushRef(stripTrailingPunctuation(m[1]), "doi");
    }

    // Bare "arXiv:<id>" or "arXiv <id>" text (not part of a URL already matched above).
    const bareArxivRe = /\barxiv[:\s]+([0-9]{4}\.[0-9]{4,5}(?:v\d+)?|[a-z-]+\/\d{7})/gi;
    for (const m of content.matchAll(bareArxivRe)) {
        pushRef(stripTrailingPunctuation(m[1]), "arxiv");
    }

    return refs;
}

export function proseRefsRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const knownArxivIds = new Set<string>();
    const knownDois = new Set<string>();
    for (const entry of ctx.sourceIndex.values()) {
        if (entry.arxiv) knownArxivIds.add(normalizeArxivId(entry.arxiv));
        if (entry.doi) knownDois.add(normalizeDoi(entry.doi));
    }

    function checkProseReferences(e: ParsedEntry, kind: "algorithm" | "model" | "concept"): void {
        for (const ref of scanProseReferences(e.content)) {
            const known = ref.kind === "arxiv"
                ? knownArxivIds.has(ref.normalized)
                : knownDois.has(ref.normalized);
            if (!known) {
                diagnostics.push({
                    level: "warning",
                    message: `[${kind}/${e.slug}] prose reference not in papers index: ${ref.display}`,
                });
            }
        }
    }

    for (const e of ctx.algoFiltered) checkProseReferences(e, "algorithm");
    for (const e of ctx.modelFiltered) checkProseReferences(e, "model");
    for (const e of ctx.conceptFiltered) checkProseReferences(e, "concept");

    return diagnostics;
}
