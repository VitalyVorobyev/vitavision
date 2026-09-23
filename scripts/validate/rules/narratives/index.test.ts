import { describe, it, expect } from "vitest";
import { createContext } from "../../context.ts";
import { narrativesRule } from "./index.ts";
import type { MarkdownDirEntry } from "../../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

function narrative(file: string, overrides: Record<string, unknown>, content: string): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: {
            title: "N",
            date: "2020-01-01",
            summary: "S",
            tags: ["classical"],
            areas: [{ id: "area1", label: "Area 1" }],
            nodes: [{ id: "n1", page: "a", area: "area1" }],
            steps: [
                { title: "S1", focus: ["n1"], anchor: "intro" },
                { title: "S2", focus: ["n1"], anchor: "outro" },
            ],
            lenses: [{ id: "overview", title: "Overview", coords: { n1: [0, 0] } }],
            ...overrides,
        },
        content,
    };
}

describe("narrativesRule", () => {
    it("passes a fully-resolved narrative", async () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { sources: { primary: "paper-a" } })],
            narratives: [narrative("n.md", {}, "## Intro\ntext\n\n## Outro\ntext\n")],
            indexEntries: [{ id: "paper-a", year: 1999 }],
        });
        expect(await narrativesRule(ctx)).toEqual([]);
    });

    it("preserves nodes → edges → lenses → steps diagnostic order for one narrative", async () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { sources: { primary: "paper-a" } })],
            narratives: [
                narrative(
                    "n.md",
                    {
                        nodes: [{ id: "n1", page: "a", area: "wrong-area" }],
                        edges: [{ from: "n1", to: "n1", type: "bridge" }],
                        lenses: [],
                        steps: [
                            { title: "S1", focus: ["ghost"], anchor: "intro" },
                            { title: "S2", focus: ["n1"], anchor: "outro" },
                        ],
                    },
                    "## Intro\ntext\n\n## Outro\ntext\n",
                ),
            ],
            indexEntries: [{ id: "paper-a", year: 1999 }],
        });

        expect(await narrativesRule(ctx)).toEqual([
            { level: "error", message: '[n.md] node "n1" area "wrong-area" is not a declared area id' },
            { level: "error", message: '[n.md] self-edge on node "n1"' },
            { level: "error", message: '[n.md] narrative requires a lens with id "overview" covering all nodes' },
            { level: "error", message: '[n.md] step "S1" focus references unknown node "ghost"' },
        ]);
    });
});
