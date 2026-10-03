import { describe, it, expect, vi, beforeEach } from "vitest";

import { detectChessboardWasm, detectCharucoWasm, detectPuzzleboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { chessboardAlgorithm } from "../calibrationTargets/chessboardAdapter";
import { charucoAlgorithm } from "../calibrationTargets/charucoAdapter";
import { puzzleboardAlgorithm } from "../puzzleboard/adapter";
import { definedOnly } from "../calibrationTargets/shared";

vi.mock("../../../../lib/wasm/wasmWorkerProxy", () => ({
    detectChessboardWasm: vi.fn().mockResolvedValue(null),
    detectCharucoWasm: vi.fn().mockResolvedValue(null),
    detectPuzzleboardWasm: vi.fn().mockResolvedValue(null),
}));

const run = (algo: typeof chessboardAlgorithm, config: unknown) =>
    algo.runWasm!({ pixels: new Uint8Array(0), width: 0, height: 0, config });

// calib-targets 0.15's chessboard block has exactly min_labeled_corners,
// max_components and min_corner_strength; anything else is dropped silently by
// the WASM boundary. scripts/test-wasm-schemas.ts proves it against the real
// module; these pin the adapters' side of it.
describe("chessboard-block params sent by the adapters", () => {
    beforeEach(() => vi.clearAllMocks());

    it("chessboard sends only the three live keys", async () => {
        await run(chessboardAlgorithm, chessboardAlgorithm.initialConfig);
        const sent = vi.mocked(detectChessboardWasm).mock.calls[0][3] as { params: Record<string, unknown> };
        expect(Object.keys(sent.params).sort()).toEqual(["max_components", "min_corner_strength", "min_labeled_corners"]);
    });

    it("charuco's chessboard block has no expected size, completeness or graph keys", async () => {
        await run(charucoAlgorithm, charucoAlgorithm.initialConfig);
        const sent = vi.mocked(detectCharucoWasm).mock.calls[0][3] as { params: Record<string, unknown> };
        expect(Object.keys(sent.params.chessboard as object).sort()).toEqual(["max_components", "min_corner_strength", "min_labeled_corners"]);
        expect(sent.params).not.toHaveProperty("max_hamming");
    });

    it("puzzleboard's chessboard block and decode block carry only live keys", async () => {
        await run(puzzleboardAlgorithm, puzzleboardAlgorithm.initialConfig);
        const sent = vi.mocked(detectPuzzleboardWasm).mock.calls[0][3] as { chessboard: object; decode: object };
        expect(Object.keys(sent.chessboard).sort()).toEqual(["max_components", "min_corner_strength", "min_labeled_corners"]);
        expect(sent.decode).not.toHaveProperty("bit_likelihood_slope");
    });

    it("omits a field a saved deep link predates, so the library default stands", async () => {
        const { minLabeledCorners: _drop, ...older } = chessboardAlgorithm.initialConfig as Record<string, unknown>;
        await run(chessboardAlgorithm, older);
        const sent = vi.mocked(detectChessboardWasm).mock.calls[0][3] as { params: Record<string, unknown> };
        expect(sent.params).not.toHaveProperty("min_labeled_corners");
        expect(sent.params.max_components).toBe(3);
    });
});

describe("definedOnly", () => {
    it("drops undefined values and keeps falsy ones", () => {
        expect(definedOnly({ a: 0, b: undefined, c: false, d: "" })).toEqual({ a: 0, c: false, d: "" });
    });
});
