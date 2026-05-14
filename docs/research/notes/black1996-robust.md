---
paper_id: black1996-robust
title: "The Robust Estimation of Multiple Motions: Parametric and Piecewise-Smooth Flow Fields"
authors: ["M. J. Black", "P. Anandan"]
year: 1996
url: https://doi.org/10.1006/cviu.1996.0006
created: 2026-05-13
relevant_atlas_pages: [horn-schunck, lucas-kanade]
---

# Setting

**Problem class:** Dense optical flow estimation and parametric motion estimation from two-frame image sequences in the presence of multiple competing motions (depth discontinuities, independently moving objects, transparency, specular reflections, fragmented occlusion).

**Inputs:** Two consecutive grayscale image frames I(x, y, t) and I(x, y, t+dt), with no calibration requirement. Images should be differentiable enough to admit first-order Taylor linearization of the brightness function.

**Outputs:** Either (a) a dense, piecewise-smooth flow field (u(s), v(s)) for every pixel site s, or (b) parametric (affine) motion parameters **a** for one or more dominant motions in the scene, together with a per-pixel outlier map indicating where the single-motion assumption is violated.

**Guarantees and units:** Flow in pixels per frame; outlier indicators in [0,1] (analog outlier process). The Graduated Non-Convexity (GNC) continuation strategy provides practical convergence but no global-minimum guarantee.

# Core idea

Standard formulations of optical flow — both the Horn-Schunck regularization approach and the Lucas-Kanade area-based regression approach — are built on least-squares (L2) estimation. When multiple motions coexist in a spatial neighbourhood, constraints from different motions appear as gross errors (outliers) relative to any single-motion model; L2 averages them, producing incorrect estimates and over-smoothing across motion boundaries.

Black and Anandan replace the quadratic penalty in both the data conservation term and the spatial smoothness term with robust M-estimator penalty functions ρ(·) whose influence functions ψ(x) = ρ'(x) are *redescending* — they assign diminishing weight to residuals beyond a threshold, so outliers contribute negligibly to the solution. The full robust regularization energy is

    E(u,v) = Σ_s ρ_D(I_x u_s + I_y v_s + I_t, σ_D)
            + λ Σ_s Σ_{n∈N(s)} [ρ_S(u_s − u_n, σ_S) + ρ_S(v_s − v_n, σ_S)]   (Eq. 14 / 20)

where ρ_D and ρ_S may be different robust functions and λ controls the relative weight of smoothness. Because the non-convex ρ introduces local minima, a Graduated Non-Convexity (GNC) continuation schedule is applied: the scale parameter σ is initially set large enough to make the objective convex (treating all residuals as inliers), and then σ is reduced in steps so that outliers are identified progressively rather than all at once. A coarse-to-fine image pyramid with explicit image warping handles motions larger than one pixel.

The same framework is applied to parametric regression (Lucas-Kanade-style affine fitting): minimize

    E_p(a) = Σ_{x∈R} ρ((∇I)^T u(a) + I_t, σ)   (Eq. 12 / 17)

with respect to the six affine parameters **a**, solved by Simultaneous Over-Relaxation (SOR) with the GNC σ-schedule. After fitting the dominant motion, residuals exceeding the outlier threshold τ = σ/√3 (Geman-McClure) or τ = √2·σ (Lorentzian) are collected and re-fit to recover a second motion, iterating until no consistent motion remains.

# Assumptions

