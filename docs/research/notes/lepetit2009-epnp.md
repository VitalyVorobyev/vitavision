---
paper_id: lepetit2009-epnp
title: "EPnP: An Accurate O(n) Solution to the PnP Problem"
authors: [V. Lepetit, F. Moreno-Noguer, P. Fua]
year: 2009
url: http://hdl.handle.net/2117/10327
created: 2026-05-04
relevant_atlas_pages:
  - fischler-bolles-ransac
---

# Setting

**Problem class:** Calibrated Perspective-n-Point (PnP) pose estimation. Given n correspondences between 3D reference points (whose world coordinates are known) and their 2D projections in a calibrated image, recover the camera pose — rotation **R** and translation **t** — that maps world coordinates into camera coordinates.

**Inputs:** n ≥ 4 reference points $\mathbf{p}_i^w$ with known 3D world coordinates; their 2D projections $\mathbf{u}_i$; the camera intrinsic matrix **A** containing focal lengths $f_u$, $f_v$ and principal point $(u_c, v_c)$. For the planar degenerate case n ≥ 3 suffices with a modified three-control-point formulation.

**Outputs:** Camera pose $[\mathbf{R} | \mathbf{t}]$; optionally refined via Gauss-Newton to match the accuracy of iterative methods. Pose is extracted by aligning the recovered camera-frame point set against the known world-frame set via absolute orientation (Horn et al. 1988; Arun et al. 1987).

**Position in the landscape:** EPnP is the first non-iterative solver whose complexity grows as O(n) with the number of correspondences. Prior non-iterative methods were O(n²) (Fiore 2001, unstable under noise), O(n⁵) (Quan & Lan 1999), or O(n⁸) (Ansar & Daniilidis 2003). Iterative methods (LHM — Lu et al. 2000) achieve high accuracy but require initialization and are substantially slower. EPnP matches LHM accuracy when followed by its optional Gauss-Newton step, while remaining much faster. This paper is the expanded journal version of the ICCV 2007 conference paper (Moreno-Noguer et al. 2007), with the Gauss-Newton refinement added.

# Core idea

EPnP sidesteps the conventional strategy of solving for the n per-point depths in camera coordinates. Instead, it expresses every reference point as a weighted combination of four virtual *control points* $\mathbf{c}_j^w$, $j = 1, \ldots, 4$ (three for the planar case). The barycentric weights $\alpha_{ij}$ are uniquely determined by the world geometry:

$$\mathbf{p}_i^w = \sum_{j=1}^{4} \alpha_{ij} \mathbf{c}_j^w, \quad \sum_{j=1}^{4} \alpha_{ij} = 1. \tag{1}$$

Because the relationship is affine and rigid motion preserves affine combinations, the same weights hold in the camera frame:

$$\mathbf{p}_i^c = \sum_{j=1}^{4} \alpha_{ij} \mathbf{c}_j^c. \tag{2}$$

The unknown is now the 12-vector $\mathbf{x} = [\mathbf{c}_1^{c\top}, \mathbf{c}_2^{c\top}, \mathbf{c}_3^{c\top}, \mathbf{c}_4^{c\top}]^\top$ of control-point camera coordinates — only 12 unknowns regardless of n. Substituting (2) into the perspective projection equations and eliminating the projective scale $w_i$ (exploiting $w_i = \sum_j \alpha_{ij} z_j^c$) yields two linear equations per reference point:

$$\sum_{j=1}^{4} \alpha_{ij} f_u x_j^c + \alpha_{ij}(u_c - u_i) z_j^c = 0, \tag{5}$$

$$\sum_{j=1}^{4} \alpha_{ij} f_v y_j^c + \alpha_{ij}(v_c - v_i) z_j^c = 0. \tag{6}$$

Stacking these for all n points gives a homogeneous system

$$M\mathbf{x} = \mathbf{0}, \tag{7}$$

where **M** is $2n \times 12$. The solution lies in the null space of **M**, expressed as a linear combination of N null eigenvectors $\mathbf{v}_i$ of $\mathbf{M}^\top\mathbf{M}$:

$$\mathbf{x} = \sum_{i=1}^{N} \beta_i \mathbf{v}_i. \tag{8}$$

