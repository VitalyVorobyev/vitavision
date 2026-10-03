import { expect, test } from "@playwright/test";

import {
    canvasOrigin,
    exportFeatures,
    openEditor,
    pickTool,
    runAlgorithm,
    type ExportedFeature,
} from "./helpers/editor";

// Touch variant of the editor specs, renderer-agnostic. Runs in the `e2e-touch` project
// (playwright.config.ts): a 1024x768 touch-primary viewport, where the editor switches to
// its touch-tablet layout (horizontal tool strip, tabbed right panel, tap instead of click).
// Selection is observed through the Selected card in the Features tab; positions come from
// the app's own JSON export. Nothing depends on the canvas renderer.

test.describe("editor on touch", () => {
    test("tapping a detected corner selects it", async ({ page }) => {
        await openEditor(page, { sample: "chessboard", algo: "chess-corners" });
        await runAlgorithm(page, "ChESS Corners");

        const featuresTab = page.getByRole("radio", { name: "Features" });
        await featuresTab.click();
        await page.getByRole("button", { name: "Zoom to 100%" }).click();
        await expect(page.getByTestId("zoom-readout")).toHaveText("100%");

        const corners = await exportFeatures(page);
        const origin = await canvasOrigin(page);

        // The run selects the first corner. Pick the corner nearest to (250, 250) in the image:
        // inside the visible canvas at 1:1 and clear of the corner overlays.
        const positions = corners.map((f) => ({ x: f["x"] as number, y: f["y"] as number }));
        const distance = (p: { x: number; y: number }) => Math.hypot(p.x - 250, p.y - 250);
        const first = positions[0] as { x: number; y: number };
        const target = positions
            .slice(1)
            .reduce((best, p) => (distance(p) < distance(best) ? p : best), positions[1] as { x: number; y: number });
        expect(target).not.toEqual(first);

        const position = page.locator("dt", { hasText: "Position" }).locator("xpath=following-sibling::dd[1]");
        await expect(position).toBeVisible();
        const readPosition = async () => {
            const text = (await position.textContent()) ?? "";
            const [x, y] = text.split(",").map((v) => Number(v.trim()));
            return { x: x as number, y: y as number };
        };
        const selectedBefore = await readPosition();
        expect(Math.hypot(selectedBefore.x - first.x, selectedBefore.y - first.y)).toBeLessThan(0.01);

        await page.touchscreen.tap(origin.x + target.x, origin.y + target.y);
        await expect(async () => {
            const selected = await readPosition();
            expect(Math.hypot(selected.x - target.x, selected.y - target.y)).toBeLessThan(0.01);
        }).toPass();
    });

    test("a tap with the point tool adds a point, a tap with Select selects it", async ({ page }) => {
        await openEditor(page, { sample: "chessboard" });
        await page.getByRole("button", { name: "Zoom to 100%" }).click();
        await expect(page.getByTestId("zoom-readout")).toHaveText("100%");
        const origin = await canvasOrigin(page);

        await pickTool(page, "point");
        await page.touchscreen.tap(origin.x + 300, origin.y + 200);

        await page.getByRole("radio", { name: "Features" }).click();
        const features: ExportedFeature[] = await exportFeatures(page);
        expect(features).toHaveLength(1);
        const [point] = features as [ExportedFeature];
        expect(point.type).toBe("point");
        expect(Math.abs((point["x"] as number) - 300)).toBeLessThanOrEqual(1);
        expect(Math.abs((point["y"] as number) - 200)).toBeLessThanOrEqual(1);

        // Switching tools clears the selection; a tap on the point selects it again.
        await pickTool(page, "select");
        await expect(page.getByText("Selected", { exact: true })).toBeHidden();
        await page.touchscreen.tap(origin.x + 300, origin.y + 200);
        await expect(page.getByText("Selected", { exact: true })).toBeVisible();
    });
});
