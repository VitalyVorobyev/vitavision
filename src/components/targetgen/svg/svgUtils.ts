export function svgDocument(
    widthMm: number,
    heightMm: number,
    children: string,
): string {
    return [
        `<svg xmlns="http://www.w3.org/2000/svg"`,
        ` width="${widthMm}mm" height="${heightMm}mm"`,
        ` viewBox="0 0 ${widthMm} ${heightMm}">`,
        children,
        `</svg>`,
    ].join("");
}

export function rect(
    x: number,
    y: number,
    w: number,
    h: number,
    fill: string,
): string {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
}

export function circle(cx: number, cy: number, r: number, fill: string): string {
    return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}"/>`;
}

export function text(
    x: number,
    y: number,
    content: string,
    opts: { fontSize?: number; fill?: string; anchor?: string } = {},
): string {
    const fs = opts.fontSize ?? 3;
    const fill = opts.fill ?? "#999";
    const anchor = opts.anchor ?? "middle";
    return `<text x="${x}" y="${y}" font-size="${fs}" fill="${fill}" text-anchor="${anchor}" font-family="sans-serif">${content}</text>`;
}
