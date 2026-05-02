---
paper_id: weng1992-camera
title: "Camera calibration with distortion models and accuracy evaluation"
authors: ["J. Weng", "P. Cohen", "M. Herniou"]
year: 1992
url: https://www.cs.auckland.ac.nz/courses/compsci773s1c/lectures/camera%20distortion.pdf
created: 2026-05-02
relevant_atlas_pages: [zhang-planar-calibration, kumar-generalized-rac]
---

# Setting

**Problem class.** Stereo camera calibration: recovery of intrinsic parameters (principal point, row and column focal lengths, distortion coefficients) and extrinsic parameters (rotation $R$, translation $T$) for each camera of a stereo pair, from a set of known 3-D control points and their observed pixel positions. The paper addresses two related goals: (1) introducing a camera model that accounts for radial, decentering (tangential), and thin-prism distortions in off-the-shelf nonmetric cameras, and (2) providing a resolution-normalised accuracy measure that allows comparing calibrations across systems with different field-of-view, baseline, and depth ranges.

**Inputs.**
- $n$ visible 3-D control points with known world coordinates $(x_i, y_i, z_i)$ measured at sub-pixel-equivalent precision.
- Corresponding pixel positions $(r'_i, c'_i)$ in the digital image, ideally extracted with sub-pixel accuracy by fitting polynomial curves to the edge profiles of a calibration pattern (§V-B-2).
- Camera and digitiser specifications: pixel row/column spacings $(s_u, s_v)$ and image dimensions.

**Outputs.** Per-camera intrinsic parameter vector $m = (r_0, c_0, f_u, f_v, R, \alpha, \beta, \gamma)$ (principal point, row and column focal lengths, rotation angles) and distortion parameter vector $d = (k_1, g_1, g_2, g_3, g_4)$, where $k_1$ is radial, $g_1$–$g_4$ are the combined decentering-plus-thin-prism tangential coefficients (see Core idea). Per stereo pair: the combined calibration enables 3-D triangulation of test points.

**Accuracy reported.** Telelens ($f = 25$ mm, FOV $\approx 23°$): NSCE $\approx 1.06$ after complete distortion model (§V-B-3, Table III). Wide-angle ($f = 8.5$ mm, FOV $\approx 64°$): NSCE $\approx 1.41$ with radial-only model vs. $\approx 1.16$ with complete model (§V-B-4, Table V) — a significant residual improvement from adding tangential correction.

# Core idea

The paper's central contribution is the joint treatment of three distortion types and the two-step estimation procedure that makes their simultaneous recovery tractable.

**Distortion model.** The distortion-free normalised image coordinates $(u, v)$ satisfy the pinhole projection; the observed coordinates $(u', v')$ deviate by a sum of three contributions (§II-B, eq. 14):

$$
\delta_u(u, v) = k_1 u(u^2 + v^2) + (g_1 + g_3)u^2 + g_4 uv + g_1 v^2
$$

$$
\delta_v(u, v) = k_1 v(u^2 + v^2) + g_2 u^2 + g_3 uv + (g_2 + g_4)v^2
$$

where:
- $k_1$ — first-order **radial distortion** coefficient (from $\Delta_r = (k_1 \rho^2 + k_2 \rho^4 + \cdots)$; the paper retains only $k_1$ in practice, eq. 6);
- $g_1, g_2, g_3, g_4$ — **combined decentering and thin-prism** tangential coefficients. These arise from merging the decentering distortion parameters $p_1, p_2$ (eq. 11) and thin-prism parameters $s_1, s_2$ (eq. 13): $g_1 = s_1 + p_1$, $g_2 = s_2 + p_2$, $g_3 = 2p_1$, $g_4 = 2p_2$ (eq. 15). Note that while the paper's notation combines decentering and thin-prism into four $g$ coefficients, the photogrammetry convention labels the decentering coefficients $p_1, p_2$ and the net tangential distortion in $(u, v)$ corresponds to the well-known Brown-Conrady terms.

