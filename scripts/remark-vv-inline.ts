import type { Plugin } from "unified";
import type { Root, Parent } from "mdast";
import { visit } from "unist-util-visit";

interface DirectiveNode extends Parent {
    type: "containerDirective" | "leafDirective" | "textDirective";
    name: string;
    attributes?: Record<string, string>;
    children: Parent["children"];
    data?: Record<string, unknown>;
}

function isDirectiveNode(node: unknown): node is DirectiveNode {
    const n = node as { type?: string };
    return (
        n.type === "containerDirective" ||
        n.type === "leafDirective" ||
        n.type === "textDirective"
    );
}

// Color palette aligned with .vv-color--* styles in src/styles/article.css.
// Directive name IS the color — e.g. :blue[text] → <span class="vv-color vv-color--blue">text</span>.
// remark-directive's textDirective shape parses :name[label]{attrs} as { name, children: label, attributes: attrs },
// so a label-only directive (:name[text]) is the cleanest author-facing syntax for inline colored runs.
const PALETTE = new Set(["blue", "amber", "green", "violet", "muted"]);

const remarkVvInline: Plugin<[], Root> = () => (tree) => {
    visit(tree, (node) => {
        if (!isDirectiveNode(node)) return;
        if (node.type !== "textDirective") return;
        if (!PALETTE.has(node.name)) return;

        node.data = {
            hName: "span",
            hProperties: { className: ["vv-color", `vv-color--${node.name}`] },
        };
    });
};

export default remarkVvInline;
