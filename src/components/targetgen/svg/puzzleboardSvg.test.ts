import { describe, it, expect } from "vitest";
import { puzzleboardSvg } from "./puzzleboardSvg";
import type { PuzzleboardConfig } from "../types";
import type { PageDimensions } from "./paperConstants";

const config: PuzzleboardConfig = {
    rows: 6,
    cols: 9,
    cellSizeMm: 20,
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

    it("contains exactly rows*cols + 1 = 55 <rect elements (board squares + white background)", () => {
        const svg = puzzleboardSvg(config, page);
        const matches = svg.match(/<rect/g);
        expect(matches).not.toBeNull();
        expect(matches!.length).toBe(6 * 9 + 1);
    });

    it("first rect is the outer white background spanning outerW x outerH", () => {
        const svg = puzzleboardSvg(config, page);
        // rows=6, cols=9, sq=20: outerW = 9*20+10 = 190, outerH = 6*20+10 = 130
        expect(svg).toContain('width="190"');
        expect(svg).toContain('height="130"');
        // outer rect is white
        const firstRect = svg.match(/<rect[^/]*\/>/)![0];
        expect(firstRect).toContain('"#ffffff"');
    });

    it("inked board is offset by MARGIN_MM=5 from the outer rect", () => {
        const svg = puzzleboardSvg(config, page);
        // outerOx = (210-190)/2 = 10, ox = outerOx + 5 = 15
        // outerOy = (297-130)/2 = 83.5, oy = outerOy + 5 = 88.5
        const rects = svg.match(/<rect[^/]*\/>/g)!;
        // second rect is first board square at (ox, oy) = (15, 88.5)
        expect(rects[1]).toContain('x="15"');
        expect(rects[1]).toContain('y="88.5"');
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

    it("renders large boards (200x200) with the expected primitive counts", () => {
        const big: PuzzleboardConfig = { rows: 200, cols: 200, cellSizeMm: 1 };
        const bigPage: PageDimensions = { widthMm: 250, heightMm: 250, marginMm: 5 };
        const svg = puzzleboardSvg(big, bigPage);
        expect(svg).toMatch(/^<svg/);
        const rects = svg.match(/<rect/g)!;
        const circles = svg.match(/<circle/g)!;
        expect(rects.length).toBe(200 * 200 + 1);
        expect(circles.length).toBe(199 * 200 + 200 * 199);
    });

    it("renders boards at the master-period maximum (501x501) without error", () => {
        const max: PuzzleboardConfig = { rows: 501, cols: 501, cellSizeMm: 0.5 };
        const maxPage: PageDimensions = { widthMm: 300, heightMm: 300, marginMm: 5 };
        const svg = puzzleboardSvg(max, maxPage);
        expect(svg).toMatch(/^<svg/);
        const rects = svg.match(/<rect/g)!;
        expect(rects.length).toBe(501 * 501 + 1);
    });
});
