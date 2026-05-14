---
paper_id: scaramuzza2006-omni
title: "A Toolbox for Easily Calibrating Omnidirectional Cameras"
authors: ["D. Scaramuzza", "A. Martinelli", "R. Siegwart"]
year: 2006
url: https://rpg.ifi.uzh.ch/docs/IROS06_scaramuzza.pdf
created: 2026-05-05
relevant_atlas_pages: [scaramuzza-omni-calibration, zhang-planar-calibration, tsai-versatile-calibration, camera-distortion-models]
---

# Setting

**Problem class.** Central omnidirectional camera calibration — covering both catadioptric systems (mirror + conventional camera) and dioptric fisheye lenses. The single-effective-viewpoint (central) constraint is the governing assumption: all world rays must pass through one geometric point $O$.

**Inputs.**
- Multiple views (the paper demonstrates as few as 3) of a planar checkerboard pattern at different, unknown poses.
- Pixel coordinates of checkerboard corner points, clicked manually by the user or detected by a Harris corner detector with sub-pixel accuracy.
- Known metric geometry of the calibration pattern (square size and grid dimensions); the paper uses a 6×8 = 48-corner grid of 150×210 mm in simulations.

**Outputs.**
- Taylor polynomial coefficients $a_0, a_2, a_3, \ldots, a_N$ of the radially-symmetric imaging function $f(\rho'')$ (the $a_1$ term is identically zero under the central-projection constraint — see §Assumptions).
- Affine pixel-to-sensor transformation: stretch matrix $A \in \mathbb{R}^{2\times2}$ and translation $t \in \mathbb{R}^{2\times1}$ relating the camera image plane (pixel coordinates $u', v'$) to the sensor plane (metric coordinates $u'', v''$).
- Center of the omnidirectional image $O_c$ in pixel coordinates, found iteratively without requiring the circular mirror boundary to be visible.
- Per-view extrinsic parameters: rotation $R = [r_1, r_2, r_3]$ and translation $t$ for each checkerboard pose.
- Average reprojection error: $<0.4$ pixels at $\sigma=1.0$ pixel corner noise (simulation); $<0.3$ pixels on a real 1024×768 catadioptric camera with 3 images.

# Core idea

The method models the relationship between a sensor-plane point $u'' = [u'', v'']^T$ and the 3D viewing ray by a rotationally-symmetric vector function:

$$g(u'', v'') = (u'',\; v'',\; f(\rho''))^T, \quad \rho'' = \sqrt{u''^2 + v''^2}$$

where $f$ is a polynomial in $\rho''$. The central insight is that for all known specific mirror and fisheye models, $df/d\rho\big|_{\rho=0} = 0$ (Eq. 5), which forces $a_1 = 0$ and yields the simplified Taylor form:

$$f(\rho'') = a_0 + a_2\rho''^2 + a_3\rho''^3 + \cdots + a_N\rho''^N \quad \text{(Eq. 6)}$$

Calibration proceeds in four linear least-squares steps followed by one nonlinear refinement:

1. **Extrinsic estimation (linear):** For each checkerboard pose, the cross-product condition $p_{ij} \wedge [r_1\ r_2\ t] \cdot [X_{ij},Y_{ij},1]^T = 0$ (Eq. 9) yields the planar equation (10.3) — linear in $r_{11}, r_{12}, r_{21}, r_{22}, t_1, t_2$. Stacking $L$ points gives $M \cdot H = 0$ (Eq. 11–12), solved via SVD with unit-norm constraint. Orthonormality of $r_1, r_2$ then fixes the scale and recovers $r_{31}, r_{32}$.

2. **Intrinsic estimation (linear):** Substituting the recovered extrinsics into equations (10.1) and (10.2) and stacking all $K$ views gives the overdetermined system (Eq. 13) for $[a_0, a_2, \ldots, a_N, t_3^1, \ldots, t_3^K]^T$, solved by pseudoinverse. The polynomial degree $N$ is chosen by incrementing from $N=2$ until reprojection error stops decreasing. The paper's simulations and real experiments use $N=4$.

