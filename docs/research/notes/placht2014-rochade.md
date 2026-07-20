---
paper_id: placht2014-rochade
title: "ROCHADE: Robust Checkerboard Advanced Detection for Camera Calibration"
authors: ["S. Placht", "P. Fürsattel", "E. A. Mengue", "H. Hofmann", "C. Schaller", "M. Balda", "E. Angelopoulou"]
year: 2014
url: https://www5.informatik.uni-erlangen.de/Forschung/Publikationen/2014/Placht14-RRC.pdf
created: 2026-05-01
relevant_atlas_pages: [rochade, ocpad, pyramidal-blur-aware-xcorner, ccdn-checkerboard-detector]
---

# Setting

**Problem class.** Detection and subpixel localisation of inner corners on a planar $r \times c$ checkerboard pattern, with the calibration use case explicitly in scope: the corner positions feed Zhang-style intrinsic and extrinsic estimation. Two operational regimes drive the design:

1. **Low-resolution sensors with significant lens distortion or high noise** — Mesa SR4000 ToF (176 × 144), low-cost webcams, GoPro-class wide-angle. OpenCV's classical detector struggles or fails entirely on these.
2. **Wide-baseline multi-camera setups** where the pattern is observed at extreme oblique poses by at least one camera — also failure-prone for OpenCV.

The atlas's `rochade` page covers the detection pipeline (§2.1, the seven-step pipeline) and the subpixel refinement (§2.2, cone filter + bivariate quadratic). The §3 evaluation results — quantitative detection-rate and accuracy comparisons against OpenCV and OCamCalib — are not reflected on the page beyond a single bullet about "extreme poses, lens distortion, low resolution."

