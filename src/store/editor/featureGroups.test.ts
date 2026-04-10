import { describe, expect, it } from "vitest";

import type { Feature, RingMarkerFeature } from "./useEditorStore";
import { buildFeatureGroups } from "./featureGroups";

const DEFAULT_ELLIPSE = {
    cx: 0,
    cy: 0,
    a: 1,
    b: 1,
    angleDeg: 0,
};

function makeRingMarkerFeature(
    id: string,
    markerId: number | null,
    kind = "ringgrid_decoded",
    x = 0,
    y = 0,
    targetPosition?: { x: number; y: number },
): RingMarkerFeature {
    return {
        id,
        type: "ring_marker",
        source: "algorithm",
        algorithmId: "ringgrid",
        readonly: true,
        x,
        y,
        outerEllipse: DEFAULT_ELLIPSE,
        innerEllipse: DEFAULT_ELLIPSE,
        meta: {
            kind,
            markerId,
            targetPosition,
        },
    };
}

describe("buildFeatureGroups", () => {
    it("sorts ring markers spatially (left-to-right, top-to-bottom)", () => {
        const features: Feature[] = [
            makeRingMarkerFeature("marker-bottom", 11, "ringgrid_decoded", 10, 200),
            makeRingMarkerFeature("marker-top-right", 2, "ringgrid_decoded", 100, 10),
            makeRingMarkerFeature("marker-mid", 7, "ringgrid_decoded", 50, 100),
            makeRingMarkerFeature("marker-top-left", 0, "ringgrid_decoded", 10, 10),
        ];

        const [ringMarkers] = buildFeatureGroups(features);

        expect(ringMarkers.key).toBe("algo:ringgrid_decoded");
        expect(ringMarkers.features.map((feature) => feature.id)).toEqual([
            "marker-top-left", "marker-bottom", "marker-mid", "marker-top-right",
        ]);
    });

    it("sorts decoded markers by board coordinates (row then column) when available", () => {
        // Simulate a rotated board: pixel positions don't match grid order,
        // but board_xy_mm values do (row 0 at y=0, row 1 at y=12)
        const features: Feature[] = [
            makeRingMarkerFeature("r1c1", 10, "ringgrid_decoded", 300, 50, { x: 13.86, y: 12.0 }),
            makeRingMarkerFeature("r0c0", 0, "ringgrid_decoded", 100, 200, { x: 0, y: 0 }),
            makeRingMarkerFeature("r1c0", 7, "ringgrid_decoded", 250, 150, { x: 0, y: 12.0 }),
            makeRingMarkerFeature("r0c1", 1, "ringgrid_decoded", 200, 100, { x: 13.86, y: 0 }),
        ];

        const [group] = buildFeatureGroups(features);
        expect(group.features.map((f) => f.id)).toEqual([
            "r0c0", "r0c1", "r1c0", "r1c1",
        ]);
    });

    it("places markers without board coords after those with board coords", () => {
        const features: Feature[] = [
            makeRingMarkerFeature("proposal", null, "ringgrid_decoded", 10, 10),
            makeRingMarkerFeature("decoded", 5, "ringgrid_decoded", 200, 200, { x: 0, y: 0 }),
        ];

        const [group] = buildFeatureGroups(features);
        expect(group.features.map((f) => f.id)).toEqual(["decoded", "proposal"]);
    });

    it("separates decoded and proposal ring markers into distinct groups", () => {
        const features: Feature[] = [
            makeRingMarkerFeature("decoded-1", 5, "ringgrid_decoded"),
            makeRingMarkerFeature("proposal-1", 0, "ringgrid_proposal"),
            makeRingMarkerFeature("decoded-2", 3, "ringgrid_decoded"),
        ];

        const groups = buildFeatureGroups(features);

        expect(groups).toHaveLength(2);
        expect(groups[0].key).toBe("algo:ringgrid_decoded");
        expect(groups[0].features).toHaveLength(2);
        expect(groups[1].key).toBe("algo:ringgrid_proposal");
        expect(groups[1].features).toHaveLength(1);
    });

    it("preserves insertion order for non-ringgrid groups", () => {
        const features: Feature[] = [
            {
                id: "marker-5",
                type: "aruco_marker",
                source: "algorithm",
                algorithmId: "markerboard",
                readonly: true,
                x: 0,
                y: 0,
                corners: [0, 0, 1, 0, 1, 1, 0, 1],
                meta: { kind: "marker", markerId: 5 },
            },
            {
                id: "marker-1",
                type: "aruco_marker",
                source: "algorithm",
                algorithmId: "markerboard",
                readonly: true,
                x: 0,
                y: 0,
                corners: [0, 0, 1, 0, 1, 1, 0, 1],
                meta: { kind: "marker", markerId: 1 },
            },
        ];

        const [markers] = buildFeatureGroups(features);

        expect(markers.key).toBe("algo:marker");
        expect(markers.features.map((feature) => feature.id)).toEqual(["marker-5", "marker-1"]);
    });
});
