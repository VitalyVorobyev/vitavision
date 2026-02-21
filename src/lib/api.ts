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

export interface CalibrationResult {
    camera_matrix: number[][]; // 3x3
    dist_coeffs: number[];     // 1x5
    reprojection_error: number;
}

// Renamed from FeatureDetectionResponse to FeatureDetectionResult to match new function signature
export interface FeatureDetectionResult {
    keypoints: Point2D[];
    descriptors?: number[][];
}

const API_BASE_URL = 'http://localhost:8000/api/v1';

/**
 * Invokes the camera calibration pipeline on the backend
 */
export const calibrateCamera = async (images: string[]): Promise<CalibrationResult> => {
    try {
        const response = await fetch(`${API_BASE_URL}/cv/calibrate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ images }),
        });

        if (!response.ok) {
            throw new Error('Failed to calibrate camera');
        }

        return await response.json();
    } catch (error) {
        console.error("Calibration error:", error);
        throw error;
    }
};

/**
 * Invokes a feature detector (e.g. SIFT, ORB) on the backend
 */
export const detectFeatures = async (imageUrl: string, prompt: string = ""): Promise<FeatureDetectionResult> => {
    try {
        // Prepare URL params
        const url = new URL(`${API_BASE_URL}/cv/detect-features`);
        url.searchParams.append('image_url', imageUrl);
        if (prompt) {
            url.searchParams.append('prompt', prompt);
        }

        const response = await fetch(url.toString(), {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
            }
        });

        if (!response.ok) {
            throw new Error('Failed to detect features');
        }

        return await response.json();
    } catch (error) {
        console.error("Feature detection error:", error);
        throw error;
    }
};
