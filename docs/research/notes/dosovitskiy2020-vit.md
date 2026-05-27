---
paper_id: dosovitskiy2020-vit
title: "An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale"
authors:
  - A. Dosovitskiy
  - L. Beyer
  - A. Kolesnikov
  - D. Weissenborn
  - X. Zhai
  - T. Unterthiner
  - M. Dehghani
  - M. Minderer
  - G. Heigold
  - S. Gelly
  - J. Uszkoreit
  - N. Houlsby
year: 2020
url: https://arxiv.org/pdf/2010.11929
created: 2026-05-27
relevant_atlas_pages:
  - sam
  - mobilesam
  - resnet
  - vgg
  - googlenet
  - alexnet
  - hrnet
  - convolutional-neural-network
  - attention-mechanism
  - fcn-semantic-segmentation
  - unet-segmentation
  - deeplab-semantic-segmentation
  - mask-rcnn
  - ritm-interactive-segmentation
---

# Setting

Image classification (the paper's sole validated task; the conclusion section notes detection and
segmentation as open future work). Input: an RGB image $\mathbf{x} \in \mathbb{R}^{H \times W \times C}$
at a fixed resolution (standard pre-training: 224×224; fine-tuning: 384×384 for most benchmarks,
512 for ViT-L/16, 518 for ViT-H/14). Output: a class probability distribution over $K$ categories
via a single linear layer applied to the [class] token's final-layer representation.

The key precondition is access to a large-scale pre-training dataset. On ImageNet-1k alone (1.3M
images), ViT underperforms ResNet. Performance matches ResNet with ImageNet-21k (14M) and
exceeds it with JFT-300M (303M).

# Core idea

Treat the 2D image as a sequence of $N = HW/P^2$ non-overlapping patches of size $P \times P$
pixels. Flatten each patch to $\mathbb{R}^{P^2 C}$ and project linearly to a $D$-dimensional token
(the learned patch embedding matrix $\mathbf{E} \in \mathbb{R}^{(P^2 C) \times D}$). Prepend a
single learnable [class] token (CLS token) $\mathbf{z}_0^0 = \mathbf{x}_{\text{class}}$ whose
final-layer hidden state $\mathbf{z}_0^L$ carries the image representation. Add learned 1D
positional embeddings $\mathbf{E}_{\text{pos}} \in \mathbb{R}^{(N+1) \times D}$ to all $N+1$
tokens. Feed the sequence through $L$ standard transformer encoder blocks, each consisting of
layer-normalised multi-head self-attention (MSA) followed by a layer-normalised MLP with GELU
activations, both with residual connections (Eqs. 1–4 in §3.1):

$$\mathbf{z}_0 = [\mathbf{x}_{\text{class}};\, \mathbf{x}_p^1 \mathbf{E};\, \ldots;\, \mathbf{x}_p^N \mathbf{E}] + \mathbf{E}_{\text{pos}}$$

$$\mathbf{z}'_\ell = \text{MSA}(\text{LN}(\mathbf{z}_{\ell-1})) + \mathbf{z}_{\ell-1}, \quad \ell = 1 \ldots L$$