The key structural observation (§II-B-4): the combined distortion model (eq. 14 / eq. 20) is linear in the distortion coefficients $(k_1, g_1, g_2, g_3, g_4)$ when the non-distortion parameters $m$ are fixed. This linearity is what enables the two-step estimation.

**Two-step calibration procedure** (§III-A, Fig. 5):

1. **Step 1 (closed-form linear solve for $m$, assuming $d = 0$):** Using only the central image points (within radius $\approx$ one-quarter of the image side), where distortion is small, set up a homogeneous linear system $AW = 0$ with 12 unknowns encoding the extrinsic and non-distortion intrinsic parameters (eqs. 24–26). Solve by constrained least squares (normalising $t_3 = 1$, eq. 29–30), recover the rotation matrix by the unit-eigenvector method (Appendix, eq. 51–53), and compute preliminary intrinsics $r_0, c_0, f_u, f_v$ (eq. 32). This initialisation is unaffected by distortion because central points have negligible distortion.

2. **Step 2 (alternating nonlinear refinement of $m$ and $d$ jointly):** With $m$ from Step 1 as initial guess, minimise the total pixel reprojection error (eq. 41) $\sum_i [(r'_i - r_i(m, d))^2 + (c'_i - c_i(m, d))^2]$ by alternating between (a) nonlinear optimisation over $m$ with $d$ fixed, and (b) closed-form linear solution for $d$ with $m$ fixed (eq. 43, a $2n \times 5$ linear least-squares in $(k_1, g_1, g_2, g_3, g_4)$). Iteration continues until convergence. The alternating decoupling suppresses harmful interactions between $m$ and $d$ that cause divergence in a direct joint nonlinear search (§III-A rationale).

**Accuracy evaluation** (§IV): The paper introduces the **Normalised Stereo Calibration Error** (NSCE, eq. 46 / eq. 47), defined as the ratio of the RMS lateral triangulation error to the RMS lateral pixel-digitisation uncertainty at the test-point depth. NSCE $< 1$: sub-pixel-level accuracy; NSCE $\approx 1$: calibration residual equals digitisation noise (good calibration); NSCE $\gg 1$: poor calibration. This measure is invariant to FOV, baseline, and depth range — enabling calibration comparison across systems. The single-camera variant is the **Normalised Calibration Error** (NCE), using ground-truth depth instead of stereo triangulation.

# Assumptions

1. (hard) **3-D control target with known sub-pixel-equivalent coordinates.** The calibration error from target positional uncertainty propagates directly into calibration residuals. The paper requires the target accuracy to be "several orders [of magnitude] higher" than the pixel rectangle at the test depth (§IV, footnote). A poorly made or poorly positioned target cannot be compensated by distortion modelling.

2. (hard) **Only first-order radial distortion $k_1$ is included.** The model supports higher-order $k_2, k_3, \ldots$ but the paper retains only $k_1$ in all experiments. The justification is implicit: with the central-point initialisation strategy, the initial $m$ is good enough that the nonlinear refinement resolves the dominant distortion contribution through $k_1$ alone. Cameras with extreme radial distortion (fisheye) would require $k_2$.

3. (soft) **Central-point constraint during linear estimation.** Points within radius $\approx \tfrac{1}{4}$ of the image side are used for the closed-form Step 1 solve. The tradeoff is between low distortion bias (favours small radius) and good estimation of external parameters (favours large spatial spread). Too small a subset degrades translation and rotation accuracy; the quarter-image-side heuristic is not theoretically optimal (§III-A).

4. (soft) **Image noise is i.i.d. zero-mean with variance proportional to pixel spacing.** The objective function (eq. 41) is the unweighted sum of squared pixel residuals, which is the MLE criterion when noise in $r$ and $c$ is i.i.d. Gaussian with equal variance. The paper acknowledges (§III-B) that the actual noise covariance is not identity — elements of the coefficient matrix $A$ depend on pixel coordinates — and notes the straightforward least-squares will "overtrust the less reliable components." The nonlinear step does not use a weighted covariance; it minimises eq. 41 directly.