3. **Linear refinement (iterative, two-pass):** A two-step cycle re-estimates extrinsics (using updated intrinsics, via Eqs. 10.1–10.3 jointly) then re-estimates intrinsics (pseudoinverse again). This tightens the linear solution before the nonlinear phase.

4. **Image-center detection (iterative search):** Because the center $O_c$ may differ significantly from the image centroid $I_c$, the method performs a coarse-to-fine grid search over candidate $O_c$ positions, evaluating the Sum of Squared Reprojection Errors (SSRE) at each candidate. The search stops when successive candidates differ by $\varepsilon < 0.5$ pixels (§IV.D). The total cost is reported as $\approx 3$ seconds.

5. **Nonlinear refinement (maximum likelihood):** Minimises the reprojection functional (Eq. 14):
$$E = \sum_{i=1}^{K}\sum_{j=1}^{L}\bigl\|m_{ij} - \hat{m}(R_i, T_i, A, O_c, a_0, a_2, \ldots, a_N, M_j)\bigr\|^2$$
using Levenberg–Marquardt (`lsqnonlin` in MATLAB), split into two sub-steps (extrinsics first, then intrinsics) initialised from the linear result; $A$ is initialised to the identity matrix.

# Assumptions

1. **Central single viewpoint (hard).** Every 3D ray passes through a single effective viewpoint $O$. Violated by non-central catadioptric systems (mirror mis-aligned with optical axis) — the model will then accumulate systematic error.

2. **Planar calibration target with known geometry (hard).** The method relies on $Z_{ij} = 0$ for all checkerboard points (Eq. 8), reducing the projection equation to a two-column homography-like form. A 3D target would require rederiving the linear system.

3. **$a_1 = 0$ (central projection closure, hard).** Follows from the universal property $df/d\rho|_{\rho=0}=0$ satisfied by all standard mirror and fisheye models (Eq. 5). For sensors that do not satisfy this (highly asymmetric or decentred optics), the model is mis-specified.

4. **Rotational symmetry of $f$ (soft).** $f$ depends on $(u'', v'')$ only through $\rho'' = \sqrt{u''^2+v''^2}$. Minor radial asymmetry from manufacturing imperfections is absorbed by the affine matrix $A$; severe asymmetry (e.g., strongly tilted mirror) will degrade accuracy.

5. **Square pixels in the linear phase (soft).** The linear estimation initialises $A$ to the identity. The affine elements (scaling, skew) are recovered only in the nonlinear refinement. If the affine distortion is large, the linear initialisation may be poor.

6. **Automatic corner extraction succeeds (soft).** The toolbox relies on a Harris corner detector for sub-pixel accuracy. Very blurred or low-contrast checkerboard images may require re-clicking corners manually.

7. **Sufficient number and diversity of views (soft).** The paper demonstrates 3 views suffice for a real camera (§V.B), but diverse orientations are required. Nearly coplanar or nearly identical views produce a rank-deficient system in Step 1.

# Failure regime

- **Non-central catadioptric sensor.** If the mirror focus and camera optical centre are significantly mis-aligned, the single-viewpoint assumption is violated. The model still converges but intrinsic parameters carry systematic bias; reprojection error cannot be driven below the baseline structural error.

- **Too few views or near-coplanar views.** The linear system $M \cdot H = 0$ (Eq. 11) becomes ill-conditioned when corner configurations from different views span a low-dimensional subspace. In the limit (all views coplanar), $r_1, r_2, t_1, t_2$ cannot be disentangled from the Taylor coefficients.

- **Very-high-distortion fisheyes where $N=4$ underfits.** The paper recommends stopping at the minimum-error $N$, beginning from $N=2$. If the true $f(\rho)$ has significant higher-order structure beyond degree 4, the polynomial is a poor approximation near the periphery. There is no automatic upper-bound on $N$ mentioned in the paper — the user must monitor the error curve.

