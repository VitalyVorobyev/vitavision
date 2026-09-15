---
title: Finding a Chessboard
date: 2026-09-15
summary: How chessboard detection moved its decisive evidence from the per-pixel X-corner response to grid topology, then to learned detectors, and finally into a target that identifies itself.
tagline: "Local evidence was never enough: follow the evidence as it leaves the pixel."
tags:
  - calibration
  - classical
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: foundations
    label: Foundations
  - id: response
    label: Local corner response
  - id: topology
    label: Grid topology
  - id: learned
    label: Learned detectors
  - id: targets
    label: Target design
nodes:
  - id: harris-corner-detector
    page: harris-corner-detector
    area: foundations
    role: origin
    takeaway: "Scores every pixel by det(M) − k·tr(M)² over the local structure tensor: general-purpose and rotation-invariant, but blind to X-junction geometry and contrast-unstable (R scales as ρ⁴)."
  - id: hessian-saddle-response
    page: hessian-saddle-response
    area: foundations
    role: survey
    takeaway: The second-order saddle test that is negative at X-corners and near zero at flat regions, edges and blobs — the shared discriminator behind ROCHADE, Laureano and PuzzleBoard's per-pixel saddle detection.
  - id: topological-grid-recovery
    page: topological-grid-recovery
    area: foundations
    role: survey
    takeaway: Verifies candidate corners by building a graph (Delaunay, k-NN or proximity) over them and accepting only configurations matching chessboard topology — structural rules instead of per-pixel thresholds.
  - id: chessboard-x-corner-detection
    page: chessboard-x-corner-detection
    area: foundations
    role: survey
    takeaway: Twenty-five years of X-corner methods organised along four design axes — response, multi-scale, structure recovery, subpixel — with a fourteen-method decision table for picking one.
    remark: "Open problems flagged on the page: no method yet handles fisheye-grade distortion plus extreme tilt without pre-rectification, and none bootstraps from heavy occlusion plus low contrast simultaneously."
  - id: geiger-chessboard-detector
    page: geiger-chessboard-detector
    area: response
    role: origin
    takeaway: Four-quadrant convolution likelihood at three fixed scales plus greedy energy-minimisation grid growth — the libcbdetect workhorse that recovers an unknown number of boards in one pass without a prior on (r, c).
  - id: chess-corners
    page: chess-corners
    area: response
    role: milestone
    takeaway: A radius-5, 16-sample ring score tuned to alternating bright–dark X-junctions — the first chessboard-specific response function, faster than graph-based detectors but with no built-in sub-pixel refinement.
  - id: duda-radon-corners
    page: duda-radon-corners
    area: response
    role: alternative
    takeaway: Approximates a localized Radon transform with rotated 1-D box filters at four angles; the max-minus-min directional integral is noise-robust and reaches about 1/100-pixel accuracy on crisp synthetic corners.
  - id: pyramidal-blur-aware-xcorner
    page: pyramidal-blur-aware-xcorner
    area: response
    role: milestone
    takeaway: Runs a ChESS-style ring template at every pyramid level and keeps, per corner, the level maximising intensity-per-resolution; level-dependent edge spacing handles corners whose neighbours sit at different blur scales.
  - id: gp-checkerboard-enhancement
    page: gp-checkerboard-enhancement
    area: response
    role: fix
    takeaway: "Wraps any upstream detector: two Gaussian processes learn the board-to-pixel map from whatever partial board is found, predicting occluded or out-of-frame corners and smoothing every allocated one."
  - id: shu-topological-grid
    page: shu-topological-grid
    area: topology
    role: origin
    takeaway: Delaunay-triangulates corner candidates, merges same-colour triangle pairs into quads, drops quads failing a degree-4 or aspect-ratio test, and flood-fills integer grid coordinates from a seed — purely combinatorial.
  - id: laureano-topological-chessboard
    page: laureano-topological-chessboard
    area: topology
    role: correction
    takeaway: Extends Shu's pipeline with a ring-alternation X-corner detector and a triangle-level (not quad-level) topological filter, adding an explicit Hessian subpixel solve at surviving vertices only.
  - id: rochade
    page: rochade
    area: topology
    role: milestone
    takeaway: Thins the gradient-magnitude edge map to a single-pixel centreline graph and takes degree-3-or-more nodes as saddle corners, refined by a cone-filtered quadratic fit; 91/103 detections at extreme pose versus OpenCV's 8/103.
  - id: ocpad
    page: ocpad
    area: topology
    role: fix
    takeaway: Reuses ROCHADE's centreline graph verbatim and replaces its strict r-by-c corner-count check with VF2 subgraph isomorphism, recovering the largest matching subgraph from a partially occluded pattern.
  - id: mate-checkerboard-detector
    page: mate-checkerboard-detector
    area: learned
    role: origin
    takeaway: "First learned X-corner detector: a 2,939-parameter, three-convolution CNN trained with MSE against a binary corner mask; no NMS or clustering, so a fixed 0.5 threshold yields 492 false positives on the uEye set."
    remark: "The page is still a stub: every architectural claim is sourced through the CCDN note and the registry, not the primary text."
  - id: ccdn-checkerboard-detector
    page: ccdn-checkerboard-detector
    area: learned
    role: correction
    takeaway: Doubles MATE's depth to six convolutions, swaps MSE for balanced cross-entropy, and adds adaptive-threshold plus NMS plus k-means++ post-processing — cuts uEye false positives from 492 to 93.
  - id: ccs-camera-calibration
    page: ccs-camera-calibration
    area: learned
    role: alternative
    takeaway: "A full learned pipeline: CNN distortion correction, a UNet 2D-Gaussian heatmap detector with SVD sub-pixel fitting, and image-level RANSAC over Zhang calibration — 0.37 px real-data reprojection error."
  - id: puzzleboard
    page: puzzleboard
    area: targets
    role: frontier
    takeaway: "Overlays the checkerboard with binary circles encoding a 501×501 de Bruijn map: any local 3×3 neighbourhood of decoded corners yields an absolute grid position, tolerating up to 40% corrupted bits."
    remark: "Backward compatible: the edge-midpoint circles do not interfere with the saddle test, so a generic checkerboard corner detector still locates corners on a PuzzleBoard; position decoding is additive."
  - id: q-target-robustness
    question: Once the target identifies itself, what is left for the detector to be robust to — and does the corner response still matter?
    area: targets
    role: question
    takeaway: Self-identification changes what a wrong corner costs, not whether the response can still find one.
