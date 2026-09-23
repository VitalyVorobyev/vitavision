import { describe, it, expect } from "vitest";
import { checkSteps } from "./steps.ts";
import type { NarrativeFrontmatterShape } from "./shared.ts";

describe("checkSteps", () => {
    it("passes >= 2 steps whose focus and anchors all resolve", async () => {
        const fm: NarrativeFrontmatterShape = {
            steps: [
                { title: "S1", focus: ["n1"], anchor: "intro" },
                { title: "S2", focus: ["n2"], anchor: "middle" },
            ],
        };
        const content = "## Intro\ntext\n\n## Middle\ntext\n";
        const nodeIds = new Set(["n1", "n2"]);
        expect(await checkSteps("narr.md", content, fm, nodeIds)).toEqual([]);
    });

    it("flags fewer than 2 steps (belt-and-braces beyond the zod min(2))", async () => {
        const fm: NarrativeFrontmatterShape = {
            steps: [{ title: "Only", focus: ["n1"], anchor: "intro" }],
        };
        const content = "## Intro\ntext\n";
        const nodeIds = new Set(["n1"]);
        expect(await checkSteps("narr.md", content, fm, nodeIds)).toEqual([
            { level: "error", message: "[narr.md] narrative requires at least 2 steps" },
        ]);
    });

    it("flags a step focus referencing an unknown node and an anchor with no matching heading", async () => {
        const fm: NarrativeFrontmatterShape = {
            steps: [
                { title: "S1", focus: ["ghost"], anchor: "intro" },
                { title: "S2", focus: ["n2"], anchor: "missing-anchor" },
            ],
        };
        const content = "## Intro\ntext\n\n## Middle\ntext\n";
        const nodeIds = new Set(["n2"]);
        expect(await checkSteps("narr.md", content, fm, nodeIds)).toEqual([
            { level: "error", message: '[narr.md] step "S1" focus references unknown node "ghost"' },
            {
                level: "error",
                message: '[narr.md] step "S2" anchor "missing-anchor" does not resolve to a "##" heading in the body',
            },
        ]);
    });
});
