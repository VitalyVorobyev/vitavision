---
paper_id: lin2011-svastitching
title: "Smoothly Varying Affine Stitching"
authors: ["W.-Y. Lin", "S. Liu", "Y. Matsushita", "T.-T. Ng", "L.-F. Cheong"]
year: 2011
url: https://www.ece.nus.edu.sg/stfpage/eleclf/Lin_CVPR11.pdf
created: 2026-05-02
relevant_atlas_pages: [apap-image-stitching]
---

# Setting

**Problem class.** Two-view image stitching under parallax: computing a warp from a source (base) image to a target image when the views cannot be related by a single global homography or affine transform — because the camera has translated between shots, or the scene contains depth variation. The aim is to produce a spatially continuous warp that extrapolates well into non-overlapping regions and absorbs occlusion without requiring explicit 3-D reconstruction.

**Inputs.** Two overlapping photographs (base image and target image) and a sparse set of SIFT keypoint correspondences between them. No camera calibration is assumed. The method also uses $N$ SIFT feature points from the base image and $N$ from the target as unlabelled sets; point correspondences drive the global affine initialisation (via RANSAC), but the joint estimation loop also operates on unmatched feature sets. Paper tests on $\approx 500 \times 500$ pixel synthetic scenes and on real photographs at similar scales.

**Outputs.** A per-point affine stitching field $A_{M \times 6} = [a_1, \ldots, a_M]^T$, where $a_i \in \mathbb{R}^6$ is the affine parameter vector at base feature $i$ (deviation from the global affine $a_\text{global}$). The full stitching field $v(z): \mathbb{R}^2 \to \mathbb{R}^6$ is defined at any point by a Gaussian-weighted sum over the $M$ basis affines (Eq. 9), and the warped output image is produced by Poisson blending with optimal seam finding.

**Guarantees.** None formal. The EM-style minimisation decreases the cost (Eq. 6) monotonically at each outer iteration (verified via Jensen's inequality in the paper's §2.1). Convergence to a global optimum is not guaranteed; the annealing schedule on $\sigma_t$ (decremented by 0.97 per outer loop, from 1 to 0.1) trades off between broad initialisation and tight alignment. Runtime: approximately 8 minutes for 1200 SIFT features on a MATLAB i7 workstation (§3); for a 1024×768 pair, APAP later reports SVA taking approximately 15 minutes.

# Core idea

SVA replaces the global affine $a_\text{global}$ with a smoothly varying affine stitching field: every base feature $i$ carries its own affine parameter $a_i = a_\text{global} + \Delta a_i$, where the deviation $\Delta a_i$ is regularised to be smooth across the image. The field at an arbitrary query point is recovered by a Gaussian-kernel interpolation over the $M$ basis affines (Eq. 9, 13):

$$v(z) = \sum_{i=1}^{M} w_i\, g\!\left(z - b^0_{i(1:2)},\, \gamma\right), \qquad W = G^+ \Delta A,$$

where $G(i,j) = g(b^0_{i(1:2)} - b^0_{j(1:2)},\, \gamma)$ is an $M \times M$ Gaussian affinity matrix and $G^+$ its pseudo-inverse. The smoothness regulariser (Eq. 4–5) penalises high-frequency content in the Fourier domain of the stitching field, with a Gaussian spectral weight $g^0(\omega)$ that makes the resulting closed-form equivalent to $\Psi(A) = \mathrm{tr}(\Delta A^T G^{-1} \Delta A)$ — a Tikhonov-style penalty on the deviation amplitudes weighted by the inverse feature-affinity kernel (Appendix A).

