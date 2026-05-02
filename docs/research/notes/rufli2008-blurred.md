---
paper_id: rufli2008-blurred
title: "Automatic Detection of Checkerboards on Blurred and Distorted Images"
authors: ["M. Rufli", "D. Scaramuzza", "R. Siegwart"]
year: 2008
url: https://rpg.ifi.uzh.ch/docs/IROS08_scaramuzza_b.pdf
created: 2026-05-01
relevant_atlas_pages: [rochade, duda-radon-corners, ccdn-checkerboard-detector]
---

# Setting

**Problem class.** Automatic detection of checkerboard corners in images produced by omnidirectional camera–mirror rigs: images that are blurred (depth-of-field fall-off across a convex mirror), heavily radially distorted (catadioptric projection), and low-resolution (VGA-class sensors). The paper's explicit goal is a detector that can serve as a drop-in automatic front-end for existing calibration toolboxes (OCamCalib [15], Bouguet [14], Mei [16]) that previously required the user to click corner positions manually.

**Baseline.** OpenCV's quadrangle-based checkerboard finder (Vezhnevets [17]) is the direct starting point. The paper analyses its failure modes on omni-camera imagery (§II) and proposes a set of targeted improvements (§III).

**Inputs.** Grayscale image (or colour converted to greyscale); known pattern dimensions $(r, c)$ (number of inner corners). No assumption about perspective vs omnidirectional projection — the detection operates entirely in 2-D image space.

**Outputs.** Set of detected corner positions in pixel coordinates with their adjacency (neighbourhood) structure, sufficient to identify which image point corresponds to which physical board corner. Subpixel refinement is **not included** in the paper's detector; the paper delegates subpixel accuracy to the downstream calibration toolbox's Harris-based refiner (§IV-C: "a Harris corner finder as implemented into most toolboxes is able to negate this error").

