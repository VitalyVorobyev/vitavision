---
paper_id: daniilidis1999-hand-eye
title: "Hand-Eye Calibration Using Dual Quaternions"
authors: ["K. Daniilidis"]
year: 1999
url: https://doi.org/10.1177/02783649922066213
created: 2026-05-01
relevant_atlas_pages: [daniilidis-dual-quaternion-handeye, tsai-lenz-handeye]
---

# Setting

**Problem class.** Hand-eye calibration: recovering the constant rigid transform $X \in SE(3)$ from a robot gripper frame to a camera rigidly mounted on the gripper. The same equation arises in any eye-on-hand or eye-to-hand configuration where two chains of transforms must be reconciled.

**Constraint form.** From each pair of robot stations $(i, j)$, two observable motions are available: the gripper-to-gripper displacement $A_{ij} \in SE(3)$ from robot kinematics and the camera-to-camera displacement $B_{ij} \in SE(3)$ from camera extrinsics. The unknown $X$ satisfies $A_{ij} X = X B_{ij}$ for every pair. The paper's novelty is to encode this equation entirely in dual quaternion algebra so that rotation and translation are solved simultaneously.

**Inputs.**
- $M \geq 2$ motion pairs $(A_i, B_i)$ with $A_i, B_i \in SE(3)$.
- Each motion must be nontrivial (nonzero rotation angle) and no two screw axes may be parallel across pairs (the generic-position requirement that ensures a 2-dimensional null space).

**Outputs.** The dual quaternion $\hat x = q + \varepsilon q'$ representing $X$, from which $R_X = R(q)$ and $t_X = 2(q' \otimes q^*)_\text{vec}$.

**Guarantees.** The algorithm is globally optimal in the least-squares sense over the 8-dimensional dual-quaternion constraint space subject to the two unit constraints $|q|^2 = 1$ and $q \cdot q' = 0$. There is no iterative refinement or nonlinear optimisation: the solution is closed-form once the SVD of $T$ is computed.

# Core idea

Every rigid motion in $SE(3)$ has a unique representation as a unit dual quaternion $\hat q = q + \varepsilon q'$ where $q$ is a unit quaternion encoding the rotation and $q' = \frac{1}{2} t \otimes q$ encodes the translation. The dual number $\varepsilon$ satisfies $\varepsilon^2 = 0$, so the algebra is a direct sum $\mathbb{H} \oplus \varepsilon \mathbb{H}$ with the product distributing over the dual part. A rigid motion also has a screw representation: a unit axis $n + \varepsilon m$ (line direction and moment), a rotation angle $\theta$, and a pitch $d$ (translation along the axis), encoded as $\hat q = \cos(\hat\theta/2) + \sin(\hat\theta/2)\,\hat\ell$ with $\hat\theta = \theta + \varepsilon d$ and $\hat\ell = n + \varepsilon m$ (§3.2).

The key algebraic fact is **screw congruence** (§4.2): if $AX = XB$, then $A$ and $B$ share the same screw angle $\theta$ and the same pitch $d$; $X$ rotates the hand screw axis into the eye screw axis and offsets its moment. This implies the scalar parts of $\hat a$ and $\hat b$ coincide and cancel. Subtracting $\hat x \hat b$ from $\hat a \hat x$ and isolating the imaginary (vector) parts yields six scalar equations linear in the eight unknowns $(q_0, \mathbf q, q_0', \mathbf q')$ — Eq. 31 of §5:

$$
S_i =
\begin{bmatrix}
\mathbf a_i - \mathbf b_i & [\mathbf a_i + \mathbf b_i]_\times & \mathbf 0 & 0_{3\times 3} \\
\mathbf a'_i - \mathbf b'_i & [\mathbf a'_i + \mathbf b'_i]_\times & \mathbf a_i - \mathbf b_i & [\mathbf a_i + \mathbf b_i]_\times
\end{bmatrix},
\quad S_i \hat x = \mathbf 0.
$$