edges:
  - from: harris-corner-detector
    to: chess-corners
    type: bridge
    label: domain-specific
  - from: harris-corner-detector
    to: hessian-saddle-response
    type: bridge
    label: second-order op
  - from: hessian-saddle-response
    to: laureano-topological-chessboard
    type: prerequisite
  - from: hessian-saddle-response
    to: rochade
    type: prerequisite
  - from: hessian-saddle-response
    to: puzzleboard
    type: prerequisite
  - from: chess-corners
    to: pyramidal-blur-aware-xcorner
    type: contrast
    label: single-scale vs pyramid
  - from: geiger-chessboard-detector
    to: pyramidal-blur-aware-xcorner
    type: evolution
    label: full pyramid
  - from: duda-radon-corners
    to: pyramidal-blur-aware-xcorner
    type: evolution
    label: spoke = Radon approx
  - from: chess-corners
    to: duda-radon-corners
    type: contrast
    label: ring vs ray
  - from: topological-grid-recovery
    to: shu-topological-grid
    type: prerequisite
  - from: topological-grid-recovery
    to: laureano-topological-chessboard
    type: prerequisite
  - from: topological-grid-recovery
    to: ocpad
    type: prerequisite
  - from: shu-topological-grid
    to: laureano-topological-chessboard
    type: evolution
    label: triangle-level filter
  - from: rochade
    to: ocpad
    type: evolution
    label: adds partial-match
  - from: ocpad
    to: gp-checkerboard-enhancement
    type: contrast
    label: match vs regress
  - from: chess-corners
    to: mate-checkerboard-detector
    type: bridge
    label: learned replacement
  - from: mate-checkerboard-detector
    to: ccdn-checkerboard-detector
    type: evolution
    label: deeper, thresholded
  - from: ccdn-checkerboard-detector
    to: ccs-camera-calibration
    type: contrast
    label: detector vs pipeline
  - from: chessboard-x-corner-detection
    to: ccs-camera-calibration
    type: prerequisite
  - from: puzzleboard
    to: q-target-robustness
    type: bridge
    label: what remains?
  - from: chessboard-x-corner-detection
    to: q-target-robustness
    type: bridge
    label: open problem
