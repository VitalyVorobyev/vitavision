---
paper_id: fischler1981-ransac
title: "Random sample consensus: a paradigm for model fitting with applications to image analysis and automated cartography"
authors: [M. A. Fischler, R. C. Bolles]
year: 1981
url: https://dl.acm.org/doi/pdf/10.1145/358669.358692
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

**Problem class:** Robust parameter estimation from a data set that contains an unknown but potentially large fraction of gross errors (outliers). The method is applicable to any problem where a parametric model must be fit to observations, and where classical averaging-based techniques (least squares, M-estimators) fail because the outlier fraction exceeds what these techniques can tolerate.

**Primary worked example in the paper:** The Location Determination Problem (LDP). Given a set of m landmarks (control points) whose 3-D world coordinates are known, and an image in which some subset of those landmarks is visible, determine the 3-D position of the camera's Centre of Perspective (CP). This is equivalent to the perspective-n-point (PnP) problem: find the lengths of the rays from the CP to each landmark. The paper proves (§III.A) that the minimum n for a unique solution is n = 3 (P3P), subject to a non-degeneracy condition on the control-point geometry.

**Inputs:** A set P of data points (|P| ≥ n, the minimum sample size), an instantiation procedure that fits a model from exactly n points, an error-tolerance ε for deciding whether a datum is consistent with a model, a desired success probability z, and a prior estimate w of the inlier fraction.

**Outputs:** The model parameters M* estimated from the largest consistent subset of P (the consensus set), plus a residual error estimate. The paper does not guarantee a globally optimal fit; it gives a probabilistically correct solution with controllable failure probability.

# Core idea

RANSAC inverts the strategy of classical smoothing. Instead of fitting a model to all data and iteratively pruning the worst residual, it starts from the smallest possible subset, tests for global consistency, and enlarges only on success.

**The loop** (§II formal statement):
1. Randomly draw a minimal subset S_i of n data points from P.
2. Instantiate model M_i from S_i.
3. Identify the consensus set S_i* = { p ∈ P : dist(p, M_i) ≤ ε }.
4. If |S_i*| ≥ threshold t, accept M_i* (optionally re-fit on S_i* using least squares) and stop.
5. Otherwise repeat; if no consensus set of size ≥ t is found within k trials, return the best M_i found or declare failure.

**Iteration count (§II.B).** Let w = probability that a randomly chosen datum is an inlier (within ε of the true model), n = minimal sample size, z = desired probability that at least one draw contains only inliers. Then:

```
k = log(1 - z) / log(1 - w^n)
```

This is derived in §II.B from the geometric-series identity. Expected number of trials E(k) = w^(−n), so a halving of w with n = 4 drives k from 16 to 256. For z = 0.99 and w = 0.5, n = 4 gives k ≈ 72.

The paper also gives the standard deviation of k: SD(k) = sqrt(1 − w^n) / w^n, which is approximately equal to E(k) for small w^n — meaning the distribution of trials-to-success has a very fat tail. The paper suggests running 2–3× E(k) trials in practice.

The three free parameters are ε (error tolerance), k (number of trials), and t (minimum consensus set size for acceptance).

# Assumptions

1. **Known inlier fraction (soft).** w must be estimated in advance to set k. Over-estimating w under-allocates k and may miss a valid consensus set. Under-estimating w wastes computation but does not harm correctness.
2. **Uniform random sampling (hard).** Each draw is an i.i.d. uniform sample from P. If the first-drawn sample is systematically biased toward outliers (e.g., spatially clustered outliers), the geometric-series derivation of k still holds but convergence may be slow in practice.
3. **Known model structure (hard).** The number of free parameters is fixed and the minimal sample size n is known. RANSAC does not handle variable-structure models.
4. **Error tolerance ε is well-calibrated (hard).** Too small an ε → genuine inliers are misclassified → consensus sets are too small → algorithm declares failure. Too large an ε → outliers contaminate consensus sets → wrong model is accepted. The paper recommends setting ε to 1–2 standard deviations of the measurement noise (§II.A); it can be estimated by perturbing known-good data and measuring implied errors.
5. **Minimal sample is non-degenerate (soft).** If the n randomly drawn points happen to be degenerate (e.g., all collinear when fitting a plane), the instantiated model is ill-defined. The expected fraction of degenerate draws is small for random sampling, but the paper notes this is a recognised pathology (relevant in the P3P context).
6. **Inliers dominate the consensus set (soft).** The consensus set S_i* is used for final least-squares re-fitting. If the threshold t is set too low and the consensus set contains outliers, the re-fitted model degrades. The paper shows (§II.C) that setting t − n = 5 with y < 0.5 (probability a datum lies within ε of the wrong model) gives > 95% probability of rejecting an incorrect model.

