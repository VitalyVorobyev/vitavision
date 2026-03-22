import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join, basename } from "node:path";
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

import remarkVvBlocks from "./remark-vv-blocks.ts";
import {
    blogFrontmatterSchema,
    algorithmFrontmatterSchema,
} from "../src/lib/content/schema.ts";
import type { BlogEntry, BlogIndexEntry, AlgorithmEntry, AlgorithmIndexEntry } from "../src/lib/content/schema.ts";
import type { ZodType } from "zod";

const CONTENT_DIR = join(import.meta.dir, "..", "content");
const GENERATED_DIR = join(import.meta.dir, "..", "src", "generated");

function blogSlug(filename: string): string {
    // YYYY-MM-DD-title.md → title
    return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function algoSlug(filename: string): string {
    return basename(filename, ".md");
}

/** Rewrite relative image paths (./images/*, ../images/*) to /content/images/*. */
function resolveContentImagePaths(html: string): string {
    return html.replace(/src="\.{1,2}\/images\//g, 'src="/content/images/');
}

// Extended sanitization schema to allow custom blocks, Shiki, and KaTeX output
const sanitizeSchema = {
    ...defaultSchema,
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
        section: ["className", "data-kind", "dataKind"],
        div: [...(defaultSchema.attributes?.div ?? []), "className"],
        span: [...(defaultSchema.attributes?.span ?? []), "className", "style", "aria-label", "ariaLabel", "aria-hidden", "ariaHidden"],
        code: [...(defaultSchema.attributes?.code ?? []), "className", "style"],
        pre: [...(defaultSchema.attributes?.pre ?? []), "className", "style", "tabindex", "tabIndex"],
        math: ["xmlns", "display"],
        annotation: ["encoding"],
        // Allow KaTeX classes on all elements
        "*": ["className", "style"],
    },
};

// Initialize Shiki highlighter
async function createShikiHighlighter() {
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

async function renderMarkdown(content: string, highlighter: Awaited<ReturnType<typeof createShikiHighlighter>>): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkVvBlocks)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeSlug)
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

async function processDirectory<T>(
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
        const parsed = schema.parse(data);
        const html = await renderMarkdown(content, highlighter);
        entries.push({ slug: slugFn(file), frontmatter: parsed, html });
    }

    return entries;
}

function serializeDate(value: unknown): string {
    if (value instanceof Date) return value.toISOString().split("T")[0];
    return String(value);
}

function serializeBlogEntry(entry: { slug: string; frontmatter: Record<string, unknown>; html: string }): BlogEntry {
    const { date, updated, ...rest } = entry.frontmatter;
    return {
        slug: entry.slug,
        frontmatter: {
            ...rest,
            date: serializeDate(date),
            ...(updated !== undefined ? { updated: serializeDate(updated) } : {}),
        } as BlogEntry["frontmatter"],
        html: entry.html,
    };
}

function generateOutput(blogPosts: BlogEntry[], algorithmPages: AlgorithmEntry[]): void {
    if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true });

    // 1. Per-slug html modules for lazy client-side loading.
    const blogHtmlDir = join(GENERATED_DIR, "content", "blog");
    const algoHtmlDir = join(GENERATED_DIR, "content", "algorithms");
    if (!existsSync(blogHtmlDir)) mkdirSync(blogHtmlDir, { recursive: true });
    if (!existsSync(algoHtmlDir)) mkdirSync(algoHtmlDir, { recursive: true });

    for (const post of blogPosts) {
        const file = join(blogHtmlDir, `${post.slug}.ts`);
        writeFileSync(file, `// Auto-generated — do not edit manually.\nexport const html = ${JSON.stringify(post.html)};\n`, "utf-8");
    }
    for (const page of algorithmPages) {
        const file = join(algoHtmlDir, `${page.slug}.ts`);
        writeFileSync(file, `// Auto-generated — do not edit manually.\nexport const html = ${JSON.stringify(page.html)};\n`, "utf-8");
    }

    // 2. Metadata-only index (no html)
    const blogIndex: BlogIndexEntry[] = blogPosts.map(({ slug, frontmatter }) => ({ slug, frontmatter }));
    const algoIndex: AlgorithmIndexEntry[] = algorithmPages.map(({ slug, frontmatter }) => ({ slug, frontmatter }));

    const indexLines = [
        '// Auto-generated by scripts/content-build.ts — do not edit manually.',
        'import type { BlogIndexEntry, AlgorithmIndexEntry } from "../lib/content/schema.ts";',
        "",
        `export const blogPosts: BlogIndexEntry[] = ${JSON.stringify(blogIndex, null, 2)};`,
        "",
        `export const algorithmPages: AlgorithmIndexEntry[] = ${JSON.stringify(algoIndex, null, 2)};`,
        "",
    ];
    const indexFile = join(GENERATED_DIR, "content-index.ts");
    writeFileSync(indexFile, indexLines.join("\n"), "utf-8");

    // 3. Explicit slug-to-loader manifests so client code never relies on fragile glob keys.
    const blogLoaderLines = [
        '// Auto-generated by scripts/content-build.ts — do not edit manually.',
        'export interface GeneratedHtmlModule { html: string; }',
        "",
        "export const blogHtmlLoaders: Record<string, () => Promise<GeneratedHtmlModule>> = {",
        ...blogPosts.map((post) => `  ${JSON.stringify(post.slug)}: () => import(${JSON.stringify(`./content/blog/${post.slug}.ts`)}),`),
        "};",
        "",
    ];
    writeFileSync(join(GENERATED_DIR, "blog-loaders.ts"), blogLoaderLines.join("\n"), "utf-8");

    const algorithmLoaderLines = [
        '// Auto-generated by scripts/content-build.ts — do not edit manually.',
        'export interface GeneratedHtmlModule { html: string; }',
        "",
        "export const algorithmHtmlLoaders: Record<string, () => Promise<GeneratedHtmlModule>> = {",
        ...algorithmPages.map((page) => `  ${JSON.stringify(page.slug)}: () => import(${JSON.stringify(`./content/algorithms/${page.slug}.ts`)}),`),
        "};",
        "",
    ];
    writeFileSync(join(GENERATED_DIR, "algorithm-loaders.ts"), algorithmLoaderLines.join("\n"), "utf-8");
}

async function main(): Promise<void> {
    const highlighter = await createShikiHighlighter();

    const rawBlogPosts = await processDirectory(
        join(CONTENT_DIR, "blog"),
        blogFrontmatterSchema,
        blogSlug,
        highlighter,
    );

    const includeDrafts = process.env.INCLUDE_DRAFTS === "true";

    // Serialize dates, filter drafts, and sort by date descending
    const blogPosts = rawBlogPosts
        .map((e) => serializeBlogEntry(e as { slug: string; frontmatter: Record<string, unknown>; html: string }))
        .filter((e) => includeDrafts || !e.frontmatter.draft)
        .sort((a, b) => b.frontmatter.date.localeCompare(a.frontmatter.date));

    const algorithmPages = await processDirectory(
        join(CONTENT_DIR, "algorithms"),
        algorithmFrontmatterSchema,
        algoSlug,
        highlighter,
    );

    generateOutput(blogPosts, algorithmPages as AlgorithmEntry[]);

    console.log(
        `content:build — ${blogPosts.length} blog post(s), ${algorithmPages.length} algorithm page(s) → ${GENERATED_DIR}`,
    );

    highlighter.dispose();
}

main().catch((err) => {
    console.error("content:build failed:", err);
    process.exit(1);
});
