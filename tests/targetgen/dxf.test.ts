import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { generateDxf } from "../../src/components/targetgen/dxf/index.ts";

const REPO_ROOT = "/Users/vitalyvorobyev/vitavision";
const PUBLIC_ROOT = join(REPO_ROOT, "public");

const PAGE = {
    sizeKind: "a4",
    customWidthMm: 210,
    customHeightMm: 297,
    orientation: "landscape",
    marginMm: 10,
    pngDpi: 300,
    showScaleLine: false,
} as const;

const originalFetch = globalThis.fetch;

function count(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
}

function popcount(value: number): number {
    let remaining = value >>> 0;
    let bits = 0;
    while (remaining > 0) {
        bits += remaining & 1;
        remaining >>>= 1;
    }
    return bits;
}

beforeAll(() => {
    globalThis.fetch = (async (input) => {
        const rawUrl = typeof input === "string"
            ? input
            : input instanceof URL
                ? input.pathname
                : input.url;
        const pathname = rawUrl.startsWith("http") ? new URL(rawUrl).pathname : rawUrl;

        if (!pathname.startsWith("/")) {
            throw new Error(`Unexpected fetch url: ${rawUrl}`);
        }

        const file = Bun.file(join(PUBLIC_ROOT, pathname.slice(1)));
        return new Response(file, {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }) as typeof fetch;
});

afterAll(() => {
    globalThis.fetch = originalFetch;
});

describe("generateDxf", () => {
    test("renders chessboard squares as filled hatches", async () => {
        const dxf = await generateDxf(
            {
                targetType: "chessboard",
                config: {
                    innerRows: 1,
                    innerCols: 1,
                    squareSizeMm: 20,
                    innerSquareRel: 0.4,
                },
            },
            PAGE,
        );

        expect(count(dxf, "\n0\nHATCH\n")).toBe(2);
        expect(count(dxf, "\n0\nLINE\n")).toBe(0);
        expect(count(dxf, "\n91\n2\n")).toBe(2);
    });

    test("renders ChArUco markers as filled bit cells", async () => {
        const dxf = await generateDxf(
            {
                targetType: "charuco",
                config: {
                    rows: 2,
                    cols: 2,
                    squareSizeMm: 20,
                    markerSizeRel: 0.75,
                    dictionary: "DICT_4X4_50",
                    borderBits: 1,
                    innerSquareRel: 0,
                },
            },
            PAGE,
        );

        expect(count(dxf, "\n0\nHATCH\n")).toBeGreaterThan(10);
        expect(count(dxf, "\n0\nLINE\n")).toBe(0);
        expect(count(dxf, "\n0\nCIRCLE\n")).toBe(0);
    });

    test("preserves marker-board black circle fill and white circle hole polarity", async () => {
        const dxf = await generateDxf(
            {
                targetType: "markerboard",
                config: {
                    innerRows: 1,
                    innerCols: 1,
                    squareSizeMm: 20,
                    circleDiameterRel: 0.5,
                    circles: [
                        { cell: { i: 0, j: 0 } },
                        { cell: { i: 0, j: 1 } },
                    ],
                    innerSquareRel: 0,
                },
            },
            PAGE,
        );

        expect(count(dxf, "\n0\nHATCH\n")).toBe(3);
        expect(count(dxf, "\n92\n16\n")).toBe(1);
        expect(count(dxf, "\n92\n1\n")).toBe(1);
    });

    test("renders ringgrid annuli and code sectors as filled hatches", async () => {
        const codebook = JSON.parse(
            readFileSync(join(PUBLIC_ROOT, "ringgrid/codebook_baseline.json"), "utf8"),
        ) as { codes: number[] };

        const dxf = await generateDxf(
            {
                targetType: "ringgrid",
                config: {
                    rows: 1,
                    longRowCols: 2,
                    pitchMm: 8,
                    markerOuterRadiusMm: 5.6,
                    markerInnerRadiusMm: 3.2,
                    markerRingWidthMm: 0.8,
                    profile: "baseline",
                },
            },
            PAGE,
        );

        const expectedSectorCount = popcount(codebook.codes[0]) + popcount(codebook.codes[1]);
        expect(count(dxf, "\n0\nHATCH\n")).toBe(4 + expectedSectorCount);
        expect(count(dxf, "\n0\nLINE\n")).toBe(0);
        expect(count(dxf, "\n0\nCIRCLE\n")).toBe(0);
    });
});
