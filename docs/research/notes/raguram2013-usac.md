---
paper_id: raguram2013-usac
title: "USAC: A Universal Framework for Random Sample Consensus"
authors: [R. Raguram, O. Chum, M. Pollefeys, J. Matas, J. Frahm]
year: 2013
url: https://ieeexplore.ieee.org/document/6365642
created: 2026-05-03
relevant_atlas_pages:
  - apap-image-stitching
  - daniilidis-dual-quaternion-handeye
  - fundamental-matrix-eight-point
  - gao-dual-homography-stitching
  - kumar-generalized-rac
  - lin-sva-stitching
  - tsai-lenz-handeye
  - zhang-planar-calibration
  - chessboard-x-corner-detection
  - dlt-normalisation
  - epipolar-geometry
  - homography
  - scale-space
  - spatially-varying-image-stitching
  - ccdn-checkerboard-detector
  - ccs-camera-calibration
  - mate-checkerboard-detector
---

# Setting

**Problem class.** Robust model estimation from data contaminated by noise and outliers.
Given N measurements U, an unknown fraction ε are inliers (consistent with the true
model subject to small Gaussian noise); the remainder are outliers with arbitrary
residuals. The goal is to recover the model parameters corresponding to the inlier
population.

**Inputs.** A set of N putative correspondences or data points; a minimal sample size m
(determined by the model class — e.g., 4 for a 2D homography, 7 for the fundamental
matrix); an inlier-outlier threshold t (either specified empirically or derived via the
chi-square formula below); a confidence target η₀ (typically 0.95 or 0.99).

**Outputs.** Best-scoring model parameters θ* and the consensus inlier set I*. Unlike
vanilla RANSAC, USAC additionally returns a locally-refined model that uses nonminimal
samples from I*.

**Context.** By 2013, the literature had produced a large family of RANSAC variants —
PROSAC, NAPSAC, GroupSAC, LO-RANSAC, R-RANSAC with SPRT, DEGENSAC, QDEGSAC — each
improving one aspect of the baseline algorithm in isolation. No unified implementation
allowed them to cooperate. This paper provides that unification: a decomposition of
robust estimation into four pluggable stages and a reference C++ implementation (USAC-1.0)
that wires in the state-of-the-art algorithm for each stage.

# Core idea

USAC replaces the flat hypothesize-and-verify loop of standard RANSAC with a five-stage
pipeline (Fig. 1 in the paper): **(0) Prefiltering → (1) Sample minimal subset →
(2) Generate model(s) → (3) Is the model interesting? → (4) Refine model.** Each stage
is independently swappable; in its most reduced form the implementation reverts to
Algorithm 1 of the paper (standard RANSAC). The stages interact beneficially: nonuniform
sampling (PROSAC) produces spatially-clustered samples that are susceptible to degeneracy,
so the degeneracy module in stage 3 becomes essential; local optimisation in stage 4
breaks out of those spatially-local fits and recovers all true inliers.

**Stage 1 — Sampling (PROSAC).** Data points are sorted by a quality score (e.g.,
feature-match similarity). PROSAC draws samples progressively from the top-ranked subset,
gradually expanding to the full set. After T_N total draws the sample distribution matches
uniform RANSAC. This achieves the same guarantees as RANSAC while producing good
hypotheses far earlier in the sequence.

**Stage 3a — SPRT model verification.** Instead of evaluating all N points against every
candidate model, USAC uses Wald's Sequential Probability Ratio Test (§3.4.3). Given a
partial evaluation of j data points, the likelihood ratio

    Λ_j = ∏_{r=1}^{j}  p(x_r | H_b) / p(x_r | H_g)                        (Eq. 9)

is accumulated, where x_r = 1 if the r-th point is consistent with the model. Under H_g
(good model), p(1|H_g) ≈ ε (the inlier ratio). Under H_b (bad model), p(1|H_b) = δ
(the probability that a random point fits an incorrect model). When Λ_j exceeds a
decision threshold A, the model is rejected early. A is chosen to balance type-I error
(α, probability of rejecting a good model) and type-II error (β, accepting a bad model);
the resulting test minimises the expected number of evaluations. Empirically, SPRT
achieves 2–9× runtime improvement over standard RANSAC verification (§3.4.3); for low
inlier ratios it is ~20% faster than the earlier bail-out test.

