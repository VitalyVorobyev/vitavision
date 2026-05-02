---
paper_id: tsai1989-handeye
title: "A New Technique for Fully Autonomous and Efficient 3D Robotics Hand/Eye Calibration"
authors: ["R. Y. Tsai", "R. K. Lenz"]
year: 1989
url: https://kmlee.gatech.edu/me6406/handeye.pdf
created: 2026-05-01
relevant_atlas_pages: [tsai-lenz-handeye, daniilidis-dual-quaternion-handeye]
---

# Setting

**Problem class.** Eye-on-hand calibration: recovering the constant rigid transform $H_{cg} \in SE(3)$ from the camera frame $C$ to the gripper frame $G$ of a robot manipulator. The camera is rigidly mounted on the gripper; as the robot moves from station to station, the camera observes a fixed calibration object. The relative gripper-to-camera geometry is constant across stations and must be estimated.

**Inputs.**
- $N \geq 3$ station poses: gripper-to-base transforms $H_{g_i}$ (from robot joint encoders) and target-to-camera transforms $H_{c_i}$ (from extrinsic camera calibration of the image grabbed at station $i$).
- The calibration object geometry must be known precisely, since $H_{c_i}$ comes from Tsai's own camera calibration procedure (§II.B1 references [6], [10], [11], [13]).

**Outputs.** The $4 \times 4$ homogeneous transform $H_{cg} = \begin{bmatrix} R_{cg} & T_{cg} \\ 0 & 1 \end{bmatrix}$, where $R_{cg} \in SO(3)$ and $T_{cg} \in \mathbb{R}^3$.

**Computational cost.** Approximately $100 + 60N$ scalar arithmetic operations after station extrinsic calibrations are done (§II.C). For $N = 10$ stations on a minicomputer (1989 vintage): ~0.5 ms.

**Historical context.** The paper is the second of a "calibration trio": camera calibration (Tsai 1987, `tsai1987-versatile`), robot hand/eye calibration (this paper), and robot hand calibration. The three share a common setup, calibration object, and coordinate conventions.

# Core idea

Each pair of stations $(i, j)$ yields two observable motions: gripper-to-gripper displacement $H_{g_{ij}} = H_{g_j}^{-1} H_{g_i}$ from robot kinematics and camera-to-camera displacement $H_{c_{ij}} = H_{c_j} H_{c_i}^{-1}$ from camera extrinsics. The loop $G_i \to C_i \to C_j \to G_j$ closes to give the underlying equation

$$
H_{g_{ij}} H_{cg} = H_{cg} H_{c_{ij}}, \qquad (\text{Lemma I, Eq. 16})
$$

which separates into a rotation constraint and a translation constraint.

Rotations are parametrised by the **modified Rodrigues vector** $P_r = 2 \sin(\theta/2)\,n$, where $n$ is the unit rotation axis and $\theta \in [0, \pi]$ is the rotation angle (Eq. 9). The rotation matrix is recovered without trigonometric calls via

$$
R = \Bigl(1 - \tfrac{|P_r|^2}{2}\Bigr) I + \tfrac{1}{2}\Bigl(P_r P_r^T + \alpha\, \mathrm{Skew}(P_r)\Bigr), \qquad \alpha = \sqrt{4 - |P_r|^2} \quad (\text{Eq. 10}).
$$

The key geometric insight (Lemmas III–VI) is that $P_{cg}$ — the Rodrigues axis of the unknown rotation — is perpendicular to $P_{g_{ij}} - P_{c_{ij}}$ for every station pair (Lemma III). From Lemmas IV and V, this yields a skew-linear constraint on an unscaled proxy axis $P_{cg}'$ (parallel to $P_{cg}$, proportional to $\tan(\theta_{cg}/2)\,n_{cg}$):

$$
[\,P_{g_{ij}} + P_{c_{ij}}\,]_\times \; P_{cg}' \;=\; P_{c_{ij}} - P_{g_{ij}} \qquad (\text{Eq. 12, Lemma VI}).
$$

Because $\mathrm{Skew}(P_{g_{ij}} + P_{c_{ij}})$ is always rank-2 (Lemma VII), at least two station pairs (three stations) are needed. Stacking pairs into a $3M \times 3$ system and solving by linear least squares yields $P_{cg}'$; then

$$
P_{cg} = \frac{2\,P_{cg}'}{\sqrt{1 + |P_{cg}'|^2}}, \qquad \theta_{cg} = 2 \arctan |P_{cg}'| \quad (\text{Eqs. 13–14}).
$$

