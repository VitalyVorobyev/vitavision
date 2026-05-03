---
title: "MATE"
date: 2026-05-02
summary: "First learned per-pixel checkerboard X-corner detector: a three-convolutional-layer CNN with 2,939 parameters trained with mean-squared-error loss against a binary corner mask and post-processed with a fixed 0.5 threshold."
tags: ["calibration", "corner-detection", "cnn"]
domain: calibration
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
quality: stub
params: "2,939"
prerequisites: [image-gradient]
related: [chessboard-x-corner-detection]
comparedWith: [ccdn-checkerboard-detector]
failureModes: []
draft: true
sources:
  primary: donne2016-mate
  references:
    - chen2023-ccdn
    - placht2014-rochade
    - bennett2013-chess
    - rufli2008-blurred
  notes: |
    Stub page authored from secondary sources only — the MDPI PDF for
    Donné et al. 2016 (doi:10.3390/s16111858) returned HTTP 403 to
    automated fetchers and could not be cached. All claims are derived
    from the chen2023-ccdn research note, the existing CCDN page
    (`content/models/ccdn-checkerboard-detector.md`), and the
    index.yaml `donne2016-mate` notes. Architecture: 3 conv
    layers + ReLU; per-pixel response map; max-pool with stride > 1
    (output spatially coarser than input). Loss: MSE between predicted
    response and binary corner mask (no positive/negative balancing).
    Post-processing: fixed 0.5 threshold; no NMS, no clustering.
    Benchmarks (via CCDN Tables 1–2): uEye 1.009 px / 3.065 % missed /
    0.809 % doubles / 492 FP; GoPro 0.835 px / 4.566 % / 4.556 % / 389 FP.
    Promote past stub when the paper PDF becomes accessible and the
    architectural specifics (kernel sizes, channel counts, max-pool
    strides, training hyperparameters) can be verified against the
    primary text.
relatedAlgorithms:
  - chess-corners
  - rochade
  - fast-corner-detector
---

# Motivation

Detect inner corners of a planar checkerboard pattern in a greyscale image without requiring the pattern's square count $(r \times c)$ as a prior — and do it with a learned CNN rather than a hand-crafted gradient or saddle-fitting pipeline. MATE (Donné et al., *Sensors* 2016) is the first deep-learning checkerboard X-corner detector and is the direct architectural ancestor that [CCDN](/atlas/ccdn-checkerboard-detector) (Chen et al., 2023) extends and supersedes.

Prior work — [ChESS](/atlas/chess-corners), [ROCHADE](/atlas/rochade), OCamCalib ([Rufli 2008](/atlas/rufli2008-blurred)) — was entirely hand-crafted: ring-sampling, gradient-magnitude centrelines, saddle-fitting refinement. MATE's contribution is to show that a minimal three-layer CNN trained on labelled checkerboard images can learn the X-corner signature directly from data, and to do so without any prior on the pattern's grid size.

# Architecture

