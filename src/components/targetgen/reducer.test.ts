import { describe, it, expect } from "vitest";
import {
    targetGeneratorReducer,
    INITIAL_STATE,
    defaultConfigForType,
    defaultCircles,
} from "./reducer";

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
});

describe("targetGeneratorReducer", () => {
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
