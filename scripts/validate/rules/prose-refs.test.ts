import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { proseRefsRule } from "./prose-refs.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}, content = "body"): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content,
    };
}

describe("proseRefsRule", () => {
    it("passes when a cited arXiv id is in the papers index", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", {}, "See arXiv:1234.5678 for details.")],
            indexEntries: [{ id: "p1", arxiv: "1234.5678" }],
        });
        expect(proseRefsRule(ctx)).toEqual([]);
    });

    it("warns on a cited arXiv id absent from the papers index", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", {}, "See arXiv:9999.9999 for details.")],
        });
        expect(proseRefsRule(ctx)).toEqual([
            {
                level: "warning",
                message: "[algorithm/a] prose reference not in papers index: arXiv:9999.9999",
            },
        ]);
    });
});