Once $R_{cg}$ is known, translation is resolved by a second linear system per station pair (Lemma VIII):

$$
\bigl(R_{g_{ij}} - I\bigr) T_{cg} \;=\; R_{cg} T_{c_{ij}} - T_{g_{ij}} \qquad (\text{Eq. 15}).
$$

Again $R_{g_{ij}} - I$ is rank-2 (Lemma IX), so two pairs suffice. The system is stacked and solved by linear least squares.

# Assumptions

1. (hard) $N \geq 3$ stations (i.e., $M \geq 2$ station pairs). Fewer than three stations cannot yield a unique solution: $\mathrm{Skew}(P+P)$ and $R - I$ are each rank-2, contributing only two independent equations per pair.
2. (hard) **Non-parallel (non-collinear) interstation rotation axes across pairs.** The rotation coefficient matrix has full column rank only when $P_{g_{i_1 j_1}}$ and $P_{g_{i_2 j_2}}$ point in different directions (Lemma X). Similarly for translation (Lemma XI). Parallel axes make the stacked system rank-deficient, and the solution is non-unique. This is the primary degeneracy condition (§II.D, Conditions of Uniqueness).
3. (hard) Nontrivial interstation rotations ($\theta_{g_{ij}} > 0$). Pure-translation motions contribute no information to the rotation system and near-zero contributions to the translation system.
4. (soft) Accurate extrinsic calibration at each station. The error in $R_{cg}$ propagates from $\sigma_{R_{c_{ij}}}$ and $\sigma_{R_{g_{ij}}}$ (Eq. 28); the error in $T_{cg}$ has an additional $|T_{c_i}|$-scaling term (Eq. 31) that dominates when the camera-to-target distance is large.
5. (soft) Accurate robot kinematics. The translation error has a contribution from $\sigma_{T_{g_{ij}}}$ (robot positional repeatability). Poor kinematics inflate the translation residual; the rotation residual is less sensitive to translational kinematics errors.
6. (hard) Rodrigues parametrisation: $\theta \in [0, \pi)$. At $\theta = \pi$ the normal Rodrigues recovery formula degenerates (the denominator in $P_{cg}$ recovery is handled by a special branch). The paper provides an explicit exception: if $P_{g_{i_1 j_1}} + P_{c_{i_1 j_1}}$ is collinear across pairs while $P_{g_{ij}}$ varies, then $\theta_{cg} = \pi$ and the axis is parallel to the collinear sum (§II.B3).
7. (soft) Calibration is performed on a flat calibration block. The paper uses a planar array of 36 circular discs at 5000 µm spacing (§IV.B1). Non-planar or less accurate calibration objects inflate $\sigma_{R_{c_i}}$ and $\sigma_{T_{c_i}}$.

# Failure regime

- **Parallel interstation rotation axes.** This is the stated hard degeneracy. If the robot only rotates about one fixed axis across all pairs (e.g., pure wrist rotation without base rotation), the stacked coefficient matrix for Eq. 12 is rank-2, not rank-3, and $P_{cg}'$ is underdetermined. Geometrically: the plane perpendicular to the common rotation axis is unconstrained. The translation system inherits this degeneracy since $R_{cg}$ is then underdetermined.

- **Near-parallel axes (small interstation axis spread).** The condition number of the rotation coefficient matrix grows as $1/\sin\bigl(\angle(P_{g_{12}}, P_{g_{23}})\bigr)$ (Observation 1, §III.B, Fig. 10 shows linear growth of $\sigma_{R_{cg}}$ with the inverse of interstation axis spread angle). Near-parallel axes do not cause hard failure but inflate rotation error proportionally.

- **Small interstation rotation angles.** The skew matrix $[P_{g_{ij}} + P_{c_{ij}}]_\times$ and $(R_{g_{ij}} - I)$ both tend to zero as $\theta_{g_{ij}} \to 0$. Error is inversely proportional to the interstation rotation angle (Observation 2, §III.B, Figs. 8–9). Pairs with $\theta \approx 0$ contribute near-zero rows and should be excluded.

- **Error propagation: rotation bias into translation.** The translation system (Eq. 15) explicitly contains $R_{cg} T_{c_{ij}}$ on the right-hand side. Any bias in the estimated $R_{cg}$ from step 1 enters the right-hand vector of the translation system. This is the central structural critique of the two-stage approach: translation error has a component $\propto \sigma_{R_{cg}} |T_{c_i}|$ (Eq. 31). The Daniilidis dual-quaternion method (`daniilidis1999-hand-eye`) avoids this by estimating rotation and translation simultaneously.

