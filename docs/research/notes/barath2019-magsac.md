---
paper_id: barath2019-magsac
title: "MAGSAC: marginalizing sample consensus"
authors: [D. Barath, J. Matas, J. Noskova]
year: 2019
url: https://arxiv.org/abs/1803.07469
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

**Problem class:** robust model fitting — estimating a geometric model (homography, fundamental matrix, essential matrix, or any parametric structure) from point correspondences contaminated by outliers, without requiring the user to supply the inlier noise scale σ.

**Inputs:** a set P of k-dimensional data points (e.g., k=4 for 2D point correspondences); a minimal solver F that fits model θ from m points; a residual function D : Θ × P → ℝ. The only user-supplied scalar is σ_max — an upper bound on the plausible noise scale — which can be set to a generous value (e.g., 10 pixels in image coordinates) and is not sensitive to precise tuning.

**Outputs:** a model parameter vector θ* obtained by weighted least-squares (σ-consensus) with no hard inlier/outlier threshold; a model quality score Q*(θ*, P) obtained by marginalizing over σ.

**Contrast with standard RANSAC:** standard RANSAC requires the user to choose a single threshold τ(σ) that maps every point to {inlier, outlier}. Empirically, the optimal σ varies scene by scene (demonstrated for four real datasets in Fig. 1 of the paper), so no single value works universally.

# Core idea

MAGSAC introduces σ-consensus: treat the noise scale σ as a random variable with a prior density f(σ), and integrate the RANSAC quality function Q(θ, σ, P) over σ rather than evaluating it at a fixed σ:

```
Q*(θ, P) = ∫ Q(θ, σ, P) f(σ) dσ         [Eq. 1]
```

Assuming σ ~ U(0, σ_max) (no prior knowledge) this becomes:

```
Q*(θ, P) = (1/σ_max) ∫₀^σ_max Q(θ, σ, P) dσ    [Eq. 2]
```

For the log-likelihood quality function — where inlier residuals follow a chi-squared distribution g(r|σ) = 2C(ρ)σ^(-ρ) exp(-r²/2σ²) r^(ρ-1) with C(ρ) = 1/(2^(ρ/2) Γ(ρ/2)), and outliers are uniform on [0, l] — the resulting marginalized quality Q*_MAGSAC discretises over a grid of K points sorted by residual [Eq. 5].

**σ-consensus model fitting** (Alg. 1): instead of selecting a hard inlier set, the algorithm computes per-point weights L(p | θ) via the marginal likelihood of p being an inlier, integrated over σ [Eq. 6]:

```
L(p | θ) ≈ (2C(ρ)/σ_max) Σᵢ (σᵢ - σᵢ₋₁) σᵢ^(-ρ) D^(ρ-1)(θ_σᵢ, p) exp(-D²(θ_σᵢ, p) / 2σᵢ²)
```

The final model θ*_MAGSAC is the weighted-least-squares fit using these weights (line 14 of Alg. 1). The inlier-outlier threshold τ(σ) is set to the 0.95 or 0.99 quantile of g(r|σ); for χ²(4) this equals τ(σ) = 3.64σ.

**Discretisation:** the σ range [σ₁, σ_max] is divided uniformly into d partitions (experimentally d=10), so only d least-squares fits are performed per σ-consensus call — reducing cost from O(K) to O(d) model re-fits.

**Marginalized termination criterion** (Eq. 8): the standard RANSAC iteration count k(θ, σ, P) = ln(1-η) / ln(1 - (|I(θ,σ,P)|/|P|)^m) is also marginalized over σ to give k*(P, θ) = (1/σ_max) Σᵢ (σᵢ - σᵢ₋₁) × ln(1-η) / ln(1 - (|I(θ,σᵢ,P)|/|P|)^m), updated whenever a new best model is found.

# Assumptions

