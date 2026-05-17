---
title: "Non-Maximum Suppression"
date: 2026-05-16
summary: "Reducing a dense response map or a set of overlapping detections to a sparse set of local maxima by discarding every element that is not strongest in its neighbourhood."
tags: ["keypoint-detection"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites: []
sources:
  primary: canny1986-edge
  references:
    - harris1988-corner
    - rosten2006-fast
    - redmon2016-yolo
    - shi-tomasi1994-features
---

# Definition

Non-maximum suppression converts a dense response map — or a set of candidate detections scored by confidence — into a sparse set of locally maximal responses by discarding any element that is not the strongest in its neighbourhood.

:::definition[Non-maximum suppression]
**Input.** A response function $R : \Omega \to \mathbb{R}$ on a domain $\Omega$ (a pixel grid, a continuous gradient field, or a finite set of scored bounding boxes), together with a neighbourhood relation $\mathcal{N} : \Omega \to 2^\Omega$ (a grid window, a 1-D directional interval, or a pairwise-overlap measure).

**Suppression rule.** Retain element $p \in \Omega$ if and only if

$$R(p) \geq R(q) \quad \forall\, q \in \mathcal{N}(p).$$

**Output.** The subset of $\Omega$ whose members survive the rule; each surviving element is a local maximum of $R$ with respect to $\mathcal{N}$.
:::

The neighbourhood relation $\mathcal{N}$ determines what "local" means. Three operationally distinct instantiations appear across detectors: a square window on a 2-D response map, used by corner detectors; a 1-D interval along the gradient direction, used by edge detectors; and an overlap-based set, used by object detectors. All three satisfy the single suppression rule above.

# Mathematical Description

## Grid / window suppression on a response map

Let $R : \mathbb{Z}^2 \to \mathbb{R}$ be a response map on the pixel grid. For an $n \times n$ window centred at pixel $p$, the neighbourhood is

$$\mathcal{N}_n(p) = \{(x+i,\, y+j) : -\lfloor n/2 \rfloor \leq i,j \leq \lfloor n/2 \rfloor\},$$

and $p$ is retained iff $R(p) \geq R(q)$ for all $q \in \mathcal{N}_n(p)$. Harris corner detection applies this over an 8-connected neighbourhood ($n = 3$) to the signed response $R = \det(M) - k\,\mathrm{tr}(M)^2$: only pixels with $R > 0$ that are local maxima are kept as corners. FAST corner detection applies the same $3 \times 3$ rule to its corner score $V$ — the largest threshold for which the pixel still passes the segment test — to resolve the adjacent-corner clustering the segment test alone cannot suppress: without it, multiple pixels around one geometric corner all pass the criterion.

## Gradient-direction (1-D) suppression on an edge map

Canny's edge detector suppresses along the gradient direction rather than over a 2-D window, thinning the gradient ridge to a one-pixel-wide edge map. At each pixel the unit gradient direction $\hat{n} = \nabla(G_\sigma * I) / |\nabla(G_\sigma * I)|$ defines a 1-D neighbourhood — the two pixels immediately adjacent to $p$ along $\hat{n}$ — and $p$ is retained iff

$$|\nabla(G_\sigma * I)(p)| \geq |\nabla(G_\sigma * I)(p \pm \hat{n})|.$$

This is equivalent to locating zero-crossings of the directional second derivative of the smoothed image along $\hat{n}$. Because $\hat{n}$ is continuous and the image discrete, $\hat{n}$ is typically quantised to one of four or eight cardinal directions and the two neighbours compared directly; sub-pixel implementations bilinearly interpolate the gradient-magnitude map along $\hat{n}$.

## Greedy overlap-based suppression on detections

Object detectors produce candidate boxes $\{(b_i, s_i)\}$ with scores $s_i$. Greedy suppression proceeds: sort by score descending; move the highest-scoring box $b^*$ to the kept set; discard every remaining box $b_j$ with

$$\mathrm{IoU}(b^*, b_j) = \frac{|b^* \cap b_j|}{|b^* \cup b_j|} > \theta_{\mathrm{NMS}};$$

repeat until none remain. The procedure is a heuristic — not a globally optimal non-overlapping subset — and runs in $O(N^2)$ in the number of candidates. YOLO applies it per class at inference time and reports a 2–3% mAP gain from this step on PASCAL VOC 2007.

# Numerical Concerns

**Window size vs feature density.** In grid suppression a window too large suppresses genuine nearby features; one too small retains clusters of responses from the same physical feature. The $3 \times 3$ neighbourhood used by corner detectors is aggressive but still admits multiple corners from a single junction when the response map has a broad plateau.

**Tie-breaking.** The rule retains a pixel when its score is greater than *or equal to* every neighbour, so ties retain both pixels. Implementations break ties by a coordinate convention or by using strict inequality, which keeps only the first pixel of a tied set.

**Interpolation in gradient-direction suppression.** When $\hat{n}$ falls between cardinal directions, quantising it introduces a localisation bias of up to $22.5°$ (8-direction quantisation) proportional to edge curvature; bilinear interpolation of the gradient-magnitude map reduces the bias to sub-pixel levels at extra cost.

**IoU threshold and the precision/recall trade-off.** A lower $\theta_{\mathrm{NMS}}$ suppresses more boxes — higher precision, lower recall in crowded scenes; a higher threshold retains duplicates. PASCAL VOC practice uses $\theta_{\mathrm{NMS}} \approx 0.5$; benchmarks that penalise duplicates more heavily push toward lower thresholds or soft-suppression variants.

**Plateau handling.** Broad flat maxima — common when the integration window is large relative to feature spacing — produce plateaus of equal maximal score. Grid suppression with $\geq$ retains all plateau pixels; with $>$ it retains none. Neither is correct; morphological thinning after suppression, or a strict criterion with a small additive margin, is the usual mitigation.

**Border effects.** Near image boundaries the $n \times n$ window extends outside the image. Zero-padding the response map suppresses responses within $\lfloor n/2 \rfloor$ pixels of the border; mirror- or replicate-padding avoids this.

# Where it appears

Non-maximum suppression is a post-processing step shared across gradient-based, intensity-comparison, and learned detectors.

- [canny-edge-detector](/atlas/canny-edge-detector) — gradient-direction (1-D) suppression on the gradient-magnitude map, thinning the response ridge to one pixel wide; the only registered page where the neighbourhood follows a continuous direction.
- [harris-corner-detector](/atlas/harris-corner-detector) — 8-connected $3 \times 3$ grid suppression on the signed Harris response; retained corner pixels satisfy $R > 0$ and are local maxima.
- [shi-tomasi-corner-detector](/atlas/shi-tomasi-corner-detector) — identical $3 \times 3$ grid suppression on $\min(\lambda_1, \lambda_2)$; because that response is non-negative everywhere, no sign gating is needed.
- [fast-corner-detector](/atlas/fast-corner-detector) — $3 \times 3$ grid suppression on the corner score $V$; the mechanism that resolves the adjacent-corner clustering produced by the segment test.
- [loy-fast-radial-symmetry](/atlas/loy-fast-radial-symmetry) — grid suppression on the radial-symmetry accumulator, retaining local maxima at the expected radius of the symmetric structure.
- [yolo-v1](/atlas/yolo-v1) — greedy IoU-based suppression applied per class to the bounding-box candidates produced per image.

# References

1. J. Canny. *A Computational Approach to Edge Detection.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 8(6):679–698, 1986.
2. C. Harris, M. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988.
3. E. Rosten, T. Drummond. *Machine Learning for High-Speed Corner Detection.* ECCV, 2006.
4. J. Redmon, S. Divvala, R. Girshick, A. Farhadi. *You Only Look Once: Unified, Real-Time Object Detection.* IEEE CVPR, 2016.
5. J. Shi, C. Tomasi. *Good Features to Track.* IEEE CVPR, 1994.
