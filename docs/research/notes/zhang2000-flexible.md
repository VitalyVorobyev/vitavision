---
paper_id: zhang2000-flexible
title: "A Flexible New Technique for Camera Calibration"
authors: ["Z. Zhang"]
year: 2000
url: https://www.microsoft.com/en-us/research/wp-content/uploads/2016/02/tr98-71.pdf
created: 2026-05-01
relevant_atlas_pages: [zhang-planar-calibration, homography]
---

# Setting

**Problem class.** Metric camera calibration from multiple views of a planar calibration pattern. No specialised 3-D calibration rig is required. The pattern can be printed on paper and placed on any flat surface; either the camera or the pattern may move freely between views, and the motion need not be measured.

**Inputs.**
- $n \geq 3$ images of a planar target at distinct, non-parallel orientations (the abstract allows $n \geq 2$ with a zero-skew constraint; the 5-DOF closed form requires $n \geq 3$).
- Detected point correspondences $\{(M_j, m_{ij})\}$: 2-D metric coordinates $M_j = [X_j, Y_j]^T$ on the target plane (known from the pattern) and subpixel image coordinates $m_{ij} = [u_{ij}, v_{ij}]^T$ (detected by a corner finder).
- No knowledge of the camera-to-target pose or relative motion.

**Outputs.**
- Intrinsic matrix $A \in \mathbb{R}^{3 \times 3}$ (5 parameters: $\alpha, \beta, \gamma, u_0, v_0$).
- Two radial distortion coefficients $(k_1, k_2)$.
- Per-view rigid pose $(R_i, t_i)$ for each of the $n$ views.

**Guarantees.**
- The closed-form linear step yields a unique solution for the intrinsic parameters (up to scale in $b$) when $n \geq 3$ and views are in general position (non-parallel orientations). This provides the initial estimate.
- The nonlinear Levenberg-Marquardt (LM) refinement minimises the geometrically meaningful total reprojection error and is guaranteed to converge to a local minimum given a sufficiently accurate initialisation from the closed-form step. Global optimality is not guaranteed.

# Core idea

A planar target at $Z = 0$ in the world frame maps to its image by a homography: $s\tilde{m} = H\tilde{M}$ where $H = \lambda A [r_1 \; r_2 \; t]$ (§2.2, eq. 2). Because $r_1$ and $r_2$ are the first two columns of a rotation matrix, they are orthonormal. This orthonormality encodes two constraints on $B = A^{-T}A^{-1}$ (the image of the absolute conic, IAC) per view (§2.3, eqs. 3–4):

$$h_1^T B h_2 = 0, \qquad h_1^T B h_1 - h_2^T B h_2 = 0.$$

Each constraint is linear in the 6-vector $b = [B_{11}, B_{12}, B_{22}, B_{13}, B_{23}, B_{33}]^T$ via the row $v_{ij}^T b = h_i^T B h_j$ (eq. 7–8). Stacking two rows per view produces a $2n \times 6$ homogeneous system $Vb = 0$ (eq. 9), solved by the right singular vector of $V$ corresponding to the smallest singular value. Once $b$ is in hand, the intrinsic matrix $A$ is extracted in closed form via six scalar formulas derived from the Cholesky-like structure of $B$ (Appendix B). Per-view extrinsics follow immediately from $H$ and $A^{-1}$ (§3.1). The closed-form solution is then refined by Levenberg-Marquardt (Minpack implementation) over the total reprojection error (§3.2, eq. 10), with radial distortion $(k_1, k_2)$ jointly optimised (§3.3, eq. 14). Rotation is parameterised by the Rodrigues 3-vector to keep the Jacobian unconstrained.

The geometric interpretation: the two orthonormality constraints are equivalent to requiring that the circular points of each view's model plane — projected by $H$ to $h_1 \pm ih_2$ — lie on the IAC (§2.4). Changing the plane orientation between views changes the circular-point projections, breaking degeneracy and adding independent rows to $V$.

# Assumptions

