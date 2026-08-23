---
paper_id: ba2016-layernorm
title: "Layer Normalization"
authors: ["J. L. Ba", "J. R. Kiros", "G. E. Hinton"]
year: 2016
url: https://arxiv.org/pdf/1607.06450
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, vit, resnet]
---

# Setting

Problem class: normalizing neuron activations to speed up training, while
removing Batch Normalization's two limitations — dependence on mini-batch
size and difficulty applying it to recurrent neural networks with
variable-length sequences (Abstract, p.1). Input: a feedforward, recurrent,
or generalized-linear-model layer's vector of summed inputs to its hidden
units, for a single training case. Output: a normalized version of that
vector — invariant to certain data/weight rescalings — using statistics
computed once per training case (not per mini-batch), so training and test
computation are identical and the method extends unmodified to a batch size
of 1.

# Core idea

**Layer Normalization (LN)** computes the normalization mean and variance
"over all the hidden units in the same layer" for a single training case,
rather than over the batch dimension for a single unit (§3, p.2, Eq. 3):
$\mu^l = \frac1H\sum_{i=1}^H a_i^l$,
$\sigma^l = \sqrt{\frac1H\sum_{i=1}^H (a_i^l-\mu^l)^2}$, where $H$ is the
number of hidden units in layer $l$ and $a_i^l$ is the summed input to unit
$i$. "All the hidden units in a layer share the same normalization terms
$\mu$ and $\sigma$, but different training cases have different
normalization terms" (§3, p.2) — the reverse of BN, where all training cases
in a mini-batch share the same per-unit statistics. As with BN, each neuron
retains an adaptive gain $g_i$ and bias $b_i$ applied after normalization
(§3, Eq. 2, p.2, shared general form
$h_i = f\!\left(\frac{g_i}{\sigma_i}(a_i-\mu_i)+b_i\right)$, §5.1 Eq. 5, p.3).
Because $\mu^l,\sigma^l$ depend only on the current training case's summed
inputs — not on other cases in a batch — LN imposes no constraint on batch
size and works in the pure online regime with batch size 1 (§3, p.2). For
RNNs, the same layer-wise statistics are recomputed independently at each
time step from that step's summed inputs
$a^t = W_{hh}h^{t-1}+W_{xh}x^t$ (§3.1, Eq. 4, p.3), so no separate per-time-step
statistics need to be stored (unlike batch-normalized RNN variants, which the
paper says need "separate statistics for each time step," §3.1, p.3), and
performance does not depend on sequence length relative to training data.

# Assumptions

1. All hidden units within a layer are expected to make comparable
   contributions to the layer's function, so that pooling their statistics
   into one $\mu^l,\sigma^l$ is meaningful (§6.7, p.10: "With fully connected
   layers, all the hidden units in a layer tend to make similar contributions
   to the final prediction and re-centering and re-scaling the summed inputs
   to a layer works well"). (Soft — degrades, does not fail outright, when
   violated.)
2. The assumption above is explicitly stated by the authors to be **less
   valid for convolutional layers**, because units near the receptive-field
   boundary of an image are rarely activated and have different statistics
   from the rest of the layer (§6.7, p.10: "the assumption of similar
   contributions is no longer true for convolutional neural networks. The
   large number of the hidden units whose receptive fields lie near the
   boundary of the image are rarely turned on and thus have very different
   statistics"). (Hard within the convolutional regime — the paper reports
   BN outperforming LN there, §6.7.)
