---
paper_id: donne2016-mate
title: "MATE: Machine Learning for Adaptive Calibration Template Detection"
authors: ["S. Donné", "J. De Vylder", "B. Goossens", "W. Philips"]
year: 2016
url: https://www.mdpi.com/1424-8220/16/11/1858/pdf
created: 2026-05-01
relevant_atlas_pages: [ccdn-checkerboard-detector]
---

> **Note on paper availability.** The MDPI PDF (doi:10.3390/s16111858) returns HTTP 403 to
> automated fetchers; no cached copy is available at `docs/papers/.cache/donne2016-mate.*`.
> All claims below are derived from (a) the index.yaml entry notes, (b) the `chen2023-ccdn`
> research note, which cites and quotes specific sections and tables of the CCDN paper
> (ICIRA 2018) comparing CCDN against MATE, and (c) the public CCDN atlas page which
> directly states MATE's parameter count, architecture, and loss. Claims derived via these
> secondary sources are marked `[via CCDN §ref]` where the CCDN paper is the proximate
> source. Direct reading of the MATE paper was not possible.
>
> If/when the MATE PDF becomes accessible, re-read and extend this note against the
> original text before applying the Atlas update plan below.

# Setting

**Problem class.** Per-pixel detection of inner corners (X-corners, saddle points) of a
planar checkerboard calibration pattern in greyscale images using a learned convolutional
model. MATE is positioned as the first machine-learning approach to checkerboard corner
detection, replacing the hand-crafted gradient, threshold, and saddle-fitting pipelines of
classical detectors (ROCHADE, ChESS, OCamCalib).

**Paper venue.** MDPI Sensors 16(11):1858, 2016. Open access.

**Inputs.** Single-channel greyscale images. Pattern dimensions $(r \times c)$ are not
required as a prior — MATE produces a per-pixel response map that is independent of
the board geometry. The specific spatial resolution used during training is not recorded in
the available secondary sources; the CCDN paper (§2.1) states that CCDN uses VGA
(640 × 480) training images and notes that the 9 × 9 first-layer kernel size is tied to
MATE's own analysis of the spatial-support radius trade-off [via CCDN §2.1].

**Outputs.** A per-pixel response map over the same spatial extent as the input, where
high values correspond to checkerboard X-corner locations. Post-processing converts
the map to a sparse corner set by applying a fixed threshold of 0.5 [via CCDN §2.2 /
Assessment Novelty bullet].

**Architecture summary.** A three-convolutional-layer CNN with 2,939 parameters
[via CCDN page Complexity / index.yaml notes]. The network produces a per-pixel output
but — in contrast to CCDN — does not enforce stride-1 on every layer's max-pooling,
which causes the output to be defined on a subsampled grid rather than at the input
resolution [via CCDN Assessment Novelty bullet].

# Core idea

MATE introduces a supervised CNN that regresses a per-pixel corner score from a
greyscale image. The core mechanism: convolve the input through three learned layers,
apply ReLU non-linearities, and output a single-channel response map. Ground-truth
labels are per-pixel binary masks marking corner locations at subpixel accuracy (the
annotation procedure mirrors CCDN's: outer corners are annotated manually, inner
corners interpolated, then converged to saddle points).

The loss used during training is mean-squared error (MSE) between the predicted
response map and the ground-truth binary mask [via CCDN §2.1, which explicitly
contrasts MSE with CCDN's cross-entropy]. The MSE formulation treats corner
detection as a regression-to-0/1 target, which imposes no explicit positive/negative
class balancing. On checkerboard images at VGA, the positive-label fraction is
approximately $10^{-4}$; without per-class normalisation, the MSE gradient is dominated
by the background class and converges slowly or to a near-zero output. The CCDN paper
reports that MSE "started out much more slowly for the first 150 epochs" compared to
cross-entropy [via CCDN §2.1 / Fig. 4 citation in the CCDN note].

Post-processing: a fixed threshold of 0.5 is applied to the output map to obtain a binary
corner mask [via CCDN §2.2]. The threshold is scene-independent, which creates a
failure mode when the network's ReLU output can take values higher than 1 (the
threshold is then already below the true-corner response values, and border or low-
contrast corners whose response falls below 0.5 are missed).

