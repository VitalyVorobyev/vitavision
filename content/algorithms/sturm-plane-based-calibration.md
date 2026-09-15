---
title: "Sturm-Maybank Plane-Based Calibration"
date: 2026-05-02
summary: "Recover camera intrinsics from one or more views of one or more planar targets via the same two IAC-on-homography constraints as Zhang's method, with an exhaustive singularity catalogue and a generalisation to variable intrinsics (zooming cameras) — the concurrent CVPR 1999 derivation of plane-based calibration."
tags: ["camera-model"]
domain: calibration
tasks: [camera-calibration]
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [pinhole-camera-model, homography]
failureModes: []
sources:
  primary: sturm2003-plane-based
  references:
    - zhang2000-flexible
  notes: |
    Concurrent with Zhang 1999 (ICCV; published as TPAMI 2000). Same two
    IAC linear constraints per homography (Eq. 4 in Sturm-Maybank, Eqs. 3-4
    in Zhang). Primary distinguishing contributions: (a) exhaustive
    singularity catalogue for one- and two-plane setups (Tables 1 and 2);
    (b) variable-intrinsics extension for zooming cameras (§4.2 — additional
    columns in the design matrix per zoom position); (c) prior-knowledge
    incorporation as linear constraints (§4.1). Numerical: column rescaling
    of A "proved to be crucial" for reliable IAC recovery; row rescaling
    explicitly avoided (§4.3) because near-zero rows magnify noise. Note
    paper_id "2003" is an index artefact — paper is CVPR 1999.
---

# Goal

Given $n \geq 1$ plane-to-image homographies $\{H_i\}$ from views of one or more planar calibration targets, recover the camera intrinsic matrix $K$ (focal length $f$, aspect ratio $\alpha$, principal point $(u_0, v_0)$, skew $s = 0$). The method shares the core mathematical framework with [Zhang's planar calibration](/atlas/zhang-planar-calibration) — both papers derive the same two linear IAC constraints per homography from the orthonormality of the rotation columns. The distinguishing contributions are an exhaustive singularity catalogue (Tables 1 and 2 of the paper) and a generalisation to **variable intrinsics** (zooming or focusing cameras with per-view focal length).

# Algorithm

A planar calibration target at $Z = 0$ maps to its image by $H \sim K\,R\,[I \mid t]$ (Eq. 2 of paper, dropping the third column of $R$). The first two columns of $R$ are orthonormal, which encodes two homogeneous linear constraints on the **image of the absolute conic** $\omega = K^{-T}K^{-1}$ per view:

$$
h_1^T\,\omega\,h_1 - h_2^T\,\omega\,h_2 = 0, \qquad h_1^T\,\omega\,h_2 = 0,
\quad \text{(Eq. 4)}
$$

where $h_i$ is the $i$-th column of $H$. With skew fixed to zero, $\omega$ has 5 degrees of freedom and is encoded as the 5-vector $x = [\omega_{11}, \omega_{22}, \omega_{13}, \omega_{23}, \omega_{33}]^T$. Stacking $n$ homographies yields a $2n \times 5$ design matrix $A$; the IAC vector is the smallest right singular vector of $A$.

Once $\omega$ is recovered, the intrinsic parameters extract in closed form (Eq. 5):

$$
\alpha^2 = \frac{\omega_{22}}{\omega_{11}}, \qquad u_0 = -\frac{\omega_{13}}{\omega_{11}}, \qquad v_0 = -\frac{\omega_{23}}{\omega_{22}}, \qquad f^2 = \frac{\omega_{11}\omega_{22}\omega_{33} - \omega_{22}\omega_{13}^2 - \omega_{11}\omega_{23}^2}{\omega_{11}\omega_{22}^2}.
$$

:::definition[Variable-intrinsics extension]
For a zooming camera where focal length (or focal length plus principal point) varies per view, each new view introduces additional unknowns ($\omega_{33}$, or $\omega_{33}, \omega_{13}, \omega_{23}$) that are added as **new columns** to the design matrix $A$ (§4.2). The aspect ratio $\alpha$ is assumed constant across views (the paper explicitly excludes independently varying aspect ratios). The linear structure is preserved; the SVD recovers all intrinsics simultaneously. With $n$ zoom positions and 3 new unknowns per view, the system is $2n \times (2 + 3n)$ — adequate redundancy requires $\geq 3$ planes per zoom position.
:::

:::algorithm[Sturm-Maybank plane-based calibration]
::input[Set of plane-to-image homographies $\{H_i\}_{i=1}^{n}$, optionally with prior knowledge of any subset of intrinsic parameters.]
::output[Intrinsic matrix $K$ (or per-view variants for variable intrinsics) and per-view extrinsics $(R_i, t_i)$.]

1. **Build design matrix $A$.** For each $H_i$, extract two rows from Eq. 4 (rewritten as linear in $x$). Stack into $A \in \mathbb{R}^{2n \times 5}$.
2. **Apply prior knowledge** (§4.1, optional). Eliminate columns of $A$ corresponding to known intrinsics: known aspect ratio → drop $\omega_{22}$; known $u_0$ → drop $\omega_{13}$; known $v_0$ → drop $\omega_{23}$.
3. **Column-rescale $A$** so each column has unit norm. This step "proved to be crucial" (§4.3); without it the SVD solution is dominated by the largest-scale column and the recovered IAC is unreliable.
4. **Solve $Ax = 0$ by SVD;** take $x$ as the right singular vector of smallest singular value.
5. **Extract $K$** from $\omega$ via Eq. 5 (or equivalent Cholesky decomposition). Verify $\omega$ is positive-definite — indefinite $\omega$ indicates a degenerate or badly conditioned configuration.
6. **Recover per-view extrinsics** from each $H_i$ as in Zhang's algorithm (Step 5 of [Zhang's procedure](/atlas/zhang-planar-calibration)): $r_1, r_2$ from $K^{-1} h_1, K^{-1} h_2$; $r_3 = r_1 \times r_2$; project to $SO(3)$ if needed.
:::