**Stage 3b — Degeneracy handling (DEGENSAC).** For fundamental matrix estimation with
the 7-point algorithm, a minimal sample of 7 is degenerate when 5 or more of the 7
correspondences lie on a common 3D plane. USAC-1.0 includes a DEGENSAC check (§3.4.4,
citing [53]): once a candidate model becomes the current best, a test is applied to
detect whether 5+ of the minimal sample points are related by a homography. If so, a
model-completion step searches for non-degenerate off-plane inliers to recover the
correct fundamental matrix. For scenes with a dominant plane, all methods without this
check return an incorrect solution (Table 2, example E).

**Stage 4 — Local optimisation (LO-RANSAC).** Standard RANSAC returns parameters fitted
to a minimal (and therefore noisy) sample. USAC-1.0 applies inner-RANSAC (§3.5.1,
citing [48]): when the current best model is updated, nonminimal samples are drawn from
its inlier set for a fixed number of iterations (typically 10–20), each candidate is
subject to iterative reweighted least squares, and the best refined model is retained.
An overlap test skips local optimisation if the current inlier set overlaps the previous
best by ≥95%. This reduces the number of required RANSAC iterations by a factor of 2–3,
bringing them in line with the theoretical prediction of Eq. (3).

**Stopping criterion with SPRT.** Because SPRT may erroneously reject good models,
the stopping criterion (Eq. 3) must be corrected. The adjusted residual probability is

    Ω = (1 − (1 − α_i)^{1/ε^m})^k                                           (Eq. 13)

where α_i = A_i^{h_i} is the per-test rejection probability for SPRT threshold A_i,
recomputed each time ε̂ and δ̂ are updated (§4.5.2, Eqs. 13–15). This ensures η₀
confidence is maintained despite the stochastic early-rejection.

# Assumptions

1. **Outlier-contaminated Gaussian noise (soft).** The inlier-outlier threshold t is
   derived assuming Gaussian noise with standard deviation σ: t² = χ²_n^{-1}(η) where
   n is the co-dimension of the model (Eq. 5). If residuals deviate strongly from
   Gaussian, t requires empirical tuning.

2. **Known (or estimable) inlier ratio ε for SPRT (soft).** SPRT requires initial
   estimates of ε and δ. USAC-1.0 initialises these conservatively and updates them
   online. Gross mis-specification slows convergence but does not break correctness.

3. **Quality scores available for PROSAC sampling (soft).** The PROSAC stage requires a
   per-point quality ordering (e.g., feature-match similarity scores). When these are
   unavailable or uninformative (repetitive texture, uniform descriptors), PROSAC gains
   vanish and USAC falls back to uniform sampling.

4. **Model class supports the 5-stage decomposition (hard).** Degeneracy detection is
   problem-specific (DEGENSAC covers planar degeneracy in fundamental matrix; a
   different module is needed for homography or essential matrix degeneracies). If no
   degeneracy module is provided for a new model class, USAC cannot handle those cases.

5. **η₀-confidence stopping is achievable (hard).** If ε is so low that k_max is
   reached before the confidence bound is satisfied, the algorithm returns the best
   model found rather than a certified solution. Users must supply a realistic k_max.

6. **Single-model fitting (hard).** USAC targets single-model robust estimation.
   Multi-model problems (J-Linkage, Pearl MRF) are outside the framework; QDEGSAC,
   which performs sequential RANSAC calls to detect degeneracy rank, is described as a
   wrapper around USAC, not a module inside it (§3.4.4).

# Failure regime

**Severe degeneracy without a problem-specific module.** When the USAC degeneracy module
does not cover the actual degenerate configuration, USAC returns the same incorrect
solution as baseline RANSAC. Table 2 of the paper shows that for scenes with dominant
planar structure (example E), RANSAC, SPRT, PROSAC, and LO all return wrong fundamental
matrices; only USAC-1.0, which includes DEGENSAC, recovers the correct solution.

**Low inlier ratio (ε < 10%) with uninformative quality scores.** When PROSAC ordering
brings no benefit, sampling efficiency reverts to that of standard RANSAC and runtimes
can be high. In Table 1 example E, PROSAC-based sampling actually degrades performance
(high runtime, low inlier recovery); USAC-1.0 mitigates this via the other modules, but
cannot fully compensate when sampling is essentially uniform and ε is very low.

