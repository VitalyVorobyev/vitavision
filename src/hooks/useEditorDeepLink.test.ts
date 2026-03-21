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
