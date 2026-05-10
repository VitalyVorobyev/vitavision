---
paper_id: longuet-higgins1981-eight-point
title: "A computer algorithm for reconstructing a scene from two projections"
authors: ["H. C. Longuet-Higgins"]
year: 1981
url: https://doi.org/10.1038/293133a0
created: 2026-05-10
relevant_atlas_pages: [fundamental-matrix-eight-point, epipolar-geometry]
---

# Setting

**Problem class.** Reconstruct the three-dimensional structure of a scene and the relative orientation of two viewpoints from a pair of perspective projections, given that the spatial relationship between the projections is unknown and assuming the correspondence problem has already been solved.

**Inputs.** Eight or more pairs of corresponding image points $(x_1, x_2)_i \leftrightarrow (x_1', x_2')_i$ in two views, where $x_1 = X_1/X_3$ and $x_2 = X_2/X_3$ are the calibrated image coordinates — i.e. perspective projections of scene points $\mathbf{X} = (X_1, X_2, X_3)$ onto a unit-focal-length image plane (Eq. 1; the paper introduces the dummy coordinate $x_3 = 1$ in Eq. 2 so that the algebra extends to homogeneous form $X_\mu = X_\nu x_\mu / x_\nu$, Eq. 3).

**Output.** The relative pose $(R, \mathbf{T})$ between the two viewpoints — a rigid rotation $R$ and unit-norm translation direction $\mathbf{T}$ (the scale is fixed by the convention $|\mathbf{T}| = 1$, Eq. 6) — and the 3-D coordinates $(X_1, X_2, X_3)$ of every reconstructed scene point (Eq. 31–32). Pose is recovered up to the standard four-fold sign ambiguity, resolved by enforcing positive forward coordinates ("cheirality" — the paper calls it "the condition that the forward coordinates of any point must both be positive").

**Guarantees.** Direct (non-iterative) closed-form solution. Reduces to "the solution of a set of simultaneous linear equations" — the headline contribution. The author's reported regime: with image coordinates accurate to a few seconds of arc, scene point depths can be estimated reliably "out to about 10D with great accuracy, and even as far as 100D" with adequate depth spacing, where $D$ is the inter-viewpoint baseline.

# Core idea

The paper introduces a $3 \times 3$ matrix $Q$ defined in terms of the unknown rotation $R$ and translation $\mathbf{T}$:

$$
Q = R \, S, \qquad S = \begin{pmatrix} 0 & T_3 & -T_2 \\ -T_3 & 0 & T_1 \\ T_2 & -T_1 & 0 \end{pmatrix}, \qquad S_{\lambda \mu} = \varepsilon_{\lambda \mu \sigma} T_\sigma. \tag{Eq. 7–9}
$$

In modern terminology $Q$ is the **essential matrix**; the paper does not use that name (the term postdates this work). The construction yields the bilinear epipolar constraint by direct algebraic manipulation: from $\mathbf{X}' = R(\mathbf{X} - \mathbf{T})$ (Eq. 4) and the antisymmetry of $\varepsilon_{\lambda \mu \sigma}$, one obtains $X'_\lambda Q_{\lambda \mu} X_\mu = 0$ (Eq. 10–11), which on dividing by $X_3 X'_3$ gives

$$
x'_\lambda \, Q_{\lambda \mu} \, x_\mu = 0. \tag{Eq. 12}
$$

Each correspondence supplies one such linear constraint on the nine unknowns $Q_{\lambda \mu}$ (Eq. 13). Eight correspondences therefore determine the ratios of the nine $Q$ entries via a linear system — hence "eight-point algorithm". The scale of $Q$ is fixed by the constraint $\operatorname{tr}(Q^T Q) = 2$ (Eq. 16), derived from $\mathbf{T}^T \mathbf{T} = 1$.

