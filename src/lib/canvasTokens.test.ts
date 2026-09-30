import { describe, expect, it } from "vitest";

import { readCanvasTokens, scoreTone, withAlpha } from "./canvasTokens";

describe("withAlpha", () => {
    it("appends an alpha byte to a six-digit hex colour, clamped to [0, 1]", () => {
        expect(withAlpha("#2db2d4", 0.5)).toBe("#2db2d480");
        expect(withAlpha("#2db2d4", 0)).toBe("#2db2d400");
        expect(withAlpha("#2db2d4", 2)).toBe("#2db2d4ff");
    });

    it("returns any other colour form unchanged", () => {
        expect(withAlpha("oklch(0.7 0.1 200)", 0.5)).toBe("oklch(0.7 0.1 200)");
        expect(withAlpha("transparent", 0.5)).toBe("transparent");
    });
});

describe("scoreTone", () => {
    it("grades a score into the verdict tones", () => {
        expect(scoreTone(0.9)).toBe("normal");
        expect(scoreTone(0.66)).toBe("normal");
        expect(scoreTone(0.5)).toBe("warn");
        expect(scoreTone(0.33)).toBe("warn");
        expect(scoreTone(0.1)).toBe("defect");
    });
});

describe("readCanvasTokens", () => {
    it("reads every token as transparent when no stylesheet defines them", () => {
        const tokens = readCanvasTokens("page");
        expect(Object.values(tokens).every((value) => value === "transparent")).toBe(true);
    });

    it("resolves a token the document defines", () => {
        document.documentElement.style.setProperty("--signal", "#235159");
        try {
            expect(readCanvasTokens("page").signal).toBe("#235159");
        } finally {
            document.documentElement.style.removeProperty("--signal");
        }
    });
});
