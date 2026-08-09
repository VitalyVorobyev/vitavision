---
paper_id: hartley1997-eight-point
title: "In Defense of the Eight-Point Algorithm"
authors: ["R. I. Hartley"]
year: 1997
url: https://users.cecs.anu.edu.au/~hartley/Papers/fundamental/ICCV-final/fundamental.pdf
created: 2026-05-01
relevant_atlas_pages: [epipolar-geometry, homography, apap-image-stitching]
---

# Setting

**Problem class.** Computing the fundamental matrix $F$ from a set of $n \geq 8$ point correspondences $\mathbf{u}_i \leftrightarrow \mathbf{u}'_i$ across two uncalibrated views. The paper's thesis is narrowly focused: not to propose a new algorithm, but to show that the classical 8-point algorithm of Longuet-Higgins (1981) works reliably in practice once the input data is normalised — and that its reputation for noise sensitivity is an artifact of poor numerical practice, not an inherent flaw.

**Inputs.** $n \geq 8$ pairs of matching pixel-coordinate points in two images, expressed as homogeneous triples $(u, v, 1)^T$. No assumption on camera calibration. The paper validates on 5 real image pairs with varying noise levels (from ~0.1 px accuracy on the calibration jig to ~1 px accuracy on the houses images).

**Outputs.** The rank-2 fundamental matrix $F$ satisfying $\mathbf{u}'^T F \mathbf{u} = 0$ for all inlier correspondences. Quality measure used in the paper: average point-to-epipolar-line distance (in pixels) evaluated on all matched points, not just the subset used to compute $F$.

**Guarantees.** No probabilistic guarantee; the paper reports empirical results. With normalisation, the linear method produces results empirically indistinguishable from the optimal iterative algorithm (minimising sum of squared point displacements subject to the epipolar constraint), while running ~20 times faster.

# Core idea

The 8-point algorithm assembles a design matrix $A$ whose rows encode the bilinear constraint $\mathbf{u}'^T F \mathbf{u} = 0$: each correspondence contributes the row $(u u', u v', u, v u', v v', v, u', v', 1)$. The entries of $A$ span from $O(1)$ to $O(10^8)$ when pixel coordinates have typical magnitude ~100–512. The condition number of $A^T A$ is therefore $\kappa \sim 10^8$ or larger, meaning a unit perturbation in the data can move the solution by $10^8$ units — the method is effectively unusable.

Hartley's fix is a similarity normalisation applied to each image independently before constructing $A$:

1. Translate so that the centroid of the point set lies at the origin.
2. Isotropically scale so that the average distance from the origin is $\sqrt{2}$.

Let $T$ and $T'$ be the resulting $3 \times 3$ similarity matrices. The normalised fundamental matrix $\hat{F}$ is computed from the transformed correspondences $\hat{\mathbf{u}}_i = T \mathbf{u}_i$, $\hat{\mathbf{u}}'_i = T' \mathbf{u}'_i$. After computing $\hat{F}$, the original-coordinate fundamental matrix is recovered by the denormalisation $F = T'^T \hat{F} T$.

After normalisation, a typical point is of the form $(1, 1, 1)^T$ — the design-matrix entries are $O(1)$ throughout, and $\kappa$ drops by approximately $10^8$ (Graph 1 of the paper). The rank-2 constraint is enforced by SVD: if $F = U \mathrm{diag}(r, s, t) V^T$, the closest rank-2 matrix in Frobenius norm is $F' = U \mathrm{diag}(r, s, 0) V^T$ (Tsai and Huang 1984).

The secondary insight (§5) is that without normalisation, the smallest singular-value direction of $A^T A$ is dominated by the $(u', v')$ entries of the design matrix, which correspond to the top-left $2 \times 2$ block of $F$ — and these are exactly the entries most perturbed when the rank-2 SVD-truncation is applied to an unnormalised $F$. Normalisation makes all entries of $F$ comparable in magnitude, so the rank-2 projection perturbs all of them equally.

# Assumptions