1. **Temporal brightness constancy (soft).** I(x,y,t) ≈ I(x+u·dt, y+v·dt, t+dt). Violated at specularities, shadows, and transparency; the robust data term degrades gracefully by treating those pixels as data outliers rather than failing globally.
2. **Piecewise spatial smoothness (soft).** Neighbouring pixels belong to the same surface and hence have similar flow; violated at depth/motion boundaries. The robust smoothness term handles this by down-weighting large inter-pixel flow differences.
3. **First-order Taylor linearizability.** The brightness function must be sufficiently smooth to admit the gradient-based linearization I_x·u + I_y·v + I_t ≈ 0 locally. Requires small inter-frame motions at each pyramid level (soft, handled by coarse-to-fine warping).
4. **Motions resolvable via pyramid.** The maximum displacement in the original images must be capturable within the pyramid range; motions much larger than the pyramid extent cause failure (hard).
5. **σ schedule tunable to noise level.** GNC convergence depends on choosing the initial σ large enough that the objective is convex. The paper uses σ proportional to maximum expected residual magnitude divided by √2 (Lorentzian) or √3 (Geman-McClure); wrong σ initialization can trap the solver in a bad local minimum (hard).
6. **Dominant motion covers most of the region (for regression).** Robust regression identifies the dominant motion; if two motions occupy nearly equal fractions of the region, the breakdown point (~40–50% outliers for the tested sequences) is approached and neither motion is reliably recovered (soft threshold).

# Failure regime

- **Motions beyond pyramid range.** GNC begins at the coarsest level with flow = 0; if the true displacement exceeds what the pyramid can resolve at that level, the solution drifts. Hard failure.
- **Near-equal competing motions.** When the distractor occupies ~40% or more of the regression window the robust estimator can no longer cleanly separate the two motions (Fig. 11, §5.1). Empirically demonstrated: at 40% distractor the robust estimate begins to deviate from the dominant motion.
- **Wrong σ schedule.** If the initial σ is too small, the objective is already non-convex at iteration 0 and convergence to the global minimum is not guaranteed. The paper's rule (σ_init ≥ max_residual / √2 for Lorentzian) provides the convexity guarantee, but max_residual must be estimated a priori.
- **Fully transparent superposition.** The paper explicitly notes (§5.3) that for general transparency a brightness-constancy-based approach is insufficient; a phase-based or transparency model is needed. The standard brightness constancy assumption "will not work for general transparent motion."
- **Aperture-problem regions (regularization variant).** In uniform-texture areas the data term provides no constraints regardless of robustness; the smoothness term propagates information from neighbours, but if robustness decisions are made prematurely at those sites the propagation is cut. Parametric variant sidesteps this by pooling over large regions.
- **Severe illumination changes.** Non-brightness-constancy violations that are dense and large-magnitude (e.g., global flash) will not be absorbed by the robust data term since the majority of pixels become outliers, flipping the dominant-motion assumption.

# Numerical sensitivity

- **Scale parameter σ.** The convexity threshold for the Lorentzian is σ = r_max / √2, where r_max is the maximum expected residual before GNC begins. For the Geman-McClure norm the threshold is σ = r_max · √3 (from §4.1.1). In regression experiments the schedule reduces σ geometrically: σ_{i+1} = 0.95 · σ_i (§5, Eq. implied). In regularization experiments a linear schedule is preferred for slower convergence (§6, "linear continuation schedule").
- **Specific σ values used.** Regularization experiments (§6): σ_D ranged linearly from 18/√2 to 5/√2; σ_S ranged from 3/√2 to 0.03/√2; λ_D = 5, λ_S = 1. All regularization experiments used these identical parameters to demonstrate stability. Regression experiments: σ ranged from 20√3–25√3 down to 7.5√3–15√3 depending on sequence.
- **Overrelaxation parameter ω.** SOR uses ω = 1.995 for all parametric regression experiments (§5). The optimal ω for the regularization variant is computed via the Jacobi eigenvalue approximation (Eq. 25–26): ω_opt = 2 / (1 + √(1 − β_max²)), where β_max = cos(π/(n+1)) for an n×n image.
- **Influence function weights.** The IRLS weight is w(x, σ) = ψ(x, σ)/x. For the Lorentzian: w(x, σ) = 2σ² / (2σ² + x²) (Fig. 8d). For Geman-McClure: w(x, σ) = 2σ / (σ + x²)² (Fig. 8c). Neither requires double precision; 32-bit float is sufficient for the image-scale residuals involved.
- **Pyramid levels and iterations.** Regression: 4-level Gaussian pyramid, 30 SOR iterations per level, convergence threshold 10⁻⁵ on parameter change (§5). Regularization: 3-level pyramid, 20 SOR iterations per level, 6 continuation stages (§6).
- **Outlier threshold τ.** Lorentzian: τ = √(2) · σ (§4.1.1, derived where ρ'' = 0). Geman-McClure: τ = σ / √3 (§5, inferred from "γ = σ/√3"). Pixels/sites with |residual| ≥ τ are classified as outliers.