3. Layer normalization is **not** a re-parameterization of the original
   network (unlike weight normalization or BN with expected statistics),
   so it has genuinely different invariance properties, analyzed in §5
   (§4 Related work, p.3, "Our proposed layer normalization method, however,
   is not a re-parameterization of the original neural network").

# Failure regime

- Convolutional networks: "batch normalization outperforms the other
  methods" in the paper's own preliminary CNN experiments; LN gives a
  speedup over no normalization but underperforms BN (§6.7, p.10). The
  authors state "further research is needed to make layer normalization
  work well in ConvNets."
- LN's own analysis notes it is *not* invariant to per-unit weight-vector
  rescaling (Table 1, p.3): "layer normalization... is not invariant to the
  individual scaling of the single weight vectors" — only to scaling/shifting
  the *entire* weight matrix. This is a structural limitation relative to BN
  and weight normalization, which are invariant to single-neuron weight
  rescaling (Table 1, §5.1, p.3-4).
- LN does not remove the batch-statistics-based regularization effect that
  BN's mini-batch stochasticity provides; the paper does not claim a
  regularization benefit for LN (no equivalent of BN's §3.4 claim appears in
  this paper).

# Numerical sensitivity

- The general normalized-GLM formulation shared by BN/WN/LN is
  $h_i = f\!\left(\frac{g_i}{\sigma_i}(a_i-\mu_i)+b_i\right)$ (§5.1, Eq. 5,
  p.3), where $\mu,\sigma$ differ by method: LN and BN use Eq. 2/3
  (population or per-layer statistics respectively); weight normalization
  sets $\mu=0,\ \sigma=\lVert w\rVert_2$ (§5.1, p.3).
- **Invariance table** (Table 1, §5.1, p.3, reproduced with provenance):

  | | Weight matrix re-scaling | Weight matrix re-centering | Weight vector re-scaling | Dataset re-scaling | Dataset re-centering | Single training-case re-scaling |
  |---|---|---|---|---|---|---|
  | Batch norm | Invariant | No | Invariant | Invariant | Invariant | No |
  | Weight norm | Invariant | No | Invariant | No | No | No |
  | Layer norm | Invariant | Invariant | No | Invariant | No | Invariant |

  Derivations: weight-matrix scale+shift invariance for LN, §5.1 Eq. 6, p.4
  (for $W'=\delta W+\mathbf{1}\gamma^\top$, LN output is unchanged); LN
  invariance to per-training-case rescaling, §5.1 Eq. 7, p.4 (for $x'=\delta x$,
  LN output is unchanged because $\mu,\sigma$ both scale by $\delta$).
- The supplementary material's canonical LN operator (used to define the
  applied normalization consistently across experiments) is
  $LN(z;\alpha,\beta) = \frac{z-\mu}{\sigma}\odot\alpha+\beta$, with
  $\mu=\frac1D\sum_i z_i$, $\sigma=\sqrt{\frac1D\sum_i(z_i-\mu)^2}$ (Appendix,
  Eq. 15-16, p.13) — note this omits an explicit $\epsilon$ term in the
  paper's own notation (unlike BN's Algorithm 1), so numerical stability
  against $\sigma\to0$ is not explicitly addressed in this paper (`?`).
- Riemannian-metric analysis (§5.2, Eq. 8-14, p.4-5) argues that under LN
  and BN, growing the weight-vector norm implicitly shrinks the effective
  learning rate along that direction by a factor tied to $\sigma_i$ — "the
  norm of the weight vector effectively controls the learning rate for the
  weight vector" (§5.2.2, p.5) — presented as an "implicit early stopping"
  effect that stabilizes learning; and that learning the gain parameter
  under LN/BN depends only on prediction-error magnitude, not on input
  scale, unlike the unnormalized GLM (§5.2.2, p.5, "more robust to the
  scaling of the input and its parameters than in the standard model").
- LSTM-with-LN equations (Appendix, Eq. 20-22, p.13) apply LN separately to
  the two affine terms of the gate/cell pre-activations
  ($LN(W_hh^{t-1};\alpha_1,\beta_1) + LN(W_xx^t;\alpha_2,\beta_2)+b$) and to
  the cell state before the output nonlinearity
  ($h^t=\sigma(o^t)\odot\tanh(LN(c^t;\alpha_3,\beta_3))$) — a concrete,
  reusable placement pattern for applying LN inside gated recurrent cells.

# Applicability

- Use when: batch size is small or variable (online learning, RNNs with
  variable sequence length); recurrent architectures (LSTM/GRU) where BN's
  per-time-step statistics are awkward to maintain; identical train/test
  computation is required.
- Don't use when (per this paper's own reported results): training standard
  convolutional image classifiers where a reasonably large, consistent batch
  size is available — BN outperforms LN there (§6.7).
- Compared against: batch normalization (throughout, especially §6.2, §6.6);
  weight normalization (§5.1 invariance analysis; §4 Related work).

# Connections

