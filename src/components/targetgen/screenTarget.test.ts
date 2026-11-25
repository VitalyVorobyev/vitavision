import { afterEach, describe, it, expect, vi } from "vitest";
import {
    buildRinggridSidecar,
    detectDisplayPx,
    geometryFromCalibSidecar,
    geometryFromRinggridMetadata,
    isScreenSupported,
    ringgridDrawnMarkerDiameterMm,
    screenDownloadBase,
    toRinggridScreenOptions,
    toScreenOptions,
    toScreenTargetSpec,
} from "./screenTarget";
import { DEFAULT_RINGGRID, DEFAULT_PUZZLEBOARD, INITIAL_STATE, defaultConfigForType } from "./reducer";
import type { ChessboardConfig, TargetConfig } from "./types";

const screen = { widthPx: 1920, heightPx: 1080, pixelPitchMm: 0.2745, marginPx: null };

describe("toScreenOptions", () => {
    it("sends exactly the library inputs and omits an unset margin", () => {
        expect(toScreenOptions(screen)).toEqual({ width_px: 1920, height_px: 1080, pixel_pitch_mm: 0.2745 });
        expect(toScreenOptions({ ...screen, marginPx: 3 })).toEqual({
            width_px: 1920,
            height_px: 1080,
            pixel_pitch_mm: 0.2745,
            margin_px: 3,
        });
    });
});

describe("toScreenTargetSpec", () => {
    it("is the printable spec of the kind, without the page", () => {
        const cb = INITIAL_STATE.target.config as ChessboardConfig;
        expect(toScreenTargetSpec(INITIAL_STATE.target)).toEqual({
            kind: "chessboard",
            inner_rows: cb.innerRows,
            inner_cols: cb.innerCols,
            square_size_mm: cb.squareSizeMm,
        });
        const pb: TargetConfig = { targetType: "puzzleboard", config: DEFAULT_PUZZLEBOARD };
        expect(toScreenTargetSpec(pb)).toMatchObject({
            kind: "puzzle_board",
            square_size_mm: DEFAULT_PUZZLEBOARD.cellSizeMm,
        });
    });

    it.each(["markerboard", "puzzlepole", "ringgrid"] as const)("throws for %s", (t) => {
        const target = { targetType: t, config: defaultConfigForType(t) } as TargetConfig;
        expect(() => toScreenTargetSpec(target)).toThrow();
    });
});

describe("isScreenSupported", () => {
    it("supports chessboard, charuco, puzzleboard and ring grid only", () => {
        expect(["chessboard", "charuco", "puzzleboard", "ringgrid"].every((t) => isScreenSupported(t as never))).toBe(
            true,
        );
        expect(isScreenSupported("markerboard")).toBe(false);
        expect(isScreenSupported("puzzlepole")).toBe(false);
    });
});

describe("ring grid options", () => {
    it("uses the drawn marker diameter: 2 * (outer radius + half the ring width)", () => {
        expect(ringgridDrawnMarkerDiameterMm(DEFAULT_RINGGRID)).toBeCloseTo(12, 10);
        expect(toRinggridScreenOptions(DEFAULT_RINGGRID, { ...screen, marginPx: 2 })).toEqual({
            width_px: 1920,
            height_px: 1080,
            pixel_pitch_mm: 0.2745,
            margin_px: 2,
            marker_diameter_mm: 12,
        });
    });
});

describe("sidecars", () => {
    it("reads the realised square (not the requested) from the calib-targets sidecar", () => {
        const g = geometryFromCalibSidecar(
            JSON.stringify({
                screen: {},
                board_origin_px: [522, 211],
                requested_square_size_mm: 20,
                square_size_px: 73,
                target: { kind: "chessboard", square_size_mm: 20.0385 },
            }),
        );
        expect(g).toEqual({
            kind: "grid",
            squareSizePx: 73,
            squareSizeMm: 20.0385,
            requestedSquareSizeMm: 20,
            boardOriginPx: [522, 211],
        });
    });

    it("maps ringgrid metadata and keeps both metadata and the fitted spec in the sidecar", () => {
        const metadata = {
            screen: {},
            board_origin_px: [44.9, 35.5] as [number, number],
            rows: 22,
            columns: 34,
            marker_count: 737,
            drawn_marker_diameter_mm: 12,
            drawn_marker_diameter_px: 48,
            code_band_width_px: null,
        };
        expect(geometryFromRinggridMetadata(metadata)).toMatchObject({
            kind: "ringgrid",
            rows: 22,
            columns: 34,
            markerCount: 737,
            codeBandWidthPx: null,
        });
        const side = JSON.parse(buildRinggridSidecar(metadata, '{"schema":"ringgrid.target.v6"}')) as Record<
            string,
            unknown
        >;
        expect(side.metadata).toEqual(metadata);
        expect(side.target).toEqual({ schema: "ringgrid.target.v6" });
        expect(side.schema).toBe("vitavision.screen-target.ringgrid.v1");
    });
});

describe("screenDownloadBase", () => {
    it("names files <name>-screen-<w>x<h>", () => {
        expect(screenDownloadBase(INITIAL_STATE.target, screen)).toBe("vitavision_chessboard_7x10-screen-1920x1080");
        expect(screenDownloadBase({ targetType: "ringgrid", config: DEFAULT_RINGGRID }, screen)).toBe(
            "vitavision_ringgrid-screen-1920x1080",
        );
    });
});

describe("detectDisplayPx", () => {
    afterEach(() => vi.unstubAllGlobals());

    it("multiplies the CSS screen size by the device pixel ratio", () => {
        vi.stubGlobal("devicePixelRatio", 2);
        vi.stubGlobal("screen", { width: 1280, height: 720 });
        expect(detectDisplayPx()).toEqual({ widthPx: 2560, heightPx: 1440 });
    });

    it("rounds fractional ratios and ignores a missing size", () => {
        vi.stubGlobal("devicePixelRatio", 1.25);
        vi.stubGlobal("screen", { width: 1536, height: 864 });
        expect(detectDisplayPx()).toEqual({ widthPx: 1920, heightPx: 1080 });
        vi.stubGlobal("screen", { width: 0, height: 0 });
        expect(detectDisplayPx()).toBeUndefined();
    });
});
