// Pure camera policy for NarrativeCanvas's initial (pre-walkthrough) framing.
//
// BL-034: the initial camera used to always fit the WHOLE lens span, which on
// a wide narrative shrinks chip labels below legibility (and, on some aspect
// ratios, crops the leftmost/rightmost chips against the clamped fit-scale
// floor already enforced by `useViewport`). This module decides, given the
// lens's content bbox and the viewport size, whether the whole-lens fit is
// still legible — and if not, what to frame instead: the walkthrough's first
// step (so a reader who does start stepping sees where it begins), or — when
// the narrative has no steps — the leftmost (earliest) slice of the lens.
//
// No React, no DOM — this only computes a box + scale range that the caller
// hands to `useViewport`'s `fitBounds`. `useViewport` itself is unchanged in
// its default behaviour (see its `fitBounds` doc for the opt-in `minScale`
// param); GraphExplorer and the People network never call this module.

import type { ViewportBounds } from "../graph/useViewport.ts";
import { NARRATIVE_NODE_H, NARRATIVE_NODE_W } from "./narrativeLayout.ts";

// ── Legibility floor ─────────────────────────────────────────────────────────

/**
 * CSS font-size (plane/content px) of a chip's title label — must match the
 * `text-[12px]` class on `NodeChip`'s title `<span>` in NarrativeCanvas.tsx.
 * A CSS pixel here is one content unit at camera scale 1, so this is also the
 * label's on-screen size at scale 1.
 */
export const NARRATIVE_LABEL_FONT_PX = 12;

/**
 * Smallest on-screen label size (px) a reader can make out without zooming
 * in first. ~11px is the commonly cited floor for body-adjacent UI text
 * (WCAG-adjacent readability guidance); below it, a title reads as a grey
 * smudge rather than words.
 */
export const NARRATIVE_LABEL_LEGIBILITY_FLOOR_PX = 11;

/**
 * Minimum camera scale that keeps the chip title legible: at this scale, a
 * `NARRATIVE_LABEL_FONT_PX` label renders at exactly
 * `NARRATIVE_LABEL_LEGIBILITY_FLOOR_PX` on screen. Derived, not hard-coded —
 * change either constant above and this follows.
 */
export const NARRATIVE_MIN_LEGIBLE_SCALE = NARRATIVE_LABEL_LEGIBILITY_FLOOR_PX / NARRATIVE_LABEL_FONT_PX;

/** Cap applied when framing a walkthrough step's focus box — never zoom in past 1x on a tight cluster. */
export const NARRATIVE_STEP_MAX_SCALE = 1;

/** The scale at which `box` (plus `padding` on every side) would exactly fit `vp`, unclamped. */
function naturalFitScale(box: ViewportBounds, vp: { w: number; h: number }, padding: number): number {
    const bboxW = box.maxX - box.minX + 2 * padding;
    const bboxH = box.maxY - box.minY + 2 * padding;
    if (bboxW <= 0 || bboxH <= 0 || vp.w <= 0 || vp.h <= 0) return Infinity;
    return Math.min(vp.w / bboxW, vp.h / bboxH);
}

/** Union bounding box of one or more chip boxes (already in `nodeBox`'s content space). */
export function unionBox(boxes: readonly ViewportBounds[]): ViewportBounds | null {
    if (boxes.length === 0) return null;
    return {
        minX: Math.min(...boxes.map((b) => b.minX)),
        minY: Math.min(...boxes.map((b) => b.minY)),
        maxX: Math.max(...boxes.map((b) => b.maxX)),
        maxY: Math.max(...boxes.map((b) => b.maxY)),
    };
}

export interface InitialCameraPlan {
    /** Box to hand to `fitBounds` (it adds its own padding — don't pre-pad this). */
    box: ViewportBounds;
    minScale: number;
    maxScale: number;
}

/**
 * Decide how to frame the lens while the reader hasn't stepped into the
 * walkthrough (or has just left it) — the "no active step focus" state.
 *
 * Returns `null` when the whole lens already fits at/above the legibility
 * floor: the caller should keep the default whole-lens fit (current
 * behaviour, unchanged). Otherwise returns a box + scale range: the first
 * step's focus box when the narrative has one (cropped only if that focus
 * set is itself wider than the viewport at the floor scale — same trade-off
 * a stepping transition makes), or, when there is no step to anchor on, the
 * leftmost (earliest) slice of the lens sized to exactly fill the viewport
 * width at the floor scale so nothing is cropped horizontally.
 */
export function planInitialCamera(
    lensBounds: ViewportBounds,
    vp: { w: number; h: number },
    fitPadding: number,
    firstStepFocusBox: ViewportBounds | null,
    minScale: number = NARRATIVE_MIN_LEGIBLE_SCALE,
    stepMaxScale: number = NARRATIVE_STEP_MAX_SCALE,
): InitialCameraPlan | null {
    if (vp.w <= 0 || vp.h <= 0) return null;

    const wholeLensScale = naturalFitScale(lensBounds, vp, fitPadding);
    if (wholeLensScale >= minScale) return null;

    if (firstStepFocusBox) {
        return { box: firstStepFocusBox, minScale, maxScale: Math.max(minScale, stepMaxScale) };
    }

    // No step to anchor on: frame the earliest slice of the lens, sized so it
    // fills the viewport width exactly at the floor scale (no horizontal crop).
    const visibleContentW = Math.max(vp.w / minScale - 2 * fitPadding, NARRATIVE_NODE_W);
    const sliceMaxX = Math.min(lensBounds.maxX, lensBounds.minX + visibleContentW);
    const box: ViewportBounds = {
        minX: lensBounds.minX,
        minY: lensBounds.minY,
        maxX: Math.max(sliceMaxX, lensBounds.minX + NARRATIVE_NODE_W),
        maxY: lensBounds.maxY,
    };
    return { box, minScale, maxScale: minScale };
}

// Re-exported so callers that only need chip metrics don't have to import
// narrativeLayout.ts directly just for this module's slice-sizing floor.
export { NARRATIVE_NODE_H, NARRATIVE_NODE_W };
