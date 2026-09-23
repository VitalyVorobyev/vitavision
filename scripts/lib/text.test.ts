import { describe, it, expect } from "vitest";
import {
    stripTrailingPunctuation,
    normalizeArxivId,
    normalizeDoiText,
    normalizeDoiUrl,
    normalizeTitle,
    deaccent,
} from "./text.ts";

describe("stripTrailingPunctuation", () => {
    it("strips trailing punctuation", () => {
        expect(stripTrailingPunctuation("1706.03762).")).toBe("1706.03762");
    });

    it("leaves a clean string untouched", () => {
        expect(stripTrailingPunctuation("1706.03762")).toBe("1706.03762");
    });
});

describe("normalizeArxivId", () => {
    it("drops the arxiv: prefix, .pdf suffix, and version suffix", () => {
        expect(normalizeArxivId("arXiv:1706.03762v2.pdf")).toBe("1706.03762");
    });

    it("lowercases and strips trailing punctuation", () => {
        expect(normalizeArxivId("1706.03762).")).toBe("1706.03762");
    });
});

describe("normalizeDoiText", () => {
    it("strips trailing punctuation and lowercases", () => {
        expect(normalizeDoiText("10.1109/ABC.2020.1234).")).toBe("10.1109/abc.2020.1234");
    });

    it("does not strip a doi.org URL prefix", () => {
        expect(normalizeDoiText("https://doi.org/10.1109/abc")).toBe("https://doi.org/10.1109/abc");
    });
});

describe("normalizeDoiUrl", () => {
    it("strips a doi.org URL prefix and lowercases", () => {
        expect(normalizeDoiUrl("https://doi.org/10.1109/ABC")).toBe("10.1109/abc");
    });

    it("lowercases a bare DOI unchanged otherwise", () => {
        expect(normalizeDoiUrl("10.1109/ABC")).toBe("10.1109/abc");
    });

    it("does not strip trailing punctuation", () => {
        expect(normalizeDoiUrl("10.1109/abc.")).toBe("10.1109/abc.");
    });
});

describe("normalizeTitle", () => {
    it("lowercases and strips all non-alphanumeric characters", () => {
        expect(normalizeTitle("A Flexible New Technique for Camera Calibration")).toBe(
            "aflexiblenewtechniqueforcameracalibration",
        );
    });
});

describe("deaccent", () => {
    it("strips combining diacritical marks", () => {
        expect(deaccent("Zhengyou Zháng")).toBe("Zhengyou Zhang");
    });

    it("leaves a plain-ASCII name unchanged", () => {
        expect(deaccent("Roger Tsai")).toBe("Roger Tsai");
    });
});