- Builds on: ioffe2015-batchnorm (LN is explicitly framed as a
  transposition of BN's batch-axis statistics onto the layer axis, §1
  Introduction, p.1, "we transpose batch normalization into layer
  normalization").
- Enables: wu2018-groupnorm (identifies LN as the $G=1$ special case of its
  general grouping scheme).
- Refutes / supersedes: none — LN is presented as a complementary,
  batch-independent alternative to BN, not a replacement in all regimes;
  the paper's own CNN results favor BN.

# Atlas update plan

## NEW: normalization
Type: concept
Category: training / deep-learning-fundamentals
Primary source: this paper (one of ≥3 sources for the future concept page)
- **Definition**: contributes the batch-axis-vs-layer-axis contrast — LN
  normalizes over the feature/hidden-unit dimension for one sample instead
  of over the batch dimension for one feature — and the explicit statement
  that LN is not a network re-parameterization.
- **Mathematical Description**: contributes the exact per-sample layer
  statistics $\mu^l=\frac1H\sum_i a_i^l$,
  $\sigma^l=\sqrt{\frac1H\sum_i(a_i^l-\mu^l)^2}$ (Eq. 3), the shared
  normalize-scale-shift form $h_i=f(\frac{g_i}{\sigma_i}(a_i-\mu_i)+b_i)$
  (Eq. 5) that unifies LN/BN/WN, and the LSTM-embedding equations (Appendix
  Eq. 20-22) as a worked example of where in a recurrent cell LN is applied.
- **Numerical Concerns**: contributes the full invariance table (Table 1)
  distinguishing LN's batch-independence and per-case-rescaling invariance
  from BN's weight-vector-rescaling invariance, and the Riemannian-metric
  argument for why normalization implicitly reduces effective learning rate
  as weight norm grows (§5.2).
- **Where it appears**: contributes the batch-size-independence property
  that makes LN suitable for RNNs and small/online batches, and the explicit
  admission (§6.7) that LN underperforms BN in convolutional networks —
  important negative evidence for the concept page's "when to use which
  variant" guidance.
- Regime of validity for this paper's variant: batch-size-agnostic;
  strongest evidence is on RNN/LSTM sequence tasks (image-sentence ranking,
  reading comprehension, skip-thoughts, handwriting generation, DRAW); weak
  on convolutional image classification per the paper's own §6.7 admission.

Note: this paper (published 2016) predates the Transformer (Vaswani et al.
2017) and contains no discussion of attention or transformer architectures —
its own text is scoped to RNN/LSTM/GRU and feedforward/GLM settings only.
The transformer's use of LayerNorm is not claimed here and must be sourced
from vaswani2017-attention's own note, not imported into this one.

Relations: none — concept-page source; no typed relations (approved plan).

# Provenance

- Motivation / BN's two limitations (batch-size dependence, RNN
  applicability): Abstract, p.1; §1 Introduction, p.1-2.
- Batch normalization recap, Eq. 2: §2 Background, p.2.
- Layer normalization statistics, Eq. 3: §3, p.2.
- LN applied to RNN recurrent layer, Eq. 4: §3.1, p.2-3.
- General normalized-GLM form, Eq. 5, and weight-normalization special case
  ($\mu=0,\sigma=\lVert w\rVert_2$): §5.1, p.3.
- Invariance properties table: Table 1, §5.1, p.3.
- Weight matrix re-scaling/re-centering invariance derivation, Eq. 6: §5.1,
  p.4.
- Data re-scaling/re-centering invariance derivation, Eq. 7: §5.1, p.4.
- Riemannian metric / Fisher information analysis, Eq. 8-14: §5.2.1-5.2.2,
  p.4-5.
- Implicit learning-rate reduction and gain-parameter robustness claims:
  §5.2.2, p.5.
- Order-embeddings experiment (Recall@K curves, 60% convergence-time claim):
  §6.1, p.6-7, Figure 1, Table 2.
- Attentive reader / recurrent BN comparison: §6.2, p.7, Figure 2.
- Skip-thought vectors experiment: §6.3, p.7-8, Figure 3, Table 3.
- DRAW / binarized MNIST experiment (82.36 vs 82.09 nats after 200 epochs):
  §6.4, p.9, Figure 4.
- Handwriting sequence generation: §6.5, p.9, Figure 5.
- Permutation-invariant MNIST, batch-size robustness comparison with BN:
  §6.6, p.10, Figure 6.
- Convolutional network limitation admission: §6.7, p.10.
- Canonical LN operator definition (with $\alpha,\beta$ notation), Eq. 15-16:
  Appendix "Application of layer normalization to each experiment", p.13.
- LSTM-with-LN equations, Eq. 17-22: Appendix, p.13.
- GRU-with-LN equations, Eq. 23-28: Appendix, p.13-14.
