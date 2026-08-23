---
title: "Swin Transformer"
date: 2026-08-23
summary: "Hierarchical vision transformer with shifted-window attention: linear complexity in image area, CNN-style multi-scale feature maps, and a drop-in backbone for dense prediction — with relative position bias replacing absolute embeddings."
tags: ["deep-learning"]
domain: representation-learning
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
params: "29M (Swin-T), 50M (Swin-S), 88M (Swin-B)"
prerequisites: [vit, attention-mechanism, transformer]
failureModes: []
sources:
  primary: liu2021-swin
  references:
    - vaswani2017-attention
    - touvron2020-deit
relations:
  - type: compared_with
    target: resnet
    confidence: high
    caution: "Benchmarked as interchangeable backbones inside identical detection/segmentation frameworks at matched FLOPs tiers — a backbone-level practitioner choice across paradigms."
implementations:
  - role: official
    repo: https://github.com/microsoft/Swin-Transformer
    commit: f82860bfb5225915aca09c3227159ee9e1df874d
    framework: pytorch
    license: MIT
    weights_license: MIT
---

# Motivation

Takes an RGB image of arbitrary size $H \times W$ and produces a hierarchy of feature maps at four resolutions, $H/4\times W/4$ down to $H/32\times W/32$, with channel widths doubling at each stage. That is the resolution and channel convention of a convolutional backbone such as VGG or [resnet](/atlas/resnet), so the encoder is a drop-in replacement inside FPN- and U-Net-style dense-prediction heads. A single pretrained backbone is evaluated on ImageNet-1K classification, COCO object detection and instance segmentation, and ADE20K semantic segmentation.

The design targets two properties that [vit](/atlas/vit) lacks as a general-purpose backbone. Previous vision Transformers "produce feature maps of a single low resolution and have quadratic computation complexity to input image size due to computation of self-attention globally"; that architecture "is unsuitable for use as a general-purpose backbone network on dense vision tasks or when the input image resolution is high". Swin replaces global self-attention with attention computed inside non-overlapping local windows, giving linear computational complexity with respect to image size, and stacks the result into a multi-scale hierarchy.

# Architecture

**Family & shape.** The input is tiled into non-overlapping $4\times4$ patches, each a raw feature vector of dimension $4\times4\times3=48$, linearly embedded to $C$ channels. Four stages follow. Between stages a patch-merging layer concatenates each $2\times2$ neighbourhood of tokens into a $4C$-dimensional vector and linearly projects it to $2C$, halving spatial resolution and doubling channel width. Stage resolutions are $H/4\times W/4$, $H/8\times W/8$, $H/16\times W/16$, $H/32\times W/32$ with channel widths $C\to2C\to4C\to8C$. Window and patch sizes must evenly divide the feature-map resolution at each stage; bottom-right padding is applied when they do not.

**Blocks.** Each block is a standard Transformer block (see [transformer](/atlas/transformer)) with the multi-head self-attention module replaced by a window-based variant, "with other layers kept the same". Self-attention is computed inside non-overlapping windows of $M\times M$ patches, with $M=7$ by default and window size $7\times7$ fixed across all stages and variants. Window-local attention alone has no cross-window connectivity, so consecutive blocks alternate two partitionings.

:::definition[Two successive Swin blocks]
Block $l$ uses the regular window partition (W-MSA). Block $l+1$ repartitions with the window grid displaced by $(\lfloor M/2\rfloor,\lfloor M/2\rfloor)$ patches (SW-MSA), so each shifted window straddles neighbours of the previous partition and information leaks across window boundaries at every second block.

$$
\hat z^l=\text{W-MSA}(\text{LN}(z^{l-1}))+z^{l-1}
$$

Block $l+1$ substitutes SW-MSA for W-MSA in the same skeleton. The LN, residual and MLP sub-layers are unchanged.
:::

