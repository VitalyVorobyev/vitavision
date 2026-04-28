import type { ChessResponsePattern } from "./types";
import type { useChessResponse } from "./useChessResponse";

export interface ChessDemoProps {
    pattern: ChessResponsePattern;
    onPatternChange: (p: ChessResponsePattern) => void;
    rotationDeg: number;
    onRotationChange: (v: number) => void;
    blur: number;
    onBlurChange: (v: number) => void;
    contrast: number;
    onContrastChange: (v: number) => void;
    playing: boolean;
    onPlayingChange: (v: boolean) => void;
    speed: number;
    onSpeedChange: (v: number) => void;
    showSampleLabels: boolean;
    onShowSampleLabelsChange: (v: boolean) => void;
    showSrPairs: boolean;
    onShowSrPairsChange: (v: boolean) => void;
    showDrPairs: boolean;
    onShowDrPairsChange: (v: boolean) => void;
    showMrRegions: boolean;
    onShowMrRegionsChange: (v: boolean) => void;
    response: ReturnType<typeof useChessResponse>;
}
