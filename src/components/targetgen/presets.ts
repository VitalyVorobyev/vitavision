import type {
    TargetType,
    TargetConfig,
    PageConfig,
} from "./types";
import { defaultCircles } from "./reducer";

export interface Preset {
    id: string;
    label: string;
    description: string;
    targetType: TargetType;
    target: TargetConfig;
    page: PageConfig;
}

const A4_LANDSCAPE: PageConfig = {
    sizeKind: "a4",
    customWidthMm: 210,
    customHeightMm: 297,
    orientation: "landscape",
    marginMm: 10,
    pngDpi: 300,
};

const LETTER_PORTRAIT: PageConfig = {
    sizeKind: "letter",
    customWidthMm: 215.9,
    customHeightMm: 279.4,
    orientation: "portrait",
    marginMm: 10,
    pngDpi: 300,
};

// ── Chessboard presets ───────────────────────────────────────────────────────

export const CHESSBOARD_PRESETS: Preset[] = [
    {
        id: "chess-camera-cal",
        label: "Camera Calibration",
        description: "Standard 7x10 board for OpenCV-style calibration",
        targetType: "chessboard",
        target: { targetType: "chessboard", config: { innerRows: 7, innerCols: 10, squareSizeMm: 20, innerSquareRel: 0 } },
        page: A4_LANDSCAPE,
    },
    {
        id: "chess-robotics",
        label: "Robotics",
        description: "Large 5x7 board with 30 mm squares for robotic arm calibration",
        targetType: "chessboard",
        target: { targetType: "chessboard", config: { innerRows: 5, innerCols: 7, squareSizeMm: 30, innerSquareRel: 0 } },
        page: A4_LANDSCAPE,
    },
    {
        id: "chess-industrial",
        label: "Industrial QC",
        description: "Dense 9x13 board for high-precision measurement",
        targetType: "chessboard",
        target: { targetType: "chessboard", config: { innerRows: 9, innerCols: 13, squareSizeMm: 15, innerSquareRel: 0 } },
        page: A4_LANDSCAPE,
    },
];

// ── ChArUco presets ──────────────────────────────────────────────────────────

export const CHARUCO_PRESETS: Preset[] = [
    {
        id: "charuco-camera-cal",
        label: "Camera Calibration",
        description: "8x11 board with 4x4 dictionary for general calibration",
        targetType: "charuco",
        target: {
            targetType: "charuco",
            config: {
                rows: 8, cols: 11, squareSizeMm: 20,
                markerSizeRel: 0.75, dictionary: "DICT_4X4_250", borderBits: 1, innerSquareRel: 0,
            },
        },
        page: A4_LANDSCAPE,
    },
    {
        id: "charuco-robotics",
        label: "Robotics",
        description: "6x8 board with large squares and AprilTag dictionary",
        targetType: "charuco",
        target: {
            targetType: "charuco",
            config: {
                rows: 6, cols: 8, squareSizeMm: 30,
                markerSizeRel: 0.7, dictionary: "DICT_APRILTAG_36h11", borderBits: 1, innerSquareRel: 0,
            },
        },
        page: A4_LANDSCAPE,
    },
    {
        id: "charuco-industrial",
        label: "Industrial QC",
        description: "Dense 10x14 board with 6x6 dictionary for precision",
        targetType: "charuco",
        target: {
            targetType: "charuco",
            config: {
                rows: 10, cols: 14, squareSizeMm: 15,
                markerSizeRel: 0.8, dictionary: "DICT_6X6_250", borderBits: 1, innerSquareRel: 0,
            },
        },
        page: A4_LANDSCAPE,
    },
];

// ── Marker Board presets ─────────────────────────────────────────────────────

export const MARKERBOARD_PRESETS: Preset[] = [
    {
        id: "marker-camera-cal",
        label: "Camera Calibration",
        description: "Standard 7x10 board with default circle markers",
        targetType: "markerboard",
        target: {
            targetType: "markerboard",
            config: { innerRows: 7, innerCols: 10, squareSizeMm: 20, circleDiameterRel: 0.5, circles: defaultCircles(7, 10), innerSquareRel: 0 },
        },
        page: A4_LANDSCAPE,
    },
    {
        id: "marker-robotics",
        label: "Robotics",
        description: "Large 5x7 board with prominent circle markers",
        targetType: "markerboard",
        target: {
            targetType: "markerboard",
            config: { innerRows: 5, innerCols: 7, squareSizeMm: 30, circleDiameterRel: 0.6, circles: defaultCircles(5, 7), innerSquareRel: 0 },
        },
        page: A4_LANDSCAPE,
    },
    {
        id: "marker-letter",
        label: "Letter Paper",
        description: "US Letter sized 6x9 board for North American paper",
        targetType: "markerboard",
        target: {
            targetType: "markerboard",
            config: { innerRows: 6, innerCols: 9, squareSizeMm: 20, circleDiameterRel: 0.5, circles: defaultCircles(6, 9), innerSquareRel: 0 },
        },
        page: LETTER_PORTRAIT,
    },
];

export function presetsForType(targetType: TargetType): Preset[] {
    switch (targetType) {
        case "chessboard":
            return CHESSBOARD_PRESETS;
        case "charuco":
            return CHARUCO_PRESETS;
        case "markerboard":
            return MARKERBOARD_PRESETS;
    }
}
