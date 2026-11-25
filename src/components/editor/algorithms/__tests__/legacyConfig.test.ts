import { describe, expect, it } from "vitest";

import { buildDeepLinkSearch, readDeepLink } from "../../../../hooks/useEditorDeepLink";
import { loadAlgorithm } from "../registry";
import { isLegacyConfig, migrateLegacyConfig, migrateLibraryDocument } from "../legacyConfig";
import type { AlgorithmDefinition } from "../types";
import snapshot from "./fixtures/legacy-snapshot.json";

/*
 * `fixtures/legacy-snapshot.json` was written by a one-off script run against the code that
 * existed before the config forms were generated from the WASM schemas (commit 5651253). For
 * every old initialConfig, preset and sampleDefault it holds:
 *
 *   old      the flat camelCase config, exactly as the old adapters stored it (and as an old
 *            `?config=` deep link carries it);
 *   oldWasm  the WASM-level document(s) the OLD adapter + worker produced from it, read back
 *            from the real WASM modules after the library defaults were merged in:
 *            chess-corners  DetectorConfig.toJson() of the preset + the old setter calls
 *            radsym         { algorithm, RadSymProcessor.config_json() } after the old setters
 *            ringgrid       { board (merged), RinggridDetector.config_json() } after update_config
 *            the others     { chess: <chess_cfg argument>, params: <params argument> }
 *
 * These tests prove that the new configs, and the migration of an old link, mean the same
 * thing: the same values reach the WASM call as before.
 */

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Entry = { kind: "initial" | "preset" | "sample"; label: string; old: Json; oldWasm: Json };

const isObject = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === "object" && !Array.isArray(v);

/** Every leaf of `expected` is present in `actual` with the same value (floats compared as f32). */
function subsetDiff(expected: unknown, actual: unknown, path = ""): string[] {
    if (isObject(expected)) {
        if (!isObject(actual)) return [`${path}: expected an object, got ${JSON.stringify(actual)}`];
        return Object.entries(expected).flatMap(([key, value]) =>
            subsetDiff(value, actual[key], path === "" ? key : `${path}.${key}`),
        );
    }
    if (Array.isArray(expected)) {
        if (!Array.isArray(actual) || actual.length !== expected.length)
            return [`${path}: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`];
        return expected.flatMap((value, index) => subsetDiff(value, actual[index], `${path}[${index}]`));
    }
    if (typeof expected === "number" && typeof actual === "number") {
        return Math.fround(expected) === Math.fround(actual) ? [] : [`${path}: ${expected} vs ${actual}`];
    }
    return Object.is(expected, actual) ? [] : [`${path}: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`];
}

/** The new board states `codebook_profile: "base"` where the library leaves the default out. */
function withoutBaselineProfile(board: unknown): unknown {
    const copy = structuredClone(board) as { coding?: { codebook_profile?: string } };
    if (copy.coding?.codebook_profile === "base") delete copy.coding.codebook_profile;
    return copy;
}

/** The config the current algorithm stores for an old entry. */
function currentConfig(algo: AlgorithmDefinition, entry: Entry): unknown {
    if (entry.kind === "initial") return algo.initialConfig;
    if (entry.kind === "preset") return algo.presets?.find((p) => p.label === entry.label)?.config;
    const sample = algo.sampleDefaults?.[entry.label as keyof NonNullable<AlgorithmDefinition["sampleDefaults"]>];
    return sample;
}

/** Every leaf both documents have, with the same value (a key only one side has is not compared). */
function commonDiff(a: unknown, b: unknown, path = ""): string[] {
    if (isObject(a) && isObject(b)) {
        return Object.keys(a)
            .filter((key) => key in b)
            .flatMap((key) => commonDiff(a[key], b[key], path === "" ? key : `${path}.${key}`));
    }
    return subsetDiff(a, b, path);
}

/**
 * `oldWasm` is a document of the libraries as they were when the snapshot was written
 * (chess-corners 1.x, calib-targets 0.15, ringgrid 0.13). The libraries have moved since:
 * this is the same document in the current keys, through the migration a saved link goes
 * through (`migrateLibraryDocument`; its own expectations are asserted explicitly below).
 */
