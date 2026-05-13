---
title: "Viola–Jones Object Detector"
date: 2026-05-12
summary: "Real-time frontal-face detection by sliding a fixed 24×24 sub-window across a grayscale image at multiple scales, scoring each position with an AdaBoost-selected ensemble of integral-image rectangle features arranged in a 38-stage attentional cascade that rejects most background regions after evaluating ~10 features per sub-window."
tags: ["object-detection", "face-detection", "boosting", "adaboost", "integral-image", "haar-features", "cascade-classifier"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: []
failureModes: []
sources:
  primary: viola2001-detector
  notes: |
    Three orthogonal contributions: (1) integral image $ii(x,y) = \sum_{x' \le x, y' \le y} i(x',y')$ allowing any axis-aligned rectangular sum in four array reads (Section 2.1, Eq. 1–2); (2) AdaBoost weak classifier $h_j(x) = [\![ p_j f_j(x) < p_j \theta_j ]\!]$ over ~180,000 rectangle features on a 24×24 sub-window (Section 3, Table 1); (3) attentional cascade with per-stage detection rate $d_i$ and false-positive rate $f_i$ giving $D = \prod_i d_i$ and $F = \prod_i f_i$ (Section 4). Final cascade: 38 layers, 6,061 features, layer 1–5 sizes 1, 10, 25, 25, 50. Average ~10 feature evaluations per sub-window. Frame rate 15 fps on 700 MHz Pentium III, 384×288 images. Trained on 4,916 hand-labelled faces; non-face training via bootstrapping on 9,544 images (~350 million sub-windows). Sub-windows variance-normalised by $\sigma = \sqrt{\mu_2 - \mu^2}$ computed from two integral images (one over pixels, one over squared pixels).
---

# Goal

Detect all instances of a trained single object class — demonstrated on frontal, roughly upright human faces — in a grayscale image of arbitrary resolution. Input: a grayscale image $I$. Output: a set of axis-aligned bounding rectangles localising each detected instance, computed by sliding a $24 \times 24$ pixel sub-window across the image at multiple scales. The method distinguishes itself from prior sliding-window detectors by coupling three mechanisms — an $O(1)$ rectangular-sum primitive, a boosting-based feature-selection step that selects a small discriminative subset from over 180,000 candidate features, and a multi-stage rejection cascade — so that the vast majority of sub-windows are discarded after examining fewer than ten features.

# Algorithm

Let $I : \Omega \to [0, 255]$ denote the grayscale input image on pixel domain $\Omega$.
Let $i(x, y)$ denote the pixel value at column $x$, row $y$.
Let $ii(x, y)$ denote the integral image at $(x, y)$.
Let $s(x, y)$ denote the column prefix sum at $(x, y)$.
Let $f_j$ denote the $j$-th rectangle feature evaluated on a sub-window.
Let $h_j$ denote the $j$-th AdaBoost weak classifier.
Let $H$ denote the strong classifier formed by a weighted combination of weak classifiers.
Let $T$ denote the number of boosting rounds (weak classifiers selected) for a given stage.
Let $\alpha_t$ denote the log-odds weight assigned to weak classifier $h_t$.
Let $\epsilon_t$ denote the weighted training error of $h_t$.
Let $d_i$ and $f_i$ denote the per-stage detection rate and false-positive rate at cascade stage $i$.
Let $D$ and $F$ denote the overall cascade detection rate and false-positive rate.

## Integral image

:::definition[Integral image $ii$]
The integral image $ii$ is a two-dimensional prefix sum of $I$:

$$
ii(x, y) = \sum_{x' \le x,\; y' \le y} i(x', y').
$$

It is computed in a single pass over $I$ using the recurrences

$$
\begin{aligned}
s(x, y) &= s(x, y-1) + i(x, y), \\
ii(x, y) &= ii(x-1, y) + s(x, y),
\end{aligned}
$$

with boundary conditions $s(x, -1) = 0$ and $ii(-1, y) = 0$. The sum of pixel values within any axis-aligned rectangle is recovered in exactly four array reads: for a rectangle with corners $(x_1, y_1)$ and $(x_2, y_2)$,

$$
\begin{aligned}
\sum_{\substack{x_1 \le x' \le x_2 \\ y_1 \le y' \le y_2}} i(x', y') = \;& ii(x_2, y_2) - ii(x_1 - 1, y_2) \\
& - ii(x_2, y_1 - 1) + ii(x_1 - 1, y_1 - 1).
\end{aligned}
$$
:::

Variance normalisation requires a second integral image $ii^2$ computed identically over $i(x, y)^2$. The sub-window standard deviation is

$$
\sigma = \sqrt{\mu_2 - \mu^2},
$$

where $\mu$ is the sub-window mean and $\mu_2$ is the mean of squared pixel values, both obtained from $ii$ and $ii^2$ in $O(1)$.

## Rectangle features

:::definition[Rectangle features]
Three families of rectangle feature are defined over the $24 \times 24$ sub-window:

- **Two-rectangle:** difference of pixel sums in two horizontally or vertically adjacent same-size rectangles.
- **Three-rectangle:** sum of the two outer rectangles minus the centre rectangle, arranged horizontally or vertically.
- **Four-rectangle:** difference of pixel sums in two diagonal rectangle pairs.

The exhaustive set of all valid placements and sizes of these three families over a $24 \times 24$ sub-window exceeds 180,000 features.
:::

Each feature value $f_j$ is computed from $ii$ in $O(1)$ using the four-read rectangular-sum formula.

## AdaBoost feature selection

AdaBoost iterates over $T$ rounds. At each round $t$, all candidate features are evaluated on the training set; the feature with minimum weighted classification error is selected.

:::definition[AdaBoost weak classifier $h_j$]
Given feature $f_j$, threshold $\theta_j$, and polarity $p_j \in \{-1, +1\}$,

$$
h_j(x) = \begin{cases} 1 & \text{if } p_j f_j(x) < p_j \theta_j, \\ 0 & \text{otherwise.} \end{cases}
$$
:::

After selecting $h_t$ with weighted error $\epsilon_t$, its coefficient is set to

$$
\alpha_t = \log\!\frac{1}{\beta_t}, \qquad \beta_t = \frac{\epsilon_t}{1 - \epsilon_t}.
$$

Sample weights are updated to down-weight correctly classified examples by a factor $\beta_t$ and renormalised.

:::definition[AdaBoost strong classifier $H$]
The strong classifier combines $T$ weak classifiers by a weighted sign threshold:

$$
H(x) = \operatorname{sign}\!\left(\sum_{t=1}^{T} \alpha_t\, h_t(x) - \frac{1}{2}\sum_{t=1}^{T} \alpha_t\right).
$$

A sub-window is classified as a positive instance when $H(x) = +1$.
:::

## Attentional cascade

:::definition[Cascade detection rate $D$ and false-positive rate $F$]
The cascade is a sequence of $K$ strong classifiers, each trained to meet a per-stage minimum detection rate $d_i$ and maximum false-positive rate $f_i$. A sub-window advances to stage $i+1$ only if stage $i$ accepts it. The overall rates satisfy

$$
D = \prod_{i=1}^{K} d_i, \qquad F = \prod_{i=1}^{K} f_i.
$$
:::

Stages are constructed greedily: additional weak classifiers are added to stage $i$ until $d_i$ and $f_i$ targets are met. False positives from each partial cascade pass over 9,544 non-face images (approximately 350 million sub-windows) are collected as hard negatives for subsequent stages. The trained cascade has $K = 38$ stages and 6,061 features in total; the first five stages contain 1, 10, 25, 25, and 50 features respectively. The first stage (a single two-feature strong classifier) achieves approximately 100% detection rate at approximately 40% false-positive rate.

## Procedure

:::algorithm[Viola–Jones sliding-window detection]
::input[Grayscale image $I$; trained cascade of $K = 38$ strong classifiers $\{H_1, \ldots, H_K\}$; scale factor $r = 1.25$; location step parameter $p = 1.0$]
::output[Set of bounding rectangles $\mathcal{B}$ for all accepted sub-windows, merged across overlapping detections]

1. Compute the integral image $ii$ from $I$ using the two-pass recurrence over $s$ and $ii$.
2. Compute the squared integral image $ii^2$ from $i(x,y)^2$ by the same recurrence.
3. For each scale $s$ in the sequence $\{1, r, r^2, \ldots\}$ until the scaled sub-window exceeds the image dimensions:
   1. For each sub-window position $(x, y)$ with stride $\lfloor s \cdot p \rfloor$:
      1. Compute $\sigma$ from $ii$ and $ii^2$; skip the sub-window if $\sigma \approx 0$.
      2. Evaluate $H_1$ on the normalised sub-window; reject and advance to the next position if $H_1(x) = -1$.
      3. Evaluate $H_2, H_3, \ldots$ in sequence; reject on the first negative response.
      4. If all $K$ stages accept, add the scaled bounding rectangle to a candidate set.
4. Partition overlapping candidates into groups; replace each group with the mean of its bounding-box corners.
5. Return the merged set $\mathcal{B}$.
:::

# Implementation

The two-pass integral-image build and the four-read rectangular-sum query in Rust:

```rust
fn build_integral_image(pixels: &[u32], width: usize, height: usize) -> Vec<u64> {
    let mut ii = vec![0u64; width * height];
    for x in 0..width {
        let col_sum = pixels[x] as u64;
        ii[x] = if x == 0 { col_sum } else { ii[x - 1] + col_sum };
    }
    for y in 1..height {
        let mut col_sum = 0u64;
        for x in 0..width {
            col_sum += pixels[y * width + x] as u64;
            ii[y * width + x] = ii[(y - 1) * width + x] + col_sum;
        }
    }
    ii
}

fn rect_sum(ii: &[u64], width: usize, x1: usize, y1: usize, x2: usize, y2: usize) -> u64 {
    let a = ii[y2 * width + x2];
    let b = if x1 == 0 { 0 } else { ii[y2 * width + (x1 - 1)] };
    let c = if y1 == 0 { 0 } else { ii[(y1 - 1) * width + x2] };
    let d = if x1 == 0 || y1 == 0 { 0 } else { ii[(y1 - 1) * width + (x1 - 1)] };
    a - b - c + d
}
```

The weak-classifier evaluation in Python, operating directly on a pre-built integral image:

```python
import numpy as np

def eval_weak_classifier(ii, x_off, y_off, feature, alpha):
    def rsum(r):
        x1, y1, rw, rh = r
        x1 += x_off; y1 += y_off
        x2, y2 = x1 + rw - 1, y1 + rh - 1
        s = ii[y2, x2]
        s -= ii[y1 - 1, x2] if y1 > 0 else 0
        s -= ii[y2, x1 - 1] if x1 > 0 else 0
        s += ii[y1 - 1, x1 - 1] if (y1 > 0 and x1 > 0) else 0
        return s

    f_val = rsum(feature["rect_A"]) - rsum(feature["rect_B"])
    h = 1 if feature["p"] * f_val < feature["p"] * feature["theta"] else 0
    return alpha * h
```

# Remarks

- The integral image is built in a single pass; each entry requires two additions. Rectangular-sum queries cost exactly four array reads regardless of rectangle dimensions.
- The cascade amortises evaluation cost over the asymmetry between positives and negatives: on the MIT+CMU test set (507 labelled faces, 75,081,800 sub-windows), an average of 10 features out of 6,061 are evaluated per sub-window.
- Sub-windows are normalised by their standard deviation $\sigma = \sqrt{\mu_2 - \mu^2}$ before feature evaluation; this requires a second integral image over squared pixel values. Sub-windows with $\sigma \approx 0$ (near-uniform regions) are safe to reject without evaluation.
- The method is single-class and pose-restricted: the classifier is trained on frontal, roughly upright instances of one target class. Profile or strongly rotated instances are not detected.
- Training requires hard-negative bootstrapping: false positives produced by each partial cascade pass over the non-face set are collected as training negatives for subsequent stages. The training set consists of 4,916 labelled positive examples; the non-face set spans approximately 350 million sub-windows across 9,544 images.
- Overlapping detections across scale and position are merged by partitioning into groups of mutually overlapping rectangles and replacing each group with the mean of its members' bounding-box corners.
- For full-body pedestrian detection the peer classical sliding-window detector is HOG + linear SVM (Dalal & Triggs, CVPR 2005), which outperforms Haar-wavelet-based detectors — including an extended version of this feature set — by more than an order of magnitude in false-positives-per-window on INRIA. See [`hog-descriptor`](/algorithms/hog-descriptor).
- The deep-learning paradigm-level replacement is [Faster R-CNN](../models/faster-rcnn): a learned Region Proposal Network sharing conv features with a Fast R-CNN head detects 20–80 general categories at 5–17 fps on GPU. Note the change of regime — Viola-Jones is single-class real-time CPU detection on grayscale images; Faster R-CNN is multi-class GPU detection on RGB, so the replacement is paradigm-level, not drop-in.

# References

1. P. Viola, M. Jones. *Rapid Object Detection using a Boosted Cascade of Simple Features.* CVPR, 2001. [PDF](https://www.cs.cmu.edu/~efros/courses/LBMV07/Papers/viola-cvpr-01.pdf)
