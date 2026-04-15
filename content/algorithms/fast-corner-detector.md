---
title: "FAST Corner Detector"
date: 2026-04-15
summary: "Segment-test corner detector on a 16-pixel Bresenham ring of radius 3 around each candidate; classifies a point as a corner when N contiguous ring pixels are all brighter (or all darker) than the centre by a margin t."
tags: ["computer-vision", "feature-detection", "corner"]
category: corner-detection
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedAlgorithms: ["harris-corner-detector", "shi-tomasi-corner-detector", "chess-corners"]
sources:
  primary: rosten2006-fast
  notes: |
    16-pixel Bresenham ring at radius 3. Segment-test parameter N
    typically 9 or 12. The high-speed early-rejection test on the four
    cardinal points (indices 1, 5, 9, 13) is what makes the detector
    fast in practice; the full segment test runs only on candidates
    that pass it. The decision-tree variant trained via ID3 on labeled
    corners is described in §3 of the paper but is out of scope here
    (the page covers the segment test as the primitive).
---

# Goal

Detect corners in a grayscale image $I: \Omega \to \mathbb{R}$ on pixel domain $\Omega \subset \mathbb{Z}^2$. Output: a set of integer pixel locations $\{(x_i, y_i)\} \subset \Omega$. Instead of computing a continuous response from gradients, FAST applies a binary segment test on a 16-pixel Bresenham ring of radius 3: an arc of $N$ contiguous ring pixels must all be brighter than $I(p) + t$ or all darker than $I(p) - t$. The test requires only integer comparisons; the high-speed cardinal-point early rejection reads only four ring pixels to discard the majority of candidates before the full ring is examined.

# Algorithm

Symbols: $I(p)$ — centre pixel intensity at candidate $p$; ring samples $I_1, \ldots, I_{16}$ at the 16 offsets of the Bresenham circle of radius 3; $t$ — integer intensity threshold; $N$ — required arc length (segment-test parameter).

The 16 ring offsets, indexed clockwise from the top (one-based, matching Figure 1 of the paper):

$$
\begin{aligned}
\Delta = \big[\,&(0,-3),\,(1,-3),\,(2,-2),\,(3,-1),\,(3,0),\,(3,1),\,(2,2),\,(1,3), \\
&(0,3),\,(-1,3),\,(-2,2),\,(-3,1),\,(-3,0),\,(-3,-1),\,(-2,-2),\,(-1,-3)\,\big].
\end{aligned}
$$

Each ring sample is $I_n = I(p + \Delta_n)$, with indices taken cyclically modulo 16.

:::definition[Ternary ring classification ($S_n$)]
For each ring sample $I_n$ relative to centre $I(p)$ with threshold $t$:

$$
S_n = \begin{cases}
+1 & \text{if } I_n > I(p) + t \quad (\text{brighter}) \\
-1 & \text{if } I_n < I(p) - t \quad (\text{darker}) \\
0  & \text{otherwise} \quad (\text{similar})
\end{cases}
$$
:::

:::definition[Segment-test corner criterion]
$p$ is a corner if there exists a contiguous arc of length $N$ on the cyclic ring where every $S_n$ has the same non-zero sign: $N$ consecutive ring pixels are all brighter than $I(p) + t$, or $N$ consecutive ring pixels are all darker than $I(p) - t$. Common values are $N = 9$ (FAST-9) and $N = 12$ (FAST-12). FAST-9 has higher repeatability under noise; FAST-12 admits a more aggressive cardinal-point early rejection.
:::

:::definition[Cardinal-point high-speed test]
The four ring pixels at one-based indices 1, 5, 9, 13 (top, right, bottom, left) are read first. The minimum number of cardinals contained in any $N$-arc on the 16-cycle is

$$
M_N = \min_{s \in [0, 16)} \bigl|\,\{0, 4, 8, 12\} \cap \{s, s\!+\!1, \ldots, s\!+\!N\!-\!1\}\,\bigr|,
$$

which evaluates to $M_{12} = 3$ and $M_{9} = 2$. For a candidate to satisfy the segment-test criterion, at least $M_N$ of the four cardinals must be all-brighter-by-$t$ or all-darker-by-$t$. If fewer qualify, $p$ is rejected without reading the remaining 12 ring pixels. Using the wrong $M_N$ (for example, requiring $M_N = 3$ on FAST-9) causes false rejections.
:::

:::definition[Corner score ($V$)]
The maximum threshold $t$ for which $p$ still passes the segment test, used for non-maximum suppression. Computed in closed form as:

$$
V = \max\!\left(\sum_{x \in S_{\mathrm{bright}}} \lvert I_x - I(p) \rvert - t,\quad \sum_{x \in S_{\mathrm{dark}}} \lvert I(p) - I_x \rvert - t\right),
$$

