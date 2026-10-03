import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { expect, test } from "@playwright/test";

import { ALGORITHM_SAMPLES, exportFeatures, openEditor, runAlgorithm, type ExportedFeature } from "./helpers/editor";

// Behavioural regression test for the editor's algorithm runs, renderer-agnostic.
//
// For each registered algorithm: open /editor?algo=<id>&sample=<sample> (the sample the
// "Try in the editor" CTA uses), click Run, wait for the results panel, then export the
// features through the app's own Export button and assert on the DATA - total count, count
// per feature type, and the first three feature positions - against the committed fixture
// e2e/fixtures/editor-algorithm-counts.json. No pixels, no canvas internals.
//
// Fixture workflow
//   UPDATE_E2E_FIXTURES=1 bun run test:e2e     # (re)write the fixture from the current app
//   bun run test:e2e                           # compare exactly (counts) / within tolerance (positions)
//
// Position tolerance
//   E2E_COORD_TOL     absolute tolerance on x and y, default 1e-6.
//   E2E_COORD_OFFSET  offset ADDED to each fixture coordinate before comparing, default 0.
//                     A renderer migration that changes the half-pixel convention shifts all
//                     exported coordinates by -0.5 px: run the new build with
//                     E2E_COORD_OFFSET=-0.5 against the fixture captured before it.
//                     (Counts and feature kinds must still match exactly.)

const FIXTURE_PATH = join(dirname(fileURLToPath(import.meta.url)), "fixtures", "editor-algorithm-counts.json");
const UPDATE = process.env.UPDATE_E2E_FIXTURES === "1";
const TOLERANCE = Number(process.env.E2E_COORD_TOL ?? "1e-6");
const OFFSET = Number(process.env.E2E_COORD_OFFSET ?? "0");

interface Position {
    type: string;
    x: number;
    y: number;
}

interface AlgorithmFixture {
    sample: string;
    total: number;
    kinds: Record<string, number>;
    firstPositions: Position[];
}

type Fixture = Record<string, AlgorithmFixture>;

/** Anchor position of a feature: its x/y, or its first vertex for point-list shapes. */
function anchor(feature: ExportedFeature): { x: number; y: number } {
    const { x, y, points } = feature as { x?: unknown; y?: unknown; points?: unknown };
    if (typeof x === "number" && typeof y === "number") return { x, y };
    if (Array.isArray(points) && typeof points[0] === "number" && typeof points[1] === "number") {
        return { x: points[0], y: points[1] };
    }
    throw new Error(`feature of type ${feature.type} has no anchor position`);
}

function summarise(sample: string, features: ExportedFeature[]): AlgorithmFixture {
    const kinds: Record<string, number> = {};
    for (const feature of features) kinds[feature.type] = (kinds[feature.type] ?? 0) + 1;
    return {
        sample,
        total: features.length,
        kinds: Object.fromEntries(Object.entries(kinds).sort(([a], [b]) => a.localeCompare(b))),
        firstPositions: features.slice(0, 3).map((feature) => ({ type: feature.type, ...anchor(feature) })),
    };
}

function expectNear(actual: number | undefined, expected: number, label: string): void {
    expect(actual, label).toBeDefined();
    expect(Math.abs((actual ?? Number.NaN) - expected), `${label}: ${actual} vs ${expected} (tolerance ${TOLERANCE})`)
        .toBeLessThanOrEqual(TOLERANCE);
}

function readFixture(): Fixture {
    try {
        return JSON.parse(readFileSync(FIXTURE_PATH, "utf8")) as Fixture;
    } catch {
        return {};
    }
}

test.describe("editor algorithm runs", () => {
    for (const [algo, { sample, title }] of Object.entries(ALGORITHM_SAMPLES)) {
        test(`${algo} on the ${sample} sample`, async ({ page }) => {
            await openEditor(page, { algo, sample });
            await runAlgorithm(page, title);

            const features = await exportFeatures(page);
            const actual = summarise(sample, features);
            expect(actual.total, "the run produced features").toBeGreaterThan(0);

            if (UPDATE) {
                // Keep registry order so the committed diff stays reviewable.
                const merged = { ...readFixture(), [algo]: actual };
                const ordered = Object.fromEntries(
                    Object.keys(ALGORITHM_SAMPLES).filter((id) => id in merged).map((id) => [id, merged[id]]),
                );
                writeFileSync(FIXTURE_PATH, `${JSON.stringify(ordered, null, 2)}\n`);
                return;
            }

            const expected = readFixture()[algo];
            expect(expected, `fixture entry for ${algo} (generate with UPDATE_E2E_FIXTURES=1)`).toBeDefined();
            if (!expected) return;

            expect(actual.sample).toBe(expected.sample);
            expect(actual.total).toBe(expected.total);
            expect(actual.kinds).toEqual(expected.kinds);

            expect(actual.firstPositions).toHaveLength(expected.firstPositions.length);
            expected.firstPositions.forEach((want, index) => {
                const got = actual.firstPositions[index];
                expect(got?.type, `feature ${index} type`).toBe(want.type);
                expectNear(got?.x, want.x + OFFSET, `feature ${index} x`);
                expectNear(got?.y, want.y + OFFSET, `feature ${index} y`);
            });
        });
    }
});
