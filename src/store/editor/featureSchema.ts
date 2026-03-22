import { z } from "zod";

const baseFeatureSchema = z.object({
    id: z.string().default(() => crypto.randomUUID()),
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

const directedPointFeatureSchema = baseFeatureSchema.extend({
    type: z.literal("directed_point"),
    x: z.number(),
    y: z.number(),
    direction: z.object({ dx: z.number(), dy: z.number() }),
    score: z.number(),
    orientationRad: z.number().optional(),
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
]);

export const featuresArraySchema = z.array(featureSchema);