Stacking $M$ blocks gives $T \in \mathbb{R}^{6M \times 8}$ with $T \hat x = \mathbf 0$. In generic position (non-parallel screw axes across pairs), two motion pairs suffice to reduce the null space of $T$ to two dimensions $\{v_7, v_8\}$ (the right singular vectors at the two zero singular values). The physical solution $\hat x = \lambda_1 v_7 + \lambda_2 v_8$ is pinned by the two unit constraints: $q \cdot q' = 0$ is a quadratic in $s = \lambda_1/\lambda_2$ (§6); $|q|^2 = 1$ fixes the scale. The two roots of the quadratic are resolved by choosing the one that maximises $|q|^2$ — the physically non-degenerate root.

The critical architectural choice is that $R$ and $t$ emerge from the **same SVD**, not from two separate least-squares solves as in Tsai-Lenz 1989. This is the source of both the accuracy advantage and the elegance of the method.

# Assumptions

1. (hard) Each input rotation $A_i, B_i$ is nontrivial: rotation angle $\neq 0$. Pure-translation motions contribute zero information to the rotation block and degenerate $S_i$.
2. (hard) No two motion pairs share a parallel screw axis. Parallel screw axes produce the same constraint twice — $T$ stays rank-deficient even after stacking more pairs. The null space does not collapse to two dimensions.
3. (hard) Exactly two singular values of $T$ are zero (or near-zero) in the generic case. More than two indicates degenerate motion geometry (§6 remark); fewer is numerically impossible.
4. (soft) The quadratic in $s$ has two distinct real roots. A repeated root or complex roots indicate numerical ill-conditioning from nearly-parallel screw axes.
5. (soft) Input motions $A_i$, $B_i$ are exact rigid transforms. Noise in robot kinematics or camera extrinsics enters $T$ as full-rank perturbations and inflates the two smallest singular values; the SVD remains stable but the solution degrades gracefully as the ratio of the seventh to eighth singular value approaches 1.
6. (soft) The input quaternions $(a_0, \mathbf a)$ and $(b_0, \mathbf b)$ have the same sign convention on the scalar part. Because unit dual quaternions double-cover $SE(3)$, a sign flip on one input quaternion leaves $\mathbf a - \mathbf b$ and $\mathbf a + \mathbf b$ inconsistent and corrupts $S_i$. Callers must normalise to $a_0 \geq 0$ (or consistently $b_0 \geq 0$) before assembly.

# Failure regime

- **Parallel screw axes across all pairs.** The null space of $T$ does not collapse to two dimensions; the solution is indeterminate. Geometrically this means: if the robot only rotates about a single fixed axis (e.g. pure planar motion), there is no way to recover the hand-eye translation perpendicular to that axis. This is the dominant practical failure mode — a calibration trajectory on a flat table, for instance.
- **Pure-translation motions.** $S_i = \mathbf 0$ for any pair with $\theta_a = \theta_b = 0$. These frames contribute nothing and can silently leave $T$ rank-deficient. Implementation must filter them before assembly.
- **Sign inconsistency in input quaternions.** If $A_i$ and $B_i$ have quaternion scalar parts of opposite sign (both valid representations of the same rotation), the imaginary-part constraint $\mathbf a_i - \mathbf b_i$ is corrupted. This is a silent numerical error — the SVD will produce a solution with large residual but no exception.
- **Near-degenerate quadratic.** When $a_{quadratic} = u_1 \cdot w_1 \approx 0$ in the quadratic $(u_1 \cdot w_1) s^2 + \ldots$, the discriminant is large and one root diverges. This indicates that $v_7$ is nearly orthogonal to $v_8$ in the $q'$-half — typically a sign of very noisy inputs or near-parallel axes.
- **Noise amplification at small rotation angles.** $S_i$ has a condition number that grows as $1/\sin(\theta/2)$. Very small rotation angles (near-identity motions) make the corresponding rows of $T$ unreliable; excluding pairs with $\theta < 5°$ is standard practice.

