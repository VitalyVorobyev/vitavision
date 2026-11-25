/**
 * DXF LINE entity writer, units in mm. Only the app-side scale-line overlay is
 * written here; the target geometry itself comes from the WASM renderers.
 */

const DXF_BLACK_ACI = 7;
const DXF_WHITE_ACI = 255;

const DXF_TRUE_BLACK = 0;
const DXF_TRUE_WHITE = 0xffffff;

function formatNumber(value: number): string {
    const normalized = Math.abs(value) < 1e-9 ? 0 : value;
    return normalized.toFixed(4);
}

function colorGroups(color: number): string[] {
    const groups = ["8", "0", "62", String(color)];

    if (color === DXF_BLACK_ACI) {
        groups.push("420", String(DXF_TRUE_BLACK));
    } else if (color === DXF_WHITE_ACI) {
        groups.push("420", String(DXF_TRUE_WHITE));
    }

    return groups;
}

export function dxfLine(x1: number, y1: number, x2: number, y2: number, color = DXF_BLACK_ACI): string {
    return [
        "0",
        "LINE",
        "100",
        "AcDbEntity",
        ...colorGroups(color),
        "100",
        "AcDbLine",
        "10",
        formatNumber(x1),
        "20",
        formatNumber(y1),
        "30",
        "0.0",
        "11",
        formatNumber(x2),
        "21",
        formatNumber(y2),
        "31",
        "0.0",
    ].join("\n");
}
