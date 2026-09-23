import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { implementationsRule } from "./implementations.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function model(file: string, overrides: Record<string, unknown> = {}, content = "body text"): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content,
    };
}

const validImpl = {
    role: "official",
    repo: "https://github.com/foo/bar",
    commit: "abcdef1",
    framework: "pytorch",
    license: "MIT",
};

describe("implementationsRule", () => {
    it("passes a non-draft model with implementations[]", () => {
        const ctx = createContext({ models: [model("m.md", { implementations: [validImpl] })] });
        expect(implementationsRule(ctx)).toEqual([]);
    });

    it("passes noPublicImpl: true with a non-empty ## Limitations section", () => {
        const ctx = createContext({
            models: [
                model(
                    "m.md",
                    { noPublicImpl: true },
                    "# M\n\n## Limitations\n\nNo public code is available for this model.\n",
                ),
            ],
        });
        expect(implementationsRule(ctx)).toEqual([]);
    });

    it("flags a non-draft model with no implementations[] and no noPublicImpl", () => {
        const ctx = createContext({ models: [model("m.md")] });
        expect(implementationsRule(ctx)).toEqual([
            {
                level: "error",
                message: "[m.md] model page is not draft but has no implementations[] entry (and noPublicImpl is not set)",
            },
        ]);
    });

    it("flags noPublicImpl: true with no ## Limitations heading", () => {
        const ctx = createContext({
            models: [model("m.md", { noPublicImpl: true }, "# M\n\nNo limitations section here.\n")],
        });
        expect(implementationsRule(ctx)).toEqual([
            { level: "error", message: "[m.md] noPublicImpl: true requires a ## Limitations section" },
        ]);
    });

    it("flags noPublicImpl: true with an empty ## Limitations section", () => {
        const ctx = createContext({
            models: [model("m.md", { noPublicImpl: true }, "# M\n\n## Limitations\n\n## Next\nbody\n")],
        });
        expect(implementationsRule(ctx)).toEqual([
            { level: "error", message: "[m.md] noPublicImpl: true requires a non-empty ## Limitations section" },
        ]);
    });
});
