---
title: "BRIEF: Binary Robust Independent Elementary Features"
date: 2026-05-09
summary: "Encodes a Gaussian-smoothed image patch around a detected keypoint as a 128/256/512-bit binary string by running a fixed table of pairwise pixel-intensity tests; matched between images by Hamming distance via bitwise XOR + popcount."
tags: ["local-descriptors", "binary-descriptor", "matching", "feature-matching"]
domain: features
tasks: [local-feature-matching]
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [image-gradient]
failureModes: []
relations:
  - type: compared_with
    target: sift
    confidence: medium
    caution: "BRIEF is descriptor-only; SIFT/SURF bundle a detector."
  - type: compared_with
    target: surf
    confidence: medium
    caution: "BRIEF is descriptor-only; SIFT/SURF bundle a detector."
  - type: feeds_into
    target: gao-dual-homography-stitching
    confidence: medium
  - type: feeds_into
    target: lin-sva-stitching
    confidence: medium
  - type: feeds_into
    target: apap-image-stitching
    confidence: medium
sources:
  primary: calonder2010-brief
  references: [rosten2006-fast, bay2006-surf, lowe2004-sift]
  notes: |
    Method (§3, Calonder et al. 2010). Pixel-pair test (Eq. 1):
    τ(p; x, y) = 1 if p(x) < p(y) else 0, where p is the Gaussian-smoothed
    patch (σ = 2, 9×9 discrete kernel — §3.1). Descriptor packing (Eq. 2):
    f_{n_d}(p) = Σ_{1≤i≤n_d} 2^{i-1} τ(p; x_i, y_i) with n_d ∈ {128, 256, 512}
    bits → BRIEF-16, BRIEF-32, BRIEF-64 (trailing number is bytes).
    Patch size S = 48 px (paper convention; the txt cache asserts
    S × S without an explicit numerical value, so this is the standard
    interpretation).
    Five spatial sampling distributions for (x_i, y_i) evaluated in §3.2:
    G I uniform; G II i.i.d. Gaussian(0, S²/25) — best, used in all further
    experiments; G III two-step Gaussian with σ² = S²/100 on the second
    sample; G IV coarse polar grid; G V x_i = (0,0) with y_i scanning a
    polar grid (consistently worst). Matching: Hamming distance (XOR +
    popcount). Speed (§4 Table, 512 keypoints, 2.66 GHz x86-64): BRIEF-32
    description 8.87 ms vs SURF-64 335 ms (35–41×); BRIEF-32 matching 4.35
    ms vs 28.3 ms (4–13×). Storage 16/32/64 bytes vs 256 bytes for SURF-64.
    Rotation sensitivity (§4 Fig. 9-right): little degradation up to
    10–15°, precipitous drop beyond. Recognition rate matches or exceeds
    SURF/U-SURF on Wall, Fountain, Trees, Jpg, Light; underperforms on
    Graffiti (rotation + monochromatic regions).
---

# Goal

Encode a smoothed image patch around a previously detected keypoint as a $n_d$-bit binary string by running a fixed table of $n_d$ pairwise pixel-intensity tests, then match between images by Hamming distance via bitwise XOR and popcount. Input: a greyscale image $I: \Omega \to \mathbb{R}$ and a list of keypoint locations from any external detector. Output: a binary descriptor $\mathbf{f} \in \{0, 1\}^{n_d}$ per keypoint, with $n_d \in \{128, 256, 512\}$. The algorithm is specific to the use of binary tests on a fixed integer offset table — there is no learned codebook, no orientation assignment, no scale-space construction; description and matching are integer-only after the smoothing stage.

# Algorithm

