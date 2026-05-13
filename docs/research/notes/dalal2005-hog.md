---
paper_id: dalal2005-hog
title: "Histograms of Oriented Gradients for Human Detection"
authors: ["N. Dalal", "B. Triggs"]
year: 2005
url: https://inria.hal.science/inria-00548512
created: 2026-05-12
relevant_atlas_pages: [viola-jones-detector]
---

# Setting

**Problem class**: Dense gradient-histogram descriptor for windowed object detection, evaluated on pedestrian / human detection. The paper asks which feature set enables a linear SVM to discriminate humans from non-human background patches with high accuracy.

**Inputs**: An RGB image (optionally grayscale or LAB). A sliding detection window — the paper's primary evaluation uses 64×128 pixels for pedestrian detection (§6, §6.5), which includes roughly 16 pixels of margin around the person on each side. The detector is run at multiple scales by building an image pyramid.

**Outputs**: A per-window binary score from a linear SVM trained on HOG descriptor vectors. At inference time, the sliding-window pyramid is scanned at all positions and scales, and conventional non-maximum suppression is applied to the score map to produce final bounding boxes (§3, Fig. 1). The paper focuses on the feature-extraction stage rather than the full detector pipeline.

**Datasets**: MIT pedestrian database (509 train / 200 test images) and the authors' new INRIA pedestrian dataset (1805 64×128 positive images from personal photos, 1218 person-free negatives, hard-example mining) (§4).

# Core idea

HOG divides a detection window into a dense, overlapping grid of small spatial regions called **cells**, computes a 1-D histogram of gradient orientations for each cell, groups cells into larger **blocks** for local contrast normalization, and concatenates all normalized block descriptors into a single feature vector that is fed to a linear SVM. The four stages — gradient computation → spatial/orientation binning into cells → block normalization → SVM classification — are summarized in Fig. 1 of the paper.

**Gradient computation**: The centred 1-D derivative filter `[-1, 0, 1]` (applied separately in x and y with no prior smoothing, σ=0) gives the best results (§6.2, Fig. 4a). For colour images, the gradient vector is taken from the colour channel with the largest norm (§6.2).

**Spatial/orientation binning (cells)**: Each pixel casts a weighted vote proportional to the gradient magnitude into one of **9 orientation bins** spanning 0°–180° (unsigned gradient — sign is discarded) (§6.3, Fig. 4b). Default cell size is **8×8 pixels**. Votes are bilinearly interpolated between adjacent bin centres in both orientation and position (§6.3).

**Block normalization**: Cells are grouped into **2×2 cell blocks** (i.e., 16×16 pixels) with a **block stride of 8 pixels** (50% overlap, 4-fold area coverage) (§6, default descriptor). A Gaussian spatial window with σ = 0.5 × block width (σ = 8 px) downweights pixels near block edges before accumulating votes (§6.4). The unnormalized descriptor vector **v** for each block is normalized with **L2-Hys**: L2-normalize, clip values to 0.2, renormalize (§6.4). This matches Lowe's SIFT clipped L2 norm [12].

**Descriptor dimension**: For the 64×128 window with 8×8 cells, 2×2 blocks, and 8 px stride, there are (64/8 − 1) × (128/8 − 1) = 7 × 15 = 105 block positions, each contributing 4 cells × 9 bins = 36 values, giving **3780-dimensional** descriptor vector (derived from §6 default descriptor parameters).

**SVM classifier**: A soft linear SVM (C=0.01) trained with SVMLight. A Gaussian kernel SVM (`exp(−γ‖x₁−x₂‖²)`) improves performance by ~3% at 10⁻⁴ FPPW at much higher runtime cost (§6.6, Fig. 4f).

# Assumptions