where $S_{\mathrm{bright}} = \{x \mid I_x \geq I(p) + t\}$ and $S_{\mathrm{dark}} = \{x \mid I_x \leq I(p) - t\}$.
:::

## Procedure

:::algorithm[FAST corner detection]
::input[Grayscale image $I$ on domain $\Omega$; ring offset table $\Delta$; threshold $t$; segment length $N$.]
::output[Set of integer pixel locations $\{(x_i, y_i)\}$ marking detected corners.]

1. For each pixel $p \in \Omega$ at distance $\geq 3$ from the image border:
2. Apply the cardinal-point test on one-based indices 1, 5, 9, 13 (zero-based: 0, 4, 8, 12). If fewer than $M_N$ of these four are all-brighter-by-$t$ or all-darker-by-$t$, reject $p$ ($M_{12} = 3$, $M_9 = 2$).
3. Read all 16 ring samples and compute $S_1, \ldots, S_{16}$.
4. Test for $N$ contiguous same-sign non-zero values on the cyclic ring. If found, mark $p$ as a corner candidate.
5. Compute the corner score $V$ for each candidate via binary search on $t$ or the closed-form sum in equation (8) of the paper.
6. Apply non-maximum suppression on $V$ over a $3 \times 3$ neighbourhood; retain only local maxima.
:::

# Implementation

The per-pixel segment test in Rust:

```rust
const RING16: [(i32, i32); 16] = [
    (0, -3), (1, -3), (2, -2), (3, -1), (3, 0), (3, 1), (2, 2), (1, 3),
    (0, 3), (-1, 3), (-2, 2), (-3, 1), (-3, 0), (-3, -1), (-2, -2), (-1, -3),
];

fn is_fast_corner(img: &[u8], w: usize, x: i32, y: i32, t: i32, n: usize) -> bool {
    let centre = img[(y as usize) * w + x as usize] as i32;
    // Min cardinals in any N-arc on the 16-cycle: 3 for N>=12, 2 for N>=9, 1 otherwise.
    let card_min = if n >= 12 { 3 } else if n >= 9 { 2 } else { 1 };
    let mut bright_card = 0;
    let mut dark_card = 0;
    for &k in &[0usize, 4, 8, 12] {
        let (dx, dy) = RING16[k];
        let v = img[((y + dy) as usize) * w + (x + dx) as usize] as i32;
        if v > centre + t { bright_card += 1; }
        else if v < centre - t { dark_card += 1; }
    }
    if bright_card < card_min && dark_card < card_min { return false; }

    // Full segment test on the cyclic ring.
    let mut s = [0i8; 16];
    for k in 0..16 {
        let (dx, dy) = RING16[k];
        let v = img[((y + dy) as usize) * w + (x + dx) as usize] as i32;
        s[k] = if v > centre + t { 1 } else if v < centre - t { -1 } else { 0 };
    }
    let mut run = 0usize;
    let mut sign = 0i8;
    for k in 0..16 + n - 1 {
        let v = s[k % 16];
        if v != 0 && v == sign { run += 1; if run >= n { return true; } }
        else { sign = v; run = if v != 0 { 1 } else { 0 }; }
    }
    false
}
```

The cardinal-point check uses zero-based indices 0, 4, 8, 12 (one-based 1, 5, 9, 13 in the paper). The threshold `card_min` is the minimum number of cardinals contained in any $N$-arc on the 16-cycle; using a larger value would falsely reject corners. The cyclic wrap is handled by iterating up to `16 + n - 1` and indexing modulo 16, which correctly detects arcs straddling the index-15 / index-0 boundary.

# Remarks

- Complexity: $O(|\Omega|)$ per scale. The per-pixel cost is dominated by the cardinal-point test for non-corners (4 reads and 8 comparisons) and the full segment test for candidates (16 reads). The inner loop vectorizes over rows.
- Choice of $N$: FAST-9 has the highest repeatability of the FAST family (Figure 6A of the paper). FAST-12 is faster per pixel because the cardinal-point test rejects more aggressively, but produces fewer detections under noise.
- Threshold $t$: a fixed integer offset in pixel intensity units. The detector's recall–precision tradeoff is controlled directly by $t$; no implicit sensitivity parameter exists.
- Limitation: the segment-test criterion produces no continuous gradient response. Non-maximum suppression relies on the score $V$ from equation (8), which adds a constant per-corner cost.
- Limitation: not rotation-invariant in the strict sense — the discrete ring breaks rotation symmetry. The detector also responds to one-pixel-wide lines at certain angles where the quantised circle misses the line.
- The 16-pixel ring offset table $\Delta$ is reused by the ChESS corner detector at a scaled radius of 5 pixels (see related algorithms).

# References

1. E. Rosten, T. Drummond. *Machine Learning for High-Speed Corner Detection.* ECCV, 2006. URL: [edwardrosten.com/work/rosten_2006_machine.pdf](https://www.edwardrosten.com/work/rosten_2006_machine.pdf)