5. (soft) **Distortion is small enough at the image centre that $d = 0$ is a valid initialisation assumption.** If a camera has extreme distortion even at the centre (fisheye, super-wide-angle), the Step 1 linear solution may be sufficiently corrupted to prevent convergence of Step 2.

6. (hard) **Tangential distortion is the sum of decentering and thin-prism effects.** The model assumes no other sources of tangential distortion. Asymmetric aberrations from manufacturing defects not captured by the $p_1, p_2, s_1, s_2$ parameterisation are not corrected.

# Failure regime

- **Neglecting tangential distortion under wide-angle lenses.** The paper demonstrates this quantitatively (§V-B-4, Tables IV and V): with a $f = 8.5$ mm lens (FOV $64°$), the radial-only model yields NSCE = 1.41 (41% above digitisation noise). Adding tangential correction reduces NSCE to 1.16. Applying the distortion-free model ($d = 0$) fails completely: NSCE = 3.98 and the nonlinear search diverges to a worse solution than the linear initialisation because the nondistortion parameter $m$ absorbs the unmodelled distortion.

- **All control points used in the linear step (not just central).** Table II shows that using all points for the Step 1 linear solve when distortion is present increases the residual positional error by a factor of about 10 and causes the nonlinear step to consume 130% more CPU time to converge (§V-A). The near-centre constraint is critical for a good initial $m$.

- **Poor control point quality.** An inadequate calibration target (positional error comparable to or larger than the pixel rectangle at the test depth) biases the calibration. The paper notes that further improving a poorly-made target's accuracy should be preferred over increasing the camera's image resolution (§IV).

- **Distortion parameter $g_3$ identified to poor relative accuracy under high noise.** Table II shows $g_3$ and $g_4$ can have relative errors of 0.18 and 0.21 (18–21%) while $k_1$ achieves 0.047 (5%) and $g_1, g_2$ achieve 1–6%. This is attributed to a compensating polynomial effect: different tangential coefficients can trade off to maintain the same net distortion shape (§V-A footnote). The consequence is that individual $g_i$ values are not reliable in isolation; only the combined tangential correction matters.

- **NSCE not applicable for single-camera calibration without ground-truth depth.** The NCE variant requires knowing the test-point depths from a separate source; in many practical setups, this is unavailable. The NSCE requires a calibrated stereo pair.

# Numerical sensitivity

- **Central-point radius choice.** The paper sets the radius at one-quarter of the image side length as a fixed heuristic. Too small: poor constraint on external parameters (translation, rotation errors grow). Too large: distortion bias corrupts the linear initialisation. No sensitivity analysis for this parameter is provided; it is presented as a practical recommendation.

- **Linear Step 1 system conditioning.** The coefficient matrix $A$ (2$n \times 12$) has columns mixing pixel coordinates ($r'_i, c'_i$) with world coordinates ($x_i, y_i, z_i$). The paper does not mention Hartley normalisation; data normalisation (centering pixel coordinates, scaling world coordinates) is not prescribed. For cameras with short focal lengths or calibration objects at very different scales, unnormalised systems can be poorly conditioned.

- **Alternating convergence.** The alternating scheme (minimise over $m$, then solve for $d$ linearly, repeat) is guaranteed to be monotonically non-increasing in the objective function but can converge slowly when $m$ and $d$ are moderately coupled. The paper does not state the convergence criterion; "a few iterations" is the empirical guidance.

- **Single $k_1$ vs. two terms.** The paper uses only $k_1$; for wide-angle lenses with significant distortion beyond the image centre, $k_2$ would improve the model at the cost of increased correlation between $k_1$ and $k_2$ (similar to the $g_3$/$g_4$ compensation noted above).

- **Rotation recovery from a $4 \times 4$ eigenvalue problem.** The Appendix (eqs. 51–53) recovers the rotation matrix as a function of the unit eigenvector of a $4 \times 4$ matrix $B = \sum_i D_i^T D_i$ associated with the smallest eigenvalue. For well-separated control points, this is numerically stable. Near-degenerate configurations (all points nearly coplanar, all at nearly the same depth) produce a poorly-conditioned $B$.

