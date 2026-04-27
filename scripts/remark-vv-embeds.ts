import type { Plugin } from "unified";
import type { Parent, PhrasingContent, Root } from "mdast";
import { visit } from "unist-util-visit";

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
    const candidate = node as { type?: string };
    return (
        candidate.type === "containerDirective" ||
        candidate.type === "leafDirective" ||
        candidate.type === "textDirective"
    );
}

function createParagraph(className: string, text: string): MdastNodeWithHast {
    return {
        type: "paragraph",
        children: [{ type: "text", value: text } as PhrasingContent],
        data: {
            hName: "p",
            hProperties: { className },
        },
    };
}

function extractDirectiveLabel(node: DirectiveNode): string | undefined {
    const labelChild = (
        node.children as Array<{
            data?: { directiveLabel?: boolean };
            children?: Array<{ value?: string }>;
        }>
    ).find((child) => child.data?.directiveLabel);

    return labelChild?.children?.map((child) => child.value ?? "").join("").trim() || undefined;
}

const SUPPORTED_ILLUSTRATIONS = new Set(["chess-response", "delaunay-voronoi"]);

const FALLBACK_TEXT: Record<string, string> = {
    "chess-response":   "Interactive illustration loads here. Enable JavaScript to inspect the ChESS response terms.",
    "delaunay-voronoi": "Interactive illustration loads here. Enable JavaScript to drag corners and edit grid nodes.",
};

const remarkVvEmbeds: Plugin<[], Root> = () => {
    return (tree: Root) => {
        visit(tree, (node) => {
            if (!isDirectiveNode(node)) return;
            if (node.type !== "containerDirective") return;
            if (node.name.toLowerCase() !== "illustration") return;

            const illustration = extractDirectiveLabel(node);
            if (!illustration || !SUPPORTED_ILLUSTRATIONS.has(illustration)) return;

            const attributes = node.attributes ?? {};
            const data = node.data || (node.data = {});
            data.hName = "div";
            const baseProps: Record<string, unknown> = {
                className: "vv-embed vv-embed--illustration",
                "data-vv-illustration": illustration,
            };
            if (illustration === "chess-response") {
                Object.assign(baseProps, {
                    "data-vv-preset": attributes.preset ?? "article",
                    ...(attributes.pattern ? { "data-vv-pattern": attributes.pattern } : {}),
                    ...(attributes.rotation ? { "data-vv-rotation": attributes.rotation } : {}),
                    ...(attributes.controls ? { "data-vv-controls": attributes.controls } : {}),
                    ...(attributes.animate ? { "data-vv-animate-rotation": attributes.animate } : {}),
                });
            } else if (illustration === "delaunay-voronoi") {
                Object.assign(baseProps, {
                    ...(attributes.grid          ? { "data-vv-grid":          attributes.grid          } : {}),
                    ...(attributes.delaunay      ? { "data-vv-delaunay":      attributes.delaunay      } : {}),
                    ...(attributes.voronoi       ? { "data-vv-voronoi":       attributes.voronoi       } : {}),
                    ...(attributes.circumcircles ? { "data-vv-circumcircles": attributes.circumcircles } : {}),
                    ...(attributes.legend        ? { "data-vv-legend":        attributes.legend        } : {}),
                });
            }
            data.hProperties = baseProps;

            node.children = [
                createParagraph(
                    "vv-embed__fallback",
                    FALLBACK_TEXT[illustration] ?? "Interactive illustration loads here.",
                ),
            ] as DirectiveNode["children"];
        });
    };
};

export default remarkVvEmbeds;