# Applicability

- **Use when:** Scenes contain multiple simultaneous motions (depth discontinuities, independently moving objects, background clutter) that corrupt the single-motion assumption; the goal is either a dense piecewise-smooth flow field or multiple parametric motion models.
- **Use when:** You need both data and smoothness terms to be outlier-tolerant — prior work (e.g., line processes) only robustified the smoothness term, leaving the data term quadratic, which is insufficient (Table 1: adding only robust smoothness *increases* flow RMS error from 0.1814 to 0.2208).
- **Don't use when:** Real-time or embedded deployment is required — the GNC continuation requires multiple full passes per pyramid level (each ~49–78 s on 1990s SPARCstation for 200²–316×252 images).
- **Don't use when:** Motions are very large (beyond coarse pyramid range) or illumination changes globally.
- **Don't use when:** Full transparency modelling is needed — the brightness-constancy data term provides at best a partial solution (§5.3).
- **Compared against:** Horn-Schunck [27] (L2 dense, 32.43° avg error on Yosemite vs 4.46° for robust), Anandan [2] (15.84°), Lucas-Kanade [34] (4.10°, sparse). The robust dense formulation achieves accuracy competitive with the best sparse methods while maintaining 100% density (Table 2).

# Connections

- **Builds on:** [horn1981-horn-schunck] (Eq. 8/9 for HS regularization energy; "as the region size tends to zero… the error measure becomes the gradient-based constraint used in the Horn and Schunck algorithm", §2.1), [lucas1981-lucas-kanade] (area-based regression formulation, Eq. 5; "parametric models such as this have been used for estimating image motion", §2.1; affine flow model, Eq. 6 / 18).
- **Enables:** [Variational optical flow methods (Brox 2004, Papenberg 2006) that adopt robust data terms and large-displacement extensions; layered motion segmentation; transparent motion separation; Robust estimation frameworks applied to stereo and image reconstruction (Black & Rangarajan 1994).]
- **Refutes / supersedes:** The claim that robustness in optical flow can be achieved solely by robustifying the smoothness term (line processes / weak continuity constraints) — §6.1 and Table 1 demonstrate this is *insufficient* and that the data term must also be made robust.

# Atlas update plan

