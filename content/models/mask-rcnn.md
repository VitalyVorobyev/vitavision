---
title: "Mask R-CNN"
date: 2026-05-11
summary: "Two-stage instance segmentation by adding a parallel FCN mask branch to Faster R-CNN — per-class binary masks predicted at each RoI under a decoupled per-pixel sigmoid loss, with RoIAlign's bilinear-sampling replacement for RoIPool's quantization that recovers pixel-accurate alignment."
tags: ["dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
prerequisites: []
failureModes: []
relations:
  - type: learned_alternative_of
    target: felzenszwalb-deformable-parts
    confidence: medium
    caution: "Mask R-CNN's CNN backbone, region proposals, and RoIAlign replace DPM's HOG features, root + part filters, and latent-SVM scoring; Mask R-CNN also outputs per-instance masks beyond DPM's bounding boxes."
sources:
  primary: he2017-maskrcnn
  references:
    - ren2015-faster
    - long2015-fcn
    - he2016-resnet
  notes: |
    Multi-task loss per RoI: L = L_cls + L_box + L_mask (§3 Mask R-CNN).
    Mask branch outputs Km^2-dim tensor — K binary masks of resolution
    m × m, per-pixel sigmoid; L_mask is the binary cross-entropy on the
    k-th channel only, where k is the ground-truth class. Mask resolution
    m=14 for ResNet-C4 head, m=28 for FPN head (Figure 4). RoIAlign uses
    x/16 (no rounding) with bilinear interpolation at four regularly
    spaced sampling points per bin; RoIPool used [x/16] quantization
    instead (§3 RoIAlign, Figure 3). Training: COCO train2017, 80 classes,
    SGD momentum 0.9, weight decay 1e-4, LR 0.02 → 0.002 step at 120k of
    160k iters, 8 GPUs at 2 images/GPU effective batch 16 (§3.1 Training);
    ResNeXt variants 1 image/GPU, LR 0.01. Headline COCO test-dev mask AP
    (Table 1): ResNet-101-FPN 35.7, ResNeXt-101-FPN 37.1; FCIS+++ baseline
    33.6. RoIAlign vs RoIPool ablation (Table 2c, ResNet-50-C4): ~3 AP /
    ~5 AP_75 gain. Per-class sigmoid vs softmax (Table 2b): +5.5 AP
    (30.3 vs 24.8). Inference: 5 fps Tesla M40, ~195 ms/image ResNet-101-
    FPN; ResNet-101-C4 ~400 ms/image (§4.4). Mask branch adds ~20%
    overhead over Faster R-CNN counterpart.
implementations:
  - role: official
    repo: https://github.com/facebookresearch/detectron2
    commit: d1e04565d3bec8719335b88be9e9b961bf3ec464
    framework: pytorch
    license: Apache-2.0
  - role: community
    repo: https://github.com/matterport/Mask_RCNN
    commit: 555126ee899a144ceff09e90b5b2cf46c321200c
    framework: tensorflow
    license: MIT
draft: false
---

# Motivation

Instance segmentation assigns, for each detected object in an RGB image, a class label, a confidence score, a bounding box, and a per-instance binary pixel mask. Input: RGB image, shorter edge resized to 800 px (§3.1). Output: per detection, a class label + score + bounding box + binary mask at $m \times m$ RoI resolution ($m = 14$ for the ResNet-C4 head, $m = 28$ for the FPN head), resized to the box extent at inference. The task is **instance segmentation** — distinct from semantic segmentation (per-pixel class labels, no instance identity) and from detection-only pipelines (bounding boxes, no pixel masks). The defining contribution is the extension of Faster R-CNN's two-stage pipeline (RPN + classification/box-regression RoI head) with a third parallel **mask branch** — a small FCN producing $K$ independent per-class binary masks at each RoI — combined with **RoIAlign**, which replaces RoIPool's two coarse coordinate quantizations $[x/16]$ with continuous bilinear sampling at $x/16$ (no rounding), recovering pixel-accurate spatial alignment that detection's box-level losses do not require but pixel-level mask prediction does.

# Architecture

**Family & shape.** Two-stage CNN detection model (Faster R-CNN substrate) extended with a parallel mask head. Backbone: ResNet-50, ResNet-101, or ResNeXt-101, paired with FPN (the recommended default). Input: RGB image, shorter edge 800 px (§3.1). Outputs per detected instance: class label + score + bounding box + binary mask at $m \times m$ RoI resolution — $m = 14$ for the ResNet-C4 head, $m = 28$ for the FPN head (Figure 4).

**Blocks.**

*(a) Region Proposal Network (RPN).* The RPN proposes candidate RoIs on the backbone feature map. This component is inherited directly from Faster R-CNN (Ren et al. 2015); Mask R-CNN "adopts the same two-stage procedure" (§3).

*(b) RoIAlign.* RoIPool quantizes the continuous floating-point coordinate $x$ to $[x/16]$ — the stride-16 feature-map cell — and then quantizes a second time when partitioning the RoI into spatial bins. Both steps introduce spatial misalignment negligible for bounding-box regression but catastrophic for pixel-accurate masks. RoIAlign removes both quantizations: it samples at the exact floating-point position $x/16$ and computes the feature value by bilinear interpolation at four regularly spaced sampling points per bin (§3, RoIAlign; Figure 3).

*(c) Three parallel heads.* After RoIAlign, each RoI is routed simultaneously to: (i) the classification head, producing $L_\text{cls}$; (ii) the bounding-box regression head, producing $L_\text{box}$; and (iii) the mask branch, a small FCN producing a $Km^2$-dimensional output encoding $K$ binary masks of resolution $m \times m$ per RoI, followed by per-pixel sigmoid and the mask loss $L_\text{mask}$ (§3, Mask R-CNN).

*(d) Decoupled mask-class prediction.* The mask branch outputs $K$ independent per-class binary masks per RoI; a per-pixel sigmoid (not a per-pixel softmax across $K$ classes) is applied to each. $L_\text{mask}$ is the average binary cross-entropy computed **only on the $k$-th mask channel**, where $k$ is the ground-truth class of the RoI. Masks for the remaining $K-1$ classes contribute nothing to the loss. The classification head selects which of the $K$ masks to use at inference. This decoupling avoids inter-class competition during mask training and is the paper's key departure from FCN-style per-pixel softmax prediction (§3, Mask R-CNN, paragraph 3).

The mask-head loss in PyTorch:

```python
import torch
import torch.nn.functional as F

def mask_head_loss(
    logits: torch.Tensor,      # (N, K, m, m)  — K per-class mask logits
    targets: torch.Tensor,     # (N, m, m)     — binary ground-truth masks
    gt_classes: torch.Tensor,  # (N,)          — ground-truth class index per RoI
) -> torch.Tensor:
    """Per-class sigmoid BCE on the ground-truth class channel only.
    N is the count of matched foreground RoIs (positive RoIs only).
    """
    N, K, m, _ = logits.shape

    idx = gt_classes.view(N, 1, 1, 1).expand(N, 1, m, m)
    chosen = logits.gather(dim=1, index=idx).squeeze(1)

    return F.binary_cross_entropy_with_logits(chosen, targets.float())
```

**Training.** Dataset: COCO `train2017` (80 classes). Loss: $L = L_\text{cls} + L_\text{box} + L_\text{mask}$ per RoI, where $L_\text{cls}$ and $L_\text{box}$ are identical to Faster R-CNN and $L_\text{mask}$ is the per-class sigmoid BCE on the ground-truth class channel only. Schedule: SGD with momentum 0.9, weight decay $10^{-4}$, initial LR 0.02 reduced $10\times$ at 120k iterations of 160k total, 8 GPUs at 2 images/GPU (effective mini-batch 16); ResNeXt variants use 1 image/GPU and starting LR 0.01 (§3.1, Training). Augmentation: standard horizontal flipping. Headline metrics (Table 1, COCO test-dev): ResNet-101-FPN **mask AP 35.7**; ResNeXt-101-FPN **mask AP 37.1**; both surpass FCIS+++ (AP 33.6) without test-time augmentation.

:::definition[Mask R-CNN multi-task loss]
$$L = L_\text{cls} + L_\text{box} + L_\text{mask}$$
$L_\text{cls}$ and $L_\text{box}$ inherit from Faster R-CNN; $L_\text{mask}$ is the average binary cross-entropy over the $k$-th mask channel only (where $k$ is the ground-truth class of the RoI), preventing inter-class competition during mask training (§3, Mask R-CNN).
:::

**Complexity.** The mask branch adds approximately 20% inference overhead over the Faster R-CNN counterpart (§3.1, Inference). Inference: ~5 fps on a Tesla M40 GPU at approximately 195 ms per image for ResNet-101-FPN; the ResNet-101-C4 variant runs at approximately 400 ms per image because the C4 box head incorporates the heavy res5 stage (§4.4).

# Implementations

Official PyTorch implementation in `facebookresearch/detectron2` (FAIR's successor to the original Caffe2 `Detectron` release); the most widely used third-party Keras/TensorFlow port is `matterport/Mask_RCNN`.

# Assessment

**Novelty.**

- Adds a parallel **mask branch** (small FCN per RoI) to Faster R-CNN's two-head detector (class + box) — extends the architecture rather than replacing the detection backbone with a segmentation network. Contrast: FCIS, which couples detection and segmentation in a single position-sensitive output, and MNC, which uses a multi-stage cascade.
- **Decoupled per-class binary masks** with per-pixel sigmoid + binary cross-entropy on the ground-truth class channel — contrast to FCN-style per-pixel softmax across classes, which forces inter-class competition during mask training.
- **RoIAlign** replaces RoIPool's two coarse quantizations $[x/16]$ with continuous-coordinate bilinear sampling — direct response to the localization-sensitivity gap that detection's box-only losses hide.
- Same framework extends naturally to **person keypoint detection** by treating each joint type as a one-hot binary mask channel (§5).
- Functions as the deep-learning replacement for the classical part-based detection paradigm (Felzenszwalb et al. 2010): CNN features + region proposals supplant HOG + root/part filters, and per-RoI mask prediction extends the output beyond DPM's bounding boxes.

**Strengths.**

- ResNet-101-FPN COCO test-dev mask AP 35.7; ResNeXt-101-FPN test-dev mask AP 37.1 (Table 1) — surpassed the official COCO 2016 instance-segmentation winner FCIS+++ (AP 33.6) without test-time augmentation.
- RoIAlign alone contributes approximately +3 AP and +5 AP$_{75}$ over RoIPool on ResNet-50-C4 (Table 2c) — the largest single ablation gain.
- Per-class sigmoid (decoupled) vs per-pixel softmax (FCN-style): +5.5 AP at ResNet-50-C4 (Table 2b, 30.3 vs 24.8) — confirms decoupling masks from class prediction.
- Framework generality demonstrated across instance segmentation, bounding-box object detection, and person keypoint detection without architectural changes (§5).

**Limitations.**

- Two-stage pipeline (RPN → RoI head) is slow for real-time deployment — approximately 5 fps on a Tesla M40 GPU (Abstract); not suitable for mobile or edge inference at <10 ms budgets.
- Fixed mask resolution per RoI ($14 \times 14$ for C4, $28 \times 28$ for FPN; Figure 4) — small or thin instances are resampled from low-resolution masks and lose fine boundary detail.
- NMS during inference suppresses heavily overlapping detections of the same class — two adjacent same-class instances that overlap above the NMS threshold lose one mask silently.
- Closed-vocabulary mask head: $K$ output channels for the $K$ training classes; novel classes require retraining or adaptation.

# References

1. K. He, G. Gkioxari, P. Dollár, R. Girshick. *Mask R-CNN.* ICCV, 2017. [arXiv 1703.06870](https://arxiv.org/abs/1703.06870)
2. S. Ren, K. He, R. Girshick, J. Sun. *Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks.* NeurIPS, 2015. [arXiv 1506.01497](https://arxiv.org/abs/1506.01497)
3. T.-Y. Lin, P. Dollár, R. Girshick, K. He, B. Hariharan, S. Belongie. *Feature Pyramid Networks for Object Detection.* CVPR, 2017. [arXiv 1612.03144](https://arxiv.org/abs/1612.03144)
4. J. Long, E. Shelhamer, T. Darrell. *Fully Convolutional Networks for Semantic Segmentation.* CVPR, 2015. [arXiv 1411.4038](https://arxiv.org/abs/1411.4038)
5. K. He, X. Zhang, S. Ren, J. Sun. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arXiv 1512.03385](https://arxiv.org/abs/1512.03385)
