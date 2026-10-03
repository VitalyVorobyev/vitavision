import { beforeEach, describe, expect, it, vi } from "vitest";

import * as proxy from "../../../../lib/wasm/wasmWorkerProxy";
import { loadAllAlgorithms } from "../registry";

vi.mock("../../../../lib/wasm/wasmWorkerProxy", () => ({
    detectChessCornersWasm: vi.fn().mockResolvedValue({}),
    detectChessboardWasm: vi.fn().mockResolvedValue({}),
    detectCharucoWasm: vi.fn().mockResolvedValue({}),
    detectMarkerboardWasm: vi.fn().mockResolvedValue({}),
    detectRinggridWasm: vi.fn().mockResolvedValue({}),
    detectRadsymWasm: vi.fn().mockResolvedValue({}),
    detectPuzzleboardWasm: vi.fn().mockResolvedValue({}),
}));

const DETECT: Record<string, keyof typeof proxy> = {
    "chess-corners": "detectChessCornersWasm",
    chessboard: "detectChessboardWasm",
    charuco: "detectCharucoWasm",
    markerboard: "detectMarkerboardWasm",
    ringgrid: "detectRinggridWasm",
    radsym: "detectRadsymWasm",
    puzzleboard: "detectPuzzleboardWasm",
};

describe("the stored config is the WASM document", () => {
    beforeEach(() => vi.clearAllMocks());

    it("reaches the worker exactly as stored, for every algorithm, preset and sample default", async () => {
        for (const algo of await loadAllAlgorithms()) {
            const configs = [
                algo.initialConfig,
                ...(algo.presets ?? []).map((p) => p.config),
                ...Object.values(algo.sampleDefaults ?? {}),
            ];
            const call = vi.mocked(proxy[DETECT[algo.id]!] as typeof proxy.detectRadsymWasm);
            for (const config of configs) {
                call.mockClear();
                await algo.runWasm!({ pixels: new Uint8Array(4), width: 1, height: 1, config });
                expect(call, algo.id).toHaveBeenCalledTimes(1);
                expect(call.mock.calls[0]![3], algo.id).toBe(config);
            }
        }
    });

    it("radsym attaches its config to the result, for the heatmap overlay", async () => {
        const [radsym] = (await loadAllAlgorithms()).filter((a) => a.id === "radsym");
        const result = (await radsym!.runWasm!({ pixels: new Uint8Array(4), width: 1, height: 1, config: radsym!.initialConfig })) as Record<string, unknown>;
        expect(result._heatmapConfig).toBe(radsym!.initialConfig);
    });
});

describe("the editor's markerboard presets", () => {
    it("keep circle polarity on the generator's parity rule (white iff column + row is even)", async () => {
        const algo = (await loadAllAlgorithms()).find((a) => a.id === "markerboard")!;
        const configs = [algo.initialConfig, ...algo.presets!.map((p) => p.config)] as Array<{
            board: { circles: Array<{ cell: { i: number; j: number }; polarity: string }> };
        }>;
        for (const config of configs) {
            expect(config.board.circles).toHaveLength(3);
            for (const { cell, polarity } of config.board.circles) {
                expect(polarity, `(i ${cell.i}, j ${cell.j})`).toBe((cell.i + cell.j) % 2 === 0 ? "white" : "black");
            }
        }
    });
});
