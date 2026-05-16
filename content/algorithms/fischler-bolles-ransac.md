---
title: "Fischler–Bolles RANSAC"
date: 2026-05-03
summary: "Founding random-sample-consensus paradigm: fit a parametric model to data containing an unknown fraction of gross outliers by drawing minimal random subsets, instantiating candidate models, counting consensus inliers, and retaining the largest consensus set."
tags: ["robust-estimation"]
domain: geometry
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [ransac]
failureModes: []
relations:
  - type: extended_by
    target: raguram-usac
    confidence: high
    caution: "USAC is a unifying engineering framework, not a single new technique"
  - type: extended_by
    target: barath-magsac
    confidence: high
    caution: "MAGSAC marginalises the inlier threshold rather than fixing it — orthogonal axis to USAC's framework refactor"
sources:
  primary: fischler1981-ransac
  notes: |
    Founding RANSAC paper (Communications of the ACM, June 1981). Inverts the
    classical regression paradigm: instead of fitting all data and pruning
    residuals iteratively (smoothing), draw a minimal sample $s$ at random,
    instantiate a candidate model, count globally consistent inliers within
    threshold $\varepsilon$, and retain the best (consensus). Iteration count
    $k = \log(1 - p) / \log(1 - w^s)$ derived from the geometric-series
    identity ($\S$II.B). Founding application: the Location Determination
    Problem — recovering camera pose from aerial-image landmark
    correspondences ($\S$IV).
---

# Goal

Fit a parametric model to a set $P$ of $N$ data points where an unknown fraction of the observations are gross errors (outliers). Inputs: the data set $P$; a minimal sample size $s$ determined by the model's degrees of freedom; an inlier-distance threshold $\varepsilon$; a desired success probability $p$; a prior inlier-fraction estimate $w$; and a consensus-set acceptance threshold $t$. Outputs: model parameters $\theta^*$ estimated from the largest consistent subset $I^*$ of $P$, where consistency is defined by $\mathrm{dist}(\mathbf{x}, \theta^*) \leq \varepsilon$. The defining property is the random-sample-consensus strategy: draw a minimal random subset, instantiate a model, count global inliers, and retain the best hypothesis — inverting the classical approach of fitting all data and pruning residuals iteratively.

# Algorithm

Let $P$ denote the data set and $N = |P|$ the number of points.
Let $s$ denote the minimal sample size — the number of points required to instantiate the model uniquely.
Let $\varepsilon$ denote the inlier-distance threshold: a datum $\mathbf{x}$ is an inlier to model $\theta$ iff $\mathrm{dist}(\mathbf{x}, \theta) \leq \varepsilon$.
Let $p$ denote the desired probability that at least one drawn minimal sample consists entirely of inliers.
Let $w$ denote the estimated inlier fraction — the probability that a uniformly chosen datum is an inlier.
Let $t$ denote the minimum consensus-set size required to accept a hypothesis.
Let $\theta$ denote model parameters and $I$ a consensus set — the subset of $P$ consistent with $\theta$.
Let $k$ denote the number of trials to execute.

:::definition[Iteration count]
The number of trials needed so that the probability of drawing at least one all-inlier minimal sample is at least $p$:

$$
k = \frac{\log(1 - p)}{\log(1 - w^s)}.
$$

Derived in §II.B from the geometric-series identity. Expected value and standard deviation of the trial count are

$$
E[k] = w^{-s}, \qquad \mathrm{SD}(k) = \frac{\sqrt{1 - w^s}}{w^s}.
$$

For $p = 0.99$, $w = 0.5$, $s = 4$: $k \approx 72$ and $E[k] = 16$.
:::

## Procedure

:::algorithm[RANSAC]
::input[Data set $P$ with $N$ points; minimal sample size $s$; inlier threshold $\varepsilon$; desired success probability $p$; inlier-fraction estimate $w$; acceptance threshold $t$.]
::output[Model parameters $\theta^*$ and inlier set $I^*$.]