Let $I: \Omega \to \mathbb{R}$ denote the greyscale image. Let $p: \mathcal{P} \to \mathbb{R}$ denote the Gaussian-smoothed patch on the keypoint-centred window $\mathcal{P}$ of size $S \times S$. Let $S$ denote the patch side length in pixels. Let $\sigma$ denote the standard deviation of the smoothing Gaussian and $w \times w$ the discrete kernel window. Let $n_d$ denote the descriptor bit length. Let $(x_i, y_i)$ denote the $i$-th integer pixel-pair offset within $\mathcal{P}$. Let $\tau$ denote a single pixel-pair test and $f_{n_d}$ the packed descriptor.

:::definition[Pixel-pair test]
Single-bit comparison between two pixels of the smoothed patch. Equation 1 in the paper.

$$
\tau(p;\, x, y) =
\begin{cases}
1 & \text{if } p(x) < p(y), \\
0 & \text{otherwise}.
\end{cases}
$$
:::

:::definition[Binary descriptor]
Packed concatenation of $n_d$ tests on a fixed offset table $\{(x_i, y_i)\}_{i=1}^{n_d}$. Equation 2 in the paper.

$$
f_{n_d}(p) = \sum_{1 \le i \le n_d} 2^{i-1}\, \tau(p;\, x_i, y_i).
$$
:::

:::definition[Hamming distance]
Bit-disagreement count between two descriptors, evaluated as a bitwise XOR followed by a population count.

$$
d_H(\mathbf{f}, \mathbf{g}) = \operatorname{popcount}(\mathbf{f} \oplus \mathbf{g}).
$$
:::

The smoothing parameters $\sigma = 2$ and $w = 9$ produce stable recognition rates across the tested datasets; values of $\sigma$ between 1 and 3 give similar results, while $\sigma \to 0$ degrades sharply because individual pixel comparisons are noise-sensitive. The patch size $S = 48$ pixels is the convention from the paper's experiments. The descriptor lengths are $n_d \in \{128, 256, 512\}$, named BRIEF-16, BRIEF-32, BRIEF-64 by storage in bytes.

## Sampling distributions

The offset table $\{(x_i, y_i)\}$ is drawn once before any descriptors are computed and reused thereafter. Five distributions are evaluated; G II dominates the others empirically and is the recommended default.

- **G I.** $(x_i, y_i) \sim \text{Uniform}(-S/2,\, S/2)^2$ i.i.d.
- **G II.** $(x_i, y_i) \sim \mathcal{N}\!\bigl(0,\, S^2/25\bigr)^2$ i.i.d., isotropic.
- **G III.** $x_i \sim \mathcal{N}(0,\, S^2/25)$, $y_i \sim \mathcal{N}(x_i,\, S^2/100)$ (two-stage; second sample concentrated near the first).
- **G IV.** $(x_i, y_i)$ drawn at random from a coarse polar grid.
- **G V.** $x_i = (0, 0)^\top$ for all $i$; $y_i$ scans every position of a coarse polar grid of $n_d$ points.

:::algorithm[BRIEF descriptor extraction]
::input[Greyscale image $I$; keypoint locations $\{\mathbf{k}_j\}$; fixed offset table $\{(x_i, y_i)\}_{i=1}^{n_d}$; smoothing $\sigma$, $w$.]
::output[Per-keypoint binary descriptors $\{\mathbf{f}_j\} \subset \{0, 1\}^{n_d}$.]

1. Smooth $I$ with a discrete Gaussian of width $w \times w$ and scale $\sigma$ (or replace by a box-filter approximation on an integral image).
2. For each keypoint $\mathbf{k}_j$, extract the $S \times S$ patch $p$ centred at $\mathbf{k}_j$ from the smoothed image.
3. For each $i \in \{1, \ldots, n_d\}$, compute $\tau_i = \tau(p;\, x_i, y_i)$ as a single integer pixel comparison.
4. Pack the $n_d$ bits into $\lceil n_d / 64 \rceil$ 64-bit words to obtain $\mathbf{f}_j$.
5. Match across images by computing $d_H(\mathbf{f}_a, \mathbf{f}_b)$ with bitwise XOR plus a popcount instruction; nearest-neighbour search with a left-right consistency check is recommended for outlier removal.
:::

