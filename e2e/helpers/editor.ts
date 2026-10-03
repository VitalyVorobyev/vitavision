import { expect, type Locator, type Page } from "@playwright/test";

// Shared drivers for the editor specs. Everything here goes through the DOM the user sees:
// buttons by role, a few data-testids on the canvas container / tool buttons / readouts,
// and the app's own JSON export. Nothing touches the canvas renderer, so the helpers keep
// working when the stage is swapped out.

/** The exported feature file's format version: coordinates have the centre of pixel `i` at `i`. */
export const FEATURE_FILE_VERSION = 2;

/** One exported feature: the app's JSON export strips ids and internal flags, keeps the rest. */
export type ExportedFeature = Record<string, unknown> & { type: string };

/** Algorithm id -> the sample the "Try in the editor" CTA (src/pages/AlgorithmPost.tsx) opens. */
export const ALGORITHM_SAMPLES: Record<string, { sample: string; title: string }> = {
    "chess-corners": { sample: "chessboard", title: "ChESS Corners" },
    chessboard: { sample: "chessboard", title: "Chessboard" },
    charuco: { sample: "charuco", title: "ChArUco" },
    markerboard: { sample: "markerboard", title: "Marker Board" },
    ringgrid: { sample: "ringgrid", title: "Ring Grid" },
    radsym: { sample: "ringgrid", title: "Radial Symmetry" },
    puzzleboard: { sample: "puzzleboard", title: "PuzzleBoard" },
};

export const canvas = (page: Page): Locator => page.getByTestId("editor-canvas");

/** Open the editor on a sample through the deep link (it loads the image, it does not run). */
export async function openEditor(page: Page, params: { sample: string; algo?: string }): Promise<void> {
    const query = new URLSearchParams();
    if (params.algo) query.set("algo", params.algo);
    query.set("sample", params.sample);
    await page.goto(`/editor?${query.toString()}`);
    // The canvas workspace only exists once the sample is loaded (gallery mode is left).
    await expect(canvas(page)).toBeVisible();
}

/** Click Run and wait for the run's results panel. */
export async function runAlgorithm(page: Page, title: string): Promise<void> {
    const run = page.getByRole("button", { name: "Run Algorithm" });
    // Enabled once the image is loaded and the algorithm chunk has resolved.
    await expect(run).toBeEnabled({ timeout: 30_000 });
    await run.click();
    await expect(page.getByText(`${title} Results`, { exact: true })).toBeVisible({ timeout: 90_000 });
}

/** Export through the Features panel button and parse the downloaded JSON. */
export async function exportFeatures(page: Page): Promise<ExportedFeature[]> {
    const exportButton = page.getByRole("button", { name: "Export", exact: true });
    await expect(exportButton).toBeEnabled();
    const [download] = await Promise.all([page.waitForEvent("download"), exportButton.click()]);
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(chunk as Buffer);
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as { version?: unknown; features?: unknown };
    if (parsed.version !== FEATURE_FILE_VERSION) throw new Error(`feature export is version ${String(parsed.version)}, expected ${FEATURE_FILE_VERSION}`);
    if (!Array.isArray(parsed.features)) throw new Error("feature export has no features array");
    return parsed.features as ExportedFeature[];
}

/** Features of one type from an export, in export order. */
export const ofType = (features: ExportedFeature[], type: string): ExportedFeature[] =>
    features.filter((f) => f.type === type);

export async function canvasOrigin(page: Page): Promise<{ x: number; y: number; width: number; height: number }> {
    const box = await canvas(page).boundingBox();
    if (!box) throw new Error("editor canvas has no bounding box");
    return box;
}

/**
 * Show the image 1:1 (the "Zoom to 100%" action) and learn where image coordinates are on the page.
 *
 * The stage centres a 1:1 image rather than pinning it to a corner, and it puts the centre of pixel `i`
 * at coordinate `i`, so the page position of image coordinate (x, y) is not a constant of the layout.
 * It is read back from the app instead: hover a probe point, read the pixel readout, and the
 * difference is the offset. That also waits until the image is decoded and the pointer-to-image
 * mapping is live. Returns `at(x, y)`, the page position of image coordinate (x, y).
 */
export async function viewActualSize(page: Page): Promise<{ at: (x: number, y: number) => { x: number; y: number } }> {
    await page.getByRole("button", { name: "Zoom to 100%" }).click();
    await expect(page.getByTestId("zoom-readout")).toHaveText("100%");
    const origin = await canvasOrigin(page);
    const probe = { x: origin.x + 400, y: origin.y + 300 };
    let offset = { x: 0, y: 0 };
    await expect(async () => {
        await page.mouse.move(probe.x, probe.y);
        await expect(page.getByTestId("editor-pixel-readout")).toBeVisible();
        const image = await readPixelReadout(page);
        offset = { x: probe.x - image.x, y: probe.y - image.y };
    }).toPass({ timeout: 15_000 });
    return { at: (x, y) => ({ x: offset.x + x, y: offset.y + y }) };
}

/** Parse the hover readout ("X: 300.00 Y: 200.00 | 128") into image coordinates. */
export async function readPixelReadout(page: Page): Promise<{ x: number; y: number }> {
    const text = (await page.getByTestId("editor-pixel-readout").textContent()) ?? "";
    const match = /X:\s*(-?[\d.]+)\s*Y:\s*(-?[\d.]+)/.exec(text);
    if (!match) throw new Error(`unparseable pixel readout: ${text}`);
    return { x: Number(match[1]), y: Number(match[2]) };
}

/** Open the collapsible annotation tool group, then pick a tool. */
export async function pickTool(page: Page, tool: "select" | "point" | "line" | "polyline" | "polygon" | "bbox" | "ellipse"): Promise<void> {
    const target = page.getByTestId(`tool-${tool}`);
    if (tool !== "select") {
        const expander = page.getByRole("button", { name: "Annotation tools" });
        if (await expander.isVisible()) await expander.click();
    }
    await target.click();
    await expect(target).toHaveAttribute("aria-pressed", "true");
}
