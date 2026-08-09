/**
 * Custom remark plugin that transforms directive-style blocks (:::type[label])
 * into stable HTML structures with vv-block CSS classes.
 *
 * Supports: definition, theorem, lemma, proposition, statement, proof,
 *           note, warning, quote, example, algorithm
 */
import type { Plugin } from "unified";
import type { Root, Parent, PhrasingContent } from "mdast";
import type { Properties } from "hast";
import { visit } from "unist-util-visit";

const SUPPORTED_BLOCKS = new Set([
    "definition",
    "theorem",
    "lemma",
    "proposition",
    "statement",
    "proof",
    "note",
    "warning",
    "quote",
    "example",
    "algorithm",
    "emph",
]);

const BLOCK_TITLES: Record<string, string> = {
    definition: "Definition",
    theorem: "Theorem",
    lemma: "Lemma",
    proposition: "Proposition",
    statement: "Statement",
    proof: "Proof",
    note: "Note",
    warning: "Warning",
    quote: "Quote",
    example: "Example",
    algorithm: "Algorithm",
    emph: "Emphasis",
};

interface DirectiveNode extends Parent {
    type: "containerDirective" | "leafDirective" | "textDirective";
    name: string;
    attributes?: Record<string, string>;
    children: Parent["children"];
    data?: Record<string, unknown>;
}

interface MdastNodeWithHast extends Parent {
    type: string;
    children: Parent["children"];
    data?: {
        hName?: string;
        hProperties?: Properties;
    };
}

function isDirectiveNode(node: unknown): node is DirectiveNode {
    const n = node as { type?: string };
    return (
        n.type === "containerDirective" ||
        n.type === "leafDirective" ||
        n.type === "textDirective"
    );
}

/**
 * Create an mdast node that maps to a specific hast element via data.hName/hProperties.
 * The children will be processed by remark-rehype normally.
 */
function createHastMappedNode(
    tagName: string,
    properties: Properties,
    children: Parent["children"] = [],
): MdastNodeWithHast {
    return {
        type: "paragraph",
        children,
        data: {
            hName: tagName,
            hProperties: properties,
        },
    };
}

/**
 * Create a text-only hast-mapped node (e.g. for title/label divs).
 */
function createTextDiv(
    className: string,
    text: string,
): MdastNodeWithHast {
    return createHastMappedNode("div", { className }, [
        { type: "text", value: text } as PhrasingContent,
    ]);
}

/** Minimal shape shared by mdast nodes we need to walk for plain-text extraction. */
interface ValueOrParentNode {
    value?: string;
    children?: ValueOrParentNode[];
}

/**
 * Recursively concatenate the literal text content of a node list. Nodes with a
 * literal `value` (text, inlineMath, inlineCode, ...) contribute that value directly;
 * container nodes (emphasis, strong, links, ...) contribute their children's text.
 * Used only to detect whether a directive label is non-empty — the actual child
 * nodes are preserved as-is (not this stringified form) when rendering the label.
 */
function getPlainText(nodes: ValueOrParentNode[]): string {
    let text = "";
    for (const node of nodes) {
        if (typeof node.value === "string") {
            text += node.value;
        } else if (node.children) {
            text += getPlainText(node.children);
        }
    }
    return text;
}

/**
 * Extract ::input[...] and ::output[...] leaf-directive metadata rows from algorithm block children.
 * Children are preserved as-is so inline math and other inline markdown render in the meta value.
 */
