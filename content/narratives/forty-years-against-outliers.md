---
title: Forty Years Against Outliers
date: 2026-09-15
summary: "How robust two-view geometry advanced by changing what the estimator distrusts: the algebra, then the numerics, then gross outliers, and finally the fixed inlier threshold itself."
tagline: Four decades of deciding which correspondences to believe.
tags:
  - geometry
  - classical
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: geometry
    label: Epipolar geometry
  - id: algebra
    label: Linear solvers
  - id: numerics
    label: Conditioning
  - id: robust
    label: Robust estimation
  - id: thresholds
    label: Thresholds and beyond
nodes:
  - id: epipolar-geometry
    page: epipolar-geometry
    area: geometry
    role: bridge
    takeaway: A point seen in one view must lie on a specific line in the other, fixed entirely by camera position — the constraint every algorithm below tests residuals against, reducing 2-D correspondence search to a 1-D line search.
  - id: svd-null-space
    page: svd-null-space
    area: algebra
    role: survey
    takeaway: Stack one homogeneous linear equation per correspondence and take the design matrix's smallest right-singular vector — the shared computational step behind every linear estimator here, from the 8-point algorithm to the homography DLT.
  - id: longuet-higgins-eight-point
    page: longuet-higgins-eight-point
    area: algebra
    role: origin
    takeaway: Eight calibrated correspondences fix the essential matrix Q=R·skew(T) up to scale via one linear solve, replacing Thompson's iterative five-point method — but only for calibrated coordinates, where conditioning is not yet a problem.
    remark: "Preserved as quality: historical — the citation root for the bilinear epipolar constraint, superseded for practical use by the next node."
  - id: dlt-normalisation
    page: dlt-normalisation
    area: numerics
    role: survey
    takeaway: Translate each point set to its centroid and rescale so the mean distance to the origin is √2 before running any DLT — a two-line fix that drops the design matrix's condition number by roughly eight orders of magnitude.
  - id: fundamental-matrix-eight-point
    page: fundamental-matrix-eight-point
    area: numerics
    role: fix
    takeaway: Applies Longuet-Higgins's linear system to uncalibrated pixel coordinates by preconditioning with normalisation first, turning a system with condition number ~10^11–10^13 into one within experimental reach of the iterative gold standard.
    remark: Not a minimal solver — RANSAC's per-hypothesis sampler uses the 7-point (or 5-point, calibrated) minimal solution; the normalised 8-point is the non-minimal refinement step on the consensus set.
  - id: ransac
    page: ransac
    area: robust
    role: survey
    takeaway: Organises the modern robust-estimation family along four independent axes — sampling, verification, local optimisation, and threshold treatment — that the founding paper and its three major extensions each specialise differently.
  - id: fischler-bolles-ransac
    page: fischler-bolles-ransac
    area: robust
    role: origin
    takeaway: Draws a minimal random sample, instantiates a candidate model, counts consensus inliers within a fixed threshold, and keeps the largest consensus set — inverting the classical fit-then-prune regression paradigm entirely.
  - id: lo-ransac
    page: lo-ransac
    area: robust
    role: correction
    takeaway: Runs a local-optimization refit whenever a new best hypothesis appears, correcting the false assumption that a minimal-sample model already matches every inlier — reaching the same termination guarantee in two to three times fewer samples.
  - id: raguram-usac
    page: raguram-usac
    area: robust
    role: survey
    takeaway: Decomposes practical RANSAC into four independently swappable modules — PROSAC sampling, SPRT verification, LO-RANSAC local optimisation, DEGENSAC degeneracy handling — behind one SPRT-corrected stopping criterion, still on a fixed threshold.
    remark: DEGENSAC's model-completion step covers only fundamental-matrix planar degeneracy in USAC-1.0; homography and essential-matrix degeneracy modules are not bundled.
  - id: barath-magsac
    page: barath-magsac
    area: thresholds
    role: frontier
    takeaway: Treats the noise scale σ as a random variable on [0, σ_max] and marginalises the RANSAC quality function over it instead of testing against one fixed threshold, then refits by iteratively reweighted least squares.
    remark: Reuses USAC's SPRT pre-screen and PROSAC sampling; the σ-consensus loop replaces only the threshold-and-refit step, not the sampling or verification stages.
  - id: inlier-threshold-question
    question: When the inlier threshold is marginalised away, what is left to tune, and is the minimal sample still the right unit of hypothesis?
    area: thresholds
    takeaway: USAC still fixes a scalar threshold and still samples a minimal set; MAGSAC removes the threshold but keeps the minimal-sample hypothesis unit — leaving open what the next tunable knob, and the right unit of hypothesis, should be.
