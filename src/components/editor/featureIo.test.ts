import { describe, expect, it } from "vitest";

import { readFeatureFile, serializeFeatures } from "./featureIo";
import type { Feature } from "../../store/editor/useEditorStore";

const point: Feature = { id: "p1", type: "point", source: "manual", x: 10.5, y: 20.5, color: "#ff0000" };

describe("serializeFeatures", () => {
    it("writes version 2 at the top level and strips the internal keys", () => {
        const file = serializeFeatures([point]);
        expect(file.version).toBe(2);
        expect(file.features).toEqual([{ type: "point", x: 10.5, y: 20.5, color: "#ff0000" }]);
    });
});

describe("readFeatureFile", () => {
    it("reads a version 2 file as it is", () => {
        const result = readFeatureFile({ version: 2, features: [{ type: "point", x: 10.5, y: 20.5 }] });
        expect(result.ok && result.features[0]).toMatchObject({ type: "point", x: 10.5, y: 20.5 });
    });

    it("round-trips an export", () => {
        const result = readFeatureFile(JSON.parse(JSON.stringify(serializeFeatures([point]))));
        expect(result.ok && result.features[0]).toMatchObject({ type: "point", x: 10.5, y: 20.5 });
    });

    it("shifts a version 1 file (a bare array) by -0.5", () => {
        const result = readFeatureFile([{ type: "point", x: 10.5, y: 20.5 }]);
        expect(result.ok && result.features[0]).toMatchObject({ x: 10, y: 20 });
    });

    it("treats an object without a version as version 1", () => {
        const result = readFeatureFile({ features: [{ type: "point", x: 10.5, y: 20.5 }] });
        expect(result.ok && result.features[0]).toMatchObject({ x: 10, y: 20 });
    });

    it("refuses an unknown version", () => {
        const result = readFeatureFile({ version: 3, features: [] });
        expect(result).toEqual({ ok: false, message: "Unsupported feature file version: 3." });
    });

    it("refuses something that is not a feature list", () => {
        expect(readFeatureFile("nope").ok).toBe(false);
        expect(readFeatureFile({ version: 2 }).ok).toBe(false);
        expect(readFeatureFile([{ type: "point", x: "a" }]).ok).toBe(false);
    });

    it("still reads the pre-axes directed_point shape, then shifts it as version 1", () => {
        const result = readFeatureFile([{ type: "directed_point", x: 5, y: 5, score: 1, direction: { dx: 1, dy: 0 } }]);
        expect(result.ok && result.features[0]).toMatchObject({ type: "directed_point", x: 4.5, y: 4.5 });
    });
});
