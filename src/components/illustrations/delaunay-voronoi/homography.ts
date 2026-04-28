export type Matrix3 = [
    number, number, number,
    number, number, number,
    number, number, number,
];

type Vec2 = { x: number; y: number };

// Solve Ax = b via Gaussian elimination (8x8). Returns null if singular.
function solve8(A: number[][], b: number[]): number[] | null {
    const n = 8;
    const M = A.map((row, i) => [...row, b[i]]);
    for (let col = 0; col < n; col++) {
        let pivot = -1;
        let maxVal = 0;
        for (let row = col; row < n; row++) {
            if (Math.abs(M[row][col]) > maxVal) { maxVal = Math.abs(M[row][col]); pivot = row; }
        }
        if (pivot < 0 || maxVal < 1e-12) return null;
        [M[col], M[pivot]] = [M[pivot], M[col]];
        const scale = M[col][col];
        for (let j = col; j <= n; j++) M[col][j] /= scale;
        for (let row = 0; row < n; row++) {
            if (row === col) continue;
            const f = M[row][col];
            for (let j = col; j <= n; j++) M[row][j] -= f * M[col][j];
        }
    }
    return M.map((row) => row[n]);
}

// Compute homography mapping unit square [0,0],[1,0],[1,1],[0,1] → corners (TL,TR,BR,BL).
// Returns null when the system is singular (e.g. corners collinear or coincident).
// Callers should treat null as "no valid projection" — falling back to identity here would
// snap the projected grid to the unit square at the origin and inject phantom points into
// downstream geometry.
export function computeHomography(corners: [Vec2, Vec2, Vec2, Vec2]): Matrix3 | null {
    const src: Vec2[] = [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 0, y: 1 }];
    const A: number[][] = [];
    const b: number[] = [];
    for (let i = 0; i < 4; i++) {
        const { x: sx, y: sy } = src[i];
        const { x: dx, y: dy } = corners[i];
        A.push([sx, sy, 1, 0, 0, 0, -dx * sx, -dx * sy]);
        b.push(dx);
        A.push([0, 0, 0, sx, sy, 1, -dy * sx, -dy * sy]);
        b.push(dy);
    }
    const h = solve8(A, b);
    if (!h) return null;
    return [h[0], h[1], h[2], h[3], h[4], h[5], h[6], h[7], 1];
}

export function applyHomography(H: Matrix3, p: Vec2): Vec2 {
    const w = H[6] * p.x + H[7] * p.y + H[8];
    return {
        x: (H[0] * p.x + H[1] * p.y + H[2]) / w,
        y: (H[3] * p.x + H[4] * p.y + H[5]) / w,
    };
}
