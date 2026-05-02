---
title: "GP Checkerboard Enhancement (PyCBD)"
date: 2026-05-02
summary: "Post-process a partially detected checkerboard by training two Gaussian processes (one per pixel coordinate) on the allocated (boardXY, boardUV) pairs to allocate unassigned detections to grid positions, predict UV for occluded or out-of-frame corners, and apply a global-consistency refinement to every allocated corner."
tags: ["calibration", "chessboard", "gaussian-processes"]
category: calibration
author: "Vitaly Vorobyev"
difficulty: intermediate
draft: true
quality: stub
relatedAlgorithms: ["geiger-chessboard-detector", "ocpad"]
prerequisites: [image-gradient]
related: [geiger-chessboard-detector, ocpad, chessboard-x-corner-detection]
comparedWith: []
failureModes: []
sources:
  primary: hillen2023-enhanced
  references:
    - rasmussen2006-gpml
    - geiger2012-automatic
    - rufli2008-blurred
    - duda2018-accurate
    - fuersattel2016-ocpad
    - placht2014-rochade
  notes: |
    Stub algorithm page authored from the full text of Hillen et al. 2023
    (`docs/papers/.cache/hillen2023-enhanced.txt` / DOI 10.3390/math11224568).
    Method is an enhancement layer wrapping any upstream checkerboard
    detector (paper benchmarks against Geiger 2012 / libcbdetect; the
    PyCBD library exposes the GP step as a modular post-processor).
    Two GPs predict U and V pixel coordinates from `boardXY` grid keys
    using a squared-exponential kernel (Eq. 6); hyperparameters fit by
    L-BFGS maximisation of log marginal likelihood (Eq. 7, Rasmussen
    2006 Ch. 5). Three capabilities: (1) iterative grid expansion +
    matching of unallocated detections (Algorithm 1, distance-threshold
    matching, max 10 iterations); (2) UV prediction for occluded or
    out-of-frame grid positions; (3) global-consistency refinement of
    every allocated corner via the GP posterior mean. Library:
    `pip install pycbd` / github.com/InViLabUAntwerp/PyCBD. Strongest
    gains on low-resolution endoscopic, multispectral, and thermal IR
    captures where conventional detectors miss many corners.
---

# Goal

Take the output of an upstream checkerboard corner detector — a set of allocated $(\mathbf{X}_b, \mathbf{u}_b)$ pairs (board grid coordinates → image pixel coordinates) plus a set of detected-but-unallocated corners $\mathbf{u}_u$ — and produce an augmented corner set with three improvements:

1. **Grid allocation** of corners missed by the upstream detector's structure-recovery step.
2. **Prediction of UV** for occluded grid positions or for grid positions that fall outside the image — extrapolation beyond the visible board.
3. **Global-consistency refinement** of every allocated corner: the GP posterior mean acts as a non-local smoother that uses the entire board geometry, rather than only local pixel evidence.

The method does **not** perform corner detection itself. It wraps an upstream detector (the paper benchmarks against [Geiger 2012](/atlas/geiger-chessboard-detector) `libcbdetect`; any detector returning a partial grid will work).

# Algorithm

The mapping from board grid coordinates $\mathbf{X} = (X, Y)$ to pixel coordinates $\mathbf{u} = (u, v)$ is modelled by **two independent Gaussian processes**, one per output dimension. Each GP is fit on the same training set $\{(\mathbf{X}_{b,i}, u_{b,i})\}$ (or $v_{b,i}$) using a squared-exponential kernel:

$$
k_{\text{SE}}(\mathbf{X}, \mathbf{X}') = \sigma_f^2 \exp\!\left(-\frac{\lVert \mathbf{X} - \mathbf{X}' \rVert^2}{2 l^2}\right).
\tag{Hillen Eq. 6}
$$

Hyperparameters $(\sigma_f, l)$ are selected by maximising the log marginal likelihood of the training data (Hillen Eq. 7) via L-BFGS — the principled alternative to cross-validation that Rasmussen 2006 Ch. 5 establishes for kernel hyperparameter selection. A small jitter is added to the diagonal of the Gram matrix to preserve numerical conditioning.

Inference is the standard GP regression posterior:

$$
\bar{u}(\mathbf{X}_*) = \mathbf{k}_*^\top (K + \sigma_n^2 I)^{-1} \mathbf{u}_b,
\qquad
\text{cov}(u_*) = k(\mathbf{X}_*, \mathbf{X}_*) - \mathbf{k}_*^\top (K + \sigma_n^2 I)^{-1} \mathbf{k}_*,
$$

with $K \in \mathbb{R}^{n \times n}$ the training Gram matrix and $\mathbf{k}_* \in \mathbb{R}^n$ the train-test cross-covariances. The posterior variance is available per query point as a confidence measure (the paper reports it but does not feed it downstream; PyCBD exposes it).

## Stage 1 — Iterative corner allocation (§2.2, Algorithm 1)

Greedy expansion of the board outward one ring at a time:

