---
title: "Lucas-Kanade Image Registration"
date: 2026-05-13
summary: "Iterative Newton-Raphson method that estimates the parametric warp between two images by linearising the residual and solving the resulting weighted normal equation per iteration."
tags: ["motion", "optical-flow", "image-registration"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [image-gradient, structure-tensor]
failureModes: []
sources:
  primary: lucas1981-lucas-kanade
  references: [shi-tomasi1994-features]
  notes: |
    The 1D scalar update is eq (9) of the paper: $h \approx \sum F'(G-F) / \sum F'^2$.
    The N-D update (§4.5) replaces $F'$ with the gradient column and the denominator
    with the gradient outer-product sum — the same matrix later called the structure
    tensor. Affine extension (§4.6, eq 11) and joint photometric ($\alpha, \beta$)
    estimation are sketched in the paper; convergence basin proved for $F=\sin x$
    is $|h_0| < \pi$ (§4.3).
relations:
  - type: extended_by
    target: shi-tomasi-corner-detector
    confidence: high
    caution: "Shi-Tomasi derives the feature-selection threshold from the conditioning of the LK normal-equation matrix and adds a 6-DOF affine variant with dissimilarity monitoring."
  - type: extended_by
    target: black-anandan-robust-flow
    confidence: high
    caution: "Robust M-estimator version of the parametric variant; same machinery as Black-Anandan's piecewise-smooth flow."
---

# Goal

Estimate the parametric warp that aligns two grayscale image functions $F, G : \Omega \to \mathbb{R}$ given an initial estimate of the warp parameters. Input: two images on a shared pixel domain, a region of interest $R \subset \Omega$, and an initial parameter vector (translation, affine, or affine plus linear photometric adjustment). Output: refined warp parameters in $\mathbb{R}^n$ that minimise the squared photometric residual over $R$. The algorithm replaces brute-force search over the parameter space with Newton-Raphson iteration on the first-order Taylor expansion of the residual, reducing the per-iteration cost to one $n \times n$ linear solve and lowering the average complexity from $O(M^2 N^2)$ to $O(M^2 \log N)$ for an $N \times N$ image with $M \times M$ disparity range.

# Algorithm

Let $F, G : \Omega \to \mathbb{R}$ denote two grayscale image functions on pixel domain $\Omega \subset \mathbb{R}^2$.
Let $R \subset \Omega$ denote the region of interest.
Let $\mathbf{h} \in \mathbb{R}^n$ denote the warp parameter vector — for pure translation $n = 2$ and $\mathbf{h}$ is the displacement.
Let $\partial F / \partial \mathbf{x}$ denote the spatial intensity gradient of $F$ as a column vector.
Let $w(\mathbf{x})$ denote a per-pixel weight.

:::definition[Linearised residual]
First-order Taylor expansion of the warped image around the current estimate $\mathbf{h}_k$.

$$
F(\mathbf{x} + \mathbf{h}) \approx F(\mathbf{x}) + \mathbf{h} \cdot \frac{\partial F}{\partial \mathbf{x}}.
$$
:::

:::definition[Squared photometric error]
Sum of squared brightness differences between the warped $F$ and the reference $G$ over the region $R$.

$$
E(\mathbf{h}) = \sum_{\mathbf{x} \in R} \bigl[\,F(\mathbf{x} + \mathbf{h}) - G(\mathbf{x})\,\bigr]^{2}.
$$
:::

:::definition[Gradient outer-product matrix]
Symmetric positive-semidefinite $n \times n$ matrix formed by summing the outer product of the gradient over $R$.

$$
M(R) = \sum_{\mathbf{x} \in R} w(\mathbf{x})\,\Bigl(\tfrac{\partial F}{\partial \mathbf{x}}\Bigr)\Bigl(\tfrac{\partial F}{\partial \mathbf{x}}\Bigr)^{T}.
$$
:::

Substituting the linearised residual into $E$, differentiating with respect to $\mathbf{h}$, and setting the gradient to zero yields the closed-form parameter update:

$$
\Delta \mathbf{h} \;=\; M(R)^{-1} \sum_{\mathbf{x} \in R} w(\mathbf{x})\,\Bigl(\tfrac{\partial F}{\partial \mathbf{x}}\Bigr)\,\bigl[\,G(\mathbf{x}) - F(\mathbf{x} + \mathbf{h}_{k})\,\bigr].
$$

The matrix $M(R)$ is identical to the structure tensor used by Harris and Shi-Tomasi corner detectors; its invertibility is the precondition under which the update is well-defined. In one dimension this reduces to the scalar form (eq 9 of the paper):

$$
h \;\approx\; \frac{\sum_{x \in R} F'(x)\,[G(x) - F(x)]}{\sum_{x \in R} F'(x)^{2}}.
$$

The natural least-squares weighting $w(\mathbf{x}) = \|\partial F / \partial \mathbf{x}\|^{2}$ falls out of the derivation and is the form used in practice.

:::algorithm[Lucas-Kanade iterative registration]
::input[Images $F, G$ on shared domain $\Omega$; region $R \subset \Omega$; initial parameter vector $\mathbf{h}_0 \in \mathbb{R}^n$; convergence tolerance $\varepsilon$; iteration cap $K$.]
::output[Refined parameter vector $\mathbf{h} \in \mathbb{R}^n$.]

1. Compute the spatial gradient $\partial F / \partial \mathbf{x}$ on $R$.
2. Set $k = 0$ and $\mathbf{h}_k = \mathbf{h}_0$.
3. Form the gradient outer-product matrix $M(R)$ and the right-hand side $\mathbf{b}_k = \sum_{\mathbf{x} \in R} w(\mathbf{x})\,(\partial F / \partial \mathbf{x})\,[G(\mathbf{x}) - F(\mathbf{x} + \mathbf{h}_k)]$.
4. Solve $M(R)\,\Delta \mathbf{h}_k = \mathbf{b}_k$.
5. Update $\mathbf{h}_{k+1} = \mathbf{h}_k + \Delta \mathbf{h}_k$.
6. If $\|\Delta \mathbf{h}_k\| < \varepsilon$ or $k = K$, return $\mathbf{h}_{k+1}$.
7. Otherwise set $k \leftarrow k + 1$ and return to step 3.
:::

## Coarse-to-fine extension

The single-resolution iteration converges only when $\mathbf{h}_0$ lies within the basin of attraction; for the canonical sinusoid $F(x) = \sin x$ the basin is $|h_0| < \pi$, that is, half a wavelength. Smoothing $F$ and $G$ with a low-pass kernel widens the basin in proportion to the suppressed bandwidth, at the cost of attenuating fine-scale detail. The standard remedy applies the update at successively finer levels of a Gaussian pyramid: solve at the coarsest level, upsample $\mathbf{h}$ by two, repeat. The pyramid extends the usable disparity to approximately half the image width.

## Affine and photometric generalisations

For an affine warp $G(\mathbf{x}) = F(\mathbf{x} A + \mathbf{h})$ the linearised residual becomes

$$
F(\mathbf{x}(A + \Delta A) + (\mathbf{h} + \Delta \mathbf{h})) \;\approx\; F(\mathbf{x} A + \mathbf{h}) + (\mathbf{x}\, \Delta A + \Delta \mathbf{h}) \cdot \tfrac{\partial F}{\partial \mathbf{x}}.
$$

In two dimensions this yields a $6 \times 6$ normal equation per iteration, against the $2 \times 2$ system of the pure-translation case. A linear photometric correction $F = \alpha G + \beta$ can be absorbed into the same quadratic form; jointly minimising over $(\mathbf{h}, A, \alpha, \beta)$ recovers normalised cross-correlation when $A$ is ignored, and the $L_2$ norm when $\alpha, \beta$ are ignored as well.

# Implementation

The 2-D translation kernel in Rust, mirroring the procedure block above:

```rust
fn lucas_kanade_step(
    f: &[f32], g: &[f32], w: usize, h: usize,
    roi: (usize, usize, usize, usize),  // (x0, y0, x1, y1)
    dx: (f32, f32),
) -> (f32, f32) {
    let (x0, y0, x1, y1) = roi;
    let (mut a11, mut a12, mut a22) = (0.0f32, 0.0f32, 0.0f32);
    let (mut b1, mut b2) = (0.0f32, 0.0f32);
    let sample = |img: &[f32], x: f32, y: f32| -> f32 {
        let xi = x.clamp(0.0, (w - 1) as f32);
        let yi = y.clamp(0.0, (h - 1) as f32);
        let (x0i, y0i) = (xi as usize, yi as usize);
        let (fx, fy) = (xi - x0i as f32, yi - y0i as f32);
        let i00 = img[y0i * w + x0i];
        let i10 = img[y0i * w + (x0i + 1).min(w - 1)];
        let i01 = img[(y0i + 1).min(h - 1) * w + x0i];
        let i11 = img[(y0i + 1).min(h - 1) * w + (x0i + 1).min(w - 1)];
        (1.0 - fx) * (1.0 - fy) * i00 + fx * (1.0 - fy) * i10
            + (1.0 - fx) * fy * i01 + fx * fy * i11
    };
    for y in y0..y1 {
        for x in x0..x1 {
            let fx = 0.5 * (sample(f, x as f32 + 1.0 + dx.0, y as f32 + dx.1)
                - sample(f, x as f32 - 1.0 + dx.0, y as f32 + dx.1));
            let fy = 0.5 * (sample(f, x as f32 + dx.0, y as f32 + 1.0 + dx.1)
                - sample(f, x as f32 + dx.0, y as f32 - 1.0 + dx.1));
            let r = g[y * w + x] - sample(f, x as f32 + dx.0, y as f32 + dx.1);
            a11 += fx * fx;  a12 += fx * fy;  a22 += fy * fy;
            b1  += fx * r;   b2  += fy * r;
        }
    }
    let det = a11 * a22 - a12 * a12;
    ((a22 * b1 - a12 * b2) / det, (a11 * b2 - a12 * b1) / det)
}
```

The accumulators `a11, a12, a22` form the $2 \times 2$ structure tensor; `b1, b2` form the gradient-weighted residual. The final two divisions invert the matrix in closed form and return $\Delta \mathbf{h}$.

# Remarks

- Per-iteration cost is $O(|R|)$ for accumulating the five sums and $O(n^3)$ for the linear solve; for 2-D translation the solve is two divisions. Average iteration count is $O(M^2 \log N)$ on an $N \times N$ image with $M \times M$ disparity range.
- Convergence is guaranteed only when the initial estimate lies within the basin of attraction of the linearisation; the canonical sinusoid bound is half a wavelength of the dominant spatial frequency. Coarse-to-fine pyramids extend the usable disparity range.
- The normal-equation matrix is rank-deficient on 1-D edges (aperture problem) and on textureless regions; both cases produce an ill-defined update. Feature-selection criteria based on the smaller eigenvalue of the same matrix avoid both.
- Brightness consistency between $F$ and $G$ is assumed; an explicit linear photometric correction can be absorbed into the same quadratic form when exposure or gain differs between the images.
- The translation, affine, and photometric variants share one derivation: linearise the residual, differentiate the squared error, solve the resulting normal equation, iterate.
- The method is the basis of sparse optical-flow trackers and the gradient-based stage of many direct visual-odometry frontends; the dense variant is Horn-Schunck rather than Lucas-Kanade.
- Replacing the squared photometric residual with a redescending M-estimator (Lorentzian or Geman-McClure) and solving by IRLS within a graduated non-convexity schedule yields a robust parametric-motion variant that handles multiple motions and outliers within $R$; see [black-anandan-robust-flow](../algorithms/black-anandan-robust-flow). The same machinery extends to the piecewise-smooth dense flow case.

# References

1. B. D. Lucas, T. Kanade. *An Iterative Image Registration Technique with an Application to Stereo Vision.* IJCAI, 1981. [PDF](https://www.ri.cmu.edu/pub_files/pub3/lucas_bruce_d_1981_2/lucas_bruce_d_1981_2.pdf)
2. J. Shi, C. Tomasi. *Good Features to Track.* CVPR, 1994. [PDF](https://www.ces.clemson.edu/~stb/klt/shi-tomasi-good-features-cvpr1994.pdf)
