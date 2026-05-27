---
title: "MAE"
date: 2026-05-27
summary: "Masked Autoencoder — self-supervised pretraining for Vision Transformers: randomly mask 75 % of input patches, feed the visible 25 % through a ViT encoder, then run a lightweight ViT decoder over the full sequence (visible + shared learnable mask tokens) to reconstruct the masked patches' raw pixel values under MSE on per-patch-normalised targets. The asymmetric encoder-decoder design (encoder operates only on visible tokens, decoder is much smaller and discarded after pretraining) gives a 2.8–4.1× pretraining speedup vs full-sequence masked-ViT baselines and reaches 87.8 % ImageNet-1k top-1 with ViT-H fine-tuning."
tags: ["deep-learning"]
domain: features
tasks: [image-classification]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: feeds_into
    target: sam
    confidence: high
    caution: "SAM v1's ViT-H image encoder is MAE-pretrained; SAM 2's Hiera (hierarchical ViT) is also MAE-pretrained. MAE is the SSL recipe that makes the SAM-family foundation segmenters' large encoders feasible."
sources:
  primary: he2021-mae
  references:
    - dosovitskiy2020-vit
    - he2016-resnet
  notes: |
    Asymmetric masked autoencoder for ViT (§3, Fig. 1).
    Step 1: split image into ViT patches (224×224 → 14×14=196 patches at
    P=16). Step 2: **uniformly sample 75% of patches to mask** (Sec. 3
    "Masking" — high masking ratio is critical for visual SSL because
    image patches are highly redundant; NLP's 15% would give a too-easy
    task). Step 3: **encoder operates only on visible 25%** — the full
    ViT encoder runs on the unmasked 25% of patches (49 tokens at base
    config), saving 3-4× encoder compute vs full-sequence approaches.
    Step 4: **decoder operates on all positions** — encoded visible
    tokens are concatenated with a single shared learnable mask token
    (each with its positional encoding) and fed to a lightweight ViT
    decoder. Step 5: **reconstruction loss** — per-patch MSE on
    masked patches only (visible patches contribute no loss). Pixel
    targets are normalised per-patch (subtract mean, divide by std)
    before MSE (Sec. 3 "Reconstruction target"); without per-patch
    normalisation, transfer accuracy drops 0.5 top-1.

    Loss: $\mathcal{L} = \frac{1}{|\mathcal{M}|}\sum_{i \in \mathcal{M}} \|\hat{x}_i - x_i^\text{norm}\|_2^2$
    where $\mathcal{M}$ is the masked-patch index set and $x_i^\text{norm}$
    is the per-patch-normalised target.

    Architecture details (Sec. 3 + Table 8 ablations):
    - Encoder: standard ViT-B / ViT-L / ViT-H (12 / 24 / 32 layers).
    - Decoder: 8 layers, width 512 (much smaller than encoder, <10%
      per-token FLOPs of the encoder).
    - Mask token: a single learnable [MASK] embedding shared across
      all masked positions, with position embedding added.

    Training (Sec. 4): ImageNet-1k unlabeled (no extra data), 1600
    epochs the long pretraining schedule (Sec. 4 "Pretraining"); AdamW,
    batch 4096, base LR 1.5e-4 (linearly scaled with batch size, cosine
    decay, 40-epoch warmup); weight decay 0.05; random-resized-crop +
    horizontal flip augmentation. **2.8-4.1× wall-clock speedup vs the
    naive full-sequence ViT-BERT baseline** (Sec. 4 "Speedup"; Table 6).

    Headline benchmarks:
    - **ImageNet-1k top-1 (fine-tune)**: ViT-B 83.6%, ViT-L 85.9%,
      ViT-H 86.9%, ViT-H/14 87.8% (Sec. 4.2, Table 3 / Fig. 5).
    - **ViT-H/14 87.8%** is the headline — beats supervised JFT-300M
      pretraining of the same architecture without using external
      labelled data.
    - Linear probing (no fine-tune): ViT-L 75.8%, ViT-H 76.6% (Sec.
      4.2, Fig. 5).
    - Masking-ratio sweep (Fig. 5): 75% is optimal; quality drops
      sharply below 50%.
    - Transfer to COCO detection (ViT-L Mask R-CNN backbone): box AP
      53.3, mask AP 47.2 (Table 4).
    - Transfer to ADE20K semantic segmentation (ViT-L UperNet
      backbone): mIoU 53.6 (Table 6).
