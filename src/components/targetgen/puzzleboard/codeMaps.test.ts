import { describe, it, expect } from "vitest";
import {
    MAP_A_BYTES,
    MAP_B_BYTES,
    horizontalEdgeBit,
    verticalEdgeBit,
} from "./codeMaps";

describe("codeMaps byte arrays", () => {
    it("MAP_A_BYTES has 63 bytes", () => {
        expect(MAP_A_BYTES.length).toBe(63);
    });

    it("MAP_B_BYTES has 63 bytes", () => {
        expect(MAP_B_BYTES.length).toBe(63);
    });
});

describe("horizontalEdgeBit", () => {
    it("returns 0 or 1 at (0, 0)", () => {
        const bit = horizontalEdgeBit(0, 0);
        const expected = (MAP_B_BYTES[0] & 1) as 0 | 1;
        expect(bit).toBe(expected);
    });

    it("wraps cyclically: (167, 0) === (0, 0)", () => {
        expect(horizontalEdgeBit(167, 0)).toBe(horizontalEdgeBit(0, 0));
    });

    it("wraps cyclically: (-1, -1) === (166, 2)", () => {
        expect(horizontalEdgeBit(-1, -1)).toBe(horizontalEdgeBit(166, 2));
    });

    it("spot-check (0, 0)", () => {
        const idx = 0 * 3 + 0;
        const expected = ((MAP_B_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(horizontalEdgeBit(0, 0)).toBe(expected);
    });

    it("spot-check (0, 1)", () => {
        const idx = 0 * 3 + 1;
        const expected = ((MAP_B_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(horizontalEdgeBit(0, 1)).toBe(expected);
    });

    it("spot-check (1, 0)", () => {
        const idx = 1 * 3 + 0;
        const expected = ((MAP_B_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(horizontalEdgeBit(1, 0)).toBe(expected);
    });

    it("spot-check (0, 2)", () => {
        const idx = 0 * 3 + 2;
        const expected = ((MAP_B_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(horizontalEdgeBit(0, 2)).toBe(expected);
    });

    it("spot-check (166, 2)", () => {
        const idx = 166 * 3 + 2;
        const expected = ((MAP_B_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(horizontalEdgeBit(166, 2)).toBe(expected);
    });
});

describe("verticalEdgeBit", () => {
    it("wraps cyclically with period 3 for rows: (3, 0) === (0, 0)", () => {
        expect(verticalEdgeBit(3, 0)).toBe(verticalEdgeBit(0, 0));
    });

    it("wraps cyclically with period 167 for cols: (0, 167) === (0, 0)", () => {
        expect(verticalEdgeBit(0, 167)).toBe(verticalEdgeBit(0, 0));
    });

    it("wraps negative: (-1, -1) === (2, 166)", () => {
        expect(verticalEdgeBit(-1, -1)).toBe(verticalEdgeBit(2, 166));
    });

    it("spot-check (0, 0)", () => {
        const idx = 0 * 167 + 0;
        const expected = ((MAP_A_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(verticalEdgeBit(0, 0)).toBe(expected);
    });

    it("spot-check (0, 1)", () => {
        const idx = 0 * 167 + 1;
        const expected = ((MAP_A_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(verticalEdgeBit(0, 1)).toBe(expected);
    });

    it("spot-check (1, 0)", () => {
        const idx = 1 * 167 + 0;
        const expected = ((MAP_A_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(verticalEdgeBit(1, 0)).toBe(expected);
    });

    it("spot-check (2, 166)", () => {
        const idx = 2 * 167 + 166;
        const expected = ((MAP_A_BYTES[idx >> 3] >> (idx & 7)) & 1) as 0 | 1;
        expect(verticalEdgeBit(2, 166)).toBe(expected);
    });
});
