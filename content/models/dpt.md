---
title: "DPT (Dense Prediction Transformer)"
date: 2026-09-23
summary: "ViT encoder whose tokens from four layers are reassembled into image-like feature maps at multiple resolutions and fused by a convolutional decoder into full-resolution dense predictions; trained for monocular depth with the MiDaS protocol and for semantic segmentation."
tags: ["deep-learning", "dense-prediction", "multi-scale"]
domain: depth
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: hybrid
params: "112M (DPT-Base) — 343M (DPT-Large)"
prerequisites: [monocular-depth-estimation, transformer, attention-mechanism]
failureModes: []
relations:
  - type: feeds_into
    target: depth-anything
    confidence: high
  - type: feeds_into
    target: depth-anything-v2
    confidence: high
  - type: feeds_into
    target: depth-anything-3
    confidence: high
  - type: feeds_into
    target: dust3r
    confidence: high
    caution: "DUSt3R reuses DPT-style regression heads to decode pointmaps, not depth."
  - type: feeds_into
    target: vggt
    confidence: high
    caution: "VGGT uses a DPT upsampler for its dense heads; the aggregator backbone is its own."
sources:
  primary: ranftl2021-dpt
  references:
    - dosovitskiy2020-vit
    - ranftl2019-midas
  notes: |
    Paper-grounded facts: Reassemble = Resample ∘ Concatenate ∘ Read
    (Eqs. 1–6, §3); RefineNet-style fusion blocks; variants DPT-Base 112M, DPT-Large 343M,
    DPT-Hybrid 123M vs MiDaS 105M (Table 9); MIX 6 training set (~1.4M images, §4.1); depth and
    ADE20K segmentation results per Tables 1–4.
implementations:
  - role: official
    repo: https://github.com/isl-org/DPT
    commit: cd3fe90bb4c48577535cc4d51b602acca688a2ee
    framework: pytorch
    license: MIT
draft: false
---

# Motivation

Takes a single RGB image of size $H \times W$, divisible by patch size $p = 16$, and produces a dense per-pixel prediction: an affine-invariant inverse-depth (disparity) map for monocular depth, or a per-pixel class-logit map for semantic segmentation, both predicted at half the input resolution before a final bilinear upsample. DPT replaces the convolutional encoder of prior dense-prediction encoder-decoders with a Vision Transformer backbone used as a bag-of-tokens feature extractor, and replaces the decoder's convolutional downsample/upsample stack with a Reassemble-and-Fusion decoder that recovers spatial feature maps from the token sequence at four fixed resolutions. Unlike a convolutional encoder, the transformer backbone holds constant token-sequence resolution and a global receptive field at every stage instead of progressively downsampling.

# Architecture

**Family & shape.** Transformer-encoder / convolutional-decoder hybrid. Three named variants by backbone: DPT-Base (ViT-Base, patch embedding), DPT-Large (ViT-Large, patch embedding), DPT-Hybrid (ResNet50 stem feeding a ViT stage). Input: an RGB image $H \times W$ divisible by $p = 16$ for the patch embedding and by 32 for the fusion decoder's stride. Output: a dense disparity map (depth task) or class-logit map (segmentation task), both at half input resolution before the final upsample.

**Blocks.** The decoder recovers image-like feature maps from a transformer's token sequence $t$ through a three-stage Reassemble operation, applied independently at four fixed transformer-layer taps:

$$
\text{Reassemble}^{\hat D}_s(t) = (\text{Resample}_s \circ \text{Concatenate} \circ \text{Read})(t).
$$

Read maps the $N_p + 1$ tokens (patch tokens plus the ViT readout/CLS token $t^0$) down to $N_p$ tokens, in one of three ways:

$$
\begin{aligned}
\text{Read}_{\text{ignore}}(t) &= \{t^1, \ldots, t^{N_p}\}, \\
\text{Read}_{\text{add}}(t) &= \{t^1 + t^0, \ldots, t^{N_p} + t^0\}, \\
\text{Read}_{\text{proj}}(t) &= \{\text{mlp}(\text{cat}(t^1, t^0)), \ldots, \text{mlp}(\text{cat}(t^{N_p}, t^0))\}.
\end{aligned}
$$

`proj` (concatenate with $t^0$, linear layer back to $D$, GELU) is the default readout handling. Concatenate places the $N_p$ tokens by source-patch position into a $\frac{H}{p} \times \frac{W}{p} \times D$ feature map. Resample$_s$ projects to $\hat D$ channels with a $1{\times}1$ conv, then resizes to $\frac{H}{s} \times \frac{W}{s}$ with a strided $3{\times}3$ conv when $s \ge p$ or a strided $3{\times}3$ transpose conv when $s < p$. Default decoder feature dimension is $\hat D = 256$.

```python
def reassemble(tokens, readout, D_hat, p, s, H, W):
    """tokens: (N_p + 1, D) — one ViT layer's token sequence, CLS token first."""
    t0, t = tokens[0], tokens[1:]                 # t0: (D,)   t: (N_p, D)
    if readout == "ignore":
        r = t
    elif readout == "add":
        r = t + t0
    else:  # "proj" (default)
        r = mlp(concat(t, t0.expand_as(t)))       # (N_p, D)
    # Concatenate: place each token at its source-patch grid position
    feat = permute(reshape(r, (H // p, W // p, -1)), (2, 0, 1))  # (D, H/p, W/p)
    feat = conv1x1(feat, out_channels=D_hat)
    if s >= p:
        return conv3x3(feat, stride=s // p)       # downsample to H/s x W/s
    return deconv3x3(feat, stride=p // s)          # upsample to H/s x W/s
```

