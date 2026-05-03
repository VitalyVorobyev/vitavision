---
paper_id: sturm2003-plane-based
title: "On Plane-Based Camera Calibration: A General Algorithm, Singularities, Applications"
authors: ["P. F. Sturm", "S. J. Maybank"]
year: 1999
url: https://inria.hal.science/inria-00525681/document
created: 2026-05-02
relevant_atlas_pages: [zhang-planar-calibration, homography]
---

# Setting

**Problem class.** Metric intrinsic calibration of a perspective camera from one or more views of one or more planar calibration objects with known metric structure. The intrinsic parameters to be recovered are: focal length $f$, aspect ratio $\alpha$, principal point $(u_0, v_0)$, and optionally skew $s$ (assumed zero in the sequel). No 3D calibration object is required; laser-printer output on a flat surface suffices for moderate accuracy. The method supports cameras with **variable intrinsic parameters** (e.g., a zooming camera) by introducing per-view unknowns into the linear system.

**Inputs.**
- One or more plane-to-image homographies $H$, each estimated from $\geq 4$ point or line correspondences between a planar calibration target and its image. Target metric coordinates must be known (up to scale is sufficient for the homography to be decomposable as in eq. 2).
- Optional: prior knowledge of any subset of intrinsic parameters (e.g., known aspect ratio, known principal point), which reduces the number of unknowns in the linear system.

**Outputs.**
- Calibration matrix $K$ (equivalently, the image of the Absolute Conic $\omega = K^{-T}K^{-1}$), extracted from the IAC's 5-vector $x = [\omega_{11}, \omega_{22}, \omega_{13}, \omega_{23}, \omega_{33}]^T$.
- Per-view poses (camera position and orientation relative to each calibration plane).
- A full catalogue of degenerate configurations for one- and two-plane calibration (Tables 1 and 2), specifying which parameters are unrecoverable in each singular case.

**Venue and priority.** IEEE CVPR 1999, Fort Collins, CO, pp. 432–437 (DOI: 10.1109/CVPR.1999.786974). The paper is concurrent with Zhang's Microsoft Research Tech Report MSR-TR-98-71 (first circulated 1998; published in IEEE TPAMI in 2000). Both papers independently derive the same two linear IAC constraints per homography. Sturm–Maybank's primary contribution beyond the basic constraint is the **exhaustive singularity analysis** and the generalization to **variable intrinsics** and **arbitrary numbers of planes and views**.

# Core idea

A planar calibration target at $Z = 0$ maps to its image by a homography $H \sim KR[I \mid t]$ (eq. 2 of the paper, dropping the third column of $R$). Because $R$ is a rotation matrix, its first two columns are orthonormal. This encodes two homogeneous linear constraints on the IAC $\omega = K^{-T}K^{-1}$ per view:

$$h_1^T \omega h_1 - h_2^T \omega h_2 = 0, \qquad h_1^T \omega h_2 = 0, \tag{4}$$

where $h_i$ is the $i$-th column of $H$. The IAC is symmetric with five degrees of freedom (skew fixed to zero makes $\omega_{12} = 0$, reducing to a 5-vector $x$). Stacking two rows per homography gives a linear system $Ax = 0$, solved by SVD. Once $\omega$ is known, the intrinsic parameters are extracted in closed form via eq. 5:

$$\alpha^2 = \frac{\omega_{22}}{\omega_{11}}, \quad u_0 = -\frac{\omega_{13}}{\omega_{11}}, \quad v_0 = -\frac{\omega_{23}}{\omega_{22}}, \quad f^2 = \frac{\omega_{11}\omega_{22}\omega_{33} - \omega_{22}\omega_{13}^2 - \omega_{11}\omega_{23}^2}{\omega_{11}\omega_{22}^2}.$$

The geometric interpretation: the circular points of any metric plane project through its homography $H$ to two points $h_1 \pm i\,h_2$ on the image plane. The IAC is the locus of all such circular-point images across all possible planes; each new non-parallel plane orientation adds a new pair of circular-point projections and two independent rows to $A$. Singular configurations arise precisely when all planes contribute the same (or linearly dependent) circular-point images to $A$.

For variable intrinsics (zooming camera), additional unknowns are introduced per view: if only $f$ changes, one new $\omega_{33}$ per view; if $f, u_0, v_0$ all change, three new unknowns per view. The linear structure is preserved; the design matrix $A$ grows in columns. Column-wise rescaling to equal norms is essential for numerical stability (row-wise rescaling is avoided because near-zero rows are amplified by noise — §4 of the paper).

# Assumptions