**SPRT type-I/type-II error mis-specification.** If the initial estimate of δ (the
probability of fitting an incorrect model) is far off, SPRT may be too aggressive
(rejecting many good models, requiring extra samples) or too permissive (evaluating more
points per model than necessary). The online update partly corrects this, but in the
early iterations the stopping criterion Eq. (15) accumulates errors; the practical impact
is increased sample count rather than wrong results.

**Highly nonlinear model classes.** The QDEGSAC degeneracy framework described in §3.4.4
applies to linear relations only (it measures the rank of the data matrix A). For
nonlinear models the paper provides no general degeneracy strategy; authors must supply
bespoke tests.

**Parallel / distributed settings.** The standard stopping criterion and SPRT update are
designed for sequential evaluation. In GPU or distributed RANSAC, the sample draw
sequence is no longer the same as in Algorithm 1, so the nonrandomness and maximality
conditions in §4.5.1 do not directly apply.

# Numerical sensitivity

**Threshold t.** For Gaussian noise with σ, t² = χ²_n^{-1}(η) (Eq. 5; η typically 0.95,
n = co-dimension of model). For a 2D point-to-line residual (n = 1, 1 DOF) and σ ≈ 1 px,
t ≈ 1.96 px at η = 0.95. For a symmetric transfer error (n = 2), t ≈ 2.45 px for the
same σ. A 2× error in σ produces a 4× change in t², which can suppress or inflate the
inlier count dramatically — the most consequential single parameter choice.

**SPRT threshold A.** A is derived from α (type-I error, good model rejected) and β
(type-II error, bad model accepted) via Wald's formula (§3.4.3). The paper observes that
for homography and fundamental matrix estimation, factor 2–9 runtime improvements are
achievable; however, if δ (the inlier probability under H_b) is over-estimated, A is set
too low, causing premature rejection of correct hypotheses and degrading the stopping
bound.

**Nonrandomness significance level γ.** The nonrandomness test (Eq. 12) uses a p-value
threshold γ = 0.05 (5% significance) to determine the minimum non-random support size
I_n^{min} for each stopping length n. This is a hard-coded constant in §4.5.1 — tightening
it to 0.01 would require more samples; loosening it to 0.10 could accept spurious
solutions early.

**Inner-RANSAC iteration count.** Local optimisation runs for a fixed number of inner
iterations (typically 10–20, §3.5.1). Too few iterations leave the model under-refined;
too many incur unnecessary overhead. The ≥95% inlier-overlap early-exit heuristic
mitigates this in practice.

**Floating-point precision.** The paper does not discuss double vs. float explicitly.
For the homography and fundamental matrix experiments, pixel coordinates are normalized
per the standard DLT practice; without normalisation the condition number of the linear
system is large and single-precision arithmetic loses several significant digits.

# Applicability

- **Use when:** the estimation problem is geometric vision (homography, fundamental
  matrix, essential matrix) with a mix of correct and outlier correspondences; you need
  a single, maximally inlying model; inlier ratio may be as low as 10–22% (tested range
  in the paper); run time budget is not extreme-real-time (USAC-1.0 produces solutions
  in milliseconds on CPU, not microseconds). USAC is the right default when correctness
  and stability matter more than absolute minimum latency.

- **Use when:** you want a modular benchmark where individual RANSAC modules can be
  switched on/off independently (all RANSAC variants in Fig. 2 are special cases of the
  same C++ code path).

- **Don't use when:** multiple model structures are present in the data simultaneously
  (multi-model fitting; use J-Linkage, T-Linkage, or Pearl instead).

- **Don't use when:** the degeneracy type for your model class is not covered by any
  available USAC module and you cannot supply a custom one.

- **Don't use when:** MAGSAC++ or similar threshold-free estimators are available and
  the noise scale σ is genuinely unknown. USAC still requires a user-supplied t. MAGSAC
  marginalises over σ, making it more robust to threshold mis-specification, at the cost
  of a different algorithmic philosophy and higher per-hypothesis computational overhead.

