---
paper_id: hartley1999-projective-rectification
title: "Theory and Practice of Projective Rectification"
authors: ["R. I. Hartley"]
year: 1999
url: https://users.cecs.anu.edu.au/~hartley/Papers/joint-epipolar/journal/joint3.pdf
created: 2026-07-19
relevant_atlas_pages: [epipolar-geometry, homography, fundamental-matrix-eight-point, stereo-rectification, loop-zhang-rectification, pollefeys-polar-rectification, fusiello-compact-rectification]
---

# Setting

Problem class: two-view stereo rectification without camera calibration.
Given two uncalibrated images of a common scene and a set of point
correspondences u_i <-> u_i' (>= 7 for a minimal F solution, >= 8 for the
paper's linear-least-squares F estimate — see Provenance, both counts appear
in the text), compute a pair of 2D projective transformations H (image 1)
and H' (image 2) that resample the images into a "matched epipolar
projection" pair: epipolar lines horizontal (parallel to the x-axis) in
both images, and disparities between corresponding points purely
horizontal. No camera matrices or calibration are used — only the
fundamental matrix F, which is itself estimated from the same point
correspondences. Output guarantee is topological/geometric, not metric:
the resampled pair behaves like images from a rectilinear (side-by-side,
parallel-axis) stereo rig, enabling 1D correlation search and, if desired,
3D reconstruction up to an unknown 3D projectivity (Section 7).

# Core idea

