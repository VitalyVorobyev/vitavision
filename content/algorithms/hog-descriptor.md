---
title: "HOG: Histograms of Oriented Gradients"
date: 2026-05-12
summary: "Compute a fixed-length descriptor for an image window by binning pixel gradients into 8×8 cells of 9 unsigned-orientation histograms, normalising overlapping 2×2-cell blocks with L2-Hys, and concatenating the 3780 block values into a single vector fed to a linear SVM — the canonical pre-CNN pedestrian detector."
tags: ["local-descriptors", "classical"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [image-gradient, feature-descriptors]
failureModes: []
relations:
  - type: compared_with
    target: viola-jones-detector
    confidence: medium
    caution: "Both classical sliding-window detectors. Viola-Jones: Haar + AdaBoost cascade on faces. HOG: gradient histograms + linear SVM on pedestrians."
  - type: feeds_into
    target: felzenszwalb-deformable-parts
    confidence: high
    caution: "DPM uses HOG cells (k=8 px, α=0.2) with an analytic 31-dim projection of the 36-dim HOG vector as its base feature pyramid."
sources:
  primary: dalal2005-hog
  references: [lowe2004-sift]
  notes: |
    HOG descriptor for a 64×128 detection window: gradient via centred $[-1, 0, 1]$ (no smoothing, $\sigma = 0$); 8×8-pixel cells; 9 unsigned (0°–180°) orientation bins with bilinear interpolation in orientation and position; 2×2-cell (16×16-pixel) blocks at 8-pixel stride (50% overlap); Gaussian spatial window $\sigma = 0.5 \times$ block width $= 8$ px; L2-Hys normalisation (L2-norm, clip to 0.2, renormalise — from Lowe SIFT); descriptor dimension $7 \times 15 \times 4 \times 9 = 3780$; soft linear SVM at $C = 0.01$ with hard-example mining (§4, §6, Fig. 4–5). Empirical breakers: any prior Gaussian smoothing ($\sigma = 2$ drops recall 89%→80% at $10^{-4}$ FPPW); omitting block normalisation (−27%); fewer than 9 orientation bins; signed gradients for pedestrians; non-overlapping blocks (−4%); shrinking the 16-px window border to 8 px (−6%).
---
# Goal

Compute a dense, locally-normalised gradient-orientation histogram descriptor from a fixed-size image window and produce a single real-valued feature vector for linear SVM classification. Input: an RGB (or grayscale or LAB) image window, default 64×128 pixels for pedestrian detection. Output: a 3780-dimensional descriptor vector formed by concatenating normalised per-block histograms over a regular grid. The defining property is the combination of magnitude-weighted unsigned-orientation histograms over 8×8 px cells, grouped into overlapping 2×2 cell blocks with L2-Hys normalisation, without any prior image smoothing — a design shown by ablation to be jointly necessary for high detection accuracy at $10^{-4}$ false positives per window (FPPW).

# Algorithm

Let $I : \Omega \to \mathbb{R}^3$ denote the input colour image on pixel domain $\Omega$.
Let $(g_x, g_y)$ denote the horizontal and vertical gradient components at a pixel.
Let $\|g\| = \sqrt{g_x^2 + g_y^2}$ denote gradient magnitude.
Let $\theta \in [0, \pi)$ denote unsigned gradient orientation (sign discarded).
Let $c$ index a cell; default cell size is $8 \times 8$ px.
Let $b$ index a block; default block is $2 \times 2$ cells ($16 \times 16$ px), stride $8$ px.
Let $h_{c,b} \in \mathbb{R}^9$ denote the raw histogram for cell $c$ within block $b$.
Let $v_B \in \mathbb{R}^{36}$ denote the concatenated raw histograms for block $B$ ($4$ cells $\times$ $9$ bins).
Let $v_B' \in \mathbb{R}^{36}$ denote the L2-Hys-normalised block vector.
Let $f \in \mathbb{R}^{3780}$ denote the final descriptor (concatenation of all $v_B'$).
Let $\sigma_w = 8$ px denote the Gaussian spatial window applied within each block (half block width).
Let $\tau = 0.2$ denote the L2-Hys clip threshold (adopted from SIFT [2]).
Let $\varepsilon > 0$ denote a small regulariser preventing division by zero.

:::definition[Gradient]
The gradient is computed by the centred derivative filter $[-1,\; 0,\; 1]$, applied in $x$ and $y$ with no prior smoothing ($\sigma = 0$):

$$
g_x(p) = I(p + \hat{x}) - I(p - \hat{x}), \quad g_y(p) = I(p + \hat{y}) - I(p - \hat{y}).
$$

For colour images, the gradient vector is taken from the colour channel with the largest magnitude $\|g\|$ at each pixel.
:::

:::definition[Cell histogram]
Each pixel $p$ in cell $c$ casts a magnitude-weighted vote into the 9-bin unsigned-orientation histogram over $[0, \pi)$. Votes are bilinearly interpolated across the two adjacent bin centres in orientation and across adjacent cell boundaries in position:

$$
h_{c,b}[k] = \sum_{p \in c} \|g(p)\| \cdot w_{\text{orient}}(p, k) \cdot w_{\text{spatial}}(p),
$$

where $w_{\text{orient}}$ is the bilinear weight for bin $k$ from the orientation $\theta(p)$, and $w_{\text{spatial}}$ is the Gaussian weight $\exp\!\bigl(-\|p - p_c\|^2 / (2\sigma_w^2)\bigr)$ with $\sigma_w = 8$ px centred on the block centre $p_c$.
:::

:::definition[L2-Hys block normalisation]
Given the raw block vector $v_B$, L2-Hys proceeds in two passes:

$$
\begin{aligned}
v_B^{(1)} &= \frac{v_B}{\sqrt{\|v_B\|_2^2 + \varepsilon^2}}, \\
v_B^{(2)} &= \min\!\bigl(v_B^{(1)},\; \tau\bigr) \quad (\text{component-wise clip to } \tau = 0.2), \\
v_B' &= \frac{v_B^{(2)}}{\sqrt{\|v_B^{(2)}\|_2^2 + \varepsilon^2}}.
\end{aligned}
$$
:::

:::algorithm[HOG descriptor]
::input[Colour or grayscale image window; default $64 \times 128$ px]
::output[3780-dimensional descriptor vector $f$]

1. Compute $(g_x, g_y)$ at every pixel with the centred filter $[-1, 0, 1]$ and no prior smoothing; for colour input, select the channel with largest $\|g\|$.
2. For each cell $c$, accumulate a 9-bin magnitude-weighted histogram $h_{c,b}$ over unsigned orientations $[0, \pi)$ with bilinear interpolation in orientation and position, weighted by the Gaussian spatial window $\sigma_w = 8$ px centred on the enclosing block.
3. Group every $2 \times 2$ adjacent cells into a block $B$; concatenate their histograms to form $v_B \in \mathbb{R}^{36}$; advance the block window by the stride of $8$ px to produce $7 \times 15 = 105$ overlapping block positions for the default window.
4. Normalise each $v_B$ with L2-Hys (L2-normalise → clip at $\tau = 0.2$ → renormalise) to obtain $v_B'$.
5. Concatenate all 105 vectors $v_B'$ into the final descriptor $f \in \mathbb{R}^{3780}$; feed to a linear SVM for classification.
:::

# Implementation

The per-cell histogram accumulation and L2-Hys normalisation in Rust:

```rust
const BINS: usize = 9;
const CELLS_PER_BLOCK: usize = 4; // 2×2 cells
const BLOCK_DIM: usize = BINS * CELLS_PER_BLOCK; // 36
const CLIP: f32 = 0.2;
const EPS: f32 = 1e-5;

/// Centred gradient at pixel (x, y) in a row-major f32 plane of given width.
fn gradient(plane: &[f32], width: usize, x: usize, y: usize) -> (f32, f32) {
    let gx = plane[y * width + (x + 1)] - plane[y * width + (x - 1)];
    let gy = plane[(y + 1) * width + x] - plane[(y - 1) * width + x];
    (gx, gy)
}

/// Accumulate one pixel's vote into a 9-bin unsigned-orientation histogram.
/// `theta` is in [0, π); `mag` is the gradient magnitude; `hist` has BINS slots.
fn accumulate_bin(hist: &mut [f32; BINS], theta: f32, mag: f32) {
    let bin_width = std::f32::consts::PI / BINS as f32;
    let bin_f = theta / bin_width;
    let bin0 = bin_f.floor() as usize % BINS;
    let bin1 = (bin0 + 1) % BINS;
    let w1 = bin_f - bin_f.floor(); // fractional part
    hist[bin0] += mag * (1.0 - w1);
    hist[bin1] += mag * w1;
}

/// L2-Hys normalisation of a 36-element raw block vector in-place.
fn l2_hys(v: &mut [f32; BLOCK_DIM]) {
    // First L2 normalise
    let norm = v.iter().map(|x| x * x).sum::<f32>().sqrt() + EPS;
    for x in v.iter_mut() { *x /= norm; }
    // Clip to τ = 0.2
    for x in v.iter_mut() { *x = x.min(CLIP); }
    // Renormalise
    let norm2 = v.iter().map(|x| x * x).sum::<f32>().sqrt() + EPS;
    for x in v.iter_mut() { *x /= norm2; }
}
```

# Remarks

- Descriptor extraction is $O(W \cdot H)$ per window in image area; a full sliding-window scale pyramid adds a factor of $O(N_{\text{pyr}})$ pyramid levels.
- Prior Gaussian smoothing before gradient computation damages performance: moving from $\sigma = 0$ to $\sigma = 2$ reduces recall from 89% to 80% at $10^{-4}$ FPPW. The no-smoothing rule is the single most damaging parameter to violate.
- HOG is not rotation-invariant; orientation is computed in image coordinates, so the descriptor encodes absolute image-plane direction rather than object-relative direction.
- Hard-example mining — retraining the linear SVM on its own false positives from the negative set — adds approximately 5% detection rate at $10^{-4}$ FPPW.
- Unsigned orientation ($[0, \pi)$, 9 bins) suits pedestrian detection because clothing contrast polarity is variable; signed orientation ($[0, 2\pi)$) is preferable for object classes with consistent contrast polarity.
- Deformable Part Models (Felzenszwalb et al., 2010) build a deformable mixture of HOG filters on top of this descriptor.
- The HOG + linear-SVM and HOG + DPM sliding-window pipelines were superseded for general object detection by [Faster R-CNN](../models/faster-rcnn), which replaces handcrafted gradient histograms with shared convolutional features and a learned Region Proposal Network.

# References

1. **N. Dalal, B. Triggs.** *Histograms of Oriented Gradients for Human Detection.* CVPR, 2005. [HAL](https://inria.hal.science/inria-00548512)
2. **D. G. Lowe.** *Distinctive Image Features from Scale-Invariant Keypoints.* IJCV, 60(2):91–110, 2004. — source of the L2-Hys clip threshold 0.2. [Springer](https://link.springer.com/article/10.1023/B:VISI.0000029664.99615.94)
