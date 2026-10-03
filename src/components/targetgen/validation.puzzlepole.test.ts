import { describe, it, expect, vi } from "vitest";
import { validateConfig } from "./validation";
import { INITIAL_STATE, DEFAULT_PUZZLEPOLE } from "./reducer";
import type { TargetConfig } from "./types";

// `periods.ts` reaches the WASM worker; the table itself is checked against the
// real module in scripts/test-target-generators.ts.
vi.mock("./puzzlepole/periods", () => ({
    loadPuzzlepolePeriods: vi.fn().mockResolvedValue([[12, 73], [12, 118], [24, 75]]),
}));

const pole = (over: Partial<typeof DEFAULT_PUZZLEPOLE>): TargetConfig => ({
    targetType: "puzzlepole",
    config: { ...DEFAULT_PUZZLEPOLE, ...over },
});

describe("validateConfig: puzzlepole", () => {
    it("passes a supported config that fits the page and reports its footprint", async () => {
        const v = await validateConfig(pole({}), INITIAL_STATE.page);
        expect(v.errors).toEqual([]);
        expect(v.boardWidthMm).toBe(100);
        expect(v.boardHeightMm).toBe(140);
    });

    it("rejects an unsupported circumference with the list of supported ones", async () => {
        const v = await validateConfig(pole({ circumferenceSquares: 25 }), INITIAL_STATE.page);
        expect(v.errors.join("\n")).toMatch(/25 squares around the circumference is not a PuzzlePole period/);
        expect(v.errors.join("\n")).toMatch(/Supported: 12, 24/);
    });

    it("rejects a strip taller than the printable area", async () => {
        const v = await validateConfig(pole({ circumferenceSquares: 24, startRow: 75 }), INITIAL_STATE.page);
        expect(v.errors.join("\n")).toMatch(/does not fit the printable area/);
    });
});