# Failure regime

- **Low inlier ratio (catastrophic when w^n is tiny).** k grows as w^(−n). For w = 0.2 and n = 4, E(k) = 625 — effectively infeasible in real-time. The paper's own table (§II.B) shows E(k) = 625 for these parameters; even at n = 3, E(k) = 125. At w < 0.1 RANSAC is impractical without guided sampling (e.g., PROSAC).
- **Degenerate minimal sample.** Fitting a line through two identical points, or a homography from four collinear points, yields a numerically singular or infinite model. The paper notes this for the LDP (P2P gives infinitely many solutions — §III.A) but does not provide a degeneracy rejection step in the core algorithm; practitioners must add this guard.
- **ε mis-calibration.** The paper illustrates (§II.A) that ε cannot always be derived analytically; for complex models it must be estimated empirically. An ε that is even 2× too large can double the contamination rate of the consensus set.
- **Structured outliers.** If outliers are not uniformly distributed but cluster in a region consistent with a different parametric model (a "pseudo-consensus" set), RANSAC may converge to the wrong model if that pseudo-consensus set size exceeds t. This is not discussed in the paper but is a known limitation in image-stitching and feature-matching applications.
- **Fat-tailed convergence distribution.** The paper explicitly warns (§II.B) that SD(k) ≈ E(k) for small w^n, so the actual number of trials to success can be many times the expected value. Setting k = E(k) yields only ≈ 63% success probability; z = 0.99 requires k ≈ 4.6 × E(k) in the worst case.

# Numerical sensitivity

- **w^n is the critical quantity.** The iteration count is exponentially sensitive to both w and n. A small mis-estimate of w propagates multiplicatively via the exponent: for n = 4, a 0.1 under-estimate of w from 0.5 to 0.4 doubles E(k) from 16 to 39 (table in §II.B).
- **ε and the inlier/outlier decision boundary.** The decision dist(p, M) ≤ ε is hard-thresholded. Near the boundary, measurement noise can flip individual points between inlier and outlier across iterations, causing instability in the consensus set size when |S_i*| ≈ t. MAGSAC (2019) later addresses this by replacing the hard threshold with a weighted integral over ε.
- **Closed-form P3P solution (Appendix A).** The paper reduces the perspective tetrahedron to a biquadratic (degree-4) polynomial in x = b/a (leg ratio). Roots are found in closed form or iteratively. The polynomial has real positive roots corresponding to physically valid camera locations; near-degenerate configurations (control points nearly collinear as viewed from the CP) push two roots close together, making the polynomial numerically sensitive. The paper uses double-precision arithmetic implicitly; the iterative alternative (§Appendix A.3) can be more stable but converges to only one root.
- **Consensus-set re-fitting.** The final least-squares step applied to S_i* inherits the conditioning of the underlying estimator. If S_i* barely exceeds n, the re-fit is poorly conditioned. The paper's LDP implementation sets a nominal threshold of t between 7 and m/w (§IV.A, step 5).

# Applicability

- **Use when:** The fraction of gross errors (classification errors from feature detectors, wrong correspondences) is unknown or potentially large (up to ~50% of data). The model has a small minimal sample size n ≤ 6. Speed is secondary to robustness. A reasonable ε can be estimated.
- **Don't use when:** w is known to be very small (< 0.2) and n > 2 — E(k) becomes impractical. The data contain no gross errors (use least squares directly — RANSAC wastes trials and the final consensus-set re-fit adds no benefit). The error distribution has no natural outlier/inlier separation (use M-estimators with a soft loss function instead).
- **Compared against:**
  - *Least squares with iterative pruning ("throwing out the worst residual"):* The paper's Fig. 1 and §IV.C demonstrate that a single poisoned point can corrupt this heuristic, causing it to terminate with 3 gross errors in the final solution. RANSAC recovers the correct model.
  - *Hough transform (mentioned §II introduction context):* The paper positions RANSAC alongside Hough as an alternative paradigm for handling gross errors. Hough is suitable when the parameter space can be efficiently discretised; RANSAC does not require a quantised parameter grid and scales better to high-dimensional models. The paper does not benchmark against Hough quantitatively.
  - *M-estimators:* Implicitly contrasted; M-estimators apply a robust loss but cannot tolerate > ~50% outliers and require a correct initial estimate. RANSAC requires no initialisation.