Alignment is jointly estimated with correspondence. The cost (Eq. 6) combines a robust Gaussian-mixture alignment likelihood $-\sum_j \log \sum_i g(t_j' - b_i, \sigma_t)$ — adapted from the Coherent Point Drift framework of Myronenko et al. 2007 — with the smoothness regulariser $\lambda \Psi(A)$. An EM-style loop alternates between (E-step) computing soft assignment weights $\phi_{ij}$ from the current $A^k$ and (M-step) solving the $M \times 6$ linear system (Eq. 8) for $A^{k+1}$. The bandwidth $\sigma_t$ is annealed from coarse to fine, progressively tightening the correspondence penalty.

The key contrast with APAP and dual-homography methods is the choice of **affine** as the local model. Affine maps preserve collinearity and distance ratios; they are a 6-DOF sub-group of the 8-DOF projective model. Affine is sufficient for moderate-parallax scenes (smoothly varying depth), has good extrapolation properties (a constant or smoothly varying affine field generalises naturally to non-overlapping regions), and is analytically tractable in the CPD-style EM framework. However, affine cannot represent the perspective distortion introduced by camera translation combined with scene depth variation — precisely the regime where APAP dominates.

# Assumptions

1. (hard) The scene contains no abrupt depth protrusions. The affine field is a smooth interpolation; large depth discontinuities at object boundaries create motion discontinuities that exceed the field's representational capacity. The paper explicitly names "violation of affine coherence at depth boundaries" as the primary limitation (§6 Conclusion).
2. (soft) The scene's depth variation is smooth. SVA can approximate smoothly varying parallax; it does not require planarity or rotational-only camera motion, but the approximation degrades as depth gradients steepen.
3. (hard) The global affine $a_\text{global}$ is a valid rough initialisation. RANSAC-estimated from SIFT correspondences (§3). If SIFT matching fails (insufficient overlap, drastic illumination change, or motion blur), the initialisation is degenerate and the EM loop cannot recover.
4. (soft) SIFT features are detectable in both images and provide sufficient coverage of the overlap region. The feature count $M$ and the coverage distribution determine the resolution of the estimated field; sparse or uneven coverage leads to unreliable interpolation in under-sampled regions (Fig. 2 — the "naive" sliding-window failure).
5. (soft) The smoothing weight $\lambda = 10$ and annealing schedule ($\sigma_t$: 1.0 to 0.1, factor 0.97) are appropriate for the image scale and scene depth variation. The paper normalises coordinates to zero-mean unit-variance (§3) to make these settings approximately image-size-invariant, but they remain scene-dependent.
6. (soft) The outlier-handling term $\kappa = 0.5$ (thickening the Gaussian mixture tails) is sufficient for the degree of mismatching present. In scenes with extreme occlusion or photometric change, the uniform-component weight may not adequately down-weight outlier assignments.

# Failure regime

- **Abrupt depth protrusions (hard failure).** A foreground object at a sharply different depth from the background produces a motion discontinuity — the affine field cannot represent a step change. Fig. 5 in the paper shows mean errors of 1.92 px (smooth V-scene) vs 4.57 px (depth-discontinuity scene) on 500×500 synthetic images; real scenes with large foreground objects (e.g. Fig. 11, tree) require blending to hide the errors.
- **Incorrect extrapolation into non-overlapping regions with perspective parallax.** APAP's Fig. 1b (in the APAP paper, zaragoza2013-apap) illustrates the extrapolation failure explicitly: an affine-regularised field extrapolates as an affine map, but the correct extrapolation for a translating camera is projective. In scenes with significant perspective distortion, the extrapolated portion of SVA's warp diverges from ground truth. This is the APAP paper's core motivation for using a projective (homography) local model instead.
- **Slow convergence / high runtime.** The EM loop with annealing is iterative and not closed-form per cell. The paper reports ~8 minutes for 1200 features in MATLAB; APAP reports ~15 minutes for SVA on the temple pair (1024×768) and ~1 hour for railtracks (1500×2000) — versus APAP's "less than a minute" and "tens of seconds" respectively (APAP §4).
- **RANSAC initialisation failure.** If the SIFT correspondences are too sparse or noisy for RANSAC to produce a valid global affine, the paper sets $a_\text{global}$ to the identity matrix (§5.1, Prague scene) as a fallback. In pathological cases, this fallback degrades the EM convergence.
- **Over-smooth field in high-parallax scenes.** The smoothness regulariser $\Psi(A)$ suppresses high-frequency components of the deviation field. If true motion exhibits large local variations (fast depth changes), the regulariser forces the field toward the global affine and the alignment errors in those regions are comparable to a single-affine warp.
- **APAP RMSE comparison (Table 1, APAP paper).** On the five image pairs tested by APAP: SVA has the worst RMSE of any tested method on the temple pair (SVA test RMSE 12.3 px vs APAP 1.4 px), second-worst on railtracks (SVA 7.5 px vs APAP 4.5 px). SVA does not outperform APAP on any of the five tested pairs. The APAP paper notes that SVA's affine regularisation cannot represent perspective extrapolation (§1.1, Fig. 1b) as the root cause.

# Numerical sensitivity

- **Coordinate normalisation.** The paper normalises point coordinates to zero mean and unit variance before constructing the feature vectors (§3). This is claimed to make the parameters $\lambda$, $\kappa$, $\gamma$, $\sigma_t$ approximately image-size-invariant. However, scene-to-scene depth variation is not normalised; scenes with a wide range of depths still require manual tuning.
- **Gaussian affinity matrix $G$ pseudo-inverse.** The $M \times M$ matrix $G(i,j) = g(b^0_i - b^0_j, \gamma)$ is symmetric positive definite but can be ill-conditioned when features cluster spatially (many nearby features → near-duplicate rows). The pseudo-inverse $G^+$ is used (Eq. 16), which handles rank deficiency but does not guarantee small condition numbers. The paper does not discuss the sensitivity of $W = G^+ \Delta A$ to the conditioning of $G$.
- **EM-style linear system (Eq. 8).** The M-step solves $C G + 2\lambda \Delta A^{k+1} = 0_{6 \times M}$, i.e., $\Delta A^{k+1} = -C G / (2\lambda)$. This is a closed-form solve (not an iterative method for the inner step), so there is no per-inner-iteration convergence concern. The outer annealing loop's termination ($\sigma_t = 0.1$ threshold) is the convergence criterion, not a tight numerical one.
- **Regulariser weight $\lambda = 10$.** The paper sets $\lambda = 10$ throughout without sensitivity analysis. A smaller $\lambda$ allows the field to fit individual correspondences more tightly but risks overfitting and poor extrapolation; a larger $\lambda$ increases smoothness at the expense of alignment accuracy in the overlap region.
- **Annealing schedule sensitivity.** The factor 0.97 and the range $[0.1, 1.0]$ for $\sigma_t$ imply approximately 75 outer iterations (since $0.97^{75} \approx 0.1$). The paper notes that each outer iteration initialises from the previous field, providing warm-start efficiency. The total number of inner EM iterations per outer step is not reported.
- **Feature count scaling.** The $M \times M$ Gram matrix $G$ requires $O(M^2)$ storage and $O(M^3)$ pseudo-inversion. For $M = 1200$, this is a $1200 \times 1200$ matrix — manageable, but the $O(M^3)$ inversion becomes a bottleneck for large feature sets. The paper does not characterise the scaling behavior beyond the single reported case.

# Applicability

- Use when: the scene has moderate, smoothly varying parallax and the camera has translated between shots. SVA handles this class of scenes with good extrapolation into non-overlapping regions, outperforming single-homography stitching where depth variation is smooth.
- Use when: the application requires stitching of images taken from different physical locations (not a fixed tripod), including "re-shoot" scenarios (§5.1) where photometric variation is present and a parametric warp's extrapolation stability is valued.
- Use when: a simple MATLAB prototype is acceptable and the image pair is small (≤ 500 features, ≤ 1 MP). The EM framework is straightforward to implement from the paper's pseudocode (Fig. 4).
- Don't use when: the scene contains large depth discontinuities (foreground objects at significantly different depths). APAP or a mesh-based warp with seam-cut is more appropriate.
- Don't use when: runtime is constrained. The iterative global solve is 15–60× slower than APAP's closed-form per-cell Moving DLT for comparable image sizes.
- Don't use when: the warp must be projectively correct in the non-overlap region. The affine extrapolation is incorrect under perspective parallax (documented in APAP §1.1 and Fig. 1b). Use APAP or a projective-model method.
- Don't use when: more than two input images must be stitched simultaneously. The method is two-view; multi-image extension is not described.
- Compared against (APAP Table 1, zaragoza2013-apap):
  - **Global homography (DLT baseline)**: SVA outperforms the single-homography baseline on all five image pairs in APAP's evaluation, confirming its advantage over the rigid global model.
  - **APAP (zaragoza2013-apap)**: APAP outperforms SVA on all five tested pairs. The projective local model is superior to the affine local model when parallax is non-trivial and perspective extrapolation is needed.
  - **Dual-homography warping (gao2011-dual-homography)**: comparable in the two-dominant-plane regime; DHW uses a hard two-cluster model while SVA uses a soft continuous field. APAP Table 1 shows SVA is worse than DHW on railtracks (7.5 vs 14.1 test RMSE — both lose to APAP's 4.5 px) and similar on other pairs.
  - **Motion coherence (Myronenko 2007, §9 of appendix)**: SVA's affine coherence relaxation provides better extrapolation than the motion coherence baseline (Fig. 14 in the paper).

# Connections

- Builds on:
  - **myronenko2007-cpd** (Coherent Point Drift, Myronenko, Song, Carreira-Perpinan NIPS 2007, listed as [19] in the paper) — the Gaussian mixture alignment likelihood and EM minimisation framework. SVA adapts CPD's non-rigid point registration to the image stitching problem by substituting an affine field with a smoothness regulariser.
  - **igarashi2005-arap** (as-rigid-as-possible warping, listed as [13]) — conceptual ancestor of the smooth-field warp philosophy. SVA names it alongside thin-plate splines and motion coherence as the non-rigid warping family it adapts.
  - SIFT (Lowe 2004, [17]) — feature extraction and descriptor matching for correspondence initialisation and feature sets.
  - RANSAC (Fischler-Bolles 1981, [9]) — outlier-robust global affine initialisation.
- Enables (in the atlas context):
  - **APAP (zaragoza2013-apap)** — SVA is named in APAP's §1.1 as the closest prior art in the spatially-varying-warp family. APAP is motivated explicitly by SVA's affine-model limitation: it upgrades the local model from affine (6 DOF) to projective (8 DOF) and replaces the global iterative solve with per-cell closed-form Moving DLT, achieving both better accuracy and dramatically faster runtime.
- Refutes / supersedes:
  - The assumption that global parametric warps (homography, affine) are the only option for two-view stitching with occlusion and large displacement. SVA demonstrates a smooth non-parametric field is tractable and handles general camera motion.
- Refuted / superseded by:
  - **APAP (zaragoza2013-apap)** on accuracy (all five image pairs in APAP Table 1) and runtime (15 min SVA vs sub-minute APAP for the same pair).

# Atlas update plan

## UPDATE: apap-image-stitching

Section: Remarks
Role: supplementary — SVA is already in `sources.references` of the apap-image-stitching page. The following bullets add grounded detail that the page currently lacks.

- **SVA as the affine-field predecessor.** Lin et al. (CVPR 2011) introduced the idea of replacing a single global parametric transform with a spatially varying affine field, estimated jointly with correspondence via a CPD-inspired EM loop with Gaussian-kernel smoothness regularisation. APAP (Zaragoza et al. 2013) inherits the "spatially varying field" concept from SVA and the two papers are contemporary competitors at CVPR 2011 (SVA) and CVPR 2013 (APAP). The key conceptual step from SVA to APAP is the upgrade from affine (6-DOF) to projective (8-DOF) as the local model, and the replacement of the global iterative EM solve with per-cell closed-form weighted DLT.
- **Affine vs projective extrapolation (APAP §1.1, Fig. 1b).** SVA's affine regularisation produces correct interpolation within the overlap region but extrapolates as a smoothly varying affine map in the non-overlapping regions. For a camera undergoing translation relative to a non-planar scene, the correct extrapolation is projective, not affine — an affine extrapolation drifts from the true warp with increasing distance from the overlap. This is APAP's stated motivation: "as-projective-as-possible" extrapolation. The APAP paper's Fig. 1b illustrates the two failure modes side by side.
- **Runtime contrast (APAP §4).** SVA (MATLAB, i7): approximately 15 minutes for the temple pair (1024×768) and approximately 1 hour for railtracks (1500×2000). APAP (MATLAB + C Mex): "less than a minute" for 100×100 cells with 2100 matches. The runtime difference is inherent to the optimisation structure: SVA solves a global $M \times 6$ system per EM iteration with an outer annealing loop ($\approx 75$ outer steps); APAP solves one $2N \times 9$ SVD per cell, each in $O(N)$, in a single pass with no iteration.
- **Empirical accuracy contrast (APAP Table 1, §4.2).** On the five image pairs tested by APAP: SVA yields the worst test RMSE among compared methods on the temple pair (12.3 px vs APAP 1.4 px) and second-worst on railtracks (7.5 px vs APAP 4.5 px). SVA does not outperform APAP on any of the five tested pairs. The gap is largest on the temple pair, which has strong perspective parallax — precisely the regime where the affine-vs-projective distinction matters most.
- **When SVA may still be preferred.** For scenes where depth variation is gentle and smooth (no large depth discontinuities, no strong perspective), SVA's affine field is a valid approximation and its extrapolation properties are comparable to APAP's. SVA also has a simpler theoretical motivation (CPD-style registration) that may be easier to extend with domain-specific priors (e.g. requiring straight lines to map to straight lines, mentioned in SVA §6 as future work). In practice, the runtime disadvantage makes SVA a poor choice whenever APAP is available.

# Provenance

- Paper text: `docs/papers/.cache/lin2011-svastitching.txt` (8 pages + appendices, IEEE CVPR 2011, pp. 272–279 in conference numbering).
- Index entry: `docs/papers/index.yaml`, id `lin2011-svastitching`. Index notes: "Replaces the global homography with a smoothly-varying affine field obtained by alternately fitting per-feature affines and smoothing them across the image. APAP (§2) names SVA as its closest precedent in the spatially-varying-warp family, but notes SVA only models affine deformations and cannot represent perspective parallax."
- Abstract: "we introduce a smoothly varying affine stitching field which is flexible enough to handle parallax while retaining the good extrapolation and occlusion handling properties of parametric transforms."
- §2, Eq. 1: deviation $(\Delta a_i)_{6\times 1} = v(b^0_{i(1)}, b^0_{i(2)})$; affine at feature $i$: $a_i = a_\text{global} + \Delta a_i$.
- §2, Eq. 2: warped feature $b_i$ as affine applied to $b^0_i$ (6-parameter affine in block matrix form).
- §2, Eq. 3: Gaussian mixture likelihood $P(t'_{1:N} | b_{1:M}) = \prod_j (\sum_i g(t'_j - b_i, \sigma_t) + 2\kappa\pi\sigma_t^2)$.
- §2, Eq. 4–5: smoothness regulariser in Fourier domain; simplified closed form $\Psi(A) = \mathrm{tr}(\Delta A^T G^{-1} \Delta A)$ (proved in Appendix A, Eq. 12–16).
- §2, Eq. 6: total cost $E(A) = -\sum_j \log(\sum_i g(\cdot) + 2\kappa\pi\sigma_t^2) + \lambda\Psi(A)$.
- §2.1, Fig. 4: algorithm pseudocode — outer annealing loop on $\sigma_t$ (1.0 to 0.1 by factor 0.97); inner EM loop solving Eq. 8 until convergence.
- §2.1, Eq. 8: M-step linear system $CG + 2\lambda \Delta A^{k+1} = 0_{6\times M}$ → closed-form $\Delta A^{k+1}$.
- §2.1, Eq. 9: stitching field at query point $v(z) = \sum_i w_i g(z - b^0_{i(1:2)}, \gamma)$, $W = G^+ \Delta A$.
- §3: implementation — $\kappa = 0.5$, $\lambda = 10$, $\gamma = 1$, coordinates normalised to zero-mean unit-variance; runtime: "approximately 8 minutes" for 1200 SIFT features on i7 MATLAB.
- §4 (Analysis), Fig. 5: mean errors 1.92 px (smooth V-scene) and 4.57 px (depth-discontinuity scene) for 500×500 synthetic images with 625 features.
- §5.3 (Matching): SVA used as a matcher produces 40% more matches than SIFT nearest-neighbour and more than A-SIFT (Fig. 9).
- §6 (Conclusion): "Our algorithm's primary limitation is the violation of affine coherence at depth boundaries." — direct quote retained; the applicability boundary.
- APAP paper cross-reference (zaragoza2013-apap, §1.1 and §4.2): SVA described as "closest precedent"; APAP RMSE vs SVA: temple test 1.4 vs 12.3 px, railtracks test 4.5 vs 7.5 px; SVA runtime ~15 min (temple) vs APAP "tens of seconds."
