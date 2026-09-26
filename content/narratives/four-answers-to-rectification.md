---
title: Four Answers to Rectification
summary: "Stereo rectification has one goal, corresponding points on the same scanline, and four coexisting answers that differ only in what they assume: Hartley's minimal-distortion projective map, Loop and Zhang's decomposed criteria, Pollefeys' polar reparametrisation around the epipole, and Fusiello's compact calibrated form."
tagline: Same goal, four assumption sets, no winner.
tags:
  - stereo
  - rectification
  - geometry
  - classical
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: constraint
    label: Constraint
  - id: uncalibrated
    label: Uncalibrated (Projective)
  - id: calibrated-polar
    label: Calibrated / Polar
nodes:
  - id: epipolar-geometry
    page: epipolar-geometry
    area: constraint
    role: origin
    takeaway: "Two views of a scene share one constraint: a point visible in one image must lie on a specific line in the other, fixed entirely by the two camera positions. That collapses stereo search from 2-D to 1-D, but the line is slanted, not a shared row, until the pair is rectified."
    remark: The methods below all turn this epipolar-line search into a same-row scanline search by resampling the pair so conjugate epipolar lines become collinear rows.
  - id: stereo-rectification
    page: stereo-rectification
    area: constraint
    role: bridge
    takeaway: Rectification warps a stereo pair so corresponding epipolar lines become collinear rows, turning dense correspondence into a scanline search. Four methods solve exactly this problem, differing only in what each assumes about calibration and where the epipole sits.
    remark: "The decision table lines the four up on four axes: calibration required, epipole location, shape of the rectifying map, and what, if anything, each one minimises."
  - id: hartley-projective-rectification
    page: hartley-projective-rectification
    area: uncalibrated
    role: milestone
    takeaway: Needs only the fundamental matrix. Sends the epipole to infinity with a quasi-affine map, then fixes the matching transform by minimising horizontal disparity in closed form. The guarantee holds only when the epipole lies outside the view window.
    remark: Inside the window the only stated remedy is to shrink the window; the rectified pair carries no metric information, only an unknown 3-D projectivity.
  - id: loop-zhang-rectification
    page: loop-zhang-rectification
    area: uncalibrated
    role: milestone
    takeaway: "Starts from the same fundamental matrix as Hartley but asks a different question: not least disparity but least distortion. Each homography is factored into projective, similarity and shearing stages, and the projective part is chosen to minimise distortion."
    remark: Zero distortion is unreachable outside the case where the epipole already starts at infinity, and the criterion needs an iterative degree-7 root-find with no proven bound on the result.
  - id: pollefeys-polar-rectification
    page: pollefeys-polar-rectification
    area: calibrated-polar
    role: milestone
    takeaway: "Abandons the planar rectified image altogether: each epipolar line is reparametrised in polar coordinates around the epipole, so an epipole sitting inside the frame is simply not a problem. Needs only the oriented fundamental matrix."
    remark: Output is non-rectangular and visibly warped, but its size is bounded purely by the source image dimensions, never by how close the epipole is to the frame.
  - id: fusiello-compact-rectification
    page: fusiello-compact-rectification
    area: calibrated-polar
    role: milestone
    takeaway: "Trades the other three methods' minimal inputs for a stronger one: both projection matrices already known. In exchange it gets a genuinely closed form, a 22-line construction sharing a new orientation and intrinsics between the two cameras."
    remark: The result is Euclidean, so metric depth is recoverable; it fails only under pure forward motion, when the optical axis runs parallel to the baseline.
edges:
  - from: epipolar-geometry
    to: stereo-rectification
    type: prerequisite
  - from: stereo-rectification
    to: hartley-projective-rectification
    type: prerequisite
  - from: stereo-rectification
    to: loop-zhang-rectification
    type: prerequisite
  - from: stereo-rectification
    to: pollefeys-polar-rectification
    type: prerequisite
  - from: stereo-rectification
    to: fusiello-compact-rectification
    type: prerequisite
  - from: hartley-projective-rectification
    to: loop-zhang-rectification
    type: contrast
    label: disparity vs distortion
  - from: hartley-projective-rectification
    to: pollefeys-polar-rectification
    type: contrast
    label: planar vs polar
  - from: hartley-projective-rectification
    to: fusiello-compact-rectification
    type: contrast
    label: F only vs known P
  - from: loop-zhang-rectification
    to: pollefeys-polar-rectification
    type: contrast
    label: planar vs polar
