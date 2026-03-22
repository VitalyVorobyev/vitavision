/**
 * Custom remark plugin that transforms directive-style blocks (:::type[label])
 * into stable HTML structures with vv-block CSS classes.
 *
 * Supports: definition, theorem, lemma, proposition, statement, proof,
 *           note, warning, quote, example, algorithm
 */
import type { Plugin } from "unified";
import type { Root, Parent, PhrasingContent } from "mdast";
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
        hProperties?: Record<string, unknown>;
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
    properties: Record<string, unknown>,
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

/**
 * Extract :input: and :output: metadata lines from algorithm block children.
 */
function extractAlgorithmMeta(
    children: Parent["children"],
): { meta: Array<{ key: string; value: string }>; remaining: Parent["children"] } {
    const meta: Array<{ key: string; value: string }> = [];
    const remaining: Parent["children"] = [];

    for (const child of children) {
        if (isDirectiveNode(child) && child.type === "leafDirective") {
            const name = child.name.toLowerCase();
            if (name === "input" || name === "output") {
                const textParts: string[] = [];
                visit(child as unknown as Root, "text", (textNode: { value: string }) => {
                    textParts.push(textNode.value);
                });
                meta.push({
                    key: name.charAt(0).toUpperCase() + name.slice(1),
                    value: textParts.join("").trim(),
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

            // Extract label from directive [label] syntax
            const labelChild = (node.children as Array<{ data?: { directiveLabel?: boolean }; children?: Array<{ value?: string }> }>)
                .find((c) => c.data?.directiveLabel);
            const label = labelChild
                ?.children?.map((c) => c.value ?? "")
                .join("")
                .trim() || undefined;

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
            newChildren.push(createTextDiv("vv-block__title", BLOCK_TITLES[kind] ?? kind));

            // Label div (optional)
            if (label) {
                newChildren.push(createTextDiv("vv-block__label", label));
            }

            // Filter out the label child from body content
            let bodyContent = node.children.filter(
                (c) => !(c as { data?: { directiveLabel?: boolean } }).data?.directiveLabel,
            );

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
                            createHastMappedNode("span", { className: "vv-block__meta-value" }, [
                                { type: "text", value: m.value } as PhrasingContent,
                            ]) as unknown as PhrasingContent,
                        ]),
                    );
                    newChildren.push(createHastMappedNode("div", { className: "vv-block__meta" }, metaItems));
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
            newChildren.push(createHastMappedNode("div", { className: "vv-block__body" }, bodyContent));

            // Replace children
            node.children = newChildren as DirectiveNode["children"];
        });
    };
};

export default remarkVvBlocks;
