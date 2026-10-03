import { beforeEach, describe, expect, it, vi } from "vitest";

import { handleCalibTarget } from "../calibTargets";
import { handleChessCorners } from "../chessCorners";
import { handleRadsym, handleRadsymHeatmap } from "../radsym";
import { handleRinggrid } from "../ringgrid";

/*
 * The handlers hand the stored config to WASM and complete it from the library's own
 * defaults. These tests run them against stand-in modules and look at what reaches the
 * module; scripts/test-wasm-schemas.ts runs the same paths against the real ones.
 */

const mocks = vi.hoisted(() => ({
    chess: {
        fromJson: vi.fn(),
        withConfig: vi.fn(),
        cfgFree: vi.fn(),
        detectorFree: vi.fn(),
    },
    radsym: { withConfigJson: vi.fn(), free: vi.fn(), extract: vi.fn(), heatmap: vi.fn() },
    ringgrid: { withConfig: vi.fn(), free: vi.fn() },
    calib: {
        detectChessboard: vi.fn(),
        detectCharuco: vi.fn(),
        diagnoseMarkerBoard: vi.fn(),
        defaultCharucoParams: vi.fn(),
    },
}));

vi.mock("../modules", () => ({
    getChessModule: () => Promise.resolve({
        DetectorConfig: {
            fromJson: (json: string) => {
                mocks.chess.fromJson(json);
                return { free: mocks.chess.cfgFree };
            },
        },
        ChessDetector: {
            withConfig: (cfg: unknown) => {
                mocks.chess.withConfig(cfg);
                return { detect_rgba: () => new Float32Array(0), free: mocks.chess.detectorFree };
            },
        },
    }),
    getRadsymModule: () => Promise.resolve({
        RadSymProcessor: {
            with_config_json: (json: string) => {
                mocks.radsym.withConfigJson(json);
                return {
                    extract_proposals: (...args: unknown[]) => {
                        mocks.radsym.extract(...args);
                        return new Float32Array(0);
                    },
                    response_heatmap: (...args: unknown[]) => {
                        mocks.radsym.heatmap(...args);
                        return new Uint8Array(0);
                    },
                    free: mocks.radsym.free,
                };
            },
        },
    }),
    getRinggridModule: () => Promise.resolve({
        default_board_json: () => JSON.stringify({ schema: "ringgrid.target.v6", lattice: { kind: "hex", rows: 15 } }),
        default_config_json: (board: string) => JSON.stringify({ derived_from: (JSON.parse(board) as { lattice: unknown }).lattice, marker_scale: { diameter_min_px: 14, diameter_max_px: 66 } }),
        RinggridDetector: {
            with_config: (board: string, config: string) => {
                mocks.ringgrid.withConfig(board, config);
                return { detect_adaptive_rgba: () => JSON.stringify({ detected_markers: [] }), free: mocks.ringgrid.free };
            },
        },
    }),
    getCalibModule: () => Promise.resolve({
        rgba_to_gray: () => new Uint8Array(1),
        default_chess_config: () => ({ threshold: 15, strategy: { chess: { ring: "canonical", refiner: { center_of_mass: { radius: 2 } } } } }),
        default_chessboard_params: () => ({ min_labeled_corners: 8, max_components: 3, min_corner_strength: 33 }),
        default_marker_board_params: () => ({ board: { rows: 6, cols: 8, circles: [] }, circle_score: { patch_size: 64 } }),
        default_charuco_params: (...args: unknown[]) => {
            mocks.calib.defaultCharucoParams(...args);
            return { px_per_square: 60, scan: { border_bits: 1, marker_size_rel: 0.75, inset_frac: 0.06 }, board: {} };
        },
        detect_chessboard: (...args: unknown[]) => {
            mocks.calib.detectChessboard(...args);
            return null;
        },
        detect_charuco: (...args: unknown[]) => {
            mocks.calib.detectCharuco(...args);
            return { corners: [], markers: [], alignment: null };
        },
        diagnose_marker_board: (...args: unknown[]) => {
            mocks.calib.diagnoseMarkerBoard(...args);
            return { result: null };
        },
    }),
}));

const pixels = new Uint8Array(4);

beforeEach(() => vi.clearAllMocks());

describe("handleChessCorners", () => {
    it("builds the detector config from the stored document and frees it afterwards", async () => {
        const config = { threshold: 40, upscale: { fixed: 2 }, multiscale: { pyramid: { levels: 4, min_size: 128, refinement_radius: 3 } } };
        await handleChessCorners(pixels, 1, 1, config);
        expect(JSON.parse(mocks.chess.fromJson.mock.calls[0]![0] as string)).toEqual(config);
        expect(mocks.chess.cfgFree).toHaveBeenCalledTimes(1);
        expect(mocks.chess.detectorFree).toHaveBeenCalledTimes(1);
    });

    it("frees the config even when the library rejects it", async () => {
        mocks.chess.withConfig.mockImplementationOnce(() => {
            throw new Error("upscale factor must be 2, 3 or 4");
        });
        await expect(handleChessCorners(pixels, 1, 1, { upscale: { fixed: 7 } })).rejects.toThrow(/upscale/);
        expect(mocks.chess.cfgFree).toHaveBeenCalledTimes(1);
    });
});

