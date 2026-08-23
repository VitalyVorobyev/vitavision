import type { Domain } from "../../lib/content/schema.ts";

export const domainLabels: Record<Domain, string> = {
    "image-formation": "Image formation",
    "features": "Features",
    "representation-learning": "Representation learning",
    "geometry": "Geometry",
    "targets": "Targets",
    "calibration": "Calibration",
    "stitching": "Stitching",
    "depth": "Depth",
    "detection": "Detection",
    "segmentation": "Segmentation",
    "anomaly-detection": "Anomaly detection",
};

export const domainOrder: Domain[] = [
    "image-formation",
    "features",
    "representation-learning",
    "geometry",
    "targets",
    "calibration",
    "stitching",
    "depth",
    "detection",
    "segmentation",
    "anomaly-detection",
];
