import { chessCornersAlgorithm } from "./chessCorners/adapter";
import { chessboardAlgorithm } from "./calibrationTargets/chessboardAdapter";
import { charucoAlgorithm } from "./calibrationTargets/charucoAdapter";
import { markerboardAlgorithm } from "./calibrationTargets/markerboardAdapter";
import { ringgridAlgorithm } from "./ringgrid/adapter";
import type { AlgorithmDefinition } from "./types";

export const ALGORITHM_REGISTRY: AlgorithmDefinition[] = [
    chessCornersAlgorithm,
    chessboardAlgorithm,
    charucoAlgorithm,
    markerboardAlgorithm,
    ringgridAlgorithm,
];

export const DEFAULT_ALGORITHM_ID = chessCornersAlgorithm.id;

export const getAlgorithmById = (id: string): AlgorithmDefinition => {
    return ALGORITHM_REGISTRY.find((algorithm) => algorithm.id === id) ?? ALGORITHM_REGISTRY[0];
};
