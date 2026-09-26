// Edge path geometry for the graph canvas — extracted from GraphExplorer.tsx.
//
// Pure math, no React. Given a "center" box and a "node" box (both in the
// same content coordinate space), computes a cubic-bezier SVG path that
// exits each box from whichever side faces the other box, plus a label
// anchor point roughly a third of the way from the center box.

export interface ExitPoint {
    x:    number;
    y:    number;
    side: "left" | "right" | "top" | "bottom";
}

export interface Box {
    x: number;
    y: number;
    w: number;
    h: number;
}

export interface EdgeGeometry {
    path:   string;
    labelX: number;
    labelY: number;
    start:  ExitPoint;
    end:    ExitPoint;
}

/** Where a straight line from the box's center toward (toX, toY) crosses the box's border. */
export function edgeExit(boxX: number, boxY: number, w: number, h: number, toX: number, toY: number): ExitPoint {
    const bcx = boxX + w / 2, bcy = boxY + h / 2;
    const dx = toX - bcx, dy = toY - bcy;
    const adx = Math.abs(dx) / (w / 2 + 0.0001);
    const ady = Math.abs(dy) / (h / 2 + 0.0001);
    let side: ExitPoint["side"], px: number, py: number;
    if (adx > ady) {
        side = dx > 0 ? "right" : "left";
        px = boxX + (dx > 0 ? w : 0);
        py = bcy + (dy / Math.abs(dx)) * (w / 2);
    } else {
        side = dy > 0 ? "bottom" : "top";
        py = boxY + (dy > 0 ? h : 0);
        px = bcx + (dx / Math.abs(dy)) * (h / 2);
    }
    return { x: px, y: py, side };
}

/** Bezier control point offset `dist` px outward from an exit point, along its side's normal. */
export function ctrlFromSide(p: ExitPoint, side: ExitPoint["side"], dist: number): { x: number; y: number } {
    switch (side) {
        case "right":  return { x: p.x + dist, y: p.y };
        case "left":   return { x: p.x - dist, y: p.y };
        case "top":    return { x: p.x,        y: p.y - dist };
        case "bottom": return { x: p.x,        y: p.y + dist };
    }
}

/** Cubic-bezier path connecting `centerBox` and `nodeBox`, exiting each from the side facing the other. */
export function buildEdge(centerBox: Box, nodeBox: Box): EdgeGeometry {
    const ncx = nodeBox.x + nodeBox.w / 2;
    const ncy = nodeBox.y + nodeBox.h / 2;
    const ccx = centerBox.x + centerBox.w / 2;
    const ccy = centerBox.y + centerBox.h / 2;

    const start = edgeExit(centerBox.x, centerBox.y, centerBox.w, centerBox.h, ncx, ncy);
    const end   = edgeExit(nodeBox.x,   nodeBox.y,   nodeBox.w,   nodeBox.h,   ccx, ccy);

    const dist = Math.hypot(end.x - start.x, end.y - start.y);
    const off  = Math.min(80, dist * 0.45);

    const c1 = ctrlFromSide(start, start.side, off);
    const c2 = ctrlFromSide(end,   end.side,   off);

    return {
        path:   `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} C ${c1.x.toFixed(1)} ${c1.y.toFixed(1)}, ${c2.x.toFixed(1)} ${c2.y.toFixed(1)}, ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
        labelX: start.x * 0.38 + end.x * 0.62,
        labelY: start.y * 0.38 + end.y * 0.62,
        start,
        end,
    };
}
