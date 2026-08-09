---
paper_id: ranftl2019-midas
title: "Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-shot Cross-dataset Transfer"
authors: [René Ranftl, Katrin Lasinger, David Hafner, Konrad Schindler, Vladlen Koltun]
year: 2019
url: https://arxiv.org/abs/1907.01341
created: 2026-06-27
relevant_atlas_pages: [pinhole-camera-model, image-pyramid]
---

# Setting

**Problem class**: monocular (single-image) depth estimation — recovering a dense depth map
from one RGB image, with no stereo pair, no video, and no known camera intrinsics.

**Inputs**: a single RGB image of arbitrary scene type (indoor/outdoor, static/dynamic,
diverse subjects and scales). No calibration required at inference time.

**Outputs**: a dense **inverse-depth (disparity) map** in relative units — depth up to an
unknown global scale and shift. Metric depth is not recovered; the result is useful for
scene understanding, novel-view synthesis, and point-cloud visualization but not for
metric measurement.

**Preconditions**: image contains sufficient visual depth cues (shading, perspective,
occlusion). Results degrade on images with minimal depth cues (e.g. textureless flat
surfaces, or images that have been rotated 90°).

# Core idea

The central problem is that existing depth datasets have **incompatible annotations**:
some give metric depth (LiDAR), some give depth up to unknown scale (SfM/MegaDepth),
and some give disparity up to unknown scale **and** an unknown global shift (stereo
cameras with unknown baseline and post-production horizontal shifts in 3D movies). No
common loss function works across all three forms without choosing a representation.

The key insight is to work in **disparity space** (inverse depth) and define losses that
are invariant to per-image affine transformations of the form `d̂ = s·d + t` — aligning
prediction and ground truth at the start of each loss evaluation.

**Strategy 1 — Least-squares alignment** (Eq. 2–4): find the scale s and shift t that
minimise the mean-squared alignment error between prediction d and ground-truth d*:

```
(s, t) = argmin_{s,t}  Σ_i (s·d_i + t − d*_i)²
```

Solved in closed form. Let d̃_i = (d_i, 1)^T and h = (s, t)^T:

```
h_opt = (Σ_i d̃_i d̃_i^T)^{−1}  (Σ_i d̃_i d*_i)          (Eq. 4)
```

The MSE loss after alignment is L_ssimse (ρ = x²).

**Strategy 2 — Robust alignment** (Eq. 5–6, 7): replace the LS estimators with
median-based ones to resist outliers in imperfect ground truth:

```
t(d) = median(d)
s(d) = (1/M) Σ_i |d_i − t(d)|                              (Eq. 5)

d̂  = (d  − t(d))  / s(d)
d̂* = (d* − t(d*)) / s(d*)                                  (Eq. 6)
```

After alignment, evaluate the **trimmed MAE** — drop the 20% largest residuals before
computing the loss:

```
L_ssitrim(d̂, d̂*) = (1 / 2M) Σ_{j=1}^{U_m} ρ_mae(d̂_j − d̂*_j)    (Eq. 7)
```

where residuals are sorted ascending, U_m = 0.8M (trimming fraction set empirically on
ReDWeb), and ρ_mae(x) = |x|. Unlike M-estimators, large outlier residuals are entirely
excluded — because outliers arise from inaccurate annotation, not from model error, and
should never back-propagate.

**Multi-scale gradient matching regularizer** (Eq. 11): biases sharp depth discontinuities
to coincide with those in the ground truth, at K = 4 resolution levels:

```
L_reg(d̂, d̂*) = (1/M) Σ_{k=1}^{K} Σ_{i=1}^{M}  (|∇_x R_i^k| + |∇_y R_i^k|)   (Eq. 11)
```

where R_i = d̂_i − d̂*_i is the residual disparity map and k indexes the halved-resolution
pyramid levels. Note: s in L_reg is absorbed into the aligned maps — this is not the same
as the NMG loss of Wang et al. [33] which computes gradients before scale estimation.

**Final per-dataset loss** (Eq. 12):

```
L_l = (1/N_l) Σ_{n=1}^{N_l} [ L_ssi(d̂_n, (d̂*)_n) + α · L_reg(d̂_n, (d̂*)_n) ]
```

with α = 0.5 (empirical).

**Multi-dataset mixing** (Eq. 13): treat each training dataset as a separate task and seek
a Pareto-optimal solution using the multi-task learning algorithm of Sener & Koltun [12]:

```
min_θ  (L_1(θ), ..., L_L(θ))
```

