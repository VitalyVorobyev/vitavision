---
title: "Structure Tensor"
date: 2026-04-30
summary: "A symmetric 2×2 matrix formed by summing the outer products of the image gradient over a local window, encoding the dominant orientation and anisotropy of local image structure."
tags: ["keypoint-detection", "linear-algebra"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites:
  - image-gradient
---

# Definition

The structure tensor at a pixel $(x, y)$ is the $2 \times 2$ symmetric positive-semidefinite matrix

$$
M(x, y) = \sum_{(u,v) \in \mathcal{W}} w(u, v)\,\nabla I(x+u, y+v)\,\nabla I(x+u, y+v)^T,
$$

where $\mathcal{W}$ is a local window, $w$ is a weighting function (typically a Gaussian), and $\nabla I = (I_x, I_y)^T$ is the image gradient. Writing out the components:

$$
M = \begin{bmatrix} \sum_\mathcal{W} w\,I_x^2 & \sum_\mathcal{W} w\,I_x I_y \\ \sum_\mathcal{W} w\,I_x I_y & \sum_\mathcal{W} w\,I_y^2 \end{bmatrix}.
$$

The structure tensor is the second-moment matrix of the gradient distribution in the window. Its eigenvalues and eigenvectors encode the dominant gradient orientations and their strengths: the eigenvectors give the directions of maximum and minimum gradient energy, and the eigenvalues give the corresponding magnitudes.

# Mathematical Description

## Eigenvalue classification

Let $\lambda_1 \geq \lambda_2 \geq 0$ be the eigenvalues of $M$. The gradient distribution in the window is characterized by the ratio $\lambda_2 / \lambda_1$:

:::definition[Structure tensor eigenvalue classification]
Classification of local image structure from $(\lambda_1, \lambda_2)$.

- $\lambda_1 \approx \lambda_2 \approx 0$: flat region — no gradient in any direction.
- $\lambda_1 \gg \lambda_2 \approx 0$: edge — strong gradient in one direction only.
- $\lambda_1 \approx \lambda_2 \gg 0$: corner — strong gradient in two independent directions.
:::

## Corner response functions

Three cornerness measures are derived from the eigenvalues of $M$:

:::definition[Harris response]
Avoids explicit eigenvalue computation by expressing the determinant and trace in terms of $M$'s entries.

$$
R_{\text{Harris}} = \det(M) - k\,(\mathrm{tr}\,M)^2 = \lambda_1 \lambda_2 - k(\lambda_1 + \lambda_2)^2,
$$

with empirical constant $k \in [0.04, 0.06]$.
:::

:::definition[Shi-Tomasi response]
The minimum eigenvalue; retains the smaller principal curvature as the cornerness score.

$$
R_{\text{ShiTomasi}} = \min(\lambda_1, \lambda_2) = \lambda_2.
$$
:::

:::definition[Förstner response]
The harmonic mean of the eigenvalues, equal to $\det(M)/\mathrm{tr}(M)$, divided by the trace to normalize for overall brightness.

$$
R_{\text{Forstner}} = \frac{\lambda_1 \lambda_2}{\lambda_1 + \lambda_2} = \frac{\det(M)}{\mathrm{tr}(M)}.
$$
:::

All three measures are maximized at true corners ($\lambda_1 \approx \lambda_2$ large) and small at flat regions and edges. Harris and Förstner can be negative at edges; Shi-Tomasi is non-negative everywhere.

## Anisotropy and coherence

The coherence of the gradient field in the window is measured by

$$
C = \left(\frac{\lambda_1 - \lambda_2}{\lambda_1 + \lambda_2}\right)^2 \in [0, 1].
$$

$C = 1$ at perfect edges (one nonzero eigenvalue); $C = 0$ at isotropic junctions and flat regions. Anisotropic diffusion algorithms use $C$ to steer smoothing along edges rather than across them.

## Two-scale construction

The structure tensor involves two distinct smoothing scales:

1. **Gradient scale $\sigma_d$**: the standard deviation of the Gaussian applied before computing $I_x$ and $I_y$ (equivalently, the scale of the derivative-of-Gaussian kernels). Controls which frequency band is differentiated.
2. **Integration scale $\sigma_i$**: the standard deviation of the Gaussian window $w$ that weights the outer-product sum. Controls the size of the neighbourhood over which gradient statistics are accumulated.

Setting $\sigma_i = 1.5\,\sigma_d$ is a common heuristic, but the optimal ratio depends on the target feature scale.

## Relation to the autocorrelation surface

$M$ is the Hessian of the local autocorrelation function $E(\Delta x, \Delta y)$ at the origin:

$$
E(\Delta x, \Delta y) = \sum_\mathcal{W} w(u, v)\,[I(x+u+\Delta x, y+v+\Delta y) - I(x+u, y+v)]^2
\approx [\Delta x, \Delta y]\,M\,[\Delta x, \Delta y]^T.
$$

The eigenvalues of $M$ are the principal curvatures of $E$ at zero shift. Harris's original motivation was to find pixels where $E$ has large curvature in all directions, justifying the trace and determinant formulation.

# Numerical Concerns

**Floating-point accumulation.** Each entry of $M$ is a sum of squared or cross-multiplied gradient values. For 8-bit images, $I_x^2$ spans $[0, 4 \times 255^2]$ before normalization; integer implementations must use 32-bit accumulators. Floating-point implementations with 32-bit floats can accumulate rounding error across large windows.

**Ill-conditioning.** When $\lambda_1 \gg \lambda_2 \approx 0$ (an edge), the Harris and Förstner responses are near zero but the matrix is rank-1. Computing $\det(M)$ as $\lambda_1\lambda_2$ via the entry formula $I_x^2 I_y^2 - (I_x I_y)^2$ is numerically stable. Computing it via eigendecomposition and multiplying is equivalent but adds unnecessary work.

**Scale sensitivity.** The response amplitude scales with $\sigma_i^2$ (larger windows accumulate more gradient energy). Comparing responses across scales requires normalizing by $\sigma_i^2$.

**Window boundary effects.** Near image borders, the Gaussian window is truncated. Implementations typically zero-pad the gradient maps before convolving, which introduces a gradient-free border that suppresses corners near the image edge.

**Non-maximum suppression threshold units.** Corner detection thresholds applied to $R_{\text{Harris}}$ or $R_{\text{ShiTomasi}}$ have units of gradient-squared. They do not transfer between images of different exposure, resolution, or preprocessing. Normalizing the response by the maximum value in the image, or by the squared image gradient energy, makes thresholds more portable.

**Ridge-edge ambiguity.** When $\lambda_1 \gg \lambda_2 > 0$ (both eigenvalues positive but very different in magnitude), the pixel is on a ridge rather than a flat edge. Harris classifies it as an edge (negative $R$); Shi-Tomasi retains it as a weak corner because $\lambda_2 > 0$. This distinction matters for tracking algorithms that require corners to be uniquely localizable.

# Where it appears

The structure tensor is the shared algebraic core of every gradient-based corner detector. All three standard cornerness measures — Harris, Shi-Tomasi, and Förstner — compute $M$ identically and differ only in the scalar function of its eigenvalues used as the response.

- **harris-corner-detector** — computes $M$ as described above; the Harris response $R = \det(M) - k\,\mathrm{tr}(M)^2$ is the standard cornerness score.
- **shi-tomasi-corner-detector** — identical structure tensor construction; the response is replaced by $\min(\lambda_1, \lambda_2)$, motivating the "Good Features to Track" name.
- **lucas-kanade** — the iterative image registration update uses $M$ as the coefficient matrix of the per-iteration normal equation; the invertibility of $M$ is the precondition under which the gradient-based displacement estimate is well-defined.

The structure tensor also appears in anisotropic diffusion, where the coherence $C$ steers the diffusion tensor; that algorithm is not yet registered on this site.

# References

- W. Förstner, E. Gülch. "A Fast Operator for Detection and Precise Location of Distinct Points, Corners and Centres of Circular Features." *ISPRS Intercommission Workshop*, 1987. Introduces the harmonic-mean cornerness measure and the two-scale framework.
- C. Harris, M. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. Original motivation via the autocorrelation surface and the trace-determinant response.
- J. Shi, C. Tomasi. "Good Features to Track." *IEEE CVPR*, 1994. Derives $\min(\lambda_1, \lambda_2)$ as the theoretically correct tracking-quality measure.
- H. Knutsson. "Representing Local Structure Using Tensors." *Scandinavian Conference on Image Analysis*, 1989. General framework for the structure tensor in signal processing.
- J. Bigun, G. H. Granlund. "Optimal Orientation Detection of Linear Symmetry." *IEEE ICCV*, 1987. Simultaneous independent derivation of the structure tensor for orientation estimation.