implementations:
  - role: official
    repo: https://github.com/facebookresearch/mae
    commit: efb2a8062c206524e35e47d04501ed4f544c0ae8
    framework: pytorch
    license: CC-BY-NC-4.0
draft: false
---

# Motivation

Self-supervised pretraining of Vision Transformers on unlabeled RGB images via masked image modelling. Pretraining input: a 224×224 RGB image tiled into non-overlapping patches (16×16 px for ViT-B/L, 14×14 px for ViT-H); 196 or 256 patches total. Pretraining output: reconstructed pixel values at the 75 % of patches that were masked before the encoder sees the image. The defining property is an **asymmetric encoder-decoder**: the encoder operates only on the visible 25 % of patch tokens — a 3–4× shorter sequence — while a much smaller decoder receives all positions (encoded visible tokens plus a single shared learnable mask token at each masked position, each augmented with its positional embedding) and reconstructs raw pixel values via per-patch-normalised MSE. Downstream use discards the decoder entirely; the encoder transfers as a drop-in ViT backbone for supervised fine-tuning on labelled tasks such as ImageNet-1k classification, COCO Mask R-CNN detection, and ADE20K UperNet segmentation. The 75 % masking ratio — far above BERT's 15 % for language — is motivated by the heavy spatial redundancy of natural images: lower ratios yield a trivially easy reconstruction task that does not force holistic scene understanding.

# Architecture

**Family & shape.** Pure ViT encoder-decoder, pretraining-only configuration. Encoder input: a sparse sequence of 49 visible patch tokens (25 % of 196 at patch size $P=16$). Decoder input: full 196 tokens (49 encoded visible + 147 shared mask tokens), each with its positional embedding. Decoder output: reconstructed pixel values for masked patches only. After pretraining the decoder is discarded; the encoder is a standard ViT-B (86 M params), ViT-L (307 M), or ViT-H (632 M) backbone.

**Blocks.** Three architectural elements (Sec. 3, Fig. 1 of the paper):

- **Random masking.** 75 % of patches are selected by uniform sampling without replacement and removed from the encoder input. The remaining 25 % proceed unchanged. Implementation uses an index shuffle, not sparse operations.
- **Asymmetric encoder.** Standard ViT processes only the visible patch tokens — no mask-token placeholders in the encoder input. The encoder therefore operates on a 4× shorter sequence than full-image ViT inference, with no change to its block design.
- **Lightweight decoder.** 8 Transformer blocks, embedding dimension 512 — less than 10 % of the per-token FLOPs of the ViT-L encoder. Inputs are the encoded visible tokens plus a single shared learnable mask token placed at every masked position, each summed with its positional embedding. A final linear projection maps each decoder output token to $P^2 \cdot 3$ reconstructed pixel values.

:::definition[MAE pixel-reconstruction loss]
For each masked patch index $i \in \mathcal{M}$, the decoder predicts $\hat{x}_i \in \mathbb{R}^{P^2 \cdot 3}$. The ground-truth target is the patch's flattened pixel vector normalised per-patch (subtract the patch mean, divide by the patch standard deviation). Loss is computed only on masked positions.

$$
\mathcal{L}_{\text{MAE}} = \frac{1}{|\mathcal{M}|} \sum_{i \in \mathcal{M}} \big\| \hat{x}_i - x_i^{\text{norm}} \big\|_2^2
$$

Per-patch normalisation is essential: omitting it reduces transfer accuracy by approximately 0.5 % top-1.
:::

