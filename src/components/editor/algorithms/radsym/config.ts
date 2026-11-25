import { mergeConfig } from "../../../../lib/wasm/worker/util";
import type { AlgorithmPreset, ConfigDocument } from "../types";

/*
 * The config is `{ algorithm, config }`. `config` is the package's `DetectCirclesConfig`
 * document (`schemas/detect_circles_config.json`); the proposal algorithm is an argument of
 * the WASM call of its own, not a field of that document, so the app holds it beside it.
 */

/** `default_config_json()` of @vitavision/radsym. */
export const RADSYM_DEFAULTS: ConfigDocument = {
    radii: [3, 5, 7, 9, 11],
    polarity: "Both",
    radius_hint: 10,
    min_score: 0,
    gradient_operator: "Sobel",
    roi: null,
    advanced: {
        frst: { alpha: 2, gradient_threshold: 0, smoothing_factor: 0.5 },
        nms: { radius: 5, threshold: 0, max_detections: 1000 },
        scoring: {
            sampling: { num_angular_samples: 64, num_radial_samples: 9 },
            annulus_margin: 0.3,
            min_samples: 8,
            weight_ringness: 0.6,
            weight_coverage: 0.4,
        },
        refinement: {
            max_iterations: 10,
            convergence_tol: 0.1,
            max_center_drift: 0.5,
            advanced: {
                annulus_margin: 0.3,
                radial_center: { patch_radius: 12, gradient_threshold: 0.0001 },
                sampling: { num_angular_samples: 64, num_radial_samples: 9 },
            },
        },
    },
};

/** The voting radii `min..=max` the editor's radius range stands for. */
export const radiusRange = (min: number, max: number): number[] =>
    Array.from({ length: Math.max(0, max - min + 1) }, (_, index) => min + index);

const base = (config: ConfigDocument): ConfigDocument => ({ algorithm: "frst", config });

/** The app searches radii 5..40 and keeps the 50 strongest proposals (library: 3..11 px, 1000). */
export const initialConfig: ConfigDocument = base(
    mergeConfig(RADSYM_DEFAULTS, {
        radii: radiusRange(5, 40),
        advanced: { nms: { max_detections: 50 } },
    }),
);

const withConfig = (overrides: ConfigDocument, algorithm?: string): ConfigDocument => ({
    algorithm: algorithm ?? "frst",
    config: mergeConfig(initialConfig.config as ConfigDocument, overrides),
});

export const presets: AlgorithmPreset[] = [
    { label: "Default", description: "Balanced detection for general use", config: structuredClone(initialConfig) },
    {
        label: "Small features",
        description: "Detect small features (1-15px)",
        config: withConfig({ radii: radiusRange(1, 15), advanced: { nms: { radius: 3 } } }),
    },
    {
        label: "Large features",
        description: "Detect large features (20-100px)",
        config: withConfig({ radii: radiusRange(20, 100), advanced: { nms: { radius: 15 } } }),
    },
    {
        label: "Dark only",
        description: "Only dark centers on bright background",
        config: withConfig({ polarity: "Dark" }),
    },
    {
        label: "Fast (RSD)",
        description: "RSD fused algorithm, ~2× faster",
        config: withConfig({}, "rsd_fused"),
    },
];
