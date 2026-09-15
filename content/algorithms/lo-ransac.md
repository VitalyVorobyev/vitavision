---
title: "Locally Optimized RANSAC (LO-RANSAC)"
date: 2026-09-15
summary: "RANSAC extension that corrects the false assumption that a minimal-sample model is consistent with all inliers, by running a local optimization step on every new best hypothesis — reaching the same termination guarantee in two to three times fewer samples."
tags: ["robust-estimation"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [ransac]
failureModes: []
relations:
  - type: feeds_into
    target: raguram-usac
    confidence: high
    caution: "USAC's stage 4 is LO-RANSAC's local optimisation as a pluggable component."
  - type: compared_with
    target: barath-magsac
    confidence: medium
sources:
  primary: chum2003-lo-ransac
  references:
    - fischler1981-ransac
    - raguram2013-usac
    - barath2019-magsac
  notes: |
    §1-2 standard termination $\eta=(1-P_I)^k$ (Eq. 1) with $P_I\approx
    \varepsilon^m$ (Eq. 2) assumes a single uncontaminated minimal sample
    matches all $I$ inliers — false in practice because minimal-sample
    model estimates are themselves noisy. Local optimization runs whenever
    a new best inlier count $I_k$ is found; expected invocation count is
    bounded by $\sum_{i=1}^k 1/i \le \log k + 1$ (§2). §3 five compared
    variants: Standard (no LO), Simple (single re-fit on $<\theta$
    points), Iterative (re-fit on $<K\theta$, shrink threshold toward
    $\theta$), Inner RANSAC (fresh RANSAC on inlier set, non-minimal
    sample $\min(I_k/2,14)$ epipolar / $\min(I_k/2,12)$ homography, 10
    repetitions), Inner RANSAC with iteration (method 4 + method 3's
    threshold shrink). §4 experiments A-E: standard RANSAC's
    actual/expected sample ratio ("eff") ranges 2.63-3.35; method 5's eff
    is close to 1.0 (e.g. 1.01 on experiment A, 1.16 on experiment B).
    Table 2: experiment B inlier count 23.3→25.7, samples 90,816→39,886,
    time 3.911s→1.731s (standard→method 5). Table 3 confirms the
    $O(\log k)$ invocation bound empirically (e.g. experiment C: 6.5
    average invocations vs a $\log(\text{avg. samples})=9.2$ bound).
    Abstract: "two to three fold" speed-up, "10-20%" more inliers.
---

# Goal

Reduce the number of samples RANSAC needs to reach a given confidence, and improve the quality of the returned model, by correcting the assumption underlying the standard termination criterion — that a model instantiated from one outlier-free minimal sample is consistent with the entire inlier set. Input: $N$ correspondences, minimal sample size $m$, inlier threshold $\theta$. Output: model parameters and the achieved inlier set, reached with the same termination guarantee as standard RANSAC but in measurably fewer trials, using no additional input information beyond what standard RANSAC requires.

# Algorithm

Let $\eta$ denote the probability of having missed the full inlier set after $k$ samples. Let $P_I$ denote the probability that an $m$-point minimal sample is entirely outlier-free, and $\varepsilon = I/N$ the inlier fraction. Let $\theta$ denote the inlier-distance threshold and $K$ a threshold multiplier used by the iterative local-optimization variant. Let $I_k$ denote the inlier count of the $k$-th sampled hypothesis.

:::definition[Standard termination criterion]
$$
\eta = (1 - P_I)^k, \qquad P_I = \binom{I}{m}\Big/\binom{N}{m} \approx \varepsilon^m.
$$

This implicitly assumes a model fit from one uncontaminated minimal sample is consistent with all $I$ inliers — an assumption that "rarely holds in practice," since minimal-sample model estimates are themselves noisy.
:::

:::definition[Local-optimization invocation bound]
The per-sample inlier count behaves as a random variable whose $k$-th draw has probability $1/k$ of being a new running maximum, so the expected number of new-maximum events (hence local-optimization invocations) within $k$ samples is bounded by

$$
\sum_{i=1}^{k} \frac{1}{i} \le \log k + 1,
$$

i.e. local optimization runs $O(\log k)$ times over a full run — asymptotically negligible against $k$ total samples.
:::

## Procedure

:::algorithm[LO-RANSAC]
::input[Data set with $N$ correspondences; minimal sample size $m$; inlier threshold $\theta$; target miss probability $\eta$.]
::output[Model parameters $\theta^*$ and inlier set $I^*$, reached in fewer samples than standard RANSAC for the same $\eta$.]

1. Draw a minimal sample $S_m$ of size $m$ and estimate model parameters from it.
2. Count inliers $I_k$ under threshold $\theta$.
3. If $I_k$ exceeds every previous $I_j$ ($j < k$), run a local optimization step and retain the result only if it improves on the current best.
4. Recompute $\eta$ via the standard termination criterion; repeat from step 1 until $\eta$ falls below the target.
:::

Five local-optimization variants are compared for step 3:

1. **Standard** — no local optimization (baseline RANSAC).
2. **Simple** — collect all points with error below $\theta$ under the minimal-sample model and re-fit by a non-minimal linear algorithm.
3. **Iterative** — collect points with error below $K\theta$ (a looser threshold), re-fit, then shrink the threshold toward $\theta$ and repeat. Restricting the first re-fit to points already close to a sample-consistent model excludes leverage points that would otherwise corrupt a naive iteratively-reweighted least-squares pass over the whole data set.
4. **Inner RANSAC** — run a fresh, smaller RANSAC restricted to the $I_k$ inlier points of the current best model, drawing non-minimal inner samples of size $\min(I_k/2, 14)$ for epipolar geometry or $\min(I_k/2, 12)$ for homography, repeated 10 times, and verified against the full data set.
5. **Inner RANSAC with iteration** — method 4, with each inner-RANSAC sample additionally refined by method 3's threshold-shrinking re-fit.

# Implementation

The outer loop with a pluggable local-optimization hook, implementing method 5 (Inner RANSAC with iteration), in Rust:

```rust
pub trait LocalOptimizer<M, P> {
    /// Draw a non-minimal inner sample from `inliers`, refit, and shrink
    /// the acceptance threshold toward `theta` across `rounds` passes.
    fn refine(&self, model: &M, points: &[P], inliers: &[usize], theta: f64) -> Option<M>;
}

/// One outer LO-RANSAC iteration: fit a minimal-sample model, count inliers,
/// and run local optimization when a new best is found (Algorithm 1, §2).
pub fn lo_ransac_step<M, P, L: LocalOptimizer<M, P>>(
    sample_model: M,
    points: &[P],
    theta: f64,
    residual: impl Fn(&M, &P) -> f64,
    best_inliers: usize,
    optimizer: &L,
) -> Option<(M, Vec<usize>)> {
    let inliers: Vec<usize> = points
        .iter()
        .enumerate()
        .filter(|(_, p)| residual(&sample_model, p) <= theta)
        .map(|(i, _)| i)
        .collect();

    if inliers.len() <= best_inliers {
        return None; // not a new best; no local optimization invoked
    }

    // New best: invoke local optimization (bounded to O(log k) calls per run).
    let refined = optimizer
        .refine(&sample_model, points, &inliers, theta)
        .unwrap_or(sample_model);
    Some((refined, inliers))
}
```

# Remarks

- Reported speed-up is "two to three fold" with 10–20% more inliers than standard RANSAC across five two-view-geometry experiments.
- Method 5's efficiency ratio (actual samples over the theoretically expected count) is close to 1.0 — for example 1.01 on one experiment and 1.16 on another — against standard RANSAC's 2.63–3.35 on the same experiments.
- Local optimization is invoked at most $O(\log k)$ times per run; the empirical invocation count stays below the $\log k$ bound across all tested experiments and methods.
- Non-iterative re-fitting alone (methods 2 and 4) underperforms its iterative counterpart (methods 3 and 5, respectively) with no compensating time saving.
- Method 5's inner resampling is a liability when the inlier fraction is high and the total correspondence count is low, since resampling cost then dominates; method 3 was faster in that regime in one of the five reported experiments.
- The modification "makes no new assumptions about the data" and is explicitly compatible with (not competing against) other RANSAC extensions such as MLESAC, R-RANSAC, and NAPSAC; see [`ransac`](/atlas/ransac) for the four design axes that organise the modern RANSAC family. USAC incorporates LO-RANSAC's local optimization as its pluggable stage-4 module (see [`raguram-usac`](/atlas/raguram-usac)).

## When to choose LO-RANSAC over MAGSAC

[MAGSAC](/atlas/barath-magsac) removes the need to tune a fixed inlier threshold $\theta$ by marginalising the RANSAC quality function over an unknown noise scale $\sigma \in [0, \sigma_\mathrm{max}]$, at the cost of $d = 10$ per-hypothesis model re-fits in its $\sigma$-consensus loop. LO-RANSAC keeps a fixed, user-supplied threshold $\theta$ and instead spends its extra cost on at most $O(\log k)$ local-optimization refits per run. MAGSAC's own applicability note names LO-RANSAC directly as the faster alternative "for tight-threshold well-calibrated setups" and reports it is the slowest method of those compared when the noise level is low ($\sigma < 0.3$ px), because $\sigma$-consensus runs on every minimal-sample model rather than only the current best.

| | LO-RANSAC | MAGSAC |
|---|---|---|
| Inlier threshold | fixed, user-supplied $\theta$ | marginalised over $\sigma \in [0, \sigma_\mathrm{max}]$, no fixed threshold |
| Extra per-run cost | $O(\log k)$ local-optimization invocations | $O(d)=O(10)$ model re-fits per sampled hypothesis |
| Best regime (per MAGSAC's own comparison) | well-calibrated threshold, tight compute budget, easy (low-noise) scenes | unknown or scene-varying noise scale; high outlier ratio |
| Final refit | least-squares or IRWLS re-fit on a non-minimal sample | weighted least squares (IRLS) on marginal-likelihood weights |
| Direct empirical comparison | included as a baseline in MAGSAC's own benchmark table | wins average error on most of the compared dataset blocks; third on one block by a 0.03 px margin |

Choose LO-RANSAC when the inlier threshold is well-calibrated for the imagery and stable across the dataset, when the scene noise level is low enough that $\sigma$-consensus's per-hypothesis overhead is not worth paying, or when no extra input beyond a single scalar threshold is available to tune. Choose MAGSAC when the inlier threshold is unknown or varies scene-to-scene, when geometric accuracy on real data is the primary metric, or when the outlier ratio is high enough that $\sigma$-consensus's iteration-count reduction outweighs its per-hypothesis cost.

# References

1. O. Chum, J. Matas, J. Kittler. *Locally Optimized RANSAC.* DAGM 2003 (Lecture Notes in Computer Science). [PDF](https://cmp.felk.cvut.cz/~matas/papers/chum-dagm03.pdf)
2. M. A. Fischler, R. C. Bolles. *Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography.* Communications of the ACM, 1981. [dl.acm.org](https://dl.acm.org/doi/pdf/10.1145/358669.358692)
3. R. Raguram, O. Chum, M. Pollefeys, J. Matas, J.-M. Frahm. *USAC: A Universal Framework for Random Sample Consensus.* IEEE TPAMI, 2013. [ieeexplore.ieee.org](https://ieeexplore.ieee.org/document/6365642)
4. D. Barath, J. Matas, J. Noskova. *MAGSAC: Marginalizing Sample Consensus.* CVPR, 2019. [arxiv.org](https://arxiv.org/abs/1803.07469)
