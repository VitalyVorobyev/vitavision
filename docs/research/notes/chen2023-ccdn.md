---
paper_id: chen2023-ccdn
title: "CCDN: Checkerboard Corner Detection Network for Robust Camera Calibration"
authors: ["Ben Chen", "Caihua Xiong", "Qi Zhang"]
year: 2023
url: https://arxiv.org/pdf/2302.05097
created: 2026-05-01
relevant_atlas_pages: [ccdn-checkerboard-detector]
---

# Setting

**Problem class.** Per-pixel detection of checkerboard inner corners in greyscale images,
without knowing the number of squares in advance. The design target is calibration
robustness under lens distortion, extreme pose, and sensor noise — the regimes where
hand-crafted detectors (ChESS, OCamCalib, ROCHADE) degrade or fail.

**Inputs.** A single-channel greyscale image of arbitrary spatial size $H \times W$. No
pattern-dimension prior ($r \times c$) is required. Training images are VGA (640 × 480);
at inference the FCN handles any size via the stride-1 constraint.

**Outputs.** A per-pixel response map $L_6(X) \in \mathbb{R}^{H \times W}$ with the same
spatial extent as the input, followed by three post-processing stages that convert the map
into a sparse corner set.

**Paper venue.** ICIRA 2018 oral; uploaded to arXiv February 2023 (arXiv:2302.05097).
The arXiv submission date postdates the conference.

**Ground-truth annotation.** Four outer checkerboard corners annotated manually; inner
corners interpolated and then converged locally to saddle points; outliers removed by
hand (§3). This saddle-interpolation procedure gives sub-pixel ground truth without
requiring a separate calibration target. Per-pixel values normalised to [0, 1] so the
response can be interpreted as a corner-likelihood.

# Core idea

CCDN is a minimal fully-convolutional CNN (6 layers, 16,301 parameters) that regresses
a per-pixel corner score map from a greyscale image. The resolution-preserving property
is enforced by setting stride = 1 on every convolution and every max-pool, combined
with zero-padding (§2.1). The first layer uses a 9 × 9 kernel (spatial support radius 4 px)
to suppress local blur and noise; all subsequent layers use 3 × 3 kernels.

The loss is a positive-negative-balanced cross-entropy (Eq. 4) rather than MATE's MSE.
Balancing is necessary because the positive label fraction is approximately $10^{-4}$
(49–156 corner pixels in a 640 × 480 image). Without per-class normalisation, the
unweighted gradient pushes all outputs toward zero. The output $L_6(X)(x,y)$ is clipped
before computing the log to keep the CE finite: positive pixels are clipped to
$[10^{-6}, 1]$; negative pixels to $[0, 1 - 10^{-6}]$ (Eq. 5).

Post-processing removes false positives in three successive stages (§2.2):
1. **Adaptive threshold**: retain pixels whose response exceeds $0.5 \times \max_{x,y} L_6(X)(x,y)$.
   Rationale: the authors observe that the count of surviving corners scales approximately
   linearly with the image-maximum response, making a fixed threshold invalid across
   scenes with different contrasts.
2. **4 × 4 NMS**: construct 4 × 4 bounding boxes around surviving pixels, apply NMS
   with IoU threshold 0.5, sorted by response. Eliminates clustered false positives caused
   by annotation error and local optima in the network's output.
3. **k-means++ clustering** with $k = 10$, discarding any cluster with fewer than $N_i \geq 2$
   points. Rationale: false positives in complex background scenes scatter randomly away
   from the checkerboard, while true corners cluster tightly; the cluster-size floor prunes
   singletons that cannot be real corners.

The choice of $k = 10$ is empirical, not derived — the paper does not analyse sensitivity
to $k$. The implicit assumption is that the checkerboard and any false-positive concentrations
always fit into 10 clusters; this fails for images with many unrelated texture patches at
corner-like locations.

# Assumptions