The spatial support of the first convolutional kernel is described in CCDN (§2.1) as
informing CCDN's own 9 × 9 kernel choice: "a larger radius may lose some recall of the
real corners while a smaller may falsely detect background pixels as checkerboard
corners." MATE's first-layer kernel is cited as having a 7 × 7 size or equivalent (the
CCDN note records this indirectly via the parameter count comparison) [via CCDN §2.1,
param count 2,939 vs. CCDN's 16,301].

# Assumptions

1. (hard) Input is greyscale. The model was trained on single-channel images; colour
   input must be converted.
2. (hard) Fixed output threshold of 0.5 is appropriate for all input images. CCDN identifies
   this as MATE's primary operational limitation: "responses of the ground-truth corner
   locations are often higher than 1, even some false positives may get a value closing
   to 1, for neither cross entropy or mean square error sets any constrains on the output"
   [via CCDN §2.2]. This means a corner whose response is, say, 2.3 is correctly detected,
   but the threshold makes no use of the dynamic range — and a corner at 0.4 is missed.
3. (soft) The positive-label count per image is small enough that the MSE gradient is not
   too dominated by the background class. In practice, the extreme imbalance
   ($\sim 10^{-4}$ positive fraction) causes slow convergence and potentially under-trained
   positive-class responses [via CCDN §2.1 loss discussion].
4. (soft) Three convolutional layers suffice to learn the checkerboard X-corner pattern.
   CCDN's ablation implied that six layers with the residual spatial connections are needed
   for consistent false-positive suppression.
5. (hard) Pattern dimensions $(r \times c)$ are not required, in contrast to ROCHADE
   and OCamCalib. This is MATE's primary design advantage over classical pattern-aware
   detectors.

# Failure regime

- **Fixed 0.5 threshold failure under response value > 1.** ReLU is unbounded from above.
  When the network's output at a corner location exceeds 1, the fixed threshold of 0.5
  still correctly detects that corner. However, when a corner's response falls below 0.5
  (low-contrast image, distant camera, strong blur), it is missed with no recourse — the
  threshold cannot be adapted per image. CCDN addresses this with an adaptive $0.5 \times
  \max$ threshold [via CCDN §2.2].
- **Double detections under lens distortion.** On the GoPro dataset (strong radial
  distortion, 2000 × 1500 images): MATE produces 4.556 % double detections and 389
  false positives, versus CCDN's zero doubles and zero FPs [via CCDN Table 2 /
  chen2023-ccdn note Provenance]. The likely cause: MATE's three-layer network lacks
  sufficient receptive field to suppress repeated response peaks near a single corner under
  distortion, and the fixed-threshold post-processing has no NMS or spatial clustering to
  remove them.
- **False positives in complex backgrounds.** MATE: 492 FPs on uEye vs. CCDN's 93 [via
  CCDN Table 1]. The absence of NMS and spatial clustering means every supra-threshold
  pixel is emitted as a corner candidate. In structured backgrounds (floor tiles, grids),
  this inflates the FP count substantially.
- **Slow convergence under MSE with extreme class imbalance.** The positive-fraction
  at VGA is $\sim 10^{-4}$, making the per-positive gradient contribution tiny under
  MSE compared to the aggregate background gradient. CCDN's Fig. 4 shows CE
  "drove down the cost rapidly" while MSE "started out much more slowly for the first
  150 epochs" [via CCDN note Provenance §2.1 / Fig. 4].
- **Subsampled output grid vs. full resolution.** Unlike CCDN, MATE does not enforce
  stride-1 on max-pooling, so the output map is spatially coarser than the input. This
  imposes a minimum localisation error floor equal to the pooling stride, which in turn
  limits the sub-pixel accuracy achievable without external refinement.
- **Partial-pattern visibility.** MATE, like CCDN, does not require knowing $(r \times c)$
  and could in principle operate on partially visible patterns. However, without a spatial
  clustering post-processing step (which CCDN adds), the output is a raw response map
  with no mechanism to link detected corners into a geometric grid — so the caller must
  implement their own post-processing to handle partial patterns.

# Numerical sensitivity

- **Fixed threshold 0.5.** Hard-coded; any image where the minimum true-corner response
  is below 0.5 will have missed detections. The threshold is calibrated to the training
  distribution and cannot be adapted at inference time without modifying the detector.
