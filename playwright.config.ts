import { defineConfig, devices } from "@playwright/test";

// Browser suites against the production build, served by `vite preview` exactly as the
// prerendered pages ship. Build first: `bun run build`.
//
// Three projects:
//
//   screens    Screenshot suites: the main routes (screens.spec.ts) and the editor canvas
//              after each algorithm (editor-visual.spec.ts). Opt-in, not a CI gate.
//                bun run test:screens                      # compare
//                bun run test:screens --update-snapshots   # capture
//              The baseline lives in e2e/.screens/ and is not committed: capture it before a
//              change and compare after it on the same machine, so a toolchain upgrade or a
//              renderer migration must not move a pixel. Reduced motion is emulated, so
//              entrance animations render settled.
//
//   e2e        Behavioural editor specs (editor-algorithms, editor-drawing). They assert on
//              exported feature data and on-screen readouts, never on pixels or renderer
//              internals, so the same specs pass before and after a canvas-renderer change.
//                bun run test:e2e
//
//   e2e-touch  The touch variant of the editor specs (editor-touch): a tablet-sized,
//              touch-primary viewport, where the editor switches to its touch layout.
//              Run by `bun run test:e2e` as well.
export default defineConfig({
    testDir: "./e2e",
    snapshotPathTemplate: "{testDir}/.screens/{arg}{ext}",
    fullyParallel: false,
    workers: 1,
    reporter: [["list"]],
    expect: { toHaveScreenshot: { maxDiffPixelRatio: 0.001, animations: "disabled" } },
    use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        baseURL: "http://127.0.0.1:4174",
        contextOptions: { reducedMotion: "reduce" },
    },
    projects: [
        {
            name: "screens",
            testMatch: ["screens.spec.ts", "editor-visual.spec.ts"],
        },
        {
            name: "e2e",
            testMatch: ["editor-algorithms.spec.ts", "editor-drawing.spec.ts"],
        },
        {
            name: "e2e-touch",
            testMatch: ["editor-touch.spec.ts"],
            use: {
                ...devices["Desktop Chrome"],
                viewport: { width: 1024, height: 768 },
                isMobile: true,
                hasTouch: true,
                baseURL: "http://127.0.0.1:4174",
                contextOptions: { reducedMotion: "reduce" },
            },
        },
    ],
    webServer: {
        command: "bunx vite preview --port 4174 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:4174",
        reuseExistingServer: false,
    },
});