lenses:
  - id: overview
    title: Overview
    coords:
      harris-corner-detector:
        - 0
        - 0
      topological-grid-recovery:
        - 1.8
        - 0
      hessian-saddle-response:
        - 3.4
        - 0
      chessboard-x-corner-detection:
        - 7.6
        - 0
      geiger-chessboard-detector:
        - 2.6
        - 1
      chess-corners:
        - 3.2
        - 1
      duda-radon-corners:
        - 5
        - 1
      pyramidal-blur-aware-xcorner:
        - 5.6
        - 1
      gp-checkerboard-enhancement:
        - 6.8
        - 1
      shu-topological-grid:
        - 1.6
        - 2
      laureano-topological-chessboard:
        - 3.3
        - 2
      rochade:
        - 3.9
        - 2
      ocpad:
        - 4.5
        - 2
      mate-checkerboard-detector:
        - 4.6
        - 3
      ccs-camera-calibration:
        - 6.2
        - 3
      ccdn-checkerboard-detector:
        - 6.9
        - 3
      puzzleboard:
        - 7.4
        - 4
      q-target-robustness:
        - 8.2
        - 4
  - id: local-response
    title: Local response
    coords:
      harris-corner-detector:
        - 0
        - 0
      hessian-saddle-response:
        - 2
        - 0
      chessboard-x-corner-detection:
        - 6
        - 0
      geiger-chessboard-detector:
        - 1.6
        - 1
      chess-corners:
        - 2.4
        - 1
      duda-radon-corners:
        - 3.6
        - 1
      pyramidal-blur-aware-xcorner:
        - 4.4
        - 1
      gp-checkerboard-enhancement:
        - 5.2
        - 1
  - id: topology-beats-appearance
    title: Topology beats appearance
    coords:
      topological-grid-recovery:
        - 0
        - 0
      shu-topological-grid:
        - 1
        - 1
      laureano-topological-chessboard:
        - 2
        - 1
      rochade:
        - 3
        - 1
      ocpad:
        - 4
        - 1
      puzzleboard:
        - 5
        - 2
      q-target-robustness:
        - 6
        - 2
