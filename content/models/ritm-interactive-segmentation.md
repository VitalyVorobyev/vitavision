---
title: "RITM"
date: 2026-05-27
summary: "Feedforward click-based interactive segmentation: HRNet+OCR encoder-decoder taking RGB + positive/negative disk-encoded clicks + previous mask, trained with iterative click simulation and Normalized Focal Loss on COCO+LVIS — sets a new state of the art without inference-time backward passes."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: encoder-decoder
params: "10.03M"
flops: "30.80 GFLOPs @ 400×400"
prerequisites: []
failureModes: []
relations:
  - type: learned_alternative_of
    target: grabcut-iterative-segmentation
    confidence: high
  - type: learned_alternative_of
    target: graph-cut-segmentation
    confidence: medium
    caution: "RITM replaces interactive (click-seeded) graph-cut workflows; not all energy-min segmentation."
sources:
  primary: sofiiuk2021-ritm
  references:
    - chen2018-deeplab
    - sun2019-hrnet
  notes: |
    Inputs (Sec. 3): RGB image + two binary disk-encoded click maps (radius
    5 px, Conv1S scheme) + previous binary mask channel; first interaction
    uses zero mask. Loss is Normalized Focal Loss (NFL, Eq. 2, Sec. 3.4):
    NFL(i,j,M̂) = -[1/P(M̂)] · (1-p_ij)^γ · log p_ij, with P(M̂) = Σ_ij
    (1-p_ij)^γ — divides Focal Loss (Eq. 1) by its total weight so the
    aggregate gradient stays bounded. Training: COCO+LVIS (104k images,
    1.6M masks after IoU>80% dedup, Sec. 4.2), Adam β₁=0.9 β₂=0.999, lr
    5×10⁻⁴, 55 epochs, batch 32, crop 320×480, scale 0.75–1.40, N_iters=3
    (Table 6 ablation). HRNet-18+OCR canonical: 10.03M params / 30.80
    GFLOPs (Table 4); HRNet-18s small variant: 4.22M / 17.84 GFLOPs.
    DeepLabV3+-ResNet-34 baseline: 19.17M / 122.28 GFLOPs. Headline
    NoC@90 with HRNet-18 ITER-M (C+L) cited in note: GrabCut 1.54, SBD
    5.43 (Table 7); contrast f-BRS GrabCut 2.50, SBD 8.08. NFL-vs-BCE
    ablation NoC@90 on HRNet-18+OCR/COCO+LVIS baseline (Table 2): GrabCut
    1.70/1.82, Berkeley 2.48/3.13, SBD 6.72/7.58, DAVIS 5.90/6.31.
    Inference uses ZoomIn crop around predicted bbox after first click +
    horizontally-flipped average (Sec. 5).
implementations:
  - role: community
    repo: https://github.com/supervisely-ecosystem/ritm-interactive-segmentation
    commit: 55fec41d67770078f78b4f9dff10f19afd07acea
    framework: pytorch
    license: MIT
draft: false
---

# Motivation

Produce a binary segmentation mask for a user-selected object from a sequence of positive and negative clicks on an RGB image. Input: $H\times W\times 3$ RGB image plus an accumulated positive-click map, a negative-click map, and a previous-mask channel — forming a 5-channel tensor. Output: per-pixel foreground probability map of shape $H\times W$, binarised at 0.5. The model is specific to **feedforward** click-based interactive segmentation — a single forward pass per user interaction — in contrast to inference-time-optimisation methods (BRS, f-BRS) that run backward passes at test time to refine predictions.

# Architecture

**Family & shape.** Encoder-decoder. HRNet-W18 with OCR head as the canonical backbone; HRNet-W32 and HRNet-W18-small variants also reported. Input: 5-channel tensor — 3-channel RGB image plus 2 binary-disk click maps (positive, negative) plus 1 binary previous-mask channel. Output: $H\times W$ foreground probability map.

