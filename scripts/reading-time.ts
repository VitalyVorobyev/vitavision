// Strip order matters: remove structural noise before counting prose words.
// Default 220 wpm reflects typical technical reading pace (vs. 250 for fiction).
export function computeReadingTimeMinutes(markdown: string, wpm = 220): number {
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
    return Math.max(1, Math.round(words / wpm));
}
