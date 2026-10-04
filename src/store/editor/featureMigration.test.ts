import { describe, expect, it } from "vitest";

import { migrateFeaturesV1 } from "./featureMigration";
import type { Feature } from "./editorTypes";

const base = { source: "manual" as const };

const migrateOne = (feature: Feature): Feature => {
    const [migrated] = migrateFeaturesV1([feature]);
    return migrated!;
};

describe("migrateFeaturesV1", () => {
    it("shifts a point", () => {
        expect(migrateOne({ ...base, id: "p", type: "point", x: 10.5, y: 20.5 })).toMatchObject({ x: 10, y: 20 });
    });

    it("shifts every vertex of a line, polyline and polygon", () => {
        expect(migrateOne({ ...base, id: "l", type: "line", points: [1, 2, 3, 4] })).toMatchObject({ points: [0.5, 1.5, 2.5, 3.5] });
        expect(migrateOne({ ...base, id: "pl", type: "polyline", points: [1, 2, 3, 4, 5, 6] })).toMatchObject({
            points: [0.5, 1.5, 2.5, 3.5, 4.5, 5.5],
        });
        expect(migrateOne({ ...base, id: "pg", type: "polygon", points: [0, 0, 4, 0, 4, 4], closed: true })).toMatchObject({
            points: [-0.5, -0.5, 3.5, -0.5, 3.5, 3.5],
            closed: true,
        });
    });

    it("shifts a bbox's corner and keeps its size and rotation", () => {
        expect(migrateOne({ ...base, id: "b", type: "bbox", x: 100, y: 50, width: 30, height: 20, rotation: 15 })).toMatchObject({
            x: 99.5,
            y: 49.5,
            width: 30,
            height: 20,
            rotation: 15,
        });
    });

    it("shifts an ellipse's centre and keeps its radii and rotation", () => {
        expect(migrateOne({ ...base, id: "e", type: "ellipse", x: 100, y: 50, radiusX: 30, radiusY: 20, rotation: -40 })).toMatchObject({
            x: 99.5,
            y: 49.5,
            radiusX: 30,
            radiusY: 20,
            rotation: -40,
        });
    });

    it("shifts a directed point and keeps its axes", () => {
        const axes: [{ dx: number; dy: number }, { dx: number; dy: number }] = [{ dx: 1, dy: 0 }, { dx: 0, dy: 1 }];
        const migrated = migrateOne({ ...base, id: "d", type: "directed_point", x: 7, y: 9, axes, score: 0.5 });
        expect(migrated).toMatchObject({ x: 6.5, y: 8.5, axes, score: 0.5 });
    });

    it("shifts a ring marker's centre but not its ellipses, which version 1 stored native", () => {
        const migrated = migrateOne({
            ...base,
            id: "r",
            type: "ring_marker",
            x: 50.5,
            y: 60.5,
            outerEllipse: { cx: 50, cy: 60, a: 12, b: 10, angleDeg: 30 },
            innerEllipse: { cx: 51, cy: 61, a: 6, b: 5, angleDeg: 31 },
        });
        expect(migrated).toMatchObject({
            x: 50,
            y: 60,
            outerEllipse: { cx: 50, cy: 60, a: 12, b: 10, angleDeg: 30 },
            innerEllipse: { cx: 51, cy: 61, a: 6, b: 5, angleDeg: 31 },
        });
    });

    it("leaves PuzzleBoard detections alone: version 1 already stored them native", () => {
        const corner: Feature = {
            id: "p",
            type: "point",
            x: 12.25,
            y: 40.75,
            source: "algorithm",
            algorithmId: "puzzleboard",
            runId: "run-1",
            readonly: true,
        };
        expect(migrateOne(corner)).toEqual(corner);
    });

    it("shifts an ArUco marker's centre and all four corners", () => {
        const migrated = migrateOne({
            ...base,
            id: "a",
            type: "aruco_marker",
            x: 10,
            y: 10,
            corners: [0, 0, 20, 0, 20, 20, 0, 20],
        });
        expect(migrated).toMatchObject({ x: 9.5, y: 9.5, corners: [-0.5, -0.5, 19.5, -0.5, 19.5, 19.5, -0.5, 19.5] });
    });

    it("shifts a circle's centre and keeps its radius", () => {
        expect(migrateOne({ ...base, id: "c", type: "circle", x: 5, y: 6, radius: 3, score: 0.9 })).toMatchObject({
            x: 4.5,
            y: 5.5,
            radius: 3,
            score: 0.9,
        });
    });

    it("shifts a labeled point and keeps its grid index and board millimetres", () => {
        const migrated = migrateOne({
            ...base,
            id: "lp",
            type: "labeled_point",
            x: 33,
            y: 44,
            score: 0.8,
            gridIndex: { i: 2, j: 3 },
            masterId: 7,
            targetPosMm: { x: 12, y: 18 },
        });
        expect(migrated).toMatchObject({ x: 32.5, y: 43.5, gridIndex: { i: 2, j: 3 }, masterId: 7, targetPosMm: { x: 12, y: 18 } });
    });

    it("leaves board millimetres in meta alone and does not mutate its input", () => {
        const input: Feature = {
            ...base,
            id: "p",
            type: "point",
            x: 1,
            y: 1,
            meta: { targetPosition: { x: 5, y: 6 }, grid: { i: 0, j: 1 } },
        };
        const snapshot = structuredClone(input);
        const migrated = migrateOne(input);
        expect(migrated.meta).toEqual(input.meta);
        expect(input).toEqual(snapshot);
    });

    it("migrates a whole list in order", () => {
        const migrated = migrateFeaturesV1([
            { ...base, id: "1", type: "point", x: 1, y: 1 },
            { ...base, id: "2", type: "point", x: 2, y: 2 },
        ]);
        expect(migrated.map((f) => f.id)).toEqual(["1", "2"]);
        expect(migrated.map((f) => (f.type === "point" ? f.x : NaN))).toEqual([0.5, 1.5]);
    });
});
