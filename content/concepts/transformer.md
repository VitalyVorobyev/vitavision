---
title: "Transformer"
date: 2026-08-23
summary: "Sequence-to-sequence architecture assembled entirely from attention and position-wise feedforward sublayers, each wrapped in a residual connection and layer normalisation — no recurrence, no convolution."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: representation-learning
difficulty: intermediate
prerequisites: [attention-mechanism, positional-encoding, normalization]
sources:
  primary: vaswani2017-attention
  references:
    - ba2016-layernorm
    - dosovitskiy2020-vit
    - katharopoulos2020-linear-attention
---

# Definition

A transformer is a sequence-to-sequence architecture assembled from attention sublayers and position-wise feedforward sublayers. It contains no recurrence and no convolution. The encoder maps a source token sequence to a sequence of continuous representations; the decoder generates the target sequence autoregressively, one symbol at a time, conditioned on the encoder representations and on previously generated symbols. The attention operation itself is defined on [attention-mechanism](/atlas/attention-mechanism).

:::definition[Transformer block]
One layer of the stack. Two sublayers, applied in order:

1. A multi-head attention sublayer.
2. A position-wise feedforward network.

Each sublayer is wrapped in a residual connection followed by layer normalisation:

$$
\mathrm{LayerNorm}(x + \mathrm{Sublayer}(x)).
$$

All sublayers, including the embedding layers, produce outputs of dimension $d_{model}$ so the residual sum is well-formed.
:::

Vision applications use the encoder stack alone, over a sequence of image patch tokens.

# Mathematical Description

## Encoder and decoder stacks

The original configuration stacks $N = 6$ identical layers in the encoder and $N = 6$ in the decoder. An encoder layer has two sublayers: self-attention and the feedforward network. A decoder layer has three: masked self-attention, an encoder-attending sublayer, and the feedforward network.

Attention appears in three distinct placements, differing only in where $Q$, $K$, and $V$ come from:

- **Encoder self-attention** — queries, keys, and values all come from the previous encoder layer.
- **Masked decoder self-attention** — all three come from the previous decoder layer, with positions prevented from attending to subsequent positions. Combined with output embeddings offset by one position, this preserves the autoregressive property.
- **Encoder-decoder cross-attention** — queries come from the previous decoder layer; keys and values come from the encoder output.

The masking is implemented inside scaled dot-product attention by setting to $-\infty$ all values in the input of the softmax which correspond to illegal connections.

A single weight matrix is shared between the two embedding layers and the pre-softmax linear transformation. In the embedding layers those shared weights are additionally multiplied by $\sqrt{d_{model}}$.

## Position-wise feedforward network

Each layer applies a two-layer network to every position separately and identically:

$$
\mathrm{FFN}(x) = \max(0, xW_1 + b_1)W_2 + b_2.
$$

The inner dimension is $d_{ff} = 2048$ against a model dimension $d_{model} = 512$, so the transformation expands and then projects back: $512 \to 2048 \to 512$. The same operation is equivalently described as two convolutions with kernel size 1. Parameters are shared across positions within a layer and differ between layers.

## Residual connections and normalisation

Normalisation is applied *after* the residual add — the post-LN convention. The sublayer output is $\mathrm{LayerNorm}(x + \mathrm{Sublayer}(x))$, not $x + \mathrm{Sublayer}(\mathrm{LayerNorm}(x))$.

Layer normalisation computes its statistics over all the hidden units in the same layer, for a single training case:

$$
\mu^l = \frac{1}{H}\sum_{i=1}^{H} a_i^l, \qquad
\sigma^l = \sqrt{\frac{1}{H}\sum_{i=1}^{H} \left(a_i^l - \mu^l\right)^2},
$$

with $H$ the number of hidden units in layer $l$ and $a_i^l$ the summed input to unit $i$. All hidden units in a layer share the same $\mu$ and $\sigma$; different training cases have different normalisation terms. The applied operator is $\mathrm{LN}(z;\alpha,\beta) = \frac{z-\mu}{\sigma}\odot\alpha + \beta$, retaining a per-unit gain and bias.

Because $\mu^l$ and $\sigma^l$ depend only on the current training case, the statistics are independent of batch size and identical at training and test time. The method works unchanged at batch size 1 and imposes no constraint on how many sequences are processed together — the property that makes it applicable to variable-length token sequences, where batch-axis statistics would have to be maintained per position.

