---
title: "Loop-Zhang Rectifying Homographies"
date: 2026-07-19
summary: "Computes a rectifying homography pair from a known fundamental matrix by factoring each homography as shearing × similarity × projective, choosing the projective component to minimize image distortion."
tags: ["stereo", "two-view-geometry", "classical"]
author: "Vitaly Vorobyev"
domain: geometry
tasks: [stereo-rectification]
difficulty: advanced
prerequisites: [stereo-rectification, epipolar-geometry, homography]
relations:
  - type: compared_with
    target: pollefeys-polar-rectification
    confidence: high
    caution: "The decomposition still sends the epipole to infinity, so an epipole inside the image forces cropping; polar rectification avoids it."
sources:
  primary: loop1999-rectifying-homographies
---

# Goal

Rectify a calibrated or uncalibrated stereo pair given the fundamental matrix $F$ (or essential matrix $E$ for a calibrated pair) relating the two views. Input: two images $I$, $I'$ of a static scene satisfying the epipolar constraint $\mathbf x'^T F\,\mathbf x = 0$ for every correspondence $\mathbf x \leftrightarrow \mathbf x'$, with $F$ assumed known in advance. Output: a pair of homographies $H$, $H'$ such that the rectified points $\hat{\mathbf x} = H\mathbf x$, $\hat{\mathbf x}' = H'\mathbf x'$ satisfy a canonical rectified epipolar geometry — both epipoles map to a common point at infinity and corresponding points fall on identical scanlines. Each homography is factored as $H = H_s H_r H_p$: a projective component chosen from a quantifiable 2D distortion-minimization criterion, a similarity component that aligns epipolar lines with the horizontal axis, and a shearing component that spends the remaining degrees of freedom to further reduce distortion.

# Algorithm

Let $\mathbf x = (u, v, 1)^T \in I$ and $\mathbf x' = (u', v', 1)^T \in I'$ denote homogeneous image coordinates. Let $F$ be the known, rank-2 $3\times3$ fundamental matrix satisfying $\mathbf x'^T F\,\mathbf x = 0$. Let $\mathbf e$, $\mathbf e'$ denote the epipoles, defined by $F\mathbf e = \mathbf 0$ and $F^T\mathbf e' = \mathbf 0$. Let $\mathbf i = (1, 0, 0)^T$ denote the canonical rectified-epipole direction, and $[\mathbf i]_\times$ its cross-product matrix.

:::definition[Rectified epipolar geometry]
The target state of the rectifying pair: both epipoles map to a common point at infinity, and the rectified fundamental matrix reduces to the cross-product matrix of that direction.

$$
H\mathbf e = H'\mathbf e' = \mathbf i, \qquad F = H'^T [\mathbf i]_\times H.
$$

Equivalently, all epipolar lines in the rectified image pair are parallel to the $u$-axis, and corresponding points have identical $v$-coordinates.
:::

Each rectifying homography is a product of three special-purpose transforms, applied to the corresponding image in this order:

$$
H = H_s H_r H_p, \qquad H' = H_s' H_r' H_p'.
$$

