---
title: "Attention Mechanism"
date: 2026-08-23
summary: "Computes each output element as a learned, input-dependent weighted average of value vectors, letting every element aggregate information from any other regardless of distance."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: representation-learning
difficulty: intermediate
prerequisites: []
sources:
  primary: vaswani2017-attention
  references:
    - bahdanau2014-align
    - katharopoulos2020-linear-attention
    - darcet2023-registers
    - su2021-roformer
    - dao2022-flashattention
    - ainslie2023-gqa
    - sarlin2020-superglue
    - sun2021-loftr
    - lindenberger2023-lightglue
---

# Definition

Attention maps a query and a set of key–value pairs to an output. The output is a weighted average of the value vectors, and the weight on each value is produced by a compatibility function between the query and that value's key. The weights are computed from the input at run time, so the aggregation pattern is input-dependent rather than fixed by the architecture.

:::definition[Scaled dot-product attention]
Compatibility is the dot product of query and key, divided by the square root of the key dimension, then normalised by a softmax over keys.

$$
\mathrm{Attention}(Q,K,V) = \mathrm{softmax}(QK^T/\sqrt{d_k})V
$$

Queries and keys have dimension $d_k$; values have dimension $d_v$. For query and key components modelled as independent, zero-mean, unit-variance random variables, $q \cdot k$ has variance $d_k$. Unscaled dot products therefore grow in magnitude with $d_k$ and push softmax into small-gradient regions. The factor $1/\sqrt{d_k}$ counteracts that growth.
:::

The operation imposes no locality or ordering constraint. Every query attends to every key in a single step, at any distance.

# Mathematical Description

## Origins: additive attention

The mechanism was introduced to remove a bottleneck in recurrent encoder–decoder translation. The baseline requires the network "to be able to compress all the necessary information of a source sentence into a fixed-length vector", and its performance "deteriorates rapidly as the length of an input sentence increases". The fix replaces the single terminal state with a distinct context vector per output step.

A bidirectional encoder produces annotations $h_j = [\overrightarrow{h_j}^\top; \overleftarrow{h_j}^\top]^\top$, one per source position. An alignment model scores each annotation against the previous decoder state:

$$
e_{ij} = a(s_{i-1}, h_j) = v_a^\top \tanh(W_a s_{i-1} + U_a h_j),
$$

with $W_a \in \mathbb{R}^{n\times n}$, $U_a \in \mathbb{R}^{n \times 2n}$, $v_a \in \mathbb{R}^n$. The scores are normalised and used as averaging weights:

$$
\alpha_{ij} = \dfrac{\exp(e_{ij})}{\sum_{k=1}^{T_x}\exp(e_{ik})}, \qquad c_i = \sum_{j=1}^{T_x} \alpha_{ij} h_j.
$$

The context vector is an expected annotation, where the expectation is over possible alignments. In current terminology the query is the decoder hidden state $s_{i-1}$; the keys and values are both the encoder annotations $h_j$. This formulation uses one representation for both roles, unlike later architectures that project separate key and value vectors.

The compatibility function is the part that changed. Replacing the single-hidden-layer network with a dot product is "faster and more space-efficient in practice due to optimized matrix multiplication", but requires the $1/\sqrt{d_k}$ scaling to match additive attention's behaviour at large $d_k$.

## Scaled dot-product and multi-head

Applying one attention function over the full representation averages together information from different representation subspaces. Multi-head attention runs $h$ independently projected copies in parallel and concatenates them:

$$
\mathrm{MultiHead}(Q,K,V) = \mathrm{Concat}(\mathrm{head}_1,...,\mathrm{head}_h)W^O, \qquad \mathrm{head}_i = \mathrm{Attention}(QW_i^Q, KW_i^K, VW_i^V),
$$

with $W_i^Q, W_i^K \in \mathbb{R}^{d_{model}\times d_k}$, $W_i^V \in \mathbb{R}^{d_{model}\times d_v}$, and $W^O \in \mathbb{R}^{h d_v \times d_{model}}$. Per-head dimensions are set to $d_k = d_v = d_{model}/h$, keeping total cost comparable to single-head attention at full dimensionality.

The scale factor uses the **per-head** dimension $d_k$, not $d_{model}$. In the base configuration $d_{model}=512$, $h=8$, $d_k=d_v=64$, so the denominator is $8$. Model pages that report a per-head dimension follow the same rule; see [vit](/atlas/vit), where the scale is $1/\sqrt{D_h}$ with $D_h = D/H$.

Three usage patterns follow from the choice of where $Q$, $K$, and $V$ come from: encoder-decoder attention, encoder self-attention, masked decoder self-attention. Self-attention draws all three from one set, so each element aggregates context from its own set. Cross-attention draws queries from one set and keys and values from another. Causal decoding is enforced by masking out (setting to $-\infty$) all values in the input of the softmax that correspond to illegal connections — the mask is additive and applied before the softmax, not by zeroing weights after it.

## Complexity and the efficiency lineage

The argument for replacing recurrence is per-layer cost, parallelism, and the path length signals must travel between distant positions.

