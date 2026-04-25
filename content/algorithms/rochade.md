---
title: "ROCHADE: Robust Checkerboard Advanced Detection"
date: 2026-04-17
summary: "Detect a full planar checkerboard in an image by reducing the gradient-magnitude edge set to a single-pixel centreline graph, extracting inner corners as graph saddle points, then refining each corner to subpixel accuracy by fitting a bivariate quadratic to a cone-filtered neighbourhood and solving for its stationary point."
tags: ["calibration", "chessboard"]
category: calibration-targets
author: "Vitaly Vorobyev"
difficulty: intermediate
draft: true
relatedAlgorithms: ["ocpad", "chess-corners", "laureano-topological-chessboard", "shu-topological-grid"]
sources:
  primary: placht2014-rochade
  references: [lucchese2003-saddle, niblack1992-skeleton, rufli2008-blurred, chen2005-xcorner]
  notes: |
    Two-stage detector. Stage 1 (§2.1, steps 0–7): optional downsampling;
    Scharr 3×3 gradient magnitude; local thresholding in (2τ+1)×(2τ+1)
    windows with τ = 4 and a 60% upper-intensity rule; conditional
    dilation requiring ≥ 6 of 8 "true" neighbours; centreline extraction
    by Niblack 1992 distance-transform thinning; graph interpretation
    G = (V, E) with 8-connectivity (dist ≤ √2); saddle set S = {v : deg(v) ≥ 3};
    acyclic-path pruning + rethinning; clustering of nearby saddles with
    combination distance α starting at 2 and growing to ≤ 5; grid
    verification by counting cluster-adjacent saddles in G. Stage 2
    (§2.2): cone-filter preprocessing with kernel c_{i,j} = max(0, γ + 1 −
    √((γ−i)² + (γ−j)²)); fit bivariate quadratic p(x,y) = a₁x² + a₂xy +
    a₃y² + a₄x + a₅y + a₆ over a (2κ+1)×(2κ+1) window; refined corner is
    the stationary point (∂p/∂x = ∂p/∂y = 0). The saddle condition is
    4a₁a₃ − a₂² < 0.
---

# Goal

Locate the inner corners of a planar $r \times c$ checkerboard pattern in a grayscale image and return their subpixel coordinates. Input: a grayscale image $I : \Omega \to [0, 255]$ and the pattern dimensions $(r, c)$. Output: a set of $rc$ subpixel corner coordinates $\{(x_k, y_k)\}$ ordered on the grid. The method tolerates extreme poses, lens distortion, low resolution, and non-uniform square sizes, but requires that the full pattern lies inside $\Omega$.

# Algorithm

Let $I : \Omega \to [0, 255]$ denote the grayscale image.
Let $g : \Omega \to \{0, 1\}$ denote a binary mask.
Let $G = (V, E)$ denote the undirected graph induced by a thinned binary mask under $8$-connectivity.
Let $\tau$ denote the local-thresholding window radius.
Let $\alpha$ denote the saddle combination distance.
Let $\gamma$ denote the half-size of the cone filter kernel.
Let $\kappa$ denote the half-size of the surface-fitting window.
Let $N_n(v)$ denote the set of $8$-connected neighbours of $v$ in the pixel grid.

:::definition[Edge image graph]
A binary centreline mask $g$ with pixel thickness $1$ induces a graph whose vertices are the "true" pixels and whose edges connect $8$-neighbours:

$$
V = \{v \in \Omega : g(v) = 1\}, \qquad E = \{(v_i, v_j) : \|v_i - v_j\|_\infty \leq 1,\; v_i \neq v_j\}.
$$
:::

:::definition[Saddle set]
The saddle points of $G$ are the vertices of degree at least three:

$$
S = \{v \in V : |\{u : (u, v) \in E\}| \geq 3\}.
$$

Inner checkerboard corners map to such saddle points because four centreline segments meet at every X-junction.
:::

:::definition[Cone filter kernel]
A $2$-D cone kernel with half-size $\gamma$ and indices $i, j \in \{0, \dots, 2\gamma\}$:

$$
c_{i,j} = \max\!\bigl(0,\; \gamma + 1 - \sqrt{(\gamma - i)^2 + (\gamma - j)^2}\bigr).
$$

Convolving a step-function checkerboard with a sectionally linear kernel yields a sectionally defined bivariate quadratic, which a quadratic surface fit can represent exactly.
:::

