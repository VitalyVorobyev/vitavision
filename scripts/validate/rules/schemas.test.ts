import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { schemasRule } from "./schemas.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function blog(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["cv"], ...overrides },
        content: "body",
    };
}

function demo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["cv"], ...overrides },
        content: "body",
    };
}

describe("schemasRule", () => {
    it("passes for valid blog and demo frontmatter", () => {
        const ctx = createContext({
            blog: [blog("2020-01-01-post.md")],
            demos: [demo("thing.md")],
        });
        expect(schemasRule(ctx)).toEqual([]);
    });

    it("flags missing required fields on a blog post", () => {
        const ctx = createContext({
            blog: [blog("2020-01-01-post.md", { title: undefined, tags: [] })],
        });
        expect(schemasRule(ctx)).toEqual([
            {
                level: "error",
                message: "[2020-01-01-post.md] blog frontmatter: title — Invalid input: expected string, received undefined",
            },
            {
                level: "error",
                message: "[2020-01-01-post.md] blog frontmatter: tags — Too small: expected array to have >=1 items",
            },
        ]);
    });

    it("flags a malformed demo page", () => {
        const ctx = createContext({
            demos: [demo("thing.md", { category: "not-a-real-category" })],
        });
        expect(schemasRule(ctx)).toEqual([
            {
                level: "error",
                message: '[thing.md] demo frontmatter: category — Invalid option: expected one of "interactive-figure"|"tool"|"playground"',
            },
        ]);
    });
});