1. **Person is roughly upright** (hard). The paper explicitly restricts to "mostly visible people in more or less upright poses" (§1, §4). Non-upright or severely articulated poses are not handled by the fixed-window detector.
2. **Reasonably stable local contrast around body contours** (soft). Per-block normalization handles moderate illumination variation. The detector cues on silhouette contrast against background (Fig. 6); very low contrast silhouettes (e.g., camouflage, overexposure) degrade performance gracefully.
3. **Sufficient image margin around the person** (soft). The 16-pixel border around the 64×128 window provides context that meaningfully aids detection; reducing the border from 16 to 8 px (48×112 window) costs 6% at 10⁻⁴ FPPW (§6.5, Fig. 4e).
4. **No prior smoothing / scale normalization below the pyramid level** (hard). The gradient must be computed at the finest available scale in the current pyramid layer. Any Gaussian smoothing before gradient computation damages performance: moving from σ=0 to σ=2 reduces recall from 89% to 80% at 10⁻⁴ FPPW (§6.2, Fig. 4a).
5. **Unsigned orientation is adequate** (soft). For human detection the sign of gradient contrast is largely uninformative due to clothing variability. Signed orientations (0°–360°, 18 bins) decrease performance even when the bin count is doubled to preserve resolution (§6.3). This assumption does not hold for all object classes (e.g., cars, motorbikes).
6. **Single detection window size per pyramid level** (hard). The paper's fixed-template detector does not handle articulated or strongly deforming objects. The authors acknowledge this and list parts-based extensions as future work (§7).

# Failure regime

- **No smoothing rule is violated**: any pre-gradient Gaussian smoothing — even σ=0.5 — visibly degrades detection; σ=2 drops recall from 89% to 80% at 10⁻⁴ FPPW (§6.2, Fig. 4a). This is the single most damaging parameter choice.
- **Block normalization omitted**: omitting normalization entirely reduces performance by 27% at 10⁻⁴ FPPW. Simple L1-norm alone loses 5% relative to L2-Hys (§6.4, Fig. 4c).
- **Too few orientation bins**: performance degrades sharply below 9 bins; 4 bins are substantially worse than 9 (§6.3, Fig. 4b). Benefits plateau at 9 unsigned bins.
- **Non-overlapping blocks**: non-overlapping blocks (stride = 16, 0% overlap) are 4% worse than 50% overlap (stride = 8) at 10⁻⁴ FPPW; 75% overlap (stride = 4) gives marginal further gain (§6.4, Fig. 4d).
- **Binary edge voting instead of magnitude-weighted voting**: replacing gradient-magnitude-weighted votes with binary edge presence (EC-HOG) reduces performance by 5% at 10⁻⁴ FPPW (§5).
- **Cells too large or too small**: 6–8 px cells work best (matching average human limb width in training images); larger cells lose fine spatial resolution, smaller cells degrade normalization quality (§6.4, Fig. 5).
- **Signed gradients for pedestrians**: including gradient sign (0°–360°) decreases performance owing to clothing colour variability (§6.3).
- **PCA-SIFT and wavelet alternatives**: HOG outperforms PCA-SIFT and Haar/generalized-Haar wavelets by at least an order of magnitude in FPPW on INRIA (§5, Fig. 3).

# Numerical sensitivity

- **Clipping threshold for L2-Hys**: maximum component value is clipped to **0.2** before renormalization (§6.4). This constant is taken directly from Lowe's SIFT [12]. Varying it over a moderate range changes results little, but the paper does not quantify the sensitivity.
- **Gaussian block window σ**: set to **0.5 × block width** (σ = 8 px for 16×16 px blocks) (§6.4). Performance improves by 1% at 10⁻⁴ FPPW relative to no weighting.
- **SVM regularization C**: soft linear SVM with C = 0.01 (§6.6). The paper notes the results are "insensitive to ε's value over a large range" for the block normalization regularizer ε (§6.4), suggesting well-conditioned descriptors.
- **Kernel SVM γ**: Gaussian kernel `exp(−γ‖x₁−x₂‖²)` with best γ ≈ 3×10⁻² on INRIA (§6.6, Fig. 4f).
- **Orientation bin interpolation**: bilinear interpolation in both orientation and position reduces aliasing artifacts; without it, quantization error would accumulate into descriptor components.
- **Descriptor dimension**: For the 64×128 window, descriptor is **3780-dimensional** (7 × 15 block positions × 4 cells/block × 9 bins/cell). Larger window margins or different block geometries change this linearly.
- **Image margin**: The 16-pixel border is a meaningful hyperparameter. Reducing it to 8 px costs 6% at 10⁻⁴ FPPW (§6.5). The full 64×128 window is important even at the cost of resolution.

# Applicability

