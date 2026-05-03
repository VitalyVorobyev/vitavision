---
title: "Geiger Chessboard Corner Detector"
date: 2026-05-02
summary: "Detect checkerboard X-corners by computing a four-quadrant corner likelihood at each pixel using axis-aligned and 45°-rotated prototype filters at three fixed scales, verifying candidates by gradient-orientation statistics, and refining to subpixel accuracy via gradient-orthogonality weighted least squares — the libcbdetect detector that anchors many subsequent calibration pipelines."
tags: ["calibration", "chessboard", "corner-detection"]
domain: features
author: "Vitaly Vorobyev"
difficulty: intermediate
relatedAlgorithms: ["chess-corners", "rochade", "pyramidal-blur-aware-xcorner"]
prerequisites: [image-gradient]
related: [chessboard-x-corner-detection]
comparedWith: [pyramidal-blur-aware-xcorner]
failureModes: []
sources:
  primary: geiger2012-automatic
  references:
    - harris1988-corner
    - shi-tomasi1994-features
    - lucchese2003-saddle
    - rufli2008-blurred
    - zhang2000-flexible
    - hillen2023-enhanced
  notes: |
    Single-shot multi-sensor calibration paper (camera + lidar/RGB-D),
    but the chessboard detector is self-contained and the workhorse of
    the open-source libcbdetect. Detector pipeline (§III): (a) four-quadrant
    corner likelihood (Eq. 1) using axis-aligned + 45°-rotated prototypes,
    each composed of {A, B, C, D} quadrant kernels; min-of-bright + min-of-
    dark suppresses non-checkerboard corners. (b) Conservative NMS. (c)
    Gradient-orientation verification via 32-bin Sobel histogram + mean
    shift + expected-template product. (d) Three-scale max at 4×4, 8×8,
    12×12 windows. (e) Subpixel refinement (§III-B, Eq. 3): gradient-
    orthogonality weighted LS over an 11×11 neighbourhood, closed form.
    (f) Structure recovery (§III-C, Eq. 6-7): energy minimisation
    E_corners + E_struct, greedy expansion from seed corners — recovers
    multiple unknown checkerboards in one pass without prior on (r, c).
    Reported F1 = 0.92 in the abeles2021 benchmark (second-best after
    pyramidal at 0.97). Mean reprojection error 0.18 px across 10
    calibration settings (Table I). Open source: libcbdetect (cvlibs.net).
---

# Goal