1. (Hard) The noise scale prior is uniform on [0, σ_max]; if the true σ is substantially above σ_max, the quality function is biased. The paper provides a diagnostic: if the density mode of residuals is near σ_max, rerun with a larger value.
2. (Soft) Inlier residuals follow a chi-squared distribution (equivalently: errors along each of ρ axes are i.i.d. Gaussian with variance σ²). Moderate departure degrades accuracy gracefully; heavy-tailed outlier corruption may reduce benefit.
3. (Soft) Outliers are uniformly distributed on [0, l], where l is set to the image diagonal. Non-uniform outlier distributions (e.g., structured outliers from repeated textures) may still mislead the sampler, though not the threshold-selection step.
4. (Soft) The minimal solver F is sound: it returns a valid model from m points whenever a correct minimal sample is drawn. Degeneracy in the underlying solver propagates unchanged into MAGSAC (the paper applies degeneracy testing in the validation step of Alg. 2 line 5).
5. (Hard) The discretisation step d must be fine enough to approximate the integral faithfully. The paper uses d=10 and reports accurate results; very coarse grids (d < 5 ?) may underweight high-σ components.
6. (Soft) SPRT early rejection (used for speed) requires a reference threshold τ_ref (set to 1 pixel in experiments); this is not the inlier threshold but a cheap pre-screen. Misspecification slows but does not bias the result.

# Failure regime

- **σ prior misspecification:** if the true noise is multimodal (e.g., a mixture of tight inliers and near-inlier but corrupted observations), the uniform prior on [0, σ_max] conflates both populations, potentially yielding a model that fits neither well.
- **Very coarse discretisation:** with d=1 the method degenerates; the paper's choice of d=10 was validated empirically but the sensitivity analysis is limited to the presented datasets.
- **Low inlier ratio + small d:** for outlier ratio 0.9, MAGSAC required up to 69,074 iterations (at fixed-iteration experiments, Fig. 3f); the iteration count is computed adaptively but convergence is slower than for competitors when σ is small.
- **Inherited degeneracy from the minimal solver:** any degeneracy that would cause the seven-point F-solver or four-point H-solver to produce degenerate models is not addressed by σ-consensus. The paper uses degeneracy testing in Validate() (Alg. 2 line 5) as a mitigation.
- **Slow for easy scenes:** the paper explicitly notes (Section 5.1) that MAGSAC is the slowest method when noise σ < 0.3 px, because σ-consensus is applied to every minimal-sample model rather than only the current best. The post-processing variant (apply σ-consensus once to the RANSAC output) sidesteps this.

# Numerical sensitivity

- **σ_max choice:** must exceed the largest plausible inlier residual. The paper uses σ_max = 10 pixels across all experiments and notes that if the residual density mode is near σ_max the computation should be rerun with a higher value. In practice, 10 px is generous for normalized image coordinates on 640×480 images but may be tight for high-resolution sensors.
- **Partition count d:** the paper uses d=10 uniformly; no sensitivity sweep is reported beyond the qualitative claim that d << K. The first partition boundary is σ_max/d = 1 pixel when σ_max=10, matching the τ_ref pre-screen threshold (coincidence or design intent? — not stated).
- **Weight magnitude near σ_max:** points near D(θ, p) ≈ τ(σ_max) receive near-zero weight because g(r|σ_max) is very small; weight clipping is not mentioned but is implicit in the chi-squared likelihood approaching zero.
- **Precision:** the paper's C++ implementation uses multiple CPU cores for the σ loop. The integral involves exp(-D²/2σ²) which underflows to 0 in float32 for D²/2σ² > ~88; for σ_i = σ_max/10 = 1 px this underflows when D > ~13 px — safely beyond the τ(σ_max) gate, so float32 is workable.
- **IRLS conditioning:** the weighted least-squares fitting (line 14 of Alg. 1) uses the same solver F as the minimal step; the paper does not discuss numerical conditioning of the weighted normal equations. For near-degenerate configurations (e.g., nearly-collinear correspondences for H), conditioning is inherited from the underlying solver.

# Applicability