The masked-input ViT pretraining forward pass in PyTorch:

```python
import torch
import torch.nn as nn


def mae_forward(image: torch.Tensor,
                encoder: nn.Module,       # ViT, sparse-token input
                decoder: nn.Module,       # 8-layer lightweight ViT
                pos_embed: torch.Tensor,  # [1, N, D]
                mask_token: torch.Tensor, # [1, 1, D] learnable
                mask_ratio: float = 0.75) -> torch.Tensor:
    """One MAE forward pass. Returns predicted pixels at all N positions.
    Loss should be computed only on masked indices. Sec. 3 of He et al. 2022.
    """
    tokens = encoder.patch_embed(image)                        # [B, N, D]
    tokens = tokens + pos_embed
    B, N, D = tokens.shape
    n_keep = int(N * (1 - mask_ratio))                         # 49 for N=196
    rand = torch.rand(B, N, device=image.device)
    keep_idx = rand.argsort(dim=1)[:, :n_keep]                 # visible indices
    visible = tokens.gather(1, keep_idx.unsqueeze(-1).expand(-1, -1, D))
    encoded = encoder.blocks(visible)                          # [B, n_keep, D]
    # Decoder input: encoded visible tokens back in place; mask tokens elsewhere
    full = mask_token.expand(B, N, D) + pos_embed
    full = full.scatter(1, keep_idx.unsqueeze(-1).expand(-1, -1, D), encoded)
    return decoder(full)                                       # [B, N, P*P*3]
```

**Training.** Dataset: ImageNet-1k unlabeled (1.28 M images) — no extra labelled data. Pretraining loss is the MAE reconstruction loss above. Optimiser: AdamW. Schedule: **1600 epochs** — accuracy improves monotonically through 1600 epochs with no saturation observed for linear probing (Fig. 7). Augmentation: random crop and random horizontal flip only — no colour jitter, and the method works even without augmentation. Headline ImageNet-1k top-1 fine-tuning results (Table 3, 1600-epoch pretraining):

| Encoder | Resolution | Top-1 |
|---------|-----------|-------|
| ViT-B/16 | 224 | 83.6 % |
| ViT-L/16 | 224 | 85.9 % |
| ViT-H/14 | 224 | 86.9 % |
| ViT-H/14 | 448 | **87.8 %** |

ViT-H/14 at 448 with MAE pretraining on ImageNet-1k alone sets a new state of the art among ImageNet-1k-only methods at publication time — the prior best was 87.1 % (advanced networks at 512-size input).

**Complexity.** Encoder sizes match standard ViT: ViT-B 86 M params, ViT-L 307 M, ViT-H 632 M. The decoder is a single fixed configuration (8 Transformer blocks, width 512, approximately 25 M params) discarded after pretraining. Pretraining wall-clock is **2.8–4.1× faster** than naive full-sequence masked-ViT baselines at equivalent quality (Table 2): ViT-L without mask tokens in the encoder takes 15.4 h versus 42.4 h with mask tokens (2.8×); ViT-H at 29.3 h versus an estimated 119.6 h (4.1×), measured on 128 TPU-v3 cores over 800 epochs. ViT-L at 1600 epochs takes 31 h, compared to 36 h for MoCo v3 at only 300 epochs.

# Implementations

Official PyTorch release from Facebook AI Research; ships pretrained encoder checkpoints for ViT-B, ViT-L, and ViT-H. License is CC-BY-NC-4.0 (Attribution-NonCommercial 4.0 International — research and non-commercial use only); see Limitations.

# Assessment

**Novelty.**

