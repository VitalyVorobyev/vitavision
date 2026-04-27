import { type Matrix3, computeHomography } from "./homography";

export type { Matrix3 };

type Vec2 = { x: number; y: number };
type Vec3 = [number, number, number];

export interface Pose {
    yaw: number;
    pitch: number;
    roll: number;
    focalPx: number;
    reprojErrPx: number;
    valid: boolean;
}

// Multiply two 3×3 row-major matrices.
function mul33(A: number[], B: number[]): number[] {
    const C = new Array<number>(9).fill(0);
    for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
            for (let k = 0; k < 3; k++)
                C[i * 3 + j] += A[i * 3 + k] * B[k * 3 + j];
    return C;
}

// Extract column k from a 3×3 row-major matrix as Vec3.
function col3(M: number[], k: number): Vec3 {
    return [M[k], M[3 + k], M[6 + k]];
}

function norm3(v: Vec3): number {
    return Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
}

function scale3(v: Vec3, s: number): Vec3 {
    return [v[0] * s, v[1] * s, v[2] * s];
}

function cross3(a: Vec3, b: Vec3): Vec3 {
    return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
    ];
}

function det33(M: number[]): number {
    return (
        M[0] * (M[4] * M[8] - M[5] * M[7]) -
        M[1] * (M[3] * M[8] - M[5] * M[6]) +
        M[2] * (M[3] * M[7] - M[4] * M[6])
    );
}

// Inverse of a 3×3 row-major matrix; returns null if singular.
function inv33(M: number[]): number[] | null {
    const d = det33(M);
    if (Math.abs(d) < 1e-12) return null;
    const inv = [
        (M[4] * M[8] - M[5] * M[7]),
        -(M[1] * M[8] - M[2] * M[7]),
        (M[1] * M[5] - M[2] * M[4]),
        -(M[3] * M[8] - M[5] * M[6]),
        (M[0] * M[8] - M[2] * M[6]),
        -(M[0] * M[5] - M[2] * M[3]),
        (M[3] * M[7] - M[4] * M[6]),
        -(M[0] * M[7] - M[1] * M[6]),
        (M[0] * M[4] - M[1] * M[3]),
    ];
    return inv.map((v) => v / d);
}

function T33(M: number[]): number[] {
    return [M[0], M[3], M[6], M[1], M[4], M[7], M[2], M[5], M[8]];
}

// Polar decomposition via Newton iteration — converges in ~5 steps for nearly-orthogonal input.
function nearestRotation(R0: number[]): number[] | null {
    let R = [...R0];
    for (let iter = 0; iter < 10; iter++) {
        const RtInv = inv33(T33(R));
        if (!RtInv) return null;
        R = R.map((v, i) => 0.5 * (v + RtInv[i]));
    }
    // Force det = +1 by flipping the last column if needed.
    if (det33(R) < 0) {
        R[2] = -R[2]; R[5] = -R[5]; R[8] = -R[8];
    }
    return R;
}

// Project a 3D point through K·[R|t] → image coords.
function project(R: number[], t: Vec3, K: number[], X: number, Y: number, Z: number): Vec2 {
    const Xc = R[0] * X + R[1] * Y + R[2] * Z + t[0];
    const Yc = R[3] * X + R[4] * Y + R[5] * Z + t[1];
    const Zc = R[6] * X + R[7] * Y + R[8] * Z + t[2];
    const u = (K[0] * Xc + K[1] * Yc + K[2] * Zc) / Zc;
    const v = (K[3] * Xc + K[4] * Yc + K[5] * Zc) / Zc;
    return { x: u, y: v };
}

// Shoelace area of a quadrilateral — used to detect degenerate (collinear) corners.
function quadArea(pts: [Vec2, Vec2, Vec2, Vec2]): number {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        area += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
}

const INVALID: Pose = { yaw: 0, pitch: 0, roll: 0, focalPx: 0, reprojErrPx: 0, valid: false };

