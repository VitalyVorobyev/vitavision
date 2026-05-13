---
paper_id: tomasi1991-detection-tracking
title: "Detection and Tracking of Point Features"
authors: ["C. Tomasi", "T. Kanade"]
year: 1991
url: https://kilthub.cmu.edu/articles/journal_contribution/Detection_and_tracking_of_point_features/6603148
created: 2026-05-13
relevant_atlas_pages: [shi-tomasi-corner-detector, lucas-kanade, structure-tensor]
---

# Setting

Problem class: selection and frame-to-frame tracking of point features in a
monocular image stream, as the feature-extraction front end for the factorization
shape-and-motion pipeline of Tomasi and Kanade (CMU-CS-90-166 and CMU-CS-91-105).
Inputs: a discrete image sequence $I(x, y, t)$ where consecutive frames differ
by small camera motion — the paper's experiments use a 100-frame translation
sequence with ≈1 pixel inter-frame displacement (chap. 5, §5.2). Output: a list
of pixel-coordinate tracks $\{(x_i(t), y_i(t))\}$, one per surviving feature
window, each maintained at sub-pixel accuracy by Newton-Raphson iteration on the
brightness residual; the experiments terminate iteration when the displacement
update falls below $1/100$ pixel.

# Core idea

The report fuses two contributions into one framework. (i) It rederives the
Lucas-Kanade $2\times2$ displacement system for a translating window $W$ from
a physical argument: linearise $I(\mathbf{x}-\mathbf{d}) \approx I(\mathbf{x})
- \mathbf{g}\cdot\mathbf{d}$, minimise the weighted squared residue
$\varepsilon = \int_W (h - \mathbf{g}\cdot\mathbf{d})^2 w\,dA$ with
$h = I-J$, and obtain (eq. 3.2) $G\mathbf{d} = \mathbf{e}$ where
$G = \int_W \mathbf{g}\mathbf{g}^T w\,dA$ and
$\mathbf{e} = \int_W (I-J)\mathbf{g}\,w\,dA$. (ii) From the same $G$ it derives
a feature-selection criterion intrinsic to the tracking algorithm: a window can
be tracked well iff $G$ is above the noise level and well-conditioned, which is
implied by $\min(\lambda_1, \lambda_2) > \tau$ (eq. 4.1) where
$\lambda_1, \lambda_2$ are the eigenvalues of $G$. The threshold $\tau$ is set
empirically by histogramming the minor eigenvalues of an image and picking a
value in the gap between the uniform-region cluster and the
textured-region cluster — the experiments use $\tau = 10$ (§5.1).

# Assumptions

1. Brightness constancy under translation: $I(x, y, t+\tau) = I(x-\xi, y-\eta, t)$
   (eq. 2.1). Hard — violated at occluding boundaries and view-dependent
   reflectance.
2. Inter-frame displacement is small relative to the texture scale within the
   window, so the Taylor linearisation $I(\mathbf{x}-\mathbf{d}) \approx
   I(\mathbf{x}) - \mathbf{g}\cdot\mathbf{d}$ is accurate within $W$ (chap. 3).
   Soft — fails when the patch is high-curvature in intensity, fixed by
   iteration.
3. Local rigidity: the same physical surface patch projects to the window in
   both frames, so a single displacement vector $\mathbf{d}$ describes the
   whole window. Hard — sliding occlusions (feature 45 in §5.2) silently violate
   this without changing window appearance.
4. The smaller eigenvalue $\lambda_2$ alone gates conditioning: when
   $\lambda_2 > \tau$ the matrix $G$ is generally also well-conditioned because
   pixel-value bounds cap the larger eigenvalue (§4 final paragraph). Soft —
   relies on bounded dynamic range.
5. Pure translation is an adequate window-deformation model: the report argues
   that more parameters (affine warp) would require larger windows, increasing
   the chance of straddling depth or occlusion discontinuities (chap. 2,
   "The Approach", final paragraphs).

