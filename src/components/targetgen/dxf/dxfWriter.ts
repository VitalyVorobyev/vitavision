/**
 * Minimal DXF R12 writer — geometry only, units in mm.
 */

export function dxfLine(x1: number, y1: number, x2: number, y2: number): string {
    return [
        "0", "LINE",
        "8", "0",
        "10", x1.toFixed(4),
        "20", y1.toFixed(4),
        "30", "0.0",
        "11", x2.toFixed(4),
        "21", y2.toFixed(4),
        "31", "0.0",
    ].join("\n");
}

export function dxfCircle(cx: number, cy: number, r: number): string {
    return [
        "0", "CIRCLE",
        "8", "0",
        "10", cx.toFixed(4),
        "20", cy.toFixed(4),
        "30", "0.0",
        "40", r.toFixed(4),
    ].join("\n");
}

/** Wrap a rectangle as 4 LINE entities. */
export function dxfRect(x: number, y: number, w: number, h: number): string[] {
    return [
        dxfLine(x, y, x + w, y),
        dxfLine(x + w, y, x + w, y + h),
        dxfLine(x + w, y + h, x, y + h),
        dxfLine(x, y + h, x, y),
    ];
}

export function buildDxf(entities: string[]): string {
    const header = [
        "0", "SECTION",
        "2", "HEADER",
        "9", "$INSUNITS",
        "70", "4",
        "0", "ENDSEC",
    ].join("\n");

    const body = [
        "0", "SECTION",
        "2", "ENTITIES",
        entities.join("\n"),
        "0", "ENDSEC",
    ].join("\n");

    return [header, body, "0", "EOF", ""].join("\n");
}