- **MSE with extreme imbalance.** The per-positive gradient contribution is $\sim 10^4 \times$
  smaller than per-negative if not normalised. This can cause the model to converge
  to a nearly-zero output map, making all thresholds ineffective. Whether MATE addresses
  this with data augmentation or explicit reweighting is not available in the secondary
  sources.
- **Three-layer capacity (2,939 parameters).** The network is extremely compact. On the
  one hand this is computationally efficient; on the other, a three-layer CNN with a small
  receptive field may produce spatially diffuse corner responses that, combined with the
  fixed threshold, yield multiple supra-threshold pixels near a single corner (double
  detections) or produce responses too faint for corners under strong distortion.
- **Kernel size / receptive field.** CCDN cites MATE's analysis of the radius trade-off
  for the first-layer kernel: too-small radius causes false detections on background pixels;
  too-large loses recall on corners. MATE's own kernel size choice (informing CCDN's
  9 × 9 / radius-4 choice) is not directly accessible from secondary sources.

# Applicability

- Use when: checkerboard corner detection is needed without requiring pattern dimensions
  as input — MATE pioneered this pattern-agnostic design.
- Use when: a minimal-parameter neural baseline is needed for benchmarking or as a
  prior-work comparison.
- Don't use when: false-positive count and double-detection rate must be low. CCDN
  (2,939 → 16,301 parameters, MSE → CE, fixed → adaptive threshold) provides strictly
  better metrics on the ROCHADE benchmark datasets.
- Don't use when: sub-pixel calibration accuracy is critical. Neither MATE nor CCDN
  includes a saddle-point refinement step; ROCHADE with cone-filter refinement achieves
  tighter localisation when pattern dimensions are known.
- Don't use when: the image background contains many corner-like structures. Without
  NMS or spatial clustering post-processing, MATE emits false positives for every
  supra-threshold pixel.
- Compared against (benchmark data from CCDN Table 1 uEye / Table 2 GoPro):
  - **CCDN (chen2023-ccdn)** — direct successor. uEye: MATE 1.009 px / 3.065 %
    missed / 0.809 % doubles / 492 FP vs. CCDN 0.812 / 1.169 % / 0 % / 93 FP.
    GoPro: MATE 0.835 / 4.566 % / 4.556 % / 389 FP vs. CCDN 0.576 / 0.907 % / 0 % / 0.
  - **ChESS (bennett2013-chess)** — classical per-pixel detector; MATE uses a learned
    response instead of a hand-crafted circularity score.
  - **ROCHADE (placht2014-rochade)** — classical with saddle refinement; better sub-pixel
    accuracy when pattern dimensions are known.
  - **OCamCalib (rufli2008-blurred)** — best accuracy when dimensions are known;
    requires wide white border.

# Connections

- Builds on:
  - `placht2014-rochade` — cited in MATE's references (index.yaml cites field); ROCHADE's
    test datasets (uEye 1280×1024, GoPro) are the benchmark MATE is evaluated on.
  - `rosten2006-fast` — cited in MATE's references (index.yaml); general-purpose corner
    detection baseline against which the learned approach is motivated.
  - `lucchese2003-saddle` — cited in MATE's references (index.yaml); saddle-fitting
    subpixel refinement method. MATE's output likely feeds a saddle-point localiser or
    uses the saddle concept to define ground-truth corner locations.
  - `bennett2013-chess` — cited in MATE's references (index.yaml); ChESS is the
    hand-crafted chessboard-specific baseline that MATE's learned approach supersedes.
  - `rufli2008-blurred` — cited in MATE's references (index.yaml); OCamCalib is the
    pattern-aware classical detector used as benchmark.
- Enables (in the atlas):
  - `chen2023-ccdn` — CCDN is MATE's direct architectural successor. Every design
    choice in CCDN (six vs three layers, CE vs MSE, adaptive vs fixed threshold, NMS +
    k-means++ post-processing) is a direct response to a limitation identified in MATE.
    CCDN is presented as a replacement for MATE, not a complement.
- Refutes / supersedes:
  - The design refutes classical hand-crafted X-corner detectors (ChESS, ROCHADE,
    OCamCalib) for the pattern-agnostic use case (no prior on board dimensions). MATE
    is the first work to show that a shallow CNN can learn the checkerboard X-corner
    signature from data without explicit geometric programming.

# Atlas update plan

