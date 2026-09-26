/**
 * Markdown rendering pipeline for content:build.
 *
 * Holds the unified/remark/rehype pipeline (sanitize schema, Shiki syntax
 * highlighting, KaTeX math, custom vv-* directives) plus the generic
 * per-directory loader that reads `.md` files, validates frontmatter against
 * a zod schema, and renders the body to sanitized HTML.
 */
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeKatex from "rehype-katex";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeStringify from "rehype-stringify";
import { createHighlighter } from "shiki";
import { visit } from "unist-util-visit";
import type { Element, Root as HastRoot } from "hast";
import type { ZodType } from "zod";

import remarkVvEmbeds from "../remark-vv-embeds.ts";
import remarkVvBlocks from "../remark-vv-blocks.ts";
import remarkVvInline from "../remark-vv-inline.ts";
import remarkVvDirectiveFallback from "../remark-vv-directive-fallback.ts";
import { computeReadingTimeMinutes } from "../reading-time.ts";
import remarkEquationReferences from "../remark-equation-references.ts";
import rehypeNumberedEquations from "../rehype-numbered-equations.ts";

/** Rewrite relative image paths (./images/*, ../images/*, images/*) to /content/images/*. */
function resolveContentImagePaths(html: string): string {
    return html.replace(/src="(?:\.{1,2}\/)?images\//g, 'src="/content/images/');
}

// Extended sanitization schema to allow custom blocks, Shiki, and KaTeX output.
// clobberPrefix is disabled because all markdown content is authored in-repo (not user input),
// so the DOM-clobbering protection is unnecessary and its prefix breaks in-page anchor links
// (headings get `id="user-content-foo"` but `[link](#foo)` is not rewritten to match).
export const sanitizeSchema = {
    ...defaultSchema,
    clobberPrefix: "",
    tagNames: [
        ...(defaultSchema.tagNames ?? []),
        "section",
        "span",
        "math",
        "semantics",
        "mrow",
        "mi",
        "mo",
        "mn",
        "msup",
        "msub",
        "mfrac",
        "mover",
        "munder",
        "mtext",
        "annotation",
        "mtable",
        "mtr",
        "mtd",
        "menclose",
        "mspace",
        "msqrt",
        "mroot",
        "mpadded",
        "mstyle",
        "mglyph",
        "figure",
        "figcaption",
        // KaTeX SVG output for tall stretchy delimiters
        "svg",
        "path",
    ],
    attributes: {
        ...defaultSchema.attributes,
        a: [...(defaultSchema.attributes?.a ?? []), "target", "rel"],
        h1: [...(defaultSchema.attributes?.h1 ?? []), "id"],
        h2: [...(defaultSchema.attributes?.h2 ?? []), "id"],
        h3: [...(defaultSchema.attributes?.h3 ?? []), "id"],
        h4: [...(defaultSchema.attributes?.h4 ?? []), "id"],
        h5: [...(defaultSchema.attributes?.h5 ?? []), "id"],
        h6: [...(defaultSchema.attributes?.h6 ?? []), "id"],
        p: [...(defaultSchema.attributes?.p ?? []), "className"],
        section: ["className", "data-kind", "dataKind"],
        div: [
            ...(defaultSchema.attributes?.div ?? []),
            "id",
            "className",
            "data-vv-illustration",
            "data-vv-preset",
            "data-vv-pattern",
            "data-vv-rotation",
            "data-vv-controls",
            "data-vv-animate-rotation",
            "data-vv-grid",
            "data-vv-delaunay",
            "data-vv-voronoi",
            "data-vv-circumcircles",
            "data-vv-legend",
        ],
        span: [...(defaultSchema.attributes?.span ?? []), "className", "style", "aria-label", "ariaLabel", "aria-hidden", "ariaHidden"],
        code: [...(defaultSchema.attributes?.code ?? []), "className", "style"],
        pre: [...(defaultSchema.attributes?.pre ?? []), "className", "style", "tabindex", "tabIndex"],
        math: ["xmlns", "display"],
        annotation: ["encoding"],
        svg: ["xmlns", "viewBox", "preserveAspectRatio", "width", "height", "style", "aria-hidden", "ariaHidden"],
        path: ["d"],
        // Allow KaTeX classes on all elements
        "*": ["className", "style"],
    },
};

/** Initialize the Shiki highlighter used by `renderMarkdown`'s post-sanitize pass. */
export async function createShikiHighlighter() {
    return createHighlighter({
        themes: ["vitesse-dark", "vitesse-light"],
        langs: [
            "python",
            "typescript",
            "javascript",
            "rust",
            "bash",
            "json",
            "yaml",
            "toml",
            "html",
            "css",
            "sql",
            "c",
            "cpp",
            "markdown",
            "latex",
        ],
    });
}

export async function renderMarkdown(content: string, highlighter: Awaited<ReturnType<typeof createShikiHighlighter>>): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkVvInline)
        .use(remarkVvBlocks)
        .use(remarkVvEmbeds)
        .use(remarkVvDirectiveFallback)
        .use(remarkMath)
        .use(remarkEquationReferences)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeNumberedEquations)
        .use(rehypeKatex)
        .use(() => {
            // Add target="_blank" and rel="noopener noreferrer" to external links
            return (tree: HastRoot) => {
                visit(tree, "element", (node: Element) => {
                    if (node.tagName !== "a") return;
                    const href = node.properties?.href;
                    if (typeof href === "string" && /^https?:\/\//.test(href)) {
                        node.properties.target = "_blank";
                        node.properties.rel = "noopener noreferrer";
                    }
                });
            };
        })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- rehype-sanitize schema type is complex
        .use(rehypeSanitize, sanitizeSchema as any)
        .use(() => {
            // Custom Shiki transformer — runs AFTER sanitize to avoid style stripping
            return (tree: HastRoot) => {
                visit(tree, "element", (node: Element) => {
                    if (
                        node.tagName === "pre" &&
                        (node.children?.[0] as Element)?.tagName === "code"
                    ) {
                        const codeNode = node.children[0] as Element;
                        const classNames = codeNode.properties?.className as string[] | undefined;
                        const className = classNames?.[0] ?? "";
                        const langMatch = String(className).match(/language-(\w+)/);
                        const lang = langMatch?.[1];

                        // Skip mermaid — handled client-side
                        if (lang === "mermaid") return;

                        // Get raw text from code node
                        const rawCode = codeNode.children
                            ?.map((c) => ("value" in c ? c.value : ""))
                            .join("");

                        if (!rawCode || !lang) return;

                        try {
                            const loadedLangs = highlighter.getLoadedLanguages();
                            if (!loadedLangs.includes(lang)) return;

                            const highlighted = highlighter.codeToHtml(rawCode, {
                                lang,
                                themes: {
                                    dark: "vitesse-dark",
                                    light: "vitesse-light",
                                },
                                defaultColor: false,
                            });

                            // Replace the <pre> node with raw HTML
                            (node as unknown as { type: string; value: string }).type = "raw";
                            (node as unknown as { value: string }).value = highlighted;
                            delete (node as Partial<Element>).tagName;
                            delete (node as Partial<Element>).children;
                            delete (node as Partial<Element>).properties;
                        } catch {
                            // If highlighting fails, leave the node as-is
                        }
                    }
                });
            };
        })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(content);
    return resolveContentImagePaths(String(result));
}

/**
 * Reads every `.md` file directly under `dir`, validates its frontmatter against
 * `schema`, derives its slug via `slugFn`, and renders its body to sanitized HTML.
 * Returns `[]` when `dir` does not exist.
 */
export async function processDirectory<T>(
    dir: string,
    schema: ZodType<T>,
    slugFn: (filename: string) => string,
    highlighter: Awaited<ReturnType<typeof createShikiHighlighter>>,
): Promise<{ slug: string; frontmatter: T; html: string }[]> {
    if (!existsSync(dir)) return [];

    const files = readdirSync(dir).filter((f) => f.endsWith(".md"));
    const entries: { slug: string; frontmatter: T; html: string }[] = [];

    for (const file of files) {
        const raw = readFileSync(join(dir, file), "utf-8");
        const { data, content } = matter(raw);
        if (data.readingTimeMinutes === undefined) {
            data.readingTimeMinutes = computeReadingTimeMinutes(content);
        }
        const parsed = schema.parse(data);
        const html = await renderMarkdown(content, highlighter);
        entries.push({ slug: slugFn(file), frontmatter: parsed, html });
    }

    return entries;
}
