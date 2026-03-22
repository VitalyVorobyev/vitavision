import { describe, expect, it } from "vitest";
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
