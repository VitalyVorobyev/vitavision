---
title: "PointRend"
date: 2026-09-23
summary: "Treats mask prediction as rendering: starts from a coarse mask and refines it by predicting labels only at adaptively selected uncertain points with a small point-wise MLP over fine-grained and coarse features, giving sharp boundaries at a fraction of dense-upsampling cost."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: cnn
flops: "0.9B vs 34B (4×conv head) for a 224×224 mask output"
prerequisites: [convolutional-neural-network]
failureModes: []
relations:
  - type: feeds_into
    target: mask2former
    confidence: high
    caution: "Mask2Former adopts PointRend's importance point sampling to compute its mask loss on sampled points, not the point head itself."
sources:
  primary: kirillov2020-pointrend
  references:
    - he2017-maskrcnn
    - chen2018-deeplab
    - lin2017-fpn
  notes: |
    Paper-grounded facts: adaptive subdivision inference
    (M0 = 7 → M = 224, N = 28² points per step, N·log2(M/M0) point predictions); training point
    selection k = 3, β = 0.75, N = 14² (§3.1); point head = 3 hidden layers × 256 channels MLP
    (§3.2); Mask R-CNN + PointRend AP gains (Table 1); FLOPs 0.9B vs 34B at 224×224 (Table 2).
implementations:
  - role: official
    repo: https://github.com/facebookresearch/detectron2
    commit: d1e04565d3bec8719335b88be9e9b961bf3ec464
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Refines a base segmentation network's coarse, fixed-grid prediction into a high-resolution label map, for both instance and semantic segmentation. Input: one or more backbone feature maps $f(x_i,y_i)$ on a grid typically 4× to 16× coarser than the image, plus the base network's existing coarse prediction — a $7\times7$ mask from Mask R-CNN's RoI head for instance segmentation, or a stride-16 prediction for semantic segmentation. Output: point predictions $p(x_i',y_i')$ at adaptively selected locations, composited onto a finer output grid up to full input resolution ($224\times224$ instance masks, or $1024\times2048$ semantic maps). The defining property is adaptive point selection by prediction uncertainty rather than dense per-pixel prediction: the output grid is treated as a rendering problem, borrowing coarse-to-fine subdivision from computer graphics instead of upsampling every grid cell uniformly.

# Architecture

**Family & shape.** A generic refinement module, not a standalone network family — attaches to an existing trained base segmentation network (Mask R-CNN for instance segmentation; DeepLabV3 or SemanticFPN for semantic segmentation). Input: one or more backbone feature maps 4×–16× coarser than the image, plus the base network's coarse $K$-class prediction. Output: per-instance or per-pixel $K$-class labels at adaptively selected point locations, composited onto the output grid up to full resolution.

**Blocks.** Three components: point selection, point-wise feature extraction, and the point head.

:::algorithm[PointRend point selection]
::input[Coarse $M_0\times M_0$ prediction; backbone feature map(s); target resolution $M\times M$; training only — over-generation factor $k$, importance fraction $\beta \in [0,1]$, points per region $N$]
::output[Point predictions $p(x_i',y_i')$ at adaptively selected locations, composited onto the output grid]

**Inference (adaptive subdivision).**
1. Start from the coarse $M_0\times M_0$ prediction.
2. Bilinearly upsample the current prediction $2\times$.
3. Select the $N=28^2$ most uncertain points on the denser grid — uncertainty is closeness to 0.5 for instance masks, the top-1/top-2 class-probability gap for semantic segmentation.
4. Re-predict the label at each selected point with the point head.
5. Repeat steps 2–4 until the grid reaches resolution $M\times M$.

**Training (non-iterative sampling).**
1. Over-generate: draw $kN$ candidate points uniformly at random, $k=3$.
2. Importance-sample: interpolate the coarse prediction at the $kN$ points, compute the task uncertainty, keep the $\beta N$ most uncertain, $\beta=0.75$.
3. Cover: sample the remaining $(1-\beta)N$ points uniformly. Default $N=14^2$ points per instance-segmentation region.
:::

Each selected point's feature vector concatenates two sources: fine-grained features, bilinearly interpolated from a backbone map (P2 of FPN for the Mask R-CNN/SemanticFPN instantiations, res2 for DeepLabV3), and coarse-prediction features, the $K$-class coarse prediction bilinearly interpolated at the same point. Coarse-prediction features disambiguate a point shared by two overlapping instance boxes, which otherwise carry identical fine-grained features but only one instance's foreground. A weight-shared MLP — three hidden layers of 256 channels for the Mask R-CNN instantiation — predicts the $K$-class label from the concatenated vector independently per point, with ReLU on hidden layers and sigmoid output.

The point head in PyTorch:

