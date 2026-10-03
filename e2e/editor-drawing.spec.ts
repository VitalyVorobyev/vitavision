import { expect, test, type Page } from "@playwright/test";

import {
    canvasOrigin,
    exportFeatures,
    openEditor,
    pickTool,
    readPixelReadout,
    viewActualSize,
    type ExportedFeature,
} from "./helpers/editor";

// Behavioural regression test for the editor's manual annotation tools, renderer-agnostic.
//
// Every test works at "Zoom to 100%", where one image pixel is one page pixel. The stage centres
// the image there and puts the centre of pixel i at coordinate i, so `at(x, y)` (from
// `viewActualSize`) is read back from the app's pixel readout rather than assumed. Shapes are drawn
// with real pointer events (page.mouse) on the container behind data-testid="editor-canvas"; geometry
// is asserted from the app's own JSON export, in image coordinates. Selection is observed
// through the Features panel's "Selected" card, deletion through its Delete button; pan and
// zoom through the hover-pixel readout and the zoom readout. Nothing here depends on the
// canvas renderer.
//
// The viewport must stay 1440x900 (playwright.config.ts): the drawings below need roughly
// 650x550 px of canvas and keep clear of the corner overlays.

type Tool = "point" | "line" | "polyline" | "polygon" | "bbox" | "ellipse";
type Pt = readonly [number, number];

/** Pixels of tolerance when comparing geometry (pointer coordinates are exact at 1:1). */
const DRAW_TOLERANCE = 1;
/** A drag is allowed to start a few pixels late (renderer drag thresholds differ). */
const MOVE_TOLERANCE = 3;
const MOVE: Pt = [40, 30];

interface Scenario {
    tool: Tool;
    /** Perform the drawing gesture; `at` maps image coordinates to page coordinates. */
    draw: (page: Page, at: (x: number, y: number) => { x: number; y: number }) => Promise<void>;
    /** Exported feature type. */
    type: string;
    /** Expected flat geometry vector of the drawn feature, in image coordinates. */
    expected: number[];
    /** A point on the shape (image coordinates) that selects it and is safe to drag from. */
    grab: Pt;
}

const scenarios: Scenario[] = [
    {
        tool: "point",
        type: "point",
        expected: [300, 200],
        grab: [300, 200],
        draw: async (page, at) => {
            const p = at(300, 200);
            await page.mouse.click(p.x, p.y);
        },
    },
    {
        tool: "line",
        type: "line",
        expected: [150, 150, 350, 150],
        grab: [250, 150],
        draw: async (page, at) => {
            await dragBetween(page, at(150, 150), at(350, 150));
        },
    },
    {
        tool: "polyline",
        type: "polyline",
        expected: [150, 300, 250, 300, 350, 340],
        grab: [200, 300],
        draw: async (page, at) => {
            await vertexClickAt(page, at(150, 300));
            await vertexClickAt(page, at(250, 300));
            // The closing double-click adds its last vertex (possibly twice); comparison dedupes it.
            await finishAt(page, at(350, 340));
        },
    },
    {
        tool: "polygon",
        type: "polygon",
        expected: [450, 150, 600, 150, 525, 280],
        grab: [525, 190],
        draw: async (page, at) => {
            await vertexClickAt(page, at(450, 150));
            await vertexClickAt(page, at(600, 150));
            await finishAt(page, at(525, 280));
        },
    },
    {
        tool: "bbox",
        type: "bbox",
        expected: [450, 330, 150, 100],
        // 25% along the top edge, a few pixels inside it: away from the corner and mid-edge resize
        // handles, and on the shape's body (the editor's move target is its interior, which an
        // exact-edge point may fall just outside of).
        grab: [487.5, 335],
        draw: async (page, at) => {
            await dragBetween(page, at(450, 330), at(600, 430));
        },
    },
    {
        tool: "ellipse",
        type: "ellipse",
        expected: [250, 470, 100, 50],
        // The 45-degree point of the outline (centre 250,470; radii 100,50), pulled 10% in towards the
        // centre so it is on the body, not on a boundary pixel: clear of the handles.
        grab: [250 + 90 * Math.SQRT1_2, 470 + 45 * Math.SQRT1_2],
        draw: async (page, at) => {
            await dragBetween(page, at(150, 420), at(350, 520));
        },
    },
];

async function clickAt(page: Page, p: { x: number; y: number }): Promise<void> {
    await page.mouse.click(p.x, p.y);
}

