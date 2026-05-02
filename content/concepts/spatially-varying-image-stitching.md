---
title: "Spatially Varying Image Stitching"
date: 2026-05-02
summary: "A 2011–2013 lineage of stitching methods that replace the single global homography with a spatially varying warp field — fitted as either two homographies + spatial blend (Gao 2011), a smooth affine deviation field (Lin 2011), or a per-cell weighted-DLT projective grid (Zaragoza 2013, APAP) — to absorb parallax and non-rotational camera motion that no single homography can represent."
tags: ["image-stitching", "homography", "panorama", "spatially-varying-warp", "survey"]
author: "Vitaly Vorobyev"
category: geometry
difficulty: advanced
prerequisites: [homography]
related:
  - apap-image-stitching
  - gao-dual-homography-stitching
  - lin-sva-stitching
  - dlt-normalisation
sources:
  references:
    - gao2011-dual-homography
    - lin2011-svastitching
    - zaragoza2013-apap
    - hartley1997-eight-point
---

# Definition

Two-view image stitching estimates a warp $W: I \to I'$ that maps every pixel of a source image into a target image so the pair can be composited into a seamless mosaic. The textbook tool is a single global $3 \times 3$ projective homography $H$ — exact when the scene is planar or the camera rotates about its optical centre, approximate otherwise. Real photographs taken with hand-held cameras of three-dimensional scenes routinely violate both assumptions, leaving visible *tears* (mis-registration along an edge) and *ghosts* (double-imaged content) in the global-$H$ stitch.

**Spatially varying image stitching** is the family of methods that replace the global homography with a warp $W$ that *changes across the image* — a different transformation per region, per cell, or per pixel — so the warp can absorb local model inadequacy without abandoning the projective imaging framework altogether. Three landmark methods establish the design space, all published between 2011 and 2013:

- [Gao Dual-Homography Stitching](/atlas/gao-dual-homography-stitching) (Gao, Kim, Brown, *CVPR 2011*) — fit **two** homographies (one per dominant plane: ground and distant) and blend them per pixel by inverse-distance weights.
- [Lin Smoothly Varying Affine Stitching](/atlas/lin-sva-stitching) (Lin, Liu, Matsushita, Ng, Cheong, *CVPR 2011*) — fit a **per-feature affine deviation field** regularised to be smooth, recovered jointly with correspondence by a CPD-style EM loop.
- [APAP / As-Projective-As-Possible](/atlas/apap-image-stitching) (Zaragoza, Chin, Brown, Suter, *CVPR 2013*) — fit a **per-cell projective field** by Moving DLT: weight every correspondence by proximity to the query, solve a weighted SVD per cell of a uniform grid.

# Decision table

| | Gao DHW (2011) | SVA (Lin 2011) | APAP (Zaragoza 2013) |
|---|---|---|---|
| **Local model** | 2 homographies, spatial blend | continuous affine field | continuous projective field |
| **Field DOF** | 2 × 8 + per-pixel scalar weight | 6 × M (M = feature count), smoothed | 8 × per cell, $C_1 \times C_2$ grid |
| **Estimator** | K-means cluster → 2 × RANSAC + DLT | EM (CPD-style) with annealed bandwidth | weighted SVD per cell with rank-1 update |
| **Closed form per query?** | No (two SVDs once, blend per pixel) | No (M × 6 linear system per outer iter) | Yes per cell (one weighted SVD per cell) |
| **Scene assumption** | exactly two dominant depth planes, top/bottom separable | smooth depth variation, no abrupt protrusions | locally projective; large or small-scale parallax both OK |
| **Extrapolation outside overlap** | inverse-distance from the two RANSAC inlier sets | extrapolates as global affine — incorrect for translating cameras | reduces to global homography via $\gamma$-floor weight |
| **Runtime (1024 × 768 pair)** | ~1 minute (paper unspecified, dominated by RANSAC + MRF) | ~15 minutes (APAP timing; SVA reports ~8 min for 1200 features) | < 1 minute (APAP §4) |
| **Hartley DLT normalisation?** | Yes, per RANSAC homography | N/A (affine, not DLT) | Yes, applied once globally before per-cell SVDs |
| **Multi-image panorama** | concatenation by inverse-distance boundary blend (Eq. 4) | not addressed in paper | incremental composition |
| **Reported failure mode** | mid-ground structure breaks two-plane assumption (Fig. 7) | abrupt depth protrusion breaks affine smoothness (§6) | data-free extrapolation reverts to global $H$ |
| **Open source** | implementation distributed with paper | implementation distributed with paper | reference Matlab + several reimplementations |

# How the three methods differ

## Gao DHW — discrete two-plane decomposition

Gao 2011 makes a **scene-structural** assumption: outdoor panoramas typically contain a *distant background plane* (sky, horizon, far buildings) and a *ground plane* (asphalt, lawn) sweeping out from the camera. K-means clusters SIFT correspondences by image position alone — seeds at the top and bottom of the image — and fits one homography per cluster via RANSAC at 95 % consensus. The composite warp at pixel $(i, j)$ is the linear interpolation $H_{ij} = \omega_{ij} H_g + (1 - \omega_{ij}) H_d$, with $\omega_{ij} = d_g / (d_g + d_d)$ a reciprocal-distance weight. Linear-blended homographies are not in general projective matrices; the paper accepts this as a relaxation.

The structural risk: a third dominant plane in the scene — a tree at medium distance, a vehicle, a person — belongs to neither cluster, and no $H_g$ / $H_d$ blend can absorb it. Section 5 of Gao 2011 illustrates this failure on the paper's own test data.

## SVA — continuous affine deviation field