edges:
  - from: epipolar-geometry
    to: longuet-higgins-eight-point
    type: prerequisite
  - from: svd-null-space
    to: longuet-higgins-eight-point
    type: prerequisite
  - from: longuet-higgins-eight-point
    to: fundamental-matrix-eight-point
    type: evolution
    label: fixes conditioning
  - from: svd-null-space
    to: fundamental-matrix-eight-point
    type: prerequisite
  - from: dlt-normalisation
    to: fundamental-matrix-eight-point
    type: prerequisite
  - from: epipolar-geometry
    to: fundamental-matrix-eight-point
    type: prerequisite
  - from: ransac
    to: fundamental-matrix-eight-point
    type: prerequisite
  - from: ransac
    to: fischler-bolles-ransac
    type: prerequisite
  - from: fischler-bolles-ransac
    to: lo-ransac
    type: evolution
    label: adds local optimisation
  - from: fischler-bolles-ransac
    to: raguram-usac
    type: evolution
    label: unifies framework
  - from: fischler-bolles-ransac
    to: barath-magsac
    type: evolution
    label: marginalises threshold
  - from: lo-ransac
    to: raguram-usac
    type: bridge
    label: stage-4 plug-in
  - from: lo-ransac
    to: barath-magsac
    type: contrast
    label: fixed ε vs marginal σ
  - from: raguram-usac
    to: barath-magsac
    type: contrast
    label: orthogonal axes
  - from: barath-magsac
    to: inlier-threshold-question
    type: bridge
    label: raises new question
lenses:
  - id: overview
    title: Overview
    coords:
      epipolar-geometry:
        - 0
        - 0
      svd-null-space:
        - 0.3
        - 1
      longuet-higgins-eight-point:
        - 1
        - 1
      dlt-normalisation:
        - 2.8
        - 2
      fundamental-matrix-eight-point:
        - 3.5
        - 2
      ransac:
        - 0.3
        - 3
      fischler-bolles-ransac:
        - 1
        - 3
      lo-ransac:
        - 4.5
        - 3
      raguram-usac:
        - 6.5
        - 3
      barath-magsac:
        - 8
        - 4
      inlier-threshold-question:
        - 9.5
        - 4
  - id: solver-line
    title: Solver line
    coords:
      epipolar-geometry:
        - 0
        - 0
      svd-null-space:
        - 1
        - 1
      longuet-higgins-eight-point:
        - 2
        - 1
      dlt-normalisation:
        - 3
        - 2
      fundamental-matrix-eight-point:
        - 4
        - 2
  - id: estimator-line
    title: Estimator line
    coords:
      ransac:
        - 0
        - 0
      fischler-bolles-ransac:
        - 1
        - 0
      lo-ransac:
        - 2
        - 0
      raguram-usac:
        - 3
        - 0
      barath-magsac:
        - 4
        - 1
      inlier-threshold-question:
        - 5
        - 1
steps:
  - title: The Algebra of Two Views
    anchor: the-algebra-of-two-views
    claim: Longuet-Higgins collapses relative orientation to one linear solve by exploiting a bilinear constraint between calibrated rays, trading Thompson's iterative five-point method for eight correspondences and a single SVD.
    focus:
      - epipolar-geometry
      - svd-null-space
      - longuet-higgins-eight-point
  - title: Numerics Catch Up
    anchor: numerics-catch-up
    claim: The same linear system that is well-posed on calibrated rays has a condition number of 10^11–10^13 on raw pixel coordinates; Hartley's fix is two lines of preconditioning, not a new formulation of the problem.
    focus:
      - longuet-higgins-eight-point
      - dlt-normalisation
      - fundamental-matrix-eight-point
  - title: Gross Outliers Enter
    anchor: gross-outliers-enter
    claim: Algebraic elegance and numerical conditioning both assume every correspondence is trustworthy; RANSAC discards that assumption by fitting minimal random subsets and keeping whichever model the data votes for.
    focus:
      - ransac
      - fischler-bolles-ransac
  - title: Correcting the Minimal Sample
    anchor: correcting-the-minimal-sample
    claim: Standard RANSAC's termination bound assumes a single uncontaminated minimal sample already fits every inlier — false in practice, so LO-RANSAC re-optimises each new best hypothesis and reaches the same guarantee in two to three times fewer draws.
    focus:
      - fischler-bolles-ransac
      - lo-ransac
  - title: One Engine, Many Parts
    anchor: one-engine-many-parts
    claim: USAC is not a new estimator but an engineering decomposition that makes sampling, verification, local optimisation, and degeneracy handling four independently swappable modules, with LO-RANSAC plugged in directly as stage four.
    focus:
      - lo-ransac
      - raguram-usac
  - title: Marginalising the Threshold
    anchor: marginalising-the-threshold
    claim: MAGSAC removes the one parameter every prior method still hard-coded — the inlier threshold — by treating the noise scale as a random variable and integrating the RANSAC quality function over it, which reopens the question of what a hypothesis unit should even be.
    focus:
      - raguram-usac
      - barath-magsac
      - inlier-threshold-question
