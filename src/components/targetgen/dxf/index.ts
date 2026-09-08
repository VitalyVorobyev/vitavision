import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "../svg/paperConstants";
import { ringgridDxf } from "./ringgridDxf";
import { buildDxf, dxfLine } from "./dxfWriter";
import { renderTargetViaWasm } from "../renderViaWasm";

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
 * The document always ends with exactly `  0\nENDSEC\n  0\nEOF\n` — that
 * `ENDSEC` closes the ENTITIES section (verified against the real WASM
 * module's output). Splicing the new entities directly before it appends
 * them as the last entities in that section without touching anything else
 * in the document.
 *
 * The library's DXF is y-up, the same convention as this file's own
 * `flipY`-based `scaleLineDxfEntities` (confirmed by rendering a vertically
 * asymmetric board and checking which y-band holds the extra squares), so no
 * coordinate transform is needed here — only the string splice.
 */
function spliceScaleLineEntities(dxf: string, entities: string[]): string {
    const anchor = "  0\nENDSEC\n  0\nEOF";
    const idx = dxf.lastIndexOf(anchor);
    if (idx === -1) {
        throw new Error(
            "generateDxf: expected the library-rendered DXF document to end with " +
            `${JSON.stringify(anchor)} so the scale-line entities could be spliced in before ENDSEC, ` +
            "but that terminator was not found. @vitavision/calib-targets may have changed its DXF " +
            "output format — do not silently drop the scale line.",
        );
    }
    return dxf.slice(0, idx) + entities.join("\n") + "\n" + dxf.slice(idx);
}

export async function generateDxf(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    // Ring grid has no printable representation in @vitavision/calib-targets
    // and stays on the TS generator path (see renderViaWasm.ts).
    if (target.targetType === "ringgrid") {
        const entities = await ringgridDxf(target.config, dims);
        if (page.showScaleLine) {
            entities.push(...scaleLineDxfEntities(dims.widthMm, dims.marginMm));
        }
        return buildDxf(entities);
    }

    const bundle = await renderTargetViaWasm(target, page);
    let dxf = bundle.dxf;
    if (page.showScaleLine) {
        dxf = spliceScaleLineEntities(dxf, scaleLineDxfEntities(dims.widthMm, dims.marginMm));
    }
    return dxf;
}