```python
import torch


class PointHead(torch.nn.Module):
    """Weight-shared per-point classifier. 3 hidden layers, 256
    channels each, for the Mask R-CNN instantiation; ReLU hidden
    layers, sigmoid output.
    """

    def __init__(self, in_channels: int, num_classes: int, hidden: int = 256):
        super().__init__()
        layers = []
        c = in_channels
        for _ in range(3):
            layers += [torch.nn.Conv1d(c, hidden, 1), torch.nn.ReLU()]
            c = hidden
        layers.append(torch.nn.Conv1d(c, num_classes, 1))
        self.mlp = torch.nn.Sequential(*layers)

    def forward(self, point_features: torch.Tensor) -> torch.Tensor:
        # point_features: (R, C, P) -- fine-grained + coarse-prediction
        # features concatenated along C, for P points sampled per region R
        logits = self.mlp(point_features)  # (R, K, P)
        return torch.sigmoid(logits)
```

**Training.** Dataset: the base network's own training set — Mask R-CNN on COCO for instance segmentation, DeepLabV3 or SemanticFPN on Cityscapes for semantic segmentation. Loss: the base network's task loss (per-class sigmoid binary cross-entropy for instance masks, per-pixel cross-entropy for semantic segmentation), evaluated only at the sampled training points rather than every pixel. The point-selection hyperparameters are robust over a broad range — $2<k<5$ and $0.75<\beta<1.0$ deliver similar results — but degrade sharply outside it: $k=10,\beta=1.0$ gives COCO AP 34.4, below both regular-grid sampling (AP 35.7) and uniform sampling (AP 35.9). Headline metrics: Mask R-CNN + PointRend improves mask AP by +0.9 to +2.8 over the 4×conv baseline (Table 1); DeepLabV3 + PointRend improves mIoU by +1.2 on Cityscapes (Table 6).

**Complexity.** At most $N\log_2\frac{M}{M_0}$ point predictions rather than the dense $M\times M$ grid. Example: $M_0=7$, $M=224$, $N=28^2$ gives 5 subdivision steps and $28^2\cdot4.25$ point predictions, 15 times smaller than $224^2$. This yields more than 30× FLOPs reduction at 224×224 output relative to a naively-upsized 4×conv head — 0.9B vs. 34B FLOPs (Table 2).

# Implementations

Official PyTorch implementation lives in `projects/PointRend` inside `facebookresearch/detectron2`, sharing detectron2's Mask R-CNN and SemanticFPN base architectures.

# Assessment

**Novelty.**

- Reframes segmentation output prediction as an adaptive point-based rendering problem instead of dense per-pixel prediction, borrowing coarse-to-fine subdivision from computer graphics — contrast: dense per-pixel heads such as Mask R-CNN's 4×conv mask head and DeepLabV3's dilated-convolution decoder.
- Generic refinement module applied unmodified on top of [Mask R-CNN](/atlas/mask-rcnn)'s instance-segmentation mask head, DeepLabV3's dilated-convolution decoder, and SemanticFPN's segmentation head.
- Concatenates fine-grained backbone features with coarse per-class prediction features at each point, resolving the ambiguity of two overlapping instance boxes that share identical fine-grained features at a shared point.

**Strengths.**

- Mask R-CNN + PointRend: +0.9 to +2.8 mask AP over the 4×conv baseline (Table 1), with more than 30× fewer FLOPs than a naively-upsized dense head at 224×224 output — 0.9B vs. 34B FLOPs (Table 2).
- DeepLabV3 + PointRend: +1.2 mIoU on Cityscapes (Table 6).
- Sharper object-boundary detail than dense-upsampling baselines even after mask AP saturates with point count, since IoU-based metrics under-weight boundary pixels relative to object interiors.

**Limitations.**

- Requires an existing trained base network supplying both backbone feature maps and a coarse prediction — PointRend is a refinement module, not a standalone segmenter.
- Training-time point sampling degrades sharply outside a stable hyperparameter range: $k=10,\beta=1.0$ scores COCO AP 34.4, below regular-grid (AP 35.7) and uniform (AP 35.9) sampling.
- The two uncertainty measures — closeness to 0.5 for instance masks, the top-1/top-2 class-probability gap for semantic segmentation — are not on a shared scale, so hyperparameters tuned for one task do not transfer directly to the other.

# References

1. A. Kirillov, Y. Wu, K. He, R. Girshick. *PointRend: Image Segmentation As Rendering.* CVPR, 2020. [arXiv 1912.08193](https://arxiv.org/abs/1912.08193)
2. K. He, G. Gkioxari, P. Dollár, R. Girshick. *Mask R-CNN.* ICCV, 2017. [arXiv 1703.06870](https://arxiv.org/abs/1703.06870)
3. L. Chen, G. Papandreou, I. Kokkinos, K. Murphy, A. Yuille. *DeepLab: Semantic Image Segmentation with Deep Convolutional Nets, Atrous Convolution, and Fully Connected CRFs.* IEEE TPAMI, 2018. [arXiv 1606.00915](https://arxiv.org/abs/1606.00915)
4. T. Lin, P. Dollár, R. Girshick, K. He, B. Hariharan, S. Belongie. *Feature Pyramid Networks for Object Detection.* CVPR, 2017. [arXiv 1612.03144](https://arxiv.org/abs/1612.03144)
