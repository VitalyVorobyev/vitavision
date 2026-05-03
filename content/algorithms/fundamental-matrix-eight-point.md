---
title: "Normalised Eight-Point Algorithm"
date: 2026-05-02
summary: "Compute the fundamental matrix from n ≥ 8 point correspondences by conditioning the linear DLT system via a similarity normalisation, recovering accuracy comparable to iterative methods at a fraction of the cost."
tags: ["geometry", "stereo", "two-view-geometry", "fundamental-matrix"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [epipolar-geometry, homography, dlt-normalisation]
failureModes: []
sources:
  primary: hartley1997-eight-point
  references: []
  notes: |
    Two-line fix to the Longuet-Higgins (1981) linear DLT for the
    fundamental matrix: translate each image's points to zero centroid,
    isotropically scale so the average distance to origin is √2, then
    run the standard DLT, enforce rank 2 by SVD truncation, and
    denormalise. Without normalisation, the design matrix A^T A has
    condition number κ ~ 10^11–10^13 on typical 200×200 images;
    normalisation drops κ to ~10^3–10^5 (Graph 1 of paper). Empirical
    finding: the normalised linear method is "almost indistinguishable"
    from the optimal iterative gold-standard estimator at n ≥ 10
    correspondences, while running ~20× faster (§7.3, §8). The same
    normalisation argument applies to the homography DLT.
---

# Goal

Estimate the $3 \times 3$ rank-2 fundamental matrix $F$ satisfying $\mathbf{u}'^T F\,\mathbf{u} = 0$ for all inlier correspondences $\mathbf{u}_i \leftrightarrow \mathbf{u}'_i$ across two uncalibrated views. The contribution is **not** the linear DLT itself — that is Longuet-Higgins (1981) — but a similarity normalisation step that conditions the design matrix and makes the linear solution numerically reliable. The normalised linear method is the standard initialisation for any geometric refinement (Sampson, gold-standard) and the natural non-minimal solver inside RANSAC.

# Algorithm

Let $\mathbf{u}_i = (u_i, v_i, 1)^T$ and $\mathbf{u}'_i = (u'_i, v'_i, 1)^T$ denote $n \geq 8$ pairs of corresponding image points in homogeneous pixel coordinates. The bilinear constraint $\mathbf{u}'^T F\,\mathbf{u} = 0$ stacks into a homogeneous linear system $A\,\mathbf{f} = \mathbf{0}$ where each row of $A$ encodes one correspondence:

$$
A_i = \bigl[\, u_i u'_i,\; u_i v'_i,\; u_i,\; v_i u'_i,\; v_i v'_i,\; v_i,\; u'_i,\; v'_i,\; 1\,\bigr],
$$

and $\mathbf{f}$ is the row-major vectorisation of $F$. The unconditioned system has entries spanning $1$ to $\sim 10^8$ on typical $\sim 1000$-pixel images, so $\kappa(A^T A) \sim 10^{11}$–$10^{13}$ — the linear least-squares solution is dominated by floating-point error.

:::definition[Hartley normalisation]
A pre-conditioning of each image's point set by a similarity transform: translate the centroid to the origin, then isotropically scale so the average distance from the origin is $\sqrt{2}$.

For the first image, let $(\bar u, \bar v)$ be the centroid and $\bar d$ the mean distance to the centroid. The normalisation transform is

$$
T = \begin{bmatrix} s & 0 & -s\,\bar u \\ 0 & s & -s\,\bar v \\ 0 & 0 & 1 \end{bmatrix}, \qquad s = \frac{\sqrt{2}}{\bar d}.
$$

Compute $T'$ analogously for the second image. After normalisation, a typical point is of the form $(1, 1, 1)^T$ — every entry of the design matrix is $O(1)$, and the condition number of $A^T A$ drops by approximately $10^8$ (Graph 1 of the paper).
:::

:::algorithm[Normalised eight-point algorithm]
::input[$n \geq 8$ correspondences $\{\mathbf{u}_i \leftrightarrow \mathbf{u}'_i\}$ in pixel coordinates.]
::output[The rank-2 fundamental matrix $F \in \mathbb{R}^{3 \times 3}$ in the original pixel coordinate system.]

1. **Normalise.** Compute $T$ and $T'$ from the two point sets. Form $\hat{\mathbf{u}}_i = T\,\mathbf{u}_i$ and $\hat{\mathbf{u}}'_i = T'\,\mathbf{u}'_i$.
2. **Linear DLT.** Build the $n \times 9$ design matrix $\hat A$ from the normalised correspondences. Compute its SVD $\hat A = U\Sigma V^T$; take $\hat{\mathbf{f}}$ as the right singular vector corresponding to the smallest singular value of $\hat A$. Reshape to $\hat F_0 \in \mathbb{R}^{3 \times 3}$.
3. **Rank-2 enforcement.** Compute the SVD $\hat F_0 = U\,\mathrm{diag}(r, s, t)\,V^T$ and zero out the smallest singular value: $\hat F = U\,\mathrm{diag}(r, s, 0)\,V^T$. This is the closest rank-2 matrix to $\hat F_0$ in Frobenius norm (Tsai-Huang 1984).
4. **Denormalise.** Recover the fundamental matrix in the original pixel coordinate system: $F = T'^T\,\hat F\,T$.
:::

The algorithm contains exactly one nonlinear operation — two SVDs — and no iteration. Empirically the result is "almost indistinguishable" from the iterative gold-standard estimator at $n \geq 10$ correspondences and runs ~20× faster (§8 of the paper).

# Implementation

The normalisation transform and the denormalisation step in Rust:

```rust
use nalgebra::{DMatrix, Matrix3, Vector2};

fn normalise(points: &[Vector2<f64>]) -> (Matrix3<f64>, Vec<Vector2<f64>>) {
    let n = points.len() as f64;
    let centroid: Vector2<f64> = points.iter().sum::<Vector2<f64>>() / n;
    let mean_dist: f64 = points
        .iter()
        .map(|p| (p - centroid).norm())
        .sum::<f64>() / n;
    let s = (2.0_f64).sqrt() / mean_dist;
    let t = Matrix3::new(
        s,   0.0, -s * centroid.x,
        0.0, s,   -s * centroid.y,
        0.0, 0.0, 1.0,
    );
    let normalised = points
        .iter()
        .map(|p| Vector2::new(s * (p.x - centroid.x), s * (p.y - centroid.y)))
        .collect();
    (t, normalised)
}

fn fundamental_matrix(
    pts1: &[Vector2<f64>],
    pts2: &[Vector2<f64>],
) -> Matrix3<f64> {
    let (t1, n1) = normalise(pts1);
    let (t2, n2) = normalise(pts2);

    // Build the n × 9 design matrix from the normalised correspondences.
    let mut a = DMatrix::<f64>::zeros(n1.len(), 9);
    for (i, (p, q)) in n1.iter().zip(n2.iter()).enumerate() {
        a.row_mut(i).copy_from_slice(&[
            p.x * q.x, p.x * q.y, p.x,
            p.y * q.x, p.y * q.y, p.y,
            q.x,       q.y,       1.0,
        ]);
    }

    // Linear DLT: smallest right singular vector of A.
    let svd_a = a.svd(false, true);
    let v_t = svd_a.v_t.expect("right singular vectors");
    let f0 = v_t.row(v_t.nrows() - 1);
    let f0_mat = Matrix3::new(
        f0[0], f0[1], f0[2],
        f0[3], f0[4], f0[5],
        f0[6], f0[7], f0[8],
    );

    // Rank-2 enforcement.
    let svd_f = f0_mat.svd(true, true);
    let mut sigma = svd_f.singular_values;
    sigma[2] = 0.0;
    let f_hat = svd_f.u.unwrap()
        * Matrix3::from_diagonal(&sigma)
        * svd_f.v_t.unwrap();

    // Denormalise.
    t2.transpose() * f_hat * t1
}
```

The same normalisation transform $T$ is reused for the homography DLT — see [Homography](/atlas/homography) — so the two-line `normalise` helper above lives in a shared module rather than per-algorithm.

# Remarks

- **Isotropic scaling is sufficient.** Hartley's §6.2 tested a non-isotropic alternative (translate to origin, scale to unit principal moments — an affine transformation) and reported that "the results were little different from those obtained using the isotropic scaling method." The isotropic version is simpler to implement and gives equivalently good conditioning.
- **Rank-2 enforcement is Frobenius-optimal, not geometric-optimal.** Truncating the smallest singular value of $\hat F_0$ gives the closest rank-2 matrix in Frobenius norm but not in the geometric (Sampson or gold-standard) error. For calibration-grade accuracy, follow with Levenberg-Marquardt minimisation of the Sampson error using the normalised linear estimate as the initial guess.
- **Why normalisation is non-optional.** Without it, errors as large as 10 px on the recovered epipolar lines are typical (Graph 2 of the paper); the prevailing pre-1997 view that the 8-point algorithm is "virtually useless for most purposes" was an artefact of poor numerical practice, not the algorithm. The §5 insight is that the entries of $F$ multiplied by the largest point coordinates correspond to the smallest singular values of $A^T A$ — exactly the entries most corrupted by the rank-2 SVD truncation when $A^T A$ is ill-conditioned.
- **RANSAC role.** The normalised 8-point is **not** a minimal solver — minimal estimation of $F$ uses 7 points and a cubic polynomial root-finding step, or 5 points for the essential matrix in calibrated cameras (Nistér 2004). Inside RANSAC, use the 7-point or 5-point as the per-hypothesis sampler, and use the normalised 8-point as the non-minimal refinement step on the consensus set.
- **Planar-scene degeneracy.** When all scene points are coplanar, $A$ has rank $< 8$ and the linear system has no unique solution — the correct model is a homography, not a fundamental matrix. Detect this case via a homography-vs-$F$ inlier ratio test before committing to the fundamental-matrix model.
- **Same recipe for the homography DLT.** The conditioning argument is identical for the $9$-vector DLT solving for $H$: pre-condition both point sets with $T$ and $T'$, run the linear solve in normalised coordinates, then denormalise via $H = T'^{-1}\,\hat H\,T$. APAP (Zaragoza 2013) reuses this preconditioning before the Moving-DLT weights are applied so every per-cell SVD operates on a numerically well-scaled design matrix.

# References

1. R. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE TPAMI 19(6):580–593, 1997. [pdf](https://users.cecs.anu.edu.au/~hartley/Papers/fundamental/ICCV-final/fundamental.pdf)
2. H. C. Longuet-Higgins. *A Computer Algorithm for Reconstructing a Scene from Two Projections.* Nature 293:133–135, 1981. (Original 8-point algorithm for the calibrated essential matrix.)
3. R. Y. Tsai, T. S. Huang. *Uniqueness and Estimation of Three-Dimensional Motion Parameters of Rigid Objects with Curved Surfaces.* IEEE TPAMI 6(1):13–27, 1984. (SVD rank-2 enforcement = Frobenius-closest singular matrix.)
4. R. Hartley, A. Zisserman. *Multiple View Geometry in Computer Vision*, 2nd ed. Cambridge University Press, 2004. Chapters 9 and 11 give the definitive treatment.
5. D. Nistér. *An Efficient Solution to the Five-Point Relative Pose Problem.* IEEE TPAMI 26(6):756–770, 2004. (Minimal solver for the essential matrix.)