# Failure regime

- Glossy or highly slanted surfaces produce frame-to-frame appearance change
  large enough that the translation model needs many iterations or fails to
  converge. The experiments report feature 79 lost at frame 40 because the
  $2\times2$ solve had not converged within 10 iterations (it would have needed
  14) on a glossy mug surface at substantial slant (§5.2).
- Occluding-edge straddling: a window placed across an occluding boundary
  contains points moving at different velocities; the single-translation fit
  produces a biased displacement. The report observes this for feature 2 with a
  $31\times31$ window where the artichoke boundary entered partway through the
  sequence and caused a 3-pixel horizontal / 0.8-pixel vertical error
  (§5.2 "Window Size and Occlusion"; figs. 5.10–5.11).
- Sliding aperture: when the local appearance does not change but the underlying
  3-D feature point slides along an edge intersection, the tracker reports a
  consistent track that is physically meaningless. Feature 45 (intersection of
  artichoke boundary with traffic-sign edge) exemplifies this; the report notes
  the failure can only be detected at a higher 3-D processing stage
  ("False Features", §5.2).
- Aperture problem on straight edges: the report observes no features are
  selected along the straight mug edges because $\lambda_2 \approx 0$ there
  (§5.1, fig. 5.5). The criterion rejects them by construction — this is a
  designed-in pass-through, not a failure of detection.

# Numerical sensitivity

- The selection threshold $\tau$ is set from the histogram gap between
  noise-level $\lambda_2$ (≈0) and textured-region $\lambda_2$ (the upper
  cluster). The report notes "the value of $\tau$, chosen halfway in-between,
  is not critical" — robustness comes from the bimodal distribution of
  $\lambda_2$ on a textured scene (§4 final paragraph; fig. 5.4 shows a gap
  between near-zero and a cluster reaching ≈300 for the $15\times15$ window
  used).
- Iterations apply bilinear-interpolation resampling to achieve sub-pixel
  accuracy at each Newton-Raphson step (§3, end). Convergence to $1/100$ pixel
  is reached in fewer than 5 iterations for typical features (§5.2 opening).
- Window size trades noise rejection (favours larger $W$) against
  occlusion/distortion exposure (favours smaller $W$). The experiments use
  $15\times15$ as a working compromise; the $31\times31$ comparison
  demonstrates the failure mode described above (§5.2).
- Conditioning of $G$ at acceptance threshold: the report's argument that
  $\min(\lambda_1, \lambda_2) > \tau$ implies acceptable conditioning rests on
  the pixel-value upper bound for $\lambda_{max}$. For 8-bit imagery with
  $\lambda_2 = 10$ accepted, the conditioning number is bounded but not
  uniformly small; the report does not quantify the bound explicitly.
- Cumulative residue $\rho(t)$ — defined as the RMS intensity difference
  between the first and the current window — grows at ≈1 intensity level per
  pixel per 100 frames for surviving features in the experiments (fig. 5.9).
  A residue threshold (dashed line in fig. 5.9) detects six of the genuine
  occlusions; the false alarms are on a glossy mug area where reflection
  changes the pattern without true occlusion.

# Applicability

- Use when: small-motion, frame-to-frame point tracking is needed on textured
  surfaces — KLT-style sparse trackers, gradient-based visual-odometry
  front-ends, structure-from-motion pipelines that consume sparse 2-D tracks.
- Don't use when: motion between frames is large relative to texture scale
  (requires a coarse-to-fine pyramid not described here, but compatible);
  scenes are dominated by occluding edges or specular reflections; the
  application needs dense flow (use a dense optical-flow method instead).
- Compared against: the Moravec interest operator ("high standard deviation"),
  Marr-Poggio-Ullman zero-crossings of the Laplacian, and the
  Kitchen-Rosenfeld / Dreschler-Nagel corner operators. The report's claim is
  that the $\min(\lambda_1, \lambda_2)$ criterion subsumes these because it
  is derived from the conditioning of the same tracking system that consumes
  the features, rather than from an a-priori "interesting window" notion (§4).

