import { mergeConfig } from "../../../../lib/wasm/worker/util";
import { CHESS_CORNERS_DEFAULTS } from "../chessDetectorDefaults";
import type { AlgorithmPreset, ConfigDocument } from "../types";

/**
 * The config is the package's `DetectorConfig` document, as `schemas/detector_config.json`
 * describes it. The editor has always run the multiscale preset (a coarse-to-fine pyramid,
 * four levels), so that is the starting point; everything else is the library default.
 */
export const initialConfig: ConfigDocument = mergeConfig(CHESS_CORNERS_DEFAULTS, {
    multiscale: { pyramid: { levels: 4, min_size: 128, refinement_radius: 3 } },
});

export const presets: AlgorithmPreset[] = [
    {
        label: "Sensitive",
        description: "Lower response floor, broad mode, more pyramid levels",
        config: mergeConfig(initialConfig, {
            threshold: 12,
            strategy: { chess: { ring: "broad" } },
            multiscale: { pyramid: { levels: 5 } },
        }),
    },
    {
        label: "Balanced",
        description: "Default detection settings",
        config: structuredClone(initialConfig),
    },
];