Reassembly runs at four fixed layer taps per backbone: $l = \{5, 12, 18, 24\}$ for ViT-Large, $\{3, 6, 9, 12\}$ for ViT-Base, and $\{9, 12\}$ plus the ResNet50 stem's first two stages ($R_0, R_1$) for ViT-Hybrid — deeper layers reassembled at lower resolution, earlier layers at higher resolution. RefineNet-style fusion blocks (residual conv units, $2\times$ upsample per stage) progressively combine the four reassembled maps down to half input resolution, where a task-specific head produces the final prediction: three conv layers for depth, or a segmentation head trained with an auxiliary loss on the penultimate fusion layer.

**Training.** Depth: the scale-and-shift-invariant trimmed loss and multi-scale gradient-matching loss from [MiDaS](/atlas/midas), reused unmodified, with Adam (backbone LR $10^{-5}$, decoder LR $10^{-4}$), 60 epochs of 72,000 steps, batch size 16, $384 \times 384$ crops, on the MIX 6 meta-dataset (~1.4M images, MiDaS's MIX 5 plus five additional datasets). Zero-shot cross-dataset transfer improves over MiDaS on the same MIX 6 protocol by more than 23% (DPT-Hybrid) and 28% (DPT-Large) relative performance (Table 1). Batch normalization is disabled in the depth decoder. Segmentation: cross-entropy plus a 0.2-weighted auxiliary loss, SGD with momentum 0.9, polynomial LR decay (factor 0.9), batch size 48, 520 px resize with 480 px crops, fine-tuned on ADE20K (240 epochs) and Pascal Context (50-epoch fine-tune); batch normalization is enabled in the segmentation fusion layers. DPT-Hybrid reaches 49.02% mIoU on ADE20K (Table 4), a new state of the art at publication.

**Complexity.** DPT-Base: 112M parameters, 17 ms inference. DPT-Hybrid: 123M parameters, 38 ms. DPT-Large: 343M parameters, 35 ms — comparable to DPT-Hybrid despite roughly $3\times$ the parameters, attributed to ViT-Large's wide, shallow structure exposing more parallelism. MiDaS's convolutional baseline: 105M parameters, 32 ms (Table 9).

# Implementations

Official PyTorch release under the MIT license; no weights license has been verified.

# Assessment

**Novelty.**

- Replaces the convolutional dense-prediction encoder with a [ViT](/atlas/vit) backbone used as a bag-of-tokens feature extractor, in contrast to fully-convolutional encoders that progressively downsample and lose feature resolution.
- Introduces the Reassemble operation (Read / Concatenate / Resample) to recover multi-resolution, image-like feature maps from a token sequence that itself never changes spatial resolution.
- Isolates the encoder architecture as the sole variable against a fully-convolutional baseline by reusing [MiDaS](/atlas/midas)'s scale-and-shift-invariant loss, MIX 5 → MIX 6 dataset-mixing recipe, and zero-shot cross-dataset evaluation protocol unmodified.

**Strengths.**

- Zero-shot depth transfer improves over MiDaS by more than 23% (DPT-Hybrid) and 28% (DPT-Large) relative performance on an identical training protocol (Table 1).
- Sets a new state of the art on ADE20K semantic segmentation at 49.02% mIoU (DPT-Hybrid, Table 4, 2021).
- The Reassemble-and-Fusion decoder was reused unmodified or duplicated as the dense-prediction head in [Depth Anything](/atlas/depth-anything), [Depth Anything V2](/atlas/depth-anything-v2), [Depth Anything 3](/atlas/depth-anything-3) (a duplicated "Dual-DPT" head), [DUSt3R](/atlas/dust3r) (per-view DPT-style regression heads), and [VGGT](/atlas/vggt) (a DPT upsampler fed multi-block tokens).

**Limitations.**

- DPT-Base needs stronger backbone pretraining to clearly beat a convolutional baseline of comparable capacity: with standard ViT-Base pretraining it roughly ties ResNeXt101-WSL (0.0819 vs. 0.0806 mean ablation error); only DeiT-Base-Dist pretraining (0.0796) pulls it ahead (Table 8).
- DPT-Large underperforms DPT-Hybrid on the smaller ADE20K fine-tuning set — 47.63% vs. 49.02% mIoU (Table 4) — despite roughly $3\times$ the parameters, attributed to the dataset being much smaller than the depth-pretraining corpus.
- Feature-tap layer choice is a free hyperparameter tuned by ablation rather than dictated by architecture, since the transformer backbone has no natural downsampling stage boundaries: mixing shallow and deep taps outperforms tapping only late layers (0.0822 vs. 0.0828 mean error, Table 6), and adding the ResNet stem's low-level features to ViT-Hybrid's taps improves error from 0.0787 to 0.0733.

# References

1. R. Ranftl, A. Bochkovskiy, V. Koltun. *Vision Transformers for Dense Prediction.* ICCV, 2021. [arXiv 2103.13413](https://arxiv.org/abs/2103.13413)
2. A. Dosovitskiy, L. Beyer, A. Kolesnikov, D. Weissenborn, X. Zhai, T. Unterthiner, M. Dehghani, M. Minderer, G. Heigold, S. Gelly, J. Uszkoreit, N. Houlsby. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv 2010.11929](https://arxiv.org/abs/2010.11929)
3. R. Ranftl, K. Lasinger, D. Hafner, K. Schindler, V. Koltun. *Towards Robust Monocular Depth Estimation: Mixing Datasets for Zero-shot Cross-dataset Transfer.* TPAMI, 2022 (arXiv 2019). [arXiv 1907.01341](https://arxiv.org/abs/1907.01341)