1. (hard) $n \geq 8$ point correspondences are available. With exactly 8 points, the system is determined; with more, a linear least-squares solution is found. The paper uses 8–75 points per trial.
2. (hard) The correspondences are not all from a planar scene (degenerate configuration). When all scene points are coplanar, the constraint $\mathbf{u}'^T F \mathbf{u} = 0$ is satisfied by infinitely many matrices; the rank-2 solution is unreliable. Hartley notes this explicitly as an exceptional configuration where $A$ has rank < 8 ([9] in the paper, Maybank 1990).
3. (soft) Correspondences are approximately correct (outliers removed). The paper states that "matched points were found by automatic means, and usually some sort of outlier detection and removal was carried out, based on least-median squares techniques" before running the 8-point algorithm. The linear method is not robust to gross outliers.
4. (soft) Both views observe a scene with sufficient depth variation to avoid the degenerate planar case. The calibration-jig images come close to a degenerate configuration (all points on a structured 3-D object of limited depth) and still work.
5. (soft) The two equal-singular-value condition of the essential matrix (for calibrated cameras) is not imposed here. The fundamental matrix has 7 degrees of freedom; the rank-2 constraint enforced by SVD truncation is the only algebraic constraint applied.

# Failure regime

- **Unnormalised inputs.** The paper's central empirical finding is that the unnormalised 8-point algorithm produces errors as large as 10 pixels on the houses images (Graph 2), making it "virtually useless." Normalisation reduces these errors by an order of magnitude or more.
- **Planar scenes.** When all scene points are coplanar, $A$ does not have rank 8; the unique least-eigenvector solution does not exist. The paper does not characterise this failure regime but cites Maybank 1990. In practice, structure-from-motion pipelines apply a homography-vs-$F$ inlier test to detect the degenerate case.
- **Very few correspondences (exactly 8).** The paper notes that with exactly 8 points, the optimal algorithm (minimising point displacement) performed well at ~1.2 px error, whereas the normalised 8-point and epipolar-distance algorithms were "off the graph." The normalised 8-point is a linear least-squares method and does not handle the minimal (8-point) case as reliably as minimum-cost methods. From ~10 points onward, it is competitive.
- **RANSAC incompatibility without adaptation.** The linear method is not a minimal solver — it requires $n \geq 8$ rather than the minimal 7 points sufficient for a unique $F$ (since $F$ has 7 degrees of freedom). Within RANSAC, the 7-point solver (solving a cubic polynomial) is the standard minimal solver. The normalised 8-point is used as a non-minimal solver in RANSAC when a larger consensus set is available.
- **Epipole inside the image.** Hartley's method does not explicitly address this. The denormalisation $F = T'^T \hat{F} T$ is algebraically exact regardless of epipole placement; however, the point-to-epipolar-line distance is well-behaved only when the epipole is far from the matched points.

# Numerical sensitivity

- **Condition number improvement.** Graph 1 shows that normalisation reduces the base-10 log of $\kappa(A^T A)$ from ~11–13 to ~3–5 for the houses images. This is the dominant numerical phenomenon.
- **Isotropic vs. anisotropic scaling.** §6.2 tests a non-isotropic normalisation (zero centroid, unit principal moments — an affine transformation). The paper concludes the results "were little different from those obtained using the isotropic scaling method." Isotropic scaling is recommended for its simplicity and equivalently good conditioning.
- **Scale of $\sqrt{2}$.** The choice of $\sqrt{2}$ as the target RMS distance from the origin ensures a "typical" normalised point is $(1, 1, 1)^T$ in homogeneous coordinates — all entries $O(1)$, balanced design matrix.
- **Frobenius-norm rank-2 projection.** The SVD-based rank-2 enforcement is optimal in Frobenius norm (proven by Tsai and Huang 1984). However, it is not optimal in the geometric (Sampson or point-displacement) error. After the linear solution, iterative refinement using a geometric cost function is preferred for highest accuracy — but even without it, the normalised linear solution is close to the iterative optimum (Graph 3, Graph 4).
- **32-bit vs. 64-bit.** Not discussed in the paper. Given that normalisation reduces the condition number by $\sim 10^8$, 32-bit floating point (which has $\sim 7$ significant digits) is marginal; 64-bit double precision is appropriate for the SVD step.
- **Scale invariance after normalisation.** Because normalisation is applied separately to each image, the resulting $\hat{F}$ is invariant to the absolute scale of the two point clouds. This is a desirable property: the design matrix becomes scale-independent, removing one source of conditioning problems.

# Applicability

