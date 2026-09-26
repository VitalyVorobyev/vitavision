import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "../svg/paperConstants";
import { dxfLine } from "./dxfWriter";
import { renderTargetViaWasm } from "../renderViaWasm";
import { toRinggridTarget, toRinggridRenderOptions } from "../ringgridTarget";
import { renderRinggridBundleWasm } from "../../../lib/wasm/wasmWorkerProxy";

function scaleLineDxfEntities(pageW: number, marginMm: number): string[] {
    const available = pageW - 2 * marginMm;
    const candidates = [100, 50, 20, 10];
    const barLen = candidates.find((candidate) => candidate <= available * 0.4) ?? 10;

    const capH = 1;
    const bottomGap = marginMm * 0.4;
    const barY = bottomGap;
    const x1 = (pageW - barLen) / 2;
    const x2 = x1 + barLen;

    return [
        dxfLine(x1, barY, x2, barY),
        dxfLine(x1, barY - capH / 2, x1, barY + capH / 2),
        dxfLine(x2, barY - capH / 2, x2, barY + capH / 2),
    ];
}

/**
 * The library returns a complete DXF document (header + entities section +
 * EOF) rather than a bare entity list, so the scale line — a pure app-side
 * overlay with no library equivalent — has to be spliced into an already
 * finished document instead of being appended to an entity array before
 * `buildDxf` runs.
 *
 * The two renderer families terminate their DXF documents differently —
 * verified against both real WASM modules:
 *
 *   - `@vitavision/calib-targets`: `"...\n  0\nENDSEC\n  0\nEOF\n"` (group
 *     codes right-padded to width 3).
 *   - `@vitavision/ringgrid`:      `"...\n0\nSEQEND\n0\nENDSEC\n0\nEOF\n"`
 *     (NO padding).
 *
 * The two renderers pad DXF group codes differently — calib-targets right-pads
 * to width 3 (`"  0\nENDSEC\n  0\nEOF"`), ringgrid does not
 * (`"0\nENDSEC\n0\nEOF"`) — so the anchor is selected per render path rather
 * than searched for generically. Neither string matches the other's document
 * (the padded form has two spaces before its second group code), so a wrong
 * anchor fails loudly here instead of splicing into the wrong place.
 *
 * Splicing the new entities directly before the anchor appends them as the
 * last entities in the ENTITIES section without touching anything else in
 * the document.
 *
 * Both renderers are y-up, the same convention as this file's own
 * `flipY`-based `scaleLineDxfEntities` (confirmed by rendering a vertically
 * asymmetric board and checking which y-band holds the extra squares), so no
 * coordinate transform is needed here — only the string splice.
 */
function spliceScaleLineEntities(dxf: string, entities: string[], anchor: string): string {
    const idx = dxf.lastIndexOf(anchor);
    if (idx === -1) {
        throw new Error(
            "generateDxf: expected the library-rendered DXF document to end with " +
            `${JSON.stringify(anchor)} so the scale-line entities could be spliced in before ENDSEC, ` +
            "but that terminator was not found. The renderer may have changed its DXF output format " +
            "— do not silently drop the scale line.",
        );
    }
    return dxf.slice(0, idx) + entities.join("\n") + "\n" + dxf.slice(idx);
}

const CALIB_TARGETS_DXF_ANCHOR = "  0\nENDSEC\n  0\nEOF";
// Deliberately does NOT include the `SEQEND` that precedes it on a coded
// target. SEQEND only terminates a POLYLINE, so it is present for `coded16`
// (whose code sectors are polylines) but absent on a `plain` target, whose
// last entity is a CIRCLE — anchoring on it would throw the moment an
// uncoded ring grid is offered. The terminator below is common to both.
const RINGGRID_DXF_ANCHOR = "0\nENDSEC\n0\nEOF";

export async function generateDxf(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    if (target.targetType === "ringgrid") {
        const targetJson = JSON.stringify(toRinggridTarget(target.config));
        const optionsJson = JSON.stringify(toRinggridRenderOptions(page));
        const bundle = await renderRinggridBundleWasm(targetJson, optionsJson);
        let dxf = bundle.dxf;
        if (page.showScaleLine) {
            dxf = spliceScaleLineEntities(dxf, scaleLineDxfEntities(dims.widthMm, dims.marginMm), RINGGRID_DXF_ANCHOR);
        }
        return dxf;
    }

    const bundle = await renderTargetViaWasm(target, page);
    let dxf = bundle.dxf;
    if (page.showScaleLine) {
        dxf = spliceScaleLineEntities(dxf, scaleLineDxfEntities(dims.widthMm, dims.marginMm), CALIB_TARGETS_DXF_ANCHOR);
    }
    return dxf;
}
