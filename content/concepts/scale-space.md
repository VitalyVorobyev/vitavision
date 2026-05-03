---
title: "Scale Space"
date: 2026-04-30
summary: "A one-parameter family of images obtained by progressively blurring an input image with Gaussians of increasing standard deviation, providing a principled multi-scale representation for detecting and describing image features."
tags: ["image-formation", "multi-scale", "gaussian-filtering"]
author: "Vitaly Vorobyev"
domain: image-formation
difficulty: intermediate
prerequisites: []
---

# Definition

The (linear) scale space of an image $I(x, y)$ is the family of images

$$
L(x, y;\, \sigma) = G_\sigma(x, y) * I(x, y),
$$

indexed by the scale parameter $\sigma \geq 0$, where $G_\sigma$ is the isotropic Gaussian kernel with standard deviation $\sigma$:

$$
G_\sigma(x, y) = \frac{1}{2\pi\sigma^2}\exp\!\left(-\frac{x^2+y^2}{2\sigma^2}\right).
$$

At $\sigma = 0$, $L = I$ (the original image). As $\sigma$ increases, fine structure is progressively suppressed and only coarser structure survives. The scale parameter $\sigma$ sets the spatial resolution at which the image is examined: structure at spatial frequency $f$ is attenuated by the factor $\exp(-2\pi^2 \sigma^2 f^2)$.

Scale space is not an algorithm; it is a representation. Algorithms that detect or describe image features at multiple scales operate by applying their feature operators to $L(\cdot;\,\sigma)$ for a discrete set of $\sigma$ values, then selecting the scale at which each feature has the strongest or most stable response.

# Mathematical Description

## Axiomatic characterization

Lindeberg (1994) showed that under four modest axioms — **linearity** (superposition holds), **spatial shift invariance** (no preferred position), **isotropic scale invariance** (no preferred orientation), and **causality** (no new features are created as $\sigma$ increases) — the Gaussian family is the unique one-parameter group of smoothing operators that can generate a scale space. Any other rotationally symmetric kernel that satisfies these axioms is equivalent to a reparameterization of the Gaussian.

## Heat equation connection

The scale-space family satisfies the linear diffusion (heat) equation:

$$
\frac{\partial L}{\partial t} = \nabla^2 L = L_{xx} + L_{yy}, \quad t = \tfrac{1}{2}\sigma^2.
$$

This identifies scale-space generation with isotropic heat diffusion, and makes the causality property transparent: the maximum principle for the heat equation prevents the creation of local extrema in $L$ as $t$ increases.

## Scale-normalized derivatives

Comparing derivative magnitudes across scales requires normalization to compensate for the factor by which Gaussian smoothing reduces derivative amplitudes. The $\gamma$-normalized $n$-th order derivative is:

$$
L_{\sigma\text{-norm}} = \sigma^{n\gamma}\, \partial^n L / \partial x^n.
$$

For $\gamma = 1$ (scale normalization), the response of a blob-like feature of characteristic size $\sigma_0$ is constant across all scales $\sigma = \sigma_0$, enabling automatic scale selection by finding extrema of the normalized response over $\sigma$.

## Difference of Gaussians (DoG)

The Laplacian of Gaussian $\nabla^2 G_\sigma$ is approximated efficiently by the difference of two Gaussians at adjacent scales:

$$
\mathrm{DoG}(x, y; \sigma, k) = L(x, y;\, k\sigma) - L(x, y;\, \sigma) \approx (k-1)\,\sigma^2\,\nabla^2 L.
$$

Lowe's SIFT keypoint detector finds 3-D extrema (over $x$, $y$, and $\sigma$) in the DoG pyramid. The DoG is preferred over the Laplacian because it is computed by subtraction rather than second-derivative convolution.

## Discrete scale-space pyramids

The continuous scale space is discretized by sampling $\sigma$ at a geometric progression $\sigma_s = \sigma_0 \cdot k^s$ for integer $s$. An **octave** groups scales by a factor-of-2 range: within an octave, the image is at the same resolution; between octaves, the image is downsampled by 2 and the Gaussian kernel is reset.

:::definition[Octave structure]
An octave at resolution level $o$ contains $S$ intermediate scale samples plus two overlapping samples, giving $S+3$ images per octave.

$$
\sigma_{o,s} = \sigma_0 \cdot 2^{o + s/S}.
$$
:::

Anti-aliasing requires that before downsampling from octave $o$ to $o+1$, the image be blurred to $\sigma \geq 1.0$ pixel at the new resolution (Nyquist condition). In practice, the last image of octave $o$ at $\sigma = 2\sigma_0$ is used as the input to octave $o+1$.

The **Laplacian pyramid** of Burt and Adelson (1983) is an alternative discretization: each level stores the difference between adjacent Gaussian-pyramid levels, giving a compact multi-scale bandpass decomposition. SIFT's DoG pyramid is the scale-space counterpart of the Laplacian pyramid.

