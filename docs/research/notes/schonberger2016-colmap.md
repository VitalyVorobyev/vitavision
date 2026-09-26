---
paper_id: schonberger2016-colmap
title: "Structure-from-Motion Revisited"
authors: ["Johannes L. Schönberger", "Jan-Michael Frahm"]
year: 2016
url: https://demuc.de/papers/schoenberger2016sfm.pdf
created: 2026-09-15
relevant_atlas_pages: [colmap, bundle-adjustment, feature-matching, ransac, pose-estimation, feed-forward-3d-reconstruction]
---

# Setting

Incremental Structure-from-Motion (SfM) from an unordered collection of
images $I = \{I_i \mid i=1\dots N_I\}$. Input: unordered, uncalibrated (or
partially calibrated) internet photo collections, with no prior knowledge of
scene coverage or camera parameters (§4.2). Output: camera poses $P =
\{P_c \in SE(3) \mid c=1\dots N_P\}$ for registered images and a reconstructed
3D point cloud $X = \{X_k \in \mathbb{R}^3 \mid k=1\dots N_X\}$ (§2.2,
opening). This is the reference paper for COLMAP, the open-source SfM/MVS
pipeline (code released at github.com/colmap/colmap, Abstract).

# Core idea

The paper keeps the standard incremental-SfM pipeline structure —
correspondence search (feature extraction, matching, geometric verification)
→ incremental reconstruction (initialization, image registration,
triangulation, bundle adjustment) (Fig. 2, §2) — but replaces four pipeline
stages with more robust/efficient variants, contributed as four numbered
improvements (§4, "Contributions" paragraph):

1. **Scene-graph augmentation** (§4.1): after estimating a fundamental matrix
   (accepted if inlier count $\ge N_F$), the pair is further classified by
   homography inlier count $N_H$: assume a moving camera in a general scene if
   $N_H/N_F < H_F$. For calibrated pairs, an essential matrix is also
   estimated; if $N_E/N_F > E_F$ the pair is assumed correctly calibrated. In
   that case, with $N_H/N_F < H_F$, the essential matrix is decomposed,
   points triangulated, and the median triangulation angle $\alpha_m$
   computed to distinguish panoramic (pure rotation) from planar-scene pairs.
   Watermark/timestamp/frame (WTF) pairs are detected via a similarity
   transform with $N_S$ inliers at image borders: a pair is a WTF (and
   dropped) if $N_S/N_F > S_F \lor N_S/N_E > S_E$ (§4.1).
2. **Next-best-view selection** (§4.2): candidate images (seeing $N_t > 0$
   triangulated points) are scored by a multi-resolution point-distribution
   score. The image is discretized into a $K_l \times K_l$-bin grid at pyramid
   level $l = 1\dots L$ ($K_l = 2^l$); each newly-covered cell raises the
   per-level score by weight $w_l = K_l^2$, and scores are summed over levels
   — this rewards both point count and uniform spatial distribution while
   remaining efficient to update online (§4.2, Fig. 3).
3. **Robust and efficient (recursive RANSAC-based) triangulation** (§4.3):
   multi-view triangulation is posed as a RANSAC problem over a feature
   track $T = \{T_n \mid n=1\dots N_T\}$ with unknown inlier ratio
   $\varepsilon$. Each candidate 2-view triangulation
   $X_{ab} \sim \tau(\bar x_a, \bar x_b, P_a, P_b)$ (Eq. 2, DLT) is accepted if
   the triangulation angle
   $\cos\alpha = \frac{t_a - X_{ab}}{\lVert t_a-X_{ab}\rVert_2}\cdot
   \frac{t_b-X_{ab}}{\lVert t_b-X_{ab}\rVert_2}$ (Eq. 3) is sufficient and both
   views pass the cheirality (positive-depth) constraint using
   $d = \begin{bmatrix}p_{31}&p_{32}&p_{33}&p_{34}\end{bmatrix}
   \begin{bmatrix}X_{ab}^T & 1\end{bmatrix}^T$ (Eq. 4) and a reprojection-error
   threshold $t$ on $e_n = \bar x_n -
   \begin{bmatrix}x'/z'\\y'/z'\end{bmatrix}$, $\begin{bmatrix}x'\\y'\\z'\end{bmatrix}
   = P_n\begin{bmatrix}X_{ab}\\1\end{bmatrix}$ (Eq. 5). RANSAC uses a
   unique-sample random sampler and an adaptive stopping criterion (initial
   inlier-ratio guess $\varepsilon_0$, confidence $\eta$); after finding a
   consensus set, the procedure recurses on the remaining track elements
   (stopping once the residual consensus set is smaller than 3), recovering
   multiple independent points merged into a single mismatched track (§4.3).
