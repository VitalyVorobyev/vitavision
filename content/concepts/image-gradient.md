---
title: "Image Gradient"
date: 2026-04-30
summary: "The 2-vector of partial derivatives of image intensity with respect to spatial coordinates, measuring the rate and direction of brightness change at each pixel."
tags: ["feature-theory", "derivatives", "filtering"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites: []
---

# Definition

The image gradient at a pixel $(x, y)$ is the 2-vector of partial derivatives of the image intensity function $I(x, y)$:

$$
\nabla I(x, y) = \begin{bmatrix} I_x \\ I_y \end{bmatrix} = \begin{bmatrix} \partial I / \partial x \\ \partial I / \partial y \end{bmatrix}.
$$

It points in the direction of steepest ascent of $I$ and has magnitude equal to the rate of change in that direction. Because $I$ is defined on a discrete pixel grid, $\nabla I$ is computed by convolving $I$ with a discrete derivative kernel rather than by analytic differentiation.

The gradient is the foundational quantity in image analysis: edges, corners, texture descriptors, optical flow, and calibration target detectors are all built on $I_x$ and $I_y$. It is not itself a feature; it is the raw material from which features are constructed.

# Mathematical Description

## Discrete derivative kernels

On a discrete image $I: \mathbb{Z}^2 \to \mathbb{R}$, differentiation in the $x$-direction is approximated by a finite-difference kernel $d_x$ convolved row-wise. The three standard choices trade isotropy against noise sensitivity:

:::definition[Forward difference]
The simplest approximation; one-pixel support.

$$
d_x = \begin{bmatrix} 0 & -1 & 1 \end{bmatrix}, \quad
d_y = \begin{bmatrix} 0 \\ -1 \\ 1 \end{bmatrix}.
$$
:::

:::definition[Central difference]
Symmetric; better approximation of the derivative at the sample point. Not separable as a 2-D kernel but used column- or row-wise.

$$
d_x = \begin{bmatrix} -\tfrac{1}{2} & 0 & \tfrac{1}{2} \end{bmatrix}.
$$
:::

:::definition[Sobel kernel]
Combines differentiation in one axis with smoothing in the perpendicular axis. Separable: $k_x = k_s \otimes d_x$ where $k_s = [1, 2, 1]^T$ is a binomial smoother.

$$
k_x = \begin{bmatrix} -1 & 0 & 1 \\ -2 & 0 & 2 \\ -1 & 0 & 1 \end{bmatrix}, \quad
k_y = \begin{bmatrix} -1 & -2 & -1 \\ 0 & 0 & 0 \\ 1 & 2 & 1 \end{bmatrix}.
$$
:::

The Scharr kernel is a 3×3 optimised variant of Sobel with improved rotational isotropy. The Prewitt kernel is the same structure with uniform row weights $[1, 1, 1]$ instead of $[1, 2, 1]$.

## Gradient of a Gaussian

Smoothing before differentiation is the standard practice for noisy images. Let $G_\sigma$ denote the Gaussian with standard deviation $\sigma$. By the commutativity of convolution and differentiation:

$$
I_x^{(\sigma)} = I * \partial_x G_\sigma = I * G_\sigma * d_x,
$$

so computing the smoothed gradient is equivalent to convolving with the derivative of a Gaussian. The parameter $\sigma$ sets the spatial scale at which structure is detected: small $\sigma$ resolves fine structure but amplifies noise; large $\sigma$ suppresses noise but smears thin edges.

## Gradient magnitude and direction

:::definition[Gradient magnitude]
The Euclidean norm of the gradient vector; measures edge strength.

$$
|\nabla I|(x, y) = \sqrt{I_x^2 + I_y^2}.
$$
:::

:::definition[Gradient direction]
The angle of steepest ascent, measured from the positive $x$-axis.

$$
\theta(x, y) = \operatorname{atan2}(I_y, I_x) \in (-\pi, \pi].
$$
:::

For edge detection and oriented descriptor computation the gradient direction is taken modulo $\pi$ (unsigned orientation), since an edge gradient points perpendicular to the edge and the sign depends on which side is brighter. For optical flow and other vector-field applications the full $2\pi$ range is retained.

## Separability and the structure tensor

The outer product $\nabla I \, (\nabla I)^T$ is a $2\times 2$ rank-1 matrix whose entries are $I_x^2$, $I_x I_y$, and $I_y^2$. Summing this outer product over a local window produces the structure tensor, which encodes the dominant gradient orientations in the neighbourhood. Every corner detector based on the structure tensor — Harris, Shi-Tomasi — is directly built from $I_x$ and $I_y$.

# Numerical Concerns

**Discretization error.** No 3×3 kernel exactly recovers the continuous derivative of the underlying scene radiance. The Sobel kernel has a flat frequency response over low frequencies but rolls off at high frequencies. The Scharr kernel minimises the angular error in the frequency domain. The central-difference kernel has better theoretical accuracy but no built-in smoothing.

**Pre-smoothing is mandatory before differentiation.** Differentiating a raw image amplifies high-frequency noise quadratically in the derivative power spectrum. In practice, computing $\nabla(G_\sigma * I)$ with $\sigma \geq 0.5$ pixels is the minimum viable preprocessing. Skipping pre-smoothing produces gradient maps dominated by sensor noise rather than scene structure.

**Scale selection.** The choice of $\sigma$ is a free parameter. Gradient-based detectors are only consistent across images if the same $\sigma$ is used. Multi-scale detectors (scale-space methods) compute $\nabla I$ at several values of $\sigma$ and select the response scale that maximizes a scale-normalized measure.

**Border handling.** Convolution is undefined at pixel locations within $\lfloor k/2 \rfloor$ of the image boundary (for a kernel of width $k$). Common strategies are: replicate the border pixel (constant extrapolation), reflect the image (symmetric extension), or zero-pad. Each choice affects the gradient values in a border strip of width equal to the kernel radius.

**Sub-pixel interpretation.** Even though $I_x$ and $I_y$ are computed at integer pixel positions, they are used in downstream algorithms (e.g., Lucas-Kanade optical flow, subpixel corner refinement) as if they represent the derivative of a continuous function interpolated from the discrete values. The interpolation model is implicit and depends on the kernel used.

**Dynamic range and normalization.** The Sobel kernel output for an 8-bit image spans roughly $[-4 \times 255, +4 \times 255]$ before any normalization. Implementations that accumulate $I_x^2 + I_y^2$ in integer arithmetic must use 32-bit accumulators to avoid overflow when forming the structure tensor.

**Numerical accuracy of `atan2`.** Computing the gradient direction via `atan2(Iy, Ix)` is well-defined except at $(0, 0)$, where the gradient is undefined. Downstream algorithms that bin gradient orientations (e.g., SIFT descriptor histograms) must guard against the zero-magnitude case.

# Where it appears

The image gradient is the lowest-level quantity on which feature detection and image analysis are built. Nearly every algorithm on this site that operates on raw pixel data computes $\nabla I$ as its first step.

- **harris-corner-detector** — builds the structure tensor from $I_x^2$, $I_x I_y$, $I_y^2$; the Harris response $R = \det(M) - k\,\mathrm{tr}(M)^2$ is a function of these gradient products.
- **shi-tomasi-corner-detector** — uses the identical gradient-based structure tensor; replaces the Harris response with the minimum eigenvalue $\min(\lambda_1, \lambda_2)$.
- **chess-corners** — the ChESS detector samples gradient-derived intensity contrasts on a ring pattern; gradient orientation is used to compute the dominant direction.
- **fast-corner-detector** — does not use gradients directly; pixel-intensity comparisons on a circle substitute for gradient computation, which is one reason FAST is faster than Harris.
- **pyramidal-blur-aware-xcorner** — operates on an image pyramid, computing gradients at each pyramid level; scale selection is driven by gradient-based saddle-point measures.
- **loy-fast-radial-symmetry** — votes along the gradient orientation $\hat{\mathbf{g}}(p) = \mathbf{g}(p)/\|\mathbf{g}(p)\|$ at each pixel; positively- and negatively-affected pixels at distance $n$ accumulate magnitude and orientation contributions, yielding a symmetry-contribution map per radius.

# References

- C. Harris, M. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. Defines the structure tensor directly from image partial derivatives.
- D. Forsyth, J. Ponce. *Computer Vision: A Modern Approach.* 2nd ed. Prentice Hall, 2011. §5 covers linear filtering and discrete differentiation.
- R. Szeliski. *Computer Vision: Algorithms and Applications.* 2nd ed. Springer, 2022. §3.2 covers image gradients; §3.3 covers Gaussian blur and scale-space.
- J. Prewitt. "Object Enhancement and Extraction." *Picture Processing and Psychopictorics*, 1970. Original Prewitt kernel.
- H. Scharr. *Optimale Operatoren in der Digitalen Bildverarbeitung.* Dissertation, Universität Heidelberg, 2000. Derivation of the Scharr kernel as the isotropy-optimal 3×3 derivative filter.
