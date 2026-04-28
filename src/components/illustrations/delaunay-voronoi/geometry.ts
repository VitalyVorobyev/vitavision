type Vec2 = { x: number; y: number };

export function triangleArea(a: Vec2, b: Vec2, c: Vec2): number {
    return Math.abs((b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)) / 2;
}

export function triangleMinAngle(a: Vec2, b: Vec2, c: Vec2): number {
    const ab = Math.hypot(b.x - a.x, b.y - a.y);
    const bc = Math.hypot(c.x - b.x, c.y - b.y);
    const ca = Math.hypot(a.x - c.x, a.y - c.y);
    if (ab === 0 || bc === 0 || ca === 0) return 0;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    const A = Math.acos(clamp((ab * ab + ca * ca - bc * bc) / (2 * ab * ca)));
    const B = Math.acos(clamp((ab * ab + bc * bc - ca * ca) / (2 * ab * bc)));
    const C = Math.PI - A - B;
    return Math.min(A, B, C);
}

export function circumcircle(a: Vec2, b: Vec2, c: Vec2): { cx: number; cy: number; r: number } {
    const ax = b.x - a.x, ay = b.y - a.y;
    const bx = c.x - a.x, by = c.y - a.y;
    const D = 2 * (ax * by - ay * bx);
    if (Math.abs(D) < 1e-12) return { cx: a.x, cy: a.y, r: 0 };
    const ux = (by * (ax * ax + ay * ay) - ay * (bx * bx + by * by)) / D;
    const uy = (ax * (bx * bx + by * by) - bx * (ax * ax + ay * ay)) / D;
    return { cx: a.x + ux, cy: a.y + uy, r: Math.hypot(ux, uy) };
}

// Returns positive if p is inside triangle (a,b,c), using sign of cross products.
export function pointInTriangle(p: Vec2, a: Vec2, b: Vec2, c: Vec2): boolean {
    const sign = (p1: Vec2, p2: Vec2, p3: Vec2) =>
        (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
    const d1 = sign(p, a, b);
    const d2 = sign(p, b, c);
    const d3 = sign(p, c, a);
    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
    return !(hasNeg && hasPos);
}

// Ray-casting algorithm for convex or concave polygons.
export function pointInPolygon(p: Vec2, polygon: Vec2[]): boolean {
    let inside = false;
    const n = polygon.length;
    for (let i = 0, j = n - 1; i < n; j = i++) {
        const xi = polygon[i].x, yi = polygon[i].y;
        const xj = polygon[j].x, yj = polygon[j].y;
        if ((yi > p.y) !== (yj > p.y) && p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}
