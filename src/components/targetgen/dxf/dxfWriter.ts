/**
 * Minimal DXF writer with solid HATCH support, units in mm.
 * Uses a modern DXF version so filled entities import reliably.
 */

export interface DxfPoint {
    x: number;
    y: number;
}

interface PolylineBoundaryPath {
    type: "polyline";
    flag: number;
    points: DxfPoint[];
}

interface EdgeBoundaryPath {
    type: "edge";
    flag: number;
    edges: DxfEdge[];
}

export type DxfBoundaryPath = PolylineBoundaryPath | EdgeBoundaryPath;

interface LineEdge {
    type: "line";
    start: DxfPoint;
    end: DxfPoint;
}

interface ArcEdge {
    type: "arc";
    center: DxfPoint;
    radius: number;
    startAngleDeg: number;
    endAngleDeg: number;
    ccw: boolean;
}

type DxfEdge = LineEdge | ArcEdge;

export const DXF_BLACK_ACI = 7;
export const DXF_WHITE_ACI = 255;

const DXF_TRUE_BLACK = 0;
const DXF_TRUE_WHITE = 0xffffff;

function formatNumber(value: number): string {
    const normalized = Math.abs(value) < 1e-9 ? 0 : value;
    return normalized.toFixed(4);
}

function formatAngle(angleDeg: number): string {
    const normalized = Math.abs(angleDeg) === 360 ? 360 : ((((angleDeg % 360) + 360) % 360));
    return formatNumber(normalized);
}

function colorGroups(color: number): string[] {
    const groups = [
        "8", "0",
        "62", String(color),
    ];

    if (color === DXF_BLACK_ACI) {
        groups.push("420", String(DXF_TRUE_BLACK));
    } else if (color === DXF_WHITE_ACI) {
        groups.push("420", String(DXF_TRUE_WHITE));
    }

    return groups;
}

export function dxfLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color = DXF_BLACK_ACI,
): string {
    return [
        "0", "LINE",
        "100", "AcDbEntity",
        ...colorGroups(color),
        "100", "AcDbLine",
        "10", formatNumber(x1),
        "20", formatNumber(y1),
        "30", "0.0",
        "11", formatNumber(x2),
        "21", formatNumber(y2),
        "31", "0.0",
    ].join("\n");
}

function rectPoints(x: number, y: number, w: number, h: number): DxfPoint[] {
    return [
        { x, y },
        { x: x + w, y },
        { x: x + w, y: y + h },
        { x, y: y + h },
    ];
}

export function externalPolyline(points: DxfPoint[]): DxfBoundaryPath {
    return { type: "polyline", flag: 3, points };
}

export function outermostPolyline(points: DxfPoint[]): DxfBoundaryPath {
    return { type: "polyline", flag: 18, points };
}

export function defaultPolyline(points: DxfPoint[]): DxfBoundaryPath {
    return { type: "polyline", flag: 2, points };
}

export function externalEdge(edges: DxfEdge[]): DxfBoundaryPath {
    return { type: "edge", flag: 1, edges };
}

export function outermostEdge(edges: DxfEdge[]): DxfBoundaryPath {
    return { type: "edge", flag: 16, edges };
}

export function lineEdge(start: DxfPoint, end: DxfPoint): DxfEdge {
    return { type: "line", start, end };
}

export function arcEdge(
    center: DxfPoint,
    radius: number,
    startAngleDeg: number,
    endAngleDeg: number,
    ccw: boolean,
): DxfEdge {
    return { type: "arc", center, radius, startAngleDeg, endAngleDeg, ccw };
}

function serializeBoundaryPath(path: DxfBoundaryPath): string[] {
    if (path.type === "polyline") {
        return [
            "92", String(path.flag),
            "72", "0",
            "73", "1",
            "93", String(path.points.length),
            ...path.points.flatMap((point) => [
                "10", formatNumber(point.x),
                "20", formatNumber(point.y),
            ]),
            "97", "0",
        ];
    }

    return [
        "92", String(path.flag),
        "93", String(path.edges.length),
        ...path.edges.flatMap((edge) => {
            if (edge.type === "line") {
                return [
                    "72", "1",
                    "10", formatNumber(edge.start.x),
                    "20", formatNumber(edge.start.y),
                    "11", formatNumber(edge.end.x),
                    "21", formatNumber(edge.end.y),
                ];
            }

            return [
                "72", "2",
                "10", formatNumber(edge.center.x),
                "20", formatNumber(edge.center.y),
                "40", formatNumber(edge.radius),
                "50", formatAngle(edge.startAngleDeg),
                "51", formatAngle(edge.endAngleDeg),
                "73", edge.ccw ? "1" : "0",
            ];
        }),
        "97", "0",
    ];
}

