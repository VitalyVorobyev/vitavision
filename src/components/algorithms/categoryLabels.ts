import type { AlgorithmCategory } from "../../lib/content/schema.ts";

const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
    "corner-detection": "Corner detection",
    "calibration-targets": "Calibration targets",
    "subpixel-refinement": "Subpixel refinement",
    explainers: "Explainers",
};

export function categoryLabel(category: AlgorithmCategory): string {
    return CATEGORY_LABELS[category];
}