- Use when: a closed-form (non-iterative), numerically stable estimate of the fundamental matrix is needed from $n \geq 10$ pre-verified (outlier-free or low-outlier) correspondences. The normalised 8-point is the standard linear initialisation before geometric refinement.
- Use when: a fast initialisation for iterative refinement is needed — the normalised 8-point runs ~20× faster than an optimal iterative solver (§8) and provides a good starting point for Levenberg-Marquardt or bundle adjustment.
- Use when: implementing the homography DLT (the paper's conditioning argument is identical; Hartley's `notes` field in `docs/papers/index.yaml` explicitly records this application — "the resulting similarities T, T' condition the design matrix A to a moderate condition number; the recovered homography is then de-normalised as $H = T'^{-1} \hat{H} T$").
- Don't use when: robustness to outliers is required without pre-filtering. Use RANSAC with a 7-point minimal solver first; the normalised 8-point can serve as the non-minimal refinement step on the inlier set.
- Don't use when: exactly 8 correspondences are available and accuracy is critical. The 7-point solver with polynomial root-finding or the 5-point solver (for calibrated cameras, Nistér 2004) is more reliable at the minimum.
- Don't use when: all scene points are coplanar — use a homography instead.
- Compared against:
  - **Unnormalised 8-point algorithm (Longuet-Higgins 1981):** the paper's baseline. Same implementation, no pre-conditioning. Errors 5–10× larger in experiments. The paper's central claim is that this comparison shows normalisation, not the iterative framework, is the key to accuracy.
  - **Epipolar-distance minimisation (Luong, Faugeras; INRIA RR-1894):** iterative, 7-parameter parameterisation (rank constraint built in), minimises sum of squared point-to-epipolar-line distances. Performs slightly worse than the normalised 8-point in Graph 3 on the calibration-jig images; approximately equivalent on others. More complex to implement.
  - **Optimal algorithm (Hartley's own; minimising point displacement):** iterative. Finds $F$ and corrected point positions $\hat{\mathbf{u}}_i, \hat{\mathbf{u}}'_i$ such that $\hat{\mathbf{u}}'_i{}^T F \hat{\mathbf{u}}_i = 0$ exactly and the sum of squared pixel displacements is minimised. Under Gaussian noise this is the maximum-likelihood estimator. Empirically the best among all tested methods; the normalised 8-point is "almost indistinguishable" from it at $N \geq 10$ (Graph 3, Graph 4).
  - **Zisserman-Beardsley normalisation (ECCV 1994):** a different normalisation scheme that also conditions the matrix. Also tested and "found to perform almost as well as our normalised 8-point algorithm" (§8). Not described in detail due to space constraints.

# Connections

- Builds on:
  - **Longuet-Higgins 1981** — the 8-point algorithm for the essential matrix in calibrated cameras. Hartley extends the same linear framework to uncalibrated cameras (fundamental matrix) and identifies the conditioning problem.
  - **Tsai-Huang 1984** — the SVD-based rank-2 enforcement. The paper attributes the closest-singular-matrix result to Tsai and Huang, though it states the result without proof.
  - **Golub-Van Loan, Matrix Computations** — the condition-number analysis (§4) uses the Interlacing Property for eigenvalues; reference [4] in the paper.
- Enables:
  - **Homography DLT normalisation** — the identical conditioning argument applies; `apap-image-stitching` and `homography` both cite the paper as the source of the normalisation trick.
  - **Structure from motion initialisation** — the normalised 8-point is the standard first step in many SfM pipelines (initialise $F$, decompose to $E$ if calibrated, triangulate, run bundle adjustment).
  - **RANSAC with non-minimal refinement** — the normalised 8-point is the natural choice for the estimation step on the consensus set within RANSAC, after a minimal solver (7-point or 5-point) has been used to sample hypotheses.
- Refutes / supersedes:
  - The claim (prevailing in 1997) that the 8-point algorithm is "virtually useless" due to noise sensitivity. The paper establishes that the noise sensitivity is numerical, not algorithmic, and is corrected by a two-line normalisation step.

# Atlas update plan

## UPDATE: epipolar-geometry

The `epipolar-geometry` concept page already contains the best prose description of the normalised 8-point algorithm and Hartley normalisation in the atlas — see §Mathematical Description / Estimation and §Numerical Concerns. The paper is cited in the References section (item 3) but **not** in the frontmatter `sources:` field.

Section: frontmatter
- Add `hartley1997-eight-point` to `sources.references` in the frontmatter (it is already cited inline in the References section; the frontmatter entry enables build-time validation and graph edges).

Section: Numerical Concerns / Hartley normalisation
- The existing bullet "Without normalization the design matrix $A$ for the 8-point algorithm has a large condition number (proportional to the image coordinate range squared), producing solutions that are sensitive to noise. Normalization is not optional for the fundamental matrix; it is required for the algorithm to work reliably." is correct and complete. One precision to add: the condition number improves by approximately $10^8$ with normalisation (Graph 1 of the paper). This quantifies the claim and gives readers an intuition for why the unnormalised algorithm fails so dramatically.
- The page does not explain *why* the smallest singular values of the unnormalised $F$ are the most important entries (they correspond to the entries multiplied by the largest point coordinates when computing epipolar lines), nor that this is precisely the entries most corrupted by the rank-2 truncation without normalisation. This is the paper's §5 insight — "the most important entries in the fundamental matrix are precisely those that are subject to the largest relative perturbation when enforcing the singularity constraint without prior normalization." Worth a sentence if the page is expanded.

Section: Numerical Concerns / rank-2 enforcement
- The page states "This projection is optimal in the Frobenius norm but not in the geometric (Sampson) error." This is correct. No action needed.

Section: Estimation
- The "Normalised 8-point algorithm" paragraph is already accurate. No substantive gaps.

## NEW: fundamental-matrix-eight-point

Type: algorithm
Category: geometry
Primary source: hartley1997-eight-point

A standalone algorithm page for the normalised 8-point algorithm is a strong candidate:
- The algorithm is a classical primitive used directly in structure-from-motion, stereo initialisation, and RANSAC refinement.
- It has a clear algorithmic boundary (normalise → DLT → rank-2 enforce → denormalise), distinguishable from the surrounding concept of epipolar geometry.
- The `epipolar-geometry` concept page already covers the algorithm in §Estimation, which suggests the topic warrants its own algorithm page rather than deeper embedding in the concept page.
- No current algorithm page in `content/algorithms/` covers fundamental-matrix estimation.

**Proposed frontmatter fields:**

```yaml
title: "Normalised Eight-Point Algorithm"
date: 2026-05-01
summary: "Computes the fundamental matrix from n ≥ 8 point correspondences by conditioning the linear system with a similarity normalisation, recovering accuracy comparable to iterative methods at a fraction of the cost."
tags: ["geometry", "stereo", "two-view-geometry", "fundamental-matrix"]
category: geometry
difficulty: intermediate
prerequisites: [epipolar-geometry, homography]
relations: []
sources:
  primary: hartley1997-eight-point
  references: []
```

**Algorithm section bullets** (for `algo-page` to expand):

Goal:
- Estimate the $3 \times 3$ rank-2 fundamental matrix $F$ satisfying $\mathbf{u}'^T F \mathbf{u} = 0$ for all inlier correspondences $\mathbf{u}_i \leftrightarrow \mathbf{u}'_i$.
- The linear formulation (DLT) is ill-conditioned without normalisation; the paper's contribution is the normalisation step that reduces $\kappa(A^T A)$ by ~$10^8$ and makes the linear solution match iterative methods.

Algorithm:
- Normalisation: compute similarity $T$ mapping $\{\mathbf{u}_i\}$ to zero centroid and $\sqrt{2}$ average distance; compute $T'$ analogously for $\{\mathbf{u}'_i\}$. Apply: $\hat{\mathbf{u}}_i = T \mathbf{u}_i$, $\hat{\mathbf{u}}'_i = T' \mathbf{u}'_i$.
- Linear solution: assemble $A$ (one row per correspondence: $(\hat{u}\hat{u}', \hat{u}\hat{v}', \hat{u}, \hat{v}\hat{u}', \hat{v}\hat{v}', \hat{v}, \hat{u}', \hat{v}', 1)$); $\hat{\mathbf{f}}$ = smallest right singular vector of $A$; reshape to $3 \times 3$ matrix $\hat{F}$.
- Rank-2 enforcement: $\hat{F} = U \mathrm{diag}(r, s, t) V^T \Rightarrow \hat{F}' = U \mathrm{diag}(r, s, 0) V^T$.
- Denormalisation: $F = T'^T \hat{F}' T$.

