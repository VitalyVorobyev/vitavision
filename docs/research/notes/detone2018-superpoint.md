---
paper_id: detone2018-superpoint
title: "SuperPoint: Self-Supervised Interest Point Detection and Description"
authors: ["D. DeTone", "T. Malisiewicz", "A. Rabinovich"]
year: 2018
url: https://arxiv.org/abs/1712.07629
created: 2026-05-01
relevant_atlas_pages: [xfeat]
---

# Setting

**Problem class.** Joint detection and description of 2D interest points (keypoints) in full-resolution grayscale images, for use in multi-view geometry tasks: visual SLAM, Structure-from-Motion, homography estimation, and image matching.

**Inputs.** A single grayscale image $I \in \mathbb{R}^{H \times W}$. No calibration, no depth, no stereo pairing required at inference time. The model is trained at $240 \times 320$ resolution on MS-COCO (grayscale-converted); inference is demonstrated at $480 \times 640$.

**Outputs.** Two simultaneous outputs, produced in a single forward pass:

1. **Interest point heatmap** — per-pixel probability of "point-ness," extracted as a score map of shape $\mathbb{R}^{H \times W}$ after decoding from the detector head's $\mathbb{R}^{H_c \times W_c \times 65}$ tensor. Typically thresholded and NMS-filtered to produce up to $N$ sparse keypoint coordinates.
2. **Dense descriptor map** — $\mathbb{R}^{H \times W \times D}$ tensor of L2-normalised descriptors ($D = 256$ in all paper experiments), upsampled via bicubic interpolation from the semi-dense decoder output at $H_c \times W_c$ resolution. Descriptor sampling at detected keypoint locations costs ~1.5 ms on CPU for $N = 1000$ points (§7.1).

**Guarantees.** No geometric guarantees: the heatmap reflects learned "point-ness" from training on pseudo-labels rather than any analytically defined cornerness criterion. Descriptor discriminability is empirical — verified on HPatches (§7.3) but not formally bounded.

# Core idea

SuperPoint introduces a two-stage self-supervised training pipeline to circumvent the absence of labelled interest-point data in real images.

**Stage 1 — MagicPoint on synthetic shapes.** A fully-convolutional network (the SuperPoint encoder + detector head, without the descriptor head) is trained with full supervision on *Synthetic Shapes*: rendered images of triangles, quadrilaterals, lines, cubes, checkerboards, and stars, for which ground-truth corner locations are unambiguous (§4). The resulting model, called MagicPoint, is strongly supervised on geometric primitives and transfers partially to real images.

**Stage 2 — Homographic Adaptation on real images.** MagicPoint is applied to $N_h$ randomly-warped copies of each MS-COCO image (the paper uses $N_h = 100$ as the cost-effective plateau; §5.2). Each warp is a random homography composed from translation, scale, in-plane rotation, and symmetric perspective distortion (§5.2, Figure 6). Keypoint detections are backprojected through the inverse homography and aggregated:

$$\hat{F}(I; f_\theta) = \frac{1}{N_h} \sum_{i=1}^{N_h} H_i^{-1} f_\theta(H_i(I)) \quad \text{(eq.~10)}$$

The aggregated heatmap forms *pseudo-ground-truth* labels for each real image. These labels are richer and more repeatable than MagicPoint's direct detections because any point that is consistently detected across many viewpoints is promoted.

**Joint training — descriptor head added.** The full SuperPoint network (shared encoder + detector head + descriptor head) is then trained on MS-COCO image pairs related by a known random homography (§6). Both heads are optimised simultaneously using paired ground-truth correspondences induced by the homography. The total loss (eq. 1) is:

$$\mathcal{L}(X, X', D, D'; Y, Y', S) = \mathcal{L}_p(X, Y) + \mathcal{L}_p(X', Y') + \lambda \mathcal{L}_d(D, D', S)$$

where $\lambda = 0.0001$ balances the two terms. The detector loss $\mathcal{L}_p$ is a fully-convolutional cross-entropy (eq. 2–3) over the $65$-class cell softmax, where 64 classes correspond to pixel positions within an $8 \times 8$ cell and class 65 is a "no-interest-point" dustbin. The descriptor loss $\mathcal{L}_d$ is a hinge loss (eq. 5–6) with positive margin $m_p = 1$ and negative margin $m_n = 0.2$, applied to all $H_c W_c \times H_c W_c$ cell-pair correspondences $S$ derived from the known homography.

