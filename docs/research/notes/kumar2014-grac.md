---
paper_id: kumar2014-grac
title: "Generalized Radial Alignment Constraint for Camera Calibration"
authors: ["A. Kumar", "N. Ahuja"]
year: 2014
url: https://vision.ai.illinois.edu/html-files-to-import/avi_papers/Kumar_GeneralizedRAC_ICPR_2104.pdf
created: 2026-05-01
relevant_atlas_pages: [kumar-generalized-rac]
---

# Setting

**Problem class.** Single-camera intrinsic and extrinsic calibration for a perspective camera in which the image sensor is **not** perpendicular to the optic axis — a non-frontal sensor configuration arising from manufacturing tolerances (lens-sensor misalignment, approximately 3–4° in the paper's custom AVT Marlin camera) or intentionally (tilt-shift, omnifocus, depth-from-focus setups). The paper positions itself as a strict generalisation of Tsai 1987: the Tsai RAC is a special case when the tilt rotation $R = I$.

**Inputs.**
- $N \geq 4$ correspondences between known 3D world coordinates $P_w = (x_w, y_w, z_w)$ and observed pixel locations $(I^{(i)}, J^{(i)})$.
- Known pixel sizes $(s_x, s_y)$ in metric units (mm); the paper treats $s_y$ as the reference scale and $s_x$ as calibrated — same convention as Tsai.
- A known or iteratively estimated centre of radial distortion (CoD) $(I_0, J_0)$; the CoD is refined by an outer iterative loop around the linear solver.
- 2.5D acquisition geometry: the calibration target moves along its surface normal across multiple discrete positions, providing variation in $z_w$ depth. The algorithm requires non-coplanar (or quasi-coplanar) point sets because a purely planar target leaves $\lambda$ and $t_z$ coupled in the Stage 2 linear system (Eq. 35 in the paper).

**Outputs.**
- Full parameter set $U = \{I_0, J_0, s_x, s_y, \rho, \sigma, \theta, \phi, \psi, t_x, t_y, t_z, \lambda, k_1, k_2\}$: CoD, pixel sizes, tilt Euler angles $(\rho, \sigma)$, extrinsic Euler angles $(\theta, \phi, \psi)$ for the world-to-lens rotation $S$, translation $(t_x, t_y, t_z)$, camera constant (focal length) $\lambda$, and radial distortion coefficients $(k_1, k_2)$.
- The analytical (linear) stage delivers sign-ambiguous estimates of the subset $U_2 = \{\rho, \sigma, \theta, \phi, \psi, t_x, t_y\}$ plus $\lambda, t_z$ from a follow-up linear solve.
- The nonlinear refinement (LM, minimising reprojection error) then tightens all parameters jointly.

**Scale of experiments.** Synthetic: 100 trials per noise level, noise $\sigma \in \{0.05, \ldots, 1.0\}$ pixel. Real data: custom 640×480 AVT Marlin F-033C with sensor tilt $\approx 3$–$4°$; 20×20 checkerboard squares of 5 mm, positional accuracy 0.001 mm; 11 2.5D datasets at different camera stations.

# Core idea

Tsai's RAC requires the optic axis to be normal to the sensor. Under lens-sensor tilt, the optic axis is no longer normal to the sensor plane, and two geometric arguments show the classical RAC then fails (§III): (1) if the CoD is taken as the "effective" principal point, the distortion is a mixture of radial and tangential, so world and distorted-image direction vectors are not radially aligned; (2) if the RAC is formulated about the physical optic axis, the world point's footprint projection and the observed image point no longer lie in the same 3D plane, breaking parallelism.

The generalisation introduces a 2-DoF rotation matrix $R(\rho, \sigma)$ between the lens frame and the sensor frame (Eq. 1):

$$R(\rho,\sigma,0) = \begin{bmatrix}\cos\sigma & \sin\rho\sin\sigma & \cos\rho\sin\sigma \\ 0 & \cos\rho & -\sin\rho \\ -\sin\sigma & \sin\rho\cos\sigma & \cos\rho\cos\sigma\end{bmatrix}.$$

The $z$-rotation is excluded because the lens is rotationally symmetric about its optic axis — only two Euler angles $(\rho, \sigma)$ are identifiable (§II). Given $R$ and the camera constant $\lambda$, the observed non-frontal sensor point $P_{\mathrm{nf}} = (x_{d_{\mathrm{nf}}}, y_{d_{\mathrm{nf}}})$ is projected through the lens centre $O_l$ onto a hypothesized frontal sensor at distance $\lambda$:

$$\begin{bmatrix}x_{df} \\ y_{df}\end{bmatrix} = \frac{-\lambda}{r_{13}x_{d_{\mathrm{nf}}} + r_{23}y_{d_{\mathrm{nf}}} - \lambda}\begin{bmatrix}r_{11}x_{d_{\mathrm{nf}}} + r_{21}y_{d_{\mathrm{nf}}} \\ r_{12}x_{d_{\mathrm{nf}}} + r_{22}y_{d_{\mathrm{nf}}}\end{bmatrix}. \quad \text{(Eq. 4)}$$

The frontal point $P_f = (x_{df}, y_{df})$ is, by construction, radially aligned with the world point's lens-frame representation $P_l = (x_l, y_l, z_l)$. The gRAC cross-product condition is therefore (Eq. 5):

$$x_{df}\,y_l = y_{df}\,x_l.$$

Substituting Eq. 4 and $P_l = SP_w + T$ into Eq. 5, and eliminating a common scale, yields a linear equation in seven unknown combinations $q = (q_1, \ldots, q_7)$ (Eq. 7):

$$[x_{d_{\mathrm{nf}}}x_w,\; x_{d_{\mathrm{nf}}}y_w,\; x_{d_{\mathrm{nf}}}z_w,\; x_{d_{\mathrm{nf}}},\; y_{d_{\mathrm{nf}}}x_w,\; y_{d_{\mathrm{nf}}}y_w,\; y_{d_{\mathrm{nf}}}z_w]\,q = y_{d_{\mathrm{nf}}},$$

where $q_1, \ldots, q_7$ encode the tilt $R$ and extrinsic $(S, t_x, t_y)$ via non-linear relationships (Eqs. 9–15). This is structurally identical to Tsai's linear form (Tsai Eq. 10 / Eq. 16) — the column definitions of the coefficient matrix change to absorb the tilt $R$, but the size of the system increases from five or seven unknowns in Tsai to seven unknowns in gRAC regardless of target dimensionality.

Given four or more correspondences, the system is solved by linear least squares. A four-stage algebraic decomposition (§V-A) recovers $|t_x|$, $s_{1j}$ (first row of $S$), $s_{2j}$ and $t_y$, and finally $(\rho, \sigma)$ — all with sign ambiguity. Stage 2 (§V-B) resolves the four-way ambiguity by: (a) rejecting $\lambda < 0$ candidates from Eq. 35; (b) selecting the surviving candidate with the smaller radial-distortion-model fitting error $E_{\mathrm{rad}}$ (Eq. 36). Stage 3 (§V-C) iteratively estimates the CoD $(I_0, J_0)$ by sampling the image plane and minimising the residual RAC error on frontal-projected coordinates.

**Comparison with Tsai's linear system.** Tsai's Stage 1 coplanar system is $5 \times 5$ (five unknowns for the planar case) or $7 \times 7$ (non-coplanar case for $s_x$ recovery). Kumar's gRAC system is always $N \times 7$. When $R = I$, the $q$ definitions (Eqs. 9–15) simplify: $r_{11} = r_{22} = 1$, $r_{12} = 0$, so $q_1, q_2, q_3, q_4$ reduce to Tsai's five-unknown combinations and $q_5, q_6, q_7$ are unchanged from Tsai. The decomposition formulas (Eqs. 17–30) then collapse to Tsai's Stage 1 algebraic steps.

# Assumptions

1. (hard) **Radial distortion is symmetric about the physical optic axis.** The distortion model is two-term radial $(k_1, k_2)$ applied to the frontal-projected coordinates $P_f$, not to the raw sensor coordinates $P_{\mathrm{nf}}$. Tangential distortion is not modelled — the same limitation as Tsai. Cameras with significant decentering distortion (cheap wide-angle with poor lens centration) will have systematic residuals.

2. (hard) **Pixel sizes $(s_x, s_y)$ are known a priori.** The paper follows Tsai in treating $s_y$ as the reference and $s_x$ as calibratable; but the gRAC linear system (Eq. 7) requires converting pixel observations to metric sensor coordinates (Eq. 3) before assembling $A$, which in turn requires $(I_0, J_0, s_x, s_y)$ to be known or initialised. The CoD is handled iteratively; $s_x$ is assumed known from the sensor datasheet.

3. (hard) **Non-coplanar (or 2.5D) calibration target required.** A purely planar target leaves $\lambda$ and $t_z$ coupled in Eq. 35 (the Stage 2 linear solve for $U_3 = (\lambda, t_z)$). The paper explicitly uses a 2.5D acquisition protocol: the checkerboard is moved along its surface normal to provide depth variation. The same limitation applies to Tsai's non-coplanar case.

4. (hard) **The frontal-projection denominator $r_{13}x_{d_{\mathrm{nf}}} + r_{23}y_{d_{\mathrm{nf}}} - \lambda \neq 0$.** This is the line-of-sight condition: $P_{\mathrm{nf}}$ must not lie on the ray passing through the lens centre parallel to the frontal sensor plane. For small tilts ($\rho, \sigma < 10°$) and typical sensor sizes, the denominator is far from zero.

5. (soft) **Sign disambiguation via radial-distortion model fit is reliable.** The two surviving solution candidates (A and B in Fig. 4) are distinguished by which one gives a smaller residual when fitting a symmetric $(k_1, k_2)$ model to the frontal-projected points $P_f$ vs ideal projections $Q_f$. When true distortion is very small ($k_1 \approx 0$), both candidates can have similar $E_{\mathrm{rad}}$, making disambiguation unreliable. The paper does not characterise this breakdown regime.

6. (soft) **Tilt angles $(\rho, \sigma)$ are small enough that $\cos\rho > 0$ and $\cos\sigma > 0$.** Eq. 1 and the derivation of $P$ (Eq. 22) assume $r_{11} = \cos\sigma > 0$ and $r_{22} = \cos\rho > 0$, so $|(\rho, \sigma)| < 90°$. Manufacturing tilts in the range of practical interest (0–15°) satisfy this comfortably.

7. (soft) **CoD iterative search converges within the sampling region.** The outer loop (§V-C) uniformly samples image coordinates for $(I_0, J_0)$, refines around the best candidate, and repeats. Convergence is guaranteed only if the true CoD is inside the initial sampling window and the error landscape is unimodal. The paper does not provide a convergence proof or radius-of-convergence estimate.

# Failure regime

- **Purely planar calibration target.** The system Eq. 35 becomes rank-deficient because all world points share $z_w = 0$ (after the rigid transform); $\lambda$ and $t_z$ are not independently constrained. The paper uses 2.5D data (multi-depth planar board) as the mandatory acquisition strategy.

- **Near-zero tilt ($\rho, \sigma \approx 0$).** In this regime the difference between the gRAC solution and the Tsai RAC solution is within noise. The sign disambiguation via radial-distortion model fit becomes unreliable (both candidates A and B are geometrically close). The paper reports the real-data tilt as approximately 3.81° analytical / 4.23° nonlinear — a small but measurable tilt. For sub-1° tilts the analytical advantage over Tsai vanishes.

- **Distortion-based sign ambiguity failure.** When $k_1 \approx 0$ or when $E_{\mathrm{rad}}$ is dominated by noise rather than model structure, the disambiguation step may select the wrong candidate. The paper shows that for the real data case, solution A (correct) has lower $E_{\mathrm{rad}}$ than solution B, but does not bound the noise level at which the two become indistinguishable.

- **Large tilt ($> 15°$) with weak distortion.** The frontal projection (Eq. 4) becomes increasingly non-linear in the tilt angles; the linear-solve initialisation becomes a coarser approximation of the true nonlinear solution. The paper experiments at 4° tilt; larger tilts are not evaluated.

- **CoD sampling scope too narrow.** If the true CoD is far from the image centre (e.g., due to lens decentering in addition to tilt), the initial sampling window may miss it. The paper does not specify the sampling radius used in the real-data experiment.

- **Few correspondences.** The minimum is $N = 4$ (seven unknowns in $q$ minus one degree of freedom from the homogeneous scaling); but the four-way sign disambiguation and the radial-distortion fit require more observations to be reliable. The paper uses a 20×20 checkerboard (up to 400 corners), giving a massively overdetermined system.

- **Tsai RAC with a tilted sensor (the "non-generalised" failure).** The paper demonstrates (§III, Fig. 2b) that applying Tsai's RAC directly to a sensor with even moderate tilt (3–4°) yields a measurably different image centre ($I_0$ shifts from 225.845 to 239.30 pixels between RAC and gRAC analytical estimates, Table I) and a higher final reprojection error (0.082 vs 0.057 pixels).

# Numerical sensitivity

- **Linear system Eq. 7: seven unknowns, $N$ rows.** With a 20×20 checkerboard and multiple acquisitions, $N$ is easily in the hundreds. The system is massively overdetermined; the SVD-based least-squares solve is numerically robust. The coefficient matrix depends only on the metric sensor coordinates $(x_{d_{\mathrm{nf}}}, y_{d_{\mathrm{nf}}})$ and the known world coordinates — no normalisation step is described in the paper. Hartley normalisation (as prescribed for homography DLT in Zhang 2000) is advisable in practice, especially when world coordinates span different scales than sensor coordinates.

- **Recovery of $|t_x|$ via Eq. 17: $|t_x| = 1/\sqrt{q_5^2 + q_6^2 + q_7^2}$.** The denominator is the norm of a three-vector of solved unknowns. When this norm is small (target far away, small perspective effect), noise in $q_5, q_6, q_7$ amplifies into a large error in $|t_x|$, which then cascades through all subsequent decomposition steps (Eqs. 18–26). This is the same denominator structure as Tsai's $|T_y|$ recovery.

- **The $P$ term: $P = \sqrt{Nt_x^2 - M^2 t_x^4}$.** Appears in denominators of $s_{2j}$ (Eq. 23–25) and $t_y$ (Eq. 26). $P \to 0$ when $Nt_x^2 = M^2 t_x^4$, i.e., when tilt $R$ degenerates. This corresponds to $\cos\sigma / \cos\rho \to 0$ (both tilt angles near 90°), which is far outside the physical regime of interest. For small tilts ($|\rho|, |\sigma| < 15°$), $P$ is bounded away from zero. The `.max(0.0).sqrt()` guard in the Rust code prevents NaN from floating-point rounding at exactly $P = 0$.

- **Tilt angle formulas Eqs. 29–30.** $\cos^2\rho$ is computed from a quadratic in $L^2 + P^2 + 1$ under a square root. The discriminant $(L^2 + P^2 + 1)^2 - 4P^2$ is always non-negative when $P > 0$ and $L$ is real, but numerical rounding in $q$ can make it slightly negative. The `.max(0.0)` guard is again necessary.

- **Stage 2 linear system Eq. 35.** Two unknowns $(\lambda, t_z)$, $N$ rows. The coefficient matrix is $[{-x_l}, v]$ where $x_l = s_{11}x_w + s_{12}y_w + s_{13}z_w + t_x$ and $v = -(r_{11}x_{d_{\mathrm{nf}}} + r_{21}y_{d_{\mathrm{nf}}})$. Both depend on the Stage 1 estimates. Errors from Stage 1 propagate here. The system is separate for each of the four sign candidates — four independent least-squares solves.

- **Radial-distortion disambiguation (Eq. 36).** Fitting $k_1, k_2$ to $P_f - Q_f(1 + k_1r^2 + k_2r^4) = 0$ is a two-parameter linear solve. It requires $r = \sqrt{x_f^2 + y_f^2}$ to have sufficient spread across correspondences — all points near $r \approx 0$ (near the CoD) give an ill-conditioned Vandermonde-style system and unreliable $k_1, k_2$ estimates.

- **Double precision.** The intermediate product $M^2 t_x^4$ in the $P$ formula involves squaring an already-squared quantity. For large $|t_x|$ (far-field calibration), this can exceed double-precision range in pathological cases; in practice, metric units (mm) keep magnitudes in the range 1–200 mm and double precision is adequate throughout.

# Applicability

- Use when: the camera is suspected or known to have a non-frontal sensor (manufacturing tilt of 1–15°, tilt-shift optics, or intentional Scheimpflug-style sensor tilt for depth-of-field control).
- Use when: standard Tsai/Zhang calibration produces systematically unequal focal lengths in $x$ and $y$ directions ($\lambda_x \neq \lambda_y$) or a principal point significantly off-centre — these are symptoms of unmodelled tilt. Table I shows RAC gives $\lambda_x = 829.57$, $\lambda_y = 833.63$ (unequal) while gRAC gives $\lambda_x = \lambda_y = 855.25$ (equal, as expected for an isotropic sensor).
- Use when: a 2.5D calibration acquisition protocol is feasible (moving the board along its surface normal) or when a 3D calibration target is available.
- Don't use when: only a flat (single-pose) planar target is available and multi-depth variation is impractical. Use Zhang 2000 or Tsai non-coplanar instead.
- Don't use when: the sensor tilt is negligible ($< 1°$) and tilt correction is unnecessary — the added complexity of the four-way disambiguation and CoD search is not warranted. Use Zhang 2000.
- Don't use when: tangential distortion is significant. The gRAC model, like Tsai's, is radial-only.
- Compared against:
  - **Tsai 1987 RAC (`tsai1987-versatile`)**: gRAC is a strict generalisation; Tsai's Stage 1 is a degenerate case of the gRAC linear system when $R = I$. On a tilted sensor, Tsai achieves reprojection error 0.082 px vs gRAC's 0.057 px (Table I, nonlinear). The gain is modest in absolute terms but meaningful as an initial estimate quality: better initialisation → faster and more reliable LM convergence.
  - **Weng et al. 1992 (`weng1992-camera`)**: The nonlinear refinement stage of gRAC uses Weng's distortion model and the same LM framework. The difference is in the initialisation: gRAC replaces Weng's underdetermined linear initialisation with the seven-unknown gRAC solve.
  - **Zhang 2000 (`zhang2000-flexible`)**: Zhang's method works entirely from a flat planar target and multiple views (planar homography approach via IAC); it does not model lens-sensor tilt. For a frontal sensor, Zhang is simpler and equally accurate. For a non-frontal sensor, Zhang absorbs the tilt into a compound distortion and its linear initialisation degrades — but the LM stage may still converge to a reasonable solution when tilt is small.

# Connections

- Builds on:
  - **tsai1987-versatile** — the direct predecessor. The gRAC is derived as an extension of Tsai's RAC (§III). The Stage 1 linear form (Eq. 7) has the same structure as Tsai's Eq. 10 / Eq. 16; the Stage 2 solve (Eq. 35) is Tsai's Stage 2 linear system adapted for the non-frontal projection; the CoD search (§V-C) extends the Lenz-Tsai technique [5] cited in the paper.
  - **weng1992-camera** — the radial distortion model $(k_1, k_2)$ and the nonlinear refinement step follow Weng et al. (cited as [2] in the paper).
  - Gennery 2006 (IJCV) and Kumar & Ahuja 2014 (CVPR companion paper, reference [10]) — the explicit lens-sensor rotation model derives from these works. The ICPR paper (this paper) is the analytical calibration development; the companion CVPR paper covers the full generalized pupil-centric imaging model.
  - Lenz & Tsai 1987 (reference [5]) — the CoD iterative search (§V-C) is a direct adaptation of the Lenz-Tsai technique for estimating the image centre, extended to the non-frontal case.

- Enables (in the atlas):
  - **kumar-generalized-rac** — primary source for this page.

- Refutes / supersedes:
  - Tsai's RAC in the non-frontal sensor regime: the paper proves (§III) that the classical RAC constraint cannot hold when the sensor is tilted, and demonstrates empirically that gRAC produces lower reprojection error with correct tilt estimates (Table I).

# Atlas update plan

## UPDATE: kumar-generalized-rac

The public page is technically comprehensive and accurate. All equations from §IV–§V are faithfully represented. The Rust implementation correctly covers row assembly and stage-1 decomposition. The gaps below are supplementary improvements, not corrections.

Section: Goal
- The current Goal correctly states $N \geq 4$ and names the full parameter set. No structural change needed. One precision: the paper's $\lambda$ is the camera constant (distance from lens centre to frontal sensor), not "focal length" in the Zhang/Zhang-style intrinsic matrix sense — $\lambda_x = \lambda / s_x$ in pixel units is what Table I reports. A parenthetical distinguishing $\lambda$ (metric) from $\lambda_x = \lambda/s_x$ (pixels) would prevent confusion for readers familiar with Zhang notation.

Section: Algorithm — gRAC linear form
- The current page correctly states the linear form (Eq. 7) with the $N \times 7$ coefficient structure. One addition: note explicitly that the coefficient matrix depends only on the metric sensor coordinates $(x_{d_{\mathrm{nf}}}, y_{d_{\mathrm{nf}}})$ and known world coordinates — it does not depend on the tilt $R$ or $\lambda$ at all. This is the key structural observation: the tilt parameters enter only through the $q$ definitions (Eqs. 9–15), not through the matrix $A$.

Section: Remarks
- **Strengthen "reduces to Tsai" bullet.** The existing bullet correctly states that when $R = I$ the system collapses to Tsai's. The precise quantitative statement is: Tsai's Stage 1 coplanar linear system has five unknowns (Tsai Eq. 10) or seven unknowns for the non-coplanar case (Tsai Eq. 16); Kumar's gRAC always has seven unknowns (Eq. 7), because the tilt ratios $L = r_{12}/r_{22}$ and $P = r_{11}/r_{22}$ are always estimated. At $R = I$: $L = 0$, $P = 1$, and the decomposition steps for $s_{2j}$ (Eqs. 23–25) reproduce Tsai's Eq. 14a–14b identically.

- **Add bullet — empirical evidence for tilt significance.** Table I (§VI-B) shows that applying Tsai RAC to the tilted sensor produces: (a) unequal effective focal lengths $\lambda_x = 829.57$ vs $\lambda_y = 833.63$ (a 0.5% asymmetry — diagnostic symptom of unmodelled tilt); (b) a shifted image centre ($I_0 = 225.8$ vs gRAC's $I_0 = 239.3$ — a 13-pixel difference); (c) higher reprojection error (0.082 vs 0.057 px after nonlinear refinement). The tilt magnitude is only 3.81–4.23°. This quantifies the practical threshold below which tilt modelling is significant.

- **Add bullet — 2.5D data requirement.** The minimum sample requirement of four correspondences is a necessary, not sufficient, condition for uniqueness. A purely planar set of correspondences (all $z_w = 0$ after the extrinsic transform) leaves $\lambda$ and $t_z$ coupled in Eq. 35 because all rows of the Stage 2 system are linearly dependent in the depth direction. The paper's acquisition protocol moves the checkerboard along its surface normal (2.5D) to provide the required depth variation. This is a harder data-collection requirement than Zhang 2000 (which only needs multiple planar poses).

- **Add bullet — CoD "chicken-and-egg" and practical implication.** The CoD $(I_0, J_0)$ is needed to compute metric sensor coordinates (Eq. 3), which are needed to solve Eq. 7 for $R$, which is needed to project $P_{\mathrm{nf}}$ onto the frontal sensor (Eq. 4), which is needed to evaluate the residual RAC error that drives the CoD search. The paper names this explicitly as a "chicken and egg problem" (§V-C) and proposes the iterative sampling resolution (uniform sampling → neighbourhood refinement). Practical implication: the CoD search is the dominant computational cost; initialising from the image centre is standard practice, but for highly decentered lenses the search radius must be large enough to include the true CoD.

- **Add bullet — numerical guard for near-zero P.** In the decomposition, $P = \sqrt{N t_x^2 - M^2 t_x^4}$ appears in the denominators of $s_{2j}$ and $t_y$. $P \to 0$ when tilt approaches 90° or when $N = M^2 t_x^2$ (a degenerate configuration not arising for small tilts in practice). The `.max(0.0)` guard in the Rust `decompose_q` and `tilt_angles` functions prevents NaN; implementations should log a warning when $P < \epsilon$ as this indicates a near-degenerate configuration.

Section: References
- No change needed. All three references (Kumar & Ahuja 2014, Tsai 1987, Weng 1992) are already present and correctly cited.

# Provenance

- Full paper: `docs/papers/.cache/kumar2014-grac.txt` (pdftotext output, 5 pages, ICPR 2014, DOI 10.1109/icpr.2014.41).
- Abstract: "In camera calibration, the radial alignment constraint (RAC) has been proposed as a technique to obtain closed form solution to calibration parameters when the image distortion is purely radial about an axis normal to the sensor plane. But, in real images this normality assumption might be violated due to manufacturing limitations or intentional sensor tilt. A misaligned optic axis results in traditional formulation of RAC not holding for real images leading to calibration errors. In this paper, we propose a generalized radial alignment constraint (gRAC) which relaxes the optic axis-sensor normality constraint by explicitly modeling their configuration via rotation parameters which form a part of camera calibration parameter set."
- §I (p. 1): Two failure modes of applying Tsai RAC to a non-frontal sensor (radial + tangential mixture; non-coplanarity of $\overrightarrow{O_sP_d}$ and $\overrightarrow{P_lP_{oz}}$). Reference [4] = Tsai 1987, [5] = Lenz-Tsai 1987.
- §II (p. 1): Four coordinate systems defined: World, Image, Lens, Sensor. Rotation $R(\rho,\sigma,0)$ (Eq. 1). "The rotation of lens coordinate system about the z axis is considered redundant as the lens is symmetric about its z axis."
- §III (p. 1–2): Tsai RAC review. Explicit statement: "RAC not holding true in real images, when the sensor maybe non-frontal with respect to the lens plane" (Fig. 2b caption).
- §IV (p. 2–3): gRAC derivation. Frontal projection Eq. 4. gRAC cross-product Eq. 5: $x_{df}\,y_l = y_{df}\,x_l$. Linear form Eq. 7. Parameter encoding Eqs. 9–15. Key note: "It can be noted that in Tsai's RAC [4], R was an identity matrix and their solution was derived based on this assumption."
- §V-A (p. 3–4): Algebraic decomposition. $|t_x|$ from Eq. 17; first row of $S$ from Eqs. 18; second row from Eqs. 23–25; third row by cross-product; $t_y$ from Eq. 26. Tilt ratios $L$ (Eq. 27), $P$ (Eq. 28). Tilt angles $(\rho, \sigma)$ from Eqs. 29–30 "with a sign ambiguity." Key insight: "Since this projection involves taking the cosine of tilt angles encoded in R, it is many-to-one leading to sign ambiguity in analytical estimate of (ρ, σ)."
- §V-B (p. 4): Four solutions (A, B, C, D), Fig. 4. "Solution C and D can be rejected by checking the sign of λ obtained from Eq. 35 as λ cannot be negative." Disambiguation A vs B: fit $k_1, k_2$ to Eq. 36; choose smaller $E_{\mathrm{rad}}$. "solution A will get selected."
- §V-C (p. 4–5): Iterative CoD determination. "chicken and egg problem." Uniform sampling → residual minimisation → neighbourhood refinement.
- §VI-A (p. 5): Synthetic experiment. Simulated tilt $\sigma = 4°$, noise $\sigma \in \{0.05, \ldots, 1.0\}$ px, 100 trials. Relative error in all calibration parameters increases with noise; at 0.11 px (matching real-data measurement error), errors are low. Fig. 5 shows relative errors staying below ~4% for $R$, below ~0.3% for $S$, below ~10% for $T$, below ~3.5% for $\lambda$ across the noise range.
- §VI-B (p. 5): Real data, Table I. RAC: $\lambda_x = 829.57$, $\lambda_y = 833.63$, $I_0 = 225.845$, $J_0 = 331.632$, reprojection error 0.082064. gRAC: $\lambda_x = \lambda_y = 855.25$, $I_0 = 239.30$ (analytical), reprojection error 0.057119. Analytical tilt: $\sigma = 3.81°$; after nonlinear refinement: $\sigma = 4.23°$.
- §VII Conclusions: "non-linear calibration with gRAC initialization leads to lower re-projection error than RAC [4] based initialization."