The translation components are then recovered from the normalised $Q^T Q$, whose off-diagonal entries are $-T_\lambda T_\mu$ (Eq. 15) and whose diagonal entries are $1 - T_\lambda^2$ (Eq. 17). The rotation matrix is reconstructed by treating each row of $Q$ as a vector product $\mathbf{Q}_\alpha = \mathbf{T} \times \mathbf{R}_\alpha$ (Eq. 18); introducing $\mathbf{W}_\alpha = \mathbf{Q}_\alpha \times \mathbf{T}$ (Eq. 20) and using $\mathbf{R}_\alpha = \mathbf{R}_\beta \times \mathbf{R}_\gamma$ for proper rotations (Eq. 19), the paper derives the closed form

$$
\mathbf{R}_\alpha = \mathbf{W}_\alpha + \mathbf{W}_\beta \times \mathbf{W}_\gamma. \tag{Eq. 27}
$$

Scene depths follow from a single inner-product ratio (Eq. 31):

$$
X_3 = \frac{(\mathbf{R}_1 - x_1 \mathbf{R}_3) \cdot \mathbf{T}}{(\mathbf{R}_1 - x_1 \mathbf{R}_3) \cdot \mathbf{x}}.
$$

The full procedure is given as a six-step algorithm at the end of the paper: solve the linear system for $Q$; normalise via $\operatorname{tr}(Q^T Q) = 2$; recover $\mathbf{T}$ from $Q^T Q$; build $\mathbf{W}_\alpha$ and recover the rows of $R$; triangulate scene points; check the cheirality of forward coordinates and flip signs of $\mathbf{T}$ or $Q$ as required.

# Assumptions

1. **(hard) Calibrated image coordinates.** The image coordinates $(x_1, x_2)$ in Eq. 1 are perspective projections normalised by the forward coordinate $X_3$ — i.e. canonical (unit-focal-length) coordinates. The algorithm operates on essentially $O(1)$ values, not raw pixel coordinates. The paper assumes the camera is calibrated; it does not address the uncalibrated (raw-pixel) case.
2. **(hard) Solved correspondence problem.** The paper explicitly assumes the correspondence problem has been solved upstream: "I shall assume that the correspondence problem has been solved; the problem of reconstructing the scene then reduces to that of finding the relative orientation of the two viewpoints."
3. **(hard) Eight or more points in non-degenerate configuration.** Eight correspondences are needed for the linear system (Eq. 13). Degenerate configurations explicitly enumerated in the paper: any four points collinear; any seven points coplanar; six points at the vertices of a regular hexagon; eight points at the vertices of a cube. In a degenerate configuration the linear system loses rank and the algorithm fails.
4. **(soft) Adequate baseline relative to scene depth.** The paper states the algorithm "yields the most accurate results when applied to situations in which the distance $D$ between the centres of projection is not too small compared with their distances from the points $P_i$." Small baselines (narrow stereo) degrade accuracy.
5. **(soft) Adequate depth spread.** The 100D depth recovery limit requires "the $P_i$ are adequately spaced in depth". A scene that is approximately fronto-parallel to both cameras supports only the 10D limit.

# Failure regime

- **Raw pixel coordinates.** The paper does not address the case where $(x_1, x_2)$ are pixel coordinates of magnitude 100–1000 instead of the canonical $O(1)$ projective coordinates. The latent conditioning problem in this regime — design-matrix entries spanning eight orders of magnitude, condition number $\sim 10^{11}$–$10^{13}$ — is not discussed because it does not arise within the paper's calibrated, normalised setting. The problem (and its fix) was identified and resolved by Hartley 1997 for the uncalibrated generalisation.
- **Degenerate point configurations.** Explicitly enumerated in the paper: four collinear points, seven coplanar points, six points at hexagon vertices, eight points at cube vertices. The hexagon and cube cases are noted as "quite unexpected" and the paper observes the degeneracies are "unconnected with any ambiguity in the interpretation of the resulting projections" — i.e. they are algebraic artefacts of the linear system, not geometric ambiguities. A small perturbation of any one offending point restores the algorithm.
- **Narrow baseline.** Accuracy degrades when the inter-viewpoint distance $D$ is small compared to scene depth; the paper bounds reliable reconstruction at "about 10D" without depth spread, "as far as 100D" with adequate depth spread.
- **Outliers in correspondences.** Not addressed. The linear least-squares formulation treats every correspondence as exact; a single mismatched pair can corrupt the solution arbitrarily. Robust estimation (RANSAC, LMedS) postdates this work.

