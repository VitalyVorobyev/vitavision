import type { PageConfig } from "../types";

const PAPER_SIZES: Record<string, { w: number; h: number }> = {
    a4: { w: 210, h: 297 },
    letter: { w: 215.9, h: 279.4 },
};

export interface PageDimensions {
    widthMm: number;
    heightMm: number;
    marginMm: number;
}

export function resolvePageDimensions(page: PageConfig): PageDimensions {
    let w: number;
    let h: number;

    if (page.sizeKind === "custom") {
        w = page.customWidthMm;
        h = page.customHeightMm;
    } else {
        const paper = PAPER_SIZES[page.sizeKind];
        w = paper.w;
        h = paper.h;
    }

    if (page.orientation === "landscape") {
        [w, h] = [h, w];
    }

    return { widthMm: w, heightMm: h, marginMm: page.marginMm };
}
