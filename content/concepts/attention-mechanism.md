---
title: "Attention Mechanism"
date: 2026-05-16
summary: "Computes each output element as a learned, input-dependent weighted average of value vectors, letting every element aggregate information from any other regardless of distance."
tags: ["deep-learning"]
author: "Vitaly Vorobyev"
domain: features
difficulty: intermediate
prerequisites: []
sources:
  primary: sarlin2020-superglue
  references:
    - lindenberger2023-lightglue
    - sun2021-loftr
---

# Definition

The attention mechanism computes each output element as a weighted sum of value vectors, where the weights are determined by a learned, input-dependent compatibility function between query and key vectors.

:::definition[Scaled dot-product attention]
Given a query matrix $Q \in \mathbb{R}^{n \times d}$, key matrix $K \in \mathbb{R}^{m \times d}$, and value matrix $V \in \mathbb{R}^{m \times d_v}$, the attended representation is

$$\mathrm{Attention}(Q, K, V) = \mathrm{Softmax}\!\left(\frac{QK^\top}{\sqrt{d}}\right)V.$$

Each output row is a softmax-weighted combination of the rows of $V$, the weights reflecting the dot-product similarity between each query and all keys, scaled by $\sqrt{d}$ to prevent saturation of the softmax. Input: $Q$, $K$, $V$. Output: $O \in \mathbb{R}^{n \times d_v}$, each row aggregating information from all $m$ positions weighted by their compatibility with the corresponding query.
:::

The mechanism places no assumption on the positional arrangement of the inputs: every query can attend to every key regardless of distance. This distinguishes attention from convolution and recurrence, which constrain receptive fields by locality or sequential order.

# Mathematical Description

## Scaled dot-product attention

For query $q_i$ and key-value pairs $(k_j, v_j)$, the scalar score is $s_{ij} = q_i^\top k_j / \sqrt{d}$, the weight $\alpha_{ij} = \mathrm{Softmax}_j(s_{ij})$ satisfies $\sum_j \alpha_{ij} = 1$, and the output is $o_i = \sum_j \alpha_{ij} v_j$. In the SuperGlue graph network each layer applies this as a residual update,

$$x_i^{(\ell+1)} = x_i^{(\ell)} + \mathrm{MLP}\!\left(x_i^{(\ell)} \,\big\|\, m_{\mathcal{E}\to i}\right), \qquad m_{\mathcal{E}\to i} = \sum_{j:(i,j)\in\mathcal{E}} \alpha_{ij}\, v_j,$$

with $(q_i, k_j, v_j)$ linear projections of $x_i^{(\ell)}$ using independent parameters per layer.

## Multi-head attention

Multi-head attention applies $h$ independent attention operations in parallel and concatenates them,

$$\mathrm{MultiHead}(Q, K, V) = \mathrm{Concat}(\mathrm{head}_1, \ldots, \mathrm{head}_h)\,W^O,$$

each $\mathrm{head}_r = \mathrm{Attention}(QW_r^Q, KW_r^K, VW_r^V)$ using separate learned projections. SuperGlue, LightGlue, and LoFTR all use $h = 4$ heads with hidden dimension $d = 256$; each head learns a distinct compatibility function and the concatenated output is projected back to dimension $d$.

## Self-attention and cross-attention

The two attention modes differ in the source of queries, keys, and values. In **self-attention** all three derive from the same set, so each element aggregates context from the other elements of its own set. In **cross-attention** queries come from one set and keys and values from a second, so each element aggregates information from the other set. The matching networks alternate the two: in SuperGlue's attentional graph network, self-attention layers let a keypoint reason about the configuration of all keypoints in its own image, and cross-attention layers let it search for candidate correspondences in the other image. Ablation on the ScanNet benchmark shows that removing cross-attention degrades pose-estimation AUC@20° from 51.84% to 42.57%, and removing positional encoding drops it to 47.12% — both context types are essential.

## Positional encoding

Attention weights depend only on query and key content, so without positional information the mechanism is permutation-invariant. LoFTR adds a 2-D sinusoidal absolute encoding to its backbone feature maps once, before the attention stack, allowing the transformer to distinguish positions on the $1/8$-resolution grid even in textureless regions. LightGlue instead injects relative geometry at every self-attention layer via a rotary encoding,

$$a_{ij} = q_i^\top\, \mathbf{R}(p_j - p_i)\, k_j,$$

where $\mathbf{R}(\cdot)$ is block-diagonal with $2 \times 2$ planar rotation blocks of angle $\theta = b_k^\top(p_j - p_i)$ for a learned basis $b_k$. Keypoint positions must be normalised to $[0,1]^2$; raw pixel coordinates break the encoding.

