import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { imagesRule } from "./images.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, content: string): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"] },
        content,
    };
}

function concept(file: string, content: string): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"] },
        content,
    };
}

describe("imagesRule", () => {
    it("passes when an image exists and alt text is present", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", "![a diagram](images/foo/bar.png)")],
            images: ["foo/bar.png"],
        });
        expect(imagesRule(ctx)).toEqual([]);
    });

    it("flags a missing image, an unsupported relative path, and empty alt text, across kinds", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", "![](images/foo/missing.png)")],
            concepts: [concept("c.md", "![x](../../images/escaped.png)")],
            images: [],
        });
        expect(imagesRule(ctx)).toEqual([
            { level: "error", message: "[a.md] image not found: images/foo/missing.png (expected at content/images/foo/missing.png)" },
            { level: "warning", message: "[a.md] image at offset 0 has empty alt text" },
            { level: "error", message: "[c.md] unsupported relative image path: ../../images/escaped.png (use ./images/... or images/...)" },
        ]);
    });
});