1. (hard) Input is greyscale. The model was trained on greyscale images; colour input
   must be converted before inference.
2. (hard) The first convolutional layer's 9 × 9 kernel was chosen for "sufficient recall and
   precision" with spatial support radius 4 px — the paper frames this as a trade-off
   between recall (larger radius) and precision (smaller). For very high-resolution
   images where checkerboard fields are large (> ~30 px), the 4-px radius may be too
   small to suppress edge ringing, though the network can still learn the correct response.
3. (soft) Positive-label count is in the range of 49–156 per 640 × 480 image. The
   per-class normalisation in Eq. (4) handles this range; patterns with far more corners
   (e.g. a 20 × 20 board) or far fewer were not characterised at training time.
4. (soft) The response-maximum scales linearly with the number of corner candidates.
   The adaptive-threshold heuristic $0.5 \times \max$ is valid when this assumption holds.
   In a nearly uniform low-contrast image the maximum may be low, collapsing the
   threshold and admitting excess candidates.
5. (hard) $k = 10$ clusters suffice to capture the checkerboard corners plus any false-positive
   concentrations. Larger boards with many scattered false positives could overflow this.
6. (soft) Training data used 7×7, 6×9, 7×11, 9×9, 12×13 inner-corner boards (§3).
   Generalization to very dense boards (e.g. 20×20) or very sparse boards (e.g. 3×3)
   is uncharacterised.
7. (soft) Training augmentation covers 90/180/270° rotations, intensity inversion,
   Gaussian noise, radial + tangential distortion. Robustness to motion blur, non-uniform
   illumination, or occlusion is uncharacterised.

# Failure regime

- **Complex background with many corner-like false positives.** The k-means++ filter
  assumes false positives scatter away from the checkerboard cluster. Structured backgrounds
  (e.g. floor tiles, brick walls) can produce false-positive clusters at locations remote from
  the board that survive both the threshold and NMS stages, then pass the cluster-size
  floor if enough pixels cluster together. The paper acknowledges this as the motivation
  for the clustering stage but does not characterise the failure boundary.
- **$k = 10$ insufficient.** If the image contains 10 or more distinct compact regions with
  corner-like responses, the cluster assignment is arbitrary and corners may be pruned with
  the false positives. The paper does not report results on such scenarios.
- **Cluster-size floor $N_i \geq 2$ prunes valid sparse corners.** Checkerboard edges
  at the image boundary produce partially-visible corners that may have only one surviving
  pixel after NMS, dropping below the floor. Effectively, CCDN shares ROCHADE's
  "partial pattern" failure mode by a different mechanism: the cluster pruner discards
  singleton corner detections at borders.
- **Sub-pixel accuracy ceiling.** The 5-pixel acceptance radius used in the evaluation
  metric (§4) means the reported accuracy numbers subsume all sub-pixel error within
  5 px. The reported mean accuracies (0.812 px on uEye, 0.576 px on GoPro) are
  per-corner averages only over accepted detections. No sub-pixel refinement is applied;
  a separate saddle-point or corner-refinement step is needed if calibration requires
  < 0.5 px accuracy.
- **OCamCalib dominates when pattern dimensions are known.** OCamCalib achieves
  0.319 px / 0 % missed on uEye and 0.458 px / 0.537 % missed on GoPro — both
  better than CCDN — by exploiting the known pattern size. CCDN's advantage is
  specifically the no-prior-knowledge regime.
- **No trained weights distributed.** The only public implementation is an unlicensed
  TensorFlow repository from 2018 (github.com/AnkaChan/new_chessboards_test)
  with no trained model files. Any deployment requires retraining from scratch with a
  compatible dataset and augmentation pipeline.

# Numerical sensitivity