1. Train GPs on the current allocated set $(\mathbf{X}_b, \mathbf{u}_b)$.
2. For each board position in the next ring `newXY` (immediately adjacent to the current allocated frontier), predict pixel coordinates $\bar{\mathbf{u}}$ via the GP posterior mean.
3. For each prediction, match to the nearest unallocated detected corner within a distance threshold expressed as a fraction of the mean inter-corner spacing (tunable; default order $0.3$ – $0.5$).
4. Augment $(\mathbf{X}_b, \mathbf{u}_b)$ with matched pairs. Unmatched detected corners stay in the unallocated pool; unmatched predictions become the next ring's training-time priors.
5. Iterate until no new corners are allocated, no predicted UV falls inside the image, or `maxNrOfIterations` (default 10) is reached.

Detections that no prediction matches by the time iteration halts are classified as false positives — they detected something corner-like that does not fit any GP-consistent grid extrapolation.

## Stage 2 — GP refinement (§2.3)

After allocation finishes, the GPs are retrained on the full allocated set. Two products:

- **Occluded / out-of-frame fill-in.** For every grid position with no detected corner — corners outside the image, behind an occluder, or simply missed — predict UV from the retrained GP. This extends the recovered board beyond the visible region.
- **Global-consistency smoothing.** For every allocated corner, the GP posterior mean is recomputed *including that corner in the training set* (or with leave-one-out, depending on the implementation choice). The SE kernel imposes infinite differentiability on the underlying mapping, so the posterior mean is a smooth function of board coordinates. This differs from per-corner local refinement (Hessian saddle, cone-quadratic): every corner's refined position is influenced by every other corner via the kernel.

## Stage 3 — Unwarping by-product (§5)

If a dense regular `newXY` grid is queried after refinement, the GP posterior mean produces an **unwarped frontal view** of the board at no additional training cost. The paper notes this as a side benefit useful for downstream calibration-quality diagnostics.

# Implementation

- **PyCBD library** — `pip install pycbd`, source at [github.com/InViLabUAntwerp/PyCBD](https://github.com/InViLabUAntwerp/PyCBD). Apache-2.0 (verify upstream).
- **Modular usage** — the GP enhancement step is decoupled from the corner detector. Any function returning a partial grid `(boardXY, boardUV)` plus an unallocated-corners list `cornersUV` can feed it. The paper benchmarks Geiger 2012 + GP; OpenCV findChessboardCorners + GP also works for legacy pipelines.
- **Tunables** — distance-threshold fraction for the matching step (lower → fewer false matches, more missed corners; higher → more false matches, more recovered corners); lower bound on the GP length scale (prevents the SE length scale from collapsing toward zero on small boards).
- **Cost** — two $O(n^3)$ Cholesky factorisations per training round, where $n$ is the current allocated count. For boards $\le 15 \times 10$ this is fast in practice; for very large boards consider sparse GP approximations (Rasmussen 2006 Ch. 8) — not implemented in PyCBD.

# Remarks

- **Smoothness bias under extreme warping.** The SE kernel imposes a stationary smoothness prior on the board-to-pixel mapping. Strong fisheye or heavy perspective produces high local curvature in this mapping; the SE kernel will over-smooth corner positions in those regimes. The paper recommends non-stationary kernels or deep GPs as future work.
- **Small-board numerical instability.** Below $\sim 4 \times 4$ inner corners, the GP can collapse to the prior — the marginal likelihood surface becomes uninformative. Mitigate by constraining the length-scale lower bound.
- **Upstream detector is the weakest link.** If the upstream finds nothing, the enhancement has no training data. PyCBD cannot bootstrap a board from zero detections. The paper uses Geiger 2012; Geiger fails more easily than OpenCV on high-noise, low-blur inputs but recovers more partial boards on multispectral and IR imagery. Pick the upstream by domain.
- **Compared with OCPAD.** [OCPAD](/atlas/ocpad) (Fürsattel 2016) recovers partial boards by subgraph isomorphism on the detected corner graph — a combinatorial approach that requires no training. GP enhancement fills in occluded corners by *learned interpolation/extrapolation* — a regression approach that requires at least a partial board as training data but extends naturally beyond the image border. The two are complementary: OCPAD handles missing-subgraph recovery; GP handles within-frame and beyond-border gap-filling with smooth refinement.
- **Confidence by construction.** The GP posterior variance gives a per-corner confidence estimate at zero additional cost. Useful for downstream calibration outlier filtering, though the paper does not exploit it.

# References

1. M. Hillen, I. De Boi, T. De Kerf, S. Sels, E. Cardenas De La Hoz, J. Gladines, G. Steenackers, R. Penne, S. Vanlanduit. *Enhanced Checkerboard Detection Using Gaussian Processes.* MDPI *Mathematics* 11(22):4568, 2023. [doi:10.3390/math11224568](https://doi.org/10.3390/math11224568)
2. C. E. Rasmussen, C. K. I. Williams. *Gaussian Processes for Machine Learning.* MIT Press, 2006. (Ch. 2 — GP regression posterior; Ch. 5 — log marginal likelihood for hyperparameter selection.)
3. A. Geiger, F. Moosmann, O. Car, B. Schuster. *Automatic Camera and Range Sensor Calibration Using a Single Shot.* IEEE ICRA, 2012. (`libcbdetect` — the upstream detector benchmarked in §4.)
4. P. Fürsattel et al. *OCPAD — Occluded Checkerboard Pattern Detector.* WACV 2016. (Complementary partial-pattern recovery method.)
