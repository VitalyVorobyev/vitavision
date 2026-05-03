---
title: "ChESS Corners"
date: 2026-04-15
summary: "A chessboard-specific corner detector: scores each pixel by how well its local neighborhood matches an alternating bright-dark X-junction pattern, using 16 fixed integer offsets on a radius-5 ring."
tags: ["feature-detection", "calibration", "chessboard"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedPosts: ["01-chesscorners"]
relatedDemos: ["chess-response"]
prerequisites: [image-gradient]
failureModes: []
editorAlgorithmId: chess-corners
relations:
  - type: compared_with
    target: rochade
    confidence: high
  - type: compared_with
    target: pyramidal-blur-aware-xcorner
    confidence: high
  - type: compared_with
    target: puzzleboard
    confidence: high
  - type: feeds_into
    target: zhang-planar-calibration
    confidence: high
  - type: compared_with
    target: duda-radon-corners
    confidence: high
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
- Compared with Harris: see [When to choose Harris over ChESS](/atlas/harris-corner-detector#when-to-choose-harris-over-chess) on the Harris page, which hosts the comparison per the older-paper-hosts rule.

## When to choose ChESS over ROCHADE

[ROCHADE](/atlas/rochade) (Placht 2014) is a two-stage pipeline: extract the gradient-magnitude centreline graph, then locate corners as graph saddle points and refine each one with a cone-filtered bivariate quadratic fit. ChESS is a single-pass per-pixel detector with no graph stage and no fit.

| | ChESS | ROCHADE |
|---|---|---|
| Stages | one (per-pixel ring score) | two (centreline graph + saddle fit) |
| Per-pixel cost | 16 ring + 5 cross reads | gradient + thresholding + dilation + skeletonisation + window fit |
| Subpixel accuracy | not built in | high (cone-filtered quadratic, exact for piecewise-step) |
| Heavy-blur regime | degrades quickly | strong (centreline survives blur) |
| Extreme-pose regime | degrades | strong (Mesa 91 / 103 vs OpenCV 8 / 103, §IV of paper) |

Choose ChESS when latency matters more than precision: a single-pass ring detector at video rates is ~10× faster than the ROCHADE pipeline and good enough for moderately distorted, well-lit, in-focus chessboards. Choose ROCHADE when accuracy or robustness to extreme pose / blur is the gating requirement — the cone-quadratic refinement and the centreline graph give it a measurable edge on degraded inputs that ChESS cannot recover.

## When to choose ChESS over Pyramidal

[Pyramidal blur-aware X-corner](/atlas/pyramidal-blur-aware-xcorner) (Abeles 2021) computes a ChESS-style 16-sample template at **every** level of an image pyramid and selects per corner the level that maximises intensity-per-resolution. ChESS is single-scale.

Choose ChESS when the image is in focus and the corners' apparent size is comparable to the canonical ring radius (5 px) — the single-scale detector is ~$\log L$ times cheaper than running the same operator at $L$ pyramid levels. Choose Pyramidal when blur is heavy or when the same pipeline must work across a wide range of corner sizes (close-range vs long-range) without per-image scale tuning. Pyramidal also adds a blur-aware edge validation that ChESS lacks; on the standard ROCHADE benchmark it reaches F1 = 0.97 vs ChESS's ~0.84 on the most blurred subset (Table III of paper).

## When to choose ChESS over Duda-Radon

[Duda-Radon](/atlas/duda-radon-corners) (Duda 2018) computes a localised Radon transform along four discrete angles, approximated by 1-D box filters on rotated copies of the image. The response is the squared difference between the maximum and minimum directional line integrals.

| | ChESS | Duda-Radon |
|---|---|---|
| Operator | sum-of-differences over a 16-pixel ring | localised Radon transform along four angles |
| Sampling | thin ring at radius 5 | thick rays of half-width $m$ (typically 3–5 px) |
| Noise robustness | gradient-magnitude limited | strong (box-filter integration attenuates noise) |
| Subpixel accuracy | not built in (paired with Hessian saddle) | 0.0332 px indoor / 0.0459 px outdoor reported |
| Cost | 16 reads | two image rotations + four box filters |

Choose ChESS for low-latency single-pass detection — the per-pixel cost is much lower. Choose Duda-Radon when subpixel accuracy is the primary requirement and the input is moderately blurred ($\sigma_b > 2$) — the Radon ray's box-filter integration is more noise-tolerant than ChESS's ring difference, and the published accuracy numbers (0.03–0.05 px) outperform most chessboard detectors in the same regime.

## When to choose ChESS over PuzzleBoard

[PuzzleBoard](/atlas/puzzleboard) (Stelldinger 2024) detects saddle corners with a Hessian response, then **decodes** each corner's absolute integer position on a $501 \times 501$ pattern grid by cross-correlating against two embedded de-Bruijn binary maps. ChESS detects corners but assigns no absolute identity.

Choose ChESS when the calibration target is a standard chessboard with no encoded position — ChESS is the right tool for the classical Zhang-style calibration where corner-to-grid assignment is done downstream by a topology filter. Choose PuzzleBoard when the calibration scenario requires **partial-pattern** robustness with absolute position recovery: any local window of $\sim 5 \times 5$ corners on the PuzzleBoard pattern decodes to its absolute $(u, v) \in \{0, \dots, 500\}^2$ position, with majority-voting error correction tolerating up to 40% corrupted bits. The trade-off: PuzzleBoard requires a custom pattern (the standard checker squares are augmented with binary circles at edge midpoints), so the calibration target is not interchangeable with classical chessboards.

# References

1. S. Bennett, J. Lasenby. *ChESS — Quick and Robust Detection of Chess-board Features.* arXiv:1301.5491, 2013. [arxiv.org/abs/1301.5491](https://arxiv.org/abs/1301.5491)
2. E. Rosten, T. Drummond. *Machine Learning for High-Speed Corner Detection.* ECCV, 2006. — origin of the FAST-16 sampling pattern adopted for the ring.
