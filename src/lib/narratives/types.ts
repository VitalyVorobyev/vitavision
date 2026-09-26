import type { NarrativeFrontmatter } from "../content/schema.ts";

/** One entry of a narrative's guided walkthrough: which nodes to focus, and which chapter to read. */
export type NarrativeStep = NarrativeFrontmatter["steps"][number];