## NEW: black-anandan-robust-flow
```
Type: algorithm
Category: optical-flow
Primary source: black1996-robust

Goal: Estimate dense piecewise-smooth optical flow fields or multiple
parametric (affine) motion models from two-frame image sequences by
replacing the L2 penalties in both the data conservation and spatial
smoothness terms with robust M-estimator penalty functions. The method
tolerates depth discontinuities, independently moving objects,
transparency, and specular reflections that corrupt least-squares
formulations.

Algorithm:
  Piecewise-smooth (dense) variant — minimise the robust regularization energy
    E(u,v) = Σ_s ρ_D(I_x u_s + I_y v_s + I_t, σ_D)
            + λ Σ_{s,n∈N(s)} [ρ_S(u_s−u_n, σ_S) + ρ_S(v_s−v_n, σ_S)]
  using Simultaneous Over-Relaxation (SOR) within a Graduated Non-Convexity
  (GNC) continuation schedule on the scale parameter σ.
  Coarse-to-fine image pyramid with backward-warp image warping handles
  displacements > 1 pixel.

  Parametric (affine) variant — minimise
    E_p(a) = Σ_{x∈R} ρ((∇I)^T u(a) + I_t, σ)
  over the six affine parameters a = [a0…a5]. After recovering the dominant
  motion, pixels where |residual| ≥ τ are collected and re-fit to recover
  a second motion; iterated until no consistent motion remains.

  Both variants use: ρ = Lorentzian or Geman-McClure; ψ(x,σ) = ρ'(x,σ)
  gives IRLS weights; convexity threshold σ_init = r_max/√2 (Lorentzian)
  or r_max·√3 (Geman-McClure); outlier threshold τ = √2·σ (Lorentzian),
  σ/√3 (Geman-McClure).

Implementation:
  - IRLS (SOR): update u_s^{n+1} = u_s^n − (1/T(u_s)) · ∂E/∂u_s,
    where T(u_s) is an upper bound on ∂²E/∂u_s².
  - GNC schedule: geometric (σ_{i+1} = 0.95·σ_i) for parametric;
    linear ramp for dense regularization.
  - Pyramid: Gaussian, 3–4 levels; 20–30 SOR iterations per level.
  - Explicit line processes are NOT needed — the M-estimator subsumes them.
  - Outlier map is a by-product: classify site s as outlier if final
    |residual_s| ≥ τ.

Remarks:
  - Black and Anandan unify two previously separate robustness problems
    (data outliers and smoothness outliers) in a single M-estimator
    framework, showing that robustifying only the smoothness term
    (traditional line-process approach) is insufficient and can worsen
    flow accuracy (Table 1).
  - The equivalence between redescending M-estimators and analog outlier
    (line) processes (Black & Rangarajan 1994, [11]) means the same
    energy can be interpreted either as robust statistics or as a
    generalized MRF with analog line variables.
  - On the Yosemite benchmark the robust dense formulation achieves
    4.46° average angular error at 100% density, competitive with the
    best sparse methods (Lucas-Kanade: 4.10° at 35.1% density, Fleet-
    Jepson: 4.29° at 34.1% density) — Table 2.
  - Directly extends Horn-Schunck (replaces quadratic ρ_D and ρ_S) and
    Lucas-Kanade (replaces L2 regression loss with robust ρ).

References: black1996-robust
```

## UPDATE: horn-schunck
```
Section: Remarks (and Relations)
Bullets:
  - Add one Remarks bullet: "Black & Anandan (1996) replace the quadratic
    data and smoothness penalties with redescending M-estimators
    (Lorentzian / Geman-McClure), making the energy outlier-tolerant and
    producing piecewise-smooth flow without explicit line processes.
    Robustifying the smoothness term alone (as in prior line-process work)
    is insufficient — the data term must also be robust.
    See [black-anandan-robust-flow]."
Relations:
  - { type: extended_by, target: black-anandan-robust-flow, confidence: high,
      caution: "Robust M-estimator extension of the quadratic data and smoothness terms; non-convex but more tolerant of outliers and motion discontinuities." }
```

## UPDATE: lucas-kanade
```
Section: Remarks (and Relations)
Bullets:
  - Add one Remarks bullet: "Black & Anandan (1996, §5–6) derive a robust
    variant for parametric motion (planar affine, plane+parallax) by
    replacing the L2 residual with a Lorentzian / Geman-McClure
    M-estimator solved by IRLS within a Graduated Non-Convexity schedule.
    The same machinery extends to the piecewise-smooth dense flow case.
    See [black-anandan-robust-flow]."
Relations:
  - { type: extended_by, target: black-anandan-robust-flow, confidence: high,
      caution: "Robust M-estimator version of the parametric variant; same machinery as Black-Anandan's piecewise-smooth flow." }
```

# Provenance

