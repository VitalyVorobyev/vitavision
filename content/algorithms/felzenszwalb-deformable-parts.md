---
title: "Deformable Part Models"
date: 2026-05-12
summary: "Detect a target object class in arbitrary images by scoring every position and scale in a HOG feature pyramid with a mixture of star-structured part-based templates — a coarse root filter and $n=6$ finer-resolution part filters with quadratic deformation costs — trained as a latent SVM with hard-negative mining."
tags: ["classical", "local-descriptors", "region-based", "dense-prediction"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: advanced
prerequisites: [image-gradient]
failureModes: []
relations:
  - type: compared_with
    target: viola-jones-detector
    confidence: medium
    caution: "Different operational regimes — VJ is real-time cascade for rigid faces; DPM is offline part-based for general deformable objects."
sources:
  primary: felzenszwalb2010-detection
  references: [dalal2005-hog, viola2001-detector]
  notes: |
    Star model $(F_0, P_1, \ldots, P_n, b)$ with $n = 6$ parts at twice the spatial resolution of the root ($l_i = l_0 - \lambda$ in a HOG feature pyramid with $\lambda = 10$ levels per octave at test time, $\lambda = 5$ at training time). Score (Eq. 2): $\operatorname{score}(z) = \sum_{i=0}^{n} F_i' \cdot \phi(H, p_i) - \sum_{i=1}^{n} d_i \cdot \phi_d(dx_i, dy_i) + b$, with deformation feature $\phi_d(dx, dy) = (dx, dy, dx^2, dy^2)$ (Eq. 4) and displacement $(dx_i, dy_i) = (x_i, y_i) - (2(x_0, y_0) + v_i)$ (Eq. 3). Inference via distance transforms (Eq. 8): $D_{i,l}(x,y) = \max_{dx,dy}[R_{i,l}(x+dx,y+dy) - d_i \cdot \phi_d(dx,dy)]$, total cost $O(nk)$ once filter responses are computed. Mixture of $m = 2$ components per category for PASCAL. Latent SVM (Eq. 14): $L_D(\beta) = \tfrac{1}{2}\|\beta\|^2 + C\sum_i \max(0, 1 - y_i f_\beta(x_i))$ with $f_\beta(x) = \max_{z \in Z(x)} \beta \cdot \Phi(x, z)$ (Eq. 13); semi-convex (convex for $y_i = -1$). Training: coordinate descent (relabel positives → SGD on $\beta$) plus hard-negative mining (Theorem 1). HOG feature parameters: cell size $k = 8$, truncation $\alpha = 0.2$, $p = 9$ contrast-insensitive orientations; analytic 31-dimensional projection (9 contrast-insensitive + 18 contrast-sensitive + 4 energy channels) replacing the 36-dimensional HOG vector (Section 6.2). Part initialisation $d_i = (0, 0, 0.1, 0.1)$ with quadratic floor $\geq 0.01$. PASCAL VOC IoU threshold $0.5$; bounding-box prediction by least-squares regression on a $2n+3$-dimensional configuration vector (Section 7.1). Runtime ~2 s/image on an 8-core desktop.
---

# Goal

Detect and localise instances of a target object category in a still image by scoring every position and scale with a mixture of multiscale deformable part models. Input: an RGB or greyscale image; axis-aligned bounding-box annotations for training only. Output: a ranked list of axis-aligned bounding boxes. Each model is a star-structured configuration of one coarse root filter covering the full object at HOG pyramid level $l_0$ and $n$ finer part filters at twice the spatial resolution ($\lambda$ levels deeper), scored jointly by filter responses minus a quadratic deformation penalty; the best configuration at each root location is recovered by dynamic programming over pre-computed distance-transform arrays. A mixture of $m$ components handles intraclass variation in viewpoint and aspect ratio; all parameters — filter weights, deformation costs, and bias — are trained end-to-end with latent SVM and hard-negative mining from bounding-box supervision alone.

# Algorithm

Let $H$ denote the HOG feature pyramid built from the input image.
Let $\phi(H, p) \in \mathbb{R}^d$ denote the HOG sub-window feature vector at position $p$ in the pyramid ($d = 31$ in the final system).
Let $F_0$ denote the root filter covering the full object at pyramid level $l_0$.
Let $F_i$, $i = 1, \ldots, n$, denote part filters placed at pyramid level $l_i = l_0 - \lambda$.
Let $v_i$ denote the anchor position of part $i$ relative to root position $p_0$.
Let $d_i \in \mathbb{R}^4$ denote the learned deformation-cost coefficient vector for part $i$.
Let $b$ denote the model bias scalar.
Let $z = (p_0, p_1, \ldots, p_n)$ denote a complete object hypothesis (root position plus $n$ part positions).
Let $(dx_i, dy_i) = (x_i, y_i) - (2(x_0, y_0) + v_i)$ denote the displacement of part $i$ from its anchor (Eq. 3).
Let $R_{i,l}(x,y) = F_i' \cdot \phi(H_l, (x,y))$ denote the filter response map of part filter $i$ at pyramid level $l$.
Let $\beta$ denote the concatenated model parameter vector (all filter weights, deformation costs, and bias).

## Feature pyramid

:::definition[HOG feature map]
Each level of the pyramid provides a $d$-dimensional feature map with cell size $k = 8$ px and truncation $\alpha = 0.2$. The final feature vector is 31-dimensional: 9 contrast-insensitive orientation channels + 18 contrast-sensitive orientation channels + 4 normalisation-energy channels.
:::

The pyramid is sampled at $\lambda$ levels per octave ($\lambda = 5$ during training, $\lambda = 10$ at test time). Parts are placed $\lambda$ levels below the root level, giving twice the spatial resolution.

## Hypothesis score

:::definition[Deformation feature vector $\phi_d$]
The displacement $(dx, dy)$ of a part from its anchor is encoded as a four-dimensional quadratic feature:

$$
\phi_d(dx, dy) = (dx,\; dy,\; dx^2,\; dy^2). \tag{Eq. 4}
$$
:::

:::definition[Hypothesis score]
The score of a complete hypothesis $z = (p_0, \ldots, p_n)$ is:

$$
\operatorname{score}(p_0, \ldots, p_n) = \sum_{i=0}^{n} F_i' \cdot \phi(H, p_i) - \sum_{i=1}^{n} d_i \cdot \phi_d(dx_i, dy_i) + b. \tag{Eq. 2}
$$

The first sum is the data term (root and part filter responses); the second sum penalises each part's quadratic displacement from its anchor.
:::

## Efficient inference via distance transform

For each part $i$ and pyramid level $l$, the best-scoring placement over all displacements from a given root location is captured by the generalised distance transform:

:::definition[Part distance-transform array $D_{i,l}$]
$$
D_{i,l}(x, y) = \max_{dx,\, dy}\bigl[R_{i,l}(x+dx,\; y+dy) - d_i \cdot \phi_d(dx, dy)\bigr]. \tag{Eq. 8}
$$

$D_{i,l}(x,y)$ gives the maximum score achievable by part $i$ when the root is placed at the corresponding pyramid location, taking the best possible displacement.
:::

The root score aggregation adds all part distance-transform values evaluated at the expected anchor positions (Eq. 9). Because $d_i \cdot \phi_d$ is a separable quadratic, the maximisation in Eq. 8 is computed in $O(|R_{i,l}|)$ time by a 1-D pass in $x$ followed by a 1-D pass in $y$.

## Mixture model

A model with $m$ components trains $m$ independent star models; detection reports the component and configuration with the highest score. All PASCAL VOC experiments use $m = 2$ components, covering frontal and side aspects. The latent variable $z$ encodes both the component label and the full configuration $(p_0, \ldots, p_n)$.

## Latent SVM training

:::definition[Latent SVM objective]
Let $f_\beta(x) = \max_{z \in Z(x)} \beta \cdot \Phi(x, z)$ be the detector score for example $x$ (Eq. 13). The training objective is

$$
L_D(\beta) = \tfrac{1}{2}\|\beta\|^2 + C \sum_i \max\!\bigl(0,\; 1 - y_i f_\beta(x_i)\bigr). \tag{Eq. 14}
$$

The hinge loss is convex in $\beta$ for negative examples ($y_i = -1$) — the semi-convex property — enabling a coordinate-descent procedure that alternates between relabelling positive latent values and solving a convex QP over negatives.
:::

Hard-negative mining iteratively removes easy negatives ($y_i f_\beta(x_i) > 1$) from the cache and adds new hard examples; convergence to $\beta^*(D)$ is guaranteed when the cache eventually contains all hard examples (Theorem 1).

## Procedure

:::algorithm[DPM inference (single component)]
::input[Image $I$; trained model $(F_0, \{P_i\}_{i=1}^n, b)$ with $P_i = (F_i, v_i, d_i)$; detection threshold $t$.]
::output[List of (bounding box, score) pairs for all positions exceeding $t$, after non-maximum suppression.]

1. Build the HOG feature pyramid $H$ from $I$ at $\lambda = 10$ levels per octave; cell size $k = 8$ px; $d = 31$ dimensions per cell.
2. For each pyramid level $l_0$, compute the root filter response map $R_{0,l_0}(x, y) = F_0' \cdot \phi(H_{l_0}, (x,y))$ at every root position.
3. For each part $i = 1, \ldots, n$, compute the part response map $R_{i, l_0 - \lambda}$ at the corresponding finer pyramid level.
4. For each part $i$, compute the distance-transform array $D_{i,l_0-\lambda}$ by two 1-D passes ($x$ then $y$) over $R_{i,l_0-\lambda}$ using the quadratic cost $d_i \cdot \phi_d$.
5. At each root position $(x_0, y_0)$, aggregate the root response with all part distance-transform values sampled at anchor positions $2(x_0, y_0) + v_i$ to obtain $\operatorname{score}(z^*)$ (Eq. 9).
6. Collect all positions with $\operatorname{score}(z^*) > t$ as candidate detections; apply non-maximum suppression (suppress any box overlapping a higher-scoring box by $\geq 50\%$).
7. Optionally apply bounding-box regression: fit output boxes via least-squares regression on the $2n+3$-dimensional configuration feature $g(z^*)$.
:::

# Implementation

The per-root-position score in Rust — combining root filter response with pre-computed part distance-transform values (Eq. 2 + Eq. 8):

```rust
/// Quadratic deformation cost: d · φ_d(dx, dy).
/// d_coeffs = [a, b, c, e] corresponding to φ_d = (dx, dy, dx², dy²).
#[inline]
fn deformation_cost(d_coeffs: [f32; 4], dx: i32, dy: i32) -> f32 {
    let (fx, fy) = (dx as f32, dy as f32);
    d_coeffs[0] * fx + d_coeffs[1] * fy
        + d_coeffs[2] * fx * fx + d_coeffs[3] * fy * fy
}

/// Eq. 2: aggregate root response with part distance-transform values at the
/// anchors. Deformation costs are already folded into `dt_values` by Eq. 8.
#[inline]
fn root_score(root_resp: f32, dt_values: &[f32], bias: f32) -> f32 {
    root_resp + dt_values.iter().sum::<f32>() + bias
}

/// One-axis quadratic distance transform.
/// Fills out[x] = max_dx [ resp[x + dx] − (c · dx + e · dx²) ] for each x.
/// Apply twice (x then y) to realise the full 2-D maximisation in Eq. 8.
fn dt_1d(resp: &[f32], c: f32, e: f32, out: &mut [f32]) {
    let n = resp.len();
    let mut best = f32::NEG_INFINITY;
    for x in 0..n as i32 {
        let cand = resp[x as usize] - c * (x as f32) - e * (x * x) as f32;
        if cand > best { best = cand; }
        out[x as usize] = best + c * (x as f32) + e * (x * x) as f32;
    }
}
```

# Remarks

- Inference is $O(nk)$ per pyramid level after filter response maps are computed, where $n$ is the number of parts and $k$ is the number of positions at each pyramid level; the dominant cost is convolution of root and part filters over the pyramid.
- Training is offline and expensive: PASCAL experiments require approximately 4 hours to train and 3 hours to evaluate on an 8-core 2.8 GHz Xeon; test-time average is approximately 2 seconds per image. The method is unsuitable for real-time use.
- A mixture of $m = 2$ components handles aspect-ratio and viewpoint variation; categories with three or more distinct aspects are poorly served — bird AP is 0.006 in PASCAL VOC 2007 Table 2.
- The deformable assumption is a star topology: each part connects only to the root, not to other parts. Within-part articulation and joint-chain kinematics (e.g. extreme limb foreshortening) violate the quadratic deformation model.
- Hard-negative mining requires multiple passes over the training set; convergence to $\beta^*(D)$ is guaranteed only when the cache contains all hard examples, but memory limits in practice impose a fixed iteration count rather than full convergence.
- Dominant on PASCAL VOC 2007/2008 — first or second place in 17 of 20 categories (Table 3) — until the R-CNN family (Girshick et al., 2014) replaced HOG + latent SVM with CNN features. The end-to-end learned replacement in general object detection is [Faster R-CNN](../models/faster-rcnn), which folds proposal generation into a shared-conv RPN head and supersedes the sliding-window + deformable-template pipeline on PASCAL VOC 2007 (DPM ≈33% mAP vs Faster R-CNN VGG-16 73.2%, ResNet-101 76.4%).

# References

1. Felzenszwalb, P. F., Girshick, R. B., McAllester, D., Ramanan, D. *Object Detection with Discriminatively Trained Part-Based Models.* IEEE TPAMI, 32(9):1627–1645, 2010. [PDF](https://cs.brown.edu/people/pfelzens/papers/lsvm-pami.pdf)
2. Dalal, N., Triggs, B. *Histograms of Oriented Gradients for Human Detection.* CVPR, 2005. [HAL](https://inria.hal.science/inria-00548512)
3. Viola, P., Jones, M. *Rapid Object Detection Using a Boosted Cascade of Simple Features.* CVPR, 2001. [PDF](https://www.cs.cmu.edu/~efros/courses/LBMV07/Papers/viola-cvpr-01.pdf)

![Deformable Part Models pipeline: input image → HOG feature pyramid → root and part filter responses → per-part separable quadratic distance transforms → root-anchored score aggregation → thresholding with NMS and bounding-box regression → per-instance detections.](./images/felzenszwalb-deformable-parts/pipeline.svg)
