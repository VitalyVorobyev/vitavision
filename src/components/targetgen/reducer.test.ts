import { describe, it, expect } from "vitest";
import {
    targetGeneratorReducer,
    INITIAL_STATE,
    defaultConfigForType,
    defaultCircles,
    DEFAULT_PUZZLEBOARD,
    DEFAULT_PUZZLEPOLE,
} from "./reducer";
import type { PuzzleboardConfig } from "./types";

describe("defaultCircles", () => {
    it("returns 3 circles centered on the board", () => {
        const circles = defaultCircles(7, 10);
        expect(circles).toHaveLength(3);
        // Center of an 8x11 grid (totalRows=8, totalCols=11)
        expect(circles[0].cell).toEqual({ i: 3, j: 5 });
        expect(circles[1].cell).toEqual({ i: 4, j: 5 });
        expect(circles[2].cell).toEqual({ i: 4, j: 6 });
    });
});

describe("defaultConfigForType", () => {
    it("returns chessboard config for 'chessboard'", () => {
        const config = defaultConfigForType("chessboard");
        expect(config).toHaveProperty("innerRows");
        expect(config).toHaveProperty("innerCols");
        expect(config).toHaveProperty("squareSizeMm");
    });

    it("returns charuco config for 'charuco'", () => {
        const config = defaultConfigForType("charuco");
        expect(config).toHaveProperty("dictionary");
    });

    it("returns ringgrid config for 'ringgrid'", () => {
        const config = defaultConfigForType("ringgrid");
        expect(config).toHaveProperty("pitchMm");
        expect(config).toHaveProperty("profile");
    });

    it("returns chessboard as default for unknown type", () => {
        const config = defaultConfigForType("nonexistent");
        expect(config).toHaveProperty("innerRows");
    });

    it("returns puzzleboard config for 'puzzleboard'", () => {
        const config = defaultConfigForType("puzzleboard") as PuzzleboardConfig;
        expect(config.rows).toBe(DEFAULT_PUZZLEBOARD.rows);
        expect(config.cols).toBe(DEFAULT_PUZZLEBOARD.cols);
        expect(config.cellSizeMm).toBe(DEFAULT_PUZZLEBOARD.cellSizeMm);
    });

    it("returns puzzlepole config for 'puzzlepole'", () => {
        expect(defaultConfigForType("puzzlepole")).toEqual(DEFAULT_PUZZLEPOLE);
    });
});

describe("targetGeneratorReducer", () => {
    it("selects puzzlepole with its default config", () => {
        const next = targetGeneratorReducer(INITIAL_STATE, { type: "SET_TARGET_TYPE", targetType: "puzzlepole" });
        expect(next.target).toEqual({ targetType: "puzzlepole", config: DEFAULT_PUZZLEPOLE });
    });

    it("handles SET_TARGET_TYPE and caches previous config", () => {
        const next = targetGeneratorReducer(INITIAL_STATE, {
            type: "SET_TARGET_TYPE",
            targetType: "charuco",
        });
        expect(next.target.targetType).toBe("charuco");
        expect(next.configCache.chessboard).toBeDefined();
    });

    it("restores cached config when switching back", () => {
        const step1 = targetGeneratorReducer(INITIAL_STATE, {
            type: "UPDATE_CONFIG",
            partial: { squareSizeMm: 42 },
        });
        const step2 = targetGeneratorReducer(step1, {
            type: "SET_TARGET_TYPE",
            targetType: "charuco",
        });
        const step3 = targetGeneratorReducer(step2, {
            type: "SET_TARGET_TYPE",
            targetType: "chessboard",
        });
        expect((step3.target.config as { squareSizeMm: number }).squareSizeMm).toBe(42);
    });

    it("handles UPDATE_CONFIG by merging partial", () => {
        const next = targetGeneratorReducer(INITIAL_STATE, {
            type: "UPDATE_CONFIG",
            partial: { squareSizeMm: 30 },
        });
        expect((next.target.config as { squareSizeMm: number }).squareSizeMm).toBe(30);
    });

    it("handles UPDATE_PAGE by merging partial", () => {
        const next = targetGeneratorReducer(INITIAL_STATE, {
            type: "UPDATE_PAGE",
            partial: { orientation: "portrait" },
        });
        expect(next.page.orientation).toBe("portrait");
        expect(next.page.sizeKind).toBe("a4"); // untouched
    });

    it("handles LOAD_PRESET by replacing target and page", () => {
        const preset = {
            target: { targetType: "charuco" as const, config: defaultConfigForType("charuco") },
            page: { ...INITIAL_STATE.page, marginMm: 5 },
        };
        const next = targetGeneratorReducer(INITIAL_STATE, {
            type: "LOAD_PRESET",
            target: preset.target as typeof next.target,
            page: preset.page,
        });
        expect(next.target.targetType).toBe("charuco");
        expect(next.page.marginMm).toBe(5);
    });

    it("handles SET_PREVIEW", () => {
        const next = targetGeneratorReducer(INITIAL_STATE, {
            type: "SET_PREVIEW",
            svg: "<svg></svg>",
            validation: { errors: ["too small"], warnings: [] },
        });
        expect(next.previewSvg).toBe("<svg></svg>");
        expect(next.validation.errors).toContain("too small");
    });

    it("SET_TARGET_TYPE('puzzleboard') yields default puzzleboard config", () => {
        const next = targetGeneratorReducer(INITIAL_STATE, {
            type: "SET_TARGET_TYPE",
            targetType: "puzzleboard",
        });
        expect(next.target.targetType).toBe("puzzleboard");
        const config = next.target.config as PuzzleboardConfig;
        expect(config.rows).toBe(7);
        expect(config.cols).toBe(10);
        expect(config.cellSizeMm).toBe(15);
        // Previous chessboard config is cached
        expect(next.configCache.chessboard).toBeDefined();
    });

    it("UPDATE_CONFIG updates puzzleboard rows", () => {
        const pb = targetGeneratorReducer(INITIAL_STATE, {
            type: "SET_TARGET_TYPE",
            targetType: "puzzleboard",
        });
        const updated = targetGeneratorReducer(pb, {
            type: "UPDATE_CONFIG",
            partial: { rows: 9 },
        });
        expect((updated.target.config as PuzzleboardConfig).rows).toBe(9);
        // Other fields unchanged
        expect((updated.target.config as PuzzleboardConfig).cols).toBe(10);
    });

    it("auto-centers circles when markerboard dimensions change", () => {
        const mb = targetGeneratorReducer(INITIAL_STATE, {
            type: "SET_TARGET_TYPE",
            targetType: "markerboard",
        });
        const updated = targetGeneratorReducer(mb, {
            type: "UPDATE_CONFIG",
            partial: { innerRows: 5 },
        });
        const config = updated.target.config as { circles: { cell: { i: number; j: number } }[] };
        // Should recenter for 5 rows
        expect(config.circles).toHaveLength(3);
    });
});

