---
title: One Homography Is Not Enough
summary: "Parallax breaks the single-homography stitching model, and the fixes loosen it in sequence: two homographies for two planes, a smoothly varying affine warp, and a field of local homographies that is projective where there is data and global where there is none."
tagline: Every extra parameter buys alignment and costs extrapolation.
tags:
  - stitching
  - homography
  - classical
  - geometry
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: the-model
    label: The model
  - id: two-planes-and-smooth-warps
    label: Two planes and smooth warps
  - id: a-field-of-warps
    label: A field of warps
nodes:
  - id: homography
    page: homography
    area: the-model
    role: origin
    takeaway: A single 3x3 homography maps one image onto another exactly only when the scene is flat or the camera merely rotates about its center. Any camera translation through a 3-D scene creates parallax that one homography cannot represent, however well it is fit.
    remark: "Homography is the baseline every later stitching fix departs from: APAP's per-cell field is a spatially varying homography, and it collapses back to a single global homography wherever the data give it no reason to vary."
  - id: spatially-varying-image-stitching
    page: spatially-varying-image-stitching
    area: the-model
    role: bridge
    takeaway: When a photographed scene has real depth structure, one homography leaves visible tears and ghosts. Three methods published between 2011 and 2013 replace it with a warp that changes across the image instead of staying fixed.
    remark: "The three methods differ only in how local the warp is allowed to get: two discrete homographies, a continuous affine deviation, or a continuous projective field solved per grid cell."
  - id: gao-dual-homography-stitching
    page: gao-dual-homography-stitching
    area: two-planes-and-smooth-warps
    role: milestone
    takeaway: "Gao's 2011 fix: cluster matched points into a ground plane and a distant plane, fit one homography to each by RANSAC, then blend the two per pixel by inverse distance to the nearest cluster. It works exactly when the scene has two dominant planes."
    remark: The per-pixel blend of two homographies is not itself a valid projective matrix, so straight architectural lines bow near the seam and needed a separate straightening pass; stitching more than two images needed a special rule too, since blended homographies do not compose.
  - id: lin-sva-stitching
    page: lin-sva-stitching
    area: two-planes-and-smooth-warps
    role: milestone
    takeaway: "Lin's 2011 fix drops the fixed plane count: a smoothly varying affine deviation around a global affine map, estimated jointly with the point correspondences by an EM loop borrowed from point-set registration. It handles gentle depth variation well."
    remark: Its affine extrapolation drifts from the truth outside the overlap where a projective map would not, and a sharp depth discontinuity breaks the smoothness assumption outright, roughly tripling the alignment error versus a smooth-depth scene.
  - id: apap-image-stitching
    page: apap-image-stitching
    area: a-field-of-warps
    role: frontier
    takeaway: APAP fits a homography per cell of a grid, each solved in closed form by a weighted least-squares that favors nearby correspondences. The warp stays projective everywhere and falls back gracefully to one global homography wherever local data run out.
    remark: "The fit is still local to the source image: two correspondences that start close together but end up far apart, such as a moving object against a static background, still get averaged into the same local homography and leave a visible seam."
  - id: q-warp-vs-correspondence
    question: At what point does a locally fit warp field stop being a stitching model and become dense correspondence estimation wearing a different name?
    area: a-field-of-warps
    role: question
edges:
  - from: homography
    to: spatially-varying-image-stitching
    type: prerequisite
    label: motivates
  - from: spatially-varying-image-stitching
    to: gao-dual-homography-stitching
    type: prerequisite
    label: instance
  - from: spatially-varying-image-stitching
    to: lin-sva-stitching
    type: prerequisite
    label: instance
  - from: spatially-varying-image-stitching
    to: apap-image-stitching
    type: prerequisite
    label: instance
  - from: gao-dual-homography-stitching
    to: apap-image-stitching
    type: evolution
    label: generalized by
  - from: lin-sva-stitching
    to: apap-image-stitching
    type: evolution
    label: generalized by
  - from: gao-dual-homography-stitching
    to: lin-sva-stitching
    type: bridge
    label: 2011 contemporaries
lenses:
  - id: overview
    title: Overview
    coords:
      homography:
        - 1
        - 1
      spatially-varying-image-stitching:
        - 2.4
        - 1
      gao-dual-homography-stitching:
        - 3.8
        - 2
      lin-sva-stitching:
        - 5.4
        - 2
      apap-image-stitching:
        - 7
        - 3
      q-warp-vs-correspondence:
        - 8.4
        - 3
