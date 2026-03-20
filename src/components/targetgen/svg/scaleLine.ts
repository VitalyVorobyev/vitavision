/**
 * Minimal reference bar (scale line) rendered at the bottom of the page.
 * Returns SVG elements as a string, or empty string if insufficient space.
 */
export function renderScaleLine(
    pageW: number,
    pageH: number,
    marginMm: number,
): string {
    // Pick a "nice" bar length based on page width
    const available = pageW - 2 * marginMm;
    const candidates = [100, 50, 20, 10];
    const barLen = candidates.find((c) => c <= available * 0.4) ?? 10;

    // Position: centered horizontally, near the bottom edge
    const capH = 1; // end cap height (mm)
    const textOffset = 2.5; // text below bar
    const bottomGap = marginMm * 0.4; // distance from bottom edge
    const barY = pageH - bottomGap;

    if (barY < pageH * 0.5) return ""; // not enough space

    const x1 = (pageW - barLen) / 2;
    const x2 = x1 + barLen;
    const strokeW = 0.3;

    const parts: string[] = [];

    // Horizontal bar
    parts.push(
        `<line x1="${x1}" y1="${barY}" x2="${x2}" y2="${barY}" stroke="#333" stroke-width="${strokeW}"/>`,
    );

    // Left end cap
    parts.push(
        `<line x1="${x1}" y1="${barY - capH / 2}" x2="${x1}" y2="${barY + capH / 2}" stroke="#333" stroke-width="${strokeW}"/>`,
    );

    // Right end cap
    parts.push(
        `<line x1="${x2}" y1="${barY - capH / 2}" x2="${x2}" y2="${barY + capH / 2}" stroke="#333" stroke-width="${strokeW}"/>`,
    );

    // Label
    const midX = (x1 + x2) / 2;
    parts.push(
        `<text x="${midX}" y="${barY + textOffset}" font-size="2" fill="#333" text-anchor="middle" font-family="sans-serif">${barLen} mm</text>`,
    );

    return parts.join("");
}
