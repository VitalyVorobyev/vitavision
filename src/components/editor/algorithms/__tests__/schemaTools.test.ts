import { shapeOf, type JsonSchema } from "@vitavision/forms";
import detectConfig from "@vitavision/ringgrid/schemas/detect_config.json";
import targetSpec from "@vitavision/ringgrid/schemas/target_spec.json";
import { describe, expect, it } from "vitest";

import { asSchema, composeSchema, hideContainers, readOnlyPaths, walkFields } from "../schemaTools";

const tiny = (defName: string): JsonSchema =>
    asSchema({
        $defs: { [defName]: { type: "object", properties: { n: { type: "integer" } } } },
        type: "object",
        properties: { inner: { $ref: `#/$defs/${defName}` } },
    });

describe("composeSchema", () => {
    it("keeps two documents' type names apart and rewrites their references", () => {
        const schema = composeSchema("both", { a: tiny("Shared"), b: tiny("Shared") });
        expect(Object.keys(schema.$defs ?? {}).sort()).toEqual(["a", "a_Shared", "b", "b_Shared"]);
        expect(schema.required).toEqual(["a", "b"]);
        expect((schema.$defs!.a!.properties!.inner as { $ref: string }).$ref).toBe("#/$defs/a_Shared");
        expect((schema.$defs!.b!.properties!.inner as { $ref: string }).$ref).toBe("#/$defs/b_Shared");
        expect(shapeOf(schema.properties!.a!, schema).kind).toBe("object");
    });

    it("puts the app's own properties first", () => {
        const schema = composeSchema("x", { b: tiny("T") }, { algorithm: { type: "string" } });
        expect(Object.keys(schema.properties ?? {})).toEqual(["algorithm", "b"]);
    });

    it("resolves a tagged variant ($ref with sibling properties) to the struct's fields in declaration order, through forms' shapeOf", () => {
        const schema = composeSchema("ring grid", { board: asSchema(targetSpec) });
        const lattice = shapeOf({ $ref: "#/$defs/board_LatticeGeometry" }, schema);
        expect(lattice.kind).toBe("tagged");
        if (lattice.kind !== "tagged") return;
        expect(lattice.discriminator).toBe("kind");
        expect(lattice.variants.map((v) => v.tag)).toEqual(["hex", "rect"]);
        expect(lattice.variants[0]!.fields.map((f) => f.key)).toEqual(["rows", "long_row_cols", "pitch_mm"]);
        expect(lattice.variants[1]!.fields.map((f) => f.key)).toEqual(["rows", "cols", "pitch_mm"]);
        expect(lattice.variants[0]!.description).toMatch(/Hexagonal/);
    });
});

describe("readOnlyPaths", () => {
    it("finds the ring-grid fields the library derives from the board", () => {
        const paths = readOnlyPaths(asSchema(detectConfig));
        expect(paths).toContain("advanced.proposal.r_min");
        expect(paths).toContain("advanced.decode.codebook_profile");
        expect(paths).toContain("advanced.completion.roi_radius_px");
        expect(paths).not.toContain("advanced.proposal.grad_threshold");
        expect(paths).toHaveLength(10);
    });
});

describe("walkFields", () => {
    it("visits union variants and skips children on request", () => {
        const schema = composeSchema("ring grid", { board: asSchema(targetSpec) });
        const seen: string[] = [];
        walkFields(schema, (path) => {
            seen.push(path);
            return path !== "board.coding";
        });
        expect(seen).toContain("board.lattice.long_row_cols");
        expect(seen).toContain("board.lattice.cols");
        expect(seen).toContain("board.coding");
        expect(seen).not.toContain("board.coding.ring_width_mm");
    });
});

describe("hideContainers", () => {
    it("hides the top-level keys no group lists whole", () => {
        const schema = composeSchema("x", { a: tiny("T"), b: tiny("T") });
        const fields = hideContainers(schema, [{ id: "g", title: "G", fields: ["a.inner.n", "b"] }]);
        expect(Object.keys(fields)).toEqual(["a"]);
    });
});