# Connections

- **Builds on:** none — this is the founding paper for the RANSAC family. The authors cite least squares and the Church method for P3P as prior art being superseded, but RANSAC itself has no identified parent technique.
- **Enables:** PROSAC (progressive sampling using match quality), NAPSAC (neighbourhood-aware sampling), MLESAC (maximum likelihood consensus, replaces inlier count with likelihood score), LO-RANSAC (local optimisation step), USAC (`raguram2013-usac`, a unifying engineering framework over RANSAC variants), MAGSAC (`barath2019-magsac`, marginalisation over the inlier threshold).

# Atlas update plan

## NEW: fischler-bolles-ransac
Type: algorithm
Category: robust-estimation
Primary source: fischler1981-ransac
Prerequisites: [ransac]

Relations:
- `{ type: extended_by, target: raguram-usac, confidence: high, caution: "USAC is a unifying engineering framework, not a single new technique" }`
- `{ type: extended_by, target: barath-magsac, confidence: high, caution: "MAGSAC marginalises the inlier threshold rather than fixing it — orthogonal axis to USAC's framework refactor" }`

**Goal section bullets:**
- Fit a parametric model to data containing a significant fraction of gross errors (outliers), without prior knowledge of which observations are corrupted.
- Outputs model parameters M* and a consensus set — the largest subset of observations consistent with M* to within a user-specified error tolerance ε.
- Historically motivated by the Location Determination Problem (camera pose from 2-D/3-D landmark correspondences where feature detectors introduce classification errors).

