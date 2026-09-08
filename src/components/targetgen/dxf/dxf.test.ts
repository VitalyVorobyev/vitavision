import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// Path to the repo root — four levels up from src/components/targetgen/dxf/
const REPO_ROOT = resolve(import.meta.dirname, "../../../..");

// `generateDxf` for every printable kind now round-trips through the
// production WASM Web Worker (`src/lib/wasm/wasmWorkerProxy.ts`), which
// spawns a browser `Worker` — unavailable under vitest's jsdom environment.
// Stub out only the worker *transport*: call the real renderer packages
// in-process instead, exactly the WASM calls `src/lib/wasm/wasmWorker.ts`'s
// `handleRenderTargetBundle` (calib-targets) and `handleRenderRinggridBundle`
// (ringgrid) make. This exercises the real libraries end-to-end (schema, DXF
// terminator, etc.) — only the postMessage/Worker plumbing is bypassed.
//
// Loaded via `initSync` on a buffer read straight off disk rather than each
// module's own `default()` (which fetches the .wasm binary): jsdom's stubbed
// `fetch` rejects a `file://` URL as "not implemented", and `initSync`
// sidesteps that path entirely rather than requiring a jsdom-specific fetch
// polyfill.
vi.mock("../../../lib/wasm/wasmWorkerProxy", async () => {
    const calibTargets = await import("@vitavision/calib-targets");
    calibTargets.initSync({
        module: readFileSync(
            resolve(REPO_ROOT, "node_modules/@vitavision/calib-targets/calib_targets_wasm_bg.wasm"),
        ),
    });

    const ringgrid = await import("@vitavision/ringgrid");
    ringgrid.initSync({
        module: readFileSync(resolve(REPO_ROOT, "node_modules/@vitavision/ringgrid/ringgrid_wasm_bg.wasm")),
    });

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
        renderRinggridBundleWasm: async (targetJson: string, optionsJson: string) => {
            const bundle = ringgrid.render_target_bundle_json(targetJson, optionsJson) as {
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

function count(haystack: string, needle: string): number {
    return haystack.split(needle).length - 1;
}

const RINGGRID_TARGET = {
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
} as const;

describe("generateDxf", () => {
    it("renders a ring-grid target via the real @vitavision/ringgrid renderer", async () => {
        const dxf = await generateDxf(RINGGRID_TARGET, PAGE);

        // Structural sanity on real library output — not an assertion on
        // ringgrid's internal DXF entity mix (that's the library's business,
        // not this app's, and it is free to change without breaking this
        // app-level wiring test).
        expect(dxf.startsWith("0\nSECTION\n")).toBe(true);
        expect(dxf).toContain("0\nSECTION\n2\nENTITIES\n");
        // ringgrid's own (unpadded) terminator — confirms the app is reading
        // real ringgrid output, not calib-targets', through this path.
        expect(dxf.endsWith("0\nSEQEND\n0\nENDSEC\n0\nEOF\n")).toBe(true);
    });

    it("splices three scale-line LINE entities before ringgrid's own (unpadded) ENDSEC/EOF terminator", async () => {
        const withoutScale = await generateDxf(RINGGRID_TARGET, { ...PAGE, showScaleLine: false });
        const withScale = await generateDxf(RINGGRID_TARGET, { ...PAGE, showScaleLine: true });

        // ringgrid's terminator has NO group-code padding, unlike
        // calib-targets' "  0\nENDSEC\n  0\nEOF\n". Either way the library's
        // own terminator survives unmodified and the scale line is spliced
        // before it.
        expect(withoutScale.endsWith("0\nSEQEND\n0\nENDSEC\n0\nEOF\n")).toBe(true);
        expect(withScale.endsWith("0\nENDSEC\n0\nEOF\n")).toBe(true);

        const lineCountWithout = count(withoutScale, "\n0\nLINE\n");
        const lineCountWith = count(withScale, "\n0\nLINE\n");
        expect(lineCountWith - lineCountWithout).toBe(3);

        // The spliced entities must land AFTER the SEQEND that closes the
        // last POLYLINE, not before it. Anchoring on "0\nSEQEND\n0\nENDSEC..."
        // instead of the bare terminator inserts them between the polyline's
        // final VERTEX and its SEQEND, which orphans the terminator and makes
        // the document malformed — a reader would parse the scale-line LINEs
        // as part of the unterminated vertex sequence. Guard that ordering.
        expect(withScale.lastIndexOf("\n0\nLINE\n")).toBeGreaterThan(
            withScale.lastIndexOf("0\nSEQEND\n"),
        );
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