- **Positive-label count $N_p$ and negative count $N_N$.** If $N_p$ is very small (e.g. a
  3×3 board with 4 inner corners in a 1280×1024 image), the positive loss term has
  very low weight per pixel and each misclassified corner has large gradient; conversely,
  $N_p$ approaching $N_N$ would collapse the class-balancing benefit. Neither edge was
  explored in the paper.
- **Output clipping bounds $10^{-6}$.** The clipping in Eq. (5) ensures finite log during
  training but also means the model can produce responses slightly above 1.0 on
  corner pixels (the paper notes this observation: "responses of the ground-truth corner
  locations are often higher than 1"). This is possible because ReLU is unbounded above.
  The adaptive threshold $0.5 \times \max$ accommodates responses > 1 without issue.
- **L2 regularisation coefficient $\lambda = 0.01$.** Set without ablation — the paper
  asserts this reduces overfitting but does not report the effect of varying $\lambda$.
- **SGD batch size 20, momentum 0.9, initial lr $v_0 = 0.01$.** Standard choices for
  the era (AlexNet training conventions). The staircase decay (Eq. 6) guarantees all
  training samples see the same learning rate within each epoch interval $\tau$.
- **9 × 9 first kernel vs smaller.** The paper cites MATE's analysis: too-small radius
  causes background pixel false detections; too-large causes missed corners. Radius 4 px
  is claimed "sufficient" but no ablation table is provided.
- **k = 10 in k-means++.** Not ablated. The paper uses this fixed value on both datasets.

# Applicability

- Use when: checkerboard corner detection is needed without knowing the pattern
  dimensions in advance. This is the primary design goal and the primary advantage
  over ROCHADE, OCamCalib, and OpenCV's built-in detector.
- Use when: the checkerboard may be partially visible or the border may be cropped —
  CCDN does not need the full $r \times c$ grid. (Caveat: the cluster-size floor can still
  prune sparse border corners.)
- Use when: the image contains lens distortion and extreme poses that degrade
  ROCHADE and ChESS — the training augmentation specifically covers these.
- Use when: a per-pixel corner response heatmap is needed as input to a downstream
  learning pipeline (e.g. keypoint descriptor learning, differentiable calibration).
- Don't use when: sub-pixel calibration accuracy is critical and pattern dimensions are
  known. OCamCalib (0.319 px on uEye) and ROCHADE (with cone-filter refinement)
  outperform CCDN in this regime by exploiting structural priors CCDN lacks.
- Don't use when: no GPU or TensorFlow stack is available and classical alternatives
  are acceptable. The only implementation is TensorFlow with no trained weights; retraining
  requires the original dataset or a compatible substitute.
- Don't use when: the background has many structured corner-like features (floor tiles,
  brick patterns) and $k = 10$ is insufficient to isolate the checkerboard cluster.
