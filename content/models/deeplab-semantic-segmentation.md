---
title: "DeepLab"
date: 2026-05-11
summary: "Dense semantic segmentation by repurposing an ImageNet classifier with atrous (dilated) convolution to preserve spatial resolution, an Atrous Spatial Pyramid Pooling head for multi-scale context, and a fully-connected CRF post-processor for boundary refinement — multi-year state of the art on PASCAL VOC 2012."
tags: ["dense-prediction", "deep-learning"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: cnn
prerequisites: []
failureModes: []
relations:
  - type: compared_with
    target: unet-segmentation
    confidence: high
    caution: "Same task, different mechanism — atrous backbone + multi-scale head + dense CRF vs symmetric encoder-decoder with skip concatenation."
sources:
  primary: chen2018-deeplab
  references:
    - long2015-fcn
    - ronneberger2015-unet
    - he2016-resnet
  notes: |
    1-D atrous convolution: y[i] = Σ_k x[i + r·k] w[k] (Eq. 1, §3.1). Effective
    receptive size k_e = k + (k-1)(r-1). Output stride 8 via stride-1 last two
    pools + atrous r=2 and r=4, followed by 8× bilinear upsampling (§3.1).
    ASPP-L head: four parallel 3×3 atrous convs at rates {6,12,18,24} summed
    (§4.1.2). ASPP-S uses {2,4,8,12}. Dense CRF pairwise potential (Eqs. 2-3,
    §3.3): bilateral appearance kernel (σ_α, σ_β) + spatial smoothness kernel
    (σ_γ); 10 mean-field iterations; fixed w_2=3, σ_γ=3; cross-validation on
    100 VOC val images. Training v2: SGD momentum 0.9, weight decay 5e-4,
    "poly" LR (init 0.001 / 0.01 classifier), batch 10, 20K iterations
    (§4.1.2); multi-scale fusion {0.5, 0.75, 1}. Headline: 79.7% VOC test mIoU
    (Table V), 77.69% val (Table IV), 45.7% PASCAL-Context (Table VI), 63.1%
    PASCAL-Person-Part (Table VII), 63.1% Cityscapes test (Table VIII). 8 FPS
    Titan X / 0.5 s CRF per image (§1). Trainaug 10,582 images (§4.1).
implementations:
  - role: official
    repo: https://bitbucket.org/aquariusjay/deeplab-public-ver2
    commit: 071ef5a59aad8d9e6e1f5b8dff3d7a5c984a3d3a
    framework: caffe
    license: BSD-2-Clause
  - role: community
    repo: https://github.com/kazuto1011/deeplab-pytorch
    commit: 4219467fa5de07985f834f1bd8c04c186dc8f6d8
    framework: pytorch
    license: MIT
draft: false
---

# Motivation

Dense pixel-wise classification assigns a class label to every pixel of an arbitrary-resolution RGB image and produces per-pixel $K$-way class probabilities at the original input resolution. Three structural problems arise when applying ImageNet-pretrained classifiers to this task: repeated strided pooling destroys spatial resolution; objects appear at multiple scales without explicit handling; and CNN spatial invariance over-smooths segment boundaries. DeepLab (v1/v2) addresses all three in a single pipeline: atrous (dilated) convolution repurposes the backbone for dense prediction by enlarging the receptive field without discarding spatial resolution or adding parameters; Atrous Spatial Pyramid Pooling (ASPP) captures multi-scale context in a single feed-forward pass through parallel atrous branches at four rates; and a fully-connected dense CRF post-processor refines boundary placement using pairwise Gaussian potentials over all pixel pairs.

# Architecture

**Family & shape.** CNN encoder with an ASPP multi-scale head and a bilateral dense-CRF post-processor. Input $H \times W \times 3$ RGB. Output $H \times W \times K$ per-pixel class probability scores at the original input resolution. Backbone: VGG-16 (DeepLab v1) or ResNet-101 (DeepLab v2 headline).

**Blocks.**

*(a) Atrous convolution.* The 1-D atrous convolution is defined as

$$y[i] = \sum_{k=1}^{K} x[i + r \cdot k]\, w[k] \quad \text{(Eq. 1, §3.1)}$$

where $r$ is the atrous rate. A $k \times k$ filter dilated at rate $r$ has effective receptive size $k_e = k + (k-1)(r-1)$ with no additional parameters.

*(b) Output-stride-8 backbone.* The last two strided max-pooling layers are set to stride 1; downstream convolutions are replaced with atrous convolutions at rates $r=2$ (pool5 region) and $r=4$ (subsequent convolutions). This chain reduces the output stride from 32 to 8 — an $8 \times$ bilinear upsampling then restores the input resolution (§3.1, Figure 1).

*(c) ASPP head (DeepLab v2 / ASPP-L).* Four parallel $3 \times 3$ atrous convolutions operate on the same output-stride-8 feature map at rates $r \in \{6, 12, 18, 24\}$. Each branch is followed by a $1 \times 1$ projection to $K$ class logits; the four branch outputs are summed. This is the ASPP-L variant; ASPP-S uses $r \in \{2, 4, 8, 12\}$ (§4.1.2).

*(d) Upsampling.* Bilinear interpolation by $8 \times$ restores the output to $H \times W \times K$ (§3.1).

The ASPP module in PyTorch:

```python
import torch
import torch.nn as nn

class ASPP(nn.Module):
    """ASPP-L: four parallel atrous 3×3 convs at rates {6,12,18,24}, summed."""

    def __init__(self, in_channels: int, num_classes: int) -> None:
        super().__init__()
        rates = [6, 12, 18, 24]
        self.branches = nn.ModuleList([
            nn.Conv2d(
                in_channels, num_classes,
                kernel_size=3,
                padding=r,
                dilation=r,
                bias=True,
            )
            for r in rates
        ])

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        out = self.branches[0](x)
        for branch in self.branches[1:]:
            out = out + branch(x)
        return out
```

**Training.** Dataset: PASCAL VOC 2012 segmentation benchmark, trainaug split of 10,582 images (§4.1). Loss: per-pixel cross-entropy. Schedule: SGD with momentum 0.9, weight decay $5 \times 10^{-4}$, "poly" learning rate $\text{LR} \times (1 - \text{iter}/\text{max\_iter})^{0.9}$ starting at 0.001 (0.01 for the final classifier layer), batch size 10, 20,000 iterations (§4.1.2). Augmentation: multi-scale input fusion at scales $\{0.5, 0.75, 1\}$ with per-position maximum fusion across scale maps (§4.1.2). MS-COCO pre-training adds approximately 2 mIoU points on top of PASCAL VOC training.

Headline metrics (all figures from paper tables):

- PASCAL VOC 2012 **test mIoU: 79.7%** — DeepLab-ASPP, ResNet-101, MS-COCO pre-training, multi-scale input, dense CRF (Table V, §4.1).
- PASCAL VOC 2012 **val mIoU: 77.69%** — best val model with dense CRF (Table IV, §4.1.2).
- PASCAL-Context **test mIoU: 45.7%** (60 classes) (Table VI, §4.2).
- PASCAL-Person-Part **63.1%** — best model, multi-scale input, dense CRF, without COCO pre-training (Table VII, §4.3).
- Cityscapes **test mIoU: 63.1%** (Table VIII, §4.4).

:::definition[Dense CRF energy]
The pairwise potential of the fully-connected CRF (Eqs. 2–3, §3.3):

$$
\theta_{ij}(x_i, x_j) = \mu(x_i, x_j)\left[w_1 \exp\!\left(-\frac{\|p_i - p_j\|^2}{2\sigma_\alpha^2} - \frac{\|I_i - I_j\|^2}{2\sigma_\beta^2}\right) + w_2 \exp\!\left(-\frac{\|p_i - p_j\|^2}{2\sigma_\gamma^2}\right)\right]
$$

The bilateral appearance kernel (bandwidth $\sigma_\alpha$ for position, $\sigma_\beta$ for RGB colour) penalises label disagreement between nearby pixels of similar colour; the spatial smoothness kernel (bandwidth $\sigma_\gamma$) penalises disagreement between spatially close pixels regardless of colour. Mean-field inference runs for 10 iterations via the permutohedral lattice. Fixed defaults: $w_2 = 3$, $\sigma_\gamma = 3$; the remaining three parameters ($w_1$, $\sigma_\alpha$, $\sigma_\beta$) are cross-validated on 100 VOC val images (§4.1.1).
:::

**Complexity.** Atrous repurposing replaces strided convolutions with atrous convolutions at the same kernel sizes and channel widths — parameter count and FLOPs are unchanged relative to the underlying VGG-16 or ResNet-101 backbone. Inference: 8 FPS on NVIDIA Titan X for the DCNN alone; dense CRF post-processing adds approximately 0.5 s on CPU per VOC image (§1).

# Implementations

Official Caffe v2 release on Bitbucket; the most widely used PyTorch reimplementation is `kazuto1011/deeplab-pytorch`, which reproduces the v2 results with VOC/COCO/Cityscapes pre-trained weights.

# Assessment

**Novelty.**

- Repurposes ImageNet classifiers for dense prediction via **atrous convolution** that enlarges the receptive field without subsampling — in contrast to FCN, which retains strided downsampling and relies on learned deconvolution with skip-fusion to recover spatial detail.
- **ASPP** captures multi-scale context with a single feed-forward pass through four parallel atrous branches — in contrast to image-pyramid approaches that re-run the full network on rescaled inputs at multiple scales.
- Fully-connected dense CRF as a decoupled post-processor with Krähenbühl–Koltun mean-field inference — in contrast to short-range grid CRF approaches (4- or 8-connected) that cannot model long-range pairwise interactions.

**Strengths.**

- 79.7% PASCAL VOC 2012 test mIoU with ResNet-101 backbone, ASPP-L head, MS-COCO pre-training, multi-scale input, and dense CRF — Table V; multi-year SOTA on the VOC leaderboard.
- 45.7% PASCAL-Context test mIoU on a 60-class dataset — Table VI; outperforms FCN and other contemporary methods at publication.
- Atrous convolution is parameter-free relative to the standard convolution it replaces and FLOPs-equivalent — a direct consequence of the Eq. 1 reformulation.
- Dense CRF post-processing tightens object boundaries that the CNN over-smooths — applied on top of the DCNN unary potentials at inference time and cross-validated against a fixed network on 100 VOC val images (§4.1.1).

**Limitations.**

- **Thin elongated structures** (poles, branches, plant stems): the output-stride-8 backbone over-smooths these, and the dense CRF cannot fully recover them when bilateral bandwidths are tuned for typical object scales.
- **Instance-level distinctions impossible**: semantic segmentation only — two adjacent same-class instances (touching persons, adjacent dogs) cannot be separated; switch to Mask R-CNN or Panoptic FPN for instance or panoptic segmentation.
- **Decoupled CRF and DCNN training**: CRF parameters are cross-validated against a fixed DCNN on 100 VOC val images; end-to-end joint training of unary and pairwise terms is left to contemporaneous work (CRF-as-RNN).
- **Caffe-only official build**: the paper authors' Bitbucket release (BSD-2-Clause) is a Caffe fork; modern users typically run the `kazuto1011/deeplab-pytorch` MIT-licensed community port for PyTorch integration. Both licenses are permissive — this is a portability caveat, not a license restriction.

# References

1. L. Chen, G. Papandreou, I. Kokkinos, K. Murphy, A. Yuille. *DeepLab: Semantic Image Segmentation with Deep Convolutional Nets, Atrous Convolution, and Fully Connected CRFs.* IEEE TPAMI, 2018. [arXiv:1606.00915](https://arxiv.org/abs/1606.00915)
2. J. Long, E. Shelhamer, T. Darrell. *Fully Convolutional Networks for Semantic Segmentation.* CVPR, 2015. [arXiv:1411.4038](https://arxiv.org/abs/1411.4038)
3. O. Ronneberger, P. Fischer, T. Brox. *U-Net: Convolutional Networks for Biomedical Image Segmentation.* MICCAI, 2015. [arXiv:1505.04597](https://arxiv.org/abs/1505.04597)
4. P. Krähenbühl, V. Koltun. *Efficient Inference in Fully Connected CRFs with Gaussian Edge Potentials.* NeurIPS, 2011.
5. K. Simonyan, A. Zisserman. *Very Deep Convolutional Networks for Large-Scale Image Recognition.* ICLR, 2015. [arXiv:1409.1556](https://arxiv.org/abs/1409.1556)
