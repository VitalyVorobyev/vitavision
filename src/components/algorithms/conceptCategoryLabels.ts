import type { ConceptCategory } from "../../lib/content/schema.ts";

export function conceptCategoryLabel(category: ConceptCategory): string {
    switch (category) {
        case "image-formation": return "Image Formation";
        case "geometry":        return "Geometry";
        case "feature-theory":  return "Feature Theory";
        case "calibration-theory": return "Calibration Theory";
    }
}
