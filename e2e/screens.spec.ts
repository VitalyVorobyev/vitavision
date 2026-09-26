import { expect, test } from "@playwright/test";

// One screenshot per main route of the production build, light and dark. Content slugs
// are real pages; if one is renamed, pick another of the same kind.
const ROUTES: [name: string, path: string][] = [
    ["home", "/"],
    ["blog", "/blog"],
    ["blog-post", "/blog/01-chesscorners"],
    ["atlas", "/atlas"],
    ["atlas-people", "/atlas?view=people"],
    ["atlas-algorithm", "/atlas/barath-magsac"],
    ["atlas-model", "/atlas/alexnet"],
    ["atlas-concept", "/atlas/attention-mechanism"],
    ["narrative", "/atlas/narratives/calibration-changed-the-target"],
    ["paper", "/papers/abbas2019-bev"],
    ["author", "/authors/A5000026575"],
    ["demos", "/demos"],
    ["demo", "/demos/chess-response"],
    ["editor", "/editor"],
    ["target-generator", "/tools/target-generator"],
    ["about", "/about"],
    ["not-found", "/no-such-page"],
];

for (const theme of ["light", "dark"] as const) {
    for (const [name, path] of ROUTES) {
        test(`${name} (${theme})`, async ({ page }) => {
            await page.emulateMedia({ colorScheme: theme });
            await page.goto(path);
            await page.waitForLoadState("networkidle");
            await expect(page).toHaveScreenshot(`${name}-${theme}.png`, { timeout: 30_000 });
        });
    }
}
