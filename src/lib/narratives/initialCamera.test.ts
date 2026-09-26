import { describe, expect, it } from "vitest";
import {
    NARRATIVE_LABEL_FONT_PX,
    NARRATIVE_LABEL_LEGIBILITY_FLOOR_PX,
    NARRATIVE_MIN_LEGIBLE_SCALE,
    NARRATIVE_STEP_MAX_SCALE,
    planInitialCamera,
    unionBox,
} from "./initialCamera.ts";
import type { ViewportBounds } from "../graph/useViewport.ts";

describe("NARRATIVE_MIN_LEGIBLE_SCALE", () => {
    it("is derived from the label font size and the legibility floor, not hard-coded", () => {
        expect(NARRATIVE_MIN_LEGIBLE_SCALE).toBeCloseTo(
            NARRATIVE_LABEL_LEGIBILITY_FLOOR_PX / NARRATIVE_LABEL_FONT_PX,
            10,
        );
        // At this scale, the 12px label renders at exactly the 11px floor.
        expect(NARRATIVE_LABEL_FONT_PX * NARRATIVE_MIN_LEGIBLE_SCALE).toBeCloseTo(
            NARRATIVE_LABEL_LEGIBILITY_FLOOR_PX,
            10,
        );
    });
});

describe("unionBox", () => {
    it("returns null for an empty list", () => {
        expect(unionBox([])).toBeNull();
    });

    it("returns the single box unchanged", () => {
        const b: ViewportBounds = { minX: 1, minY: 2, maxX: 3, maxY: 4 };
        expect(unionBox([b])).toEqual(b);
    });

    it("unions several boxes", () => {
        const a: ViewportBounds = { minX: 0, minY: 0, maxX: 10, maxY: 10 };
        const b: ViewportBounds = { minX: 5, minY: -5, maxX: 20, maxY: 8 };
        expect(unionBox([a, b])).toEqual({ minX: 0, minY: -5, maxX: 20, maxY: 10 });
    });
});

describe("planInitialCamera", () => {
    const vp = { w: 1440, h: 640 };
    const padding = 48;

    it("returns null while the viewport hasn't been measured yet", () => {
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 5000, maxY: 500 };
        expect(planInitialCamera(lens, { w: 0, h: 0 }, padding, null)).toBeNull();
    });

    it("whole-lens-fits case: defers to the default whole-lens fit when it's already legible", () => {
        // A small lens comfortably fits at well above the legibility floor.
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 900, maxY: 400 };
        expect(planInitialCamera(lens, vp, padding, null)).toBeNull();
    });

    it("no-focus case: frames the leftmost slice of the lens at exactly the floor scale when there is no step", () => {
        // A wide lens whose whole-lens fit would fall well under the floor.
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 20000, maxY: 400 };
        const plan = planInitialCamera(lens, vp, padding, null);
        expect(plan).not.toBeNull();
        expect(plan!.minScale).toBeCloseTo(NARRATIVE_MIN_LEGIBLE_SCALE, 10);
        expect(plan!.maxScale).toBeCloseTo(NARRATIVE_MIN_LEGIBLE_SCALE, 10);
        // Anchored at the lens's own left edge — the "earliest" region.
        expect(plan!.box.minX).toBe(lens.minX);
        expect(plan!.box.minY).toBe(lens.minY);
        expect(plan!.box.maxY).toBe(lens.maxY);
        // Fully visible horizontally at the floor scale: (box width + 2*padding) * floor ~= vp.w.
        const bboxW = plan!.box.maxX - plan!.box.minX + 2 * padding;
        expect(bboxW * NARRATIVE_MIN_LEGIBLE_SCALE).toBeCloseTo(vp.w, 0);
        // The slice never extends past the lens's own right edge.
        expect(plan!.box.maxX).toBeLessThanOrEqual(lens.maxX);
    });

    it("no-focus case: clamps the slice to the lens width when the lens is narrower than the floor-scale viewport", () => {
        // Lens too short (vertically) to fit at the floor scale, but not wide.
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 700, maxY: 3000 };
        const plan = planInitialCamera(lens, vp, padding, null);
        expect(plan).not.toBeNull();
        // Never crops past the lens's actual extent.
        expect(plan!.box.maxX).toBe(lens.maxX);
    });

    it("step-focus case: frames the first step's focus box at a scale >= the floor when it fits", () => {
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 20000, maxY: 400 };
        // A tight, small focus box — its natural fit scale comfortably clears the floor.
        const focus: ViewportBounds = { minX: 100, minY: 0, maxX: 400, maxY: 62 };
        const plan = planInitialCamera(lens, vp, padding, focus);
        expect(plan).not.toBeNull();
        expect(plan!.box).toEqual(focus);
        expect(plan!.minScale).toBeCloseTo(NARRATIVE_MIN_LEGIBLE_SCALE, 10);
        expect(plan!.maxScale).toBeCloseTo(NARRATIVE_STEP_MAX_SCALE, 10);
    });

    it("step wider than viewport: crops to center on the focus box at exactly the floor scale", () => {
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 20000, maxY: 400 };
        // A focus box far wider than the viewport could ever show at the floor scale.
        const focus: ViewportBounds = { minX: 0, minY: 0, maxX: 20000, maxY: 400 };
        const plan = planInitialCamera(lens, vp, padding, focus);
        expect(plan).not.toBeNull();
        expect(plan!.box).toEqual(focus);
        // minScale === maxScale === the floor: fitBounds has no room to pick
        // anything else, so the camera lands on exactly the floor and crops.
        expect(plan!.minScale).toBeCloseTo(NARRATIVE_MIN_LEGIBLE_SCALE, 10);
    });

    it("never returns a scale range whose minScale exceeds maxScale", () => {
        const lens: ViewportBounds = { minX: 0, minY: 0, maxX: 20000, maxY: 400 };
        const focus: ViewportBounds = { minX: 0, minY: 0, maxX: 50, maxY: 62 };
        const plan = planInitialCamera(lens, vp, padding, focus);
        expect(plan).not.toBeNull();
        expect(plan!.minScale).toBeLessThanOrEqual(plan!.maxScale);
    });
});
