import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";

// Path to the repo root — four levels up from src/components/targetgen/dxf/
const REPO_ROOT = resolve(import.meta.dirname, "../../../..");
// Path to the public directory — two levels up from src/components/targetgen/dxf/
const PUBLIC_ROOT = resolve(REPO_ROOT, "public");

// `generateDxf` for every non-ringgrid kind now round-trips through the
// production WASM Web Worker (`src/lib/wasm/wasmWorkerProxy.ts`), which
// spawns a browser `Worker` — unavailable under vitest's jsdom environment.
// Stub out only the worker *transport*: call the real
// `@vitavision/calib-targets` renderer in-process instead, exactly the WASM
// call `src/lib/wasm/wasmWorker.ts`'s `handleRenderTargetBundle` makes. This
// exercises the real library end-to-end (schema, DXF terminator, etc.) —
// only the postMessage/Worker plumbing is bypassed.
//
// Loaded via `initSync` on a buffer read straight off disk rather than the
// module's own `default()` (which fetches the .wasm binary): jsdom's stubbed
// `fetch` rejects a `file://` URL as "not implemented", and `initSync` sidesteps
// that path entirely rather than requiring a jsdom-specific fetch polyfill.
vi.mock("../../../lib/wasm/wasmWorkerProxy", async () => {
    const calibTargets = await import("@vitavision/calib-targets");
    const wasmPath = resolve(
        REPO_ROOT,
        "node_modules/@vitavision/calib-targets/calib_targets_wasm_bg.wasm",
    );
    calibTargets.initSync({ module: readFileSync(wasmPath) });
    return {
        renderTargetBundleWasm: async (doc: unknown) => {
            const bundle = calibTargets.render_target_bundle_json(doc) as {
                svg_text: string;
                dxf_text: string;
                json_text: string;
                png_bytes: Uint8Array;
            };
            return {
                svg: bundle.svg_text,
                dxf: bundle.dxf_text,
                json: bundle.json_text,
                png: bundle.png_bytes,
            };
        },
    };
});

const { generateDxf } = await import("./index.ts");

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

        const filePath = join(PUBLIC_ROOT, pathname.slice(1));
        const data = readFileSync(filePath);
        return new Response(data, {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }) as typeof fetch;
});

afterAll(() => {
    globalThis.fetch = originalFetch;
});

describe("generateDxf", () => {
    it("renders ringgrid annuli and code sectors as filled hatches", async () => {
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

    it("splices three scale-line LINE entities before the ENDSEC/EOF terminator on a WASM-rendered kind", async () => {
        const target = {
            targetType: "chessboard",
            config: { innerRows: 6, innerCols: 7, squareSizeMm: 20, innerSquareRel: 0 },
        } as const;

        const withoutScale = await generateDxf(target, { ...PAGE, showScaleLine: false });
        const withScale = await generateDxf(target, { ...PAGE, showScaleLine: true });

        // The library's own terminator is unmodified — the scale line is
        // spliced before it, never replacing or duplicating it.
        expect(withScale.endsWith("  0\nENDSEC\n  0\nEOF\n")).toBe(true);
        expect(withoutScale.endsWith("  0\nENDSEC\n  0\nEOF\n")).toBe(true);

        const lineCountWithout = count(withoutScale, "\n0\nLINE\n");
        const lineCountWith = count(withScale, "\n0\nLINE\n");
        expect(lineCountWith - lineCountWithout).toBe(3);
    });
});