1. (hard) The calibration target is planar to within the precision needed. The paper (§5.3) quantifies sensitivity: random model noise up to ~5% of square side is tolerable for $\alpha, \beta$; systematic non-planarity (e.g. bent paper) degrades $u_0, v_0$ faster and should be kept below ~3% of pattern size.
2. (hard) At least 3 views with non-parallel orientations of the target plane. Parallel planes contribute linearly dependent rows to $V$ (§4, Proposition 1), yielding no additional constraints. Pure translation is the special case $R_2 = R_1$, which is also degenerate.
3. (soft) Lens distortion is small enough that the distortion-free closed-form init provides a good starting point for LM. The paper (§5.2, Table 1) shows the closed-form $k_1$ can have the wrong sign — the LM stage recovers the correct distortion shape. This is not a failure: it demonstrates that the linear init is "reasonable" (§5.2), not exact, under distortion.
4. (soft) Image point noise is i.i.d. Gaussian with mean zero (§3.2). Structured noise (rolling shutter, motion blur, correlated corner-detector errors) is not modelled; calibration accuracy degrades but the estimator does not fail.
5. (hard) The intrinsic matrix $A$ is constant across all views (fixed focal length, no zoom). Mixed-zoom calibration is out of scope.
6. (soft) The two-parameter radial model $(k_1, k_2)$ is adequate. The paper explicitly defers higher-order and tangential terms to Brown-Conrady / Weng-style models (§3.3), noting they cause numerical instability without accuracy gain for typical desktop cameras.
7. (soft) The principal point is at the image centre or nearly so for the $n = 2$ case where a zero-skew constraint is added. No special assumption is needed for $n \geq 3$.

# Failure regime

- **Parallel planes.** If all views are obtained by translating the pattern parallel to itself, $R_i$ is identical across views and $V$ has rank $\leq 2$ regardless of translation — all rows are linearly dependent (§4). The system $Vb = 0$ is underdetermined. This is the most common practical mistake; rotating the board ~30° between views avoids it (Fig. 3 shows optimal accuracy near 45°).
- **Near-pure-translation between views.** A small-angle rotation between views results in nearly linearly dependent rows in $V$, poorly conditioned SVD, and large variance on $b$. The paper's simulation (Fig. 3) shows 40% failure for $\theta = 5°$ with 3 views.
- **Heavy radial distortion initialisation failure.** The closed-form step ignores distortion; under very wide-angle or fisheye lenses ($k_1 \ll -0.5$) the initial $b$ estimate can be far from the truth, causing LM to converge to a poor local minimum or diverge. The paper does not characterise this regime quantitatively.
- **Very few or very many views with insufficient diversity.** Two views require the zero-skew constraint as a workaround; a single view allows only 2 parameters. Conversely, adding many nearly-identical views does not improve $b$ (Fig. 2 shows diminishing returns beyond ~5 views).
- **Partial pattern visibility.** The method requires complete correspondence sets; partially occluded targets yield fewer correspondences per view. If any view has fewer than 4 correspondences, its homography $H_i$ cannot be estimated (DLT needs $n \geq 4$ points for a well-determined 8-DOF homography). Views with too few points should be dropped.
- **Non-planar pattern.** The homography model assumes $Z = 0$ for all target points. Pattern bending (cylindrical non-planarity) at 10% of pattern size causes ~15% error in $\alpha, \beta$ and ~4 px error in $u_0, v_0$ (§5.3.2, Fig. 10). Spherical non-planarity is less damaging.
- **Singular $B$ extraction.** If $B_{11}B_{22} - B_{12}^2 \leq 0$ (denominator in the $v_0$ formula), the recovered $B$ is not positive definite and the square roots for $\alpha, \beta$ become imaginary. This indicates a degenerate or badly noisy input; the LM stage cannot recover.

# Numerical sensitivity

