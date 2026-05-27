---
title: "Mask2Former"
date: 2026-05-27
summary: "Universal image segmentation family — MaskFormer (v1, NeurIPS 2021) reframes semantic segmentation as **mask classification**: predict a set of $N$ binary masks plus per-mask class labels via a DETR-style transformer decoder over pixel-decoder features, supervised by bipartite matching. Mask2Former (v2, CVPR 2022) extends v1 with **masked attention** (cross-attention restricted to each query's predicted mask foreground), multi-scale round-robin features (queries cross-attend to 1/32, 1/16, 1/8 maps across consecutive layers), and point-sampled mask loss for 3× memory reduction. A single architecture, trained per-dataset, beats specialised models on COCO panoptic (PQ 57.8), COCO instance (AP 50.1), and ADE20K semantic (mIoU 57.7) with Swin-L."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
params: "216M (Swin-L backbone, total)"
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: feeds_into
    target: sam
    confidence: high
    caution: "SAM 3's mask head is adapted from MaskFormer/Mask2Former — this family establishes the per-query mask classification + set-prediction paradigm SAM 3 inherits for concept segmentation."
  - type: compared_with
    target: mask-rcnn
    confidence: high
    caution: "Mask R-CNN is the dominant per-RoI proposal-then-segment baseline; Mask2Former reframes the same problem as mask classification + set prediction, achieving unified handling of semantic, instance, and panoptic in one architecture."