# Connections

- Builds on: lucas1981-lucas-kanade (the $2\times2$ system; eq. 3.2 of the
  present report is a rederivation), horn1981-horn-schunck (cited for the
  aperture-problem framing).
- Enables: shi-tomasi1994-features (CVPR 1994 paper by Shi and Tomasi that
  extends the present report with an affine-model dissimilarity test for
  tracked features), and by extension every KLT-tracker variant that uses the
  $\min(\lambda_1, \lambda_2)$ criterion.
- Refutes / supersedes: none — the report explicitly positions itself as a
  systematic replacement for ad-hoc "interest operators" rather than a
  refutation of any specific predecessor.

# Atlas update plan

This 1991 CMU tech report is the original written derivation of two things
already on the Atlas: the physical rederivation of the LK $2\times2$ system
(`lucas-kanade`) and the eigenvalue-based feature-selection criterion
(`shi-tomasi-corner-detector`). The 1994 CVPR paper by Shi and Tomasi
(`shi-tomasi1994-features`) is the canonical citation for the corner-detector
page because it adds the affine-consistency dissimilarity test, but the
selection criterion itself first appeared here. The role is therefore
**supplementary update** for both pages — add this paper as a `sources.references[]`
entry and use it to anchor specific claims that the 1994 paper does not contain.

No new Atlas page is warranted: the selection criterion and the LK tracker are
already covered; a "KLT tracker" page would be a duplicate of
`lucas-kanade` plus the eigenvalue criterion already cited inside that page.

## UPDATE: shi-tomasi-corner-detector
Section: References / Remarks / sources.references

Bullets:
- Add `tomasi1991-detection-tracking` to `sources.references[]`. This is the
  original derivation of the $\min(\lambda_1, \lambda_2) > \tau$ acceptance
  rule (eq. 4.1). The 1994 paper extends rather than replaces it.
- In Remarks, optionally add: "The eigenvalue acceptance rule was first
  introduced in the CMU-CS-91-132 technical report (Tomasi and Kanade 1991)
  alongside a rederivation of the LK 2×2 system. The 1994 CVPR paper adds a
  dissimilarity-based occlusion check using an affine warp model." Cite as
  reference 3.
- Threshold-setting recipe (§5.1, fig. 5.4): histogram the minor eigenvalues
  of the image, look for a gap between the noise-cluster and the
  textured-region cluster, and pick $\tau$ in the gap. The 1991 report uses
  $\tau = 10$ for a $15\times15$ window on 8-bit imagery — concrete and
  reportable. Currently the Atlas page describes $\tau$ as "a feature-tracking
  quality bound" but does not show the empirical histogram-gap recipe; this
  is a one-paragraph addition under Remarks or as a side note under the
  Procedure block.
- Window-size guidance (§5.2): smaller windows minimise straddling of depth /
  occlusion discontinuities but are more sensitive to noise; the canonical
  $15\times15$ comes from this trade-off, not from any optimality argument.
  This could be added to Remarks if window-size choice is on the page's
  agenda.

Relations: none. (The corner detector is sourced from the 1994 paper as
primary; the 1991 report is supplementary background, not a typed Atlas
relation. Relations are between Atlas pages, not between papers.)

## UPDATE: lucas-kanade
Section: Remarks / Implementation / sources.references

Bullets:
- Add `tomasi1991-detection-tracking` to `sources.references[]`. The 1991
  report rederives the same $2\times2$ system from a physical-gap argument
  (eq. 3.2 here = the 2-D translation kernel on the Atlas page) and is the
  most readable source for the geometric interpretation of the structure
  tensor $G$ in the tracking context.