function extractAlgorithmMeta(
    children: Parent["children"],
): { meta: Array<{ key: string; children: Parent["children"] }>; remaining: Parent["children"] } {
    const meta: Array<{ key: string; children: Parent["children"] }> = [];
    const remaining: Parent["children"] = [];

    for (const child of children) {
        if (isDirectiveNode(child) && child.type === "leafDirective") {
            const name = child.name.toLowerCase();
            if (name === "input" || name === "output") {
                // For leaf directives the bracketed `[content]` is either a labelled
                // wrapper or the raw children — unwrap defensively.
                const rawChildren = child.children as Array<{
                    data?: { directiveLabel?: boolean };
                    children?: Parent["children"];
                }>;
                const labelChild = rawChildren.find((c) => c.data?.directiveLabel);
                const content: Parent["children"] = labelChild?.children
                    ? labelChild.children
                    : (child.children as Parent["children"]);
                meta.push({
                    key: name.charAt(0).toUpperCase() + name.slice(1),
                    children: content,
                });
                continue;
            }
        }
        remaining.push(child);
    }

    return { meta, remaining };
}

const remarkVvBlocks: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, (node) => {
            if (!isDirectiveNode(node)) return;
            if (node.type !== "containerDirective") return;

            if (!node.name) return;
            const kind = node.name.toLowerCase();
            if (!SUPPORTED_BLOCKS.has(kind)) return;

            // Extract label from directive [label] syntax. Preserve the label's child
            // *nodes* (not a stringified concatenation) so inline formatting — most
            // importantly remark-math's `inlineMath` nodes — survives into the hast
            // tree and gets rendered downstream (e.g. by rehype-katex).
            const labelChild = (node.children as Array<{ data?: { directiveLabel?: boolean }; children?: Parent["children"] }>)
                .find((c) => c.data?.directiveLabel);
            const labelChildren = labelChild?.children ?? [];
            const hasLabel = getPlainText(labelChildren as unknown as ValueOrParentNode[]).trim().length > 0;

            // Set up the outer wrapper
            const data = node.data || (node.data = {});
            data.hName = "section";
            data.hProperties = {
                className: `vv-block vv-block--${kind}`,
                "data-kind": kind,
            };

            // Build new children array
            const newChildren: Parent["children"] = [];

            // Title div
            newChildren.push(createTextDiv("vv-block__title", BLOCK_TITLES[kind] ?? kind) as unknown as Parent["children"][0]);

            // Label div (optional)
            if (hasLabel) {
                newChildren.push(
                    createHastMappedNode("div", { className: "vv-block__label" }, labelChildren) as unknown as Parent["children"][0],
                );
            }

            // Filter out the label child from body content
            let bodyContent = node.children.filter(
                (c) => !(c as { data?: { directiveLabel?: boolean } }).data?.directiveLabel,
            ) as unknown as Parent["children"];

            // For algorithm blocks, extract meta
            if (kind === "algorithm") {
                const { meta, remaining } = extractAlgorithmMeta(bodyContent);
                bodyContent = remaining;

                if (meta.length > 0) {
                    const metaItems: Parent["children"] = meta.map((m) =>
                        createHastMappedNode("div", { className: "vv-block__meta-item" }, [
                            createHastMappedNode("span", { className: "vv-block__meta-key" }, [
                                { type: "text", value: `${m.key}: ` } as PhrasingContent,
                            ]) as unknown as PhrasingContent,
                            createHastMappedNode(
                                "span",
                                { className: "vv-block__meta-value" },
                                m.children,
                            ) as unknown as PhrasingContent,
                        ]),
                    ) as unknown as Parent["children"];
                    newChildren.push(createHastMappedNode("div", { className: "vv-block__meta" }, metaItems) as unknown as Parent["children"][0]);
                }
            }

            // For proof blocks, append QED marker to body content
            if (kind === "proof") {
                bodyContent.push(
                    createHastMappedNode("span", {
                        className: "vv-proof-qed",
                        "aria-label": "end of proof",
                    }, [
                        { type: "text", value: "\u220E" } as PhrasingContent,
                    ]) as unknown as Parent["children"][0],
                );
            }

            // Body wrapper
            newChildren.push(createHastMappedNode("div", { className: "vv-block__body" }, bodyContent) as unknown as Parent["children"][0]);

            // Replace children
            node.children = newChildren as unknown as typeof node.children;
        });
    };
};

export default remarkVvBlocks;
