---
paper_id: sofiiuk2021-ritm
title: "Reviving Iterative Training with Mask Guidance for Interactive Segmentation"
authors: ["K. Sofiiuk", "I. A. Petrov", "A. Konushin"]
year: 2021
url: https://arxiv.org/pdf/2102.06583
created: 2026-05-27
relevant_atlas_pages:
  - grabcut-iterative-segmentation
  - graph-cut-segmentation
  - unet-segmentation
  - fcn-semantic-segmentation
  - deeplab-semantic-segmentation
  - mask-rcnn
---

# Setting

**Problem class:** click-based interactive segmentation. Given an RGB image and a growing sequence of user clicks (positive = foreground, negative = background), produce a binary segmentation mask for the user's target object. Optionally, the model can also accept an existing mask (from a prior run or an external instance/semantic segmentation model) and refine it.

**Inputs:**
- Image: arbitrary RGB, pre-processed to `320×480` crops during training (Sec. 5, implementation details).
- Positive and negative click maps: two channels encoding accumulated click locations as binary disks of radius 5 pixels (Conv1S scheme; Sec. 3.1, Table 1 ablations).
- Previous mask channel: binary or empty (zero) mask from the prior inference step, as the third auxiliary input channel (Sec. 3.3).

**Output:** per-pixel foreground probability map → binarised at 0.5 to yield the segmentation mask.

**Evaluation:** Number of Clicks (NoC@k) — the average number of clicks needed to reach IoU ≥ k% (k ∈ {85, 90}) capped at 20 clicks; also reported as NoC@90 with cap at 100 (Sec. 5, eval. metric paragraph). Benchmarks: GrabCut (50 images), Berkeley (100 masks / 96 images), SBD (6671 masks / 2820 images), DAVIS (345 frames), Pascal VOC val (3417 instances).

# Core idea

RITM makes three concrete changes relative to f-BRS (the 2020 SOTA):

**(a) Iterative training with mask guidance.** At training time, a random initial click set is simulated following Xu et al.'s random-sampling strategy, then up to N_iters additional clicks are generated iteratively (each new click placed in the largest erroneous region of the current prediction using morphological erosion to avoid exact-center overfitting — the eroded region is ~4× smaller than the raw mislabeled region; Sec. 3.2). The model receives the mask produced after the previous forward pass as a binary third input channel; a zero mask is used for the first interaction. This match between training and test dynamics resolves the training/inference mismatch in prior random-click methods. Best results at N_iters = 3 (Table 6 ablation).

**(b) Disk click encoding (Conv1S input scheme).** Clicks are encoded as circular disks of radius 5 in a separate channel, summed element-wise with the output of the first backbone convolutional layer (Conv1S), rather than distance-transform maps concatenated at input (Conv1E / DMF). Disk encoding changes only locally when a click is added or moved, whereas a distance transform can shift globally when even one new point appears; this stability improves learning (Sec. 3.1). HRNet-18+OCR with Conv1S+Disk5 beats DeepLabV3+-ResNet-34 at ~5× fewer FLOPs (Table 4: 30.80G vs 122.28G; Table 1).

**(c) Normalized Focal Loss (NFL).** Focal loss (FL; Eq. 1):

    FL(i,j) = -(1 - p_{i,j})^γ · log p_{i,j}

has the property that its total weight P(M̂) = Σ_{i,j} (1-p_{i,j})^γ shrinks as accuracy improves, causing gradient fade. NFL (Eq. 2) divides by this total weight:

    NFL(i,j, M̂) = -[1/P(M̂)] · (1 - p_{i,j})^γ · log p_{i,j}

This keeps the aggregate gradient constant, matching the total gradient of BCE. NFL wins over BCE, FL, and Soft-IoU on all four benchmarks in the loss-function ablation (Sec. 3.4, Table 2 — HRNet-18+OCR/COCO+LVIS baseline: NFL NoC@90 GrabCut=1.70, Berkeley=2.48, SBD=6.72, DAVIS=5.90 vs BCE 1.82/3.13/7.58/6.31).

**Dataset.** A combined COCO+LVIS training set (Sec. 4.2) is constructed by merging all COCO and LVIS masks on the shared 104k images, deduplicating: COCO masks whose IoU with an overlapping LVIS mask exceeds 80% are dropped in favour of the (higher-quality) LVIS annotation. Result: 1.6M instance masks. This markedly outperforms training on SBD, Pascal VOC+SBD, LVIS, or COCO alone (Table 3 dataset comparison).