sources:
  primary: cheng2022-mask2former
  references:
    - cheng2021-maskformer
    - carion2020-detr
    - he2016-resnet
  notes: |
    MaskFormer v1 (cheng2021-maskformer, NeurIPS 2021): the foundational
    paradigm shift — per-pixel classification (FCN/DeepLab) replaced by
    **mask classification**. Architecture (Fig. 2, §3): backbone (ResNet
    or Swin) → **pixel decoder** (FPN-like upsampling, output
    $\mathcal{E}_\text{pixel} \in \mathbb{R}^{C \times H/4 \times W/4}$
    with $C=256$) + **transformer decoder** (DETR-style with $N=100$
    learnable queries, 6 layers, embedding dim 256) → per-query class
    head (MLP) + per-query mask head ($m_i(x,y) = \sigma(q_i^\top
    \mathcal{E}_\text{pixel}(x,y))$, sigmoid of query·pixel dot product).
    Loss $\mathcal{L}_\text{mask-cls}$ (Eq. 1): bipartite-matching
    Hungarian over $N$ predictions; per-pair = cross-entropy on class +
    binary cross-entropy + dice on mask; $\lambda_\text{focal}=20.0$,
    $\lambda_\text{dice}=1.0$, "no object" weight 0.1, backbone stride
    $S=32$. Headline (Swin-L†): ADE20K val mIoU 55.6, COCO panoptic
    val PQ 52.7 (Tables 3-4).

    Mask2Former v2 (cheng2022-mask2former, CVPR 2022): direct
    architectural extension of v1 — same pixel-decoder + transformer-
    decoder + mask-head topology, **three changes** in the decoder:
    (i) **Masked attention** (Eq. 2, §3.2): cross-attention is
    restricted to the foreground of each query's previously-predicted
    mask. $\mathbf{X}_l = \text{softmax}(\mathcal{M}_{l-1} + \mathbf{Q}_l \mathbf{K}_l^\top) \mathbf{V}_l + \mathbf{X}_{l-1}$
    where $\mathcal{M}_{l-1}(x,y) = 0$ if mask threshold > 0.5 at $(x,y)$,
    $-\infty$ otherwise (Eq. 5). Forces queries to focus locally instead
    of globally (DETR-style), accelerating convergence and improving
    quality. (ii) **Multi-scale round-robin features**: queries
    cross-attend to 1/32, 1/16, 1/8 resolution feature maps in rotation
    across consecutive decoder layers (instead of v1's single 1/32 map).
    Improves small-object segmentation. (iii) **Point-sampled mask
    loss**: compute mask loss on $K=12544$ importance-sampled points
    instead of all $H \times W$ pixels, reducing per-image memory ~3×
    (18 GB → 6 GB) and enabling larger batch.
    Training: AdamW, LR $10^{-4}$, weight decay 0.05, backbone LR×0.1;
    50 epochs COCO, 160k iters ADE20K, 90k iters Cityscapes.
    Headline (Swin-L, multi-scale): COCO panoptic val PQ 57.8 (+5.1 over
    v1), ADE20K semantic mIoU 57.7 (+2.1 over v1), COCO instance mask
    AP 50.1, Cityscapes panoptic PQ 66.6. Converges 6× faster than v1
    (50 vs 300 epochs). 216M params with Swin-L. Queries: 100 (semantic,
    panoptic) or 200 (instance).
implementations:
  - role: official
    repo: https://github.com/facebookresearch/Mask2Former
    commit: 9b0651c6c1d5b3af2e6da0589b719c514ec0d69a
    framework: pytorch
    license: MIT
  - role: official
    repo: https://github.com/facebookresearch/MaskFormer
    commit: da3e60d85fdeedcb31476b5edd7d328826ce56cc
    framework: pytorch
    license: CC-BY-NC-4.0
draft: false
---

# Motivation

Universal image segmentation via mask classification: given an RGB image, the model predicts a fixed set of $N$ (binary mask, class label) pairs, one per candidate segment, supervised by bipartite matching (DETR-style) rather than per-pixel cross-entropy. At inference, semantic segmentation is recovered by taking the argmax over masks weighted by class probability; instance and panoptic outputs are formed by retaining top-confidence masks with their class labels. The key departure from FCN-class per-pixel classifiers is that each prediction is a **mask + class** pair — the same architecture and loss train on semantic, instance, or panoptic supervision without changing the head structure. MaskFormer v1 (NeurIPS 2021) established this mask-classification paradigm and demonstrated it outperforms per-pixel classifiers, particularly at large vocabulary sizes. Mask2Former v2 (CVPR 2022) extends it with three targeted decoder changes — **masked attention** (cross-attention restricted to each query's predicted foreground), **multi-scale round-robin feature aggregation** (feature pyramid levels 1/32, 1/16, 1/8 fed to successive decoder layers in rotation), and **point-sampled mask loss** (mask supervision computed on $K = 12544$ importance-sampled points instead of all $H \times W$ pixels) — achieving the first single architecture to simultaneously surpass specialised state-of-the-art models on semantic, instance, and panoptic segmentation.

# Architecture

**Family & shape.** Hybrid encoder-decoder (CNN or ViT backbone with transformer decoder). Input: $H \times W \times 3$ RGB. Output: a set of $N$ tuples — each a binary mask in $\{0,1\}^{H \times W}$ plus a class probability vector over $K + 1$ classes (including "no object" $\varnothing$). The family covers two variants:

- **MaskFormer v1 (NeurIPS 2021):** transformer decoder of 6 layers, cross-attending to the single coarsest backbone feature map (stride 32); pixel decoder is FPN-style upsampling to stride 4.
- **Mask2Former v2 (CVPR 2022):** same general topology with three substantive decoder changes — masked attention, multi-scale round-robin features (queries cross-attend to stride-32, -16, -8 maps in rotation across 9 decoder layers), and point-sampled mask loss.

**Blocks.** Three load-bearing components shared by both variants (MaskFormer §3.3; Mask2Former §3.1):

- **Pixel decoder.** FPN-style upsampler on backbone features (ResNet-50/101 or Swin-T/S/B/L), producing per-pixel embeddings $\mathcal{E}_\text{pixel} \in \mathbb{R}^{C \times H/4 \times W/4}$ with $C = 256$. v1 outputs only this single map; v2 also retains intermediate stride-32/-16/-8 feature maps for the decoder's multi-scale rotation.

- **Transformer decoder.** $N$ learnable query embeddings cross-attend to image features over 6 decoder layers (v1) or 9 layers in three rotations through 3 feature scales (v2), with self-attention between queries at each layer. v2's defining change is **masked attention**.

- **Per-query prediction heads.** Class probability via a linear classifier; binary mask via dot product of a 2-hidden-layer MLP mask-embedding with the pixel-decoder features:

$$m_i(h, w) = \sigma\!\left(\mathcal{E}_{\text{mask}}[:,i]^{\top} \cdot \mathcal{E}_{\text{pixel}}[:,h,w]\right)$$

Sigmoid (not softmax) — masks are permitted to overlap (MaskFormer §3.3). Threshold 0.5 at inference.

The defining novelty of Mask2Former is **masked attention**, which restricts each query's cross-attention to the foreground of its previously-predicted mask:

:::definition[Masked attention (Mask2Former Eq. 2)]
Standard cross-attention is $\mathbf{X}_l = \text{softmax}(\mathbf{Q}_l \mathbf{K}_l^\top)\mathbf{V}_l + \mathbf{X}_{l-1}$. Mask2Former inserts an additive attention mask $\mathcal{M}_{l-1} \in \{0, -\infty\}^{N \times H_l W_l}$ derived from the previous-layer prediction (Eq. 2 and Eq. 5):

$$
\mathbf{X}_l = \text{softmax}\!\left(\mathcal{M}_{l-1} + \mathbf{Q}_l \mathbf{K}_l^\top\right)\mathbf{V}_l + \mathbf{X}_{l-1}
$$

where:

$$
\mathcal{M}_{l-1}(x, y) =
\begin{cases}
0 & \text{if } m_{l-1}(x, y) > 0.5 \\
-\infty & \text{otherwise}
\end{cases}
$$

The $-\infty$ entries zero out attention weights after softmax — each query attends only to spatial locations its previous-layer mask claims as foreground.
:::

The masked-attention computation in PyTorch:

```python
import torch
import torch.nn.functional as F


def masked_attention(
    queries: torch.Tensor,   # [B, N, d]
    keys: torch.Tensor,      # [B, HW, d]
    values: torch.Tensor,    # [B, HW, d]
    prev_masks: torch.Tensor # [B, N, HW] binary 0/1
) -> torch.Tensor:
    """Cross-attention gated by each query's predicted foreground.
    Implements Mask2Former Eq. 2 (Cheng 2022).
    """
    scores = queries @ keys.transpose(-2, -1)      # [B, N, HW]
    attention_bias = torch.where(
        prev_masks > 0.5,
        torch.zeros_like(prev_masks),
        torch.full_like(prev_masks, float("-inf")),
    )
    weights = F.softmax(scores + attention_bias, dim=-1)
    return weights @ values                        # [B, N, d]
```

Mask2Former's 9 decoder layers iterate over three feature scales (1/32 → 1/16 → 1/8) so each scale is visited 3 times in the standard configuration, with sinusoidal positional and learnable scale-level embeddings added at each resolution.

**Training.** Datasets and per-task supervision:

- COCO panoptic (panoptic), COCO instance (instance), ADE20K (semantic), Cityscapes (semantic + panoptic), Mapillary Vistas (panoptic).
- Loss: bipartite Hungarian matching over $N$ predictions, with per-pair cross-entropy on class plus binary cross-entropy and dice loss on mask. MaskFormer v1 loss weights (Eq. 1): $\lambda_{\text{focal}} = 20.0$, $\lambda_{\text{dice}} = 1.0$, "no object" class weight $= 0.1$. Auxiliary loss applied after every decoder layer.
- Mask2Former's **point-sampled mask loss** computes mask supervision on $K = 12544$ ($112 \times 112$) importance-sampled points per query per image instead of all $H \times W$ pixels — reducing per-image training memory from 18 GB to 6 GB ($3\times$ saving), without measurable accuracy loss (Mask2Former §3.3).
- Optimiser: AdamW, learning rate $10^{-4}$, weight decay $0.05$, backbone LR multiplier $0.1$ (Mask2Former §4.2).
- Schedule: 50 epochs on COCO with large-scale jitter augmentation at $1024 \times 1024$ crop (Mask2Former); 160k iterations on ADE20K; 90k iterations on Cityscapes. MaskFormer v1 required 300 epochs on COCO.

Headline metrics (Swin-L backbone, Mask2Former v2, Tables 1–4):

- **COCO panoptic val PQ 57.8** (+5.1 over MaskFormer v1's 52.7 at Swin-L).
- **ADE20K semantic val mIoU 57.7** multi-scale (Swin-L + FaPN pixel decoder).
- **COCO instance val mask AP 50.1** — Mask2Former is the first single architecture to surpass specialised SOTA on all three of semantic, instance, and panoptic simultaneously.

**Complexity.** Swin-L backbone: 216 M parameters. Number of queries: $N = 100$ (semantic, panoptic with smaller backbones) or $N = 200$ (Swin-L, panoptic and instance). Mask2Former converges in 50 epochs on COCO versus MaskFormer v1's 300 epochs — approximately 6× faster training convergence at strictly better quality (Mask2Former §4.3).

# Implementations

Two official PyTorch repositories from Facebook AI Research; Mask2Former (v2) ships under MIT, MaskFormer (v1) ships under CC-BY-NC-4.0 (research / non-commercial only) — see Limitations.

# Assessment

**Novelty.**

- **Mask classification replaces per-pixel classification** for semantic segmentation: the model predicts $N$ binary masks plus per-mask class labels supervised by bipartite matching, instead of a $K$-way classifier at every pixel as in FCN or DeepLab. The same architecture trains on semantic, instance, or panoptic supervision without structural modification (MaskFormer v1, §3.2 and §6).
- **Masked attention** (Mask2Former v2, §3.2.1): each transformer decoder query's cross-attention is restricted to the foreground of its previously-predicted mask via an additive $\{0, -\infty\}$ logit bias. Replaces DETR-style global cross-attention; enables ~6× faster training convergence on COCO (50 vs 300 epochs) with quality improvements across all three tasks.
- **Point-sampled mask loss** (Mask2Former v2, §3.3): mask supervision computed on $K = 12544$ importance-sampled points per query per image instead of all $H \times W$ pixels — approximately 3× memory reduction (18 GB → 6 GB per image), enabling larger batch sizes within the same memory budget.
- **Multi-scale round-robin decoder features** (Mask2Former v2, §3.2.2): the 9 transformer decoder layers iterate over 1/32, 1/16, and 1/8 backbone feature scales in rotation, providing each query with information at all three resolutions. Replaces MaskFormer v1's single-scale (1/32) cross-attention; closes the small-object and fine-region gap.

**Strengths.**

- **Single architecture surpasses specialised SOTA on all three segmentation tasks** with Swin-L backbone (Mask2Former Tables 1–4): COCO panoptic PQ 57.8, COCO instance mask AP 50.1, ADE20K semantic mIoU 57.7 — first demonstrated instance of a universal-segmentation model achieving this simultaneously.
- Mask2Former outperforms MaskFormer v1 by more than 5 PQ on COCO panoptic across all tested backbones while converging 6× faster (50 vs 300 epochs, Mask2Former §4.3, Table 2): the masked-attention and multi-scale-feature combination is a strict accuracy and efficiency improvement, not an accuracy-efficiency trade-off.
- Cityscapes panoptic val PQ 66.6 multi-scale with Swin-L (Mask2Former Table 6 / §4.4) — competitive with specialised Cityscapes models without per-dataset architectural changes.
- MaskFormer v1 achieves ADE20K semantic mIoU 55.6 (Swin-L†, multi-scale, Table 1), with 10% fewer parameters and 40% fewer FLOPs than the prior Swin-UperNet SOTA at comparable quality (MaskFormer v1 §1).

**Limitations.**

- **MaskFormer v1 ships under CC-BY-NC-4.0** (Attribution-NonCommercial 4.0 International): code and pretrained weights are research-only and cannot be used in commercial pipelines. Production deployments must use Mask2Former v2 (MIT-licensed) or reimplement the v1 ideas from scratch under a compatible license.
- **DETR-class slow convergence** relative to per-pixel classifiers: even at 50 epochs (Mask2Former, 6× faster than v1), training cost remains substantially higher than FCN/DeepLab-family models, which typically converge in 12–36 epochs (Mask2Former Appendix C). Mask R-CNN-family specialised instance segmenters converge in the same 12–36 epoch range.
- **Crowded small instances and thin structures**: predicted masks can merge adjacent small instances or drop thin structures (hair, wires, narrow poles) because the pixel decoder upsamples only to 1/4 resolution for the final mask dot product, not full resolution (Mask2Former §A4, failure-case figures).
- **Specialised single-task SOTA may exceed Mask2Former on individual benchmarks**: the headline claim is universality across three tasks under one architecture. Task-specialised post-Mask2Former models (OneFormer, Mask DINO) have since pushed further on individual benchmarks.

# References

1. Cheng, B., Misra, I., Schwing, A. G., Kirillov, A., & Girdhar, R. *Masked-attention Mask Transformer for Universal Image Segmentation.* CVPR, 2022. [arxiv](https://arxiv.org/abs/2112.01527)
2. Cheng, B., Schwing, A. G., & Kirillov, A. *Per-Pixel Classification is Not All You Need for Semantic Segmentation.* NeurIPS, 2021. [arxiv](https://arxiv.org/abs/2107.06278)
3. Carion, N., Massa, F., Synnaeve, G., Usunier, N., Kirillov, A., & Zagoruyko, S. *End-to-End Object Detection with Transformers.* ECCV, 2020. [arxiv](https://arxiv.org/abs/2005.12872)
4. He, K., Zhang, X., Ren, S., & Sun, J. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arxiv](https://arxiv.org/abs/1512.03385)