# Numerical sensitivity

- **Scale of the $6M \times 8$ matrix.** $T$ is assembled from imaginary-part differences $\mathbf a - \mathbf b$ and cross products. When quaternions are unit-normalised, entries are bounded by 2, so the matrix is well-conditioned by construction — no column normalisation is needed.
- **SVD vs eigendecomposition.** The paper works with the SVD of $T$ rather than the eigendecomposition of $T^\top T$. This is numerically superior: $T^\top T$ squares the condition number. For $M \sim 10$, either is fine; for large $M$ or ill-conditioned problems, SVD is recommended.
- **Two near-zero singular values.** In exact arithmetic, two singular values are zero. In practice they are small but nonzero; the null space is spanned by the two right singular vectors with the smallest singular values. Robustness check: the ratio $\sigma_7 / \sigma_6$ should be small (say $< 0.01$) for a well-conditioned solution. A ratio close to 1 indicates the motion set is nearly degenerate.
- **Root selection.** The quadratic in $s$ uses floating-point inner products $u_k \cdot w_k$ that are reliable in double precision for unit-normalised inputs. The `max_by norm` root selection is numerically stable because the norm being maximised is always positive for a valid solution.
- **Translation recovery.** $t_X = 2(q' \otimes q^*)_\text{vec}$ involves one quaternion product — exact in double precision. No division by small numbers unless $|q|$ is near zero (degenerate input).
- **Double-cover ambiguity.** The SVD may return $\hat x$ or $-\hat x$; both represent the same transform. Downstream: canonicalise to $q_0 \geq 0$ immediately after recovery.

# Applicability

- Use when: the camera mount is rigid and the primary concern is translational accuracy over short camera baselines. The joint estimation avoids the Tsai-Lenz error propagation path where rotation bias feeds directly into the translation residual (§ of the atlas page, Remarks).
- Use when: robot motion planning can provide diverse screw-axis directions (3D trajectories, not planar arcs). The method is robust to outlier pairs as long as the dominant set has non-parallel axes.
- Use when: a minimal-parameter closed-form solution is required (no iterative optimisation, no linearisation of $SO(3)$).
- Don't use when: the robot trajectory is constrained to planar or single-axis motions. Use a method that handles degenerate configurations or augment with additional rotations.
- Don't use when: only one non-trivial motion pair is available. Two are the theoretical minimum; in practice $M \geq 5$ is recommended for noise robustness.
- Compared against:
  - **Tsai-Lenz 1989** (`tsai1989-handeye`): two-stage (rotation then translation). Faster to implement, identical minimum data requirement (2 pairs / 3 stations), but rotation error propagates into translation via the $R_{cg} T_{c_{ij}}$ term. Daniilidis avoids this by co-estimating both in one SVD.
  - **Shiu-Ahmad 1989** (`shiu1989-calibration`): homogeneous transform equation solved by treating sin and cos as independent unknowns — more unknowns per pair, less efficient. Cited as a predecessor; not the primary comparison target of the paper.
  - **Park-Martin 1994** (Lie-algebra formulation): also simultaneous; works on the Lie algebra of $SE(3)$ (screw coordinates). Dual quaternions are argued to be more economical: the representation is 8-dimensional (vs 6+6 for Park-Martin's separate rotation/translation lie algebra), the constraint matrix is assembled from quaternion imaginary parts directly (no matrix logarithm needed), and the norm constraints are simpler to enforce.

# Connections

- Builds on:
  - `shiu1989-calibration` — Shiu-Ahmad 1989: first paper to explicitly formulate hand-eye calibration as $AX = XB$ and solve it for rotation. Daniilidis cites this as the foundational work. The dual-quaternion paper supersedes the Shiu-Ahmad approach by simultaneous estimation.
  - `tsai1989-handeye` — Tsai-Lenz 1989: two-stage modified-Rodrigues approach. The Daniilidis paper explicitly critiques the sequential decoupling and positions dual quaternions as the remedy.
  - Study's dual-number algebra (1891) — the $\varepsilon^2 = 0$ calculus. Not a paper in the index; referenced in §3 of the paper as classical algebra.
- Enables (in the atlas):
  - `daniilidis-dual-quaternion-handeye` — primary source. The atlas page is a faithful transcription of §3–§6.
- Refutes / supersedes:
  - The sequential rotation-then-translation approach of `tsai1989-handeye` in regimes where translational accuracy matters: the error propagation argument (that any bias in $R$ feeds into $T$ through the $R_{cg} T_{c_{ij}}$ coupling term) is the central methodological critique of the paper.

# Atlas update plan

## UPDATE: daniilidis-dual-quaternion-handeye

The page is accurate, complete, and well-grounded on §3–§6. The algorithm box, procedure flowchart, Rust implementation, and Remarks bullets all faithfully reflect the paper. The following bullets identify gaps and improvements:

Section: Goal
- The goal section already states the simultaneous-vs-sequential contrast clearly. No content gap.

Section: Algorithm
- The screw-congruence definition and the hand-eye constraint matrix (Eq. 31) are correct and match the paper exactly.
- Consider adding a one-sentence note that the scalar parts of $\hat a_i$ and $\hat b_i$ are equal (by screw congruence) and therefore cancel from $S_i$ — this explains why the top-left entry of $S_i$ is $\mathbf a_i - \mathbf b_i$ and not a scalar term. Currently implied but not stated.

Section: Remarks
- **Add bullet — sign consistency requirement.** Unit dual quaternions double-cover $SE(3)$: $\hat q$ and $-\hat q$ encode the same rigid motion. Before assembling $S_i$, callers must ensure $a_0 \geq 0$ and $b_0 \geq 0$ (or consistently $a_0$ and $b_0$ have the same sign). A sign inconsistency corrupts $\mathbf a_i - \mathbf b_i$ silently. Currently absent from the page.
- **Add bullet — degenerate motion check.** Recommend checking $\sigma_7 / \sigma_6$ (ratio of smallest to second-smallest singular value of $T$) as a quality metric. A ratio near 1 indicates near-parallel screw axes; flag and request a more diverse motion set. Currently the degeneracy condition is described ("Degenerates when all motions share a common screw axis") but no diagnostic is suggested.
- **Add bullet — minimum rotation angle filtering.** Pairs with rotation angle $\theta < 5°$ (common heuristic) should be excluded because $S_i$ is ill-conditioned for small $\theta$ ($\mathbf a_i - \mathbf b_i$ is near zero when both rotations are nearly identity). This practical guidance is absent.
- **Strengthen Remarks on comparison with Tsai-Lenz.** The existing bullet ("Joint rotation-and-translation solution avoids the error propagation of two-stage decoupled solvers: any bias in the rotation estimate of Tsai-Lenz feeds directly into the translation residual through the $R_X T_{c_{ij}}$ term") is the correct headline. Consider adding that this advantage is most pronounced when the camera baseline between stations is short relative to the target depth — in that regime the translation term $R_{cg} T_{c_{ij}}$ is not negligible, and the Tsai-Lenz rotation error amplifies linearly into translation error.

Section: Comparison with Tsai-Lenz (deferred — blocked on tsai1989-handeye research note)
- Per comparison policy: the `tsai-lenz-handeye` page hosts the `## When to choose Tsai-Lenz over Daniilidis` section because Tsai-Lenz 1989 predates Daniilidis 1999. The `daniilidis-dual-quaternion-handeye` page carries a single Remarks bullet pointing back.
- **This comparison content is blocked** until `docs/research/notes/tsai1989-handeye.md` is written. The notes for both papers must exist before comparison prose can be authored agentically.
- Proposed Remarks bullet for the Daniilidis page (draft, do not apply until tsai1989-handeye is ingested):
  > Compared with Tsai-Lenz: see [When to choose Tsai-Lenz over Daniilidis](/algorithms/tsai-lenz-handeye#when-to-choose-tsai-lenz-over-daniilidis). The Tsai-Lenz page hosts the comparison.

## UPDATE: tsai-lenz-handeye

The page already carries `comparedWith: [daniilidis-dual-quaternion-handeye]` in frontmatter and has the error-propagation Remark in §Remarks ("The decoupled formulation amplifies translation error when the camera baseline between stations is short relative to the target depth; simultaneous rotation-and-translation solvers (Park-Martin on the Lie algebra, Daniilidis dual-quaternion) treat the residual jointly and tend to be more robust under that regime"). This is the correct comparison framing.

Section: Remarks
- **Add a `## When to choose Tsai-Lenz over Daniilidis` subsection** once the tsai1989-handeye research note is written. Draft content (for reference — do not apply until the note exists):
  - Tsai-Lenz is appropriate when implementation simplicity is the priority: two $3M \times 3$ least-squares solves vs one $6M \times 8$ SVD. The SVD is more expensive for large $M$ and harder to implement from scratch.
  - Tsai-Lenz requires three stations ($M \geq 2$ pairs) vs Daniilidis's same minimum, so there is no practical data-requirement difference.
  - Tsai-Lenz's accuracy is adequate when the camera baseline between stations is large relative to the target depth (i.e. large translation motions relative to the target distance), because the $R_{cg} T_{c_{ij}}$ coupling term then dominates less. In that regime the rotation error contribution to translation is small in relative terms.
  - Daniilidis is preferred when translational accuracy matters and the motion set has short baselines.
  - Both methods degenerate on planar or single-axis trajectories; neither is superior under that failure regime.

# Provenance

- Paper metadata and detailed notes: `docs/papers/index.yaml`, entry `daniilidis1999-hand-eye`. The notes field there provides section-level detail for §3–§6.
- Paper available via DOI: https://doi.org/10.1177/02783649922066213 (IJRR 1999, vol. 18 no. 3, pp. 286–298). No `.txt` cache present in `docs/papers/.cache/`; the index.yaml notes and the existing atlas page (which was authored from the paper) are the primary content sources for this research note.
- §3 — Dual quaternion algebra: the $\hat q = q + \varepsilon q'$ representation, the unit constraints $|q|^2 = 1$ and $q \cdot q' = 0$, the screw form with dual angle $\hat\theta = \theta + \varepsilon d$ and dual axis $\hat\ell = n + \varepsilon m$.
- §3.2 — Screw form of a unit dual quaternion: $\hat q = \cos(\hat\theta/2) + \sin(\hat\theta/2)\hat\ell$.
- §4.2 — Screw congruence: $\theta_a = \theta_b$, $d_a = d_b$ for corresponding hand and eye motions satisfying $AX = XB$. The scalar parts of $\hat a$ and $\hat b$ coincide and cancel.
- §5 — The $6 \times 8$ per-pair constraint matrix $S_i$ (Eq. 31). Stacking into $T \in \mathbb{R}^{6M \times 8}$.
- §6 — SVD-based null-space solution. Two-dimensional null space $\{v_7, v_8\}$ in generic position. Quadratic in $s = \lambda_1 / \lambda_2$ from $q \cdot q' = 0$. Root selection by maximising $|q|^2$.
- Atlas page `content/algorithms/daniilidis-dual-quaternion-handeye.md`: independent transcription of §3–§6, used to cross-check the research note's technical content. The page's Rust implementation (`fill_block`, `resolve`) is faithful to Eq. 31 and §6.
- Atlas page `content/algorithms/tsai-lenz-handeye.md`: the Remarks section there correctly frames the error-propagation issue ("The decoupled formulation amplifies translation error when the camera baseline between stations is short relative to the target depth").