**Blocks.** Click maps and the previous-mask channel are fused into the backbone via **Conv1S**: a small convolutional branch processes the 3-channel auxiliary input (positive clicks, negative clicks, previous mask) and its output is summed element-wise with the output of the backbone's first convolutional layer (Sec. 3.1). This additive fusion allows the click-encoding weights to be initialised and trained independently from the ImageNet-pretrained backbone weights. Clicks are encoded as binary disks of radius 5 pixels — a local encoding that changes only in the neighbourhood of a new click, unlike distance-transform encodings (Conv1E, DMF) that shift globally across the entire map when any click is added or removed (Sec. 3.1, Table 1 ablation). At inference, ZoomIn crops the image around the predicted bounding box after the first click and averages predictions from the original and horizontally-flipped crop, adopted from f-BRS (Sec. 5).

The Conv1S auxiliary fusion block in PyTorch:

```python
import torch
import torch.nn as nn


class Conv1S(nn.Module):
    """Map the 3-channel auxiliary input (pos clicks, neg clicks, prev mask)
    to a 64-channel tensor summed into the first backbone conv output.
    Corresponds to the Conv1S input scheme described in Sec. 3.1.
    Channel count (64) is backbone-dependent; matches a typical HRNet-W18 stem.
    """

    def __init__(self, aux_channels: int = 3, out_channels: int = 64):
        super().__init__()
        self.branch = nn.Sequential(
            nn.Conv2d(aux_channels, 16, kernel_size=3, padding=1, bias=False),
            nn.BatchNorm2d(16),
            nn.ReLU(inplace=True),
            nn.Conv2d(16, out_channels, kernel_size=3, padding=1, bias=False),
        )

    def forward(self, image_feat: torch.Tensor, aux: torch.Tensor) -> torch.Tensor:
        # image_feat: output of backbone's first conv layer (C × H' × W')
        # aux: 3-channel auxiliary input bilinear-downsampled to H' × W'
        return image_feat + self.branch(aux)
```

**Training.** Dataset: COCO+LVIS — 104k images with 1.6M instance masks after deduplication (COCO masks whose IoU with an overlapping LVIS mask exceeds 80% are replaced by the higher-quality LVIS annotation; Sec. 4.2). Loss: Normalized Focal Loss (NFL).

:::definition[Normalized Focal Loss]
Focal loss reweights cross-entropy by $(1-p_{i,j})^\gamma$ to concentrate gradient on hard pixels, but its aggregate weight $P(\hat M) = \sum_{i,j}(1-p_{i,j})^\gamma$ shrinks as accuracy improves, causing gradient fade. NFL renormalizes by this total weight so that the aggregate gradient magnitude remains comparable to BCE regardless of how well the model is doing.

$$
\mathrm{NFL}(i,j,\hat{M}) = -\frac{1}{P(\hat{M})}(1 - p_{i,j})^\gamma \log p_{i,j}, \qquad P(\hat{M}) = \sum_{i,j}(1 - p_{i,j})^\gamma.
$$
:::

Schedule: Adam ($\beta_1{=}0.9$, $\beta_2{=}0.999$), initial learning rate $5\times 10^{-4}$ (backbone at $\tfrac{1}{10}$ head rate), decayed $\times 0.1$ at epochs 50 and 53, 55 total epochs, batch size 32. Augmentation: random crop $320\times 480$, random scale $0.75$–$1.40$. Click simulation: iterative — after the initial random-click set, $N_\text{iters}{=}3$ additional clicks are generated per training sample, each placed via morphological erosion of the largest erroneous region (erosion reduces the candidate area to roughly $\tfrac{1}{4}$ of the raw mislabelled region to avoid exact-centre overfitting; Sec. 3.2, Table 6 ablation). The model receives the mask from the previous forward pass as the binary third auxiliary channel; a zero mask is used for the first interaction step (Sec. 3.3). Headline results, HRNet-18 ITER-M (C+L): NoC@90 GrabCut 1.54, SBD 5.43 (Table 7), at the time the best reported feedforward numbers across the five standard benchmarks.