# Numerical sensitivity

- **Conditioning, calibrated regime.** Within the paper's setting (canonical projective coordinates of magnitude $\sim 1$), the design matrix entries are all $O(1)$ and the linear system is well-conditioned. The paper does not discuss conditioning explicitly; the issue does not arise.
- **Conditioning, uncalibrated regime.** When the same algorithmic structure is applied directly to raw pixel coordinates (the case Hartley 1997 addresses), the condition number of the design matrix $A^T A$ jumps to $\sim 10^{11}$–$10^{13}$, making the unnormalised solution numerically unusable. The fix — translate to zero centroid, isotropically scale to mean distance $\sqrt{2}$, then run the same DLT — is the contribution of Hartley 1997, not of the present paper.
- **Sign ambiguity resolution.** The four-fold sign ambiguity is resolved by checking forward-coordinate positivity (cheirality) on the reconstructed scene points and flipping signs of $\mathbf{T}$ and / or $Q$ as needed (steps 5–6 of the algorithm). This requires triangulating all $n$ points; for noisy data, the cheirality majority vote across $n$ points is the practical resolution.
- **Trace normalisation.** The constraint $\operatorname{tr}(Q^T Q) = 2$ (Eq. 16) is a consequence of $|\mathbf{T}| = 1$ (Eq. 6); it provides the scale for $Q$ that the linear system alone leaves undetermined. The paper notes "There are evidently three independent relationships between the diagonal and the off-diagonal elements of $Q^T Q$; these supply three independent checks on the results obtained so far" — i.e. the over-determination of $Q^T Q$ from a noisy linear solution is a built-in consistency check.
- **Rank-2 constraint not enforced.** The linear solution does not enforce that $Q$ have the structure $RS$ (which forces two equal singular values for the essential matrix). The paper recovers $\mathbf{T}$ and $R$ separately from $Q$ without rank truncation. Modern essential-matrix estimation typically projects $Q$ onto the closest valid essential matrix in Frobenius norm before recovering pose; the paper's direct $\mathbf{R}_\alpha = \mathbf{W}_\alpha + \mathbf{W}_\beta \times \mathbf{W}_\gamma$ closed form is the period-correct alternative.

# Applicability

- **Use when:** historically, when implementing a calibrated-stereo or structure-from-motion baseline circa 1981–1995. The paper is the foundational reference for the linear formulation.
- **Don't use when:** working with uncalibrated raw pixel data — use the [normalised eight-point algorithm](/atlas/fundamental-matrix-eight-point) (Hartley 1997), which adds the conditioning step needed for arbitrary pixel scales. The two papers describe the same linear-DLT idea applied at different points in the calibration pipeline.
- **Don't use when:** the minimal-correspondence regime (5 points for calibrated cameras, 7 points for uncalibrated) and a polynomial root-finder is acceptable. Modern minimal solvers (Nistér 2004 five-point, Hartley 1995 seven-point) are preferred for RANSAC hypothesis sampling.
- **Compared against:** five-point iterative methods predating it ("the iterative solution of five simultaneous third-order equations"; the paper cites Thompson 1959). The headline advantage was "a direct method which calls for nothing more difficult than the solution of a set of simultaneous linear equations" — i.e. trading a smaller minimal correspondence count for a non-iterative algorithm.

# Connections