where θ are shared model parameters. This dominates naive equal-parts mixing; see Tables
6–9 for ablation.

# Assumptions

1. **Relative depth suffices**: the output is disparity up to affine ambiguity; metric
   depth is not recovered. Hard constraint — the loss explicitly discards global scale
   and shift.
2. **Image contains exploitable depth cues**: shading, perspective lines, occlusion,
   familiar object sizes. Soft — degrades gracefully on abstract inputs but still
   produces plausible structure in practice (see §6 and §4 Figure 8).
3. **Vertical image orientation**: training data has a consistent sky-up bias (lower
   image regions are closer to the camera). Hard failure on 90°-rotated inputs.
4. **Scene is optically opaque**: mirrors and framed artwork fool the network — it
   reads the depicted scene's depth, not the physical reflector plane.
5. **Encoder benefits from ImageNet pretraining**: random-init encoder performs ~35%
   worse on average; pretraining is treated as mandatory. Soft — random init works but
   is dominated.
6. **Static background in training sets**: SfM-based ground truth (MegaDepth) misses
   independently moving objects. Soft — 3D movies, WSVD, and ReDWeb partially
   compensate with dynamic objects.

# Failure regime

- **90° rotated images**: the gravity-aligned depth prior fails; ground plane is not
  recovered (§6, Fig. 9 first row).
- **Ground-plane visible at image bottom**: pellets/objects in the lower image portion
  are predicted as closer even when they are not (§6, Fig. 9 first row).
- **Mirrors and framed pictures**: depth follows the depicted scene, not the reflector
  surface (§6, Fig. 9 second row).
- **Thin structures**: can be missed entirely; likely due to limited training resolution.
- **Far-background blurring**: background depth maps become blurry, attributed to
  limited input resolution (384×384) and imperfect ground truth at long range.
- **Disconnected-object relative order**: relative depth between spatially separated
  objects fails in some scenes where no relative depth cues span the gap.
- **Strong edges → hallucinated discontinuities**: sharp edges in texture can produce
  spurious depth jumps.
- **Single-dataset overfitting**: any single dataset (DL → indoor; MD → ETH3D) achieves
  strong in-distribution results at the cost of dramatically worse cross-dataset
  generalization (Table 3). The MIX 5 model avoids this by design.

# Numerical sensitivity

- **Disparity space vs. depth space**: the loss is defined in disparity (d = 1/z), which
  is numerically stable for nearby objects (large disparity) but compresses the
  dynamic range for distant objects. The paper argues this is appropriate since most
  training data (stereo) is naturally in disparity space.
- **Trimming threshold U_m = 0.8M**: removing 20% of residuals was set empirically on
  ReDWeb; changing this value is expected to affect robustness-accuracy trade-off.
- **Gradient regularizer scale levels K=4**: using fewer levels reduces sharpness of
  predicted boundaries.
- **Depth caps for evaluation**: metric-space datasets capped at dataset-specific maxima
  (ETH3D: 72m, KITTI: 80m, NYU/TUM: 10m) before evaluation — results are not
  comparable across cap choices.
- **Input resolution 384×384**: imposed by the encoder's stride constraints (smaller axis
  must be a multiple of 32). Wide-aspect-ratio inputs (KITTI) require special handling
  — smaller axis set to 384 to avoid excessively small images.

# Applicability

- **Use when**: you need a general-purpose relative depth estimator with zero-shot
  cross-dataset behaviour; training data is heterogeneous (stereo, SfM, LiDAR, RGB-D);
  metric depth is not required.
- **Don't use when**: metric depth values are required (use sensor fusion or
  metric-depth fine-tuning); images may be rotated or have reflective surfaces;
  a deterministic latency budget rules out a ResNeXt-101 encoder.
- **Compared against** (zero-shot setting, Table 10–11): Xian et al. [32] (RW baseline),
  Wang et al. [33] (WS), Li & Snavely [11] (MD/MegaDepth), Li et al. [38] (Mannequin
  Challenge). MiDaS MIX 5 outperforms all by a large margin on average rank (2.0 vs.
  5.7+ for next best).

# Connections

- Builds on:
  - Xian et al. [32] — network architecture (ResNet multi-scale encoder-decoder) and
    ordinal loss baseline
  - Sener & Koltun [12] — multi-task / multi-objective optimization used for Pareto
    dataset mixing
  - Eigen et al. [15] — scale-invariant log-depth loss (Eq. 8, reproduced for
    comparison; MiDaS extends to shift invariance and disparity space)
  - Li & Snavely [11] / MegaDepth — multi-scale gradient matching term adapted to
    disparity space (Eq. 11)
