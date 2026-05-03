---
paper_id: zaragoza2013-apap
title: "As-Projective-As-Possible Image Stitching with Moving DLT"
authors: ["J. Zaragoza", "T.-J. Chin", "M. S. Brown", "D. Suter"]
year: 2013
url: https://www.cv-foundation.org/openaccess/content_cvpr_2013/papers/Zaragoza_As-Projective-As-Possible_Image_Stitching_2013_CVPR_paper.pdf
created: 2026-05-02
relevant_atlas_pages: [apap-image-stitching, homography]
---

# Setting

**Problem class.** Two-view image stitching under model inadequacy: computing a warp from a source image $I$ to a target image $I'$ when the data are not consistent with a single global homography (non-rotational camera motion, non-planar scene, parallax). The aim is to produce a spatially varying projective field that absorbs local deviations while remaining globally projective, rather than fixing errors after the fact with deghosting or seam-cutting.

**Inputs.** A pair of overlapping images $I$, $I'$ and a set of point correspondences $\{(x_i, x'_i)\}_{i=1}^N$ filtered by RANSAC. No camera calibration is assumed. The paper tests on images ranging from $1024 \times 768$ to $1500 \times 2000$ pixels with $N \approx 100$–$2100$ inlier matches (after RANSAC on SIFT correspondences from VLFeat; §3 and §4).

**Outputs.** A piecewise-constant homography field $\{H_c\}$ indexed by cells of a $C_1 \times C_2$ grid over $I$. Each pixel in $I$ is warped by the $H_c$ of its containing cell. The composited result is a stitched image with reduced ghosting relative to a single-homography baseline, measurable by RMSE over held-out keypoint matches.

**Guarantees.** No formal correctness guarantee. Empirically, RMSE on held-out ("testing") correspondences is consistently lower than all compared methods (global homography, dual-homography warps, smoothly varying affine, content-preserving warps) across 5 challenging image pairs (§4.2, Table 1). The warp reduces to the global DLT homography as $\gamma \to 1$ or as inter-camera translation tends to zero (Fig. 6), so performance degrades gracefully toward the baseline.

# Core idea

A single DLT homography fits the global algebraic residual $\|Ah\|^2$ subject to $\|h\| = 1$, yielding the right singular vector of the $2N \times 9$ design matrix $A$. When the projective model is violated locally, a single $H$ cannot simultaneously align all regions.

Moving DLT generalises this by computing, for each query location $x_*$, a location-dependent homography $h_*$ that solves the same problem but with correspondences weighted by proximity to $x_*$:

$$
w_*^i = \max\!\left(\exp\!\left(-\frac{\|x_* - x_i\|^2}{\sigma^2}\right), \gamma\right), \qquad \text{(Eq. 11)}
$$

where $\sigma$ is the locality bandwidth and $\gamma \in [0, 1]$ is a floor preventing degeneracy in data-sparse extrapolation regions. The weighted problem is:

$$
h_* = \arg\min_{\|h\|=1} \|W_* A h\|^2, \qquad W_* = \mathrm{diag}([w_*^1, w_*^1, \ldots, w_*^N, w_*^N]), \quad \text{(Eqs. 9–10)}
$$

whose solution is the least significant right singular vector of $W_* A$ — a Weighted SVD (WSVD). Each row pair $a_i$ of $A$ receives the same weight $w_*^i$ (repeated twice, once for each of the two linearised constraint rows per correspondence).

To avoid solving a fresh $2N \times 9$ SVD for every cell, the paper proposes a rank-one update scheme (§3, Eq. 12–13): start from the base solution for $W_\gamma = \gamma I$ (pure-offset weights — equivalent to the global solution scaled uniformly) and apply one rank-one secular-equation update per correspondence whose weight differs from $\gamma$. In practice, for $\gamma = 0.0025$ and $N = 2100$, more than 40% of cells have fewer than 20 weights differing from $\gamma$ (Fig. 3d), making the update substantially cheaper than recomputing from scratch.

Hartley normalisation (§2.1, citing hartley1997-eight-point) is applied once globally: translate each point set to zero centroid and isotropically scale to mean distance $\sqrt{2}$. The conditioned $A$ is reused unchanged across all per-cell solves; only the denormalisation $H_* \leftarrow T'^{-1} H_* T$ is applied per cell after solving.

# Assumptions