> **Stub note.** The full paper PDF (MDPI *Sensors* 16(11):1858, 2016) was not accessible during ingestion (HTTP 403 to automated fetchers). The architecture sketch below is reconstructed from the [CCDN paper's](/atlas/ccdn-checkerboard-detector) explicit comparisons and from the `donne2016-mate` `index.yaml` notes. Specifics (channel counts, exact kernel sizes per layer, training hyperparameters) are not available from secondary sources and are marked accordingly.

**Family & shape.** Fully-convolutional CNN. Input: greyscale image $X \in \mathbb{R}^{H \times W}$. Output: per-pixel corner-response map at a spatial resolution coarser than the input (CCDN §2.1 explicitly contrasts MATE's subsampled-grid output with CCDN's stride-1 max-pool design, which preserves resolution).

**Depth and parameter budget.** Three convolutional layers with ReLU non-linearities. Total **2,939 parameters** — roughly $5.5\times$ smaller than CCDN's 16,301 (CCDN §2.1; CCDN page Complexity).

**First-layer kernel.** CCDN §2.1 cites MATE's own analysis of the spatial-support radius trade-off: a too-small first-layer kernel admits background false detections; a too-large kernel loses recall on true corners. MATE establishes the radius-4 target that CCDN inherits (9 × 9 first-layer kernel). MATE's exact first-layer size is not directly recorded in the available secondary sources but is consistent with a 7 × 7 kernel given the parameter-count differential.

**Loss.** Mean-squared error between the predicted response map and a per-pixel binary corner mask. Critically, no positive/negative class balancing is applied — at VGA the positive-label fraction is approximately $10^{-4}$, so the per-positive gradient contribution is dwarfed by the aggregate background gradient under MSE. CCDN's Fig. 4 shows MATE's MSE training "started out much more slowly for the first 150 epochs" relative to CCDN's weighted cross-entropy.

**Post-processing.** A fixed threshold of $0.5$ is applied to the response map (CCDN §2.2). No non-maximum suppression. No spatial clustering. Every supra-threshold pixel becomes a corner candidate.

# Assessment

## Novelty

- **First learned X-corner detector for checkerboards.** Prior work (ROCHADE, ChESS, OCamCalib) was hand-crafted; MATE established that a minimal CNN can replace those pipelines.
- **Pattern-agnostic by design.** The per-pixel response formulation removes the need for $(r \times c)$ at inference — an inherited property in CCDN, XFeat, and any subsequent pattern-aware-but-grid-free detector.
- **Compact (2,939 parameters).** Demonstrates that a three-layer network suffices to capture the X-corner signature in clean, calibration-controlled imagery.

## Limitations

- **Fixed 0.5 threshold is scene-independent.** ReLU outputs are unbounded above. A corner whose response is 2.3 is correctly detected, but a corner whose response is 0.4 (low-contrast image, distant camera, strong blur) is missed with no recourse. CCDN §2.2 replaces this with an adaptive $0.5\cdot\max$ rule.
- **No NMS or clustering.** Every supra-threshold pixel emits a corner candidate. On the ROCHADE uEye dataset MATE produces 492 false positives; on the GoPro dataset (strong radial distortion) MATE produces 4.556 % double detections and 389 FPs. CCDN's three-stage post-processing (adaptive threshold + 4×4 NMS + k-means++) cuts these to 93 / 0 % / 0 (Tables 1–2).
- **MSE under extreme class imbalance.** Without per-class normalisation the per-positive gradient is $\sim 10^4\times$ smaller than the per-negative gradient. Convergence is slow and the trained-positive response is at risk of being weak.
- **Subsampled output grid.** Non-unit-stride max-pooling means the output map is spatially coarser than the input; the localisation error floor is bounded below by the pooling stride. No subpixel refinement is built in.
- **Strictly dominated by CCDN on reported benchmarks.** No regime is reported in which MATE outperforms CCDN on uEye or GoPro across any of the four metrics (mean error, missed rate, double-detection rate, false-positive count).

## When to choose MATE over CCDN

[CCDN](/atlas/ccdn-checkerboard-detector) (Chen et al., 2023) is MATE's direct architectural successor, reusing the per-pixel-response formulation but doubling the depth (six convolutions vs three), replacing MSE with positive-negative-balanced cross-entropy, enforcing stride-1 max-pools to preserve input resolution, and adding adaptive-threshold + NMS + k-means++ post-processing. CCDN supersedes MATE on every reported metric.

| | MATE (2016) | CCDN (2023) |
|---|---|---|
| Convolutional layers | 3 | 6 |
| Parameters | 2,939 | 16,301 ($\sim 5.5\times$) |
| Loss | MSE | weighted cross-entropy + L2 |
| Output resolution | subsampled (max-pool stride > 1) | full input resolution (stride-1 max-pool) |
| Threshold | fixed 0.5 | adaptive $0.5\cdot\max$ |
| Post-processing | none | 4 × 4 NMS + k-means++ ($k=10$, drop $N_i < 2$) |
| uEye mean error / missed / doubles / FP | 1.009 px / 3.065 % / 0.809 % / 492 | 0.812 / 1.169 % / 0 % / 93 |
| GoPro mean error / missed / doubles / FP | 0.835 px / 4.566 % / 4.556 % / 389 | 0.576 / 0.907 % / 0 % / 0 |

MATE remains relevant in three narrow situations:

- **Extreme parameter budget.** On deeply embedded hardware where the $5.5\times$ smaller weight count is the binding constraint and accuracy under distortion is not critical.
- **Trivial post-processing.** Where the calling code cannot host a k-means++ + NMS pipeline and a single fixed threshold is the only viable inference path.
- **Historical baseline.** When reproducing MATE's numbers for a paper comparing successive generations of learned checkerboard detectors.

For production calibration use under any non-trivial imaging conditions (lens distortion, low contrast, partial visibility), choose CCDN.

# Implementations

No public implementation of MATE has been verified at the time of writing this stub. CCDN's reference implementation (`https://github.com/AnkaChan/new_chessboards_test`) reproduces MATE's architecture as a comparison baseline; readers seeking a runnable MATE should verify the architecture in that repository against the original paper before relying on it.

# References

1. S. Donné, J. De Vylder, B. Goossens, W. Philips. *MATE: Machine Learning for Adaptive Calibration Template Detection.* MDPI *Sensors* 16(11):1858, 2016. [doi:10.3390/s16111858](https://doi.org/10.3390/s16111858)
2. B. Chen, C. Xiong, Q. Zhang. *CCDN: Checkerboard Corner Detection Network for Robust Camera Calibration.* arXiv:2302.05097, 2023. [arXiv](https://arxiv.org/pdf/2302.05097)
3. S. Placht, P. Fürsattel, E. Mengue, H. Hofmann, C. Schaller, M. Balda, E. Angelopoulou. *ROCHADE: Robust Checkerboard Advanced Detection for Camera Calibration.* ECCV 2014, 766–779.
4. S. Bennett, J. Lasenby. *ChESS — Quick and Robust Detection of Chess-board Features.* arXiv:1301.5491, 2013.
5. M. Rufli, D. Scaramuzza, R. Siegwart. *Automatic Detection of Checkerboards on Blurred and Distorted Images.* IROS 2008, 3121–3126.
