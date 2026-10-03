import { expect, test } from "@playwright/test";

import { ALGORITHM_SAMPLES, canvas, openEditor, runAlgorithm } from "./helpers/editor";

// Screenshot of the editor canvas after each algorithm run, light theme only. Same
// local-baseline workflow as screens.spec.ts (project `screens`, not a CI gate):
//
//     bun run build && bun run test:screens editor-visual --update-snapshots   # capture
//     bun run build && bun run test:screens editor-visual                      # compare
//
// The baseline lives in e2e/.screens/ and is not committed: capture it on the current
// renderer before a canvas migration and compare after it, on the same machine. The view is
// "Fit to screen" (a fixed 800x600 fit, independent of the window), the pointer is parked
// off the canvas so no hover readout is drawn, and the first detection stays selected as the
// run leaves it. Expect small anti-aliasing differences from a renderer change; the
// 0.1% pixel-ratio budget in the config is the starting point for judging them.
//
// Behavioural coverage of the same runs lives in editor-algorithms.spec.ts.

for (const [algo, { sample, title }] of Object.entries(ALGORITHM_SAMPLES)) {
    test(`canvas after ${algo} on ${sample}`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: "light" });
        await openEditor(page, { algo, sample });
        await runAlgorithm(page, title);
        if (algo === "radsym") {
            // The FRST heatmap is computed after the run; its controls appear once it is on the canvas.
            await expect(page.getByText("FRST Heatmap", { exact: true })).toBeVisible();
        }

        await page.getByRole("button", { name: "Fit to screen" }).click();
        await page.mouse.move(0, 0);
        await expect(page.getByTestId("editor-pixel-readout")).toBeHidden();

        await expect(canvas(page)).toHaveScreenshot(`editor-${algo}-light.png`, { timeout: 30_000 });
    });
}