# Applicability

- Use when: calibrating off-the-shelf video cameras (moderate to significant lens distortion, non-metric lenses) where tangential distortion is known to be present or suspected. The paper's $f = 8.5$ mm results show the tangential correction reduces the residual error from 41% to 16% above the digitisation noise floor.
- Use when: a 3-D calibration target (non-coplanar points at known depths) is available. The linear Stage 1 requires known $z$ coordinates; unlike Zhang 2000, this method cannot use a flat planar pattern with multiple views.
- Use when: comparing calibration quality across different camera systems or setups. The NSCE/NCE measure normalises out FOV, baseline, and depth range.
- Don't use when: only a planar target is available — use Zhang 2000's planar calibration, which adopts a two-term radial model $(k_1, k_2)$ and optionally extends to the Brown-Conrady model.
- Don't use when: extreme fisheye or omnidirectional lenses are involved — the $k_1$-only radial term is insufficient; use Kannala-Brandt or Scaramuzza omnidirectional models.
- Compared against:
  - **Tsai 1987 (tsai1987-versatile):** Tsai uses only one radial term $\kappa_1$ and explicitly excludes tangential distortion ("only radial distortion needs to be considered," §II-B of Tsai). Weng 1992 is the direct extension that adds decentering and thin-prism terms, demonstrating experimentally that tangential correction matters for wide-angle lenses. Tsai's RAC-based Stage 1 derives a linear system for five or seven unknowns; Weng's linear Stage 1 derives a $2n \times 12$ system for all non-distortion parameters simultaneously. Tsai's Stage 2 fixes $R$, $T_x$, $T_y$ and refines only $f$, $T_z$, $\kappa_1$ nonlinearly; Weng's Stage 2 refines all parameters jointly.
  - **Zhang 2000 (zhang2000-flexible):** Zhang adopts a planar target (no 3-D rig), uses the homography + IAC framework for linear initialisation, and attributes the two-term radial model $(k_1, k_2)$ and the alternating distortion estimator to Weng et al. 1992 (§3.3 of Zhang). Zhang's Remark in §3.3 explicitly defers tangential terms to the Brown-Conrady / Weng model. In OpenCV's `calibrateCamera`, tangential distortion is the two-parameter Brown-Conrady extension $(p_1, p_2)$ of the radial model — tracing directly to Weng 1992's decentering parameterisation.

# Connections

- Builds on:
  - **Brown 1966 (not in index)** — the decentering distortion model (eq. 9/10 in the paper) traces to D. C. Brown, "Decentering distortion of lenses," Photogrammetric Eng., 1966 (reference [3] in Weng 1992). The thin-prism model similarly follows Faig 1975 and the Manual of Photogrammetry.
  - **Faig 1975 (not in index)** — four-type distortion model used as prior art; Weng 1992 retains three of the four types (excluding affinity distortion).
  - **tsai1987-versatile** — explicit predecessor for the "two-step" approach; Weng 1992 is a direct extension, cited as reference [13] in Weng's text as "a simple one-parameter radial distortion model."
  - Ganapathy 1984 (ref [8] in Weng) — closed-form linear decomposition of the camera matrix that forms the basis of Weng's Stage 1 linear solve.

- Enables (in the atlas and in practice):
  - **zhang-planar-calibration** — Zhang 2000 explicitly attributes the two-term radial distortion model and the alternating estimator to Weng et al. 1992 and Brown (§3.3); the `zhang-planar-calibration` page's Remarks note "tangential (decentering) and thin-prism terms belong to the Brown-Conrady / Weng model."
  - **kumar-generalized-rac** — Kumar 2014 inherits the Tsai-RAC framework; the Weng 1992 distortion model is the standard post-Tsai extension that the gRAC page cites for completeness.
  - **OpenCV distortion model** — OpenCV's 5-parameter model (`k1, k2, p1, p2, k3`) is the direct descendant: radial $k_1, k_2, k_3$ from the standard expansion, tangential $p_1, p_2$ corresponding to Weng's decentering $p_1, p_2$. The thin-prism terms $s_1, s_2$ are available as optional parameters in recent OpenCV versions.

