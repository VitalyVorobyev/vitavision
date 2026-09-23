/**
 * Rule 11 (steps part): >= 2 steps (belt-and-braces beyond zod), focus ids
 * reference declared nodes, and every anchor resolves to a "##" heading
 * in the body.
 */
import { sliceChapters } from "../../../narrative-build.ts";
import { renderNarrativeBodyForAnchors } from "../../render.ts";
import type { Diagnostic } from "../../types.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";

export async function checkSteps(
    file: string,
    content: string,
    fm: NarrativeFrontmatterShape,
    nodeIds: Set<string>,
): Promise<Diagnostic[]> {
    const diagnostics: Diagnostic[] = [];
    const steps = fm.steps ?? [];

    if (steps.length < 2) {
        diagnostics.push({ level: "error", message: `[${file}] narrative requires at least 2 steps` });
    }
    for (const step of steps) {
        for (const focusId of step.focus) {
            if (!nodeIds.has(focusId)) {
                diagnostics.push({ level: "error", message: `[${file}] step "${step.title}" focus references unknown node "${focusId}"` });
            }
        }
    }
    if (steps.length > 0) {
        const anchorHtml = await renderNarrativeBodyForAnchors(content);
        const chapterIds = new Set(Object.keys(sliceChapters(anchorHtml)));
        for (const step of steps) {
            if (!chapterIds.has(step.anchor)) {
                diagnostics.push({
                    level: "error",
                    message: `[${file}] step "${step.title}" anchor "${step.anchor}" does not resolve to a "##" heading in the body`,
                });
            }
        }
    }

    return diagnostics;
}
