import { describe, expect, it } from "vitest";
import { buildDeepLinkSearch, readDeepLink } from "./useEditorDeepLink";

describe("readDeepLink", () => {
    it("parses a valid sample id from the query string", () => {
        const state = readDeepLink(new URLSearchParams("sample=chessboard"));

        expect(state.sampleId).toBe("chessboard");
    });

    it("ignores unknown sample ids", () => {
        const state = readDeepLink(new URLSearchParams("sample=not-a-sample"));

        expect(state.sampleId).toBeNull();
    });
});

describe("buildDeepLinkSearch", () => {
    it("leaves a config equal to the default out of the URL", () => {
        const base = { chess: { threshold: 30 }, board: { rows: 7, cols: 9 } };
        const same = { board: { cols: 9, rows: 7 }, chess: { threshold: 30 } };
        const params = new URLSearchParams(buildDeepLinkSearch("?config=stale", "charuco", same, base));

        expect(params.get("algo")).toBe("charuco");
        expect(params.get("config")).toBeNull();
    });

    it("keeps a config that differs from the default", () => {
        const base = { chess: { threshold: 30 }, radii: [3, 5] };
        const changed = { chess: { threshold: 30 }, radii: [3, 7] };
        const params = new URLSearchParams(buildDeepLinkSearch("", "radsym", changed, base));

        expect(readDeepLink(params).config).toEqual(changed);
    });

    it("preserves the current sample parameter when updating algo and config", () => {
        const search = buildDeepLinkSearch(
            "?sample=markerboard",
            "charuco",
            { threshold: 0.2 },
        );
        const params = new URLSearchParams(search);

        expect(params.get("sample")).toBe("markerboard");
        expect(params.get("algo")).toBe("charuco");
        expect(params.get("config")).not.toBeNull();
    });

    it("drops stale config when the next config cannot be serialized", () => {
        const search = buildDeepLinkSearch(
            "?sample=chessboard&config=stale",
            "chess-corners",
            { self: globalThis },
        );
        const params = new URLSearchParams(search);

        expect(params.get("sample")).toBe("chessboard");
        expect(params.get("algo")).toBe("chess-corners");
        expect(params.has("config")).toBe(false);
    });
});