The shifted partition produces more windows than the regular one, several of them smaller than $M\times M$. Enlarging the grid by padding is expensive — "the increased computation with this naive solution is considerable (2×2→3×3, which is 2.25 times greater)". Batched computation is instead performed by a cyclic shift of the feature map followed by attention masking, which keeps the window count of the regular partition.

**Complexity.** With $h \times w$ patches and channel width $C$, global multi-head self-attention and window-based self-attention cost

$$
\Omega(\text{MSA})=4hwC^2+2(hw)^2C
$$

$$
\Omega(\text{W-MSA})=4hwC^2+2M^2hwC
$$

The first is quadratic in patch count $hw$; the second is linear in $hw$ for fixed $M$. The quadratic term dominates at high resolution, which is the stated motivation for windowing. See [attention-mechanism](/atlas/attention-mechanism) for the unwindowed formulation.

**Position information.** Absolute sinusoidal or learned position embeddings are not used. A learned relative position bias is added inside the softmax of every window.

:::definition[Relative position bias]
$B$ holds one bias per relative displacement between two patches in a window. Values are taken from a smaller learned table $\hat B$, since relative coordinates along each axis lie in $[-M+1, M-1]$.

$$
\text{Attention}(Q,K,V)=\text{SoftMax}(QK^T/\sqrt d + B)V
$$

with $B\in\mathbb R^{M^2\times M^2}$ and $\hat B\in\mathbb R^{(2M-1)\times(2M-1)}$.
:::

$\hat B$ is sized for a fixed window size. Fine-tuning at a different window size requires bi-cubic interpolation of $\hat B$.

**Variants.** Query/key dimension per head is fixed at $d=32$ and MLP expansion ratio at $\alpha=4$ across all variants; only the base channel width $C$ and the per-stage layer counts change. Head counts follow the channel doubling — Swin-T uses dim 96/head 3, dim 192/head 6, dim 384/head 12, dim 768/head 24 across its four stages.

| Variant | $C$ | Layers per stage | Params | FLOPs |
|---|---|---|---|---|
| Swin-T | 96 | 2, 2, 6, 2 | 29M | 4.5G |
| Swin-S | 96 | 2, 2, 18, 2 | 50M | 8.7G |
| Swin-B | 128 | 2, 2, 18, 2 | 88M | 15.4G |
| Swin-L | 192 | 2, 2, 18, 2 | — | — |

Parameters and FLOPs are quoted at $224^2$ input. Swin-L is reported only under ImageNet-22K pretraining. The complexity of Swin-T and Swin-S "are similar to those of ResNet-50 (DeiT-S) and ResNet-101" respectively.

**Training.** The recipe is borrowed from [deit](/atlas/deit) — most of its augmentation and regularization strategies are included in training. Stochastic-depth ratio is scaled with capacity, 0.2/0.3/0.5 for Swin-T/S/B. All reported results use ImageNet-1K or ImageNet-22K pretraining before downstream fine-tuning; no from-scratch-on-small-data results are reported.

# Implementations

Official PyTorch release from Microsoft; ships training code, configs, and pretrained classification and dense-prediction checkpoints under MIT.

# Assessment

## What Swin introduced

- **Shifted windows.** Alternating regular and displaced window partitions across consecutive blocks restore cross-window information flow without any global attention step.
- **Hierarchy via patch merging.** Concatenating $2\times2$ token neighbourhoods to $4C$ and projecting to $2C$ builds a CNN-like four-scale feature pyramid, which is what makes the backbone usable inside existing dense-prediction frameworks.
- **Linear complexity in image area.** $\Omega(\text{W-MSA})=4hwC^2+2M^2hwC$ replaces the $2(hw)^2C$ term of global attention.
- **Relative position bias inside the softmax**, in place of absolute position embedding added to the input.
- **Hardware-efficient batching.** Cyclic shift plus attention masking avoids the padding overhead of enlarging the window grid.

**Strengths.**