---

Robust two-view geometry did not advance by finding one better algorithm; it advanced by relocating distrust. Longuet-Higgins's 1981 linear solution trusted every calibrated coordinate and every input point equally, so the sequence of fixes that follows strips that trust away one layer at a time — first from the algebra's numerical conditioning, then from the individual correspondence, then from the fixed boundary between inlier and outlier — until the hard threshold itself becomes the thing under suspicion.

## The Algebra of Two Views

[Epipolar Geometry](/atlas/epipolar-geometry) supplies the constraint every method below tests residuals against: a point visible in one image must lie on a specific line in the other, reducing stereo correspondence search from 2-D to 1-D. [Longuet-Higgins Linear Eight-Point Algorithm](/atlas/longuet-higgins-eight-point) turns that constraint into arithmetic. Writing $Q = R \cdot \mathrm{skew}(\mathbf{T})$ for the unknown relative pose, the epipolar relation collapses to a bilinear equation $x'^T Q x = 0$, linear in $Q$'s nine entries, and eight calibrated correspondences determine the ratios of the nine $Q$ entries by a single linear solve — replacing Thompson's 1959 five-point method, which required iterating the solution of five simultaneous third-order equations. The unknowns fall out through [SVD Null-Space Estimation](/atlas/svd-null-space): $x^\star = v_n$, the smallest right-singular vector of the stacked correspondence system, the same computational core every later linear estimator in this story reuses.

The scale of $Q$ that the linear system alone leaves undetermined is fixed afterward by the trace constraint $\operatorname{tr}(Q^T Q) = 2$, and rotation and translation are peeled apart from the normalised $Q^T Q$ in closed form — no iteration anywhere in the pipeline. The 1981 paper also names its own degenerate configurations — any four points collinear, any seven points coplanar, six points at the vertices of a regular hexagon, eight points at the vertices of a cube — where the linear system loses rank. It does not, however, need to worry about numerical scale: its inputs are calibrated projective coordinates, so the conditioning problem that defines the next chapter simply does not arise inside its own setting.

## Numerics Catch Up

[Normalised Eight-Point Algorithm](/atlas/fundamental-matrix-eight-point) generalises Longuet-Higgins's linear DLT from the calibrated essential matrix to the uncalibrated fundamental matrix — the same bilinear constraint, now applied to raw pixel coordinates. That change alone breaks the algebra: on typical images the design matrix's condition number runs 10^11–10^13, and the unnormalised linear solution is dominated by floating-point error. Hartley's fix is not a new formulation but two lines of preconditioning, [DLT Normalisation](/atlas/dlt-normalisation): translate so the centroid of the points is at the origin, then isotropically scale so the average distance from the origin is $\sqrt{2}$. Applied before the identical DLT solve, this drops the condition number of $A^T A$ to roughly $10^3$–$10^5$ — a preconditioning gain of roughly eight orders of magnitude.

The payoff is empirical, not just algebraic: at ten or more correspondences the normalised linear estimate becomes "almost indistinguishable" from the iterative gold-standard estimator, while running ~20× faster. Longuet-Higgins's method is preserved as a historical entry for citation lineage, since Hartley's method recovers everything it recovers — plus the strictly larger uncalibrated problem class — for the cost of the normalisation step alone. What both methods still share, though, is the assumption that every correspondence fed into the design matrix is trustworthy. That assumption is the next one to go.

## Gross Outliers Enter

[Fischler–Bolles RANSAC](/atlas/fischler-bolles-ransac) discards it outright. Instead of fitting a model to every correspondence and pruning the worst residuals afterward — fitting all data and pruning residuals iteratively — it draws a minimal random sample, instantiates a candidate model, and counts how many of the remaining points are consistent with it within a threshold, keeping whichever hypothesis wins the largest consensus; only after the winner is chosen does an optional least-squares re-fit on that consensus set improve the final parameters. The founding paper has no identified parent technique; it is the paradigm the rest of this story extends.