:::definition[Bivariate quadratic fit]
Let $f = c \ast I$ denote the cone-filtered image. In a $(2\kappa + 1) \times (2\kappa + 1)$ window centred on an initial integer corner $(x, y)$, fit the polynomial

$$
p(i, j) = a_1 i^2 + a_2 i j + a_3 j^2 + a_4 i + a_5 j + a_6
$$

by least squares against $f(x + i, y + j)$ for $i, j \in \{-\kappa, \dots, \kappa\}$. The refined corner is $(x + i^\ast, y + j^\ast)$, where $(i^\ast, j^\ast)$ solves

$$
\begin{pmatrix} 2 a_1 & a_2 \\ a_2 & 2 a_3 \end{pmatrix}
\begin{pmatrix} i^\ast \\ j^\ast \end{pmatrix}
= -\begin{pmatrix} a_4 \\ a_5 \end{pmatrix},
\qquad 4 a_1 a_3 - a_2^2 < 0.
$$

The inequality enforces that the stationary point is a saddle (Hessian eigenvalues of opposite sign).
:::

## Procedure

:::algorithm[ROCHADE — checkerboard detection]
::input[Grayscale image $I$; pattern dimensions $(r, c)$; parameters $\tau = 4$, dilation threshold $6$, combination schedule $\alpha \in \{2, 3, 4, 5\}$, cone half-size $\gamma$, fit half-size $\kappa$.]
::output[Set of $rc$ subpixel corner coordinates $\{(x_k^\ast, y_k^\ast)\}$ in grid order, or $\bot$ if no valid pattern is found.]

1. Optional: downsample $I$ to control processing time; the refinement step runs on the original resolution.
2. Compute the Scharr $3 \times 3$ gradient magnitude $\|\nabla I\|$.
3. In every $(2\tau + 1) \times (2\tau + 1)$ window, set $g(v) = 1$ if the centre gradient lies in the upper $60\%$ of the window's intensity range; otherwise $g(v) = 0$.
4. Conditional dilation: for every $v$ with $g(v) = 0$, set $g(v) \leftarrow 1$ iff at least $6$ of $N_n(v)$ satisfy $g = 1$.
5. Reduce $g$ to a single-pixel centreline by distance-transform thinning. Interpret the result as $G = (V, E)$.
6. Extract $S = \{v : \deg(v) \geq 3\}$. Prune dead-end paths: starting from every pixel with $\deg(v) = 1$, delete vertices until a saddle is reached, except at the image border. Rethin to restore centreline thickness $1$.
7. Cluster $S$ by single-linkage with distance $\alpha$; replace each cluster by its centroid. Start with $\alpha = 2$ and, if verification fails, increment to $3$, $4$, $5$.
8. For every connected component of $G$ with exactly $rc$ cluster centroids: check that the induced adjacency between centroids matches the $r \times c$ grid topology. If it does, pass the centroids as initial corners to the refinement step.
9. For each initial corner $(x, y)$: convolve $I$ with the cone kernel $c$; fit $p$ by least squares in the $(2\kappa + 1) \times (2\kappa + 1)$ window around $(x, y)$; solve for $(x^\ast, y^\ast)$; accept iff $4 a_1 a_3 - a_2^2 < 0$.
:::

```mermaid
flowchart LR
    A["I"] --> B["Scharr<br/>gradient"]
    B --> C["Local<br/>threshold τ=4"]
    C --> D["Conditional<br/>dilation"]
    D --> E["Centreline<br/>thinning"]
    E --> F["Saddles<br/>deg ≥ 3"]
    F --> G["Cluster<br/>α∈[2,5]"]
    G --> H["Grid<br/>verify"]
    H --> I["Cone filter<br/>+ quadratic fit"]
    I --> J["Subpixel<br/>corners"]
```

# Implementation

The subpixel kernel is the core computation: fit a bivariate quadratic to a cone-filtered window and solve for its saddle. The detection stages upstream are graph-bookkeeping and shell around this kernel.