- **Use when:** you cannot or do not want to tune the inlier threshold ε (autonomous pipelines, heterogeneous sensor fusion, batch processing over scenes with varying noise); when geometric accuracy is the primary metric (MAGSAC achieves the lowest eavg on 5 of 6 dataset blocks in Table 1, and the lowest median error of 0.92 px vs. 1.28–2.24 px for competitors); when the outlier ratio is high (MAGSAC is the fastest at outlier ratio ≥ 0.5 in Fig. 3d due to fewer required iterations).
- **Don't use when:** the inlier threshold is well-known a priori and computational budget is critical (σ-consensus adds d=10 model re-fits per sampled hypothesis; for tight-threshold well-calibrated setups, LO-RANSAC with a fixed threshold is faster on easy scenes); when a specific sampler (PROSAC, SPRT-only) or verifier from USAC's framework is needed and cannot be composed with σ-consensus; when the problem dimension ρ differs from the assumed chi-squared ρ and is hard to set correctly.
- **Compared against (paper Table 1):** RANSAC, MSAC, LO-RANSAC, LO-MSAC, LO-RANSAAC, AC-RANSAC. MAGSAC wins eavg on kusvod2 (F), Multi-H (F), homogr (H), EVD (H), strecha (E), and median error overall. MAGSAC is third on AdelaideRMF (F) by 0.03 px margin.
- **Post-processing mode:** applying σ-consensus once to the output of any robust estimator always improved accuracy across all tested methods and datasets ("+σ" columns in Table 1), with processing time overhead of at most a few milliseconds — making it a near-free upgrade for any pipeline.

# Connections

- Builds on: [fischler1981-ransac, raguram2013-usac]
  - RANSAC [5] is the foundational method whose threshold sensitivity MAGSAC directly eliminates.
  - USAC [19] is cited as the source of SPRT integration and early-rejection strategy reused in Alg. 2.
- Enables: MAGSAC++ (2020 follow-up by Barath and Matas; not yet in our index — mention by name only); extends the post-processing mode to a general plug-in for any RANSAC variant.
- Refutes / supersedes: fixed-threshold RANSAC for geometric estimation tasks where σ is unknown or scene-dependent (demonstrated empirically across 545 image pairs).

# Atlas update plan

## NEW: barath-magsac
Type: algorithm
Category: robust-estimation
Primary source: barath2019-magsac

**Goal:**
- Robust model fitting (homography, fundamental matrix, essential matrix) without a user-tuned inlier threshold ε.
- Inputs: point correspondences P, minimal solver F, residual function D, upper noise bound σ_max. Outputs: weighted-least-squares model θ* and quality score Q*(θ*, P).

**Algorithm:**
- σ-consensus integrates the RANSAC quality function Q(θ, σ, P) over σ ~ U(0, σ_max) (Eq. 1–2). The log-likelihood quality Q*_MAGSAC uses chi-squared inlier residuals (Eq. 5). Per-point weights L(p | θ) are the marginalised inlier probabilities (Eq. 6). Final model is weighted least-squares with those weights (Alg. 1 line 14).
- The σ range is discretised into d=10 uniform partitions, reducing fitting cost from O(K) to O(d) per hypothesis (Section 4.1).
- Termination criterion k*(P, θ) also marginalises over σ (Eq. 8); updated each time a new best model is found.
- SPRT with τ_ref=1 pixel is used for early model rejection (reused from USAC, Section 4.1).
- Two modes: (a) full MAGSAC — apply σ-consensus to every minimal-sample model (Alg. 2); (b) post-processing only — apply σ-consensus once to the RANSAC output (adds ≤ a few milliseconds).

**Implementation:**
- σ_max = 10 pixels for all experiments; rerun with higher value if residual mode is near σ_max.
- d = 10 partitions (experimentally determined; the paper provides no sensitivity sweep).
- τ_ref = 1 pixel for SPRT pre-screen.
- Inlier threshold τ(σ) = 3.64σ for χ²(4) distribution (ρ=4 for 2D point correspondences).
- Source code: https://github.com/danini/magsac (referenced in paper footnote 1).

**Prerequisites:** `[ransac]` (the concept anchor from Phase 1 must exist before this page is published).

