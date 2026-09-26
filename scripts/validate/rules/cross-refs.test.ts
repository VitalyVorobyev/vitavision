import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { crossRefsRule } from "./cross-refs.ts";
import { blogSlug } from "../../lib/content-kinds.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

function blog(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: blogSlug(file),
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

describe("crossRefsRule", () => {
    it("passes when relatedPosts/relatedDemos/relatedAlgorithms all resolve", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { relatedPosts: ["p1"], relatedDemos: ["d1"] })],
            blog: [blog("2020-01-01-p1.md", { relatedAlgorithms: ["a"], relatedDemos: ["d1"] })],
            demos: [demo("d1.md", { relatedAlgorithms: ["a"], relatedPosts: ["p1"] })],
        });
        expect(crossRefsRule(ctx)).toEqual([]);
    });

    it("flags unknown slugs in relatedPosts, relatedDemos, and legacy relatedAlgorithms", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { relatedPosts: ["ghost-post"], relatedDemos: ["ghost-demo"] })],
            blog: [blog("2020-01-01-p1.md", { relatedAlgorithms: ["ghost-algo"] })],
        });
        expect(crossRefsRule(ctx)).toEqual([
            { level: "error", message: "[a.md] broken relatedPosts reference: ghost-post (blog slug not found)" },
            { level: "error", message: "[a.md] broken relatedDemos reference: ghost-demo (demo slug not found)" },
            { level: "error", message: "[2020-01-01-p1.md] broken relatedAlgorithms reference: ghost-algo (atlas slug not found)" },
        ]);
    });
});