$H_p$ (and $H_p'$) is a projective transform sending the epipole to a point at infinity. The map to infinity admits a one-parameter family of solutions, parameterized by a free direction $z$ shared between the two images. The per-image epipolar-line normal induced by $z$ is

$$
w = [\mathbf e]_\times z, \qquad w' = F z.
$$

:::definition[Projective-distortion criterion]
The member of the one-parameter family that minimizes the spread of per-pixel projective weights $w^T p_i$ (over pixel positions $p_i$ of both images) around the weight at the image centre $p_c$, summed across the two images as a pair of Rayleigh-quotient-like ratios.

$$
z^\ast = \operatorname*{arg\,min}_{z} \ \frac{z^T A z}{z^T B z} + \frac{z^T A' z}{z^T B' z},
$$

where $A, B$ (and $A', B'$) are built from the pixel-position outer products of $I$ (resp. $I'$) under $w$ and $w'$. Perfect (zero) weight spread is unattainable in general — it requires the epipole to already be at infinity.
:::

Minimizing this joint criterion is a nonlinear problem: its stationary condition reduces to a degree-7 polynomial in the single free scalar of $z$, solved by iterative root-finding. The seed for the iteration comes from solving the two single-image terms separately in closed form — each single-image ratio is a generalized-eigenvalue problem, $A_{\text{img}} = D^TD$, whose maximizer is the top eigenvector of $D^{-T}BD^{-1}$; the average of the two single-image solutions is reported to lie close to the joint optimum, though without a proven bound.

$H_r$ (and $H_r'$) is a similarity transform that rotates the now-infinite image of the epipole into alignment with $\mathbf i$, together with a shared vertical offset that aligns the two images' scanlines exactly. The pair $H_p H_r$, $H_p' H_r'$ already satisfies the rectified epipolar geometry above; the remaining horizontal degrees of freedom are still free at this point.

$H_s$ (and $H_s'$) is a shearing transform, affecting only the $u$-coordinate of a point and therefore leaving rectification undisturbed. It spends the remaining freedom to preserve perpendicularity and aspect ratio of the quadrilateral formed by the midpoints of the image's four edges — a system of two simultaneous quadratics in the shear parameters, solved via the curve-intersection method of Manocha and Demmel (1994), with a sign ambiguity resolved by preferring the positive root. In general $H_p$ is projective, so the affine shear cannot fully undo its distortion; it satisfies only these two constraints, not a general distortion minimum.

## Procedure

:::algorithm[Loop-Zhang rectification]
::input[Images $I$, $I'$ of a static scene; fundamental matrix $F$ (or essential matrix $E$) relating them, assumed known in advance.]
::output[Rectifying homography pair $H$, $H'$ satisfying $H\mathbf e = H'\mathbf e' = \mathbf i$ and $F = H'^T[\mathbf i]_\times H$.]

1. Compute the epipoles $\mathbf e$, $\mathbf e'$ from $F\mathbf e = \mathbf 0$ and $F^T\mathbf e' = \mathbf 0$.
2. Parameterize the projective components by a shared free direction $z$, giving per-image epipolar-line normals $w = [\mathbf e]_\times z$ and $w' = Fz$.
3. Solve the two single-image projective-distortion terms independently as closed-form generalized-eigenvalue problems, and average the two solutions to seed $z$.
4. Refine $z$ by an iterative root-find of the degree-7 stationary-point polynomial of the joint two-image criterion.
5. Build $H_p$, $H_p'$ from the refined $z$ so that each image's epipole maps to a point at infinity.
6. Construct similarity transforms $H_r$, $H_r'$ that rotate the infinite epipole images into alignment with $\mathbf i$, and fix a shared vertical offset that aligns corresponding scanlines.
7. Solve the shear parameters of $H_s$, $H_s'$ from the perpendicularity and aspect-ratio quadratics, preferring the positive-root branch.
8. Compose the final homographies $H = H_s H_r H_p$ and $H' = H_s' H_r' H_p'$.
:::

<!-- TODO figure: schematic of the H_p (epipole-to-infinity) -> H_r (scanline alignment) -> H_s (shear) decomposition applied to one image, once a generator script for the geometric scheme is authored. -->

# Implementation

The epipolar-line-normal parameterization (Eq. 8) and the final per-image homography composition in Rust:

```rust
type Vec3 = [f64; 3];
type Mat3 = [[f64; 3]; 3];

/// Cross-product matrix [v]_x.
fn cross_matrix(v: Vec3) -> Mat3 {
    [
        [0.0, -v[2], v[1]],
        [v[2], 0.0, -v[0]],
        [-v[1], v[0], 0.0],
    ]
}

fn mat_vec(m: Mat3, v: Vec3) -> Vec3 {
    let mut out = [0.0; 3];
    for i in 0..3 {
        out[i] = m[i][0] * v[0] + m[i][1] * v[1] + m[i][2] * v[2];
    }
    out
}

fn mat_mul(a: Mat3, b: Mat3) -> Mat3 {
    let mut c = [[0.0; 3]; 3];
    for i in 0..3 {
        for j in 0..3 {
            c[i][j] = (0..3).map(|k| a[i][k] * b[k][j]).sum();
        }
    }
    c
}

/// w = [e]_x z (image I), w' = F z (image I').
fn epipolar_line_normals(e: Vec3, f: Mat3, z: Vec3) -> (Vec3, Vec3) {
    (mat_vec(cross_matrix(e), z), mat_vec(f, z))
}

/// H = H_s H_r H_p, applied per image.
fn rectifying_homography(h_s: Mat3, h_r: Mat3, h_p: Mat3) -> Mat3 {
    mat_mul(mat_mul(h_s, h_r), h_p)
}
```

The projective-distortion criterion (Eq. 11), its degree-7 stationary-point solve, and the shear-parameter quadratics are omitted: they require a generalized-eigenvalue routine and a polynomial root-finder not expressible in a self-contained snippet.

# Remarks

- Works identically for calibrated pairs (fundamental matrix specializes to the essential matrix) and uncalibrated pairs; the method assumes $F$ is already known and does not estimate it.
- Zero projective distortion is unattainable in general except when the epipole starts at infinity, and the shear stage cannot fully undo the projective component's distortion — it satisfies only the perpendicularity and aspect-ratio constraints, not a general minimum.
- The joint two-image projective-distortion criterion has no closed form: it requires an iterative degree-7 polynomial root-find, with no proven bound on distance from the optimum.
- Because the projective component is constructed to send the epipole to a point at infinity, an epipole located inside the image frame drives part of the rectified image toward infinity, forcing cropping in practice; an epipole outside the image frame does not have this problem.
- Comparison with other rectification approaches is on the [stereo rectification decision table](/atlas/stereo-rectification#decision-table).

# References

1. C. Loop, Z. Zhang. *Computing Rectifying Homographies for Stereo Vision.* IEEE CVPR, 1999. [pdf](https://dev.ipol.im/~morel/Dossier_MVA_2011_Cours_Transparents_Documents/2011_Cours7_Document2_Loop-Zhang-CVPR1999.pdf)
