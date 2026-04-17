---
title: "ChESS Corners"
date: 2026-04-15
summary: "A chessboard-specific corner detector: scores each pixel by how well its local neighborhood matches an alternating bright-dark X-junction pattern, using 16 fixed integer offsets on a radius-5 ring."
tags: ["computer-vision", "feature-detection", "calibration", "chessboard"]
category: corner-detection
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedPosts: ["01-chesscorners"]
relatedAlgorithms: ["harris-corner-detector", "shi-tomasi-corner-detector", "fast-corner-detector"]
relatedDemos: ["chess-response"]
editorAlgorithmId: chess-corners
sources:
  primary: bennett2013-chess
  references: [rosten2006-fast]
  impl:
    repo: https://github.com/VitalyVorobyev/chess-rs
    commit: efc2204b4190182ec059a3f6115cdd6217d1f855
    files:
      - crates/chess-corners-core/src/ring.rs
      - crates/chess-corners-core/src/response.rs
  notes: |
    RING5 = FAST-16 sampling pattern scaled to r=5 (integer offsets only).
    Local mean = 5-pixel cross at the candidate. Neighbour mean = 16 ring samples.
    Equations (1)–(4) of Bennett & Lasenby 2013 define SR, DR, MR, R.
---

# Goal

Detect chessboard X-junctions in a grayscale image. Input: an image $I: \Omega \to \mathbb{R}$ on pixel domain $\Omega \subset \mathbb{Z}^2$. Output: a set of integer pixel locations $\{(x_i, y_i)\} \subset \Omega$ at which the local neighborhood matches an alternating bright-dark quadrant pattern. The detector is specific to X-junctions and rejects generic corners, straight edges, and narrow stripes.

# Algorithm

Sampling is done at fixed integer offsets — no interpolation. Around a candidate pixel $(x, y)$, 16 ring samples $I_0, \ldots, I_{15}$ are read at the offsets

$$
\begin{aligned}
\Delta = \big[\,&(0,-5),\,(2,-5),\,(3,-3),\,(5,-2),\,(5,0),\,(5,2),\,(3,3),\,(2,5), \\
&(0,5),\,(-2,5),\,(-3,3),\,(-5,2),\,(-5,0),\,(-5,-2),\,(-3,-3),\,(-2,-5)\,\big],
\end{aligned}
$$

arranged cyclically around the ring so that consecutive indices are adjacent on the ring and index $n+8$ is opposite $n$. The offsets are the FAST-16 pattern scaled to radius 5. The angular spacing alternates between 21.8° and 23.2°, close to the ideal 22.5°. Indices are taken modulo 16.

![RING5 pattern: 16 ring samples on a radius-5 circle over a 2×2 checker, with the 5-pixel cross highlighted at the centre.](./images/chess-corners/ring-pattern.svg)

Two local means anchor the response. The **local mean** $\mu_\ell$ averages the 5-pixel cross at the candidate:

$$
\mu_\ell = \tfrac{1}{5}\bigl(I(x, y) + I(x\!-\!1, y) + I(x\!+\!1, y) + I(x, y\!-\!1) + I(x, y\!+\!1)\bigr).
$$

The **neighbour mean** $\mu_n$ averages the 16 ring samples:

$$
\mu_n = \tfrac{1}{16} \sum_{k=0}^{15} I_k.
$$

Three per-pixel responses follow.

:::definition[Sum response (SR)]
Large when the ring shows the two-cycle alternation of a true X-junction.

$$
\mathrm{SR} = \sum_{n=0}^{3} \bigl|\,(I_n + I_{n+8}) - (I_{n+4} + I_{n+12})\,\bigr|.
$$
:::

:::definition[Diff response (DR)]
Large on straight edges, where opposite samples disagree.

$$
\mathrm{DR} = \sum_{n=0}^{7} |\,I_n - I_{n+8}\,|.
$$
:::

:::definition[Mean response (MR)]
Separates X-junctions from narrow stripes by comparing the two means.

$$
\mathrm{MR} = |\,\mu_n - \mu_\ell\,|.
$$
:::

