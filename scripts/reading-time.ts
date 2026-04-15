// Strip order matters: remove structural noise before counting prose words.
// Default 180 wpm reflects a math-heavy technical reading pace where readers
// pause on equations and figures (vs. 220 for lighter technical prose).
export interface ReadingTimeOptions {
    wpm?: number;
    displayMathSeconds?: number;
    inlineMathSeconds?: number;
    imageSeconds?: number;
}

export function computeReadingTimeMinutes(markdown: string, options: ReadingTimeOptions | number = {}): number {
    const opts: ReadingTimeOptions = typeof options === "number" ? { wpm: options } : options;
    const wpm = opts.wpm ?? 180;
    const displayMathSeconds = opts.displayMathSeconds ?? 10;
    const inlineMathSeconds = opts.inlineMathSeconds ?? 2;
    const imageSeconds = opts.imageSeconds ?? 8;

    // Count visual/structural elements before stripping them.
    const displayMathCount = (markdown.match(/\$\$[\s\S]*?\$\$/g) ?? []).length;
    const inlineMathCount = (markdown.match(/(?<!\$)\$[^$\n]+\$(?!\$)/g) ?? []).length;
    const imageCount = (markdown.match(/!\[[^\]]*\]\([^)]*\)/g) ?? []).length;

    let text = markdown;
    // 1. Fenced code blocks
    text = text.replace(/```[\s\S]*?```/g, " ");
    // 2. Display math (must precede inline math to avoid partial matches)
    text = text.replace(/\$\$[\s\S]*?\$\$/g, " ");
    // 3. Inline math
    text = text.replace(/\$[^$\n]+\$/g, " ");
    // 4. Container directives (:::name … :::)
    text = text.replace(/^:::[^\n]*\n[\s\S]*?^:::\s*$/gm, " ");
    // 5. Inline directives — replace with body text to preserve any prose words inside
    text = text.replace(/:[a-zA-Z][\w-]*(?:\[[^\]]*\])?(?:\{([^}]*)\})?/g, (_m, body?: string) => body ?? "");
    // 6. Inline code
    text = text.replace(/`[^`\n]+`/g, " ");
    // 7. HTML tags
    text = text.replace(/<[^>]+>/g, " ");
    // 8. Markdown links/images — keep label text
    text = text.replace(/!?\[([^\]]*)\]\([^)]*\)/g, "$1");
    // 9. Emphasis markers
    text = text.replace(/[*_~]+/g, " ");

    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const proseMinutes = words / wpm;
    const extraMinutes =
        (displayMathCount * displayMathSeconds +
            inlineMathCount * inlineMathSeconds +
            imageCount * imageSeconds) /
        60;
    return Math.max(1, Math.round(proseMinutes + extraMinutes));
}
