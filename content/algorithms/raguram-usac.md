---
title: "USAC: Universal RANSAC Framework"
date: 2026-05-03
summary: "Engineering decomposition of practical RANSAC into four pluggable stages — sampling (PROSAC), model verification (SPRT), local optimisation (LO-RANSAC), and degeneracy handling (DEGENSAC) — with a single reference C++ implementation (USAC-1.0) and an SPRT-corrected stopping criterion."
tags: ["robust-estimation"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [ransac]
failureModes: []
relations:
  - type: compared_with
    target: barath-magsac
    confidence: high
sources:
  primary: raguram2013-usac
  notes: |
    Unifying engineering framework over the RANSAC family. Decomposes
    practical RANSAC into four independently swappable stages:
    (1) sampling (PROSAC quality-ordered draws expanding to full set
    after $T_N$); (2) verification (SPRT — Sequential Probability
    Ratio Test, $\Lambda_j = \prod p(x_r|H_b)/p(x_r|H_g)$, Eq. 9 —
    rejects bad models early when $\Lambda_j > A$); (3) degeneracy
    handling (DEGENSAC — for fundamental matrix, detects ≥ 5 of 7
    minimal-sample correspondences related by a homography and runs
    a model-completion step); (4) local optimisation (LO-RANSAC
    inner-loop with iteratively reweighted least-squares refit).
    SPRT-corrected stopping criterion (Eq. 13) at confidence $\eta_0$
    and nonrandomness significance $\gamma = 0.05$ (Eq. 12). Tested
    inlier-ratio range 10–92% across homography, fundamental, and
    essential matrix benchmarks. Reference open-source implementation
    is USAC-1.0.
---

# Goal

Robustly fit a parametric model to a set $P$ of $N$ data points where an unknown fraction are inliers consistent with the true model within threshold $\varepsilon$, and the remainder are outliers with arbitrary residuals. Inputs: data set $P$; minimal sample size $s$; inlier-distance threshold $\varepsilon$; confidence target $\eta_0$ (typically 0.95 or 0.99); a per-point quality ordering for the PROSAC sampler; SPRT type-I error $\alpha$ and type-II error $\beta$. Outputs: model parameters $\theta^*$, inlier set $I^*$, and a locally-refined model fitted on a nonminimal sample drawn from $I^*$. The defining property is that USAC is an engineering framework that decomposes the RANSAC hypothesise-and-verify loop into four independently pluggable stages — sampling, model verification, degeneracy handling, and local optimisation — and integrates the best-known variant per stage (PROSAC, SPRT, DEGENSAC, LO-RANSAC) into a single reference open-source C++ implementation, USAC-1.0. Tested inlier-ratio range: 10–92% across homography, fundamental matrix, and essential matrix benchmarks.

# Algorithm

Let $P$ denote the data set and $N = |P|$ the number of points.
Let $s$ denote the minimal sample size required to instantiate the model.
Let $\varepsilon$ denote the inlier-distance threshold.
Let $\eta_0$ denote the confidence target for the stopping criterion.
Let $\delta$ denote the probability that a randomly chosen datum is consistent with an incorrect model.
Let $\Lambda_j$ denote the cumulative SPRT likelihood ratio after evaluating $j$ data points.
Let $A$ denote the SPRT decision threshold.
Let $T_N$ denote the PROSAC sample-count parameter — the number of draws at which the sampler expands to the full set.
Let $\gamma$ denote the nonrandomness significance level used in the stopping criterion.

:::definition[SPRT likelihood ratio]
At the $j$-th data-point evaluation of a candidate model, the cumulative likelihood ratio of the bad-model hypothesis $H_b$ over the good-model hypothesis $H_g$:

$$
\Lambda_j = \prod_{r=1}^{j} \frac{p(x_r \mid H_b)}{p(x_r \mid H_g)} \quad \text{(Eq. 9)}.
$$

When $\Lambda_j > A$, the candidate model is rejected without evaluating the remaining points.
:::

:::definition[Runtime decomposition]
Total computation time as a function of the four stages:

$$
t = k \cdot (t_M + m_S \cdot t_V) \quad \text{(Eq. 6)},
$$

where $k$ is the number of trials, $t_M$ is the model-fitting time per trial, $m_S$ is the mean number of data points evaluated per verification pass, and $t_V$ is the per-point verification time. SPRT reduces $m_S$; PROSAC reduces $k$; LO-RANSAC reduces the $k$ required to attain $\eta_0$ confidence.
:::

:::definition[SPRT-corrected stopping criterion]
The adjusted residual probability accounting for stochastic early rejection:

$$
\Omega = \left(1 - \left(1 - \alpha_i\right)^{1/\varepsilon^m}\right)^k \quad \text{(Eq. 13)},
$$

where $\alpha_i = A_i^{h_i}$ is the per-test rejection probability for threshold $A_i$, recomputed each time $\hat\varepsilon$ and $\hat\delta$ are updated. Termination occurs when $\Omega < 1 - \eta_0$.
:::

## Procedure

:::algorithm[USAC]
::input[Data set $P$ ($N$ points, optionally quality-ordered); minimal sample size $s$; inlier threshold $\varepsilon$; confidence target $\eta_0$; SPRT parameters $\alpha$, $\beta$; nonrandomness significance $\gamma$.]
::output[Model parameters $\theta^*$, inlier set $I^*$, and a locally-refined model.]

1. **Stage 1 — Sampling.** Draw a minimal sample of size $s$ using the PROSAC progressive sampler: order data points by quality score, draw from the top-$T_N$ subset, expand to the full set after $T_N$ total draws.
2. **Stage 2 — Sample check.** Reject samples that fail problem-specific pre-conditions (e.g., collinearity check for homography).
3. **Stage 3a — Model fit and SPRT verification.** Instantiate $\theta_j$ from the sample. For each data point in turn, accumulate $\Lambda_j$ via Eq. (9). Reject the model early when $\Lambda_j > A$; accept when all points are evaluated and $|I_j| > |I^*|$.
4. **Stage 3b — Degeneracy detection (DEGENSAC).** For fundamental-matrix estimation, check whether $\geq 5$ of the 7 minimal-sample correspondences are related by a homography. If degenerate, run a model-completion step to recover off-plane inliers.
5. **Stage 4 — Local optimisation.** When $|I_j|$ is the new best and the overlap with the previous best inlier set is $< 95\%$, draw 10–20 nonminimal samples from $I_j$ and refit via iteratively reweighted least squares; retain the best refit.
6. **Stopping criterion.** Update $\hat\varepsilon$, $\hat\delta$, $A$, and $\alpha_i$; compute $\Omega$ via Eq. (13). Terminate when $\Omega < 1 - \eta_0$ with nonrandomness significance $\gamma = 0.05$ (Eq. 12).
:::

# Implementation

SPRT verification stage in Rust:

```rust
pub trait Sampler<P> {
    fn next_sample<'a>(&mut self, points: &'a [P], s: usize) -> Vec<&'a P>;
}

pub trait Verifier<M> {
    /// SPRT decision threshold A; depends on epsilon, delta, type-I/II errors.
    fn threshold(&self) -> f64;
    /// Per-point likelihood ratio increment p(x | H_b) / p(x | H_g).
    fn lr(&self, model: &M, point_residual: f64) -> f64;
}

pub trait LocalOptimizer<M> {
    /// Refit on a nonminimal sample drawn from the inlier set; return improved model.
    fn optimize(&self, model: &M, inliers: &[usize]) -> Option<M>;
}

pub trait DegeneracyChecker<M> {
    /// Return true if the minimal sample is degenerate for this model class.
    fn is_degenerate(&self, sample_residuals: &[f64]) -> bool;
}

/// SPRT verification inner loop (Eq. 9). Returns the inlier count or
/// None if the model was rejected early.
pub fn usac_verify<M, V: Verifier<M>>(
    model: &M,
    residuals: impl Iterator<Item = f64>,
    eps: f64,
    verifier: &V,
) -> Option<usize> {
    let a = verifier.threshold();
    let mut lambda: f64 = 1.0;
    let mut inliers = 0usize;
    for r in residuals {
        lambda *= verifier.lr(model, r);
        if lambda > a {
            return None;
        }
        if r <= eps { inliers += 1; }
    }
    Some(inliers)
}
```

# Remarks

- USAC is a unifying engineering decomposition, not a single new mathematical technique. The reference C++ implementation (USAC-1.0) makes every module independently switchable, enabling isolated evaluation of SPRT-only, PROSAC-only, or LO-only effects on the same code path.
- SPRT verification reduces the mean number of point evaluations per hypothesis by a factor of 2–9× over the standard consensus count on homography and fundamental-matrix benchmarks (§3.4.3).
- The LO-RANSAC inner loop reduces the number of required outer iterations by a factor of 2–3 compared with vanilla RANSAC, bringing the observed iteration count in line with the theoretical prediction of Eq. (3) (§3.5.1).
- DEGENSAC handles planar degeneracy in fundamental-matrix estimation: when $\geq 5$ of the 7 minimal-sample correspondences lie on a common 3D plane, a model-completion step recovers the correct solution. Degeneracy modules for homography or essential-matrix degeneracies are not bundled in USAC-1.0 and require separate implementation.
- The SPRT-corrected stopping criterion uses nonrandomness significance level $\gamma = 0.05$ (§4.5.1, Eq. 12). Tightening $\gamma$ to 0.01 increases the required sample count; loosening to 0.10 risks accepting spurious solutions.
- See [`ransac`](/atlas/ransac) for the four design axes that organise the modern RANSAC family, and [`fischler-bolles-ransac`](/atlas/fischler-bolles-ransac) for the founding paradigm USAC unifies.

## When to choose USAC over MAGSAC

[MAGSAC](/atlas/barath-magsac) addresses a different axis of practical RANSAC: it eliminates the user-tuned inlier threshold $\varepsilon$ by treating the noise scale $\sigma$ as a random variable on $[0, \sigma_\mathrm{max}]$ and marginalising the quality function over $\sigma$ ($\sigma$-consensus, IRLS-refit). USAC instead unifies an engineering decomposition (PROSAC + SPRT + LO-RANSAC + DEGENSAC) but keeps a fixed scalar $\varepsilon$. The two are orthogonal, not competing.

| | USAC | MAGSAC |
|---|---|---|
| Inlier threshold | fixed scalar $\varepsilon$ | marginalised over $\sigma \in [0, \sigma_\mathrm{max}]$ |
| Scope | sampler / verifier / LO / degeneracy modules | model quality + IRLS refit |
| Verification cost | early-rejected via SPRT (2–9× speedup) | full-data $\sigma$-loop with $d = 10$ partitions |
| Final fit | least squares on hard inlier set | IRLS on per-point marginal-likelihood weights |
| Degeneracy | DEGENSAC for fundamental matrix | not bundled |

Choose USAC when (1) the inlier threshold $\varepsilon$ is well calibrated for the imagery and stable across the dataset; (2) sub-millisecond hypothesis verification matters and SPRT's 2–9× speedup pays for itself; (3) the problem is fundamental-matrix estimation under planar-degenerate scenes — DEGENSAC's model-completion step is built in.

Choose MAGSAC when (1) the inlier threshold is unknown or varies scene-to-scene — $\sigma_\mathrm{max} = 10$ px is a less sensitive upper bound; (2) geometric accuracy on real-world data outweighs verification speed — the IRLS refit on marginal-likelihood weights produces consistently lower transfer-error on public benchmarks; (3) the user wants a single hyperparameter ($\sigma_\mathrm{max}$) rather than a per-problem $\varepsilon$ tune.

The two are stackable: MAGSAC reuses the SPRT pre-screen from USAC (with $\tau_\mathrm{ref} = 1$ px) and PROSAC ordering for sampling; USAC's LO-RANSAC inner loop can be replaced with MAGSAC's IRLS refit. The MAGSAC++ follow-up (CVPR 2020) integrates both into a single pipeline.

# References

1. R. Raguram, O. Chum, M. Pollefeys, J. Matas, J.-M. Frahm. *USAC: A Universal Framework for Random Sample Consensus.* IEEE Transactions on Pattern Analysis and Machine Intelligence, 35(8):2022–2038, 2013. [ieeexplore.ieee.org](https://ieeexplore.ieee.org/document/6365642)
