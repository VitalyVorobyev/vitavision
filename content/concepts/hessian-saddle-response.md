---
title: "Hessian Saddle Response"
date: 2026-05-02
summary: "A scalar response computed from the determinant of the image Hessian, negative at saddle points (X-corners) and zero at flat regions, edges, and blobs — the discriminator at the heart of every modern checkerboard X-corner detector."
tags: ["feature-theory", "corner-detection", "calibration", "hessian"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites:
  - image-gradient
related:
  - chess-corners
  - rochade
  - laureano-topological-chessboard
  - puzzleboard
  - structure-tensor
sources:
  references:
    - chen2005-xcorner
    - stelldinger2024-puzzleboard
    - laureano2013-topological
    - placht2014-rochade
---

# Definition

The Hessian saddle response at a pixel $(x, y)$ in a Gaussian-smoothed image $r$ is

$$
S(x, y) = \det H = r_{xx}\,r_{yy} - r_{xy}^2,
$$

where $H = \begin{bmatrix} r_{xx} & r_{xy} \\ r_{xy} & r_{yy} \end{bmatrix}$ is the image Hessian and the second derivatives are computed via convolution with differential Gaussian kernels. At a checkerboard X-junction the smoothed intensity has the shape of a saddle: the Hessian is indefinite ($\lambda_1 > 0$, $\lambda_2 < 0$), so $\det H < 0$ and $S$ is strongly negative. At blobs (both eigenvalues same sign) $\det H > 0$; at edges or flat regions one eigenvalue vanishes and $\det H \approx 0$. X-corners are detected as local minima of $S$ — equivalently, local maxima of $-S$.

The response is rotation-invariant by construction (both $\det H$ and $\mathrm{tr} H$ are invariants of $H$) and contrast-invariant up to a quadratic scale factor (under $I \to \rho I$, $H \to \rho H$ and $S \to \rho^2 S$).

# Mathematical Description

## Origin: Chen-Zhang 2005

The operator was introduced as a per-pixel X-corner detector in [chen2005-xcorner], replacing Lucchese-Mitra's morphological-shrinking + intensity-interpolation pipeline with a single Hessian determinant. The model assumes an ideal step-function X-corner $f(x, y) = \mathbf{1}[xy > 0]$ smoothed by a Gaussian kernel:

$$
r(x, y) = (g * f)(x, y), \qquad g(x, y) = \frac{1}{2\pi\sigma^2}\,e^{-(x^2+y^2)/(2\sigma^2)}.
$$

Under this model, $r$ has saddle shape and $r_{xy}$ peaks at the X-junction with opposite sign on each diagonal pair of quadrants — making $r_{xx} r_{yy} - r_{xy}^2$ strongly negative at the corner.

## Variants in the wild

Different algorithms apply the same operator with different sign conventions, smoothing choices, and refinement strategies:

:::definition[Sign conventions]
- **Chen-Zhang form.** $S = r_{xx}r_{yy} - r_{xy}^2$. Negative at corners. Detect minima of $S$.
- **Negated form.** $s = r_{xy}^2 - r_{xx}r_{yy}$. Positive at corners. Detect maxima of $s$.
- **Harris-penalised form (PuzzleBoard).** $s = f_{xy}^2 - f_{xx}f_{yy} - k(f_{xx}+f_{yy})^2$, with default $k = 1$. Adds a Harris-like trace penalty so the response is suppressed at edges where $\mathrm{tr}\,H$ is large but $\det H$ is small. Inherits eigenvalue extrema ratio close to 6:1 between corner and noise (PuzzleBoard §4.1).
:::

:::definition[Subpixel refinement from the saddle]
Once the integer candidate $(x_0, y_0)$ is picked, the Taylor expansion of $r$ at the candidate gives a closed-form subpixel offset:

$$
H \begin{bmatrix} s \\ t \end{bmatrix} = -\begin{bmatrix} r_x \\ r_y \end{bmatrix}, \qquad (x_0 + s,\, y_0 + t) \in \mathbb{R}^2.
$$

The $2 \times 2$ solve costs Cramer's rule on the Hessian; no window fit, no iteration. This is the Chen-Zhang refinement directly. ROCHADE replaces it with a cone-filtered window quadratic fit (more robust to noise but more expensive); PuzzleBoard uses a $3 \times 3$ grayscale centroid (faster but less precise). The choice trades runtime for noise robustness; the underlying detection operator is the same.
:::

## Relation to the structure tensor

The Hessian saddle response is **not** the same as the [structure tensor](/atlas/structure-tensor) Harris response, despite the formal similarity in using a $2 \times 2$ matrix and its determinant:

| | Structure tensor $M$ | Hessian $H$ |
|---|---|---|
| Entries | $\sum_w I_x^2,\,\sum_w I_x I_y,\,\sum_w I_y^2$ | $r_{xx},\,r_{xy},\,r_{yy}$ |
| Built from | First derivatives, summed over a window | Second derivatives at a single pixel |
| What it measures | Gradient anisotropy in a neighbourhood | Local curvature at a point |
| Sign of $\det$ | Always $\geq 0$ (PSD) | Can be negative (indefinite) |
| Saddle response | $\det M$ small at saddles (no dominant gradient) | $\det H$ strongly negative at saddles |

A Harris-style structure-tensor detector responds weakly at X-junctions because the gradient distribution is not anisotropic in any direction — every gradient direction is balanced. The Hessian saddle response is specifically tuned to the X-junction geometry and gives a much stronger response there. PuzzleBoard's experiment (§4.1) reports a 6:1 ratio favouring the Hessian form on the same image, justifying the dedicated operator for chessboard detection.

## ChESS as an alternative discriminator

[ChESS corners](/atlas/chess-corners) (Bennett-Lasenby 2013) computes a different operator on a Bresenham ring around each pixel — counting sign alternations against a contrast-adaptive threshold pair. Algebraically this approximates the second harmonic of the discrete Fourier transform around the ring, which is also large at 4-quadrant alternation patterns. ChESS and the Hessian saddle response thus serve the **same role** (discriminate X-junctions from blobs/edges/flat) via different operators: ChESS is intensity-based and contrast-adaptive; the Hessian is curvature-based and requires Gaussian pre-smoothing. The two are computationally comparable on modern hardware; the choice usually follows downstream needs (Hessian refinement composes with the same Hessian; ChESS does not).

# Numerical Concerns

**Smoothing scale $\sigma$.** The Hessian is computed on a Gaussian-smoothed image. If $\sigma$ is too small, the second derivatives are noise-dominated and false saddles appear everywhere. If $\sigma$ is too large, neighbouring corners contaminate each other's Hessians. Chen-Zhang uses $\sigma = 3$ on $32 \times 32$-pixel checker fields; ROCHADE and PuzzleBoard use scale-pyramid variants. A common heuristic: $\sigma \approx 0.1 \times$ checker edge length.

**Kernel size.** With $\sigma = 3$, a Gaussian kernel of size $(2N+1)^2$ where $N = 4\lfloor\sigma\rfloor$ spans $25 \times 25$. The convolutions with differential Gaussian kernels for $r_{xx}$, $r_{xy}$, $r_{yy}$ dominate the per-pixel cost.

**Hessian-determinant numerical stability.** The closed-form subpixel solve divides by $\det H$. Near $\det H = 0$ (weak saddles, small fields), the offset $(s, t)$ blows up. Practical implementations cap the offset to $|s|, |t| \leq 1$ pixel and reject candidates with $|\det H|$ below a threshold.

**Sign-convention ambiguity in code.** Different libraries adopt different sign conventions ($S$ vs $-S$). Wiring a saddle-detector that expects "minima of $S$" to a downstream NMS that expects "maxima" produces silent zero detections. Standardise the sign at the API boundary.

**8-bit vs floating-point.** Second derivatives of 8-bit images can underflow at low contrast; computing the Hessian in 32-bit float (or computing the differential Gaussian kernels at higher precision and storing the result in float32) avoids the rounding artefacts that produce spurious saddle minima at low-contrast textures.

**Edge / blob exclusion.** $\det H \approx 0$ at edges and small along their dominant direction; this is the operator's natural edge suppressor. But ridges (where one principal curvature is large and one is moderate but same sign) can produce a small positive $\det H$ that looks like a weak blob. The Harris-penalised form (PuzzleBoard) explicitly subtracts $k\,\mathrm{tr}^2 H$ to push such ridges below threshold.

# Where it appears

The Hessian saddle response is the workhorse detection operator across the chessboard X-corner cluster:

- [chen2005-xcorner](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.87.5833&rep=rep1&type=pdf) — original publication; introduces both the operator and the Taylor-expansion subpixel solve in one paper. Not yet a standalone atlas page (foundational reference cited from the pages below).
- [laureano-topological-chessboard](/atlas/laureano-topological-chessboard) — applies $S = I_{xx}I_{yy} - I_{xy}^2$ as the subpixel refinement step at vertices that have already passed the topology filter (§5, Eq. 4 of the paper).
- [puzzleboard](/atlas/puzzleboard) — uses $s = f_{xy}^2 - f_{xx}f_{yy} - k(f_{xx}+f_{yy})^2$ with $k = 1$ as the per-pixel saddle response in §4.1; refinement via $3 \times 3$ grayscale centroid rather than Taylor solve.
- [rochade](/atlas/rochade) — saddle-based detection (§3 of the paper) but with a cone-filtered bivariate quadratic fit for refinement instead of the Chen-Zhang Taylor solve. The detection role is identical; the refinement is more robust to noise at higher cost.
- [chess-corners](/atlas/chess-corners) — discriminates X-junctions via the DFT 2nd-harmonic instead of the Hessian. Listed here as the alternative operator playing the same role; consult the page for the trade-off.

# References

1. D. Chen, G. Zhang. *A New Sub-Pixel Detector for X-Corners in Camera Calibration Targets.* WSCG Short Paper, 2005. [pdf](https://citeseerx.ist.psu.edu/viewdoc/download?doi=10.1.1.87.5833&rep=rep1&type=pdf)
2. L. Lucchese, S. K. Mitra. *Using saddle points for subpixel feature detection in camera calibration targets.* IEEE Asia-Pacific Conference on Circuits and Systems, 2002. (Direct precursor; uses morphological shrinking + intensity interpolation instead of the Hessian determinant.)
3. P. Stelldinger, N. Lanwer. *PuzzleBoard: A New Camera Calibration Pattern with Position Encoding.* DAGM-GCPR 2024. (Harris-penalised form; eigenvalue extrema 6:1 ratio.)
4. C. Laureano, V. Murino. *Chessboard Detection via X-Corners and Topology.* (Subpixel via Chen-Zhang Hessian solve at topology-filtered vertices.)
5. S. Placht et al. *ROCHADE: Robust Checkerboard Advanced Detection.* ECCV 2014. (Saddle-based detection; cone-filtered quadratic fit.)