The method factors rectification into two projective maps chosen in
sequence. First (Section 3), a transform H' for the second image is built
as a composition H' = G R T of a translation T (centering a chosen
reference point u0, e.g. the image centre, at the origin), a rotation R
(aligning the epipole p' with the x-axis), and a perspectivity G (eq. 4,
lines 297-303) that sends the aligned epipole (f,0,1)^T to the point at
infinity (f,0,0)^T. G is chosen, rather than an arbitrary epipole-to-
infinity map, because its Jacobian at the origin is the identity to first
order (lines 310-314), so the composite H' behaves like a rigid
transform near u0 and does not grossly distort the neighbourhood of the
chosen reference point. Second (Section 4), given H', the set of
transforms H of the first image that preserve epipolar-line
correspondence is characterized in closed form by Theorem 4.5: writing
F = [p']_x M, H matches H' iff H = (I + H' p' a^T) H' M for some free
vector a (eq. 6). When H' sends the epipole to (1,0,0)^T exactly, this
family collapses (Corollary 4.6) to H = A (H' M) with A restricted to a
3-parameter affine form (eq. 8), and the free parameters (a,b,c) of A are
fixed by linear least squares, minimizing sum_i (a*u_hat_i + b*v_hat_i +
c - u_hat_i')^2 over the matched points (the y-term is a constant and
drops out of the minimization — lines 387-399). Because A is restricted to
be affine (not general projective), this final fit is linear; the paper
notes explicitly that a general projective A would not admit a linear
solution (lines 401-404). Separately (Section 5), the paper defines a
transform H as "quasi-affine" with respect to a convex view window W if
H(W) does not meet the line at infinity, i.e., no point of W is thrown to
infinity or behind the camera by the resampling; Theorem 5.7 shows that if
the epipole p' lies outside the view window W' of the second image, then a
matching H (from the Theorem 4.5 family) is quasi-affine on some convex
sub-window W+ of the first image's window W.

# Assumptions

1. Point correspondences u_i <-> u_i' are given as input; establishing
   them is treated as solved upstream (the paper's own Algorithm Outline,
   Section 8 step 1, still requires an initial "seed set," found by hand or
   automatically — lines 575-577).
2. Central-projection (pinhole) camera model for both cameras (Section
   1.1 "Camera Model", lines 161-184).
3. The fundamental matrix F is known or has been estimated (linear
   8-point solution of eq. 3, optionally refined by nonlinear
   least-squares iteration — lines 578-581) and factors as
   F = [p']_x M with M non-singular (Proposition 2.2, lines 210-224).
4. The view window W (the rectangular/convex region of the image plane
   containing all matched points) does not necessarily contain the
   epipole — this is explicitly a soft assumption: if violated, the paper
   offers only a workaround (shrink the window, or pick a different
   projectivity), not a guaranteed construction (lines 429-432; see
   Failure regime).
5. Quasi-affine condition H'(W') ∩ L∞ = ∅ is a hard requirement for a
   topologically valid (non-tearing) resampling of the whole window
   (Section 5 definition, lines 420-422; Figure 1 shows the failure mode
   when this is violated).
6. The first-order "rigid near u0" approximation of G is stated to hold
   for |u/f| < 1 (line 306) — a soft precondition that degrades gracefully
   as points approach u/f = 1 (see Numerical sensitivity).

# Failure regime

- Non-quasi-affine resampling: if H(W) (or H'(W')) meets the line at
  infinity, the resampled image visibly splits into disconnected pieces
  (Section 5 intro, lines 408-413; Figure 1, comb example). This is a
  topological failure, not merely large distortion.
- Epipole inside (or very close to) the view window: the paper's own text
  states — as an informal remark, not a proven theorem — "If the epipole
  lies inside the view window of an image, the techniques of this paper
  may still be applied by considering a smaller view window. It is
  possible that the projectivity H' constructed in Section 3 is not
  quasi-affine, in which case the view window should be shrunk, or some
  other projectivity chosen" (lines 429-432). No guarantee of a valid
  full-window solution is proved for this regime; the only remedy offered
  is ad hoc window-shrinking. **Important correction to a common
  paraphrase**: Theorem 5.7 does *not* prove impossibility when the
  epipole is inside the image — see Provenance for the exact hypothesis.
- Even in the "good" regime, Theorem 5.7 only guarantees quasi-affinity of
  the *matching* transform H on a convex sub-window W+ ⊆ W of the first
  image (not necessarily all of W) — some part of W may still be
  unusable if it doesn't correspond to points inside W' (lines 439-449,
  516-523, Section 6.1 discussion of W(W+) vs W(W-)).
- Degenerate/near-degenerate correspondence sets: F is estimated by a
  linear method requiring >= 8 points (line 580); fewer, or points in
  special configuration, break the linear solve (not elaborated
  numerically in this paper).

# Numerical sensitivity

- The local-rigidity approximation of G is a series expansion valid for
  |u/f| < 1 (line 306): "(u, v, 1)(1 + u/f + . . .)". As the epipole
  distance f shrinks relative to the extent of the view window (epipole
  approaching the image), |u/f| approaches or exceeds 1 for points in the
  window, the first-order approximation breaks down, and the true mapping
  1 - u/f approaches zero, producing large-magnitude distortion near
  u = f. This connects directly to the quasi-affine failure discussed
  above: small f (epipole close to the window) is exactly the regime
  where both the rigidity approximation and the quasi-affine condition
  are stressed.
- The final matching-transform fit (A's parameters a, b, c) is linear
  least squares because A is restricted to an affine form (eq. 8); the
  paper explicitly flags that using a general projective A instead would
  make the problem non-linear (lines 401-404) — i.e., the affine
  restriction is what buys well-conditioned, closed-form estimation.
- F itself is computed by the classical linear (8-point-style) method as
  a least-squares solution of eq. (3), with the paper recommending
  iterative refinement to a nonlinear least-squares solution "for best
  results" (lines 579-581) — an acknowledgement that the plain linear
  estimate is not the final numerical target, though no conditioning
  analysis is given in this paper itself.
- Practical throughput reported: "possible to resample the images in
  about 20 seconds each for 1024 x 1024 images on a Sparc station 1A"
  (lines 655-657) — a 1999-era wall-clock data point, not a numerical
  precision claim.
- Text-fidelity caveat: the pdftotext extraction of eqs. (5)-(9) and the
  surrounding unnumbered least-squares expressions (lines 333-404)
  appears to drop the prime marks that distinguish first-image and
  second-image coordinates (e.g., "u_hat_i" is used in the extracted text
  where the typeset original likely reads u_hat_i for one image and
  u_hat_i' for the other). The *structure* of the minimization (affine
  fit of image-1 points to image-2 points, dropping the constant
  y-residual term) is unambiguous from context and is reproduced
  correctly above; the exact prime placement on individual symbols in
  lines 387-399 is marked here with `?` rather than guessed.

# Applicability

- Use when: two uncalibrated images with arbitrary (including wide)
  relative pose are available, a seed set of >= 7-8 point correspondences
  can be found, and the goal is either (a) turning the pair into a
  rectilinear-stereo-equivalent form to enable fast 1D correlation search
  for further point matches, or (b) projective 3D reconstruction without
  calibration (Introduction, lines 27-70; Section 7).
- Don't use when: the epipole lies inside, or very close to, the view
  window of either image (forward or near-forward motion) — this paper
  gives no proved construction guaranteeing a valid quasi-affine
  rectification of the whole window in that case (see Failure regime);
  later work on polar rectification targets exactly this regime.
- Compared against: Ayache et al.'s calibrated rectification, which uses
  known camera matrices and also handles the trinocular case (refs [1],
  [2], discussed in Introduction, lines 84-89) — the present method's
  point of differentiation is that it needs point correspondences only,
  not camera matrices.

# Connections

- Builds on: [longuet-higgins1981-eight-point] — the fundamental matrix F
  is explicitly attributed to Longuet-Higgins, ref [10] in the
  bibliography ("H.C. Longuet-Higgins, 'A computer algorithm for
  reconstructing a scene from two projections,' Nature, Vol. 293, 10
  Sept. 1981", lines 684-685; used throughout Section 2). Also builds on
  O. Faugeras's calibration-free-stereo framework: "Faugeras, O., 'What
  can be seen in three dimensions with an uncalibrated stereo rig?',
  Proc. of ECCV-92, ... 1992, pp. 563-578" (ref [4], lines 669-671); the
  Introduction states the paper's approach is "consistent with that
  advocated by Faugeras ([4]) of avoiding camera calibration" (line 19,
  echoed line 47). This Faugeras paper is not currently a registered
  paper ID in docs/papers/index.yaml as far as this note's author could
  determine — flagged with `?` for the page-authoring skill to resolve
  (register it, or drop the citation, per repo policy of only listing
  registered IDs).
- Also draws on the author's own prior work: R. Hartley, R. Gupta, T.
  Chang, "Stereo from Uncalibrated Cameras", CVPR-92 (ref [7], cited
  repeatedly for the calibration-free reconstruction result) and R.
  Hartley, "Cheirality Invariants", DARPA IU Workshop 1993 (ref [9]),
  which is the source of Theorems 5.8 and 5.9 used in the proof of
  Theorem 5.7 (lines 460-462, 466-473).
- Enables: see Atlas update plan below (downstream Atlas pages, not paper
  citations).
- Refutes / supersedes: none within this paper.
- **Verified: this paper's bibliography (refs [1]-[20], lines 660-711)
  does NOT include Hartley's 1997 "In Defense of the Eight-Point
  Algorithm."** A full-text search of the cached text for "In Defense"
  and for any 1997-dated Hartley reference returns no matches; the only
  Hartley self-citations are refs [7], [8], and [9], all dated 1992-1993.
  This holds even though docs/papers/index.yaml's `cites:` field for
  `hartley1999-projective-rectification` currently lists only
  `[longuet-higgins1981-eight-point]` (matching what was found here) —
  there was no actual discrepancy to reconcile in the index, but the
  absence of the 1997 paper from this paper's own bibliography is
  confirmed directly from the source text, not inferred from the index.

# Atlas update plan

## NEW: hartley-projective-rectification
Type: algorithm
Category: geometry
Primary source: this paper
tasks: [stereo-rectification]
tags: ["stereo", "two-view-geometry", "classical"]
domain: geometry
difficulty: advanced
prerequisites: [stereo-rectification, epipolar-geometry, homography]
sources.primary: hartley1999-projective-rectification
sources.references: curate against the paper's actual bibliography. Verified: the paper cites Longuet-Higgins 1981 (ref [10]) -> longuet-higgins1981-eight-point. Verified: the paper does NOT cite Hartley's 1997 "In Defense of the Eight-Point Algorithm". Only list paper IDs that exist in docs/papers/index.yaml.

Relations (author on this page only):
1. { type: parallel_foundation_with, target: loop-zhang-rectification, confidence: high, caution: "Loop-Zhang minimises rectification distortion explicitly; Hartley minimises disparity." }
2. { type: compared_with, target: pollefeys-polar-rectification, confidence: high, caution: "Planar rectification is undefined when the epipole falls inside the image; polar rectification is the fallback for forward motion." }

Note: fusiello-compact-rectification carries a compared_with edge pointing AT this page (authored on that page's side). Do not duplicate it here — symmetric relation types are authored on one side only.

Explicitly REJECTED edges (recorded as non-edges, with reasoning; do not add these):
- No feeds_into from fundamental-matrix-eight-point: rectification consumes the matrix F as a runtime input, not an intellectual/compositional building block relationship — this is data-flow, not lineage, so no edge is warranted.
- No edge to geometric-bev: different problem class (bird's-eye-view geometry is not two-view stereo rectification).
- No edge to camera-distortion-models: different concern (lens distortion models vs. projective epipolar rectification).

Forward-reference caveat: stereo-rectification, loop-zhang-rectification, and pollefeys-polar-rectification do not exist under content/ yet as of this note's creation (2026-07-19). This Atlas update plan is written in anticipation of those pages; the algo-page skill run for hartley-projective-rectification must re-verify these slugs exist on disk before writing relations/prerequisites into the actual page frontmatter (per CLAUDE.md: "Verify slugs exist on disk before adding them").

Page section bullets:
- Goal: resample a stereo image pair, given only the fundamental matrix (no calibration), into a matched-epipolar-projection pair where epipolar lines are horizontal (parallel to x-axis) and disparities are purely horizontal — enabling fast dense matching and 3D reconstruction without camera calibration.
- Algorithm: (1) compute F from point correspondences (Longuet-Higgins eight-point or equivalent, upstream of this page); (2) find the epipole e' in the second image as the left null vector of F; (3) construct H' as a composition of a translation centering the image, a rotation aligning e' with the x-axis, and a projective transform sending e' to the point at infinity (1,0,0)^T, subject to the quasi-affine constraint that no scene point maps behind the camera; (4) derive the corresponding H for the first image via the compatible epipolar-line mapping from F; (5) refine H by least-squares fitting to minimise sum_i (x_i - x'_i)^2 over matched point pairs x_i <-> x'_i, holding the epipolar-line correspondence fixed; (6) resample both images through H and H'.
- Implementation: note the least-squares matching-transform step (minimising sum (x_i - x'_i)^2) as the practical core of the method — this is what a from-scratch implementation must get right; the quasi-affine epipole-to-infinity construction is the theoretical justification for why any valid H' exists in the first place.
- Remarks: the method fails (no valid quasi-affine H') when the epipole lies inside the image bounds — see the theorem number found in the cached text for the exact statement; this is the standard motivation for polar rectification (Pollefeys) as a fallback for forward/near-forward motion.
- References: this paper (primary); Longuet-Higgins 1981 (fundamental matrix); Faugeras calibration-free stereo (background).

# Provenance

- Abstract, lines 12-24: statement of the problem (matched epipolar
  projections), method basis (fundamental matrix), and design goal
  (minimal distortion, fast resampling).
- Introduction, lines 27-91: relation to Longuet-Higgins/Faugeras
  calibration-free framework (line 19, 35, 47); definition of "rectilinear
  stereo rig" (lines 51-57); statement that both H and H' minimize
  distortion (lines 63-65) and that the method additionally minimizes
  horizontal disparity to shrink the matching search range (lines 89-91);
  comparison to Ayache et al. calibrated rectification (refs [1],[2],
  lines 84-89).
- Section 1.1 Preliminaries, lines 102-184: notation ([t]_x skew matrix,
  eq. 1, lines 111-115; Proposition 1.1, M* [t]_x = [Mt]_x M, eq. 2, lines
  124-126); pinhole camera model P = (M | -Mt), lines 161-184.
- Section 2 Epipolar Geometry, lines 187-276: definition of epipole and
  fundamental matrix; eq. (3) u_i'^T F u_i = 0 (line 206); Proposition 2.2
  (F factorization F = [p']_x M, epipoles as null vectors of F / F^T,
  lines 212-220); Proposition 2.3 (non-uniqueness of the factorization,
  lines 229-238); Proposition 2.4 (characterization of epipolar-line-
  preserving maps M, lines 249-270).
- Section 3 "Mapping the Epipole to Infinity," lines 279-320: eq. (4), the
  G matrix (lines 297-303); mapping of (u,v,1)^T under G and its series
  expansion for |u/f| < 1 (lines 304-309); Jacobian at the origin (lines
  310-314); H = G R T construction (lines 316-320).
- Section 4 "Matching Transformations," lines 323-404: matched-pair
  definition (lines 324-330); minimization objective eq. (5) (lines
  333-336); Theorem 4.5 and its proof, eq. (6)-(7) (lines 341-365);
  Corollary 4.6, eq. (8) (lines 366-378); reduction to affine least
  squares, eq. (9) and the two unnumbered follow-on equations (lines
  379-399); note on linearity depending on the affine restriction (lines
  401-404); reference to Numerical Recipes [14] for the linear
  least-squares solve (line 402).
- Section 5 "Quasi-affine Transformations," lines 407-499: definition of
  non-quasi-affine projectivity and Figure 1 comb example (lines 408-413);
  view-window definition (lines 414-419); quasi-affine definition w.r.t.
  L∞ (lines 420-422); existence claim for epipole outside W (lines
  422-428); **informal remark on epipole inside the view window — not a
  theorem — offering window-shrinking as the only stated remedy** (lines
  429-432); **Theorem 5.7, exact hypothesis "Suppose the epipole p' in
  image J' does not lie in W'"** (lines 439-443), conclusion that a
  quasi-affine sub-window W+ ⊆ W exists for the matching transform H
  (lines 442-449); supporting Theorem 5.8 (quasi-affinity iff constant
  sign of scale factors alpha_i, lines 466-468) and Theorem 5.9 (constant
  sign of w_i w_i' for realizable point sets, lines 470-473), both proved
  in Hartley's separate "Cheirality Invariants" paper [9] per line 462;
  proof of Theorem 5.7 (lines 477-498).
- Section 6 Resampling, lines 502-536: output-window determination via
  H'(W') and H(W_+) intersection (lines 508-523); per-pixel inverse
  mapping and linear interpolation, with a pointer to Wolberg [20] for
  more sophisticated interpolation if aliasing matters (lines 526-536).
- Section 7 Scene Reconstruction, lines 539-564: reconstruction formula
  P=(I|0), P'=(I|(1,0,0)^T), x_i=(u_i,v_i,1,delta_i)^T (lines 543-546);
  points-at-infinity artifact when disparity delta_i = 0 and the fix by
  translating one image by alpha in x so that delta_i + alpha > 0 for all
  i (lines 552-564).
- Section 8 Algorithm Outline, lines 567-594: five-step summary,
  including the explicit "Seven points at least are needed" (step 1, line
  576) versus "requiring eight point matches or more" for the linear F
  computation (step 2, line 580) — both counts appear verbatim in the
  text and are reproduced above without reconciling them, since the paper
  itself does not reconcile them (step 1's 7 plausibly refers to a
  minimal-solution possibility that the paper does not elaborate;
  marked `?`).
- Conclusion, Section 10, lines 648-657: timing benchmark ("about 20
  seconds each for 1024 x 1024 images on a Sparc station 1A", lines
  656-657).
- References, lines 660-711 (refs [1]-[20]): full bibliography, checked
  exhaustively for any 1997-dated Hartley entry or "In Defense of the
  Eight-Point Algorithm" title — none found. Faugeras ECCV-92 entry at
  ref [4] (lines 669-671); Longuet-Higgins 1981 entry at ref [10] (lines
  684-685).
