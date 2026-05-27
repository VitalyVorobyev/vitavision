---
paper_id: cheng2022-mask2former
title: "Masked-attention Mask Transformer for Universal Image Segmentation"
authors: ["B. Cheng", "I. Misra", "A. G. Schwing", "A. Kirillov", "R. Girdhar"]
year: 2022
url: https://arxiv.org/pdf/2112.01527
created: 2026-05-27
relevant_atlas_pages:
  - mask-rcnn
  - faster-rcnn
  - detr
  - fcn-semantic-segmentation
  - unet-segmentation
  - deeplab-semantic-segmentation
  - sam
  - ritm-interactive-segmentation
  - attention-mechanism
  - convolutional-neural-network
  - resnet
  - vit
---

# Setting

Universal image segmentation. One architecture trained per task/dataset on any of: semantic segmentation (assign each pixel a category label), instance segmentation (assign each detected object a binary mask + class), or panoptic segmentation (union of the two). Input: a single RGB image of arbitrary resolution. Output: a set of $N$ binary masks together with $N$ class-label probability distributions; post-processing converts these to the task-specific output format. The model makes no structural change between tasks — only the training data and loss semantics differ.

Preconditions: a multi-scale feature pyramid must be available from the pixel decoder (FPN-style backbone or equivalent). Inference resolution: shorter side resized to 800, longer side up to 1333 (COCO standard); task-specific crops for Cityscapes (512×1024 train, 1024×2048 inference) and ADE20K (1024×1024 train).

# Core idea

Mask2Former keeps the same three-component meta-architecture as MaskFormer: (1) a backbone (ResNet or Swin Transformer) that extracts multi-resolution feature maps, (2) a pixel decoder (MSDeformAttn or FaPN) that upsamples to per-pixel embeddings at 1/4 resolution, and (3) a Transformer decoder that processes $N$ object queries against image features and produces $N$ binary masks + class predictions. Three improvements over MaskFormer make it universal:

**Contribution 1 — Masked attention (§3.2.1).** Standard cross-attention (Eq. 1 of the paper) lets each query attend globally:

$$\mathbf{X}_l = \text{softmax}(\mathbf{Q}_l \mathbf{K}_l^\top) \mathbf{V}_l + \mathbf{X}_{l-1}$$

Masked attention (Eq. 2) adds an additive mask $\mathcal{M}_{l-1} \in \{0, -\infty\}^{N \times H_l W_l}$ to the logits before softmax:

$$\mathbf{X}_l = \text{softmax}(\mathcal{M}_{l-1} + \mathbf{Q}_l \mathbf{K}_l^\top) \mathbf{V}_l + \mathbf{X}_{l-1}$$

where (Eq. 5):

$$\mathcal{M}_{l-1}(x,y) = \begin{cases} 0 & \text{if } \mathbf{M}_{l-1}(x,y) = 1 \\ -\infty & \text{otherwise} \end{cases}$$

$\mathbf{M}_{l-1} \in \{0,1\}^{N \times H_l W_l}$ is the binarised (threshold 0.5) mask prediction from the previous decoder layer, resized to the current feature resolution. This forces each query to attend only within its own predicted foreground region, not globally. The motivation (§3.2.1): global cross-attention requires many epochs to learn to attend to local regions, whereas masked attention starts local from the first iteration.

**Contribution 2 — Multi-scale high-resolution features (§3.2.2).** Instead of feeding only the 1/32 lowest-resolution feature map (as MaskFormer v1 does), Mask2Former feeds feature pyramid levels 1/32, 1/16, 1/8 to successive decoder layers in round-robin order. A 3-layer sub-block is repeated $L$ times for a total decoder depth of $3L$. Each resolution adds a sinusoidal positional embedding $e_\text{pos} \in \mathbb{R}^{H_l W_l \times C}$ and a learnable scale-level embedding $e_\text{lvl} \in \mathbb{R}^{1 \times C}$. This improves small-object and small-region segmentation without requiring the full 1/8 feature map at every layer.