/**
 * Hold time (ms) of a polyline/polygon vertex click. Two quick clicks can be read as a
 * double-click, which would finish the shape early. Holding the button keeps consecutive
 * releases further apart than the double-click window without waiting on app state; a user
 * placing vertices one by one is slower than this anyway.
 */
const VERTEX_HOLD_MS = 420;

async function vertexClickAt(page: Page, p: { x: number; y: number }): Promise<void> {
    await page.mouse.click(p.x, p.y, { delay: VERTEX_HOLD_MS });
}

/**
 * Last vertex, then a double-click on it to finish the shape. The double-click's own clicks
 * add the same vertex again (the app drops the repeat, and the comparison dedupes it too); the
 * held click before it keeps click-pairing from firing the double-click on the wrong release.
 */
async function finishAt(page: Page, p: { x: number; y: number }): Promise<void> {
    await vertexClickAt(page, p);
    await page.mouse.dblclick(p.x, p.y);
}

/** Press at `from`, move in steps, release at `to`. */
async function dragBetween(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
    await page.mouse.move(from.x, from.y);
    await page.mouse.down();
    await page.mouse.move(to.x, to.y, { steps: 10 });
    await page.mouse.up();
}

/** Flat geometry vector of an exported feature; consecutive duplicate vertices collapse. */
function geometry(feature: ExportedFeature): number[] {
    const f = feature as Record<string, unknown>;
    switch (feature.type) {
        case "point":
            return [f.x as number, f.y as number];
        case "bbox":
            return [f.x as number, f.y as number, f.width as number, f.height as number];
        case "ellipse":
            return [f.x as number, f.y as number, f.radiusX as number, f.radiusY as number];
        default: {
            const points = f.points as number[];
            const out: number[] = [];
            for (let i = 0; i < points.length; i += 2) {
                const x = points[i] as number;
                const y = points[i + 1] as number;
                if (out.length >= 2 && out[out.length - 2] === x && out[out.length - 1] === y) continue;
                out.push(x, y);
            }
            return out;
        }
    }
}

/** What `expected` becomes when the whole shape moves by `MOVE`. */
function moved(type: string, vector: number[]): number[] {
    if (type === "bbox" || type === "ellipse" || type === "point") {
        return vector.map((v, i) => (i === 0 ? v + MOVE[0] : i === 1 ? v + MOVE[1] : v));
    }
    return vector.map((v, i) => v + (i % 2 === 0 ? MOVE[0] : MOVE[1]));
}

function expectGeometry(actual: number[], expected: number[], tolerance: number, label: string): void {
    expect(actual, `${label}: vector length`).toHaveLength(expected.length);
    expected.forEach((want, i) => {
        expect(Math.abs((actual[i] as number) - want), `${label}[${i}]: ${actual[i]} vs ${want}`).toBeLessThanOrEqual(tolerance);
    });
}

test.describe("editor manual tools", () => {
    for (const scenario of scenarios) {
        test(`${scenario.tool}: draw, select, move, delete`, async ({ page }) => {
            await openEditor(page, { sample: "chessboard" });
            const { at } = await viewActualSize(page);

            await test.step("draw", async () => {
                await pickTool(page, scenario.tool);
                await scenario.draw(page, at);
                const features = await exportFeatures(page);
                expect(features, "exactly one feature was drawn").toHaveLength(1);
                const [feature] = features as [ExportedFeature];
                expect(feature.type).toBe(scenario.type);
                expectGeometry(geometry(feature), scenario.expected, DRAW_TOLERANCE, "drawn geometry");
            });

            await test.step("select by clicking the shape", async () => {
                await pickTool(page, "select");
                await expect(page.getByText("Selected", { exact: true })).toBeHidden();
                const p = at(...scenario.grab);
                await page.mouse.click(p.x, p.y);
                await expect(page.getByText("Selected", { exact: true })).toBeVisible();
            });

            await test.step("drag it by a known offset", async () => {
                const from = at(...scenario.grab);
                await dragBetween(page, from, { x: from.x + MOVE[0], y: from.y + MOVE[1] });
                const features = await exportFeatures(page);
                expect(features).toHaveLength(1);
                expectGeometry(geometry(features[0] as ExportedFeature), moved(scenario.type, scenario.expected), MOVE_TOLERANCE, "moved geometry");
            });

            await test.step("delete from the panel", async () => {
                await page.getByRole("button", { name: "Delete", exact: true }).click();
                await expect(page.getByRole("button", { name: "Export", exact: true })).toBeDisabled();
                await expect(page.getByText("No features yet")).toBeVisible();
            });
        });
    }

    test("a click on empty canvas deselects", async ({ page }) => {
        await openEditor(page, { sample: "chessboard" });
        const { at } = await viewActualSize(page);

        await pickTool(page, "point");
        await clickAt(page, at(300, 200));
        await pickTool(page, "select");
        await clickAt(page, at(300, 200));
        await expect(page.getByText("Selected", { exact: true })).toBeVisible();

        await clickAt(page, at(700, 450));
        await expect(page.getByText("Selected", { exact: true })).toBeHidden();
    });
});

