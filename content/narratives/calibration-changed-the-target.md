---
title: Calibration Changed the Target
date: 2026-09-15
summary: How camera calibration became practical by changing the target, from a precision 3-D fixture to a printed plane in free poses, and then by letting the camera model reach past the pinhole.
tagline: The mathematics barely changed. The target did.
tags:
  - calibration
  - classical
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: model
    label: Camera model
  - id: target
    label: Calibration target
  - id: fit
    label: Estimation and refinement
  - id: beyond
    label: Beyond the pinhole
nodes:
  - id: pinhole-camera-model
    page: pinhole-camera-model
    area: model
    role: origin
    takeaway: Projects a 3-D point through a single centre onto the image plane via the map to scale K[R|t]M; the five-DOF intrinsic matrix K and per-view (R,t) are exactly what every method below recovers, and depth is what the projection discards.
  - id: homography
    page: homography
    area: model
    role: bridge
    takeaway: A 3x3 matrix mapping a planar target's surface to the image up to scale; Zhang, Sturm-Maybank, and Kannala-Brandt all reduce calibration to estimating one homography per view, then decomposing it into K and (R,t).
  - id: camera-distortion-models
    page: camera-distortion-models
    area: model
    role: survey
    takeaway: Surveys the lineage from Tsai's single radial term, through Weng's full radial-plus-tangential Brown-Conrady polynomial and Zhang's two-term radial, to Kannala-Brandt's odd-power polynomial in incidence angle, the only one that stays finite past 90 degrees.
  - id: bundle-adjustment
    page: bundle-adjustment
    area: fit
    role: bridge
    takeaway: Joint nonlinear least-squares refinement of intrinsics, distortion, and per-view extrinsics against total reprojection error; every method below pairs a closed-form linear seed with this same Levenberg-Marquardt polish.
  - id: tsai-versatile-calibration
    page: tsai-versatile-calibration
    area: target
    role: origin
    takeaway: Recovers extrinsics and image scale linearly via the radial-alignment constraint from a precision 3-D fixture built to roughly 0.1x the desired accuracy, then refines focal length, depth, and one radial term by a short nonlinear solve.
    remark: "quality: historical. Superseded for practical use by Zhang's planar method; preserved as the citation root for Tsai-Lenz hand-eye calibration and for the radial-alignment-constraint trick itself."
  - id: sturm-plane-based-calibration
    page: sturm-plane-based-calibration
    area: target
    role: alternative
    takeaway: Derives the identical two IAC-on-homography constraints as Zhang, independently, at CVPR 1999, adding an exhaustive singularity catalogue (Tables 1-2) and a variable-intrinsics extension for zooming cameras that Zhang's method does not attempt.
  - id: zhang-planar-calibration
    page: zhang-planar-calibration
    area: target
    role: milestone
    takeaway: Replaces Tsai's precision 3-D fixture with three or more views of one printed planar pattern at unknown poses, solving two linear constraints on the image of the absolute conic per view by one SVD, then polishing by bundle adjustment.
  - id: scaramuzza-omni-calibration
    page: scaramuzza-omni-calibration
    area: beyond
    role: alternative
    takeaway: Fits a Taylor polynomial in image radius for any central catadioptric or fisheye camera from planar checkerboard views alone, assuming only a single effective viewpoint; no pinhole and no lens model is required a priori.
  - id: kannala-brandt-model
    page: kannala-brandt-model
    area: beyond
    role: milestone
    takeaway: Replaces the pinhole's r=f*tan(theta), which diverges at 90 degrees, with an odd-power polynomial in the incidence angle spanning conventional, wide-angle, and fisheye lenses past 180 degrees FOV, under one Zhang-style planar calibration.
  - id: q-pinhole-prior
    question: When the target is a printed sheet and the model is a polynomial, what still needs a laboratory, and is the pinhole the right prior at all?
    area: beyond
    role: question
    takeaway: Accuracy still depends on how the target is imaged, not only on how the model is written.