:::definition[ChESS response (R)]
The detector score. The factor 16 zeros out the degenerate case where only $I_n$ and $I_{n+8}$ are bright — a narrow stripe — making $R \leq 0$ there.

$$
R = \mathrm{SR} - \mathrm{DR} - 16 \cdot \mathrm{MR}.
$$
:::

## Procedure

:::algorithm[ChESS corner detection]
::input[Grayscale image $I$ on domain $\Omega$; offset table $\Delta$; border margin $m = 5$.]
::output[Set of integer pixel locations $\{(x_i, y_i)\}$ marking detected X-junctions.]

1. For every pixel $(x, y) \in \Omega$ at distance $\geq m$ from the image border, compute $R(x, y)$ from the 16 ring samples and the 5-pixel cross.
2. **Positive threshold.** Discard pixels with $R(x, y) \leq 0$.
3. **Non-maximum suppression.** In a small neighborhood (typically $3 \times 3$ or $5 \times 5$), keep only local maxima of $R$.
4. **Response connectivity.** Discard isolated positive-response pixels; a true X-junction produces a connected cluster.
5. **Neighbourhood comparison.** Suppress maxima whose magnitude is small relative to nearby maxima, using an application-specific threshold.
:::

Subpixel localization, orientation recovery, and multiscale detection via a Gaussian pyramid are standard extensions, not part of the base detector.

# Implementation

The per-pixel response in Rust, given a row-major image:

```rust
const RING5: [(i32, i32); 16] = [
    (0, -5), (2, -5), (3, -3), (5, -2), (5, 0), (5, 2), (3, 3), (2, 5),
    (0, 5), (-2, 5), (-3, 3), (-5, 2), (-5, 0), (-5, -2), (-3, -3), (-2, -5),
];

fn chess_response(img: &[u8], w: usize, x: i32, y: i32) -> f32 {
    let mut s = [0i32; 16];
    for k in 0..16 {
        let (dx, dy) = RING5[k];
        s[k] = img[((y + dy) as usize) * w + (x + dx) as usize] as i32;
    }

    let mut sr = 0i32;
    for k in 0..4 {
        sr += ((s[k] + s[k + 8]) - (s[k + 4] + s[k + 12])).abs();
    }
    let mut dr = 0i32;
    for k in 0..8 {
        dr += (s[k] - s[k + 8]).abs();
    }

    let mu_n = s.iter().sum::<i32>() as f32 / 16.0;
    let c = |dx: i32, dy: i32| img[((y + dy) as usize) * w + (x + dx) as usize] as f32;
    let mu_l = (c(0, 0) + c(-1, 0) + c(1, 0) + c(0, -1) + c(0, 1)) / 5.0;

    (sr - dr) as f32 - 16.0 * (mu_n - mu_l).abs()
}
```

The 16 ring accesses and 5 cross accesses are fixed offsets, so the hot loop compiles to straight-line integer code with no branches and no interpolation. The full response map is computed by running `chess_response` over every pixel at distance $\geq 5$ from the border; on wide images the outer loop vectorizes cleanly over rows.

# Remarks

- Complexity: $O(|\Omega|)$ per scale — 16 ring reads, 5 cross reads, and a fixed number of integer additions per pixel. No trigonometry, no interpolation.
- Selective for chessboard-like X-junctions; not a general-purpose corner detector.
- Ring radius is fixed to 5 pixels in the canonical design. For heavy blur or low-resolution targets, the paper also defines a radius-10 ring with the same angular pattern.
- Orientation is ambiguous from ring samples alone — the response is symmetric under rotation by $90^\circ$. Orientation is recovered post-detection by maximizing the signed measure $M_n = (I_n + I_{n+8}) - (I_{n+4} + I_{n+12})$ over the eight discrete directions.

# References

1. S. Bennett, J. Lasenby. *ChESS — Quick and Robust Detection of Chess-board Features.* arXiv:1301.5491, 2013. [arxiv.org/abs/1301.5491](https://arxiv.org/abs/1301.5491)
2. E. Rosten, T. Drummond. *Machine Learning for High-Speed Corner Detection.* ECCV, 2006. — origin of the FAST-16 sampling pattern adopted for the ring.