$\mathbf{M}^\top\mathbf{M}$ is always $12 \times 12$ and computed in O(n) time — this is the dominant cost for sufficiently large n (about n = 15 in the paper's implementation). The $\beta_i$ coefficients are recovered by requiring that inter-control-point distances computed from $\mathbf{x}$ equal those measured in the world frame — a small system of quadratic constraints, solved in closed form or via linearisation. Finally, $[\mathbf{R} | \mathbf{t}]$ is extracted from the recovered $\mathbf{c}_j^c$ by absolute orientation.

# Assumptions

1. **Known intrinsics (hard).** The camera calibration matrix **A** ($f_u$, $f_v$, $u_c$, $v_c$) must be available. EPnP does not jointly solve for intrinsics and pose.
2. **n ≥ 4 for the general case, n ≥ 3 for the planar case (hard).** Fewer correspondences leave the system underdetermined. The paper targets n ≥ 6 for the claims in Figs. 1–2; four or five points are supported but yield larger null spaces.
3. **Control points span the reference points (soft).** The centroid-plus-principal-directions choice of control points ensures the barycentric coordinates $\alpha_{ij}$ are well conditioned. Pathological geometries (all points collinear or nearly so) weaken this.
4. **Correspondences are correct (soft).** EPnP is a pure model fitter; it does not handle outliers internally. The paper wraps EPnP in RANSAC (sample size 7) for the real-image experiment (§5.2).
5. **n ≈ 15 crossover for the O(n) dominance (soft).** For n < 15 the $\mathbf{M}^\top\mathbf{M}$ product is not the bottleneck; the method is still faster than competitors, but the O(n) characterisation is most meaningful for larger n (§3.2).
6. **Perspective camera (hard for N = 1 regime).** As the focal length grows and the projection approaches orthographic, all four smallest eigenvalues of $\mathbf{M}^\top\mathbf{M}$ approach zero simultaneously (Fig. 3), increasing the effective null-space dimension N and complicating the $\beta$ recovery.

# Failure regime

**Planar reference points at non-zero tilt (critical).** When reference points lie on a tilted plane, the camera pose suffers from an inherent ambiguity (proven by Schweighofer & Pinz 2006). EPnP's closed-form solution for the planar case (§3.4, three control points, rank-9 system) resolves the frontoparallel sub-case (Tilt = 0°) cleanly — no outliers in Fig. 7 — but produces a significant outlier fraction at Tilt = 30° (roughly 20–25% outliers as read from Fig. 7, right panel). The paper acknowledges this and recommends the SP + LHM combination (Schweighofer-Pinz + Lu et al.) for tilted planar targets, noting that EPnP + Gauss-Newton cannot resolve the ambiguity for the non-frontoparallel cases because the closed-form solution was already accurate and the GN step cannot arbitrate between the two valid poses (§5.1.2).

**Large noise inflates effective null-space dimension N.** At σ = 10 pixels with n = 6 points, the distribution of N shifts substantially toward N = 3 and N = 4 (Fig. 4, right panel). When N is overestimated — or the wrong null-eigenvector combination is selected — errors spike. The paper mitigates this by computing solutions for all four N values and keeping the one with smallest reprojection error (Eq. 9), rather than committing to a single N a priori.

**Reprojection error as N selector (soft).** Eq. (9) computes

$$\mathrm{res} = \sum_i \mathrm{dist}^2\!\left(\mathbf{A}[\mathbf{R}|\mathbf{t}]\begin{bmatrix}\mathbf{p}_i^w \\ 1\end{bmatrix},\, \mathbf{u}_i\right) \tag{9}$$

and picks the best candidate. When two N values produce similar reprojection errors (near-degenerate configurations), the selector may choose the wrong one, leading to a poor pose estimate. This pathology appears as the occasional high-error outlier crosses visible in the Fig. 1 boxplots even for EPnP + GN at high noise.

**Too few points (n = 4 or 5).** The system of equations (7) is underdetermined (8 or 10 equations for 12 unknowns), so N is already elevated by construction. The method still works but is sensitive.

# Numerical sensitivity

**Control-point conditioning.** Taking the centroid of the reference points as $\mathbf{c}_1^w$ and the three principal directions of the point cloud as $\mathbf{c}_2^w$, $\mathbf{c}_3^w$, $\mathbf{c}_4^w$ normalises the coordinates analogously to the DLT normalisation recommended by Hartley & Zisserman (§3.1). This directly improves the conditioning of equations (5)–(6) by removing scale dependence on the spread of the 3D point set.

**$\mathbf{M}^\top\mathbf{M}$ is $12 \times 12$ and stable.** The SVD of the small constant-size $\mathbf{M}^\top\mathbf{M}$ matrix is robust and its cost is independent of n (§3.2). Computing the product itself is O(n) and dominates for n ≳ 15.

**Sign of $\beta$ — positive-z fix.** After solving for $\beta$ (all N cases), all camera-frame control points $\mathbf{c}_j^c$ must have positive z-coordinates (they lie in front of the camera). The paper uses this sign constraint when solving the pseudoinverse system for N = 2 (§3.3, Case N = 2): "choose the signs for the $\beta_a$ so that all the $\mathbf{p}_i^c$ have positive z coordinates."

**Relinearisation for N = 4 (10 unknowns, 6 + 4 equations).** For N = 4 the six distance constraints alone are insufficient (six equations, ten $\beta_{ab} = \beta_a \beta_b$ products). The relinearisation technique (Kipnis & Shamir 1999) adds commutativity equations:

$$\beta_{ab}\beta_{cd} = \beta_a\beta_b\beta_c\beta_d = \beta_{a'b'}\beta_{c'd'}, \tag{14}$$

where $\{a', b', c', d'\}$ is any permutation of $\{a, b, c, d\}$. These four additional scalar equations close the $10 \times 10$ linear system. The same relinearisation is needed in the planar case for N ≥ 3 (§3.4).

**N = 2 and N = 3 via $L\boldsymbol{\beta} = \boldsymbol{\rho}$.** For these cases the linearisation introduces $\beta_{ab}$ products as new unknowns. The resulting system is

$$L\boldsymbol{\beta} = \boldsymbol{\rho}, \tag{13}$$

where **L** is $6 \times 3$ (N = 2) or $6 \times 6$ (N = 3), $\boldsymbol{\rho}$ is the 6-vector of squared inter-control-point world distances $\|\mathbf{c}_i^w - \mathbf{c}_j^w\|^2$, and $\boldsymbol{\beta}$ collects the $\beta_{ab}$ products. Solved by pseudo-inverse (N = 2) or direct inverse (N = 3).

**Gauss-Newton is constant-time.** The refinement minimises

$$\mathrm{Error}(\boldsymbol{\beta}) = \sum_{(i,j),\, i<j} \left(\|\mathbf{c}_i^c - \mathbf{c}_j^c\|^2 - \|\mathbf{c}_i^w - \mathbf{c}_j^w\|^2\right)^2, \tag{15}$$

with control-point camera coordinates parameterised as

$$\mathbf{c}_i^c = \sum_{j=1}^{4} \beta_j \mathbf{v}_j^{[i]}, \tag{16}$$

optimising over only four $\beta_i$ scalars regardless of n. In practice fewer than 10 Gauss-Newton iterations are needed. The optimisation time is negligible relative to the $\mathbf{M}^\top\mathbf{M}$ computation and the overall complexity remains O(n) (§4).

**Speedup figures (§5.1.1, Figs. 2 and 6).** MATLAB timings on a standard PC at n = 6: EPnP is approximately 10× faster than LHM and approximately 200× faster than AD. For the planar case at n = 10 and Tilt = 30°, EPnP is approximately 200× faster than AD and approximately 30× faster than LHM (§5.1.2). EPnP + GN requires approximately a twentieth of the time of LHM to achieve similar accuracy levels (Fig. 6).

# Applicability

- **Use when:** n ≥ 4 known 3D-to-2D correspondences with calibrated intrinsics; speed matters (real-time tracking, AR); inlier set is either already clean or EPnP is used as the model fitter inside a RANSAC loop. The paper demonstrates RANSAC with EPnP using sample size 7 in the real-image keypoint-tracking experiment (§5.2).
- **Don't use when:** Reference points lie on a tilted plane — use SP + LHM (Schweighofer & Pinz 2006 combined with Lu et al. 2000) for robust planar pose. Only three correspondences are available — use a dedicated P3P solver (Gao et al. 2003; Quan & Lan 1999; Fischler & Bolles 1981) since EPnP's N = 1 regime for n = 3 is degenerate. Intrinsics are unknown — use a method that jointly solves for calibration and pose.
- **Compared against:**
  - *LHM (Lu et al. 2000, iterative):* Gold-standard accuracy baseline. EPnP closed-form is slightly less accurate; EPnP + GN matches LHM accuracy while being approximately 10–20× faster (Figs. 1, 2, 6). LHM can fail to converge when poorly initialised (weak-perspective initialisation breaks for points projected to a small off-centre image region); EPnP is more stable under these conditions (Fig. 5b).
  - *AD (Ansar & Daniilidis 2003, O(n⁸)):* EPnP is more accurate and dramatically faster. AD also cannot handle uncentred data because it does not normalise 2D coordinates (§5.1.1).
  - *Clamped DLT (Abdel-Aziz & Karara 1971):* Fast but ignores intrinsic constraints; consistently less accurate than EPnP. Not applicable in the planar case (§5.1.2).
  - *Fiore 2001 (O(n²)):* Faster than AD and Quan-Lan but unstable under noise; EPnP improves on both speed and noise robustness.
  - *Quan & Lan 1999 (O(n⁵)):* More stable than Fiore but much slower than EPnP; EPnP subsumes its accuracy advantage (§1, §2).

# Connections

- **Builds on:**
  - DLT (Abdel-Aziz & Karara 1971) — the parameterisation idea and the normalisation argument for improved conditioning (§3.1).
  - Fiore (2001) — the idea of eliminating point depths from the linear system, avoiding per-point depth unknowns (§2).
  - Ansar & Daniilidis (2003) — the linearisation trick for quadratic constraints, which EPnP refines and extends to the relinearisation case (§3.3).
  - Kipnis & Shamir (1999) — the relinearisation technique applied for N = 4 and planar N ≥ 3 (§3.3, §3.4).
  - Moreno-Noguer et al. (ICCV 2007) — the conference precursor; this journal version adds the Gauss-Newton refinement (§1 Introduction, §4).
  - Horn et al. (1988), Arun et al. (1987), Umeyama (1991) — absolute orientation used to recover $[\mathbf{R} | \mathbf{t}]$ from recovered control-point camera coordinates (§3 preamble).
  - Schweighofer & Pinz (2006) — the planar pose ambiguity result that EPnP acknowledges and defers to SP + LHM for tilted planar cases (§5.1.2).

- **Enables:**
  - Real-time feature point-based camera tracking (Skrypnyk & Lowe 2004; Lepetit & Fua 2006 — cited as primary motivation in §1).
  - Efficient RANSAC-wrapped pose estimation at sample size 7 (§5.2, Fig. 8).
  - Later iterative refinement pipelines where EPnP + GN initialises LHM for maximum accuracy with controlled cost.
  - Generalisation to essential matrix estimation from large point sets for Structure-from-Motion (Stewènius et al. 2006 — cited in §6 Conclusion).
  - Deformable surface shape recovery — the control-point basis idea transfers directly to free-form deformation parameterisations (Sederberg & Parry 1986; Chang & Rockwood 1994 — cited in §6 Conclusion as "particularly promising").
  - Subsequent PnP solvers (UPnP, OPnP, RPnP) that build on EPnP's control-point parameterisation.

- **Refutes / supersedes:** Not a strict supersession. LHM (iterative) remains competitive at maximum accuracy. EPnP's contribution is the speed–accuracy frontier: it makes O(n) non-iterative pose estimation practical for the first time, superseding the O(n²)–O(n⁸) non-iterative family in terms of both accuracy and speed.

# Atlas update plan

## NEW: epnp
Type: algorithm
Category: pose-estimation
Primary source: lepetit2009-epnp

Relations:
- (Note for orchestrator: typed-relations decision deferred to page-authoring time. The closest Atlas neighbour is `fischler-bolles-ransac`, but the relationship is paradigmatic — EPnP is a model fitter inside RANSAC's hypothesise-test loop — not typed by any of the available `relations[].type` values. No `feeds_into` or `extended_by` is a clean fit for this meta-architectural dependency. Omit a typed relation; add a prose note in the Remarks section instead.)

**Goal section bullets:**
- Computes camera pose $[\mathbf{R} | \mathbf{t}]$ from n ≥ 4 known 3D-to-2D point correspondences and a calibrated intrinsic matrix **A**.
- Non-iterative and O(n): the dominant cost scales linearly with n (the $\mathbf{M}^\top\mathbf{M}$ matrix product, O(n), dominates for n ≳ 15).
- Handles both general (non-planar) and planar reference-point configurations; the planar variant uses three control points and a rank-9 system.
- Optional Gauss-Newton refinement, performed in constant time over four scalar parameters, brings accuracy to match the best iterative solver (LHM) while remaining approximately 10–20× faster at n = 6.

**Algorithm section bullets:**
1. **Control-point selection:** Choose $\mathbf{c}_1^w$ = centroid of the n reference points; $\mathbf{c}_2^w, \mathbf{c}_3^w, \mathbf{c}_4^w$ = scaled principal directions of the point cloud (analogous to DLT normalisation — §3.1). For planar input, use three control points.
2. **Barycentric coordinates:** Solve for $\alpha_{ij}$ satisfying $\mathbf{p}_i^w = \sum_{j=1}^{4} \alpha_{ij} \mathbf{c}_j^w$ with $\sum_j \alpha_{ij} = 1$ (Eq. 1). These are uniquely defined and transfer unchanged to camera coordinates (Eq. 2).
3. **Build M:** For each reference point, substitute Eq. (2) into the projection equation (3)–(4) and eliminate the projective scale $w_i$; this yields two rows of **M** (Eqs. 5–6). **M** is $2n \times 12$ ($2n \times 9$ for planar).
4. **SVD of $\mathbf{M}^\top\mathbf{M}$:** Compute the 12 × 12 product and extract the N null eigenvectors $\mathbf{v}_i$ (Eq. 8). Null-space dimension N ranges from 1 (perspective, low noise) to 4 (near-orthographic or high noise) — see Fig. 3 and Fig. 4.
5. **Choose N and solve quadratic constraints:** Compute solutions for all four N values:
   - N = 1: closed-form $\beta$ via averaged distance ratios (Eq. 11).
   - N = 2 and N = 3: linearise $\beta_{ab} = \beta_a\beta_b$ products; solve $L\boldsymbol{\beta} = \boldsymbol{\rho}$ (Eq. 13) by pseudo-inverse or direct inverse.
   - N = 4: relinearisation (Eq. 14) to close the $10 \times 10$ system.
   Keep the N that minimises reprojection error (Eq. 9).
6. **Recover camera-frame control points:** $\mathbf{c}_j^c$ is the sub-vector of $\mathbf{x} = \sum_i \beta_i \mathbf{v}_i$ corresponding to control point j. Fix signs so all $z_j^c > 0$.
7. **Recover $[\mathbf{R} | \mathbf{t}]$:** Apply absolute orientation (Horn/Arun) aligning $\{\mathbf{c}_j^c\}$ onto $\{\mathbf{c}_j^w\}$.
8. **Optional Gauss-Newton:** Minimise Eq. (15) over $\boldsymbol{\beta} = [\beta_1, \beta_2, \beta_3, \beta_4]^\top$ with $\mathbf{c}_i^c$ parameterised by Eq. (16); fewer than 10 iterations in practice.

**Implementation section bullets:**
- **Sign fixing for $\beta$:** After pseudoinverse/inverse, select signs of $\beta_a$ so all reference-point z-coordinates in the camera frame are positive (§3.3, Case N = 2 and Case N = 3 discussion).
- **Centroid/principal-axes control-point choice:** Not optional for stability; it conditions the linear system analogously to DLT normalisation (§3.1). The paper notes explicitly that ad hoc control-point placement degrades results.
- **Planar fallback:** When the moment matrix of the reference points has one very small eigenvalue, switch to three control points (§3.4). M becomes $2n \times 9$; only three quadratic constraints exist (distance constraints drop from 6 to 3), requiring relinearisation for N ≥ 3.
- **Gauss-Newton cost:** Constant time, independent of n; the paper's MATLAB timing shows EPnP + GN nearly identical in speed to EPnP alone for n ≤ 150 (Fig. 2). Fewer than 10 iterations required (§4).
- **Planar tilted targets:** Do not use EPnP + GN for tilted planar point sets — the GN step cannot disambiguate the two valid poses. Use SP + LHM instead (§5.1.2).
- **n ≈ 15 crossover:** Below this point the $\mathbf{M}^\top\mathbf{M}$ product is not the bottleneck; EPnP remains faster than competitors but the O(n) scaling argument applies most cleanly for larger n (§3.2).
- **RANSAC wrapping:** Sample size 7 correspondences is effective in the keypoint-tracking real-image experiment; once inliers are found, all inliers are used together for final pose refinement (§5.2). The RANSAC iteration count is set externally — EPnP itself is outlier-agnostic.
- **Absolute orientation back-end:** Any standard algorithm (Horn et al. 1988; Arun et al. 1987; Umeyama 1991) may be used; the choice does not affect the O(n) claim because it operates on only 4 point pairs.

**Remarks section bullets:**
- The "control-point as basis" idea is explicitly generalised in §6 (Conclusion) beyond PnP: the authors identify essential matrix estimation from large n (Stewènius et al. 2006) and deformable-surface shape recovery (Sederberg & Parry 1986; Chang & Rockwood 1994) as natural extensions of the same framework.
- The O(n) complexity claim refers to the $\mathbf{M}^\top\mathbf{M}$ product, which dominates for n ≳ 15. For n < 15 the constant-time SVD and quadratic-constraint solver dominate, but EPnP is still faster than all competitors evaluated in the paper.
- EPnP is the natural model fitter inside a RANSAC loop for pose estimation from feature correspondences. The paper's own real-image experiment (§5.2, Fig. 8) demonstrates this pattern explicitly: RANSAC generates 200 correspondences per frame, filters with sample size 7, and EPnP estimates the pose from the resulting inlier set.
- Planar ambiguity is an inherent geometric property of tilted planar point sets (proven by Schweighofer & Pinz 2006), not a deficiency of EPnP specifically. The acknowledgement in §5.1.2 is notable: EPnP produces fewer outliers than AD at Tilt = 30° but cannot match SP + LHM.

# Provenance

- **§1 (Abstract and Introduction):** O(n) complexity claim; comparison complexity classes: O(n²) (Fiore 2001), O(n⁵) (Quan & Lan 1999), O(n⁸) (Ansar & Daniilidis 2003). Applicability stated as all n ≥ 4. Conference precursor: Moreno-Noguer et al. (2007). Gauss-Newton addition is the journal-version contribution. Real-time motivation: Skrypnyk & Lowe (2004), Lepetit & Fua (2006).
- **§3.1 (Parameterisation in the General Case):** Eq. (1) barycentric decomposition with $\sum_j \alpha_{ij} = 1$. Eq. (2) same relation in camera frame. Control-point choice: centroid + principal directions; DLT conditioning analogy citing Hartley & Zisserman (2000).
- **§3.2 (Solution as Weighted Sum of Eigenvectors):** Eq. (3) projection equation. Eq. (4) expanded with intrinsic parameters $f_u$, $f_v$, $u_c$, $v_c$. Eqs. (5)–(6) two linear equations per reference point after eliminating $w_i$. Eq. (7) $M\mathbf{x} = \mathbf{0}$, M is $2n \times 12$. Eq. (8) null-space expansion $\mathbf{x} = \sum_i \beta_i \mathbf{v}_i$. $\mathbf{M}^\top\mathbf{M}$ is $12 \times 12$, O(n) product. n ≈ 15 crossover explicitly stated: "about 15 in our implementation." Figure 3: singular values of $\mathbf{M}^\top\mathbf{M}$ for focal lengths $f \in \{100, 1000, 3000, 5000, 10000\}$, each curve averaging 100 synthetic trials. Figure 4: distribution of effective N over 300 experiments.
- **§3.3 (Choosing the Right Linear Combination):** Eq. (9) reprojection residual used to select best N. Case N = 1: Eq. (10) inter-control-point distance constraint; Eq. (11) closed-form $\beta$ as ratio of dot products over squared norms. Case N = 2: Eq. (12) expanded distance constraint; linearisation via $\beta_{11} = \beta_1^2$, $\beta_{12} = \beta_1\beta_2$, $\beta_{22} = \beta_2^2$; Eq. (13) system $L\boldsymbol{\beta} = \boldsymbol{\rho}$ (L is $6 \times 3$, $\boldsymbol{\rho}$ is 6-vector of squared world distances, solved by pseudoinverse). Sign selection to ensure positive $z$ coordinates. Case N = 3: same $L\boldsymbol{\beta} = \boldsymbol{\rho}$ with L as $6 \times 6$ (solved by direct inverse), $\boldsymbol{\beta} = [\beta_{11}, \beta_{12}, \beta_{13}, \beta_{22}, \beta_{23}, \beta_{33}]^\top$. Case N = 4: ten $\beta_{ab}$ products, six distance constraints insufficient; relinearisation technique (Kipnis & Shamir 1999) via Eq. (14) commutativity identity; null-space of first homogeneous linear system, then second-pass linearisation.
- **§3.4 (The Planar Case):** M becomes $2n \times 9$; 9D eigenvectors $\mathbf{v}_i$; three quadratic constraints (six drops to three); relinearisation required for N ≥ 3 (same technique as N = 4 general case).
- **§4 (Efficient Gauss-Newton Optimization):** Eq. (15) Gauss-Newton objective over pairwise camera-frame distance residuals. Eq. (16) parameterisation $\mathbf{c}_i^c = \sum_{j=1}^4 \beta_j \mathbf{v}_j^{[i]}$. Fewer than 10 iterations. Constant-time complexity; overall solution remains O(n).
- **§5.1.1 (The Non-Planar Case):** Synthetic setup: $640 \times 480$ image, $f_u = f_v = 800$, $(u_c, v_c) = (320, 240)$. Centered data: 3D points uniform in $[-2,2] \times [-2,2] \times [4,8]$. Uncentered data: $[1,2] \times [1,2] \times [4,8]$. Gaussian noise added to 2D projections, $\sigma \in [0, 15]$ pixels. Outlier fraction up to 25% (Fig. 5e). 300 independent MATLAB simulations per configuration; timing estimated by running code 100 times per example. Error metrics: $E_\mathrm{rot}(\%) = \|\mathbf{q}_\mathrm{true} - \mathbf{q}\| / \|\mathbf{q}\|$ (quaternion), $E_\mathrm{trans}(\%) = \|\mathbf{t}_\mathrm{true} - \mathbf{t}\| / \|\mathbf{t}\|$. Figure 1: boxplot of rotation errors vs. noise, n = 6. Figure 2: computation time vs. number of correspondences. Figure 5a–e: mean and median rotation and translation errors for five experimental configurations. Speedup at n = 6: approximately 10× faster than LHM, approximately 200× faster than AD. Figure 6: EPnP + GN requires approximately a twentieth (1/20) of LHM time for similar accuracy.
- **§5.1.2 (The Planar Case):** Figure 7: errors vs. image noise, n = 10, Tilt ∈ {0°, 30°}. Results follow Schweighofer & Pinz (2006) presentation convention (errors averaged over non-ambiguous solutions only). At Tilt = 30°: AD has very large outlier fraction; EPnP and LHM produce much-reduced outlier counts; SP + LHM recovers correct pose for almost all cases. At n = 10, Tilt = 30°: EPnP approximately 200× faster than AD, approximately 30× faster than LHM.
- **§5.2 (Real Images):** Keypoint recognition method: Lepetit & Fua (2006). RANSAC sample size: 7 correspondences. Approximately 200 correspondences generated per image at run time. Iterative inlier refinement until no additional inliers found. Figure 8: two video sequences (box and building), reprojection overlay.
- **§6 (Conclusion):** Generalisation to essential-matrix estimation (Stewènius et al. 2006); deformable surface shape recovery (Sederberg & Parry 1986; Chang & Rockwood 1994). Explicit "future research" statement.
- **References:** Kipnis & Shamir (1999) — relinearisation from cryptography (CRYPTO'99, Vol. 1666/1999, pp. 19–30). Horn et al. (1988) — absolute orientation via orthonormal matrices. Arun et al. (1987) — least-squares fitting of two 3D point sets. Schweighofer & Pinz (2006) — robust pose estimation from planar target, TPAMI 28(12), 2024–2030. Lu et al. (2000) — LHM, fast and globally convergent pose estimation, TPAMI 22(6), 610–622. Ansar & Daniilidis (2003) — linear pose estimation, TPAMI 25(5), 578–589. Fiore (2001) — efficient linear solution of exterior orientation, TPAMI 23(2), 140–148. Quan & Lan (1999) — linear N-point camera pose determination, TPAMI 21(7), 774–780.