Implementation:
- The normalisation transform $T$ is a $3 \times 3$ matrix: `T = diag(s, s, 1) @ [[1,0,-cx],[0,1,-cy],[0,0,1]]` where $(c_x, c_y)$ is the centroid and $s = \sqrt{2} / \text{mean\_dist}$.
- SVD is applied twice: once to $A$ (or to $A^T A$ via eigendecomposition) for the linear solution, and once to the $3 \times 3$ $\hat{F}$ for rank-2 enforcement.
- The same normalisation is applied to homography DLT (see `homography`); factor into a shared utility.

Remarks:
- Isotropic scaling (same scale factor for $x$ and $y$) performs as well as non-isotropic scaling (affine to unit principal moments) in the paper's experiments. Use isotropic for simplicity.
- The algorithm does not enforce the rank-2 constraint during the linear solution (unlike the 7-point solver or 5-point solver). The post-hoc SVD truncation is optimal in Frobenius norm but not in the geometric error. For calibration-grade accuracy, follow with iterative geometric refinement (minimise Sampson or gold-standard error).
- The normalised 8-point is not a minimal solver ($n = 8$ is the minimum, but the 7-point solver with polynomial root-finding is more efficient in RANSAC hypothesis generation). Use the 8-point on the RANSAC inlier set, not as the per-hypothesis minimal solver.
- Epipole degeneracy (all correspondences consistent with a homography) is not detected by the linear method. Use a homography-vs-$F$ test before committing to the fundamental-matrix model.

