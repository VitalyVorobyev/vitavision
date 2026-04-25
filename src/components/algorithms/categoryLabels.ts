import type { AlgorithmCategory, ModelCategory } from "../../lib/content/schema.ts";

const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
    "corner-detection": "Corner detection",
    "calibration-targets": "Calibration targets",
    "subpixel-refinement": "Subpixel refinement",
    explainers: "Explainers",
    calibration: "Calibration",
};

export function categoryLabel(category: AlgorithmCategory): string {
    return CATEGORY_LABELS[category];
}

const MODEL_CATEGORY_LABELS: Record<ModelCategory, string> = {
    "detection": "Detection",
    "depth-stereo": "Depth & stereo",
    "pose-geometry": "Pose & geometry",
    "segmentation-flow": "Segmentation & flow",
    "foundation-ssl": "Foundation & self-supervised",
    "calibration-learning": "Learned calibration",
};

export function modelCategoryLabel(category: ModelCategory): string {
    return MODEL_CATEGORY_LABELS[category];
}
