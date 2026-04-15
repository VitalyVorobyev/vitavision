import { describe, expect, it } from "vitest";
import { computeChessResponse } from "./math";

describe("computeChessResponse", () => {
    it("keeps the corner case stronger than the edge and stripe cases", () => {
        const corner = computeChessResponse({
            pattern: "corner",
            rotationDeg: 22.5,
            blur: 0.18,
            contrast: 1.08,
        });
        const edge = computeChessResponse({
            pattern: "edge",
            rotationDeg: 22.5,
            blur: 0.18,
            contrast: 1.08,
        });
        const stripe = computeChessResponse({
            pattern: "stripe",
            rotationDeg: 22.5,
            blur: 0.18,
            contrast: 1.08,
        });

        expect(corner.response).toBeGreaterThan(edge.response);
        expect(corner.response).toBeGreaterThan(stripe.response);
        expect(edge.dr).toBeGreaterThan(edge.mr * 4);
        expect(stripe.mr).toBeGreaterThan(corner.mr);
    });
});
