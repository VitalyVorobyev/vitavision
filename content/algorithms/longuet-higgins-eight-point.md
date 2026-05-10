---
title: "Longuet-Higgins Linear Eight-Point Algorithm"
date: 2026-05-10
summary: "1981 closed-form linear method for relative orientation of two viewpoints from eight calibrated point correspondences, introducing the bilinear epipolar constraint x'^T Q x = 0 and the matrix Q = R·skew(T) later known as the essential matrix. Superseded for practical use by Hartley's 1997 normalised eight-point algorithm."
tags: ["geometry", "two-view-geometry", "essential-matrix"]
domain: geometry
tasks: [fundamental-matrix-estimation]
author: "Vitaly Vorobyev"
difficulty: advanced
quality: historical
relations:
  - type: generalized_by
    target: fundamental-matrix-eight-point
    confidence: high
prerequisites: [epipolar-geometry]
failureModes: []
sources:
  primary: longuet-higgins1981-eight-point
  references:
    - hartley1997-eight-point
  notes: |
    Linear 8-point method for the essential matrix Q = R·S, where S is the
    skew-symmetric matrix of the unit-norm translation T. Eq. 12 of the paper
    gives the bilinear constraint x'^T Q x = 0; Eq. 13 supplies one linear
    equation per correspondence; eight correspondences determine the ratios
    of Q's nine entries. Translation magnitude is fixed by tr(Q^T Q) = 2
    (Eq. 16). Rotation is recovered from W_α = Q_α × T via R_α = W_α + W_β × W_γ
    (Eq. 27). Six-step algorithm given at the end of the paper. Inputs are
    calibrated projective coordinates x = X_1/X_3 (Eq. 1), so the conditioning
    problem that Hartley 1997 addresses for raw pixel coordinates does not
    arise within the original setting.
---

# Goal

Given $n \geq 8$ point correspondences $(x_1, x_2)_i \leftrightarrow (x_1', x_2')_i$ in two perspective projections of the same scene — expressed in calibrated image coordinates, $x_1 = X_1/X_3$ — recover the relative orientation $(R, \mathbf{T})$ between the two viewpoints up to translation scale, and reconstruct the three-dimensional coordinates of every observed scene point. The defining property is a direct closed-form linear method: the nine ratios of an auxiliary matrix $Q = R \cdot \mathrm{skew}(\mathbf{T})$ satisfy a single bilinear constraint $x'^T Q x = 0$ per correspondence, so eight correspondences determine $Q$ by linear least squares, after which $\mathbf{T}$, $R$, and the scene depths follow algebraically.

# Historical context

In 1981 the dominant alternative for relative orientation was Thompson's 1959 five-point method, which required iterating the solution of five simultaneous third-order equations. Photogrammetric practice was built on that iterative pipeline. The cost of each calibration was substantial enough that relative-orientation problems were rarely solved on-line, and the iterative method's sensitivity to the initial guess limited automation.

The contribution was the construction of the matrix $Q = R \cdot \mathrm{skew}(\mathbf{T})$ — what would later be called the essential matrix — and the observation that the algebraic identity $X_\lambda' \varepsilon_{\lambda \mu \sigma} T_\sigma X_\mu = 0$ collapses, on dividing by $X_3 X_3'$, to a bilinear constraint $x_\lambda' Q_{\lambda \mu} x_\mu = 0$ between calibrated image coordinates. Each correspondence supplies one linear equation in $Q$'s nine unknowns; eight correspondences determine the ratios of those entries by a single linear solve. The translation vector is then recovered from the off-diagonal entries of the normalised $Q^T Q$ (using $\mathrm{tr}(Q^T Q) = 2$ to fix scale via $|\mathbf{T}| = 1$), and the rotation matrix is recovered in closed form by treating each row of $Q$ as the vector product $\mathbf{Q}_\alpha = \mathbf{T} \times \mathbf{R}_\alpha$ and exploiting the orthogonality of the auxiliary vectors $\mathbf{W}_\alpha = \mathbf{Q}_\alpha \times \mathbf{T}$. The full procedure is the six-step algorithm at the end of the paper, ending with a cheirality test on the reconstructed forward coordinates that resolves the four-fold sign ambiguity. The paper enumerates the explicit degenerate configurations under which the linear system loses rank — four collinear points, seven coplanar points, six points at hexagon vertices, eight points at cube vertices.

The structural limitation was that the inputs are calibrated, $O(1)$ projective coordinates. Applied directly to raw pixel coordinates of magnitude 100–1000, the same linear DLT has a condition number of $10^{11}$–$10^{13}$, and the unnormalised solution becomes numerically unusable. [Hartley's 1997 normalised eight-point algorithm](/atlas/fundamental-matrix-eight-point) addressed both issues: it generalised the linear-DLT formulation from the essential matrix (calibrated cameras) to the fundamental matrix (uncalibrated cameras), and it added the now-standard similarity-normalisation pre-conditioning step — translate each point set to zero centroid, isotropically scale to mean distance $\sqrt{2}$, run the same DLT, then denormalise — which drops the condition number by roughly eight orders of magnitude and brings the linear method to within experimental indistinguishability of iterative gold-standard estimators.

The page is preserved as the citation root for the bilinear epipolar constraint and the linear-eight-point construction. Every modern derivation of two-view geometry traces $x'^T E x = 0$ (essential) or $x'^T F x = 0$ (fundamental) back to Eq. 12 of this paper. The original calibrated-essential-matrix derivation is also more direct than Hartley's uncalibrated treatment for readers who already have a calibration, and the cheirality sign-resolution procedure described in the closing paragraphs is unchanged in current practice.

# References

1. H. C. Longuet-Higgins. *A computer algorithm for reconstructing a scene from two projections.* Nature 293(5828):133–135, 10 September 1981. [doi.org/10.1038/293133a0](https://doi.org/10.1038/293133a0)
2. R. I. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE Transactions on Pattern Analysis and Machine Intelligence 19(6):580–593, 1997. The successor: generalises from essential to fundamental matrix and adds the conditioning step that makes the linear DLT usable on raw pixel coordinates. [pdf](https://users.cecs.anu.edu.au/~hartley/Papers/fundamental/ICCV-final/fundamental.pdf)
3. E. H. Thompson. *A rational algebraic formulation of the problem of relative orientation.* Photogrammetric Record 3(14):152–159, 1959. The iterative five-point predecessor that Longuet-Higgins's linear method displaced for routine use.
