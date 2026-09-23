import { describe, it, expect } from "vitest";
import { createContext } from "../context.ts";
import { linksRule } from "./links.ts";
import type { MarkdownDirEntry } from "../../lib/content-kinds.ts";

function algo(file: string, content: string): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: { title: "T", date: "2020-01-01", summary: "S", tags: ["classical"] },
        content,
    };
}

function narrative(file: string, content: string): MarkdownDirEntry {
    return {
        file,
        slug: file.replace(/\.md$/, ""),
        data: {
            title: "T",
            date: "2020-01-01",
            summary: "S",
            tags: ["cv"],
            areas: [{ id: "a1", label: "Area" }],
            nodes: [{ id: "n1", question: "What?", area: "a1" }],
            steps: [
                { focus: ["n1"], title: "Step 1", anchor: "chapter-one" },
                { focus: ["n1"], title: "Step 2", anchor: "chapter-one" },
            ],
        },
        content,
    };
}

describe("linksRule", () => {
    it("passes for a valid atlas link, a static route, and a resolvable anchor", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", "See [B](/atlas/b) and [home](/) and [B intro](/atlas/b#introduction)."),
                algo("b.md", "## Introduction\nbody"),
            ],
        });
        expect(linksRule(ctx)).toEqual([]);
    });

    it("flags an unknown atlas slug, an unknown path prefix, and an unresolved anchor (warning)", () => {
        const ctx = createContext({
            algorithms: [
                algo("a.md", "[ghost](/atlas/ghost) [x](/some/random/path) [B bad anchor](/atlas/b#nope)"),
                algo("b.md", "## Real Heading\nbody"),
            ],
        });
        expect(linksRule(ctx)).toEqual([
            { level: "error", message: "[a.md] broken link: /atlas/ghost (atlas slug not found)" },
            { level: "error", message: "[a.md] unknown path prefix: /some/random/path" },
            { level: "warning", message: '[a.md] broken link: /atlas/b#nope (anchor "#nope" not found on atlas page "b")' },
        ]);
    });

    it("warns on a legacy /algorithms/<slug> link but resolves a valid /atlas/narratives/<slug> link", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", "[old](/algorithms/foo) [n](/atlas/narratives/story)")],
            narratives: [narrative("story.md", "## Chapter One\nbody")],
        });
        expect(linksRule(ctx)).toEqual([
            { level: "warning", message: "[a.md] legacy link, use /atlas/…: /algorithms/foo" },
        ]);
    });

    it("skips code-fenced and inline-code links, and ignores same-page anchors", () => {
        const ctx = createContext({
            algorithms: [algo("a.md", "```\n[fake](/atlas/ghost)\n```\ninline `[x](/atlas/ghost)` code, and [same page](#section)")],
        });
        expect(linksRule(ctx)).toEqual([]);
    });
});