- Refutes / supersedes:
  - **Tsai 1987's exclusion of tangential distortion.** Tsai's claim that "for industrial machine vision application, only radial distortion needs to be considered" (§II-B of Tsai 1987) is directly contradicted by Weng's Table V, which shows a 19% NSCE improvement from adding tangential correction for a $64°$-FOV wide-angle lens.

# Atlas update plan

## UPDATE: zhang-planar-calibration

Section: Remarks
- **Add bullet — Weng 1992 as the source of the Brown-Conrady distortion model.** The page's existing Remarks bullet "Distortion scope is two-term radial only; tangential (decentering) and thin-prism terms belong to the Brown-Conrady / Weng model and are a drop-in extension of the projection function $\breve m$" correctly names Weng 1992. A supplementary bullet could make explicit that Weng 1992 is the paper that codified the full parameterisation: radial $(k_1, k_2, \ldots)$ + decentering $(p_1, p_2)$ + thin-prism $(s_1, s_2)$; that Zhang §3.3 explicitly cites Weng for the alternating distortion estimator; and that Weng's experimental result with a 64° FOV wide-angle lens demonstrates why the tangential terms matter beyond telelens applications.
- **Strengthen the Tsai comparison context.** The tsai1987-versatile research note records Tsai's explicit exclusion of tangential distortion ("any more elaborate modeling would cause numerical instability," §II-B of Tsai). The zhang-planar-calibration page can note this in the Remarks predecessor bullet: Tsai 1987 excludes tangential distortion on stability grounds; Weng 1992 demonstrates that the alternating decoupled optimisation resolves the instability and that tangential correction is measurably beneficial for wide-angle cameras.

Section: References
- Reference 4 already correctly cites Weng 1992 in the page's reference list. No change needed.

## UPDATE: kumar-generalized-rac

Section: Remarks (supplementary — distortion model context)
- The kumar-generalized-rac page cites weng1992-camera in `sources.references`. No content currently discusses the distortion model's origin. A single Remarks bullet noting that the distortion model inherited through Tsai 1987 → Weng 1992 → standard calibration practice is the Brown-Conrady model (radial $k_1, k_2$ + tangential $p_1, p_2$), and that Weng 1992 demonstrated experimentally why tangential terms are important for wide-angle lenses, would provide useful context for readers. Defer to a future revision pass unless the page is being updated for other reasons.

# Provenance

