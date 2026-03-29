import { describe, expect, it } from "vitest";
import { algorithmHtmlLoaders } from "./generated/algorithm-loaders.ts";
import { blogHtmlLoaders } from "./generated/blog-loaders.ts";
import { render } from "./entry-server";

describe("entry-server blog prerender", () => {
    it("renders blog post HTML instead of the loading spinner", async () => {
        const post = await blogHtmlLoaders["00-intro"]();
        const html = render("/blog/00-intro", {
            blogHtmlBySlug: { "00-intro": post.html },
            algorithmHtmlBySlug: {},
        });

        expect(html).toContain("Introducing Vitavision");
        expect(html).toContain("Vitavision is a place for practical computer vision");
        expect(html).not.toContain("animate-spin");
    });
});

describe("entry-server algorithm prerender", () => {
    it("renders algorithm page HTML instead of the loading spinner", async () => {
        const page = await algorithmHtmlLoaders["harris-corner-detector"]();
        const html = render("/algorithms/harris-corner-detector", {
            blogHtmlBySlug: {},
            algorithmHtmlBySlug: { "harris-corner-detector": page.html },
        });

        expect(html).toContain("Harris Corner Detector");
        expect(html).toContain("repeatable image points where intensity changes strongly");
        expect(html).not.toContain("animate-spin");
    });
});