- **Builds on:** Thompson 1959 (iterative five-point method for relative orientation), Marr & Poggio 1976 (binocular vision / correspondence problem), Ullman 1979 (interpretation of visual motion). All cited explicitly in the paper.
- **Enables:** the entire downstream linear-algorithm lineage for two-view geometry — Hartley & Sturm 1997 triangulation, the Hartley & Zisserman *Multiple View Geometry* textbook treatment, every uncalibrated structure-from-motion pipeline that uses fundamental-matrix estimation. The 1981 paper's bilinear constraint $x'^T Q x = 0$ is the seed of all subsequent epipolar-constraint formulations.
- **Refutes / supersedes:** the prevailing assumption (pre-1981) that relative orientation required iterative methods. The paper's contribution is to show that one extra correspondence (8 instead of the minimal 5) buys a closed-form linear solution.
- **Superseded for practical use by:** [Hartley 1997 normalised eight-point algorithm](/atlas/fundamental-matrix-eight-point), which (i) generalises from essential to fundamental matrix (calibrated → uncalibrated) and (ii) adds the similarity-normalisation step that makes the linear DLT numerically usable on raw pixel coordinates. Hartley's method recovers everything Longuet-Higgins's method recovers, plus a strictly larger problem class (uncalibrated cameras), at the cost of three extra lines of code (the $T, T'$ normalisation transforms).

# Atlas update plan

## NEW: longuet-higgins-eight-point

Type: algorithm
Quality: historical
Primary source: longuet-higgins1981-eight-point
Relations:
  { type: generalized_by, target: fundamental-matrix-eight-point, confidence: high }

Bullets per public-page section (historical template — Goal + Historical context + References only; no Algorithm / Implementation / Remarks sections per CLAUDE.md → Quality field → historical):

Goal:
  - State the problem: reconstruct the relative pose $(R, \mathbf{T})$ of two viewpoints and the 3-D scene structure from $n \geq 8$ point correspondences in calibrated image coordinates.
  - State the contribution sentence: a direct linear method replacing prior iterative five-point methods.
  - Make explicit the inputs are calibrated (canonical) projective coordinates, not raw pixels.

Historical context (2–4 paragraphs):
  - When and in what landscape the paper appeared: Nature 1981; the prevailing approach to relative orientation was Thompson 1959's iterative five-point method (cited as ref. [1] in the paper).
  - What was new: the introduction of the matrix $Q = RS$ (modern name: essential matrix; the term postdates this work) and the bilinear constraint $x'^T Q x = 0$ — one linear equation per correspondence — letting eight correspondences determine the ratios of $Q$'s nine entries by linear least squares.
  - What the successor improved: Hartley 1997 generalised from essential to fundamental matrix (uncalibrated cameras) and identified that the same linear DLT applied to raw pixel coordinates has a condition number $\sim 10^{11}$–$10^{13}$ — making it "virtually useless" without a similarity-normalisation pre-conditioning step. With normalisation, the linear method matches iterative gold-standard methods at $\sim 20\times$ lower cost. Link to /atlas/fundamental-matrix-eight-point.
  - Why the page is preserved: citation lineage (every modern two-view-geometry derivation traces back to Eq. 12 of the 1981 paper); pedagogical value (the calibrated-essential-matrix derivation in the paper is shorter and more direct than Hartley's uncalibrated-fundamental-matrix treatment); period-correct understanding of the bilinear-constraint construction via $\varepsilon_{\lambda \mu \sigma}$ and the cheirality sign-resolution procedure.

References:
  - Longuet-Higgins 1981 (primary)
  - hartley1997-eight-point (the successor — link to fundamental-matrix-eight-point page)

## UPDATE: fundamental-matrix-eight-point

Section: References / Historical lineage (or References numbered list)

- Add Longuet-Higgins 1981 as the foundational reference for the linear 8-point construction. Currently the page's `sources.notes` field credits "the Longuet-Higgins (1981) linear DLT for the fundamental matrix" but does not list `longuet-higgins1981-eight-point` in `sources.references`. Add it. The build-time validator will then surface the link in the renderer's References section.
- Optionally (one short bullet in Remarks if the page has one): note that Hartley's 1997 contribution is the conditioning fix for arbitrary pixel scales, building on Longuet-Higgins's 1981 linear formulation for calibrated essential-matrix estimation. The historical Atlas page [longuet-higgins-eight-point](/atlas/longuet-higgins-eight-point) carries the lineage.

# Provenance

All citations are to the OCR-extracted cache: `docs/papers/.cache/longuet-higgins1981-eight-point.txt`.

| Citation | Content |
|---|---|
| Title page | Title, author affiliation (Laboratory of Experimental Psychology, University of Sussex), Nature Vol. 293, 10 September 1981, pp. 133–135 |
| ¶1–2 | Motivation: 3-D structure from two perspective projections; correspondence problem assumed solved; relevance to photographic surveying, binocular vision, monocular motion perception |
| ¶3 | Prior art: photogrammetric five-point iterative methods (cites Thompson 1959 ref. [1]); contribution is the eight-point linear closed-form |
| Eq. 1–3 | Image coordinates as perspective projections $x_1 = X_1/X_3$; dummy coordinate $x_3 = 1$; homogeneous form $X_\mu = X_\nu x_\mu/x_\nu$ |
| Eq. 4 | Rigid motion $X'_\lambda = R_{\lambda \mu}(X_\mu - T_\mu)$ |
| Eq. 5–6 | $R^T R = I$, $\det R = 1$; translation scale fixed by $T_1^2 + T_2^2 + T_3^2 = 1$ |
| Eq. 7–9 | Definition of $Q = RS$ (essential matrix); skew-symmetric $S$ with entries $\varepsilon_{\lambda \mu \sigma} T_\sigma$ |
| Eq. 10–12 | Derivation of bilinear constraint $X'_\lambda Q_{\lambda \mu} X_\mu = 0$ via antisymmetry of $\varepsilon$, division by $X_3 X'_3$ to yield $x'_\lambda Q_{\lambda \mu} x_\mu = 0$ |
| Eq. 13 | One linear constraint per correspondence: $(x'_i x_i)_{\lambda \mu} Q_{\lambda \mu} = 0$; eight correspondences determine ratios of nine $Q$ unknowns |
| Eq. 14–17 | $Q^T Q = -T_\lambda T_\mu$ (off-diag) and $1 - T_\lambda^2$ (diag); trace constraint $\operatorname{tr}(Q^T Q) = 2$ for normalisation; three over-determination consistency checks |
| Eq. 18–27 | Rotation recovery: $\mathbf{Q}_\alpha = \mathbf{T} \times \mathbf{R}_\alpha$; introduce $\mathbf{W}_\alpha = \mathbf{Q}_\alpha \times \mathbf{T}$; closed form $\mathbf{R}_\alpha = \mathbf{W}_\alpha + \mathbf{W}_\beta \times \mathbf{W}_\gamma$ |
| Eq. 28–32 | 3-D coordinate recovery: $X_3 = (\mathbf{R}_1 - x_1 \mathbf{R}_3) \cdot \mathbf{T} / (\mathbf{R}_1 - x_1 \mathbf{R}_3) \cdot \mathbf{x}$; primed coordinates from Eq. 4 |
| Sign ambiguity ¶ | Four sign ambiguities resolved by enforcing positive forward coordinates (cheirality) |
| Degenerate configurations ¶ | Four collinear, seven coplanar, six hexagon vertices, eight cube vertices — algorithm fails on these |
| Six-step algorithm summary ¶ | Final enumerated procedure: linear system → trace normalisation → translation recovery → rotation recovery → triangulation → cheirality check |
| Performance ¶ | Reliable depth recovery to "about 10D" without depth spread, "as far as 100D" with adequate spread, where $D$ is the inter-viewpoint baseline |
| References [1]–[4] | Thompson 1959 (Photogrammetric Record); Ogle 1964 (Researches in Binocular Vision); Ullman 1979 (Interpretation of Visual Motion); Marr & Poggio 1976 (Science 194:283) |
