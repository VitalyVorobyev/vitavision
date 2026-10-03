import { describe, expect, it } from "vitest";

import { buildDeepLinkSearch, readDeepLink } from "../../../../hooks/useEditorDeepLink";
import { loadAlgorithm } from "../registry";
import { isLegacyConfig, migrateLegacyConfig } from "../legacyConfig";
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
        return Object.entries(expected).flatMap(([key, value]) => subsetDiff(value, actual[key], path === "" ? key : `${path}.${key}`));
    }
    if (Array.isArray(expected)) {
        if (!Array.isArray(actual) || actual.length !== expected.length) return [`${path}: ${JSON.stringify(expected)} vs ${JSON.stringify(actual)}`];
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

/**
 * What the new worker hands to WASM for a stored config, reduced to the shape of `oldWasm`.
 * Only the values the old documents had are compared (the new ones may carry more).
 */
function expectSameWasmValues(id: string, config: unknown, oldWasm: unknown): string[] {
    const cfg = config as Record<string, unknown>;
    const old = oldWasm as Record<string, unknown>;
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
            // (`readOnly`), which the old document carried: every value the new one has
            // must be what the old one had, the other way round it may not hold.
            return [
                ...subsetDiff(old.board, cfg.board, "board"),
                ...subsetDiff(withoutBaselineProfile(cfg.board), old.board, "board (reverse)"),
                ...subsetDiff(cfg.config, old.config, "config"),
            ];
        case "chessboard":
            return [
                ...subsetDiff(old.chess, cfg.chess, "chess"),
                ...subsetDiff(old.params, cfg.params, "params"),
            ];
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
        const migrated = migrateLegacyConfig("ringgrid", { ...old, profile: "extended" }) as { board: { coding: Record<string, unknown> } };
        expect(migrated.board.coding.codebook_profile).toBe("extended");
    });

    it("turns a swapped radsym radius range into the range between them", () => {
        const old = snapshot.algorithms.radsym[0]!.old;
        const migrated = migrateLegacyConfig("radsym", { ...old, minRadius: 8, maxRadius: 5 }) as { config: { radii: number[] } };
        expect(migrated.config.radii).toEqual([5, 6, 7, 8]);
    });

    it("does not touch the markerboard circles it cannot read", () => {
        const old = snapshot.algorithms.markerboard[0]!.old;
        const migrated = migrateLegacyConfig("markerboard", { ...old, circles: "nope" }) as { board: { circles: unknown[] } };
        expect(migrated.board.circles).toHaveLength(3);
    });
});

describe("an old ?config= deep link", () => {
    const b64 = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

    it.each(Object.entries(snapshot.algorithms))("%s: opens on the settings the link was saved with", async (id, entries) => {
        const algo = await loadAlgorithm(id);
        const old = (entries as Entry[])[0]!.old;
        const state = readDeepLink(new URLSearchParams({ algo: id, config: b64(old) }));
        expect(state.algorithmId).toBe(id);
        expect(state.config).toEqual(algo.initialConfig);
    });

    it("a link written by the current editor round-trips untouched", async () => {
        const algo = await loadAlgorithm("charuco");
        const search = buildDeepLinkSearch("", "charuco", algo.initialConfig);
        expect(readDeepLink(new URLSearchParams(search)).config).toEqual(algo.initialConfig);
    });

    it("an unreadable config is ignored", () => {
        expect(readDeepLink(new URLSearchParams({ algo: "radsym", config: "!!!" })).config).toBeNull();
    });
});
