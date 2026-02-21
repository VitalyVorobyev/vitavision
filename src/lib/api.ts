/**
 * FastAPI Backend Integation Stubs
 * 
 * This module defines the expected contract for the FastAPI backend,
 * focusing heavily on computer vision algorithm invocations.
 */

export interface Point2D {
    x: number;
    y: number;
}

export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface CalibrationRequest {
    image_url: string; // The R2 url 
    points: Point2D[];
}

export interface CalibrationResponse {
    camera_matrix: number[][]; // 3x3
    dist_coeffs: number[];     // 1x5
    reprojection_error: number;
}

/**
 * Invokes the camera calibration pipeline on the backend
 */
export async function runCalibration(request: CalibrationRequest): Promise<CalibrationResponse> {
    // STUB: POST /api/v1/cv/calibrate
    // const res = await fetch('/api/v1/cv/calibrate', { method: 'POST', body: JSON.stringify(request) });
    // return res.json();

    console.log("[Stub] Ran calibration on points:", request.points.length);
    return {
        camera_matrix: [[1000, 0, 320], [0, 1000, 240], [0, 0, 1]],
        dist_coeffs: [0, 0, 0, 0, 0],
        reprojection_error: 0.5
    };
}

export interface FeatureDetectionRequest {
    image_url: string;
    roi?: BoundingBox;
}

export interface FeatureDetectionResponse {
    keypoints: Point2D[];
    descriptors?: number[][];
}

/**
 * Invokes a feature detector (e.g. SIFT, ORB) on the backend
 */
export async function detectFeatures(request: FeatureDetectionRequest): Promise<FeatureDetectionResponse> {
    // STUB: POST /api/v1/cv/detect-features
    console.log("[Stub] Detecting features inside ROI?", !!request.roi);
    return {
        keypoints: [
            { x: 100, y: 150 },
            { x: 200, y: 250 }
        ]
    };
}