**Contribution 3 — Efficient point-sampled mask loss (§3.3).** MaskFormer can fit only one image per 32 GB GPU due to high-resolution mask supervision. Mask2Former adopts importance sampling from PointRend: the mask loss (both the bipartite matching cost and the final supervision) is computed on $K=12544$ (i.e., $112 \times 112$) sampled points rather than all $H \times W$ pixels. Matching uses a uniformly sampled common set; final loss uses per-pair importance-sampled sets. This reduces training memory from 18 GB to 6 GB per image ($3\times$ saving) without measurable accuracy loss.

Three additional optimisation improvements (§3.2.3): (a) swap order of self-attention and cross-attention (masked attention first), (b) make initial query features $\mathbf{X}_0$ learnable (they predict $\mathbf{M}_0$ directly before the decoder), (c) remove dropout entirely.

# Assumptions

1. (Hard) A multi-scale feature pyramid is available from the backbone — the 1/32, 1/16, and 1/8 stride feature maps must all exist. Pure ViT backbones without an FPN require an adapter.
2. (Soft) Each query's initial mask prediction $\mathbf{M}_0$ must cover a non-empty region; if all foreground pixels are masked out for a query, the attention collapses (this is a degenerate edge case in practice, not a systematic failure).
3. (Soft) The task is mask classification — all three segmentation types are represented as a set of $N$ (mask, class) pairs. Tasks outside this paradigm (e.g., depth estimation, keypoints) are not handled.
4. (Soft) Training is per-task and per-dataset: the architecture is shared, but weights are separately trained for each (task, dataset) combination. There is no zero-shot generalisation between datasets.
5. (Hard) Bipartite matching between predicted and ground-truth masks requires Hungarian matching, which has $O(N^2)$ complexity — $N$ must be bounded (100 or 200 queries in practice).

# Failure regime

- **Crowded small instances** (§A4, Fig. V failure cases): predicted masks can merge or miss adjacent small instances when they substantially overlap at the feature pyramid resolution.
- **DETR-class slow convergence** (§3.2.1, Appendix C): Mask2Former converges in 25 epochs (standard augmentation) or 50 epochs (large-scale jitter) — faster than MaskFormer (300 epochs) and DETR (500 epochs), but still slower than specialised Mask R-CNN variants that converge in 12–36 epochs.
- **Thin structures and fine edges** (§A4, Fig. V–VII failure cases): hair, wires, and narrow poles are sometimes dropped or coarsened because the pixel decoder upsamples to 1/4 resolution (not full resolution) for the final mask.
- **Out-of-domain instance sizes**: heavily biased training (e.g., COCO has many medium-large objects) may under-segment very small instances at test time.
- **Specialised single-task SOTA at time of writing**: at CVPR 2022, Mask2Former held SOTA on all three tasks simultaneously, but single-task specialists have since exceeded it on individual benchmarks (e.g., Mask DINO on COCO instance AP).

# Numerical sensitivity

- Training memory per image: 6 GB with point-sampled loss vs 18 GB for full-mask loss (§3.3). Batch size 16 typical on A100/V100 80 GB machines.
- Optimizer: AdamW (§4.2), learning rate $10^{-4}$, weight decay $0.05$, backbone LR multiplier $0.1$, step schedule decaying at 0.9 and 0.95 of total steps.
- COCO panoptic/instance training: 50 epochs, batch 16, crop $1024 \times 1024$ (LSJ augmentation, scale 0.1–2.0).
- ADE20K / Cityscapes semantic: 160k iterations (ADE20K) or 90k iterations (Cityscapes), batch 16, poly schedule.
- Point-sample count $K = 12544$ ($112 \times 112$) is the default; reducing $K$ trades accuracy for memory.
- Swin-L models use 200 queries for panoptic and instance segmentation; all others use 100 queries.
- Model size (Swin-L backbone): 216M parameters (Tables 1, 2 in the paper).
- Mask threshold for attention mask: 0.5 (§3.2.1). Not a tuned hyperparameter; the model is robust to this.

# Applicability

