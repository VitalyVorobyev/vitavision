---
paper_id: ioffe2015-batchnorm
title: "Batch Normalization: Accelerating Deep Network Training by Reducing Internal Covariate Shift"
authors: ["S. Ioffe", "C. Szegedy"]
year: 2015
url: https://arxiv.org/pdf/1502.03167
created: 2026-08-23
relevant_atlas_pages: [attention-mechanism, vit, resnet]
---

# Setting

Problem class: accelerating and stabilizing the training of deep neural networks
(feedforward and convolutional) trained with mini-batch SGD. Input: a network with
one or more layers whose activations are affected by all preceding layers'
parameters, so the distribution of any given layer's inputs drifts as training
proceeds. Output: the same network augmented with a per-activation normalization
step (mean/variance standardization plus a learned affine transform) inserted
before the nonlinearity, trainable end-to-end by backprop, with a distinct
inference-time behavior using population statistics instead of mini-batch
statistics.

# Core idea

The paper defines **Internal Covariate Shift (ICS)**: "the change in the
distribution of network activations due to the change in network parameters
during training" (§2, p.2). The proposed fix, **Batch Normalization (BN)**,
normalizes each scalar feature of a layer's input independently to zero mean
and unit variance using statistics estimated from the current mini-batch, then
applies a learned per-channel scale $\gamma$ and shift $\beta$ so the
transform can still represent the identity map and does not reduce the
network's representational capacity (§3, p.3). Mini-batch statistics are
differentiable, so the normalization step participates fully in
backpropagation (in contrast to computing whitening statistics outside the
gradient-descent loop, which the paper shows can cause parameter blow-up,
§2, p.3). At inference time, the mini-batch-dependent statistics are replaced
by fixed population statistics (unbiased variance estimate, computed via
moving averages over training mini-batches), so inference becomes a
deterministic, batch-independent linear transform of the input (§3.1, p.4).
For convolutional layers, BN is applied per feature map, sharing $\gamma^{(k)}$,
$\beta^{(k)}$ across all spatial locations and mini-batch elements of that
feature map, i.e. the effective normalization set has size $m' = m \cdot p \cdot q$
for mini-batch size $m$ and feature-map size $p \times q$ (§3.2, p.4-5).

# Assumptions

1. Mini-batch size $m > 1$ and, in practice, large enough (paper's ImageNet
   experiments use $m=32$) that per-batch mean/variance are a low-noise
   estimate of the population statistics. (Soft — the paper does not test small
   batches; degradation with small $m$ is established later by Wu & He 2018.)
2. Elements within a mini-batch are (approximately) drawn from the same
   distribution — required for the claim that normalized activations $\hat x$
   have mean 0 / variance 1 in expectation (§3.1, p.4, "as long as the elements
   of each mini-batch are sampled from the same distribution"). (Hard — this
   assumption underlies the correctness of using mini-batch statistics as an
   estimator.)
3. Normalization is applied to $x = Wu + b$ (the pre-activation, before the
   nonlinearity), not to the layer input $u$, because $Wu+b$ is expected to
   have a more symmetric, "more Gaussian" distribution (§3.2, p.4). The bias
   $b$ can be dropped because BN's mean-subtraction cancels it; its role is
   subsumed by $\beta$ (§3.2, p.4). (Soft — an architectural placement choice,
   not a correctness requirement.)
4. Each feature/activation dimension is normalized independently (not jointly
   whitened), which sidesteps the cost and singular-covariance risk of full
   whitening when mini-batch size is smaller than the number of activations
   (§3, p.3). (Hard — full joint whitening is explicitly rejected as
   impractical.)

# Failure regime

- Small mini-batches: not evaluated empirically in this paper, but the method
  is explicitly built on the premise that mini-batch mean/variance approximate
  population statistics; the paper's own inference-time procedure (population
  statistics via moving average) is a tacit admission that per-batch estimates
  are noisy and unsuitable for deterministic inference (§3.1, p.4).
