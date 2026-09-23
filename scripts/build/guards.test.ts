import { describe, it, expect } from "vitest";
import { checkEmptyDivGuard, checkModelImplementationsGuard } from "./guards.ts";

describe("checkEmptyDivGuard", () => {
    it("passes silently when no page contains an empty div", () => {
        expect(() =>
            checkEmptyDivGuard([
                { slug: "a", html: "<div class=\"vv-block\">content</div>" },
                { slug: "b", html: "<p>text</p>" },
            ]),
        ).not.toThrow();
    });

    it("throws naming every offending slug and its occurrence count", () => {
        expect(() =>
            checkEmptyDivGuard([
                { slug: "a", html: "<div></div>" },
                { slug: "b", html: "<p>ok</p>" },
                { slug: "c", html: "<div></div><div></div>" },
            ]),
        ).toThrow(/a: 1 occurrence\(s\).*c: 2 occurrence\(s\)/s);
    });
});

describe("checkModelImplementationsGuard", () => {
    it("passes a published page with an implementations entry", () => {
        expect(() =>
            checkModelImplementationsGuard([{ slug: "alexnet", frontmatter: { implementations: [{ role: "official" }] } }]),
        ).not.toThrow();
    });

    it("passes a draft page with no implementations", () => {
        expect(() =>
            checkModelImplementationsGuard([{ slug: "draft-model", frontmatter: { draft: true } }]),
        ).not.toThrow();
    });

    it("passes a dev page with no implementations", () => {
        expect(() =>
            checkModelImplementationsGuard([{ slug: "dev-model", frontmatter: { dev: true } }]),
        ).not.toThrow();
    });

    it("passes a page declaring noPublicImpl", () => {
        expect(() =>
            checkModelImplementationsGuard([{ slug: "no-impl-model", frontmatter: { noPublicImpl: true } }]),
        ).not.toThrow();
    });

    it("throws for a published, non-dev page with no implementations and no noPublicImpl", () => {
        expect(() =>
            checkModelImplementationsGuard([{ slug: "bare-model", frontmatter: {} }]),
        ).toThrow(/bare-model.*implementations/);
    });

    it("throws for a page with an empty implementations array", () => {
        expect(() =>
            checkModelImplementationsGuard([{ slug: "empty-impl", frontmatter: { implementations: [] } }]),
        ).toThrow(/empty-impl/);
    });
});
