import type { Domain } from "../../lib/content/schema.ts";

export const domainLabels: Record<Domain, string> = {
    "image-formation": "Image formation",
    "features": "Features",
    "geometry": "Geometry",
    "targets": "Targets",
    "calibration": "Calibration",
    "stitching": "Stitching",
    "depth": "Depth",
    "detection": "Detection",
};

export const domainOrder: Domain[] = [
    "image-formation",
    "features",
    "geometry",
    "targets",
    "calibration",
    "stitching",
    "depth",
    "detection",
];
