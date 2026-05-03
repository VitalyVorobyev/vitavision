---
title: "Harris Corner Detector"
date: 2026-04-15
summary: "Scores each pixel by the Harris response R = det(M) − k·tr(M)², where M is the gradient covariance matrix summed over a Gaussian window; returns integer pixel locations where R exceeds a threshold and is a local maximum."
tags: ["feature-detection", "corner"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedAlgorithms: ["chess-corners", "duda-radon-corners", "fast-corner-detector", "laureano-topological-chessboard", "puzzleboard", "pyramidal-blur-aware-xcorner", "shi-tomasi-corner-detector", "shu-topological-grid"]
prerequisites: [image-gradient, structure-tensor]
comparedWith: [shi-tomasi-corner-detector, fast-corner-detector, chess-corners]
failureModes: []
sources:
  primary: harris1988-corner
  references: [shi-tomasi1994-features]
  notes: |
    Structure tensor M = sum_w [Ix^2, IxIy; IxIy, Iy^2] over a Gaussian-weighted
    window w. Response R = det(M) - k * tr(M)^2 with empirical k ~ 0.04-0.06.
---

# Goal

Detect corners in a grayscale image $I: \Omega \to \mathbb{R}$ on pixel domain $\Omega \subset \mathbb{Z}^2$. Output: a set of integer pixel locations $\{(x_i, y_i)\} \subset \Omega$ at which intensity varies strongly in two independent directions. The detector responds to local image structure where both principal curvatures of the local autocorrelation function are large — flat regions and edges are suppressed.

# Algorithm

Let $I_x, I_y: \Omega \to \mathbb{R}$ denote the image derivatives in the horizontal and vertical directions. The original kernel is the central difference $I_x = I \otimes (-1, 0, 1)$ and $I_y = I \otimes (-1, 0, 1)^\top$; Sobel or Scharr kernels are common alternatives with improved high-frequency response. Let $w(u, v)$ denote a Gaussian window with standard deviation $\sigma$:

$$
w(u, v) = \exp\!\left(-\frac{u^2 + v^2}{2\sigma^2}\right).
$$

Let $\alpha, \beta$ denote the eigenvalues of $M$ at a given pixel.

:::definition[Structure tensor (M)]
The $2 \times 2$ symmetric matrix summarising gradient covariance in a local neighbourhood.

$$
M = \sum_{(u,v)} w(u,v)
\begin{bmatrix}
I_x^2 & I_x I_y \\
I_x I_y & I_y^2
\end{bmatrix},
$$

with entries $A = I_x^2 \otimes w$, $B = I_y^2 \otimes w$, $C = (I_x I_y) \otimes w$, so that $\operatorname{tr}(M) = A + B = \alpha + \beta$ and $\det(M) = AB - C^2 = \alpha\beta$.
:::

:::definition[Harris response (R)]
A rotation-invariant corner score expressed in terms of $\operatorname{tr}(M)$ and $\det(M)$ to avoid explicit eigendecomposition.

$$
R = \det(M) - k \cdot \operatorname{tr}(M)^2,
$$

where $k$ is an empirical sensitivity constant, typically in the range $0.04$–$0.06$. $R > 0$ in corner regions, $R < 0$ on edges, and $|R|$ small in flat regions.
:::

![Harris response regions in the (λ₁, λ₂) plane: flat near the origin, edge along each axis (R < 0), corner along the diagonal (R > 0).](./images/harris-corner-detector/eigenvalue-classification.svg)

## Procedure

:::algorithm[Harris corner detection]
::input[Grayscale image $I$ on domain $\Omega$; Gaussian window parameter $\sigma$; sensitivity constant $k$; threshold $\tau$.]
::output[Set of integer pixel locations $\{(x_i, y_i)\}$ marking detected corners.]

1. Compute $I_x$ and $I_y$ across the image via central differences or Sobel operators.
2. Form the per-pixel products $I_x^2$, $I_y^2$, and $I_x I_y$.
3. Convolve each product with the Gaussian window $w$ to obtain the entries $A$, $B$, $C$ of $M$ at every pixel.
4. Compute $R(x, y) = (A \cdot B - C^2) - k \cdot (A + B)^2$ at every pixel.
5. Discard pixels with $R(x, y) \leq \tau$.
6. Apply non-maximum suppression: retain only pixels whose $R$ value is an 8-way local maximum.
:::

# Implementation

The per-pixel response computation in Rust:

```rust
fn harris_response(img: &[f32], w: usize, h: usize, sigma: f32, k: f32) -> Vec<f32> {
    // Step 1: gradients via central differences
    let (ix, iy) = gradients(img, w, h);
    // Step 2: per-pixel products
    let ixx: Vec<f32> = ix.iter().zip(&ix).map(|(a, b)| a * b).collect();
    let iyy: Vec<f32> = iy.iter().zip(&iy).map(|(a, b)| a * b).collect();
    let ixy: Vec<f32> = ix.iter().zip(&iy).map(|(a, b)| a * b).collect();
    // Step 3: Gaussian-blur each component to obtain M's entries A, B, C
    let a = gaussian_blur(&ixx, w, h, sigma);
    let b = gaussian_blur(&iyy, w, h, sigma);
    let c = gaussian_blur(&ixy, w, h, sigma);
    // Step 4: R = det(M) - k * tr(M)^2 per pixel
    a.iter().zip(&b).zip(&c)
        .map(|((&aa, &bb), &cc)| (aa * bb - cc * cc) - k * (aa + bb).powi(2))
        .collect()
}
```

`gradients` and `gaussian_blur` are standard helpers; `gradients` returns central-difference derivatives and `gaussian_blur` applies a separable Gaussian kernel. Each line of the kernel corresponds directly to a step in the [Procedure](#procedure) above.

# Remarks

- Complexity: $O(|\Omega|)$ per scale — gradient computation, three convolutions (one per product $I_x^2$, $I_y^2$, $I_x I_y$), and a fixed scalar arithmetic pass per pixel. Separable Gaussian convolutions vectorize over rows.
- The sensitivity constant $k$ is typically in 0.04–0.06. The response is a continuous function of $k$; smaller values suppress edge responses less aggressively.
- The response is rotation-invariant by construction: $\operatorname{tr}(M)$ and $\det(M)$ are both rotation-invariant quantities.
- Contrast scaling: under intensity scaling $I \to \rho I$, the eigenvalues $\alpha, \beta$ scale as $\rho^2$ and $R$ scales as $\rho^4$. The threshold $\tau$ must be adapted per-image; a fixed $\tau$ across exposures yields inconsistent detection rates.
- The detector is not scale-invariant. Response peaks at the scale of the integration window $\sigma$. Multi-scale detection requires running the detector on a Gaussian image pyramid.
- The detector responds to general 2D intensity variation; it does not encode X-junction geometry. For chessboard calibration targets, a domain-specific detector yields higher selectivity.
- Scope: this page covers the corner-detection path only. The original paper additionally defines edge pixels as $R < 0$ local minima in the dominant gradient direction, producing a combined edge-vertex map; that path is omitted here.

## When to choose Harris over Shi-Tomasi

[Shi-Tomasi](/atlas/shi-tomasi-corner-detector) computes the same structure tensor $M$ but uses $R = \min(\lambda_1, \lambda_2)$ instead of $\det(M) - k\,\mathrm{tr}(M)^2$. The two operators differ in three concrete ways:

| | Harris | Shi-Tomasi |
|---|---|---|
| Response form | $\lambda_1\lambda_2 - k(\lambda_1+\lambda_2)^2$ | $\min(\lambda_1, \lambda_2)$ |
| Eigendecomposition | not required (uses $\det$ and $\mathrm{tr}$) | required at every pixel |
| Hyperparameter | sensitivity constant $k \in [0.04, 0.06]$ | none beyond the threshold |
| Threshold meaning | algebraic units of gradient-squared-squared | directly the smaller principal curvature |

Choose Harris when (1) you want to skip the per-pixel $\sqrt{\,}$ for eigenvalue extraction — this matters in tight per-pixel budgets, e.g. embedded vision; (2) you are happy tuning $k$ once for your imagery and want a smooth response surface (Shi-Tomasi's $\min$ has a non-differentiable ridge at $\lambda_1 = \lambda_2$); (3) you need exactly the operator from the literature, since most reference implementations and many follow-on detectors (FAST, ChESS) use Harris as a comparison baseline.

Choose Shi-Tomasi when the threshold's meaning matters — Shi-Tomasi's $\min$-eigenvalue threshold transfers more cleanly across exposures and image sizes since it is the smaller principal curvature in physical units, whereas Harris's $R$ scales as $\rho^4$ under intensity scaling $I \to \rho I$ and requires per-image rescaling.

## When to choose Harris over FAST

[FAST](/atlas/fast-corner-detector) replaces the gradient-based operator with a binary segment-test on a 16-pixel Bresenham ring around each candidate. The operators detect overlapping but distinct corner sets:

| | Harris | FAST |
|---|---|---|
| Per-pixel cost | 3 convolutions + arithmetic | 4–9 integer comparisons (cardinal-test early reject) |
| Output | continuous response, ranks corners | binary classification, no ranking |
| Noise robustness | strong (gradient averaging integrates noise) | weak (point intensity comparisons amplify noise) |
| Rotation invariance | yes by construction | yes, but the segment-test threshold $t$ shifts the operating point |
| Repeatability under blur | high | degrades faster than Harris |

Choose Harris when (1) you need a continuous ranking — Shi-Tomasi-style NMS works on Harris responses, while FAST returns a binary mask that downstream code typically re-ranks with Harris anyway; (2) you have a noise budget — Rosten 2006 reports FAST's repeatability collapses faster than Harris under additive noise (Figure 6D); (3) the speed gap doesn't pay for itself in your pipeline, since pairing FAST with Harris for ranking eliminates FAST's main advantage.

Choose FAST when sub-millisecond per-pixel detection is the bottleneck and downstream stages tolerate the binary output — typical in real-time visual SLAM front-ends where the detector's recall, not its rank quality, is what matters.

## When to choose Harris over ChESS

[ChESS](/atlas/chess-corners) is X-junction-specific by construction: it computes a sign-alternation count on a 16-pixel ring tuned to detect 4-quadrant alternating intensity patterns. Harris responds to any 2D intensity variation — corners, blobs, T-junctions, generic interest points — without target-specific tuning.

| | Harris | ChESS |
|---|---|---|
| Detects | general 2D corners | X-junctions only |
| On a chessboard | fires at X-corners, edge intersections, and texture | fires only at X-corners (rejects edges and blobs) |
| Per-pixel cost | comparable | comparable (16 ring samples + small arithmetic) |
| Sub-pixel refinement | not built in | not built in (commonly paired with Hessian saddle) |
| Contrast sensitivity | $R$ scales as $\rho^4$ | adaptive threshold via mean-of-ring (more contrast-portable) |

Choose Harris when the input is not a chessboard — Harris is the right tool for SfM front-ends, image matching, and tracking where any salient interest point is useful. Choose ChESS when the input is a chessboard calibration target and you need to suppress every false candidate (edge crossings, board borders, background texture) — Harris on a chessboard typically requires a downstream topology filter (Shu, Laureano) to remove the non-X-corner candidates that ChESS rejects at source.

# References

1. C. Harris, M. J. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. DOI: [10.5244/c.2.23](https://doi.org/10.5244/c.2.23)
2. J. Shi, C. Tomasi. *Good Features to Track.* IEEE CVPR, 1994. DOI: [10.1109/CVPR.1994.323794](https://doi.org/10.1109/CVPR.1994.323794)