steps:
  - title: The X-corner is not a generic corner
    anchor: the-x-corner-is-not-a-generic-corner
    claim: Harris's structure-tensor response scales as ρ⁴ under exposure change and encodes no X-junction geometry, so chessboard detectors replaced it with domain-specific response functions and, later, a second-order operator that separates saddles from blobs and edges.
    focus:
      - harris-corner-detector
      - hessian-saddle-response
  - title: Hand-crafted responses compete on speed and blur
    anchor: hand-crafted-responses-compete-on-speed-and-blur
    claim: ChESS's 16-sample ring, Geiger's four-quadrant convolutions, Duda's Radon-ray integrals and Abeles's per-corner pyramid level are four bets on what a single-pixel response should measure; none dominates every blur and speed regime at once.
    focus:
      - chess-corners
      - geiger-chessboard-detector
      - duda-radon-corners
      - pyramidal-blur-aware-xcorner
  - title: When the response is not enough, ask topology
    anchor: when-the-response-is-not-enough-ask-topology
    claim: "Shu (2009) and Laureano (2013) stop trusting the per-pixel score alone and verify every candidate against the expected chessboard graph: a Delaunay triangulation filtered by degree and colour-alternation rules."
    focus:
      - topological-grid-recovery
      - shu-topological-grid
      - laureano-topological-chessboard
  - title: Occlusion breaks the grid, not the corner
    anchor: occlusion-breaks-the-grid-not-the-corner
    claim: ROCHADE's centreline-graph saddle detector survives blur that defeats per-pixel operators, but a strict r-by-c corner count still fails on any occluded board; OCPAD and GP enhancement repair that failure by opposite mechanisms — exact matching and learned regression.
    focus:
      - rochade
      - ocpad
      - gp-checkerboard-enhancement
  - title: Detectors that learn the response
    anchor: detectors-that-learn-the-response
    claim: MATE replaces the hand-crafted response with a tiny trained CNN; CCDN doubles its depth and fixes its false-positive rate; CCS wraps a learned heatmap detector inside a full calibration pipeline with distortion correction and RANSAC.
    focus:
      - chess-corners
      - mate-checkerboard-detector
      - ccdn-checkerboard-detector
      - ccs-camera-calibration
  - title: The target identifies itself
    anchor: the-target-identifies-itself
    claim: "PuzzleBoard overlays the checkerboard with binary circles encoding a de Bruijn map, so any local neighbourhood of decoded corners yields an absolute grid position: corner-to-grid assignment stops being a detection problem and becomes a decoding one."
    focus:
      - puzzleboard
  - title: What remains for the detector to be robust to
    anchor: what-remains-for-the-detector-to-be-robust-to
    claim: "The fourteen-method decision table still has no answer for fisheye-grade distortion combined with extreme tilt, or for occlusion and low contrast at once: self-identification changes what a wrong corner costs, not whether the response can still find one."
    focus:
      - chessboard-x-corner-detection
      - puzzleboard
      - q-target-robustness
---

Twenty-five years of chessboard corner detection form one long argument about where the decisive evidence should live. A checkerboard X-corner looks, to a generic detector, like any other place where intensity varies in two directions — the detector cannot by itself tell a true target junction from a blob, an edge crossing, or background clutter. The methods in this story respond by relocating the evidence: first from the raw pixel response to the shape of its local neighbourhood, then from the neighbourhood to the topology of the whole grid, then from hand-crafted topology to a learned response function, and finally into the target itself, redesigned to announce its own position. Each move repairs a specific failure the previous stage could not fix, and each fix exposes the next one.

## The X-corner is not a generic corner

[Harris Corner Detector](/atlas/harris-corner-detector) scores every pixel by $R = \det(M) - k \cdot \operatorname{tr}(M)^2$, where $M$ is the gradient covariance matrix summed over a local window. The response is general-purpose: it fires at corners, blobs, and edge intersections without any notion of X-junction geometry, and under an exposure change $I \to \rho I$ it scales as $\rho^4$, forcing a fresh detection threshold for every image. Chessboard detection needs something narrower. The [Hessian Saddle Response](/atlas/hessian-saddle-response) supplies it: instead of the gradient-covariance matrix $M$, it uses the image Hessian $H$, whose determinant is negative at a saddle point and near zero at flat regions, edges, and blobs. Harris's structure tensor is positive semi-definite by construction and cannot separate a saddle from a blob; the Hessian's signed eigenvalues can. The operator traces back to a 2005 Taylor-expansion solve for X-corners, and the atlas concept page describes it as a direct variant of the Harris structure-tensor idea — the same appeal to a $2\times2$ local matrix and its determinant, aimed at a different local shape. That single operator becomes the shared per-pixel discriminator for nearly every full-pattern detector later in this story.

## Hand-crafted responses compete on speed and blur