The Vision Transformer places normalisation before each sublayer instead: $\mathbf{z}'_\ell = \mathrm{MSA}(\mathrm{LN}(\mathbf{z}_{\ell-1})) + \mathbf{z}_{\ell-1}$ and $\mathbf{z}_\ell = \mathrm{MLP}(\mathrm{LN}(\mathbf{z}'_\ell)) + \mathbf{z}'_\ell$, with a final $y = \mathrm{LN}(\mathbf{z}_0^L)$ on the classification token.

## Positional information

The attention sublayer carries no notion of sequence order; it is a set operation over key–value pairs. Position must be injected explicitly: information about the relative or absolute position of the tokens in the sequence is added to the input embeddings at the bottom of both stacks, which requires the encoding to have dimension $d_{model}$.

The original encoding is a fixed sine/cosine pair per dimension index:

$$
PE_{(pos,2i)} = \sin\!\left(pos/10000^{2i/d_{model}}\right), \qquad
PE_{(pos,2i+1)} = \cos\!\left(pos/10000^{2i/d_{model}}\right),
$$

where $pos$ is the position index and $i$ the dimension-pair index. Wavelengths form a geometric progression from $2\pi$ to $10000 \cdot 2\pi$ across the dimensions. The stated reason for the sinusoidal choice is that for any fixed offset $k$, $PE_{pos+k}$ can be represented as a linear function of $PE_{pos}$, and that fixed sinusoids may allow the model to extrapolate to sequence lengths longer than the ones encountered during training. Learned positional embeddings were also tested and produced nearly identical results. The full treatment is on [positional-encoding](/atlas/positional-encoding).

## Training configuration

Training uses Adam with $\beta_1 = 0.9$, $\beta_2 = 0.98$, $\epsilon = 10^{-9}$, and a learning rate that varies over training as

$$
lrate = d_{model}^{-0.5} \cdot \min\!\left(step\_num^{-0.5},\; step\_num \cdot warmup\_steps^{-1.5}\right),
$$

with $warmup\_steps = 4000$: linear increase for the first $warmup\_steps$ steps, then decay proportional to the inverse square root of the step number. Regularisation is dual. Residual dropout $P_{drop} = 0.1$ is applied to each sublayer's output before the residual add and to the embedding-plus-positional-encoding sum; label smoothing uses $\epsilon_{ls} = 0.1$.

## The encoder in vision

The Vision Transformer feeds the encoder stack a sequence of image patch tokens. A 2D image is cut into $N = HW/P^2$ non-overlapping $P \times P$ patches, each flattened to $\mathbb{R}^{P^2 C}$ and projected by a learned matrix $\mathbf{E} \in \mathbb{R}^{(P^2C) \times D}$ to a $D$-dimensional token. A single learnable [class] token is prepended, and its final-layer state $\mathbf{z}_0^L$ carries the image representation. Learned 1D positional embeddings $\mathbf{E}_{\text{pos}} \in \mathbb{R}^{(N+1)\times D}$ are added to all $N+1$ tokens. No decoder is used. The base configuration is ViT-B/16: $L = 12$ layers, $D = 768$, MLP size 3072, $H = 12$ heads, 86M parameters, $N = (224/16)^2 = 196$ patch tokens at 224×224 input. Details are on [vit](/atlas/vit).

# Numerical Concerns

**Uniform residual width.** Every sublayer and every embedding layer must emit $d_{model} = 512$ outputs to facilitate the residual connections. A width mismatch anywhere in the stack breaks the residual sum rather than degrading it.

**Warmup is part of the optimiser, not a convenience.** The schedule increases the learning rate linearly over the first 4000 steps and then decays as $step\_num^{-0.5}$. Training is sensitive to the warmup phase because the stack is trained from scratch with no pretrained initialisation. The Vision Transformer also uses linear warmup followed by decay.

**LayerNorm has no stated $\epsilon$.** The source's own operator is $\mathrm{LN}(z;\alpha,\beta) = \frac{z-\mu}{\sigma}\odot\alpha+\beta$, with no explicit stabilising term in the denominator; behaviour as $\sigma \to 0$ is not addressed there. A related effect is documented: under layer normalisation, growing the weight-vector norm implicitly shrinks the effective learning rate along that direction, an implicit early stopping that stabilises learning.