**Remarks:**
- For guidance on when to choose USAC over MAGSAC (e.g., when SPRT verifier or a specific sampler is needed and the threshold is well-known), see the `## When to choose USAC over MAGSAC` section on the `raguram-usac` page.
- Symmetric `compared_with` relation with `raguram-usac` is authored on the USAC page (USAC is older and broader in scope per the tiebreaker rule); the build mirrors it onto this page. Do NOT add a reverse edge here.
- The `extended_by` edge from `fischler-bolles-ransac` → `barath-magsac` is authored on the Fischler-Bolles page (asymmetric A→B); the build will emit `extending: [fischler-bolles-ransac]` on this page automatically. Do NOT add a reverse edge here.

---

## UPDATE: content/algorithms/apap-image-stitching.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/daniilidis-dual-quaternion-handeye.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/fundamental-matrix-eight-point.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/gao-dual-homography-stitching.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/kumar-generalized-rac.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/lin-sva-stitching.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/tsai-lenz-handeye.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/algorithms/zhang-planar-calibration.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/chessboard-x-corner-detection.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/dlt-normalisation.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/epipolar-geometry.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/homography.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/scale-space.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/concepts/spatially-varying-image-stitching.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/ccdn-checkerboard-detector.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/ccs-camera-calibration.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

## UPDATE: content/models/mate-checkerboard-detector.md
Section: Prerequisites / Frontmatter
- Once `ransac` concept page lands (Phase 1), retrofit `prerequisites: [ransac]` into this page's frontmatter (mechanical sweep, no prose changes).

# Provenance

All equations, constants, and algorithm descriptions are traced to the paper:

- **Eq. 1** — General marginalised quality function Q*(θ, P) = ∫ Q(θ, σ, P) f(σ) dσ. Paper §3.1, Eq. (1).
- **Eq. 2** — Uniform prior simplification Q*(θ, P) = (1/σ_max) ∫₀^σ_max Q(θ, σ, P) dσ. Paper §3.1, Eq. (2).
- **Eq. 3** — Quality under inlier/outlier uniform assumption and log-likelihood: Q*(θ, P) = K(ln(l/σ_max) + 1) − (1/σ_max) Σ D(θ, pk)(1 + ln(l/D(θ, pk))) − |P| ln l. Paper §3.1, Eq. (3).
- **Chi-squared density g(r|σ)** and C(ρ) = 1/(2^(ρ/2) Γ(ρ/2)). Paper §3.1, inline after Eq. (3).
- **Likelihood of model given σ** L(θ, P|σ). Paper §3.1, Eq. (4).
- **Q*_MAGSAC discretised form** with sums over σ grid. Paper §3.1, Eq. (5).
- **Marginalised per-point inlier likelihood** L(p | θ) via Eq. (6). Paper §3.2, Eq. (6).
- **Standard RANSAC termination criterion** k(θ, σ, P) = ln(1-η) / ln(1 - (|I|/|P|)^m). Paper §3.3, Eq. (7).
- **Marginalised termination criterion** k*(P, θ) ≈ (1/σ_max) Σᵢ (σᵢ - σᵢ₋₁) ln(1-η) / ln(1 - (|I(θ,σᵢ,P)|/|P|)^m). Paper §3.3, Eq. (8).
- **τ(σ) = 3.64σ** for χ²(4). Paper §4.2, inline: "In case of χ²(4) distribution, it is τ(σ) = 3.64σ."
- **σ_max = 10 pixels**, **d = 10** partitions, **τ_ref = 1 pixel**, **η = 0.95**. Paper §4.1 and §5 (Experimental Results preamble).
- **SPRT reuse from USAC** — "as it was proposed for USAC [19]". Paper §4.1, first sentence.
- **Post-processing adds at most a few milliseconds** — Paper Abstract and §6 Conclusion.
- **MAGSAC wins eavg on 5 of 6 dataset blocks; median error 0.92 px** — Paper Table 1.
- **Source code URL**: https://github.com/danini/magsac — Paper footnote 1.
- **USAC reference [19]**: Raguram et al., TPAMI 2013 — used for SPRT and framework context.
- **RANSAC reference [5]**: Fischler and Bolles, CACM 1981.
