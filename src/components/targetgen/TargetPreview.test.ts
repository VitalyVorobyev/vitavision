import { describe, expect, it } from "vitest";

import { isPreviewOverlayTarget } from "./previewInteractions";

describe("isPreviewOverlayTarget", () => {
    it("recognizes preview overlay controls", () => {
        document.body.innerHTML = `
            <div data-preview-overlay>
                <button id="zoom-button" type="button">Zoom</button>
            </div>
            <div id="board-surface"></div>
        `;

        const zoomButton = document.getElementById("zoom-button");
        const boardSurface = document.getElementById("board-surface");

        expect(isPreviewOverlayTarget(zoomButton)).toBe(true);
        expect(isPreviewOverlayTarget(boardSurface)).toBe(false);
        expect(isPreviewOverlayTarget(null)).toBe(false);
    });
});
