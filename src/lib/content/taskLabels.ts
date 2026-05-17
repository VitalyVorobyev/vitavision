import type { Task } from "./schema";
import { taskValues } from "./schema";

export const taskLabels: Record<Task, string> = {
    "camera-calibration": "Camera calibration",
    "chessboard-detection": "Chessboard detection",
    "corner-detection": "Corner detection",
    "feature-detection": "Feature detection",
    "fundamental-matrix-estimation": "Fundamental-matrix estimation",
    "hand-eye-calibration": "Hand–eye calibration",
    "image-classification": "Image classification",
    "image-segmentation": "Image segmentation",
    "image-stitching": "Image stitching",
    "local-feature-matching": "Feature matching",
};

export const taskOrder: Task[] = [...taskValues];

export function taskLabel(task: string): string {
    return taskLabels[task as Task] ?? task;
}