lenses:
  - id: overview
    title: Overview
    coords:
      epipolar-geometry:
        - 0
        - 0
      stereo-rectification:
        - 1.5
        - 0
      hartley-projective-rectification:
        - 3
        - 1
      loop-zhang-rectification:
        - 4.4
        - 1
      pollefeys-polar-rectification:
        - 3
        - 2
      fusiello-compact-rectification:
        - 4.4
        - 2
  - id: assumptions
    title: What each one assumes
    coords:
      hartley-projective-rectification:
        - 0
        - 0
      loop-zhang-rectification:
        - 1.5
        - 0
      fusiello-compact-rectification:
        - 4
        - 0
      pollefeys-polar-rectification:
        - 0
        - 2
steps:
  - title: One Constraint, Four Ready Answers
    anchor: one-constraint-four-answers
    claim: "Correspondence search is 2-D until rectification makes it 1-D: the epipolar constraint says a point in one image must lie on a known line in the other, and rectification resamples the pair so that line becomes a shared row. Four papers solved this within two years of each other, one difference apart: what each assumes it already knows."
    focus:
      - epipolar-geometry
      - stereo-rectification
  - title: "Hartley: Least Disparity, No Calibration"
    anchor: hartley-least-disparity
    claim: "Hartley needs nothing beyond the fundamental matrix: he sends the epipole to infinity with a quasi-affine map, then fixes the matching homography by minimising horizontal disparity in closed form. The guarantee holds only when the epipole sits outside the view window; his own fix for an inside epipole is just to shrink the window."
    focus:
      - hartley-projective-rectification
  - title: "Loop-Zhang: Least Distortion, Same Inputs"
    anchor: loop-zhang-least-distortion
    claim: "Loop and Zhang start from the same fundamental matrix but ask a different question: not least disparity but least distortion. They factor each homography into projective, similarity and shearing stages and pick the projective part to minimise distortion, at the cost of an iterative degree-7 root-find with no proven closeness to the true optimum."
    focus:
      - loop-zhang-rectification
  - title: "Pollefeys: No Planar Image At All"
    anchor: pollefeys-polar-reparametrisation
    claim: Pollefeys refuses the planar rectified image altogether. He reparametrises each epipolar line in polar coordinates around the epipole, so an epipole sitting inside the frame, the case that breaks both Hartley and Loop-Zhang, is simply not a problem; the price is a non-rectangular, visibly warped output.
    focus:
      - pollefeys-polar-rectification
  - title: "Fusiello: Assume Calibration, Get a Closed Form"
    anchor: fusiello-compact-closed-form
    claim: "Fusiello trades the other three methods' minimal assumptions for a stronger one: both cameras already calibrated. In exchange he gets a genuinely closed-form, 22-line construction with a Euclidean result, metric depth included, that fails only in the single degenerate case of pure forward motion."
    focus:
      - fusiello-compact-rectification
---

## One Constraint, Four Answers

[Epipolar Geometry](/atlas/epipolar-geometry) ties two views of a scene to one fact: a point visible in one image must lie on a specific line in the other, fixed entirely by where the two cameras sit. Searching along that line already turns correspondence from a 2-D scan into a 1-D scan of a line, but the line is slanted and tilts differently for every query point, so the search still touches the whole second image.

[Stereo Rectification](/atlas/stereo-rectification) removes the slant. It resamples the pair so that every pair of conjugate epipolar lines maps to a single common image row, and once that holds, corresponding points fall on the same image row and dense correspondence becomes a same-row scanline search. Four methods solve exactly this resampling problem, published within a sixteen-month window between 1999 and 2000.