The trade is exponential sensitivity to the inlier fraction $w$: the expected number of trials scales as $E[k] = w^{-s}$ for minimal sample size $s$, so for $s=4$, halving $w$ from 0.5 to 0.25 drives $E[k]$ from 16 to 256. [RANSAC](/atlas/ransac) organises everything that follows along four independent design axes — sampling, verification, local optimisation, threshold treatment — that the founding paper and its three major extensions each specialise differently. The founding paper's own consensus re-fit, though, rests on a hidden assumption: that the model a minimal sample produces already fits every true inlier.

## Correcting the Minimal Sample

[Locally Optimized RANSAC (LO-RANSAC)](/atlas/lo-ransac) names that assumption directly and shows it false: the standard termination criterion assumes a model fit from one uncontaminated minimal sample already matches all inliers, an assumption that "rarely holds in practice" because minimal-sample estimates are themselves noisy. The fix inserts a local-optimization step whenever a new best inlier count is found, refitting on a non-minimal sample drawn from the current consensus set instead of trusting the minimal-sample fit outright.

The correction is cheap because it is rare: the $k$-th sample has probability $1/k$ of setting a new record, so the expected number of local-optimization invocations across a run is bounded by $O(\log k)$ — asymptotically negligible against the total sample count. Across five two-view-geometry experiments, standard RANSAC's actual-to-expected sample ratio ranged 2.63–3.35; the best local-optimization variant brought that ratio close to 1.0. The paper states plainly that the modification "makes no new assumptions about the data" and is compatible with, not competing against, other extensions such as MLESAC and NAPSAC — a compatibility that lets the next chapter fold local optimization into a larger machine rather than replace it.

## One Engine, Many Parts

[USAC: Universal RANSAC Framework](/atlas/raguram-usac) does exactly that folding. It is not a new estimator but an engineering decomposition of practical RANSAC into four independently swappable stages: PROSAC quality-ordered sampling, SPRT sequential verification, LO-RANSAC's local optimisation reused directly as its stage-4 module, and DEGENSAC degeneracy handling. SPRT's early-rejection test cuts the mean number of point evaluations per hypothesis by a factor of 2–9 over full consensus counting, corrected by an SPRT-adjusted stopping criterion so the confidence guarantee survives the stochastic early rejections.

DEGENSAC's contribution is narrow but pointed: it detects when $\geq 5$ of the 7 minimal-sample correspondences in a fundamental-matrix draw are secretly related by a homography — a planar degeneracy that silently corrupts every earlier method in this story — and runs a model-completion step to recover the off-plane inliers. The LO-RANSAC stage carries its own separate payoff, reducing the number of required outer iterations by a factor of 2–3 over vanilla RANSAC, and the whole assembly is tested across an inlier-ratio range of 10–92% on homography, fundamental, and essential-matrix benchmarks. What USAC does not touch is the inlier threshold itself: every module in its four-stage decomposition still tests residuals against the same fixed scalar $\varepsilon$ that Fischler and Bolles introduced in 1981. That fixed number is the last untouched assumption.

## Marginalising the Threshold

[MAGSAC: Marginalising Sample Consensus](/atlas/barath-magsac) removes it. Instead of testing each residual against one hard-coded $\varepsilon$, it treats the noise scale $\sigma$ itself as a random variable, uniformly distributed on $[0, \sigma_\mathrm{max}]$, and marginalises the RANSAC quality function over that whole range rather than committing to a single value. The integral is discretised into $d = 10$ uniform partitions of $\sigma$, reducing the fitting cost from $O(K)$ to $O(d)$ model re-fits per hypothesis. The final model is not a re-fit on a hard inlier set at all: it is a weighted least-squares fit using the marginalised inlier likelihoods as IRLS weights. The paper frames this as an empirical refutation of fixed-threshold RANSAC, demonstrated across 545 image pairs where the right noise scale is unknown or varies scene to scene.

The method does not discard everything that came before it — MAGSAC reuses the SPRT pre-screen from USAC and PROSAC ordering for sampling, replacing only the threshold-and-refit step at the center of the loop. That selective reuse is itself the tell. Forty years of this story moved the site of distrust from the algebra, to the conditioning, to the individual correspondence, to the threshold — and each move left the previous machinery mostly intact, aimed at a narrower target. MAGSAC's own sampling and verification stages still draw a minimal sample and still fit it as a single hypothesis. When the inlier threshold is marginalised away, what is left to tune, and is the minimal sample still the right unit of hypothesis?