# Implementation

Constraint stacking (Eq. 4), column rescaling (§4.3), and the SVD solve for the IAC 5-vector, in Rust:

```rust
use nalgebra::{Matrix3, Vector3, DMatrix};

/// One occurrence of the bilinear form $h_i^T \omega h_j$, linear in
/// $x = [\omega_{11}, \omega_{22}, \omega_{13}, \omega_{23}, \omega_{33}]$.
fn omega_row(hi: &Vector3<f64>, hj: &Vector3<f64>) -> [f64; 5] {
    [
        hi[0] * hj[0],
        hi[1] * hj[1],
        hi[0] * hj[2] + hi[2] * hj[0],
        hi[1] * hj[2] + hi[2] * hj[1],
        hi[2] * hj[2],
    ]
}

/// Builds A from Eq. 4 and returns the IAC 5-vector as the smallest
/// right singular vector.
fn iac_from_homographies(hs: &[Matrix3<f64>]) -> [f64; 5] {
    let mut a = DMatrix::<f64>::zeros(2 * hs.len(), 5);
    for (i, h) in hs.iter().enumerate() {
        let (h1, h2) = (h.column(0).into_owned(), h.column(1).into_owned());
        let (r11, r22, r12) = (omega_row(&h1, &h1), omega_row(&h2, &h2), omega_row(&h1, &h2));
        for k in 0..5 {
            a[(2 * i, k)] = r11[k] - r22[k]; // h1^T w h1 - h2^T w h2 = 0
            a[(2 * i + 1, k)] = r12[k];      // h1^T w h2 = 0
        }
    }
    // Column rescaling: "proved to be crucial" for a reliable solve (§4.3).
    for k in 0..5 {
        let scale = (0..a.nrows()).map(|r| a[(r, k)].powi(2)).sum::<f64>().sqrt();
        if scale > 0.0 {
            for r in 0..a.nrows() {
                a[(r, k)] /= scale;
            }
        }
    }
    let svd = a.svd(false, true);
    let vt = svd.v_t.expect("right singular vectors");
    let x = vt.row(vt.nrows() - 1);
    [x[0], x[1], x[2], x[3], x[4]]
}
```

