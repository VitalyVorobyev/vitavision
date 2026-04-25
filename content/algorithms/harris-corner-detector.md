---
title: "Harris Corner Detector"
date: 2026-04-15
summary: "Scores each pixel by the Harris response R = det(M) − k·tr(M)², where M is the gradient covariance matrix summed over a Gaussian window; returns integer pixel locations where R exceeds a threshold and is a local maximum."
tags: ["feature-detection", "corner"]
category: corner-detection
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedAlgorithms: ["shi-tomasi-corner-detector", "fast-corner-detector", "chess-corners"]
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

Let $I_x, I_y: \Omega \to \mathbb{R}$ denote the image derivatives in the horizontal and vertical directions, approximated by central differences or Sobel operators. Let $w(u, v)$ denote a Gaussian window with standard deviation $\sigma$:

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
- The detector is not scale-invariant. Response peaks at the scale of the integration window $\sigma$. Multi-scale detection requires running the detector on a Gaussian image pyramid.
- The detector responds to general 2D intensity variation; it does not encode X-junction geometry. For chessboard calibration targets, a domain-specific detector yields higher selectivity.

# References

1. C. Harris, M. J. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. DOI: [10.5244/c.2.23](https://doi.org/10.5244/c.2.23)
2. J. Shi, C. Tomasi. *Good Features to Track.* IEEE CVPR, 1994. DOI: [10.1109/CVPR.1994.323794](https://doi.org/10.1109/CVPR.1994.323794)