- **Compared against:**
  - **Baseline RANSAC:** USAC is 5×–7,000× faster (Tables 1–3) with higher inlier
    recovery and lower solution variance. No reason to prefer baseline RANSAC if USAC is
    available.
  - **SPRT-only:** Adds sampling and refinement; USAC is uniformly better or equal.
  - **PROSAC-only:** PROSAC is sometimes marginally faster than USAC-1.0 but produces
    spatially-clustered, degenerate, and unstable solutions (lower true-inlier fraction).
  - **LO-only:** Near-identical inlier recovery to USAC-1.0; USAC additionally handles
    degeneracy.
  - **MAGSAC (Barath 2019):** An orthogonal advancement — MAGSAC marginalises the
    inlier-outlier threshold via a truncated chi-squared model, while USAC is a
    framework for assembling sampling + verification + refinement + degeneracy modules.
    The two ideas compose: MAGSAC++ incorporates a local-optimisation stage similar to
    USAC's. USAC is broader (framework); MAGSAC++ is a specific estimator with superior
    threshold-agnosticism. Prefer MAGSAC++ when σ is unknown; prefer USAC when a
    well-calibrated t is available and modularity / benchmarking are important.

# Connections

- **Builds on:** [fischler1981-ransac] (the base algorithm and stopping-criterion formula
  Eq. 3); Chum & Matas "Optimal Randomized RANSAC" (SPRT, ref [17] in paper = [50] in
  paper for SPRT); Chum, Matas & Kittler "Locally Optimised RANSAC" (LO-RANSAC, [48]);
  Chum, Werner & Matas "Two-View Geometry Estimation Unaffected by a Dominant Plane"
  (DEGENSAC, [53]); Frahm & Pollefeys "RANSAC for (Quasi-)Degenerate Data" (QDEGSAC,
  [54]); Chum & Matas "Matching with PROSAC" (PROSAC, [44]); Wald "Sequential Analysis"
  (SPRT foundation, [51]).

- **Enables:** Downstream applied uses of robust estimation in homography estimation,
  fundamental matrix estimation, essential matrix estimation, and hand-eye / camera
  calibration in noisy real-world settings. USAC-1.0 itself was used as the robust
  estimator in large-scale structure-from-motion pipelines (Rome in a Day lineage, [9]–
  [12]). The framework design is the conceptual predecessor to MAGSAC and MAGSAC++ which
  adopt the same modular philosophy.

# Atlas update plan

## NEW: raguram-usac
Type: algorithm
Category: robust-estimation
Primary source: raguram2013-usac
Prerequisites: [ransac]

Relations:
- `{ type: compared_with, target: barath-magsac, confidence: high }`
  (USAC hosts the comparison: USAC is older and broader in scope per the tiebreaker rule.)

Note: The `extended_by` edge from `fischler-bolles-ransac` to `raguram-usac` is authored
on the Fischler-Bolles page. The build will emit `extending: [fischler-bolles-ransac]` on
this page automatically — do not add a reverse edge here.

**Goal section bullets:**
- Robust model estimation in the presence of outliers; specifically, single-model
  fitting for geometric vision problems (homography, fundamental matrix, essential
  matrix, calibration) where the inlier ratio may be as low as 10%.
- USAC is the engineering synthesis of the RANSAC family: it unifies PROSAC sampling,
  SPRT model verification, LO-RANSAC refinement, and DEGENSAC degeneracy handling into
  a single modular C++ framework. Tested inlier-ratio range: 10–92% across homography,
  fundamental matrix, and essential matrix benchmarks.

**Algorithm section bullets:**
- **Four-module decomposition (Fig. 1):** (1) Sample minimal subset — PROSAC quality-
  ordered sampling; (2) Model generation + model check (chirality, oriented epipolar);
  (3) Model verification — SPRT likelihood-ratio test with online update of ε̂ and δ̂;
  Degeneracy detection — DEGENSAC planar-degeneracy check for fundamental matrix;
  (4) Local optimisation — inner-RANSAC with iterative reweighted least squares on the
  inlier set.
- **SPRT (Eq. 9):** Λ_j = ∏ p(x_r|H_b) / p(x_r|H_g). Model rejected when Λ_j > A.
  Decision threshold A derived from acceptable type-I error α and type-II error β.
  Parameters ε and δ initialised conservatively, updated online.
