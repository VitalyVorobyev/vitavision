---
title: "Positional Encoding"
date: 2026-08-23
summary: "Mechanisms that inject token order into permutation-invariant attention: absolute encodings added to embeddings, learned tables, and rotary schemes that rotate queries and keys so position enters the score."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: representation-learning
difficulty: intermediate
prerequisites: [attention-mechanism]
sources:
  primary: vaswani2017-attention
  references:
    - su2021-roformer
    - dosovitskiy2020-vit
    - lindenberger2023-lightglue
---

# Definition

Attention maps a query and a set of key–value pairs to a weighted sum of the values. The operation is permutation-invariant: reordering the key–value set permutes the terms of a sum without changing it, so token order is invisible to the mechanism. Sequence order must therefore be injected explicitly.

Positional encoding is the family of mechanisms that performs that injection. The general form makes the query, key, and value projections $f_q, f_k, f_v$ depend on the token index in addition to the token content. Two injection points are in use.

**Additive.** A position vector is summed into the token embedding at the bottom of the stack, before any projection. This requires $\dim(PE) = d_{model}$ so the sum is well-formed.

**Multiplicative, at score level.** Position enters the attention score itself, by rotating the already-projected query and key vectors. Values are left untouched.

:::definition[Sinusoidal absolute positional encoding]
Position vectors added to the input embeddings at the bottom of both encoder and decoder stacks.

$$
PE_{(pos,2i)} = \sin\!\left(pos/10000^{2i/d_{model}}\right), \qquad PE_{(pos,2i+1)} = \cos\!\left(pos/10000^{2i/d_{model}}\right)
$$

Here $pos$ is the position index and $i$ the dimension-pair index. Each dimension pair carries one sinusoid; the wavelengths form a geometric progression from $2\pi$ to $10000 \cdot 2\pi$ across the dimensions.
:::

# Mathematical Description

## Sinusoidal absolute encodings

The sinusoidal scheme fixes the encoding in closed form, with no learned parameters. Two arguments are given for it over a learned embedding table.

The first is relative-position linearity: for any fixed offset $k$, $PE_{pos+k}$ can be represented as a linear function of $PE_{pos}$. This is hypothesised to let the model learn to attend by relative positions. It is stated as a hypothesis, not proven.

The second is extrapolation: a closed-form sinusoid is defined at every position, so it "may allow the model to extrapolate to sequence lengths longer than the ones encountered during training". A learned embedding table has no value past its trained range.

Learned positional embeddings were tested against the sinusoidal form in the same architecture. The two versions produced nearly identical results at the evaluated sequence lengths. The sinusoidal form was chosen on the extrapolation argument, not on a measured quality difference.

## Learned absolute encodings

[vit](/atlas/vit) uses a learned table rather than a closed form. A patch sequence of length $N$ plus one class token receives learned 1D positional embeddings $\mathbf{E}_{\text{pos}} \in \mathbb{R}^{(N+1) \times D}$, added to all $N+1$ tokens before the encoder stack.

Position-aware variants were ablated at patch level. Reported ImageNet 5-shot accuracy: no positional embedding 0.614; 1D learned 0.642; 2D learned 0.640; relative 0.640. The difference between positional encoding strategies is negligible; the large gap is only between none and any. The 1D table nevertheless learns row–column structure from data.

Pre-training runs at a fixed resolution of 224×224. Fine-tuning at other resolutions requires 2D interpolation of the positional embeddings, and fine-tuning is always done at higher resolution than pre-training — 384 standard, up to 518 for ViT-H/14.

## Rotary (relative) encodings

Rotary position embedding is derived from a constraint rather than assumed. The requirement is that the query–key inner product depend on the two embeddings and their offset only:

$$
\langle f_q(x_m,m),\, f_k(x_n,n)\rangle = g(x_m, x_n, m-n).
$$

In two dimensions, treating vectors as complex numbers, the solution is $f_q(x_m,m) = (W_q x_m)e^{im\theta}$ and $f_k(x_n,n) = (W_k x_n)e^{in\theta}$. The polar-form derivation forces the angular part into an arithmetic progression, $\phi(m) = m\theta + \gamma$; the initial condition $f_q(x_q,0) = W_q x_q$ fixes $\gamma = 0$, tying the encoding at position 0 to the ordinary position-free linear projection. In matrix form,