- **75 % masking ratio** — far above BERT's 15 % for language and above the 20–50 % range explored in prior vision SSL. The masking-ratio sweep (Fig. 5, ViT-L, 800 epochs) shows 75 % is optimal for both fine-tuning and linear probing: the linear-probe gap from 50 % to 75 % is approximately 8 %, and from no masking to 75 % approximately 20 % (54.6 % → 73.5 %).
- **Asymmetric encoder-decoder with mask tokens deferred to the decoder**: the encoder never sees mask-token placeholders. Yields a 3–4× pretraining speedup vs full-sequence masked-ViT baselines that put mask tokens in the encoder (Table 2).
- **Pixel-target MSE with per-patch normalisation** — reconstructs raw pixel values directly rather than discrete tokens (BEiT's dVAE tokenization) or augmented views (DINO / SimCLR contrastive pairs). Per-patch normalisation (subtract mean, divide by standard deviation) is necessary; unnormalized pixel targets reduce fine-tuning accuracy by approximately 0.5 %.
- **No extra training data**: ImageNet-1k unlabeled (1.28 M images) is sufficient — no JFT-300M or other large labelled corpus needed.

**Strengths.**

- ImageNet-1k top-1 87.8 % (ViT-H/14, 448 fine-tune) using only unlabelled ImageNet-1k — surpasses the prior IN1K-only SOTA of 87.1 % (advanced networks at 512-size input) at publication time (Table 3).
- 2.8–4.1× faster pretraining wall-clock than full-sequence masked-ViT baselines at equal quality (Table 2), because the encoder processes only 25 % of tokens.
- Strong transfer to dense prediction: COCO Mask R-CNN AP$_{\text{box}}$ 53.3 / AP$_{\text{mask}}$ 47.2 (ViT-L backbone, Table 4); ADE20K UperNet mIoU 53.6 (ViT-L, Table 5) — 3.7 mIoU above supervised ImageNet-1k pretraining of the same backbone and 0.3 mIoU above BEiT.
- ViT-L pretraining at 1600 epochs takes 31 h on 128 TPU-v3 cores, compared to 36 h for MoCo v3 at only 300 epochs — MAE scales more efficiently at long schedules.
- The asymmetric encoder-decoder generalises beyond MAE: SAM v1's ViT-H image encoder is MAE-pretrained, and SAM 2's Hiera (hierarchical ViT) backbone is also MAE-pretrained, making MAE the de-facto SSL recipe for vision foundation models.

**Limitations.**

- **CC-BY-NC-4.0 license** (Attribution-NonCommercial 4.0 International): the official code and pretrained weights are restricted to research and non-commercial use. SAM v1's ViT-H weights and other Meta-released MAE-pretrained checkpoints inherit this constraint unless Meta separately re-released the trained weights under a permissive licence. Commercial deployments must either retrain MAE pretraining from scratch under an alternate licence or use separately licensed checkpoints.
- **Sparse-token encoder requirement**: the pretraining efficiency depends entirely on the encoder accepting a variable-length sparse token sequence, which is natural for ViT but does not apply to convolutional encoders. MAE pretraining is not directly transferable to ResNet or other CNN backbones.
- **1600-epoch pretraining schedule**: despite the per-epoch speedup, the full 1600-epoch schedule on ImageNet-1k requires substantial GPU/TPU time. Fig. 7 shows accuracy improves monotonically through 1600 epochs with no saturation observed for linear probing, so shorter schedules measurably underperform.
- **Linear-probe accuracy lags fine-tuning by a large margin**: ViT-L linear probe 73.5 % versus fine-tune 85.9 % (Table 1). MAE features are not linearly separable at the level of contrastive-SSL methods (MoCo v3, DINO); downstream tasks that cannot fine-tune the full encoder may prefer those alternatives.

# References

1. He, K., Chen, X., Xie, S., Li, Y., Dollár, P., & Girshick, R. *Masked Autoencoders Are Scalable Vision Learners.* CVPR, 2022. [arxiv](https://arxiv.org/abs/2111.06377)
2. Dosovitskiy, A. et al. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arxiv](https://arxiv.org/abs/2010.11929)
3. He, K., Zhang, X., Ren, S., & Sun, J. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arxiv](https://arxiv.org/abs/1512.03385)
