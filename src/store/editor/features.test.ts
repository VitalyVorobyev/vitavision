import { describe, it, expect } from "vitest";
import { normalizeFeature, normalizeImportedFeatures, isReadonlyFeature } from "./features";
import type {
    Feature,
    PointFeature,
    LineFeature,
    PolylineFeature,
    PolygonFeature,
    BBoxFeature,
    EllipseFeature,
    DirectedPointFeature,
    RingMarkerFeature,
    ArUcoMarkerFeature,
    CircleFeature,
    LabeledPointFeature,
} from "./editorTypes";

const point: PointFeature = { id: "p1", type: "point", source: "manual", x: 1, y: 2 };
const line: LineFeature = { id: "l1", type: "line", source: "manual", points: [0, 0, 1, 1] };
const polyline: PolylineFeature = { id: "pl1", type: "polyline", source: "manual", points: [0, 0, 1, 1, 2, 2] };
const polygon: PolygonFeature = { id: "pg1", type: "polygon", source: "manual", points: [0, 0, 1, 0, 1, 1], closed: true };
const bbox: BBoxFeature = { id: "b1", type: "bbox", source: "manual", x: 0, y: 0, width: 10, height: 10, rotation: 0 };
const ellipse: EllipseFeature = { id: "e1", type: "ellipse", source: "manual", x: 0, y: 0, radiusX: 5, radiusY: 3, rotation: 0 };
const directedPoint: DirectedPointFeature = {
    id: "dp1",
    type: "directed_point",
    source: "algorithm",
    x: 1,
    y: 1,
    axes: [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }],
    score: 0.9,
};
const ringMarker: RingMarkerFeature = {
    id: "rm1",
    type: "ring_marker",
    source: "algorithm",
    x: 1,
    y: 1,
    outerEllipse: { cx: 1, cy: 1, a: 5, b: 5, angleDeg: 0 },
    innerEllipse: { cx: 1, cy: 1, a: 2, b: 2, angleDeg: 0 },
};
const arucoMarker: ArUcoMarkerFeature = {
    id: "am1",
    type: "aruco_marker",
    source: "algorithm",
    x: 1,
    y: 1,
    corners: [0, 0, 1, 0, 1, 1, 0, 1],
};
const circle: CircleFeature = { id: "c1", type: "circle", source: "algorithm", x: 1, y: 1, radius: 3 };
const labeledPoint: LabeledPointFeature = {
    id: "lp1",
    type: "labeled_point",
    source: "algorithm",
    x: 1,
    y: 1,
    score: 0.5,
    gridIndex: { i: 0, j: 0 },
    masterId: 1,
};

const allVariants: Feature[] = [
    point,
    line,
    polyline,
    polygon,
    bbox,
    ellipse,
    directedPoint,
    ringMarker,
    arucoMarker,
    circle,
    labeledPoint,
];

describe("normalizeFeature", () => {
    it.each(allVariants)("normalizes source and readonly for $type features", (feature) => {
        const normalized = normalizeFeature(feature);
        const expectedSource = feature.source === "algorithm" ? "algorithm" : "manual";
        expect(normalized.source).toBe(expectedSource);
        expect(normalized.readonly).toBe(expectedSource === "algorithm");
        expect(normalized).toMatchObject({ ...feature, source: expectedSource });
    });

    it("defaults an invalid source to manual", () => {
        const feature = { ...point, source: "bogus" as unknown as "manual" };
        expect(normalizeFeature(feature).source).toBe("manual");
    });

    it("preserves an explicit readonly flag on a manual feature", () => {
        const feature: PointFeature = { ...point, readonly: true };
        expect(normalizeFeature(feature).readonly).toBe(true);
    });

    it("preserves an explicit readonly:false on an algorithm feature", () => {
        const feature: PointFeature = { ...point, source: "algorithm", readonly: false };
        expect(normalizeFeature(feature).readonly).toBe(false);
    });
});

describe("isReadonlyFeature", () => {
    it("returns true only when readonly is exactly true", () => {
        expect(isReadonlyFeature({ ...point, readonly: true })).toBe(true);
        expect(isReadonlyFeature({ ...point, readonly: false })).toBe(false);
        expect(isReadonlyFeature(point)).toBe(false);
    });
});

describe("normalizeImportedFeatures", () => {
    it("returns an empty array for non-array input", () => {
        expect(normalizeImportedFeatures(null)).toEqual([]);
        expect(normalizeImportedFeatures(undefined)).toEqual([]);
        expect(normalizeImportedFeatures({})).toEqual([]);
        expect(normalizeImportedFeatures("nope")).toEqual([]);
    });

    it("parses and normalizes valid features from an array", () => {
        const result = normalizeImportedFeatures([point, circle]);
        expect(result).toHaveLength(2);
        expect(result[0]).toMatchObject({ type: "point", source: "manual" });
        expect(result[1]).toMatchObject({ type: "circle", source: "algorithm", readonly: true });
    });

    it("drops entries that fail schema validation", () => {
        const invalid = { id: "bad", type: "point" }; // missing x, y
        const result = normalizeImportedFeatures([point, invalid]);
        expect(result).toHaveLength(1);
        expect(result[0].id).toBe("p1");
    });
});
