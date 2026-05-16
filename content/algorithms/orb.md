---
title: "ORB: Oriented FAST and Rotated BRIEF"
date: 2026-05-09
summary: "Detects rotation-invariant oriented keypoints by running FAST-9 on a √2 image pyramid, ranking by Harris cornerness, and assigning orientation from the intensity centroid; describes each keypoint with a 256-bit rBRIEF binary string formed by greedy selection of low-correlation, high-variance pairwise pixel-intensity tests on a smoothed 31×31 patch."
tags: ["local-descriptors", "binary-descriptor"]
domain: features
tasks: [feature-detection, local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [image-gradient, scale-space, feature-descriptors, integral-image]
failureModes: []
sources:
  primary: rublee2011-orb
  references: [calonder2010-brief, rosten2006-fast, harris1988-corner, lowe2004-sift, bay2006-surf, viola2001-detector]
  notes: |
    Method (Rublee et al. 2011, ICCV). Two-stage pipeline:
    oFAST (detector) + rBRIEF (descriptor).

    oFAST (§3): FAST-9 candidates at each level of a 5-level
    image pyramid (scale factor √2, area-based interpolation).
    Adaptive intensity threshold yields ≥ N candidates; Harris
    cornerness response orders them and the top-N per level
    survive. Orientation θ = atan2(m_{01}, m_{10}) (Eq. 3) from
    the first-order moments of a circular patch of radius r equal
    to the patch half-width (Eq. 1: m_{pq} = Σ x^p y^q I(x,y);
    Eq. 2: C = (m_{10}/m_{00}, m_{01}/m_{00})).

    rBRIEF (§4): binary tests on the smoothed 31×31 patch via an
    integral image; each test compares the mean intensity of two
    5×5 sub-windows (so the candidate-pair pool size is
    M = (wp − wt)² choose-2 with overlap eliminated → 205,590).
    The test set S = [(x_i, y_i)] (2×n matrix) is steered to S_θ
    = R_θ S using θ from oFAST, discretised to 2π/30 (12°)
    increments via a precomputed lookup table — 30 LUT entries.
    Greedy learning (§4.3) selects 256 tests on ~300k PASCAL 2006
    keypoints by ranking |mean − 0.5| and rejecting any candidate
    whose absolute pairwise correlation with the running set
    exceeds a threshold (raised if fewer than 256 survive).
    Eq. 4–6 define τ, f_n, g_n.

    Matching: Hamming distance via XOR + popcount (SSE 4.2 in
    the paper). Large-scale retrieval: multi-probe LSH with a
    sub-signature-of-bits hash, 16-bit sub-signature, 4–20 hash
    tables.

    Benchmarks (§6.1, 640×480, Intel i7 2.8 GHz, single thread):
    Pyramid 4.43 ms, oFAST 8.68 ms, rBRIEF 2.12 ms, total ≈
    15.3 ms; SURF 217.3 ms, SIFT 5228.7 ms on the same data.
    Cellphone (1 GHz ARM, ~400 points): ORB 66.6 ms, matching
    72.8 ms, H-fit 20.9 ms — ~7 Hz at 640×480 (§6.3).

    Inlier rates (§4.4): outdoor "Boat" — ORB 45.8%, SURF 28.6%,
    SIFT 30.2%; indoor "Magazines" — ORB 36.2%, SURF 38.3%, SIFT
    34.0%. Rotation robustness (Fig. 7) > 70% inliers across all
    angles under Gaussian noise σ = 10; BRIEF (without steering)
    drops sharply beyond ~10°.

    Scope: ORB targets in-plane rotation and modest scale; per-
    keypoint scale is a discrete pyramid level, not a continuous
    estimate. BSD-licensed reference implementation in OpenCV
    2.3+.
---

# Goal

Detect oriented keypoints from a greyscale image at multiple scales and compute a 256-bit binary descriptor per keypoint suitable for Hamming-distance matching. Input: a greyscale image $I$. Output: a list of keypoints $(x, y, \theta, \ell)$ — pixel location, orientation angle, and pyramid level — each paired with a 256-bit binary descriptor $\mathbf{d} \in \{0,1\}^{256}$. The defining property is a rotation-invariant binary descriptor pipeline (oFAST + rBRIEF) that operates at video rate on a single CPU core without GPU or SIMD acceleration.

# Algorithm

Let $I: \Omega \to \mathbb{R}$ denote the greyscale input image. Let $I_\ell$ denote the image at pyramid level $\ell$, with $I_0 = I$. Let $s = \sqrt{2}$ denote the scale factor between successive pyramid levels. Let $L = 5$ denote the total number of pyramid levels. Let $N$ denote the target total keypoint count. Let $r = 15$ denote the half-width of the 31-pixel orientation patch (so the patch covers $[-r, r]$ in both dimensions). Let $R_H$ denote the Harris cornerness response used to rank FAST candidates. Let $p$ denote the integral-image-smoothed patch on a $31 \times 31$ window centred at a keypoint. Let $w_p = 31$ denote the patch side length. Let $w_t = 5$ denote the sub-window side length used in each binary test. Let $n = 256$ denote the descriptor bit length. Let $S$ denote the $2 \times n$ matrix of test-pair offsets. Let $R_\theta$ denote the $2 \times 2$ rotation matrix for angle $\theta$. Let $S_\theta = R_\theta S$ denote the steered offset matrix. Let $\tau$ denote a single pixel-pair test. Let $f_n$ denote the packed binary descriptor. Let $g_n$ denote the steered descriptor operator.

## oFAST: oriented FAST

:::definition[Intensity moment]
First- and zeroth-order image moments integrated over the circular patch of radius $r$ centred at the keypoint. Equation 1 of Rublee et al. 2011.

$$
m_{pq} = \sum_{x \in [-r,\, r]}\; \sum_{y \in [-r,\, r]} x^p\, y^q\, I(x, y).
$$
:::

:::definition[Intensity centroid]
The centre of mass of the patch intensity distribution, used to define a rotation-stable reference direction. Equation 2 of Rublee et al. 2011.

$$
C = \!\left(\frac{m_{10}}{m_{00}},\;\frac{m_{01}}{m_{00}}\right).
$$
:::

:::definition[Patch orientation]
The angle from the patch centre to the intensity centroid, quantised to the nearest of 30 bins of width $2\pi/30$ for the lookup table. Equation 3 of Rublee et al. 2011.

$$
\theta = \operatorname{atan2}(m_{01},\; m_{10}).
$$
:::

:::algorithm[oFAST keypoint detection]
::input[Greyscale image $I$; pyramid levels $L = 5$; scale factor $s = \sqrt{2}$; target count $N$; FAST-9 threshold $t$; patch radius $r = 15$.]
::output[Oriented keypoints $\{(x_k, y_k, \theta_k, \ell_k)\}$.]

1. Build a $5$-level image pyramid $\{I_\ell\}_{\ell=0}^{4}$ by downsampling $I$ at successive scale factor $\sqrt{2}$, using area-based interpolation.
2. At each level $\ell$, run the FAST-9 segment test with threshold $t$ set adaptively so that at least $N/L$ candidate keypoints are produced.
3. Compute the Harris cornerness response $R_H$ at each candidate; retain the top $N/L$ candidates per level ranked by $R_H$.
4. For each surviving keypoint, build the integral image of $I_\ell$ over the $[-r, r]$ window and accumulate $m_{00}$, $m_{10}$, $m_{01}$.
5. Compute $\theta = \operatorname{atan2}(m_{01}, m_{10})$ and quantise to the nearest bin of the $2\pi/30$ lookup table.
:::

## rBRIEF: rotated BRIEF

:::definition[Pixel-pair test]
A single bit that compares the mean intensities of two $5 \times 5$ sub-windows within the $31 \times 31$ patch, read from the integral image. Equation 4 of Rublee et al. 2011.

$$
\tau(p;\; x, y) = \begin{cases} 1 & \text{if } p(x) < p(y), \\ 0 & \text{otherwise.} \end{cases}
$$
:::

:::definition[Binary descriptor]
Packed concatenation of $n = 256$ pixel-pair tests on the offset table $\{(x_i, y_i)\}_{i=1}^{n}$. Equation 5 of Rublee et al. 2011.

$$
f_n(p) = \sum_{1 \le i \le n} 2^{i-1}\, \tau(p;\; x_i,\; y_i).
$$
:::

:::definition[Steered descriptor]
The descriptor evaluated with the test offsets rotated to the keypoint's orientation $\theta$, using the precomputed steered set $S_\theta = R_\theta S$. Equation 6 of Rublee et al. 2011.

$$
g_n(p,\, \theta) = f_n(p)\;\big|\;(x_i, y_i) \in S_\theta.
$$
:::

The candidate test pool is drawn from the $(w_p - w_t)^2 = 676$ possible non-overlapping $5 \times 5$ sub-window positions inside the $31 \times 31$ patch. Pairing two sub-windows and discarding pairs whose support overlaps yields $M = 205{,}590$ usable test pairs.

:::algorithm[rBRIEF descriptor extraction]
::input[Oriented keypoint $(x_k, y_k, \theta_k)$; integral image of $I_\ell$; precomputed steered table $\mathcal{T}$ indexed by 30 angle bins; $n = 256$.]
::output[256-bit descriptor $\mathbf{d}_k$ stored as $4 \times 64$-bit words.]

1. Quantise $\theta_k$ to the nearest of 30 bins: $b = \lfloor \theta_k / (2\pi/30) \rceil \bmod 30$.
2. Look up the steered offset pair list $S_{\theta_k} = \mathcal{T}[b]$, a precomputed $2 \times 256$ integer table.
3. For each test $i \in \{1, \ldots, 256\}$, read two $5 \times 5$ sub-window sums from the integral image at offsets $(x_i, y_i)$ centred on $(x_k, y_k)$; compute $\tau_i$ as a single integer comparison of the sub-window means.
4. Pack the 256 bits $\tau_i$ into 4 consecutive 64-bit words to obtain $\mathbf{d}_k$.
:::

## Greedy uncorrelated-test selection

This one-time offline step produces the steered table $\mathcal{T}$. It is run once on the PASCAL 2006 training set and the resulting table is compiled into the algorithm.

:::algorithm[Greedy decorrelated test selection]
::input[Training set of $\approx\!300{,}000$ keypoint patches from PASCAL 2006; candidate pool of $M = 205{,}590$ test pairs; target length $n = 256$.]
::output[Ordered list of 256 test pairs forming the rBRIEF offset table.]

1. For each of the $M$ candidate pairs, evaluate $\tau$ over all training patches; compute the mean $\bar\tau$ and sort pairs in ascending order of $|\bar\tau - 0.5|$ (pairs near 0.5 have maximum variance).
2. Initialise the selected set to the highest-variance pair.
3. For each subsequent candidate (in sorted order), compute the absolute pairwise correlation with every already-selected test; admit the candidate if its maximum absolute correlation with the current selection is below the adaptive threshold.
4. If fewer than 256 tests are admitted, raise the correlation threshold and restart from step 2.
5. The final 256-test ordered list defines $S$; the 30 steered versions $S_\theta = R_\theta S$ are precomputed for $\theta \in \{0,\, 2\pi/30,\, \ldots,\, 29 \cdot 2\pi/30\}$ and stored as integer tables in $\mathcal{T}$.
:::

![ORB runtime pipeline: greyscale image → 5-level √2 pyramid → FAST-9 segment test per level → Harris cornerness ranking → intensity-centroid orientation → rBRIEF 256-bit steered binary descriptor.](./images/orb/pipeline.svg)

# Implementation

The runtime descriptor packing in Rust, given a precomputed steered offset table indexed by angle bin:

```rust
const N: usize = 256;
const WORDS: usize = N / 64;
const BINS: usize = 30;

type Descriptor = [u64; WORDS];

struct SteerTable {
    offsets: [[(i32, i32); 2]; N],
}

fn box_sum(ii: &[u32], stride: usize, h: usize, cx: i32, cy: i32, r: i32) -> u32 {
    let x0 = (cx - r).max(0) as usize;
    let y0 = (cy - r).max(0) as usize;
    let x1 = (cx + r).min(stride as i32 - 1) as usize;
    let y1 = (cy + r).min(h as i32 - 1) as usize;
    ii[y1 * stride + x1]
        .wrapping_sub(ii[y0 * stride + x1])
        .wrapping_sub(ii[y1 * stride + x0])
        .wrapping_add(ii[y0 * stride + x0])
}

fn rbrief(
    ii: &[u32], stride: usize, h: usize,
    kx: i32, ky: i32, theta: f32,
    table: &[SteerTable; BINS],
) -> Descriptor {
    let step = 2.0 * std::f32::consts::PI / BINS as f32;
    let bin = ((theta / step).round() as isize).rem_euclid(BINS as isize) as usize;
    let st = &table[bin];
    let half_wt: i32 = 2;
    let mut d: Descriptor = [0u64; WORDS];
    for (i, pair) in st.offsets.iter().enumerate() {
        let s1 = box_sum(ii, stride, h, kx + pair[0].0, ky + pair[0].1, half_wt);
        let s2 = box_sum(ii, stride, h, kx + pair[1].0, ky + pair[1].1, half_wt);
        if s1 < s2 {
            d[i / 64] |= 1u64 << (i % 64);
        }
    }
    d
}

fn hamming(a: &Descriptor, b: &Descriptor) -> u32 {
    a.iter().zip(b.iter()).map(|(x, y)| (x ^ y).count_ones()).sum()
}
```

# Remarks

- Per-keypoint description costs $O(n)$ integer comparisons — one integral-image box-sum pair per test — plus $\lceil n / 64 \rceil$ word-level XOR + popcount for matching. Pyramid construction, FAST, and the Harris ranking dominate frame time over the descriptor packing itself.
- Scale is handled by a discrete 5-level $\sqrt{2}$ pyramid; a keypoint's scale is the pyramid level at which it survived non-maximum suppression, not a continuous sub-level interpolation. Rotation is handled by the intensity-centroid orientation, which is reliable only when $|C|$ is bounded away from zero.
- Naively rotating the BRIEF test set collapses descriptor variance: the eigenvalue spectrum after PCA on steered-but-unlearned BRIEF is far sharper than for unsteered BRIEF. The greedy decorrelated selection is what restores the variance — without the learned offset table, steering hurts more than it helps.
- ORB is in-plane rotation invariant only. The intensity-centroid orientation is a single scalar and cannot encode 3-D tilt independently; out-of-plane rotation degrades matching, and the binary descriptor provides no recovery mechanism.
- Common extensions include per-keypoint scale interpolation across pyramid levels, GPU and SIMD popcount acceleration, and learned descriptor stacks that replace the entire oFAST + rBRIEF pipeline with a jointly trained network.

# References

1. E. Rublee, V. Rabaud, K. Konolige, G. Bradski. *ORB: An efficient alternative to SIFT or SURF.* ICCV, 2011. [doi.org](https://doi.org/10.1109/ICCV.2011.6126544)
2. M. Calonder, V. Lepetit, C. Strecha, P. Fua. *BRIEF: Binary Robust Independent Elementary Features.* Lecture Notes in Computer Science, 2010. [link.springer.com](https://link.springer.com/content/pdf/10.1007/978-3-642-15561-1_56.pdf)
3. E. Rosten, T. Drummond. *Machine Learning for High-Speed Corner Detection.* European Conference on Computer Vision, 2006.
4. C. Harris, M. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988.
5. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 2004.