**Performance claims.** Consistently ≥80% of corners found on VGA-resolution omnidirectional images with blur (vs OpenCV's ~20%); approaches 100% on higher-resolution images; corner inaccuracy ≤ ~1 pixel prior to Harris refinement (§IV-B, Tables II–VII). On test set 1 (1280×960, no blur, hyperbolic mirror) the two methods tie at ~37 corners; on test set 6 (640×480, blur, spherical mirror) the improvement is dramatic: mean 33.4 vs 8.3 of 42 (§IV-B, Table VII).

# Core idea

The paper's strategy is to retain the Vezhnevets erosion–quadrangle–linking pipeline and surgically fix the three places where it fails on blurred/distorted imagery:

**1. Erosion kernel alternation (§III-A).** The original OpenCV implementation uses a single 3×3 "rect" erosion kernel. Under blur, small checkers become comparable in size to the kernel: the "rect" kernel erodes corners differently depending on checker orientation, producing non-square, orientation-dependent checker shapes after erosion. The fix: alternate between the "cross" and "rect" 3×3 kernels across successive erosion iterations. This preserves the aspect ratio of small squares independent of orientation — uniform "shrinking" regardless of checker angle. This is identified in §III-F as one of the two most important enhancements.

**2. New quadrangle-linking heuristic (§III-B).** In the original, two quadrangles are linked if the closest pair of corners from each quad is within one edge length of both. Under severe distortion this proximity test fails: the geometrically correct neighbour is not the spatially nearest one. The replacement heuristic: for each candidate pair, draw four lines through the midsections of all four edges of both quads (Fig. 6); accept the pair only if both candidate corners lie on the same side of all four lines (i.e. inside the "yellow area" formed by the four lines). This geometric test holds under arbitrary projective/fisheye distortion and is identified in §III-F as the other of the two most important enhancements.

**3. Multi-run quadrangle linking (§III-D).** Radially uneven blur across a mirror's image means different checkers separate during different erosion levels: some are too merged at low erosion, others dissolved at high erosion. No single erosion level captures all quads. The fix: select the erosion run where the most quadrangles were found as the "reference pattern", then sweep all other runs and greedily add unmatched quads to the reference if they can be geometrically matched to its current border (§III-D, Fig. 7). This cross-run stitching is at the cost of some localisation accuracy (§III-D: "correct pattern extraction is therefore favored over corner accuracy").

**Adaptive linking distance (§III-C).** The original proximity threshold uses the shortest edge length of both quads. Under low resolution, erosion shrinks the quad by several pixels, making this threshold too tight. The fix: `d_limit = shortest edge length + 2 * erosion` (Eq. 1, the factor 2 because erosion acts on both quads).

**Polygonal approximation level (§III-E).** A tighter deviation threshold is used in the first pass to guarantee correct quad extraction at the price of fewer quads; the second pass uses a looser threshold to recover merged contours.

After detection, subpixel refinement is left to the toolbox's existing Harris corner finder (§IV-C). The Rufli–Scaramuzza paper is a *detection* paper, not a refinement paper.

# Assumptions

1. (hard) Full pattern must be visible in the image. The paper explicitly states this (§IV-A: "make sure that none of the checkers touch the border or got occluded") and notes (§II-B) that the OpenCV base algorithm "only returns a pattern if the complete checkerboard was successfully detected." The multi-run stitching relaxes this slightly but does not support partial-pattern recovery in the principled sense of OCPAD.
2. (hard) Pattern dimensions $(r, c)$ are known a priori. No grid-size auto-discovery.
3. (hard) Black-and-white two-level checkerboard. The erosion–quadrangle approach depends on binary thresholding to separate black checkers; coloured or greyscale patterns are out of scope.
4. (soft) White border of at least one checker width around the pattern (§IV-A). Under bright back-lighting, the adaptive threshold misidentifies a narrow white border as black, disrupting the entire pipeline. A wider border mitigates this.
5. (soft) No checker should be so small relative to the erosion step that it vanishes before separating from its neighbours (§IV-D.2, Fig. 11). This is the fundamental resolution limit: if the checker footprint equals the erosion kernel size, the quad never appears as a separate contour in any erosion run.
6. (soft) Reasonable blur isotropy per local region. Radially uneven blur is handled by the multi-run stitching, but if blur is so severe that a checker never separates in any erosion run, detection fails.

# Failure regime

- **Checker size near kernel size at lowest erosion.** When the checker's pixel footprint is ~3 px (matching the kernel), the checker either disappears immediately or never separates from its neighbours (§IV-D.2, Fig. 11). The multi-run stitching cannot recover quads that never appear as separate contours. This is the hard resolution floor of the method.
- **Back-lighting / bright surround.** The adaptive threshold can misclassify the white checkerboard border as a dark region when the surround is very bright (§IV-D.1). The resulting binary image looks like the checkerboard has no white border, causing quad detection to fail at the edges. The fix recommended by the paper is a wider white border and/or avoiding back-lit setups.
- **Extreme distortion breaking the geometric linking test.** The new heuristic in §III-B assumes that the four mid-edge lines of a quad divide the plane in a way that correctly separates the matched from unmatched corners. Under extreme fisheye distortion (very near the image border of a catadioptric rig), this geometric invariant can break down. The paper tests on hyperbolic and spherical mirrors up to the limits of §IV but does not characterise behaviour beyond those.
- **Pattern not fully visible.** The base algorithm inherits OpenCV's strict full-pattern requirement. Multi-run stitching only helps when checkers are present but not separated in a single erosion run; it cannot recover physically occluded or clipped checkers.
- **Localization accuracy degrades with strong erosion.** The multi-run approach trades localisation accuracy for detection rate when forced to use heavily-eroded quads from late erosion runs (§III-D: the most eroded quads produce the worst corner estimates).

# Numerical sensitivity

- **Erosion count schedule.** The paper applies a fixed schedule of increasing erosion iterations; the number is implicitly bounded by the point where all quads dissolve. No explicit stopping criterion is stated beyond "no more quads found". The multi-run stitching selects the most populated single-run result as the reference — a greedy max, not a global optimum.
- **Polygonal approximation threshold.** Two stages: a conservative (low deviation) threshold in pass one to reduce false quads; a looser threshold in pass two to recover merged contours (§III-E). The exact values are not given in the paper — "conserved to a conservative level" is qualitative. This is a tuning decision that affects the precision/recall tradeoff for quad detection.
- **Linking distance formula.** `d_limit = shortest_edge + 2 * erosion` (Eq. 1). This assumes the erosion count is measured in pixels and that both quads have eroded by the same amount, which holds if the pattern is uniform. Non-uniform checker sizes would violate this.
- **Adaptive threshold mask.** The original OpenCV method uses "mean" masking (fast). The paper does not change this — the "mean" vs "Gaussian" choice remains as in Vezhnevets, because execution speed matters for video-stream calibration (§II-A.2). Gaussian would be more robust to fine texture but is not adopted.
- **Corner accuracy.** The paper measures "corner inaccuracy" relative to a manual Harris-based reference (§IV-B). Mean errors are 0.62–1.05 px for the proposed method, 0.68–1.77 px for OpenCV. These are detection-stage errors before Harris subpixel refinement; after refinement, the errors are expected to be smaller but the paper does not report post-refinement accuracy.

# Applicability

- Use when: omnidirectional or catadioptric camera calibration is the goal and the calibration toolbox uses checkerboard patterns. Scaramuzza's OCamCalib toolbox ([15] in the paper) incorporates this detector directly as its automatic front-end.
- Use when: images suffer from moderate-to-heavy blur combined with radial distortion, and the detector is a preprocessing step feeding a Harris-based subpixel refiner. The detection gain (5–10× on the hardest test sets) is meaningful.
- Use when: the full pattern is reliably visible (no occlusion, no clipping). The detector requires this as a precondition.
- Don't use when: subpixel accuracy is critical without a downstream refiner. The paper's method is detection-only; ROCHADE provides integrated subpixel refinement via the cone-filter quadratic fit.
- Don't use when: partial pattern support is needed (e.g. when the pattern is observed at the image boundary or partially behind an object). Use OCPAD instead — it was designed specifically for this failure mode.
- Don't use when: image resolution is high and distortion is small. The paper acknowledges that on clean, high-resolution images the proposed method ties with vanilla OpenCV (§IV-C, §IV-B Tables II–III).
- Compared against:
  - **Vezhnevets (OpenCV)**: the direct baseline throughout. The proposed method consistently outperforms it on the problematic test sets while matching it on clean high-resolution images.
  - **Manual selection + Harris refinement**: used as reference for blurred test sets (sets 3, 6) where no automated ground truth exists. The proposed method approaches manual accuracy for non-trivially blurred conditions.

# Connections

- Builds on:
  - **Vezhnevets [17]** — the OpenCV `findChessboardCorners` implementation (adaptive threshold + erosion + quadrangle contour finding + linking + clique selection). The Rufli–Scaramuzza paper is an extension of this code, not a replacement of the underlying image-processing paradigm.
  - **Zhang 2000 [4]** — the calibration pipeline that checkerboard detection feeds into.
  - **Scaramuzza 2006 OCamCalib [6]** — the toolbox for which this detector was written; Scaramuzza is a co-author of both.
- Enables (in the atlas):
  - **rochade** — ROCHADE (Placht 2014) explicitly compares against OCamCalib (which uses this detector) in §3.2. ROCHADE outperforms Rufli–Scaramuzza on low-resolution distorted data (Mesa SR4000 stereo: ROCHADE 91/103 vs OCamCalib 50/103) but OCamCalib edges ahead on GoPro Hero 3 (100/100 vs ROCHADE 96/100), reflecting OCamCalib's specific tuning for wide-angle optics.
  - **duda-radon-corners** — the Duda 2018 paper cites Rufli–Scaramuzza as one of several prior x-corner methods, situating its Radon-transform approach in the broader lineage.
  - **ccdn-checkerboard-detector** — CCDN (Chen 2023) includes OCamCalib/Rufli as one of the classical baselines against which the deep-learning detector is benchmarked.
  - **ocpad** — indirectly: OCPAD (Fürsattel 2016) chains on ROCHADE's stage-1 graph, which was in part motivated by ROCHADE's comparison against OCamCalib in [placht2014-rochade]. OCPAD's own references do not include rufli2008-blurred directly (only placht2014-rochade), but the lineage runs through it.
- Relationship to OpenCV's detector family:
  - Rufli–Scaramuzza is the first published extension of `findChessboardCorners` for blurred/distorted images. It occupies the position in the lineage between the vanilla Vezhnevets implementation and the saddle-point graph methods (ROCHADE, OCPAD). It is not a subpixel method; it is a detection robustness method.

# Atlas update plan

## UPDATE: rochade

Section: Remarks (or Algorithm, OCamCalib comparison note)
- The `rochade` page already references `rufli2008-blurred` in `sources.references`. Its `sources.notes` correctly characterises the contrast: "ROCHADE replaces the quadrilateral extraction with saddle-point detection on a thinned gradient centreline and the clique search with a graph walk." No content gap for the current page; the ROCHADE vs OCamCalib comparison is surfaced in §3.2 of placht2014-rochade and is already captured in the `placht2014-rochade` research note's provenance.
- Optional future addition: a Remarks bullet could note that OCamCalib's detector (Rufli–Scaramuzza) is tuned for omnidirectional optics and outperforms ROCHADE on GoPro-class wide-angle cameras specifically (placht2014-rochade §3.2 Table 1: OCamCalib 100/100 vs ROCHADE 96/100 on GoPro). This is a nuance absent from the current page. Worth adding only if the page is elevated to `quality: canonical`.

## UPDATE: duda-radon-corners

Section: Remarks (prior-art note)
- The `duda-radon-corners` page references `rufli2008-blurred` in `sources.references`. The current page does not appear to include a Remarks note contextualising Rufli–Scaramuzza's role as a prior-art extension of OpenCV's detector. A one-sentence note would be appropriate when the page is next reviewed: Rufli–Scaramuzza extends OpenCV's `findChessboardCorners` with alternating erosion kernels and a distortion-robust linking heuristic, used by OCamCalib; Duda 2018 departs from the erosion–quadrangle paradigm entirely by using line-integral responses (Radon projections) per candidate corner.
- This is low priority — the connection is one of lineage, not direct algorithmic debt.

## UPDATE: ccdn-checkerboard-detector

Section: Algorithm (classical baselines)
- The `ccdn-checkerboard-detector` page references `rufli2008-blurred` in `sources.references`. CCDN includes OCamCalib (Rufli–Scaramuzza) as one of its classical detection baselines. The current page's Algorithm section can note that among the classical baselines compared in the CCDN paper, Rufli–Scaramuzza represents the morphological-erosion lineage (as distinct from the saddle-graph lineage of ROCHADE or the deep-learning approach of CCDN itself). This is a one-sentence contextual note; defer until a full review pass on the CCDN page.

# Provenance

- Paper full text: `docs/papers/.cache/rufli2008-blurred.txt` (5 pages, IEEE/RSJ IROS 2008).
- Abstract: "able to consistently identify 80% of the corners on omnidirectional images of as low as VGA resolution and approaches 100% correct corner extraction at higher resolutions, outperforming the existing implementation significantly."
- §I (Introduction): motivation for automatic checkerboard detection as a drop-in for OCamCalib, Bouguet, and Mei toolboxes. Prior toolboxes required manual corner clicking. Target conditions: low resolution (≥VGA), high distortion (omnidirectional), blur (catadioptric depth-of-field).
- §II-A (Vezhnevets algorithm steps): adaptive threshold → erosion (3×3 rect kernel) → quadrangle generation (binary contour finder + polygon approximation) → quadrangle linking (nearest-corner heuristic with edge-length distance limit) → pattern selection (most corners; smallest convex hull as tiebreaker).
- §II-B (Limitations): "algorithm ceases to function properly with any combination of low resolution (VGA), blurred, and distorted images."
- §III-A (Erosion kernels): alternating "cross" and "rect" 3×3 kernels for orientation-invariant checker shrinking. Identified in §III-F as one of the two most important improvements.
- §III-B (New linking heuristic): four-line geometric test based on quad mid-edge lines (Fig. 6). Identified in §III-F as the other most important improvement. "can be geometrically verified to work even under severe distortions."
- §III-C (Adaptive linking distance): `d_limit = shortest edge length + 2 · erosion` (Eq. 1).
- §III-D (Multi-run stitching): reference-pattern selection + greedy border extension from other erosion runs (Fig. 7). Trade-off: "correct pattern extraction is therefore favored over corner accuracy."
- §III-E (Polygonal approximation): conservative threshold in pass one, liberal in pass two.
- §III-F (Relative importance): kernel alternation and linking heuristic are the dominant gains. Others matter only for very low resolution and blurred images.
- §IV-A (Prerequisites): full-pattern visibility, white border ≥ one checker width, minimum resolution per checker.
- §IV-B (Results, Tables II–VII): six test sets spanning 1280×960 to 640×480, with/without blur, hyperbolic/spherical/Christmas-ball mirrors. Most dramatic result: Table VII (640×480, blur, spherical) — mean 33.4 vs 8.3 of 42 corners detected.
- §IV-C (Discussion): "our approach consistently outperforms OpenCV, except on high-resolution and nearly planar images where they are on equal footing." Harris corner finder in the downstream toolbox handles subpixel accuracy.
- §V (Conclusion): method works "just as well on nondistorted images as the original approach, but consistently outperforms it in low resolution, highly distorted and/or blurred images."
- Reference [15] = Scaramuzza OCamCalib toolbox: the paper's code was released as part of OCamCalib, establishing the Rufli–Scaramuzza / OCamCalib association.
- Reference [17] = Vezhnevets OpenCV calibration object detection: the direct baseline the paper extends.