1. (hard) The calibration target is planar and its metric coordinates are known. A laser-printed grid on a flat surface is sufficient; bent or buckled targets violate the planar constraint and bias the homography estimate.
2. (hard) The homography $H$ is estimable from $\geq 4$ point or line correspondences in metric coordinates. Fewer than 4 points yield an underdetermined homography DLT.
3. (hard) The camera model is perspective; the aspect ratio is constant across views (§4.2 explicitly excludes independently varying aspect ratios). Fisheye or catadioptric cameras violate the perspective model.
4. (soft) Pixels are rectangular (skew $s = 0$). The paper sets $s = 0$ from the start, reducing the IAC to a 5-vector. Cameras with non-rectangular pixels (film scanners, some industrial sensors) require a 6-parameter IAC.
5. (soft) The calibration configuration is non-singular. Tables 1 and 2 enumerate all singular cases for one- and two-plane setups; in practice, tilted planes at intermediate angles ($30°$–$70°$ from the image plane) are safe.
6. (soft) The metric structure of the plane is known up to scale. Scale is sufficient for the homography decomposition; absolute scale is not needed for intrinsic calibration, only for metric pose recovery.

# Failure regime

**Parallel planes (same orientation, any translation).** Two planes related by a translation along their shared normal produce identical circular-point projections $h_1 \pm i\,h_2$, contributing duplicate rows to $A$. The linear system gains no new rank. The paper notes: "planes that are parallel to each other provide exactly the same information as a single plane with the same orientation" (§5). This is the most common practical failure mode; rotating the pattern between views avoids it.

**Plane parallel to the image plane.** For one plane: only the aspect ratio $\alpha$ and $v_0$ can be estimated (Table 1, first row). The homography degenerates to a similarity transform, providing no constraints on focal length. For two planes where one is image-parallel: the situation reduces to the one-plane case for that plane.

**Plane perpendicular to the image plane.** When the plane is perpendicular and parallel to the $u$-axis: the aspect ratio $\alpha$ and focal length $f$ cannot be estimated (Table 1, second row). When parallel to the $v$-axis: $\alpha$ and $f$ also cannot be estimated (Table 1, third row). Perpendicular planes oriented obliquely (not parallel to either axis) cannot determine any of $\alpha$, $\alpha f$, or $\beta f$ (Table 1, fourth row — only $u_0, v_0$ are estimable).

**Reflection constraint (two planes).** Two planes whose vanishing lines are reflections of each other by both a horizontal and a vertical line in the image cause a full singularity: no intrinsic parameter can be estimated (Table 2, "general case satisfying reflection constraint"). This is geometrically equivalent to an orbit-like camera motion that maps the circular points of the first plane onto those of the second.

**Vanishing-line intersections on principal-point axes.** Two planes whose vanishing lines intersect at $(u_0, v, 1)$ for some $v$ cannot determine $u_0$; at $(u, v_0, 1)$ cannot determine $v_0$ (Table 2). These are configurations where the epipole between the planes coincides with the principal point on one axis.

**Near-zero rows in $A$.** The paper explicitly warns: "occasionally there are rows with all coefficients very close to zero" (§4.3). Row-wise rescaling amplifies noise in these rows and must be omitted; only column-wise rescaling is applied.

**One-plane minimal case without prior knowledge.** A single view of a single plane provides only 2 equations. Without prior knowledge of at least 3 of the 5 intrinsic parameters, the system is underdetermined. Minimum prior: $u_0, v_0$ known → can estimate $f$ and $\alpha$. No prior: cannot calibrate from one plane alone.

# Numerical sensitivity