| Layer type | Complexity per layer | Sequential ops | Maximum path length |
|---|---|---|---|
| Self-attention | $O(n^2 \cdot d)$ | $O(1)$ | $O(1)$ |
| Recurrent | $O(n \cdot d^2)$ | $O(n)$ | $O(n)$ |
| Convolutional | $O(k \cdot n \cdot d^2)$ | $O(1)$ | $O(\log_k(n))$ |
| Self-attention (restricted) | $O(r \cdot n \cdot d)$ | $O(1)$ | $O(n/r)$ |

Here $n$ is sequence length, $d$ representation dimension, $k$ convolution kernel size, and $r$ the restricted-attention neighbourhood size. Self-attention is cheaper per layer than recurrence only when $n < d$. Beyond that point the $O(n^2 \cdot d)$ term dominates.

Kernelised linear attention removes the quadratic term by changing the compatibility function. Generalised attention is a normalised weighted sum over similarity scores,

$$
V'_i = \frac{\sum_j \mathrm{sim}(Q_i,K_j)V_j}{\sum_j \mathrm{sim}(Q_i,K_j)},
$$

with standard attention recovered by $\mathrm{sim}(q,k) = \exp(q^\top k/\sqrt{D})$. Choosing instead a kernel with an explicit finite feature map, $\mathrm{sim}(q,k) = \varphi(q)^\top\varphi(k)$, allows the sums to be re-associated:

$$
V'_i = \frac{\varphi(Q_i)^\top\left(\sum_j \varphi(K_j)V_j^\top\right)}{\varphi(Q_i)^\top\left(\sum_j \varphi(K_j)\right)},
$$

vectorised as $\varphi(Q)(\varphi(K)^\top V)$. The inner sums do not depend on the query index, so they are computed once and reused, taking attention from $O(N^2)$ time and memory to $O(N)$. The feature map used is $\varphi(x) = \mathrm{elu}(x) + 1$, chosen over $\mathrm{relu}$ to avoid zero gradients for negative inputs. Exact softmax cannot be linearised this way: the exponential kernel's feature map is infinite-dimensional, which makes the linearisation of exact softmax attention infeasible. Under causal masking the shared sums become cumulative states $S_i = \sum_{j=1}^i \varphi(K_j)V_j^\top$ and $Z_i = \sum_{j=1}^i \varphi(K_j)$, updated in constant time per step.

The substitution is not free. On WSJ speech recognition, softmax attention reaches PER 5.12 at 2711 s/epoch against linear attention's PER 8.08 at 824 s/epoch — faster, but worse at equal epochs. The source paper credits its own kernel as an engineering choice, not a faithful softmax approximation. This formulation is due to Katharopoulos et al. [3]; [loftr](/atlas/loftr) adopts the same $\varphi(x) = \mathrm{elu}(x) + 1$ map in its coarse-level transformer.

Three later lines of work change the cost of attention without changing what it computes, or change only how position enters the score. FlashAttention reorders the computation to be IO-aware, producing exact attention while avoiding materialisation of the full score matrix in high-bandwidth memory [6]. Grouped-query attention shares key and value heads across groups of query heads, shrinking the key–value state read at inference [7]. Rotary position embeddings rotate queries and keys so that each score depends on the relative offset between positions rather than on additive absolute encodings; this is the dominant positional treatment in current transformer implementations [5].

## Attention in vision

The Vision Transformer applies this architecture's encoder to image patches, with each patch a token and every layer a global self-attention over the patch set; [vit](/atlas/vit) carries the architecture details.

Softmax normalisation forces each query's weights to sum to 1 across the sequence, so a query with no genuinely relevant key must still place mass somewhere. In large, sufficiently trained ViTs this surfaces as artifact tokens: roughly 2% of patch tokens acquire an approximately 10x higher norm at output, sitting on low-information background patches. Linear probes show these tokens have discarded local (position and pixel) information in favour of aggregated global information, which corrupts dense-prediction and attention-map readout. The remedy is architectural. A small number of extra learnable register tokens are appended to the sequence after patch embedding, treated like `[CLS]` inside the transformer but discarded at output; $N = 4$ registers is the setting used in every non-ablation experiment of the source paper. Registers do not create the behaviour, they isolate it away from patch tokens.

Cross-attention is the correspondence primitive in learned feature matching. SuperGlue alternates layers of self-attention (intra-image) and cross-attention (inter-image) over keypoint tokens; LoFTR runs interleaved self-attention and cross-attention layers with the linear transformer approximation over dense coarse feature maps; LightGlue keeps the same alternation and injects rotary relative-position encoding at every self-attention layer.

# Numerical Concerns

**Softmax overflow.** Direct exponentiation of the score row overflows in single precision once scores are large. The stable evaluation subtracts the per-row maximum before exponentiating, which leaves the normalised weights unchanged.

**Scaling is variance control, not cosmetics.** The $1/\sqrt{d_k}$ factor exists to cancel the variance-$d_k$ growth of the raw dot product. Omitting it, or dividing by $\sqrt{d_{model}}$ instead of the per-head $\sqrt{d_k}$, reintroduces the vanishing-softmax-gradient failure directly.

