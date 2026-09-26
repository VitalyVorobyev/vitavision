---
paper_id: vaswani2017-attention
title: "Attention Is All You Need"
authors: ["A. Vaswani", "N. Shazeer", "N. Parmar", "J. Uszkoreit", "L. Jones", "A. N. Gomez", "Ł. Kaiser", "I. Polosukhin"]
year: 2017
url: https://arxiv.org/pdf/1706.03762
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, vit]
---

# Setting

**Problem class.** Sequence transduction (the paper's own framing, §1) — mapping an input
sequence of symbols to an output sequence of symbols, evaluated here on machine translation
(WMT 2014 EN-DE, WMT 2014 EN-FR) and, briefly, English constituency parsing. The paper's stated
goal is to replace the recurrent or convolutional encoder-decoder backbone used by the prior
state of the art with an architecture built **entirely** out of attention, removing the sequential
per-position recurrence that blocks within-example parallelization (§1, §2).

**Inputs.** A source token sequence $(x_1, \dots, x_n)$, embedded to $d_{model}$-dimensional
vectors and summed with a positional encoding (§3.4, §3.5). No assumption on token identity beyond
a fixed vocabulary (byte-pair / word-piece encoded, §5.1).

**Outputs.** A target token sequence $(y_1, \dots, y_m)$ generated autoregressively one symbol at
a time, each step conditioned on the encoder's representations and previously generated output
symbols (§3, first paragraph).

**Guarantees.** None in a formal sense — this is an empirical architecture paper. The claimed
result set (Abstract, §6.1): 28.4 BLEU on WMT14 EN-DE (base + big models combined result reported
as the headline), 41.0/41.8 BLEU on WMT14 EN-FR (single-model / big-model), at a fraction of the
training cost (FLOPs) of the prior state of the art (Table 2), with training completed in 12 hours
(base) or 3.5 days (big) on 8 NVIDIA P100 GPUs (§5.2).

# Core idea

Replace every recurrent or convolutional layer in the encoder-decoder stack with attention. An
attention function maps a query and a set of key-value pairs to a weighted sum of the values,
where each value's weight is a compatibility score between the query and its corresponding key
(§3.2, opening paragraph). The paper's specific instantiation, **scaled dot-product attention**
(Eq. 1), computes compatibility as a scaled dot product between packed query/key matrices, passed
through softmax to produce the value weights. Doing this once per position averages away
information from different representation subspaces, so the paper runs $h=8$ independent,
differently-projected copies in parallel (**multi-head attention**, §3.2.2) and concatenates the
results. The encoder is a stack of $N=6$ identical layers alternating self-attention and a
position-wise feed-forward network, each wrapped in a residual connection followed by layer
normalization (post-LN, §3.1). The decoder mirrors this but adds a third, encoder-attending
sub-layer and masks its self-attention so position $i$ cannot see positions $>i$, preserving the
autoregressive property (§3.1). Since attention itself is permutation-invariant, sequence order is
injected explicitly via sinusoidal **positional encodings** added to the input embeddings (§3.5).
The architecture's principal argument for replacing recurrence (§4, Table 1) is that self-attention
connects any two positions with $O(1)$ sequential operations and $O(1)$ maximum path length,
against $O(n)$ for recurrent layers — shorter signal paths make long-range dependencies easier to
learn.

# Assumptions

1. (hard) The sequence length $n$ that occurs in practice is smaller than the representation
   dimensionality $d$ — self-attention is only cheaper than a recurrent layer per Table 1's
   complexity comparison when $n < d$; the paper states this is "most often the case with sentence
   representations used by state-of-the-art models" using word-piece/byte-pair tokenization (§4).
2. (hard) Full $O(n^2)$ pairwise attention is computed — no restriction to a local neighborhood.
   The paper notes a restricted-attention variant (neighborhood size $r$) as future work to handle
   "very long sequences" (§4, Table 1 row "Self-Attention (restricted)"), not something evaluated
   in this paper.
3. (soft) Residual connections require every sub-layer, including the embedding layers, to
   produce outputs of the same dimension $d_{model}=512$ "to facilitate these residual
   connections" (§3.1).
4. (soft) Multi-head projections use equal per-head dimensions $d_k = d_v = d_{model}/h$; this
   keeps the total computational cost "similar to that of single-head attention with full
   dimensionality" (§3.2.2) despite splitting into $h$ heads — an implicit assumption that $d_{model}$
   divides evenly by $h$.
5. (soft) Decoder masking assumes teacher-forced training with output embeddings offset by one
   position; combined with the causal mask this "ensures that the predictions for position $i$ can
   depend only on the known outputs at positions less than $i$" (§3.1).
6. (hard) Sinusoidal positional encoding assumes relative-position linearity is sufficient
   structure for the model to exploit — the paper's stated hypothesis is that "it would allow the
   model to easily learn to attend by relative positions, since for any fixed offset $k$,
   $PE_{pos+k}$ can be represented as a linear function of $PE_{pos}$" (§3.5).

# Failure regime

- **Unscaled dot-product attention degrades for large $d_k$.** The paper's own diagnosis (§3.2.1,
  footnote 4): for query/key components modeled as independent, zero-mean, unit-variance random
  variables, the dot product $q \cdot k = \sum_{i=1}^{d_k} q_i k_i$ has mean $0$ and **variance
  $d_k$** — so as $d_k$ grows, dot products grow large in magnitude and "push the softmax function
  into regions where it has extremely small gradients," stalling learning. This is the explicit
  motivation for the $1/\sqrt{d_k}$ scale factor in Eq. 1.