**Embedding scale must match the encoding scale.** Embedding-layer weights are multiplied by $\sqrt{d_{model}}$ before the positional encoding is added. Each sinusoid is $O(1)$, so the two terms are only commensurate when that factor is applied.

**The encoding spectrum is tied to $d_{model}$.** Wavelengths span a geometric progression from $2\pi$ to $10000 \cdot 2\pi$ across the dimensions. Changing $d_{model}$ changes the spectrum, and the extrapolation-to-longer-sequences property holds only for the closed-form sinusoid, not for a learned embedding table.

**Normalisation choice depends on layer type.** Layer normalisation assumes all hidden units in a layer make similar contributions. The source states this assumption is no longer true for convolutional networks, where the large number of hidden units whose receptive fields lie near the boundary of the image are rarely turned on and thus have very different statistics; batch normalisation outperforms it there.

**Label smoothing is a deliberate trade.** At $\epsilon_{ls} = 0.1$ it hurts perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score.

# Where it appears

Backbones and pretraining:

- [vit](/atlas/vit) — the encoder stack applied directly to patch tokens; $L$ blocks of pre-LayerNorm multi-head self-attention plus MLP with residual connections, [CLS] token readout.
- [mae](/atlas/mae) — asymmetric encoder–decoder over the same blocks; the decoder is 8 Transformer blocks at width 512 and is discarded after pretraining.
- [dinov2](/atlas/dinov2) — ViT-S/B/L/g variants of 12 to 40 blocks, with the feedforward sublayer instantiated as either MLP or SwiGLU.

Detection and segmentation:

- [detr](/atlas/detr) — 6-layer transformer encoder over flattened CNN feature tokens plus a 6-layer decoder taking $N = 100$ learned object queries, model dimension $d = 256$.
- [rf-detr](/atlas/rf-detr) — DINOv2 ViT backbone feeding an LW-DETR-derived transformer encoder–decoder with learned object queries.
- [segformer](/atlas/segformer) — hierarchical Mix Transformer encoder whose per-stage blocks use efficient self-attention and no positional encodings.
- [mask2former](/atlas/mask2former) — DETR-style transformer decoder over pixel-decoder features, with cross-attention restricted to each query's predicted mask foreground.
- [sam](/atlas/sam) — two-way cross-attention transformer mask decoder; SAM 2 adds a memory attention stack of $L$ transformer blocks over past-frame memories.
- [mobilesam](/atlas/mobilesam) — TinyViT encoder using transformer blocks in stages 2–4, 5.78M parameters, distilled from the ViT-H teacher.

Matching and 3D:

- [superglue](/atlas/superglue) — $L = 9$ alternating self/cross attention layers, each a residual multi-head-attention message-passing update followed by an MLP.
- [lightglue](/atlas/lightglue) — 9 self+cross attention layers with rotary positional encoding, per-layer confidence head, and early exit.
- [loftr](/atlas/loftr) — Local Feature Transformer of $N_c$ interleaved self- and cross-attention layers over flattened coarse feature maps, with the $\mathrm{elu}(\cdot)+1$ linear kernel.
- [vggt](/atlas/vggt) — Alternating-Attention transformer of $L = 24$ blocks, each a frame-wise self-attention layer followed by a global self-attention layer.

# References

1. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin. *Attention Is All You Need.* NeurIPS, 2017. [arXiv](https://arxiv.org/abs/1706.03762)
2. J. L. Ba, J. R. Kiros, G. E. Hinton. *Layer Normalization.* arXiv, 2016. [arXiv](https://arxiv.org/abs/1607.06450)
3. A. Dosovitskiy, L. Beyer, A. Kolesnikov, D. Weissenborn, X. Zhai, T. Unterthiner, M. Dehghani, M. Minderer, G. Heigold, S. Gelly, J. Uszkoreit, N. Houlsby. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv](https://arxiv.org/abs/2010.11929)
4. A. Katharopoulos, A. Vyas, N. Pappas, F. Fleuret. *Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention.* ICML, 2020. [arXiv](https://arxiv.org/abs/2006.16236)
