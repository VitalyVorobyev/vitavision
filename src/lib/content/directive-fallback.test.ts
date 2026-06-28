import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import remarkVvInline from "../../../scripts/remark-vv-inline.ts";
import remarkVvBlocks from "../../../scripts/remark-vv-blocks.ts";
import remarkVvEmbeds from "../../../scripts/remark-vv-embeds.ts";
import remarkVvDirectiveFallback from "../../../scripts/remark-vv-directive-fallback.ts";

async function render(markdown: string): Promise<string> {
    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkVvInline)
        .use(remarkVvBlocks)
        .use(remarkVvEmbeds)
        .use(remarkVvDirectiveFallback)
        .use(remarkRehype)
        .use(rehypeStringify)
        .process(markdown);

    return String(file);
}

describe("remark-vv-directive-fallback", () => {
    it("renders arXiv:2104.00680 verbatim (no empty div)", async () => {
        const html = await render("See arXiv:2104.00680 for details.");
        expect(html).toContain("arXiv:2104.00680");
        expect(html).not.toContain("<div></div>");
    });

    it("renders link with arXiv colon text verbatim and preserves href", async () => {
        const html = await render(
            "[arXiv:2104.00680](https://arxiv.org/abs/2104.00680)",
        );
        expect(html).toContain("arXiv:2104.00680");
        expect(html).toContain('href="https://arxiv.org/abs/2104.00680"');
        expect(html).not.toContain("<div></div>");
    });

    it("renders ratio 6:4 verbatim (no empty div)", async () => {
        const html = await render("The split is 6:4 between train and test.");
        expect(html).toContain("6:4");
        expect(html).not.toContain("<div></div>");
    });

    it("renders journal citation Nature, 293:133-135 verbatim (no empty div)", async () => {
        const html = await render("Published in Nature, 293:133-135 (1981).");
        expect(html).toContain("293:133");
        expect(html).not.toContain("<div></div>");
    });

    it("known inline color directive still works after fallback plugin", async () => {
        const html = await render("This is :blue[important] text.");
        expect(html).toContain('class="vv-color vv-color--blue"');
        expect(html).not.toContain("<div></div>");
    });

    it("known container block directive still works after fallback plugin", async () => {
        const html = await render(":::note\nbody text\n:::");
        expect(html).toContain('class="vv-block vv-block--note"');
        expect(html).not.toContain("<div></div>");
    });

    it("no generated content HTML files contain <div></div>", () => {
        // This assertion requires that `bun run content:build` has been run with
        // the fallback plugin in place. It scans all auto-generated *.ts modules
        // under src/generated/content/ for the empty-div sentinel.
        // process.cwd() is the project root in Vitest's runner context.
        const generatedContentDir = join(
            process.cwd(),
            "src",
            "generated",
            "content",
        );

        if (!existsSync(generatedContentDir)) {
            // Directory does not exist — build hasn't run yet; skip gracefully.
            return;
        }

        const allFiles = readdirSync(generatedContentDir, {
            recursive: true,
        }) as string[];

        const violations: string[] = [];
        for (const rel of allFiles) {
            if (!rel.endsWith(".ts")) continue;
            const content = readFileSync(
                join(generatedContentDir, rel),
                "utf-8",
            );
            if (content.includes("<div></div>")) {
                violations.push(rel);
            }
        }

        expect(violations).toEqual([]);
    });
});