function upgradeOldWasm(id: string, oldWasm: unknown): unknown {
    const old = oldWasm as Record<string, unknown>;
    switch (id) {
        case "chess-corners":
        case "ringgrid":
            return migrateLibraryDocument(id, old);
        case "chessboard":
            return migrateLibraryDocument(id, old);
        case "charuco":
        case "markerboard":
        case "puzzleboard":
            return {
                ...old,
                chess: migrateLibraryDocument("chess-corners", old.chess),
                params: migrateLibraryDocument(id, old.params),
            };
        default:
            return oldWasm;
    }
}

/**
 * What the new worker hands to WASM for a stored config, reduced to the shape of `oldWasm`.
 * Only the values the old documents had are compared (the new ones may carry more).
 */
function expectSameWasmValues(id: string, config: unknown, oldWasmSnapshot: unknown): string[] {
    const cfg = config as Record<string, unknown>;
    const old = upgradeOldWasm(id, oldWasmSnapshot) as Record<string, unknown>;
    switch (id) {
        case "chess-corners":
            return subsetDiff(old, cfg);
        case "radsym":
            return [
                ...subsetDiff(old.algorithm, cfg.algorithm, "algorithm"),
                ...subsetDiff(old.config, cfg.config, "config"),
            ];
        case "ringgrid":
            // The new config leaves out the fields the library derives from the board
            // (`readOnly`), which the old document carried, and has the fields ringgrid
            // added since: every value both have must agree.
            return [
                ...subsetDiff(old.board, cfg.board, "board"),
                ...subsetDiff(withoutBaselineProfile(cfg.board), old.board, "board (reverse)"),
                ...commonDiff(cfg.config, old.config, "config"),
            ];
        case "chessboard":
            return [...subsetDiff(old.chess, cfg.chess, "chess"), ...subsetDiff(old.params, cfg.params, "params")];
        default: {
            // charuco, markerboard, puzzleboard: the chess front-end rides in the params
            // document. The old worker passed it as the separate `chess_cfg` argument where it
            // had one, which overrides `params.chess` (what the old params carried is the
            // library default).
            const oldParams = old.params as Record<string, unknown>;
            const oldChess = old.chess ?? oldParams.chess;
            const { chess: _unused, ...params } = oldParams;
            return [...subsetDiff(oldChess, cfg.chess, "chess"), ...subsetDiff(params, cfg, "params")];
        }
    }
}

describe.each(Object.entries(snapshot.algorithms))("%s", (id, entries) => {
    it("snapshots every old initialConfig, preset and sampleDefault", async () => {
        const algo = await loadAlgorithm(id);
        const expected = 1 + (algo.presets?.length ?? 0) + Object.keys(algo.sampleDefaults ?? {}).length;
        expect(entries as Entry[]).toHaveLength(expected);
    });

    it.each(entries as Entry[])("$kind $label: migrating the old config gives the new one", async (entry) => {
        const algo = await loadAlgorithm(id);
        expect(isLegacyConfig(id, entry.old)).toBe(true);
        expect(migrateLegacyConfig(id, entry.old)).toEqual(currentConfig(algo, entry));
    });

    it.each(entries as Entry[])("$kind $label: reaches WASM with the values the old adapter sent", async (entry) => {
        const algo = await loadAlgorithm(id);
        expect(expectSameWasmValues(id, currentConfig(algo, entry), entry.oldWasm)).toEqual([]);
        // ...and so does the migrated link.
        expect(expectSameWasmValues(id, migrateLegacyConfig(id, entry.old), entry.oldWasm)).toEqual([]);
    });

    it("leaves a current config alone", async () => {
        const algo = await loadAlgorithm(id);
        expect(isLegacyConfig(id, algo.initialConfig)).toBe(false);
        expect(migrateLegacyConfig(id, algo.initialConfig)).toBe(algo.initialConfig);
    });
});

