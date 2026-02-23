import { z } from "zod";

const baseFeatureSchema = z.object({
    id: z.string(),
    source: z.enum(["manual", "algorithm"]).default("manual"),
    algorithmId: z.string().optional(),
    runId: z.string().optional(),
    readonly: z.boolean().optional(),
    color: z.string().optional(),
    label: z.string().optional(),
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

export const featureSchema = z.discriminatedUnion("type", [
    pointFeatureSchema,
    lineFeatureSchema,
    polylineFeatureSchema,
    bboxFeatureSchema,
    ellipseFeatureSchema,
    directedPointFeatureSchema,
]);

export const featuresArraySchema = z.array(featureSchema);
