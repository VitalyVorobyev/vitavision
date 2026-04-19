import { z } from "zod";

function generateId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

const baseFeatureSchema = z.object({
    id: z.string().default(() => generateId()),
    source: z.enum(["manual", "algorithm"]).default("manual"),
    algorithmId: z.string().optional(),
    runId: z.string().optional(),
    readonly: z.boolean().optional(),
    color: z.string().optional(),
    label: z.string().optional(),
    meta: z.object({
        kind: z.string().optional(),
        score: z.number().optional(),
        grid: z.object({ i: z.number(), j: z.number() }).optional(),
        gridCell: z.object({ gx: z.number(), gy: z.number() }).optional(),
        cornerId: z.number().nullable().optional(),
        markerId: z.number().nullable().optional(),
        targetPosition: z.object({ x: z.number(), y: z.number() }).nullable().optional(),
        rotation: z.number().optional(),
        hamming: z.number().optional(),
        borderScore: z.number().optional(),
        code: z.number().optional(),
        inverted: z.boolean().optional(),
        polarity: z.string().optional(),
        contrast: z.number().optional(),
        distanceCells: z.number().nullable().optional(),
        offsetCells: z.object({ di: z.number(), dj: z.number() }).nullable().optional(),
    }).optional(),
});

const pointFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("point"),
    x: z.number(),
    y: z.number(),
    angle: z.number().optional(),
});

const lineFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("line"),
    points: z.tuple([z.number(), z.number(), z.number(), z.number()]),
});

const polylineFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("polyline"),
    points: z.array(z.number()).min(4),
});

const polygonFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("polygon"),
    points: z.array(z.number()).min(6),
    closed: z.boolean(),
});

const bboxFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("bbox"),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    rotation: z.number(),
});

const ellipseFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("ellipse"),
    x: z.number(),
    y: z.number(),
    radiusX: z.number(),
    radiusY: z.number(),
    rotation: z.number(),
});

const directedAxisSchema = z.object({
    dx: z.number(),
    dy: z.number(),
    sigmaRad: z.number().optional(),
    angleRad: z.number().optional(),
});

const directedPointFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("directed_point"),
    x: z.number(),
    y: z.number(),
    axes: z.tuple([directedAxisSchema, directedAxisSchema]),
    score: z.number(),
    contrast: z.number().optional(),
    fitRms: z.number().optional(),
});

const ringMarkerEllipseSchema = z.object({
    cx: z.number(),
    cy: z.number(),
    a: z.number(),
    b: z.number(),
    angleDeg: z.number(),
});

const ringMarkerFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("ring_marker"),
    x: z.number(),
    y: z.number(),
    outerEllipse: ringMarkerEllipseSchema,
    innerEllipse: ringMarkerEllipseSchema,
});

const arucoMarkerFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("aruco_marker"),
    x: z.number(),
    y: z.number(),
    corners: z.tuple([
        z.number(), z.number(), z.number(), z.number(),
        z.number(), z.number(), z.number(), z.number(),
    ]),
});

const circleFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("circle"),
    x: z.number(),
    y: z.number(),
    radius: z.number().positive(),
    score: z.number().optional(),
});

const labeledPointFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("labeled_point"),
    x: z.number(),
    y: z.number(),
    score: z.number(),
    gridIndex: z.object({ i: z.number(), j: z.number() }),
    masterId: z.number(),
    targetPosMm: z.object({ x: z.number(), y: z.number() }).optional(),
});

export const featureSchema = z.discriminatedUnion("type", [
    pointFeatureSchema,
    lineFeatureSchema,
    polylineFeatureSchema,
    polygonFeatureSchema,
    bboxFeatureSchema,
    ellipseFeatureSchema,
    directedPointFeatureSchema,
    ringMarkerFeatureSchema,
    arucoMarkerFeatureSchema,
    circleFeatureSchema,
    labeledPointFeatureSchema,
]);

export const featuresArraySchema = z.array(featureSchema);
