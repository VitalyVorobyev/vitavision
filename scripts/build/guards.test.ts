import { describe, it, expect } from "vitest";
import { checkEmptyDivGuard } from "./guards.ts";

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