4. **Bundle adjustment with iterative refinement and redundant-view mining**
   (§4.4-§4.5): standard BA minimizes reprojection error
   $E = \sum_j \rho_j\lVert\pi(P_c, X_k) - x_j\rVert_2^2$ (Eq. 1) using the
   Cauchy robust loss $\rho_j$, a sparse direct solver for small problems and
   PCG for large ones (Ceres Solver). The paper adds: local BA after each
   registration + periodic global BA (amortized linear runtime, following
   VisualSFM); freely-optimized focal length/distortion (never a priori
   fixed range) with principal point fixed at the image center for
   uncalibrated cameras; post-BA re-triangulation (RT) in addition to the
   standard pre-BA RT; and an iterative BA/RT/filtering loop that repeats
   until the number of filtered observations and post-BA RT points
   diminishes (§4.4). Redundant-view mining (§4.5) clusters highly
   overlapping, "unaffected" images into groups $G_r$ using visibility-vector
   Jaccard similarity $V_{ab} = \lVert v_a \wedge v_b\rVert / \lVert v_a \vee
   v_b\rVert$ (Eq. 6) and parameterizes each group's images by a single
   group-local pose $G_r \in SE(3)$ composed with the fixed relative pose
   $P_c$, so $P_{cr} = P_c G_r$; the grouped BA cost is
   $E_g = \sum_j \rho_j \lVert \pi_g(G_r, P_c, X_k) - x_j\rVert_2^2$ (Eq. 7).

# Claimed contributions

- C1: "an efficient camera grouping scheme leveraging the inherent properties
  of SfM and replacing the expensive graph-cut employed by Ni et al." (§4.5,
  camera-grouping paragraph, first of "three main contributions" for the
  redundant-view-mining sub-method — distinct from the paper's headline
  four-item list)
- C2 (headline, §4 "Contributions"): "a geometric verification strategy that
  augments the scene graph with information subsequently improving the
  robustness of the initialization and triangulation components" —
  scene-graph augmentation.
- C3 (headline): "a next best view selection maximizing the robustness and
  accuracy of the incremental reconstruction process."
- C4 (headline): "a robust triangulation method that produces significantly
  more complete scene structure than the state of the art at reduced
  computational cost."
- C5 (headline): "an iterative BA, re-triangulation, and outlier filtering
  strategy that significantly improves completeness and accuracy by
  mitigating drift effects."
- C6 (headline): "a more efficient BA parameterization for dense photo
  collections through redundant view mining." Overall claim: "a system that
  clearly outperforms the current state of the art in terms of robustness and
  completeness while preserving its efficiency." (§4, closing sentences of
  "Contributions")

# Assumptions

1. Correspondence search is performed independently of the four proposed
   contributions and held constant across compared methods in experiments
   (RootSIFT features, 100-nearest-neighbor vocabulary-tree matching, §5) —
   COLMAP's contributions are about the reconstruction stage and scene-graph
   augmentation, not feature detection/matching itself.
2. The triangulation-angle and reprojection-error thresholds ($\alpha=2°$,
   $t=8\mathrm{px}$, $\varepsilon_0=0.03$ in the Dubrovnik experiment, §5) are
   dataset-tuned hyperparameters, not derived analytically — a soft
   assumption that requires re-tuning per dataset scale/noise regime. ?
   General-purpose default values are not stated in the main text beyond the
   Dubrovnik experiment.
3. Panoramic (pure-rotation) image pairs are explicitly excluded from
   triangulation to "avoid erroneous triangulation angles due to inaccurate
   pose estimates" (§4.3) — a hard assumption: panoramic pairs never
   contribute 3D points regardless of feature quality.
4. Principal point is assumed fixed at the image center for uncalibrated
   cameras because "principal point calibration is an ill-posed problem" —
   a hard modeling assumption baked into the BA parameterization (§4.4,
   "Parameterization").
5. Redundant-view grouping assumes that BA on grouped ("unaffected") images
   need only be refined in case of drift, since "the model usually extends
   locally" — a soft assumption that can degrade accuracy for larger group
   overlap ratios $V$ (quantified in Numerical sensitivity below) (§4.5).

# Failure regime

- Naive exhaustive pairwise matching has complexity $O(N_I^2 N_{F_i}^2)$ and
  is "prohibitive for large image collections" (§2.1, "Matching") — the
  reason scalable matching strategies (vocabulary trees, etc.) are required
  before COLMAP's stages ever run.