- Use when: a single architecture must handle all three segmentation tasks (semantic, instance, panoptic) with SOTA quality; when production needs to maintain one code-base for multiple output types; when panoptic quality matters most (57.8 PQ on COCO val is the strongest result at CVPR 2022).
- Use when: training memory is constrained — point-sampled loss makes 6 GB/image feasible compared to earlier MaskFormer.
- Don't use when: the only task is semantic segmentation and inference latency is critical — specialised FCN-based or lightweight SegFormer models are faster at equal or better accuracy for small-to-medium scales.
- Don't use when: real-time inference is required — the Transformer decoder adds substantial latency relative to one-stage detectors.
- Compared against: MaskFormer (predecessor), Mask R-CNN + HTC++ (specialised instance), K-Net (universal), SOLQ (instance), Panoptic-DeepLab (panoptic/semantic), BEiT (semantic).

# Connections

- Builds on: [cheng2021-maskformer, carion2020-detr]   # MaskFormer meta-architecture; DETR set-prediction objective and Hungarian matching
- Enables: [sam]   # SAM's mask decoder is a Mask2Former-style transformer decoder; OneFormer (2022) extends Mask2Former with a text-conditioning query; Mask DINO (2023) fuses DINO detection with Mask2Former head
- Refutes / supersedes: [cheng2021-maskformer]   # v2 outperforms v1 by >5 PQ across all backbones while being 6× faster to train

# Atlas update plan

## UPDATE: mask2former
Reason: Mask2Former (this paper, 2022) is the actual primary source on any "mask2former" Atlas family page. It introduces the three contributions — masked attention, multi-scale features, point-sampled loss — that make the architecture universal and SOTA. The v1 MaskFormer paper establishes the mask-classification framework; Mask2Former v2 is what practitioners cite and use.

Sections to extend on the family page:
- **Motivation**: emphasise "universal" — one architecture, trained per-dataset, outperforms specialised models on all three segmentation types simultaneously. Prior universal architectures (MaskFormer v1, K-Net) were competitive only on semantic/panoptic but lagged on instance segmentation by >9 AP (§1, §2).
- **Architecture.Family & shape**: same general topology as MaskFormer (pixel decoder + Transformer decoder + mask head); contributions are in decoder internals. Query count: 100 (default) or 200 (Swin-L for panoptic/instance). Pixel decoder: MSDeformAttn (default) or FaPN (best semantic). Backbone: ResNet-50/101 or Swin-T/S/B/L.
- **Architecture.Blocks — masked attention**: cross-attention restricted to predicted foreground per query (Eq. 2 and 5 of the paper). Additive mask of 0 / $-\infty$ modulates the attention logits. Mask is the binarised (threshold 0.5) prediction from the previous layer, resized to the current feature scale.
- **Architecture.Blocks — multi-scale rotation**: 1/32 → 1/16 → 1/8 feature maps fed to consecutive decoder layers in round-robin; the 3-layer group is repeated $L$ times for $3L$ total layers. Sinusoidal position + learnable level embedding added at each scale.
- **Architecture.Training**: point-sampled mask loss ($K=12544$ points, importance sampling for final loss, uniform sampling for matching); AdamW, lr $10^{-4}$, weight decay $0.05$; 50 epochs on COCO, 160k iters on ADE20K; LSJ augmentation.
- **Assessment.Strengths**: COCO panoptic val PQ 57.8 (Swin-L, Table 1 of the paper); COCO panoptic PQ^Th 64.2 / PQ^St 48.6 / mIoU 67.4 (Table 1); COCO instance val AP 50.1 (Swin-L, Table 2); ADE20K semantic val mIoU 57.7 m.s. (Swin-L + FaPN, Table 3); Cityscapes panoptic val PQ 66.6 multi-scale (Table 6, Swin-L). All Swin-L models: 216M parameters. Outperforms MaskFormer by >5 PQ on COCO panoptic across all backbones, converging 6× faster (50 vs 300 epochs).
- **Assessment.Limitations**: still inherits DETR-class slow convergence relative to Mask R-CNN-family models (25–50 epochs vs 12–36 epochs); specialised single-task SOTA has since exceeded it on individual benchmarks; fails on very thin structures and densely packed small instances.
- **References**: primary source cheng2022-mask2former; foundation cheng2021-maskformer; DETR carion2020-detr; PointRend (importance sampling) [kirillov2020-pointrend?].