- **Stopping criterion with SPRT correction (Eq. 13):** Ω = (1 − (1 − α_i)^{1/ε^m})^k.
  Ensures η₀-confidence despite stochastic model rejection.
- **Local optimisation (§3.5.1):** 10–20 inner-RANSAC iterations drawing nonminimal
  samples from current inlier set; early-exit if ≥95% overlap with previous best inlier
  set.
- **Degeneracy (§3.4.4 / §5.2):** DEGENSAC checks whether ≥5 of the 7 correspondences
  in a fundamental-matrix minimal sample are related by a homography; if degenerate,
  a model-completion step finds off-plane inliers.

**Implementation section bullets:**
- Threshold t: use Eq. (5), t² = χ²_n^{-1}(0.95), with n = co-dimension of model.
  For symmetric 2D transfer error (n = 2) and σ ≈ 1 px, t ≈ 2.45 px.
- SPRT parameters: initialise ε̂ conservatively (worst-case inlier ratio); initialise
  δ̂ ≈ 0.05 and update online. Monitor α_i per Eq. (14); if δ̂ is badly mis-specified
  in early iterations, more hypotheses are drawn than theoretically necessary.
- Inner-RANSAC overlap threshold: the paper uses ≥95% inlier overlap as the skip
  criterion for local optimisation (§4.4).
- PROSAC requires per-point quality scores; without these, fall back to uniform sampling
  (module disabled). For feature matching, the descriptor similarity score is used.

**Remarks section bullets:**
- **When to choose USAC over MAGSAC:** USAC requires a calibrated inlier-outlier
  threshold t (either from domain knowledge or Eq. 5 given σ). When σ is well-known
  (calibrated camera, known sensor noise) and modularity or benchmarking flexibility
  are important, USAC is the right choice. MAGSAC++ marginalises over t via a truncated
  chi-squared model, making it more robust to threshold mis-specification — prefer
  MAGSAC++ when σ is genuinely unknown or varies across the dataset. The two
  philosophies compose: MAGSAC++ adopts a local-optimisation stage analogous to USAC's
  stage 4. See also: [barath-magsac] for the threshold-free perspective.
- Runtime improvements over baseline RANSAC: 5×–7,000× on homography and fundamental
  matrix benchmarks (Tables 1–2), with inlier recovery close to 100% of true inliers
  due to local optimisation (Fig. 3).
- The C++ library (USAC-1.0) is modular: each module can be independently enabled,
  allowing isolated evaluation of e.g. SPRT-only or PROSAC-only effects. Published at
  http://cs.unc.edu/~rraguram/usac (as of 2013; check for maintained forks).

