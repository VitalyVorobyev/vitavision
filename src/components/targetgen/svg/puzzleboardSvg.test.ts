import { describe, it, expect } from "vitest";
import { puzzleboardSvg } from "./puzzleboardSvg";
import type { PuzzleboardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";

const config: PuzzleboardConfig = {
    rows: 6,
    cols: 9,
    cellSizeMm: 20,
    pngDpi: 300,
};

const page: PageDimensions = {
    widthMm: 210,
    heightMm: 297,
    marginMm: 10,
};

describe("puzzleboardSvg", () => {
    it("starts with <svg", () => {
        const svg = puzzleboardSvg(config, page);
        expect(svg).toMatch(/^<svg/);
    });

    it("contains no <image tags", () => {
        const svg = puzzleboardSvg(config, page);
        expect(svg).not.toContain("<image");
    });

    it("contains no base64 PNG data URI", () => {
        const svg = puzzleboardSvg(config, page);
        expect(svg).not.toContain("data:image/png;base64");
    });

    it("contains exactly rows*cols = 54 <rect elements", () => {
        const svg = puzzleboardSvg(config, page);
        const matches = svg.match(/<rect/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBe(6 * 9);
    });

    it("contains exactly (rows-1)*cols + rows*(cols-1) = 93 <circle elements", () => {
        const svg = puzzleboardSvg(config, page);
        const matches = svg.match(/<circle/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBe((6 - 1) * 9 + 6 * (9 - 1));
    });

    it("all circles have radius = cellSizeMm / 6 = 3.333...", () => {
        const svg = puzzleboardSvg(config, page);
        const expectedR = 20 / 6;
        const rAttr = `r="${expectedR}"`;
        const circles = svg.match(/<circle[^/]*/g) ?? [];
        expect(circles.length).toBeGreaterThan(0);
        for (const c of circles) {
            expect(c).toContain(rAttr);
        }
    });
});
