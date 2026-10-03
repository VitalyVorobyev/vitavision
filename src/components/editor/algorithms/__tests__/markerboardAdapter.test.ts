import { describe, it, expect, vi, beforeEach } from "vitest";

import { detectMarkerboardWasm } from "../../../../lib/wasm/wasmWorkerProxy";
import { markerboardAlgorithm } from "../calibrationTargets/markerboardAdapter";
import type { MarkerBoardConfig } from "../calibrationTargets/MarkerBoardConfigForm";

vi.mock("../../../../lib/wasm/wasmWorkerProxy", () => ({
    detectMarkerboardWasm: vi.fn().mockResolvedValue(null),
}));

type SentParams = {
    board: { rows: number; cols: number; circle_diameter_rel: number; circles: unknown[] };
    circle_score: Record<string, unknown>;
    match_params: Record<string, unknown>;
};

async function sentParams(config: MarkerBoardConfig): Promise<SentParams> {
    await markerboardAlgorithm.runWasm!({ pixels: new Uint8Array(0), width: 0, height: 0, config });
    const call = vi.mocked(detectMarkerboardWasm).mock.calls.at(-1)!;
    return (call[3] as { params: SentParams }).params;
}

describe("markerboardAlgorithm WASM params (calib-targets 0.15 schema)", () => {
    beforeEach(() => vi.mocked(detectMarkerboardWasm).mockClear());

    it("sends the disk diameter on the board spec, not on circle_score", async () => {
        const config = { ...(markerboardAlgorithm.initialConfig as MarkerBoardConfig), circleDiameterRel: 0.45 };
        const params = await sentParams(config);
        expect(params.board.circle_diameter_rel).toBe(0.45);
        // `diameter_frac` was removed in 0.15; the boundary would drop it silently.
        expect(params.circle_score).not.toHaveProperty("diameter_frac");
    });

    it("does not send the removed circle_match max_distance_cells", async () => {
        const params = await sentParams(markerboardAlgorithm.initialConfig as MarkerBoardConfig);
        expect(params.match_params).not.toHaveProperty("max_distance_cells");
    });

    it("defaults min_offset_inliers to the whole 3-circle layout", async () => {
        const params = await sentParams(markerboardAlgorithm.initialConfig as MarkerBoardConfig);
        expect(params.match_params.min_offset_inliers).toBe(3);
    });

    it("keeps the default and preset circle polarities on the generator's parity rule (white iff row + col even)", () => {
        const configs = [
            markerboardAlgorithm.initialConfig as MarkerBoardConfig,
            ...markerboardAlgorithm.presets!.map((p) => p.config as MarkerBoardConfig),
        ];
        for (const config of configs) {
            for (const circle of config.circles) {
                expect(circle.polarity, `(${circle.row}, ${circle.col})`).toBe((circle.row + circle.col) % 2 === 0 ? "white" : "black");
            }
        }
    });

    it("transposes app (row, col) circle cells into the library's (i = col, j = row)", async () => {
        const params = await sentParams(markerboardAlgorithm.initialConfig as MarkerBoardConfig);
        // circle 2 sits at app (row 12, col 11) -> library (i = 11, j = 12)
        expect(params.board.circles[0]).toEqual({ cell: { i: 11, j: 11 }, polarity: "white" });
        expect(params.board.circles[1]).toEqual({ cell: { i: 11, j: 12 }, polarity: "black" });
    });
});