**Reduced-precision accumulation.** The product $QK^T$ is accumulated over $d_k$ terms before the scale factor is applied, so a reduced-precision accumulator sees the unscaled magnitude, whose variance is $d_k$. Accumulate the dot product in higher precision and apply the scale before the softmax.

**Masking order.** The causal mask is additive $-\infty$ on the softmax input. Zeroing attention weights after the softmax leaves the normaliser contaminated by illegal positions and does not reproduce the masked distribution.

**Linear-attention denominator.** The feature map guarantees $\varphi(x) > 0$ for all real $x$, since $\mathrm{elu}(x) \in (-1, \infty)$ and therefore $\mathrm{elu}(x)+1 \in (0, \infty)$. This keeps the denominator $\sum_j \varphi(K_j)$ strictly positive and avoids sign cancellation between numerator and denominator that a signed similarity score would allow.

**Artifact-token norms as a diagnostic.** Token-norm histograms are the practical detector for register-style artifacts: in the studied backbone, an average of 2.37% of tokens have norm > 150, read off a clearly bimodal histogram. The cutoff is model-specific and can vary across models, so it must be re-derived per backbone rather than reused.

# Where it appears

Attention is a prerequisite for every transformer-based page in the register, and for two convolutional pages that use channel-gating attention.

Backbones and pretraining:

- [vit](/atlas/vit) — global multi-head self-attention over patch tokens from the first layer, with per-head scaling $1/\sqrt{D_h}$.
- [mae](/atlas/mae) — asymmetric transformer autoencoder; the encoder's self-attention runs only over the visible patch subset, and the decoder attends over visible plus mask tokens.
- [dinov2](/atlas/dinov2) — self-supervised ViT whose CLS and patch tokens are both read out of the attention stack; the flagship exhibitor of the high-norm artifact tokens registers address.

Detection and segmentation:

- [detr](/atlas/detr) — encoder self-attention over all spatial tokens plus a decoder where learnable object queries cross-attend to encoder tokens and self-attend to each other.
- [rf-detr](/atlas/rf-detr) — searches the number of windowed attention blocks per encoder layer as an architecture knob over a DINOv2 backbone.
- [mask2former](/atlas/mask2former) — masked attention, restricting each query's cross-attention to its previously predicted mask foreground.
- [segformer](/atlas/segformer) — efficient self-attention that reduces the key sequence per stage before scoring.
- [sam](/atlas/sam) — two-way cross-attention mask decoder; SAM 2 adds a memory attention stack that self-attends on the current frame then cross-attends to past-frame memories.
- [mobilesam](/atlas/mobilesam) — distils SAM's ViT-H attention encoder into a TinyViT encoder while keeping the attention-based mask decoder frozen.
- [bisenet](/atlas/bisenet) — SE-style channel attention in the Attention Refinement and Feature Fusion modules, gating channels rather than positions.
- [mobilenetv3](/atlas/mobilenetv3) — Squeeze-and-Excitation channel gating inside the inverted-residual block; also a channel-attention, not a query–key form.

Matching and 3D:

- [feature-matching](/atlas/feature-matching) — the concept page for the matching stage that the attention-based matchers implement.
- [superglue](/atlas/superglue) — attentional graph network alternating self-attention within an image and cross-attention between images.
- [lightglue](/atlas/lightglue) — the same alternation with rotary relative-position encoding at every self-attention layer, plus per-layer pruning that shrinks the score matrix.
- [loftr](/atlas/loftr) — interleaved self- and cross-attention with the linear kernel over dense coarse feature maps.
- [vggt](/atlas/vggt) — alternating frame-wise and global self-attention, with camera and register tokens appended per frame.

# References

1. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin. *Attention Is All You Need.* NeurIPS, 2017. [arXiv](https://arxiv.org/abs/1706.03762)
2. D. Bahdanau, K. Cho, Y. Bengio. *Neural Machine Translation by Jointly Learning to Align and Translate.* ICLR, 2015. [arXiv](https://arxiv.org/abs/1409.0473)
3. A. Katharopoulos, A. Vyas, N. Pappas, F. Fleuret. *Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention.* ICML, 2020. [arXiv](https://arxiv.org/abs/2006.16236)
4. T. Darcet, M. Oquab, J. Mairal, P. Bojanowski. *Vision Transformers Need Registers.* ICLR, 2024. [arXiv](https://arxiv.org/abs/2309.16588)
5. J. Su, Y. Lu, S. Pan, A. Murtadha, B. Wen, Y. Liu. *RoFormer: Enhanced Transformer with Rotary Position Embedding.* Neurocomputing, 2024. [arXiv](https://arxiv.org/abs/2104.09864)
6. T. Dao, D. Y. Fu, S. Ermon, A. Rudra, C. Ré. *FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness.* NeurIPS, 2022. [arXiv](https://arxiv.org/abs/2205.14135)
7. J. Ainslie, J. Lee-Thorp, M. de Jong, Y. Zemlyanskiy, F. Lebrón, S. Sanghai. *GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints.* EMNLP, 2023. [arXiv](https://arxiv.org/abs/2305.13245)
