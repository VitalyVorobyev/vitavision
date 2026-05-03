---
paper_id: shi-tomasi1994-features
title: "Good Features to Track"
authors: ["J. Shi", "C. Tomasi"]
year: 1994
url: https://www.ces.clemson.edu/~stb/klt/shi-tomasi-good-features-cvpr1994.pdf
created: 2026-05-01
relevant_atlas_pages: [shi-tomasi-corner-detector, harris-corner-detector, pyramidal-blur-aware-xcorner]
---

# Setting

**Problem class.** Three distinct subproblems, addressed jointly:

1. **Feature selection** — pick image points that the tracker will succeed on.
2. **Feature tracking** — estimate per-feature inter-frame displacement (pure translation) and longer-baseline deformation (affine).
3. **Feature monitoring** — detect when a tracked feature has become unreliable (occlusion, glossy reflection, depth-edge straddling).

The atlas's `shi-tomasi-corner-detector` page covers (1) only. The KLT-style tracker and affine monitoring components (2), (3) belong on a separate tracker page if one is added — they are not currently captured publicly.

**Inputs.** Grayscale image sequence $\{I, J, \ldots\}$. For selection, a single grayscale image $I : \Omega \to \mathbb{R}$ is enough. Window size is fixed (the paper uses $25 \times 25$). No calibration assumptions. Inter-frame motion expected to be small (the paper's experiments use a forward-moving camera at 2 mm/frame); large baselines require coarse-to-fine pyramids that this paper does not describe.

**Outputs.**
- Selection: integer pixel locations passing $\min(\lambda_1, \lambda_2) > \tau$, where $\lambda_1, \lambda_2$ are eigenvalues of the gradient covariance $Z$ over the window.
- Tracking: per-feature 2-DOF translation $d$ from solving $Zd = e$ (eq 7), or 6-DOF affine $\{D, d\}$ from solving $Tz = a$ (eq 5).
- Monitoring: per-feature dissimilarity time series $\varepsilon(t)$; abrupt jumps indicate the rigid-feature assumption has been violated.

**Guarantees.** The selection criterion is "optimal by construction" — derived from the conditioning of the linear system that the tracker actually solves, not from a heuristic notion of cornerness. The threshold $\tau$ is left as a free parameter; the paper says only "$\lambda$ is a predefined threshold" (§4, eq 8) and gives no numerical value.

# Core idea

Tracking a feature window from one frame to the next reduces, after Taylor-expanding the dissimilarity (eq 3) and assuming pure translation, to the $2 \times 2$ linear system

$$Z d = e \quad (\text{eq 7})$$

where

$$Z = \iint_W \begin{bmatrix} g_x^2 & g_x g_y \\ g_x g_y & g_y^2 \end{bmatrix} w\, dx \quad (\text{eq 6})$$

is the gradient covariance over the window — **the same matrix Harris and Stephens use as $M$, but motivated here by the tracker's conditioning rather than by autocorrelation of intensity shifts**. For $Zd = e$ to have a numerically reliable solution, $Z$ must be (a) above the image-noise floor (both eigenvalues large enough that the right-hand side $e$ is not dominated by noise) and (b) well-conditioned (eigenvalues of similar magnitude, so the inverse does not amplify a single component disproportionately). Both conditions reduce to one inequality:

$$\min(\lambda_1, \lambda_2) > \tau \quad (\text{eq 8}).$$

A feature with two small eigenvalues is a flat region; a feature with one large and one small eigenvalue is a 1-D edge (the aperture problem); a feature with two large eigenvalues is a corner, salt-and-pepper texture, or any pattern that anchors the linear system.

The paper's second contribution is a $6 \times 6$ affine extension of Lucas-Kanade: solve $Tz = a$ (eq 5) for the deformation matrix entries plus translation, by Newton-Raphson iteration. The translation system $Zd = e$ is a strict subblock and is preferred for inter-frame tracking because it has lower variance; the full affine system is used only for feature monitoring (comparing the current frame to the first) where the deformation accumulated over many frames is no longer small.

# Assumptions

1. (hard) The displacement model is parametric — pure translation between adjacent frames, affine between distant frames. Non-rigid features (glossy reflections, intersections at different depths) violate the model in ways the dissimilarity may or may not catch.
2. (hard) The feature window does not straddle a depth discontinuity. If it does, the window is not attached to a fixed world point and tracking diverges; the paper notes (§1) "smaller windows are in general preferable for tracking because they are less likely to straddle a depth discontinuity."
3. (soft) Inter-frame motion is small enough that the Taylor linearization of $J(Ax+d) \approx J(x) + g^T u$ (eq 4) is valid. Newton-Raphson iteration corrects within a basin of attraction; large displacements require a coarse-to-fine pyramid (not described in this paper).
4. (hard) $Z$ is full-rank (both eigenvalues nonzero). Pure 1-D edges fail by construction — one eigenvalue is zero, the linear system is rank-deficient along the edge direction, and the criterion correctly rejects the feature.
5. (soft) Image noise is bounded and approximately Gaussian. The threshold $\tau$ is implicitly chosen as a multiple of the expected gradient-noise variance scaled by the window area; the paper provides no numerical value.
6. (hard) Gradient kernels are accurate enough that $Z$ matches the true autocorrelation. The paper does not specify the kernel; in practice $(-1, 0, 1)$ central differences or Sobel kernels are used (same as Harris).

# Failure regime

- **1-D edges (aperture problem).** A vertical or horizontal edge in the window yields $\lambda_1 \gg 0$ but $\lambda_2 \approx 0$. The selection criterion correctly rejects. The tracker, when given such a window despite this, recovers the determinable component of motion via pseudo-inverse and reports zero along the undetermined direction — but the rejection is the safer behaviour at the selection stage.
- **Repeated / aliased texture.** Features whose detail is at scale comparable to a pixel produce erratic dissimilarity (figure 15 in the paper, dashed curves for features 24 and 60). This is fundamentally a Nyquist-sampling failure: pixel-scale lettering cannot be reliably tracked at the chosen window size. The dissimilarity monitor catches it post-hoc; the selection criterion does not.
- **Glossy / non-rigid features.** A bright spot on a glossy surface satisfies the texture criterion but violates the rigid-world assumption. The paper acknowledges in §8: "rigidity is not a local feature, so a local method cannot be expected to always detect its violation."
- **Occluding boundaries.** Feature window straddling a depth discontinuity. Tracking diverges and produces a sharp jump in dissimilarity (figure 3, occlusion of feature 89 around frame 4). Detected by the monitor, not by the selection criterion.
- **Insufficient texture.** Large constant regions: $\lambda_1 \approx \lambda_2 \approx 0$. Correctly rejected by the selection criterion.
- **Subpixel accuracy.** The selection produces integer pixel locations only. Subpixel localisation requires a separate refinement step, e.g., iterated centroid or saddle-fitting.

# Numerical sensitivity

- **Eigenvalue computation.** $\lambda_2 = \min(\lambda_1, \lambda_2) = \tfrac{1}{2}\bigl(\operatorname{tr}(Z) - \sqrt{\operatorname{tr}(Z)^2 - 4 \det(Z)}\bigr)$. The discriminant $\operatorname{tr}(Z)^2 - 4\det(Z) = (\lambda_1 - \lambda_2)^2$ is non-negative by construction, but finite-precision arithmetic can produce a small negative value; clamp to zero before $\sqrt{}$.
- **Threshold $\tau$ choice.** The paper does not give a numerical $\tau$. In practice $\tau$ is chosen as a multiple of the expected noise variance scaled by the window area, or set adaptively so that a target number of features is selected per frame. The criterion is *cross-image-inconsistent under exposure changes* in the same way Harris is: under intensity scaling $I \to \rho I$, $\lambda_1, \lambda_2$ scale as $\rho^2$, so $\tau$ must be scaled by $\rho^2$ to maintain the same detection rate.
- **Affine system conditioning ($T$).** The $6 \times 6$ matrix $T$ (eq 6) can be rank-deficient when one or more deformation components are unobservable. The paper recommends pseudo-inverse + minimum-norm solution rather than direct LU on a near-singular $T$ (§4, last paragraph).
- **Newton-Raphson convergence.** The paper's simulations (figure 6) report convergence in 19 iterations from up to ~30% deformation under 16% noise. Convergence basin is wide for rigid features; aliased texture causes divergence (figures 7, 15).
- **Window size vs. depth discontinuity.** Smaller windows are less likely to straddle a depth discontinuity, but smaller windows also produce noisier $Z$ estimates. The paper does not give a principled rule; $25 \times 25$ is used in the experiments.
- **Integer vs. floating point.** Same as Harris: $g_x^2$ and $g_y^2$ on 8-bit images can overflow 16-bit accumulators; use 32-bit integer or float32 throughout.

# Applicability

- Use when: the downstream consumer is a gradient-based tracker (KLT, sparse optical flow, direct visual odometry frontends like DSO). The criterion is *directly motivated by* the tracker's conditioning requirement and inherits its theoretical basis.
- Use when: a parameter-free corner score is needed. $\min(\lambda_1, \lambda_2)$ has no analogue of Harris's $k$.
- Don't use when: the consumer of the corner is a descriptor-based matcher (SIFT, ORB, learned descriptors). The score's interpretation as "tracking quality" is moot; Harris response or DoG works similarly with a more compact closed form (no square root).
- Don't use when: subpixel accuracy below 0.5 pixels is required. Integer-pixel output only; needs a separate refinement step.
- Don't use when: real-time performance on minimal-arithmetic embedded hardware is the primary constraint — FAST replaces the full structure-tensor pipeline with ring-pixel comparisons at much lower cost.
- Don't use when: the input is a calibration target. Specialized X-corner detectors (ChESS, ROCHADE, OCPAD, Duda-Radon) exploit 4-fold symmetry and produce subpixel accuracy at lower false-positive rate.
- Compared against:
  - **Harris (1988):** identical $M$, different response function. Harris computes $R = \det(M) - k\cdot\operatorname{tr}(M)^2$; Shi-Tomasi computes $R = \min(\lambda_1, \lambda_2)$. Harris has a free $k$ in $[0.04, 0.06]$; Shi-Tomasi has none. Harris's response is positive on corners and negative on edges (combined corner/edge output); Shi-Tomasi is corner-only by construction. Costs are identical up to one square root per pixel for Shi-Tomasi.
  - **Förstner (1987):** uses $\det(M)/\operatorname{tr}(M)$ — the harmonic mean — also derived from a quality criterion. Different response, similar spirit.
  - **Kitchen & Rosenfeld (1980):** gray-level corner detection via curvature; cited as upstream texturedness measure.
  - **Moravec (1980):** discrete-shift cornerness; replaced by both Harris and Shi-Tomasi.

# Connections

- Builds on: harris1988-corner (same $M$, different response derivation; Harris is cited as the closest "interest operator" and explicitly contrasted with the tracking-quality criterion in §4 of the paper).
- Builds on: lucas-kanade 1981 (same Newton-Raphson tracker for translation; Shi-Tomasi extends the formulation to affine deformation). lucas-kanade is not currently in `docs/papers/index.yaml`; would warrant addition if a KLT-tracker page is created.
- Enables (in the atlas):
  - shi-tomasi-corner-detector — primary source for the existing page.
  - pyramidal-blur-aware-xcorner — uses $\min(\lambda_1, \lambda_2)$ as a cascade filter for X-corner candidates (§III-A of the abeles paper, per its notes).
  - All future feature-tracker / optical-flow / SLAM-frontend pages would cite this as the canonical selection criterion.
- Enables (outside the atlas, not actionable here): KLT tracker implementations in OpenCV (`cv::goodFeaturesToTrack`), MATLAB (`detectMinEigenFeatures`), and most open-source visual-odometry stacks; learned-descriptor pipelines (SuperPoint, XFeat) implicitly target this kind of trackability when training their detector heads.
- Refutes / supersedes: Moravec's discrete-shift cornerness (replaced by the differential autocorrelation eigenvalue argument).

# Atlas update plan

## UPDATE: shi-tomasi-corner-detector

The existing page is well-grounded. The central claims are correct: response is $\min(\lambda_1, \lambda_2)$, computed in closed form from $\operatorname{tr}/\det$, threshold has a tracking-quality interpretation, no free sensitivity parameter, rotation-invariant, $O(|\Omega|)$ complexity.

Section: Goal
- The phrase "derived in §3 of the paper" is slightly off. The criterion is stated in §4 (Texturedness), with the linear system that motivates it set up in §3 (Computing Image Motion). Replace with: "derived in §4 from the conditioning of the linear system (§3, eq 7) that governs feature displacement under pure translation tracking."

Section: Algorithm
- The structure-tensor definition currently calls $M$ "identical to the structure tensor of Harris." More accurate phrasing: $M$ is the gradient covariance / autocorrelation matrix used by both Harris and Shi-Tomasi, but motivated differently — Harris derives it from the autocorrelation surface of intensity shifts (§AUTO-CORRELATION DETECTOR of the Harris paper), Shi-Tomasi from the linear system $Zd = e$ that the translation tracker actually solves (§3 of this paper, eq 7). One added sentence: "In the paper this matrix appears as $Z$, the $2 \times 2$ block of the larger $6 \times 6$ matrix $T$ governing affine motion estimation (§3, eq 6)."
- Procedure step 5 says "preventing reliable displacement estimation (§3 of the paper)." Same correction: refer to §4 (eq 8) for the criterion, §3 for the displacement system that motivates it.

Section: Remarks
- **Add bullet — contrast scaling.** Same as Harris: under intensity scaling $I \to \rho I$, eigenvalues scale as $\rho^2$, so the threshold $\tau$ must be adapted per-image. The paper is silent on adaptive thresholding (§4 says only "$\lambda$ is a predefined threshold"). This is a practical concern for cross-image consistency.
- **Add bullet — optimality argument.** The criterion is "optimal by construction" because it derives directly from the conditioning of the tracking system, not from a heuristic notion of cornerness. This is the load-bearing claim of the paper's introduction and abstract; the existing Goal section already mentions it but a Remarks bullet makes it indexable.
- **Optional bullet — scope.** The paper covers selection + tracking + affine monitoring; this page covers selection only. The tracking and monitoring components (Newton-Raphson minimization of equations (3)-(5), affine dissimilarity-based monitoring) would belong on a separate KLT or feature-tracker page if one is added. Worth flagging since "Good Features to Track" is more than just a corner detector.

Section: References
- Already correct (Shi-Tomasi + Harris). No change.

## UPDATE: harris-corner-detector

Per `docs/README.md` §4, the Harris page is the host for the `## When to choose Harris over Shi-Tomasi` comparison section (older paper, more general scope — Harris produces both corners and edges). The shi-tomasi page would carry only a Remarks bullet pointing to the comparison anchor.

This update plan does **not** authorise applying the comparison content yet — that is a separate authoring step under `algo-page` once the policy work is done. Bullets recorded here for the eventual comparison-writing pass:

Section: When to choose Harris over Shi-Tomasi (new subsection inside `# Remarks` or as a final subsection of `# Algorithm`)
- Same $M$, different response function, different derivation. Harris from cornerness heuristics; Shi-Tomasi from tracker conditioning.
- Free parameter. Harris has $k \in [0.04, 0.06]$; Shi-Tomasi has none.
- Edge handling. Harris's response is signed (positive corners, negative edges); Shi-Tomasi rejects edges by virtue of small $\lambda_2$, not by sign. Harris yields a combined corner/edge map; Shi-Tomasi is corner-only by construction.
- Cost. Identical up to one $\sqrt{}$ per pixel for Shi-Tomasi (negligible).
- Quality argument. Shi-Tomasi's criterion is provably optimal for the gradient-based tracking task; Harris's $k$ is empirical with no principled selection rule.
- Recommendation: prefer Shi-Tomasi when the downstream consumer is a gradient-based tracker (KLT, sparse optical flow, direct VO frontends). Prefer Harris when scope includes both corner and edge output, or when the response sign is used to discriminate edge regions.

The corresponding Remarks bullet on the shi-tomasi page (added when the comparison is authored):

```markdown
- Compared with Harris: see [When to choose Harris over Shi-Tomasi](/atlas/harris-corner-detector#when-to-choose-harris-over-shi-tomasi). The Harris page hosts the comparison.
```

## UPDATE: pyramidal-blur-aware-xcorner

The page already lists `shi-tomasi1994-features` in `sources.references` and the `sources.notes` field correctly identifies the cascade filter. No content gap. When the cascade-filter cascade is eventually documented in the page body (currently summarised only in the notes), the Shi-Tomasi eigenvalue test should cite this paper. No bullets warranted now.

# Provenance

- Paper full text: `docs/papers/.cache/shi-tomasi1994-features.txt` (5 pages, IEEE CVPR 1994, doi:10.1109/cvpr.1994.323794).
- Abstract (lines 12-46 of cached text): the paper's two main contributions are (i) "experimental evidence that pure translation is not an adequate model for image motion when measuring dissimilarity, but affine image changes ... are adequate" and (ii) "a more principled way to select features than the more traditional 'interest' or 'cornerness' measures."
- §3 Computing Image Motion (lines 58-160): the dissimilarity $\varepsilon = \iint_W [J(Ax+d) - I(x)]^2 w(x)\, dx$ (eq 3), Taylor linearization $J(Ax+d) = J(x) + g^T u$ (eq 4), $6 \times 6$ affine system $Tz = a$ (eq 5) with $z^T = (d_{xx}, d_{yx}, d_{xy}, d_{yy}, d_x, d_y)$, $T$ structure with $U, V, Z$ blocks (eq 6), pure-translation $2 \times 2$ system $Zd = e$ (eq 7).
- §4 Texturedness (page 3 of paper): "the symmetric $2 \times 2$ matrix $Z$ of the system must be both above the image noise level and well-conditioned. The noise requirement implies that both eigenvalues of $Z$ must be large, while the conditioning requirement means that they cannot differ by several orders of magnitude" — direct quote retained because paraphrasing risks misrepresenting the joint criterion. Acceptance: "we accept a window if $\min(\lambda_1, \lambda_2) > \lambda$" (eq 8). Threshold value: "$\lambda$ is a predefined threshold" — no numerical value given.
- §4 closing paragraph: pseudo-inverse + minimum-norm recommendation for the affine system $Tz = a$ when components are unobservable.
- §5 Dissimilarity (figure 3, figure 15): translation dissimilarity is "nearly useless for feature monitoring" (caption of figure 12); affine dissimilarity provides "good discrimination between good and bad features" (caption of figure 15).
- §8 Conclusion: "rigidity is not a local feature, so a local method cannot be expected to always detect its violation" — direct quote, on the inherent limit of dissimilarity-based monitoring for glossy features.
- Comparison framing in §4: the paper's introduction of the new criterion explicitly contrasts with Harris-style "interest operators" — "they are often based on a preconceived and arbitrary idea of what a good window looks like. The resulting features may be intuitive, but are not guaranteed to be the best for the tracking algorithm to produce good results."
