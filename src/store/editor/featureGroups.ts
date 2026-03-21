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
};

const TYPE_LABELS: Record<string, string> = {
    point: "Points",
    line: "Lines",
    polyline: "Polylines",
    polygon: "Polygons",
    bbox: "Bounding boxes",
    ellipse: "Ellipses",
    directed_point: "Directed points",
};

export const featureSwatch = (feature: Feature): string => {
    if (feature.color) {
        return feature.color;
    }
    if (feature.type === "directed_point") {
        return "#60a5fa";
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
        const items = groups.get(key)!;
        return {
            key,
            label: getFeatureGroupLabel(key),
            color: featureSwatch(items[0]),
            features: items,
        };
    });
}