Lin 2011 makes a **regularity** assumption: depth varies smoothly across the scene and so does the warp. Every feature $i$ in the base image carries its own affine vector $a_i = a_\text{global} + \Delta a_i$; the deviation field $\Delta A$ is regularised by a Gaussian-Fourier penalty equivalent to $\lambda \, \mathrm{tr}(\Delta A^\top G^{-1} \Delta A)$ where $G$ is a Gaussian feature-affinity matrix. Correspondence and warp are estimated jointly by an EM loop adapted from Coherent Point Drift, with the Gaussian bandwidth $\sigma_t$ annealed from 1.0 to 0.1 over ~75 outer iterations.

The structural risk: affine maps preserve collinearity and distance ratios but cannot represent the perspective distortion that a *translating* camera induces in a depth-varying scene. APAP §1.1 explicitly diagrams this — outside the overlap region, an affine-regularised warp extrapolates as an affine map, which is wrong if the true motion is projective. Lin 2011 also reports a mean error of 1.92 px on smooth synthetic scenes versus 4.57 px on scenes with abrupt depth discontinuities.

## APAP — continuous projective field via Moving DLT

Zaragoza 2013 makes the **most general** assumption: the warp should remain projective everywhere but is allowed to deviate smoothly per cell. For each cell of a $C_1 \times C_2$ grid over the source image (defaults: 50–100 cells per axis), solve a weighted DLT homography $h_* = \arg\min_{\|h\|=1} \|W_* A h\|$ where the diagonal weights $w_*^i = \max(\exp(-\|x_* - x_i\|^2/\sigma^2), \gamma)$ down-weight correspondences far from the cell centre. The $\gamma$-floor (typical values $0.0025$ to $0.025$) prevents degeneracy in data-sparse cells and forces the warp to revert smoothly to the global DLT solution as the cell moves into extrapolation territory.

A rank-one update scheme amortises the per-cell SVD cost across the grid — paper reports $> 40 \%$ of cells need fewer than 20 weight updates from the base $W = \gamma I$ solution. Hartley DLT normalisation (Hartley 1997) is applied **once** globally before any per-cell solve; without it, every per-cell DLT inherits the standard $\kappa \sim 10^{12}$ ill-conditioning of the un-normalised projective design matrix and the entire grid becomes unstable.

# When to choose what

- **Gao DHW** is appropriate only when the two-plane assumption holds: typical tourist outdoor panoramas with a clear horizon and ground. It is the cheapest of the three and trivial to implement (two RANSAC homographies plus a per-pixel weight). Outside its assumed scene class it produces visible artefacts that no post-processing fixes.
- **SVA** is appropriate when the scene is smooth and the camera is roughly co-located between exposures (small translation). It outperforms Gao DHW on multi-plane scenes by virtue of its continuous field but is dominated by APAP on every reported test pair (APAP Table 1, e.g. SVA RMSE 12.3 px vs APAP 1.4 px on the temple pair). Its EM loop also costs an order of magnitude more runtime.
- **APAP** is the default modern choice. Its per-cell projective field handles parallax that breaks both Gao DHW (insufficient plane count) and SVA (insufficient model expressiveness for translating cameras), and the Moving-DLT formulation degrades gracefully toward the global homography in data-poor regions. The only structural cost is grid-cell discretisation, which can be made arbitrarily fine at the cost of redundant SVDs.

# Numerical concerns shared across the family

- **DLT normalisation is non-optional.** Both Gao DHW and APAP rely on direct projective solves; Hartley normalisation reduces $\kappa(A^\top A)$ by $\sim 10^8$ and is the difference between unusable and reliable solutions. SVA solves an affine system that does not require Hartley conditioning but does normalise coordinates to zero mean and unit variance for the same reason.
- **Linear blend of homographies is not a homography.** Gao DHW's per-pixel mean of $H_g$ and $H_d$ is not in $\mathrm{PGL}(3)$. The pixel mapping can fold or produce artefacts in regions where the two homographies diverge strongly. APAP avoids this by always solving a single projective DLT per cell — its field is piecewise projective, not a blend.
- **Extrapolation requires a regulariser.** APAP uses the $\gamma$-floor; SVA uses the smoothness penalty; Gao DHW uses the spatial weight $\omega \to 0.5$ as a default. In every case the regulariser has tunable strength; over-regularising flattens the field toward the global warp, under-regularising lets noise dominate.
- **Hand-held panoramas do not satisfy the rotational-camera assumption.** All three methods are motivated by this fact. The fix is the spatially varying warp; the cost is more parameters and longer runtime than a single global $H$.

# Where this concept appears

- [APAP](/atlas/apap-image-stitching) — the modern default. Its per-cell Moving DLT generalises both Gao DHW and SVA.
- [Gao DHW](/atlas/gao-dual-homography-stitching) — the discrete two-plane predecessor.
- [Lin SVA](/atlas/lin-sva-stitching) — the continuous-affine sibling that establishes the joint correspondence-and-warp EM framework.
- [DLT normalisation](/atlas/dlt-normalisation) — required pre-conditioning shared by Gao DHW and APAP.

# References

1. J. Gao, S. J. Kim, M. S. Brown. *Constructing Image Panoramas Using Dual-Homography Warping.* IEEE CVPR, 2011.
2. W.-Y. Lin, S. Liu, Y. Matsushita, T.-T. Ng, L.-F. Cheong. *Smoothly Varying Affine Stitching.* IEEE CVPR, 2011.
3. J. Zaragoza, T.-J. Chin, M. S. Brown, D. Suter. *As-Projective-As-Possible Image Stitching with Moving DLT.* IEEE CVPR, 2013.
4. R. Hartley. *In Defense of the Eight-Point Algorithm.* IEEE TPAMI 19(6):580–593, 1997. (DLT normalisation; load-bearing for Gao DHW and APAP.)