```rust
fn cone_kernel(gamma: usize) -> Vec<f64> {
    let size = 2 * gamma + 1;
    let g = gamma as f64;
    (0..size).flat_map(|i| (0..size).map(move |j| {
        let d = ((g - i as f64).powi(2) + (g - j as f64).powi(2)).sqrt();
        (g + 1.0 - d).max(0.0)
    })).collect()
}

fn refine_saddle(f: &[f64], w: usize, x: usize, y: usize, kappa: usize) -> Option<(f64, f64)> {
    let mut m = [[0.0f64; 6]; 6];
    let mut b = [0.0f64; 6];
    for di in -(kappa as i32)..=(kappa as i32) {
        for dj in -(kappa as i32)..=(kappa as i32) {
            let xi = di as f64;
            let yj = dj as f64;
            let v = f[(y as i32 + dj) as usize * w + (x as i32 + di) as usize];
            let phi = [xi * xi, xi * yj, yj * yj, xi, yj, 1.0];
            for r in 0..6 {
                b[r] += phi[r] * v;
                for c in 0..6 { m[r][c] += phi[r] * phi[c]; }
            }
        }
    }
    let a = solve_6x6(m, b)?;
    let (a1, a2, a3, a4, a5) = (a[0], a[1], a[2], a[3], a[4]);
    let det = 4.0 * a1 * a3 - a2 * a2;
    if det >= 0.0 { return None; }
    let dx = (a2 * a5 - 2.0 * a3 * a4) / det;
    let dy = (a2 * a4 - 2.0 * a1 * a5) / det;
    Some((x as f64 + dx, y as f64 + dy))
}
```

The cone filter $c$ is convolved with $I$ before `refine_saddle` runs; `solve_6x6` is any dense symmetric solver (Cholesky on the $6 \times 6$ normal matrix suffices because the Vandermonde-like design matrix has full column rank for $\kappa \geq 3$).

# Remarks

- Stage 1 is $O(|\Omega|)$ per image: gradient, thresholding, dilation, centreline, and graph walks are all linear in pixel count; the cluster schedule is a constant-depth loop over $\alpha \in \{2, 3, 4, 5\}$.
- Stage 2 is $O(r c (2 \kappa + 1)^2)$ per image: the quadratic fit is solved in closed form for each of $r c$ corners.
- Detection requires the full pattern to be present. Partial visibility, occlusion, or pattern edges running outside $\Omega$ fail step 8 because the inner-corner count no longer matches $r c$.
- Parameter dependence is local: $\tau$ sets the spatial scale of the edge-vs-flat decision; the $60\%$ threshold trades false-positive edges against missed edges on low-contrast images; $\alpha$ collapses saddle multiplets produced by centreline imperfections at X-junctions; $\gamma$ and $\kappa$ must jointly exceed the radius over which the cone-convolved pattern is still piecewise quadratic — undersized $\gamma$ leaves flat plateaux that the fit cannot localise.
- The cone kernel is preferred over a Gaussian because convolution of step-function checkerboards with a sectionally linear kernel produces sectionally defined bivariate quadratics, matching the fit exactly; a Gaussian smears the quadratic structure and biases the saddle location under anisotropic sampling.
- Dead-end pruning plus rethinning in step 6 eliminates degree-$3$ artefacts induced by short centreline spurs; without it, every spur branch contributes a spurious saddle at its root.
- The stage-1 graph is the input required by OCPAD to recover partially occluded patterns — OCPAD replaces step 8 with a VF2 subgraph-isomorphism search and the rest of the pipeline is reused verbatim.

# References

1. S. Placht, P. Fürsattel, E. A. Mengue, H. Hofmann, C. Schaller, M. Balda, E. Angelopoulou. *ROCHADE: Robust Checkerboard Advanced Detection for Camera Calibration.* ECCV, 2014. DOI: [10.1007/978-3-319-10593-2_50](https://doi.org/10.1007/978-3-319-10593-2_50)
2. L. Lucchese, S. K. Mitra. *Using saddle points for subpixel feature detection in camera calibration targets.* Asia Pacific Conference on Circuits and Systems, 2003. DOI: [10.1109/APCCAS.2002.1115151](https://doi.org/10.1109/APCCAS.2002.1115151)
3. C. W. Niblack, P. B. Gibbons, D. W. Capson. *Generating skeletons and centerlines from the distance transform.* CVGIP: Graphical Models and Image Processing, 1992. DOI: [10.1016/1049-9652(92)90026-T](https://doi.org/10.1016/1049-9652%2892%2990026-T)
4. M. Rufli, D. Scaramuzza, R. Siegwart. *Automatic detection of checkerboards on blurred and distorted images.* IEEE/RSJ IROS, 2008. DOI: [10.1109/IROS.2008.4650703](https://doi.org/10.1109/IROS.2008.4650703)
5. D. Chen, G. Zhang. *A New Sub-Pixel Detector for X-Corners in Camera Calibration Targets.* WSCG Short Papers, 2005. [PDF](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.87.5833&rep=rep1&type=pdf)