**ZoomIn inference.** Adopted from f-BRS: after the first click the input image is cropped around the predicted object bounding box with an expansion margin, then predictions are averaged with the horizontally-flipped crop (Sec. 5, implementation). This is an inference-time crop trick, not a backward-pass optimization.

# Assumptions

1. (Hard) Clicks arrive from a bounded-noise user — each click is placed somewhere inside (or near the boundary of) the target region, not at a random image location. The training simulation strategy mimics this.
2. (Soft) The previous mask channel is informative for refinement. When initialising from scratch (first interaction) a zero mask is supplied, which the model handles correctly by training with batches that sometimes have the iterative steps skipped entirely (Sec. 3.2).
3. (Soft) The target object fits within the ZoomIn crop after the first click. Objects that span nearly the entire image bypass the crop benefit.
4. (Soft) The HRNet input resolution (320×480 training crops) is representative of inference resolution. Performance degrades for very high-resolution images unless they are sub-sampled or the model is fine-tuned.
5. (Hard) The COCO+LVIS class distribution is broad enough to generalise. The paper shows that narrow training sets (SBD/Pascal VOC) hurt cross-domain performance (Table 3).

# Failure regime

- **Extreme-aspect-ratio or thin objects** (cables, ropes, poles): the segmentation backbone does not have a dedicated thin-structure pathway; DAVIS subset results show residual high NoC@90 even at N_iters=3 (ITER-M DAVIS NoC@90 ≈ 5.74 in Table 6).
- **Large heterogeneous objects** (background scenes, heavily occluded scenes): the ZoomIn crop window is keyed on the first-click bounding box; if the true object extent is much larger than the first-click prediction, subsequent corrections need many clicks.
- **Domain shift**: the model is trained on COCO+LVIS natural images. Medical, satellite, or microscopy imagery will cause distribution mismatch.
- **Overfitting to erroneous regions on SBD**: models trained only on SBD show good SBD NoC@90 but are weaker on GrabCut and Berkeley (Table 3), consistent with training/test distribution overlap.
- **Collapse at N_iters ≥ 5**: the paper reports training instability (collapses after 10–20 epochs) for N_iters ∈ {5, 6}, requiring multiple restarts (Sec. 5.2). The iterative training loop is not stable at high unroll depths.
- **Non-DL deployment**: the model requires a GPU or accelerator for real-time use; it cannot run on mobile frameworks lacking autograd (unlike the classical GrabCut it targets as a replacement).

# Numerical sensitivity

- **Disk radius (click encoding):** Radius 5 outperforms radius 3 in RITM's own ablation (HRNet-18/SBD: Disk5 NoC@90 Berkeley=3.52 vs Disk3=3.63; Table 1), in contrast to Benenson et al. who found radius 3 optimal. Behaviour is encoder/backbone-dependent.
- **N_iters (iterative training depth):** Peak at N_iters = 3 for the COCO+LVIS setup. Values > 4 cause training instability; N_iters = 2 is slightly worse but stable. See Table 6 for exact numbers.
- **Learning rate schedule:** Adam with β₁=0.9, β₂=0.999 (Sec. 5 implementation), initial lr = 5×10⁻⁴, ×0.1 at epochs 50 and 53 out of 55 total on COCO+LVIS. Backbone lr is 10× lower than head lr.
- **NFL vs BCE:** Loss choice has a measurable effect across all benchmarks. See Table 2 for the magnitude (SBD NoC@90 drops from 7.58 → 6.72 switching BCE → NFL).
- **Backbone choice:** HRNet-18+OCR (10.03M params, 30.80G FLOPs @ 400×400) provides the best accuracy/compute trade-off. HRNet-32 (30.95M, 82.84G FLOPs) is marginally better on some benchmarks; HRNet-18s (4.22M, 17.84G) performs near parity at 0.4× the parameters (Table 4, Table 7).

# Applicability

