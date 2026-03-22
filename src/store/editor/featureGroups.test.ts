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

function makeRingMarkerFeature(id: string, markerId: number | null): RingMarkerFeature {
    return {
        id,
        type: "ring_marker",
        source: "algorithm",
        algorithmId: "ringgrid",
        readonly: true,
        x: 0,
        y: 0,
        outerEllipse: DEFAULT_ELLIPSE,
        innerEllipse: DEFAULT_ELLIPSE,
        meta: {
            kind: "ringgrid",
            markerId,
        },
    };
}

describe("buildFeatureGroups", () => {
    it("sorts detected ring markers by marker ID", () => {
        const features: Feature[] = [
            makeRingMarkerFeature("marker-11", 11),
            makeRingMarkerFeature("marker-2", 2),
            makeRingMarkerFeature("marker-null", null),
            makeRingMarkerFeature("marker-7", 7),
        ];

        const [ringMarkers] = buildFeatureGroups(features);

        expect(ringMarkers.key).toBe("algo:ringgrid");
        expect(ringMarkers.features.map((feature) => feature.meta?.markerId ?? null)).toEqual([2, 7, 11, null]);
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