- **Column rescaling of $A$ is critical.** The design matrix $A$ has columns corresponding to $\omega_{11}, \omega_{22}, \omega_{13}, \omega_{23}, \omega_{33}$. These have different natural scales depending on focal length and resolution; without column rescaling, the SVD solution is dominated by the largest-scale column and produces a poor IAC estimate. The paper reports: "this rescaling proved to be crucial to obtain reliable results" (§4.3).
- **Row rescaling is dangerous.** Near-zero rows in $A$ arise near singular configurations (§5). Rescaling such rows amplifies noise by a large factor. The paper's recommendation — omit row-wise rescaling — is the practical safeguard; numerical rank-revealing factorizations (truncated SVD with threshold) are a complementary tool.
- **Cholesky extraction of $K$ from $\omega$.** The intrinsic parameters are extracted from $\omega$ via eq. 5 (Sturm–Maybank) or the equivalent Appendix B formulas (Zhang). The denominator $\omega_{11}\omega_{22}$ must be positive for real focal lengths; an indefinite $\omega$ indicates a degenerate or badly conditioned input.
- **Variable-intrinsics conditioning.** With $n$ zoom positions and 3 new unknowns per view ($\omega_{33}, \omega_{13}, \omega_{23}$), the design matrix grows to $2n \times (2 + 3n)$. For $n = 5$ zoom positions the system has 17 unknowns and 10 equations from the $5 \times 2$ rows — already underdetermined without the aspect-ratio constraint shared across all views. The paper's Table 4 result ($< 1\%$ error in focal length at 5 zoom positions) uses $5 \times 3 = 15$ planes and 30 rows, providing adequate redundancy.
- **Simulated experiments (§6.1).** At 1-pixel noise with 4 corner points per 40 cm square (camera-to-target distance matching the image plane): relative focal-length error is below 1% for tilt angles in $[30°, 70°]$; aspect-ratio error is $< 0.01\%$ in the same range. Errors scale nearly linearly with noise (§6.1 first paragraph). The error-vs-angle graphs (Fig. 1) confirm the singularity catalogue: error spikes at $0°$ (parallel) and $90°$ (perpendicular).

# Applicability

- Use when: calibrating a camera with variable intrinsics (zoom, focus breathing) where different views have different focal lengths or principal points. This is the primary extension Sturm–Maybank adds over the basic Zhang formulation, which assumes constant intrinsics.
- Use when: a scene-based planar patch (wall, floor, rectangular object) is the only available calibration target. The paper explicitly discusses ground-plane calibration, indoor-scene reconstruction, and augmented reality as applications where off-line calibration targets are impractical (§7).
- Use when: a complete singularity catalogue is required before deploying a calibration system. Tables 1 and 2 provide a pre-computed answer for one- and two-plane setups.
- Use when: prior knowledge of some intrinsic parameters is available (e.g., principal point at image centre, known aspect ratio). §4.1 shows how to incorporate these as linear constraints that reduce the unknowns in $Ax = 0$.
- Don't use when: only a single plane is available and no intrinsics are known. Two views of the same plane (different orientations) or one view of two planes are the minimum for full calibration without priors.
- Don't use when: the highest possible accuracy is required and distortion is significant. The paper notes distortion as a planned enhancement (§4.3 Comments); the basic algorithm is pinhole-only.
- Compared against:
  - **Zhang 2000 (zhang2000-flexible)** — see "Connections" and the Atlas update plan comparison section below.
  - **Tsai 1987 (tsai1987-versatile)** — Tsai's RAC method requires a 3D calibration target (multi-plane or known-height setup). Sturm–Maybank shares with Zhang the key advance: a flat 2D pattern suffices.
  - **Standard 3D calibration (Faugeras–Toscani 1987, ref [3] in the paper)** — Used as the comparison baseline in §6. Results: one-plane Sturm–Maybank is close to standard calibration from all points; two-plane gives precision comparable to standard from two planes of the 3D grid (Table 3).
  - **Triggs 1998 autocalibration from planar scenes** — Triggs requires 9–10 views of the same plane with unknown metric structure; Sturm–Maybank requires known metric structure but fewer views (2 views sufficient for full calibration).

# Connections

- Builds on:
  - **Faugeras 1995** (reference [2]) — the IAC as the link between calibration and metric scene reconstruction; the circular points of a plane and their projections as the geometric substrate of calibration constraints.
  - **Lenz–Tsai 1988** (reference [7]) — cited as prior planar calibration work, restricted to one or two planes with constant calibration.
  - **Jennings–McKeown 1992** (reference [5]) — Cholesky decomposition for extracting $K$ from $\omega = KK^T$; column-rescaling technique.
- Concurrent with:
  - **zhang2000-flexible** — independent derivation of the same two constraints eq. 4 (Sturm–Maybank) = eqs. 3–4 (Zhang). Zhang 2000 (IEEE TPAMI) is the extended version of Zhang's 1998 tech report; both CVPR 1999 papers (Sturm–Maybank and Zhang's ICCV 1999 version) are concurrent.
- Enables (in the atlas):
  - **zhang-planar-calibration** — listed in `sources.references`; contributes the singularity analysis and the variable-intrinsics generalization.
  - **homography** — the calibration constraint derivation from plane homographies is a standard application of the homography concept.

# Atlas update plan

## UPDATE: zhang-planar-calibration

The page currently lists `sturm2003-plane-based` in `sources.references` (position 3 of 3) but does not surface its contributions. Two substantive improvements are warranted.