describe("migrating a link that predates a field", () => {
    it("fills a missing key from the editor default", () => {
        const { nmsRadius: _dropped, ...older } = snapshot.algorithms["chess-corners"][0]!.old;
        const migrated = migrateLegacyConfig("chess-corners", { ...older, threshold: 12 }) as Record<string, unknown>;
        expect(migrated.threshold).toBe(12);
        expect((migrated.detection as Record<string, unknown>).nms_radius).toBe(2);
    });

    it("keeps the extended ring-grid codebook on the board, where the target now holds it", () => {
        const old = snapshot.algorithms.ringgrid[0]!.old;
        const migrated = migrateLegacyConfig("ringgrid", { ...old, profile: "extended" }) as {
            board: { coding: Record<string, unknown> };
        };
        expect(migrated.board.coding.codebook_profile).toBe("extended");
    });

    it("turns a swapped radsym radius range into the range between them", () => {
        const old = snapshot.algorithms.radsym[0]!.old;
        const migrated = migrateLegacyConfig("radsym", { ...old, minRadius: 8, maxRadius: 5 }) as {
            config: { radii: number[] };
        };
        expect(migrated.config.radii).toEqual([5, 6, 7, 8]);
    });

    it("does not touch the markerboard circles it cannot read", () => {
        const old = snapshot.algorithms.markerboard[0]!.old;
        const migrated = migrateLegacyConfig("markerboard", { ...old, circles: "nope" }) as {
            board: { circles: unknown[] };
        };
        expect(migrated.board.circles).toHaveLength(3);
    });
});