- **Use when:** segmenting arbitrary-class objects via point clicks in an annotation pipeline; correcting masks output by semantic/instance segmentation models (the mask-guidance pathway enables this); deploying on resource-constrained hardware where inference-time backward passes (BRS/f-BRS) are infeasible.
- **Don't use when:** the runtime environment does not support PyTorch forward passes; objects are extremely thin structures or require sub-pixel-accurate boundary segmentation; domain is far from natural images without fine-tuning; a fully automatic segmentation (no user interaction) is preferred.
- **Compared against:** GrabCut (classical energy minimisation, Rother et al. 2004), BRS (jang2019-brs, backward-pass refinement), f-BRS (sofiiuk2020-fbrs, feature-level backward refinement), DIOS (xu2016-deep-interactive, first CNN-based), FCA-Net (attention-based), ITIS (Mahadevan et al. 2019, mask-feedback predecessor). RITM outperforms all of them on NoC@90 across all five benchmarks at state-of-the-art as of Table 7 at publication time.

# Connections

- **Builds on:**
  - Xu et al. 2016 (DIOS) — first CNN interactive segmentation, random-click simulation strategy, distance-transform encoding; RITM inherits the training protocol then modifies it.
  - Mahadevan et al. 2019 (ITIS) — introduced iterative sampling + optional previous-mask channel; RITM restores and systematically ablates this mechanism.
  - Sofiiuk et al. 2020 (f-BRS) — provides the strong feedforward baseline architecture, DMF input scheme, and ZoomIn inference trick that RITM builds upon and improves.
  - HRNet (Wang et al.) — backbone; RITM uses HRNet-W18 / HRNet-W32 with OCR head.
  - Lin et al. 2017 (RetinaNet) — origin of Focal Loss (FL), referenced in Sec. 3.4.
  - Peng et al. 2020 — origin of Normalized Focal Loss (NFL), referenced in Sec. 3.4.

- **Enables:**
  - SimpleClick (Liu et al. 2022) — adopts RITM's iterative mask-guidance training regime, replacing the HRNet backbone with a ViT encoder.
  - SAM (Kirillov et al. 2023) and subsequent transformer-based interactive segmenters — share the iterative click+mask paradigm that RITM established as clean baseline.
  - Annotation tools using click-based correction of model outputs (e.g., CVAT, Label Studio plugins).

- **Refutes / supersedes:**
  - GrabCut-class methods for click-driven interactive segmentation in natural-image settings — Table 7 shows GrabCut at NoC@90 = 10.00 on GrabCut dataset vs RITM ITER-M 1.54.
  - The claim that inference-time backward passes are necessary for state-of-the-art interactive segmentation — RITM feedforward matches or exceeds BRS/f-BRS without any backward pass.

# Atlas update plan

## NEW: ritm-interactive-segmentation
Type: model
Category: interactive-segmentation
Primary source: this paper (sofiiuk2021-ritm)
Relations:
  - { type: learned_alternative_of, target: grabcut-iterative-segmentation, confidence: high }
  - { type: learned_alternative_of, target: graph-cut-segmentation, confidence: medium, caution: "RITM replaces interactive (click-seeded) graph-cut workflows; not all energy-min segmentation" }
Bullets per public-page section:

  - Motivation: Prior DL interactive segmenters (BRS, f-BRS) achieve accuracy via expensive inference-time backward passes that cannot run on mobile; RITM shows that a well-trained feedforward model—using iterative click simulation and previous-mask guidance—matches or exceeds them with a single forward pass per click.

  - Architecture: HRNet-W18 (or W32, or W18-small) with OCR head as segmentation backbone. Input is a 5-channel tensor: RGB image + two binary-disk maps (radius 5 pixels) for positive and negative clicks + one binary previous-mask channel. The click maps and mask channel are fused via a Conv1S block: a small convolutional branch outputs a 64-channel tensor that is summed element-wise with the first backbone convolutional layer output, allowing separate learning rates for new weights. The model is trained end-to-end with Normalized Focal Loss (NFL). At inference, ZoomIn crops the image around the predicted bounding box after the first click and averages predictions with a horizontally-flipped crop.

  - Implementations: Official PyTorch implementation at https://github.com/saic-vul/ritm_interactive_segmentation (Samsung AI Center Moscow). Pretrained weights for HRNet-18s, HRNet-18, HRNet-32 on COCO+LVIS are provided.

  - Assessment: Sets new state-of-the-art across all five standard interactive segmentation benchmarks at publication (2021). On GrabCut NoC@90: RITM HRNet-18 ITER-M (C+L) = 1.54 vs f-BRS 2.50 vs BRS 2.60. On SBD NoC@90: 5.43 vs f-BRS 8.08. HRNet-18s (4.22M params) performs nearly on par with HRNet-18 (10.03M), making mobile deployment plausible. No backward-pass required at inference.

  - References: Sofiiuk et al. 2021 (arXiv 2102.06583); also cite f-BRS (sofiiuk2020-fbrs), DIOS (xu2016-deep-interactive), ITIS (Mahadevan et al. 2019), BRS (jang2019-brs).