**Algorithm section bullets:**
- Three phases: (1) random minimal-sample draw → model instantiation; (2) consensus-set scoring; (3) optional least-squares re-fit on the accepted consensus set.
- Key design parameters: minimal sample size n (determined by the model's degrees of freedom), inlier ratio estimate w, desired success probability z, error tolerance ε, consensus threshold t.
- Iteration bound: k = log(1 − z) / log(1 − w^n). For z = 0.99, w = 0.5, n = 4: k ≈ 72. Expected value E(k) = w^(−n); SD(k) ≈ E(k) for small w^n — distribution is fat-tailed; the paper recommends 2–3× E(k) trials.
- Acceptance threshold t: set t − n = 5 with the assumption that the probability of an outlier falling within ε of the wrong model is y < 0.5; this gives > 95% probability of rejecting an incorrect model (§II.C).

**Implementation section bullets:**
- Guard against degenerate minimal samples (e.g., collinear points when fitting a homography) — the paper does not include this guard but it is necessary in practice.
- ε can be estimated empirically by perturbing known-good data and measuring implied model error (§II.A).
- For the LDP specifically, the P3P sub-problem is solved via the closed-form biquadratic polynomial in Appendix A (up to four real solutions), or via the simpler iterative leg-sliding procedure in §Appendix A.3.
- When the number of good correspondences is unknown, the paper supplies the probability-based stopping criterion; implementations may also use adaptive k that is tightened as better consensus sets are found (not in this paper — introduced in later variants).

**Remarks section bullets:**
- The paper proves that P3P has at most four physically real solutions; P4P can have two when control points are not in a common plane; P6P always has a unique solution when points are in general position (§III, §V). These geometry results are new at publication.
- The fat tail of the trial-count distribution (SD(k) ≈ E(k)) means the practical rule of k = E(k) gives only ~63% success probability; budget at least 3–5× E(k) for production use.
- The consensus-set re-fit with least squares is optional; the paper also mentions averaging parameters from random triples within the consensus set histogram (footnote 1, §IV.A).

## NEW: ransac
Type: concept
Genre: paradigm concept (Phase 1; upgrade to survey concept at Phase 5 when ≥ 3 surveyed papers have research notes)

**Modelled on:** content/concepts/homography.md and content/concepts/epipolar-geometry.md

sources.references: [fischler1981-ransac, raguram2013-usac, barath2019-magsac]
No `primary` source on the concept page (paradigm concept spans multiple sources).

**Body sections at Phase 1:**
- **Definition:** Random Sample Consensus — a meta-algorithm for robust model fitting that tolerates a large fraction of gross errors by repeatedly drawing minimal random subsets, instantiating a model, and measuring global consensus.
- **Iteration count math:** N = log(1 − p) / log(1 − w^s), where p is the desired probability of at least one all-inlier draw, w is the inlier ratio, s is the minimal sample size. Derived in Fischler & Bolles (1981) §II.B from the geometric series identity.
- **The four design axes:** (1) sampling strategy (pure random vs. guided: PROSAC, NAPSAC); (2) inlier verification (hard threshold vs. soft: MLESAC, MAGSAC); (3) local optimisation of accepted hypotheses (none vs. LO-RANSAC); (4) threshold treatment (fixed ε vs. marginalised: MAGSAC). Axis (1) and (2) are identified in the founding paper; (3) and (4) emerged in subsequent work.
- **Where it appears in the Atlas:** prerequisites field of fischler-bolles-ransac, raguram-usac, barath-magsac; retrofit into the 17 candidate pages listed below.
- **No decision table at Phase 1** (deferred to survey-concept upgrade).

## UPDATE: content/algorithms/apap-image-stitching.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/daniilidis-dual-quaternion-handeye.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/fundamental-matrix-eight-point.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/gao-dual-homography-stitching.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/kumar-generalized-rac.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/lin-sva-stitching.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/tsai-lenz-handeye.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/zhang-planar-calibration.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/chessboard-x-corner-detection.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/dlt-normalisation.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/epipolar-geometry.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/homography.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/scale-space.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/spatially-varying-image-stitching.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/ccdn-checkerboard-detector.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/ccs-camera-calibration.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/mate-checkerboard-detector.md
Section: Prerequisites
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

# Provenance

- §I (Introduction, pp. 381–382): motivation from classification errors vs. measurement errors in feature detectors; failure of least-squares pruning illustrated in Figure 1 (line-fitting example with seven points including one gross error at (10, 2)); iterative pruning heuristic terminates with the gross error still included after 4 iterations.
- §II (Random Sample Consensus, p. 383): formal statement of RANSAC paradigm including the three unspecified parameters (ε, k, t); circle-fitting example motivating the minimal-subset strategy.
- §II.A (pp. 383–384): error tolerance discussion; empirical ε estimation via data perturbation; recommendation of 1–2 standard deviations beyond average observed error.
- §II.B (pp. 384–385): derivation of E(k) = w^(−n) via geometric series identity (differentiating a/(1−a) with respect to a); SD(k) formula = sqrt(1 − w^n) / w^n; tabulation of E(k) for w ∈ {0.9, 0.8, …, 0.2} and n ∈ {1, …, 6}; closed-form stopping criterion k = log(1 − z) / log(1 − w^n) with worked example (w = 0.5, n = 4, z = 0.90 → k = 35.7).
- §II.C (pp. 284–285): lower bound on consensus set size t; argument that t − n = 5 with y < 0.5 gives > 95% rejection probability for an incorrect model.
- §II.D (p. 285): RANSAC applied to the Figure 1 line example; w = 0.85, ε = 0.8 units; result: correct six-point consensus set found within two or three trials.
- §III.A (pp. 385–386): PnP geometry; PIP (n=1) and P2P (n=2) give infinitely many solutions; P3P system of three equations [A*] (law of cosines on tetrahedron legs, equations labelled A1–A3 in Appendix A); maximum four real solutions for P3P; unique solution assured for P6P in general position.
- §IV.A (pp. 388–389): RANSAC/LD algorithm implementation; k = log(1 − G) / log(1 − w^3) stopping criterion for LDP (n = 3 draws of 3-tuples → triplets of control-point correspondences); consensus threshold t nominally set between 7 and m/w; footnote 1 mentions histogram-averaging alternative to least squares.
- §IV.B–E (pp. 389–390): experimental results — 50 synthetic LDPs, real aerial image at 4000 ft with 6 in lens (2000 × 2000 grid, ~2 ft/pixel); Table I summary of trial counts for w = 0.8 and w = 0.6; final accuracy: X: 0.1 ft, Y: 6.4 ft, Z: 2.1 ft, Heading: 0.01°, Pitch: 0.10°, Roll: 0.12°.
- Appendix A (pp. 391–393): closed-form P3P solution; reduction to biquadratic polynomial (Eq. A18) with coefficients G0–G4 (Eqs. A19–A23); equations A24–A28 for recovering leg lengths; iterative alternative in §A.3; 3-D CP location procedure in §A.4.
- §V (Concluding Comments, pp. 390–391): characterisation of P3P (≤ 4 real solutions, closed form); open problem of maximum solutions for P4P/P5P; unique solution for P6P.