**Inputs.** Single-channel grayscale image at any bit depth (the paper validates 8-bit and 16-bit; both work). Pattern dimensions $(r, c)$ are required — ROCHADE rejects images where the inner-corner count does not match $rc$. No assumption about square sizes being constant; the pattern can have non-uniform field lengths (relevant for projector-camera calibration where the projected pattern's apparent size varies). Border squares may be partially clipped by the image boundary because step 6 skips dead-end pruning at border pixels.

**Outputs.** Either a set of $rc$ subpixel corner coordinates ordered on the grid, or rejection ($\bot$). Rejection occurs when no connected component of the centerline graph has exactly $rc$ saddle points after clustering, or when the saddle adjacency does not match an $r \times c$ grid topology, or when the bivariate quadratic at any corner fails the saddle test ($4 a_1 a_3 - a_2^2 < 0$).

**Guarantees.** No mathematical guarantee on detection success — the verification at step 7 is a topological check, not a correctness proof. The subpixel refinement is provably exact for a *rotated and translated* sectionally-piecewise-constant checkerboard convolved with the cone kernel, because cone-of-step is sectionally piecewise quadratic (§2.2 motivation). Real images deviate from this idealisation (gradients, anti-aliasing, rolling shutter, motion blur), so the refinement is locally optimal in a neighbourhood-fitting sense rather than globally exact.

# Core idea

A checkerboard inner corner is the meeting point of four bright/dark quadrants. Two distinct ideas compose ROCHADE:

**1. Detection as a graph problem.** Reduce the image to a 1-pixel-thick centreline mask covering the boundaries between checker squares (Scharr gradient → local 60% threshold over a $(2\tau+1) \times (2\tau+1)$ window with $\tau = 4$ → conditional dilation requiring ≥6 of 8 "true" 8-neighbours → distance-transform thinning per Niblack 1992). Interpret the centreline as a graph $G = (V, E)$ with 8-connectivity:

$$E = \{e = (v_i, v_j) : \mathrm{dist}(v_i, v_j) \leq \sqrt{2},\, v_i \neq v_j\}\quad (\text{eq 3}).$$

Inner corners correspond to graph **saddles** — vertices of degree ≥ 3 — because four centreline segments meet at every X-junction:

$$S = \{s \in V : |\{e \in E : s \in e\}| \geq 3\}\quad (\text{eq 4}).$$

Centreline imperfections produce multiple saddles per true corner, so cluster saddles within distance $\alpha$ (single-linkage) and replace each cluster by its centroid. Try $\alpha \in \{2, 3, 4, 5\}$ in order; stop at the first $\alpha$ where (a) some connected component has exactly $rc$ saddle clusters, and (b) the cluster adjacency in $G$ matches an $r \times c$ grid. This iterative search through $\alpha$ values is what makes the detector parameter-free in practice — the user does not tune $\alpha$ per camera.

**2. Subpixel refinement via cone-filtered quadratic fit.** Apply the cone filter $c_{i,j} = \max(0, \gamma + 1 - \sqrt{(\gamma - i)^2 + (\gamma - j)^2})$ (eq 5) to the *original-resolution* image. The cone is *sectionally linear*: convolving it with a checkerboard pattern (two-level step function) produces a *sectionally piecewise-quadratic* surface, which a bivariate quadratic $p(i, j) = a_1 i^2 + a_2 i j + a_3 j^2 + a_4 i + a_5 j + a_6$ can fit exactly inside one section. Fit by least squares over a $(2\kappa + 1) \times (2\kappa + 1)$ window centred on the integer corner, solve $\nabla p = 0$ for the saddle, and accept iff the Hessian discriminant $4 a_1 a_3 - a_2^2 < 0$. Constraint: $\gamma \geq \kappa$ — otherwise the filtered surface has constant plateaus the quadratic cannot localise.

The cone kernel is the key choice over the standard Gaussian (Lucchese-Mitra 2003 used a Gaussian). A Gaussian smears the piecewise-quadratic structure of the convolved checkerboard and biases the saddle location under anisotropic sampling. The cone preserves the structure exactly.

# Assumptions

1. (hard) The full $r \times c$ pattern lies inside the image. Step 7 fails if the inner-corner count does not match $rc$. The paper notes "an extension of the presented algorithm is planned which does not require that the whole checkerboard is visible" — this is what OCPAD eventually does (replacing step 7 with a VF2 subgraph isomorphism).
2. (hard) Pattern dimensions $(r, c)$ are known a priori. ROCHADE does not auto-discover the grid size.
3. (soft) The pattern's centreline edges form a connected component in the centreline graph after thinning. Image noise or extreme blur can break the centreline into disconnected arcs; the conditional dilation at step 3 partially mitigates by closing small gaps, but a fully broken centreline is a hard failure.
4. (soft) The 60% threshold rule at step 2 is appropriate for the image's contrast distribution. The paper "determined heuristically using our test data" and does not adjust per image. Pathologically uneven lighting (one half of the chessboard dark, one half bright) can cause local thresholding to misclassify edge pixels.
5. (hard) Black and white squares. Greyscale or coloured patterns are not in scope; the gradient threshold and the cone-filter saddle assumption depend on the two-level step structure.
6. (soft) Inner corners are in fact saddle points of the cone-filtered surface — the discriminant test $4 a_1 a_3 - a_2^2 < 0$ catches violations and rejects, but heavy distortion or occlusion can produce a non-saddle stationary point at the true corner location. The paper does not characterise this regime explicitly.
7. (soft) The cone kernel half-size $\gamma$ and the fitting half-size $\kappa$ are matched to the field size and the optical blur. For Mesa SR4000 (176 × 144, very small fields in pixels): $\kappa = 2$. For Ensenso N10 (752 × 480) and IDS uEye (1280 × 1024): $\kappa = 5$. In all experiments, $\gamma = \kappa$. The page does not currently surface this empirical guidance.

# Failure regime

- **Partial visibility / occlusion.** A border square clipped by the image boundary, an occlusion of one X-junction by a foreground object, or any condition that drops the saddle count below $rc$ in the connected component — these all cause hard rejection at step 7. This is the deliberate trade-off vs OCPAD: ROCHADE is more selective; OCPAD relaxes selectivity to gain partial-pattern support.
- **Uneven illumination or low contrast on one side.** The local 60% threshold over a $(2\tau+1) \times (2\tau+1)$ window adapts to local contrast but cannot rescue a half-image where the gradient amplitude is below sensor noise. The paper's experiments include the Mesa SR4000 (a noisy ToF intensity image) and demonstrate robustness *for moderate* noise; severe under-exposure is not characterised.
- **Closely spaced parallel lines mistaken for centrelines.** Possible in patterns with very small fields and significant motion blur — the centreline thinning can collapse adjacent edges into one curve and miss the saddle structure. The conditional dilation requires ≥6 of 8 neighbours, which suppresses thin spurs but does not protect against this.
- **Square fields below ~5 pixels per side at the largest scale.** Centreline thinning becomes unreliable when the gradient region is comparable in width to the centreline thickness; downsampling makes this worse.
- **Saddle multiplets that survive even $\alpha = 5$.** Empirically rare on the paper's test sets; would manifest as `cluster count > rc` and rejection. The bound at $\alpha = 5$ is "empirically chosen" — not proven safe — and pathological centrelines could in principle require larger $\alpha$.
- **Refinement non-saddle.** $4 a_1 a_3 - a_2^2 \geq 0$ (the fit's Hessian is positive- or negative-definite, not indefinite) — the quadratic has a min or max instead of a saddle. The paper rejects such candidates. This indicates the integer corner was misplaced or the cone half-size $\gamma$ was too small relative to the field size.
- **Non-cone smoothing assumption violation.** If the input image has been pre-blurred with a Gaussian (some camera ISPs do this), the convolved image is no longer piecewise quadratic. The refinement still produces a saddle, but with bias proportional to the Gaussian's anisotropy.
- **Subpixel ceiling on low-resolution sensors.** The mean absolute measurement error on Mesa SR4000 is 0.71 mm (vs OpenCV's 1.85 mm) — much better than OpenCV but not asymptotic. Beyond ~20 calibration images on Mesa, the error does not improve, indicating sensor-noise-limited precision.

# Numerical sensitivity

- **Scharr 3 × 3 vs Sobel 3 × 3.** The Scharr kernel was chosen for "better rotational symmetry" (§2, step 1) — its frequency response is more isotropic. On lens-distorted or rotated checkerboards this matters; on axis-aligned high-resolution patterns the difference is small.
- **Local-threshold window radius $\tau = 4$.** $(2\tau+1) \times (2\tau+1) = 9 \times 9$ window. Smaller windows admit pixel-level noise into the threshold decision; larger windows blur the edge/flat boundary. The paper does not report sensitivity to $\tau$; it is presented as a fixed constant.
- **Conditional dilation neighbour count = 6.** Closes notches up to a width of 2 pixels along the centreline. A higher threshold (e.g. 8) would reject all dilation; a lower threshold (e.g. 4) would aggressively close gaps including spurious ones.
- **Saddle clustering schedule $\alpha \in \{2, 3, 4, 5\}$.** Linear search; correctness gate is the grid-topology check at step 7, so an excessively large $\alpha$ collapses real corners (but is then caught by the verification). The lower-to-higher direction of the search guarantees the smallest $\alpha$ that yields a valid grid is selected.
- **Cone kernel size constraint $\gamma \geq \kappa$.** Hard requirement: undersized $\gamma$ leaves constant plateaus in the convolved image that the quadratic fit cannot disambiguate from a true flat region. The paper sets $\gamma = \kappa$ in all experiments; one could safely choose $\gamma > \kappa$ at the cost of wider blur and potentially crossed-section artefacts at corners with very short adjacent fields.
- **Fitting window size $\kappa$.** Empirical guidance: $\kappa = 2$ px for Mesa SR4000 (low-resolution, ~3 px field), $\kappa = 5$ px for Ensenso and IDS (~10 px field). Rule of thumb: $\kappa$ should be roughly half the smallest expected field size.
- **Saddle Hessian discriminant.** $4 a_1 a_3 - a_2^2$ is the determinant of the $2 \times 2$ Hessian times $-1$ — strictly negative iff the Hessian is indefinite. Numerical concern: on cone-filtered images with very low contrast, the fit coefficients $a_1, a_2, a_3$ are small and the discriminant is dominated by floating-point round-off. In practice, double-precision arithmetic on an 8-bit input is well-conditioned even for sub-percent dynamic range.
- **Bit depth tolerance.** Mesa SR4000 16-bit images converted to 8-bit before detection: the paper reports "the accuracy of ROCHADE does not decrease noticeably due to the 8 bit conversion." This indicates the detector is not relying on fine intensity gradations — a useful robustness property.
- **Pattern verification topology check.** Two saddle clusters are "directly adjacent" in $G$ iff the shortest path between their representative pixels passes through no other cluster. This is a graph-theoretic check, not a Euclidean distance; it tolerates curved centrelines induced by lens distortion.

# Applicability

- Use when: low-resolution sensors (≤500 px) with non-trivial noise or distortion. ROCHADE's detection-rate advantage over OpenCV is largest in this regime — Mesa SR4000 stereo: ROCHADE 91/103 vs OpenCV 8/103 (paper §3.2, Table 1).
- Use when: wide-baseline multi-camera calibration where at least one camera observes the pattern at an extreme oblique pose. ROCHADE's grid-topology verification handles extreme foreshortening that defeats OpenCV's quadrangle-fitting approach.
- Use when: lens distortion is significant (wide-angle, fisheye, or low-cost optics). The graph-saddle approach does not assume straight checker boundaries; the quadrangle-fitting class of detectors does.
- Use when: subpixel calibration accuracy matters and the pattern is fully visible. ROCHADE achieves ~0.21 mm mean absolute error on Ensenso N10 vs OpenCV's 0.53 mm (paper §3.1, Figure 3c).
- Don't use when: the pattern is only partially visible. Use OCPAD or another partial-pattern variant — ROCHADE rejects by design (this is the explicit motivation for OCPAD's existence).
- Don't use when: image resolution is high (≥1 MP) AND lens distortion is small AND pose is moderate. On the IDS uEye images in §3.1, ROCHADE and OpenCV are essentially tied — ROCHADE's advantage erodes in the regime OpenCV was tuned for.
- Don't use when: the pattern is a non-chessboard target (CharUco, ring grid, ArUco markers). The saddle-topology assumption is checkerboard-specific.
- Don't use when: pattern dimensions $(r, c)$ are unknown. Use a self-identifying pattern detector (e.g. CharUco) or a corner-graph approach that auto-discovers grid size (kumar2014-grac, laureano2013-topological).
- Compared against (paper's own comparisons in §3):
  - **OpenCV checkerboard detector** (Vezhnevets-Bradski quadrangle-fitting + adaptive threshold + corner refinement): tied on clean high-resolution / low-distortion data (IDS uEye: ROCHADE 0.16 mm vs OpenCV ~0.16 mm). ROCHADE dramatically wins on low-resolution + distorted (Mesa stereo: 91 vs 8 detections; GoPro Hero 3: 96 vs 73 detections).
  - **OCamCalib (Rufli-Scaramuzza extension of OpenCV)**: better than OpenCV on omnidirectional lenses (GoPro: 100/100, beating ROCHADE's 96/100), but worse than ROCHADE on low-resolution distorted Mesa data (50/103 vs 91/103). OCamCalib has additional adaptations for omnidirectional sensors that ROCHADE does not.
  - **Lucchese-Mitra 2003** (saddle-fitting precursor): same surface-fitting framework but with Gaussian preprocessing instead of cone. The paper cites Lucchese-Mitra as the basis of §2.2 and motivates the cone-vs-Gaussian choice (§2.2 first paragraph after eq 5).

# Connections

- Builds on:
  - **lucchese2003-saddle** (in `docs/papers/index.yaml` as `lucchese2003-saddle`, not yet ingested) — the saddle-fitting framework for subpixel refinement. ROCHADE replaces the Gaussian preprocessing with a cone filter.
  - **niblack1992-skeleton** (in index, not yet ingested) — the distance-transform thinning algorithm used in step 4 of the detection pipeline.
  - **rufli2008-blurred** (in index, not yet ingested) — OpenCV's checkerboard detector with extensions for blurred/distorted images. Comparison baseline (OCamCalib uses this).
  - **chen2005-xcorner** (in index, not yet ingested) — referenced as another saddle-fitting variant.
  - Implicitly builds on Zhang-2000 calibration (the paper's calibration use case is Zhang-style), and on the long line of OpenCV-style quadrangle-fitting checkerboard detectors that ROCHADE explicitly improves upon.
- Enables (in the atlas):
  - **rochade** — primary source.
  - **ocpad** — Fürsattel et al. 2016 reuses the ROCHADE stage-1 graph (gradient → threshold → centreline → saddles) and replaces the strict $rc$-saddle verification at step 7 with a VF2 subgraph isomorphism that handles partial visibility. ROCHADE's stage 1 *is* OCPAD's stage 1.
  - **pyramidal-blur-aware-xcorner** — abeles2021-pyramidal cites ROCHADE as a prior x-corner detector and motivates the pyramidal extension by ROCHADE's single-scale limitation.
  - **ccdn-checkerboard-detector** — chen2023-ccdn cites ROCHADE as a classical baseline against which the deep-learning detector is compared.
- Refutes / supersedes:
  - **OpenCV's quadrangle-fitting detector** in the low-resolution / high-distortion / extreme-pose regime. The paper presents ROCHADE explicitly as a robust replacement (§4: "Our presented checkerboard detection method outperforms OpenCV's checkerboard detector in low resolution images or highly distorted images").

# Atlas update plan

## UPDATE: rochade

The page is comprehensive and well-grounded. The detection pipeline (§2.1, steps 0–7), the saddle-graph definitions, the cone filter and bivariate quadratic fit, the procedure pipeline diagram, the implementation core, and the existing Remarks bullets all faithfully reflect the paper. Improvements:

Section: Algorithm
- The page's `:::definition[Cone filter kernel]:::` correctly states $\gamma$ is the half-size and gives the formula. One refinement: the sentence "Convolving a step-function checkerboard with a sectionally linear kernel yields a sectionally defined bivariate quadratic, which a quadratic surface fit can represent exactly" is the right justification but would benefit from naming the alternative — "in contrast to a Gaussian, which smears the piecewise-quadratic structure and biases the saddle location under anisotropic sampling" (paper §2.2 first paragraph after eq 5). Surfaces the design choice rather than just stating it.

Section: Procedure / Implementation
- No gaps. The step-by-step procedure matches the paper's seven steps; the implementation correctly captures the cone kernel and the symmetric solver.

Section: Remarks
- **Add bullet — empirical $\kappa$ guidance.** The paper sets $\kappa = 2$ for low-resolution images (Mesa SR4000, 176 × 144) and $\kappa = 5$ for medium-to-high resolution (Ensenso N10 752 × 480, IDS uEye 1280 × 1024). Rule of thumb: $\kappa$ should be roughly half the smallest expected field size, with $\gamma = \kappa$ as the simplest matching choice. This is currently absent from the page.
- **Add bullet — bit-depth robustness.** The paper notes "the accuracy of ROCHADE does not decrease noticeably due to the 8 bit conversion" (Mesa 16-bit → 8-bit). Useful for readers integrating ROCHADE into pipelines with limited bit-depth output (most consumer cameras).
- **Strengthen "extreme pose" bullet — link to detection-rate evidence.** Currently the Remarks list says "ROCHADE works at extreme poses, lens distortion, low resolution" implicitly via the Goal/Algorithm framing; an explicit Remarks bullet citing §3.2 Table 1 (Mesa stereo: 91/103 detected vs OpenCV 8/103; GoPro: 96/100 vs 73/100) would surface the empirical regime where ROCHADE shines vs the regime where OpenCV is competitive.
- **Add bullet — when ROCHADE does *not* dominate.** The paper's IDS uEye result (§3.1, Figure 3e) shows ROCHADE and OpenCV essentially tied on clean high-resolution low-distortion images. This is the converse of the previous bullet and an important applicability fact: ROCHADE's advantage erodes on the regime OpenCV was tuned for. Worth flagging so readers don't choose ROCHADE blindly.
- **Optional — rotational-symmetry justification for Scharr.** The page's Procedure step 2 says "Scharr 3 × 3 gradient magnitude" without justifying the choice. Paper §2 step 1: "We have chosen a Scharr kernel for filtering because of its better rotational symmetry compared to the more commonly used Sobel filter." Minor; mention only if the page eventually expands the rationale.

Section: When to choose ROCHADE over X

**Status: resolved.** ROCHADE is the *non-host* side of the chess-corners ↔ rochade pair (chess-corners is older, 2013 vs 2014; chess-corners hosts), expressed as `relations: [{ type: compared_with, target: rochade, confidence: high }]` on `content/algorithms/chess-corners.md` (symmetric type, authored on the host side only). The `## When to choose ChESS over ROCHADE` section is now live on the chess-corners page. Bullets recorded here for provenance of the original editorial reasoning:

- ChESS is corner *detection*; ROCHADE is corner *detection + subpixel refinement*. Pairing ChESS with a separate refinement step (e.g. centre-of-mass on a 5 × 5 patch, or ROCHADE's own cone-fit refinement decoupled from its detection stage) is a viable middle ground.
- ChESS is integer-only and SIMD-friendly; ROCHADE's stage 1 has graph-walking and clustering that are harder to vectorise. ChESS is faster on simple chessboards.
- ChESS does not require knowing $(r, c)$ in advance; ROCHADE does. ChESS is a *per-pixel detector*, ROCHADE is a *full-pattern detector*.
- ChESS does not require the full pattern to be visible; ROCHADE does. ROCHADE's strict $rc$-saddle verification is also its main failure mode under occlusion.
- ROCHADE has higher subpixel accuracy on full patterns thanks to the cone-filtered quadratic fit; ChESS's centre-of-mass is the cheap baseline (sub-pixel but not as tight).
- ROCHADE handles extreme poses and severe lens distortion better than ChESS in the paper's test conditions; ChESS handles arbitrary chessboard scenes more flexibly because it is a per-pixel detector.
- **Recommendation:** ROCHADE for calibration when the full pattern is reliably visible and subpixel accuracy is critical; ChESS for general chessboard detection in scenes where full-pattern visibility cannot be assumed, or when paired with a per-pixel descriptor pipeline.

This content lives on the chess-corners page; the rochade page correctly carries only a Remarks bullet pointing to the comparison anchor on chess-corners (confirmed present).

## UPDATE: ocpad (supplementary)

Page already lists `placht2014-rochade` in `sources.references`. The page's `sources.notes` correctly identifies that "Stage 1 (§3.1 of the OCPAD paper, summarising Placht 2014): Scharr-kernel gradient → ... ROCHADE requires the full pattern to be present; OCPAD relaxes that by replacing its matching stage." No content gap. When ocpad is reviewed for completeness in a future pass, the relationship "ROCHADE's stage 1 *is* OCPAD's stage 1" should be explicit in the page body, not just the notes. Defer.

## UPDATE: pyramidal-blur-aware-xcorner (supplementary)

Page already lists `placht2014-rochade` in `sources.references`. ROCHADE is one of several prior-art x-corner detectors the pyramidal approach extends. No content gap; defer until the pyramidal page is reviewed for completeness.

## UPDATE: ccdn-checkerboard-detector (supplementary)

Page already lists `placht2014-rochade` in `sources.references` as one of the classical baselines against which the CCDN deep-learning detector is compared. No content gap; the page is in draft.

# Provenance

- Paper full text: `docs/papers/.cache/placht2014-rochade.txt` (14 pages, ECCV 2014, Springer LNCS 8692 pp. 766–779).
- Abstract: "able to detect checkerboards at extreme poses, or checkerboards which are highly distorted due to lens distortion even on low-resolution images" — direct framing of the operating regime.
- §2.1 Detection pipeline (pp. 768–771): seven explicit steps. Step 1 Scharr gradient, justification: "better rotational symmetry compared to the more commonly used Sobel filter." Step 2 local threshold $\tau = 4$, 60% rule "determined heuristically using our test data." Step 3 conditional dilation: "only adds pixels with at least six 'true' neighbors (out of eight)." Step 4 centreline via Niblack distance-transform thinning. Step 4 graph: $E = \{(v_i, v_j) : \mathrm{dist} \leq \sqrt{2}\}$ (8-connectivity); saddle set $S = \{s : |E_s| \geq 3\}$ (eq 4). Step 6 saddle clustering: "we start with a low value of 2, proceed with the checkerboard verification step (7) and iteratively increase the parameter $\alpha$ as long as we either detect a checkerboard or the empirically chosen threshold of 5 is exceeded." Step 7 grid-topology verification.
- §2.2 Refinement (pp. 771–772): cone kernel formula $c_{i,j} = \max(0, \gamma + 1 - \sqrt{(\gamma - i)^2 + (\gamma - j)^2})$ (eq 5). Bivariate quadratic least-squares fit (eq 6). Cone-vs-Gaussian justification: "Since a cone is sectionally linear, the convolution with a combination of step functions (checkerboard pattern) yield sectionally defined bivariate quadratic polynomials." Constraint: "The size of the cone filter should be at least chosen to be at least as large as the half window size used for surface fitting, otherwise the filtered surface will have constant regions which cannot be well approximated by a bivariate quadratic polynomial."
- §3.1 Subpixel accuracy (pp. 773–775, Figure 3): empirical $\kappa$ choices — $\kappa = 2$ for Mesa SR4000, $\kappa = 5$ for Ensenso N10 and IDS uEye. $\gamma = \kappa$ in all experiments. Mean absolute measurement errors: Mesa ROCHADE 0.71 mm vs OpenCV 1.85 mm; Ensenso ROCHADE 0.21 mm vs OpenCV 0.53 mm; IDS approximately tied. Calibration-image saturation: "does not improve if more than approximately 30 images are used."
- §3.2 Detection rate (p. 775, Table 1): Mesa SR4000 wide-baseline stereo (103 images) — ROCHADE 91, OpenCV 8, OCamCalib 50. IDS uEye wide-baseline (100 images) — all detectors 100/100. GoPro Hero 3 (100 images) — ROCHADE 96, OpenCV 73, OCamCalib 100.
- §4 Conclusion: "Our presented checkerboard detection method outperforms OpenCV's checkerboard detector in low resolution images or highly distorted images" — direct quote retained because it is the headline applicability claim. Future work: "an extension of the presented algorithm is planned which does not require that the whole checkerboard is visible in the image" — this became OCPAD (Fürsattel et al. 2016).