- **Bad image-center initialisation.** The SSRE surface has a global minimum at the correct $O_c$ (verified empirically, §IV.D), but the coarse-to-fine search can be slow or trap if the initial search region excludes the true centre. Confidence in automatic detection was validated to $<0.5$ pixels vs. ellipse-detector ground truth on one real camera.

- **Near-singular affine matrix $A$.** The paper initialises $A = I$ and refines it only in the nonlinear phase. Sensors with large non-square pixel aspect ratio or strong axes misalignment will produce a poor linear initialisation, increasing the risk of Levenberg–Marquardt converging to a local minimum.

# Numerical sensitivity

- **Taylor degree $N$.** The paper starts from $N=2$ and increments by 1, stopping at the first local minimum of mean reprojection error across all calibration points (§IV.B). The simulated and real experiments both use $N=4$. Choosing $N$ too high can overfit sparse data; the increment-and-stop heuristic provides modest protection.

- **SVD step for extrinsic estimation.** The system $M \cdot H = 0$ (Eq. 11–12) is solved as the right null-vector of $M$. The matrix $M$ has $L$ rows and 6 columns ($L$ = number of corner points per view). With $L \geq 4$ the system is overdetermined; small $L$ or near-degenerate point configurations (collinear corners) weaken the smallest singular value.

- **Pseudoinverse for intrinsic estimation.** System (Eq. 13) is overdetermined with $2KL$ equations and $N + K$ unknowns ($N$ Taylor coefficients + $K$ depths $t_3^i$). Good conditioning requires many views ($K \geq 3$) and many corners per view, spreading the influence of each unknown across independent observations.

- **Levenberg–Marquardt convergence.** The paper splits the nonlinear minimisation into two sequential sub-problems (extrinsics then intrinsics) rather than a joint optimisation (§IV.E). This reduces the Jacobian dimension at each step and speeds convergence but does not guarantee the globally optimal joint solution.

- **Image-center search precision.** The stopping criterion $\varepsilon = 0.5$ pixels (§IV.D) was "reasonably set" by the authors — no theoretical derivation is given. Sub-pixel accuracy of $O_c$ is critical because it enters the affine transformation and all subsequent reprojection computations.

- **Floating-point precision.** The paper does not discuss 32-bit vs. 64-bit; the MATLAB implementation uses double precision by default. The pseudoinverse of large stacked systems (Eq. 13) is well-suited to double precision; single-precision accumulation of squared residuals over many points could lose significance.

# Applicability

- **Use when:** Calibrating any central omnidirectional camera — catadioptric (hyperbolic, parabolic, elliptical mirrors) or fisheye — using a planar checkerboard. Minimum user interaction: collect 3+ images and click corners. Typical robotics and SLAM pipelines where fisheye or wide-angle lenses are used. The OcamCalib MATLAB toolbox (referenced as [14] = "Google for OCAMCALIB") implements this procedure.

- **Don't use when:** Pinhole cameras with small distortion (use zhang-planar-calibration; simpler model, well-supported in OpenCV). Precision metrology requiring a 3D fixture (use tsai-versatile-calibration; the planar target gives weaker geometric constraints for recovering the image-plane scaling factor). Non-central catadioptric systems where the single-viewpoint property fails significantly.

- **Compared against:** zhang-planar-calibration (pinhole + radial distortion, same planar-target workflow but different projection model), tsai-versatile-calibration (3D fixture, different sensor class).

# Connections

