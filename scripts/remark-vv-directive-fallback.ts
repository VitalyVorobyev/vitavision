/**
 * remark-vv-directive-fallback — catch-all safety net for unclaimed remark-directive nodes.
 *
 * remark-directive parses ANY colon-then-text in prose as a directive node
 * (textDirective, leafDirective, or containerDirective), because the directive
 * name grammar in remark-directive 4.x accepts digit-starting identifiers such
 * as `1308` or `698`. The upstream vv-plugins (remark-vv-inline, remark-vv-blocks,
 * remark-vv-embeds) claim the directives they own by setting node.data.hName.
 * Everything else survives as an unclaimed directive node; without this plugin,
 * remark-rehype converts each into an empty <div></div>, corrupting prose colons
 * like `arXiv:1308`, volume:page citations `8(6):698`, and ratios `6:4`.
 *
 * MUST run AFTER all vv-plugins so unclaimed nodes can be identified. Replaces
 * every unclaimed directive node with a plain text node whose value is the
 * original source slice (via position offsets), restoring verbatim rendering.
 */
import type { Plugin } from "unified";
import type { Root, Parent, PhrasingContent } from "mdast";
import { visit, SKIP } from "unist-util-visit";

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

const remarkVvDirectiveFallback: Plugin<[], Root> = () => {
    return (tree: Root, file) => {
        const source = String(file);
        visit(tree, (node, index, parent) => {
            if (!isDirectiveNode(node)) return;
            // Skip nodes already claimed by a vv-plugin (hName is set).
            if (node.data?.hName) return;
            // Only act when we have a valid parent and a numeric index.
            if (!parent || typeof index !== "number") return;

            // Recover the literal source text via character offsets.
            const start = node.position?.start?.offset;
            const end = node.position?.end?.offset;
            const literal =
                typeof start === "number" && typeof end === "number"
                    ? source.slice(start, end)
                    : ":" + node.name;

            // Replace the directive node in-place with a plain text node,
            // restoring the original characters verbatim.
            parent.children.splice(index, 1, {
                type: "text",
                value: literal,
            } as PhrasingContent);
            // Do not descend into the removed subtree; hold the index so the
            // newly inserted text node is visited next (it passes isDirectiveNode
            // immediately, so no infinite loop).
            return [SKIP, index];
        });
    };
};

export default remarkVvDirectiveFallback;