**Complexity.** HRNet-W18+OCR: 10.03M parameters, 30.80 GFLOPs at $400\times 400$ input. HRNet-W18-small: 4.22M parameters, 17.84 GFLOPs. DeepLabV3+-ResNet-34 baseline: 19.17M parameters, 122.28 GFLOPs — RITM HRNet-W18 matches or exceeds DeepLabV3+-ResNet-34 accuracy at approximately $4\times$ lower FLOPs (Table 4).

# Implementations

The original Samsung AI Center Moscow release (`saic-vul/ritm_interactive_segmentation`) has been withdrawn; the maintained MIT-licensed Supervisely fork below preserves the original Samsung copyright and tracks ongoing fixes.

# Assessment

**Novelty.**

- Restores **iterative training with mask guidance** abandoned after ITIS (Mahadevan et al. 2019) — feeds the previous forward-pass prediction as a binary auxiliary channel, eliminating the train/test click-distribution mismatch present in DIOS-style (Xu et al. 2016) random-click training.
- Introduces the **Conv1S disk-encoding fusion** — additive branch into the first backbone conv layer using radius-5 binary disks — which is locally stable (only the disk neighbourhood changes per new click) compared with the globally-shifted distance-transform encodings of Conv1E and DMF (Sec. 3.1, Table 1).
- Proposes **Normalized Focal Loss** as a replacement for BCE, FL, and Soft-IoU in interactive segmentation training, stabilising gradient magnitude as model accuracy improves (Sec. 3.4, Table 2).
- Shows that a well-trained **feedforward** model surpasses inference-time-optimisation methods (BRS, f-BRS) across all five standard benchmarks — eliminating the need for backward passes at test time.

**Strengths.**

- Top NoC@90 on the standard benchmarks with a single forward pass — GrabCut 1.54 vs f-BRS 2.50, SBD 5.43 vs f-BRS 8.08 (Table 7, HRNet-18 ITER-M C+L).
- Compact HRNet-W18-small (4.22M params, 17.84 GFLOPs) performs near parity with the full HRNet-W18 (10.03M, 30.80 GFLOPs), making resource-constrained deployment practical without an accuracy sacrifice (Table 4, Table 7).
- COCO+LVIS training set (1.6M masks) markedly outperforms training on any single dataset — SBD, Pascal VOC+SBD, LVIS, or COCO alone — confirming scale and annotation quality as decisive factors (Table 3).
- Mask-guidance pathway accepts an external mask (from an instance or semantic segmentation model) as the previous-mask input, enabling click-based correction of pre-existing predictions at no architectural change.

**Limitations.**

- **ZoomIn first-click cost**: the full image must be processed to establish the initial bounding box before ZoomIn crops are used; thin or elongated objects (cables, poles, ropes) that span a large bounding box lose spatial resolution under the crop.
- **Training instability at depth**: $N_\text{iters} \geq 5$ causes training collapse after 10–20 epochs (Sec. 5.2, Table 6); the iterative unrolling approach is not stable beyond $N_\text{iters}{=}4$.
- **Reproducibility**: the original authors' repository and pretrained weights are no longer reachable on GitHub (404); only community-mirror weights are available with no first-party guarantee of weight integrity.
- **Domain shift**: COCO+LVIS training is dominated by natural-photo classes; medical, aerial, satellite, or industrial imagery requires retraining or fine-tuning.

# References

1. Sofiiuk, K., Petrov, I. A., & Konushin, A. *Reviving Iterative Training with Mask Guidance for Interactive Segmentation.* arXiv:2102.06583, 2021. [arxiv](https://arxiv.org/abs/2102.06583)
2. Chen, L.-C., Zhu, Y., Papandreou, G., Schroff, F., & Adam, H. *Encoder-Decoder with Atrous Separable Convolution for Semantic Image Segmentation (DeepLabV3+).* ECCV, 2018. [arxiv](https://arxiv.org/abs/1802.02611)