![BRIEF descriptor extraction pipeline: greyscale input → Gaussian smoothing → S × S patch extraction at each keypoint → n_d pixel-pair binary tests → packing into 64-bit words → Hamming-distance matching via bitwise XOR + popcount.](./images/brief/pipeline.svg)

# Implementation

Per-keypoint test-and-pack in Rust on an already-smoothed greyscale image. The offset table is integer and shared across all calls; the descriptor is stored as 64-bit words so that matching reduces to word-wise XOR and `count_ones()`.

```rust
const ND: usize = 256;                  // BRIEF-32: 256 bits = 4 u64 words
const WORDS: usize = ND / 64;
type Descriptor = [u64; WORDS];

// Fixed offset table, generated once by sampling from G II
// (i.i.d. Gaussian centred at the patch origin with sigma^2 = S^2/25).
struct Pair { x: (i32, i32), y: (i32, i32) }
type OffsetTable = [Pair; ND];

fn intensity(img: &[u8], w: usize, h: usize, kx: i32, ky: i32, dx: i32, dy: i32) -> u8 {
    let x = (kx + dx).clamp(0, w as i32 - 1) as usize;
    let y = (ky + dy).clamp(0, h as i32 - 1) as usize;
    img[y * w + x]
}

fn brief(smoothed: &[u8], w: usize, h: usize, kx: i32, ky: i32, table: &OffsetTable) -> Descriptor {
    let mut f: Descriptor = [0; WORDS];
    for (i, pair) in table.iter().enumerate() {
        let pa = intensity(smoothed, w, h, kx, ky, pair.x.0, pair.x.1);
        let pb = intensity(smoothed, w, h, kx, ky, pair.y.0, pair.y.1);
        if pa < pb {
            f[i / 64] |= 1u64 << (i % 64);
        }
    }
    f
}

fn hamming(a: &Descriptor, b: &Descriptor) -> u32 {
    a.iter().zip(b.iter()).map(|(x, y)| (x ^ y).count_ones()).sum()
}
```

# Remarks

- Per-keypoint description is $O(n_d)$ integer pixel comparisons; matching is $O(n_d / 64)$ word-level XOR plus popcount. Smoothing dominates the total runtime — replacing the $9 \times 9$ Gaussian with a box-filter approximation on an integral image is the practical speedup path.
- Storage is 16, 32, or 64 bytes per descriptor for $n_d \in \{128, 256, 512\}$, against 256 bytes for a 64-D float SURF descriptor.
- The descriptor is rotation-sensitive: recognition rate is approximately constant up to $10$–$15^\circ$ in-plane rotation and drops steeply beyond, because no orientation normalisation is applied.
- Distribution G II (i.i.d. Gaussian, $\sigma^2 = S^2/25$) consistently outperforms the four alternatives across the paper's benchmark; the regular polar design G V is the worst.
- A constant offset table is required for any two descriptors to be comparable — resampling between query and database is a silent match failure.
- ORB extends BRIEF with a keypoint orientation estimate and a learned re-sampling of the offset table to recover rotation invariance.

# References

1. M. Calonder, V. Lepetit, C. Strecha, P. Fua. *BRIEF: Binary Robust Independent Elementary Features.* Lecture Notes in Computer Science, 2010. [link.springer.com](https://link.springer.com/content/pdf/10.1007/978-3-642-15561-1_56.pdf)
2. E. Rosten, T. Drummond. *Machine Learning for High-Speed Corner Detection.* European Conference on Computer Vision, 2006.
3. H. Bay, T. Tuytelaars, L. Van Gool. *SURF: Speeded Up Robust Features.* Lecture Notes in Computer Science, 2006.
4. D. G. Lowe. *Distinctive Image Features from Scale-Invariant Keypoints.* International Journal of Computer Vision, 2004.
