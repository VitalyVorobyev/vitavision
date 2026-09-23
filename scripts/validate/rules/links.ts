/**
 * Rule: internal links in markdown bodies, for every content kind, validated
 * against the router (src/App.tsx).
 *
 * Scans `](/...)` markdown links and `href="/..."` HTML links, ignoring
 * fenced code blocks and inline code (a link inside a code sample is
 * illustrative text, not a real reference). Recognizes:
 *   - static routes: /, /blog, /atlas, /authors, /demos, /editor (any query
 *     string), /tools/target-generator, /about
 *   - /atlas/<slug>, /atlas/narratives/<slug> — slug must exist on disk
 *     (draft-inclusive, same namespace as rules/slugs.ts). A `#fragment`
 *     is checked against the target page's heading ids (warning only).
 *   - /blog/<slug>, /demos/<slug> — slug must exist on disk.
 *   - /authors/<id> — id must exist in docs/papers/authors.yaml (merged-away
 *     ids included: `/authors/<old-id>` still redirects, per CLAUDE.md).
 *   - legacy /algorithms, /algorithms/models(/<slug>)?, /algorithms/<slug>,
 *     /concepts/<slug> — still redirect, so only a warning ("use /atlas/…").
 *   - anything else with a leading "/" — error, unknown path prefix.
 *
 * Anchor-id computation uses github-slugger (the same slugger rehype-slug
 * uses to assign heading ids at build time — see scripts/validate/render.ts's
 * `renderNarrativeBodyForAnchors` for the equivalent full-render approach the
 * narratives rule uses). This rule skips the render pipeline for performance
 * (links, unlike narrative steps, run over the whole corpus) and instead
 * approximates hast-util-to-string by stripping common inline markdown
 * (links, images, code spans, emphasis) from the heading line before
 * slugifying — good enough for a warning-level check.
 */
import GithubSlugger from "github-slugger";
import type { BodyEntry, Diagnostic, ValidationContext } from "../types.ts";

const STATIC_ROUTES = new Set([
    "/",
    "/blog",
    "/atlas",
    "/authors",
    "/demos",
    "/editor",
    "/tools/target-generator",
    "/about",
]);

const LEGACY_ROUTE_RES = [
    /^\/algorithms$/,
    /^\/algorithms\/models$/,
    /^\/algorithms\/models\/[^/]+$/,
    /^\/algorithms\/[^/]+$/,
    /^\/concepts\/[^/]+$/,
];

/** Blanks fenced code blocks and inline code spans (same length, so offsets
 *  are unaffected) — links/headings inside code are not real references. */
function stripCode(content: string): string {
    let out = content.replace(/```[\s\S]*?```/g, (m) => " ".repeat(m.length));
    out = out.replace(/`[^`\n]*`/g, (m) => " ".repeat(m.length));
    return out;
}

function extractInternalLinks(content: string): string[] {
    const scanned = stripCode(content);
    const hrefs: string[] = [];
    const mdLinkRe = /]\((\/[^)\s]+)\)/g;
    let m: RegExpExecArray | null;
    while ((m = mdLinkRe.exec(scanned)) !== null) hrefs.push(m[1]);
    const htmlHrefRe = /href=["'](\/[^"']+)["']/g;
    while ((m = htmlHrefRe.exec(scanned)) !== null) hrefs.push(m[1]);
    return hrefs;
}

/** Approximates hast-util-to-string on a heading's inline children: resolve
 *  link/image text, unwrap inline code, strip emphasis markers and any
 *  literal HTML tags. */
function headingTextToPlain(raw: string): string {
    let s = raw;
    s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
    s = s.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    s = s.replace(/`([^`]*)`/g, "$1");
    s = s.replace(/\*\*\*|\*\*|\*|___|__|_/g, "");
    s = s.replace(/<[^>]+>/g, "");
    return s.trim();
}

function computeHeadingIds(content: string): Set<string> {
    const stripped = stripCode(content);
    const slugger = new GithubSlugger();
    const ids = new Set<string>();
    const headingRe = /^#{1,6}\s+(.+?)\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = headingRe.exec(stripped)) !== null) {
        const text = headingTextToPlain(m[1]);
        if (text) ids.add(slugger.slug(text));
    }
    return ids;
}