[ChESS Corners](/atlas/chess-corners) narrows the response to the X-junction itself: 16 fixed integer offsets on a radius-5 ring feed three difference sums, combined into a single score with no interpolation and no trigonometry — a domain-specific alternative to the Harris structure tensor, tuned to alternating bright-dark quadrants rather than general intensity variation. [Geiger Chessboard Corner Detector](/atlas/geiger-chessboard-detector) makes a different bet: a four-quadrant convolution likelihood evaluated at three fixed window sizes, $4 \times 4$, $8 \times 8$, $12 \times 12$, then verified against a 32-bin gradient-orientation histogram. The three scales are chosen empirically, and the design stalls when blur falls between them. [Localized Radon Checkerboard Corners](/atlas/duda-radon-corners) replaces both ring sampling and quadrant convolution with 1-D box-filter line integrals along four discrete angles; because box sums attenuate noise while gradients amplify it, the response trades ChESS's per-pixel simplicity for robustness under blur and low contrast.

[Pyramidal Blur-Aware X-Corner Chessboard Detector](/atlas/pyramidal-blur-aware-xcorner) attacks the scale problem directly: it runs a ChESS-style 16-sample template at every level of a full image pyramid and keeps, per corner, the level that maximizes intensity divided by resolution. On the standard 2021 benchmark this beats Geiger's four-quadrant likelihood, F1 0.97 against 0.92. Its edge-validation pass also inherits Duda's box-filter idea directly — the paper describes the spoke pass as conceptually similar to the approximated Radon transform. None of the four hand-crafted responses dominates every regime: each is a different bet on what a single-pixel score should measure, and each still hands its candidates to a separate stage before a full board can be trusted.

## When the response is not enough, ask topology

When a per-pixel response cannot separate every true corner from every false one, the next move is to stop trusting individual pixels and verify candidates against the graph they form. [Topological Grid Recovery](/atlas/topological-grid-recovery) names this shift: a permissive detector first over-generates candidates, then a graph built over them — Delaunay triangulation, a k-nearest-neighbour graph, or a subgraph search — accepts only configurations matching chessboard topology, decoupling recall from precision. [Topological Grid Finding](/atlas/shu-topological-grid) is the first instance: Delaunay-triangulate the candidate corners, merge each triangle with its one same-colour edge-neighbour into a quadrilateral, then drop any quad whose vertex degree exceeds four at two or more nodes, or whose opposite-edge length ratios do not stay below ten. What survives is flood-filled with integer grid coordinates from a seed quad, and three marker circles on the pattern fix the origin and x-axis.

[Chessboard Detection via X-Corners and Topology](/atlas/laureano-topological-chessboard) keeps the Delaunay backbone but moves the filter down to individual triangles: a triangle is legal only if its interior is uniform and it has at most two edge-neighbours with the same colour, iterated to a fixed point. The paper positions itself explicitly as extending the Shu et al. pipeline with a per-pixel detector and a refined topological filter. Subpixel refinement — the Chen-Zhang Hessian solve — runs only at vertices that already passed the topology test, so refinement compute is never spent on a false candidate.

## Occlusion breaks the grid, not the corner

Topology filtering assumes the candidate graph is roughly right; it does not repair a graph that is missing a large piece. [ROCHADE](/atlas/rochade) pushes robustness further by reducing the gradient-magnitude edge map to a single-pixel centreline graph and reading off inner corners as saddle points — vertices of degree at least three — refined by fitting a bivariate quadratic to a cone-filtered neighbourhood. The design still requires the full pattern: verification checks that a connected component contains exactly the expected number of saddle clusters in the right adjacency, and any occluded or cropped corner fails that check outright. The page notes that this same stage-1 graph is the input required by OCPAD to recover partially occluded patterns, and that the rest of the pipeline is reused verbatim — only the strict full-pattern check needs replacing.

[OCPAD](/atlas/ocpad) does exactly that: it inherits ROCHADE's early stages and swaps the strict corner-count check for VF2 subgraph isomorphism against a model graph, driven by a binary-search driver over how many candidate vertices to include. [GP Checkerboard Enhancement](/atlas/gp-checkerboard-enhancement) repairs the same failure by an unrelated mechanism: it trains two independent Gaussian processes on whatever board-to-pixel pairs an upstream detector already allocated, then uses the posterior mean to predict pixel coordinates for grid positions with no detection at all — occluded, out of frame, or simply missed. The two repairs are complementary by construction: OCPAD recovers a partial visible subgraph, while GP enhancement fills in occluded or out-of-frame corners with smooth refinement.