edges:
  - from: pinhole-camera-model
    to: tsai-versatile-calibration
    type: prerequisite
  - from: tsai-versatile-calibration
    to: zhang-planar-calibration
    type: evolution
    label: fixture to plane
  - from: homography
    to: zhang-planar-calibration
    type: prerequisite
  - from: camera-distortion-models
    to: zhang-planar-calibration
    type: prerequisite
  - from: bundle-adjustment
    to: zhang-planar-calibration
    type: prerequisite
  - from: homography
    to: sturm-plane-based-calibration
    type: prerequisite
  - from: sturm-plane-based-calibration
    to: zhang-planar-calibration
    type: contrast
    label: concurrent derivation
  - from: pinhole-camera-model
    to: scaramuzza-omni-calibration
    type: prerequisite
  - from: camera-distortion-models
    to: kannala-brandt-model
    type: bridge
    label: stays finite past 90
  - from: zhang-planar-calibration
    to: kannala-brandt-model
    type: bridge
    label: reuses calib structure
  - from: kannala-brandt-model
    to: scaramuzza-omni-calibration
    type: contrast
    label: angle vs radius poly
  - from: kannala-brandt-model
    to: q-pinhole-prior
    type: bridge
    label: manual bias-variance
  - from: scaramuzza-omni-calibration
    to: q-pinhole-prior
    type: bridge
    label: central-VP required
lenses:
  - id: overview
    title: Overview
    coords:
      tsai-versatile-calibration:
        - 0.5
        - 1
      pinhole-camera-model:
        - 2.4
        - 0
      sturm-plane-based-calibration:
        - 3
        - 1
      homography:
        - 3
        - 0
      zhang-planar-calibration:
        - 3.6
        - 1
      bundle-adjustment:
        - 3.6
        - 2
      camera-distortion-models:
        - 3.8
        - 0
      scaramuzza-omni-calibration:
        - 5.2
        - 3
      kannala-brandt-model:
        - 5.8
        - 3
      q-pinhole-prior:
        - 6.6
        - 3
  - id: target-line
    title: Target line
    coords:
      tsai-versatile-calibration:
        - 0
        - 1
      sturm-plane-based-calibration:
        - 1.6
        - 1
      zhang-planar-calibration:
        - 2.4
        - 1
  - id: model-line
    title: Model line
    coords:
      pinhole-camera-model:
        - 0
        - 0
      camera-distortion-models:
        - 1.6
        - 0
      scaramuzza-omni-calibration:
        - 3.2
        - 3
      kannala-brandt-model:
        - 3.8
        - 3
      q-pinhole-prior:
        - 4.6
        - 3
steps:
  - title: The pinhole needs a precision target
    anchor: the-pinhole-needs-a-precision-target
    claim: The pinhole projection requires recovering K and (R,t) jointly; Tsai's 1987 answer was a precision 3-D calibration fixture machined to roughly 0.1x the desired accuracy, solved by the radial-alignment constraint in a closed-form linear stage followed by a three-unknown nonlinear refinement.
    focus:
      - pinhole-camera-model
      - tsai-versatile-calibration
      - camera-distortion-models
      - bundle-adjustment
  - title: The target becomes a printed plane
    anchor: the-target-becomes-a-printed-plane
    claim: Zhang's 2000 method replaces Tsai's precision 3-D fixture with three or more views of one flat printed pattern at unknown poses, deriving two linear constraints on the image of the absolute conic from each view's homography and solving all views by a single SVD.
    focus:
      - homography
      - zhang-planar-calibration
      - tsai-versatile-calibration
  - title: A concurrent derivation, and where it diverges
    anchor: a-concurrent-derivation-and-where-it-diverges
    claim: Sturm and Maybank derive the identical two IAC constraints independently at CVPR 1999, trading Zhang's end-to-end pipeline for an exhaustive singularity catalogue and a variable-intrinsics extension that lets focal length change between views, a generalisation Zhang's method does not attempt.
    focus:
      - sturm-plane-based-calibration
      - zhang-planar-calibration
  - title: The distortion model is a choice bounded by its era
    anchor: the-distortion-model-is-a-choice-bounded-by-its-era
    claim: Every method so far pairs its projection with a distortion polynomial chosen for its era's lenses, Tsai's single radial term or Zhang's two-term radial, and none of these additive corrections can represent a lens near 180 degrees field of view, because the pinhole term they correct diverges there.
    focus:
      - camera-distortion-models
      - tsai-versatile-calibration
      - zhang-planar-calibration
      - kannala-brandt-model
  - title: Two answers to the same wide-angle problem, the same year
    anchor: two-answers-to-the-same-wide-angle-problem-the-same-year
    claim: "Scaramuzza and Kannala-Brandt both publish in 2006, both calibrate from planar-checkerboard views alone, and both replace the pinhole's tangent projection with a polynomial: a Taylor series in image radius restricted to central catadioptric and fisheye cameras, or an odd-power series in incidence angle that also degrades gracefully back to a narrow lens."
    focus:
      - scaramuzza-omni-calibration
      - kannala-brandt-model
      - homography
      - bundle-adjustment
  - title: What a printed plane and a polynomial still cannot buy
    anchor: what-a-printed-plane-and-a-polynomial-still-cannot-buy
    claim: "Kannala-Brandt's centroid-correction integral removes a 0.45-pixel bias that a naive circular-marker centroid would otherwise introduce, and its largest variant can overfit under poor corner coverage or uneven lighting: calibration accuracy still depends on how the target is imaged, not only on how the model is written."
    focus:
      - kannala-brandt-model
      - scaramuzza-omni-calibration
      - q-pinhole-prior