test.describe("editor view", () => {
    test("wheel zooms about the cursor, right-drag pans, fit and 1:1 reset the view", async ({ page }) => {
        await openEditor(page, { sample: "chessboard" });
        const { at } = await viewActualSize(page);
        const zoomReadout = page.getByTestId("zoom-readout");
        const pixelReadout = page.getByTestId("editor-pixel-readout");
        // The image centre: zooming about it moves no image edge, so the view is not clamped and the point stays put.
        // On a whole page pixel, because a wheel event reports its position in whole pixels.
        const centre = at(512, 288);
        const probe = { x: Math.round(centre.x), y: Math.round(centre.y) };

        await test.step("1:1 maps the pointer to image pixels", async () => {
            const p = at(300, 200);
            await page.mouse.move(p.x, p.y);
            await expect(pixelReadout).toContainText("X: 300.00");
            await expect(pixelReadout).toContainText("Y: 200.00");
        });

        await test.step("wheel zooms in and out, keeping the image point under the cursor", async () => {
            await page.mouse.move(probe.x, probe.y);
            const before = await readPixelReadout(page);

            await page.mouse.wheel(0, -600);
            await expect(async () => {
                const percent = Number.parseInt((await zoomReadout.textContent()) ?? "0", 10);
                expect(percent).toBeGreaterThan(200);
            }).toPass();
            await page.mouse.move(probe.x + 1, probe.y);
            await page.mouse.move(probe.x, probe.y);
            const after = await readPixelReadout(page);
            expect(Math.abs(after.x - before.x), "image x under the cursor").toBeLessThan(0.05);
            expect(Math.abs(after.y - before.y), "image y under the cursor").toBeLessThan(0.05);
        });

        await test.step("right-drag pans by the drag vector", async () => {
            // Zoomed in, the image is larger than the canvas, so there is room to pan (at 1:1 it fits and is held centred).
            const start = probe;
            await page.mouse.move(start.x, start.y);
            const before = await readPixelReadout(page);
            await page.mouse.down({ button: "right" });
            await page.mouse.move(start.x + 60, start.y + 40, { steps: 6 });
            await page.mouse.up({ button: "right" });

            // The image moved +60,+40 under the cursor: the same screen point reads less, by the drag over the scale.
            await page.mouse.move(start.x + 1, start.y);
            await page.mouse.move(start.x, start.y);
            const after = await readPixelReadout(page);
            const scale = Number.parseInt((await zoomReadout.textContent()) ?? "100", 10) / 100;
            expect(before.x - after.x, "image x moved under the cursor").toBeCloseTo(60 / scale, 0);
            expect(before.y - after.y, "image y moved under the cursor").toBeCloseTo(40 / scale, 0);
        });

        await test.step("fit to screen, the zoom buttons and 1:1", async () => {
            const canvasBox = await canvasOrigin(page);
            // chessboard.png is 1024x576; the stage fits it to the canvas it is in.
            const fit = Math.min(canvasBox.width / 1024, canvasBox.height / 576);
            await page.getByRole("button", { name: "Fit to screen" }).click();
            await expect(zoomReadout).toHaveText(`${Math.round(fit * 100)}%`);

            await page.getByRole("button", { name: "Zoom in" }).click();
            await expect(zoomReadout).toHaveText(`${Math.round(fit * 1.2 * 100)}%`);
            await page.getByRole("button", { name: "Zoom out" }).click();
            await expect(zoomReadout).toHaveText(`${Math.round(fit * 100)}%`);

            await page.getByRole("button", { name: "Zoom to 100%" }).click();
            await expect(zoomReadout).toHaveText("100%");
        });
    });
});