Relations: no new typed relations beyond what the family-page's foundation note (cheng2021-maskformer) already carries — the primary-source promotion from v1 to v2 is handled by updating `sources.primary` on the Atlas page.

## REFS:
- cheng2021-maskformer: MaskFormer v1 (foundation, §1, §3.1)
- carion2020-detr: DETR set-prediction and Hungarian matching (§1, §3.1)
- PointRend (Kirillov et al. 2020): importance-sampled mask loss (§3.3)
- MSDeformAttn / Deformable DETR (Zhu et al. 2021): pixel decoder variant (§4.2)
- Swin Transformer (Liu et al. 2021): Swin-L backbone
- ResNet (He et al. 2016): ResNet-50/101 baseline backbone

# Provenance

- Abstract, §1: headline numbers 57.8 PQ (COCO panoptic), 50.1 AP (COCO instance), 57.7 mIoU (ADE20K semantic) — all with Swin-L backbone, val sets.
- §1 (S1.p3.1): MaskFormer v1 requires 300 epochs and 32 GB GPU for 40.1 AP; Swin-HTC++ reaches higher AP in 72 epochs — motivates masked attention and point-sampled loss.
- §3.1 (S3.SS1): three-component meta-architecture (backbone + pixel decoder + Transformer decoder); mask classification framework inherited from MaskFormer.
- §3.2.1 (S3.SS2.SSS1), Eq. 1–2, 5: standard cross-attention formula; masked attention formula; attention mask definition $\mathcal{M}_{l-1}(x,y) \in \{0, -\infty\}$.
- §3.2.1 (S3.SS2.SSS1.p1.1): hypothesis that "local features are enough to update query features and context can be gathered through self-attention."
- §3.2.2 (S3.SS2.SSS2.p1, p2): multi-scale strategy; feature resolutions $H_1=H/32$, $H_2=H/16$, $H_3=H/8$; round-robin repetition; sinusoidal + level embeddings.
- §3.2.3 (S3.SS2.SSS3.p2): three optimisation improvements (cross/self swap, learnable query features, dropout removal).
- §3.3 (S3.SS3.p1): point sampling, $K=12544 = 112 \times 112$; memory reduction from 18 GB to 6 GB per image ($3\times$).
- §4.2 (S4.SS2.p1.4): AdamW, lr $10^{-4}$, weight decay $0.05$, backbone multiplier $0.1$, 50 epochs, batch 16, LSJ augmentation, $1024 \times 1024$ crop.
- §4.3 (S4.SS3.p1.1): "Mask2Former consistently outperforms MaskFormer by more than 5 PQ across different backbones while converging $6\times$ faster."
- Table 1 (COCO panoptic, Swin-L row): PQ 57.8, PQ^Th 64.2, PQ^St 48.6, mIoU_pan 67.4, 216M params.
- Table 2 (COCO instance, Swin-L row): AP 50.1, 216M params.
- Table 3 caption / §4.3 (S4.SS3.p5.1): ADE20K semantic Swin-L + FaPN mIoU 57.7 (m.s.).
- Table 6 / §4.4 (S4.SS5.p1.1): Cityscapes panoptic PQ 66.6 (multi-scale, Swin-L).
- Appendix C (A3.SS1.p1.1): convergence in 25 epochs (standard aug) / 50 epochs (LSJ); DETR needs 500, MaskFormer 300.
- Appendix B.1 (A2.SS1.p2.2): Cityscapes training: crop 512×1024, batch 16, 90k iters.
- Appendix A (A2.SS3.p2.1): ADE20K panoptic/instance: 300k iters, batch 16, 200 queries for Swin-L.
