---
paper_id: tsai1987-versatile
title: "A versatile camera calibration technique for high-accuracy 3D machine vision metrology using off-the-shelf TV cameras and lenses"
authors: ["R. Y. Tsai"]
year: 1987
url: https://cecas.clemson.edu/~stb/ece847/internal/classic_vision_papers/tsai_calibration1987.pdf
created: 2026-05-01
relevant_atlas_pages: [zhang-planar-calibration, tsai-lenz-handeye, kumar-generalized-rac]
---

# Setting

**Problem class.** Single-camera intrinsic and extrinsic calibration for high-accuracy 3D machine vision metrology. The goal is to recover the rigid transform from world to camera frame, the effective focal length, a radial distortion coefficient, and an image-plane scale uncertainty factor — from a set of known 3D world points and their observed 2D image positions.

**Inputs.** A set of $N \geq 5$ (coplanar case) or $N \geq 7$ (non-coplanar case) correspondences between 3D world coordinates $(x_w, y_w, z_w)$ and measured computer image coordinates $(X_f, Y_f)$ in pixel rows and columns. Camera and frame memory specifications ($N_{cx}$, $N_{fx}$, $d_x$, $d_y$) must be known from the manufacturer, except for the scale factor $s_x$ which the method calibrates (non-coplanar case) or treats as known (single-plane case). The calibration target must have known metric 3D coordinates to sub-pixel-equivalent precision.

**Outputs.** Extrinsic rotation $R \in SO(3)$ (parametrised as yaw $\theta$, pitch $\phi$, roll $\psi$) and translation $T = (T_x, T_y, T_z)$ from world to camera frame; intrinsic parameters: effective focal length $f$, first-order radial distortion coefficient $\kappa_1$ (and optionally $\kappa_2$), and image-scale uncertainty factor $s_x$.

**Accuracy reported.** Monoview single-plane (Type II measure, radius of ambiguity zone): average 0.7 mil, maximum 1.3 mil (1 mil = 0.001 inch). Monoview multiplane multiview (Type I measure, absolute 3D triangulation): $x$, $y$ average 0.4 mil, depth average 0.6 mil, max 1.8 mil — roughly 1 part in 2000 of the working range (§IV).

# Core idea

The method rests on a geometric observation called the **radial alignment constraint (RAC)**: radial lens distortion, by definition, displaces each image point along the line connecting the image origin to that point — it does not rotate the direction. Consequently, the direction from the image origin to the distorted point $(X_d, Y_d)$ is the same as the direction from the image origin to the undistorted point $(X_u, Y_u)$, which is in turn the same as the direction from the optical axis to the 3D camera-frame projection of the world point. Formally, $\overrightarrow{O_i P_d} \parallel \overrightarrow{P_{oz} P}$, where $P_{oz}$ is the foot of the perpendicular from $P$ to the optical axis (Appendix I, Fig. 3).

This parallelism eliminates $f$, $\kappa_1$, $\kappa_2$, and $T_z$ from the constraint equation, leaving a system that is linear in five (coplanar) or seven (non-coplanar) combinations of $R$ and $(T_x, T_y)$:

$$[Y_{di} x_{wi},\; Y_{di} y_{wi},\; Y_{di},\; -X_{di} x_{wi},\; -X_{di} y_{wi}]\; \begin{bmatrix} T_y^{-1}r_1 \\ T_y^{-1}r_2 \\ T_y^{-1}T_x \\ T_y^{-1}r_4 \\ T_y^{-1}r_5 \end{bmatrix} = X_{di}. \quad \text{(Eq. 10, coplanar)}$$

Stage 1 solves this linear system by least squares for the five (or seven) unknown parameter combinations, then recovers $T_y$, the sign of $T_y$, and the full rotation matrix $R$ algebraically without any initial guess or nonlinear search. Stage 2 fixes $R$, $T_x$, $T_y$ and solves a second linear system (Eq. 15) for an approximation of $f$ and $T_z$ ignoring distortion; then a short nonlinear refinement (one or two iterations of steepest descent or LM) solves exactly for $f$, $T_z$, $\kappa_1$ simultaneously (Eq. 8b).

The "versatile" framing means: off-the-shelf TV cameras and lenses work because the method does not require a precision camera body — only a 3D target with known metric coordinates. The 3D target requirement is the central limitation Zhang 2000 subsequently lifts.

# Assumptions