1. (hard) A set of inlier correspondences $\{(x_i, x'_i)\}$ is available — RANSAC with global DLT is used as the pre-filter (§3). The inlier/outlier gap must be large enough for RANSAC to separate them: "the error of the outliers is orders of magnitude larger than the inlier deviations, thus RANSAC can be effectively used" even when inliers deviate from the projective model (§3).
2. (soft) $N$ must be large enough that the global $2N \times 9$ system $A$ is full-rank (minimum 4 correspondences for DLT, but in practice dozens for a well-conditioned warp field). Cells near the boundary of the overlap region may have few nearby correspondences and rely on the $\gamma$-floor to avoid degeneracy.
3. (soft) The bandwidth $\sigma$ must be calibrated to the image resolution and the expected length scale of model deviations. The paper uses $\sigma \in [8, 12]$ for images of $1024 \times 768$ to $1500 \times 2000$ pixels (§4). Very small $\sigma$ makes each cell hyper-local and amplifies RANSAC noise; very large $\sigma$ approaches the global homography.
4. (soft) The weight floor $\gamma$ must be nonzero to prevent degeneracy in extrapolation cells. The paper uses $\gamma \in [0.0025, 0.025]$. As $\gamma \to 0$, cells far from correspondences can become numerically singular (Fig. 2 shows the unregularised MDLT result).
5. (hard) The cell grid covers only the source image; the method partitions $I$, not $I'$. Pixels in $I'$ (the target) are not warped; the result is one-directional stitching. Multi-image panoramas are handled incrementally (§4, Constructing full panoramas), not simultaneously.
6. (soft) The scene should not contain large foreground motion within the overlap. Moving objects produce spatially proximate correspondences with inconsistent $x'_i$; RANSAC removes the worst, but residual blur is absorbed by the local warp rather than eliminated.

# Failure regime

- **Extrapolation without correspondences.** Cells far from any correspondence rely entirely on the $\gamma$-floor, which forces those cells to solve the same global homography. If the global homography is a poor model globally, the extrapolation region will show the same misalignment as the global-baseline warp. The paper's APAP is not a cure for data-free regions — it is a cure for regions where data exists but is locally inconsistent with the global fit.
- **Moving objects in the overlap.** A foreground object that moved between the two exposures produces correspondences with locally inconsistent $x'_i$. RANSAC removes outliers only if they are globally inconsistent; a moving object with enough matches can pass RANSAC and contaminate the local homography in its cell, causing that region to be warped toward an average of the two object positions. The paper acknowledges deghosting algorithms remain useful for this case (§1).
- **Degenerate RANSAC initialisation.** If RANSAC returns a globally degenerate homography (coplanar scene viewed at a critical angle, or fewer than 4 inliers), the base design matrix $A$ is rank-deficient and no per-cell update can recover correctness. RANSAC failure propagates directly to MDLT failure.
- **Over-localisation (small $\sigma$, small $\gamma$).** A very small $\sigma$ with a very small $\gamma$ causes cells to be solved by the few nearby correspondences only. If fewer than 4 correspondences are nearby (or they are coplanar/collinear), the WSVD problem is under-determined and the cell homography is arbitrary. Increasing $\gamma$ prevents this but at the cost of reverting toward the global warp.
- **Grid resolution too coarse.** A $C_1 \times C_2$ grid that is too coarse fails to resolve the spatial scale of model deviations. The paper uses 50–100 cells per axis for images up to $1500 \times 2000$; for images with fine-scale parallax, a finer grid is needed, increasing computation.
- **Grid resolution too fine.** Very fine grids reduce the number of correspondences near each cell centre, increasing reliance on the $\gamma$-floor and reverting toward the global warp. Fine grids do not automatically improve alignment; they require dense correspondences.
- **As-affine-as-possible failure analogy.** The paper's 1D analogy (Fig. 1b) explicitly shows that affine regularisation (as in the SVA method, lin2011-svastitching) extrapolates incorrectly outside the overlap region because affine maps do not capture perspective distortion. APAP avoids this by using projective regularisation. However, if the overlap region spans the entire image, this distinction is less important.

# Numerical sensitivity

- **Hartley normalisation is essential.** The global design matrix $A$ is built from pixel coordinates that can span ~$10^3$ pixels; without normalisation the condition number of $A^T A$ is $O(10^8)$ and the SVD solution is numerically unreliable (§2.1 cites hartley1997-eight-point explicitly). Normalisation is applied once before all per-cell solves, so it costs $O(N)$ and does not scale with $C_1 C_2$.
- **Scale parameter $\sigma$ is image-size-dependent.** The paper uses $\sigma \in [8, 12]$ pixels for $1024 \times 768$ to $1500 \times 2000$ pixel images (§4). For a $4000 \times 3000$ image, a proportionally larger $\sigma \approx 20$–$30$ is appropriate. $\sigma$ is in source-image pixel units and must be re-tuned when the input resolution changes.
- **Weight floor $\gamma$ controls two distinct effects simultaneously.** (a) It prevents WSVD degeneracy in data-sparse cells; (b) it acts as a regulariser that blends each cell toward the global homography. These effects cannot be decoupled by a single scalar. The paper uses $\gamma \in [0.0025, 0.025]$; larger $\gamma$ increases stability at the cost of reducing adaptability.
- **Rank-one update numerical stability.** The secular-equation rank-one update (§3, Eq. 13) is numerically stable for small $\rho = (w_i^2/\gamma^2 - 1)$ — i.e., when the weight is close to $\gamma$. For cells near dense correspondences where $w_*^i \gg \gamma$, $\rho$ is large and more updates are applied, each incurring $O(m^2 \log^2 m)$ cost with $m = 9$. In the worst case (all weights active), the update approach provides no speedup over fresh SVD.
- **SVD of $W_* A$ for small $N$.** The full WSVD cost is $O(4 \cdot 2N \cdot 81 + 8 \cdot 729) = O(N)$ per cell, which is cheap: for $N = 2100$, the $4200 \times 9$ system is tiny relative to a typical $9 \times 9$ normal-equation solve. The paper reports "less than a minute" for 100×100 cells with $N = 2100$ on a 2012 Pentium i7 (§3).
- **Weight matrix structure.** $W_*$ is diagonal with repeated entries ($w_*^i$ appears at positions $2i-1$ and $2i$). This allows the weight scaling to be applied row-wise to $A$ in $O(2N \cdot 9) = O(N)$ before computing the SVD, without ever constructing $W_*$ explicitly.
- **Single-precision vs. double-precision.** The paper does not specify precision. The SVD of a $2N \times 9$ matrix with $N \sim 2000$ is well-conditioned in double precision after Hartley normalisation; single precision is likely adequate for the pixel-level accuracy reported (RMSE ~1–5 pixels), but the rank-one update uses secular equations that benefit from higher precision when $\rho$ is large.

# Applicability

- Use when: the two views to be stitched differ by more than a pure rotation (translation component significant relative to the scene depth), and sufficient keypoint correspondences exist in the overlap region ($N \gtrsim 50$ inliers).
- Use when: ghosting artefacts from a global homography are unacceptable and the overlap region contains parallax-inducing depth variation (foreground and background planes at significantly different depths).
- Use when: post-processing budget is limited — APAP reduces the initial misalignment, reducing the burden on deghosting, seam-cutting, and Poisson blending that would otherwise be required.
- Don't use when: the scene is planar or the views differ purely by rotation — a single global homography is sufficient, faster, and easier to tune (no $\sigma$, $\gamma$, grid resolution).
- Don't use when: camera intrinsics are available and views span large rotational difference — bundle adjustment with reprojection minimisation (e.g. Shum-Szeliski 2000) is more principled and produces globally consistent panoramas.
- Don't use when: $N$ is small (< ~20 inliers) — the local homography estimation per cell is unstable and the warp reverts to a noisy global homography with per-cell perturbations.
- Compared against (paper §4.2, Table 1):
  - **Global homography (DLT baseline)**: always worse than APAP in RMSE across all 5 image pairs; difference largest for railtracks (RMSE 13.9 vs 4.5 pixels) where scene depth variation is greatest.
  - **Dual-homography warps (DHW, gao2011-dual-homography)**: assumes the scene decomposes into a ground plane and a distant plane; performs well when this assumption holds, but worse than APAP on temple and chess/girl pairs where the scene structure is arbitrary. RMSE: temple 6.6 vs 1.4 (training), railtracks 14.1 vs 4.5.
  - **Smoothly varying affine (SVA, lin2011-svastitching)**: flexible interpolation in the overlap region but incorrect extrapolation (affine regularisation does not produce perspective extrapolation; Fig. 1b). Worst RMSE of any method on temple (12.3 vs 1.4). Scales very poorly: 15 minutes for $1024 \times 768$ vs APAP's "tens of seconds."
  - **Content-preserving warps (CPW, Liu et al. 2009)**: designed for video stabilisation, not stitching; rigidity constraints counterproductively reduce flexibility when views differ significantly. Second-best on railtracks but significantly worse on chess/girl (9.5 vs 3.0).

# Connections

- Builds on:
  - **hartley1997-eight-point** — Hartley normalisation of $A$ is explicitly cited as the conditioning step (§2.1). The per-cell WSVD inherits the same normalisation.
  - **schaefer2006-mls** — Moving Least Squares framework from which Moving DLT takes its name and weighting kernel concept (§2.2 and §1.1). APAP replaces affine/rigid regularisation with projective regularisation.
  - **gao2011-dual-homography** — primary comparison baseline for the two-plane assumption case. The temple image pair was contributed by the authors of gao2011-dual-homography (§4).
  - **lin2011-svastitching** — primary comparison baseline for smooth-varying-affine; APAP is motivated partly by the limitations of affine extrapolation identified there (§1.1).
  - **igarashi2005-arap** (as-rigid-as-possible; listed in index.yaml `cites`) — conceptual ancestor of the "as-X-as-possible" naming and philosophy.
- Enables:
  - **apap-image-stitching** — primary source page.
  - Future local-homography or spatially-varying-warp pages, if authored.
- Refutes / supersedes:
  - **SVA (lin2011-svastitching) for stitching** — APAP dominates SVA on all 5 tested image pairs and is orders of magnitude faster (Table 1 + run-time §4).
  - The claim that a single global homography is "good enough" for casual users — APAP demonstrates that a spatially varying projective field can be learned from the same SIFT inliers in comparable time.

# Atlas update plan

## UPDATE: apap-image-stitching

The existing page is correct and well-grounded against the paper. The procedure, equations, and implementation snippet all match. The following additions are grounded in paper sections not currently reflected on the page.

Section: Algorithm — Moving-DLT weights definition block
- The `:::definition[Moving DLT weights]` box gives the formula with $\sigma$ and $\gamma$ but does not state what the weight floor $\gamma$ does to the *global* warp behaviour. Add: "As $\gamma \to 1$, all weights equalise and $h_*$ converges to the global DLT homography $\hat{h}$ for all cells. As $\gamma \to 0$, cells with no nearby correspondences become numerically singular (Fig. 2 of the paper)." This surfaces the two-sided role of $\gamma$ — both a stability floor and a global-homography interpolant — which is currently described only partially ("as $\gamma \to 0$ extrapolation regions become numerically singular"). The convergence-to-global direction is stated in the page's Remarks but should also appear in the definition block for discoverability.

Section: Algorithm — rank-one SVD update (currently absent)
- Add a note (or an :::aside) explaining the computational shortcut: for most cells, $> 40\%$ of the 2100 weights equal $\gamma$ (Fig. 3d of the paper). Starting from the base solution $V \mathrm{diag}(\lambda) V^T = A^T W_\gamma^T W_\gamma A$ (Eq. 12), each active weight contributes a rank-one update to the eigendecomposition, costing $O(m^2 \log^2 m)$ with $m = 9$ via secular equations (§3, Eq. 13). This is the source of the "O(m² log² m) rank-one SVD update" sentence in the current Remarks; that sentence would benefit from the "most cells have few active weights" histogram fact to explain why the speedup is effective in practice.

Section: Remarks
- **Add bullet — quantitative RMSE benchmark (Table 1 §4.2).** The page has no quantitative evidence. APAP outperformed all compared methods on all 5 image pairs: railtracks RMSE 4.5 px vs. 13.9 px (global homography), 14.1 px (DHW), 7.5 px (SVA), 6.7 px (CPW); temple RMSE 1.4 px vs. 2.9 px (global), 6.6 px (DHW), 12.3 px (SVA), 2.5 px (CPW). Surface the worst-competitor contrast (DHW on temple, SVA on railtracks) to motivate when APAP is most valuable.
- **Add bullet — graceful degradation to global homography (Fig. 6).** Synthetic experiments show that as inter-camera translational distance tends to zero, APAP RMSE tends to zero (converges to the global-homography limit), whereas SVA and CPW retain nonzero error. This validates the "as-projective-as-possible" claim quantitatively. The current Remarks mentions this informally ("reduces gracefully to a global homography in two limits") but does not cite the synthetic experiment.
- **Add bullet — run-time context (§4, run-time paragraph).** APAP (without rank-one updating) runs in "tens of seconds" on a 2012 Pentium i7 for 100×100 cells and 2100 matches (MATLAB + C Mex). SVA took 15 minutes for the temple pair ($1024 \times 768$) and 1 hour for railtracks ($1500 \times 2000$). This situates APAP as competitive in run-time with DHW and CPW while substantially outperforming SVA.
- **Add bullet — RANSAC pre-filtering rationale.** The paper explicitly defends using RANSAC with global DLT to filter correspondences even when the global model is inadequate: "the error of the outliers is orders of magnitude larger than the inlier deviations" (§3). This is a subtle but important implementation point — RANSAC is not invalidated by local model violation.
- **Refine existing bullet — complexity.** The existing "complexity" Remarks bullet describes the rank-one update as "$O(m^2 \log^2 m)$" but does not state what triggers it or how many updates are needed per cell. Add: for $N = 2100$ matches with $\gamma = 0.0025$, more than 40% of cells have $< 20$ active weights; each active weight requires one rank-one update at $O(81 \log^2 9) \approx O(270)$ ops, versus a fresh SVD at $O(4 \cdot 2N \cdot 81) = O(680{,}000)$ — a ~2500× per-cell speedup for cells with few active weights.

Section: Comparison with related methods (future addition, defer until research notes for the compared methods exist)
- gao2011-dual-homography and lin2011-svastitching do not yet have research notes. Per comparison policy (docs/README.md §4): comparison prose may be written agentically only when both notes exist. Record here that APAP is the more-authoritative host for comparisons with DHW (APAP: 2013; DHW: 2011, older, but DHW would be the host by the "older hosts" rule — however, APAP is a general method and DHW is a special-case method of narrower scope; by the "same year → more general hosts" tiebreaker extended to the older-vs-general case, APAP is the better host for the "When to choose APAP over DHW" section). Flag for resolution when gao2011-dual-homography is ingested.
- The `comparedWith: []` field on the page is currently empty. Once research notes for gao2011-dual-homography and lin2011-svastitching are written, add `comparedWith: [gao2011-dual-homography, lin2011-svastitching]` (or whatever their atlas slugs are — verify those slugs exist before adding).

## UPDATE: homography (supplementary)

The homography concept page likely covers the DLT formulation and Hartley conditioning. APAP's per-cell WSVD is a direct extension. If the homography page has a "Applications" or "Extensions" section, add a bullet: "Moving DLT (Zaragoza et al. CVPR 2013) estimates a spatially varying field of homographies — one per cell of a regular grid over the source image — by solving the same DLT problem with Gaussian-proximity weights per cell. The result is a piecewise-constant projective warp that adapts locally where the global homography is inadequate."

# Provenance

- Paper: `docs/papers/.cache/zaragoza2013-apap.txt` (6 pages, CVPR 2013, pp. 2337–2342 in conference numbering).
- §2.1 (pp. 2339): DLT design matrix $a_i \in \mathbb{R}^{2 \times 9}$ (Eq. 3), $\hat{h} = \arg\min_{h}\|Ah\|^2$ (Eq. 4–5), Hartley normalisation cited as [7].
- §2.2 (pp. 2339–2340): Moving DLT weights without floor (Eq. 8), weighted problem in matrix form (Eq. 9), weight matrix $W_*$ (Eq. 10), weight with floor $\gamma$ (Eq. 11). MLS comparison (Schaefer et al. 2006 = [14]) and as-affine-as-possible limitation discussed inline.
- §3 (p. 2340): grid partitioning — "we partition the source image $I$ into a grid of $C_1 \times C_2$ cells. For each cell, the centre coordinate is chosen as $x_*$." Rank-one update: base eigendecomposition (Eq. 12), updated diagonal matrix $D + \rho \bar{r}_i \bar{r}_i^T$ (Eq. 13), cost $O(m^2 \log^2 m)$. Fig. 3d: "A vast majority of cells (> 40%) have fewer than 20 weights (out of 2100) that differ from $\gamma$." Run-time: "less than a minute on a Pentium i7 2.2GHz Quad Core machine" for 100×100 cells, $N = 2100$, MATLAB.
- §4, preprocessing (p. 2341): $\sigma \in [8, 12]$ for $1024 \times 768$ to $1500 \times 2000$; $\gamma \in [0.0025, 0.025]$; $C_1, C_2 \in [50, 100]$. RANSAC rationale: "the error of the outliers is orders of magnitude larger than the inlier deviations."
- §4.2, Table 1 (p. 2342): RMSE training/testing for 5 image pairs (railtracks, temple, carpark, chess/girl, rooftops) comparing global baseline, DHW, SVA, CPW, APAP. APAP best on all pairs.
- §4.2, Fig. 6 (p. 2342): RMSE vs. inter-camera translational distance on synthetic data — APAP tends to zero; SVA and CPW retain nonzero error; confirms graceful reduction to global homography.
- §5, Conclusion (p. 2342): "the proposed warp reduces gracefully to a global homography as the camera translation tends to zero" — direct quote retained; paraphrasing would lose the quantitative backing.
