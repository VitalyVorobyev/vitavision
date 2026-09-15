---
paper_id: kannala2006-generic
title: "A Generic Camera Model and Calibration Method for Conventional, Wide-Angle, and Fish-Eye Lenses"
authors: ["Juho Kannala", "Sami S. Brandt"]
year: 2006
url: https://web.archive.org/web/2018id_/http://www.ee.oulu.fi/~jkannala/calibration/Kannala_Brandt_calibration.pdf
created: 2026-09-15
relevant_atlas_pages: [kannala-brandt-model, camera-distortion-models, scaramuzza-omni-calibration, zhang-planar-calibration]
---

# Setting

Single-camera intrinsic calibration for conventional (narrow-angle),
wide-angle, and fish-eye lenses using a single generic projection model.
Input: images of a planar calibration pattern with circular control points
at known positions, observed from $N$ views (§IV-A). Output: the camera's
forward projection model $P_c$ (ray direction → pixel coordinates) and its
backward model $P_c^{-1}$ (pixel coordinates → ray direction), covering
fields of view up to and beyond 180° — a regime where the pinhole model with
additive distortion terms fails outright because "when $\theta$ approaches
$\pi/2$, the perspective model projects points infinitely far" (§III).

# Core idea

The pinhole perspective model $r = f\tan\theta$ (Eq. 1, where $\theta$ is the
angle between the principal axis and the incoming ray and $r$ is the
image-plane radius) diverges as $\theta \to \pi/2$, so it cannot represent
fish-eye lenses, which instead approximately follow one of several
alternative closed-form projections: stereographic $r=2f\tan(\theta/2)$
(Eq. 2), equidistant $r=f\theta$ (Eq. 3), equisolid-angle $r=2f\sin(\theta/2)$
(Eq. 4), or orthogonal $r=f\sin\theta$ (Eq. 5) (§II-A). Rather than picking
one of these per-lens-type formulas, the paper generalizes all of them (and
the pinhole model) as the odd-power polynomial
$$r(\theta) = k_1\theta + k_2\theta^3 + k_3\theta^5 + k_4\theta^7 +
k_5\theta^9 + \dots \qquad(6)$$
truncated to 5 terms (up to $\theta^9$), justified because odd powers span
the continuous odd functions and truncation at 5 terms was found
sufficient for sub-pixel approximation of all five reference projections
(§II-A; Table I). $r(\theta)$ is assumed monotonically increasing on
$[0,\theta_{max}]$, so the inverse (recovering $\theta$ from $r$) is found
by numerically rooting a 9th-order polynomial and selecting the real root in
range (§II-A).

The radially symmetric mapping $F$ sends ray direction $\Phi=(\theta,\phi)^T$
to normalized image coordinates $(x,y)^T = r(\theta)(\cos\phi,\sin\phi)^T$
(Eq. 7). To capture real-lens deviations from radial symmetry (decentering
distortion, tilted image plane, asymmetric lens elements), two additional
distortion terms are added, separable in $\theta$ and $\phi$: a radial term
$$\Delta_r(\theta,\phi) = (l_1\theta+l_2\theta^3+l_3\theta^5)(i_1\cos\phi +
i_2\sin\phi + i_3\cos2\phi + i_4\sin2\phi) \qquad(8)$$
and a tangential term
$$\Delta_t(\theta,\phi) = (m_1\theta+m_2\theta^3+m_3\theta^5)(j_1\cos\phi +
j_2\sin\phi + j_3\cos2\phi + j_4\sin2\phi) \qquad(9)$$
(§II-B, Eqs. 8-9), each with 7 free parameters, justified informally via
Fourier-series/odd-polynomial completeness arguments (more terms could model
arbitrary continuous distortion). The distorted normalized coordinates are
$$x_d = r(\theta)u_r(\phi) + \Delta_r(\theta,\phi)u_r(\phi) +
\Delta_t(\theta,\phi)u_\phi(\phi) \qquad(10)$$
and pixel coordinates follow from an affine map with focal-length-like scale
factors $m_u, m_v$ and principal point $(u_0,v_0)$:
$$\begin{bmatrix}u\\v\end{bmatrix} = \begin{bmatrix}m_u&0\\0&m_v\end{bmatrix}
x_d + \begin{bmatrix}u_0\\v_0\end{bmatrix} = A(x_d) \qquad(11)$$
Combining (10)-(11) gives the full forward model $m = P_c(\Phi)$ (Eq. 12)
with **23 parameters** (denoted $p_{23}$): 5 radial ($k_1..k_5$) + 7+7
asymmetric ($l_{1..3}, i_{1..4}, m_{1..3}, j_{1..4}$) + 4 affine ($m_u, m_v,
u_0, v_0$). Two reduced variants are also defined: $p_9$ (radial + affine
only, 5+4=9 params, no asymmetric distortion) and $p_6$ (2-term radial + 4
affine params) for cases prone to over-fitting, e.g. when control points
don't cover the whole image (§II-B).

