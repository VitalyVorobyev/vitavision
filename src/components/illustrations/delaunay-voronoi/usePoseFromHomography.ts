import { useMemo } from "react";
import { computeHomography } from "./homography";
import { decomposePose, type Pose } from "./cameraPose";

type Point = { x: number; y: number };

/**
 * Memoised hook: computes homography from the four grid corners, then decomposes
 * it into a camera Pose (yaw / pitch / roll / focalPx / reprojErrPx / valid).
 * Re-computes whenever any corner coordinate, canvasWidth, or canvasHeight changes.
 */
export function usePoseFromHomography(
    corners: [Point, Point, Point, Point],
    canvasWidth: number,
    canvasHeight: number,
    aspect: number = 1,
): Pose {
    const x0 = corners[0].x; const y0 = corners[0].y;
    const x1 = corners[1].x; const y1 = corners[1].y;
    const x2 = corners[2].x; const y2 = corners[2].y;
    const x3 = corners[3].x; const y3 = corners[3].y;

    return useMemo(() => {
        const pts: [Point, Point, Point, Point] = [
            { x: x0, y: y0 }, { x: x1, y: y1 },
            { x: x2, y: y2 }, { x: x3, y: y3 },
        ];
        const H = computeHomography(pts);
        return decomposePose(H, canvasWidth, canvasHeight, pts, aspect);
    }, [x0, y0, x1, y1, x2, y2, x3, y3, canvasWidth, canvasHeight, aspect]);
}