## Quadratic cost and the linear approximation

Full attention forms a dense $n \times m$ score matrix, costing $O(nm)$ time and memory — $O(N^2)$ for LoFTR's dense feature maps where $n = m = N$. LoFTR applies a linear-attention approximation: replacing softmax with a non-negative kernel feature map $\phi(\cdot) = \mathrm{elu}(\cdot) + 1$ and exploiting associativity,

$$\mathrm{Attention}_\phi(Q, K, V)_i = \frac{\phi(q_i)^\top \sum_j \phi(k_j)\, v_j^\top}{\phi(q_i)^\top \sum_j \phi(k_j)},$$

reduces the cost to $O(N)$ by computing the key-value aggregate once. The ELU+1 kernel keeps the weights non-negative — required for the factorisation to preserve normalisation — at the cost of a smoother, less peaked attention distribution than softmax.

# Numerical Concerns

**The $1/\sqrt{d}$ scaling.** Without it, the dot product $q_i^\top k_j$ has variance proportional to $d$ for unit-variance inputs; large magnitudes push the softmax into saturation where gradients vanish. Dividing by $\sqrt{d}$ restores unit variance of the pre-softmax scores. With $d = 256$ the denominator is $16$.

**Softmax stability.** Naive exponentiation overflows in float32 once scores exceed roughly $88$. The stable form subtracts the per-row maximum before exponentiating. SuperGlue's downstream Sinkhorn assignment runs entirely in the log domain to prevent overflow in its augmented score matrix, which is not $\sqrt{d}$-scaled.

**Quadratic memory.** At $2048$ keypoints per image the cross-attention score matrix holds millions of float32 values per head; with 4 heads and both directions it reaches hundreds of megabytes. LightGlue prunes points classified as unmatchable after each layer, progressively shrinking the effective set size.

**Linear-attention trade-off.** The ELU+1 kernel produces smoother weights than softmax — attention collapse onto a single element is less likely, but so is strong selective attention to one dominant match, which slightly raises ambiguity in highly discriminative regions.

**Low-precision inference.** FP16 inference is standard; LightGlue's rotary rotation entries are trigonometric and well-conditioned because positions are normalised to $[0,1]^2$. SuperGlue's matching descriptors are deliberately not $L_2$-normalised — their magnitude encodes confidence — so scores are unbounded and 16-bit log-sum-exp precision in the Sinkhorn step matters.

# Where it appears

Three registered models use the attention mechanism, each in a distinct way:

- [superglue](/atlas/superglue) — an attentional graph network alternating $L = 9$ self- and cross-attention layers; self-attention builds intra-image keypoint context, cross-attention discovers candidate matches. The attention layers are the context-enrichment stage feeding a Sinkhorn optimal-transport assignment.
- [lightglue](/atlas/lightglue) — extends the SuperGlue framework with rotary positional encoding and a per-layer confidence head that drives adaptive early exit; easy image pairs exit after an average of 4.7 of 9 layers, hard pairs run all 9, and token pruning reduces the quadratic cost at each layer.
- [loftr](/atlas/loftr) — applies linear attention in interleaved self- and cross-attention layers over dense coarse feature maps at $1/8$ resolution, attending over all spatial positions so that matches emerge in low-texture regions where no detector fires.

The transformer architecture underlying all three originates outside computer vision, in sequence modelling for natural language processing; the matching networks adapt it to sets of local image features by pairing self-attention for intra-set context with cross-attention for inter-set correspondence search.

# References

1. A. Vaswani, N. Shazeer, N. Parmar, J. Uszkoreit, L. Jones, A. N. Gomez, Ł. Kaiser, I. Polosukhin. *Attention Is All You Need.* NeurIPS, 2017.
2. P.-E. Sarlin, D. DeTone, T. Malisiewicz, A. Rabinovich. *SuperGlue: Learning Feature Matching with Graph Neural Networks.* IEEE CVPR, 2020.
3. P. Lindenberger, P.-E. Sarlin, M. Pollefeys. *LightGlue: Local Feature Matching at Light Speed.* IEEE ICCV, 2023.
4. J. Sun, Z. Shen, Y. Wang, H. Bao, X. Zhou. *LoFTR: Detector-Free Local Feature Matching with Transformers.* IEEE CVPR, 2021.
5. J. Su, Y. Lu, S. Pan, A. Murtadha, B. Wen, Y. Liu. *RoFormer: Enhanced Transformer with Rotary Position Embedding.* arXiv 2104.09864, 2021.