/**
 * Decomposes a homography H (unit-square → canvas corners) into camera pose.
 *
 * Assumed intrinsics: f = canvasWidth, principal point = canvas centre, no skew.
 * The source plane is treated as a rectangle of aspect `aspect = cols/rows`,
 * normalised so the Y axis is 1; X axis is `aspect`. With aspect=1 this matches
 * the historical unit-square assumption.
 */
export function decomposePose(
    H: Matrix3,
    canvasWidth: number,
    canvasHeight: number,
    gridCorners: [Vec2, Vec2, Vec2, Vec2],
    aspect: number = 1,
): Pose {
    if (quadArea(gridCorners) < 1) return INVALID;
    if (!isFinite(aspect) || aspect <= 0) return INVALID;

    const f = canvasWidth;
    const K = [f, 0, canvasWidth / 2, 0, f, canvasHeight / 2, 0, 0, 1];
    const Kinv = inv33(K);
    if (!Kinv) return INVALID;

    // M = K^-1 · H. H maps unit (s,t) → image; we re-interpret as a source
    // rectangle of (aspect × 1) by scaling column 0 by 1/aspect, which is
    // equivalent to right-multiplying by diag(1/aspect, 1, 1).
    const Mraw = mul33(Kinv, [...H] as number[]);
    const M = [
        Mraw[0] / aspect, Mraw[1], Mraw[2],
        Mraw[3] / aspect, Mraw[4], Mraw[5],
        Mraw[6] / aspect, Mraw[7], Mraw[8],
    ];

    // For a true rigid pose, ‖M[:,0]‖ == ‖M[:,1]‖. Average both columns
    // for a more robust scale estimate.
    const lam0 = norm3(col3(M, 0));
    const lam1 = norm3(col3(M, 1));
    const lambda = 0.5 * (lam0 + lam1);
    if (!isFinite(lambda) || lambda < 1e-12) return INVALID;

    const r1 = scale3(col3(M, 0), 1 / lambda);
    const r2 = scale3(col3(M, 1), 1 / lambda);
    const r3 = cross3(r1, r2);
    const t: Vec3 = scale3(col3(M, 2), 1 / lambda);

    const R0 = [
        r1[0], r2[0], r3[0],
        r1[1], r2[1], r3[1],
        r1[2], r2[2], r3[2],
    ];
    const R = nearestRotation(R0);
    if (!R || R.some((v) => !isFinite(v))) return INVALID;

    const pitchRad = Math.asin(Math.max(-1, Math.min(1, -R[6])));
    const yawRad   = Math.atan2(R[3], R[0]);
    const rollRad  = Math.atan2(R[7], R[8]);
    const toDeg    = (r: number) => (r * 180) / Math.PI;

    // Reprojection error: project source rectangle corners (aspect × 1)
    // through K·[R|t]. With the corrected aspect the residual collapses to
    // numerical noise for any rigid grid and grows only when the warp truly
    // is non-rigid (e.g. self-intersecting, severely sheared).
    const srcPts: [number, number][] = [[0, 0], [aspect, 0], [aspect, 1], [0, 1]];
    let errSum = 0;
    for (let i = 0; i < 4; i++) {
        const [sx, sy] = srcPts[i];
        const proj = project(R, t, K, sx, sy, 0);
        errSum += Math.hypot(proj.x - gridCorners[i].x, proj.y - gridCorners[i].y);
    }

    return {
        yaw:          toDeg(yawRad),
        pitch:        toDeg(pitchRad),
        roll:         toDeg(rollRad),
        focalPx:      f,
        reprojErrPx:  errSum / 4,
        valid:        true,
    };
}

/**
 * Convenience: compute homography from 4 canvas-space corners then decompose pose.
 */
export function poseFromCorners(
    corners: [Vec2, Vec2, Vec2, Vec2],
    canvasWidth: number,
    canvasHeight: number,
    aspect: number = 1,
): Pose {
    const H = computeHomography(corners);
    return decomposePose(H, canvasWidth, canvasHeight, corners, aspect);
}