## UPDATE: content/algorithms/apap-image-stitching.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/daniilidis-dual-quaternion-handeye.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/fundamental-matrix-eight-point.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/gao-dual-homography-stitching.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/kumar-generalized-rac.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/lin-sva-stitching.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/tsai-lenz-handeye.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/zhang-planar-calibration.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/chessboard-x-corner-detection.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/dlt-normalisation.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/epipolar-geometry.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/homography.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/scale-space.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/spatially-varying-image-stitching.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/ccdn-checkerboard-detector.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/ccs-camera-calibration.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/mate-checkerboard-detector.md
Section: Prerequisites / Frontmatter
- Once the `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

# Provenance

All claims are traced to the published text (IEEE TPAMI Vol. 35, No. 8, August 2013,
pp. 2022–2038). Page references use the journal page numbers in the PDF header.

- **Abstract (p. 2022):** "USAC extends the simple hypothesize-and-verify structure of
  standard RANSAC to incorporate a number of important practical and computational
  considerations." — basis for the four-module framing.

- **Eq. (1)–(2), §2.2.1 (p. 2022):** Standard RANSAC objective function C = Σ ψ(eᵢ²),
  ψ(eᵢ²) = 1 if eᵢ² ≤ t², else 0. Basis for threshold t discussion.

- **Eq. (3), §2.2.3 (p. 2022):** k ≥ log(1−η₀) / log(1−ε^m). Minimum sample count.
  "0 [η₀] is typically set to 0.95 or 0.99."

- **Eq. (4) / Poisson approximation (p. 2023):** λ ≥ 3 expected successes for η₀ = 0.95
  confidence. Basis for the claim that ~3 good samples are drawn on average.

- **Eq. (5), §2.2.4 (p. 2023):** t² = χ²_n^{-1}(η), threshold from chi-square
  distribution. "a true inlier will be incorrectly rejected only 5 percent of the time"
  at η = 0.95.

- **Fig. 1 and §3 (pp. 2025–2031):** Full USAC framework decomposition into stages 0–4
  with optional sub-stages (1a sampling, 1b sample check, 2a generation, 2b model check,
  3a verification, 3b degeneracy, 4 refinement).

- **§3.2.2 (p. 2026):** PROSAC description. "PROSAC is designed to draw the same samples
  as RANSAC, but in a more meaningful order."

- **§3.4.3 and Eq. (9) (p. 2028):** SPRT likelihood ratio Λ_j = ∏ p(x_r|H_b)/p(x_r|H_g).
  "The decision threshold A is the main parameter of the SPRT test."
  "factor 2-9 runtime improvement over standard RANSAC" (for multiview geometry, §3.4.3).
  SPRT is "approximately 20 percent faster than the bail-out test for more challenging
  problems with lower inlier ratios" (§3.4.3).

- **§3.4.4 / DEGENSAC (p. 2029):** "a specific test was devised that aimed to identify
  samples where five or more correspondences in a minimal sample are related by a
  homography." Source: DEGENSAC [53] = Chum, Werner, Matas CVPR 2005.

- **Eq. (6), §3.4, Stage 3a (p. 2028):** t = k(t_M + m_S · t_V) — runtime decomposition.

- **§3.5.1 (p. 2029):** "typically 10-20" inner-RANSAC iterations. Inner-RANSAC +
  iterative refinement "reduces the number of iterations in RANSAC by a factor of 2-3."

- **§4.1 (p. 2030):** "PROSAC is more easily applicable in the general case than GroupSAC,
  and less susceptible to degenerate configurations than NAPSAC." Justification for
  choosing PROSAC in USAC-1.0.

- **Eq. (11)–(12), §4.5.1 (p. 2031):** Nonrandomness probability p_n(i) (binomial);
  I_n^{min} computed with significance level γ = 0.05. Stopping length n* minimises k_n
  subject to the nonrandomness constraint.

- **Eq. (13)–(15), §4.5.2 (pp. 2031–2032):** Stopping-criterion adjustment for SPRT:
  Ω = (1 − (1 − α_i)^{1/ε^m})^k; α_i = A_i^{h_i}; h_i from Eq. (14).

- **§4.4 (p. 2030):** ≥95% inlier-overlap skip heuristic for local optimisation.

- **Table 1 / §5.1 (pp. 2032–2033):** Homography benchmarks, inlier ratios 10–46%.
  "effective speedups ranging between 5x-520x compared to RANSAC."

- **Table 2 / §5.2 (pp. 2033–2035):** Fundamental matrix benchmarks. "up to 4-7,000
  speedups compared to RANSAC" (text on p. 2033 rounds to "4-7;000" in OCR, meaning
  4,000–7,000×). Example E: scene with dominant plane — "all techniques that do not
  account for degeneracy return incorrect solutions."

- **Fig. 2 and §4 (pp. 2030–2032):** USAC-1.0 module choices — PROSAC (§4.1), SPRT
  (§4.3), DEGENSAC (§4.3), Lo-RANSAC (§4.4).

- **Reference [7] (p. 2036):** Fischler & Bolles 1981 — the original RANSAC paper.
  "The RANSAC algorithm was originally proposed by Fischler and Bolles [7]."

- **Reference [44] (p. 2036):** Chum & Matas, PROSAC, CVPR 2005.

- **Reference [48] (p. 2036):** Chum, Matas & Kittler, LO-RANSAC, DAGM 2003.

- **Reference [50] (p. 2036):** Matas & Chum, SPRT, ICCV 2005.

- **Reference [51] (p. 2036):** Wald, Sequential Analysis — theoretical basis for SPRT.

- **Reference [53] (p. 2037):** Chum, Werner & Matas, DEGENSAC, CVPR 2005.

- **Reference [54] (p. 2037):** Frahm & Pollefeys, QDEGSAC, CVPR 2006.
