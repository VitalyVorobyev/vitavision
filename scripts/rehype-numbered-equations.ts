import type { Element, Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

function getStringProperty(
    properties: Element["properties"] | undefined,
    key: string,
): string | undefined {
    const value = properties?.[key];

    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];

    return undefined;
}

const rehypeNumberedEquations: Plugin<[], Root> = () => {
    return (tree) => {
        visit(tree, "element", (node: Element, index, parent) => {
            if (!parent || index === undefined || node.tagName !== "pre") return;

            const anchorId = getStringProperty(node.properties, "id");
            const equationNumber = getStringProperty(node.properties, "dataEquationNumber")
                ?? getStringProperty(node.properties, "data-equation-number");

            if (!anchorId || !equationNumber) return;

            delete node.properties?.id;
            delete node.properties?.dataEquationNumber;
            delete node.properties?.["data-equation-number"];

            parent.children[index] = {
                type: "element",
                tagName: "div",
                properties: {
                    className: ["vv-equation"],
                    id: anchorId,
                },
                children: [
                    {
                        type: "element",
                        tagName: "div",
                        properties: {
                            className: ["vv-equation__body"],
                        },
                        children: [node],
                    },
                    {
                        type: "element",
                        tagName: "span",
                        properties: {
                            className: ["vv-equation__number"],
                            ariaLabel: `Equation ${equationNumber}`,
                        },
                        children: [
                            {
                                type: "text",
                                value: `(${equationNumber})`,
                            },
                        ],
                    },
                ],
            };
        });
    };
};

export default rehypeNumberedEquations;