1. Compute $k = \log(1 - p) / \log(1 - w^s)$ and round up to the nearest integer.
2. Initialise $I^* \leftarrow \emptyset$ and $\theta^* \leftarrow$ undefined.
3. For each trial $j = 1, \ldots, k$:
   1. Draw a uniform random subset $S_j \subseteq P$ with $|S_j| = s$.
   2. Instantiate model $\theta_j$ from $S_j$.
   3. Form the consensus set $I_j = \{\, \mathbf{x} \in P \mid \mathrm{dist}(\mathbf{x}, \theta_j) \leq \varepsilon \,\}$.
   4. If $|I_j| > |I^*|$ set $I^* \leftarrow I_j$ and $\theta^* \leftarrow \theta_j$; if $|I^*| \geq t$ terminate early.
4. Re-fit $\theta^*$ on $I^*$ by least squares (optional; improves accuracy when $|I^*| > s$).
5. Return $\theta^*$ and $I^*$.
:::

# Implementation

Generic RANSAC loop in Rust:

```rust
use rand::seq::SliceRandom;

pub trait RansacModel: Sized {
    type Point;
    const SAMPLE_SIZE: usize;
    fn fit_minimal(sample: &[&Self::Point]) -> Option<Self>;
    fn residual(&self, point: &Self::Point) -> f64;
}

pub fn ransac<M: RansacModel>(
    points: &[M::Point],
    eps: f64,
    p_success: f64,
    w: f64,
) -> Option<(M, Vec<usize>)> {
    let s = M::SAMPLE_SIZE;
    // k = log(1 − p) / log(1 − w^s)
    let k = ((1.0 - p_success).ln() / (1.0 - w.powi(s as i32)).ln()).ceil() as usize;

    let mut rng = rand::thread_rng();
    let indices: Vec<usize> = (0..points.len()).collect();
    let mut best: Option<(M, Vec<usize>)> = None;

    for _ in 0..k {
        let picks: Vec<usize> = indices.choose_multiple(&mut rng, s).copied().collect();
        let sample: Vec<&M::Point> = picks.iter().map(|&i| &points[i]).collect();
        let Some(theta) = M::fit_minimal(&sample) else { continue };

        let inliers: Vec<usize> = points
            .iter()
            .enumerate()
            .filter(|(_, p)| theta.residual(p) <= eps)
            .map(|(i, _)| i)
            .collect();

        if best.as_ref().map_or(true, |(_, b)| inliers.len() > b.len()) {
            best = Some((theta, inliers));
        }
    }
    best
}
```

# Remarks

- Complexity: $O(k \cdot N \cdot c_{\mathrm{model}})$, where $k$ is the iteration count, $N$ is the number of data points, and $c_{\mathrm{model}}$ is the cost of one model instantiation plus $N$ residual evaluations.
- Iteration count is exponentially sensitive to $w$: $E[k] = w^{-s}$, so halving $w$ with $s = 4$ raises $E[k]$ from 16 to 256 (§II.B). For $w = 0.2$ and $s = 4$, $E[k] = 625$ — impractical without guided sampling.
- Fat-tailed convergence: $\mathrm{SD}(k) \approx E[k]$ for small $w^s$ (§II.B), so $k = E[k]$ yields only ~63% success probability. Production budgets $3$–$5\times E[k]$ trials.
- Founding application — the Location Determination Problem (§IV.B–E): camera pose from aerial-image landmark correspondences, $w \in \{0.8, 0.6\}$, achieved accuracy X: 0.1 ft, Y: 6.4 ft, Z: 2.1 ft, Heading: 0.01°, Pitch: 0.10°, Roll: 0.12° on a 4000 ft real-image benchmark.
- See [`ransac`](/atlas/ransac) for the four design axes — sampling, verification, local optimisation, threshold treatment — that organise the modern RANSAC family.

# References

1. M. A. Fischler, R. C. Bolles. *Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography.* Communications of the ACM, 24(6):381–395, 1981. [dl.acm.org](https://dl.acm.org/doi/pdf/10.1145/358669.358692)
