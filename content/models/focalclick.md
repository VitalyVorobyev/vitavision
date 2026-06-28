---
title: "FocalClick"
date: 2026-05-28
summary: "Practical click-based interactive segmentation that runs each click as a small local-crop forward pass (Segmentor on a Target Crop, Refiner on a Focus Crop) and composits results back via Progressive Merge — sub-300 ms per click on CPU with first-class support for refining preexisting masks."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
category: segmentation-flow
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: encoder-decoder
params: "4.22M Segmentor + 0.011M Refiner (hrnet18s-S2)"
flops: "3.66 + 0.16 G FLOPs @ 256×256 (hrnet18s-S2)"
prerequisites: []
failureModes: []
relations:
  - type: learned_alternative_of
    target: grabcut-iterative-segmentation
    confidence: medium
    caution: "FocalClick replaces interactive click-based annotation workflows; not a drop-in for energy-min/graph-cut on seeded segmentation generally."
sources:
  primary: chen2022-focalclick
  references:
    - sofiiuk2021-ritm
    - sun2019-hrnet
  notes: |
    Two contributions (Sec. 1, 3.1): (a) Focus View pipeline — Target Crop
    (TC) at $r_{TC}=1.4$ for the Segmentor, Focus Crop (FC) at $r_{FC}=1.4$
    around the largest connected component of the prediction-vs-prior XOR
    for the Refiner; (b) Progressive Merge (PM) — morphologically composits
    only the largest connected update region containing the new click,
    leaving the prior mask elsewhere intact.

    Refiner output (Eq. 1, Sec. 3.1): $M_r = \sigma(M_b)\,M_d +
    (1-\sigma(M_b))\,M_l$ where $M_b$ is a predicted boundary map, $M_d$ a
    detail map, $M_l$ the RoiAligned coarse logits. Loss (Eq. 2): $L =
    L_{bce} + L_{nfl} + L_{bnfl}$ — BCE on the boundary head, NFL (from
    RITM) on the coarse head, boundary-weighted NFL with weight 1.5 on the
    refined head.

    Backbone variants (Table 3): HRNet18s+OCR, HRNet32+OCR, SegFormer-B0,
    SegFormer-B3; input resolutions S1 = 128×128 and S2 = 256×256.
    Click encoding: binary disk radius 2 px (Fig. 3 caption).

    Headline numbers — DAVIS-585 from initial mask (Table 4):
    hrnet18s-S1 NoC85=2.72, NoC90=3.82; B3-S2 NoC85=2.00, NoC90=2.76;
    RITM-hrnet18s baseline NoC85=3.71, NoC90=5.96. Standard DAVIS from
    scratch (Table 2, COCO+LVIS): hrnet18s-S2 NoC85=3.90, NoC90=5.25;
    segformerB3-S2 NoC85=3.61, NoC90=4.90.

    Efficiency (Table 3, 2.4 GHz 4×Intel Core i5): B0-S1 total 0.43 + 0.17
    G FLOPs (15× lower than the lightest RITM variant at 8.96 G);
    hrnet18s-S2 213 ms Segmentor + 51 ms Refiner; B3-S2 634 ms Segmentor +
    72 ms Refiner. Progressive Merge activates after click 10 when
    annotating from scratch.

    Training (Sec. 4.1): Adam $\beta_1=0.9$, $\beta_2=0.999$, lr
    $5\times10^{-4}$, decay ×0.1 at epochs 190 and 220, 230 epochs total,
    batch 32, 2×V100 ~24 h; iterative click simulation following RITM with
    max 24 clicks and probability decay 0.8; Segmentor input 256×256
    crops, Focus Crop simulated as 0.2–0.5 object-length local crops with
    random 1.1–2.0 expansion.

    DAVIS-585 benchmark construction (Sec. 3.2): 30 videos × 10 frames =
    300 base masks → 585 corrupted samples after filtering masks < 300 px;
    initial-mask IoU ∈ [75%, 85%]; error-type probabilities boundary 0.65,
    external false-positive 0.25, internal true-negative 0.10.
implementations:
  - role: official
    repo: https://github.com/XavierCHEN34/ClickSEG
    commit: 0c801cfa5f67f066fdaab28ff8f3afde1cb71ace
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Produce a refined binary foreground mask for a user-selected object from a sequence of positive and negative clicks on an RGB image, with the ability to correct a preexisting mask supplied by an upstream model or manual tool. Input: an $H\times W\times 3$ RGB image together with positive-click binary-disk maps, negative-click binary-disk maps, and an optional prior binary mask — concatenated into a 6-channel tensor (Sec. 3.1). Output: a per-pixel foreground probability map of shape $H\times W$. The defining property is that each click triggers inference on two small local crops only — a Target Crop fed to a lightweight Segmentor and a Focus Crop fed to a Refiner — rather than a full-image forward pass, combined with Progressive Merge compositing that writes only the largest connected update region containing the new click, preserving correctly-segmented parts of any preexisting mask.