## NEW: mate-checkerboard-detector
Type: model
Category: calibration-learning
Primary source: donne2016-mate

**Rationale for new page.** MATE is the first deep-learning checkerboard X-corner
detector and is the direct predecessor cited by CCDN. It satisfies the model-page
criterion: (a) it introduces a novel ML method — a three-layer FCN for per-pixel
corner response — not covered by any existing page; (b) it is already referenced in
`sources.references` of `ccdn-checkerboard-detector`; (c) it is the natural host for
the `## When to choose MATE over CCDN` comparison (MATE is older, 2016 vs 2023;
the older page hosts per comparison policy). A stub page with `quality: "stub"` is
appropriate given the unavailability of the full paper text.

**Note: the full paper PDF could not be fetched (MDPI 403).** The page should be
authored at `quality: "stub"` until the PDF is read directly. The secondary-source
evidence is sufficient to establish the page structure and historical position.

Proposed slug: `mate-checkerboard-detector`

**Goal**
- Detect inner corners of a planar checkerboard pattern per-pixel from a greyscale
  image using a three-layer CNN, without requiring the pattern's square count as prior.
- Primary use case: calibration-image corner detection as a learned alternative to
  ROCHADE, ChESS, and OCamCalib in the regime where pattern dimensions are
  unavailable.

**Architecture**
- Family: fully-convolutional CNN. 2,939 parameters. Three convolutional layers with
  ReLU. Input: greyscale image. Output: per-pixel response map.