---

Camera calibration did not become more accurate because the field found a better projection equation. The central-projection map from a 3-D point through a single centre to a pixel is the same equation Tsai used in 1987, Zhang used in 2000, and Kannala–Brandt used in 2006; what changed across those three papers was the object placed in front of the lens, and, eventually, whether the pinhole assumption was kept at all. Tsai's 1987 method recovered a camera's intrinsics and pose from a precision three-dimensional fixture, machined more precisely than the accuracy the calibration itself was meant to deliver. Zhang's 2000 method removed the fixture: three or more views of an ordinary printed pattern, held at unknown angles, supplied the same information through a different piece of algebra. By 2006 the pinhole assumption itself had given way in two independent papers, each replacing it with a polynomial fitted from the same kind of printed plane. Camera calibration became practical not through new projection mathematics but by changing the target: from a precision 3-D fixture to a printed plane in free poses, and then by letting the camera model reach past the pinhole.

## The pinhole needs a precision target

[Pinhole Camera Model](/atlas/pinhole-camera-model) defines the central-projection equation $\tilde{m} \sim K\,[R \mid t]\,\tilde{M}$, mapping a homogeneous world point through a single centre onto a homogeneous pixel; $K$ has five degrees of freedom in general, and every view of a scene contributes its own extrinsic pose $(R,t)$. Recovering both from images alone is the coupled problem [Tsai's Versatile Camera Calibration](/atlas/tsai-versatile-calibration) resolves by building on the radial alignment constraint: because radial lens distortion displaces an image point along the line from the image origin, that parallelism eliminates $f$, $\kappa_1$, $\kappa_2$, and $T_z$ from the constraint equation, leaving Stage 1 as a linear least-squares solve for combinations of $R$ and $(T_x, T_y)$ — closed-form, no initial guess. Stage 2 then has three coupled unknowns and converges in one or two LM iterations, a restricted [Bundle Adjustment](/atlas/bundle-adjustment) touching only $f$, $T_z$, and $\kappa_1$. The distortion model behind it keeps one term only: [Camera Distortion Models](/atlas/camera-distortion-models) records that any more elaborate modelling not only would not help but also would cause numerical instability, so tangential distortion is left out by design.

The price of that closed-form stage is the target itself. The non-coplanar variant needs a full three-dimensional calibration fixture, and the fixture must be built more precisely than the calibration it is meant to enable — if the final accuracy is desired to be 1 mil, then the surface flatness and parallelism has to be 0.1 mil accurate, an order of magnitude tighter than the number the camera is meant to deliver. The coplanar variant relaxes the rig to a flat pattern, but then cannot separate $s_x$ from the extrinsic parameters and requires $s_x$ to be supplied from a separate calibration, so even the flat variant is not self-sufficient. Either branch leaves a gap that no single ordinary target closes on its own: precision machining on one side, an auxiliary measurement on the other — a cost the next method removes entirely, and a rigidity that goes with it.

## The target becomes a printed plane

[Zhang's Planar Camera Calibration](/atlas/zhang-planar-calibration) removes the fixture outright. When the target is planar, the projection collapses to a $3\times3$ [Homography](/atlas/homography), $H = K\,[r_1 \;\; r_2 \;\; t]$, and because $r_1$ and $r_2$ are orthonormal, the product $B = K^{-T}K^{-1}$ satisfies two linear constraints per homography, $h_1^T B h_2 = 0$ and $h_1^T B h_1 - h_2^T B h_2 = 0$. Stacking two rows per view across $n \geq 3$ views yields a homogeneous system whose null vector encodes the five intrinsic parameters, recovered by a single SVD. No 3D calibration object is required and the motion between views need not be known; the pattern and the camera may move freely relative to each other — exactly the cost and rigidity Tsai's fixture could not avoid. Distortion returns afterward, not before: the method proceeds to refine $(A, k_1, k_2, \{R_i, t_i\})$ by Levenberg-Marquardt minimisation of the total reprojection error, folding two radial terms back into the same joint solve that already carries every intrinsic and every per-view pose. That plane-based derivation, though, was not Zhang's to make alone.

## A concurrent derivation, and where it diverges

[Sturm-Maybank Plane-Based Calibration](/atlas/sturm-plane-based-calibration), presented at CVPR 1999, derives the identical pair of constraints independently — $h_1^T\,\omega\,h_1 - h_2^T\,\omega\,h_2 = 0$ and $h_1^T\,\omega\,h_2 = 0$, their Eq. 4, algebraically the same content as Zhang's own two constraints. The two papers were published independently and concurrently at CVPR 1999, and neither predates the other. What Sturm-Maybank contributes beyond the shared core diverges sharply from Zhang's end-to-end recipe. The paper's singularity tables enumerate every plane orientation that makes an intrinsic unrecoverable — a plane parallel to the image plane, for one, degenerates the homography to a similarity, leaving only $\alpha$ and $v_0$ estimable. A separate extension lets focal length vary per view for a zooming camera, with each new view's unknowns added as new columns to the design matrix — a generalisation Zhang's constant-intrinsics pipeline does not attempt. Neither paper considers lens distortion at all; both leave the correction to be bolted on afterward, bounded by whichever era's lenses that correction was designed for.

## The distortion model is a choice bounded by its era

Both classical pipelines bolt a correction onto the same pinhole baseline. Camera distortion models frame this as a family of additive terms layered on the ideal projection: Tsai's model keeps a single radial coefficient $\kappa_1$; Zhang's keeps two, $(k_1, k_2)$, and it is the default in MATLAB's `cameraCalibrator` "Standard" option, the setting most practitioners never change. Both choices share a ceiling neither paper's authors could see past from where they stood: the pinhole projection $r=f\tan\theta$ goes to infinity as $\theta \to \pi/2$, so no finite additive correction term can represent a lens whose field of view approaches or exceeds 180°. A correction added to a projection that already diverges to infinity has nothing finite left to correct toward. The fix, when it comes, cannot be one more coefficient in the same series — it has to replace the series's own starting point.

## Two answers to the same wide-angle problem, the same year

Both replacements arrive in 2006. [Scaramuzza Omnidirectional Camera Calibration](/atlas/scaramuzza-omni-calibration) fits a Taylor polynomial in the image radius, $f(\rho'') = a_0 + a_2\rho''^2 + a_3\rho''^3 + \cdots + a_N\rho''^N$, to any central catadioptric mirror or fisheye lens from planar checkerboard views alone; the central-projection constraint — all 3-D rays passing through a single effective viewpoint — is the only governing assumption, with per-view extrinsics recovered by solving $M_i H = 0$ by SVD with a unit-norm constraint. [Kannala–Brandt Generic Camera Model](/atlas/kannala-brandt-model) takes the opposite fitting variable: an odd-power polynomial in the incidence angle, $r(\theta) = k_1\theta + k_2\theta^3 + k_3\theta^5 + k_4\theta^7 + k_5\theta^9$, where all five classical projections — including the pinhole — are generalised by a single odd-power polynomial, spanning conventional, wide-angle, and fish-eye lenses and staying finite as the field of view approaches and exceeds 180°. Neither method starts from scratch: Kannala-Brandt reuses Zhang's homography-based initialise-then-refine calibration structure, adapted to a spherical back-projection in place of the pinhole homography, and both finish with the same reprojection-error objective minimised by the same solver, over the polynomial coefficients and per-view extrinsics. Replacing the pinhole with a polynomial removes the structural ceiling that no additive correction could fix; it does not, on its own, guarantee the numbers a laboratory-grade fixture once delivered.

## What a printed plane and a polynomial still cannot buy

Kannala-Brandt's own numbers make the point that a polynomial alone does not finish the job. Skipping the centroid-correction step — accounting for a circular control point's true projected centroid rather than its nominal centre — introduces a simulated 0.45 px RMS bias, larger than the reported real-data RMS residuals of 0.089–0.146 px; the polynomial can be exactly right and the calibration still wrong if the control points themselves are mislocated. Choosing among the reduced model variants is itself a trade-off: model-order selection ($p_6$ vs $p_9$ vs $p_{23}$) is a manual bias-variance trade-off, and the full 23-parameter model can overfit systematic illumination-induced error when calibration images have poor corner coverage or non-uniform lighting — more free parameters do not uniformly buy more accuracy. Scaramuzza's method carries an analogous ceiling from the opposite direction: the central-projection assumption ($a_1 = 0$, single effective viewpoint) is a hard constraint, and a misaligned mirror will produce irreducible systematic residuals that the Levenberg–Marquardt stage cannot eliminate. In both families the polynomial has already solved the problem the pinhole could not — representing a wide field of view at all — but accuracy past that point still depends on how the target is imaged, lit, and positioned. When the target is a printed sheet and the model is a polynomial, what still needs a laboratory, and is the pinhole the right prior at all?