export function dxfHatch(
    boundaryPaths: DxfBoundaryPath[],
    color = DXF_BLACK_ACI,
): string {
    return [
        "0", "HATCH",
        "100", "AcDbEntity",
        ...colorGroups(color),
        "100", "AcDbHatch",
        "10", "0.0",
        "20", "0.0",
        "30", "0.0",
        "210", "0.0",
        "220", "0.0",
        "230", "1.0",
        "2", "SOLID",
        "70", "1",
        "71", "0",
        "91", String(boundaryPaths.length),
        ...boundaryPaths.flatMap(serializeBoundaryPath),
        "75", "0",
        "76", "1",
        "98", "0",
    ].join("\n");
}

export function dxfFilledRect(
    x: number,
    y: number,
    w: number,
    h: number,
    color = DXF_BLACK_ACI,
): string {
    return dxfHatch([externalPolyline(rectPoints(x, y, w, h))], color);
}

export function dxfFilledRectWithVoids(
    x: number,
    y: number,
    w: number,
    h: number,
    voids: DxfBoundaryPath[],
    color = DXF_BLACK_ACI,
): string {
    return dxfHatch([externalPolyline(rectPoints(x, y, w, h)), ...voids], color);
}

export function dxfFilledRectWithHole(
    x: number,
    y: number,
    w: number,
    h: number,
    holeX: number,
    holeY: number,
    holeW: number,
    holeH: number,
    color = DXF_BLACK_ACI,
): string {
    return dxfFilledRectWithVoids(
        x,
        y,
        w,
        h,
        [outermostPolyline(rectPoints(holeX, holeY, holeW, holeH))],
        color,
    );
}

export function fullCircleBoundary(cx: number, cy: number, r: number): DxfBoundaryPath {
    return externalEdge([arcEdge({ x: cx, y: cy }, r, 0, 360, true)]);
}

export function circleHoleBoundary(cx: number, cy: number, r: number): DxfBoundaryPath {
    return outermostEdge([arcEdge({ x: cx, y: cy }, r, 0, 360, true)]);
}

export function dxfFilledCircle(
    cx: number,
    cy: number,
    r: number,
    color = DXF_BLACK_ACI,
): string {
    return dxfHatch([fullCircleBoundary(cx, cy, r)], color);
}

export function dxfFilledAnnulus(
    cx: number,
    cy: number,
    outerR: number,
    innerR: number,
    color = DXF_BLACK_ACI,
): string {
    return dxfHatch(
        [
            fullCircleBoundary(cx, cy, outerR),
            circleHoleBoundary(cx, cy, innerR),
        ],
        color,
    );
}

function polarPoint(cx: number, cy: number, radius: number, angleDeg: number): DxfPoint {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
        x: cx + radius * Math.cos(angleRad),
        y: cy + radius * Math.sin(angleRad),
    };
}

export function dxfFilledAnnularSector(
    cx: number,
    cy: number,
    innerR: number,
    outerR: number,
    startAngleDeg: number,
    endAngleDeg: number,
    outerArcCcw: boolean,
    color = DXF_BLACK_ACI,
): string {
    const innerStart = polarPoint(cx, cy, innerR, startAngleDeg);
    const outerStart = polarPoint(cx, cy, outerR, startAngleDeg);
    const outerEnd = polarPoint(cx, cy, outerR, endAngleDeg);
    const innerEnd = polarPoint(cx, cy, innerR, endAngleDeg);

    return dxfHatch(
        [
            externalEdge([
                lineEdge(innerStart, outerStart),
                arcEdge({ x: cx, y: cy }, outerR, startAngleDeg, endAngleDeg, outerArcCcw),
                lineEdge(outerEnd, innerEnd),
                arcEdge({ x: cx, y: cy }, innerR, endAngleDeg, startAngleDeg, !outerArcCcw),
            ]),
        ],
        color,
    );
}

export function buildDxf(entities: string[]): string {
    const header = [
        "0", "SECTION",
        "2", "HEADER",
        "9", "$ACADVER",
        "1", "AC1024",
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
