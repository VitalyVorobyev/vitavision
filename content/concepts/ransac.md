---
title: "RANSAC"
date: 2026-05-03
summary: "Random sample consensus — a paradigm for fitting a parametric model to data containing an unknown fraction of gross outliers, by drawing minimal random subsets, instantiating candidate models, and selecting the one with the largest globally consistent inlier set."
tags: ["geometry", "robust-estimation", "outlier-rejection", "model-fitting"]
author: "Vitaly Vorobyev"
domain: geometry
difficulty: intermediate
prerequisites: []
sources:
  references:
    - fischler1981-ransac
    - raguram2013-usac
    - barath2019-magsac
---

# Definition

Random Sample Consensus (RANSAC) is a meta-algorithm for fitting a parametric model to data that contains an unknown fraction of gross errors (outliers). A minimal random subset of $s$ data points is drawn, a model is instantiated from it, and the size of the globally consistent subset — the consensus set — is measured. Iteration continues until a consensus set of sufficient size is found or a trial budget is exhausted.

The required number of trials to guarantee, with probability $p$, that at least one drawn sample is outlier-free is:

$$
N = \frac{\log(1 - p)}{\log(1 - w^s)}
$$

where $s$ is the minimal sample size (the number of points required to instantiate the model), $w$ is the inlier ratio (the fraction of data points consistent with the true model to within tolerance $\varepsilon$), and $p$ is the desired success probability (typically 0.95 or 0.99).

# Decision table

The RANSAC family is alive in three forms, each a different point in the design-axis space defined in the next section. Author choice is per-problem, not historical.

| | [Fischler–Bolles 1981](/atlas/fischler-bolles-ransac) | [USAC 2013](/atlas/raguram-usac) | [MAGSAC 2019](/atlas/barath-magsac) |
|---|---|---|---|
| **Sampler** | uniform random | PROSAC (quality-ordered) | uniform / Progressive NAPSAC |
| **Verifier** | full consensus count | SPRT early reject ($\Lambda_j > A$) | $\sigma$-loop with SPRT pre-screen |
| **Local optimisation** | optional least-squares re-fit | inner-RANSAC / Lo-RANSAC ($10$–$20$ iters) | IRLS on marginal-likelihood weights |
| **Inlier threshold** | fixed scalar $\varepsilon$ | fixed scalar $\varepsilon$ | marginalised $\sigma \in [0, \sigma_\mathrm{max}]$ |
| **Degeneracy handling** | not bundled | DEGENSAC for fundamental matrix | inherited from underlying solver |
| **Best for** | foundational baseline; teaching; problems with clean $\varepsilon$ tune | speed-critical pipelines; fundamental-matrix with planar degeneracy | scenes with unknown or scene-varying noise scale; geometric accuracy on real data |