The backward model is derived by decomposing $P_c = A\circ D\circ F$ and
inverting each factor; $F^{-1}$ and $A^{-1}$ are closed-form, but $D^{-1}$
(undoing the asymmetric distortion shift $s=S(\Phi)=\Delta_r u_r +
\Delta_t u_\phi$, Eq. 14) has no closed form and is approximated by a
first-order Taylor expansion around $x_d$, giving the fixed-point-style
update
$$s \approx \left(I + \frac{\partial S}{\partial\Phi}(\Phi_d)\left(
\frac{\partial F}{\partial\Phi}(\Phi_d)\right)^{-1}\right)^{-1} S(\Phi_d)
\qquad(15)$$
with $\Phi_d = F^{-1}(x_d)$ (§II-C, Eqs. 14-16). This first-order
approximation is empirically justified in §V-A/V-B: the resulting backward
model error is several orders of magnitude smaller than the forward
calibration residual (see Numerical sensitivity).

Calibration (§IV-A) is a 4-step Zhang-style planar-pattern pipeline: (1)
initialize $k_1, k_2$ by fitting $r=k_1\theta+k_2\theta^3$ to the nominal
manufacturer projection, and initialize $m_u, m_v, u_0, v_0$ from the
observed circular image boundary (a fitted ellipse) or, for full-frame
lenses, from the image center and reported pixel pitch; (2) back-project
observed points onto the unit sphere (solving $\theta$ per point from the
cubic $k_2\theta^3+k_1\theta-r=0$) and compute per-view homographies $H_j$
between sphere points and the planar pattern via a linear algorithm with
data normalization, refined by minimizing the angle between predicted and
back-projected unit vectors (§IV-A, Step 2); (3) extract initial rotations
$R_j$ and translations $t_j$ from $H_j$ (with SVD orthogonalization of
$R_j$, citing the standard closest-orthogonal-matrix trick); (4) jointly
refine all internal + external (+ optionally asymmetric) parameters by
Levenberg-Marquardt minimization of total squared reprojection error
$\sum_{j=1}^N\sum_{i=1}^M d(m_j^i, \hat m_j^i)^2$ (Eq. 18).

Because circular control-point centroids are not the projections of the
true circle centers under a nonlinear lens model, the paper adds a
**centroid-correction** step (§IV-B): it numerically integrates the modeled
projection over the interior of each physical circle (parameterized in
polar form $X(\rho,\alpha)$) to compute the true expected centroid
$\hat m$ (Eq. 19), rather than projecting the nominal circle center — a
step shown to matter substantially (see Numerical sensitivity: 0.45px bias
without it).

# Assumptions

1. The camera observes a **planar** calibration pattern; no 3D calibration
   rig is required — a stated advantage over prior fish-eye methods needing
   "a laser beam or a cylindrical calibration object" (§I, citing refs [5],
   [3]).
2. $r(\theta)$ must be monotonically increasing on $[0,\theta_{max}]$ for the
   root-selection step in $F^{-1}$ to be well-posed (§II-A) — holds for real
   lenses per the paper but is not separately enforced/validated during
   fitting; a hard requirement for the inverse to be single-valued.
3. Circular control points are assumed for sub-pixel centroid localization
   accuracy (§IV-B) — a soft assumption; other marker shapes would need a
   different centroid-correction integral, not derived in this paper.
