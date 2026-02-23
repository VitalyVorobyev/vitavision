import { API_BASE_URL, apiHeaders } from "./http";
import type { StorageMode } from "./storage";

export type ConfidenceLevel = "low" | "medium" | "high";

export interface ChessDetectorConfig {
    thresholdRel?: number;
    thresholdAbs?: number;
    nmsRadius?: number;
    minClusterSize?: number;
    pyramidNumLevels?: number;
    pyramidMinSize?: number;
    refinementRadius?: number;
    mergeRadius?: number;
    useRadius10?: boolean;
    descriptorUseRadius10?: boolean;
    refiner?: "center_of_mass" | "forstner" | "saddle_point";
}

export interface DetectChessCornersRequest {
    key: string;
    storageMode: StorageMode;
    useMlRefiner?: boolean;
    config?: ChessDetectorConfig;
}

export interface ChessCornerFeature {
    id: string;
    x: number;
    y: number;
    x_norm: number;
    y_norm: number;
    response: number;
    orientation_rad: number;
    orientation_deg: number;
    direction: { dx: number; dy: number };
    confidence: number;
    confidence_level: ConfidenceLevel;
    subpixel_offset_px: number;
}

export interface ChessCornersResult {
    status: "success";
    key: string;
    storage_mode: StorageMode;
    image_width: number;
    image_height: number;
    frame: {
        name: "image_px_center";
        origin: "top_left";
        x_axis: "right";
        y_axis: "down";
        units: "pixels";
    };
    config: {
        use_ml_refiner: boolean;
        threshold_rel: number | null;
        threshold_abs: number | null;
        nms_radius: number;
        min_cluster_size: number;
        pyramid_num_levels: number;
        pyramid_min_size: number;
        refinement_radius: number;
        merge_radius: number;
        use_radius10: boolean;
        descriptor_use_radius10: boolean | null;
        refiner: string;
    };
    summary: {
        count: number;
        response_min: number | null;
        response_max: number | null;
        response_mean: number | null;
        confidence_min: number | null;
        confidence_max: number | null;
        runtime_ms: number;
        subpixel_mean_offset_px: number | null;
    };
    corners: ChessCornerFeature[];
}

function toBackendConfig(config?: ChessDetectorConfig): Record<string, unknown> | undefined {
    if (!config) return undefined;
    return {
        threshold_rel: config.thresholdRel,
        threshold_abs: config.thresholdAbs,
        nms_radius: config.nmsRadius,
        min_cluster_size: config.minClusterSize,
        pyramid_num_levels: config.pyramidNumLevels,
        pyramid_min_size: config.pyramidMinSize,
        refinement_radius: config.refinementRadius,
        merge_radius: config.mergeRadius,
        use_radius10: config.useRadius10,
        descriptor_use_radius10: config.descriptorUseRadius10,
        refiner: config.refiner,
    };
}

export async function detectChessCorners(payload: DetectChessCornersRequest): Promise<ChessCornersResult> {
    const response = await fetch(`${API_BASE_URL}/cv/chess-corners`, {
        method: "POST",
        headers: apiHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({
            key: payload.key,
            storage_mode: payload.storageMode,
            use_ml_refiner: payload.useMlRefiner ?? false,
            config: toBackendConfig(payload.config),
        }),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`Chess corners request failed: ${response.status} ${text}`);
    }

    return response.json() as Promise<ChessCornersResult>;
}