$$\mathbf{z}_\ell = \text{MLP}(\text{LN}(\mathbf{z}'_\ell)) + \mathbf{z}'_\ell, \quad \ell = 1 \ldots L$$

$$y = \text{LN}(\mathbf{z}_0^L)$$

Classification head at pre-training time: an MLP with one tanh-activated hidden layer. At
fine-tuning time: a single zero-initialised linear layer. The design consciously removes all
image-specific inductive bias except patch extraction and the 2D interpolation of positional
embeddings when the fine-tuning resolution differs from pre-training.

# Assumptions

1. **(Hard) Fixed-resolution input divisible by patch size.** Pre-training is always at 224×224.
   Fine-tuning at other resolutions requires 2D interpolation of the positional embeddings (§3.2).
2. **(Hard) Large pre-training corpus.** ViT lacks the translation equivariance and locality
   inductive biases of CNNs. On ImageNet-1k only, ViT-L underperforms ViT-B, and both fall
   below comparable ResNets (Figure 3, §4.3).
3. **(Soft) Learned 1D positional embeddings are sufficient.** Ablations (Table 8, Appendix D.4)
   show no significant gain from 2D-aware or relative positional embeddings when operating at
   patch level. The model learns row-column structure in the embeddings (Figure 7 center).
4. **(Soft) Standard Transformer training recipe transfers from NLP.** Adam ($\beta_1=0.9$,
   $\beta_2=0.999$), batch 4096, weight decay 0.1, linear warmup and decay (§4.1). The paper
   finds Adam slightly better than SGD even for ResNets in this transfer-learning regime (Table 7).
5. **(Soft) Self-attention can replace convolutional spatial hierarchy.** Some attention heads
   attend globally even in the first layer (Figure 7 right); others initially show localised
   attention analogous to early conv layers, especially in hybrid models (Appendix D.7).

# Failure regime

- **Small-data regime.** On ImageNet-1k alone, ViT-L/16 reaches 76.53% top-1; ViT-B/16 reaches
  77.91% (Table 5). A comparable BiT ResNet (R152x4, ImageNet-21k) reaches 87.54% (Table 2).
  The gap narrows with dataset size and disappears above roughly 100M training images (Figure 4).
- **ViT-B/32 on 9M JFT subset vs ResNet50.** ViT-B/32 is slightly faster than ResNet50x1 but
  performs "much worse" on the 9M subset and better on 90M+ subsets (§4.3). Convolutional
  inductive bias is useful for small data; learning spatial structure from scratch requires
  sufficient training signal.
- **High-resolution inference.** Self-attention cost is $O(N^2)$ in the number of patches.
  ViT-H/14 at 518×518 uses $518/14 \approx 37$ patches per side, giving $N \approx 1369$
  tokens. Scaling to much higher resolutions (e.g., 1024×1024) without architectural modification
  (windowed or sparse attention) is computationally prohibitive.
- **Self-supervised pretraining gap.** Masked patch prediction gives ViT-B/16 79.9% on ImageNet,
  a 2% improvement over training from scratch but 4% below supervised pre-training (§4.6).
  The BERT-style masking objective on patches is weaker than contrastive or masked-autoencoder
  methods developed subsequently.

# Numerical sensitivity

**Model variants (Table 1, §4.1):**

| Model     | Layers | Hidden $D$ | MLP size | Heads | Params |
|-----------|--------|------------|----------|-------|--------|
| ViT-B/16  | 12     | 768        | 3072     | 12    | 86M    |
| ViT-L/16  | 24     | 1024       | 4096     | 16    | 307M   |
| ViT-H/14  | 32     | 1280       | 5120     | 16    | 632M   |

Notation: ViT-L/16 = Large variant, 16-px patches; ViT-H/14 = Huge variant, 14-px patches.
Sequence length $N = (224/16)^2 = 196$ for P=16; $N = (224/14)^2 = 256$ for P=14.

**Headline fine-tuning accuracies on ImageNet (Table 2), fine-tuned at higher resolution:**

| Model (pre-train)          | ImageNet top-1 | ImageNet-ReaL | CIFAR-100 | VTAB (19 tasks) | TPUv3-core-days |
|----------------------------|---------------|---------------|-----------|-----------------|-----------------|
| ViT-H/14 (JFT-300M)        | 88.55 ± 0.04  | 90.72 ± 0.05  | 94.55 ± 0.04 | 77.63 ± 0.23 | 2.5k         |
| ViT-L/16 (JFT-300M)        | 87.76 ± 0.03  | 90.54 ± 0.03  | 93.90 ± 0.05 | 76.28 ± 0.46 | 0.68k        |
| ViT-L/16 (ImageNet-21k)    | 85.30 ± 0.02  | 88.62 ± 0.05  | 93.25 ± 0.05 | 72.72 ± 0.21 | 0.23k        |
| BiT-L (R152x4, IN-21k)     | 87.54 ± 0.02  | 90.54         | 93.51 ± 0.08 | 76.29 ± 1.70 | 9.9k         |
| Noisy Student (EfficientNet-L2) | 88.4/88.5* | 90.55      | —           | —            | 12.3k        |

ViT-H/14 fine-tuned at 518×518; ViT-L/16 fine-tuned at 512×512 (§4.1 footnote). All mean ± std
over three fine-tuning runs.

**Compute vs. performance (Table 6, §4.4, Figure 5):** ViT uses approximately 2–4× less compute
than ResNets of comparable transfer accuracy on JFT-300M. ViT-H/14 at 14 epochs: 4262 exaFLOPs;
ResNet200x3 at 14 epochs: 3306 exaFLOPs, reaching 87.22% ImageNet (vs. 88.08% for ViT-H/14
at equivalent fine-tune resolution of 384 without Polyak averaging).

**Data crossover (Figure 4, §4.3):** ResNets plateau and ViT overtakes at roughly 100M JFT
training images in few-shot linear evaluation. The crossover is visible in Figure 4 comparing
ViT-L/32 and ViT-L/16 against ResNet152x2 and ResNet50x1.

**Positional embedding ablation (Table 8, Appendix D.4):** No positional embedding: 0.614
ImageNet 5-shot accuracy; 1D learned: 0.642; 2D learned: 0.640; relative: 0.640. Difference
between positional encoding strategies is negligible; the large gap is only between none and any.

**Depth vs. width scaling (Figure 8, Appendix D.2):** Depth scaling produces the largest
accuracy gains (visible up to 64 layers); width scaling produces the smallest changes; smaller
patch size (longer sequence) gives surprisingly robust gains without adding parameters.

# Applicability

- **Use when:** large-scale pre-training is available (ImageNet-21k minimum; JFT-300M for SOTA);
  flexible architecture for downstream adaptation; pure-attention backbone for modular extension
  (dense prediction heads, cross-attention decoders, etc.).
- **Don't use when:** small-data regime without large-scale pretraining (ResNet or EfficientNet
  will dominate); very-high-resolution inputs where quadratic attention is cost-prohibitive
  (use Swin Transformer or other windowed-attention variants); latency-critical deployment on
  mobile (ViT-B/16 is 86M params; use MobileViT or similar).
- **Compared against:** ResNet (BiT) — the dominant pre-ViT ImageNet backbone; Hybrid
  (ResNet stem + ViT body) — slightly better than pure ViT at small compute budgets but gap
  vanishes for larger models (§4.4, Figure 5); Noisy Student (EfficientNet-L2) — comparable
  top-1 but requiring 12.3k TPUv3-core-days vs. 2.5k for ViT-H/14.

# Connections

- **Builds on:** Vaswani et al. 2017 "Attention is All You Need" (MSA + MLP encoder block
  design, [class]-token concept inherited from BERT / Devlin et al. 2019). AlexNet/VGG/ResNet
  classification paradigm (the comparison baseline and motivation).
- **Enables:** SAM (Kirillov et al. 2023 uses MAE-pretrained ViT-H as image encoder); MobileSAM
  (distils ViT-H into a lightweight ViT-Tiny); MAE (He et al. 2022 — masked autoencoder pretraining
  for ViT); DINOv2; Swin Transformer; BEiT; and essentially all modern large vision foundation
  models. Dense-prediction adaptations: ViT-Adapter, plain ViT with decoders (LSeg, Painter, etc.).
- **Refutes / supersedes:** the prevailing assumption (pre-2020) that CNNs are necessary for
  competitive image recognition. ViT does not supersede ResNet in practice — they coexist and are
  compared with — but it disproves CNN necessity at large pretraining scale.

# Atlas update plan

## NEW: vit
Type: model
Category: backbone (classification + dense-prediction foundation)
Primary source: this paper (dosovitskiy2020-vit)

**Motivation.** Prior art (AlexNet, VGG, GoogLeNet, ResNet) relied on convolutional inductive
bias (locality, translation equivariance). ViT shows that a pure transformer — no convolutions —
applied to sequences of flattened image patches matches or exceeds SOTA CNNs when pre-trained at
sufficient scale. The architectural insight is the equivalence of image patches and NLP tokens.

**Architecture — family and shape.** Three canonical sizes from Table 1 (§4.1):

- ViT-Base/16: L=12, D=768, MLP=3072, H=12 heads, P=16 px → 86M params, N=196 tokens (224²).
- ViT-Large/16: L=24, D=1024, MLP=4096, H=16 heads, P=16 px → 307M params.
- ViT-Huge/14: L=32, D=1280, MLP=5120, H=16 heads, P=14 px → 632M params, N=256 tokens (224²).

**Architecture — blocks.** Standard transformer encoder blocks (Vaswani 2017): pre-LN MSA +
pre-LN MLP with GELU nonlinearity + residual connections (Eqs. 1–4, §3.1). CLS token for
classification. Learned 1D positional embeddings — 2D variants give no measurable gain (Table 8).

**Training.** Pre-train: Adam (β₁=0.9, β₂=0.999), batch 4096, weight decay 0.1, linear LR
warmup + decay (Table 3). Fine-tune: SGD with momentum, batch 512, cosine decay (Table 4).
Always fine-tune at higher resolution than pre-training (384 standard, up to 518 for ViT-H/14).
Polyak averaging (factor 0.9999) applied for ImageNet Table 2 results.

**Implementations.**
- Official: https://github.com/google-research/vision_transformer (JAX/Flax, Google Research).
- HuggingFace `transformers` — `ViTModel`, `ViTForImageClassification` (PyTorch + TF).
- `timm` — `vit_base_patch16_224`, `vit_large_patch16_384`, etc. (PyTorch).

**Assessment — novelty.** First demonstration that a pure transformer (zero convolutional
layers except patch extraction) achieves competitive image recognition at scale. Establishes the
patch-as-token paradigm that underlies essentially all subsequent vision foundation models.

**Assessment — strengths.** Scales better than ResNet with data (Figure 4, Figure 5). Requires
2–4× less compute than ResNets for the same transfer accuracy at large scale (§4.4). Modular:
same encoder block design as NLP transformers, enabling adaptation of NLP tooling. Global
self-attention from the first layer enables long-range spatial reasoning without explicit design.

**Assessment — limitations.** Requires large-scale pretraining (JFT-300M for SOTA; ImageNet-21k
for competitive results). On ImageNet-1k alone underperforms ResNet by several points (Table 5).
Quadratic memory cost in number of patches limits very-high-resolution inputs. No multi-scale
feature hierarchy — standard ViT outputs a single-scale feature map, requiring additional design
for dense prediction (unlike ResNet's stage-wise feature pyramid).

**Relations (for frontmatter):**
```yaml
relations:
  - { type: feeds_into, target: sam, confidence: high }
  - { type: feeds_into, target: mobilesam, confidence: high }
  - { type: compared_with, target: resnet, confidence: high,
      caution: "ViT vs ResNet (BiT) is the headline comparison in the paper; ResNet dominates small-data regimes; ViT scales better with large pretraining." }
```

**References for the page:** Vaswani 2017 (transformer encoder block); Dosovitskiy 2020 (this
paper, primary source); He 2016 ResNet (comparison baseline); Kolesnikov 2020 BiT (comparison
baseline).

## REFS: loose connections to dense-prediction Atlas pages

The following pages are not the primary subject of this paper but use ViT as a standard backbone
in subsequent work. They warrant a brief note in their `## Implementations` or `## Remarks`
sections once a `vit` page exists:

- `sam`: explicitly uses MAE-pretrained ViT-H as image encoder; add `prerequisites: [vit]`.
- `mobilesam`: distils ViT-H to ViT-Tiny; add `prerequisites: [vit]`.
- `fcn-semantic-segmentation`, `unet-segmentation`, `deeplab-semantic-segmentation`,
  `mask-rcnn`, `ritm-interactive-segmentation`: ViT is not the primary backbone in the original
  papers for these but ViT-based variants exist. No relation edges needed until specific
  ViT-adapted versions are covered by dedicated Atlas pages.

# Provenance

- **Abstract:** core claim, datasets, benchmarks — §Abstract, p. 1.
- **88.55% ImageNet top-1 (ViT-H/14, JFT-300M):** Table 2, §4.2, p. 6.
- **90.72% ImageNet-ReaL (ViT-H/14, JFT-300M):** Table 2, §4.2, p. 6.
- **94.55% CIFAR-100 (ViT-H/14, JFT-300M):** Table 2, §4.2, p. 6.
- **77.63% VTAB (ViT-H/14, JFT-300M):** Table 2, §4.2, p. 6.
- **BiT-L (R152x4) comparison: 87.54% ImageNet:** Table 2, §4.2, p. 6.
- **TPUv3-core-days — ViT-H/14: 2.5k; ViT-L/16: 0.68k; BiT-L: 9.9k:** Table 2, §4.2, p. 6.
- **Model variants table (layers, D, MLP, heads, params):** Table 1, §4.1, p. 5.
- **Patch-embedding and CLS-token equations (Eqs. 1–4):** §3.1, p. 3–4.
- **Inductive bias discussion:** §3.1, p. 4.
- **Pre-training hyperparameters:** Table 3, Appendix B.1, p. 13.
- **Fine-tuning hyperparameters:** Table 4, Appendix B.1.1, p. 14.
- **Fine-tuning at 512 (ViT-L/16) and 518 (ViT-H/14) and Polyak averaging:** §4.1, p. 5.
- **Data requirements / crossover at ~100M images:** Figure 4, §4.3, p. 6–7.
- **BiT CNNs outperform ViT on ImageNet-1k only; ViT overtakes on larger datasets:** Figure 3, §4.3, p. 7.
- **Compute efficiency 2–4× better than ResNets:** §4.4, p. 7–8.
- **Table 5 (ImageNet/ImageNet-21k/JFT-300M transfer per variant):** Appendix C, p. 15.
- **Table 6 (exaFLOPs per model):** Appendix C, p. 15–16.
- **Positional embedding ablation (1D vs 2D vs relative):** Table 8, Appendix D.4, p. 17–18.
- **Depth vs. width scaling:** Figure 8, Appendix D.2, p. 16.
- **Self-supervised masked patch prediction: 79.9% ImageNet, 4% below supervised:** §4.6, p. 8–9.
- **MSA equations:** Appendix A, p. 13.
- **Hybrid architecture:** §3.1, p. 4; Figure 5 comparison, §4.4.