- **Single-head attention loses resolution via averaging.** Reducing all pairwise interactions to
  one attention map is "reduced to a constant number of operations, albeit at the cost of reduced
  effective resolution due to averaging attention-weighted positions" (§2) — multi-head attention
  is presented explicitly as the counter-measure (§2, §3.2.2: "With a single attention head,
  averaging inhibits this").
- **$O(n^2)$ cost on very long sequences.** Table 1: self-attention's per-layer complexity is
  $O(n^2 \cdot d)$, which the paper flags as the reason to consider a restricted-neighborhood
  variant (increasing maximum path length to $O(n/r)$) for long-sequence tasks — left as future
  work (§4), not solved in this paper.
- **Convolutional path-length degradation on long sequences at fixed kernel width.** Cited as
  motivation, not a Transformer failure mode: a single convolutional layer of width $k<n$ does not
  connect all position pairs, requiring $O(n/k)$ stacked layers (contiguous kernels) or
  $O(\log_k(n))$ (dilated) to do so (§4) — this is why the paper frames self-attention as
  preferable for path length, by contrast.

# Numerical sensitivity

- **Scale factor is load-bearing, not cosmetic.** The $1/\sqrt{d_k}$ term in Eq. 1 exists
  specifically to counteract the $O(d_k)$ variance growth of the raw dot product (§3.2.1,
  footnote 4) — omitting it or using the wrong $d_k$ in the denominator directly reintroduces the
  vanishing-softmax-gradient failure mode above.
- **Base config commits to specific numbers.** $d_{model}=512$, $h=8$ heads, $d_k=d_v=64$
  ($=d_{model}/h$), $d_{ff}=2048$, $N=6$ layers each for encoder and decoder (§3.1, §3.2.2, §3.3,
  Table 3 base row). These are treated as fixed hyperparameters throughout the main text, not
  derived from a general rule beyond $d_k=d_v=d_{model}/h$.
- **Decoder masking is implemented as additive $-\infty$ inside the softmax input**, not as a
  post-hoc zeroing of attention weights: "we implement this inside of scaled dot-product attention
  by masking out (setting to $-\infty$) all values in the input of the softmax which correspond to
  illegal connections" (§3.2.3) — the mask must be applied **before** the softmax, not after.
- **Embedding scale coupling.** The embedding weight matrix is shared between the two embedding
  layers and the pre-softmax linear transformation; in the embedding layers those shared weights
  are additionally multiplied by $\sqrt{d_{model}}$ (§3.4) — a scale factor that must match the
  unscaled magnitude of the positional encoding (which is $O(1)$ per sinusoid) for the sum to be
  well-conditioned.
- **Positional encoding wavelengths span a fixed geometric progression** from $2\pi$ to
  $10000 \cdot 2\pi$ across the $d_{model}$ dimensions (§3.5) — changing $d_{model}$ changes this
  spectrum, and the paper notes sinusoidal (vs. learned) encoding is chosen partly because it "may
  allow the model to extrapolate to sequence lengths longer than the ones encountered during
  training" (§3.5), an extrapolation property that only holds for the closed-form sinusoid, not a
  learned embedding table.
- **Adam optimizer with a non-default epsilon** — $\beta_1=0.9$, $\beta_2=0.98$, $\epsilon=10^{-9}$
  (§5.3) — paired with a warmup + inverse-square-root decay schedule (Eq. 3):
  $lrate = d_{model}^{-0.5} \cdot \min(step\_num^{-0.5},\ step\_num \cdot warmup\_steps^{-1.5})$,
  with $warmup\_steps=4000$. The schedule increases learning rate linearly for the first
  `warmup_steps` steps, then decays proportionally to the inverse square root of the step number
  (§5.3) — training is sensitive to getting the warmup phase right given the from-scratch
  (no pretrained init) transformer stack.
- **Regularization is dual: dropout + label smoothing.** Residual dropout $P_{drop}=0.1$ applied
  to each sub-layer's output before the residual add, and to the embedding+positional-encoding sum
  (§5.4); label smoothing $\epsilon_{ls}=0.1$ (§5.4) — the paper notes label smoothing "hurts
  perplexity, as the model learns to be more unsure, but improves accuracy and BLEU score," i.e. a
  deliberate calibration/accuracy trade-off, not a free win.

# Applicability

- Use when: modeling long-range dependencies in a sequence where sequential recurrence is a
  parallelization bottleneck, and $n < d$ so the $O(n^2 d)$ self-attention cost is favorable versus
  $O(n d^2)$ recurrence (Table 1, §4).
- Use when: an architecture needs a constant (not linear) path length between any two sequence
  positions, e.g. tasks with known long-range dependencies (§4's stated third desideratum).
- Don't use when: sequence length $n$ is very large relative to $d$ and quadratic attention cost
  dominates — the paper's own fallback is a restricted-neighborhood variant, explicitly left as
  future work, not evaluated here (§4).
- Compared against: RNN/LSTM/GRU encoder-decoders (§1, §2), ByteNet and ConvS2S (convolutional
  sequence models, §2), and the additive-attention formulation of Bahdanau et al. (compatibility
  function is a feed-forward network with one hidden layer) versus this paper's dot-product
  formulation, which is faster and more space-efficient in practice due to optimized matrix
  multiplication, but requires the $1/\sqrt{d_k}$ scaling to match additive attention's behavior at
  large $d_k$ (§3.2.1).

# Connections

- Builds on: prior encoder-decoder sequence-transduction architectures and attention mechanisms
  cited in §1/§2 (RNN encoder-decoders, additive attention) — none of these are yet ingested as
  Atlas paper IDs in this note's pass.
- Enables: `vit` (Vision Transformer applies this architecture's encoder to image patches) and any
  future Atlas page for the Transformer architecture itself, self-attention–based encoders/decoders,
  and sinusoidal positional encoding as a standalone concept.
- Refutes / supersedes: recurrent and convolutional sequence-transduction backbones as the default
  choice for machine translation quality-per-training-cost, per the paper's own headline comparison
  (Table 2) — not a formal refutation, an empirical displacement.

# Atlas update plan

## UPDATE: attention-mechanism

Rewrite the page with this paper as `sources.primary`. Target content:

- **Definition**: attention as a differentiable soft lookup over key-value pairs indexed by query
  similarity — "mapping a query and a set of key-value pairs to an output... computed as a weighted
  sum of the values, where the weight assigned to each value is computed by a compatibility function
  of the query with the corresponding key" (§3.2). Ground the formal definition in scaled
  dot-product attention, Eq. 1: $\mathrm{Attention}(Q,K,V) = \mathrm{softmax}(QK^T/\sqrt{d_k})V$.
- **Scaling derivation**: reproduce the variance argument from footnote 4 verbatim in substance —
  for independent zero-mean unit-variance $q_i, k_i$, $q \cdot k$ has variance $d_k$, so raw dot
  products grow with $d_k$ and push softmax into small-gradient regions; $1/\sqrt{d_k}$ counteracts
  this. This is the single most load-bearing numerical fact for the page.
- **Multi-head attention**: Eq. (MultiHead$(Q,K,V) = \mathrm{Concat}(\mathrm{head}_1,...,\mathrm{head}_h)W^O$,
  $\mathrm{head}_i = \mathrm{Attention}(QW_i^Q, KW_i^K, VW_i^V)$), with per-head projection shapes
  $W_i^Q, W_i^K \in \mathbb{R}^{d_{model}\times d_k}$, $W_i^V \in \mathbb{R}^{d_{model}\times d_v}$,
  $W^O \in \mathbb{R}^{h d_v \times d_{model}}$ (§3.2.2). State the base config as a worked example:
  $d_{model}=512$, $h=8$, $d_k=d_v=64$. Explain the "why split heads" motivation: single-head
  attention averages away distinct representation subspaces; splitting lets each head attend
  differently while keeping total compute comparable to single-head full-dimensionality attention.
- **Transformer-block context**: attention as one sub-layer inside a residual + LayerNorm block
  (`LayerNorm(x + Sublayer(x))`, §3.1), and the three distinct roles attention plays in the
  original architecture (§3.2.3): encoder-decoder attention (queries from decoder, keys/values from
  encoder output), encoder self-attention (all three from the previous encoder layer), and masked
  decoder self-attention (causal mask via additive $-\infty$ before softmax).
- **Origin framing**: this paper is the origin of the pure-attention architecture — no recurrence,
  no convolution (Abstract, §1) — position the page's historical framing around that claim
  specifically, not just "introduced attention" (attention mechanisms predate this paper per §1/§2;
  the paper's novelty is dispensing with recurrence/convolution entirely).

Relations: none — foundational concept-page source; typed relations to be decided at page-authoring time (approved plan).

## NEW: transformer

Concept-page candidate. Type: concept. Primary source: this paper.

- **Definition**: the full encoder-decoder architecture built from stacked self-attention +
  position-wise feed-forward sub-layers, with no recurrence or convolution (§3, Figure 1).
- **Encoder/decoder stacks**: $N=6$ identical layers each (§3.1). Encoder layer = self-attention
  sub-layer + FFN sub-layer, each with residual + post-LN. Decoder layer adds a third
  encoder-attending sub-layer between the two, and its self-attention sub-layer is causally masked.
  Note the exact wording: "prevent positions from attending to subsequent positions... combined
  with the fact that the output embeddings are offset by one position" (§3.1).
- **Position-wise feed-forward network**: Eq. 2, $FFN(x) = \max(0, xW_1+b_1)W_2+b_2$ — two linear
  layers with ReLU between, applied identically and independently per position ("two convolutions
  with kernel size 1"), $d_{model}=512 \to d_{ff}=2048 \to d_{model}=512$ (§3.3).
- **Residual + LayerNorm placement**: post-LN in the original — `LayerNorm(x + Sublayer(x))`, i.e.
  normalization applied *after* the residual add, not before (§3.1). Flag for the page that this is
  the "post-LN" convention specifically, since later architectures moved to pre-LN — worth a
  forward-looking note if/when a pre-LN source is ingested.
- **Embedding/softmax weight tying**: shared weight matrix between the two embedding layers and the
  pre-softmax linear transformation, with embedding-layer weights scaled by $\sqrt{d_{model}}$
  (§3.4).
- **Complexity argument (Table 1, page 5, between §3.4 and §3.5)**: per-layer complexity,
  sequential-operations count, and maximum path length for self-attention vs. recurrent vs.
  convolutional vs. restricted self-attention layer types —

  | Layer type | Complexity/layer | Sequential ops | Max path length |
  |---|---|---|---|
  | Self-attention | $O(n^2 \cdot d)$ | $O(1)$ | $O(1)$ |
  | Recurrent | $O(n \cdot d^2)$ | $O(n)$ | $O(n)$ |
  | Convolutional | $O(k \cdot n \cdot d^2)$ | $O(1)$ | $O(\log_k(n))$ |
  | Self-attention (restricted) | $O(r \cdot n \cdot d)$ | $O(1)$ | $O(n/r)$ |

  where $n$=sequence length, $d$=representation dimension, $k$=conv kernel size, $r$=restricted
  self-attention neighborhood size (§4). The three desiderata motivating the comparison: total
  per-layer compute, parallelizable compute (min sequential ops), and path length between
  long-range dependencies (§4).
- **Training regime worth recording**: Adam, $\beta_1=0.9$, $\beta_2=0.98$, $\epsilon=10^{-9}$
  (§5.3); warmup+inverse-sqrt-decay schedule, Eq. 3, `warmup_steps=4000`; residual dropout
  $P_{drop}=0.1$ applied to each sub-layer output pre-residual-add and to the embedding+PE sum;
  label smoothing $\epsilon_{ls}=0.1$ (§5.4, trades perplexity for BLEU/accuracy). Trained on 8
  NVIDIA P100 GPUs, base model 100,000 steps / ~12h, big model 300,000 steps / ~3.5 days (§5.2).
- **Headline results (Table 2, page 7)**: Transformer (base) 27.3 BLEU EN-DE / 38.1 BLEU EN-FR at
  $3.3\times10^{18}$ training FLOPs; Transformer (big) 28.4 BLEU EN-DE / 41.8 BLEU EN-FR at
  $2.3\times10^{19}$ FLOPs — both surpassing prior best single models and ensembles (GNMT+RL,
  ConvS2S, MoE) at markedly lower training cost.

Relations: none — foundational concept-page source; typed relations to be decided at page-authoring time (approved plan).

## NEW: positional-encoding

Concept-page candidate (could also be folded into `transformer` as a subsection — decide at
authoring time based on whether it reaches the ≥500-word independent-content bar). Type: concept.
Primary source: this paper, §3.5.

- **Problem statement**: attention has no inherent notion of sequence order (it is a set operation
  over key-value pairs), so "we must inject some information about the relative or absolute
  position of the tokens in the sequence" (§3.5) — encodings are **added** to input embeddings at
  the bottom of both encoder and decoder stacks, requiring $\dim(PE) = d_{model}$ so the sum is
  well-formed.
- **Formula**: sine/cosine pair per dimension index $i$ —
  $PE_{(pos,2i)} = \sin(pos/10000^{2i/d_{model}})$, $PE_{(pos,2i+1)} = \cos(pos/10000^{2i/d_{model}})$
  (§3.5, unnumbered display equations). $pos$ = position index, $i$ = dimension pair index.
  Wavelengths form a geometric progression from $2\pi$ to $10000 \cdot 2\pi$ across the dimensions.
- **Stated reason for sinusoids over learned embeddings**: two-part justification (§3.5) — (1)
  relative-position linearity: "for any fixed offset $k$, $PE_{pos+k}$ can be represented as a
  linear function of $PE_{pos}$," hypothesized to ease learning attention-by-relative-position; (2)
  extrapolation: sinusoidal PE "may allow the model to extrapolate to sequence lengths longer than
  the ones encountered during training," which a learned embedding table cannot do past its trained
  range. The paper explicitly tested learned positional embeddings too and found "the two versions
  produced nearly identical results" on the evaluated task (Table 3 row (E), referenced in §3.5) —
  i.e. the choice was made on the extrapolation argument, not on measured quality difference at the
  tested sequence lengths.

Relations: none — foundational concept-page source; typed relations to be decided at page-authoring time (approved plan).

# Provenance

- Paper cache: `docs/papers/.cache/vaswani2017-attention.html` (ar5iv, LaTeX preserved) and
  `docs/papers/.cache/vaswani2017-attention.txt` (search-and-narrow copy, 800 lines). arXiv:1706.03762v7,
  NeurIPS (NIPS) 2017.
- Abstract (txt lines 26-42): headline claims — 28.4 BLEU WMT14 EN-DE (>2 BLEU over prior best
  including ensembles), 41.8 BLEU WMT14 EN-FR single-model SOTA, 3.5 days on 8 GPUs.
- §1 Introduction (txt lines 61-83): motivation — sequential computation in RNNs precludes
  within-example parallelization; Transformer relies "entirely on an attention mechanism."
- §2 Background (txt lines 86-108): comparison to ByteNet/ConvS2S (convolutional, distance-growing
  operation count — linear for ConvS2S, logarithmic for ByteNet); claim that the Transformer is "to
  the best of our knowledge... the first transduction model relying entirely on self-attention."
- §3.1 Encoder and Decoder Stacks (txt lines 127-143): $N=6$ layers each; two encoder sub-layers
  (self-attention, FFN), three decoder sub-layers (add encoder-decoder attention); residual +
  post-LN, `LayerNorm(x + Sublayer(x))`; $d_{model}=512$; causal masking + one-position output
  offset for autoregression.
- §3.2 Attention (txt lines 145-162): general attention definition — query/key-value mapping,
  weighted sum of values by compatibility function.
- §3.2.1 Scaled Dot-Product Attention (txt lines 164-188): Eq. 1
  $\mathrm{Attention}(Q,K,V)=\mathrm{softmax}(QK^T/\sqrt{d_k})V$; comparison to additive attention
  (Bahdanau-style, feed-forward compatibility function); footnote 4 (txt lines 197-201) — the
  variance-$d_k$ derivation for why unscaled dot products grow large and stall softmax gradients.
- §3.2.2 Multi-Head Attention (txt lines 192-220): MultiHead equation and per-head projection
  matrices; base config $h=8$, $d_k=d_v=d_{model}/h=64$; "total computational cost is similar to
  that of single-head attention with full dimensionality."
- §3.2.3 Applications of Attention in our Model (txt lines 222-238): the three uses —
  encoder-decoder attention, encoder self-attention, masked decoder self-attention (additive
  $-\infty$ masking inside softmax input).
- §3.3 Position-wise Feed-Forward Networks (txt lines 240-251): Eq. 2 $FFN(x)=\max(0,xW_1+b_1)W_2+b_2$;
  $d_{model}=512$, $d_{ff}=2048$.
- §3.4 Embeddings and Softmax (txt lines 253-259): shared embedding/pre-softmax weight matrix;
  $\sqrt{d_{model}}$ scaling of embedding weights.
- Table 1 (txt lines 263-273, page 5, positioned between §3.4 and §3.5): complexity/sequential-ops/
  max-path-length comparison, values transcribed verbatim above.
- §3.5 Positional Encoding (txt lines 276-298): sinusoidal formulas (unnumbered display equations);
  reasons for choosing sinusoidal over learned — relative-position linearity hypothesis and
  extrapolation-to-longer-sequences argument; reference to Table 3 row (E) for the learned-vs-fixed
  near-identical-results comparison.
- §4 Why Self-Attention (txt lines 300-338): three desiderata (per-layer complexity, parallelizable
  compute, path length); $n<d$ condition for self-attention being cheaper than recurrent per layer;
  restricted self-attention ($O(n/r)$ max path) noted as future work, not evaluated in this paper.
- §5.1 Training Data and Batching (txt lines 345-353): WMT14 EN-DE (~4.5M sentence pairs, BPE,
  ~37k shared vocab); WMT14 EN-FR (36M sentences, 32k word-piece vocab); ~25,000 source + ~25,000
  target tokens per batch.
- §5.2 Hardware and Schedule (txt lines 355-361): 8 NVIDIA P100 GPUs; base model 100,000 steps /
  ~12h (0.4s/step); big model 300,000 steps / 3.5 days (1.0s/step).
- §5.3 Optimizer (txt lines 363-376): Adam, $\beta_1=0.9$, $\beta_2=0.98$, $\epsilon=10^{-9}$; Eq. 3
  learning-rate schedule; `warmup_steps=4000`.
- §5.4 Regularization (txt lines 378-410): residual dropout $P_{drop}=0.1$ (base model) applied to
  sub-layer outputs pre-residual-add and to embedding+PE sums; label smoothing $\epsilon_{ls}=0.1$,
  explicit trade-off statement (hurts perplexity, helps BLEU/accuracy).
- Table 2 (txt lines 384-401, page 7): BLEU + training-cost (FLOPs) comparison across ByteNet,
  Deep-Att+PosUnk, GNMT+RL(+Ensemble), ConvS2S(+Ensemble), MoE, and Transformer base/big. Values
  transcribed verbatim above.
- §6.1 Machine Translation (txt lines 415-435): base-model beam search config — beam size 4, length
  penalty $\alpha=0.6$, max output length = input length + 50 with early termination; checkpoint
  averaging (5 for base, 20 for big); EN-FR big model used $P_{drop}=0.3$ instead of 0.1.
- §6.2 Model Variations / Table 3 (txt lines 437-448+): ablation table referenced for the learned-PE
  comparison (row E) cited in §3.5; not otherwise extracted in this pass — a further ingestion pass
  could pull individual ablation rows (head count, $d_k$/$d_v$ variation) if the transformer concept
  page needs an ablation-evidence section.
