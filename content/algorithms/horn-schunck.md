---
title: "Horn-Schunck Optical Flow"
date: 2026-05-13
summary: "Dense optical flow recovered by minimising a variational energy that combines the brightness-constancy constraint with a global smoothness prior on the velocity field, solved by per-pixel Gauss-Seidel relaxation."
tags: ["optical-flow", "variational"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [image-gradient, optical-flow]
failureModes: []
sources:
  primary: horn1981-horn-schunck
  references: [lucas1981-lucas-kanade]
  notes: |
    Brightness-constancy equation (§4): $E_x u + E_y v + E_t = 0$.
    Variational energy (§9): $\mathcal{E}^2 = \iint (\alpha^2 \mathcal{E}_b^2 + \mathcal{E}_s^2)\,dx\,dy$
    with $\mathcal{E}_b = E_x u + E_y v + E_t$ and $\mathcal{E}_s = \|\nabla u\|^2 + \|\nabla v\|^2$.
    Iterative update (§12) substitutes the discrete Laplacian
    $\nabla^2 u \approx K(\bar{u} - u)$ with $K = 3$ for the weighted 3x3 stencil
    (§8). Gradients $E_x, E_y, E_t$ are the average of four first-differences
    over a 2x2x2 spatiotemporal cube (§7). Boundary: zero normal derivative,
    edge pixels copy from interior (§12). Convergence: 32 iterations to ~10%
    error at 32x32, 1% noise (§17).
relations:
  - type: parallel_foundation_with
    target: lucas-kanade
    confidence: high
    caution: "Dense variational vs sparse local LSQ — co-founded optical flow in 1981; pick by problem (dense flow field vs sparse displacement of features)."
  - type: extended_by
    target: black-anandan-robust-flow
    confidence: high
    caution: "Robust M-estimator extension of the quadratic data and smoothness terms; non-convex but more tolerant of outliers and motion discontinuities."
---

# Goal

Compute a dense 2-D optical flow field $(u, v)$ at every pixel from two consecutive grayscale frames. Input: a spatiotemporal brightness function $E(x, y, t)$ sampled on a square spatial grid with uniform time steps. Output: velocity vectors $(u_{i,j}, v_{i,j})$ in units of picture cells per frame interval at every pixel. The algorithm minimises a global variational energy combining a brightness-constancy fit term with a spatial smoothness penalty on the flow field, then recovers the flow via per-pixel Gauss-Seidel relaxation. The smoothness prior resolves the aperture problem — one brightness-constancy equation, two unknowns per pixel — by propagating boundary velocity information across uniform regions through iterated local averaging.

# Algorithm

Let $E(x, y, t)$ denote the image brightness function on the spatiotemporal domain.
Let $E_x, E_y, E_t$ denote the partial derivatives of $E$ with respect to $x$, $y$, and $t$.
Let $(u, v)$ denote the 2-D optical flow velocity at a pixel.
Let $\alpha^2$ denote the smoothness weight balancing fit against regularisation.
Let $\bar{u}, \bar{v}$ denote the weighted local averages of $u$ and $v$ over the 3×3 neighbourhood stencil.
Let $K$ denote the proportionality factor in the discrete Laplacian approximation.

:::definition[Brightness-constancy equation]
Linear constraint on $(u, v)$ derived from the assumption that image brightness is conserved along a moving point's trajectory.

$$
E_x u + E_y v + E_t = 0.
$$
:::

:::definition[Variational energy]
Global functional minimised over the full image domain, combining the squared brightness-constancy residual $\mathcal{E}_b$ with the squared flow-gradient magnitude $\mathcal{E}_s$.

$$
\mathcal{E}^2 = \iint \!\left(\alpha^2 \mathcal{E}_b^2 + \mathcal{E}_s^2\right) dx\, dy,
$$

where $\mathcal{E}_b = E_x u + E_y v + E_t$ and $\mathcal{E}_s = \|\nabla u\|^2 + \|\nabla v\|^2$.
:::

:::definition[Discrete Laplacian approximation]
Finite-difference form of the Laplacian used after the Euler-Lagrange equations are discretised on the pixel grid.

$$
\nabla^2 u \approx K(\bar{u} - u), \quad K = 3,
$$

where $K = 3$ corresponds to the weighted 3×3 stencil with unit grid spacing.
:::

:::definition[Iterative flow update]
Per-pixel closed-form relaxation step obtained by substituting the discrete Laplacian approximation into the Euler-Lagrange equations.

$$
\begin{aligned}
u^{n+1} &= \bar{u}^n - \frac{E_x\!\left(E_x \bar{u}^n + E_y \bar{v}^n + E_t\right)}{\alpha^2 + E_x^2 + E_y^2}, \\[4pt]
v^{n+1} &= \bar{v}^n - \frac{E_y\!\left(E_x \bar{u}^n + E_y \bar{v}^n + E_t\right)}{\alpha^2 + E_x^2 + E_y^2}.
\end{aligned}
$$
:::

## Procedure

:::algorithm[Horn-Schunck dense flow]
::input[Two consecutive grayscale frames; smoothness weight $\alpha^2$; iteration count $N$ or convergence tolerance.]
::output[Dense flow field $(u_{i,j}, v_{i,j})$ at every pixel, in picture cells per frame interval.]

1. Estimate $E_x$, $E_y$, and $E_t$ at every pixel as the average of four first differences along the four parallel edges of the 2×2×2 spatiotemporal cube formed by adjacent frame samples.
2. Initialise $u^0 = v^0 = 0$ at every pixel.
3. Compute the weighted local averages $\bar{u}^n$ and $\bar{v}^n$ at every pixel using the 3×3 stencil.
4. Apply the iterative flow update at every pixel to obtain $u^{n+1}$ and $v^{n+1}$.
5. At image boundary pixels, copy velocities from the adjacent interior pixel to enforce zero normal derivative.
6. Repeat steps 3–5 until the maximum per-pixel change falls below the tolerance or the iteration count reaches $N$.
:::

# Implementation

The per-pixel flow update in Rust, showing the weighted local-average helper and the inner iteration kernel:

```rust
/// Weighted 3×3 local average for one flow component (u or v).
/// Stencil: cardinal neighbours weight 1/6, diagonal neighbours weight 1/12.
fn local_avg(flow: &[f32], w: usize, h: usize, x: usize, y: usize) -> f32 {
    let get = |cx: usize, cy: usize| flow[cy * w + cx];
    let xm = x.saturating_sub(1);
    let xp = (x + 1).min(w - 1);
    let ym = y.saturating_sub(1);
    let yp = (y + 1).min(h - 1);
    (1.0 / 6.0)  * (get(xm, y) + get(xp, y) + get(x, ym) + get(x, yp))
    + (1.0 / 12.0) * (get(xm, ym) + get(xp, ym) + get(xm, yp) + get(xp, yp))
}

/// One Horn-Schunck iteration over all pixels.
/// ex, ey, et: spatial–temporal gradient images (row-major, w×h).
/// u, v:       current flow (read); u_new, v_new: updated flow (write).
fn hs_iteration(
    ex: &[f32], ey: &[f32], et: &[f32],
    u: &[f32], v: &[f32],
    u_new: &mut [f32], v_new: &mut [f32],
    w: usize, h: usize, alpha2: f32,
) {
    for y in 0..h {
        for x in 0..w {
            let i = y * w + x;
            let u_bar = local_avg(u, w, h, x, y);
            let v_bar = local_avg(v, w, h, x, y);
            let num = ex[i] * u_bar + ey[i] * v_bar + et[i];
            let denom = alpha2 + ex[i] * ex[i] + ey[i] * ey[i];
            u_new[i] = u_bar - ex[i] * num / denom;
            v_new[i] = v_bar - ey[i] * num / denom;
        }
    }
}
```

Vectorised one iteration in Python:

```python
import numpy as np

def hs_iteration(ex, ey, et, u, v, alpha2: float):
    """One Horn-Schunck iteration. Arrays are 2-D float32, shape (H, W)."""
    u_bar = (
        (np.roll(u, 1, 1) + np.roll(u, -1, 1)
         + np.roll(u, 1, 0) + np.roll(u, -1, 0)) / 6.0
        + (np.roll(np.roll(u, 1, 0), 1, 1) + np.roll(np.roll(u, 1, 0), -1, 1)
           + np.roll(np.roll(u, -1, 0), 1, 1) + np.roll(np.roll(u, -1, 0), -1, 1)) / 12.0
    )
    v_bar = (
        (np.roll(v, 1, 1) + np.roll(v, -1, 1)
         + np.roll(v, 1, 0) + np.roll(v, -1, 0)) / 6.0
        + (np.roll(np.roll(v, 1, 0), 1, 1) + np.roll(np.roll(v, 1, 0), -1, 1)
           + np.roll(np.roll(v, -1, 0), 1, 1) + np.roll(np.roll(v, -1, 0), -1, 1)) / 12.0
    )
    num   = ex * u_bar + ey * v_bar + et
    denom = alpha2 + ex**2 + ey**2
    return u_bar - ex * num / denom, v_bar - ey * num / denom
```

# Remarks

- Per-iteration cost is $O(NM)$ on an $N \times M$ image; total iteration count must exceed the diameter of the largest uniform region in pixels, which sets the effective spatial range of information propagation.
- $\alpha^2$ trades fit against smoothness; the paper recommends setting it comparable to the expected noise in $E_x^2 + E_y^2$. Low $\alpha^2$ preserves gradients but destabilises uniform regions; high $\alpha^2$ over-smooths discontinuities.
- Global smoothness over-regularises flow at occlusion boundaries; the worst errors occur there and shrink with image resolution but are never eliminated.
- Brightness constancy fails under illumination changes, specular reflection, and non-Lambertian shading; the failure is silent — incorrect $E_t$ produces systematically wrong flow without any signal of error.
- The linearised brightness constraint is valid only for sub-pixel to approximately 1-pixel inter-frame displacement; coarse-to-fine Gaussian pyramids extend the operating range.
- The Jacobi update structure is parallel-safe: each pixel's new estimate depends only on the previous iteration's local averages, not on the same pixel's previous value.
- Replacing the quadratic $\mathcal{E}_b^2$ and $\mathcal{E}_s^2$ terms with redescending M-estimators (Lorentzian or Geman-McClure) yields a piecewise-smooth robust variant that tolerates motion discontinuities and brightness-constancy outliers without an explicit line-process layer; see [black-anandan-robust-flow](../algorithms/black-anandan-robust-flow). Robustifying the smoothness term alone is insufficient — the data term must also be robust.

# References

1. B. K. P. Horn, B. G. Schunck. *Determining Optical Flow.* Artificial Intelligence 17 (1–3), 1981. [hdl.handle.net/1721.1/6337](http://hdl.handle.net/1721.1/6337)
2. B. D. Lucas, T. Kanade. *An Iterative Image Registration Technique with an Application to Stereo Vision.* IJCAI, 1981. [ri.cmu.edu](https://www.ri.cmu.edu/pub_files/pub3/lucas_bruce_d_1981_2/lucas_bruce_d_1981_2.pdf)
