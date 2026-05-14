---
title: "Faster R-CNN"
date: 2026-05-13
summary: "Two-stage CNN object detector that replaces external Selective Search / EdgeBoxes proposals with a learned Region Proposal Network sharing conv features with the Fast R-CNN head — yielding near-real-time multi-class detection on GPU (5 fps with VGG-16) and ImageNet-pretrained backbones swapped freely from ZF through ResNet-101."
tags: ["computer-vision", "object-detection", "two-stage-detector", "region-proposal-network", "cnn", "anchor-based"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
params: "≈138M (VGG-16 backbone) or ≈62M (ZF backbone); RPN head adds ≈2.4M atop VGG-16"
prerequisites: []
failureModes: []
relations:
  - type: learned_alternative_of
    target: felzenszwalb-deformable-parts
    confidence: high
  - type: learned_alternative_of
    target: viola-jones-detector
    confidence: medium
    caution: "Viola-Jones targets real-time face detection on CPUs; Faster R-CNN is general multi-class detection on GPUs — replacement is paradigm-level, not drop-in."
  - type: extended_by
    target: mask-rcnn
    confidence: high
sources:
  primary: ren2015-faster
  references:
    - long2015-fcn
    - krizhevsky2012-alexnet
    - he2016-resnet
    - he2017-maskrcnn
  notes: |
    Two-stage detector: RPN (3×3 sliding conv → 1×1 cls/reg branches, k=9 anchors:
    3 scales {128², 256², 512²} px × 3 ratios {1:1, 1:2, 2:1}) shares conv features
    with a Fast R-CNN head. Multi-task loss (Eq. 1): L = (1/N_cls) Σ L_cls + λ (1/N_reg) Σ p* L_reg,
    with λ=10, N_cls=256 mini-batch, N_reg≈2400 anchor locations (§3.1.2).
    Anchor parameterisation (Eq. 2): log-space for w,h, linear for centre offsets.
    Positive IoU ≥0.7, negative IoU <0.3 (§3.1.2). 4-step alternating training
    (§3.2); approximate joint training 25–50% faster.
    Headline results: VGG-16 + 07+12 trainval → 73.2% mAP PASCAL VOC 2007 test
    at 5 fps (198 ms/image, K40, Tables III, V); VGG-16 → 42.1% mAP@0.5 /
    21.5% mAP@[.5,.95] COCO test-dev (Table XI); ResNet-101 → 48.4%/27.2%
    COCO val, 1st place ILSVRC & COCO 2015 detection (§4).
implementations:
  - role: official
    repo: https://github.com/ShaoqingRen/faster_rcnn
    commit: 49ad0990512a5d6e34f56e3c6596eb5fbf22f651
    framework: caffe
    license: MIT
  - role: port
    repo: https://github.com/rbgirshick/py-faster-rcnn
    commit: 781a917b378dbfdedb45b6a56189a31982da1b43
    framework: caffe
    license: MIT
  - role: community
    repo: https://github.com/facebookresearch/detectron2
    commit: d1e04565d3bec8719335b88be9e9b961bf3ec464
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Takes an RGB image of arbitrary size and produces a set of axis-aligned bounding boxes, each paired with a class label and a softmax confidence score. The distinguishing property is a Region Proposal Network (RPN) that shares the full-image convolutional feature map with a Fast R-CNN detection head: candidate box generation becomes a 10 ms learned forward pass on the same GPU-resident features, replacing external proposal methods such as Selective Search (~1.5 s CPU) and eliminating any test-time coupling to image or filter pyramids.

# Architecture

**Family & shape.** Two-stage CNN object detector. Input: RGB image, shorter side resized to $s = 600$ px (§3.3). Output: per detected instance, a class label drawn from a fixed vocabulary, a softmax score in $[0, 1]$, and an axis-aligned bounding box. Backbone options: ZF (5 shareable conv layers, 256-d feature map) or VGG-16 (13 shareable conv layers, 512-d feature map); competition results use ResNet-101 (§4, ILSVRC/COCO 2015).

**Blocks.** The RPN head slides a $3 \times 3$ convolutional window over the last shared conv feature map, producing a 256-d (ZF) or 512-d (VGG-16) intermediate feature at each spatial location (§3.1). Two parallel $1 \times 1$ convolutions branch from this intermediate feature: a classification branch producing $2k$ objectness logits (foreground / background per anchor) and a regression branch producing $4k$ box-delta outputs. At each location $k = 9$ anchors are placed — 3 scales $\{128^2, 256^2, 512^2\}$ px × 3 aspect ratios $\{1{:}1, 1{:}2, 2{:}1\}$ — yielding approximately 20 000 anchors on a $1000 \times 600$ image (§3.1.1, §3.3).

The RPN head forward pass in PyTorch pseudocode:

```python
import torch.nn as nn

class RPNHead(nn.Module):
    def __init__(self, in_channels: int, num_anchors: int = 9):
        super().__init__()
        self.conv = nn.Conv2d(in_channels, in_channels, 3, padding=1)
        self.relu = nn.ReLU(inplace=True)
        self.cls_logits = nn.Conv2d(in_channels, num_anchors * 2, 1)
        self.bbox_deltas = nn.Conv2d(in_channels, num_anchors * 4, 1)

    def forward(self, feature_map):
        # feature_map: (B, C, H, W) — last shared conv layer
        t = self.relu(self.conv(feature_map))
        cls  = self.cls_logits(t)   # (B, 2k, H, W)
        bbox = self.bbox_deltas(t)  # (B, 4k, H, W)
        return cls, bbox
        # Anchors decoded: t_x=(x−x_a)/w_a, t_w=log(w/w_a), etc. (Eq. 2)
```

RPN proposals are ranked by objectness score, deduplicated with NMS at IoU 0.7, and the top 300 are forwarded to the Fast R-CNN head, which performs RoI pooling on the same shared conv weights and outputs per-class softmax scores and refined boxes.

:::definition[Multi-task loss]
Binary log-loss on objectness $L_\text{cls}$ plus smooth-L1 regression loss $L_\text{reg}$ on box deltas, activated only for positive anchors; normalised by mini-batch size and anchor-location count respectively.

$$L(\{p_i\}, \{t_i\}) = \frac{1}{N_\text{cls}} \sum_i L_\text{cls}(p_i, p_i^*) + \lambda \frac{1}{N_\text{reg}} \sum_i p_i^* L_\text{reg}(t_i, t_i^*)$$
:::

:::definition[Anchor bounding-box parameterisation]
Log-space offsets relative to anchor centre $(x_a, y_a)$, width $w_a$, and height $h_a$; log-space for scale ensures a well-conditioned regression loss across large scale variation (§3.1.2, Eq. 2).

$$t_x = \frac{x - x_a}{w_a}, \quad t_y = \frac{y - y_a}{h_a}, \quad t_w = \log\frac{w}{w_a}, \quad t_h = \log\frac{h}{h_a}$$
:::

**Training.** Four-step alternating optimisation (§3.2): (1) train RPN from ImageNet initialisation; (2) train Fast R-CNN detector on step-1 proposals; (3) fine-tune RPN with shared conv layers frozen; (4) fine-tune Fast R-CNN unique layers only. Approximate joint training converges to comparable accuracy 25–50% faster (§3.2). Mini-batch: 256 anchors per image, up to 128 positive, remainder negative; positive label if IoU $\geq 0.7$ with any ground-truth box, negative if IoU $< 0.3$ (§3.1.2, §3.1.3). Loss balance $\lambda = 10$ by default, making cls and reg terms roughly equal given $N_\text{cls} = 256$ and $N_\text{reg} \approx 2400$ anchor locations (§3.1.2). Learning rate schedule on PASCAL VOC: 0.001 for 60k mini-batches, 0.0001 for 20k; momentum 0.9; weight decay 0.0005 (§3.1.3). Headline results: VGG-16 trained on VOC 07+12 trainval achieves **73.2% mAP on PASCAL VOC 2007 test at 300 proposals** (Table III); VGG-16 trained on COCO trainval achieves **42.1% mAP@0.5 and 21.5% mAP@[.5,.95] on COCO test-dev** (Table XI). ResNet-101 backbone raises COCO val mAP to 48.4% mAP@0.5 / 27.2% mAP@[.5,.95], placing 1st at ILSVRC and COCO 2015 detection challenges (§4).

**Complexity.** Inference on K40 GPU with VGG-16: **198 ms/image (5 fps)** total — RPN forward 10 ms, Fast R-CNN forward 188 ms (Table V). ZF backbone: **59 ms/image (17 fps)** (Table V). The RPN head adds approximately $3 \times 3 \times 512 \times 512 + 1 \times 1 \times 512 \times (2 \times 9 + 4 \times 9) \approx 2.4$M parameters on top of VGG-16. Dominant parameter cost is the backbone (VGG-16 ≈ 138M; ZF ≈ 62M).

# Implementations

Original MATLAB + Caffe release by the paper authors; the Python + Caffe port by co-author Girshick was the dominant reference for years; Detectron2 is the modern PyTorch reference used in current research.

# Assessment

**Novelty.**

- Replaces external Selective Search / EdgeBoxes proposals (~1.5 s CPU per image) with a learned RPN sharing conv features with the Fast R-CNN detector — proposal cost drops to 10 ms GPU (§1; Table V).
- Introduces $k = 9$ anchor boxes (3 scale × 3 aspect-ratio templates) as translation-invariant proposal references, eliminating the need for image or filter pyramids (§3.1.1).
- Establishes the empirical case for two-stage detection: same ZF backbone, one-stage dense sliding-window variant trails by 4.8% mAP on PASCAL VOC 2007 (Table X; 58.7% two-stage vs 53.9% one-stage).

**Strengths.**

- 73.2% mAP on PASCAL VOC 2007 with VGG-16 + 07+12 trainval at 5 fps (Tables III, V) — pareto-dominant on speed–accuracy for 2015-era detectors.
- Robust to anchor hyperparameter choices: $\lambda$ varies mAP by ~1% across $\lambda \in [1, 100]$ (Table IX); reducing anchor aspect ratios from 3 to 1 while keeping 3 scales costs only ~0.1% mAP (Table VIII).
- Backbone-agnostic: substituting ResNet-101 raises COCO mAP@0.5 from 42.1% to 48.4% and mAP@[.5,.95] from 21.5% to 27.2% without architectural change (§4).

**Limitations.**

- Small objects below backbone stride (16 px for ZF/VGG-16) produce weak RPN activations; the COCO benchmark requires adding a $64^2$ anchor scale specifically to address this (§4.2).
- Anchor templates are fixed at design time — objects with aspect ratios outside $\{1{:}1, 1{:}2, 2{:}1\}$ are systematically under-covered; the regressor degrades gracefully (3–4% mAP loss at single aspect ratio, Table VIII) but cannot compensate for shapes entirely outside the template set.
- Real-time figures (5–17 fps) require GPU; CPU inference is impractical at reported speeds. One-stage detectors (SSD, YOLO, RetinaNet) are preferable when latency budget is below ~30 ms or GPU is unavailable (Table V; research-note §Applicability).
- Alternating 4-step training runs ~60k + 20k iterations on PASCAL VOC (§3.1.3); approximate joint training reduces wall-clock by 25–50% but introduces a gradient approximation that can subtly degrade very deep backbones (§3.2).

# References

1. Ren, He, Girshick, Sun. *Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks.* NeurIPS, 2015. [arXiv:1506.01497](https://arxiv.org/abs/1506.01497).
2. Long, Shelhamer, Darrell. *Fully Convolutional Networks for Semantic Segmentation.* CVPR, 2015. (The FCN formulation the RPN adopts.)
3. Krizhevsky, Sutskever, Hinton. *ImageNet Classification with Deep Convolutional Neural Networks.* NeurIPS, 2012. (Backbone pre-training paradigm.)
4. He, Zhang, Ren, Sun. *Deep Residual Learning for Image Recognition.* CVPR, 2016. (ResNet-101 backbone for the 2015 competition wins.)
5. He, Gkioxari, Dollár, Girshick. *Mask R-CNN.* ICCV, 2017. (Extends Faster R-CNN with a mask branch.)
