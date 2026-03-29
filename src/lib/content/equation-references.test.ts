import { describe, expect, it } from "vitest";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkMath from "remark-math";
import remarkRehype from "remark-rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";

import remarkEquationReferences from "../../../scripts/remark-equation-references.ts";
import rehypeNumberedEquations from "../../../scripts/rehype-numbered-equations.ts";

async function render(markdown: string): Promise<string> {
    const file = await unified()
        .use(remarkParse)
        .use(remarkMath)
        .use(remarkEquationReferences)
        .use(remarkRehype)
        .use(rehypeNumberedEquations)
        .use(rehypeKatex)
        .use(rehypeStringify)
        .process(markdown);

    return String(file);
}

describe("equation references", () => {
    it("numbers labeled display equations and rewrites references", async () => {
        const html = await render(String.raw`
Equation \eqref{eq:pyth} is the classic relation.
Equation \ref{eq:pyth} can also be referenced without parentheses.

$$
a^2 + b^2 = c^2
\label{eq:pyth}
$$
`);

        expect(html).toContain('class="vv-equation"');
        expect(html).toContain('id="eq-eq-pyth"');
        expect(html).toContain('class="vv-equation__number" aria-label="Equation 1">(1)</span>');
        expect(html).toContain('<a href="#eq-eq-pyth">(1)</a>');
        expect(html).toContain('<a href="#eq-eq-pyth">1</a>');
        expect(html).not.toContain("\\label");
    });

    it("leaves unlabeled display equations unnumbered", async () => {
        const html = await render(String.raw`
$$
x + y = z
$$
`);

        expect(html).not.toContain("vv-equation");
        expect(html).not.toContain("vv-equation__number");
    });
});
