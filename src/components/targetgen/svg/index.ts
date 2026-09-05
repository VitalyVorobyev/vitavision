import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "./paperConstants";
import { ringgridSvg } from "./ringgridSvg";
import { renderScaleLine } from "./scaleLine";
import { renderTargetViaWasm } from "../renderViaWasm";

export async function generatePreviewSvg(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    // Ring grid has no printable representation in @vitavision/calib-targets
    // and stays on the TS generator path (see renderViaWasm.ts). Every other
    // kind is rendered by the library via the WASM worker.
    let svg: string;
    if (target.targetType === "ringgrid") {
        svg = await ringgridSvg(target.config, dims);
    } else {
        const bundle = await renderTargetViaWasm(target, page);
        svg = bundle.svg;
    }

    if (page.showScaleLine) {
        const scaleSvg = renderScaleLine(dims.widthMm, dims.heightMm, dims.marginMm);
        if (scaleSvg) {
            svg = svg.replace("</svg>", scaleSvg + "</svg>");
        }
    }

    return svg;
}
