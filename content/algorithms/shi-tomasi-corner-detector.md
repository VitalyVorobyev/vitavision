---
title: "Shi-Tomasi Corner Detector"
date: 2026-04-15
summary: "Scores each pixel by the smaller eigenvalue of the gradient structure tensor M; returns integer pixel locations where that eigenvalue exceeds a threshold, derived from a feature-tracking quality criterion."
tags: ["computer-vision", "feature-detection", "corner"]
category: corner-detection
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedAlgorithms: ["harris-corner-detector", "fast-corner-detector", "chess-corners"]
sources:
  primary: shi-tomasi1994-features
  references: [harris1988-corner]
  notes: |
    Uses the same structure tensor M as Harris, but replaces the Harris
    response with R = min(λ₁, λ₂) — the smaller eigenvalue of M. The
    threshold then encodes a feature-tracking quality criterion derived
    in §3 of the paper.
---

# Goal

Detect corners in a grayscale image $I: \Omega \to \mathbb{R}$ on pixel domain $\Omega \subset \mathbb{Z}^2$. Output: a set of integer pixel locations $\{(x_i, y_i)\} \subset \Omega$ at which intensity varies strongly in two independent directions. The response is the smaller eigenvalue of the gradient structure tensor — the quantity that directly bounds the worst-conditioned direction of local intensity variation. The acceptance threshold $\tau$ is not a heuristic: it is derived in §3 of the paper from the condition that the linear system governing feature displacement must be both above the noise level and well-conditioned for reliable tracking.

# Algorithm

Let $I_x, I_y: \Omega \to \mathbb{R}$ denote the image derivatives in the horizontal and vertical directions, approximated by central differences or Sobel operators. Let $w(u, v)$ denote a Gaussian window with standard deviation $\sigma$:

$$
w(u, v) = \exp\!\left(-\frac{u^2 + v^2}{2\sigma^2}\right).
$$

Let $\lambda_1 \geq \lambda_2$ denote the eigenvalues of $M$ at a given pixel.

:::definition[Structure tensor (M)]
The $2 \times 2$ symmetric matrix summarising gradient covariance in a local neighbourhood, identical to the structure tensor of Harris.

$$
M = \sum_{(u,v)} w(u,v)
\begin{bmatrix}
I_x^2 & I_x I_y \\
I_x I_y & I_y^2
\end{bmatrix},
$$

with entries $A = I_x^2 \otimes w$, $B = I_y^2 \otimes w$, $C = (I_x I_y) \otimes w$, so that $\operatorname{tr}(M) = A + B = \lambda_1 + \lambda_2$ and $\det(M) = AB - C^2 = \lambda_1 \lambda_2$.
:::

:::definition[Shi-Tomasi response (R)]
The smaller eigenvalue of $M$:

$$
R = \lambda_2 = \min(\lambda_1, \lambda_2).
$$

Computed in closed form from $\operatorname{tr}(M)$ and $\det(M)$ as

$$
\lambda_{1,2} = \tfrac{1}{2}\left(\operatorname{tr}(M) \pm \sqrt{\operatorname{tr}(M)^2 - 4\det(M)}\right),
$$

so

$$
R = \tfrac{1}{2}\left(\operatorname{tr}(M) - \sqrt{\operatorname{tr}(M)^2 - 4\det(M)}\right).
$$
:::

## Procedure

:::algorithm[Shi-Tomasi corner detection]
::input[Grayscale image $I$ on domain $\Omega$; Gaussian window parameter $\sigma$; threshold $\tau$.]
::output[Set of integer pixel locations $\{(x_i, y_i)\}$ marking detected corners.]

1. Compute $I_x$ and $I_y$ across the image via central differences or Sobel operators.
2. Form the per-pixel products $I_x^2$, $I_y^2$, and $I_x I_y$.
3. Convolve each product with the Gaussian window $w$ to obtain the entries $A$, $B$, $C$ of $M$ at every pixel.
4. Compute $R(x, y) = \tfrac{1}{2}\!\left((A+B) - \sqrt{(A+B)^2 - 4(AB - C^2)}\right)$ at every pixel.
5. Discard pixels with $R(x, y) \leq \tau$. The threshold $\tau$ encodes a feature-tracking quality bound: a small $\lambda_2$ implies an aperture problem in at least one direction, preventing reliable displacement estimation (§3 of the paper).
6. Apply non-maximum suppression: retain only pixels whose $R$ value is an 8-way local maximum.
:::

# Implementation

The per-pixel response computation in Rust:

```rust
fn shi_tomasi_response(img: &[f32], w: usize, h: usize, sigma: f32) -> Vec<f32> {
    let (ix, iy) = gradients(img, w, h);
    let ixx: Vec<f32> = ix.iter().zip(&ix).map(|(a, b)| a * b).collect();
    let iyy: Vec<f32> = iy.iter().zip(&iy).map(|(a, b)| a * b).collect();
    let ixy: Vec<f32> = ix.iter().zip(&iy).map(|(a, b)| a * b).collect();

    let a = gaussian_blur(&ixx, w, h, sigma);
    let b = gaussian_blur(&iyy, w, h, sigma);
    let c = gaussian_blur(&ixy, w, h, sigma);

    a.iter().zip(&b).zip(&c)
        .map(|((&aa, &bb), &cc)| {
            let trace = aa + bb;
            let det = aa * bb - cc * cc;
            let disc = (trace * trace - 4.0 * det).max(0.0).sqrt();
            0.5 * (trace - disc)
        })
        .collect()
}
```

`gradients` and `gaussian_blur` are standard helpers; `gradients` returns central-difference derivatives and `gaussian_blur` applies a separable Gaussian kernel. The `.max(0.0)` clamp before `.sqrt()` guards against floating-point round-off: the discriminant $\operatorname{tr}(M)^2 - 4\det(M) = (\lambda_1 - \lambda_2)^2$ is non-negative by construction, but finite-precision arithmetic can produce a small negative value.

# Remarks

- Complexity: $O(|\Omega|)$ per scale — gradient computation, three convolutions (one per product $I_x^2$, $I_y^2$, $I_x I_y$), and a fixed scalar arithmetic pass per pixel. Identical to Harris.
- The closed form for $\min(\lambda_1, \lambda_2)$ avoids explicit eigendecomposition; the only extra cost over Harris is one square root per pixel.
- The response is rotation-invariant: $R$ is a function of $\operatorname{tr}(M)$ and $\det(M)$, both of which are rotation-invariant quantities.
- The detector is not scale-invariant. Response peaks at the scale of the integration window $\sigma$. Multi-scale detection requires running the detector on a Gaussian image pyramid.
- No free sensitivity parameter analogous to Harris's $k$: the threshold $\tau$ has a direct interpretation as a tracking-quality bound derived from the linear displacement system (equation (8) of the paper).
- Reference implementation: the `# Implementation` section above. No external Rust crate is published for this algorithm.

# References

1. J. Shi, C. Tomasi. *Good Features to Track.* IEEE CVPR, 1994. DOI: [10.1109/CVPR.1994.323794](https://doi.org/10.1109/CVPR.1994.323794)
2. C. Harris, M. J. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. DOI: [10.5244/c.2.23](https://doi.org/10.5244/c.2.23)