Detect inner X-junction corners of an unknown number of planar checkerboard patterns in a single grayscale camera image, with subpixel accuracy. Output: per-board corner sets at subpixel coordinates, ready for use as input to a calibration pipeline (Zhang's planar method, multi-camera bundle adjustment, or single-shot camera-to-range calibration). The defining property is that the number $(r, c)$ of squares per board is **not** required as input — the structure-recovery stage discovers all visible checkerboards and grows the grid graph from seed corners.

# Algorithm

The detector runs in three stages: per-pixel response, per-corner refinement, and per-board structure recovery.

## Stage 1 — Corner likelihood (§III-A)

Two prototype filters cover the two canonical X-junction orientations: axis-aligned ($0°$/$90°$) and $45°$-rotated. Each prototype is composed of four quadrant kernels $\{A, B, C, D\}$ around a candidate corner. For an ideal X-corner two diagonal quadrants should be on the bright side (above the four-quadrant mean $\mu$) and the other two on the dark side, or vice versa. The corner likelihood at a pixel is

$$
c = \max(s_1^1,\; s_1^2,\; s_2^1,\; s_2^2), \quad \text{(Eq. 1)}
$$

with

$$
s_i^1 = \min\!\bigl(\min(f_A^i, f_B^i) - \mu,\; \mu - \min(f_C^i, f_D^i)\bigr), \qquad s_i^2 = \min\!\bigl(\mu - \min(f_A^i, f_B^i),\; \min(f_C^i, f_D^i) - \mu\bigr),
$$

and $\mu = \tfrac{1}{4}(f_A^i + f_B^i + f_C^i + f_D^i)$. The two prototypes give two responses each; the two $\min$ operations within each $s_i^j$ deliberately suppress responses where any one quadrant is weak — a non-checkerboard corner with three strong quadrants and one missing scores low.

Conservative non-maximum suppression follows (parameters $n_\text{nms} = 3$, $\tau_\text{nms} = 0.02$). Surviving candidates are then **gradient-verified**: a 32-bin orientation histogram of Sobel responses is computed in a local $n \times n$ neighbourhood, the two dominant modes $\alpha_1, \alpha_2$ are found by mean shift, and an expected gradient template $T$ is constructed. The final score is the product $T \ast \|\nabla I\|_2$ times $c$, thresholded at $\tau_\text{corner} = 0.02$.

The whole pipeline is repeated at three fixed window sizes — $4 \times 4$, $8 \times 8$, $12 \times 12$ — and the per-pixel maximum of the three scores is taken. This is the multi-scale strategy: not a full pyramid, just three discrete scales chosen empirically.

## Stage 2 — Subpixel + orientation refinement (§III-B)

Given an integer candidate $c_0$, the subpixel position is the point at which gradients $g_p$ at neighbouring pixels are orthogonal to $(p - c)$:

$$
c = \arg\min_{c'} \sum_{p \in N_I(c')} \bigl(g_p^T (p - c')\bigr)^2.
\quad \text{(Eq. 2)}
$$

Closed-form solution over an $11 \times 11$ neighbourhood:

$$
c = \biggl(\sum_p g_p g_p^T\biggr)^{-1} \sum_p (g_p g_p^T)\,p.
\quad \text{(Eq. 3)}
$$

Gradient magnitudes weight the sum automatically — pixels with strong gradients dominate, low-gradient pixels contribute little. Edge orientation vectors $e_1, e_2$ are refined separately by minimising the squared deviation of gradient normals (Eq. 4); the solution is the eigenvector of the $2 \times 2$ scatter matrix corresponding to the smallest eigenvalue.

## Stage 3 — Structure recovery (§III-C)

The checkerboard structure minimises an energy

$$
E(\mathcal{X}, \mathcal{Y}) = E_\text{corners}(\mathcal{Y}) + E_\text{struct}(\mathcal{X}, \mathcal{Y}).
\quad \text{(Eq. 6)}
$$

$E_\text{corners} = -|\{y \mid y \neq O\}|$ rewards explaining more corners; $E_\text{struct}$ measures how well triples of consecutive corners along each row and column satisfy the collinearity / spacing constraint (Eq. 7). The discrete optimisation is greedy: from each seed corner, expand a $2 \times 2$ initial hypothesis by adding one row or column at a time, picking the expansion that reduces $E$ the most. Apply this to each seed; merge duplicates greedily. The result is a list of all visible checkerboards in the image — recovered without any prior on $(r, c)$ — which is the **single-shot** property.

![geiger-chessboard-detector pipeline: 7-stage flow from grayscale image through four-quadrant corner likelihood at three fixed scales, NMS, gradient-orientation verification, subpixel refinement, greedy structure recovery, to per-board corner sets.](./images/geiger-chessboard-detector/pipeline.svg)

# Implementation

Open source: **libcbdetect** (C++) at [cvlibs.net](https://www.cvlibs.net), maintained by the original authors at Karlsruhe Institute of Technology. The toolbox also implements the camera-to-range calibration pipeline (§IV of the paper). MATLAB and Python ports exist downstream.

# Remarks

- **Single-shot is the practical contribution.** The structure-recovery energy function discovers an unknown number of checkerboards in one image without the user specifying $(r, c)$ for each board — making the detector well-suited to calibration rigs that place multiple targets in the scene at different orientations.
- **Three fixed scales is the limitation.** The $4 \times 4$, $8 \times 8$, $12 \times 12$ window sizes are chosen empirically; severe blur peaking between these scales degrades detection. The [pyramidal blur-aware detector](/atlas/pyramidal-blur-aware-xcorner) (Abeles 2021) addresses this by computing the response at every level of a full image pyramid and selecting per corner the level that maximises intensity-per-resolution.
- **Distinct from ChESS and ROCHADE.** Unlike [ChESS](/atlas/chess-corners) (16-pixel ring sampling), Geiger uses two full quadrant-kernel convolutions per scale. Unlike [ROCHADE](/atlas/rochade) (gradient-magnitude centreline graph), Geiger detects per-pixel and grows the grid greedily from seed corners.
- **Subpixel refinement neighbourhood is large.** The $11 \times 11$ window in Eq. 3 integrates over 121 pixels — significantly larger than Harris's typical 5–9 px or ROCHADE's cone window ($2\kappa+1$ with $\kappa=2$–$5$). Larger neighbourhood reduces single-pixel noise sensitivity but can cross checkerboard edges on small fields.
- **Used downstream by GP enhancement.** [GP checkerboard enhancement](/atlas/gp-checkerboard-enhancement) (Hillen et al. 2023) consumes Geiger's partial board outputs and learns a Gaussian process from grid-coordinate to pixel-coordinate to fill in missing corners, predict UV for occluded grid positions, and globally smooth all detected corner positions. Geiger is the canonical upstream detector in that pipeline; the GP wrapper compensates for Geiger's structure-recovery limitation under heavy occlusion and is the workhorse for Hillen 2023's low-resolution endoscopic, multispectral, and thermal IR benchmarks.
- **Empirical accuracy.** Mean reprojection error 0.18 px across 10 calibration settings (Table I of paper); F1 = 0.92 on the abeles 2021 benchmark — second-best after the pyramidal detector at 0.97 (the abeles paper notes Geiger has "many more logical branches making it expensive to compute" but credits it as the foundational design).
- **Calibration-target-only.** The four-quadrant likelihood is specifically tuned to X-junctions; it is not a general-purpose corner detector. For non-checkerboard scenes use Harris, Shi-Tomasi, or FAST.

## When to choose Geiger over Pyramidal

[Pyramidal blur-aware X-corner](/atlas/pyramidal-blur-aware-xcorner) (Abeles 2021) is the direct successor to Geiger in the per-pixel X-corner detector family. It improves on Geiger in two ways: a full image pyramid (replacing Geiger's three fixed scales) and a simpler `xscore` (replacing Geiger's four-quadrant likelihood with a 16-sample template that the paper notes is cheaper to compute).

| | Geiger (2012) | Pyramidal (2021) |
|---|---|---|
| Per-pixel response | four-quadrant prototype, 4 quadrant convolutions per scale | `xscore` from 16 ring samples, single template per level |
| Multi-scale strategy | 3 fixed window sizes ($4 \times 4$, $8 \times 8$, $12 \times 12$); per-pixel max | full image pyramid (4–6 levels); per-corner level selection |
| Structure recovery | greedy energy-minimisation grid growing | blur-aware edge intensity score with level-dependent spacing |
| Per-pixel cost | higher (4 convolutions × 3 scales + gradient verification) | lower (single template, accumulated across pyramid levels) |
| F1 on abeles benchmark | 0.92 | 0.97 |
| Open source | libcbdetect (Karlsruhe; C++) | implementation distributed with the paper |

Choose Geiger when (1) the image is in focus and the corner sizes fall within the three preset window scales — the simpler 3-scale pipeline is well-tuned for the standard indoor calibration case and avoids the per-corner level-selection bookkeeping; (2) you need the single-shot multi-board structure recovery — Geiger's energy-minimisation finds an unknown number of checkerboards in one image, useful for calibration rigs with multiple targets; (3) the libcbdetect C++ implementation is the reference — many downstream tools (Kalibr, ROS calibration packages, Hillen GP enhancement) consume Geiger output as their de-facto upstream baseline.

Choose Pyramidal when (1) the image has heavy blur or large variation in corner size (close-range plus long-range targets in the same scene) — the full-pyramid level selection compensates for blur far better than three fixed scales; (2) you need the per-corner pyramid-level metadata for downstream uses (autofocus diagnostics, per-corner uncertainty estimates); (3) F1 matters more than the libcbdetect ecosystem — the pyramidal detector outperforms Geiger by 5 percentage points in F1 on the standard ROCHADE benchmark.

# References

1. A. Geiger, F. Moosmann, Ö. Car, B. Schuster. *Automatic Camera and Range Sensor Calibration using a single Shot.* IEEE ICRA 2012. [pdf](https://www.cvlibs.net/publications/Geiger2012ICRA.pdf)
2. C. Harris, M. J. Stephens. *A Combined Corner and Edge Detector.* Alvey Vision Conference, 1988. (Baseline detector that Geiger explicitly improves upon.)
3. J. Shi, C. Tomasi. *Good Features to Track.* IEEE CVPR, 1994. (Cited as a common pre-Geiger junction-localisation choice.)
4. L. Lucchese, S. K. Mitra. *Using saddle points for subpixel feature detection in camera calibration targets.* IEEE Asia-Pacific Conference on Circuits and Systems, 2003. (Cited [20] as motivation for subpixel-accurate corner localisation.)
5. M. Rufli, D. Scaramuzza, R. Siegwart. *Automatic Detection of Checkerboards on Blurred and Distorted Images.* IROS 2008. (Cited [7] as an OpenCV-checkerboard-detector extension that Geiger notes only returns a single checkerboard per image.)
6. Z. Zhang. *A Flexible New Technique for Camera Calibration.* IEEE TPAMI 22(11):1330–1334, 2000. (Cited [24] as the calibration framework Geiger feeds.)
7. F. Abeles. *A Pyramidal Blur-Aware X-Corner Detector.* IEEE ICCAR 2021. (Direct successor; benchmarks Geiger as second-best F1 = 0.92.)