$$
f_{\{q,k\}}(x_m,m) = R^{(2)}_{\theta m} W_{\{q,k\}} x_m, \qquad R^{(2)}_{\theta m} = \begin{bmatrix}\cos m\theta & -\sin m\theta\\ \sin m\theta & \cos m\theta\end{bmatrix}.
$$

For general even $d$, the space is split into $d/2$ independent 2D sub-planes, each rotated by its own angle $m\theta_i$. The resulting $R^d_{\Theta,m}$ is a sparse block-diagonal orthogonal matrix with

$$
\Theta = \{\theta_i = 10000^{-2(i-1)/d},\ i \in [1,\dots,d/2]\}.
$$

This is the same geometric base (10000) and per-pair frequency schedule as the sinusoidal encoding, reused as rotation frequencies instead of additive phase arguments. An even $d$ is a hard requirement of the construction; an unpaired trailing dimension is undefined.

Applying the rotation to both query and key gives

$$
q_m^\top k_n = x_m^\top W_q^\top R^d_{\Theta,n-m} W_k x_n, \qquad R^d_{\Theta,n-m} = (R^d_{\Theta,m})^\top R^d_{\Theta,n},
$$

so the score depends on $n-m$ only.

The structural contrast with the sinusoidal scheme is the load-bearing distinction. Sinusoidal encodings are **added** to the token embedding before the linear projections. Rotary encodings **rotate** the already-projected query and key: position enters the attention score multiplicatively through $R^d_{\Theta,n-m}$, and the value branch is never modified, so values carry no position information.

Long-term decay follows from the frequency schedule. Written as a sum of $d/2$ per-pair complex terms, the inner product is bounded via an Abel summation-by-parts transformation by $\max_i|h_{i+1}-h_i| \cdot \sum_i |S_{i+1}|$, where $S_j = \sum_{i<j} e^{i(m-n)\theta_i}$. Under $\theta_i = 10000^{-2i/d}$ the average partial-sum magnitude $\frac{1}{d/2}\sum_i|S_i|$ empirically decays as $|m-n|$ grows, plotted against relative distance up to 250. Decay is a property of the chosen schedule, not of rotary encoding in general.

Because rotation preserves norm, the scheme composes with kernelised linear attention: the non-negative feature maps $\phi(q_m), \phi(k_n)$ are rotated before the kernel product, rather than $q,k$ themselves. Additive relative-position schemes alter the expanded bilinear terms of the score decomposition and do not factor through a linear kernel.

## When absolute vs relative matters

Reported comparisons are mixed and task-dependent.

On WMT14 En-De machine translation, Transformer-base with sinusoidal absolute encoding reaches 27.3 BLEU against 27.5 for the rotary variant. On GLUE fine-tuning against a learned-absolute BERT baseline, the rotary model wins on MRPC, STS-B and QQP but underperforms on SST-2, QNLI and both MNLI splits — the paper's own characterisation is "significantly outperform… in three out of six datasets". Pairing rotary encoding with a Performer linear-attention backbone on Enwik8 gives faster convergence and lower loss. On the CAIL2019-SCM long-text task, the 1024-token rotary model gives an absolute improvement of 1.5%. The source paper states its own open gaps: no theoretical explanation for the faster convergence, and no faithful explanation for the long-text advantage beyond the decay property shared with prior relative schemes.

At patch level in image classification the choice is close to free, as the ablation above shows: the encoding family barely matters, its presence does.

In sparse feature matching, [lightglue](/atlas/lightglue) adopts a rotary encoding of relative keypoint displacement, with self-attention score $a_{ij} = q_i^\top \mathbf{R}(\mathbf{p}_j - \mathbf{p}_i)\, k_j$ and $\mathbf{R}$ block-diagonal in $2\times2$ rotation blocks. The stated rationale is that this encodes relative rather than absolute geometry, is added at every self-attention layer rather than only at input, and is shared and cached across layers. It replaces the absolute MLP positional encoding of the predecessor matcher.

# Numerical Concerns

**Frequency schedule range.** Both schemes use base 10000. Sinusoidal wavelengths run from $2\pi$ to $10000 \cdot 2\pi$ across the $d_{model}$ dimensions, so changing $d_{model}$ changes the spectrum. The rotary schedule $\theta_i = 10000^{-2(i-1)/d}$ spans the corresponding dynamic range across $i = 1,\dots,d/2$: near 1 for low $i$, near $10^{-4\cdot(d/2-1)/d}$ for high $i$.

