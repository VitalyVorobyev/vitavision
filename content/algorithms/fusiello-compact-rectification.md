---
title: "Fusiello Compact Stereo Rectification"
date: 2026-07-19
summary: "Calibrated Euclidean rectification that builds a new pair of projection matrices sharing a common orientation from the two known PPMs, yielding a per-image rectifying homography."
tags: ["stereo", "two-view-geometry", "classical"]
author: "Vitaly Vorobyev"
domain: geometry
tasks: [stereo-rectification]
difficulty: intermediate
prerequisites: [stereo-rectification, pinhole-camera-model, pose-estimation, epipolar-geometry]
relations:
  - type: compared_with
    target: hartley-projective-rectification
    confidence: high
    caution: "Requires known projection matrices; the 1999 uncalibrated methods need only F."
sources:
  primary: fusiello2000-compact-rectification
  references:
    - hartley1999-projective-rectification
    - loop1999-rectifying-homographies
    - pollefeys1999-polar-rectification
---

# Goal

Given a calibrated stereo rig — the two known perspective projection matrices (PPMs) $\tilde P_{o1}$, $\tilde P_{o2}$ of the original cameras, each factorizable as $A[R \mid t]$ — compute a pair of rectifying PPMs $\tilde P_{n1}$, $\tilde P_{n2}$ describing virtual cameras that keep the original optical centres but share a common orientation and common intrinsics, together with the per-image $3 \times 3$ homographies that warp the original images into the rectified ones. Because both input PPMs are metric (intrinsics and extrinsics known from prior calibration, not recovered from point correspondences), the result is a **Euclidean** rectification: the shared new orientation is built directly from the baseline and a viewing-direction reference, disparity between rectified images inverts metrically as $Z = fB/d$, and 3-D points can be triangulated from the rectified images with the new PPMs. This differs from uncalibrated (weakly calibrated) rectification methods, which start from a fundamental matrix or point correspondences alone and can only produce a projective rectification, undetermined up to the residual freedom left by $F$.

# Algorithm

Symbols: $\tilde P_o = A[R \mid t]$ — an old (input) PPM, factored into intrinsic matrix $A$ and extrinsic rotation/translation $[R \mid t]$; $c = -R^\top t$ — the optical centre recovered from an old PPM; $r_1, r_2, r_3$ — the row vectors of the new shared rotation matrix; $k$ — the old left camera's $Z$-axis (its viewing direction), used as an arbitrary reference vector; $Q_o, Q_n$ — the leading $3 \times 3$ block of an old / new PPM; $T$ — the per-image rectifying homography.

The new PPMs keep the old optical centres and change only orientation and intrinsics:

$$
\tilde P_{n1} = A\,[R \mid -R c_1], \qquad \tilde P_{n2} = A\,[R \mid -R c_2].
$$

The shared new orientation $R = [r_1^\top\; r_2^\top\; r_3^\top]^\top$ is assembled row-by-row as an orthonormal frame from three geometric constraints:

$$
r_1 = \frac{c_1 - c_2}{\lVert c_1 - c_2 \rVert}, \qquad
r_2 = \frac{k \wedge r_1}{\lVert k \wedge r_1 \rVert}, \qquad
r_3 = r_1 \wedge r_2.
$$

$r_1$ is the new $X$-axis, pointed along the baseline; this drives both epipoles to infinity and makes epipolar lines parallel and horizontal. $r_2$ is the new $Y$-axis, orthogonal to the baseline and to $k$; the paper fixes $k$ to the old left camera's $Z$-axis, which keeps the rectified cameras looking roughly in the original left-camera viewing direction. $r_3$ completes the right-handed frame. The shared intrinsic matrix $A$ can be chosen arbitrarily as long as it is identical for both new PPMs — equal intrinsics for both cameras is what makes conjugate points share the same row. A common choice is the average of the two old intrinsic matrices with the skew term zeroed.

Once the new PPMs are fixed, rectifying an image is a per-image projective warp derived from the constraint that rectification does not move the optical centre:

$$
T = Q_n\, Q_o^{-1}.
$$

Applying $T$ to an original image produces the rectified image; because rectified integer pixel positions generally map to non-integer positions on the original image plane, gray levels are resampled by bilinear interpolation.

## Procedure

:::algorithm[Compact stereo rectification]
::input[Old PPMs $\tilde P_{o1}$, $\tilde P_{o2}$ of a calibrated stereo rig.]
::output[New PPMs $\tilde P_{n1}$, $\tilde P_{n2}$; rectifying homographies $T_1$, $T_2$.]

1. Factor each old PPM into intrinsics and extrinsics, $\tilde P_{oi} = A_i[R_i \mid t_i]$, and recover its optical centre $c_i = -R_i^\top t_i$.
2. Compute the new $X$-axis $r_1 = (c_1 - c_2)/\lVert c_1 - c_2 \rVert$ along the baseline.
3. Compute the new $Y$-axis $r_2 = (k \wedge r_1)/\lVert k \wedge r_1 \rVert$, with $k$ the old left camera's $Z$-axis.
4. Compute the new $Z$-axis $r_3 = r_1 \wedge r_2$ and assemble $R = [r_1^\top\; r_2^\top\; r_3^\top]^\top$.
5. Choose a shared new intrinsic matrix $A$ for both rectified cameras.
6. Form the new PPMs with unchanged optical centres, $\tilde P_{n1} = A[R \mid -Rc_1]$ and $\tilde P_{n2} = A[R \mid -Rc_2]$.
7. Compute the rectifying homography for each image, $T_i = Q_{ni}\,Q_{oi}^{-1}$, from the leading $3 \times 3$ blocks of the new and old PPMs.
8. Warp each original image with its $T_i$, resampling non-integer source coordinates by bilinear interpolation.
:::