# Architecture

**Family & shape.** Encoder-decoder, two-stage. Input: 6-channel tensor (3-channel RGB + positive-click disk map + negative-click disk map + previous-mask channel). Output: $H\times W$ foreground probability map. Stage 1 is a Segmentor (HRNet-W18s+OCR, HRNet-W32+OCR, SegFormer-B0, or SegFormer-B3) that operates on the Target Crop resized to $128\times 128$ (S1) or $256\times 256$ (S2). Stage 2 is a lightweight Refiner (Xception depthwise convolutions, 0.011–0.025 MB parameters) that operates on a smaller Focus Crop. The canonical configuration is hrnet18s-S2.

**Blocks.** Four sub-operations execute per click (Sec. 3.1).

*(a) Target Crop.* A bounding box is formed around the union of the previous mask and the new click, expanded by $r_{TC} = 1.4$. The crop is downsampled to the Segmentor resolution (128×128 or 256×256) and processed by the Segmentor, which fuses click maps after its stem layers via two convolutional layers following the RITM Conv1S scheme. Output: a coarse probability map.

*(b) Focus Crop.* A Difference Mask $M_{xor}$ is formed by XOR-ing the binarised coarse prediction against the previous mask. The largest connected component of $M_{xor}$ that contains the new click is found, its bounding box is expanded by $r_{FC} = 1.4$, and the resulting patch is the Focus Crop. This locates the region that the current click most directly affects.

*(c) Refiner.* The Refiner receives the Focus Crop pixels through Xception depthwise convolutional layers and also receives Segmentor features RoiAligned into the Focus Crop coordinate frame (the coarse logit $M_l$). Two prediction heads produce a detail map $M_d$ and a boundary map $M_b$. The refined logit is blended per Eq. 1:

$$M_r = \sigma(M_b)\,M_d + \bigl(1 - \sigma(M_b)\bigr)\,M_l$$

where $\sigma(\cdot)$ is the sigmoid function. $M_b$ acts as a spatial gate: at boundary pixels the Refiner detail head $M_d$ dominates; at interior pixels the RoiAligned coarse logit $M_l$ dominates.

*(d) Progressive Merge.* The binarised new prediction (threshold 0.5) is XOR-ed against the prior mask to form a candidate change set. The largest connected component of that set which contains the new click is written to the global mask; all other pixels inherit the prior mask. This is a parameter-free morphological compositing step.

:::definition[Progressive Merge]
At each click, let $\hat{M}^{(t)}$ be the binarised refined prediction and $M^{(t-1)}$ the current global mask. Let $\Delta = \hat{M}^{(t)} \oplus M^{(t-1)}$ be the per-pixel difference. The update region $U$ is the largest connected component of $\Delta$ that contains the new click location. The updated mask is

$$M^{(t)}_p = \begin{cases} \hat{M}^{(t)}_p & p \in U \\ M^{(t-1)}_p & p \notin U \end{cases}$$

Progressive Merge is inactive for the first 10 clicks when annotating from scratch, during which predictions are written globally (Sec. 3.1).
:::

The Refiner fusion block in PyTorch:

```python
import torch
import torch.nn as nn


class FocalClickRefinerFuser(nn.Module):
    """Combine boundary, detail, and RoiAligned coarse logits per Eq. 1.

    m_l: RoiAlign-cropped coarse logit from the Segmentor, shape (B, 1, H, W)
    m_d: detail map from Refiner depthwise head,          shape (B, 1, H, W)
    m_b: boundary map from Refiner boundary head,         shape (B, 1, H, W)
    """

    def forward(
        self,
        m_l: torch.Tensor,
        m_d: torch.Tensor,
        m_b: torch.Tensor,
    ) -> torch.Tensor:
        # Boundary map gates between Refiner detail (at edges)
        # and coarse logit (at interiors).
        gate = torch.sigmoid(m_b)
        return gate * m_d + (1.0 - gate) * m_l
```

**Training.** Primary dataset: COCO+LVIS; secondary: SBD. Click simulation follows the RITM iterative protocol: up to 24 positive and 24 negative clicks per sample, probability decay 0.8. Loss (Eq. 2):

$$L = L_{\mathrm{bce}} + L_{\mathrm{nfl}} + L_{\mathrm{bnfl}}$$