- **Builds on:**
  - [20] D. Scaramuzza, A. Martinelli, R. Siegwart — "A Flexible Technique for Accurate Omnidirectional Camera Calibration and Structure from Motion," ICVS 2006. This is the companion long paper introducing the same camera model; this IROS paper simplifies the parameter count and improves the linear estimation. Not yet in our index — candidate for `paper-ingest`. (Candidate ID: `scaramuzza2006-flexible`? — verify before adding.)
  - [8] B. Micusik and T. Pajdla — "Estimation of omnidirectional camera model from epipolar geometry," CVPR 2003. Provides the affine-transformation notation ($u'' = Au' + t$) adopted in this paper. Not in our index.
  - [9] B. Micusik and T. Pajdla — "Para-catadioptric Camera Auto-calibration from Epipolar Geometry," ACCV 2004. Related autocalibration predecessor. Not in our index.
  - [5] C. Geyer and K. Daniilidis — "Paracatadioptric camera calibration," PAMI 24(5) 2002. Foundational unified model for paracatadioptric systems. Not in our index.

- **Enables (downstream):**
  - `rufli2008-blurred` — The Rufli 2008 blurred-corner paper describes a robust corner extraction front-end designed for use with the same OcamCalib toolbox family. This is in our index.

# Atlas update plan

## NEW: scaramuzza-omni-calibration
Type: algorithm
Category: camera-calibration
Primary source: scaramuzza2006-omni

**Goal:**
- Estimate the intrinsic and extrinsic parameters of any central omnidirectional camera (catadioptric or fisheye) from a few images of a planar checkerboard, without prior knowledge of the mirror or lens model.
- Outputs: Taylor polynomial coefficients of the radially-symmetric imaging function, affine pixel-to-sensor transform, image center, and per-view extrinsics.

**Algorithm:**
- Represent the imaging function as $f(\rho'') = a_0 + a_2\rho''^2 + \cdots + a_N\rho''^N$ (the $a_1=0$ constraint follows from $df/d\rho|_{\rho=0}=0$ for all standard omnidirectional models).
- Four-step linear pipeline: (1) per-view extrinsic estimation via SVD of the cross-product linear system; (2) global intrinsic estimation ($a_0, a_2, \ldots, a_N$) via pseudoinverse over all views; (3) two-pass linear refinement of both; (4) iterative coarse-to-fine image-center search minimising Sum of Squared Reprojection Errors.
- Final nonlinear refinement using Levenberg–Marquardt (maximum likelihood criterion, split into extrinsics-then-intrinsics sub-steps).
- Polynomial degree $N$ selected automatically by incrementing from $N=2$ until reprojection error ceases to decrease; $N=4$ typical.

**Implementation:**
- Reference implementation: OcamCalib MATLAB Toolbox (reference [14] in the paper = "Google for OCAMCALIB"; now hosted at ETH RPG lab).
- Requires only a Harris corner detector for sub-pixel corner localisation; no 3D fixture or special equipment beyond a printed checkerboard.
- Real camera validation: 3 images, 1024×768 pixels, hyperbolic mirror; average reprojection error < 0.3 pixels.
- Image-center detection loop converges in ~3 seconds (MATLAB, 2006 hardware).

**Remarks:**
- The model-free Taylor polynomial approach means the same toolbox works for hyperbolic, parabolic, elliptical, and most fisheye sensors without changing code.
- Eliminating the $a_1$ term reduces the parameter count by 1 with no accuracy loss (all standard models satisfy $df/d\rho|_{\rho=0}=0$).
- Simulation results: reprojection error < 0.4 pixels at $\sigma=1.0$ pixel noise; extrinsic translation error < 2 mm; orientation error < 2°.
- The method assumes central projection; non-central catadioptric systems (mis-aligned mirror) will show irreducible systematic residuals.
- `prerequisites` candidate: `camera-distortion-models` (polynomial distortion parameterisation background).

**References:**
- Primary: scaramuzza2006-omni
- Companion long paper: ICVS 2006 (not yet indexed)

# Provenance

| Claim | Source location |
|---|---|
| Omnidirectional camera classes: catadioptric and dioptric/fisheye | §I, para. 1 |
| Central vs. non-central classification; single effective viewpoint definition | §I, para. 2; reference [1] (Baker & Nayar 1998) |
| Camera image plane $(u', v')$ and sensor plane $(u'', v'')$ distinguished by affine transform $u'' = Au' + t$ | §III, para. 2, citing [8] |
| Projection equation $\lambda \cdot p = \lambda \cdot g(Au'+t) = PX$ | Eq. (1) |
| Imaging function $g(u'',v'') = (u'', v'', f(u'',v''))^T$ | Eq. (2) |
| Rotational symmetry: $f$ depends on $(u'',v'')$ only through $\rho'' = \sqrt{u''^2+v''^2}$ | §III, below Eq. (2) |
| General Taylor form $f = a_0 + a_1\rho'' + a_2\rho''^2 + \cdots + a_N\rho''^N$ | Eq. (3) |
| Closure $df/d\rho|_{\rho=0}=0$ forcing $a_1=0$ | Eq. (5), §III para. below Eq. (4) |
| Simplified Taylor form $f = a_0 + a_2\rho''^2 + \cdots + a_N\rho''^N$ | Eq. (6) |
| Simplified projection equation with $\alpha$ absorbed into $\lambda$ | Eq. (7); only $N$ parameters $a_0, a_2, \ldots, a_N$ remain |
| Planar pattern assumption $Z_{ij}=0$ | §IV, below Eq. (8) |
| Per-point cross-product linear system | Eq. (9) |
| Three per-point equations; only (10.3) linear in $r_{11},r_{12},r_{21},r_{22},t_1,t_2$ | Eqs. (10.1)–(10.3), §IV.A |
| Stacked matrix $M$, vector $H = [r_{11},r_{12},r_{21},r_{22},t_1,t_2]^T$, system $M\cdot H=0$ | Eqs. (11)–(12) |
| SVD solution with unit-norm constraint | §IV.A, below Eq. (12) |
| Orthonormality used to fix scale and recover $r_{31},r_{32}$ | §IV.A, final paragraph |
| Overdetermined system for intrinsics $[a_0,a_2,\ldots,a_N, t_3^1,\ldots,t_3^K]^T$ solved by pseudoinverse | Eq. (13), §IV.B |
| $N$ chosen by incrementing from $N=2$, stopping at first error minimum | §IV.B, final para. |
| Two-pass linear refinement (re-estimate extrinsics, then intrinsics) | §IV.C, steps 1–2 |
| Iterative center search; stopping condition $\varepsilon = 0.5$ pixels | §IV.D, step description |
| "Only 3 seconds" for center search | §IV.D, last sentence |
| ML functional $E = \sum_{i,j}\|m_{ij}-\hat{m}(\cdot)\|^2$ | Eq. (14) |
| Levenberg–Marquardt via `lsqnonlin`; split into two sub-steps; $A$ initialised to identity | §IV.E, paras. 2–3 |
| Simulation: 6×8=48 corners, 150×210 mm, 900×1200 pixels, 4th-order polynomial model | §V.A, opening para. |
| Simulation: 14 poses, noise $\sigma$ varied 0.1–3.0 pixels, 100 independent trials | §V.A.1 |
| Reprojection error $<0.4$ px at $\sigma=1.0$ px (nonlinear method) | §V.A.1, Fig. 4 caption |
| Translation error $<2$ mm, orientation error $<2°$ | §V.A, last para. |
| Real camera: hyperbolic mirror, 1024×768, 3 images, reprojection error $<0.3$ px | §V.B, opening para. |
| Center estimate differs from ellipse-detector by $<0.5$ px | §V.B, last sentence of first paragraph |
| OcamCalib Toolbox: reference [14] = "Google for OCAMCALIB" | §V.B, first sentence; Reference [14] |
| Companion ICVS 2006 paper (the "previous work" / "earlier work" / "[20]") | §I, §III; Reference [20] |
| Geyer & Daniilidis paracatadioptric calibration (reference [5]) | Reference list |
| Micusik & Pajdla CVPR 2003 (reference [8]) — affine-transform notation source | §III citing [8]; Reference list |
| Rufli / blurred-corner followup — `rufli2008-blurred` in index | Downstream toolbox family; not explicitly cited in this 2006 paper |