1. (hard) **Radial distortion model only.** The distortion model is $D_x = X_d(\kappa_1 r^2 + \kappa_2 r^4 + \cdots)$, $D_y = Y_d(\kappa_1 r^2 + \kappa_2 r^4 + \cdots)$, with $r = \sqrt{X_d^2 + Y_d^2}$ (Eqs. 5a–5b). Tangential (decentering) distortion is explicitly excluded: §II-B states "for industrial machine vision application, only radial distortion needs to be considered, and only one term is needed." Cameras with significant tangential distortion (cheap wide-angle, tilted sensor) violate this assumption silently.

2. (hard) **Non-coplanar calibration target required for full calibration.** The coplanar single-plane technique cannot recover $s_x$ (the uncertainty scale factor) independently; $s_x$ must be known a priori (from a separate calibration, e.g., Lenz-Tsai) or the non-coplanar multi-plane technique must be used. §II-F explicitly notes: "A priori knowledge of $s_x$ is needed only for single plane calibration." This is the structural limitation: a flat chessboard-style target is insufficient for a fully autonomous calibration.

3. (hard) **3D world coordinates of calibration points must be known accurately.** The error formula (Eq. 22) contains a target-ambiguity term $\Delta q$ that propagates directly into 3D measurement error. The paper requires target accuracy at least one order of magnitude better than the desired final 3D measurement accuracy (§IV-A-b: "if the final accuracy is desired to be 1 mil, then the surface flatness and parallelism has to be 0.1 mil accurate").

4. (soft) **Calibration points must not be near the $y$-axis of the camera coordinate system.** The RAC derivation requires $T_y \neq 0$; the paper notes this is easily satisfied by placing the calibration target away from the $y$-axis of the camera frame (§II-F Stage 1).

5. (soft) **Rotation of calibration target does not involve a whole vanishing row or column of the $2 \times 2$ submatrix $C$.** Case II of Appendix IV (when a whole row or column of $C$ vanishes) is handled by Eq. 13 but is noted to "rarely happen" — it corresponds to the camera viewing the calibration plane nearly tangentially.

6. (soft) **Single-plane calibration requires the target to be tilted at least 30° from the image plane.** §III-B: "for single-plane calibration, the calibration plate has to be sufficiently tilted with respect to the image plane (at least 30°)."

7. (soft) **Image coordinates extracted at sub-pixel accuracy.** The paper uses a special interpolation technique achieving 1/2 to 1/3 pixel accuracy (§IV-A-1-d). The theoretical error formula (Eq. 22) uses $\delta \approx d_x/2$ or $d_x/3$; coarser extraction degrades accuracy proportionally.

# Failure regime

- **Coplanar target with unknown $s_x$.** If the calibration points are coplanar and $s_x$ is not known a priori, the system cannot separate the image-scale uncertainty from the extrinsic parameters. The paper is explicit: use multiplane or a pre-calibrated $s_x$.