None of the four supersedes another, and the gap between their publication dates is too short to explain why more than one is still in use. What separates them is what each is willing to assume about the cameras before it starts: nothing beyond a fundamental matrix, that matrix plus one extra correspondence for orientation, or full metric calibration with both perspective projection matrices known. That assumption, not the calendar, decides which of the four applies to a given rig.

## Hartley: Least Disparity

[Hartley Projective Rectification](/atlas/hartley-projective-rectification) needs nothing beyond the fundamental matrix; no camera matrices or calibration are used, the construction depends on the fundamental matrix alone. A translation sends a chosen reference point to the origin, a rotation about the origin aligns the translated epipole with the x-axis, and a perspectivity sends that aligned epipole to infinity, a construction the method describes as sending the epipole to infinity with a quasi-affine perspectivity. Fixing the matching transform for the other image is then a genuine least-squares problem, minimising horizontal disparity between conjugate points, and restricting that transform to an affine form is what keeps this fit linear.

The construction is not universal. Its correctness proof needs the epipole outside the view window; when the epipole lies inside it instead, forward or near-forward motion, the paper's only stated remedy is to shrink the view window or choose a different reference point, with no guarantee of a valid full-window solution.

That unresolved case, an epipole that will not leave the window, is exactly where the next two methods diverge from Hartley and from each other.

## Loop-Zhang: Least Distortion

[Loop-Zhang Rectifying Homographies](/atlas/loop-zhang-rectification) starts from the same fundamental matrix as Hartley but asks a different question, not least disparity but least distortion. Each homography is factored as a projective component chosen from a quantifiable 2-D distortion-minimization criterion, a similarity component that aligns epipolar lines with the horizontal axis, and a shearing component that spends the remaining degrees of freedom to further reduce distortion.

The projective component is the hard part. Its criterion has no closed form; it requires an iterative degree-7 polynomial root-find, with no proven bound on distance from the optimum, and the seed for that iteration comes from solving the two single-image terms separately in closed form.

The method still sends the epipole toward infinity to build the projective component, so an epipole located inside the image frame drives part of the rectified image toward infinity, forcing cropping in practice, the same limit Hartley's construction hits. Neither of these two homography-based methods has an answer for an epipole that stays inside the frame.

## Pollefeys: Polar Reparametrisation

[Pollefeys Polar Rectification](/atlas/pollefeys-polar-rectification) refuses the planar rectified image both earlier methods depend on. Instead of sending the epipole toward infinity, it reparametrizes each image in polar coordinates centered on its own epipole, so the epipole becomes the pole of the coordinate system rather than a point that must be pushed outward. Orientation is fixed from the usual seven or more correspondences used to estimate the fundamental matrix, plus one additional correspondence used solely to fix orientation.

Because nothing is ever sent to infinity, the output-size bound is combinatorial, not data-dependent: it depends only on the source dimensions, unlike planar rectification's output size, which grows without bound as the epipole approaches the image. An epipole sitting inside the frame, the exact case that breaks Hartley and Loop-Zhang, is simply not a problem here.

The price is shape: the rectified images are non-rectangular and visibly distorted compared to a planar-homography-rectified pair. None of these first three methods can recover metric depth from its output; all three are projective, working from the fundamental matrix alone.

## Fusiello: Compact Closed Form

[Fusiello Compact Stereo Rectification](/atlas/fusiello-compact-rectification) trades the other three methods' minimal inputs for a stronger one: the two known perspective projection matrices of the original cameras, intrinsics and extrinsics included. In exchange it gets a direct construction whose shared new orientation is assembled row-by-row as an orthonormal frame from three geometric constraints tied to the baseline, and the entire construction is 22 lines of MATLAB.

Because both new projection matrices carry the same intrinsics and an orientation anchored to the real baseline, the result is a Euclidean rectification: disparity between rectified images inverts metrically as $Z = fB/d$, and 3-D points can be triangulated from the rectified images with the new PPMs. That is the one result none of the other three methods can offer from a fundamental matrix alone.

The construction fails outright when the optical axis is parallel to the baseline, pure forward motion, since the cross product defining the new axis degenerates to zero. Outside that single case, four methods answer the same rectification problem to four different specifications, and the choice between them is settled by which assumption about the cameras already holds, not by which paper came first.