- **§1, Abstract:** Establishes the single-motion assumption, the problems (transparency, depth discontinuities, occlusion, specular reflections), and the two main algorithm variants (parametric regression + piecewise-smooth regularization).
- **§2.1, Eq. (2–5):** SSD/gradient data conservation energy; Eq. (4) writes E_D(u) = Σ (∇I^T u + I_t)² as the locally-constant gradient energy that becomes HS in the limit of zero region size.
- **§2.1, Eq. (5–6):** Affine regression energy and affine flow model u(x,y;a).
- **§2.1.1:** "Generalized Aperture Problem" — the tension between large regions (needed to constrain the solution) and small regions (needed to avoid multiple motions).
- **§2.2, Eq. (8–9):** HS first-order membrane smoothness E_S(u,v) = u_x² + u_y² + v_x² + v_y²; its discrete form over grid neighbours.
- **§3, Fig. 8:** The four ρ-functions (quadratic, truncated quadratic, Geman-McClure, Lorentzian) with their ψ = ρ' influence functions. Lorentzian: ρ(x,σ) = log(1 + ½(x/σ)²), ψ(x,σ) = 2x/(2σ²+x²). Geman-McClure: ρ(x,σ) = x²/(σ+x²) [OCR notation; actual Geman-McClure is σx²/(σ+x²)], ψ(x,σ) = 2xσ/(σ+x²)².
- **§3, Eq. (10–11):** General M-estimator minimization: min_a Σ_s ρ(d_s − u(s;a), σ_s). Quadratic case recovers standard LS.
- **§4, Eq. (12–14):** Robust reformulations: regression (Eq. 12), correlation (Eq. 13), regularization (Eq. 14).
- **§4.1.1, Eq. (15–16):** SOR update u_s^{n+1} = u_s^n − (ω/T(u_s))·∂E/∂u_s; overrelaxation parameter ω ∈ (0,2).
- **§4.1.1:** GNC — convex approximation by choosing σ so that ρ''(x,σ) > 0 ∀x. For the Lorentzian: ρ''=0 at x=±√2·σ, so σ_init = r_max/√2 gives a convex objective. σ-schedule: σ is lowered until the true non-convex ρ is recovered.
- **§4.1.1:** Lorentzian second derivative equals zero when x = ±√2·σ (exact text: "equals zero when r = ±√2σ"). Outlier if |x| ≥ √2·σ.
- **§4.2:** Coarse-to-fine pyramid with image warping (Eq. implied; Appendix B gives backward-warp formula Eq. 29–34).
- **§5, Eq. (17–19):** Robust parametric regression objective and SOR update for affine parameters; ω = 1.995 for all experiments; σ_{i+1} = 0.95·σ_i geometric schedule; convergence threshold 10⁻⁵; 30 iterations per pyramid level.
- **§5, threshold:** Geman-McClure outlier threshold: γ = σ/√3 (stated "γ is determined by the error norm and the control parameter. For the Geman-McClure norm γ = σ/√3").
- **§5.1, Fig. 11:** Robust regression breakdown at ~40% distractor occupancy.
- **§5.3:** "this approach, however, will not work for general transparent motion" — explicit failure acknowledgement.
- **§6, Eq. (20–24):** Robust regularization objective (Lorentzian for both ρ_D and ρ_S); SOR updates Eq. (21–22); gradient expressions Eq. (23–24); T(u_s) upper bounds Eq. (27 implied).
- **§6, Eq. (25–26):** Optimal ω for regularization: β_max = cos(π/(n+1)), ω_opt = 2/(1+√(1−β_max²)).
- **§6 experimental parameters:** σ_D: 18/√2 → 5/√2; σ_S: 3/√2 → 0.03/√2; λ_D=5, λ_S=1; 3-level pyramid; 20 SOR iterations; 6 continuation stages.
- **§6.1, Table 1:** Both-terms-robust achieves RMS flow error 0.0986 vs 0.1814 (both quadratic) and 0.2208 (quadratic data + robust smoothness).
- **§6.4, Table 2:** Yosemite benchmark comparison: robust dense 4.46°/4.21° at 100%; HS 32.43° at 100%; LK 4.10° at 35.1%; Fleet-Jepson 4.29° at 34.1%.
- **Appendix A:** Partial derivatives of robust regression objective for affine parameters a_0…a_5; scale bounds T_{a_i} = Σ_{x,y} {x²,y²,…} · max ρ''(x).
- **Appendix B, Eq. (29–34):** Backward-warp formula for affine image warping.