- Direct (dense/sparse-factoring) BA solvers have $O(N_P^2)$ space and
  $O(N_P^3)$ time complexity, making them "the method of choice for up to a
  few hundred cameras" but "too expensive in large-scale settings," where
  indirect/PCG solvers ($O(N_P)$ time and space) are required instead (§2.2,
  "Bundle Adjustment").
- Bundler's non-recursive, exhaustive-pairwise multi-view triangulation "is
  not robust to outliers, as it is not possible to recover independent
  points merged into one track," and has "significant computational cost due
  to exhaustive pairwise triangulation" (§4.3, "Bundler samples..." paragraph)
  — motivating COLMAP's recursive RANSAC-based triangulation.
- Feature tracks can be severely outlier-contaminated: "falsely merging four
  feature tracks with equal length results in an outlier ratio of 75%" (§4.3)
  — a concrete worked example of how track-merging failures compound.
  Empirically, on the Dubrovnik dataset (2.9M feature tracks from 47M
  verified matches) the outlier-ratio distribution (Fig. 6, left) motivates
  needing a robust (not exhaustive) triangulation method.
- Without BA, "SfM usually drifts quickly to a non-recoverable state" (§2.2,
  "Bundle Adjustment") — i.e., the incremental pipeline is not self-correcting
  without periodic global refinement.
- Reduced scene-overlap threshold $V$ in redundant-view mining trades
  accuracy for speed: reprojection error degrades from 0.26px (standard BA)
  to 0.27px ($V=0.6$), 0.28px ($V=0.3$), 0.29px ($V=0.1$), with runtime
  savings of 5%, 14%, 32% respectively; "reconstruction quality is comparable
  for all choices of $V > 0.3$ and increasingly degrades for a smaller $V$"
  (§5, "Redundant View Mining").

# Numerical sensitivity

- BA's Schur-complement-based direct solve is $O(N_P^3)$ time / $O(N_P^2)$
  space; the paper's redundant-view-mining contribution exists specifically
  because "a reduction in the number of cameras affects the cubic
  computational complexity of direct methods more than the linear complexity
  of indirect methods" (§4.5, penultimate paragraph) — the grouping
  contribution's numerical payoff scales with the cube of the camera-count
  reduction for direct solvers.
- RANSAC-based recursive triangulation on Dubrovnik (Table 2, $\eta_1=0.99$,
  $\eta_2=0.5$) is "just marginally inferior" in point count/track length to
  exhaustive recursive triangulation (906,501 vs. 894,294 points; avg. track
  length 8.795 vs. 9.003) but "much faster (10-40x)" (145.22M vs. 12.69M/
  7.82M samples) — a quantified accuracy/speed trade-off tunable via $\eta$.
- On the Alamo dataset (Table 1), average reprojection error is 1.47px
  (Theia), 2.29px (Bundler), 0.70px (VisualSFM), 0.68px (Ours) — COLMAP
  reports sub-pixel average reprojection error consistently across datasets
  in Table 1's rightmost columns (e.g. 0.68-0.81px across the 15 landmark
  datasets listed).
- Best pose accuracy on the Quad dataset (ground-truth camera locations):
  DISCO 1.16m, Bundler 1.01m, VisualSFM 0.89m, Ours 0.85m (§5, "System"
  paragraph, just before Conclusion) — the paper's own headline
  metric-accuracy comparison number.
- Timing at 2.7GHz / 256GB RAM (§5, footnote before Table 1): COLMAP is "more
  than 50 times faster than Bundler" but "achieves slightly worse timings
  than VisualSFM," with Theia being the fastest of the compared systems (§5,
  "System" paragraph).

# Applicability

- Use when: reconstructing 3D structure and camera poses from large,
  unordered internet-photo-style collections with unknown or partial
  calibration, where robustness/completeness under WTF images, panoramas,
  and highly outlier-contaminated correspondences matters more than raw
  speed (§4, §5).
- Don't use when: correspondence search itself is the bottleneck (COLMAP's
  contributions target the reconstruction stage, not feature
  extraction/matching, §5 "correspondence search is not included in the
  timings"), or when a strict global (non-incremental) SfM formulation is
  required (COLMAP is explicitly an incremental pipeline, §2).
