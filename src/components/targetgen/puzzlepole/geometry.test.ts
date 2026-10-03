import { describe, it, expect } from "vitest";
import {
    puzzlepoleBoardSizeMm,
    puzzlepoleCircumferences,
    puzzlepoleConfigErrors,
    puzzlepoleCylinderDiameterMm,
    puzzlepoleStartRows,
    type PuzzlepolePeriod,
} from "./geometry";
import { DEFAULT_PUZZLEPOLE } from "../reducer";
import { toPrintableDocument } from "../printableDocument";
import { PUZZLEPOLE_PRESETS } from "../presets";

// A slice of the real `puzzlepole_periods()` table (calib-targets 0.15.1);
// scripts/test-target-generators.ts checks the app against the full live one.
const PERIODS: PuzzlepolePeriod[] = [[12, 73], [12, 118], [18, 7], [24, 75], [24, 242]];

describe("puzzlepole geometry", () => {
    it("measures the printed strip as axial columns by circumference + 2 rows", () => {
        // Measured on 0.15.1: 24 x 8 at 10 mm -> 80 x 260 mm; 12 x 5 at 20 mm -> 100 x 280 mm.
        expect(puzzlepoleBoardSizeMm({ circumferenceSquares: 24, startRow: 75, axialSquares: 8, squareSizeMm: 10 }))
            .toEqual({ widthMm: 80, heightMm: 260 });
        expect(puzzlepoleBoardSizeMm({ circumferenceSquares: 12, startRow: 73, axialSquares: 5, squareSizeMm: 20 }))
            .toEqual({ widthMm: 100, heightMm: 280 });
    });

    it("derives the cylinder diameter from the circumference", () => {
        const d = puzzlepoleCylinderDiameterMm({ circumferenceSquares: 24, startRow: 75, axialSquares: 8, squareSizeMm: 10 });
        expect(d).toBeCloseTo(240 / Math.PI, 6);
    });

    it("lists distinct circumferences and the start rows of one", () => {
        expect(puzzlepoleCircumferences(PERIODS)).toEqual([12, 18, 24]);
        expect(puzzlepoleStartRows(PERIODS, 24)).toEqual([75, 242]);
        expect(puzzlepoleStartRows(PERIODS, 25)).toEqual([]);
    });

    it("accepts a supported config", () => {
        expect(puzzlepoleConfigErrors(DEFAULT_PUZZLEPOLE, PERIODS)).toEqual([]);
    });

    it("rejects an unsupported period with a readable message", () => {
        const errors = puzzlepoleConfigErrors({ ...DEFAULT_PUZZLEPOLE, circumferenceSquares: 25 }, PERIODS);
        expect(errors).toHaveLength(1);
        expect(errors[0]).toMatch(/25 squares around the circumference is not a PuzzlePole period/);
        expect(errors[0]).toMatch(/Supported: 12, 18, 24/);
    });

    it("rejects a start row that does not belong to the circumference", () => {
        const errors = puzzlepoleConfigErrors({ ...DEFAULT_PUZZLEPOLE, startRow: 7 }, PERIODS);
        expect(errors[0]).toMatch(/Start row 7 does not close seamlessly for 12 squares/);
        expect(errors[0]).toMatch(/73, 118/);
    });

    it("rejects axial extents the library refuses (< 4, > 500, fractional)", () => {
        for (const axialSquares of [3, 501, 4.5]) {
            expect(puzzlepoleConfigErrors({ ...DEFAULT_PUZZLEPOLE, axialSquares }, PERIODS)[0]).toMatch(/Axial squares/);
        }
        expect(puzzlepoleConfigErrors({ ...DEFAULT_PUZZLEPOLE, axialSquares: 4 }, PERIODS)).toEqual([]);
        expect(puzzlepoleConfigErrors({ ...DEFAULT_PUZZLEPOLE, axialSquares: 500 }, PERIODS)).toEqual([]);
    });

    it("maps onto the library's puzzlepole spec", () => {
        const doc = toPrintableDocument(PUZZLEPOLE_PRESETS[1].target, PUZZLEPOLE_PRESETS[1].page);
        expect(doc.target).toEqual({
            kind: "puzzlepole",
            circumference_squares: 24,
            start_row: 75,
            axial_squares: 8,
            square_size_mm: 10,
        });
        expect(doc.page.orientation).toBe("portrait");
    });

    it("keeps each preset on a supported period and inside its own page", () => {
        for (const preset of PUZZLEPOLE_PRESETS) {
            expect(preset.target.targetType).toBe("puzzlepole");
            if (preset.target.targetType !== "puzzlepole") continue;
            const { widthMm, heightMm } = puzzlepoleBoardSizeMm(preset.target.config);
            const [pageW, pageH] = preset.page.orientation === "landscape" ? [297, 210] : [210, 297];
            expect(widthMm).toBeLessThanOrEqual(pageW - 2 * preset.page.marginMm);
            expect(heightMm).toBeLessThanOrEqual(pageH - 2 * preset.page.marginMm);
        }
    });
});