- Full text: `docs/papers/.cache/weng1992-camera.txt` (16 pages, IEEE TPAMI 14(10):965–980, October 1992). Scanned; OCR quality is moderate but all key equations are recoverable.
- Abstract (p. 965): "we present a camera model that accounts for major sources of camera distortion, namely, radial, decentering, and thin prism distortions. The proposed calibration procedure consists of two steps." — verbatim statement of scope; retained because it is the compact authoritative framing.
- §I classification (pp. 966–967): three-category survey of prior calibration techniques; Weng 1992 critiques Tsai's "two-step method" category for (a) handling only radial distortion, and (b) discarding the radial component of observations.
- §II-A (pp. 967–968): distortion-free pinhole model; pixel-to-image-plane mapping eqs. 1–4; row focal length $f_u = s_u f$, column focal length $f_v = s_v f$.
- §II-B-1 (pp. 968–269): Radial distortion: $\Delta_r = k_1 \rho^2 + k_2 \rho^4 + \cdots$ (eq. 6), Cartesian form eq. 8. Barrel (negative $k_1$) vs. pincushion (positive $k_1$) illustrated in Fig. 3.
- §II-B-2 (pp. 969): Decentering distortion: $\delta_{u}^d = p_1(3u^2 + v^2) + 2p_2 uv$, $\delta_v^d = 2p_1 uv + p_2(u^2 + 3v^2)$ (eq. 11). Fig. 4.
- §II-B-3 (pp. 969): Thin prism distortion: $\delta_u^p = s_1(u^2 + v^2)$, $\delta_v^p = s_2(u^2 + v^2)$ (eq. 13); tangential-only effect, radially symmetric magnitude.
- §II-B-4 (pp. 969–270): Total distortion: combined eq. 14 → redefined parameters $g_1 = s_1 + p_1$, $g_2 = s_2 + p_2$, $g_3 = 2p_1$, $g_4 = 2p_2$ → eq. 15. Final camera model eq. 20 (shown at bottom of p. 970).
- §II-C (p. 970): Complete camera model eq. 20: $u/f + \delta'_u(\hat u, \hat v) = \hat u$, $v/f + \delta'_v(\hat u, \hat v) = \hat v$ — distortion arguments replaced by pixel-based approximations $(\hat u, \hat v)$ per eq. 17–19, justified by §II-C discussion.
- §III-A (pp. 970–471): Two-step procedure motivation (a)–(e): (a) closed-form is non-iterative and immune to distortion at image centre; (b) nonlinear step handles all distortion types; (c) nonlinear step corrects even distortion-free cameras; (d) alternating avoids $m$–$d$ interaction causing false minima; (e) real-time operation is unnecessary.
- §III-B (pp. 471–472): Linear closed-form for $m$: homogeneous system $AW = 0$ (eq. 26) with 12-column matrix $A$; normalised to $t_3 = 1$ (eq. 29); least-squares solution $W'$; rotation recovery via Appendix eigenvalue method.
- §III-B-2 (pp. 472–473): Nonlinear optimal estimation: objective function eq. 41; linearisation around $\hat m$ → Jacobian $J$ → linear minimum variance estimator eq. 39–40.
- §III-C (p. 473): Closed-form linear solve for $d$ with $m$ fixed: $\|Qd + C\|^2$ (eq. 43); $Q$ is $2n \times 5$. "The vector $d$ that minimises (43) is computed directly without resorting to iterations."
- §IV (pp. 473–474): Accuracy measure. Pixel rectangle at depth $z$: sides $a = f_u^{-1} z$ and $b = f_v^{-1} z$ (eq. 44); digitisation noise variance $(a^2 + b^2)/12$ (eq. 45). NSCE definition eq. 46/47. NSCE < 1: sub-pixel; NSCE ≈ 1: good; NSCE >> 1: poor (p. 474).
- §V-A (pp. 475–476): Simulation with synthetic distortion data, Table II (ground truth: $k_1 = 0.01$, $g_1 = 0.02$, $g_2 = -0.009$, $g_3 = -0.02$, $g_4 = 0.009$, $n = 64$ points). Central-point linear init reduces residual $p'$ by factor of 10 vs. all-points init. Using all points caused nonlinear divergence in "a substantial number of simulations."
- §V-B-3 (pp. 476–477): Real telelens ($f = 25$ mm) results, Table III. Linear NSCE = 1.748 (distortion-free model); nonlinear with complete distortion NSCE = 1.061 ($\approx 6$% above digitisation noise floor). Maximum radial distortion $\approx 3$–4 pixels at image border; maximum tangential distortion $5$–7$\times$ smaller.
- §V-B-4 (pp. 477–479): Real wide-angle ($f = 8.5$ mm) results, Tables IV–V. Distortion-free nonlinear NSCE = 3.98 (fails). Radial-only NSCE = 1.41 (41% above noise floor). Complete model NSCE = 1.16 (16% above noise floor). Maximum radial distortion $\approx 23$ pixels; maximum tangential $\approx 3$ pixels. $k_1$ estimate is virtually identical between radial-only and complete model, confirming no coupling.
- §VI (p. 479): Conclusions: "correcting tangential distortion also leads to a considerable improvement over just correcting radial distortion" — direct quote, the headline applicability claim.
- Appendix (pp. 479–480): Rotation matrix recovery from $4 \times 4$ matrix $B = \sum_i D_i^T D_i$ via unit eigenvector of $B$ associated with smallest eigenvalue (eqs. 51–53). Based on Shuster 1978 and Faugeras-Hebert 1983 ([12] and [5] in the paper's references).