**Additive encoding perturbs embedding scale.** In the original transformer the embedding weights are multiplied by $\sqrt{d_{model}}$, while each sinusoid is $O(1)$ per dimension. The two magnitudes must match for the sum to be well-conditioned. Residual dropout is applied to sub-layer outputs pre-residual-add and to embedding+PE sums, so the dropout rate also acts on the position signal.

**Rotation cannot rescale.** $R^d_{\Theta,m}$ is exactly orthogonal by construction, so it cannot inflate or shrink vector norms regardless of position magnitude $m$. This is the stated stability argument for encoding position by rotation at long sequence lengths, against an additive position vector whose norm perturbs the embedding scale directly.

**Do not materialise the rotation matrix.** $R^d_{\Theta,m}$ is sparse block-diagonal; direct dense matrix multiplication is flagged as not computationally efficient. The intended realisation splits the embedding into interleaved channel pairs and multiplies against precomputed $\cos m\theta_i$ / $\sin m\theta_i$ vectors.

**Coordinate normalisation for 2D rotary encodings.** In the sparse-matching setting, keypoint positions are normalised to $[0,1]^2$ by image dimensions. Passing raw pixel coordinates breaks the rotary encoding, since the rotation angles are computed from those coordinates against learned basis vectors $b_k \in \mathbb{R}^2$, one per 2D subspace, fixed after training.

**Resolution change is a deployment concern for learned tables.** A learned 1D table is defined only for the sequence length it was trained at. Changing the patch grid requires 2D interpolation of the table onto the new length, which is a required step when fine-tuning or serving at a resolution other than the pre-training one.

# Where it appears

- [attention-mechanism](/atlas/attention-mechanism) — the permutation-invariant operation that positional encoding exists to supplement; its efficiency-lineage paragraph records rotary embeddings as the dominant current positional treatment.
- [vit](/atlas/vit) — learned 1D positional embeddings added to patch plus class tokens, 2D-interpolated when the fine-tuning resolution differs from pre-training.
- [lightglue](/atlas/lightglue) — rotary encoding of relative keypoint displacement, injected at every one of its 9 self-attention layers rather than once at input.
- [loftr](/atlas/loftr) — 2D sinusoidal positional encoding added once to the coarse feature maps at backbone output.
- [detr](/atlas/detr) — fixed 2D sinusoidal encodings added before every encoder self-attention layer, with 100 learned object queries acting as decoder-side positional embeddings.
- [mae](/atlas/mae) — the decoder receives all positions, each encoded visible token and each shared mask token summed with its positional embedding.
- [sam](/atlas/sam) — prompt encoder sums positional encodings with learned type embeddings for points and boxes; SAM 2 applies temporal position embeddings to recent-frame memories.
- [mask2former](/atlas/mask2former) — sinusoidal positional and learnable scale-level embeddings added at each of the three decoder feature scales.
- [rf-detr](/atlas/rf-detr) — positional embeddings pre-allocated and interpolated across the 11 searched input resolutions.
- [segformer](/atlas/segformer) — the counter-example: positional encodings are removed entirely, with a $3\times3$ depthwise convolution inside the feed-forward block supplying position implicitly.

# References

1. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin. *Attention Is All You Need.* NeurIPS, 2017. [arXiv](https://arxiv.org/abs/1706.03762)
2. J. Su, Y. Lu, S. Pan, A. Murtadha, B. Wen, Y. Liu. *RoFormer: Enhanced Transformer with Rotary Position Embedding.* Neurocomputing, 2024. [arXiv](https://arxiv.org/abs/2104.09864)
3. A. Dosovitskiy, L. Beyer, A. Kolesnikov, D. Weissenborn, X. Zhai, T. Unterthiner, M. Dehghani, M. Minderer, G. Heigold, S. Gelly, J. Uszkoreit, N. Houlsby. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv](https://arxiv.org/abs/2010.11929)
4. P. Lindenberger, P. Sarlin, M. Pollefeys. *LightGlue: Local Feature Matching at Light Speed.* ICCV, 2023. [arXiv](https://arxiv.org/abs/2306.13643)