## UPDATE: homography

Section: Numerical Concerns (or Algorithm / Implementation)
- The `homography` page lists `hartley1997-eight-point` in `sources.references`. Verify that the normalisation step in the homography DLT section explicitly credits the same conditioning argument: translate centroid to origin, scale to $\sqrt{2}$ average distance, denormalise $H = T'^{-1} \hat{H} T$. If the connection is already clear, no action needed. If the conditioning argument is present but not attributed to Hartley 1997, add the attribution.

## UPDATE: apap-image-stitching

The `apap-image-stitching` page lists `hartley1997-eight-point` in `sources.references`. The `docs/papers/index.yaml` `notes` field explicitly records the role: "the resulting similarities T, T' condition the design matrix A to a moderate condition number; the recovered homography is then de-normalised as $H = T'^{-1} \hat{H} T$. APAP (§4.3) reuses this pre-conditioning before the Moving-DLT weights are applied so every per-cell SVD operates on a numerically well-scaled A." No content gap; this note confirms the reference is correctly attributed.

# Provenance

All citations are to the `.txt` cache: `docs/papers/.cache/hartley1997-eight-point.txt`.

- §1 (pp. 1–2): "The prevailing view is, however, that it is extremely susceptible to noise and hence virtually useless for most purposes." — retained verbatim because this is the motivating claim the paper refutes.
- §1: "a simple transformation (translation and scaling) of the coordinates of the matched points, leads to an enormous improvement in the condition of the problem" — the central thesis.
- §2 / Linear solution: design-matrix row construction for $F$ — $(uu', uv', u, vu', vv', v, u', v', 1)$; eq (2) $Af = 0$.
- §2 / Constraint enforcement: SVD truncation $F' = U \mathrm{diag}(r, s, 0) V^T$; attributed to Tsai-Huang [11].
- §4 / Condition number: "the condition number of the matrix $A^TA$" analysis using the Interlacing Property; $\kappa \geq 10^8 / (10^4 + 1)$ for a 200×200 image.
- §5: "The most important entries in the fundamental matrix are precisely those that are subject to the largest relative perturbation when enforcing the singularity constraint without prior normalization." — retained as a short quote because the double superlative captures the key structural insight.
- §6.1 / Isotropic scaling: translate to centroid, scale to $\sqrt{2}$ average distance; "Rather than choose different scale factors for each direction, an isotropic scaling factor is chosen."
- §6.2 / Non-isotropic: "results obtained using this type of transformation to the data were little different from those obtained using the isotropic scaling method."
- §7 / Graph 1: condition number improvement ~$10^8$ (base-10 log drops from ~11–13 to ~3–5).
- §7.1 / Optimal algorithm: "an iterative algorithm. It finds the fundamental matrix F, and points $\hat{u}_i$ and $\hat{u}'_i$ such that $\hat{u}'_i{}^T F \hat{u}_i = 0$ exactly... the squared pixel error $\sum_i d(\hat{u}_i, u_i)^2 + d(\hat{u}'_i, u'_i)^2$ is minimised." — the gold-standard comparator.
- §7.3 / Graph 3: "the normalised 8-point and optimal algorithms perform best"; with exactly 8 points "only the optimal algorithm performed well with 8 points (1.2 pixels error)."
- §7.3 / Graph 4: reconstruction error — "the results of the normalised 8-point algorithm is almost indistinguishable from the optimal algorithm."
- §8 (Conclusions): "With normalization... the 8-point algorithm performs almost as well as the best iterative algorithms. On the other hand, it runs about 20 times faster and is far easier to code... Without normalization of the inputs, however, the 8-point algorithm performs quite badly, often with errors as large as 10 pixels."
