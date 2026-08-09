---
title: "YOLOv1"
date: 2026-05-13
summary: "Single-stage CNN object detector that frames detection as one regression problem from full-image pixels to a 7×7×30 tensor of grid-cell box offsets, objectness, and 20-class probabilities — trained end-to-end and inferring 98 boxes per image at 45 fps on a Titan X."
tags: ["deep-learning", "real-time"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
prerequisites: []
failureModes: []
relations:
  - type: compared_with
    target: faster-rcnn
    confidence: high
    caution: "YOLO trades localization accuracy and small-object recall for ~3× throughput; same era, different design point."
  - type: learned_alternative_of
    target: felzenszwalb-deformable-parts
    confidence: high
    caution: "Replaces sliding-window deformable templates with single-pass CNN regression; reframes detection as regression rather than classification of proposals."
sources:
  primary: redmon2016-yolo
  references:
    - szegedy2015-inception
    - simonyan2014-vgg
    - ren2015-faster
    - felzenszwalb2010-detection
    - dalal2005-hog
  notes: |
    Detection as a single regression from a 448×448 RGB image to a 7×7×30 tensor
    for VOC (S=7 grid, B=2 boxes per cell, C=20 classes; per-cell layout =
    B·5 + C). Confidence (§2, eq. 1): Pr(Object)·IOU_pred^truth; class-specific
    score: Pr(Class_i)·IOU_pred^truth. Backbone is GoogLeNet-style (§2.1,
    Figure 3): 24 conv (alternating 1×1 reduction + 3×3) + 2 FC, leaky ReLU
    slope 0.1 (eq. 2), linear output. Fast YOLO is 9 conv + 2 FC. Multi-part
    SSE loss (§2.2, eq. 3) with λ_coord=5, λ_noobj=0.5, and (√w, √h)
    parametrization to balance large/small box gradients. Pretrain 20 conv on
    ImageNet 224×224 (top-5 88%, GoogLeNet-comparable), fine-tune all layers
    at 448×448; LR warmup 10⁻³→10⁻², then 10⁻² × 75 ep, 10⁻³ × 30 ep,
    10⁻⁴ × 30 ep; batch 64, momentum 0.9, weight decay 5×10⁻⁴; dropout 0.5
    after first FC; data aug ±20% scale/translate, HSV jitter ×1.5.
    Headline: YOLO 63.4% mAP @ 45 fps; Fast YOLO 52.7% @ 155 fps on VOC 2007
    test (Table 1). 98 boxes per image at test (§2.3, S·S·B = 7·7·2 = 98);
    NMS adds 2–3% mAP. Error analysis (§4.2): localization-dominant for YOLO;
    Fast R-CNN makes almost 3× more background false positives. Ensemble
    rescoring (§4.3): Fast R-CNN 71.8% → 75.0% with YOLO. Generalization to
    artwork (§4.5). VOC 2012 mAP 57.9% with an 8–10% gap on bottle/sheep/
    tv-monitor (§4.4).
implementations:
  - role: official
    repo: https://github.com/pjreddie/darknet
    commit: f6afaabcdf85f77e7aff2ec55c020c0e297c77f9
    framework: other
    license: "Public Domain (Darknet LICENSE v2)"
    weights_url: https://data.pjreddie.com/files/yolov1/yolov1.weights
    weights_license: "Public Domain (Darknet LICENSE v2)"
  - role: community
    repo: https://github.com/abeardear/pytorch-YOLO-v1
    commit: 823c45185a4af4f895d53ca466f725a1edbcfec0
    framework: pytorch
    license: MIT
draft: false
---

# Motivation

Takes a full RGB image and produces, in a single CNN forward pass, a set of bounding boxes each paired with class scores — with no region-proposal stage and no per-window classifier. Input: a 448×448 RGB image. Output: a 7×7×30 tensor encoding, for each cell of a 7×7 spatial grid, two bounding boxes (each as center offset, width, height, and objectness confidence) and 20 conditional class probabilities shared across both boxes. The defining property is the regression framing: detection is not a cascade of proposal and classification steps but a direct mapping from pixels to a per-cell prediction tensor in one shot, enabling real-time throughput without test-time proposal generation.

# Architecture

**Family & shape.** Single-stage CNN. Input: 448×448 RGB for detection, 224×224 for ImageNet pretraining. Output: 7×7×30 tensor for VOC (S=7, B=2, C=20, giving 7×7×(2·5+20)=7×7×30). Backbone is GoogLeNet-inspired (§2.1, Figure 3); it does not use Inception modules but adopts the same philosophy of alternating width reduction and spatial convolution.

**Blocks.** 24 convolutional layers followed by 2 fully connected layers; alternating 1×1 reduction layers precede 3×3 conv layers throughout the backbone (§2.1). All layers except the final output use leaky ReLU:

$$
\phi(x) = \begin{cases} x & \text{if } x > 0 \\ 0.1x & \text{otherwise} \end{cases} \tag{eq. 2}
$$

The final layer uses a linear activation. At test time, class-specific confidence scores per cell are computed as $\Pr(\text{Class}_i) \times \text{IOU}_\text{pred}^\text{truth} = \Pr(\text{Class}_i \mid \text{Object}) \times \Pr(\text{Object}) \times \text{IOU}_\text{pred}^\text{truth}$ (§2, eq. 1). The YOLO head decode for a single cell in Python:

```python
import numpy as np

def decode_yolo_cell(raw: np.ndarray, cell_row: int, cell_col: int,
                     S: int = 7, B: int = 2, C: int = 20):
    """Decode one cell from the 7×7×30 YOLO output tensor.

    raw: (S, S, B*5 + C) — raw network output, values in [0,1].
    Returns list of (x_img, y_img, w_img, h_img, class_conf[C]) per box.
    """
    results = []
    class_probs = raw[cell_row, cell_col, B * 5:]          # (C,) conditional

    for b in range(B):
        tx, ty, tw, th, conf = raw[cell_row, cell_col, b * 5: b * 5 + 5]

        # (x, y) are offsets from cell top-left, normalised to cell width
        x_img = (cell_col + tx) / S
        y_img = (cell_row + ty) / S
        # (w, h) are relative to the full image
        w_img = tw
        h_img = th

        # class-specific confidence: Pr(Class_i) × IOU (paper §2, eq. 1)
        class_conf = class_probs * conf                    # (C,)
        results.append((x_img, y_img, w_img, h_img, class_conf))

    return results
```

**Training.** The first 20 conv layers are pretrained on ImageNet at 224×224 (top-5 accuracy 88%, comparable to GoogLeNet, §2.2); the full detection head is fine-tuned at 448×448. The loss is a multi-part sum-squared-error over all S×S grid cells:

:::definition[YOLO multi-part loss]
Sum-squared-error over all cells and responsible box predictors. $\mathbf{1}_{ij}^\text{obj}$ is 1 when cell $i$'s $j$-th box is responsible for a ground-truth object; $\mathbf{1}_i^\text{obj}$ is 1 when any object center falls in cell $i$.

$$
\begin{aligned}
\mathcal{L} &=
  \lambda_\text{coord} \sum_{i=0}^{S^2} \sum_{j=0}^{B} \mathbf{1}_{ij}^\text{obj}
    \bigl[(x_i - \hat x_i)^2 + (y_i - \hat y_i)^2\bigr] \\
&+ \lambda_\text{coord} \sum_{i=0}^{S^2} \sum_{j=0}^{B} \mathbf{1}_{ij}^\text{obj}
    \bigl[(\sqrt{w_i} - \sqrt{\hat w_i})^2 + (\sqrt{h_i} - \sqrt{\hat h_i})^2\bigr] \\
&+ \sum_{i=0}^{S^2} \sum_{j=0}^{B} \mathbf{1}_{ij}^\text{obj}
    (C_i - \hat C_i)^2 \\
&+ \lambda_\text{noobj} \sum_{i=0}^{S^2} \sum_{j=0}^{B} \mathbf{1}_{ij}^\text{noobj}
    (C_i - \hat C_i)^2 \\
&+ \sum_{i=0}^{S^2} \mathbf{1}_i^\text{obj}
    \sum_{c \in \mathcal{C}} (p_i(c) - \hat p_i(c))^2
\end{aligned}
$$

with $\lambda_\text{coord} = 5$, $\lambda_\text{noobj} = 0.5$. Width and height are parametrized as $(\sqrt{w}, \sqrt{h})$ to reduce gradient imbalance between large and small boxes (§2.2, eq. 3).
:::

Learning rate schedule: warmup 10⁻³→10⁻² over the first epochs, then 10⁻² for 75 epochs, 10⁻³ for 30 epochs, 10⁻⁴ for 30 epochs (§2.2). Batch 64, momentum 0.9, weight decay 5×10⁻⁴; dropout 0.5 after the first FC layer; data augmentation: random scaling and translations up to ±20%, exposure and saturation jitter ×1.5 in HSV. Headline: YOLO 63.4% mAP at 45 fps, Fast YOLO 52.7% mAP at 155 fps on VOC 2007 test (Table 1).

**Complexity.** The network has 24 conv layers + 2 FC layers; the output is a 7×7×30 tensor per image. At test time the model produces 98 candidate bounding boxes per image (S×S×B = 7×7×2, §2.3). No parameter count or FLOPs figure is reported in the paper.

# Implementations

Official Darknet (C/CUDA) release by the paper authors; a widely-used PyTorch community port exists for research use.

# Assessment

**Novelty.**

- Replaces the DPM sliding-window pipeline — hand-crafted deformable templates scored independently at each location — with a single CNN regression over the full image, eliminating the multi-step proposal-and-classify structure (§3).
- Replaces the R-CNN / Fast R-CNN multi-stage pipeline — external proposal generator, per-region warped feature extraction, SVM classifier — with one forward pass that shares features across all boxes and all classes simultaneously (§3).
- Global image reasoning: each grid cell sees context from the full receptive field rather than a cropped proposal window, reducing background false positives relative to Fast R-CNN (§4.2).

**Strengths.**

- Real-time throughput: 45 fps (base YOLO) and 155 fps (Fast YOLO) on Titan X, versus 7 fps for Faster R-CNN VGG-16 and 0.5 fps for Fast R-CNN (Table 1).
- Fewer background false positives than Fast R-CNN: localization is YOLO's dominant error type, while Fast R-CNN makes almost 3× more background errors (§4.2).
- Generalizes across domains: YOLO degrades less than R-CNN on artwork benchmarks (Picasso dataset, People-Art dataset), suggesting that global regression is less reliant on photographic-image statistics (§4.5).
- Ensemble synergy: using YOLO to rescore Fast R-CNN detections raises Fast R-CNN's VOC 2007 mAP from 71.8% to 75.0% (§4.3), demonstrating complementary error modes.

**Limitations.**

- Localization is the dominant error source (§4.2); in contrast to proposal-based detectors, YOLO sacrifices per-box coordinate precision for throughput.
- Small objects appearing in groups are poorly handled: the 7×7 grid imposes a hard constraint of at most B=2 detections per cell, so dense clusters (e.g. flocks of birds) exceed the grid's representational capacity (§2.4).
- The coarse 7×7 spatial grid (effective stride 64 px on 448×448 input) limits localization precision for small-scale objects and cannot assign different classes to two objects whose centers land in the same cell (§2.4).
- VOC 2012 mAP is 57.9%, notably below the 63.4% on VOC 2007; small-object categories such as bottle, sheep, and tv/monitor are 8–10% below R-CNN or Feature Edit (§4.4).

# References

1. Redmon, Divvala, Girshick, Farhadi. *You Only Look Once: Unified, Real-Time Object Detection.* CVPR 2016. [arXiv 1506.02640](https://arxiv.org/pdf/1506.02640)
2. Szegedy, Liu, Jia, Sermanet, Reed, Anguelov, Erhan, Vanhoucke, Rabinovich. *Going deeper with convolutions.* CVPR 2015. [arXiv 1409.4842](https://arxiv.org/pdf/1409.4842)
3. Simonyan, Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR 2015. [arXiv 1409.1556](https://arxiv.org/pdf/1409.1556)
4. Ren, He, Girshick, Sun. *Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks.* NeurIPS 2015. [arXiv 1506.01497](https://arxiv.org/pdf/1506.01497)
5. Felzenszwalb, Girshick, McAllester, Ramanan. *Object Detection with Discriminatively Trained Part-Based Models.* IEEE TPAMI, 2010. [paper](https://cs.brown.edu/people/pfelzens/papers/lsvm-pami.pdf)