## Detectors that learn the response

A fifth move replaces the hand-crafted response function itself with one learned from data. [MATE](/atlas/mate-checkerboard-detector) is the first such detector: a three-convolution CNN with 2,939 parameters, trained by mean-squared error between the predicted response map and a binary corner mask, and the atlas marks it a learned alternative to ChESS's hand-crafted ring score. Its post-processing is minimal — a fixed 0.5 threshold, no non-maximum suppression, no clustering — and on the ROCHADE uEye benchmark that produces 492 false positives. [CCDN](/atlas/ccdn-checkerboard-detector) doubles MATE's depth to six convolutional layers, replaces the mean-squared error with a weighted cross-entropy loss, and stacks an adaptive threshold, non-maximum suppression, and k-means++ clustering on top; the same benchmark's false-positive count drops from 492 (MATE) to 93.

[CCS](/atlas/ccs-camera-calibration) widens the scope from detector to pipeline. It embeds a UNet 2D-Gaussian heatmap detector, extracts the subpixel mean by an SVD-based surface fit, and wraps the result in a CNN distortion-correction stage upstream and a RANSAC-stabilised Zhang calibration downstream, reaching 0.37 px real-data reprojection error against a MATLAB Zhang baseline's 0.45 px. The distinction from CCDN is one of scope, not of accuracy alone: CCDN is a standalone per-pixel corner detector, where CCS is a complete calibration pipeline. Three papers, three answers, but the same substitution at their core: a trained function stands in for the ring score, the quadrant convolution, or the centreline graph that came before it.

## The target identifies itself

[PuzzleBoard](/atlas/puzzleboard) closes the loop by redesigning the target rather than the detector. It finds saddle-point corners from a Hessian response, the same family used by ROCHADE and Laureano, then builds a 9-nearest-neighbour graph over them, disambiguates direct grid edges from diagonals using the Hessian eigenvector directions at each corner, and reconstructs the grid with a Kruskal minimum spanning forest. What is new is what happens next: every checkerboard edge carries one bit, encoded as a small circle at the edge midpoint, and the full $501 \times 501$ pattern is the superposition of two binary de Bruijn factor maps. Reading the circles near a detected corner and cross-correlating against the two factor maps recovers that corner's absolute grid coordinate directly — no boundary marker, no full-pattern requirement. Majority voting across the pattern's built-in bit repetition tolerates up to 40% of the raw observed bits being corrupted before decoding fails. The circles are strictly additive: a generic checkerboard corner detector still locates corners on a PuzzleBoard, since the position decoding rides on top of the saddle test without interfering with it.

## What remains for the detector to be robust to

[Chessboard X-Corner Detection](/atlas/chessboard-x-corner-detection), the survey that ties this whole family together, records two open problems that none of the preceding six moves has closed. No current method handles fisheye-grade lens distortion combined with extreme tilt without an explicit pre-rectification step; PuzzleBoard's de-Bruijn decoding tolerates more distortion than the grid-topology methods, but only by requiring its own specific target rather than an ordinary checkerboard. And occlusion combined with low contrast defeats both repair mechanisms from earlier in the story at once: OCPAD requires a strong upstream graph, GP enhancement requires a partial board fragment, and neither bootstraps from a detector that returns almost nothing.

PuzzleBoard's own saddle detector is a reminder of how narrow the actual advance is. Its response is the same Harris-penalised Hessian form, $s = f_{xy}^2 - f_{xx}f_{yy} - k(f_{xx}+f_{yy})^2$, that ROCHADE and Laureano build on in other guises — self-identification changes what happens after a corner is found, not whether the per-pixel discriminator can find one in the first place. The survey's own closing question asks whether the field even needs to keep improving that discriminator: does the small specialised target make pretraining unnecessary, or would a larger model improve robustness on the multispectral and low-contrast cases no hand-crafted response yet reaches. Once the target identifies itself, what is left for the detector to be robust to, and does the corner response still matter?