- **Homography estimation: Hartley normalisation is mandatory.** Appendix A warns that the $2n \times 9$ DLT matrix $L$ for homography estimation is "poorly conditioned numerically" when raw pixel and world coordinates are mixed. Hartley's isotropic normalisation (translate to zero mean, scale to mean distance $\sqrt{2}$) must be applied to both point sets before DLT, then undone afterwards (reference [12] in the paper = Hartley 1995 ICCV "In defence of the 8-point algorithm"). Without this, the recovered $H_i$ have large numerical errors that propagate into $V$ and corrupt $b$.
- **Conditioning of $V$.** With 3–5 views and well-chosen orientations, $V$ is a small $6 \times 6$ to $10 \times 6$ matrix and its SVD is numerically stable in double precision. The singular value ratio (condition number) is a proxy for how well-separated the calibration views are; views at $\sim 45°$ to the image plane give the best conditioning (§5.1, Fig. 3).
- **B extraction formulas (Appendix B).** The denominator $B_{11}B_{22} - B_{12}^2$ appears in three of the six formulas. Near-zero skew ($\gamma \approx 0$, which is typical) drives $B_{12} \approx 0$, making this denominator $\approx B_{11}B_{22} > 0$ — numerically safe. Cameras with significant skew (film scanning rigs) face a less stable extraction.
- **Distortion initialisation.** The alternation strategy (§3.3) that initialises $k_1 = k_2 = 0$ and then estimates distortion by linear least-squares (eq. 13) can converge slowly. The paper recommends the joint LM approach (eq. 14) with $k_1 = k_2 = 0$ as initial guess. Note that the linear $k$-estimate from eq. 13 can have the wrong sign for barrel-distorted lenses (§5.2); this is expected and harmless when used only as a warm start for eq. 14.
- **Reprojection-error scale.** The LM cost (eq. 10/14) is in pixels squared. Numerical stability of LM depends on the Jacobian conditioning, which is affected by image resolution and pattern size. For high-resolution cameras (≥4 MP), the raw pixel coordinates amplify the gradient; normalisation of the cost by the number of points is good practice (not specified in the paper).
- **Double precision.** The paper does not address precision explicitly, but the intermediate quantities ($b$ with entries on the order of $1/\alpha^2 \sim 10^{-6}$ for $\alpha \approx 1000$ px) require double precision; single-precision accumulation in $V^TV$ loses digits.

# Applicability

- Use when: calibrating any camera with a lens that can be approximated by a pinhole + two-term radial distortion model (standard, telephoto, mild wide-angle). The method is the de facto standard for calibration in computer vision — implemented in OpenCV (`cv::calibrateCamera`), MATLAB Camera Calibration Toolbox, ROS, and essentially every calibration pipeline since 2000.
- Use when: a flat calibration target is practical (checkerboard, ChArUco, ring grid, PuzzleBoard — any planar pattern whose metric coordinates are known). The method is agnostic to how corners are detected; any accurate point-to-plane correspondence source works.
- Use when: the calibration setup needs to be portable and cheap. "The pattern can be printed on a laser printer and attached to a 'reasonable' planar surface (e.g., a hard book cover)" (§1).
- Use when: accuracy requirements are moderate to high for standard lenses. The paper reports $< 0.3\%$ relative error in $\alpha, \beta$ and $\sim 1$ px in $(u_0, v_0)$ at 0.5 px image noise (§5.1).
- Don't use when: the lens has extreme distortion (fisheye, hemispheric, omnidirectional). The two-term radial model is insufficient; use Mei-Scaramuzza or Kannala-Brandt models with their associated calibration procedures.
- Don't use when: sub-millimetre metrology accuracy is required (e.g., industrial machine vision, photogrammetry). Use a 3-D calibration object (Tsai 1987 with precisely machined 3-D rig, or structured-light methods) where the world-point accuracy is guaranteed by manufacturing.
- Don't use when: the camera is a rolling-shutter sensor imaging a fast-moving target. The homography model assumes a global shutter; rolling-shutter distortion biases the extracted corners.
- Compared against:
  - **Tsai 1987 (tsai1987-versatile)** — requires a 3-D calibration rig (two or three orthogonal planes or a known-translation stage). Higher setup cost; in principle more robust to near-degenerate flat-target poses. Zhang explicitly positions the method as more flexible and less expensive than Tsai (§1, §6).
  - **Self-calibration (Maybank-Faugeras 1992, Luong-Faugeras 1997)** — no calibration object at all; uses scene rigidity. More flexible but less reliable ("not yet mature," §1). Zhang is intermediate: uses a 2-D metric pattern rather than a 3-D rig or implicit scene structure.
  - **Modern fisheye-aware calibration** (Kannala-Brandt 2006, OCamCalib) — extends Zhang's homography framework with a polynomial or Scaramuzza projection model; necessary for FOV > ~120°.

# Connections

