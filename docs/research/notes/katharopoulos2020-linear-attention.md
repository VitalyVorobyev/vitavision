---
paper_id: katharopoulos2020-linear-attention
title: "Transformers are RNNs: Fast Autoregressive Transformers with Linear Attention"
authors: [A. Katharopoulos, A. Vyas, N. Pappas, F. Fleuret]
year: 2020
url: https://arxiv.org/pdf/2006.16236
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, loftr]
---

# Setting

Problem class: self-attention in transformer architectures scales O(N²) in
time and memory with sequence length N, because the full N×N attention
matrix (queries against keys) must be materialized to compute the
softmax-weighted average of values. This makes transformers slow to train on
long sequences and — a separate, sharper pain point — slow at autoregressive
*inference*, where generating token i+1 re-attends over all i previous
positions, giving per-step cost that grows with position and no
parallelism across steps.

Input: a sequence of feature vectors x ∈ ℝ^(N×F); the paper works within the
standard transformer layer decomposition (multi-head self-attention + a
position-wise feedforward block). Output: the paper doesn't change what a
transformer layer computes in principle — it changes the algebraic form used
to compute the same generalized-attention quantity, trading exactness of a
specific similarity function (exponential dot-product / softmax) for a
factorizable one (a positive-definite kernel with an explicit finite feature
map), which is what buys linear-time, and — for causal/autoregressive
models — constant-memory-per-step, computation.

# Core idea

Attention is a weighted average of value vectors V_j, weighted by a
similarity score sim(Q_i, K_j) between query i and key j, normalized over j
(Eq. 3, generalizing standard softmax attention Eq. 2, which is the special
case sim(q,k) = exp(qᵀk/√D)). If sim is chosen as a kernel with an explicit
feature map φ — i.e. sim(q,k) = φ(q)ᵀφ(k) rather than an inseparable function
of q and k jointly — then the numerator and denominator of Eq. 3 become sums
that can be re-associated: Σ_j φ(Q_i)ᵀφ(K_j) V_j = φ(Q_i)ᵀ Σ_j φ(K_j) V_jᵀ
(Eqs. 4–6). The inner sums Σ_j φ(K_j)V_jᵀ and Σ_j φ(K_j) do not depend on the
query index i, so they are computed **once** (each an O(N) pass) and reused
for every query, collapsing the attention computation from O(N²) to O(N) in
sequence length (§3.2, discussion after Eq. 6). The paper adopts a specific
finite, positive feature map φ(x) = elu(x) + 1 (Eq. 7) rather than the
(infeasible, infinite-dimensional) feature map implicit in the exponential
kernel. For causal (autoregressive) masking, the same kernel trick turns the
running numerator/denominator into cumulative-sum states S_i, Z_i (Eqs.
10–12), which are exactly the hidden state and normalizer of a recurrent
network — hence "transformers are RNNs" (§3.4, Eqs. 16–20): a causally-masked
linear-attention transformer layer can be run autoregressively by carrying
forward a fixed-size state and updating it in O(1) per step, instead of
recomputing attention over the whole growing prefix.

# Assumptions

1. The similarity function sim(·,·) used in place of softmax must be
   non-negative for Eq. 3 to remain a valid (non-negative, normalizable)
   attention weighting — this holds for any kernel k(x,y): ℝ^(2×F) → ℝ₊
   (§3.2, discussion after Eq. 3).