export function linksRule(ctx: ValidationContext): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];

    const bySlugKind = new Map<string, BodyEntry>();
    for (const e of ctx.bodyEntries) bySlugKind.set(`${e.kind}:${e.slug}`, e);
    const headingCache = new Map<string, Set<string>>();
    function headingsFor(kind: string, slug: string): Set<string> | undefined {
        const key = `${kind}:${slug}`;
        const cached = headingCache.get(key);
        if (cached) return cached;
        const entry = bySlugKind.get(key);
        if (!entry) return undefined;
        const ids = computeHeadingIds(entry.content);
        headingCache.set(key, ids);
        return ids;
    }

    for (const e of ctx.bodyEntries) {
        for (const href of extractInternalLinks(e.content)) {
            const hashIdx = href.indexOf("#");
            const beforeHash = hashIdx === -1 ? href : href.slice(0, hashIdx);
            const frag = hashIdx === -1 ? undefined : href.slice(hashIdx + 1);
            const path = beforeHash.split("?")[0];

            if (STATIC_ROUTES.has(path)) continue;

            const narrativeMatch = path.match(/^\/atlas\/narratives\/([^/]+)$/);
            if (narrativeMatch) {
                const slug = narrativeMatch[1];
                if (!ctx.narrativeSlugs.has(slug)) {
                    diagnostics.push({ level: "error", message: `[${e.file}] broken link: ${href} (narrative slug not found)` });
                } else if (frag) {
                    const ids = headingsFor("narrative", slug);
                    if (ids && !ids.has(frag)) {
                        diagnostics.push({ level: "warning", message: `[${e.file}] broken link: ${href} (anchor "#${frag}" not found on narrative "${slug}")` });
                    }
                }
                continue;
            }

            const atlasMatch = path.match(/^\/atlas\/([^/]+)$/);
            if (atlasMatch) {
                const slug = atlasMatch[1];
                if (!ctx.knownSlugs.has(slug)) {
                    diagnostics.push({ level: "error", message: `[${e.file}] broken link: ${href} (atlas slug not found)` });
                } else if (frag) {
                    const kind = bySlugKind.has(`algorithm:${slug}`)
                        ? "algorithm"
                        : bySlugKind.has(`model:${slug}`)
                            ? "model"
                            : bySlugKind.has(`concept:${slug}`)
                                ? "concept"
                                : undefined;
                    const ids = kind ? headingsFor(kind, slug) : undefined;
                    if (ids && !ids.has(frag)) {
                        diagnostics.push({ level: "warning", message: `[${e.file}] broken link: ${href} (anchor "#${frag}" not found on atlas page "${slug}")` });
                    }
                }
                continue;
            }

            const blogMatch = path.match(/^\/blog\/([^/]+)$/);
            if (blogMatch) {
                if (!ctx.blogSlugs.has(blogMatch[1])) {
                    diagnostics.push({ level: "error", message: `[${e.file}] broken link: ${href} (blog slug not found)` });
                }
                continue;
            }

            const demoMatch = path.match(/^\/demos\/([^/]+)$/);
            if (demoMatch) {
                if (!ctx.demoSlugs.has(demoMatch[1])) {
                    diagnostics.push({ level: "error", message: `[${e.file}] broken link: ${href} (demo slug not found)` });
                }
                continue;
            }

            const authorMatch = path.match(/^\/authors\/([^/]+)$/);
            if (authorMatch) {
                if (!ctx.authorIds.has(authorMatch[1])) {
                    diagnostics.push({ level: "error", message: `[${e.file}] broken link: ${href} (author id not found)` });
                }
                continue;
            }

            if (LEGACY_ROUTE_RES.some((re) => re.test(path))) {
                diagnostics.push({ level: "warning", message: `[${e.file}] legacy link, use /atlas/…: ${href}` });
                continue;
            }

            diagnostics.push({ level: "error", message: `[${e.file}] unknown path prefix: ${href}` });
        }
    }

    return diagnostics;
}
