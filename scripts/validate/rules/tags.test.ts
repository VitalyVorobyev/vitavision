import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { tagsRule } from "./tags.ts";
import { tagValues } from "../../../src/lib/content/schema.ts";

function yamlFor(slugs: readonly string[]): string {
    return `tags:\n${slugs.map((s) => `  - slug: ${s}`).join("\n")}\n`;
}

describe("tagsRule", () => {
    it("returns no diagnostics when content/tags.yaml is absent", () => {
        const ctx = createContext({});
        expect(tagsRule(ctx)).toEqual([]);
    });

    it("passes when tags.yaml matches tagValues exactly", () => {
        const ctx = createContext({ tagsYaml: yamlFor(tagValues) });
        expect(tagsRule(ctx)).toEqual([]);
    });

    it("flags a slug present in tags.yaml but missing from tagValues", () => {
        const ctx = createContext({ tagsYaml: yamlFor([...tagValues, "bogus-tag"]) });
        expect(tagsRule(ctx)).toEqual([
            {
                level: "error",
                message: '[content/tags.yaml] slug "bogus-tag" is in tags.yaml but missing from tagValues in schema.ts',
            },
        ]);
    });

    it("flags a tagValues entry missing from tags.yaml", () => {
        const [, ...rest] = tagValues;
        const ctx = createContext({ tagsYaml: yamlFor(rest) });
        expect(tagsRule(ctx)).toEqual([
            {
                level: "error",
                message: `[schema.ts] tag "${tagValues[0]}" is in tagValues but missing from content/tags.yaml`,
            },
        ]);
    });
});