4. The asymmetric-distortion inverse $D^{-1}$ relies on a first-order Taylor
   approximation (Eq. 15-16) being adequate — verified empirically (backward
   error $\ll$ forward calibration residual, §V-A/V-B) but not proven to hold
   for arbitrary lenses/distortion magnitudes; a soft assumption that could
   degrade for lenses with much larger asymmetric distortion than tested.
5. Model selection ($p_6$ vs. $p_9$ vs. $p_{23}$) is a manual bias-variance
   trade-off left to the user: the full 23-parameter model risks overfitting
   "if... the control points do not cover the whole image area" (§II-B) —
   demonstrated concretely in the Cosmicar experiment (§V-A) where $p_{23}$
   partly fit systematic illumination-induced errors from a single
   non-uniformly-lit image.

# Failure regime

- The perspective (pinhole) model is unusable for fish-eye lenses near
  $\theta=\pi/2$: it "projects points infinitely far" as $\theta\to\pi/2$,
  a hard divergence, not a graceful-degradation issue (§III).
- Two-parameter fish-eye models proposed by Mičušík ($M1$: $r=(a/b)\sin(b\theta)$;
  $M2$: $r=(a-\sqrt{a^2-4b\theta^2})/(2b\theta)$) fail badly outside their
  design regime: $M1$'s maximum approximation error is 69px against the
  pinhole curve and 90px against the stereographic curve (vs. 0.1px/0.0px for
  the 9-parameter polynomial $P9$); $M2$ has 9.7px error against the
  orthogonal projection (Table I, §III) — i.e. narrow two-parameter fits
  don't generalize across lens families, motivating the paper's 5-parameter
  choice.
- With a single, non-uniformly-illuminated calibration image and incomplete
  corner coverage, the full 23-parameter model overfits systematic
  illumination-induced localization error rather than true lens geometry —
  visible as large residuals concentrated "in the lower right corner of the
  calibration image" in the Cosmicar experiment (§V-A, Fig. 3(b)).
- Without the centroid-correction step (Eq. 19), circular-marker calibration
  is systematically biased: simulated RMS distance between naive (uncorrected)
  and corrected centroids was 0.45px — "significantly larger" than the
  reported real-data RMS residuals (Table III: 0.089–0.146px), i.e. skipping
  centroid correction would dominate the total error budget (§V-C).

# Numerical sensitivity

- Real-camera RMS reprojection residuals (Table II, conventional/wide-angle
  lenses): Heikkilä's $\delta_8$ model 0.061px (Cosmicar) / 0.124px (Sony);
  this paper's $p_6$ 0.107px / 0.234px; $p_9$ 0.055px / 0.092px; $p_{23}$
  0.052px / 0.057px. $p_9$ and $\delta_8$ both have 8 DOF, and $p_9$ gives
  slightly lower residuals despite lacking tangential terms (§V-A).
- Held-out validation: RMS projection error on an additional image (after
  fixing intrinsics and re-solving extrinsics) was 0.049px ($p_{23}$) vs.
  0.071px ($p_9$) for the Sony wide-angle experiment (§V-A) — used as
  evidence the full model captures true geometry rather than just fitting
  more parameters to the calibration set.
- Backward-model (first-order Taylor, Eq. 15-16) approximation error is
  negligible: maximum reprojection displacement from back-project-then-
  reproject was $2.1\times10^{-5}$px (Cosmicar) and $4.6\times10^{-4}$px
  (Sony) for conventional lenses (§V-A); $9.7\times10^{-6}$px and
  $3.4\times10^{-3}$px for the two fish-eye lenses (§V-B) — several orders
  of magnitude below the forward-model RMS residual, justifying "ignor[ing]
  the backward model error in practice."
- Fish-eye lens RMS residuals (Table III): Watec equidistant lens $p_6$
  0.146px, $p_9$ 0.094px, $p_{23}$ 0.089px; ORIFL190-3 (190° FOV) lens $p_6$
  0.491px, $p_9$ 0.167px, $p_{23}$ 0.137px — the wider/more-deviant lens
  (ORIFL) shows a much larger gap between the crude 2-parameter model and the
  5+-parameter models, i.e. model-order sensitivity scales with how far the
  real lens departs from a simple closed-form projection.