Step 3 degenerates when the optical axis is parallel to the baseline (pure forward motion): $k$ becomes parallel to $r_1$, the cross product vanishes, and the new $Y$-axis is undefined.

# Implementation

The full construction in Rust, corresponding line-by-line to the procedure above:

```rust
type Mat3 = [[f64; 3]; 3];
type Vec3 = [f64; 3];

fn sub(a: Vec3, b: Vec3) -> Vec3 { [a[0]-b[0], a[1]-b[1], a[2]-b[2]] }
fn cross(a: Vec3, b: Vec3) -> Vec3 {
    [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]]
}
fn normalize(a: Vec3) -> Vec3 {
    let n = (a[0]*a[0] + a[1]*a[1] + a[2]*a[2]).sqrt();
    [a[0]/n, a[1]/n, a[2]/n]
}

/// Steps 2-4: shared new rotation from the baseline and the old left camera's Z-axis.
fn new_rotation(c1: Vec3, c2: Vec3, k: Vec3) -> Mat3 {
    let r1 = normalize(sub(c1, c2));  // step 2: new X-axis along the baseline
    let r2 = normalize(cross(k, r1)); // step 3: new Y-axis, k = old left Z-axis
    let r3 = cross(r1, r2);           // step 4: new Z-axis completes the frame
    [r1, r2, r3]
}

fn mat3_mul(a: Mat3, b: Mat3) -> Mat3 {
    let mut m = [[0.0; 3]; 3];
    for i in 0..3 {
        for j in 0..3 {
            for k in 0..3 {
                m[i][j] += a[i][k] * b[k][j];
            }
        }
    }
    m
}

/// Step 6: new PPM's leading 3x3 block, Q_n = A * R.
/// Step 7: rectifying homography T = Q_n * Q_o^-1 (Q_o^-1 supplied by caller).
fn rectifying_homography(a: Mat3, r: Mat3, q_old_inv: Mat3) -> Mat3 {
    let q_new = mat3_mul(a, r);
    mat3_mul(q_new, q_old_inv)
}
```

PPM factorization (step 1), matrix inversion for $Q_o^{-1}$, and the shared-intrinsics choice of step 5 are omitted — the first two are standard linear-algebra routines, the last an implementation choice (the reference MATLAB code averages the two old intrinsic matrices and zeroes the skew term). Step 8's bilinear-interpolation warp is a standard image-resampling routine, orthogonal to the geometric construction shown here.

# Remarks

- The comparison between calibrated and uncalibrated rectification methods, including the full decision table, is hosted on the [stereo rectification survey](/atlas/stereo-rectification#decision-table).
- A related calibrated variant, used in the widely-adopted Camera Calibration Toolbox / OpenCV rectification routines, splits the rectifying rotation half-and-half between the two cameras instead of anchoring the shared orientation to one camera's axis: each camera rotates by half the angle needed to align the pair, which halves the maximum per-camera reprojection distortion relative to rotating only one camera fully onto the other. That toolbox lineage also exposes a scaling parameter trading off between a cropped rectified field of view (no black borders, some source pixels lost) and the full original field of view (all source pixels kept, black borders introduced) — a valid-ROI concern this construction does not address.
- The new shared intrinsic matrix $A$ is not derived from the physical cameras; it is an implementation choice constrained only by being identical for both rectified views.
- The construction fails outright when the optical axis is parallel to the baseline (pure forward motion), since the cross product defining the new $Y$-axis degenerates to zero; the same construction is numerically ill-conditioned as the optical axis approaches that alignment.
- Rectification here is a re-orientation of the cameras about their fixed optical centres — it never translates them, and the warp from old to rectified image is a plain $3 \times 3$ projective resampling, not a re-triangulation.
- Reconstructing 3-D points by triangulation directly from the rectified images, using the new PPMs, introduces no appreciable accuracy loss relative to reconstructing from the originals — reported qualitatively in the source paper, without a specific numeric figure.

# References

1. A. Fusiello, E. Trucco, A. Verri. *A Compact Algorithm for Rectification of Stereo Pairs.* Machine Vision and Applications 12(1):16–22, 2000. DOI: [10.1007/s001380050120](https://doi.org/10.1007/s001380050120)
2. R. I. Hartley. *Theory and Practice of Projective Rectification.* International Journal of Computer Vision 35(2):1–16, 1999.
3. C. Loop, Z. Zhang. *Computing Rectifying Homographies for Stereo Vision.* CVPR, 1999, pp. I:125–131.
4. M. Pollefeys, R. Koch, L. Van Gool. *A Simple and Efficient Rectification Method for General Motion.* ICCV, 1999, pp. 496–501.