- **Large camera-to-calibration-block distance.** From Eq. 31, the dominant translation error term is $\sigma_{R_{c_{ij}}} |T_{c_i}|$ — the extrinsic rotation error multiplied by the camera-to-target distance. The paper measures 15 mil (thousandths of an inch) of translation error for $|T_{c_i}| = 5$ in and $\sigma_{R_{c_{ij}}} = 3$ mrad (§III.B, Observation 3). Minimising $|T_{c_i}|$ is explicitly recommended.

- **Large robot positional uncertainty.** Translation error also has a $\sigma_{T_{g_{ij}}}$ term (the robot's positional repeatability in interstation translation). For the IBM CRR, positional repeatability is ~4 mil and rotary repeatability ~1 mrad (§IV.B1). A less precise robot would dominate the translation error.

- **$\theta = \pi$ singularity in Rodrigues recovery.** The formula $P_{cg} = 2P_{cg}' / \sqrt{1 + |P_{cg}'|^2}$ is stable for $\theta \in [0, \pi)$ but hits an exception at $\theta = \pi$ where $|P_{cg}'| \to \infty$. The paper identifies this case by checking collinearity of axis sums across pairs and routes to the explicit exception branch.

# Numerical sensitivity

- **Modified Rodrigues vs quaternion.** The paper chooses $P_r = 2\sin(\theta/2)\,n$ over quaternion $q = (\cos(\theta/2), \sin(\theta/2)\,n)$. The advantage claimed: error formulas for small perturbations hold exactly for $P_r$ (Lemma V in §III.A is stated as exact, not linearised), whereas quaternion error formulas involve higher-order terms. Additionally, $R$ is a polynomial in $P_r$ (Eq. 10), enabling purely algebraic operations.

- **Condition of the rotation system.** The stacked $3M \times 3$ coefficient matrix has singular values proportional to the sine of the interstation axis spread and the magnitude of the interstation rotation angle. Both factors appear multiplicatively in the denominators of the error formulas (Eqs. 28, 31). The SVD-based least-squares solution is robust to this conditioning as long as the system is not rank-deficient.