### Section: Remarks — add Sturm–Maybank companion citation and IAC geometric framing

**Add bullet — Sturm–Maybank 1999 as concurrent derivation and singularity catalogue.**
Sturm and Maybank published the same two IAC constraints (eq. 4 in their paper, eqs. 3–4 in Zhang's) independently and concurrently at CVPR 1999. Their primary contribution beyond the shared core is an exhaustive singularity analysis for one- and two-plane calibration: Tables 1 and 2 enumerate every configuration of plane orientation that renders one or more intrinsic parameters unrecoverable. Key practical cases: (a) a plane parallel to the image plane yields only the aspect ratio; (b) perpendicular planes cannot constrain focal length; (c) two planes whose vanishing lines are mutual reflections by horizontal and vertical axes in the image are fully singular. Awareness of this catalogue is essential for designing robust calibration rigs and for diagnosing unexpected calibration failures.

**Add bullet — circular-points geometric framing.**
The geometric interpretation underlying both Zhang and Sturm–Maybank: each plane in 3D has two circular points at infinity (the ideal points of circles on the plane, $I = [1, i, 0]^T$ and $J = [1, -i, 0]^T$ in the plane's metric frame). The plane-to-image homography $H$ maps these circular points to $h_1 + i\,h_2$ and $h_1 - i\,h_2$ in the image. The IAC $\omega$ is the locus of all circular-point images across all possible plane orientations. Each view of a non-parallel plane adds a new circular-point image pair to this locus, providing two independent constraints on $\omega$. Singular configurations are those where successive views contribute the same (or dependent) circular-point images — i.e., the circular points project to the same image points regardless of the rotation component of $H$.

**Add bullet — variable-intrinsics extension.**
Sturm–Maybank §4.2 shows how to calibrate a zooming camera by treating $f$ (or $f, u_0, v_0$) as per-view unknowns while keeping the aspect ratio constant. Additional columns are added to the design matrix $A$ for each new unknown; the SVD still solves the whole system simultaneously. This is the principled generalisation of Zhang's constant-intrinsics assumption; it matters for any calibration sequence where the camera is accidentally zoomed between shots or intentionally calibrated at multiple focal lengths.

### Section: Remarks — strengthen parallel-orientation degeneracy bullet

The current Remarks bullet ("Parallel orientations of the planar target are degenerate: a second view obtained from the first by a rotation about the plane normal (and any translation) contributes constraints linearly dependent on those of the first view") is accurate. Strengthen with the Sturm–Maybank proof mechanism: parallel planes map their circular points to the same two image points, so their two constraint rows in $A$ are identical. The geometric characterization (shared circular-point projection) is the same fact as Zhang's algebraic Proposition 1 ($r_1, r_2$ identical across views) but more illuminating for practitioners diagnosing degeneracy.

## UPDATE: homography (minor, optional)

The `homography` concept page already references `zhang2000-flexible` and mentions the IAC decomposition for calibration. An optional improvement: note that the same two IAC constraints on a plane homography were derived independently by Sturm–Maybank 1999, and that their singularity tables (Tables 1 and 2) directly address which homography configurations cannot recover which intrinsics — a useful cross-reference for readers arriving from the calibration page.

# Provenance

- Full text: `docs/papers/.cache/sturm2003-plane-based.txt` (8 pages, HAL preprint of CVPR 1999 proceedings, inria-00525681v1, submitted 30 May 2011).
- Title and authors: "On Plane-Based Camera Calibration: A General Algorithm, Singularities, Applications" — Peter F. Sturm and Stephen J. Maybank, Computational Vision Group, Dept. of Computer Science, University of Reading, UK.
- Venue: IEEE Conference on Computer Vision and Pattern Recognition (CVPR '99), June 1999, Fort Collins, CO, pp. 432–437. DOI: 10.1109/CVPR.1999.786974.
- Note on `paper_id`: the index.yaml id is `sturm2003-plane-based`; the "2003" appears to be a filing artifact — the paper itself is CVPR 1999. The id is used verbatim.
- §2 Camera model (p. 1 of the paper): homography eq. 2: $H \sim KR[I_3 \mid t]$ dropping the third column.
- §3 Principle of plane-based calibration (p. 2): IAC $\omega = K^{-T}K^{-1}$; form eq. 3 for rectangular pixels (5-vector $x = [\omega_{11}, \omega_{22}, \omega_{13}, \omega_{23}, \omega_{33}]^T$); two calibration constraints eq. 4: $h_1^T\omega h_1 - h_2^T\omega h_2 = 0$ and $h_1^T\omega h_2 = 0$.
- §3 extraction formulas eq. 5: $\alpha^2 = \omega_{22}/\omega_{11}$, $u_0 = -\omega_{13}/\omega_{11}$, $v_0 = -\omega_{23}/\omega_{22}$, $f^2 = (\omega_{11}\omega_{22}\omega_{33} - \omega_{22}\omega_{13}^2 - \omega_{11}\omega_{23}^2)/(\omega_{11}\omega_{22}^2)$.
- §4.1 Prior knowledge (p. 3): prior on aspect ratio eliminates $\omega_{22}$; prior on $u_0$ or $v_0$ eliminates $\omega_{13}$ or $\omega_{23}$ by substitution into the design matrix columns.
- §4.2 Variable intrinsics (pp. 3–4): assumption of constant aspect ratio; two modes of variation ($f$ only, or $f$ and $u_0, v_0$); additional unknowns $\omega_{33}$ (or $\omega_{33}, \omega_{13}, \omega_{23}$) added as new columns in $A$.
- §4.3 Complete algorithm (p. 3): column rescaling "proved to be crucial"; row rescaling omitted because near-zero rows "will hugely magnify noise."
- §5 Singularities (pp. 3–4): geometric derivation via degenerate conic $\omega'$ (a conic consisting of two lines = vanishing lines of the calibration planes); reflection constraint. Table 1 (one-plane singularities, 12 configurations). Table 2 (two-plane singularities, 8 non-parallel configurations). Key cases: parallel-to-image-plane → only $\alpha$ estimable (Table 1, row 1); perpendicular-to-image + any orientation → only $u_0, v_0$ estimable (Table 1, row 4); reflection constraint in two planes → nothing estimable (Table 2, row 2).
- §6.1 Simulation (pp. 4–5): $f = 1000$, $\alpha = 1$; 4 corners of 40 cm squares; 1 pixel noise; median of 1000 random experiments. Focal-length relative error $< 1\%$ for tilt in $[30°, 70°]$; aspect-ratio error $< 0.01\%$ same range. Fig. 1 (one plane): error spikes at $0°$ and $90°$ as predicted by Table 1. Fig. 1 (two planes, one view): plane-based $\alpha$ error 3–4× worse than standard calibration; focal length slightly better between $30°$ and $70°$; $u_0, v_0$ errors ~30% lower for plane-based than standard.
- §6.2 Calibration grid (pp. 5–6): real-data experiment with 3D grid, 4 views. Table 3: three-plane standard calibration $f = 1041.4 \pm 0.6$; two-plane Sturm–Maybank (nothing known) $f = 1043.6 \pm 4.7$; one-plane (with $\alpha, u_0, v_0$ known) $f = 1041.2 \pm 3.7$. Table 4: variable-focal-length experiment at 5 zoom positions; deviation $< 1\%$ across all focal lengths.
- §7 Applications: cheap calibration tool, ground-plane calibration (traffic scenes), piecewise-planar reconstruction from single views, indoor-scene reconstruction, augmented reality.
- §8 Conclusion: "exhaustive list of singularities"; future work: "analytical error analysis."
- References cited in the paper: [2] Faugeras 1995 (IAC); [3] Faugeras–Toscani 1987 (standard calibration baseline); [5] Jennings–McKeown 1992 (matrix computation / Cholesky); [7] Lenz–Tsai 1988 (prior planar calibration); [12] Tsai 1987; [13] Triggs 1998 autocalibration.

## Historical lineage note

The id `sturm2003-plane-based` is an index artifact. The actual paper is CVPR 1999. Zhang's foundational work also appeared in 1999 (ICCV 1999 version, published as TPAMI 2000). Both papers are concurrent; neither predates the other. For the comparison-hosting rule: Sturm–Maybank CVPR 1999 and Zhang ICCV 1999 are the same year. Under the "same year → more general scope hosts" tiebreaker, Zhang's page (`zhang-planar-calibration`) is the more appropriate host for a `## When to choose Sturm–Maybank over Zhang` section because: (a) Zhang's page is the primary source for the calibration algorithm (it is the atlas's algorithm page); (b) Sturm–Maybank's contribution is the singularity catalogue and the variable-intrinsics extension, which are supplementary to the core algorithm Zhang's page covers. The two papers share the core mathematical framework but differ in focus: Zhang → practical end-to-end algorithm with distortion, LM refinement, and numerical recipes; Sturm–Maybank → projective geometric theory, exhaustive degeneracy analysis, and variable-intrinsics generalization. Both research notes now exist, satisfying the agentic discipline requirement for comparison content.