- Non-i.i.d. mini-batches (train/test statistic mismatch, or correlated
  sampling within a batch) break the estimator assumption in #2 above; not
  tested here but flagged as a domain-adaptation direction for future work
  (§5 Conclusion, p.8, "whether Batch Normalization can help with domain
  adaptation").
- Naively computing normalization statistics outside the gradient-descent loop
  (i.e., not backpropagating through the normalization step) is shown to cause
  parameter blow-up: a toy example with $\hat x = x - E[x]$ where a bias update
  $\Delta b$ is exactly canceled by the corresponding shift in $E[x]$, so $b$
  grows unboundedly while the loss stays flat (§2, p.3, "we have observed this
  empirically in initial experiments, where the model blows up").
- Not yet applied to RNNs in this paper — flagged explicitly as future work
  because the "distribution of x" argument was developed for fixed-depth
  feedforward/conv nets (§5 Conclusion, p.8).

# Numerical sensitivity

- $\epsilon$ is added to the mini-batch variance before the square root
  purely for numerical stability against division by (near-)zero variance
  (Algorithm 1 caption, §3, p.3: "$\epsilon$ is a constant added to the
  mini-batch variance for numerical stability").
- Inference-time variance uses the **unbiased** estimator
  $\mathrm{Var}[x] = \frac{m}{m-1}\cdot E_B[\sigma_B^2]$, averaged (via moving
  average in practice) over training mini-batches of size $m$ (§3.1, p.4).
  This differs from the biased $1/m$ estimator used inside Algorithm 1 during
  training.
- BN is explicitly claimed to make backpropagation invariant to weight scale:
  for a scalar $a$, $\mathrm{BN}(Wu) = \mathrm{BN}((aW)u)$, and the paper
  derives $\partial\mathrm{BN}((aW)u)/\partial u = \partial\mathrm{BN}(Wu)/\partial u$
  and $\partial\mathrm{BN}((aW)u)/\partial(aW) = \frac{1}{a}\cdot\partial\mathrm{BN}(Wu)/\partial W$
  (§3.3, p.5, equations following "Indeed, for a scalar a"). This is presented
  as the mechanism enabling higher learning rates without divergence, and as
  stabilizing parameter growth (larger weights produce smaller gradients under
  BN).
- A conjectural (not proven) claim that BN pushes layer Jacobians toward
  singular values close to 1 under a Gaussian/uncorrelated/linear
  approximation ($JJ^T = I$), which the authors flag as "an area of further
  study," not an established numerical guarantee (§3.3, p.5).
- The full backprop chain-rule equations for $\partial\ell/\partial\hat x_i$,
  $\partial\ell/\partial\sigma_B^2$, $\partial\ell/\partial\mu_B$,
  $\partial\ell/\partial x_i$, $\partial\ell/\partial\gamma$,
  $\partial\ell/\partial\beta$ are given explicitly (§3, p.4, unlabeled
  equation block following Algorithm 1) — useful for verifying a from-scratch
  implementation.

# Applicability

- Use when: training deep feedforward or convolutional networks with SGD and
  mini-batches of moderate-to-large size; when saturating nonlinearities
  (sigmoid/tanh) are desired but hard to train; when faster convergence and
  higher learning rates are wanted.
- Don't use when (per this paper's own scope, not extrapolated): batch size is
  very small, statistics must be i.i.d.-violating (e.g., RNN per-timestep
  statistics, online learning with batch size 1) — the paper does not claim
  BN works there and flags RNNs as future work.
- Compared against: Dropout (BN found to partially substitute for it, §3.4,
  p.5); Local Response Normalization (found unnecessary once BN is present,
  §4.2.1, p.6); the standardization layer of Gülçehre & Bengio 2013 (similar
  mechanism, different goal/placement — applied after the nonlinearity there,
  before it here, §5 Conclusion, p.8).

# Connections

- Builds on: whitening-for-faster-convergence result of LeCun et al. 1998b
  (cited §3, p.3, "As shown in (LeCun et al., 1998b), such normalization
  speeds up convergence, even when the features are not decorrelated").
- Enables: ba2016-layernorm (explicitly transposes BN's batch-axis statistics
  into a per-sample/per-layer axis to remove the batch-size and RNN
  limitations); wu2018-groupnorm (generalizes the grouping axis further).
- Refutes / supersedes: none named in this paper.

# Atlas update plan

## NEW: normalization
Type: concept
Category: training / deep-learning-fundamentals
Primary source: this paper (one of ≥3 sources for the future concept page)
- **Definition**: contributes the "internal covariate shift" motivating
  narrative and the general normalize-then-affine-transform pattern
  $\hat x = (x-\mu)/\sqrt{\sigma^2+\epsilon}$, $y=\gamma\hat x+\beta$ that all
  three normalization papers in this family share (BN's version: §3, Alg. 1).
- **Mathematical Description**: contributes the exact BN transform (Algorithm
  1: per-mini-batch mean $\mu_B = \frac1m\sum_i x_i$, variance
  $\sigma_B^2=\frac1m\sum_i(x_i-\mu_B)^2$, normalize
  $\hat x_i=(x_i-\mu_B)/\sqrt{\sigma_B^2+\epsilon}$, scale-shift
  $y_i=\gamma\hat x_i+\beta$) and the inference-time replacement using
  population statistics (Algorithm 2: $E[x]\leftarrow E_B[\mu_B]$,
  $\mathrm{Var}[x]\leftarrow \frac{m}{m-1}E_B[\sigma_B^2]$, folded into a
  single linear transform
  $y = \frac{\gamma}{\sqrt{\mathrm{Var}[x]+\epsilon}}\cdot x + \left(\beta-\frac{\gamma E[x]}{\sqrt{\mathrm{Var}[x]+\epsilon}}\right)$).
  This is the batch-axis special case that LN and GN generalize away from.
- **Numerical Concerns**: contributes the $\epsilon$-for-stability rationale,
  the biased-vs-unbiased variance estimator distinction between train and
  inference, and the weight-scale-invariance derivation
  ($\mathrm{BN}(Wu)=\mathrm{BN}((aW)u)$) as the mechanism behind BN's
  higher-learning-rate tolerance.
- **Where it appears**: contributes the placement rule (before the
  nonlinearity, on $Wu+b$ with $b$ dropped) and the regularization/Dropout
  interaction claim (§3.4) plus the batch-size dependence that motivates LN
  and GN as alternatives.
- Regime of validity for this paper's specific variant: moderate-to-large
  mini-batch, i.i.d. batch sampling, feedforward/convolutional architectures;
  not validated here for RNNs or batch size 1.

Relations: none — concept-page source; no typed relations (approved plan).

# Provenance

- Internal Covariate Shift definition: §2, p.2, "We define Internal Covariate
  Shift as the change in the distribution of network activations due to the
  change in network parameters during training."
- BN Transform (Algorithm 1): §3, p.3-4, "Algorithm 1: Batch Normalizing
  Transform, applied to activation x over a mini-batch."
- Training vs inference procedure (Algorithm 2), unbiased variance estimator,
  folded linear transform: §3.1, p.4, "Algorithm 2: Training a
  Batch-Normalized Network."
- Placement before nonlinearity, bias cancellation, convolutional
  feature-map-wide statistics: §3.2, p.4-5.
- Weight-scale invariance derivation and Jacobian singular-value conjecture:
  §3.3, p.5.
- Regularization / Dropout interaction claim: §3.4, p.5.
- MNIST activation-stability experiment (Figure 1): §4.1, p.6.
- ImageNet Inception experiments, "14 times fewer steps" claim: §4.2.2, p.7,
  Figure 3 ("BN-x5 needs 14 times fewer steps than Inception to reach the
  72.2% accuracy") — provenance is the paper's own reported comparison of
  training-step counts to reach Inception's 72.2% accuracy (BN-x5: 2.1e6
  steps vs Inception's 31.0e6 steps ≈ 14.8×, rounded to "14" in text).
  Abstract's "same accuracy with 14 times fewer training steps" (p.1) matches
  this figure.
- ImageNet ensemble result, 4.9% top-5 validation / 4.82% top-5 test error:
  §4.2.3, p.7, Figure 4 table.
- 7% of training steps claim (BN-Baseline vs Inception): §1 Introduction,
  p.2 ("we can match its performance using only 7% of the training steps");
  cross-check against §4.2.2 "BN-Baseline... match[es] the accuracy of
  Inception in less than half the number of training steps" — both figures
  are as stated in the paper; the 7% figure appears to refer to a different
  comparison point than the half-steps claim (marked `?` — not fully
  reconciled from the text alone).