## Characteristic scale

The characteristic scale of a feature is the scale $\hat{\sigma}$ at which the scale-normalized Laplacian $\sigma^2 \nabla^2 L$ achieves a local maximum over $\sigma$. For a circular blob of radius $r$, $\hat{\sigma} = r / \sqrt{2}$. Selecting features at their characteristic scale makes descriptors invariant to scale change between images.

# Numerical Concerns

**Octave structure and anti-aliasing.** Downsampling by 2 without prior blurring introduces aliasing. The input image at each octave must be pre-blurred to at least $\sigma = 1.0$ pixel before halving the resolution. SIFT pre-blurs the original image to $\sigma = 0.5$ pixel (assumed already present from camera optics) and begins the first octave at $\sigma_0 = 1.6$ pixels.

**Separable implementation.** The 2-D Gaussian $G_\sigma(x, y)$ is separable into $g_\sigma(x) \cdot g_\sigma(y)$. Convolving with a 2-D kernel of size $(6\sigma+1)^2$ has complexity $O(\sigma^2)$ per pixel; the separable implementation runs two 1-D passes each of length $6\sigma+1$, giving $O(\sigma)$ per pixel. For $\sigma = 4$, this is a factor of $\sim 24\times$ speedup.

**Incremental Gaussian generation.** At each scale step within an octave, the next blurred image is obtained by blurring the previous one (not blurring the original each time). If the current level has $\sigma_1$ and the target has $\sigma_2 > \sigma_1$, the additional blur is $\sigma_\Delta = \sqrt{\sigma_2^2 - \sigma_1^2}$, by the semigroup property $G_a * G_b = G_{\sqrt{a^2+b^2}}$. This avoids re-blurring from the original, at the cost of accumulating quantization errors.

**Integer vs floating-point pixels.** Computing DoG on integer-quantized images introduces quantization noise in the difference. For calibration-target corner detection, images are typically 8-bit; the DoG response is small ($\sim 1$–$5$ gray-level units) and quantization can produce false extrema. Floating-point intermediate representations are preferred.

**Scale ratio $k$ and detection coverage.** The scale ratio $k = 2^{1/S}$ determines how densely $\sigma$ is sampled. For SIFT, $S = 3$ gives $k = 2^{1/3} \approx 1.26$; between two adjacent DoG levels, the scale changes by 26%. Features whose characteristic scale falls between two sample levels are detected at neither, causing scale-sampling gaps. Smaller $k$ (more samples per octave) improves coverage at the cost of additional convolutions.

**Boundary effects in pyramids.** At coarse scales (large $\sigma$), the Gaussian kernel radius approaches or exceeds the image size. Border handling (replicate, reflect, or zero-pad) produces artifacts in the outermost $3\sigma$ pixels. Feature detection near borders at coarse scales is unreliable and should be masked.

# Where it appears

Scale space underlies every algorithm that must detect or describe features consistently across image resolutions or under scale change. Calibration-target corner detectors, in particular, use scale space to handle targets that appear at varying distances from the camera.

- **chess-corners** — ChESS computes its ring-pattern response on the image at multiple scales; RING5 corresponds to a ring radius of 5 pixels, which maps to a specific scale in the scale-space sense. Applying the detector across scales and selecting the peak response makes detection robust to target scale variation.
- **pyramidal-blur-aware-xcorner** — explicitly constructs a Gaussian image pyramid and runs its X-corner detector at each pyramid level; the "pyramidal" in the name refers to this multi-scale search; blur-aware scale selection picks the pyramid level whose blur matches the detector's response model.

# References

1. T. Lindeberg. *Scale-Space Theory in Computer Vision.* Kluwer Academic Publishers, 1994. The axiomatic foundation of scale space; introduces $\gamma$-normalized derivatives and characteristic scale selection.
2. P. J. Burt, E. H. Adelson. "The Laplacian Pyramid as a Compact Image Code." *IEEE Transactions on Communications* 31(4), 1983. Introduces the image pyramid; the Laplacian pyramid is the discrete-scale-space precursor to SIFT's DoG pyramid.
3. D. G. Lowe. "Distinctive Image Features from Scale-Invariant Keypoints." *International Journal of Computer Vision* 60(2), 2004. Uses the DoG pyramid for keypoint detection with automatic scale selection; SIFT descriptors computed at the characteristic scale.
4. R. Szeliski. *Computer Vision: Algorithms and Applications.* 2nd ed. Springer, 2022. §3.5 covers Gaussian pyramids and scale space; §7.1 covers SIFT and multi-scale feature detection.
5. J. Koenderink. "The Structure of Images." *Biological Cybernetics* 50(5), 1984. Early scale-space paper showing that the Gaussian is the only kernel consistent with local image measurements.
