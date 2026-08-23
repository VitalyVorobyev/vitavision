import { describe, expect, it } from "vitest";
import type { AuthorRef } from "../../generated/authors-index.ts";
import { resolveAuthorIds } from "./authorLinks.ts";

const authorsById: Record<string, AuthorRef> = {
    A1: { name: "Dániel Baráth", papers: [] },
    A2: { name: "Jiřı́ Matas", papers: [] },
    A3: { name: "Peter Fuersattel", papers: [] },
    A4: { name: "Christian Rieß", papers: [] },
    A5: { name: "Kaiming He", papers: [] },
    A6: { name: "Xiangyu Zhang", papers: [] },
    A7: { name: "Zhaowei Zhang", papers: [] },
};

describe("resolveAuthorIds", () => {
    it("aligns positionally when both arrays agree", () => {
        expect(resolveAuthorIds(["K. He", "X. Zhang"], ["A5", "A6"], authorsById)).toEqual(["A5", "A6"]);
    });

    it("skips display authors OpenAlex dropped instead of shifting the rest", () => {
        // MAGSAC: 3 display authors, only 2 ids — a positional zip would credit
        // "J. Noskova" to Matas.
        expect(
            resolveAuthorIds(["D. Barath", "J. Matas", "J. Noskova"], ["A1", "A2"], authorsById),
        ).toEqual(["A1", "A2", undefined]);
    });

    it("matches German transliterations across the two spellings", () => {
        expect(resolveAuthorIds(["P. Fürsattel", "C. Riess"], ["A3", "A4"], authorsById)).toEqual([
            "A3",
            "A4",
        ]);
    });

    it("disambiguates a repeated surname by first initial and never reuses an id", () => {
        expect(resolveAuthorIds(["Z. Zhang", "X. Zhang"], ["A6", "A7"], authorsById)).toEqual([
            "A7",
            "A6",
        ]);
    });

    it("returns all-undefined when the paper has no author ids", () => {
        expect(resolveAuthorIds(["K. He"], undefined, authorsById)).toEqual([undefined]);
        expect(resolveAuthorIds(["K. He"], [], authorsById)).toEqual([undefined]);
    });
});
