---
title: "Gao Dual-Homography Stitching"
date: 2026-05-02
summary: "Stitch two-plane outdoor panoramas by clustering SIFT correspondences into a ground group and a distant group via spatial K-means, fitting one homography per group, and blending per pixel by inverse-distance weights. Superseded for practical use by APAP's continuous per-cell grid."
tags: ["two-view-geometry"]
domain: stitching
tasks: [image-stitching]
author: "Vitaly Vorobyev"
difficulty: intermediate
quality: historical
prerequisites: [homography, ransac]
failureModes: []
relations:
  - type: generalized_by
    target: apap-image-stitching
    confidence: high
    caution: "APAP's continuous grid of per-cell homographies subsumes the two-plane parametrisation; the two methods are not peer practitioner choices."
sources:
  primary: gao2011-dual-homography
  references:
    - hartley1997-eight-point
    - zaragoza2013-apap
    - lin2011-svastitching
  notes: |
    §3.1 Eq. 1: blended dual-homography H_ij = ω_ij H_g + (1-ω_ij) H_d.
    §3.1 Eq. 2: K-means seeds at (x̄, 0) and (x̄, h) — top-vs-bottom spatial
    bias to separate distant from ground features. §3.1 Eq. 3: per-pixel
    weight ω_ij = d_g / (d_g + d_d) using reciprocal-Euclidean distances
    to nearest inlier in each cluster. §3.1 RANSAC: 95% consensus per group.
    §3.2 Eq. 4: multi-image concatenation by boundary-point inverse-distance
    weighting in non-overlapping regions. §4.1 MRF seam cut: gradient-magnitude
    data cost, smoothness λ=2, graph cuts. §4.2 content-aware straightening
    fixes bow-effect from quadratic warp; vertical-edge bending energy
    (Eq. 8-12). §5 explicit failure: a mid-ground structure violates the
    two-plane assumption (Figure 7).
---

# Goal

Stitch two or more overlapping outdoor photographs of a scene that fits a two-dominant-plane model — a distant background plane (sky, far buildings) plus a ground plane sweeping out from the camera — captured by an arc of camera positions with parallax. Output: a seamless panoramic mosaic. The contribution is a per-pixel blend of two homographies, one fit to each plane via spatial clustering of SIFT correspondences, replacing the single global homography that produces visible tears whenever the scene violates the planar-or-rotational assumption.

# Historical context

By 2011, single-homography stitching (Brown & Lowe's AutoStitch and its descendants) had become the practical standard for casual panoramas under the assumption of pure rotation or a single dominant plane. Outdoor scenes with both a sky/distant plane and a ground plane consistently broke that assumption — a single homography aligned only one of the two planes, and the other tore visibly along seam lines.

Gao, Kim and Brown introduced the two-bin parametrisation: cluster SIFT correspondences by spatial position into a "ground" group and a "distant" group (K-means with seeds biased to the top and bottom of the image), fit one homography per cluster via RANSAC, and at each pixel form a convex combination weighted by reciprocal-Euclidean distance to the two clusters. The construction made the implicit "scene has multiple depth layers" assumption explicit, decomposed it into a fixed count of homographies, and provided a smoothing rule for pixels between clusters. Two known artefacts followed from the element-wise convex combination of homographies: the resulting matrix is not in general a valid rank-3 projective transform, so a content-aware straightening post-process was required to suppress the visible "bow" deformation of straight architectural edges, and multi-image concatenation needed a special boundary-extrapolation rule because the dual-homography blend does not compose under matrix multiplication.

[APAP](/atlas/apap-image-stitching) (Zaragoza, Chin, Brown, Suter — CVPR 2013) lifted the structural limitation. Instead of two clusters and a per-cluster homography, APAP fits a homography per cell of a uniform grid via Moving DLT — every correspondence contributes to every cell's weighted least-squares solve, with a Gaussian kernel that downweights distant correspondences. The continuous-grid formulation makes no two-plane assumption, handles arbitrary scene geometry including mid-ground structures (the original page's Figure 7 failure case), produces a proper projective matrix at every cell by construction, and removes the need for a post-hoc straightening step. APAP became the reference spatially-varying-warp baseline for the next decade of image-stitching work.

The page is preserved as the citation root for the explicit "parallax bin → per-bin homography" decomposition that motivates APAP's continuous-grid framing. Spatial K-means on correspondence position remains a clean baseline for understanding why piecewise homographies matter and what the simplest workable form looks like before the moving-DLT generalisation.

# References

1. J. Gao, S. J. Kim, M. S. Brown. *Constructing Image Panoramas Using Dual-Homography Warping.* IEEE CVPR 2011, pp. 49–56. [pdf](http://www.cse.yorku.ca/~mbrown/pdf/cvpr_dualhomography2011.pdf)
2. J. Zaragoza, T.-J. Chin, M. S. Brown, D. Suter. *As-Projective-As-Possible Image Stitching with Moving DLT.* IEEE CVPR 2013. The successor — generalises two clusters to a continuous per-cell grid.
3. W.-Y. Lin, S. Liu, Y. Matsushita, T.-T. Ng, L.-F. Cheong. *Smoothly Varying Affine Stitching.* IEEE CVPR 2011. Contemporary alternative using affine instead of homography.
4. M. Brown, D. G. Lowe. *Automatic Panoramic Image Stitching using Invariant Features.* International Journal of Computer Vision 74(1):59–73, 2007. AutoStitch — the single-homography baseline that motivated the two-plane decomposition.
5. R. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE TPAMI 19(6):580–593, 1997. Hartley normalisation; reused before each per-group DLT.