- ImageNet-1K, 22K-pretrained — Swin-L at $384^2$ reaches 87.3% top-1; Swin-B reaches 85.2% at $224^2$ and 86.4% at $384^2$.
- ImageNet-1K, trained from scratch — Swin-T 81.3% top-1 versus DeiT-S 79.8% at comparable complexity; Swin-S 83.0%; Swin-B $384^2$ 84.5% versus DeiT-B 83.1%. Swin-B at $224^2$ is reported as 83.5% in Table 1(a) and as 83.3% in the paper's own prose and Table 8 for the identical configuration (throughput 278.1 img/s in both), an internal inconsistency; Table 1's 83.5% is the citable figure, but the discrepancy matters if precision below 0.5pp does.
- COCO — Swin-T with Cascade [mask-rcnn](/atlas/mask-rcnn) reaches 50.5 box AP / 43.7 mask AP against 46.3 / 40.1 for a ResNet-50 backbone in the same framework. Swin-L with HTC++ and multi-scale testing reaches 58.7 box AP and 51.1 mask AP on test-dev, "surpassing the previous best results by +2.7 box AP (Copy-paste without external data) and +2.6 mask AP (DetectoRS)".
- ADE20K — Swin-L with UperNet reaches 53.5 mIoU on val, "surpassing the previous best model by +3.2 mIoU (50.3 mIoU by SETR)". Swin-S reaches 49.3 mIoU against 44.0 mIoU for DeiT-S.
- The shift is load-bearing. Removing it drops the model to 80.2 top-1 / 47.7 box AP / 41.5 mask AP / 43.3 mIoU against 81.3 / 50.5 / 43.7 / 46.1 with shifting — "+1.1% top-1 accuracy on ImageNet-1K, +2.8 box AP/+2.2 mask AP on COCO, and +2.8 mIoU on ADE20K".
- Relative position bias likewise. Against no position encoding and against absolute position embedding it gives "+1.2%/+0.8% top-1", "+1.3/+1.5 box AP and +1.1/+1.3 mask AP on COCO, and +2.3/+2.9 mIoU on ADE20K".
- Cyclic-shift batching is 13%, 18% and 18% faster than naive padding for Swin-T/S/B.

**Limitations.**

- Window size is fixed at $7\times7$ across all stages and variants, and $\hat B$ is sized for it. Changing $M$ at fine-tuning time requires bi-cubic interpolation of $\hat B$ — an explicit extra step, not automatic. No ablation of window sizes below or above 7 is reported.
- Attention never spans the whole feature map inside a block. Cross-window connectivity exists only through the alternating shift, so a query's effective receptive field grows with depth rather than being global from the first layer.
- $M$ must evenly divide the feature-map size at every stage; bottom-right padding is applied when it does not. Extreme aspect ratios are not studied.
- Absolute position embedding added on top of the relative bias flips sign by task — "+0.4%" top-1 but "-0.2 box/mask AP on COCO and -0.6 mIoU on ADE20K". Position encoding choices cannot be tuned on classification alone.
- All results assume ImageNet-1K or ImageNet-22K pretraining; the low-data regime is not evaluated.
- The windowing and patch-merging machinery adds no benefit when only image-level classification at fixed resolution is needed and a single-scale backbone suffices.

# References

1. Liu, Z., Lin, Y., Cao, Y., Hu, H., Wei, Y., Zhang, Z., Lin, S., & Guo, B. *Swin Transformer: Hierarchical Vision Transformer using Shifted Windows.* ICCV, 2021. [arXiv 2103.14030](https://arxiv.org/abs/2103.14030)
2. Vaswani, A., Shazeer, N., Parmar, N., et al. *Attention Is All You Need.* NeurIPS, 2017. [arXiv 1706.03762](https://arxiv.org/abs/1706.03762)
3. Touvron, H., Cord, M., Douze, M., Massa, F., Sablayrolles, A., & Jégou, H. *Training data-efficient image transformers & distillation through attention.* ICML, 2021. [arXiv 2012.12877](https://arxiv.org/abs/2012.12877)