## REFS:
Light architectural-ancestor references for completeness — no typed Atlas relations warranted:

- fcn-semantic-segmentation: FCN established the encoder-decoder pattern for dense prediction on which HRNet+OCR is a descendant. No direct relation edge needed.
- unet-segmentation: U-Net's skip-connection encoder-decoder informs the HRNet multi-scale design philosophy; light background reference only.
- deeplab-semantic-segmentation: DeepLabV3+ is used in RITM's ablation Table 1/Table 4 as the weaker backbone baseline that HRNet outperforms; included for completeness, not a semantic relation.
- mask-rcnn: Mask R-CNN provides many of the COCO instance-level masks that form half of the COCO+LVIS training set; dataset lineage reference only.

# Provenance

- Abstract paragraph: feedforward model, previous-mask input, COCO+LVIS claim — ar5iv HTML abstract (p. id1.id1).
- Sec. 3.1 (Clicks encoding): disk vs distance-transform comparison, Conv1S description — S3.SS1.p3–p6.
- Table 1: NoC@90 ablation numbers (Berkeley / DAVIS) for all backbone × input scheme × encoding combinations — S3.T1.
- Sec. 3.2 (Iterative Sampling): morphological erosion (4× area reduction), N_iters parameter definition, mixed random+iterative scheme — S3.SS2.p3–p4.
- Sec. 3.3 (Mask from previous steps): 3-channel input (pos clicks, neg clicks, prev mask), zero mask for first step — S3.SS3.p2.
- Sec. 3.4 (NFL): FL Eq. 1, total weight P(M̂) definition, NFL Eq. 2 — S3.SS4.p1–p4; Eq. (1) and (2) are explicitly numbered in the ar5iv HTML.
- Table 2: NFL vs BCE / FL / Soft-IoU comparison, HRNet-18+OCR/COCO+LVIS baseline — S3.T2.
- Sec. 4.2 (COCO+LVIS): 104k images, 1.6M masks, IoU>80% deduplication rule — S4.SS2.p1.
- Table 3: Dataset comparison NoC@90 across ADE20k / OpenImages / SBD / Pascal VOC+SBD / LVIS / COCO / COCO+LVIS — S4.T3.
- Table 4: FLOPs and parameter counts for HRNet-18s (4.22M, 17.84G), HRNet-18 (10.03M, 30.80G), HRNet-32 (30.95M, 82.84G), DeepLab-ResNet-34 (19.17M, 122.28G), DeepLab-ResNet-50 (31.40M, 170.13G) at 400×400 input — S5.T4.
- Sec. 5 (Implementation): crop size 320×480, scale 0.75–1.40, Adam β₁=0.9/β₂=0.999, lr=5×10⁻⁴, epochs 55 on COCO+LVIS, batch 32 — S5.p6–p7.
- Table 5 (Convergence): NoC_100@90 for BRS / f-BRS-B / HRNet-18 / HRNet-18 ITER-M on Berkeley, DAVIS, SBD — S5.T5.
- Table 6 (N_iters ablation): N_iters ∈ {1,2,3,4,5,6} × ±prev-mask, NoC@90 on Berkeley/DAVIS/SBD — S5.T6; N_iters=3 is optimal, >4 causes instability described in S5.SS2.p5.
- Table 7 (Final comparison): all NoC@85 and NoC@90 numbers across GrabCut, Berkeley, SBD, DAVIS, Pascal VOC for all methods — S5.T7; RITM HRNet-18 ITER-M (C+L) GrabCut NoC@90=1.54 and SBD NoC@90 values read from rows S5.T7.6.19–S5.T7.6.22.
- ZoomIn + flip augmentation at test time: S5.p6 ("adopt test time augmentations from f-BRS method, using Zoom-In technique and averaging predictions from original and horizontally flipped image").
- Disk radius 5 superiority over radius 3: Sec. 5.2 ablation paragraph S5.SS2.p1 ("a radius of 5 is better than 3").
- Collapse at N_iters=5,6: S5.SS2.p5 ("collapsed after 10-20 epochs").