- **Pure planar target (Zhang 2000's critique, implicit).** The core Stage 1 RAC linear system for the coplanar case (Eq. 10) sets $z_w = 0$, which is why Stage 2 can solve for $f$ and $T_z$ as a pair from the remaining constraint. But this means a flat pattern can only provide five constraints on five unknowns per pose — there is no redundancy across views for recovering $f$ independently. The non-coplanar technique uses full 3D coordinates ($z_w \neq 0$) to provide seven independent constraints (Eq. 16), which directly recovers $s_x$ as well (Eq. 18). Zhang 2000 bypasses this by using multiple views of a planar target and exploiting the homography constraint, not the RAC.

- **Tangential distortion present.** The radial-only model leaves residual distortion unmodeled. The paper explicitly declines to model tangential terms on grounds that modeling them causes "numerical instability" (§II-B). For wide-angle lenses with decentering, residual errors are systematic, not random.

- **Small number of calibration points.** The error formula shows $\text{error}_\text{calib} \propto (N_0)^{-1/2}$; with $N_0 < 60$ points the calibration error begins to dominate the non-calibration error. The paper uses 60 points as the minimum for reliable results (§III-B).

- **Calibration target viewed at extreme oblique angles below 30°.** At grazing incidence the coplanar target degeneracy approaches (whole row or column of $C$ vanishing); also the image interpolation accuracy degrades at high foreshortening.

- **Image center wrongly assumed.** The "Note Added in Proof" (p. 344) acknowledges that the image center choice can affect 3D measurement accuracy by up to ten pixels' offset — a systematic error not analysed in the main body. The paper recommends reading [28] (Lenz-Tsai 1987) for a rigorous treatment.

# Numerical sensitivity

- **Stage 1 linear solve (Eq. 10 / 16).** The coefficient matrix is proven to have full column rank when $N \gg 5$ (or 7) and the calibration points are in general position (Appendix II). The linear independence proof in Appendix II explicitly rules out degenerate configurations (camera viewing tangentially, all points at the same depth). The solve is overdetermined linear least squares — robust in the presence of random image noise.

- **Recovery of $T_y$ from the $2 \times 2$ submatrix $C$ (Eq. 12).** The formula involves $S_r - [S_r^2 - 4(r_1'r_5' - r_4'r_2')^2]^{1/2}$ under a square root. The term under the radical can become near-zero when $C$ is nearly degenerate (Case II), causing numerical instability. Equation 13 is the fallback for Case II. The paper notes Case II is "rarely" encountered in practice.

- **$s_x$ recovery (Eq. 18, non-coplanar case).** $s_x = (a_1^2 + a_2^2 + a_3^2)^{1/2} |T_y|$. Since $s_x$ is close to 1.0 for most CCD cameras (the paper reports $s_x = 1.042$ for Fairchild CCD 3000), errors in $T_y$ propagate linearly into $s_x$. For the single-plane case where $s_x$ is assumed known, a 5% error in $s_x$ (the paper's own estimate of the maximum uncertainty, §II-B) propagates into a 3–5 pixel error in the image coordinate transformation.

- **Stage 2 nonlinear solve (Eq. 8b).** Only $f$, $T_z$, $\kappa_1$ are free; $R$, $T_x$, $T_y$ are fixed from Stage 1. The initial guess from the ignoring-distortion linear approximation (Eq. 15) is "always confirmed by the experimental results" to yield positive $f$ (§II-F-2-d), making the nonlinear stage convergent in one or two iterations. This is the key computational advantage over full nonlinear calibration.

- **Distortion coefficient $\kappa_2$.** The paper uses only $\kappa_1$ in the monoview experiments ("only one term is needed"). Including $\kappa_2$ is "numerical instability" according to §II-B; the second term is only warranted for very wide-angle lenses where distortion at the image border is large.

- **Effective focal length $f$.** Absorbed into the perspective projection as $X_u = f \cdot x/z$, $Y_u = f \cdot y/z$ (Eqs. 4a–4b). Since $f$ and $z$ always appear as a ratio in the projection, $f$ and $T_z$ are coupled in Stage 2 — the linear approximation (Eq. 15) solves for them jointly, and the subsequent nonlinear refinement resolves the remaining coupling via $\kappa_1$.

# Applicability

- Use when: a 3D calibration target (non-coplanar or known-height multi-plane) is available and the camera has modest radial distortion. This is the classic robotics-arm vision scenario with a precision calibration object.
- Use when: fast calibration speed matters. The paper reports 1.5 s total computation for 60 points on a 68000-based minicomputer (1987); Stage 1 alone is under 20 ms on the same hardware with 36 points.
- Use when: the camera may have an unknown image-scale uncertainty $s_x$ (CCD scanning timing error up to 5%) and a 3D target is available to disambiguate it.
- Don't use when: only a flat (planar) calibration target is available and $s_x$ is unknown — use Zhang 2000 instead.
- Don't use when: significant tangential (decentering) distortion is present — use Brown-Conrady / Weng 1992 model instead.
- Don't use when: a fully automated pipeline without precision 3D targets is needed — Zhang 2000's planar target approach is the practical successor.
- Compared against (paper's §I-B classification):
  - **Category I (full nonlinear optimization, e.g., Faig):** Higher potential accuracy but requires good initial guess and is computer-intensive. Tsai's two-stage avoids this by reducing the nonlinear search to three unknowns.
  - **Category II (DLT — direct linear transform, Abdel-Aziz & Karara):** No nonlinear step, but cannot model lens distortion; ignoring distortion causes order-of-magnitude worse 3D error (paper §I-B, footnote 1).
  - **Category III (two-plane method, Martins et al.):** Linear only, but the image-to-object transform formula is "empirically based" and restricted relative orientation is assumed; average error ~4 mil.
  - **Zhang 2000:** Lifts the 3D target requirement by using multiple views of a flat planar pattern and solving through the IAC; requires at least 3 views; comparable accuracy to Tsai with a far more convenient target.

# Connections

- Builds on:
  - Radial alignment constraint: geometric insight credited to Tsai as original (Appendix I gives the algebraic proof). No prior paper is cited as the source of the RAC idea.
  - Perspective transformation model: Duda-Hart [6] for the general form; Brown [3] for radial distortion modeling in photogrammetry.
  - DLT critique: Abdel-Aziz & Karara [1, 2] as the Category II baseline that the paper supersedes by adding distortion handling.
  - Accuracy formula: Tsai [26] (IBM Research Report RC 11348, companion paper) provides the theoretical error bound in Eq. 22.
  - Scale factor calibration: Lenz and Tsai [28] (1987, companion paper on the scale factor and image center) is the companion work for single-plane $s_x$ calibration.

- Enables (in the atlas):
  - **zhang-planar-calibration** — Zhang 2000 explicitly positions itself as lifting Tsai's 3D-target requirement; the RAC / Stage 1 linear solve inspired the IAC linear solve; Tsai is the primary prior-art reference.
  - **tsai-lenz-handeye** — The Tsai-Lenz 1989 hand-eye paper uses Tsai 1987 camera calibration to provide the per-station extrinsic poses $(R_{c_i}, T_{c_i})$ that feed the AX=XB solver; `sources.references` already includes this paper.
  - **kumar-generalized-rac** — Kumar & Ahuja 2014 explicitly generalize Tsai's RAC to non-frontal sensors; the gRAC reduces to Tsai's RAC when the tilt $R = I$ (page's Remarks, last bullet already states this).

- Refutes / supersedes:
  - DLT (Category II) for applications requiring distortion modeling: Tsai shows DLT error is an order of magnitude worse than the two-stage method when distortion is significant (§I-B).
  - Category I full-nonlinear methods for speed-sensitive applications: the two-stage method achieves comparable accuracy with orders-of-magnitude less computation and no initial guess requirement.

# Atlas update plan

## UPDATE: zhang-planar-calibration

Section: Remarks
- Add a bullet establishing the historical predecessor relationship: Tsai 1987 is the dominant pre-Zhang calibration method. Its two-stage technique uses the radial alignment constraint to derive a linear system for the extrinsic $R$, $T_x$, $T_y$ in Stage 1, then a short nonlinear solve for $f$, $T_z$, $\kappa_1$ in Stage 2. The key limitation Zhang 2000 lifts: Tsai requires a 3D non-coplanar calibration target (or a precision-known multi-plane setup) to obtain full calibration including the scale factor $s_x$; Zhang's IAC formulation works from multiple images of a single flat planar pattern. The "flexible" in Zhang's title is a direct response to Tsai's 3D-target requirement.
- The current page's Remarks bullet "Distortion scope is two-term radial only" implicitly covers both methods' shared distortion model; a cross-reference note could make explicit that Tsai 1987 uses one-term radial $\kappa_1$ by default (§II-B), while Zhang 2000 follows Weng 1992 with two terms $(k_1, k_2)$.

Section: References
- Reference 2 already correctly cites Tsai 1987. No change needed.

## UPDATE: tsai-lenz-handeye

Section: Remarks (supplementary context on reference [3])
- The page's `sources.references` includes `tsai1987-versatile` and the References section already cites it as [3]. Substantively, the Remarks section could note that the per-station camera extrinsics $(R_{c_i}, T_{c_i})$ that feed the AX=XB solver are themselves produced by the Tsai 1987 two-stage method applied to each station's image of a fixed calibration target — the two papers form a pipeline. The hand-eye paper inherits all accuracy constraints from the camera calibration step: errors in $R_{c_i}$ and $T_{c_i}$ from Tsai 1987 propagate into $R_{cg}$ and $T_{cg}$.

## UPDATE: kumar-generalized-rac

Section: Remarks (supplement the existing last bullet)
- The existing Remarks last bullet already states "Reduces to Tsai's RAC when $R = I$." This is correct and sufficient. One additional note for completeness: Tsai's Stage 1 linear system (Eq. 10 / Eq. 16 in the 1987 paper) solves for five or seven unknowns encoding $(R, T_x, T_y)$; Kumar's gRAC system (Eq. 7 in the ICPR 2014 paper) extends this to seven unknowns encoding $(S, R_\text{tilt}, T_x, T_y)$. The linear structure is preserved in both; only the column definitions of the coefficient matrix change to incorporate the tilt $R$.

# Provenance

- Full paper: `docs/papers/.cache/tsai1987-versatile.pdf`, 22 pages (pp. 323–344), IEEE Journal on Robotics and Automation, Vol. RA-3, No. 4, August 1987. Scanned; pdftotext yields no output (image-based scan).
- Abstract (p. 323): "A new technique for three-dimensional (3D) camera calibration for machine vision metrology using off-the-shelf TV cameras and lenses is described. The two-stage technique is aimed at efficient computation of camera external position and orientation relative to object reference coordinate system as well as the effective focal length, radial lens distortion, and image scanning parameters." Direct quote retained — the abstract is the most compact authoritative statement of scope.
- §I-A (p. 323): Five design criteria explicitly stated: autonomous, accurate (1 in 2000 working range), reasonably efficient (≤5 unknowns in nonlinear search), versatile (wide range of setups), needs only off-the-shelf cameras.
- §I-B (pp. 324–325): Four-category classification of prior techniques. DLT (Category II) footnote 1: "the error of 3D measurement reported in this paper using two-stage camera calibration technique would have been an order of magnitude larger if the lens distortion were not corrected."
- §II-B (p. 328): "my experience shows that for industrial machine vision application, only radial distortion needs to be considered, and only one term is needed. Any more elaborate modeling not only would not help but also would cause numerical instability." — direct quote retained, technical claim.
- §II-B Step 4 (p. 328): Image scale factor $s_x$ introduced as parameter calibrated via the non-coplanar technique; $s_x$ is cited as "as much as five-percent" uncertainty for Fairchild CCD 3000.
- §II-E (p. 329): Four observations establishing validity of the RAC. Observation IV: "The constraint that $O_iP_d$ is parallel to $\overrightarrow{P_{oz}P}$ for every point, being shown to be independent of the radial distortion coefficients $\kappa_1$ and $\kappa_2$, the effective focal length $f$, and the $z$ component of 3D translation vector $T$, is actually sufficient to determine the 3D rotation $R$, and $X$ and $Y$ component of 3D translation from the world coordinate system to the camera coordinate system, and the uncertainty scale factor $s_x$ in $X$ component of the image coordinate."
- §II-F Stage 1 (pp. 329–331): Coplanar procedure. Linear system Eq. 10 for five unknowns $T_y^{-1}r_1$, $T_y^{-1}r_2$, $T_y^{-1}T_x$, $T_y^{-1}r_4$, $T_y^{-1}r_5$. Recovery of $|T_y|$ via Eq. 12 (usual case) or Eq. 13 (degenerate Case II). Sign of $T_y$ determined by procedure in §II-F Stage 1 Step 2. Rotation matrix $R$ recovered by Eqs. 14a–14b (two solutions from Lemma 2, Appendix V); correct one chosen by checking sign of $f$ via Eq. 15.
- §II-F Stage 2 (p. 332): Step d) linear approximation ignoring $\kappa_1$: Eq. 15, $[y_i \; -d_y Y_i][f \; T_z]^T = w_i d_y Y_i$. Step e) nonlinear exact solve: Eq. 8b with $f$, $T_z$, $\kappa_1$ as unknowns, "usually only one or two iterations are needed."
- §II-G (pp. 332–333): Non-coplanar case. Linear system Eq. 16 for seven unknowns; $|T_y|$ via Eq. 17, $s_x$ via Eq. 18.
- §III-B (p. 335): Error formula parameters for monoview single-plane test: $L = 0.4$ in, $f = 1.1$ in, $z = 4$ in, $T_s \approx 3$ in, $\Delta q = 0.1$ mil, $N_f = 1$, $d_x \approx d_y \approx 1$ mil, $N_0 = 60$ points. Predicted total error: 3.3 mil ($\delta = 1/2$ mil) or 2.3 mil ($\delta = 1/3$ mil). "It is clearly seen by comparing the order of magnitude between the theoretical error bound and the actual error, the error bound is tight enough."
- §IV-A-2 (p. 337): Monoview single-plane calibration results. Type II measure: average radius of ambiguity zone 0.7 mil, maximum 1.3 mil. Computer time 1.5 s (68000-based MASSCOMP minicomputer), reducible to <30 ms with slight modification.
- §IV-B-2 (p. 338): Monoview multiplane multiview calibration results. Type I measure: $x$ average 0.4 mil, $y$ average 0.3 mil, depth average 0.6 mil, max 1.8 mil. Type III measure (distance): average 0.5 mil, max 1.4 mil. Eight planes used; "only two or three planes are actually needed."
- §V Conclusion (p. 339): "The new two-stage technique is theoretically and experimentally proven to be viable for 3D machine vision metrology. It is shown to be efficient, accurate, and straightforward to implement in real environment." Future work: "the number of calibration points is not fully investigated. Experimental results show that 60 points or more are more than sufficient."
- Note Added in Proof (p. 344): Image center error "does not significantly influence the accuracy of 3D measurement using the calibrated camera" when the offset is up to ten pixels — later work (reference [28], Lenz-Tsai 1987) treats this more rigorously.
