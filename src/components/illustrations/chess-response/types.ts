export const CHESS_RESPONSE_GRID_SIZE = 17;
export const CHESS_RESPONSE_SAMPLE_COUNT = 16;
export const CHESS_RESPONSE_RING_RADIUS = 5;
export const CHESS_RESPONSE_LOCAL_MEAN_OFFSETS = [
    { x: 0, y: 0 },
    { x: -1, y: 0 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: 0, y: 1 },
] as const;

export type ChessResponsePattern = "corner" | "edge" | "stripe";
export type ChessResponsePreset = "article" | "compact";

export interface ChessResponseGridCell {
    row: number;
    col: number;
    x: number;
    y: number;
    intensity: number;
}

export interface ChessResponsePoint {
    index: number;
    label: string;
    angleRad: number;
    x: number;
    y: number;
    intensity: number;
}

export interface ChessResponseLocalMeanSample {
    id: string;
    x: number;
    y: number;
    intensity: number;
}

export interface ChessResponseSumTerm {
    phase: number;
    pairA: [number, number];
    pairB: [number, number];
    sumA: number;
    sumB: number;
    value: number;
}

export interface ChessResponseDiffTerm {
    index: number;
    pair: [number, number];
    value: number;
}

export interface ChessResponseComputation {
    grid: ChessResponseGridCell[];
    samples: ChessResponsePoint[];
    localMeanSamples: ChessResponseLocalMeanSample[];
    srTerms: ChessResponseSumTerm[];
    drTerms: ChessResponseDiffTerm[];
    localMean: number;
    neighborMean: number;
    sr: number;
    dr: number;
    mr: number;
    response: number;
}

export interface ChessResponseControls {
    pattern: ChessResponsePattern;
    rotationDeg: number;
    blur: number;
    contrast: number;
}