- Enables:
  - yang2024-depth-anything (Depth Anything inherits the affine-invariant training recipe
    and multi-dataset mixing strategy from MiDaS)
  - yang2024-depth-anything-v2
  - lin2025-depth-anything-3

# Atlas update plan

## NEW: midas
Type: model
Domain: depth
arch_family: cnn
Primary source: this paper

**Motivation**: No single existing depth dataset covers the full diversity of real-world
scenes. Datasets are individually biased (indoor-only, static-only, specific sensor) and
use incompatible ground-truth representations (metric depth, depth-up-to-scale, disparity
with unknown baseline and shift). MiDaS asks: can a single model trained on five
complementary datasets, with a loss that handles all annotation types, generalize to
held-out datasets without fine-tuning?

**Architecture**: Multi-scale encoder-decoder from Xian et al. [32]. The encoder is a
ResNeXt-101 [61] pretrained first on ~900M weakly-supervised Instagram images (WSL, [63])
then on ImageNet — providing a 15% relative improvement over a ResNet-50-ImageNet baseline
(Fig. 4). The decoder produces a dense disparity map. Input images are resized so the
larger axis = 384 px, shorter axis = multiple of 32. The paper finds that ImageNet
classification accuracy of an encoder strongly predicts monocular depth accuracy (Fig. 4).
DPT (Dense Prediction Transformer) encoder variant is a later addition (MiDaS v3, not in
this paper).

**Training — affine-invariant loss**: Prediction and ground truth are aligned per-image by
solving for scale s and shift t (Eq. 2–4, LS; or Eq. 5–6, robust median-based), then the
trimmed MAE (L_ssitrim, Eq. 7) removes the 20% largest residuals. A multi-scale gradient
matching term L_reg (Eq. 11, K=4 scales, α=0.5) enforces sharp depth boundaries. This
loss family works on all three annotation types (metric, scale-only, scale+shift) in a
unified disparity-space training loop.

**Training — multi-dataset mixing**: Five complementary datasets mixed with Pareto-optimal
multi-objective optimization [12] (Eq. 13): ReDWeb (3.6K, curated stereo), MegaDepth
(130K, SfM), 3D Movies (75K, novel data source from Blu-ray stereo films), WSVD (1.5M,
web stereo video), DIML Indoor (220K, RGB-D). Pareto mixing consistently outperforms
naive equal-parts mixing (Tables 6 vs. 8). Test protocol is zero-shot cross-dataset
transfer: no fine-tuning on any of the six evaluation datasets (DIW, ETH3D, Sintel,
KITTI, NYU, TUM).

**Implementations**: Official — https://github.com/intel-isl/MiDaS (later moved to
https://github.com/isl-org/MiDaS), MIT license.

**Assessment**: MiDaS established the affine-invariant depth loss and principled
multi-dataset mixing as the canonical recipe for robust monocular relative depth. Every
subsequent large-scale monocular depth foundation model (Depth Anything, Depth Anything
V2, Depth Anything 3) directly inherits this training design. The core limitation is
relative-not-metric output: MiDaS gives no absolute scale, which restricts use to tasks
where relative depth order is sufficient.

# Provenance

- §1 Abstract: "robust training objective that is invariant to changes in depth range
  and scale"; "zero-shot cross-dataset transfer" protocol definition.
- §5 "Scale- and shift-invariant losses", Eq. 1–7: complete L_ssi family derivation.
- §5 "Related loss functions", Eq. 8–10: comparison to Eigen log-loss [15], ordinal
  loss [34], and NMG [33].
- §5 "Final loss", Eq. 11–12: gradient matching term and combined loss with α = 0.5.
- §5 "Mixing strategies", Eq. 13: Pareto multi-objective criterion.
- §6 "Comparison of encoders": ResNeXt-101-WSL chosen; random init −35%; Fig. 4.
- §6 Tables 6–9: naive vs. Pareto mixing ablation.
- §6 Tables 10–11: zero-shot state-of-the-art comparison.
- §6 "Failure cases": Fig. 9 — rotation bias, mirror failure, thin structures.
- §7 Conclusion: "Our models are freely available at https://github.com/intel-isl/MiDaS"
- Table 1: training and test dataset summary.
- Table 2: 3D Movies dataset composition (75,074 training frames from 19 films).
