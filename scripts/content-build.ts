import { readFileSync, readdirSync, writeFileSync, existsSync, mkdirSync, rmSync } from "node:fs";
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

import remarkVvEmbeds from "./remark-vv-embeds.ts";
import remarkVvBlocks from "./remark-vv-blocks.ts";
import remarkVvInline from "./remark-vv-inline.ts";
import { computeReadingTimeMinutes } from "./reading-time.ts";
import remarkEquationReferences from "./remark-equation-references.ts";
import rehypeNumberedEquations from "./rehype-numbered-equations.ts";
import {
    blogFrontmatterSchema,
    algorithmFrontmatterSchema,
    demoFrontmatterSchema,
    modelFrontmatterSchema,
} from "../src/lib/content/schema.ts";
import type { BlogEntry, BlogIndexEntry, AlgorithmEntry, AlgorithmIndexEntry, DemoEntry, DemoIndexEntry, ModelEntry, ModelIndexEntry } from "../src/lib/content/schema.ts";
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

function demoSlug(filename: string): string {
    return basename(filename, ".md");
}

function modelSlug(filename: string): string {
    return basename(filename, ".md");
}

/** Rewrite relative image paths (./images/*, ../images/*, images/*) to /content/images/*. */
function resolveContentImagePaths(html: string): string {
    return html.replace(/src="(?:\.{1,2}\/)?images\//g, 'src="/content/images/');
}

// Extended sanitization schema to allow custom blocks, Shiki, and KaTeX output.
// clobberPrefix is disabled because all markdown content is authored in-repo (not user input),
// so the DOM-clobbering protection is unnecessary and its prefix breaks in-page anchor links
// (headings get `id="user-content-foo"` but `[link](#foo)` is not rewritten to match).
const sanitizeSchema = {
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
        .use(remarkVvInline)
        .use(remarkVvBlocks)
        .use(remarkVvEmbeds)
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
        if (data.readingTimeMinutes === undefined) {
            data.readingTimeMinutes = computeReadingTimeMinutes(content);
        }
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

function serializeAlgorithmEntry(entry: { slug: string; frontmatter: Record<string, unknown>; html: string }): AlgorithmEntry {
    const { date, updated, ...rest } = entry.frontmatter;
    return {
        slug: entry.slug,
        frontmatter: {
            ...rest,
            date: serializeDate(date),
            ...(updated !== undefined ? { updated: serializeDate(updated) } : {}),
        } as AlgorithmEntry["frontmatter"],
        html: entry.html,
    };
}

function serializeDemoEntry(entry: { slug: string; frontmatter: Record<string, unknown>; html: string }): DemoEntry {
    const { date, updated, ...rest } = entry.frontmatter;
    return {
        slug: entry.slug,
        frontmatter: {
            ...rest,
            date: serializeDate(date),
            ...(updated !== undefined ? { updated: serializeDate(updated) } : {}),
        } as DemoEntry["frontmatter"],
        html: entry.html,
    };
}

function serializeModelEntry(entry: { slug: string; frontmatter: Record<string, unknown>; html: string }): ModelEntry {
    const { date, updated, ...rest } = entry.frontmatter;
    return {
        slug: entry.slug,
        frontmatter: {
            ...rest,
            date: serializeDate(date),
            ...(updated !== undefined ? { updated: serializeDate(updated) } : {}),
        } as ModelEntry["frontmatter"],
        html: entry.html,
    };
}

function cleanGeneratedHtmlModules(dir: string): void {
    if (!existsSync(dir)) return;
    for (const file of readdirSync(dir)) {
        if (file.endsWith(".ts")) {
            rmSync(join(dir, file));
        }
    }
}

function generateOutput(blogPosts: BlogEntry[], algorithmPages: AlgorithmEntry[], demoPages: DemoEntry[], modelPages: ModelEntry[]): void {
    if (!existsSync(GENERATED_DIR)) mkdirSync(GENERATED_DIR, { recursive: true });

    // 1. Per-slug html modules for lazy client-side loading.
    const blogHtmlDir = join(GENERATED_DIR, "content", "blog");
    const algoHtmlDir = join(GENERATED_DIR, "content", "algorithms");
    const demoHtmlDir = join(GENERATED_DIR, "content", "demos");
    const modelHtmlDir = join(GENERATED_DIR, "content", "models");
    if (!existsSync(blogHtmlDir)) mkdirSync(blogHtmlDir, { recursive: true });
    if (!existsSync(algoHtmlDir)) mkdirSync(algoHtmlDir, { recursive: true });
    if (!existsSync(demoHtmlDir)) mkdirSync(demoHtmlDir, { recursive: true });
    if (!existsSync(modelHtmlDir)) mkdirSync(modelHtmlDir, { recursive: true });
    cleanGeneratedHtmlModules(blogHtmlDir);
    cleanGeneratedHtmlModules(algoHtmlDir);
    cleanGeneratedHtmlModules(demoHtmlDir);
    cleanGeneratedHtmlModules(modelHtmlDir);

    for (const post of blogPosts) {
        const file = join(blogHtmlDir, `${post.slug}.ts`);
        writeFileSync(file, `// Auto-generated — do not edit manually.\nexport const html = ${JSON.stringify(post.html)};\n`, "utf-8");
    }
    for (const page of algorithmPages) {
        const file = join(algoHtmlDir, `${page.slug}.ts`);
        writeFileSync(file, `// Auto-generated — do not edit manually.\nexport const html = ${JSON.stringify(page.html)};\n`, "utf-8");
    }
    for (const demo of demoPages) {
        const file = join(demoHtmlDir, `${demo.slug}.ts`);
        writeFileSync(file, `// Auto-generated — do not edit manually.\nexport const html = ${JSON.stringify(demo.html)};\n`, "utf-8");
    }
    for (const model of modelPages) {
        const file = join(modelHtmlDir, `${model.slug}.ts`);
        writeFileSync(file, `// Auto-generated — do not edit manually.\nexport const html = ${JSON.stringify(model.html)};\n`, "utf-8");
    }

    // 2. Metadata-only index (no html)
    const blogIndex: BlogIndexEntry[] = blogPosts.map(({ slug, frontmatter }) => ({ slug, frontmatter }));
    const algoIndex: AlgorithmIndexEntry[] = algorithmPages.map(({ slug, frontmatter }) => ({ slug, frontmatter }));
    const demoIndex: DemoIndexEntry[] = demoPages.map(({ slug, frontmatter }) => ({ slug, frontmatter }));
    const modelIndex: ModelIndexEntry[] = modelPages.map(({ slug, frontmatter }) => ({ slug, frontmatter }));

    const indexLines = [
        '// Auto-generated by scripts/content-build.ts — do not edit manually.',
        'import type { BlogIndexEntry, AlgorithmIndexEntry, DemoIndexEntry, ModelIndexEntry } from "../lib/content/schema.ts";',
        "",
        `export const blogPosts: BlogIndexEntry[] = ${JSON.stringify(blogIndex, null, 2)};`,
        "",
        `export const algorithmPages: AlgorithmIndexEntry[] = ${JSON.stringify(algoIndex, null, 2)};`,
        "",
        `export const demoPages: DemoIndexEntry[] = ${JSON.stringify(demoIndex, null, 2)};`,
        "",
        `export const modelPages: ModelIndexEntry[] = ${JSON.stringify(modelIndex, null, 2)};`,
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

    const demoLoaderLines = [
        '// Auto-generated by scripts/content-build.ts — do not edit manually.',
        'export interface GeneratedHtmlModule { html: string; }',
        "",
        "export const demoHtmlLoaders: Record<string, () => Promise<GeneratedHtmlModule>> = {",
        ...demoPages.map((demo) => `  ${JSON.stringify(demo.slug)}: () => import(${JSON.stringify(`./content/demos/${demo.slug}.ts`)}),`),
        "};",
        "",
    ];
    writeFileSync(join(GENERATED_DIR, "demo-loaders.ts"), demoLoaderLines.join("\n"), "utf-8");

    const modelLoaderLines = [
        '// Auto-generated by scripts/content-build.ts — do not edit manually.',
        'export interface GeneratedHtmlModule { html: string; }',
        "",
        "export const modelHtmlLoaders: Record<string, () => Promise<GeneratedHtmlModule>> = {",
        ...modelPages.map((model) => `  ${JSON.stringify(model.slug)}: () => import(${JSON.stringify(`./content/models/${model.slug}.ts`)}),`),
        "};",
        "",
    ];
    writeFileSync(join(GENERATED_DIR, "model-loaders.ts"), modelLoaderLines.join("\n"), "utf-8");
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

    const rawAlgorithmPages = await processDirectory(
        join(CONTENT_DIR, "algorithms"),
        algorithmFrontmatterSchema,
        algoSlug,
        highlighter,
    );

    const algorithmPages = rawAlgorithmPages
        .map((e) => serializeAlgorithmEntry(e as { slug: string; frontmatter: Record<string, unknown>; html: string }))
        .filter((e) => includeDrafts || !e.frontmatter.draft)
        .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));

    const rawDemoPages = await processDirectory(
        join(CONTENT_DIR, "demos"),
        demoFrontmatterSchema,
        demoSlug,
        highlighter,
    );

    const demoPages = rawDemoPages
        .map((e) => serializeDemoEntry(e as { slug: string; frontmatter: Record<string, unknown>; html: string }))
        .filter((e) => includeDrafts || !e.frontmatter.draft)
        .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));

    const rawModelPages = await processDirectory(
        join(CONTENT_DIR, "models"),
        modelFrontmatterSchema,
        modelSlug,
        highlighter,
    );

    // Enforce: any non-draft model page must have at least one implementations entry.
    // This check runs before the draft filter so draft pages can freely omit implementations.
    for (const entry of rawModelPages) {
        const fm = entry.frontmatter as { draft?: boolean; implementations?: unknown[] };
        if (!fm.draft) {
            if (!fm.implementations || fm.implementations.length === 0) {
                throw new Error(
                    `content:build failed: model page "${entry.slug}" is not draft but has no implementations[] entry. See .claude/skills/deep-model-page/SKILL.md §Workflow B9a.`,
                );
            }
        }
    }

    const modelPages = rawModelPages
        .map((e) => serializeModelEntry(e as { slug: string; frontmatter: Record<string, unknown>; html: string }))
        .filter((e) => includeDrafts || !e.frontmatter.draft)
        .sort((a, b) => a.frontmatter.title.localeCompare(b.frontmatter.title));

    generateOutput(blogPosts, algorithmPages, demoPages, modelPages);

    console.log(
        `content:build — ${blogPosts.length} blog post(s), ${algorithmPages.length} algorithm page(s), ${demoPages.length} demo page(s), ${modelPages.length} model page(s) → ${GENERATED_DIR}`,
    );

    highlighter.dispose();
}

main().catch((err) => {
    console.error("content:build failed:", err);
    process.exit(1);
});