- **Use when**: dense, robust gradient-histogram features are needed for a fixed-window sliding-detector setup; the target object class has consistent spatial structure (upright humans, pedestrians); you have a moderate compute budget and require no GPU (descriptor extraction is CPU-friendly); the dataset is large enough to train a linear SVM (INRIA uses ~2478 positives + ~12180 negatives plus hard examples).
- **Don't use when**: real-time inference with a soft-limit of <1 ms per window is required (dense HOG over a scale pyramid is O(N²) in image size × bin count); objects are strongly non-upright or highly articulated (the fixed window fails); you need a rotation-invariant descriptor (HOG is not rotation invariant — it captures global orientation at window scale); you have a modern GPU and a large labelled dataset (CNN detectors supersede HOG for accuracy).
- **Compared against** (all from §5, Fig. 3 of the paper):
  - Generalized Haar wavelets (extended rectified Haar-like wavelets, [17])
  - PCA-SIFT (gradient images projected onto PCA basis, [11])
  - Shape Contexts (log-polar edge-count histograms, [1])
  - Viola et al. Haar+AdaBoost cascade [22] (moving pedestrian detector)
  - MIT parts-based and monolithic detectors [17,18]

# Connections

- **Builds on**:
  - `lowe2004-sift` — SIFT (Lowe 2004) is the direct inspiration; the paper explicitly credits SIFT for the idea of combining local orientation histograms with spatial grids and per-block normalization (§1, §3, §6.4 footnote [12]). HOG drops SIFT's scale/rotation invariance to gain density and speed.
  - Freeman & Roth 1995 [4] — earlier edge-orientation histograms for hand gesture recognition; cited as precursor (§3, §6.4).
  - Belongie et al. Shape Contexts [1] — studied alternative cell/block shapes; C-HOG is directly inspired (§3, §6.4).
- **Enables**:
  - Deformable Part Models (Felzenszwalb et al. 2010) use HOG as their underlying descriptor — but the DPM paper ID is not currently in `docs/papers/index.yaml`, so no ID is listed here.

# Atlas update plan

## NEW: hog-descriptor
Type: algorithm
Category: feature-descriptor
Primary source: dalal2005-hog

**Goal**:
- Compute a dense, locally-normalized gradient-orientation histogram descriptor from a fixed-size image window, enabling robust human/pedestrian detection via a linear SVM.
- Validated on MIT pedestrian (near-perfect) and INRIA pedestrian datasets (§4, §5).
- Inputs: RGB (or grayscale/LAB) image window, typically 64×128 px. Outputs: 3780-d feature vector for a linear SVM score.

**Algorithm**:
- Stage 1 — Gradient computation: apply centred `[-1, 0, 1]` filter with no smoothing (σ=0); for colour, take gradient from the channel with largest norm (§6.2).
- Stage 2 — Spatial/orientation binning into 8×8 px cells: 9 unsigned orientation bins (0°–180°); bilinear interpolation across adjacent bins and positions; vote weight = gradient magnitude (§6.3).
- Stage 3 — Block normalization: group 2×2 cells into 16×16 px blocks; stride 8 px (50% overlap); apply Gaussian spatial window σ=8 px; normalize with L2-Hys (clip at 0.2, renormalize) (§6.4).
- Stage 4 — Classifier: concatenate all block descriptors → 3780-d vector → linear SVM (§6.6).
- Two block geometries: R-HOG (rectangular) and C-HOG (circular log-polar). R-HOG is the standard form; C-HOG offers marginally better results at more complexity (§5, §6.4).

**Implementation**:
- Cell size 8×8 px and block stride 8 px are the primary tuning knobs (Fig. 5).
- No Gaussian smoothing before gradient computation; this is counter-intuitive but empirically critical (§6.2, Fig. 4a).
- L2-Hys normalization with clip threshold 0.2 is equivalent in practice to L2-norm and L1-sqrt; L1-norm alone is 5% worse; no normalization is 27% worse (§6.4, Fig. 4c).
- Hard-negative mining (retrain on false positives from the negative training set) improves final detection performance by ~5% at 10⁻⁴ FPPW (§4).
- At inference: slide window across image pyramid; apply non-maximum suppression on score pyramid (§3, Fig. 1).