- Builds on:
  - **Luong and Faugeras 1997** (the IAC / absolute conic concept; reference [16] in the paper) — the interpretation of $B = A^{-T}A^{-1}$ as the image of the absolute conic and the circular-point framing of the constraints (§2.4) derive directly from this work.
  - **Hartley 1995** (Hartley normalisation for DLT; reference [12] in the paper) — the mandatory data normalisation in Appendix A uses this technique.
  - **Weng, Cohen, Herniou 1992 (weng1992-camera)** — the radial distortion model $(k_1, k_2)$ and the alternation estimator for distortion coefficients follow Weng et al. (§3.3 cites references [25, 2] = Weng and Brown).
  - **tsai1987-versatile** — the Tsai 1987 3-D-rig method is the primary comparison baseline; Zhang's method is a direct response to its cost and rigidity requirements.
- Enables (in the atlas and in practice):
  - **zhang-planar-calibration** — primary source; the public page is a faithful implementation of this paper.
  - **rochade** (placht2014-rochade) — ROCHADE detects checkerboard corners to feed Zhang-style calibration; the paper's entire calibration pipeline is Zhang's method.
  - **ocpad** (fuersattel2016-ocpad) — OCPAD also feeds Zhang calibration as its downstream consumer.
  - **pyramidal-blur-aware-xcorner** (abeles2021-pyramidal), **chess-corners** (bennett2013-chess), **puzzleboard** (stelldinger2024-puzzleboard) — all planar corner/target detectors in the atlas are explicitly motivated by their role as feature extractors feeding Zhang-style calibration.
  - Essentially every stereo calibration pipeline (OpenCV `stereoCalibrate`, ROS camera calibration) extends Zhang's per-camera calibration to the stereo case by adding the inter-camera extrinsic as an additional parameter block in the same LM refinement.
- Refutes / supersedes:
  - The requirement for a 3-D calibration rig in standard camera calibration scenarios. Zhang does not refute Tsai in precision-metrology contexts, only in general-purpose / portable calibration contexts.

# Atlas update plan

## UPDATE: zhang-planar-calibration

The existing page is comprehensive and technically accurate. It correctly covers the IAC definition, the constraint vector $v_{ij}$, the $Vb = 0$ system, the closed-form Appendix-B formulas, the per-view pose recovery, and the LM refinement with radial distortion. The Rust code is a faithful implementation of §3.1 and §3.3. The gaps below are supplementary improvements, not corrections.

Section: Goal
- The current Goal says "$n \geq 3$ images." The paper's abstract says "at least two" and §3.1 clarifies $n = 2$ works with the zero-skew constraint. Recommend adding a parenthetical: "($n \geq 2$ if zero skew is assumed, $n \geq 3$ for the full five-parameter model)."

Section: Algorithm — step 2
- The zero-skew fallback row for $n = 2$ (add $[0, 1, 0, 0, 0, 0]$ to $V$) is mentioned in the algorithm box. No change needed. Minor: the paper also notes $n = 1$ admits a 2-parameter solution (§3.1 last paragraph) — not necessary to add but worth a Remarks bullet.

Section: Algorithm — step 6 (distortion initialisation)
- The current page says "Initialise $k_1 = k_2 = 0$ (or by linear least squares on the residuals)." The paper (§3.3, eq. 13) gives the explicit linear least-squares formula for the alternation estimate of $k$. A Remarks bullet (see below) explaining *why* the linear estimate can have the wrong sign is more useful than the formula itself.

Section: Remarks
- **Add bullet — parallel-orientation degeneracy is proved, not just asserted.** The page's third Remarks bullet states the degeneracy fact correctly. Strengthen it with the mechanism: all views of parallel planes project the *same* circular points of the model-plane-at-infinity, yielding the same two constraints (§2.4 geometric interpretation, §4 Proposition 1). This is the geometric reason, not just an algebraic one.
- **Add bullet — distortion-sign reversal in the linear init.** The paper (§5.2, Table 1) explicitly shows that the closed-form linear estimate of $k_1$ is positive (pincushion) while the true value is negative (barrel). The LM step on eq. 14 corrects this. Consequence for implementation: initialising LM with the linear $k$ estimate from eq. 13 rather than $k = 0$ does *not* guarantee a better start; the joint init with $k = 0$ is sufficient and safer.
- **Add bullet — numerical precision requirements.** The 6-vector $b$ has entries $B_{11} \sim 1/\alpha^2 \approx 10^{-6}$ for a 1000-px focal length. Accumulating $V^TV$ in single precision loses ~3 decimal digits and can produce an indefinite $B$; double precision is required throughout the linear stage.
- **Add bullet — model non-planarity tolerance.** The paper (§5.3.2) quantifies: systematic cylindrical bending at 3% of pattern size (i.e. ~3 mm over a 100 mm pattern) causes < 1% error in $\alpha, \beta$ and ~0.3 px error in principal point — still usable. Beyond ~5–7%, errors grow rapidly. Practical implication: attaching the pattern to a glass plate or rigid aluminium sheet is preferred over a soft book cover.
- **Add bullet — LM convergence speed.** The paper reports "3 to 5 iterations to converge" for the nonlinear refinement (§5.1). This is the empirical performance on a 512×512 image with 140 points per view and 3 views. Convergence depends on the Jacobian condition; with many views and many points, more iterations may be needed.

