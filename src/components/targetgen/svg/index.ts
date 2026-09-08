import type { TargetConfig, PageConfig } from "../types";
import { resolvePageDimensions } from "./paperConstants";
import { renderScaleLine } from "./scaleLine";
import { renderTargetViaWasm } from "../renderViaWasm";
import { toRinggridTarget, toRinggridRenderOptions } from "../ringgridTarget";
import { renderRinggridBundleWasm } from "../../../lib/wasm/wasmWorkerProxy";

export async function generatePreviewSvg(target: TargetConfig, page: PageConfig): Promise<string> {
    const dims = resolvePageDimensions(page);

    // Ring grid renders via @vitavision/ringgrid's own WASM renderer
    // (ringgridTarget.ts); every other kind goes through
    // @vitavision/calib-targets via renderViaWasm.ts.
    let svg: string;
    if (target.targetType === "ringgrid") {
        const targetJson = JSON.stringify(toRinggridTarget(target.config));
        const optionsJson = JSON.stringify(toRinggridRenderOptions(page));
        const bundle = await renderRinggridBundleWasm(targetJson, optionsJson);
        svg = bundle.svg;
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