steps:
  - title: The Warp That Only Works Twice
    anchor: one-warp-two-conditions
    claim: A homography maps one image onto another exactly only when the scene is planar or the camera purely rotates; the moment a hand-held camera translates through a 3-D scene, parallax makes the single 3x3 matrix wrong by an amount that grows with the scene's depth variation.
    focus:
      - homography
  - title: Two Planes, One Blend
    anchor: two-planes-one-blend
    claim: "Real outdoor photographs often reduce to exactly two depth layers, a distant plane and a ground plane sweeping toward the camera. Gao's 2011 fix trades the single-plane assumption for a two-plane one: cluster the matches, fit one homography per cluster, blend by distance."
    focus:
      - spatially-varying-image-stitching
      - gao-dual-homography-stitching
  - title: A Field That Bends but Stays Affine
    anchor: smooth-affine-field
    claim: "Published the same year as Gao's two-plane fix, Lin's answer drops the fixed plane count altogether: a smoothly varying affine field estimated jointly with the correspondences absorbs gentle depth variation, but its affine extrapolation drifts outside the overlap and breaks at sharp depth jumps."
    focus:
      - lin-sva-stitching
  - title: As Projective as the Data Allow
    anchor: as-projective-as-possible
    claim: "APAP replaces both the fixed plane count and the affine smoothing with a projective field: one closed-form weighted homography per grid cell, falling back to the single global homography wherever data thin out, which raises the question of how far cell-local fitting can go before it is just dense correspondence under another name."
    focus:
      - apap-image-stitching
      - q-warp-vs-correspondence
---

## One Warp, Two Conditions

A [homography](/atlas/homography) is a non-singular 3x3 matrix with 8 degrees of freedom, mapping every point of one image onto its corresponding point in another. The map is exact under exactly two physical conditions: the scene is a planar surface viewed by two cameras, or the camera's motion between the two shots is a pure rotation about its optical center with no translation. Either condition collapses the three-dimensional geometry of the scene into a single flat mapping that one matrix represents completely.

Neither condition holds for an ordinary hand-held photograph. A photographer who steps sideways, or simply shifts weight between two exposures, translates the camera through a three-dimensional scene. That translation creates parallax, and the resulting camera motion routinely violates both the planar and the rotation assumption at once.

The consequence shows up directly in the stitched output. A single global homography, fit to the whole set of correspondences between two images, aligns the parts of the scene closest to its assumptions and leaves visible tears where the two images fail to register and ghosts where the same content appears twice. Every fix that follows changes how many homographies a stitcher is willing to use, not what a homography is.

## Two Planes, One Blend

[Spatially varying image stitching](/atlas/spatially-varying-image-stitching) replaces the single homography with a warp that changes across the image, and Gao's 2011 method, [Gao Dual-Homography Stitching](/atlas/gao-dual-homography-stitching), is the first and most literal instance. It assumes the scene reduces to exactly two dominant planes, a distant background plane and a ground plane sweeping out from the camera, and clusters SIFT correspondences by image position into a ground group and a distant group before fitting one homography per cluster via RANSAC at 95 percent consensus.

At every pixel, the two homographies are blended by a reciprocal-distance weight, so pixels near ground features warp mostly by the ground homography and pixels near distant features warp mostly by the other. The blend is a plain weighted average, not a projective transform in its own right: the resulting matrix is not a valid rank-3 projective transform, and straight architectural lines bow visibly near the seam, forcing a separate straightening pass.

The method is now superseded for practical use by APAP's continuous grid, because its fix only works when the scene truly reduces to two planes. A third dominant plane in the scene, a tree at medium distance or a passing vehicle, belongs to neither cluster, and no blend of the other two can absorb it.

## Smooth Affine Field

Published the same year as Gao's two-plane fix, [Lin Smoothly Varying Affine Stitching](/atlas/lin-sva-stitching) drops the fixed plane count altogether. Every matched feature gets its own affine transform, written as a global affine plus a per-feature deviation, regularised to be smooth via a Gaussian-kernel CPD-style EM that jointly estimates correspondence and warp. There is no cluster count to get wrong, because the deviation field can bend by as much or as little as the data demand at each location.

Correspondence and warp are not solved in separate stages: an EM loop adapted from Coherent Point Drift estimates the soft assignment between source and target features and the deviation field together, annealing a bandwidth parameter down over many outer iterations. The scheme handles gentle depth variation well, at a real cost, roughly 15 minutes to stitch a single pair, an order of magnitude slower than a closed-form fit.

The field stays affine everywhere, and that is where it runs out of room. For a translating camera observing a non-planar scene, the correct extrapolation is projective, so outside the overlap the warp drifts from the true motion the farther it strays from the matched points. Foreground objects at sharply different depths from the background break the smoothness assumption directly, producing mean errors two to three times higher than on a smooth-depth scene.

## As Projective As Possible

[APAP](/atlas/apap-image-stitching) keeps the local model projective and lets it vary anyway. The source image is divided into a grid of cells, and each cell gets its own homography, fit by a per-cell weighted DLT that down-weights correspondences far from the cell center. The fit is closed form, the right singular vector of the weighted design matrix with smallest singular value, one singular value decomposition per cell with no annealing schedule and no outer loop.

The weighting scheme also supplies its own regulariser. A floor on the per-correspondence weight keeps the fit from degenerating where local data run out, and as that floor dominates every cell's weighted DLT converges to the same solution, the field collapses to the global homography. The result is projective everywhere a cell has enough nearby correspondences to be confident, and falls back gracefully to the one-homography baseline everywhere it does not.

The per-cell grid subsumes the two-plane parametrisation as a special case, and it generalises the affine deviation field, since a projective local model can represent everything an affine one can and more besides. What it leaves open is the granularity of the fit itself. At what point does a locally fit warp field stop being a stitching model and become dense correspondence estimation wearing a different name?
