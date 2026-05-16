---
title: "Feature Descriptors"
date: 2026-05-16
summary: "Fixed-length vectors encoding the local image appearance around a keypoint, built so the same physical point yields similar descriptors across views — the basis for descriptor matching."
tags: ["local-descriptors", "binary-descriptor"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites:
  - image-gradient
sources:
  primary: lowe2004-sift
  references:
    - dalal2005-hog
    - calonder2010-brief
    - rublee2011-orb
---

# Definition

A feature descriptor is a fixed-length vector encoding the local image appearance around a detected keypoint, constructed so that the same physical surface point produces vectors with small mutual distance across different views.

:::definition[Feature descriptor]
Given a grayscale image $I$ and a keypoint with location $(x, y)$, scale $\sigma$, and orientation $\theta$, a feature descriptor is a mapping

$$\phi : \mathcal{P}(I, x, y, \sigma, \theta) \;\longrightarrow\; \mathbb{R}^d \;\text{or}\; \{0, 1\}^d,$$

where $\mathcal{P}$ denotes the normalized image patch extracted at the keypoint's support region. The invariance goal is that $\|\phi(I_1) - \phi(I_2)\|$ is small when $I_1$ and $I_2$ depict the same physical point under viewpoint change, illumination change, or noise, and large otherwise. Matching is performed by nearest-neighbour search under the descriptor's native distance — Euclidean ($L_2$) for float vectors, Hamming for binary strings.
:::

Descriptors differ in what they encode and how they achieve invariance. Gradient-orientation-histogram descriptors (SIFT, HOG) accumulate image gradient directions into spatial bins and normalize each bin block to remove contrast variation. Binary descriptors (BRIEF, ORB) replace the float vector with a bit string produced by pairwise pixel-intensity comparisons, enabling Hamming-distance matching via bitwise XOR and hardware popcount.

# Mathematical Description

## Gradient-orientation-histogram descriptors

### SIFT descriptor

SIFT builds its descriptor from image gradients sampled in the normalized frame of the keypoint. After assigning orientation $\theta$ by finding the dominant peak in a 36-bin gradient-orientation histogram computed over a Gaussian window with $\sigma_w = 1.5 \times \sigma_{\text{keypoint}}$, a $16 \times 16$ neighborhood is sampled in the keypoint's rotated coordinate frame. The neighborhood is divided into a $4 \times 4$ grid of cells; each cell accumulates an 8-bin orientation histogram, yielding

$$d_{\text{SIFT}} = 4 \times 4 \times 8 = 128 \text{ dimensions.}$$

Votes are weighted by gradient magnitude and by a Gaussian spatial window; trilinear interpolation distributes each vote across adjacent spatial cells and orientation bins. The resulting vector is $L_2$-normalized, each element clamped to $0.2$ to suppress nonlinear illumination effects, then renormalized:

$$\hat{\phi} = \frac{\phi}{\|\phi\|_2}, \quad \hat{\phi}_i \leftarrow \min(\hat{\phi}_i,\ 0.2), \quad \hat{\phi} \leftarrow \frac{\hat{\phi}}{\|\hat{\phi}\|_2}.$$

The $4 \times 4 \times 8$ configuration was determined by an experimental sweep over descriptor widths and orientation counts; configurations beyond it degrade performance due to increased sensitivity to geometric distortion.

### HOG descriptor

HOG computes a dense descriptor over a fixed detection window by dividing it into cells and grouping cells into normalized blocks. For the standard $64 \times 128$ pedestrian window, cells are $8 \times 8$ pixels; each pixel casts a gradient-magnitude-weighted vote into one of 9 unsigned orientation bins spanning $0°$–$180°$, with bilinear interpolation in both orientation and position. Cells are grouped into $2 \times 2$ cell blocks ($16 \times 16$ pixels) with a stride of 8 pixels (50% overlap):

$$d_{\text{HOG}} = 7 \times 15 \times 4 \times 9 = 3780 \text{ dimensions,}$$

where $7 \times 15$ counts the block positions across the window. Each block descriptor is normalized by L2-Hys: $L_2$-normalize the raw block vector, clip each element to $0.2$, then renormalize — the same clipping constant used in SIFT. Gradients are computed with the centred filter $[-1, 0, 1]$ without prior smoothing; moving from $\sigma = 0$ to $\sigma = 2$ Gaussian pre-smoothing reduces recall from 89% to 80% at $10^{-4}$ false positives per window. Unsigned orientations outperform signed for pedestrian detection because clothing colour variability makes gradient sign uninformative.

## Binary descriptors

### BRIEF

BRIEF encodes a Gaussian-smoothed patch of size $S \times S$ as a bit string by running $n_d$ pairwise pixel-intensity tests. Each bit is a single comparison:

$$\tau(p;\, x, y) := \begin{cases} 1 & \text{if } p(x) < p(y) \\ 0 & \text{otherwise} \end{cases}$$

where $p(x)$ is the smoothed intensity at location $x$. Packing $n_d$ tests yields

$$f_{n_d}(p) = \sum_{1 \le i \le n_d} 2^{i-1}\,\tau(p;\, x_i, y_i).$$

$n_d \in \{128, 256, 512\}$ bits correspond to BRIEF-16, BRIEF-32, BRIEF-64 (trailing number is storage in bytes); BRIEF-32 is the standard operating point. The pixel-pair offset table is drawn once from a zero-mean isotropic Gaussian with variance $\sigma^2 = S^2/25$, which outperforms four alternative sampling geometries empirically. Patch smoothing (Gaussian $\sigma = 2$, $9 \times 9$ kernel) is mandatory — without it, each test evaluates a single noisy pixel. Matching uses Hamming distance,

$$d_H(\mathbf{b}_1, \mathbf{b}_2) = \text{popcount}(\mathbf{b}_1 \oplus \mathbf{b}_2),$$

executable as a single hardware `POPCNT` instruction. No orientation correction is applied; BRIEF is rotation-sensitive by design.

### ORB: steered BRIEF with learned uncorrelated tests

ORB replaces BRIEF's random test table with a rotation-corrected, learned set. Keypoint orientation is estimated by the intensity centroid of a circular patch:

$$\theta = \text{atan2}(m_{01},\, m_{10}), \quad m_{pq} = \sum_{x,y} x^p y^q\, I(x, y).$$

The orientation is discretized to a $12°$ step, enabling a precomputed lookup table of rotated test patterns. The steered descriptor evaluates 256 binary tests on a $31 \times 31$ patch, each comparing the mean intensity of two $5 \times 5$ sub-windows. The test table is selected by greedy search over ${\sim}205{,}590$ candidate pairs to maximize per-test variance (mean response near $0.5$) and minimize pairwise correlation — recovering the variance that naive steering of a Gaussian-random BRIEF table destroys.

# Numerical Concerns

**Histogram normalization and clamping.** Both SIFT and HOG $L_2$-normalize, clip each element at $0.2$, then renormalize. The clip threshold was determined experimentally for $L_2$-normalized float descriptors; it suppresses large gradient magnitudes from specular reflections or shadow boundaries without discarding orientation information. It does not transfer to $L_1$ or RootSIFT normalizations. Omitting normalization entirely costs HOG roughly 27% recall at $10^{-4}$ false positives per window.

**Orientation quantization.** SIFT uses 8 orientation bins per cell; HOG uses 9 unsigned bins. Performance degrades sharply with fewer bins, and finer quantization yields diminishing returns while increasing dimension. Both interpolate votes across bin boundaries — trilinear for SIFT, bilinear for HOG — to remove discontinuities as the patch rotates.

**Rotation and scale handling.** SIFT achieves rotation invariance by rotating the descriptor grid to the dominant orientation and scale invariance by sampling the grid at the keypoint's scale. HOG achieves neither — it is a fixed-window, upright descriptor for sliding-window detection. BRIEF is rotation-sensitive above $10$–$15°$ in-plane rotation; ORB recovers rotation invariance through the intensity-centroid orientation discretized to $12°$ steps.

**Dimensionality and distance metric.** SIFT is a 128-D float vector (512 bytes); BRIEF-32 is 32 bytes — a $4$–$16\times$ storage reduction. Hamming distance over binary strings differs fundamentally from Euclidean distance over float vectors: non-matching BRIEF-32 distances are roughly Gaussian about 128 (of a maximum 256), giving clear separation from matching pairs at short to moderate baselines. Mixing metric and descriptor type produces meaningless distances and catastrophic matching failure.

**Patch-smoothing consistency.** BRIEF's smoothing kernel and pixel-pair offset table must be identical at test-pattern generation and at descriptor computation; a mismatch silently degrades all matches. HOG's constraint is inverted — any Gaussian smoothing before gradient computation damages performance.

# Where it appears

The four registered pages below each instantiate this concept under a different choice along the float-vs-binary and rotation-invariance axes.

- [sift](/atlas/sift) — gradient-orientation-histogram descriptor; 128-D float vector from a $4 \times 4$ grid of 8-bin histograms; $L_2$-normalized with $0.2$ clamping; rotation invariance via dominant-orientation alignment, scale invariance via DoG keypoint detection.
- [hog-descriptor](/atlas/hog-descriptor) — dense gradient-orientation-histogram descriptor; 3780-D vector for a $64 \times 128$ window with L2-Hys normalization; no rotation or scale invariance; designed for sliding-window detection feeding a linear SVM rather than keypoint matching.
- [brief](/atlas/brief) — binary descriptor; $n_d \in \{128, 256, 512\}$ bits from pairwise pixel-intensity comparisons on a Gaussian-smoothed patch; Hamming-distance matching; rotation-sensitive; detector-agnostic.
- [orb](/atlas/orb) — rotation-invariant binary descriptor (rBRIEF) paired with an oriented FAST detector; 256-bit descriptor with orientation from the intensity centroid and a learned, variance-maximizing test table.

# References

1. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 60(2):91–110, 2004.
2. N. Dalal, B. Triggs. *Histograms of Oriented Gradients for Human Detection.* IEEE CVPR, 2005.
3. M. Calonder, V. Lepetit, C. Strecha, P. Fua. *BRIEF: Binary Robust Independent Elementary Features.* ECCV, 2010.
4. E. Rublee, V. Rabaud, K. Konolige, G. Bradski. *ORB: An Efficient Alternative to SIFT or SURF.* IEEE ICCV, 2011.
