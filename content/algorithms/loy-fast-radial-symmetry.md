---
title: "Fast Radial Symmetry Transform"
date: 2026-05-03
summary: "Gradient-vote operator that highlights pixels of high local radial symmetry — bright/dark blobs and approximately circular features. Each pixel votes along its gradient direction at one or more radii into orientation and magnitude projection maps; the per-radius contribution is the magnitude projection weighted by a power of the orientation count and Gaussian-smoothed; the cumulative response across radii localises feature centres at $O(K \\cdot |N|)$ cost."
tags: ["feature-detection", "blob-detection", "radial-symmetry"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
editorAlgorithmId: radsym
prerequisites: [image-gradient]
failureModes: []
sources:
  primary: loy2003-frst
  notes: |
    Multi-radius gradient-vote operator. At each radius $n$, the
    orientation projection $O_n$ (signed unit votes) and magnitude
    projection $M_n$ (signed gradient-magnitude votes) are
    accumulated at the positively- and negatively-affected pixels
    $p^{\pm} = p \pm \mathrm{round}(\hat{\mathbf{g}}(p)\cdot n)$.
    The per-radius contribution is $S_n = F_n \ast A_n$ with
    $F_n = |\tilde O_n|^{\alpha}\, \tilde M_n$, $\tilde O_n$ and
    $\tilde M_n$ being max-normalised projections, and $A_n$ a
    2-D Gaussian of size $n \times n$ and $\sigma = 0.5n$
    (operative value from Table 1 of the conference version;
    Figure 3 caption gives 0.25n — discrepancy noted in the
    research note). Cumulative $S = \sum_n S_n$; positive
    maxima localise bright radially-symmetric features, negative
    minima localise dark ones. Recommended parameters from the
    paper: $\alpha = 2$ (eliminates line responses), $\beta
    \approx 20\%$ of $\max\|\mathbf{g}\|$. Sparse-radius
    approximation $\{1,3,5\}$ replaces the full $\{1,\ldots,5\}$
    set with negligible loss.
---

# Goal

Detect pixels of high radial symmetry in a grayscale image $I: \Omega \to \mathbb{R}$ on pixel domain $\Omega \subset \mathbb{Z}^2$. Output: a real-valued symmetry map $S: \Omega \to \mathbb{R}$ where large positive values correspond to bright radially-symmetric regions and large negative values to dark ones; local maxima and minima of $S$ are the detected points of interest. Each pixel casts gradient-direction votes to two affected pixels at distance $n$, accumulating orientation counts and gradient magnitudes into a pair of projection images per radius; the per-radius contribution is formed by combining those projections, raising the orientation count to a power $\alpha$ to penalise non-radial votes, and convolving with a small Gaussian. Summing contributions across all radii yields $S$ at $O(K \cdot |N|)$ cost for a $K$-pixel image with $|N|$ detection radii, with no gradient-orientation quantisation and no neighbourhood convolution loops over pixel pairs.

# Algorithm

Let $I: \Omega \to \mathbb{R}$ denote the grayscale image on pixel domain $\Omega \subset \mathbb{Z}^2$.
Let $\mathbf{g}(p) = \nabla I(p)$ denote the image gradient at pixel $p$, computed with, e.g., the Sobel operator.
Let $N = \{n_1, n_2, \ldots\}$ denote the set of detection radii in pixels.
Let $\alpha \geq 1$ denote the radial strictness parameter.
Let $\beta \geq 0$ denote the gradient magnitude threshold below which a pixel casts no votes.
Let $O_n: \Omega \to \mathbb{Z}$ denote the orientation projection image at radius $n$, initialised to zero.
Let $M_n: \Omega \to \mathbb{R}$ denote the magnitude projection image at radius $n$, initialised to zero.
Let $\tilde{O}_n = O_n / \max_p |O_n(p)|$ and $\tilde{M}_n = M_n / \max_p |M_n(p)|$ denote the max-normalised projections.
Let $A_n$ denote a 2-D Gaussian kernel of size $n \times n$ and standard deviation $\sigma = 0.5n$.
Let $\ast$ denote 2-D convolution.

:::definition[Positively- and negatively-affected pixel coordinates ($p^{\pm}$)]
For each pixel $p$ with gradient $\mathbf{g}(p)$ of nonzero magnitude, the two affected pixel coordinates at radius $n$ are:

$$
p^{+}(p) = p + \mathrm{round}\!\left(\frac{\mathbf{g}(p)}{\|\mathbf{g}(p)\|}\, n\right), \quad
p^{-}(p) = p - \mathrm{round}\!\left(\frac{\mathbf{g}(p)}{\|\mathbf{g}(p)\|}\, n\right),
$$

where $p^{+}$ is one radius ahead in the gradient direction and $p^{-}$ is one radius behind. Rounding the continuous unit-gradient offset to the nearest integer pixel introduces a quantisation error of up to $\approx 0.41$ pixels per vote at oblique gradient angles.
:::

:::definition[Orientation projection ($O_n$) and magnitude projection ($M_n$)]
For each pixel $p$ with $\|\mathbf{g}(p)\| \geq \beta$, the projection images are updated:

$$
O_n(p^{+}) \mathrel{+}= 1, \quad O_n(p^{-}) \mathrel{-}= 1, \quad
M_n(p^{+}) \mathrel{+}= \|\mathbf{g}(p)\|, \quad M_n(p^{-}) \mathrel{-}= \|\mathbf{g}(p)\|.
$$

A radially-symmetric structure causes the surrounding gradient vectors to point coherently toward (or away from) its centre, producing a large coherent count at that location in both $O_n$ and $M_n$.
:::

:::definition[Intermediate combination map ($F_n$)]
The per-radius symmetry contribution before spatial spreading:

$$
F_n(p) = \left|\tilde{O}_n(p)\right|^{\alpha} \tilde{M}_n(p).
$$

Raising the normalised orientation count to the power $\alpha$ suppresses votes that are weakly focused — for example, from elongated structures where gradient vectors are approximately collinear rather than radially convergent.
:::

:::definition[Per-radius symmetry contribution ($S_n$)]
The orientation–magnitude combination spread by a Gaussian kernel:

$$
S_n = F_n \ast A_n,
$$

where $A_n$ is a 2-D Gaussian of size $n \times n$ and standard deviation $\sigma = 0.5n$. The convolution distributes each vote's influence over a neighbourhood proportional to the detection radius.
:::

:::note
The ECCV 2002 conference version of this paper states $\sigma = 0.25n$ in the Figure 3 caption but $\sigma = 0.5n$ in the Table 1 experimental settings. The Table 1 value is treated as operative.
:::

:::definition[Full symmetry transform ($S$)]
The contributions across all radii are summed:

$$
S = \sum_{n \in N} S_n.
$$

Positive values of $S$ correspond to bright radially-symmetric regions; negative values to dark ones (assuming the gradient is oriented from dark to light).
:::

## Procedure

:::algorithm[FRST detection]
::input[Grayscale image $I$ on domain $\Omega$; detection radii $N = \{n_1, n_2, \ldots\}$; radial strictness $\alpha$; gradient magnitude threshold $\beta$.]
::output[Real-valued symmetry map $S: \Omega \to \mathbb{R}$; local maxima and minima of $S$ are the detected points of interest.]

1. Compute the image gradient $\mathbf{g}(p) = \nabla I(p)$ at every pixel, e.g. with the Sobel operator.
2. Initialise the output map $S \leftarrow 0$ across $\Omega$.
3. For each radius $n \in N$:
   1. Initialise $O_n \leftarrow 0$ and $M_n \leftarrow 0$ across $\Omega$.
   2. For each pixel $p \in \Omega$ with $\|\mathbf{g}(p)\| \geq \beta$, compute $p^{+}(p)$ and $p^{-}(p)$ by rounding the unit gradient scaled by $n$; update $O_n$ and $M_n$ at those two locations.
   3. Normalise: $\tilde{O}_n = O_n / \max_p |O_n(p)|$, $\tilde{M}_n = M_n / \max_p |M_n(p)|$.
   4. Compute $F_n(p) = |\tilde{O}_n(p)|^{\alpha}\, \tilde{M}_n(p)$ at every pixel.
   5. Construct the Gaussian kernel $A_n$ of size $n \times n$ and standard deviation $\sigma = 0.5n$.
   6. Accumulate $S \leftarrow S + F_n \ast A_n$.
4. Return $S$. Detect interest points as local maxima (bright features) and local minima (dark features) of $S$.
:::

# Implementation

The per-radius vote-and-accumulate kernel in Rust:

```rust
fn frst_radius(
    gx: &[f32], gy: &[f32],
    width: usize, height: usize,
    n: usize, alpha: u32, beta: f32,
    o_n: &mut [f32], m_n: &mut [f32],
) {
    let stride = width as i32;
    for y in 0..height as i32 {
        for x in 0..width as i32 {
            let idx = (y * stride + x) as usize;
            let gx_p = gx[idx];
            let gy_p = gy[idx];
            let mag = (gx_p * gx_p + gy_p * gy_p).sqrt();
            if mag < beta { continue; }

            // Unit gradient scaled by radius → round to nearest integer offset.
            let scale = n as f32 / mag;
            let dx = (gx_p * scale).round() as i32;
            let dy = (gy_p * scale).round() as i32;

            // p⁺ = p + round(ĝ · n), p⁻ = p − round(ĝ · n)
            for (sign, vote_mag) in [(1i32, mag), (-1i32, -mag)] {
                let nx = x + sign * dx;
                let ny = y + sign * dy;
                if nx >= 0 && nx < stride && ny >= 0 && ny < height as i32 {
                    let nidx = (ny * stride + nx) as usize;
                    o_n[nidx] += sign as f32;   // O_n(p±) += ±1
                    m_n[nidx] += vote_mag;       // M_n(p±) += ±‖g‖
                }
            }
        }
    }

    // Õ_n = O_n / max|O_n|, M̃_n = M_n / max|M_n|.
    let o_max = o_n.iter().fold(0f32, |a, &v| a.max(v.abs()));
    let m_max = m_n.iter().fold(0f32, |a, &v| a.max(v.abs()));
    if o_max > 0.0 && m_max > 0.0 {
        // F_n(p) = |Õ_n(p)|^α · M̃_n(p), written back into o_n for the caller.
        for i in 0..o_n.len() {
            let o_norm = o_n[i] / o_max;
            let m_norm = m_n[i] / m_max;
            o_n[i] = o_norm.abs().powi(alpha as i32) * m_norm;
        }
    }
    // Caller convolves o_n with A_n (Gaussian, size n×n, σ = 0.5n) and adds the result to S.
}
```

The `dx`/`dy` variables implement $\mathrm{round}(\hat{\mathbf{g}}(p)\cdot n)$ from the $p^{\pm}$ definition. The sign loop handles both affected pixels in a single pass: `sign = +1` accumulates $O_n(p^{+}) \mathrel{+}= 1$ and $M_n(p^{+}) \mathrel{+}= \|\mathbf{g}\|$; `sign = -1` gives $O_n(p^{-}) \mathrel{-}= 1$ and $M_n(p^{-}) \mathrel{-}= \|\mathbf{g}\|$. The normalisation block followed by the `powi(alpha)` call implements $F_n(p) = |\tilde{O}_n(p)|^{\alpha}\,\tilde{M}_n(p)$. The Gaussian convolution $F_n \ast A_n$ and accumulation into $S$ are standard separable-filter operations and are left to the caller.

# Remarks

- Complexity: $O(K \cdot |N|)$ for a $K$-pixel image with $|N|$ detection radii. Each radius requires one gradient pass, one vote-accumulation pass, and one Gaussian convolution; all three are $O(K)$ with separable filters. No pairwise pixel comparisons are performed.
- Parameter sensitivity: $\alpha = 2$ eliminates line responses while preserving circular-feature responses; $\alpha = 1$ reduces to a linear combination, minimises computation, and admits more edge false positives. $\beta \approx 20\%$ of the maximum gradient magnitude is the speed–quality trade-off recommended in Table 1 of the paper.
- Failure modes: elongated structures (edges, lines) produce diffuse rather than peaked responses because their gradient vectors are approximately collinear rather than radially convergent — $\alpha \geq 2$ attenuates but does not eliminate the bias. Very small radii ($n \leq 2$) suffer coarse gradient quantisation; at $n = 1$ only 4–8 distinct integer offset directions exist. Sparse-gradient regions (low-contrast scenes, uniform patches) produce a near-zero $S$ because few votes are cast.
- Scope: the transform localises interest points to integer pixel precision only; the rounding of $p^{\pm}$ limits intrinsic accuracy to $\approx 0.41$ pixels without additional sub-pixel refinement. The original formulation operates on a scalar gradient field; multi-channel images require a channel-fusion step before the vote stage.
- Multi-radius strategy: computing $S$ over a representative sparse subset of radii (e.g. $\{1, 3, 5\}$ rather than $\{1, 2, 3, 4, 5\}$) closely approximates the full-range output at roughly half the cost.

# References

1. G. Loy, A. Zelinsky. *Fast radial symmetry for detecting points of interest.* IEEE TPAMI 25(8):959–973, 2003. [ieeexplore.ieee.org/document/1217601](https://ieeexplore.ieee.org/document/1217601)
