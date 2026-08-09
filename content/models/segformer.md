---
title: "SegFormer"
date: 2026-05-28
summary: "Hierarchical Transformer encoder (MiT) producing multi-scale features at $1/4, 1/8, 1/16, 1/32$ without positional encodings, plus an all-MLP decoder that fuses per-stage features into a per-pixel prediction. Six variants MiT-B0..B5 trade compute for accuracy; B5 reaches 51.8 mIoU on ADE20K and 84.0 mIoU on Cityscapes (Tables 1 and 2)."
tags: ["deep-learning", "dense-prediction"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
params: "3.8M (B0) — 84.7M (B5)"
flops: "8.4 GFLOPs (B0 @ 512×512) — 183.3 GFLOPs (B5 @ 640×640)"
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: feeds_into
    target: focalclick
    confidence: high
    caution: "SegFormer-B0 and SegFormer-B3 are explicit Segmentor backbones in FocalClick Table 3; the MiT encoder + all-MLP decoder is reused intact and the decoder logits feed FocalClick's Refiner."
  - type: compared_with
    target: fcn-semantic-segmentation
    confidence: high
  - type: compared_with
    target: deeplab-semantic-segmentation
    confidence: high
  - type: compared_with
    target: unet-segmentation
    confidence: medium
    caution: "U-Net is the encoder-decoder ancestor; SegFormer keeps the multi-scale-fuse idea but drops skip connections in favour of MLP-aggregating decoder."
  - type: compared_with
    target: hrnet
    confidence: high
  - type: compared_with
    target: mask2former
    confidence: medium
    caution: "Mask2Former 2022 follows SegFormer 2021 with a mask-classification paradigm; different formulation (set prediction over masks vs per-pixel)."
sources:
  primary: xie2021-segformer
  references:
    - dosovitskiy2020-vit
    - long2015-fcn
    - chen2018-deeplab
  notes: |
    MiT encoder (Sec. 3.1, Fig. 2): four hierarchical stages with overlapping
    patch merging (kernels $K=7,3,3,3$, strides $S=4,2,2,2$, paddings
    $P=3,1,1,1$). Each stage's Transformer block uses efficient self-attention
    with sequence-reduction ratio $R$ (Eq. 2): $\hat{K} = \text{Reshape}(N/R,
    C \cdot R)(K)$ then $K = \text{Linear}(C \cdot R, C)(\hat{K})$, reducing
    attention cost from $O(N^2)$ to $O(N^2/R)$. Reduction ratios per stage:
    $[64, 16, 4, 1]$ (Sec. 3.1.2). Mix-FFN (Eq. 3) replaces positional
    encoding: $x_\text{out} = \text{MLP}(\text{GELU}(\text{Conv}_{3 \times 3}
    (\text{MLP}(x_\text{in})))) + x_\text{in}$ — the $3 \times 3$ depthwise
    conv inside the FFN supplies the positional information.

    All-MLP decoder (Sec. 3.2, Eqs. 4a–4d): per-stage MLP projects channel
    $C_i$ to $C$; upsample to $H/4 \times W/4$; concat; fused MLP to $C$;
    final MLP to $N_\text{cls}$. Decoder channel $C = 256$ (B0–B2) or $C=768$
    (B3–B5).

    Variants (Table 7): B0 ($C_1..C_4 = 32,64,160,256$, 3.8M params), B1
    (13.7M), B2 (27.5M), B3 (47.3M), B4 (64.1M), B5 (84.7M).

    Headline numbers — ADE20K val mIoU (Table 1): B0 37.4, B5 51.8 (best
    published at submission). Cityscapes val mIoU (Table 2): B0 76.2, B5
    84.0. COCO-Stuff test mIoU (Table 3): B5 46.7. Cityscapes-C robustness
    (Table 5, mIoU averaged over 16 corruptions × 5 severities): B5 47.9
    vs DeepLabV3+ R101 27.5 — zero-shot gain of 20.4 mIoU on corrupted data.

    Training (Sec. 4.1): AdamW, lr $6 \times 10^{-5}$ with poly decay
    (power 1.0), weight decay 0.01, ImageNet-1k pretrained encoder, random
    crop $512 \times 512$ (ADE20K) or $1024 \times 1024$ (Cityscapes),
    horizontal flip + random scale $[0.5, 2.0]$ + random photometric
    distortion. 160k iterations on ADE20K, batch size 16.

    Effective receptive field analysis (Fig. 3): stage-4 ERF of MiT already
    covers the whole image, so the lightweight all-MLP decoder suffices —
    motivation for replacing heavy ASPP / OCR / object-context heads with
    plain MLP fusion.
implementations:
  - role: official
    repo: https://github.com/NVlabs/SegFormer
    commit: 65fa8cfa9b52b6ee7e8897a98705abf8570f9e32
    framework: pytorch
    license: NVIDIA-Source-Code-License
    weights_url: https://huggingface.co/nvidia/segformer-b0-finetuned-ade-512-512
    weights_license: NVIDIA-Source-Code-License
  - role: community
    repo: https://github.com/huggingface/transformers
    commit: c2820c94916e34baf4486accae74760972183a2f
    framework: pytorch
    license: Apache-2.0
  - role: community
    repo: https://github.com/open-mmlab/mmsegmentation
    commit: c685fe6767c4cadf6b051983ca6208f1b9d1ccb8
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

SegFormer takes an RGB image of any resolution as input and produces a per-pixel semantic mask, assigning one of $N_\text{cls}$ category labels to each pixel. The defining property is a hierarchical Mix Transformer (MiT) encoder that generates multi-scale features at $\{1/4, 1/8, 1/16, 1/32\}$ resolution without positional encodings, paired with a lightweight all-MLP decoder that requires no ASPP, OCR, or other context modules. Prior Transformer-based segmentation (SETR) used a plain ViT backbone, yielding only single-scale features at low resolution and requiring ImageNet-22K pretraining; SegFormer replaces both with a four-stage hierarchy pretrained on ImageNet-1K. Models range from MiT-B0 through MiT-B5 and are evaluated on ADE20K, Cityscapes, and COCO-Stuff.

# Architecture

**Family & shape.** ViT-family hierarchical encoder (Mix Transformer, MiT) combined with an all-MLP decoder. Input: $H \times W \times 3$ RGB image; no resolution constraint at inference. Output: per-pixel category logits at $\frac{H}{4} \times \frac{W}{4} \times N_\text{cls}$, upsampled to full resolution. Backbone: one of MiT-B0 through MiT-B5.

**Blocks.** Three named blocks distinguish MiT from plain ViT.

*Overlapping patch merging* (Sec. 3.1.1) uses a strided convolution with kernel $K$, stride $S$, padding $P$: at stage 1, $K=7$, $S=4$, $P=3$; at stages 2–4, $K=3$, $S=2$, $P=1$. The overlap preserves local continuity that ViT's non-overlapping patchification discards.

*Efficient self-attention* (Eq. 2, Sec. 3.1) reduces the key sequence from shape $N \times C$ to $\frac{N}{R} \times C$ before computing attention:

$$\hat{K} = \text{Reshape}\!\left(\frac{N}{R},\, C \cdot R\right)(K), \quad K = \text{Linear}(C \cdot R,\, C)(\hat{K})$$

This cuts self-attention complexity from $O(N^2)$ to $O(N^2/R)$. Per-stage reduction ratios are $R = [64, 16, 4, 1]$.

*Mix-FFN* (Eq. 3, Sec. 3.1) replaces fixed positional encodings with a $3 \times 3$ depthwise convolution inside the feed-forward network:

$$x_\text{out} = \text{MLP}(\text{GELU}(\text{Conv}_{3\times3}(\text{MLP}(x_\text{in})))) + x_\text{in}$$

The convolution's zero-padding supplies positional information implicitly, enabling inference at any resolution without re-interpolation artifacts.

The Mix-FFN block in PyTorch:

```python
class MixFFN(nn.Module):
    def __init__(self, c: int, hidden: int):
        super().__init__()
        self.fc1 = nn.Linear(c, hidden)
        self.dwconv = nn.Conv2d(hidden, hidden, kernel_size=3,
                                padding=1, groups=hidden)
        self.act = nn.GELU()
        self.fc2 = nn.Linear(hidden, c)

    def forward(self, x, H: int, W: int):
        # x: (B, N, C) with N = H * W
        B, N, C = x.shape
        h = self.fc1(x)
        h = h.transpose(1, 2).reshape(B, -1, H, W)
        h = self.dwconv(h)
        h = h.flatten(2).transpose(1, 2)
        h = self.act(h)
        h = self.fc2(h)
        return x + h
```

The all-MLP decoder (Sec. 3.2, Eq. 4a–4d) operates in four steps. First, per-stage linear projections unify each feature map $F_i$ from its native $C_i$ channels to a shared $C$: $\hat{F}_i = \text{Linear}(C_i, C)(F_i)$. Second, all maps are bilinearly upsampled to $\frac{H}{4} \times \frac{W}{4}$. Third, a fused linear projects the concatenated $4C$-channel map back to $C$: $F = \text{Linear}(4C, C)(\text{Concat}(\hat{F}_i))$. Fourth, a classifier linear produces the final mask: $M = \text{Linear}(C, N_\text{cls})(F)$. Decoder channel is $C = 256$ for B0 and B1, and $C = 768$ for B2–B5. The MLP decoder suffices because SegFormer's stage-4 Transformer blocks already produce non-local attention covering the full image (Fig. 3), rendering ASPP and similar context modules redundant.

**Training.** Datasets: ADE20K (150 categories), Cityscapes (19 categories), COCO-Stuff (172 labels). Loss: standard cross-entropy on per-pixel logits. Optimizer: AdamW with initial learning rate $6\times10^{-5}$, polynomial decay (power 1.0), weight decay 0.01. Schedule: 160K iterations on ADE20K and Cityscapes, batch size 16 (ADE20K, COCO-Stuff) or 8 (Cityscapes). MiT encoder pretrained on ImageNet-1K. Augmentation: random resize ratio 0.5–2.0, horizontal flip, random crop $512\times512$ (ADE20K, COCO-Stuff) or $1024\times1024$ (Cityscapes). Headline results: ADE20K val mIoU 51.8% (B5, multi-scale) — Table 2; Cityscapes val mIoU 84.0% (B5, multi-scale) — Table 2; on Cityscapes-C, B5 outperforms DeepLabV3+ variants by up to 588% relative improvement on Gaussian noise — Table 5.

**Complexity.** Variants span B0 (3.8M params, 8.4G FLOPs at $512\times512$) through B5 (84.7M params, 183.3G FLOPs at $640\times640$) — Table 2.

# Implementations

Official NVlabs PyTorch release, with widely-used community ports in HuggingFace Transformers and MMSegmentation.

# Assessment

**Novelty.**

- Replaces ViT's plain single-scale encoder with a four-stage MiT that produces multi-scale features at $\{1/4, 1/8, 1/16, 1/32\}$; SETR built on ViT retained a single scale and required a correspondingly heavy decoder.
- Eliminates positional encodings entirely: Mix-FFN's $3 \times 3$ depthwise convolution supplies positional information via zero-padding, so the model accepts arbitrary input resolutions at inference without accuracy degradation. With PE, switching from $768\times768$ to $1024\times2048$ on Cityscapes drops mIoU 3.3 points (Table 1c); Mix-FFN reduces this to 0.7 points.
- All-MLP decoder replaces ASPP, OCR, and UPerNet-style context modules, relying on the encoder's already-global stage-4 effective receptive field (Fig. 3).
- Efficient self-attention with per-stage reduction ratio $R = [64, 16, 4, 1]$ (Eq. 2) cuts dense-prediction attention cost from $O(N^2)$ to $O(N^2/R)$.

**Strengths.**

- Strong accuracy across scales: B0 reaches 37.4% mIoU on ADE20K with 3.8M parameters (Table 2); B5 reaches 51.8% mIoU (Table 2).
- Zero-shot robustness: on Cityscapes-C, B5 shows up to 588% relative improvement over DeepLabV3+ variants on Gaussian noise (Table 5) — attributable to the encoder's attention-pooled features smoothing over local corruption patterns.
- Resolution flexibility: no positional encoding means inference at any resolution without reinterpolation or accuracy penalty.
- Adopted as a backbone in downstream tasks — SegFormer-B0 and B3 are explicit Segmentor backbone variants in FocalClick (2022).

**Limitations.**

- The official NVlabs/SegFormer code and NVIDIA-hosted pretrained weights are released under the NVIDIA Source Code License — research and evaluation use only. Commercial deployment requires reimplementing and retraining from scratch; the HuggingFace Transformers and MMSegmentation Apache-2.0 ports do not change the weights' license.
- Efficient self-attention with $R = 64$ at stage 1 collapses 64 tokens into one for keys and values — a lossy approximation that can hurt very fine-grained boundary prediction at high input resolution.
- Per-pixel classification (versus the mask-classification paradigm introduced by MaskFormer and Mask2Former) limits the architecture to semantic segmentation; instance and panoptic segmentation require architectural changes.

# References

1. Xie, Wang, Yu, Anandkumar, Alvarez, Luo. *SegFormer: Simple and Efficient Design for Semantic Segmentation with Transformers.* NeurIPS, 2021. [arXiv 2105.15203](https://arxiv.org/abs/2105.15203)
2. Dosovitskiy et al. *An Image Is Worth 16×16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv 2010.11929](https://arxiv.org/abs/2010.11929)
3. Long, Shelhamer, Darrell. *Fully Convolutional Networks for Semantic Segmentation.* CVPR, 2015. [arXiv 1411.4038](https://arxiv.org/abs/1411.4038)
4. Chen, Papandreou, Schroff, Adam. *Rethinking Atrous Convolution for Semantic Image Segmentation.* arXiv preprint, 2017. [arXiv 1706.05587](https://arxiv.org/abs/1706.05587)
