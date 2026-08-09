---
paper_id: hillen2023-enhanced
title: "Enhanced Checkerboard Detection Using Gaussian Processes"
authors: ["Michaël Hillen", "Ivan De Boi", "Thomas De Kerf", "Seppe Sels", "Edgar Cardenas De La Hoz", "Jona Gladines", "Gunther Steenackers", "Rudi Penne", "Steve Vanlanduit"]
year: 2023
url: https://doi.org/10.3390/math11224568
created: 2026-05-02
relevant_atlas_pages: []
---

# Setting

**Problem class.** Post-processing of a partially detected checkerboard: given a set of already-detected, already-grid-allocated corner pairs `(boardXY, boardUV)` plus a set of detected-but-unallocated corners `cornersUV`, the method (1) allocates the unallocated corners to grid positions, (2) predicts pixel coordinates for occluded or out-of-frame corners, and (3) applies a global smoothing refinement to all allocated corners. This is an *enhancement layer* that wraps any upstream detector — the paper evaluates it on top of the Geiger 2012 libcbdetect detector (`geiger2012-automatic`) — rather than a standalone detector.

**Scope of the primary contribution.** The corner-detection component in the paper is a lightly modified version of Geiger 2012 (libcbdetect); the novel content is entirely in the Gaussian process (GP) enhancement pipeline, called PyCBD (GitHub: `InViLabUAntwerp/PyCBD`, Python).

**Inputs.** A partially or fully detected checkerboard in the form of `(boardXY, boardUV)` — matched pairs of local grid integer coordinates and pixel UV coordinates — plus a set of unallocated detected corners `cornersUV`. No requirement on which upstream detector produced these.

**Outputs.** An augmented `(boardXY, boardUV)` set: (a) previously unallocated corners assigned to grid positions, (b) predicted UV coordinates for occluded or out-of-frame grid positions, (c) GP-smoothed UV coordinates for all allocated corners. The GP posterior variance provides a per-corner confidence measure (not used downstream in the paper's pipeline, but available).

**Operating regime.** The paper emphasises four challenging modalities:
1. Low resolution (e.g. endoscopic camera, 320 × 320).
2. Multispectral imaging (Photonfocus MV0-D2048x1088) — low inter-checker contrast.
3. Thermal infrared (Xenics Ceres) — inverted-polarity checkerboards, heavy blur.
4. Large occlusions that split the detected set into disconnected islands.

# Core idea

Two GP instances (one for U-coordinates, one for V-coordinates) are trained on the detected `(boardXY → boardUV)` mapping using a squared exponential (SE) kernel:

$$k_{SE}(x, x') = \sigma_f^2 \exp\!\left(-\frac{\|x - x'\|^2}{2\,l^2}\right) \tag{Eq. 6}$$

