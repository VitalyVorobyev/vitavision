/**
 * Minimal markdown→HTML renderers used only by the validator (no
 * Shiki/KaTeX, unlike the real build pipeline in content-build.ts).
 */
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeStringify from "rehype-stringify";

/** Used by the canonical-quality rule's rendered-HTML TODO scan. */
export async function renderMarkdownPlain(content: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(content);
    return String(result);
}

// Same shape as renderMarkdownPlain but with rehype-slug so h2 ids match what
// the real build pipeline (scripts/content-build.ts) produces — sliceChapters()
// from narrative-build.ts is reused to turn those ids into the valid-anchor set.
/** Used by the narratives rule's step-anchor checks. */
export async function renderNarrativeBodyForAnchors(content: string): Promise<string> {
    const result = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkMath)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeStringify)
        .process(content);
    return String(result);
}