**Architecture.** The shared encoder is VGG-style (§3.1, §6): eight $3 \times 3$ convolutional layers with channel widths 64-64-64-64-128-128-128-128, and a $2 \times 2$ max-pool after every two layers — three max-pools total, yielding $H_c = H/8$, $W_c = W/8$. Each decoder head is a single $3 \times 3$ conv (256 channels) followed by a $1 \times 1$ conv to 65 or 256 channels respectively. All layers use ReLU + BatchNorm. The decoder has no learned upsampling: the detector uses the 65-class sub-pixel convolution ("pixel shuffle") reshape; the descriptor uses bicubic interpolation followed by L2 normalisation (§3.2–3.3).

# Assumptions

1. (hard) The scene contains interest points repeatable under planar homographies. Training supervision derives entirely from homographic correspondences; non-planar 3D motion (parallax, depth variation) is not in the training signal. Generalisation to non-planar scenes is empirical.
2. (soft) The image contains sufficient texture and structure for the VGG encoder to activate discriminatively. Uniform or near-uniform regions produce low detector scores and near-uniform descriptors; matching reliability degrades without degradation signal to the user.
3. (hard) Input is grayscale. The model is trained on grayscale images (§6); no colour channel is used. RGB inputs must be converted before inference.
4. (soft) No explicit scale invariance. The shared encoder uses fixed $3 \times 3$ kernels and the training homographies include moderate scale changes — coverage is empirical. The paper makes no scale-invariance claim. Unlike SIFT, no scale-space is built and no orientation normalisation is applied.
5. (soft) No explicit rotation invariance. Training homographies include in-plane rotation within a limited range. The paper explicitly shows failure at "extreme in-plane rotation not seen in the training examples" (§7.3, Figure 8 caption). ORB, which applies a steered BRIEF descriptor, handles in-plane rotation; SuperPoint does not.
6. (hard) At most one ground-truth corner per $8 \times 8$ cell. If two corners land in the same cell, one is randomly discarded (§6, footnote 2). This limits the effective keypoint density to one per 64 pixels — a design choice, not a capability limit of the encoder.

# Failure regime

