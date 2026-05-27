---
title: "ViT"
date: 2026-05-27
summary: "Vision Transformer — a pure-transformer image classification backbone that treats an image as a sequence of fixed-size patches: split RGB image into $N = HW/P^2$ patches of $P{\\times}P$ pixels (P=16 for ViT-B/L, P=14 for ViT-H), linearly project to $D$-dim tokens, prepend a learnable [CLS] token, add learned positional embeddings, and feed through a standard transformer encoder; classification head reads the [CLS] token's final-layer output. ViT-B/16 86M params, ViT-L/16 307M, ViT-H/14 632M. With large-scale pretraining (JFT-300M) ViT matches or exceeds ResNet-based BiT-L on ImageNet at lower compute."
tags: ["deep-learning"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
params: "86M (ViT-B/16), 307M (ViT-L/16), 632M (ViT-H/14)"
flops: "17.6 GMAC (B/16), 61.6 GMAC (L/16), 167.4 GMAC (H/14) @ 224×224 (Table 6)"
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: feeds_into
    target: sam
    confidence: high
  - type: feeds_into
    target: mobilesam
    confidence: high
  - type: compared_with
    target: resnet
    confidence: high
    caution: "ViT vs ResNet (BiT) is the headline classification comparison in the paper. Both coexist as production backbones — ResNet's conv inductive bias dominates in small-data regimes; ViT scales better with large pretraining (JFT-300M)."
sources:
  primary: dosovitskiy2020-vit
  references:
    - he2016-resnet
  notes: |
    Patch embedding (Eq. 1, §3.1): split $\mathbf{x} \in \mathbb{R}^{H \times W \times C}$
    into $N = HW/P^2$ patches of size $P \times P$ pixels, flatten each
    to $P^2 \cdot C$ dims, linearly project to $D$ dims with learned
    matrix $\mathbf{E} \in \mathbb{R}^{(P^2 \cdot C) \times D}$. Prepend
    learnable $\mathbf{x}_\text{class}$ token; add learned 1D positional
    embedding $\mathbf{E}_\text{pos} \in \mathbb{R}^{(N+1) \times D}$.
    Forward pass (Eqs. 2-3): standard transformer encoder of $L$ blocks
    with multi-head self-attention + MLP + pre-LayerNorm + residual.
    Classification head reads $\mathbf{z}_L^0$ (final [CLS]) via single
    linear layer (pretraining) or MLP-with-one-hidden-layer (fine-tune).
    Self-attention (Eqs. 5-7): $\mathbf{A} = \mathrm{softmax}(\mathbf{q}\mathbf{k}^\top / \sqrt{D_h})$
    on per-head queries/keys/values of dim $D_h = D/H$. MSA (Eq. 8):
    concatenate $H$ heads → linear projection.

    Canonical variants (Table 1, §3.1):
    - ViT-Base (B): L=12, D=768, MLP=3072, H=12. ViT-B/16: 86M params.
    - ViT-Large (L): L=24, D=1024, MLP=4096, H=16. ViT-L/16: 307M params.
    - ViT-Huge (H): L=32, D=1280, MLP=5120, H=16. ViT-H/14: 632M params.
    Naming: ViT-B/16 = base with 16-px patches.

    Headline benchmarks (Table 2, §4.2): JFT-300M-pretrained ViT-H/14
    reaches ImageNet top-1 88.55% (vs BiT-L 87.54%); ViT-L/16 (JFT)
    87.76%. Pretraining compute (TPUv3-core-days): ViT-H/14 2.5k vs
    BiT-L 9.9k — 4× cheaper at higher accuracy. ViT-L/16 self-supervised
    (Masked Patch Prediction) ImageNet top-1: 79.9%, +2% over scratch
    but -4% under JFT-supervised pretraining (Appendix D, §4).

    Pretraining-scale crossover (Fig. 3, §4.3): on ImageNet alone ViT
    underperforms ResNet/BiT; on ImageNet-21k they break even; on
    JFT-300M ViT decisively wins. The crossover is around 100M images.

    Positional embedding ablation (Table 7, §4.5 / Appendix D.4): 1D
    learned vs none = 0.642 vs 0.614 IN-Real linear-eval; 2D learned
    matches 1D. The paper uses 1D learned for simplicity.

    Hybrid (ResNet stem + ViT body): improves small/medium models on
    small-data regimes but ViT-L/H pure transformer wins at large
    pretraining (Fig. 5, §4.4 — hybrid catches ViT at small budget,
    ViT pulls ahead at larger budget).
implementations:
  - role: official
    repo: https://github.com/google-research/vision_transformer
    commit: 0d03f554b83af02550407da1e8c702a7cb75e74b
    framework: jax
    license: Apache-2.0
  - role: community
    repo: https://github.com/huggingface/pytorch-image-models
    commit: 08fa5cd0b35860a4054738c4284a9c80b362cdc1
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Takes an RGB image of shape $H \times W \times C$ at a fixed resolution divisible by patch size $P$ and produces a class probability distribution over $K$ classes via a single linear layer applied to a learnable [CLS] token's final-layer embedding. When used as a backbone, the output is a sequence of $N+1 = HW/P^2 + 1$ tokens of dimension $D$. The defining property is a **pure transformer encoder** with no convolutional layers in the body — the only image-specific operation is an initial $P \times P$ patch projection. This stands in contrast to CNN-based ImageNet backbones (AlexNet, VGG, GoogLeNet, ResNet) that build hierarchical representations through stacked convolutions with explicit locality and translation equivariance. The consequent trade-off is concrete: ViT has minimal image-specific inductive bias, which makes it underperform equivalent-compute ResNet backbones at small pretraining scales (ImageNet-1k, 1.3 M images), break roughly even at medium scale (ImageNet-21k, 14 M images), and decisively outperform them at large scale (JFT-300M, 303 M images) — the crossover occurring around 100 M pretraining images.

# Architecture

**Family & shape.** Pure transformer encoder. Input: $H \times W \times C$ RGB image, typically 224×224×3 for pretraining and 384×384 for fine-tuning ($H$ and $W$ must be divisible by patch size $P$). Output for classification: logits over $K$ classes from the [CLS] token's final-layer embedding $\mathbf{z}^L_0$. Output as backbone: a sequence of $N+1$ tokens of dimension $D$, where $N = HW/P^2$. The canonical notation is ViT-{Size}/{P} (e.g., ViT-B/16 = Base variant with 16-pixel patches). Patch sizes $P \in \{14, 16, 32\}$ are used across variants.

**Blocks.** The patch embedding (Eq. 1, §3.1) is the sole stage with image-specific structure; the remaining network is a standard transformer encoder (Eqs. 2–4, §3.1):

- *Patch embedding.* Reshape the image into $N = HW/P^2$ non-overlapping patches of $P \times P$ pixels; flatten each to $P^2 C$ dimensions; project to $D$ dimensions via a learned linear map $\mathbf{E} \in \mathbb{R}^{(P^2 C) \times D}$. Implemented as a single $P \times P$ convolution with stride $P$.
- *[CLS] token.* A single learnable vector $\mathbf{x}_\text{class}$ prepended to the patch sequence; its final hidden state $\mathbf{z}^L_0$ is the image representation.
- *Positional encoding.* A learned 1D positional embedding $\mathbf{E}_\text{pos} \in \mathbb{R}^{(N+1) \times D}$ added element-wise to all tokens. Ablations show 2D-aware and relative encodings give no measurable benefit over 1D learned (Table 8, Appendix D.4).
- *Transformer encoder.* $L$ identical blocks, each applying pre-LayerNorm multi-head self-attention (MSA) followed by a pre-LayerNorm MLP with GELU activations, both with residual connections (Eqs. 2–3).
- *Classification head.* MLP with one tanh-activated hidden layer at pretraining time; a single zero-initialised linear layer at fine-tuning time (Eq. 4).

The patch embedding and one transformer encoder block in PyTorch:

```python
import torch
import torch.nn as nn


class PatchEmbed(nn.Module):
    """Eq. 1 of ViT: split image into P×P patches, project to D-dim tokens."""

    def __init__(self, image_size: int, patch_size: int, in_chans: int, dim: int):
        super().__init__()
        self.proj = nn.Conv2d(in_chans, dim, kernel_size=patch_size, stride=patch_size)
        n = (image_size // patch_size) ** 2
        self.cls_token = nn.Parameter(torch.zeros(1, 1, dim))
        self.pos_embed = nn.Parameter(torch.zeros(1, n + 1, dim))

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        tokens = self.proj(x).flatten(2).transpose(1, 2)   # [B, N, D]
        cls = self.cls_token.expand(x.size(0), -1, -1)
        return torch.cat([cls, tokens], dim=1) + self.pos_embed
```

```python
class ViTBlock(nn.Module):
    """Eqs. 2-3: pre-LN MSA + pre-LN MLP, both with residual connections."""

    def __init__(self, dim: int, num_heads: int, mlp_dim: int):
        super().__init__()
        self.norm1 = nn.LayerNorm(dim)
        self.attn = nn.MultiheadAttention(dim, num_heads, batch_first=True)
        self.norm2 = nn.LayerNorm(dim)
        self.mlp = nn.Sequential(
            nn.Linear(dim, mlp_dim), nn.GELU(), nn.Linear(mlp_dim, dim),
        )

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        y = self.norm1(x)
        x = x + self.attn(y, y, y, need_weights=False)[0]
        x = x + self.mlp(self.norm2(x))
        return x
```

Self-attention scales by $1/\sqrt{D_h}$ where $D_h = D/H$ is the per-head dimension, following the standard multi-head formulation (Appendix A).

**Training.** Three pretraining datasets: ImageNet-1k (1.3 M images), ImageNet-21k (14 M images), or JFT-300M (303 M images, private). Loss: cross-entropy on labels. Pretraining optimizer: Adam with $\beta_1 = 0.9$, $\beta_2 = 0.999$, weight decay $0.1$, batch size 4096, linear learning-rate warmup and decay. Fine-tuning optimizer: SGD with momentum, batch size 512, cosine decay, at higher resolution than pretraining — typically 384×384 for most variants, 512×512 (ViT-L/16) or 518×518 (ViT-H/14); positional embeddings are 2D-interpolated to the new sequence length. Polyak averaging (factor $0.9999$) is applied to the Table 2 results.

Headline metric on ImageNet (fine-tuned, Table 2, §4.2):

- ViT-H/14 pretrained on JFT-300M: **88.55 ± 0.04 %** top-1, using 2.5k TPUv3-core-days.
- BiT-L (ResNet-152x4, ImageNet-21k pretrain): 87.54 ± 0.02 % top-1, using 9.9k TPUv3-core-days.

The paper's central empirical finding is the pretraining-scale crossover (Figure 4, §4.3): on ImageNet-1k alone ViT underperforms equivalent-compute ResNets; on ImageNet-21k they roughly break even; on JFT-300M ViT decisively wins at substantially lower pretraining cost.

**Complexity.** Three canonical sizes (Table 1, §4.1):

| Variant | Layers $L$ | Hidden $D$ | MLP dim | Heads | Params |
|---|---|---|---|---|---|
| ViT-B/16 | 12 | 768 | 3072 | 12 | 86 M |
| ViT-L/16 | 24 | 1024 | 4096 | 16 | 307 M |
| ViT-H/14 | 32 | 1280 | 5120 | 16 | 632 M |

Sequence length $N = 196$ for $P{=}16$ at 224×224; $N = 256$ for $P{=}14$ at 224×224. Self-attention cost is $O(N^2)$: a 1024×1024 input at $P{=}16$ yields 4096 tokens, which is computationally prohibitive without windowed-attention variants.

# Implementations

Official JAX release by Google Research; the `timm` (`pytorch-image-models`) PyTorch port maintained by Hugging Face is the de-facto reference in the PyTorch ecosystem and ships with pretrained weights for all canonical configurations.

# Assessment

**Novelty.**

- Demonstrates that a **pure transformer encoder** — no convolutions, no spatial pooling — is competitive with the best CNN backbones on ImageNet classification, disproving the prevailing assumption (pre-2020) that convolutional inductive bias is necessary for competitive image recognition.
- Establishes that **scale beats inductive bias**: ViT's lack of translation equivariance and locality is a handicap at small pretraining scales but an advantage at large scales, where the model is not constrained by the wrong inductive bias. The crossover occurs around 100 M pretraining images (Figure 4, §4.3).
- Introduces the **image-as-patches** token representation that became the standard input pipeline for subsequent vision foundation models (SAM, MAE, DINO, CLIP image encoder all use the same patch tokenisation).
- Shows that **learned 1D positional encodings are sufficient** — 2D-aware and relative positional encodings provide no measurable benefit at patch level (Table 8, Appendix D.4; 1D learned: 0.642 IN-Real linear-eval vs 0.640 for 2D and relative variants).

**Strengths.**

- JFT-300M pretrained ViT-H/14 reaches 88.55 % ImageNet top-1 versus BiT-L (ResNet-152x4) at 87.54 %, winning by 1.01 points at 4× lower pretraining cost (2.5k vs 9.9k TPUv3-core-days) (Table 2, §4.2).
- JFT-300M pretrained ViT-L/16 reaches 87.76 % top-1 at 0.68k TPUv3-core-days — already matching BiT-L's 87.54 % at 14× less pretraining compute (Table 2, §4.2).
- The architecture scales predictably from ViT-B (86 M params) to ViT-H (632 M params) with consistent accuracy improvements; depth scaling produces the largest gains (Figure 8, Appendix D.2).
- Global self-attention from the first layer enables long-range spatial reasoning without the explicit multi-scale design (FPN, U-Net skip) required by CNN architectures.

**Limitations.**

- Small-data failure mode: on ImageNet-1k alone ViT-L/16 reaches 76.53 % top-1 and ViT-B/16 reaches 77.91 % top-1, far below BiT-L (ResNet-152x4) at 87.54 %; CNN backbones with their built-in spatial inductive bias remain preferable without large-scale pretraining (Table 5, Appendix C; Figure 3, §4.3).
- Quadratic memory in the number of patches: $O(N^2)$ self-attention cost makes very-high-resolution inputs (1024×1024 at $P=16$ yields 4096 tokens) computationally prohibitive without windowed or sparse attention variants such as Swin Transformer.
- High-resolution fine-tuning requires 2D bilinear interpolation of the 1D positional embeddings when the patch grid changes — a workable but unprincipled step that can degrade for large resolution changes or unusual aspect ratios (§3.2).
- Self-supervised pretraining with masked patch prediction (BERT-style) yields only 79.9 % ImageNet top-1 for ViT-B/16, +2 % over training from scratch but 4 % below JFT-supervised pretraining — a gap that masked autoencoder methods (MAE) subsequently closed (§4.6).

# References

1. Dosovitskiy, A. et al. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arxiv](https://arxiv.org/abs/2010.11929)
2. He, K., Zhang, X., Ren, S., & Sun, J. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arxiv](https://arxiv.org/abs/1512.03385)
