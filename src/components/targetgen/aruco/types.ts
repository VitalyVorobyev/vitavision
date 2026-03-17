export interface ArucoDictionary {
    name: string;
    markerSize: number;
    maxCorrectionBits: number;
    codes: string[];
}

/** Row-major 2D bit grid: true = black cell. */
export type MarkerBitGrid = boolean[][];
