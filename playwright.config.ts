import { defineConfig, devices } from "@playwright/test";

// The screenshot suite (lab-ui PLAN L2): the main routes of the production build,
// served by `vite preview` exactly as the prerendered pages ship.
//
//     bun run build && bun run test:screens                      # compare
//     bun run build && bun run test:screens --update-snapshots   # capture
//
// The baseline lives in e2e/.screens/ and is not committed: capture it before a
// change and compare after it on the same machine — a toolchain upgrade must not
// move a pixel. Reduced motion is emulated, so entrance animations render settled.
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
    webServer: {
        command: "bunx vite preview --port 4174 --strictPort --host 127.0.0.1",
        url: "http://127.0.0.1:4174",
        reuseExistingServer: false,
    },
});