Section: References
- No change needed. All four references in the page's §References list are in `docs/papers/index.yaml` and correctly cited.

## UPDATE: homography

The `homography` concept page already references `zhang2000-flexible` in `sources.references` and correctly describes the IAC decomposition in the "Decomposition for calibration" subsection. No content gap. One optional improvement:

Section: Mathematical Description — Decomposition for calibration
- The current text says "the constraints $r_1^T r_2 = 0$ and $\|r_1\| = \|r_2\| = 1$ give two linear equations per homography in the entries of $K^{-T}K^{-1}$." This is accurate. An optional enhancement: name the quantity $B = K^{-T}K^{-1}$ explicitly as the Image of the Absolute Conic (IAC) and cite §2.3 of Zhang 2000 — this makes the homography page a better cross-reference for readers arriving from the calibration page. Defer unless the page is being revised for other reasons.

# Provenance

- Full text: `docs/papers/.cache/zhang2000-flexible.txt` (MSR-TR-98-71, last updated Aug. 13, 2008 with a corrected footnote in §3.3).
- §1 Motivations: framing vs. Tsai (3-D rig) and vs. self-calibration; quote "The pattern can be printed on a laser printer and attached to a 'reasonable' planar surface (e.g., a hard book cover)" is verbatim from §1 p. 3.
- §2.1 Notation: pinhole model eq. 1; intrinsic matrix $A$ with $(\alpha, \beta, \gamma, u_0, v_0)$.
- §2.2 eq. 2: homography $H = \lambda A [r_1 \; r_2 \; t]$.
- §2.3 eqs. 3–4: the two orthonormality constraints per homography.
- §2.3 eqs. 6–8: the IAC vector $b$; the constraint row $v_{ij}$; the stacked system $V b = 0$.
- §2.4: geometric interpretation via circular points of model plane; establishes why different orientations provide independent constraints.
- §3.1: closed-form solution (SVD of $V$); extrinsic recovery; Appendix B formulas for $v_0, \lambda, \alpha, \beta, \gamma, u_0$.
- §3.2 eq. 10: ML reprojection-error cost; Rodrigues parameterisation; LM via Minpack; "3 to 5 iterations to converge" (§5.1 p. 9).
- §3.3 eqs. 11–12 (distortion model), eq. 13 (linear $k$ estimate), eq. 14 (joint LM); distortion-sign discussion (§5.2, Table 1 footnote paragraph p. 12).
- §4 Proposition 1: proof that parallel planes yield linearly dependent rows in $V$.
- §5.1: simulation results (Fig. 1 — linear noise scaling; Fig. 2 — diminishing returns beyond ~5 views; Fig. 3 — 40% failure at $\theta = 5°$, optimal near 45°).
- §5.2 Table 1: real-data calibration (2–5 images); note closed-form $k_1 = +0.161$ (wrong sign) corrected by MLE to $k_1 = -0.227$.
- §5.3 (added 1998): sensitivity to model imprecision (random: Fig. 8; spherical: Fig. 9; cylindrical: Fig. 10). Key finding: cylindrical bending is worse than spherical; 3% non-planarity threshold.
- Appendix A: DLT for homography estimation; Hartley normalisation requirement (reference [12]).
- Appendix B: closed-form extraction of $A$ from $b$; footnote correcting $u_0$ formula (typo corrected 2002).
- Appendix C: rotation-matrix approximation via SVD ($R = UV^T$); Frobenius-norm optimality.