- Synthetic-data noise study (§V-C, Fig. 6): images blurred with Gaussian
  $\sigma=1$px and quantized to 256 gray levels; 10 calibration trials per
  noise level, noise std. swept 0–15px. RMS measurement/residual/estimation
  errors approximately satisfy a Pythagorean relation, offered as evidence
  the LM optimization "converged to the true global minimum," and estimation
  error stays low even at high injected noise — evidence of numerical
  stability of the 4-step initialization + LM refinement pipeline, not a
  formal convergence proof.

# Applicability

- Use when: a single generic model and calibration procedure is needed that
  spans conventional, wide-angle, and fish-eye lenses (including >180° FOV)
  from planar-pattern views alone, without switching model families per lens
  type (§I, §VI).
- Don't use when: the calibration image set has poor coverage / non-uniform
  illumination and only a single or few views are available — the 23-
  parameter full model is then prone to overfitting systematic error rather
  than lens geometry (§V-A demonstrated failure case above); a reduced model
  ($p_6$/$p_9$) or more views should be used instead.
- Compared against: Heikkilä's skew-zero pinhole + 4-distortion-parameter
  model $\delta_8$ (§V-A, direct RMS comparison, Table II); Mičušík's
  two-parameter fish-eye models $M1$, $M2$ (§III, projection-curve
  approximation comparison, Table I).

# Connections

- Builds on: [zhang2000-flexible] — the 4-step calibration procedure
  (homography-based initialization of extrinsics from planar-pattern views,
  followed by nonlinear refinement) follows Zhang's planar calibration
  structure, adapted to the polynomial radial model and unit-sphere
  back-projection instead of Zhang's pinhole homography (§IV-A cites Zhang's
  SVD-orthogonalization step directly).
- Builds on (cited, not registered in index.yaml): Heikkilä's calibration
  procedure/model $\delta_8$ [6] (direct experimental baseline, §V-A);
  Mičušík & Pajdla's simultaneous epipolar/omnidirectional-model estimation
  [8]; Mičušík's two-parameter fish-eye models [11]; Claus & Fitzgibbon's
  linear distortion model [12]; Thirthala & Pollefeys's radial 1D camera
  multiview approach [9]; Barreto & Daniilidis's radial fundamental matrix
  [10]. ? None of these ids are present in `docs/papers/index.yaml`, so left
  as prose only.
- Enables: not stated in-paper (2006 publication; forward influence, e.g.
  later omnidirectional/fisheye calibration toolboxes and the OpenCV
  "fisheye" module which implements this exact model, is not discussed by
  the paper itself).
- Refutes / supersedes: none claimed — the paper positions its model as
  filling a gap (no prior single model spans conventional-to-fisheye), not
  as replacing a specific named predecessor.

# Atlas update plan

## NEW: kannala-brandt-model
Type: algorithm
Category: camera-calibration / distortion-model
Primary source: this paper
Bullets per public-page section:
- Goal: single generic projection + calibration model spanning conventional,
  wide-angle, and fish-eye lenses (up to and beyond 180° FOV) from planar
  calibration pattern views (§I, §II).
- Algorithm: odd-power polynomial radial model $r(\theta)$ (Eq. 6)
  generalizing pinhole/stereographic/equidistant/equisolid-angle/orthogonal
  projections (Eqs. 1-5); optional 14-parameter asymmetric distortion
  (Eqs. 8-9); 4-step Zhang-style calibration with circular-marker centroid
  correction (Eqs. 17-19); first-order backward-model approximation
  (Eqs. 14-16).
- Implementation: note the model variants $p_6$/$p_9$/$p_{23}$ and their
  parameter counts/use cases (§II-B); note this is the same generic
  polynomial model implemented as OpenCV's `fisheye` module (verify at
  page-authoring time, not stated in the paper itself).