describe("handleRadsym", () => {
    const config = { algorithm: "rsd_fused", config: { radii: [5, 6, 7], polarity: "Dark" } };

    it("builds the processor from the config document and runs the chosen proposal algorithm", async () => {
        await handleRadsym(pixels, 2, 2, config);
        expect(JSON.parse(mocks.radsym.withConfigJson.mock.calls[0]![0] as string)).toEqual(config.config);
        expect(mocks.radsym.extract).toHaveBeenCalledWith(pixels, 2, 2, "rsd_fused");
        expect(mocks.radsym.free).toHaveBeenCalledTimes(1);
    });

    it("computes the heatmap from the same document and algorithm", async () => {
        await handleRadsymHeatmap(pixels, 2, 2, { ...config, colormap: "jet" });
        expect(JSON.parse(mocks.radsym.withConfigJson.mock.calls[0]![0] as string)).toEqual(config.config);
        expect(mocks.radsym.heatmap).toHaveBeenCalledWith(pixels, 2, 2, "rsd_fused", "jet");
    });

    it("defaults the algorithm to frst", async () => {
        await handleRadsym(pixels, 2, 2, { config: {} });
        expect(mocks.radsym.extract).toHaveBeenCalledWith(pixels, 2, 2, "frst");
    });
});

describe("handleRinggrid", () => {
    it("passes the board whole and merges the config over the defaults derived from that board", async () => {
        const board = { schema: "ringgrid.target.v6", lattice: { kind: "rect", rows: 3, cols: 4, pitch_mm: 9 } };
        await handleRinggrid(pixels, 1, 1, { board, config: { marker_scale: { diameter_min_px: 20 } } });
        const [boardJson, configJson] = mocks.ringgrid.withConfig.mock.calls[0] as [string, string];
        // A default hex lattice merged into this rect one would leave `long_row_cols` behind.
        expect(JSON.parse(boardJson)).toEqual(board);
        expect(JSON.parse(configJson)).toEqual({
            derived_from: board.lattice,
            marker_scale: { diameter_min_px: 20, diameter_max_px: 66 },
        });
        expect(mocks.ringgrid.free).toHaveBeenCalledTimes(1);
    });

    it("falls back to the library's default board", async () => {
        await handleRinggrid(pixels, 1, 1, {});
        const [boardJson] = mocks.ringgrid.withConfig.mock.calls[0] as [string, string];
        expect((JSON.parse(boardJson) as { lattice: { rows: number } }).lattice.rows).toBe(15);
    });
});

describe("handleCalibTarget", () => {
    it("chessboard: completes { chess, params } and swaps a refiner variant instead of uniting two", async () => {
        const config = { chess: { threshold: 20, strategy: { chess: { refiner: { forstner: { radius: 3 } } } } }, params: { min_corner_strength: 15 } };
        await handleCalibTarget("chessboard", pixels, 1, 1, config);
        const [, , , chess, params] = mocks.calib.detectChessboard.mock.calls[0] as unknown[];
        expect(chess).toEqual({ threshold: 20, strategy: { chess: { ring: "canonical", refiner: { forstner: { radius: 3 } } } } });
        expect(params).toEqual({ min_labeled_corners: 8, max_components: 3, min_corner_strength: 15 });
    });

    it("charuco: asks for the defaults of the configured board, and carries the front-end in the params", async () => {
        const config = { board: { rows: 6, cols: 9, cell_size: 4.8, marker_size_rel: 0.7, dictionary: "DICT_5X5_250" }, px_per_square: 40, scan: { inset_frac: 0.1 } };
        await handleCalibTarget("charuco", pixels, 1, 1, config);
        expect(mocks.calib.defaultCharucoParams).toHaveBeenCalledWith(6, 9, 0.7, "DICT_5X5_250");
        const [, , , chess, params] = mocks.calib.detectCharuco.mock.calls[0] as [unknown, unknown, unknown, unknown, Record<string, unknown>];
        expect(chess).toBeNull();
        expect(params.px_per_square).toBe(40);
        // The derived scan values come from the defaults for this board, the edit on top.
        expect(params.scan).toEqual({ border_bits: 1, marker_size_rel: 0.75, inset_frac: 0.1 });
    });

    it("charuco: says what is missing when the config has no board", async () => {
        await expect(handleCalibTarget("charuco", pixels, 1, 1, {})).rejects.toThrow(/charuco config.board/);
    });

    it("markerboard: merges over the library defaults and sends no separate front-end", async () => {
        const config = { board: { rows: 22, cols: 22, circles: [{ cell: { i: 1, j: 2 }, polarity: "white" }] }, circle_score: { patch_size: 32 } };
        await handleCalibTarget("markerboard", pixels, 1, 1, config);
        const [, , , chess, params] = mocks.calib.diagnoseMarkerBoard.mock.calls[0] as [unknown, unknown, unknown, unknown, Record<string, unknown>];
        expect(chess).toBeNull();
        expect(params).toEqual(config);
    });
});