Hyperparameters $(\sigma_f^2, l)$ are optimised by maximising the log marginal likelihood (Eq. 7) via L-BFGS, which incorporates an automatic complexity penalty (Occam's Razor) preventing overfitting.

**Corner allocation (§2.2).** An iterative greedy algorithm (Algorithm 1) expands the board outward one row or column at a time:
1. Train GPs on current `(boardXY, boardUV)`.
2. Predict UV for the next ring of grid positions `newXY`.
3. Match each prediction to the nearest unallocated detected corner within a distance threshold (a fraction of mean inter-corner spacing, tunable).
4. Augment `boardXY, boardUV` with matched pairs; iterate until no new corners are found, no predicted UV falls inside the image, or `maxNrOfIterations` (default 10) is reached.
5. Corners without a matching prediction are classified as false positives.

**GP refinement (§2.3).** After allocation, GPs are retrained on all allocated corners. Two uses: (a) predict UV for grid positions with no detected corner (occluded or outside frame — extrapolation beyond the board boundary); (b) re-predict UV for each allocated corner — the smooth SE kernel imposes global consistency, acting as a non-local smoothing refinement that differs from pixel-neighbourhood methods (Harris, cone-quadratic) in that every corner's location is influenced by all other corners' positions.

**Unwarping side-benefit (§5).** Densely predicting UV over a regular `newXY` grid produces an unwrapped frontal view of the board as a by-product, at no additional training cost.

# Assumptions

1. (hard) The upstream detector has already produced at least a minimal connected board fragment `(boardXY, boardUV)` — the method cannot bootstrap from zero detections. If the Geiger or OpenCV detector finds nothing, PyCBD has no training data.
2. (hard) The checkerboard is a flat, rectangular grid. The GP's squared exponential kernel assumes smooth, continuous mapping from board space to image space. A curved or non-planar board would violate the smoothness prior.
3. (soft) The SE kernel is appropriate: the mapping from grid coordinates to pixel coordinates is smooth (no discontinuities). The paper states "our checkerboards do not show discontinuities" (§2.1). Heavily creased or folded boards, or extreme perspective with strong fisheye, can produce quasi-discontinuous mappings at the image boundary that the SE kernel over-smooths.
4. (soft) Enough training corners are present to constrain the GP. The paper warns (§5): "when working with a slightly warped 3 × 3 checkerboard, there is not much information upon which to build a solid statistical model" — the GP may attribute corner positions to pure noise. Mitigation: put a lower bound on the length scale $l$ and an upper bound on $\sigma_\epsilon^2$ (observation noise).
5. (soft) The distance threshold fraction for matching predicted to detected corners is tuned appropriately. Too large: false positives accepted. Too small: correct corners missed, especially under heavy warping (§2.2 discussion).
6. (soft) Hyperparameter optimisation (L-BFGS maximising log marginal likelihood) finds a good local optimum. With very few training points (small boards, high occlusion), the likelihood landscape can be flat or multimodal — the paper mitigates via software-level prior constraints on hyperparameters (§5).
7. (hard) Both U and V coordinate regression are treated as independent GPs. This ignores the joint structure of 2D pixel coordinates, so a pathological outlier in U does not propagate a correction to V. The paper does not discuss cross-covariance between u and v axes.

# Failure regime

- **Zero initial detections.** If the upstream detector finds no board at all, the GP has no training data and the enhancement cannot run. The paper uses Geiger as upstream; Geiger itself fails more easily than OpenCV on low-blur/high-noise images (§4.1 left graphs, Figure 4a, 4b).
- **Extreme warping + SE kernel.** The squared exponential kernel yields smooth interpolation; under severe fisheye or extreme oblique pose, the board-to-pixel mapping has high local curvature. The GP may over-smooth the mapped corner positions (§5: "caution is advised when working with heavily warped checkerboards"). The paper proposes but does not implement more complex kernels or deep GPs as future work.
- **Small boards (e.g. 3 × 3 inner corners).** Very few training points per GP — numerical instability, implausible predictive means. The paper describes this explicitly in §5 and provides workarounds as code comments (bounded hyperparameters).
- **Occlusion magnitude threshold.** The iterative allocation bridges gaps up to the extrapolation range. Very large occlusions spanning many rows and columns accumulate extrapolation error; the GP posterior variance increases with distance from training data, but the paper does not report a maximum bridgeable gap in calibration units.
- **Inverted-polarity infrared images.** The Geiger upstream detector fails on inverted-polarity boards (white checkers, dark borders) without polarity-inversion preprocessing. The paper reports "an eightfold increase" in detected corners after grayscale inversion (§4.2). This is an upstream failure, not a GP failure, but it means the GP pipeline is polarity-sensitive through its upstream detector.
- **False positives admitted by loose distance threshold.** If `cornersUV` contains many false corners (e.g. from background texture resembling an X-junction) and the distance threshold is too large, the iterative allocation algorithm adds them to the board, corrupting the GP training set for subsequent iterations.
- **Extrapolation beyond the image border.** The paper demonstrates predicting corners outside the image boundary (§2.3), which is useful for calibration. However, GP extrapolation far from the training support region has high variance and is sensitive to kernel hyperparameters — the paper does not quantify extrapolation error vs distance outside the visible frame.

# Numerical sensitivity

- **SE kernel length scale $l$.** The length scale governs the radius of influence of each training corner on predictions. If $l$ is too large, all corners influence each other equally → the GP fits a nearly linear mapping and ignores local non-linearities. If $l$ is too small, the GP overfits to individual corner positions and extrapolation collapses to the prior mean. L-BFGS optimises $l$ from data, but with few training points the optimum can be degenerate; the paper's mitigation is to impose a lower bound on $l$ in software.
- **Observation noise $\sigma_\epsilon^2$.** Controls how strictly the GP fits its training corners. High $\sigma_\epsilon^2$ → smoothing (corners move from their detected positions toward the GP mean — useful for noise rejection but introduces bias). Low $\sigma_\epsilon^2$ → interpolation (predicted corners converge to detected positions — no smoothing benefit). The paper's default treats the upstream detector's output as noisy, allowing refinement.
- **Distance threshold fraction (allocation step).** Tunable hyperparameter controlling match permissiveness. The paper does not report a recommended value; it depends on the expected pixel-density of corner spacing and the rate of false detections from the upstream detector.
- **GP matrix inversion $O(n^3)$.** Standard GP regression requires solving $(K_{X,X} + \sigma_\epsilon^2 I)^{-1}$ where $n$ is the number of training points. For a 14 × 9 board, $n \leq 117$ — small enough that exact inference is fast. For very large boards or dense annotations, this would become a bottleneck, but the paper's practical scope stays below a few hundred corners.
- **Jitter for numerical stability.** The paper does not mention explicit jitter added to the diagonal of $K_{X,X}$ for numerical stability, but this is standard in GP implementations for near-singular covariance matrices. The observation noise $\sigma_\epsilon^2$ partially serves this role.
- **32-bit vs 64-bit.** Not discussed. The GP kernel matrix operations involve small matrix inversions; single precision is generally insufficient for ill-conditioned covariance matrices (low-noise regime). The Python scikit-learn GP implementation (implied by the L-BFGS reference) uses 64-bit by default.

# Applicability

- Use when: a standard checkerboard detector partially detects the board (some corners missed) due to occlusion, specular reflections, lens contamination, or image-border truncation, and the goal is to recover all corners for calibration.
- Use when: working in non-standard imaging modalities (thermal IR, multispectral, low-resolution) where standard detectors consistently miss corners due to low contrast or heavy blur — the GP enhancement can fill gaps if the upstream detector finds at least a minimal board fragment.
- Use when: the board may extend beyond the image border and corner extrapolation is needed for calibration.
- Use when: a global position-consistent smoothing refinement is preferred over local pixel-neighbourhood refinement (Harris iterative, cone-quadratic) — useful when local pixel evidence is unreliable but the board geometry is highly constrained.
- Don't use when: the upstream detector finds nothing — GP enhancement requires at least a partial grid as training data.
- Don't use when: the board is heavily warped (extreme fisheye) and the squared exponential kernel's smoothness assumption does not hold — the refinement will bias corner positions.
- Don't use when: small boards (< 4 × 4 inner corners) are common — the GP is data-starved, numerical instabilities arise, and hyperparameter optimisation is unreliable.
- Don't use when: real-time performance is required — GP training per image is $O(n^3)$ in number of corners; the paper does not report timing results.
- Compared against (paper's own comparison, §4):
  - **OpenCV findChessboardCorners** (Vezhnevets-Bradski, [15] in paper): strong on unoccluded, unblurred, standard images. Degrades severely on inverted-polarity IR without inversion preprocessing (×8 fewer detections) and under heavy perspective transformation (§4.1, Figure 4c — worst of all methods). No ability to recover occluded corners.
  - **OpenCV findChessboardCornersSB** (Duda-Frese, [17] in paper = `duda2018-accurate`?): the paper reports it "performs notably worse for all degrees of perspective transformation" (§4.1). Also no occluded-corner recovery.
  - **Geiger 2012 without GP** (`geiger2012-automatic`): detects corners in a free-grid (no prior on $r, c$); structure recovery allocates corners to a grid. Does not recover occluded corners. Geiger + GP is the paper's primary proposed method.
  - The paper does NOT compare against ROCHADE (`placht2014-rochade`), OCPAD (`fuersattel2016-ocpad`), CCDN (`chen2023-ccdn`), ChESS (`bennett2013-chess`), pyramidal blur-aware (`abeles2021-pyramidal`), or MATE (`donne2016-mate`) despite these being in the literature. This is a notable gap in the evaluation.

# Connections

- Builds on:
  - `geiger2012-automatic` — the upstream corner detector used in all experiments; the Geiger structure recovery produces the initial `(boardXY, boardUV)` that the GP consumes.
  - Rasmussen & Williams 2006 (*Gaussian Processes for Machine Learning*) — the foundational GP reference [24] cited throughout §2.
  - `rufli2008-blurred` — cited as OpenCV calibration extension (OCamCalib, [16,20] in paper), used as comparison baseline.
  - `duda2018-accurate` — cited as `findChessboardCornersSB` ([17] in paper), used as comparison baseline. (This paper appears to correspond to `duda-radon-corners` in atlas; ? verify exact slug.)
  - `fuersattel2016-ocpad` — cited ([18] in paper) as a method capable of partial-board detection, placed in context with the paper's occlusion-handling goal.
  - `placht2014-rochade` — cited ([19] in paper) as OCPAD's predecessor.
- Enables: nothing yet published that cites Hillen 2023 as a foundational building block (paper is 2023, likely too recent for downstream atlas entries).
- Refutes / supersedes: does not refute any specific method; frames itself as complementary to existing detectors, not a replacement.

# Atlas update plan

No existing atlas page references `hillen2023-enhanced` in `sources.primary` or `sources.references`.

**Page-creation criterion evaluation.**

The paper introduces a genuine novel contribution — GP-based post-processing for checkerboard enhancement — that is not described on any existing atlas page. The question is whether it merits its own page.

Arguments for a new page:
- The GP enhancement is a distinct algorithmic stage (allocation + refinement + extrapolation) applicable on top of any upstream detector.
- The PyCBD library is open-source and usable.
- The method addresses a real gap (occluded-corner recovery without learning) not covered by existing atlas entries.

Arguments against:
- The paper's primary novelty is the application of standard GP regression to a calibration post-processing problem, not a new detection algorithm. The core idea (fit a GP to the board-to-image mapping) is straightforward once stated.
- The upstream detector (Geiger 2012) has its own note (`geiger2012-automatic`) but no atlas page. The Hillen method is parasitic on the upstream detector's partial output.
- The comparison is narrow: only Geiger vs OpenCV vs OpenCV SB. ROCHADE, OCPAD, CCDN, and ChESS are not evaluated, weakening the "best in class" claim.
- The atlas already has OCPAD as the canonical partial-pattern detector. Hillen 2023 offers a complementary approach (predict missing corners via GP vs recover a subgraph via VF2), but the overlap in motivation is high.

**Conclusion:** The method meets the technical novelty criterion for an algorithm page (GP enhancement is a distinct method not covered elsewhere, supports >500 words of substantive content). However, the page should be framed carefully: it is an *enhancement pipeline* wrapping a detector, not a standalone detector. A stub page is warranted.

## NEW: gp-checkerboard-enhancement

Type: algorithm
Category: calibration-targets
Primary source: hillen2023-enhanced
Draft: true
Quality: stub

Suggested frontmatter sketch:
```yaml
title: "GP Checkerboard Enhancement (PyCBD)"
summary: "Post-process a partially detected checkerboard by training two Gaussian processes on allocated corners to allocate unassigned detections to grid positions, predict pixel coordinates for occluded or out-of-frame corners, and apply a global-consistency refinement to all corner locations."
tags: ["calibration", "chessboard", "gaussian-processes"]
category: calibration-targets
difficulty: intermediate
draft: true
prerequisites: []
relations:
  - type: compared_with
    target: ocpad
    confidence: high
sources:
  primary: hillen2023-enhanced
```

(Dropped Geiger from the relation set: the method is detector-agnostic — "no requirement on which upstream detector produced" the input, per the Inputs section above — so the Geiger link is a citation, not a graph edge. `geiger2012-automatic` belongs in `sources.references` only, per the "UPDATE: geiger-chessboard" section below; CLAUDE.md's `feeds_into` explicitly excludes plain "A's output can feed B" pipeline data-flow with no genuine build-on.)

Bullets for page sections:

**Goal.** The algorithm receives the output of any upstream checkerboard corner detector — a set of allocated `(boardXY, boardUV)` pairs and a set of detected-but-unallocated corner pixel coordinates `cornersUV` — and returns an augmented, smoothed, and gap-filled corner set. It does not perform corner detection itself. The three capabilities it adds: (1) grid allocation of corners missed by the structure-recovery step of the upstream detector, (2) prediction of UV coordinates for occluded or out-of-frame grid positions, (3) global-consistency smoothing of all corner positions.

**Algorithm.**
- Two GPs are trained in parallel: one predicts U pixel coordinates from `boardXY`, one predicts V pixel coordinates. Both use a squared exponential kernel; hyperparameters are learned by L-BFGS maximisation of log marginal likelihood.
- Corner allocation (iterative): expand the grid one row/column at a time, predict UV for new grid positions, match to nearest unallocated corners within a distance threshold, augment training set, repeat until convergence.
- GP refinement: retrain GPs on full allocated set; (a) predict UV for undetected grid positions (occluded or outside image); (b) re-predict UV for all allocated corners via the smooth posterior mean — this is a non-local refinement using global board geometry rather than local pixel evidence.

**Implementation.**
- PyCBD Python library: `pip install pycbd` or `https://github.com/InViLabUAntwerp/PyCBD`.
- The library is modular: the GP enhancement can be applied after any upstream detector that returns a partial grid.
- Key tunable: distance threshold fraction for corner matching; lower bound on GP length scale for small-board stability.
- GP matrix inversion is $O(n^3)$ in number of corners; for boards ≤ 15 × 10, this is fast in practice.

**Remarks.**
- The SE kernel's smoothness assumption means the method may over-smooth corners under extreme fisheye or heavy perspective (the board-to-image mapping has high local curvature). The paper recommends more complex kernels as future work.
- Small boards (< 4 × 4 inner corners) are numerically problematic: the GP may collapse to the prior. Mitigate by constraining length-scale lower bound.
- The upstream detector is the weakest link: if it finds no corners, the enhancement has no training data. The paper uses Geiger 2012 as upstream; Geiger fails more easily than OpenCV on high-noise, low-blur inputs.
- Compared with OCPAD: OCPAD recovers partially visible boards by subgraph isomorphism on the detected corner graph — a combinatorial approach that requires no training. GP enhancement fills in occluded corners by learned interpolation/extrapolation — a regression approach that requires at least a partial board as training data. The two approaches are complementary: OCPAD handles missing-subgraph recovery; GP handles within-frame and beyond-border gap-filling with smooth refinement.

## UPDATE: geiger-chessboard (if page is created)

No `geiger-chessboard` algorithm page exists yet (the `geiger2012-automatic` research note exists but has `relevant_atlas_pages: []`). When a Geiger page is authored, add `hillen2023-enhanced` to `sources.references` with a Remarks bullet noting that Hillen 2023 uses Geiger as an upstream detector and the GP enhancement consistently improves detection counts and corner accuracy on top of the Geiger structure-recovery output (§4, Tables 1–3).

## UPDATE: ocpad

Section: Remarks
- Add a bullet contrasting OCPAD's subgraph-isomorphism approach with GP-based enhancement (Hillen 2023, `hillen2023-enhanced`): OCPAD performs combinatorial partial-subgraph matching — handles gaps without any learned model, requires only the detected corner graph. GP enhancement (`gp-checkerboard-enhancement`) learns the board-to-pixel mapping and predicts missing corners by regression — requires a minimal detected fragment as training data but can handle larger gaps (extrapolation beyond the image border) and provides a global smoothing refinement. The two are complementary rather than competing.

# Provenance

- Full text: `docs/papers/.cache/hillen2023-enhanced.txt` (HTML-scraped MDPI open-access article; *Mathematics* 2023, 11(22), 4568; DOI: 10.3390/math11224568; published 7 November 2023).
- Abstract (p. 1 / §0): "By learning a mapping from local board coordinates to image pixel coordinates via a Gaussian process, we can fill in occluded corners, expand the board beyond the image borders, allocate detected corners that do not fit an initial grid, and remove noise on the detected corner locations." — Direct quote retained because it is the canonical summary of the four GP capabilities.
- §2.1 (GP formulation): Eqs. 1–7. GP defined by mean $m(x)$ and covariance $k(x,x')$; normalised to zero mean. SE kernel Eq. 6. Posterior predictive Eqs. 3–5. Log marginal likelihood maximised via L-BFGS (Eq. 7).
- §2.2 (Corner allocation): Algorithm 1 pseudo-code; iterative scheme with distance-threshold matching; `maxNrOfIterations = 10`. Warning: if threshold too large → false positives; too small → missed corners under heavy warping.
- §2.3 (GP refinement): retrain after allocation; predict for undetected positions; re-predict for all allocated corners. SE kernel yields "infinitely differentiable, thus smooth functions" — the justification for using GP posterior mean as a refinement.
- §3.1 (Dataset): synthetic (DALL-E-generated lab backgrounds, augmented with Gaussian blur / shot noise / pincushion/barrel/moustache distortion / perspective / rotation); real: Xenics Ceres IR camera + Photonfocus MSI camera. 100 images per augmentation type and level.
- §4.1 (Simulated results): Geiger + GP consistently reduces corner position error (right panels Figure 4a, 4b). Under high perspective transformation, Geiger + GP improves detection rate over Geiger alone for heavy scaling (Figure 4c, left panel). OpenCV SB performs notably worse under all perspective transformation levels.
- §4.2 (Real results): "Geiger method with the proposed Gaussian process enhancement consistently demonstrates the best overall performance." IR camera (inverted polarity): OpenCV improves ×8 after grayscale inversion; GP-enhanced Geiger also improves. MSI large board (14 × 9): GP enhancement provides the largest benefit — more corners at risk of being missed on large boards.
- §4.3 (Endoscopy use case): 320 × 320, 172° FoV, lens contamination. Geiger alone fails to allocate all corners. GP enhancement recovers missing corners from the partial Geiger output. Manual annotation workaround replaced by automated GP prediction.
- §5 (Discussion): smoothing bias warning for heavy warping. Small-board numerical instability (3 × 3). Hyperparameter prior-constraint mitigation. Unwarping application via dense grid prediction (Figure 6). Future work: fiducial markers for orientation, deep GPs for non-smooth kernels.
- References relevant to atlas cross-links:
  - [13] = Geiger 2012 (`geiger2012-automatic`)
  - [16] = Rufli 2008 (`rufli2008-blurred`)
  - [17] = Duda-Frese 2018 (`duda2018-accurate` — check atlas slug `duda-radon-corners`)
  - [18] = Fürsattel 2016 (`fuersattel2016-ocpad`)
  - [19] = Placht 2014 (`placht2014-rochade`)
  - [24] = Rasmussen & Williams 2006 (GP textbook, not in atlas index)
