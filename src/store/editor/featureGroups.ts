import type { Feature } from "./useEditorStore";

export interface FeatureGroup {
    key: string;
    label: string;
    color: string;
    features: Feature[];
}

const KIND_LABELS: Record<string, string> = {
    chessboard: "Corners",
    charuco: "Corners",
    checkerboard_marker: "Corners",
    marker: "Markers",
    circle_candidate: "Circle candidates",
    ringgrid: "Ring markers",
    ringgrid_decoded: "Decoded markers",
    ringgrid_proposal: "Marker proposals",
    radsym_proposal: "Proposals",
};

const TYPE_LABELS: Record<string, string> = {
    point: "Points",
    line: "Lines",
    polyline: "Polylines",
    polygon: "Polygons",
    bbox: "Bounding boxes",
    ellipse: "Ellipses",
    directed_point: "Directed points",
    ring_marker: "Ring markers",
    aruco_marker: "ArUco markers",
};

export const featureSwatch = (feature: Feature): string => {
    if (feature.color) {
        return feature.color;
    }
    if (feature.type === "directed_point") {
        return "#60a5fa";
    }
    if (feature.type === "ring_marker") {
        return "#0f766e";
    }
    if (feature.type === "aruco_marker") {
        return "#b45309";
    }
    return "#94a3b8";
};

export function getFeatureGroupKey(feature: Feature): string {
    if (feature.source === "algorithm" && feature.meta?.kind) {
        return `algo:${feature.meta.kind}`;
    }
    return `type:${feature.type}`;
}

export function getFeatureGroupLabel(key: string): string {
    const [prefix, value] = key.split(":");
    if (prefix === "algo") {
        return KIND_LABELS[value] ?? value;
    }
    return TYPE_LABELS[value] ?? value;
}

export function isFeatureGroupVisible(
    key: string,
    visibility: Record<string, boolean>,
): boolean {
    return visibility[key] ?? true;
}

export function isFeatureVisible(
    feature: Feature,
    visibility: Record<string, boolean>,
): boolean {
    return isFeatureGroupVisible(getFeatureGroupKey(feature), visibility);
}

/** Extract (x, y) for spatial sorting. */
function featurePosition(f: Feature): { x: number; y: number } | null {
    if ("x" in f && "y" in f && typeof f.x === "number" && typeof f.y === "number") {
        return { x: f.x, y: f.y };
    }
    return null;
}

/** Sort left-to-right, top-to-bottom — "next" moves rightward, then down. */
function sortByPosition(features: Feature[]): Feature[] {
    return [...features].sort((a, b) => {
        const pa = featurePosition(a);
        const pb = featurePosition(b);
        if (!pa || !pb) return 0;
        const dx = pa.x - pb.x;
        if (Math.abs(dx) > 1) return dx;
        return pa.y - pb.y;
    });
}

/**
 * Sort by board coordinates (row then column in grid space).
 * Uses `meta.targetPosition` (board_xy_mm) when available — same-row markers
 * share identical y values, so a 0.1 mm tolerance groups them reliably.
 * Features without board coords are appended in pixel-position order.
 */
function sortByBoardCoords(features: Feature[]): Feature[] {
    const withBoard: Feature[] = [];
    const withoutBoard: Feature[] = [];
    for (const f of features) {
        if (f.meta?.targetPosition) {
            withBoard.push(f);
        } else {
            withoutBoard.push(f);
        }
    }

    withBoard.sort((a, b) => {
        const pa = a.meta!.targetPosition!;
        const pb = b.meta!.targetPosition!;
        const dy = pa.y - pb.y;
        if (Math.abs(dy) > 0.1) return dy;
        return pa.x - pb.x;
    });

    return [...withBoard, ...sortByPosition(withoutBoard)];
}

function sortFeaturesForDisplay(key: string, features: Feature[]): Feature[] {
    if (key === "algo:ringgrid_decoded" || key === "algo:ringgrid_proposal" || key === "type:ring_marker") {
        return sortByBoardCoords(features);
    }

    if (key === "type:directed_point" || key === "type:point" || key === "algo:radsym_proposal") {
        return sortByPosition(features);
    }

    return features;
}

export function buildFeatureGroups(features: Feature[]): FeatureGroup[] {
    const groups = new Map<string, Feature[]>();
    const order: string[] = [];

    for (const feature of features) {
        const key = getFeatureGroupKey(feature);
        if (!groups.has(key)) {
            groups.set(key, []);
            order.push(key);
        }
        groups.get(key)!.push(feature);
    }

    return order.map((key) => {
        const items = sortFeaturesForDisplay(key, groups.get(key)!);
        return {
            key,
            label: getFeatureGroupLabel(key),
            color: featureSwatch(items[0]),
            features: items,
        };
    });
}