describe("a document saved for the previous library generation", () => {
    const oldChess = (refiner: Record<string, unknown>) => ({
        strategy: { chess: { ring: "broad", refiner } },
        threshold: 12,
        detection: { nms_radius: 2, min_cluster_size: 2 },
        multiscale: "single_scale",
        upscale: "disabled",
        orientation_method: "ring_fit",
        merge_radius: 3,
    });
    const saddle = { det_margin: 0.001, max_offset: 1.5, min_abs_det: 0.0001, radius: 2 };

    it("chess-corners: the center-of-mass radius moves to strategy.chess.center_of_mass", () => {
        const migrated = migrateLegacyConfig("chess-corners", oldChess({ center_of_mass: { radius: 3 } })) as Record<
            string,
            unknown
        >;
        expect(migrated.strategy).toEqual({ chess: { ring: "broad", center_of_mass: { radius: 3 } } });
        expect(migrated.threshold).toBe(12);
        expect("refiner" in migrated).toBe(false);
    });

    it("chess-corners: the saddle-point refiner becomes the optional image refiner", () => {
        const migrated = migrateLegacyConfig("chess-corners", oldChess({ saddle_point: saddle })) as Record<
            string,
            unknown
        >;
        expect(migrated.refiner).toEqual({ saddle_point: saddle });
        expect(migrated.strategy).toEqual({ chess: { ring: "broad" } });
    });

    it("chess-corners: a Förstner refiner has no counterpart and falls back to the library default", () => {
        const migrated = migrateLegacyConfig("chess-corners", oldChess({ forstner: { radius: 2 } })) as Record<
            string,
            unknown
        >;
        expect(migrated.strategy).toEqual({ chess: { ring: "broad" } });
        expect(migrated.refiner).toBeUndefined();
    });

    it("the board detectors migrate the chess block they carry", () => {
        const chess = oldChess({ saddle_point: saddle });
        for (const [id, doc] of [
            ["chessboard", { chess, params: {} }],
            ["markerboard", { chess, board: {} }],
            ["puzzleboard", { chess, board: {}, px_per_square: 60 }],
            ["charuco", { chess, board: {} }],
        ] as const) {
            const migrated = migrateLegacyConfig(id, doc) as { chess: Record<string, unknown> };
            expect(migrated.chess.refiner, id).toEqual({ saddle_point: saddle });
            expect(migrated.chess.strategy, id).toEqual({ chess: { ring: "broad" } });
        }
    });

    it("charuco: scan.inset_frac is the top-level inset_frac; the removed scan knobs are dropped", () => {
        const migrated = migrateLegacyConfig("charuco", {
            board: {},
            scan: { inset_frac: 0.12, min_border_score: 0.5, dedup_by_id: false, multi_threshold: false },
        }) as Record<string, unknown>;
        expect(migrated).toEqual({ board: {}, inset_frac: 0.12 });
    });

    it("puzzleboard: px_per_square is dropped", () => {
        expect(migrateLegacyConfig("puzzleboard", { board: {}, px_per_square: 40 })).toEqual({ board: {} });
    });

    it("ringgrid: removed keys go, seed_min_decode_confidence is renamed, changed library defaults follow the library", () => {
        const migrated = migrateLegacyConfig("ringgrid", {
            board: { name: "b" },
            config: {
                advanced: {
                    decode: {
                        samples_per_sector: 5,
                        max_decode_dist: 2,
                        min_decode_confidence: 0.4,
                        min_decode_margin: 1,
                        n_radial_rings: 4,
                    },
                    edge_sample: { min_ring_depth: 0.08, n_rays: 48 },
                    id_correction: { confirm_by_consistency: true, seed_min_decode_confidence: 0.6, min_votes: 2 },
                    inner_as_outer_recovery: { min_ring_depth: 0.02, k_neighbors: 6 },
                    seed_proposals: { merge_radius_px: 3, seed_score: 1e12, max_seeds: 100 },
                },
            },
        });
        expect(migrated).toEqual({
            board: { name: "b" },
            config: {
                advanced: {
                    decode: { samples_per_sector: 8, n_radial_rings: 4 },
                    edge_sample: { min_ring_depth: 0.03, n_rays: 48 },
                    id_correction: { seed_min_confidence: 0.6, min_votes: 2 },
                    inner_as_outer_recovery: { k_neighbors: 6 },
                    seed_proposals: { max_seeds: 100 },
                },
            },
        });
    });

    it("ringgrid: a value the user changed away from the old default is kept", () => {
        const migrated = migrateLegacyConfig("ringgrid", {
            config: { advanced: { decode: { samples_per_sector: 6 }, edge_sample: { min_ring_depth: 0.1 } } },
        }) as { config: { advanced: { decode: Record<string, unknown>; edge_sample: Record<string, unknown> } } };
        expect(migrated.config.advanced.decode.samples_per_sector).toBe(6);
        expect(migrated.config.advanced.edge_sample.min_ring_depth).toBe(0.1);
    });

    it("the current top-level `refiner` is not mistaken for the old flat string", async () => {
        const algo = await loadAlgorithm("chess-corners");
        for (const refiner of [null, { saddle_point: saddle }]) {
            const current = { ...(algo.initialConfig as object), refiner };
            expect(isLegacyConfig("chess-corners", current)).toBe(false);
            expect(migrateLegacyConfig("chess-corners", current)).toBe(current);
        }
        expect(isLegacyConfig("chess-corners", { refiner: "saddle_point" })).toBe(true);
    });

    it("the flat refiner string maps to the image refiner, or to the default", () => {
        const base = snapshot.algorithms["chess-corners"][0]!.old;
        const saddlePoint = migrateLegacyConfig("chess-corners", { ...base, refiner: "saddle_point" }) as Record<
            string,
            unknown
        >;
        expect(saddlePoint.refiner).toEqual({ saddle_point: saddle });
        for (const refiner of ["center_of_mass", "forstner"]) {
            const migrated = migrateLegacyConfig("chess-corners", { ...base, refiner }) as Record<string, unknown>;
            expect(migrated.refiner, refiner).toBeUndefined();
        }
    });

    it("a deep link carrying such a document opens on the migrated config", () => {
        const b64 = (value: unknown) =>
            btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const state = readDeepLink(
            new URLSearchParams({ algo: "chess-corners", config: b64(oldChess({ saddle_point: saddle })) }),
        );
        expect((state.config as Record<string, unknown>).refiner).toEqual({ saddle_point: saddle });
    });
});

describe("an old ?config= deep link", () => {
    const b64 = (value: unknown) =>
        btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    it.each(Object.entries(snapshot.algorithms))(
        "%s: opens on the settings the link was saved with",
        async (id, entries) => {
            const algo = await loadAlgorithm(id);
            const old = (entries as Entry[])[0]!.old;
            const state = readDeepLink(new URLSearchParams({ algo: id, config: b64(old) }));
            expect(state.algorithmId).toBe(id);
            expect(state.config).toEqual(algo.initialConfig);
        },
    );

    it("a link written by the current editor round-trips untouched", async () => {
        const algo = await loadAlgorithm("charuco");
        const search = buildDeepLinkSearch("", "charuco", algo.initialConfig);
        expect(readDeepLink(new URLSearchParams(search)).config).toEqual(algo.initialConfig);
    });

    it("an unreadable config is ignored", () => {
        expect(readDeepLink(new URLSearchParams({ algo: "radsym", config: "!!!" })).config).toBeNull();
    });
});
