import { chessCornersAlgorithm } from "./chessCorners/adapter";
import type { AlgorithmDefinition } from "./types";

export const ALGORITHM_REGISTRY: AlgorithmDefinition[] = [
    chessCornersAlgorithm,
];

export const DEFAULT_ALGORITHM_ID = chessCornersAlgorithm.id;

export const getAlgorithmById = (id: string): AlgorithmDefinition => {
    return ALGORITHM_REGISTRY.find((algorithm) => algorithm.id === id) ?? ALGORITHM_REGISTRY[0];
};