The returned 5-vector is $[\omega_{11}, \omega_{22}, \omega_{13}, \omega_{23}, \omega_{33}]$; $K$ follows from the closed form in Eq. 5 above. Even rows of $A$ are the first constraint of Eq. 4, odd rows the second.

# Remarks

- **Singularity catalogue.** Tables 1 and 2 of the paper enumerate every plane-orientation configuration that renders one or more intrinsic parameters unrecoverable. Selected key cases:
  - **Plane parallel to the image plane** — only $\alpha$ and $v_0$ estimable. The homography degenerates to a similarity; no focal-length information.
  - **Plane perpendicular to the image plane** — only $u_0, v_0$ estimable. Aspect ratio and focal length unrecoverable.
  - **Two planes related by reflection** (vanishing lines mutually reflected across both image axes) — full singularity. No intrinsic parameter is estimable. This is geometrically equivalent to an orbit-like camera motion that maps the circular points of the first plane onto those of the second.
  - **Vanishing-line intersection on a principal-point axis** — the corresponding principal-point coordinate is unrecoverable.
  Awareness of this catalogue is essential when designing calibration rigs and when diagnosing unexpected calibration failures.
- **Circular-points geometric framing.** Each plane in 3D has two circular points at infinity ($I = [1, i, 0]^T$, $J = [1, -i, 0]^T$ in its metric frame). The plane-to-image homography $H$ maps these to $h_1 \pm i\,h_2$ in the image. The IAC $\omega$ is the locus of all such circular-point images across all plane orientations — each non-parallel new plane adds a new pair of circular-point images and two independent constraints. Singularities arise when successive views contribute the same (or dependent) circular-point projections.
- **No distortion model.** §4.3 acknowledges distortion as future work; the algorithm is pinhole-only. For real cameras with appreciable lens distortion, follow with [Zhang's full-pipeline LM refinement](/atlas/zhang-planar-calibration) using two-term radial $(k_1, k_2)$ — Sturm-Maybank's IAC vector serves as the linear initialisation.
- **Column rescaling is critical, row rescaling is dangerous.** Columns of $A$ correspond to $\omega$ entries with very different natural scales (depending on focal length and resolution); column rescaling to unit norm is essential. Row rescaling, by contrast, would amplify near-zero rows that arise near singular configurations — the paper explicitly warns against it (§4.3).
- **Variable-intrinsics is the unique generalisation.** Zhang assumes constant intrinsics across views; Sturm-Maybank §4.2 accommodates a zooming camera by treating $f$ (or $f, u_0, v_0$) as per-view unknowns. Table 4 of the paper reports $< 1\%$ focal-length error across 5 zoom positions with 3 planes per position.
- **Compared with Zhang:** see [When to choose Zhang over Sturm-Maybank](/atlas/zhang-planar-calibration#when-to-choose-zhang-over-sturm-maybank) on the Zhang page, which hosts the comparison per the "more general scope" tiebreaker (Zhang covers the end-to-end calibration pipeline with distortion and LM refinement; Sturm-Maybank focuses on the linear IAC step plus singularity analysis and variable intrinsics).

# References

1. P. F. Sturm, S. J. Maybank. *On Plane-Based Camera Calibration: A General Algorithm, Singularities, Applications.* IEEE CVPR 1999, pp. 432–437. DOI: [10.1109/CVPR.1999.786974](https://doi.org/10.1109/CVPR.1999.786974). [pdf](https://inria.hal.science/inria-00525681/document)
2. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11):1330–1334, 2000. (Concurrent independent derivation of the same two IAC constraints; the more practical end-to-end pipeline.)
3. O. D. Faugeras. *Stratification of three-dimensional vision: projective, affine, and metric representations.* JOSA A 12(3):465–484, 1995. (IAC as the link between projective and metric reconstruction.)
4. R. K. Lenz, R. Y. Tsai. *Techniques for calibration of the scale factor and image center for high accuracy 3D machine vision metrology.* IEEE TPAMI 10(5):713–720, 1988. (Earlier planar calibration work cited as antecedent.)