- Compared against (paper's own baselines, Table 1 and §5): Bundler
  (incremental, open-source), VisualSFM (incremental, closed-source), DISCO
  and Theia (global SfM systems) — evaluated on 17 unordered Internet-photo
  datasets (144,953 images total) plus the Quad ground-truth dataset.

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| ransac | "To handle arbitrary levels of outlier contamination, we formulate the problem of multi-view triangulation using RANSAC." (§4.3) — COLMAP names RANSAC as an explicit named component embedded in a new recursive triangulation algorithm (Eqs. 2-5), not merely upstream data flow. | feeds_into | medium | Target is a concept page, not a single paper — `feeds_into`'s worked examples (VGG→FCN, FAST→ORB) are paper-to-paper; using it against a concept page is atypical and should be revisited at page-authoring time. Chronology is trivially satisfied (RANSAC concept predates 2016). |
| bundle-adjustment | "We contrast our contributions to the current state-of-the-art systems Bundler ... and VisualSFM" (§4) and "BA [58] is the joint non-linear refinement..." (§2.2) — COLMAP proposes a new grouped-BA parameterization (Eq. 7) extending standard BA (Eq. 1), but standard BA itself is treated as established background, not a single paper COLMAP builds on. | none | — | No clean typed-relation target: bundle-adjustment is generic background technique, not a specific antecedent paper. Express via the concept page's "Where it appears" section naming COLMAP's grouped-BA parameterization, not a `relations[]` edge (mirrors CLAUDE.md's guidance for pipeline/background usage with no genuine single-paper build-on). |
| feature-matching | "The first stage is correspondence search which finds scene overlap..." (§2.1) — COLMAP explicitly excludes correspondence-search improvements from its contributions and holds matching constant in experiments (§5). | none | — | Explicitly *not* a contribution of this paper; upstream pipeline stage the paper builds on but does not extend. No relation — mention in the concept page's pipeline context only. |
| pose-estimation | "new images can be registered to the current model by solving the Perspective-n-Point (PnP) problem... the pose for calibrated cameras is usually estimated using RANSAC and a minimal pose solver" (§2.2, "Image Registration") — COLMAP proposes a next-best-view selection method (§4.2) that improves *which* image is registered next, not the PnP pose solver itself. | none | — | COLMAP consumes PnP/pose-estimation as an unmodified component; its contribution (next-best-view scoring) is adjacent, not a lineage edge on the pose solver. |
| feed-forward-3d-reconstruction | Not discussed in the paper — COLMAP is a classical iterative/incremental optimization pipeline, published years before feed-forward (single-pass, learned) 3D reconstruction methods existed. | none (Rule B, cross-domain/no shared claim) | — | Candidate slug is a modern (post-2016) concept describing a different problem-solving paradigm; the paper makes no positioning claim toward it. Any connection would be an editorial addition at page-authoring time, not paper-stated. |

# Connections

- Builds on: [lepetit2009-epnp, fischler1981-ransac, lowe2004-sift] (registered
  antecedents: PnP solver citation for pose estimation §2.2, RANSAC as the
  robust-estimation backbone throughout §2.1/§4.3, SIFT as "the gold standard"
  feature descriptor §2.1).
- Builds on (cited but not yet registered in index.yaml): Bundler [52],
  VisualSFM [62], Ceres Solver [2], Haner & Heyden next-best-view [24], Ni et
  al. BA partitioning [43], Kushal et al. BA preconditioning [33] — ? left as
  prose only since these ids are not in `docs/papers/index.yaml`.
- Enables: not stated in-paper (2016 publication; forward influence not
  discussed).
- Refutes / supersedes: none claimed as supersession — the paper positions
  itself as outperforming Bundler/VisualSFM/DISCO/Theia empirically (Table 1,
  §5), not as rendering them historically obsolete in the CLAUDE.md Rule A
  sense (no single target recovers "everything COLMAP recovers, plus
  strictly more" claim against a single named predecessor paper).

# Atlas update plan

## NEW: colmap
Type: algorithm
Category: structure-from-motion / 3d-reconstruction (pipeline altitude)
Primary source: this paper
Bullets per public-page section:
- Goal: incremental SfM from unordered, uncalibrated image collections —
  camera poses + sparse 3D point cloud (§2.2 opening).
- Algorithm: the four-stage pipeline (Fig. 2) with COLMAP's four
  contributions layered in — scene-graph augmentation (§4.1), next-best-view
  selection (§4.2, pyramid score), RANSAC-based recursive triangulation
  (§4.3, Eqs. 2-5), iterative BA/RT/filtering + redundant-view-mining grouped
  BA (§4.4-§4.5, Eqs. 1, 6, 7).
- Implementation: reference to the open-source `github.com/colmap/colmap`
  release (Abstract) — use `sources.impl` per CLAUDE.md, license/commit to be
  verified at page-authoring time.
- Remarks: quantified robustness/completeness/accuracy/efficiency gains over
  Bundler/VisualSFM/DISCO/Theia across 17 datasets (Table 1, §5); more than
  50x faster than Bundler, slightly slower than VisualSFM (§5 "System").
- References: this paper (primary).

## UPDATE: bundle-adjustment
Section: Where it appears
Bullets to add:
- COLMAP's grouped-BA parameterization (Eq. 7, §4.5) clusters highly
  overlapping "unaffected" images into single group-local poses via a
  Jaccard-similarity criterion (Eq. 6), reducing the cubic direct-solver cost
  by shrinking the effective camera count — a documented application of BA's
  cubic-complexity concern (§4.5, §2.2).

## UPDATE: feature-matching
Section: Where it appears
Bullets to add:
- COLMAP augments the scene graph after matching+geometric-verification with
  homography/essential-matrix classification (general / panoramic / planar)
  and a watermark-timestamp-frame (WTF) filter, improving downstream
  triangulation robustness without modifying the matching stage itself
  (§4.1).

## UPDATE: ransac
Section: Where it appears
Bullets to add:
- COLMAP reformulates multi-view triangulation itself as a recursive RANSAC
  problem over a feature track (unique-sample sampler, adaptive stopping
  criterion, recursive removal of consensus sets to recover independent
  points from a merged track) — a non-standard RANSAC application beyond the
  typical two-view/PnP use case (§4.3, Eqs. 2-5).

## UPDATE: pose-estimation
Section: Where it appears
Bullets to add:
- COLMAP's next-best-view selection (§4.2) chooses which image to register
  next by a multi-resolution point-count/distribution score (pyramid score,
  Fig. 3), motivated by PnP pose accuracy depending on "the number of
  observations and their distribution in the image" (§4.2, citing Lepetit et
  al.).

## UPDATE: feed-forward-3d-reconstruction
Section: Where it appears
Bullets to add:
- Add COLMAP as the canonical classical (iterative, optimization-based)
  incremental-SfM counterpart against which feed-forward/learned 3D
  reconstruction methods are typically contrasted — no direct paper-stated
  relation (see Stated relations table; Rule B applies, this is an editorial
  cross-reference for the concept page's survey framing, not a `relations[]`
  edge).

# Provenance

- Abstract: open-source release claim, "COLMAP" name and URL.
- §2.1 (Correspondence Search): feature/matching/geometric-verification
  definitions, $O(N_I^2 N_{F_i}^2)$ naive matching complexity.
- §2.2 (Incremental Reconstruction): pose/point set definitions; Eq. 1 (BA
  cost); direct-solver $O(N_P^2)/O(N_P^3)$ vs. PCG $O(N_P)$ complexity.
- §4 (Contributions): headline four-contribution list (C2-C6); "we contrast
  our contributions to... Bundler... and VisualSFM" comparison framing.
- §4.1 (Scene Graph Augmentation): $N_F, N_H, H_F, N_E, E_F, \alpha_m, N_S,
  S_F, S_E$ thresholds and WTF detection rule.
- §4.2 (Next Best View Selection): pyramid score construction, $K_l=2^l$,
  $w_l=K_l^2$; Fig. 3/4/5 experiments.
- §4.3 (Robust and Efficient Triangulation): RANSAC formulation, Eqs. 2-5;
  75% outlier-ratio worked example; recursion stopping rule (<3 elements);
  Dubrovnik experiment parameters $\alpha=2°$, $t=8\mathrm{px}$,
  $\varepsilon_0=0.03$, 10K iteration cap; Table 2 numbers.
- §4.4 (Bundle Adjustment): Cauchy loss, sparse-direct vs. PCG solver choice,
  Ceres Solver, principal-point-fixed assumption, iterative BA/RT/filtering
  loop.
- §4.5 (Redundant View Mining): Eq. 6 (Jaccard visibility similarity), Eq. 7
  (grouped BA cost), grouping algorithm, $V$/runtime/reprojection-error
  trade-off numbers (5%/14%/32% speedup, 0.26→0.27→0.28→0.29px).
- §5 (Experiments): dataset description (17 datasets, 144,953 images);
  RootSIFT + 100-NN vocabulary tree matching; Table 1 (per-dataset
  registration/points/timing/reprojection-error numbers); "System" paragraph
  (Quad pose accuracy: DISCO 1.16m, Bundler 1.01m, VisualSFM 0.89m, Ours
  0.85m; "50 times faster than Bundler").
- §6 (Conclusion): summary claim, no new numbers.
