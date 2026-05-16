---
title: "MAGSAC: Marginalising Sample Consensus"
date: 2026-05-03
summary: "Robust estimator that eliminates the user-tuned inlier threshold by treating the noise scale σ as a random variable on [0, σ_max] and marginalising the RANSAC quality function over σ; the final model is a weighted least-squares fit using marginal-likelihood weights via iteratively reweighted least squares (σ-consensus)."
tags: ["robust-estimation", "optimization"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [ransac]
failureModes: []
sources:
  primary: barath2019-magsac
  notes: |
    σ-consensus replaces the user-tuned inlier threshold ε with a noise-scale
    upper bound σ_max (10 px in all experiments) and a uniform prior on σ.
    Marginalised quality $Q^*(\theta, P) = (1/\sigma_\mathrm{max}) \int_0^{\sigma_\mathrm{max}} Q(\theta, \sigma, P)\,d\sigma$
    (Eq. 2) is approximated on a grid of $d = 10$ uniform partitions. For
    $\chi^2(4)$ residuals (2D point correspondences), the per-σ inlier
    threshold is $\tau(\sigma) = 3.64\,\sigma$ (0.95 quantile). Final model
    is weighted least-squares via IRLS on the per-point marginal-likelihood
    weights (Alg. 1, line 14). SPRT pre-screen with $\tau_\mathrm{ref} = 1$ px
    is reused from USAC for cheap rejection.
---

# Goal

Robustly fit a parametric model (homography, fundamental matrix, or essential matrix) to a set $P$ of data points contaminated by outliers, without a user-tuned inlier threshold $\varepsilon$. Inputs: data set $P$; minimal sample size $s$; residual function $D(\theta, p)$; upper noise-scale bound $\sigma_\mathrm{max}$ (replaces the hard threshold $\varepsilon$); confidence target $\eta$. Outputs: weighted-least-squares model $\theta^*$ and marginalised quality score $Q^*(\theta^*, P)$. The defining property is $\sigma$-consensus: the noise scale $\sigma$ is treated as a random variable uniformly distributed on $[0, \sigma_\mathrm{max}]$, and the RANSAC quality function $Q(\theta, \sigma, P)$ is marginalised over $\sigma$ (Eq. 2); the final model is a weighted least-squares fit using the marginalised inlier likelihoods as IRLS weights (Alg. 1), with no hard inlier/outlier partition.

# Algorithm

Let $P$ denote the set of data points and $N = |P|$ the point count.
Let $s$ denote the minimal sample size required to instantiate the model.
Let $\sigma$ denote the noise scale and $\sigma_\mathrm{max}$ its upper bound.
Let $D(\theta, p)$ denote the residual of point $p$ under model $\theta$.
Let $g(r \mid \sigma)$ denote the chi-squared inlier-residual density with $\rho$ degrees of freedom — a function of radius $r$ and scale $\sigma$.
Let $\tau(\sigma)$ denote the effective inlier threshold at noise scale $\sigma$.
Let $L(p \mid \theta)$ denote the marginalised inlier likelihood of point $p$ under model $\theta$, used as the IRLS weight.
Let $Q^*(\theta, P)$ denote the marginalised quality score.
Let $d$ denote the number of uniform partitions of $[0, \sigma_\mathrm{max}]$ used for discretisation (default $d = 10$).
Let $\eta$ denote the confidence target for the stopping criterion.
Let $\tau_\mathrm{ref}$ denote the SPRT pre-screen reference threshold (set to 1 pixel).

:::definition[Marginalised quality]
The RANSAC quality function $Q(\theta, \sigma, P)$ averaged over $\sigma$ uniformly distributed on $[0, \sigma_\mathrm{max}]$:

$$
Q^*(\theta, P) = \frac{1}{\sigma_\mathrm{max}} \int_0^{\sigma_\mathrm{max}} Q(\theta, \sigma, P)\, d\sigma \quad \text{(Eq. 2)}.
$$
:::

:::definition[Inlier threshold $\tau(\sigma)$]
The 0.95 quantile of $g(r \mid \sigma)$. For $\chi^2(4)$ inlier residuals (2D point correspondences):

$$
\tau(\sigma) = 3.64\,\sigma.
$$
:::

:::definition[Per-point weight $L(p \mid \theta)$]
The marginalised inlier likelihood — used as the IRLS weight in the final weighted least-squares refit:

$$
L(p \mid \theta) = \int_0^{\sigma_\mathrm{max}} g(D(\theta, p) \mid \sigma)\,p(\sigma)\, d\sigma.
$$

Computed on a grid of $d = 10$ uniform partitions of $[0, \sigma_\mathrm{max}]$.
:::

## Procedure

:::algorithm[MAGSAC]
::input[Data set $P$; minimal sample size $s$; residual function $D(\theta, p)$; upper noise bound $\sigma_\mathrm{max}$; confidence target $\eta$; SPRT reference threshold $\tau_\mathrm{ref} = 1$ pixel; partition count $d = 10$.]
::output[Weighted-least-squares model $\theta^*$ and marginalised quality score $Q^*(\theta^*, P)$.]

1. **Sample.** Draw a minimal sample of size $s$ from $P$ (uniform or PROSAC-ordered).
2. **Fit minimal model.** Instantiate $\theta_j$ from the sample.
3. **Compute marginalised quality.** Discretise $\sigma$ over $d$ uniform partitions of $[0, \sigma_\mathrm{max}]$ and approximate $Q^*(\theta_j, P)$ via the discretised form (Eq. 5).
4. **SPRT pre-screen** with reference threshold $\tau_\mathrm{ref} = 1$ pixel — cheap rejection of obviously bad models, reused from USAC.
5. **If $Q^*$ exceeds the running maximum, refine via IRLS.** Compute weights $L(p \mid \theta_j)$ for every point. Refit $\theta^*$ by weighted least squares. Iterate until convergence.
6. **Update best model and termination criterion.** The termination count $k^*(P, \theta)$ is also marginalised over $\sigma$ (Eq. 8) and updated each time a new best model is found. Repeat from step 1 until $\eta$ confidence is reached.
:::

# Implementation

MAGSAC $\sigma$-consensus quality computation in Rust:

```rust
/// Discretised σ-consensus quality (MAGSAC).
/// Returns (Q*, per-point weights) for use in IRLS refit.
pub fn magsac_quality<F>(
    residuals: &[f64],
    sigma_max: f64,
    d: usize,
    g: F,           // chi-squared density g(r | σ)
) -> (f64, Vec<f64>)
where F: Fn(f64, f64) -> f64
{
    let dsigma = sigma_max / d as f64;
    let mut weights = vec![0.0_f64; residuals.len()];
    let mut q_star = 0.0;

    for i in 1..=d {
        let sigma = i as f64 * dsigma;
        let tau = 3.64 * sigma; // χ²(4), 0.95 quantile
        for (j, &r) in residuals.iter().enumerate() {
            let w = if r <= tau { g(r, sigma) } else { 0.0 };
            weights[j] += w * dsigma;
            q_star += w * dsigma;
        }
    }
    // Normalise by σ_max (uniform prior on σ).
    let inv = 1.0 / sigma_max;
    for w in weights.iter_mut() { *w *= inv; }
    (q_star * inv, weights)
}
```

# Remarks

- $\sigma$-consensus eliminates the user-tuned inlier threshold $\varepsilon$ — replacing it with the upper bound $\sigma_\mathrm{max}$ (10 pixels across all experiments), which is much less sensitive to precise tuning than a hard threshold.
- Discretisation grid $d = 10$ reduces fitting cost from $O(K)$ to $O(d)$ per hypothesis. Values below $d = 5$ risk underweighting high-$\sigma$ components; the paper provides no sensitivity sweep beyond the empirical choice.
- Per-point weights $L(p \mid \theta)$ are marginalised inlier likelihoods. The final model is a weighted-least-squares fit via IRLS, not a hard inlier-set refit.
- For $\chi^2(4)$ residuals (2D point correspondences), the effective inlier threshold at each $\sigma_i$ is $\tau(\sigma_i) = 3.64\,\sigma_i$. For higher residual dimensions the constant changes; consult the appropriate $\chi^2$ quantile table.
- Float32 underflow safety: $\exp(-D^2 / 2\sigma_i^2)$ underflows in float32 when $D > {\sim}13$ px for $\sigma_i = 1$ px — safely beyond the $\tau(\sigma_\mathrm{max})$ gate, so float32 arithmetic is workable throughout the $\sigma$ loop.
- See [`raguram-usac`](/atlas/raguram-usac) for the unifying RANSAC engineering framework MAGSAC plugs into, including the *When to choose USAC over MAGSAC* discussion (hosted there per the older + broader-scope tiebreaker). See [`ransac`](/atlas/ransac) for the four design axes that organise the modern RANSAC family.

# References

1. D. Barath, J. Matas, J. Noskova. *MAGSAC: Marginalizing Sample Consensus.* Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR), 2019. [arxiv.org](https://arxiv.org/abs/1803.07469)