where $L_{\mathrm{bce}}$ is binary cross-entropy on the boundary head, $L_{\mathrm{nfl}}$ is Normalized Focal Loss on the coarse Segmentor output, and $L_{\mathrm{bnfl}}$ is boundary-weighted NFL on the Refiner output with boundary weight 1.5. Optimizer: Adam ($\beta_1{=}0.9$, $\beta_2{=}0.999$), initial learning rate $5\times10^{-4}$, decayed $\times 0.1$ at epochs 190 and 220, 230 epochs total (1 epoch = 30 000 images), batch size 32, 2×V100, approximately 24 h. Headline results from Table 4 (DAVIS-585, from initial mask): hrnet18s-S1 NoC85=2.72, NoC90=3.82 vs RITM-hrnet18s NoC85=3.71, NoC90=5.96; segformerB3-S2 NoC85=2.00, NoC90=2.76. From Table 2 (standard DAVIS, from scratch, COCO+LVIS): hrnet18s-S2 NoC85=3.90, NoC90=5.25; segformerB3-S2 NoC85=3.61, NoC90=4.90.

**Complexity.** Six variants span a wide compute range (Table 3). hrnet18s-S2: 4.22M Segmentor parameters + 0.011M Refiner parameters, 3.66 G Segmentor FLOPs + 0.16 G Refiner FLOPs, 213 ms Segmentor + 51 ms Refiner on a 2.4 GHz 4-core Intel Core i5 CPU. B0-S1: 0.43 G + 0.17 G FLOPs — 15× lower than the lightest RITM variant (hrnet18s-400, 8.96 G FLOPs). B3-S2 is the heaviest at 12.72 G + 0.20 G FLOPs (634 ms + 72 ms). The Refiner contributes 0.011–0.025M parameters and 0.15–0.20 G FLOPs regardless of Segmentor size.

# Implementations

Official Apache-2.0 release `XavierCHEN34/ClickSEG` bundles training, evaluation, and pretrained weights for all six variants (HRNet18s-S1/S2, HRNet32-S2, B0-S1/S2, B3-S2).

# Assessment

**Novelty.**

- Two-stage local inference — Target Crop through Segmentor followed by Focus Crop through Refiner — replaces the whole-image forward pass used on every click by RITM, f-BRS, and CDNet, enabling CPU-feasible per-click latency without accuracy regression.
- Progressive Merge is the first algorithmic treatment of preexisting-mask preservation in click-based interactive segmentation: a morphological compositing rule that restricts each update to the largest connected change region containing the new click, leaving correctly-segmented pixels unmodified.
- DAVIS-585 benchmark contribution: 300 base masks expanded to 585 corrupted samples with controlled IoU range (75%–85%) and explicit error-type probabilities (boundary 0.65, external false-positive 0.25, internal true-negative 0.10), filling a gap left by prior from-scratch-only evaluation protocols (Sec. 3.2).

**Strengths.**

- 15× lower FLOPs than the lightest RITM variant at competitive NoC numbers: B0-S1 uses 0.43 + 0.17 G FLOPs vs RITM-hrnet18s-400's 8.96 G (Table 3).
- Native preexisting-mask correction: hrnet18s-S1 NoC90 drops from 5.25 (from scratch, Table 2) to 3.82 (from initial mask, Table 4), while RITM-hrnet18s NoC90 stays at 5.96 from-initial-mask (Table 4).
- Sub-300 ms per click on a 2.4 GHz 4-core i5 CPU for hrnet18s-S2 — 213 ms Segmentor + 51 ms Refiner (Table 3) — practical for desktop annotation tools without GPU.
- Drop-in backbone swap: the same two-stage pipeline accommodates HRNet+OCR and SegFormer variants, spanning a 6-point accuracy–latency design space from 0.43 + 0.17 G FLOPs to 12.72 + 0.20 G FLOPs (Table 3).

**Limitations.**

- Single-component assumption: Focus Crop selection and Progressive Merge both isolate the largest connected XOR-region containing the new click; multi-region edits per click are silently truncated to the dominant component.
- Tiny and filamentary structures (parachute ropes, hair, cables): B3-S2 reaches only 23.7% IoU at 20 clicks on a thin-structure example (Fig. 5, row 5).
- Progressive Merge is inactive for the first 10 clicks when annotating from scratch; during that phase, predictions are applied globally and can overwrite well-segmented detail.
- Iterative training carries RITM's instability: $N_\text{iters} \geq 5$ causes training collapse; FocalClick inherits the $N_\text{iters} = 3$ ceiling without an explicit mitigation strategy.

# References

1. Chen, X., Zhao, Z., Zhang, Y., Duan, M., Qi, D., & Zhao, H. *FocalClick: Towards Practical Interactive Image Segmentation.* CVPR, 2022. [arxiv](https://arxiv.org/abs/2204.02574)
2. Sofiiuk, K., Petrov, I. A., & Konushin, A. *Reviving Iterative Training with Mask Guidance for Interactive Segmentation.* arXiv 2102.06583, 2021. [arxiv](https://arxiv.org/abs/2102.06583)
3. Sun, K., Xiao, B., Liu, D., & Wang, J. *Deep High-Resolution Representation Learning for Human Pose Estimation (HRNet).* CVPR, 2019. [arxiv](https://arxiv.org/abs/1902.09212)
