---
paper_id: loop1999-rectifying-homographies
title: "Computing Rectifying Homographies for Stereo Vision"
authors: ["C. Loop", "Z. Zhang"]
year: 1999
url: https://dev.ipol.im/~morel/Dossier_MVA_2011_Cours_Transparents_Documents/2011_Cours7_Document2_Loop-Zhang-CVPR1999.pdf
created: 2026-07-19
relevant_atlas_pages: [loop-zhang-rectification, pollefeys-polar-rectification]
---

# Setting

Stereo image rectification given a known epipolar geometry. Input: a pair of
images $I$, $I'$ of a static 3D scene, plus the fundamental matrix $F$
relating them, satisfying the epipolar constraint $m'^{T}Fm = 0$ for all
corresponding points $m \in I$, $m' \in I'$ (Eq. 1, p.126 §2.1). $F$ is a
rank-2 $3\times3$ matrix with a one-dimensional null space on each side,
giving the epipoles $e \in I$, $e' \in I'$ via $Fe = 0 = F^{T}e'$ (Eq. 2,
p.126 §2.1). The paper explicitly assumes $F$ is *given* — "we assume that
$F$ is known" (p.126 §2.1) — and works identically whether the pair is
calibrated (intrinsics known, $F$ specialises to the essential matrix) or
uncalibrated, "provided that $F$ is known between them" (p.126 §2.1).

Output: a pair of homographies $H$, $H'$ such that the rectified points
$\hat m = Hm$, $\hat m' = H'm'$ satisfy a canonical rectified epipolar
geometry with epipoles sent to $i = [1\ 0\ 0]^{T}$ (a point at infinity) and
rectified fundamental matrix $F = [i]_\times$ (p.127 §3, the antisymmetric
cross-product matrix of $i$ — the paper states $i=[1\,0\,0]^T$ explicitly but
the OCR of the $3\times3$ matrix itself is illegible; $[i]_\times$ for this
$i$ is the standard closed form $\begin{smallmatrix}0&0&0\\0&0&-1\\0&1&0\end{smallmatrix}$,
so this is a derived fact rather than a directly transcribed one — `?`).
Two properties characterise a rectified pair (p.127 §3, stated verbatim as a
two-item list): "i. All epipolar lines are parallel to the u-coordinate
axis," "ii. Corresponding points have identical v-coordinates." The
guarantee produced is not global optimality over all possible rectifying
$H,H'$ — it is optimality *within* the specific constructive decomposition
family the paper introduces (see Core idea), which the paper argues is a
principled, quantifiable 2D substitute for earlier 3D-construction or
heuristic 2D approaches (p.125 §1.1, p.130 §8).

# Core idea

The paper factors each rectifying homography as a product of three
special-purpose transforms — "decomposing each homography into a
specialized projective transform, a similarity transform, followed by a
shearing transform" (Abstract, p.125). Reading the paper's own component
sections in order — §5 Projective Transform, §6 Similarity Transform, §7
Shearing Transform (headers at p.128, p.128–129, p.129) — and its two
explicit checkpoint statements confirm the composition order unambiguously
even though the raw multi-letter product notation is OCR-illegible (shown
only as repeated "H,H,H," fragments):

