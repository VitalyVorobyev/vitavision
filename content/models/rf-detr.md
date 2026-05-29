---
title: "RF-DETR"
date: 2026-05-29
summary: "Light-weight specialist real-time detection transformer that discovers an accuracy-latency Pareto frontier for any target dataset from a single training run: a DINOv2-ViT backbone feeds an LW-DETR-style set-prediction decoder, and weight-sharing NAS evaluates thousands of sub-network configurations without retraining. First real-time detector to exceed 60 AP on COCO."
tags: ["deep-learning"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: hybrid
params: "30.5M (nano), 126.9M (2x-large)"
prerequisites: [convolutional-neural-network, attention-mechanism]
sources:
  primary: robinson2025-rf-detr
  references:
    - carion2020-detr
    - dosovitskiy2020-vit
  notes: |
    Weight-sharing NAS (OFA-inspired, first end-to-end for detection/segmentation):
    one base net trained once on the target dataset; each step samples a random
    sub-net config; after training, 6,468 configs grid-searched on val to trace the
    accuracy-latency Pareto frontier with no retraining. Five tunable knobs: image
    resolution (11 values 320-960), ViT patch size (7 values {8,10,12,16,20,24,32},
    FlexiVIT interpolation), decoder layers (<=6, each supervised independently so
    truncatable), query tokens ({50,100,200,300}, lowest-confidence dropped), windowed
    attention blocks per encoder layer ({1,2,4}). Backbone: DINOv2 ViT-S/B replacing
    LW-DETR's CAEv2; layer-norm projector (not batch norm) for consumer-GPU training.
    NMS-free set prediction. lr 1e-4 (vs 4e-4 LW-DETR), per-layer backbone decay 0.8,
    grad clip 0.1, scheduler-free + minimal aug. Results (T4, TensorRT, FP-16): nano
    48.0 AP @ 2.3 ms / 30.5M (+5.3 AP over D-FINE nano @ 2.1 ms); 2x-large 60.1 AP @
    17.2 ms / 126.9M (first real-time >60 AP on COCO); 2XL fine-tuned 63.5 AP on
    RF100-VL vs GroundingDINO tiny +1.2 AP at ~20x lower latency (15.6 vs 309.9 ms).
    FP-16-robust where D-FINE collapses 55.1 -> 0.5 AP. Code Apache-2.0; XL/2XL
    weights PML 1.0.
implementations:
  - role: official
    repo: https://github.com/roboflow/rf-detr
    commit: 6e1620e751f3c814ead8648cada51ceff9029e5c
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

RGB images in at variable resolution; axis-aligned bounding boxes with class scores — and optionally binary instance masks — out, with no non-maximum suppression. A single training run on a labeled target dataset produces a weight-sharing supernet from which any of 6,468 sub-network configurations can be evaluated at inference, tracing a continuous accuracy-latency Pareto frontier without per-configuration retraining. The operating point — image resolution, patch size, decoder depth, query count, window count — is chosen at inference time; each choice yields a different latency and accuracy without any additional training.

# Architecture

**Family & shape.** Hybrid: a DINOv2 self-supervised ViT backbone (ViT-S or ViT-B) feeding a LW-DETR-derived transformer encoder-decoder with learned object queries. Input: RGB image at variable resolution. Output: up to $Q$ (class, box) pairs where $Q \in \{50, 100, 200, 300\}$ is selected at inference without retraining; end-to-end set prediction with no NMS. Released as a size family from nano to 2x-large.

**Blocks.** The central contribution is end-to-end weight-sharing NAS. One base network is fully trained once on the target dataset. At each training step a random sub-network configuration is sampled uniformly from the search space and updated — training thousands of sub-networks jointly without separate retraining per configuration, inspired by OFA (Cai et al., 2019) but the first application to detection and segmentation. After training, 6,468 configurations are grid-searched on the validation set to trace the accuracy-latency Pareto frontier with no additional training. Five knobs are tunable:

1. **Image resolution** — 11 values from 320 to 960 px; positional embeddings pre-allocated and interpolated.
2. **ViT patch size** — 7 values in $\{8, 10, 12, 16, 20, 24, 32\}$; FlexiVIT-style bilinear interpolation of patch embeddings handles unseen sizes at inference.
3. **Number of decoder layers** — up to 6; each layer is independently supervised during training, so the decoder can be truncated at inference.
4. **Number of query tokens** — $\{50, 100, 200, 300\}$; lowest-confidence queries are dropped without retraining.
5. **Number of windowed attention blocks per encoder layer** — $\{1, 2, 4\}$; correlates with the spatial density of the target dataset.

Architecture augmentation — the diversity of configurations sampled during training — acts as a regularizer, improving generalisation to out-of-distribution datasets. RF-DETR replaces LW-DETR's CAEv2 backbone with DINOv2 and uses a layer-norm (not batch-norm) multi-scale projector for consumer-GPU training compatibility.

**Training.** Backbone: DINOv2 ViT-S or ViT-B, fine-tuned on COCO or RF100-VL. Learning rate $1 \times 10^{-4}$ (vs. $4 \times 10^{-4}$ in LW-DETR); per-layer multiplicative backbone decay 0.8; gradient clipping at 0.1; cosine schedule dropped (scheduler-free); minimal augmentation (horizontal flip + random crop). Headline result: RF-DETR (nano) achieves 48.0 AP on COCO at 2.3 ms (T4, TensorRT, FP-16), exceeding D-FINE (nano) by 5.3 AP at comparable latency (2.1 ms).

**Complexity.** RF-DETR (nano): 30.5M parameters, 2.3 ms on T4 with TensorRT FP-16; RF-DETR (2x-large): 126.9M parameters, 17.2 ms, 60.1 AP on COCO — the first real-time detector to exceed 60 AP on COCO.

# Implementations

Official Roboflow PyTorch release; N/S/M/L weights under Apache-2.0, XL/2XL weights under the proprietary PML 1.0 license.

# Assessment

**Novelty.**

- First end-to-end weight-sharing NAS applied to object detection and instance segmentation, adapting OFA-style joint sub-network training to the DETR domain.
- Reframes DETR inference as a choice over five independently tunable knobs (resolution, patch size, decoder depth, query count, window count), tracing the full Pareto frontier from a single training run.
- Replaces LW-DETR's CAEv2 backbone with DINOv2, inheriting internet-scale self-supervised features.

**Strengths.**

- RF-DETR (nano) achieves 48.0 AP on COCO at 2.3 ms, a 5.3 AP margin over D-FINE (nano) at matched latency.
- RF-DETR (2x-large) reaches 60.1 AP on COCO — the first real-time detector to surpass 60 AP.
- RF-DETR (2XL, fine-tuned) achieves 63.5 AP on RF100-VL, a 1.2 AP improvement over GroundingDINO (tiny) at approximately 20× lower latency (15.6 ms vs. 309.9 ms).
- Robust to FP-16 quantisation across model sizes, where D-FINE degrades from 55.1 AP to 0.5 AP under naive FP-16 conversion.

**Limitations.**

- RF-DETR-XL and RF-DETR-2XL weights (the models exceeding 60 AP) are released under PML 1.0, a proprietary license; only the N/S/M/L weights are Apache-2.0.
- Latency and Pareto results are measured on NVIDIA T4 with TensorRT FP-16; figures are not transferable to CPU or mobile targets.
- Closed-vocabulary specialist detector: open-vocabulary or zero-shot detection requires GroundingDINO or comparable vision-language models at roughly 20× higher latency.
- Requires a pre-trained DINOv2 checkpoint (ViT-S or ViT-B) as initialisation; performance degrades substantially when trained from scratch on small datasets.

# References

1. I. Robinson, P. Robicheaux, M. Popov, D. Ramanan, N. Peri. *RF-DETR: Neural Architecture Search for Real-Time Detection Transformers.* arXiv, 2025. [arXiv:2511.09554](https://arxiv.org/abs/2511.09554)
2. N. Carion, F. Massa, G. Synnaeve, N. Usunier, A. Kirillov, S. Zagoruyko. *End-to-End Object Detection with Transformers.* ECCV, 2020. [arXiv:2005.12872](https://arxiv.org/abs/2005.12872)
3. A. Dosovitskiy, et al. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv:2010.11929](https://arxiv.org/abs/2010.11929)

```mermaid
flowchart LR
    A["Train supernet once<br/>random sub-net per step<br/>(OFA-style)"] --> B["Grid-search 6,468 configs<br/>on val (no retraining)"]
    B --> C["Accuracy-latency<br/>Pareto frontier"]
    C --> D["Pick operating point<br/>at inference"]
```