- Compared against (paper's Table 1 and Table 2):
  - **OCamCalib** — consistently best accuracy when pattern dimensions are known;
    CCDN trades accuracy for pattern-agnosticism.
  - **ROCHADE** — better sub-pixel accuracy on clean inputs (1.510 px uEye vs
    CCDN's 0.812 px — but ROCHADE's accuracy is *after* saddle refinement while
    CCDN's is raw network output). ROCHADE requires knowing $r \times c$.
  - **ChESS** — CCDN more accurate on both datasets; ChESS has more false positives
    on uEye (11 vs 93 for CCDN — ChESS fewer FP there, but ChESS has 3.398 %
    missed vs CCDN's 1.169 %).
  - **MATE** — CCDN outperforms on all four metrics on both datasets; the main
    improvement is false-positive reduction (492 → 93 on uEye) via the three-stage
    post-processing.

# Connections

- Builds on:
  - `donne2016-mate` — CCDN's direct architectural predecessor (3-conv FCN → 6-conv FCN);
    the loss function switch from MSE to cross-entropy and the post-processing pipeline
    are the two key changes.
  - `harris1988-corner`, `rosten2006-fast` — cited as classical hand-crafted baselines
    that "do not generally work well on chessboard pattern" (§1), motivating the learned approach.
  - `bennett2013-chess` — ChESS; cited as the classical chessboard-specific baseline
    that "will produce a lot of false detections and heavily depends on the hand-crafted
    threshold" (§1).
  - `placht2014-rochade` — ROCHADE; cited as the state-of-the-art classical detector
    whose test datasets (uEye and GoPro) are reused as the CCDN evaluation benchmark.
  - `rufli2008-blurred` — OCamCalib; cited as the top-performing pattern-aware method
    when dimensions are known.
- Enables (in the atlas):
  - `ccdn-checkerboard-detector` — primary source.
- Refutes / supersedes:
  - `donne2016-mate` in the sense of a direct architectural and loss-function improvement.
    CCDN is presented as a replacement for MATE, not as a complementary approach.

# Atlas update plan

## UPDATE: ccdn-checkerboard-detector

The existing public page is architecturally correct and well-grounded. The following
bullets identify gaps, corrections, and extensions relative to the actual paper text.

**Section: Motivation**

- The current motivation correctly states the pattern-agnosticism design goal and names
  the contrast classes (OCamCalib/ROCHADE/ChESS). No gap.
- Minor addition: the paper's venue (ICIRA 2018 oral, §header) is not surfaced anywhere
  on the page. This matters for dating the method — the arXiv 2023 date is misleading;
  the work is from 2018.

**Section: Architecture — Family & shape**

- No gap. The page correctly states FCN, stride-1, input/output shapes, 20 channels,
  16,301 parameters.

**Section: Architecture — Blocks**

- The Mermaid diagram correctly shows the 6-layer structure with two max-pool insertions.
- Verify: the paper's Eq. (3) shows the final layer $L_6(X)$ as a max/ReLU of the
  weighted sum of $L_{5,i}$ channels. The page's description is consistent.
- Add: the rationale for the 9 × 9 first kernel is missing from the page. The paper
  (§2.1, paragraph 2) explains this as a trade-off: "a larger radius may lose some recall
  of the real corners while a smaller may falsely detect background pixels as
  checkerboard corners." The radius-4 choice is tied to MATE's analysis; surface this
  as a design note.

**Section: Architecture — Loss (the `:::definition[Weighted cross-entropy loss]` block)**

- The existing block correctly states $N_p$ / $N_N$ normalisation and $\lambda = 0.01$.
- Verify on output clipping: the paper specifies asymmetric clipping — positive pixels
  to $[10^{-6}, 1]$, negative pixels to $[0, 1 - 10^{-6}]$ (Eq. 5). The current page says
  "clipped to $[10^{-6}, 1]$ on positives and $[0, 1 - 10^{-6}]$ on negatives" — this is
  correct.
- Add: the rationale for the asymmetric clipping. The paper explains (§2.2, threshold
  section) that "responses of the ground-truth corner locations are often higher than 1,
  even some false positives may get a value closing to 1, for neither cross entropy or
  mean square error sets any constrains on the output." The positive clip to $[10^{-6}, 1]$
  only prevents log(0) — it does not cap the actual output, which can exceed 1. The
  adaptive threshold $0.5 \times \max$ is designed to accommodate this.

**Section: Architecture — Post-processing (inline after the :::definition block)**

- The adaptive threshold rationale is missing: the paper justifies $0.5 \times \max$ by
  observing that "the number of corner points is approximately linear with the maximum
  of responses" (§2.2). Add this one sentence.
- The k-means++ rationale is missing. Paper §2.2: "the checkerboard has a very regular
  geometric property, while the false positives are distributed randomly and a little away
  from the checkerboard in the image." The cluster-size floor $N_i \geq 2$ drops
  singletons that by definition cannot be checkerboard corners (a corner always has at
  least a few response pixels in its vicinity after NMS). Add as a brief note.
- The value $k = 10$ is stated but not motivated on the page. The paper does not provide
  a derivation — it is empirical. Note this explicitly: "k = 10 is empirical; the paper
  provides no sensitivity analysis."

**Section: Architecture — Training**

- The page notes "8,900 grayscale VGA (640 × 480) images" and augmentation. Correct.
- Missing: the positive-label count per image — the paper states "only few true positives
  (49, 54, 81, and 156 for our training set)" corresponding to the four board sizes
  7×7=49, 6×9=54, 7×11=77→81?, 9×9=81, 12×13=156 inner corners. This grounds
  the motivation for per-class normalisation numerically. Add to sources.notes or as
  a parenthetical.
- Missing: the paper's explicit comparison of CE vs MSE convergence (Fig. 4): CE
  "drove down the cost rapidly while MSV of network with MSE started out much more
  slowly for the first 150 epochs." This is relevant to the loss design rationale.
- Missing: venue context (ICIRA 2018). Add a note in sources.notes.

**Section: Assessment — Novelty**

- Current bullets are correct. Add: the 9×9 first-layer kernel size is itself a design
  contribution relative to MATE's 7×7 (based on the MATE paper's radius analysis),
  explicitly chosen for the blur/noise suppression trade-off.

**Section: Assessment — Strengths**

- The existing bullets correctly cite Table 1 and Table 2 numbers. No gap.
- Add: on the GoPro dataset under strong lens distortion, CCDN achieves zero double
  detections and zero false positives, while MATE has 4.556 % doubles and 389 FPs.
  The existing page mentions FP reduction but not the double-detection elimination.

**Section: Assessment — Limitations**

- Add: "The reported accuracy (0.812 px uEye, 0.576 px GoPro) uses a 5-pixel
  acceptance radius (§4); the true sub-pixel error is unknown and requires external
  refinement." This precondition is buried in §4 and not on the page.
- Add: "k = 10 in k-means++ is empirical and untested on dense boards (> 13×13
  inner corners) where the cluster count may be insufficient."
- Add: "The arXiv upload date (2023) postdates the actual work (ICIRA 2018), which
  predates the deep-learning chessboard detection literature by ~5 years. Direct
  comparison with post-2020 learned detectors is missing."
- Strengthen: the unlicensed-implementation bullet already on the page is correct;
  clarify that no trained weights are distributed alongside the code.

**Section: References**

- No change needed. All 5 entries are correct and grounded.

**Comparison policy implications (do not add to public page prose)**

CCDN (2023 arXiv, ICIRA 2018) vs classical chessboard X-corner detectors:

- chess-corners (bennett2013-chess, 2013) is older → chess-corners hosts the
  `## When to choose ChESS over CCDN` section. Both research notes now exist.
- rochade (placht2014-rochade, 2014) is older → rochade hosts the comparison section.
  Both research notes now exist.
- pyramidal-blur-aware-xcorner (abeles2021-pyramidal, 2021) is older → pyramidal
  page hosts the comparison section. Both research notes exist (abeles2021-pyramidal.md).

Survey concept-page candidate: "deep-learning vs classical chessboard X-corner detection"
would cover CCDN, MATE (donne2016-mate), SuperPoint (general DL baseline), ChESS,
ROCHADE, pyramidal. Research notes exist for CCDN, ROCHADE, and pyramidal; bennett2013
and abeles2021 notes also exist. Criterion: ≥3 surveyed papers with notes — met. ≥800 words
and decision table: would be met. Flag for future concept-page authoring when donne2016-mate
is also ingested.

# Provenance

- Full paper text: `docs/papers/.cache/chen2023-ccdn.txt` (11 pages, ICIRA 2018 oral,
  arXiv:2302.05097).
- Abstract: "can maintain high accuracy on inputs under multiply scenarios without any
  prior knowledge of the checkerboard pattern" — primary design claim.
- §2.1 Architecture (pp. 2–4): six convolutions; 9×9 first kernel; ReLU after each;
  2×2 max-pools after conv1 and conv4; stride 1 on all layers and max-pools; zero-padding
  preserves spatial size. Eq. (1)–(3) define per-layer activations. Eq. (3) is the
  single-channel output head $L_6(X)$.
- §2.1 Kernel size rationale (p. 3): "a larger radius may lose some recall of the real
  corners while a smaller may falsely detect background pixels as checkerboard corners.
  To make a tradeoff between recall and precision, here we choose the spatial support
  radius of four pixels." Direct motivation for 9×9.
- §2.1 Parameter count (p. 4): "our net has 16301 parameters to train, which are a
  little more than MATE (only 2939 parameters)."
- §2.1 Loss function (p. 4): Eq. (4) weighted CE + L2; Eq. (5) asymmetric clipping.
  "only few true positives (49, 54, 81, and 156 for our training set) of all effective
  input samples" — justification for $N_p$/$N_N$ normalisation.
- §2.1 Training (p. 5): SGD, batch 20, momentum 0.9, $v_0 = 0.01$, Eq. (6) staircase
  exponential LR. "i/τ⌊ ⌋ with ⌊⌋ denoting floor operation, guarantees the decayed
  learning rate follows a staircase function so that all samples can be trained with same
  rate."
- §2.2 Threshold (p. 5): "responses of the ground-truth corner locations are often higher
  than 1, even some false positives may get a value closing to 1, for neither cross entropy
  or mean square error sets any constrains on the output." Rationale for values > 1 and
  for adaptive threshold.
- §2.2 Threshold (p. 5–6): "the number of corner points is approximately linear with
  the maximum of responses. Here we set half of the maximum as the threshold, which
  is proved to be useful for most cases." Justification for $0.5 \times \max$ rule.
- §2.2 NMS (p. 6): "Construct bounding-boxes (with area of 4 × 4 pixels) centered
  around the remaining locations, then apply NMS on them based on the sorted response
  values, the satisfactory results can be got with the threshold at 0.5."
- §2.2 Clustering (p. 6): "the checkerboard has a very regular geometric property,
  while the false positives are distributed randomly and a little away from the checkerboard
  in the image." Rationale for spatial clustering. "k = 10"; "eliminate points in the
  cluster with $N_i < 2$."
- §3 Datasets (pp. 6–7): 8,900 total images; 8,000 train / 900 validation; five board
  types (7×7, 6×9, 7×11, 9×9, 12×13); augmentation: 90/180/270° rotation, intensity
  inversion, Gaussian noise, radial + tangential distortion; all converted to VGA greyscale.
  Test sets reused from ROCHADE (uEye 1280×1024; GoPro 4000×3000 → 2000×1500).
- §4 Experiments (pp. 8–9): 5-pixel acceptance radius for "true corner" classification.
  Table 1 (uEye): CCDN 0.812 px / 1.169 % / 0 % / 93 FP; MATE 1.009 / 3.065 /
  0.809 / 492; ChESS 0.946 / 3.398 / 0 / 11; ROCHADE 1.510 / 2.895 / 0 / 1;
  OCamCalib 0.319 / 0 / 0 / 0.
  Table 2 (GoPro): CCDN 0.576 / 0.907 / 0 / 0; MATE 0.835 / 4.566 / 4.556 / 389;
  ChESS 1.389 / 5.481 / 0.222 / 56; ROCHADE 1.807 / 5.593 / 0 / 3;
  OCamCalib 0.458 / 0.537 / 0 / 0.
- §4 (p. 9): "OCamCalib performs the best on the two datasets, but it requires the
  number of squares in checkerboard pattern in advance (that's why it didn't get any
  false positives and double detections), and it can only be used on the checkerboards
  with wide white border." — OCamCalib's white-border requirement is mentioned only
  here; not on the current public page.
- §5 Conclusion (p. 9): "contains six convolutional layers and about 16000 parameters."