1. First, the **projective** component $H_p$ (and $H_p'$ for the other
   image) sends the epipole $e$ to a point at infinity while staying "as
   affine as possible" (p.128 §5) — this is the paper's headline
   contribution: a closed-form(-ish) criterion for choosing among the
   1-parameter family of directions $z$ that all achieve this epipole
   mapping (Eq. 8, p.128: $w=[e]_\times z,\ w'=Fz$), minimizing the
   variance of per-pixel projective weights $w^Tp_i$ around the weight at
   the image centre (Eq. 9, p.128 §5.1), summed over *both* images as a
   sum of two Rayleigh-quotient-like ratios (Eq. 11, p.128 §5.1:
   $\frac{z^TAz}{z^TBz} + \frac{z^TA'z}{z^TB'z}$). Minimizing Eq. 11 is a
   nonlinear problem — its stationary condition is a degree-7 polynomial
   in the single free scalar of $z$ — solved iteratively from an initial
   guess obtained by solving the two single-image terms separately in
   closed form (each is a generalized-eigenvector/Rayleigh-quotient
   problem: $A=D^TD$, then the maximizing $y$ is the top eigenvector of
   $D^{-T}BD^{-1}$; §5.2, p.128).
2. Second, the **similarity** transform $H_r$ (and $H_r'$) rotates the
   now-infinite epipole image into alignment with $i=[1\,0\,0]^T$ — "define
   a pair of similarity transforms $H_r$ and $H_r'$ that rotate these
   points at infinity into alignment with the direction $i$... as required
   for rectification" (p.129 §6) — and finds a shared $v$-translation that
   aligns the two images' scan-lines exactly, referenced as depending on
   "Eqs. (17) and (16)" (p.128–129 §6; the underlying formulas are lost to
   the OCR's two-column garbling — `?`). The paper states this pair alone
   already achieves rectification: "the combined transforms $H_pH_r$ and
   $H_p'H_r'$ are sufficient to rectify images $I$ and $I'$" (p.128–129 §6),
   with $u_a,u_b$ (Eq. 4, p.127) still free.
3. Third, the **shearing** transform $H_s$ (and $H_s'$) spends that
   remaining freedom to reduce distortion further without disturbing
   rectification, because "$H_s$ only [a]ffects the u-coordinate of a
   point, therefore it will not [a]ffect the rectification of an image"
   (p.127 §4 — this sentence is the paper's own internal justification for
   why $H_s$ can safely be composed last/outermost). $H_s$ is chosen to
   preserve perpendicularity and aspect ratio of the quadrilateral formed
   by the midpoints of the image's four edges (Eqs. 18–19, p.129 §7),
   solved as a pair of simultaneous quadratics in the shear parameters
   "using the method outlined in [2]" (Manocha & Demmel 1994), with a
   sign ambiguity resolved by preferring the positive root (p.129 §7).

The final combined transform is stated explicitly: "The combined transform
$H_sH_rH_p$, and similarly $H_s'H_r'H_p'$, rectify images $I$ and $I'$ with
minimal distortion" (p.129 §7) — i.e. $H = H_sH_rH_p$ applied per image,
matching the two-homography pair $(H,H')$ this problem requires. Appendix A
(Propositions 1–2, p.130) proves the geometric fact underpinning the whole
construction: rows $v,w$ of $H$ and $v',w'$ of $H'$ must be *corresponding*
epipolar lines (Eq. 20–21, p.130), which is what links the two images'
otherwise-independent decompositions together.

# Assumptions

1. **Hard.** $F$ (or $E$ if calibrated) is known in advance; the method does
   not estimate it. "In this paper, we assume that $F$ is known. An
   overview of techniques to find $F$ can be found in [5]" (p.126 §2.1,
   [5] = Zhang 1998 review).
2. **Soft, precision-related.** "we assume the image coordinate system
   origin is near the image" (p.127 §4) — this underlies the safety of
   dividing by $w_c$/$w_c'$ when normalising $H_p$'s scale (see Numerical
   sensitivity).
3. **Convention, not a hard constraint.** The canonical rectified target is
   fixed to $i=[1\,0\,0]^T$, $F=[i]_\times$; the paper notes "other
   conventions for canonical epipolar geometry may be useful under special
   circumstances" (p.127 §3), i.e. this specific target is a design choice.
4. **Soft.** The projective-distortion criterion (Eq. 9) is evaluated over
   "all the pixels from both images," though "some other subset of
   important image points could also be used if necessary" (p.128 §5.1).
5. **Hard, for the closed-form simplification specifically.** The
   closed-form reduction of $PP^T$ used to build $A,B,A',B'$ (Eq. 11's
   inputs) assumes a full integer pixel-grid point set
   $p_{i,j}=[i\ j\ 1]^T,\ i=0..w-1,\ j=0..h-1$ (p.128 §5.1); a different
   point set (per assumption 4) would require re-deriving this closed form.
6. **Asserted, not proven in the extracted text.** $A$ is asserted to be
   "symmetric and positive-definite" so that $A=D^TD$ exists (p.128 §5.2);
   no justification for positive-definiteness is given in the visible text
   (`?`).

# Failure regime

- Stated by the paper: perfect (zero) projective distortion is unattainable
  in general — "we cannot have identical weights in general (except when
  the epipole is already at $\infty$)" (p.128 §5.1) — so some residual
  projective distortion is structurally unavoidable except in that
  degenerate starting configuration.
- Stated by the paper: the shearing stage cannot fully undo projective
  distortion either — "In general, $H_p$ is a projective transform, so it
  is not possible to undistort $I$ completely using the affine transform
  $S$" (p.129 §7); $H_s$ only satisfies two constraints (perpendicularity,
  aspect ratio), not a general distortion minimum.
- Numerical/procedural: the joint two-image criterion (Eq. 11) is
  minimized via an iterative root-find on a degree-7 polynomial, seeded by
  averaging the two single-image closed-form solutions; the paper asserts
  (without proof in the visible text) that this average "is very close to
  the optimal solution" (p.128 §5.2) — an empirical claim, not a bound.
- `?` **Not a claim made by this paper — an inference to verify before
  publishing an Atlas page.** A natural reading of the $H_sH_rH_p$
  decomposition suggests it may not be able to represent a valid
  rectification when the epipole lies *inside* the image (rather than
  outside it, where the projective-to-infinity map is well-behaved). Loop &
  Zhang do not discuss this case anywhere in the visible text — no epipole
  containment/inside-image failure mode is stated. The authoritative source
  for this caution is expected to be Hartley's own paper, §5
  (`hartley1999-projective-rectification.md`), not this one. Flagging here
  for future page-authoring cross-check; do not attribute this failure mode
  to Loop & Zhang 1999 on the public page.

# Numerical sensitivity

- The scale normalisation of $H_p$ (dividing through by $w_c$, $w_c'$) is
  protected from blow-up by assumption 2 above plus a claim about the
  optimizer's own behaviour: "our minimization procedure will tend to keep
  the lines $w$ and $w'$ away from the images" (p.127 §4) — i.e. the
  distortion criterion itself discourages the epipole-mapping line from
  passing near the image, which is what would make $w_c\to 0$ dangerous.
- $A=D^TD$ (Cholesky-type decomposition) requires $A$ symmetric
  positive-definite (p.128 §5.2, asserted — see Assumptions #6); the
  top-eigenvector solve for the single-image criterion is otherwise
  well-posed generalized-eigenvalue arithmetic.
- The joint two-image criterion is *not* closed-form: it needs a degree-7
  polynomial root-find, run iteratively from the averaged single-image
  initial guess (p.128 §5.2). No convergence guarantee or bound on
  distance-from-optimum is given for this iterative step in the visible
  text.
- The shear-parameter solve (Eqs. 18–19) is a simultaneous system of two
  quadratics with a genuine sign ambiguity — "up to sign; the solution
  where $a$ is positive is preferred" (p.129 §7) — resolved by a stated
  but unjustified convention rather than a geometric argument in the
  visible text.

# Applicability

- **Use when:** $F$ or $E$ is already known for a stereo pair (calibrated
  or uncalibrated) and an explicit, quantifiable 2D distortion-minimization
  criterion is wanted, without any 3D reconstruction step — "This new
  method is based entirely on quantifiable 2D image measures and requires
  no 3D constructions... these measures have intuitive geometric meaning"
  (p.130 §8 Conclusion).
- **Don't use when:** $F$ itself is not yet estimated — this method is a
  downstream rectification step, not an $F$-estimation method (it points
  to [5] Zhang 1998 for that, p.126 §2.1).
- **Compared against (sourced from this paper, §1.1 Previous Work,
  p.125):**
  - **[3] Robert, Zeller, Faugeras & Hébert 1997** — "A strictly 2D
    approach that does attempt to optimize the distorting effects of image
    rectification can be found in [3]. Their distortion minimization
    criterion is based on a simple geometric heuristic which may not lead
    to optimal solutions" (p.125 §1.1). This is a direct, sourced contrast:
    Loop & Zhang position their closed-form criterion as replacing a
    "simple geometric heuristic."
  - **[1] Faugeras 1993 and [4] Seitz 1997 (3D-construction methods)** —
    "Some previous techniques for finding image rectification homographies
    involve 3D constructions [1,4]... its realization in practice is
    somewhat more involved and no consideration is given to other more
    optimal choices" (p.125 §1.1).
- **`?` Editorial note, not sourced from this paper:** this paper does
  *not* discuss or cite Hartley's rectification method anywhere. Verified:
  its bibliography (p.130) has exactly 5 entries — Faugeras 1993, Manocha &
  Demmel 1994, Robert/Zeller/Faugeras/Hébert 1997, Seitz 1997, Zhang 1998 —
  and no Hartley entry. Any future comparison to Hartley's
  disparity-minimizing criterion must be sourced from
  `hartley1999-projective-rectification.md` (that paper's own text), not
  from this note.

# Connections

- **Builds on (background, not a technical prior-method dependency):**
  general epipolar-geometry formalism, citing Faugeras 1993 (3D Computer
  Vision book, [1]) and Zhang 1998 (epipolar-geometry review, [5], for
  $F$-estimation techniques). Neither is verified as a registered
  `docs/papers/index.yaml` ID at the time of writing this note, so no
  `paper_id` bracket-list is asserted here — `?`.
- **Contrasted against (not "built on"):** [3] Robert et al. 1997
  (heuristic 2D criterion), [1] Faugeras 1993 and [4] Seitz 1997
  (3D-construction rectification) — see Applicability above; the paper
  frames its own method as an alternative to, not an extension of, these.
- **Enables / downstream (Atlas-planning, not asserted by this 1999
  paper):** this note's own Atlas update plan below proposes a
  `compared_with` edge to `pollefeys-polar-rectification` once both pages
  exist — that is editorial planning for this repository, not a claim made
  by Loop & Zhang.
- **Refutes/supersedes:** none stated; the paper does not claim to
  supersede a specific prior method, only to improve on the two contrasted
  approaches above (§1.1).

# Atlas update plan

## NEW: loop-zhang-rectification
Type: algorithm
Category: geometry (task: stereo-rectification)
Primary source: this paper (loop1999-rectifying-homographies)

Frontmatter to use when this page is authored:
- tasks: [stereo-rectification]
- tags: ["stereo", "two-view-geometry", "classical"]
- domain: geometry
- difficulty: advanced
- prerequisites: [stereo-rectification, epipolar-geometry, homography]
  (NOTE: `stereo-rectification` exists as a task id in content/tasks.yaml but not yet as a concept page in content/concepts/ — this prerequisite slug is forward-looking; verify/create before publishing the algorithm page.)
- sources.primary: loop1999-rectifying-homographies
- sources.references: [] (the paper's 5-entry bibliography has no entries mapping to existing docs/papers/index.yaml IDs; do not add hartley1997-eight-point or hartley1999-projective-rectification here — verified this paper does not cite Hartley)
- relations: exactly one entry, authored on this page only:
  - { type: compared_with, target: pollefeys-polar-rectification, confidence: high, caution: "The H_s H_r H_p decomposition cannot represent a rectification when the epipole is inside the image." }
  (Do NOT add a relation to hartley-projective-rectification — the Hartley page carries the symmetric parallel_foundation_with edge to loop-zhang-rectification; authoring both sides would be a policy violation per CLAUDE.md.)

Bullets for page sections once authored:
- Goal: rectify a calibrated or uncalibrated stereo pair (given fundamental matrix F) by finding a pair of homographies H, H' that map epipolar lines to horizontally aligned scanlines, while minimizing projective and affine image distortion.
- Algorithm: state the H = H_s H_r H_p decomposition per image; the closed-form minimization of the projective-distortion criterion over H_p; how H_r aligns epipolar lines horizontally; how H_s (shear) preserves aspect ratio/perpendicularity while further reducing distortion.
- Remarks: works for calibrated (essential matrix) or uncalibrated (fundamental matrix) pairs, requires F known in advance (does not estimate F itself).
- References: primary source loop1999-rectifying-homographies only (empty sources.references per above).

Explicitly rejected edges (record as non-edges, do not add):
- No feeds_into from fundamental-matrix-eight-point.
- No edge to geometric-bev.
- No edge to camera-distortion-models.

# Provenance

- Eq. 1 (p.126 §2.1): epipolar constraint $m'^TFm=0$.
- Eq. 2 (p.126 §2.1): epipole definition $Fe=0=F^Te'$.
- Eq. 3 (p.127 §3): factorization $F=H'^T[i]_\times H$, from "resulting in the factorization... (3)"; restated verbatim as Eq. 20 in Appendix A.
- Eq. 4 (p.127 §3): $H$ expressed via rows $u^T,v^T,w^T$; consequence $He=[u^Te\ v^Te\ w^Te]^T=[1\,0\,0]^T$ shown immediately after.
- Eq. 5 (p.127 §4): "scale variant counterpart" of $H$ used to fix the otherwise scale-invariant homography to a concrete numeric representative — exact normalisation entries illegible in the OCR (`?`).
- Eq. 6 (p.127 §4): defines $H_p$, the projective-transform matrix that maps the epipole to a point at infinity — exact matrix entries illegible beyond the general role described in prose (`?`).
- Eq. 7 (p.127 §4, referenced again p.128 §6 "eliminate $v_a$ and $v_b$ from Eq. (7)"): general affine-component matrix template still carrying free parameters $v_a,v_b$ (pinned in §6) and $u_a,u_b$ (pinned in §7); whether this equation specifically labels $H_r$ or the combined $H_a$ template is ambiguous in the OCR (`?`).
- Eq. 8 (p.128 §5): $w=[e]_\times z,\ w'=Fz$ — links the two images' free projective-mapping direction $z$.
- Eq. 9 (p.128 §5.1): per-image weight-variation distortion measure, $w_c=w^Tp_c$; exact matrix expression illegible in OCR (`?`), described in surrounding prose.
- Eq. 10 (p.128 §5.1): single-image criterion as the ratio $w^TPP^Tw / w^Tp_cp_c^Tw$.
- Eq. 11 (p.128 §5.1): combined two-image criterion $\frac{z^TAz}{z^TBz}+\frac{z^TA'z}{z^TB'z}$, minimized per §5.2 via a degree-7-polynomial root-find seeded by two closed-form single-image solutions (top eigenvector of $D^{-T}BD^{-1}$, $A=D^TD$).
- Eqs. 12–15: not confidently locatable as distinct numbered equations in the OCR text; likely intermediate steps of §6's elimination-of-$v_a,v_b$ derivation (`?`).
- Eqs. 16, 17 (p.128–129 §6): referenced by name only ("there remains a translation term involving $v_c'$ in Eqs. (17) and (16)... an offset of $F_{33}$ is needed to align horizontal scan-lines"); underlying formulas illegible in the OCR (`?`).
- Eqs. 18, 19 (p.129 §7): perpendicularity condition $(Sx)^T(Sy)=0$-type and aspect-ratio condition $(Sx)^T(Sx)/(Sy)^T(Sy)=\omega^2/\eta^2$-type constraints on the shear parameters, "quadratic polynomials in $a$ and $b$" solved via the curve-intersection method of reference [2] (Manocha & Demmel 1994).
- Eq. 20 (p.130 Appendix A, Proposition 2): restatement of Eq. 3, $F=H'^T[i]_\times H$.
- Eq. 21 (p.130 Appendix A, Proposition 2 proof): $[0\ w'\ -v']=[0\ Fz\ -Fy]$, used to conclude $v\sim v'$, $w\sim w'$ (corresponding epipolar lines across the two homographies).
- §1.1 Previous Work (p.125): source of the [3]=Robert/Zeller/Faugeras/Hébert 1997 contrast ("simple geometric heuristic") and the [1]/[4] 3D-construction contrast.
- §8 Conclusion (p.130): source of the "quantifiable 2D image measures... no 3D constructions" summary claim.
- References list (p.130, immediately before Appendix A): exactly 5 entries — [1] Faugeras 1993 (*Three-Dimensional Computer Vision*, MIT Press), [2] Manocha & Demmel 1994 (ACM ToG, curve-intersection algorithms), [3] Robert/Zeller/Faugeras/Hébert 1997 (non-metric-vision robotics chapter), [4] Seitz 1997 (PhD thesis, U. Wisconsin), [5] Zhang 1998 (IJCV epipolar-geometry review). No Hartley entry present.