2. The chosen feature map φ must be *finite*-dimensional and explicit for the
   O(N) reformulation to be computable at all — the exact softmax/exponential
   kernel's implicit feature map is infinite-dimensional, so it cannot be
   linearized exactly this way (§3.2.1, "the feature function that
   corresponds to the exponential kernel is infinite dimensional, which
   makes the linearization of exact softmax attention infeasible").
3. elu(x)+1 is a design choice, not a derived optimum: the paper picks it
   over relu(x) specifically to avoid zero gradients when x < 0 (§3.2.1,
   paragraph after Eq. 7); this is an engineering justification, not a proof
   that elu+1 best approximates softmax attention (soft assumption —
   approximation quality is empirical, see Failure regime).
4. For the causal/RNN-equivalence result (§3.4), the transformer layer must
   use causal masking (position i attends only to j ≤ i, Eq. 8) — the
   non-causal (bidirectional) case is linear-time too (§3.2) but does not by
   itself give the RNN/recurrent-state reformulation used for fast
   autoregressive *inference*; that specifically requires the causal
   cumulative-sum states S_i, Z_i.
5. Naive autograd through Eq. 12 would store every intermediate S_i, inflating
   memory by max(D,M)× (§3.3.1); the paper's claimed linear-time,
   constant-memory training/inference requires their custom cumulative-sum
   gradient derivation (Eqs. 13–15, Algorithm 1), implemented in ~200 lines
   of custom CUDA (§4, "Experimental setup" paragraph) — this is not free
   from standard autodiff.

# Failure regime

- The paper reports linear attention as matching softmax attention's final
  loss/perplexity on their tested tasks (copy task, MNIST, CIFAR-10 image
  generation, WSJ speech recognition) but does not claim general equivalence
  of representational power; it explicitly flags approximation quality as an
  open question, proposing "approximating the RBF kernel with random Fourier
  features could allow us to use models pretrained with softmax attention"
  as future work (§5, Conclusions) — implying the elu+1 kernel does *not*
  reproduce the RBF/exponential kernel's behavior closely enough to be a
  drop-in numerical substitute for a *pretrained* softmax model.
- On the WSJ speech-recognition task, softmax attention achieves strictly
  lower (better) phoneme error rate than linear attention (5.12 vs 8.08 PER,
  Table 3) — the one experiment in the paper where linear attention does not
  match softmax quality, despite being faster (824s/epoch vs 2711s/epoch).
  The paper attributes the overall win to more epochs completed per wall-clock
  budget, not to matching quality at fixed epoch count (§4.3).
- Reformer (LSH attention) is reported to converge less smoothly than linear
  attention due to "noise introduced by hashing" (§4.1.1) — a comparison
  point, not a limitation of this paper's own method, included here because
  it's the source of the qualitative "linear converges more stably" claim.

# Numerical sensitivity

- No explicit precision (fp16/fp32) discussion in the source. The elu+1
  feature map guarantees φ(x) > 0 for all real x (elu(x) ∈ (−1, ∞), so
  elu(x)+1 ∈ (0, ∞)), which keeps the denominator Σφ(K_j) strictly positive
  and avoids the numerator/denominator sign issues a signed similarity
  score could cause — this is implicit in the choice, not stated as a
  numerical-stability argument by the authors (inference, marked `?`).
- The gradient derivation (Eqs. 13–15, Appendix A) is exact (not an
  approximation) given the linear-attention forward formula; the linear-time,
  constant-memory property comes from computing forward and backward
  cumulative sums in opposite directions (forward 1→N, backward N→1),
  analogous to BPTT (Appendix A, paragraph after Eq. 27).

# Applicability

- Use when: sequence length N is large relative to the feature/key
  dimension D (paper notes the polynomial-kernel variant is favorable when
  N > D², §3.2.1) and/or when autoregressive inference speed dominates
  (image generation pixel-by-pixel, speech frame-by-frame).
- Don't use when: exact reproduction of a *pretrained* softmax-attention
  model's outputs is required — the paper does not claim its kernel
  approximates the exponential/softmax kernel closely enough for that
  (§5, future-work note on random Fourier features as a path toward this).
- Compared against: full softmax transformer (Vaswani et al. 2017), Reformer
  / LSH attention (Kitaev et al. 2020), bidirectional LSTM (speech task
  baseline only), and a hand-added "stateful-softmax" baseline (caches K,V
  during inference; still O(N²) per generated token, Appendix C.1).

# Connections

- Builds on: kernel view of attention from Tsai et al. 2019 ("Transformer
  dissection", cited as prior kernel-based formulation of attention, §2.2)
  — this paper differs by using the kernel view to *reduce complexity*
  rather than to *interpret* attention. Also cites Shen et al. 2020
  ("Efficient attention") as concurrent work on linearized attention for
  object detection (§2.3) — a peer, not an antecedent.
- Enables / adopted by: LoFTR (Sun et al. 2021, Atlas page `loftr`) uses
  exactly this feature map, φ(x) = elu(x) + 1, in its coarse-level
  Local Feature Transformer module to bring self-/cross-attention over
  flattened coarse feature maps from O(N²) to O(N). **The Atlas's `loftr`
  page currently presents `elu(x)+1` linear attention as if it were a LoFTR
  device; it is this paper's Eq. 7, adopted unchanged by LoFTR and not
  attributed there.**
- Refutes / supersedes: none identified. Reformer (Kitaev et al. 2020)
  achieves the same asymptotic complexity class (O(N log N), close to O(N))
  via a different mechanism (LSH bucketing) and is treated as a
  contemporary alternative, not superseded — the paper notes Reformer
  additionally constrains keys = queries, which linear attention does not
  require, making linear attention usable for decoding where Reformer is
  not (§2.1, last paragraph).

# Atlas update plan

## UPDATE: attention-mechanism
Section: efficiency lineage (kernelized / linear attention)
- Add a kernelized-attention subsection: generalized attention as a
  normalized weighted sum over similarity scores sim(Q_i, K_j) (Eq. 3),
  with standard softmax attention as the special case
  sim(q,k) = exp(qᵀk/√D) (Eq. 2).
- Explain the linearization: choosing sim as a kernel with an explicit
  finite feature map φ (sim(q,k) = φ(q)ᵀφ(k)) lets the attention sum be
  re-associated as φ(Q)(φ(K)ᵀV) instead of (QKᵀ)V, so the shared terms
  Σ_j φ(K_j)V_jᵀ and Σ_j φ(K_j) are computed once and reused per query,
  turning O(N²) attention into O(N) (Eqs. 4–6, §3.2).
- Name the specific feature map φ(x) = elu(x) + 1 (Eq. 7) and its stated
  justification — chosen over relu(x) to avoid zero gradients for negative
  inputs (§3.2.1) — and note the exponential/softmax kernel's own implicit
  feature map is infinite-dimensional, which is *why* softmax attention
  itself cannot be linearized exactly this way (§3.2.1).
- Note the causal/autoregressive extension: cumulative-sum states S_i, Z_i
  (Eqs. 10–11) reduce causally-masked linear attention to a recurrence with
  O(1) update per step (Eqs. 16–20, §3.3–3.4) — "transformers are RNNs" —
  enabling large reported autoregressive-inference speedups (up to ~4,462×
  throughput on CIFAR-10 pixel generation vs a full softmax transformer,
  Table 2; abstract states "up to 4000x faster").
- Credit this paper (Katharopoulos et al., ICML 2020) as the source of the
  elu+1 linear-attention formulation, and note LoFTR (`loftr`) as a
  downstream adopter that uses this exact feature map in its attention
  module.
Relations: none — concept-page source; no typed relations (approved plan).

## UPDATE: loftr
Section: Algorithm / attention-mechanism description (coarse LoFTR module)
- One-liner correction: the φ(·) = elu(·) + 1 linear-attention kernel used
  in LoFTR's coarse Local Feature Transformer module is not a LoFTR-original
  device — it is adopted unchanged from Katharopoulos et al., "Transformers
  are RNNs" (ICML 2020, Eq. 7). Credit the source paper in the relevant
  prose sentence(s) (currently around lines 34 and 66 of
  `content/models/loftr.md`, describing the elu(x)+1 kernel).
- Add `katharopoulos2020-linear-attention` to `sources.references` in
  `loftr.md`'s frontmatter (registering it first in `docs/papers/index.yaml`
  if not already present).
Relations: none — concept-page source; no typed relations (approved plan).

# Provenance

- Eq. 1 — transformer layer decomposition T_l(x) = f_l(A_l(x) + x): §3.1.
- Eq. 2 — softmax self-attention: Q=xW_Q, K=xW_K, V=xW_V,
  A_l(x) = softmax(QKᵀ/√D)V: §3.1.
- Eq. 3 — generalized attention V'_i = Σ_j sim(Q_i,K_j)V_j / Σ_j sim(Q_i,K_j),
  with the non-negativity constraint on sim: §3.2, and the equivalence
  sim(q,k) = exp(qᵀk/√D) recovering Eq. 2: §3.2, paragraph after Eq. 3.
- Eq. 4 — kernelized attention V'_i = Σ_j φ(Q_i)ᵀφ(K_j)V_j /
  Σ_j φ(Q_i)ᵀφ(K_j): §3.2.
- Eq. 5 — associativity-rearranged form
  V'_i = φ(Q_i)ᵀ(Σ_j φ(K_j)V_jᵀ) / φ(Q_i)ᵀ(Σ_j φ(K_j)): §3.2, immediately
  after Eq. 4, "further simplify it by making use of the associative
  property of matrix multiplication."
- Eq. 6 — vectorized form (φ(Q)(φ(K)ᵀV)) = φ(Q)(φ(K)ᵀV), φ applied rowwise
  to Q, K: §3.2.
- Complexity discussion — O(N²) time/memory for softmax attention vs O(N)
  for linear attention because Σφ(K_j)V_jᵀ and Σφ(K_j) are computed once and
  reused per query: §3.2, paragraph after Eq. 6.
- §3.2.1 "Feature Maps and Computational Cost" — softmax attention total
  cost O(N² max(D,M)); linear attention with feature dimensionality C costs
  O(NCM); exponential kernel's feature map is infinite-dimensional
  (linearization infeasible); polynomial-kernel-degree-2 variant costs
  O(ND²M), favorable when N > D².
- Eq. 7 — φ(x) = elu(x) + 1, elu from Clevert et al. 2015; justification
  (avoid zero gradient vs relu for x<0) and resulting O(NDM) cost: §3.2.1,
  paragraph containing/following Eq. 7.
- Eq. 8 — causal-masked generalized attention (sum truncated to j ≤ i): §3.3.
- Eq. 9 — causal linearized attention using φ: §3.3.
- Eq. 10 — S_i = Σ_{j=1}^i φ(K_j)V_jᵀ: §3.3.
- Eq. 11 — Z_i = Σ_{j=1}^i φ(K_j): §3.3.
- Eq. 12 — V'_i = φ(Q_i)ᵀS_i / φ(Q_i)ᵀZ_i, with S_i, Z_i computable from
  S_{i-1}, Z_{i-1} in constant time: §3.3, immediately after Eq. 11.
- §3.3.1 "Gradient Computation" — naive autograd through Eq. 12 costs
  max(D,M)× extra memory; Eqs. 13–15 give the cumulative-sum gradients
  ∇φ(Q_i)L, ∇φ(K_i)L, ∇V_i L; algorithm has O(NCM) time, O(N max(C,M))
  memory; Algorithm 1 gives forward/backward pseudocode; ~200 lines of CUDA
  mentioned in §4 experimental setup, not §3.3.1 itself.
- Eqs. 16–20 — RNN formulation: s_0=0, z_0=0,
  s_i = s_{i-1} + φ(x_iW_K)(x_iW_V)ᵀ, z_i = z_{i-1} + φ(x_iW_K),
  y_i = f_l(φ(x_iW_Q)ᵀs_i / φ(x_iW_Q)ᵀz_i + x_i): §3.4.
- Abstract — "up to 4000x faster on autoregressive prediction of very long
  sequences": Abstract.
- Table 1 — MNIST image generation: Linear 0.644 bits/dim at 142.8 images/sec
  (317× vs Softmax's 0.45 images/sec at 0.621 bits/dim): §4.2.1.
- Table 2 — CIFAR-10 image generation: Linear 3.40 bits/dim at 17.85
  images/sec (4,462× vs Softmax's 0.004 images/sec at 3.47 bits/dim), models
  trained 7 days on one GPU: §4.2.2. Body text of §4.2.2 rounds this to
  "our method can generate 4,460 images" per one Softmax image.
- "more than 1,000 times faster and with constant memory per image" —
  summary claim in §4.2 introduction (rounded/approximate framing of the
  Table 1/2 results, `?` exact figure differs slightly per table — 317×
  MNIST, 4,462× CIFAR-10).
- Table 3 — WSJ speech recognition: Softmax PER 5.12 (2711 s/epoch) vs
  Linear PER 8.08 (824 s/epoch), Linear ~3.3× faster/epoch but worse
  quality than Softmax on this one task: §4.3.
- §5 Conclusions — future-work note on approximating the RBF kernel with
  random Fourier features to reuse softmax-pretrained models, implying
  current elu+1 kernel is not a numerically faithful softmax substitute.
- §2.1, last paragraph — Reformer requires keys = queries (unusable for
  decoding); linear attention imposes no such constraint.
- §2.2 — relation to Tsai et al. 2019 kernel formulation of attention
  (interpretation vs this paper's use of the kernel view for complexity
  reduction); note on positive-similarity kernels giving normal convergence.
- §2.3 — relation to Shen et al. 2020 (concurrent linearized attention for
  object detection).