- **Extreme in-plane rotation.** Explicitly reported in §7.3 (Figure 8, row 4): "failure case of SuperPoint and LIFT due to extreme in-plane rotation not seen in the training examples." Rotation beyond the training distribution collapses descriptor matching.
- **Non-planar depth variation.** The training supervision assumes planar scenes (homographic correspondences). On scenes with strong parallax — close objects, narrow baselines with depth discontinuities — the pseudo-labels from Homographic Adaptation are corrupted, and descriptor consistency is not guaranteed.
- **Low-texture regions.** The detector produces low-confidence outputs in textureless areas; NMS at a typical threshold returns zero keypoints. Downstream SLAM or SfM degenerates if coverage is required for featureless regions.
- **Keypoint density ceiling.** The $8 \times 8$ cell design caps effective keypoint density to $H W / 64$ points across the image. At $480 \times 640$, the theoretical maximum is 4800 keypoints; the paper evaluates at $N = 1000$.
- **SIFT dominates at sub-pixel localisation.** The paper explicitly reports that SIFT achieves lower mean localization error (MLE = 0.833 vs. SuperPoint's 1.158; Table 4) because SIFT performs sub-pixel refinement via scale-space extrema interpolation, whereas SuperPoint outputs integer-cell-aligned positions with no sub-pixel correction.
- **Descriptor size is fixed at $D = 256$.** The semi-dense descriptor grid runs at $H/8 \times W/8$; bicubic upsampling to full resolution is an approximation. For tasks requiring very dense coverage, the descriptor between detection sites is interpolated and not directly trained.
- **MS-COCO-distribution bias.** The pseudo-labels are generated from MS-COCO generic images (indoors + outdoors, urban). On highly atypical domains (medical images, satellite imagery, underwater) repeatability has not been validated.

# Numerical sensitivity

- **Dustbin class in detector softmax.** The 65-way softmax's dustbin class (class 65) acts as a learned threshold for "no keypoint." Its training weight is coupled to the overall distribution of keypoints per cell in the training set. A scene with many keypoints per cell (e.g., a checkerboard viewed closely) pushes most cells below the dustbin threshold; a sparse scene may inflate false positives. The paper does not characterise sensitivity to keypoint density at test time.
- **Descriptor hinge margins.** Positive margin $m_p = 1$, negative margin $m_n = 0.2$ (§6). These control the descriptor's discriminability gap. Smaller $m_n$ creates tighter repulsion, larger $m_p$ creates looser attraction; the paper presents one tuned configuration without sensitivity ablation.
- **$\lambda_d = 250$ balancing term.** Compensates for the larger number of negative correspondences than positive ones in the descriptor loss (§3.4, §6). An unbalanced training dataset shifts this ratio; the fixed $\lambda_d$ would then over- or under-weight positives.
- **NMS radius effect on repeatability.** Table 3 shows that changing NMS radius from 4 to 8 pixels significantly reduces repeatability on viewpoint changes (viewpoint NMS=4: 0.503, NMS=8: 0.484). Tighter NMS improves raw repeatability counts at the cost of clustering keypoints.
- **$N_h$ in Homographic Adaptation.** Repeatability saturates at $N_h = 100$ (21% boost vs. 22% at $N_h = 1000$; §5.2). Fewer homographies ($N_h = 10$) produce a detectable but smaller gain. The paper treats this as a hyperparameter with a recommended value but no formal optimum.
- **Bicubic interpolation for descriptors.** The descriptor decoder upsamples from $H/8 \times W/8$ to $H \times W$ using bicubic interpolation. This is not learned and introduces smoothing at descriptor boundaries. For downstream tasks requiring sharp descriptor gradients (e.g., guided matching on dense grids), this is a source of approximation error.

# Applicability

- Use when: a learned detector+descriptor is needed for real-time homography estimation, relative pose, or visual SLAM front-ends on GPU hardware. The 70 FPS (Titan X, $480 \times 640$; §7.1) is well below SIFT's CPU runtime.
- Use when: no labelled interest-point data is available in the target domain. The self-supervised pipeline can be re-run via Homographic Adaptation on any unlabelled image collection.
- Use when: descriptor discriminability under illumination change matters more than subpixel localisation accuracy. SuperPoint's NN mAP (0.821) significantly outperforms SIFT (0.694) and ORB (0.735) on HPatches (Table 4).
- Don't use when: subpixel localisation accuracy is required. SIFT's MLE (0.833 px) outperforms SuperPoint (1.158 px) on HPatches (Table 4) because SIFT applies subpixel refinement; SuperPoint outputs cell-aligned integer positions.
- Don't use when: the scene undergoes extreme in-plane rotation. The training homography distribution does not include large rotations; descriptor matching degrades in this regime (§7.3, Figure 8).
- Don't use when: a lightweight, CPU-deployable model is required. The VGG-style encoder with eight $3 \times 3$ conv layers and $D = 256$ descriptor head is not designed for CPU inference. XFeat (potje2024-xfeat) is the direct successor in the hardware-constrained regime.
- Compared against in the paper (§7.3, Tables 3–4):
  - **FAST** — lower detector repeatability under illumination changes (FAST: 0.575 vs. SuperPoint: 0.652 at NMS=4, Table 3); no descriptor.
  - **Harris / Shi-Tomasi** — competitive but lower repeatability under illumination; no descriptor.
  - **SIFT** — better subpixel MLE (0.833 px vs. 1.158 px); comparable homography estimation AUC at $\epsilon=3$ (0.684 vs. 0.676); significantly worse NN mAP (0.694 vs. 0.821).
  - **LIFT** — supervised SfM-trained competitor; SuperPoint outperforms on NN mAP, M. Score, and all homography AUC thresholds (Table 4).
  - **ORB** — highest raw repeatability (0.641), but clustered detections collapse homography estimation accuracy (NN mAP: 0.735; M. Score: 0.266 vs. SuperPoint's 0.470).

# Connections

- Builds on:
  - `rosten2006-fast` — cited as [21] in §2; the paper frames FAST as the prior art that "cast high-speed corner detection as a machine learning problem." MagicPoint is described partly as a fully-convolutional successor.
  - harris1988-corner / shi-tomasi1994-features — cited as [8] and [25]; used as classical comparison baselines on Synthetic Shapes (Table 2) and HPatches repeatability (Table 3). MagicPoint's mAP on Synthetic Shapes with noise: 0.971 vs. Harris 0.213, Shi 0.157 (Table 2).
  - VGG architecture (Simonyan & Zisserman, 2014) — cited as [27]; the encoder is "VGG-style" (§3.1). Not yet indexed in `docs/papers/index.yaml`.
  - UCN (Choy et al., 2016) — cited as [3]; inspires the semi-dense descriptor design ("we use a model similar to UCN," §3.3). Not yet indexed.
  - LIFT (Yi et al., 2016) — cited as [32]; primary learned-descriptor comparison baseline. Not yet indexed.
- Enables (in the atlas):
  - `xfeat` — potje2024-xfeat explicitly builds on the SuperPoint two-head architecture (shared encoder + 65-class keypoint head with dustbin + descriptor head). The XFeat keypoint head operates on unfolded $8 \times 8$ raw-pixel blocks rather than a deep encoder output but inherits the identical cell + dustbin output convention (§3.2 of the XFeat paper).
  - R2D2, DISK, ALIKE — follow-on learned descriptor pipelines that extend or compare against SuperPoint's two-head design. Not yet indexed; relevant for a future survey concept page on learned local features.
- Refutes / supersedes:
  - LIFT (Yi et al., 2016) — explicitly outperformed on HPatches homography estimation across all thresholds and descriptor metrics (Table 4). SuperPoint's single-forward-pass design replaces LIFT's sequential detect-then-describe pipeline.

# Atlas update plan

## NEW: superpoint
Type: model
Category: `foundation-ssl`
Primary source: `detone2018-superpoint`
Suggested slug: `superpoint`
Draft: true (implementation license verification required before non-draft)

### Motivation
SuperPoint is a fully-convolutional network that takes a single grayscale image and produces, in one forward pass, a sparse set of interest-point locations and a 256-D dense descriptor map. It eliminates the sequential detect-then-describe pipeline (SIFT's DoG + SIFT descriptor; LIFT's staged architecture) by sharing a common VGG-style encoder between a detector head and a descriptor head. Training requires no human keypoint annotations: pseudo-ground-truth labels on real images are generated by the self-supervised Homographic Adaptation procedure.

### Architecture (for the `# Architecture` section)

**Family & shape.** Fully-convolutional CNN (VGG backbone). Input: $\mathbb{R}^{H \times W}$ (grayscale). Detector output: $\mathbb{R}^{H \times W}$ score map (via $\mathbb{R}^{H/8 \times W/8 \times 65}$ cell softmax). Descriptor output: $\mathbb{R}^{H \times W \times 256}$ (L2-normalised, via bicubic upsampling from $\mathbb{R}^{H/8 \times W/8 \times 256}$).

**Blocks.** Shared encoder: eight $3 \times 3$ convolution layers (64-64-64-64-128-128-128-128), with $2 \times 2$ max-pool after every pair → three poolings → $H_c = H/8$, $W_c = W/8$ (§3.1, §6). All layers: ReLU + BatchNorm. Each decoder head: one $3 \times 3$ conv (256 ch) + one $1 \times 1$ conv (65 or 256 ch). Detector decoder: no learned upsampling — channel-wise softmax on 65 channels, dustbin removal, pixel-shuffle reshape to $H \times W$ (§3.2). Descriptor decoder: no learned upsampling — bicubic interpolation $H_c \times W_c \to H \times W$, then L2 normalisation (§3.3).

**Training.** Two-stage: (1) MagicPoint on Synthetic Shapes with full supervision (200,000 iterations on-the-fly; §4); (2) SuperPoint joint training on MS-COCO 2014 (80k grayscale images, $240 \times 320$) with Homographic Adaptation pseudo-labels ($N_h = 100$) + descriptor hinge loss, Adam lr=0.001 (§6). Combined loss (eq. 1): cross-entropy detector loss + weighted hinge descriptor loss ($\lambda = 0.0001$, $\lambda_d = 250$, $m_p = 1$, $m_n = 0.2$). HPatches benchmark: homography estimation AUC at $\epsilon=3$: 0.684 (Table 4); NN mAP 0.821 outperforms SIFT (0.694), LIFT (0.664), ORB (0.735).

**Complexity.** ~1.3M parameters (estimate from eight VGG-style conv layers + two heads; not stated explicitly in the paper). Inference: ~11 ms on Titan X GPU at $480 \times 640$ → 70 FPS (§7.1). Descriptor sampling for $N = 1000$ detected points: ~1.5 ms CPU. No FLOPs figure reported in the paper.

### Training pipeline illustration
A Mermaid flowchart is appropriate for the Homographic Adaptation procedure (Figure 2 in the paper):

```
Synthetic Shapes → [Supervised training] → MagicPoint
MS-COCO images  → [Homographic Adaptation, Nh=100] → pseudo-labels
pseudo-labels + image pairs → [Joint training] → SuperPoint (detector + descriptor)
```

### Assessment (for the `# Assessment` section)

**Novelty.**
- First system to jointly detect keypoints and compute descriptors in a single fully-convolutional forward pass operating on full images (not patches), with no human keypoint annotations and no SfM supervision (contrast: LIFT requires SfM-derived labels; SIFT uses handcrafted DoG).
- Homographic Adaptation: a multi-homography aggregation procedure for self-supervised label generation from any unlabelled image collection (eq. 10). The approach is general — not tied to any architecture.
- 65-class cell softmax with dustbin: a compact, parameter-free upsampling scheme for keypoint localisation that avoids the checkerboard artifacts of deconvolution (§3.2, citing Odena et al. 2016 [18]).

**Strengths.**
- Descriptor discriminability under illumination change: NN mAP 0.821 on HPatches vs. SIFT 0.694 and LIFT 0.664 (Table 4).
- Real-time on GPU: 70 FPS at $480 \times 640$ (§7.1) — well below SIFT's CPU runtime.
- Self-supervised: no manual annotation required; re-training on a new domain requires only unlabelled images and the Homographic Adaptation procedure.
- Foundational influence: the two-head (shared encoder + 65-class detector + descriptor) design is directly reused by XFeat (potje2024-xfeat) and inspired R2D2, DISK, and ALIKE.

**Limitations.**
- No subpixel localisation: MLE 1.158 px on HPatches vs. SIFT 0.833 px (Table 4). The cell-aligned softmax output has no subpixel correction.
- Not rotation-invariant: fails on extreme in-plane rotation outside the training homography distribution (§7.3, Figure 8 caption); ORB's steered BRIEF handles this regime better.
- Not scale-invariant by construction: no scale-space, no orientation normalisation. Scale coverage is empirical, limited to the training homography range.
- Supervision from homographies only: generalisation to non-planar parallax scenes is unverified by the paper's evaluation protocol (HPatches uses primarily planar scenes with known homographies or affine approximations).
- Keypoint density ceiling: one keypoint per $8 \times 8$ cell; at $480 \times 640$ the theoretical maximum is 4800 points.

### References (for the `# References` section of the model page)
1. DeTone, Malisiewicz, Rabinovich. *SuperPoint: Self-Supervised Interest Point Detection and Description.* CVPR Workshops, 2018.
2. Potje et al. *XFeat: Accelerated Features for Lightweight Image Matching.* CVPR, 2024. (direct architectural successor)
3. Rosten, Drummond. *Machine Learning for High-Speed Corner Detection.* ECCV, 2006. (FAST — classical comparison)

### Frontmatter fields to propose
```yaml
title: "SuperPoint"
date: 2026-05-01
summary: "Fully-convolutional CNN that jointly detects interest points and computes 256-D descriptors in a single forward pass, trained without human annotations via Homographic Adaptation on synthetic shapes and MS-COCO images."
tags: ["computer-vision", "keypoint-detection", "local-descriptors", "image-matching", "self-supervised"]
category: foundation-ssl
arch_family: cnn
author: "Vitaly Vorobyev"
difficulty: intermediate
draft: true
sources:
  primary: detone2018-superpoint
  references:
    - rosten2006-fast
relations:
  - type: learned_alternative_of
    target: harris-corner-detector
    confidence: high
  - type: learned_alternative_of
    target: shi-tomasi-corner-detector
    confidence: high
  - type: learned_alternative_of
    target: fast-corner-detector
    confidence: medium
  - type: compared_with
    target: xfeat
    confidence: high
```
Note: `relations[type=compared_with, target=xfeat]` — the xfeat page (2024) references SuperPoint (2018); SuperPoint is the older paper, so SuperPoint hosts the comparison per the "older paper hosts" tiebreaker. However, since `content/models/xfeat.md` already exists as a draft, confirm whether a comparison section belongs on the `superpoint` page or is deferred until both pages are non-draft.

## UPDATE: xfeat (supplementary)

`content/models/xfeat.md` already lists `detone2018-superpoint` in `sources.references` and its `sources.notes` block correctly identifies the connection ("Antecedent to XFeat. Shared VGG-like encoder with a keypoint decoder head (1/8 resolution output, 8×8 cell classifier with a dustbin class) and a dense descriptor decoder"). No content gap in the frontmatter grounding.

Section: `# Assessment.Novelty`
- Add or strengthen the bullet contrasting SuperPoint's detector head to XFeat's detector head. XFeat's keypoint head (§3.2 of the XFeat paper) operates on unfolded $8 \times 8$ raw-pixel blocks rather than the shared deep-encoder output — this is the structural departure from SuperPoint, not merely a speed optimisation. The xfeat page currently does not articulate this distinction explicitly.

Section: `# References` (deferred)
- Once the `superpoint` model page exists as a non-draft, add it as reference entry 2 (after the XFeat primary paper), replacing any placeholder for the SuperPoint citation.

# Provenance

Paper text source: `docs/papers/.cache/detone2018-superpoint.txt` (arxiv:1712.07629v4, 8 pages + appendices).

Key section and equation citations:
- §3.1 (shared encoder, VGG-style, eight 3×3 conv layers 64-64-64-64-128-128-128-128, three 2×2 max-pools, $H_c = H/8$, $W_c = W/8$).
- §3.2 (detector head $\mathbb{R}^{H_c \times W_c \times 65}$, 65-class softmax + dustbin + pixel-shuffle reshape; footnote 1: "no parameters … known as sub-pixel convolution or depth to space").
- §3.3 (descriptor head $\mathbb{R}^{H_c \times W_c \times D}$, $D = 256$; bicubic interpolation + L2 normalisation; "model similar to UCN [3]").
- §3.4 / eq. 1 (total loss $= \mathcal{L}_p(X, Y) + \mathcal{L}_p(X', Y') + \lambda \mathcal{L}_d$; $\lambda = 0.0001$).
- eq. 2–3 (detector cross-entropy loss $\mathcal{L}_p$, cell-wise, ground truth $y_{hw}$).
- eq. 4 (homography-induced correspondence indicator $s_{hwh'w'} = \mathbf{1}[\|\hat{H}p_{hw} - p_{h'w'}\| \leq 8]$).
- eq. 5–6 (descriptor hinge loss $\mathcal{L}_d$; $\lambda_d = 250$, $m_p = 1$, $m_n = 0.2$).
- §4.1 (Synthetic Shapes dataset: quadrilaterals, triangles, lines, ellipses; interest points = Y/L/T-junctions, line endpoints, ellipse centres).
- §4.2 / Table 2 (MagicPoint vs. classical on Synthetic Shapes with noise: MagicPoint mAP 0.971, Harris 0.213, Shi 0.157, FAST 0.061).
- §5.1 / eq. 10 (Homographic Adaptation aggregation formula).
- §5.2 (homography decomposition: translation + scale + in-plane rotation + symmetric perspective distortion; $N_h = 100$ plateau; repeatability +21% at $N_h=100$ vs. +22% at $N_h=1000$).
- §6 (training details: MagicPoint 200k iterations on-the-fly Synthetic Shapes; SuperPoint on MS-COCO 2014 80k images $240 \times 320$ grayscale; Adam lr=0.001, batch 32; descriptor size $D=256$; augmentation: Gaussian noise, motion blur, brightness changes).
- §7.1 (runtime: ~11.15 ms forward pass on Titan X at $480 \times 640$; +1.5 ms CPU descriptor sampling for $N=1000$ → ~70 FPS total).
- Table 3 (HPatches repeatability NMS=4: SuperPoint 0.652 illumination / 0.503 viewpoint; Harris 0.620 / 0.556; Shi 0.606 / 0.552; FAST 0.575 / 0.503).
- Table 4 (HPatches homography estimation $\epsilon=3$: SuperPoint AUC 0.684, NN mAP 0.821, M. Score 0.470, MLE 1.158; SIFT AUC 0.676, MLE 0.833; LIFT AUC 0.598; ORB M. Score 0.266).
- §7.3 / Figure 8 caption (explicit failure: "extreme in-plane rotation not seen in the training examples").