- Remarks: quantified RMS-residual comparison vs. Heikkilä's $\delta_8$
  (Table II) and vs. Mičušík's $M1$/$M2$ (Table I); centroid-correction bias
  (0.45px, §V-C) and backward-model-error negligibility ($10^{-3}$–$10^{-5}$
  px, §V-A/B) as concrete numerical-sensitivity callouts.
- References: this paper (primary); zhang2000-flexible (calibration
  procedure lineage).

## UPDATE: camera-distortion-models
Section: Where it appears / survey of models
Bullets to add:
- Add the Kannala-Brandt odd-power polynomial radial model $r(\theta) =
  k_1\theta + k_2\theta^3 + \dots$ (Eq. 6) as a generic model unifying
  pinhole and classical fish-eye projections (stereographic, equidistant,
  equisolid-angle, orthogonal — Eqs. 1-5), contrasted with additive
  Brown-Conrady-style distortion models that diverge for FOV approaching
  180° (§III).

## UPDATE: scaramuzza-omni-calibration
Section: Remarks / Relations
Bullets to add:
- Both target single-camera omnidirectional/fish-eye calibration from planar
  or scene-based views; no direct paper-stated relation exists (Kannala-
  Brandt 2006 predates Scaramuzza's method and neither paper names the
  other). Flag as a candidate `compared_with` (peer practitioner choice for
  wide-FOV lens calibration) to confirm at page-authoring time — not
  supported by an in-paper positioning quote, so left unconfirmed here per
  plan.

## UPDATE: zhang-planar-calibration
Section: Remarks / Relations
Bullets to add:
- Note that Kannala-Brandt's calibration procedure (§IV-A) directly reuses
  Zhang's planar-homography-based initialization-then-refine structure
  (linear homography estimation → SVD-orthogonalized extrinsics → nonlinear
  LM refinement), adapted to a spherical back-projection and polynomial
  radial model instead of Zhang's pinhole homography. This is a candidate
  `feeds_into` edge (Zhang → Kannala-Brandt) reflecting genuine
  compositional reuse of Zhang's calibration architecture — propose
  confidence high at page-authoring time; not committed here per plan.

# Provenance

- Abstract: problem statement, "comparable to previously reported
  state-of-the-art" accuracy claim.
- §I (Introduction): pinhole+distortion inadequacy for fish-eye (citing [1],
  [6], [7]); prior fish-eye approaches [16],[17],[20],[8],[9],[12],[10] and
  their limitations (straight-line correction only, laser/cylindrical rigs,
  auto-calibration emphasis over precise modeling).
- §II-A (Radially Symmetric Model): Eqs. 1-7; monotonicity assumption;
  numerical inversion via 9th-order polynomial.
- §II-B (Full Model): Eqs. 8-12; $p_{23}$/$p_9$/$p_6$ parameter counts and
  use cases.
- §II-C (Backward Model): Eqs. 13-16; first-order Taylor approximation of
  $D^{-1}$.
- §III (Justification): Eqs. for $M1$/$M2$ (Mičušík models); Table I
  (approximation errors); $f=200$px, $\theta_{max}$ values 60°/110°/110°/
  110°/90°; Levenberg-Marquardt curve fitting; divergence argument for
  perspective model.
- §IV-A (Calibration Algorithm): 4-step procedure; Eqs. 17-18; homography
  computation and SVD-orthogonalization (citing Zhang [4]).
- §IV-B (Circular Control Points): Eq. 19 centroid-correction integral.
- §V-A (Conventional/Wide-Angle experiments): Cosmicar/Sony camera
  descriptions; Table II RMS residuals; 0.049px/0.071px held-out validation;
  $2.1\times10^{-5}$/$4.6\times10^{-4}$ px backward-model errors.
- §V-B (Fish-Eye experiments): Watec/ORIFL190-3 lens descriptions; Table III
  RMS residuals; 0.13px/0.16px held-out validation; $9.7\times10^{-6}$/
  $3.4\times10^{-3}$ px backward-model errors.
- §V-C (Synthetic Data): 0.45px centroid-correction bias; Fig. 6 noise
  sweep (0–15px std.), Gaussian blur $\sigma=1$px, 256 gray levels, 10
  trials/level.
- §VI (Conclusion): summary claim, no new numbers.
