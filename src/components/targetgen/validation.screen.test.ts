import { describe, it, expect, vi } from "vitest";
import { validateScreenConfig, screenGeometryWarnings } from "./validation";
import { INITIAL_STATE, DEFAULT_RINGGRID, defaultConfigForType } from "./reducer";
import type { TargetConfig } from "./types";

vi.mock("./puzzlepole/periods", () => ({ loadPuzzlepolePeriods: vi.fn().mockResolvedValue([]) }));

const screen = { widthPx: 1920, heightPx: 1080, pixelPitchMm: 0.25, marginPx: null };
const chess = INITIAL_STATE.target;

describe("validateScreenConfig", () => {
    it("accepts supported kinds with sane display settings", () => {
        for (const target of [chess, { targetType: "ringgrid", config: DEFAULT_RINGGRID } as TargetConfig]) {
            expect(validateScreenConfig(target, screen).errors).toEqual([]);
        }
    });

    it.each(["markerboard", "puzzlepole"] as const)("explains that %s is not a screen kind", (t) => {
        const target = { targetType: t, config: defaultConfigForType(t) } as TargetConfig;
        const { errors } = validateScreenConfig(target, screen);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatch(/not available as a screen target/);
    });

    it("rejects non-integer, non-positive and absurd display sizes", () => {
        expect(validateScreenConfig(chess, { ...screen, widthPx: 0 }).errors[0]).toMatch(/Width/);
        expect(validateScreenConfig(chess, { ...screen, heightPx: 1080.5 }).errors[0]).toMatch(/Height/);
        expect(validateScreenConfig(chess, { ...screen, widthPx: 100000 }).errors[0]).toMatch(/Width/);
    });

    it("rejects a non-positive pixel pitch and a bad margin, accepts a blank margin", () => {
        expect(validateScreenConfig(chess, { ...screen, pixelPitchMm: 0 }).errors[0]).toMatch(/Pixel pitch/);
        expect(validateScreenConfig(chess, { ...screen, pixelPitchMm: Number.NaN }).errors[0]).toMatch(/Pixel pitch/);
        expect(validateScreenConfig(chess, { ...screen, marginPx: -1 }).errors[0]).toMatch(/Margin/);
        expect(validateScreenConfig(chess, { ...screen, marginPx: 1.5 }).errors[0]).toMatch(/Margin/);
        expect(validateScreenConfig(chess, { ...screen, marginPx: 0 }).errors).toEqual([]);
    });

    it("reports a ChArUco board that needs more markers than the dictionary has", () => {
        const charuco: TargetConfig = {
            targetType: "charuco",
            config: { ...(defaultConfigForType("charuco") as never as { rows: number }), rows: 12, cols: 10, squareSizeMm: 10, markerSizeRel: 0.75, dictionary: "DICT_4X4_50", borderBits: 1, innerSquareRel: 0 },
        };
        expect(validateScreenConfig(charuco, screen).errors[0]).toMatch(/requires 60 markers.*DICT_4X4_50 only has 50/);
    });
});

describe("screenGeometryWarnings", () => {
    it("warns about tiny squares and markers only", () => {
        const grid = (px: number) => ({ kind: "grid" as const, squareSizePx: px, squareSizeMm: 1, requestedSquareSizeMm: 1, boardOriginPx: [0, 0] as [number, number] });
        expect(screenGeometryWarnings(grid(73))).toEqual([]);
        expect(screenGeometryWarnings(grid(8))[0]).toMatch(/8 px wide/);
    });
});
