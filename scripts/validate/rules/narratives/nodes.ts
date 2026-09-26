/**
 * Rule 11 (nodes part): node id uniqueness, exactly-one-of page/paper/question,
 * area membership, page/paper resolution, and the derived-year map used by
 * the edges/lenses/steps checks below.
 */
import type { Diagnostic, ValidationContext } from "../../types.ts";
import type { NarrativeFrontmatterShape, NodeCheckResult } from "./shared.ts";

export function checkNodes(
    file: string,
    fm: NarrativeFrontmatterShape,
    ctx: ValidationContext,
): NodeCheckResult {
    const diagnostics: Diagnostic[] = [];
    const areas = fm.areas ?? [];
    const nodes = fm.nodes ?? [];
    const areaIds = new Set(areas.map((a) => a.id));

    // Node ids (belt-and-braces: exactly-one-of page/paper/question is
    // also a zod refine), area membership, page/paper resolution, and
    // the derived-year map used below for chronology + lens-order
    // checks. `nodeSlug` records the atlas slug for `page` nodes only
    // — reused by the edge-vs-Atlas-relations consistency check.
    const nodeIds = new Set<string>();
    const nodeYear = new Map<string, number | undefined>();
    const nodeSlug = new Map<string, string>();

    for (const n of nodes) {
        if (nodeIds.has(n.id)) {
            diagnostics.push({ level: "error", message: `[${file}] duplicate narrative node id "${n.id}"` });
        }
        nodeIds.add(n.id);

        const hasPage = n.page !== undefined;
        const hasPaper = n.paper !== undefined;
        const hasQuestion = n.question !== undefined;
        if ((hasPage ? 1 : 0) + (hasPaper ? 1 : 0) + (hasQuestion ? 1 : 0) !== 1) {
            diagnostics.push({ level: "error", message: `[${file}] node "${n.id}" must have exactly one of \`page\`, \`paper\`, or \`question\`` });
        }

        if (!areaIds.has(n.area)) {
            diagnostics.push({ level: "error", message: `[${file}] node "${n.id}" area "${n.area}" is not a declared area id` });
        }

        if (hasPage) {
            const target = ctx.atlasBySlug.get(n.page as string);
            if (!target) {
                diagnostics.push({ level: "error", message: `[${file}] node "${n.id}" page "${n.page}" does not resolve to a known atlas page` });
            } else if (target.isDraft) {
                diagnostics.push({
                    level: "error",
                    message: `[${file}] node "${n.id}" page "${n.page}" is a draft page; narrative nodes must reference published atlas pages`,
                });
            } else {
                nodeYear.set(n.id, target.year);
                nodeSlug.set(n.id, n.page as string);
            }
        } else if (hasPaper) {
            const key = `paper:${n.paper}`;
            if (!ctx.sourceIndex.has(key)) {
                diagnostics.push({ level: "error", message: `[${file}] node "${n.id}" paper "${n.paper}" not found in docs/papers/index.yaml` });
            } else {
                nodeYear.set(n.id, ctx.paperYears.get(n.paper as string));
            }
            if (!n.label || n.label.trim().length === 0) {
                diagnostics.push({ level: "error", message: `[${file}] paper node "${n.id}" (paper: "${n.paper}") requires a label` });
            }
            diagnostics.push({
                level: "warning",
                message: `[${file}] page debt: node "${n.id}" cites paper "${n.paper}" with no atlas page yet`,
            });
        } else if (hasQuestion) {
            // Question nodes carry no year, no page/paper resolution, no
            // label requirement, and no debt — they are exempt from every
            // check below that only applies to page/paper nodes.
        }

        if ((hasPage || hasPaper) && nodeYear.get(n.id) === undefined) {
            diagnostics.push({ level: "warning", message: `[${file}] node "${n.id}" has no derivable publication year` });
        }
    }

    return { diagnostics, nodeIds, nodeYear, nodeSlug };
}