describe("screen medium", () => {
    const display = { widthPx: 2560, heightPx: 1440 };

    it("starts in print with library-shaped screen defaults and no result", () => {
        expect(INITIAL_STATE.medium).toBe("print");
        expect(INITIAL_STATE.screen).toEqual({ widthPx: 1920, heightPx: 1080, pixelPitchMm: 0.25, marginPx: null });
        expect(INITIAL_STATE.screenResult).toBeNull();
        expect(INITIAL_STATE.screenPrefilled).toBe(false);
    });

    it("prefills the display size once, the first time Screen is chosen", () => {
        const first = targetGeneratorReducer(INITIAL_STATE, { type: "SET_MEDIUM", medium: "screen", displayPx: display });
        expect(first.medium).toBe("screen");
        expect(first.screen).toMatchObject(display);
        expect(first.screenPrefilled).toBe(true);

        // The user edits, flips to Print and back: the edit survives.
        const edited = targetGeneratorReducer(first, { type: "UPDATE_SCREEN", partial: { widthPx: 1280 } });
        const print = targetGeneratorReducer(edited, { type: "SET_MEDIUM", medium: "print" });
        const again = targetGeneratorReducer(print, { type: "SET_MEDIUM", medium: "screen", displayPx: display });
        expect(again.screen.widthPx).toBe(1280);
    });

    it("keeps the defaults when the display size is unknown (SSR) and does not retry", () => {
        const s = targetGeneratorReducer(INITIAL_STATE, { type: "SET_MEDIUM", medium: "screen" });
        expect(s.screen).toEqual(INITIAL_STATE.screen);
        expect(s.screenPrefilled).toBe(true);
    });

    it("does not prefill the pixel pitch or margin", () => {
        const s = targetGeneratorReducer(INITIAL_STATE, { type: "SET_MEDIUM", medium: "screen", displayPx: display });
        expect(s.screen.pixelPitchMm).toBe(0.25);
        expect(s.screen.marginPx).toBeNull();
    });

    it("leaves the print page and target untouched, and drops stale results on a medium change", () => {
        const withResult = {
            ...INITIAL_STATE,
            medium: "screen" as const,
            screenResult: {
                png: new Uint8Array(1),
                sidecarJson: "{}",
                widthPx: 1,
                heightPx: 1,
                geometry: { kind: "grid" as const, squareSizePx: 1, squareSizeMm: 1, requestedSquareSizeMm: 1, boardOriginPx: [0, 0] as [number, number] },
            },
        };
        const back = targetGeneratorReducer(withResult, { type: "SET_MEDIUM", medium: "print" });
        expect(back.screenResult).toBeNull();
        expect(back.page).toBe(INITIAL_STATE.page);
        expect(back.target).toBe(INITIAL_STATE.target);
    });

    it("is a no-op when the medium does not change", () => {
        expect(targetGeneratorReducer(INITIAL_STATE, { type: "SET_MEDIUM", medium: "print" })).toBe(INITIAL_STATE);
    });

    it("UPDATE_SCREEN merges, including clearing the margin", () => {
        const a = targetGeneratorReducer(INITIAL_STATE, { type: "UPDATE_SCREEN", partial: { marginPx: 4, pixelPitchMm: 0.2745 } });
        expect(a.screen).toMatchObject({ marginPx: 4, pixelPitchMm: 0.2745 });
        const b = targetGeneratorReducer(a, { type: "UPDATE_SCREEN", partial: { marginPx: null } });
        expect(b.screen.marginPx).toBeNull();
    });

    it("SET_SCREEN_PREVIEW stores the result and validation", () => {
        const s = targetGeneratorReducer(INITIAL_STATE, {
            type: "SET_SCREEN_PREVIEW",
            result: null,
            validation: { errors: ["boom"], warnings: [] },
        });
        expect(s.validation.errors).toEqual(["boom"]);
    });
});