For the per-pair tradeoff between USAC and MAGSAC, see the [`When to choose USAC over MAGSAC`](/atlas/raguram-usac#when-to-choose-usac-over-magsac) section on the USAC page (hosted there per the older + broader-scope tiebreaker).

# Mathematical Description

## Iteration count

The derivation follows from the geometric series identity. The probability that a single draw of $s$ points is all-inlier is $w^s$. The probability that all $N$ draws fail is $(1 - w^s)^N$. Setting $1 - (1 - w^s)^N \geq p$ and solving for $N$ gives the formula above.

The expected number of trials before the first all-inlier draw is

$$
E[k] = w^{-s},
$$

and the standard deviation is

$$
\mathrm{SD}(k) = \frac{\sqrt{1 - w^s}}{w^s}.
$$

For small $w^s$, $\mathrm{SD}(k) \approx E[k]$: the distribution of trials-to-success has a fat tail. Setting $N = E[k]$ yields only approximately 63% success probability; $p = 0.99$ requires $N \approx 4.6 \times E[k]$ in the worst case. For $p = 0.99$, $w = 0.5$, $s = 4$: $N \approx 72$, with $E[k] = 16$.

The three free parameters governing a RANSAC run are $\varepsilon$ (the inlier-distance threshold), $N$ (the number of trials, set via the formula above), and $t$ (the minimum consensus-set size required for acceptance). The acceptance threshold is set so that $t - s = 5$ when the probability of an outlier lying within $\varepsilon$ of an incorrect model is below 0.5; this gives greater than 95% probability of rejecting an incorrect model.

## The four design axes of practical RANSAC

**Sampling.** The founding paper draws each minimal sample uniformly at random from the full data set. Subsequent variants exploit external quality signals. PROSAC sorts data points by a quality score (e.g., feature-match similarity) and draws progressively from the top-ranked subset, expanding toward the full set after $T_N$ total draws; this produces all-inlier samples far earlier in the sequence while retaining the same asymptotic guarantees. NAPSAC biases sampling toward spatially proximate points. Progressive NAPSAC combines quality ordering with spatial proximity. USAC-1.0 uses PROSAC as its default sampler; the sampling stage is independently swappable.

**Model verification.** Standard RANSAC evaluates all $N$ data points against each candidate model. R-RANSAC with SPRT (Sequential Probability Ratio Test) accumulates the likelihood ratio

$$
\Lambda_j = \prod_{r=1}^{j} \frac{p(x_r \mid H_b)}{p(x_r \mid H_g)},
$$

where $H_g$ is the hypothesis that the current model is correct (inlier probability $\approx \varepsilon$) and $H_b$ is the hypothesis that it is not (inlier probability $\delta$). When $\Lambda_j$ exceeds a decision threshold $A$ derived from the acceptable type-I error $\alpha$ and type-II error $\beta$, the model is rejected early without evaluating the remaining points. SPRT achieves a 2–9× runtime improvement over standard verification on homography and fundamental-matrix benchmarks. USAC-1.0 reuses SPRT; MAGSAC also reuses it as a pre-screen.

**Local optimisation.** The founding paper optionally re-fits the model by least squares on the accepted consensus set; the quality of the re-fit depends on the consensus set size. LO-RANSAC applies inner-RANSAC within each accepted hypothesis: nonminimal samples are drawn from the current inlier set, each candidate is refined by iteratively reweighted least squares, and the best result is retained. USAC-1.0 implements local optimisation as an outer-stage block, running 10–20 inner iterations with an early exit when the inlier set overlaps the previous best by ≥95%. Local optimisation reduces the number of required outer iterations by a factor of 2–3.

**Inlier-threshold treatment.** The founding paper uses a fixed scalar $\varepsilon$: each point is classified as inlier if its residual $\mathrm{dist}(p, M) \leq \varepsilon$ and outlier otherwise. This hard boundary is sensitive to threshold calibration and to scene-to-scene variation in noise scale $\sigma$. MAGSAC eliminates the fixed threshold by treating $\sigma$ as a random variable with a uniform prior on $[0, \sigma_\mathrm{max}]$ and marginalising the RANSAC quality function over it:

$$
Q^*(\theta, P) = \frac{1}{\sigma_\mathrm{max}} \int_0^{\sigma_\mathrm{max}} Q(\theta, \sigma, P)\, d\sigma.
$$

Per-point weights $L(p \mid \theta)$ are the marginalised inlier likelihoods; the final model is a weighted least-squares fit with those weights ($\sigma$-consensus). The $\sigma$ range is discretised into $d = 10$ uniform partitions, reducing cost from $O(K)$ to $O(d)$ model re-fits per hypothesis. For $\chi^2(4)$ residuals (2D point correspondences), the effective inlier threshold at each $\sigma_i$ is $\tau(\sigma_i) = 3.64\,\sigma_i$.

# Numerical Concerns

- **Exponential growth of $N$ in $1/w$.** The iteration count $N = \log(1-p) / \log(1 - w^s)$ is exponentially sensitive to the inlier ratio $w$ and the minimal sample size $s$. For $s = 4$, halving $w$ from 0.5 to 0.25 drives $E[k]$ from 16 to 256. At $w = 0.2$, $s = 4$: $E[k] = 625$, rendering the algorithm impractical in real time without guided sampling such as PROSAC. A 0.1 under-estimate of $w$ from 0.5 to 0.4 at $s = 4$ already doubles $E[k]$ from 16 to 39.
- **Inlier-threshold calibration.** The hard threshold $\varepsilon$ mediates the signal-to-noise boundary. Too small an $\varepsilon$ misclassifies genuine inliers, shrinking consensus sets below $t$ and causing false failure. Too large an $\varepsilon$ admits outliers into the consensus set, corrupting the re-fit. The founding paper recommends setting $\varepsilon$ to 1–2 standard deviations of the measurement noise; for 2D symmetric transfer error with Gaussian noise $\sigma \approx 1\,\mathrm{px}$, the chi-square inversion gives $t \approx 2.45\,\mathrm{px}$. A $2\times$ error in $\sigma$ propagates to a $4\times$ change in $t^2$, suppressing or inflating the inlier count dramatically.
- **Degenerate minimal samples.** If the $s$ randomly drawn points are in a degenerate configuration (e.g., four collinear points when fitting a homography, or five correspondences on a common 3D plane when fitting the fundamental matrix), the instantiated model is ill-defined or rank-deficient. The founding paper does not include a degeneracy rejection step; practitioners must add this guard. USAC-1.0 includes DEGENSAC, which detects when ≥ 5 of the 7 correspondences in a fundamental-matrix minimal sample are related by a homography and applies a model-completion step.
- **Fat-tailed convergence distribution.** Because $\mathrm{SD}(k) \approx E[k]$ for small $w^s$, the actual number of trials to success can be many times the expected value. Setting $N = E[k]$ yields only approximately 63% success probability. Production implementations should budget at least $3$–$5\times E[k]$ trials.
- **SPRT verifier sensitivity.** The SPRT decision threshold $A$ is derived from the type-I error rate $\alpha$ and type-II error rate $\beta$. If $\delta$ — the probability of a random point fitting an incorrect model — is over-estimated, $A$ is set too low, causing premature rejection of correct hypotheses and degrading the stopping criterion. The online update in USAC-1.0 partly corrects mis-specified initial $\delta$, but early iterations accumulate stopping-criterion error. The nonrandomness significance level $\gamma = 0.05$ used in USAC-1.0's stopping-criterion computation is a hard-coded constant; tightening to 0.01 requires more samples.
- **Discretisation step in MAGSAC.** The $\sigma$-consensus integral is approximated over $d = 10$ uniform partitions of $[0, \sigma_\mathrm{max}]$. For $\sigma_\mathrm{max} = 10$ pixels the first partition boundary is 1 px, matching the SPRT pre-screen reference threshold $\tau_\mathrm{ref} = 1$ pixel. Values of $d$ below 5 may underweight high-$\sigma$ components. The integrand involves $\exp(-D^2 / 2\sigma_i^2)$, which underflows in float32 when $D^2/2\sigma_i^2 > {\sim}88$; for $\sigma_i = \sigma_\mathrm{max}/10 = 1\,\mathrm{px}$ this occurs at $D > {\sim}13\,\mathrm{px}$, safely beyond the $\tau(\sigma_\mathrm{max})$ gate, so float32 is workable.

# Where it appears

RANSAC underpins every estimation step in the atlas where correspondences may contain outliers.

**Two-view geometry estimation.** [`homography`](/atlas/homography) and [`epipolar-geometry`](/atlas/epipolar-geometry) describe models estimated from point correspondences; RANSAC is the standard outer loop for both. [`fundamental-matrix-eight-point`](/atlas/fundamental-matrix-eight-point) uses RANSAC with the 8-point (or 7-point) minimal solver to reject wrong matches. [`dlt-normalisation`](/atlas/dlt-normalisation) documents the linear solver that RANSAC calls per hypothesis.

**Camera calibration.** [`zhang-planar-calibration`](/atlas/zhang-planar-calibration) uses RANSAC to reject corner detections that are inconsistent with the estimated homography per view. [`tsai-lenz-handeye`](/atlas/tsai-lenz-handeye) and [`daniilidis-dual-quaternion-handeye`](/atlas/daniilidis-dual-quaternion-handeye) both depend on robust estimation from correspondences that may include outlier motions.

**Image stitching.** [`apap-image-stitching`](/atlas/apap-image-stitching), [`gao-dual-homography-stitching`](/atlas/gao-dual-homography-stitching), [`lin-sva-stitching`](/atlas/lin-sva-stitching), and [`spatially-varying-image-stitching`](/atlas/spatially-varying-image-stitching) all use RANSAC to estimate a global or multi-model homography from feature matches before applying spatially-varying refinement.

**Other.** [`chessboard-x-corner-detection`](/atlas/chessboard-x-corner-detection) applies RANSAC to enforce grid consistency on detected corners. [`scale-space`](/atlas/scale-space) is a prerequisite for the feature detectors whose outputs feed RANSAC as correspondences. [`kumar-generalized-rac`](/atlas/kumar-generalized-rac) uses RANSAC in its outlier-filtering step. The deep-learning model pages [`ccdn-checkerboard-detector`](/atlas/ccdn-checkerboard-detector), [`ccs-camera-calibration`](/atlas/ccs-camera-calibration), and [`mate-checkerboard-detector`](/atlas/mate-checkerboard-detector) all compare their accuracy against classical baselines that use RANSAC as the robust estimator.

## Surveyed methods

The three methods that anchor the design space have dedicated algorithm pages:

- [`fischler-bolles-ransac`](/atlas/fischler-bolles-ransac) — the founding paradigm: uniform sampling, full-consensus verification, optional least-squares re-fit, fixed scalar threshold $\varepsilon$. CACM, 1981.
- [`raguram-usac`](/atlas/raguram-usac) — the unifying engineering framework: PROSAC sampler, SPRT verifier, Lo-RANSAC inner loop, DEGENSAC degeneracy module, fixed scalar threshold $\varepsilon$. PAMI, 2013.
- [`barath-magsac`](/atlas/barath-magsac) — sigma-consensus: marginalises the inlier threshold over a noise-scale prior, IRLS-refits the model on per-point marginal-likelihood weights. CVPR, 2019.

The decision table at the top of this page summarises their per-axis choices; the per-pair tradeoff is captured in [`raguram-usac#when-to-choose-usac-over-magsac`](/atlas/raguram-usac#when-to-choose-usac-over-magsac).

# References

1. M. A. Fischler, R. C. Bolles. *Random Sample Consensus: A Paradigm for Model Fitting with Applications to Image Analysis and Automated Cartography.* Communications of the ACM, 1981. [dl.acm.org](https://dl.acm.org/doi/pdf/10.1145/358669.358692)
2. R. Raguram, O. Chum, M. Pollefeys, J. Matas, J.-M. Frahm. *USAC: A Universal Framework for Random Sample Consensus.* IEEE TPAMI, 2013. [ieeexplore.ieee.org](https://ieeexplore.ieee.org/document/6365642)
3. D. Barath, J. Matas, J. Noskova. *MAGSAC: Marginalizing Sample Consensus.* CVPR, 2019. [arxiv.org](https://arxiv.org/abs/1803.07469)