**Remarks**:
- The detector cues primarily on silhouette contrast (head, shoulders, feet) against background, not internal body texture (Fig. 6). This explains why signed gradients are unhelpful for pedestrians: contrast direction inside clothing is uninformative.
- HOG is the descriptor underlying Deformable Part Models and was the dominant pedestrian detection baseline for ~5 years before CNN-based detectors (R-CNN family) took over.
- Compared with Viola-Jones (Haar+AdaBoost cascade): both are classical sliding-window detectors. Viola-Jones targets frontal faces with a cascade for fast rejection; HOG + linear SVM targets full-body pedestrians without a cascade but with a richer descriptor. For pedestrian detection in 2005, HOG reduces FPPW by more than an order of magnitude versus Haar-wavelet baselines (§5, Fig. 3).

**References**:
- `dalal2005-hog` (primary)
- `lowe2004-sift` (upstream inspiration)

Relations:
- { type: compared_with, target: viola-jones-detector, confidence: medium, caution: "Both classical sliding-window detectors. Viola-Jones: Haar features + AdaBoost cascade on faces. HOG: gradient histograms + linear SVM on pedestrians. Different targets but peer practitioner choices of the same era." }

## UPDATE: viola-jones-detector
Section: Remarks
Bullets to add:
- HOG + linear SVM (Dalal & Triggs, CVPR 2005) is the peer classical sliding-window detector for full-body pedestrian detection; it outperforms Haar-wavelet-based detectors (including an extended version of the Viola-Jones feature set) by more than an order of magnitude in FPPW on INRIA (§5, Fig. 3 of that paper). See `hog-descriptor` for a direct comparison.

# Provenance

All claims below are anchored to specific paper sections, figures, or tables.

| Claim | Source |
|---|---|
| `[-1, 0, 1]` centred derivative with σ=0 is best gradient filter | §6.2, Fig. 4(a) |
| σ=0→σ=2 drops recall from 89% to 80% at 10⁻⁴ FPPW | §6.2, Fig. 4(a) |
| Gradient from max-norm colour channel | §6.2 |
| 9 unsigned (0°–180°) orientation bins | §6.3, Fig. 4(b); §6 default descriptor |
| Bilinear interpolation across bins and positions | §6.3 |
| Vote weight = gradient magnitude (magnitude > sqrt > binary) | §6.3 |
| Binary edge voting loses 5% vs magnitude-weighted at 10⁻⁴ FPPW | §5 |
| Default cell size 8×8 pixels | §6 default descriptor |
| Block = 2×2 cells = 16×16 px | §6 default descriptor |
| Block stride 8 px (50% overlap) | §6 default descriptor; Fig. 4(d) |
| Gaussian block window σ = 0.5 × block width (= 8 px) | §6.4 |
| Overlap improves perf by 4% (stride 8 vs 16) at 10⁻⁴ FPPW | §6.4, Fig. 4(d) |
| L2-Hys = L2-norm + clip to 0.2 + renormalize, from Lowe [12] | §6.4 |
| L2-Hys ≈ L2-norm ≈ L1-sqrt; L1-norm –5%; no-norm –27% at 10⁻⁴ FPPW | §6.4, Fig. 4(c) |
| Descriptor dimension 3780 for 64×128 window | Derived from §6 default params: 7×15 blocks × 4 cells × 9 bins |
| 64×128 detection window with 16 px margin | §6.5 |
| Reducing margin 16→8 px costs 6% at 10⁻⁴ FPPW | §6.5, Fig. 4(e) |
| Linear SVM C = 0.01 with SVMLight | §6.6 |
| Gaussian kernel SVM improves ~3% at 10⁻⁴ FPPW, best γ ≈ 3×10⁻² | §6.6, Fig. 4(f) |
| Hard-example mining improves by 5% at 10⁻⁴ FPPW | §4 |
| HOG outperforms wavelets by >1 order of magnitude FPPW on INRIA | §5, Fig. 3 |
| Detector cues on silhouette contrast (head/shoulders/feet) | §6.4, Fig. 6 |
| Signed gradients (0°–360°) decrease performance for pedestrians | §6.3 |
| Fine orientation essential; spatial binning can be coarse | §6.7 |
| HOG inspired by SIFT [12] for orientation-histogram-on-grid idea | §1, §3 |
| 3×3 blocks of 6×6 px cells best in ablation: 10.4% miss-rate | §6.4, Fig. 5 |
| 6–8 px cell width matches human limb width in training images | §6.4 |
| INRIA dataset: 1805 positive images, 1218 negative photos | §4 |
| MIT dataset: 509 train / 200 test | §4 |
| R2-HOG (bar detectors added) doubles dimension, improves ~2% | §5 |
