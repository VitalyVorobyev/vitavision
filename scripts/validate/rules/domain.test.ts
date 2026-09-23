import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { domainRule } from "./domain.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, overrides: Record<string, unknown> = {}): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"], ...overrides },
        content: "body",
    };
}

describe("domainRule", () => {
    it("passes a non-draft page with domain set", () => {
        const ctx = createContext({ algorithms: [algo("a.md", { domain: "features" })] });
        expect(domainRule(ctx)).toEqual([]);
    });

    it("passes a draft page with no domain", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", { draft: true })],
            includeDrafts: true,
        });
        expect(domainRule(ctx)).toEqual([]);
    });

    it("flags a non-draft page with no domain", () => {
        const ctx = createContext({ algorithms: [algo("a.md")] });
        expect(domainRule(ctx)).toEqual([
            { level: "error", message: "[a.md] non-draft page must set domain" },
        ]);
    });
});
