import type { Content, Parent, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

const SKIP_CONTAINER_TYPES = new Set([
    "link",
    "linkReference",
    "definition",
    "footnoteDefinition",
    "image",
    "imageReference",
    "html",
]);

interface EquationReference {
    anchorId: string;
    number: number;
}

interface MathNode {
    type: "math";
    value: string;
    data?: {
        hProperties?: Record<string, unknown>;
        hChildren?: unknown[];
    } & Record<string, unknown>;
}

function sanitizeLabel(label: string): string {
    return label
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function createAnchorId(label: string, usedIds: Set<string>): string {
    const baseSlug = sanitizeLabel(label);
    const baseId = baseSlug ? `eq-${baseSlug}` : "eq";

    let candidate = baseId;
    let suffix = 2;
    while (usedIds.has(candidate)) {
        candidate = `${baseId}-${suffix}`;
        suffix += 1;
    }

    usedIds.add(candidate);
    return candidate;
}

function annotateEquation(
    node: MathNode,
    number: number,
    anchorId: string,
): void {
    node.data ??= {};

    const currentProperties = (node.data.hProperties as Record<string, unknown> | undefined) ?? {};
    node.data.hProperties = {
        ...currentProperties,
        id: anchorId,
        dataEquationNumber: String(number),
    };
}

function syncMathSource(node: MathNode): void {
    const hChildren = node.data?.hChildren;
    if (!Array.isArray(hChildren)) return;

    const updateTextNodes = (child: unknown): void => {
        if (!child || typeof child !== "object") return;

        const textChild = child as { type?: string; value?: string; children?: unknown[] };
        if (textChild.type === "text") {
            textChild.value = node.value;
            return;
        }

        if (Array.isArray(textChild.children)) {
            for (const nestedChild of textChild.children) {
                updateTextNodes(nestedChild);
            }
        }
    };

    for (const child of hChildren) {
        updateTextNodes(child);
    }
}

function rewriteEquationReferences(
    value: string,
    references: Map<string, EquationReference>,
): Content[] | null {
    const refPattern = /\\(eqref|ref)\{([^{}]+)\}/g;
    const nodes: Content[] = [];
    let lastIndex = 0;
    let sawReference = false;

    for (const match of value.matchAll(refPattern)) {
        sawReference = true;
        const matchText = match[0];
        const command = match[1];
        const label = match[2]?.trim() ?? "";
        const matchIndex = match.index ?? 0;

        if (matchIndex > lastIndex) {
            nodes.push({ type: "text", value: value.slice(lastIndex, matchIndex) });
        }

        const reference = references.get(label);
        if (reference) {
            nodes.push({
                type: "link",
                url: `#${reference.anchorId}`,
                children: [
                    {
                        type: "text",
                        value: command === "eqref"
                            ? `(${reference.number})`
                            : `${reference.number}`,
                    },
                ],
            });
        } else {
            nodes.push({ type: "text", value: matchText });
        }

        lastIndex = matchIndex + matchText.length;
    }

    if (!sawReference) return null;

    if (lastIndex < value.length) {
        nodes.push({ type: "text", value: value.slice(lastIndex) });
    }

    return nodes;
}

function replaceRefsInTree(
    node: Root | Parent,
    references: Map<string, EquationReference>,
): void {
    for (let index = 0; index < node.children.length; index += 1) {
        const child = node.children[index];

        if ("children" in child && Array.isArray(child.children)) {
            if (!SKIP_CONTAINER_TYPES.has(child.type)) {
                replaceRefsInTree(child as Parent, references);
            }
            continue;
        }

        if (child.type !== "text") continue;

        const replacement = rewriteEquationReferences(child.value, references);
        if (!replacement) continue;

        node.children.splice(index, 1, ...replacement);
        index += replacement.length - 1;
    }
}

const remarkEquationReferences: Plugin<[], Root> = () => {
    return (tree) => {
        const references = new Map<string, EquationReference>();
        const usedIds = new Set<string>();
        let equationCount = 0;

        visit(tree, "math", (node) => {
            const mathNode = node as MathNode;
            const labelMatchPattern = /\\label\{([^{}]+)\}/g;
            const labelStripPattern = /\\label\{([^{}]+)\}/g;
            const labels = [...mathNode.value.matchAll(labelMatchPattern)]
                .map((match) => match[1]?.trim() ?? "")
                .filter(Boolean);

            if (labels.length === 0) return;

            equationCount += 1;
            const anchorId = createAnchorId(labels[0], usedIds);
            annotateEquation(mathNode, equationCount, anchorId);

            for (const label of labels) {
                if (!references.has(label)) {
                    references.set(label, { anchorId, number: equationCount });
                }
            }

            mathNode.value = mathNode.value.replace(labelStripPattern, "").trim();
            syncMathSource(mathNode);
        });

        replaceRefsInTree(tree, references);
    };
};

export default remarkEquationReferences;