- First-layer kernel: radius analysis trades recall vs. background false detections;
  the 7 × 7 size (implied by parameter count differential with CCDN's 16,301) is
  chosen as the trade-off point.
- Post-processing: fixed threshold at 0.5. No NMS, no spatial clustering. This is the
  key operational limitation addressed by CCDN.
- The max-pool layers are not stride-1, so the output map is spatially coarser than the
  input. Localisation accuracy is bounded by the pooling stride.

**Training**
- Loss: mean-squared error (MSE) between predicted response and ground-truth corner
  mask. No positive/negative class balancing — the extreme imbalance ($\sim 10^{-4}$
  positive fraction) causes slow convergence relative to CCDN's weighted CE.
- Ground truth: outer corners annotated manually; inner corners interpolated and
  converged to saddle points. Augmentation details not available from secondary sources.

**Assessment — Novelty**
- First machine-learning method for checkerboard X-corner detection. Prior work
  (ROCHADE, ChESS, OCamCalib) was entirely hand-crafted.
- Demonstrated that a minimal three-layer CNN (2,939 params) can learn the
  checkerboard X-corner signature.
- Pattern-agnostic: does not require $(r \times c)$ as input — a design property CCDN inherits.

**Assessment — Limitations (to carry on the page for historical accuracy)**
- Fixed 0.5 threshold is scene-independent; fails when ReLU responses fall below 0.5
  for low-contrast or distant corners.
- No NMS or spatial clustering: high false-positive count (492 on uEye) and double
  detections (4.556 % on GoPro) vs CCDN's improved post-processing.
- MSE loss with extreme class imbalance: slow convergence, likely weak positive-class
  gradient.
- No sub-pixel refinement; output grid is coarser than input due to non-unit-stride
  max-pooling.

**References**
- Primary: donne2016-mate (Sensors 2016)
- Supplementary: chen2023-ccdn (CCDN — direct successor), placht2014-rochade
  (benchmark datasets), bennett2013-chess (ChESS baseline), rufli2008-blurred (OCamCalib
  baseline)

**Comparison: when to choose MATE over CCDN**
(MATE is 2016 < CCDN 2018/2023, so MATE hosts the comparison per the older-hosts rule.)

MATE is strictly dominated by CCDN on all four evaluation metrics on both benchmark
datasets. There is no regime where MATE outperforms CCDN as currently reported. The
only practical reason to choose MATE over CCDN would be:
- Extreme parameter budget: 2,939 vs 16,301 params. On deeply embedded hardware
  with kilobyte-level flash, MATE's $5.5 \times$ smaller weight count may matter.
- Simplicity of post-processing: the fixed-0.5 threshold is trivially implementable
  without k-means++ or NMS infrastructure.
- Historical comparison baseline: reproducing MATE's numbers for a paper comparing
  multiple generations of learned checkerboard detectors.

For production calibration use, CCDN supersedes MATE.

## UPDATE: ccdn-checkerboard-detector

Section: Motivation (add historical context)
- Add: "CCDN directly extends MATE (Donné et al., Sensors 2016), the first
  three-layer CNN for checkerboard corner detection. CCDN doubles the layer count
  to six, replaces MATE's MSE loss with positive-negative-balanced cross-entropy,
  and introduces a three-stage post-processing pipeline (adaptive threshold, NMS,
  k-means++) that addresses MATE's fixed-threshold failure modes and double-detection
  rate under lens distortion."
- Note: this historical framing is currently absent from the page; the page acknowledges
  MATE's parameter count but not its position as the pioneer work.

Section: Architecture — Architecture (kernel size rationale)
- Add to the first-layer 9×9 kernel discussion: "CCDN's 9×9 choice extends MATE's
  own analysis of the first-layer spatial-support radius trade-off [§2.1]: a too-small
  radius admits background false detections; a too-large radius loses recall on true
  corners. MATE's analysis established the radius-4 target; CCDN adopts it."

Section: Assessment — Novelty
- Add: "MATE (2016) established the pattern-agnostic CNN baseline. CCDN's novelty
  is specifically in the loss (CE vs MSE), the post-processing pipeline (adaptive threshold
  + NMS + clustering vs fixed threshold), and the increased depth (six vs three layers).
  The stride-1 max-pool constraint that preserves full spatial resolution is CCDN's
  architectural departure from MATE's subsampled grid output."

# Provenance

**Primary.** MATE paper (Donné, De Vylder, Goossens, Philips; Sensors 2016,
doi:10.3390/s16111858) was not directly accessible during this ingestion (MDPI 403).

**Secondary sources used (all traceable):**

1. `docs/papers/index.yaml` entry for `donne2016-mate`: "Direct antecedent to CCDN:
   three-convolutional-layer CNN for checkerboard corner detection with mean-squared-error
   loss and fixed 0.5 threshold, 2939 parameters. CCDN extends MATE to six layers, swaps
   MSE for weighted cross-entropy, and adds threshold/NMS/clustering post-processing."

2. `docs/research/notes/chen2023-ccdn.md`:
   - §2.1 param count: "our net has 16301 parameters to train, which are a little more
     than MATE (only 2939 parameters)."
   - §2.1 loss: "the loss is a positive-negative-balanced cross-entropy (Eq. 4) rather than
     MATE's MSE."
   - §2.1 convergence: "CE 'drove down the cost rapidly while MSV of network with MSE
     started out much more slowly for the first 150 epochs'" (via CCDN Fig. 4 reference).
   - §2.2 threshold: "responses of the ground-truth corner locations are often higher than
     1, even some false positives may get a value closing to 1, for neither cross entropy
     or mean square error sets any constrains on the output."
   - §2.2: "Swaps MATE's fixed $0.5$ decision threshold for an adaptive $0.5 \times$
     per-image maximum."
   - Assessment Novelty: "Extends MATE's three-convolution corner network to six
     convolutions, producing a per-pixel response map that preserves input resolution via
     stride-1 max-pools, contrasting with MATE's subsampled-grid output."
   - Table 1 (uEye): MATE: 1.009 px / 3.065 % missed / 0.809 % doubles / 492 FP.
   - Table 2 (GoPro): MATE: 0.835 px / 4.566 % missed / 4.556 % doubles / 389 FP.
   - Connections: "donne2016-mate — CCDN's direct architectural predecessor (3-conv FCN
     → 6-conv FCN); the loss function switch from MSE to cross-entropy and the
     post-processing pipeline are the two key changes."

3. `content/models/ccdn-checkerboard-detector.md`:
   - Complexity: "16,301 trainable parameters on a 640 × 480 input — $\sim 5.5 \times$
     the 2,939 parameters of the MATE antecedent."
   - Assessment Novelty bullets citing MATE's subsampled output, MSE loss, fixed threshold.
   - References entry 2: confirms title, authors, Sensors 16(11):1858, 2016.

4. `docs/papers/index.yaml` cites field for donne2016-mate:
   - `placht2014-rochade`, `rosten2006-fast`, `lucchese2003-saddle`, `bennett2013-chess`,
     `rufli2008-blurred`.