- The "physical interpretation" of the residue (§3, "Physical Interpretation"):
  if two copies of the intensity surface are translated by $\delta = d \cdot u$
  along the gradient direction $u$, the vertical gap $h = I - J$ satisfies
  $h \approx \delta\,g = (\mathbf{g}\cdot\mathbf{d})$. This is the
  one-equation, one-paragraph derivation of $\mathbf{g}\cdot\mathbf{d} = h$
  (eq. 3.3 of the report). Could be added as a sidebar or "Physical
  interpretation" subsection inside the Atlas page's Algorithm section if
  pedagogical clarity is desired.
- Convergence anecdote (§5.2): typical features stabilise within fewer than
  5 Newton iterations to $1/100$-pixel displacement accuracy on a smooth
  translating scene; pathological features (e.g. glossy slant) can need more
  than 10. This is a concrete number to drop into Remarks under the
  basin-of-attraction bullet.
- Cumulative-residue occlusion gate (§5.2, fig. 5.9): an RMS intensity
  difference between the first and current window grows linearly under good
  tracking (≈1 intensity unit per pixel per 100 frames in the experiments);
  thresholding this signal detects most occlusion events without an explicit
  affine consistency check. This belongs in a Remarks bullet if occlusion
  handling is in scope for the Atlas page.

Relations: none. The 1991 report does not introduce a new method that would
warrant a typed `relations[]` entry; it deepens the existing
`lucas-kanade` ↔ `shi-tomasi-corner-detector` `extended_by` edge already
authored on the LK page.

# Provenance

- Eq. 2.1 (brightness constancy): chap. 2, eq. 2.1.
- Eq. 2.2 (additive-noise local model): chap. 2, eq. 2.2.
- Eq. 2.3 (residue $\varepsilon$ over $W$): chap. 2, eq. 2.3.
- Eq. 3.1 (linearised residue): chap. 3, eq. 3.1.
- Eq. 3.2 ($G\mathbf{d} = \mathbf{e}$ tracking system): chap. 3, eq. 3.2.
- Eq. 3.3 ($\mathbf{g}\cdot\mathbf{d} = h$ single-pixel constraint): chap. 3,
  eq. 3.3.
- Eq. 4.1 ($\min(\lambda_1, \lambda_2) > \tau$ acceptance rule): chap. 4,
  eq. 4.1.
- Empirical $\tau = 10$ at $15\times15$ window, 8-bit imagery, gap visible in
  the minor-eigenvalue histogram: §5.1, fig. 5.4 caption.
- Iteration count "fewer than 5" to $1/100$-pixel accuracy: §5.2 opening
  sentence ("Each feature required typically fewer than five iterations of the
  basic tracking step (see equation 3.2) to stabilize the displacement
  estimate to within one hundredth of a pixel").
- Feature 79 needing 14 iterations on glossy slant: §5.2 paragraph after the
  217/226 survival count.
- 217 of 226 features surviving 100 frames, 6 leaving the right boundary:
  §5.2 paragraph after the convergence sentence.
- Cumulative-residue growth rate "≈1 intensity level per pixel per 100
  frames" and residue-threshold occlusion gate (features 7, 8, 12, 16, 17,
  97 flagged): §5.2 paragraph following fig. 5.9.
- $31\times31$ window error (3 px horizontal, 0.8 px vertical) on feature 2:
  §5.2 "Window Size and Occlusion" paragraph; figs. 5.10–5.11.
- Sliding-aperture feature 45 (artichoke ∩ traffic-sign edge): §5.2 "False
  Features" paragraph.
- "Selection criterion is optimal by construction" claim and the listed
  alternative interest operators (Moravec; Marr-Poggio-Ullman; Kitchen-Rosenfeld;
  Dreschler-Nagel): chap. 1, paragraphs 4–6, and chap. 4, opening.
- Pure-translation vs affine-warp argument (small windows favour few
  parameters): chap. 2, "The Approach", final paragraphs.
