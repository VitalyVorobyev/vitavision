/**
 * Domain → community mapping for the People directory and network.
 *
 * The Atlas has eleven domains; colouring a network by eleven hues is unreadable,
 * so domains fold into five communities that match how the co-author graph
 * actually clusters. Shared by the build (`scripts/build/scholarly.ts`, which
 * assigns each author a group from their main domain) and the client (labels,
 * colours). Colours differ in lightness as well as hue.
 */

import type { ScholarlyGroup } from "./scholarlyTypes.ts";

export const GROUP_OF_DOMAIN: Record<string, ScholarlyGroup> = {
    detection: "recognition",
    segmentation: "recognition",
    "representation-learning": "representation",
    "anomaly-detection": "representation",
    features: "features",
    geometry: "geometry",
    stitching: "geometry",
    depth: "geometry",
    calibration: "calibration",
    targets: "calibration",
    "image-formation": "calibration",
};

export const GROUPS: { group: ScholarlyGroup; label: string; color: string }[] = [
    { group: "recognition", label: "Detection & segmentation", color: "#2f6fb5" },
    { group: "representation", label: "Representation learning & anomaly", color: "#7b52c4" },
    { group: "features", label: "Features & matching", color: "#12817f" },
    { group: "geometry", label: "Geometry, stitching & depth", color: "#c2630f" },
    { group: "calibration", label: "Calibration & targets", color: "#b0406f" },
    { group: "other", label: "Not yet cited by a page", color: "#94a3b8" },
];

export function groupOfDomain(domain: string | undefined): ScholarlyGroup {
    return (domain && GROUP_OF_DOMAIN[domain]) || "other";
}