- **Normalization of $P_{cg}'$.** The unscaled axis $P_{cg}'$ satisfies $P_{cg}' \parallel P_{cg}$, with $|P_{cg}'| = \tan(\theta_{cg}/2)$. For $\theta_{cg}$ near $\pi$, $|P_{cg}'|$ is large and the normalization $P_{cg} = 2P_{cg}' / \sqrt{1 + |P_{cg}'|^2}$ remains numerically stable in double precision — the denominator grows without bound, keeping the ratio bounded.

- **Scaling of the translation system.** $(R_{g_{ij}} - I)$ has entries bounded by 2; $R_{cg} T_{c_{ij}} - T_{g_{ij}}$ is dominated by $|T_{c_{ij}}|$ and $|T_{g_{ij}}|$, which are physical distances in the robot workspace (inches or mm). The normal equations for $T_{cg}$ are well-scaled when translation distances are of similar magnitude. No explicit normalisation is required.

- **Effect of number of stations on accuracy.** Both $\sigma_{R_{cg}}$ and $\sigma_{T_{cg}}$ decrease proportionally to $1/\sqrt{M}$ (Observation in §III.B, Figs. 12–13). This $\sqrt{N}$-averaging is verified empirically by simulation and confirmed in the real-robot experiments (§IV.B, Table and discussion). The paper adds ~60 arithmetic operations per additional station, making the cost linear in $N$.

- **Extrinsic calibration error.** The per-station extrinsic calibration using Tsai 1987 achieves ~1 part in 4000 accuracy for the 36-disc calibration block (§II.B1). This sets the floor on $\sigma_{R_{c_i}}$ and $\sigma_{T_{c_i}}$.

# Applicability

- Use when: implementation simplicity is a priority. The method reduces to two $3M \times 3$ linear least-squares solves plus one Rodrigues conversion — straightforward to implement with any basic linear algebra library.
- Use when: rotation accuracy is the primary goal. The rotation subsystem is solved independently of translation and achieves accuracy limited only by the inter-station axis spread and rotation angle. The paper reports $\sigma_{R_{cg}} \approx 2.88$ mrad on a real IBM Cartesian robot with 3-station data, agreeing with the predicted 2.56 mrad (§IV.B).
- Use when: the camera-to-target distance is large relative to the camera baseline between stations, i.e., when the $R_{cg} T_{c_{ij}}$ coupling term in the translation system is small relative to $T_{g_{ij}}$. In that regime the rotation-into-translation error propagation is less harmful.
- Use when: the calibration can be automated: the robot plans its own station positions and sequences, and the whole pipeline (motion, image grab, extrinsic calibration, hand-eye solve) runs without human intervention. The paper implements this on an IBM Clean Room Robot (§IV.B).
- Don't use when: translational accuracy is the primary constraint and camera baselines between stations are short. In that regime $R_{cg} T_{c_{ij}}$ is small, making the translation result sensitive to rotation bias. Simultaneous methods (Daniilidis dual quaternions, Park-Martin Lie algebra) avoid this coupling.
- Don't use when: the robot's motion is constrained to a single rotation axis (planar work cells with no wrist rotation freedom). The method degenerates on parallel interstation axes.
- Don't use when: only two stations are available ($M = 1$ pair). A minimum of three stations (two pairs) is required.
- Compared against:
  - **Shiu-Ahmad 1989** (`shiu1989-calibration`): also decoupled, also solves $AX = XB$, but treats $\sin$ and $\cos$ as independent unknowns, doubling the number of unknowns per pair. The Tsai-Lenz method fixes the unknown count to 6 regardless of $M$. (§I.E)
  - **State-of-the-art at 1989**: large-scale nonlinear optimization coupling robot kinematics and hand-eye parameters jointly (>30 unknowns). Tsai-Lenz avoids this by decoupling hand-eye from robot kinematic calibration entirely. (§I.E)
  - **Daniilidis 1999** (`daniilidis1999-hand-eye`): simultaneous rotation and translation via dual quaternions. Avoids the rotation-into-translation error propagation; preferred when translational accuracy matters and camera baselines between stations are short. See `## When to choose Tsai-Lenz over Daniilidis` below.

# Connections

- Builds on:
  - `tsai1987-versatile` — the camera calibration paper that provides the $H_{c_i}$ observables. The hand-eye method requires per-station extrinsic calibration as a prerequisite. The same calibration block and workflow are shared.
  - `shiu1989-calibration` — contemporaneous independent work, cited as the first attempt to decouple hand-eye from robot kinematic calibration. Tsai-Lenz and Shiu-Ahmad started from the same problem formulation but arrived at different solvers.
- Enables (in the atlas):
  - `tsai-lenz-handeye` — primary source.
  - `daniilidis-dual-quaternion-handeye` — successor that critiques the sequential decoupling and replaces it with a joint dual-quaternion SVD.
- Refutes / supersedes:
  - The coupled nonlinear optimisation approach (cited works [1], [3], [7] in the paper): Tsai-Lenz demonstrates that hand-eye calibration can be decoupled from robot kinematic model calibration and solved in $O(M)$ time rather than by global high-dimensional nonlinear optimisation.

# Atlas update plan

## UPDATE: tsai-lenz-handeye

The existing page is accurate and faithful to the paper's §II.B–II.C structure. The algorithm, Rodrigues definition, rotation and translation constraint definitions, and the procedure flowchart all match the paper. The following bullets identify gaps and improvements.

Section: Algorithm
- **Add derivation motivation for the Rodrigues constraint (Eq. 12).** The page states the constraint $[P_{g_{ij}} + P_{c_{ij}}]_\times P_{cg}' = P_{c_{ij}} - P_{g_{ij}}$ without tracing the proof chain. Add a one-sentence bridge: "This follows from Lemma VI (itself derived from Lemmas III–V), which shows that $P_{cg}$ is simultaneously perpendicular to $P_{g_{ij}} - P_{c_{ij}}$ (geometric bisector property) and that the cross-product $(P_{g_{ij}} + P_{c_{ij}}) \times P_{cg}'$ equals $P_{c_{ij}} - P_{g_{ij}}$ in magnitude and direction." Readers otherwise see Eq. 12 without geometric grounding.
- **Clarify why each station pair contributes rank 2, not rank 3.** The current page says "The skew matrix $[P_{g_{ij}} + P_{c_{ij}}]_\times$ has rank 2" and "$R_{g_{ij}} - I$ has rank 2" without explaining why. Add: $\mathrm{Skew}(v)$ has rank 2 for any nonzero $v$ because its null space is spanned by $v$ itself (Lemma VII); similarly, $R - I$ has rank 2 for any nontrivial rotation because $R - I$ kills the rotation axis (Lemma IX).

Section: Remarks
- **Add bullet — error propagation quantified.** The paper's Eq. 31 shows that the dominant contribution to $\sigma_{T_{cg}}$ is $\sigma_{R_{c_{ij}}} |T_{c_i}|$ — the extrinsic rotation RMS error multiplied by the camera-to-target distance. With $|T_{c_i}| = 5$ in and $\sigma_{R_{c_{ij}}} = 3$ mrad (practical figures from §III.B), this produces ~15 mil of translation error. The current Remarks bullet on the decoupled amplification is correct in direction; adding the quantitative form from Eq. 31 gives the reader a practical calibration setup guideline (minimise $|T_{c_i}|$).
- **Add bullet — noise averaging scales as $1/\sqrt{N}$.** Both $\sigma_{R_{cg}}$ and $\sigma_{T_{cg}}$ decrease as $1/\sqrt{M}$ in the number of station pairs (Observation §III.B, verified Figs. 12–13). Because each additional station costs only ~60 arithmetic operations (§II.C), the paper recommends using as many stations as feasible — the setup and robot motion planning are fully automated. Currently absent from the page.
- **Add bullet — axis-spread and rotation-angle requirements, with thresholds.** The paper identifies two first-degree accuracy factors: (1) angle between interstation rotation axes should be as large as possible (Fig. 10: $\sigma_{R_{cg}}$ grows linearly as $1/\sin(\angle)$; (2) interstation rotation angle should be as large as possible (Figs. 8–9). Practical guidance: use a star-drawing station placement that maximises both simultaneously, as described in §IV.A1. This recommendation is implied by the existing "Prefer pairs with large rotation angles and pairwise non-parallel axes" in the algorithm box but not highlighted as an accuracy observation.
- **Strengthen existing decoupling Remark with the Daniilidis comparison hook.** The current Remark on decoupled translation error amplification is correct. Add a cross-reference pointer: "For the inverse regime — short camera baselines, high translational accuracy requirements — see the comparison with Daniilidis below." This links the Remark to the upcoming comparison subsection.

Section: Remarks — add subsection
- **Add `## When to choose Tsai-Lenz over Daniilidis`** (the tsai-lenz-handeye page hosts this comparison because Tsai-Lenz 1989 predates Daniilidis 1999):
  - **Implementation simplicity.** Tsai-Lenz reduces to two $3M \times 3$ SVD solves plus a Rodrigues conversion. Daniilidis requires assembling a $6M \times 8$ matrix and extracting its two smallest right singular vectors plus solving a quadratic — more moving parts, harder to implement from scratch.
  - **Same data minimum.** Both methods require $M \geq 2$ non-parallel-axis station pairs (three stations). There is no practical data-requirement advantage for either method.
  - **When rotation is the primary output.** Tsai-Lenz solves rotation independently of translation; if only $R_{cg}$ is needed (e.g., for workspace orientation registration), the translation step can be skipped entirely.
  - **When camera-to-target distance is small relative to interstation translation.** The coupling term $R_{cg} T_{c_{ij}}$ in Eq. 15 is proportional to $|T_{c_{ij}}|$. When the interstation gripper displacement is large, this term dominates the translation right-hand side and the rotation-bias contribution is relatively small. Tsai-Lenz translation accuracy is adequate in this geometry.
  - **Daniilidis is preferred when translational accuracy matters and camera baselines between stations are short.** In that regime $|T_{c_{ij}}|$ is small, the $R_{cg} T_{c_{ij}}$ term is comparable to the translation error from rotation bias, and the joint estimation of Daniilidis avoids the cascade.
  - **Both methods degenerate on planar or single-axis trajectories.** Neither solver is superior under the parallel-axes failure regime — the same non-collinear-axis requirement applies to both.

## UPDATE: daniilidis-dual-quaternion-handeye

The daniilidis1999-hand-eye research note (already written) identified a deferred bullet: add a Remarks cross-reference pointer to the comparison section on the tsai-lenz-handeye page. Now that the tsai1989-handeye note is written, both preconditions for comparison authoring are met.

Section: Remarks
- **Add cross-reference bullet (draft, apply via algo-page):**
  > Compared with Tsai-Lenz: see [When to choose Tsai-Lenz over Daniilidis](/algorithms/tsai-lenz-handeye#when-to-choose-tsai-lenz-over-daniilidis). The Tsai-Lenz page hosts the comparison.

# Provenance

- Paper: `docs/papers/.cache/tsai1989-handeye.txt` (14 pages, IEEE Transactions on Robotics and Automation, Vol. 5, No. 3, June 1989, pp. 345–358).
- Title verified from paper header: "A New Technique for Fully Autonomous and Efficient 3D Robotics Hand/Eye Calibration."
- Abstract (p. 345): "ten times more accurate in rotation than any existing technique using standard resolution cameras" — direct motivation for the claim that the method was the state-of-the-art for rotation accuracy in 1989.
- §I.E (p. 347): decoupling rationale vs. [1], [3], [7] (global nonlinear optimization) and vs. Shiu-Ahmad [9] (same decoupled goal, different parametrisation). Quote: "In Shiu and Ahmad's method, the number of unknowns to solve for is twice the number of degrees of freedom, since they treat sin and cos functions as independent."
- §II.A (p. 347): coordinate frame definitions — $H_{g_i}$: gripper-to-base; $H_{c_i}$: CW-to-$C_i$; $H_{cg}$: $C_i$-to-$G_i$ (Eqs. 1–5). Note the inverse-sign asymmetry: $H_{g_{ij}} = H_{g_j}^{-1} H_{g_i}$ (Eq. 6) vs $H_{c_{ij}} = H_{c_j} H_{c_i}^{-1}$ (Eq. 7), arising from the direction conventions of $H_{g_i}$ (G to RW) and $H_{c_i}$ (CW to $C_i$).
- §II.B (pp. 348–351): Modified Rodrigues vector (Eq. 9), rotation matrix recovery (Eq. 10), rotation constraint (Eq. 12, Lemma VI), angle and axis recovery (Eqs. 13–14), translation constraint (Eq. 15, Lemma VIII). Uniqueness conditions: Lemmas VII, IX, X, XI — rank-2 coefficient matrices, need non-collinear axes.
- §II.C (p. 350): speed — $100 + 60N$ scalar operations total; 60 additional operations per extra station.
- §II.D (pp. 350–351): eleven lemmas. Key ones: Lemma I (AX=XB structure from loop closure, Eq. 16), Lemma II ($R_{cg}$ rotates camera rotation axis into gripper rotation axis, Eq. 17), Lemma III ($P_{cg} \perp P_{g_{ij}} - P_{c_{ij}}$, Eq. 18), Lemma VI (rotation constraint formula, Eq. 20), Lemma VII (rank-2 of skew matrix), Lemma VIII (translation constraint, Eq. 21), Lemma IX (rank-2 of $R - I$), Lemmas X–XI (full-rank conditions).
- §III.A (pp. 352–354): error formulas. Eq. 28: $\sigma_{R_{cg}}$ inversely proportional to $\sin(\angle(P_{g_{12}}, P_{g_{23}}))$ and to interstation rotation angle. Eq. 31: $\sigma_{T_{cg}}$ has dominant term $\sigma_{R_{c_{ij}}} |T_{c_i}|$.
- §III.B (pp. 354–356): five observations on accuracy-critical factors. First-degree: (1) interstation axis spread, (2) interstation rotation angle, (3) camera-to-target distance, (4) rotation error per station. Second-degree: translation error per station.
- §IV.A (pp. 355–356): simulation confirming linear error growth with $1/\sin(\angle)$ (Fig. 10) and $1/\theta$ (Figs. 8–9); $1/\sqrt{N}$ improvement with station count (Figs. 12–13).
- §IV.B (pp. 357–358): real experiment on IBM Clean Room Robot (CRR). Setup: 36-disc calibration block (5000 µm spacing, 2000 µm radius, 4 µm accuracy); Javelin CCD 480 × 388. Accuracy assessment: predicted $\sigma_{R_{cg}} = 2.557$ mrad; observed ~2.88 mrad (§IV.B2 paragraph on accuracy assessment).
- §V (p. 358): conclusion. Computational complexity stated as $100 + 64N$ (slight discrepancy with §II.C's $100 + 60N$; the conclusion rounds differently — not a material difference).
- `docs/papers/index.yaml` entry `tsai1989-handeye`: notes field matches §II.B formulas precisely. Used to cross-check equation numbering.
- `content/algorithms/tsai-lenz-handeye.md`: the existing atlas page provides independent confirmation of the Rodrigues and constraint formulas and the procedure flowchart. Algorithm box step 6 correctly identifies the $\theta = \pi$ exception branch.
