---
paper_id: schaefer2006-mls
title: "Image Deformation Using Moving Least Squares"
authors: ["S. Schaefer", "T. McPhail", "J. Warren"]
year: 2006
url: https://people.engr.tamu.edu/schaefer/research/mls.pdf
created: 2026-05-02
relevant_atlas_pages: [apap-image-stitching]
---

# Setting

**Problem class.** Interactive image deformation driven by sparse user-specified control-point pairs. Given a set of source handles $\{p_i\}$ and their desired target positions $\{q_i\}$, compute a smooth warp function $f : \mathbb{R}^2 \to \mathbb{R}^2$ that interpolates the handles and deforms the remainder of the image intuitively. The warp is applied to every pixel (or grid vertex) of the source image.

**Inputs.** A raster image plus a small set of point handles (or line-segment handles). Handles are placed interactively; the source positions $\{p_i\}$ are fixed and the user manipulates target positions $\{q_i\}$. No other image metadata, no correspondence from feature matching — the problem is purely user-driven.

**Outputs.** A dense deformation field $f(v)$ for each query pixel $v$: the position in the deformed image to which $v$ maps. In practice the function is evaluated on a coarse grid (e.g. $100 \times 100$ for a $500 \times 500$ image) and the quads filled by bilinear interpolation (§4).

**Design requirements** (stated in §1):
1. *Interpolation*: $f(p_i) = q_i$ for all handles.
2. *Smoothness*: $f$ is smooth everywhere except at control points when $\alpha \leq 1$.
3. *Identity*: if $q_i = p_i$ for all $i$, then $f(v) = v$.

These requirements mirror scattered-data interpolation conditions. The paper satisfies all three by construction.

# Core idea

For each query point $v$ in the image, solve a spatially-weighted least-squares problem to find the best local linear transformation $l_v(x)$ that carries the control points $p_i$ toward the targets $q_i$:

$$\min_{l_v} \sum_i w_i \,|\, l_v(p_i) - q_i \,|^2, \quad w_i = \frac{1}{|p_i - v|^{2\alpha}}.$$

The weights depend on $v$, so a different (local) transformation is recovered at each image location — this is the "moving" in Moving Least Squares (Levin 1998). The deformation is defined as $f(v) = l_v(v)$: apply the local transformation to $v$ itself. As $v \to p_i$ the weight $w_i \to \infty$ and $l_v$ is forced to map $p_i$ to $q_i$, guaranteeing interpolation.

The translation component of $l_v$ is decoupled analytically. Writing $l_v(x) = (x - p^*) M + q^*$ where $p^*, q^*$ are the weighted centroids:

$$p^* = \frac{\sum_i w_i p_i}{\sum_i w_i}, \quad q^* = \frac{\sum_i w_i q_i}{\sum_i w_i},$$

the least-squares problem reduces to minimizing $\sum_i w_i |\hat{p}_i M - \hat{q}_i|^2$ over the linear matrix $M$ alone, where $\hat{p}_i = p_i - p^*$, $\hat{q}_i = q_i - q^*$. Three variants restrict $M$ to different transformation classes, each admitting a closed-form solution:

- **Affine MLS** (§2.1): $M$ is unconstrained $2 \times 2$; solved by the normal equations — a constant-size $2 \times 2$ matrix inversion.
- **Similarity MLS** (§2.2): $M^T M = \lambda^2 I$ (rotation + uniform scale); $M$ is parameterized by a single column vector $M_1$ with $M_2 = M_1^\perp$. Closed form: eq. (6). Preserves local angles; avoids the shear and non-uniform scaling artifacts of affine MLS.
- **Rigid MLS** (§2.3): $M^T M = I$ (pure rotation, no scale). Derived from the similarity solution via Theorem 2.1: the rotation matrix $R$ that minimizes the rigid functional equals the rotation factor of the similarity minimizer $C = \lambda R$. Rigid MLS is the most perceptually realistic for organic subjects but cannot be fully precomputed (requires a normalization step, eq. (8)).

All three variants precompute as much as possible given fixed $p_i$ and varying $v$, yielding interactive-rate (sub-millisecond per vertex) evaluation on a $100 \times 100$ grid (Table 1: affine 1.5 ms, similarity 2.3 ms, rigid 2.6 ms for 7 point handles on a 3 GHz machine).

The paper also extends all three variants to **line-segment handles** (§3), replacing the weight function with an integral over each control curve. Closed-form solutions for $\alpha = 2$ are provided in Appendix B.

# Assumptions

1. (soft) Control points are not coincident with the query point $v$. As $|p_i - v| \to 0$, $w_i \to \infty$ and the local transform is fully determined by that control point; the function still interpolates but the weighting of all other points collapses. The paper states smoothness holds "everywhere (except at the control points $p_i$ when $\alpha \leq 1$)" (§2).
2. (hard) At least one control point exists. With no control points, the least-squares problem is undefined. In practice a minimum of 3 non-collinear points is needed for the affine system to be well-determined (fewer control points make $\sum_i \hat{p}_i^T w_i \hat{p}_i$ rank-deficient).
3. (soft) Deformation is bijective (no fold-backs). The method warps the entire plane without topology awareness; sign changes of the Jacobian produce fold-backs (see §5 and Figure 8). Fold-backs are infrequent for moderate deformations but inevitable for extreme ones. No built-in fold-back prevention — the paper references Tiddeman et al. (2001) as an external remedy.
4. (soft) $\alpha \in [1, 2]$ is appropriate for the handle density. The exponent controls how quickly distant handles lose influence. The paper uses $\alpha = 1$ (default implied by the formula notation — the weight is $1/|p_i - v|^{2\alpha}$) in the point-handle case; for line segments it supplies closed forms at $\alpha = 2$ (Appendix B). Higher $\alpha$ sharpens the locality but can introduce visible seams between regions of influence.
5. (hard) The image is treated as a flat 2D plane with no embedded topology. Control points near each other in pixel space are treated as spatially close even if they belong to distinct objects (e.g. the two legs of a horse). The paper acknowledges this limitation (§5): "Igarashi et al. construct triangulations that outline the boundary of the shape and build deformations dependent on the specified topology."

# Failure regime

- **Fold-backs under extreme deformation.** The Jacobian of $f$ can change sign when control points are moved far from their source positions or when handles are arranged to invert a region. The deformed image folds over itself in that region (Figure 8). The paper notes this is a limitation shared by most space-warping approaches.
- **Shearing and non-uniform scaling in the affine variant.** Affine MLS does not preserve local shape — arms, legs, and profiles shear visibly (Figure 1b, Figure 5 middle). The similarity and rigid variants address this, but at the cost of no longer having a purely linear closed form (rigid requires a normalization step).
- **Topology-blind regions.** Spatially close but structurally unrelated image regions (e.g., horse legs in Figure 4) receive correlated deformations. This is intrinsic to the 2D-plane warp model; no amount of control-point placement fully separates them without explicit topology.
- **Rigid deformation cannot be fully precomputed.** The normalization in eq. (8) depends on the magnitude $|v - p^*|$ and the runtime vector $\tilde{f}_r(v)$, making rigid MLS slightly slower than similarity MLS (Table 1: 2.6 ms vs 2.3 ms). Not a correctness failure, but a performance concern for very dense grids.
- **Degenerate configuration with collinear or coincident handles.** When all $\hat{p}_i$ are collinear, the matrix $\sum_i \hat{p}_i^T w_i \hat{p}_i$ is rank-1 and cannot be inverted for the affine case. The paper does not discuss this explicitly; in practice UI constraints prevent fully degenerate configurations.

# Numerical sensitivity

- **Weight exponent $\alpha$.** The paper uses $\alpha = 1$ for point handles (weight $1/|p_i - v|^2$) and provides Appendix B for $\alpha = 2$ in the line-segment case. Larger $\alpha$ localises the influence more aggressively; smaller $\alpha$ blends handles over longer distances. The paper does not perform a sensitivity study — the choice is treated as user preference.
- **Weighted centroid conditioning.** If all weights $w_i$ are extremely small (all control points far from $v$), $p^*$ and $q^*$ are numerically stable (they are weighted averages), but the matrix $\sum_i \hat{p}_i^T w_i \hat{p}_i$ can become near-singular. In practice, with widely spaced control points and distant queries, the affine solution is close to the global affine from all handles equally weighted, which is well-conditioned as long as the handles span 2D.
- **Grid resolution vs. deformation accuracy.** The method is evaluated on a $100 \times 100$ grid for $500 \times 500$ images (§4). The paper states this "produces deformations indistinguishable from the more expensive process of applying the deformation to every pixel." Bilinear interpolation within quads introduces $O(h^2)$ error where $h$ is cell size; highly localised deformations between two adjacent grid vertices may be missed.
- **Rigid vs. similarity precomputation.** The similarity variant allows full precomputation of $A_i$ (eq. 7) for a fixed $v$; the rigid variant computes the same $\tilde{f}_r(v) = \sum_i \hat{q}_i A_i$ but then normalises and rescales, introducing a square-root that prevents precomputation caching across control-point updates.

# Applicability

- Use when: interactive image deformation with sparse user-placed handles, especially for cartoon-like characters, face editing, or organic shape manipulation where rigid-body feel is desired. The rigid MLS variant is the best choice for perceptually realistic results.
- Use when: deformation handles are line segments (profiles, curves) rather than points; the line-segment extension provides closed forms.
- Use when: a global smooth deformation without explicit mesh construction is needed. MLS is topology-free and requires no triangulation or mesh connectivity.
- Don't use when: the warp must be bijective by construction (e.g., medical image registration where fold-backs are unacceptable). Use topology-aware methods (Igarashi et al. triangulation) or add a post-hoc fold-back correction.
- Don't use when: the deformation is driven by dense correspondences from feature matching (e.g., image stitching with SIFT). MLS was designed for sparse interactive handles; the projective-warp regime (APAP/Moving DLT) is the appropriate generalisation for dense matches in a projective setting.
- Don't use when: independent image regions (separated by silhouette boundaries) need to deform independently. Without embedded topology, spatially close pixels from different structures receive correlated deformations.
- Compared against:
  - **Thin-plate splines** (Bookstein 1989): also control-point interpolating, globally smooth. TPS minimises bending energy; MLS minimises local transformation cost. TPS does not restrict transformation class and includes non-uniform scaling and shear. Figure 2 (left) shows TPS behaviour on the paper's test case — similar to affine MLS.
  - **Igarashi et al. (2005) ARAP**: triangulates the image and solves a global linear system of size equal to vertex count for as-rigid-as-possible deformations. More accurate topology separation but slower (reported slowdown at 300 vertices on 1 GHz vs. MLS handling $100 \times 100$ grids in real-time on 3 GHz). MLS produces globally smooth deformations; Igarashi produces visible discontinuities at quad boundaries (Figure 2 right). MLS is a direct competitor in the ARAP design space, offering closed forms without triangulation.
  - **Beier-Neely (1992)**: line-segment based, uses Shepard's interpolant. Can produce "ghosts" — folding artefacts — not visible in rigid MLS (Figure 6).

# Connections

- Builds on:
  - **levin1998-mls** — Levin's Moving Least Squares approximation framework (cited as "Levin 1998" in §2). MLS in mathematics refers to a class of locally-weighted polynomial fitting methods; the paper imports the framework into image deformation.
  - **horn1987-rigid** — Horn (1987) closed-form solution for rigid registration using unit quaternions / eigendecomposition of a covariance matrix. Cited in §2.3 as the source of the rigid transform closed form; Theorem 2.1 adapts it to the MLS setting.
  - **igarashi2005-arap** — Igarashi, Moscovich, Hughes (2005) SIGGRAPH "As-rigid-as-possible shape manipulation." MLS is positioned as a more efficient alternative: smaller linear systems ($2 \times 2$ vs. one global system), globally smooth vs. piecewise, real-time vs. limited scale.
- Enables (in the atlas):
  - **apap-image-stitching** — Zaragoza et al. (2013) transplant the MLS position-dependent weighting idea from the Euclidean/similarity/affine setting to the projective setting. Per-query-pixel weighted DLT (Moving DLT) is a structural analogue of MLS: the weight function $w_*^i = \max(\exp(-\|x_* - x_i\|^2 / \sigma^2), \gamma)$ is Gaussian rather than inverse-power, and the local fit is a full $3 \times 3$ homography rather than a $2 \times 2$ affine/similarity/rigid matrix. The APAP paper explicitly cites MLS as the conceptual origin of position-dependent local fitting.
- Refutes / supersedes:
  - MLS does not refute prior work but positions itself against TPS and Igarashi ARAP in the deformation-realism / computation-speed trade-off. It offers a Pareto improvement over Igarashi on speed without sacrificing global smoothness.

# Atlas update plan

## UPDATE: apap-image-stitching

Section: Remarks
- Add bullet clarifying the MLS conceptual lineage of Moving DLT. The APAP Remarks section currently notes that the warp "reduces gracefully to a global homography in two limits" and describes per-cell complexity, but does not surface the connection to MLS deformation. Suggested bullet:

  > **Conceptual lineage — Moving Least Squares.** Moving DLT is a projective generalisation of Schaefer et al.'s Moving Least Squares image deformation (SIGGRAPH 2006). MLS fits per-query-pixel affine, similarity, or rigid transforms to user handles weighted by $w_i = 1/|p_i - v|^{2\alpha}$; Moving DLT replaces the affine fit with a projective (DLT) fit and the inverse-power weight with a Gaussian weight $\exp(-\|x_* - x_i\|^2 / \sigma^2)$. Both methods share the core principle: a spatially-varying locally-optimal transform fit by position-dependent weighting of the same correspondence set. APAP's weight floor $\gamma$ has no MLS analogue (MLS requires at least one nearby handle for stability; APAP's floor ensures stability across the entire field).

Section: Algorithm (optional, minor)
- The current Algorithm section defines Moving DLT from first principles without mentioning the MLS analogy. No change is strictly necessary since the page is self-contained. If a future revision adds a `Compared with / derived from` subsection, noting the MLS → projective lift is appropriate context.

---

**Survey concept-page candidate flag.** MLS (2006) and ARAP/Igarashi (2005) are both image deformation primitives borrowing from rigid-body mechanics applied per-pixel or per-region. If a third deformation primitive paper is ingested (e.g., Beier-Neely 1992, TPS-Bookstein 1989, or a more recent neural deformation method), the 3+ references / 500+ words criterion for a `content/concepts/image-deformation-primitives.md` survey concept page would be met. Defer until a third deformation paper is ingested. No concept page should be authored now.

# Provenance

- Paper full text: `docs/papers/.cache/schaefer2006-mls.txt` (ACM SIGGRAPH 2006; 8 pages + appendices).
- Abstract: "We provide an image deformation method based on Moving Least Squares using various classes of linear functions including affine, similarity and rigid transformations… we provide simple closed-form solutions that yield fast deformations, which can be performed in real-time." — establishes the three-variant / closed-form / real-time claims.
- §1 Introduction: "Our paper builds primarily on a recent paper by Igarashi et al. [Igarashi et al. 2005]… our method creates deformations by solving a small linear system (2 × 2) at each point in a uniform grid… we can create very fast deformations of grids consisting of tens of thousands of vertices in real-time whereas Igarashi et al. report that their methods slows at 300 vertices." — establishes the ARAP comparison and the computational advantage.
- §2 Moving Least Squares Deformation: weight definition $w_i = 1/|p_i - v|^{2\alpha}$ (inline after eq. 1). Deformation function $f(v) = l_v(v)$. Weighted centroid decoupling $T = q^* - p^* M$. Reduced problem eq. (4): $\sum_i w_i |\hat{p}_i M - \hat{q}_i|^2$.
- §2.1 Affine: normal equations solution — $2 \times 2$ matrix inversion for M. Eq. (5): $f_a(v) = (v - p^*)(\sum_i \hat{p}_i^T w_i \hat{p}_i)^{-1}(\sum_j w_j \hat{p}_j^T \hat{q}_j) + q^*$. Precomputed weights $A_j$ (inline after eq. 5).
- §2.2 Similarity: $M^T M = \lambda^2 I$, parameterized by single column $M_1$ with $M_2 = M_1^\perp$. Closed form eq. (6) with $\mu_s = \sum_i w_i \hat{p}_i \hat{p}_i^T$. Deformation function $f_s(v) = \sum_i \hat{q}_i (A_i/\mu_s) + q^*$ with $A_i$ from eq. (7).
- §2.3 Rigid: $M^T M = I$. Theorem 2.1: rotation factor $R$ of the similarity minimizer $C = \lambda R$ also minimizes the rigid functional. Deformation eq. (8): $f_r(v) = |v - p^*| \cdot \tilde{f}_r(v) / |\tilde{f}_r(v)| + q^*$. Cannot precompute due to normalisation.
- §4 Implementation: grid approximation ($100 \times 100$ for $500 \times 500$ image), bilinear interpolation in quads. "This approximation technique produces deformations indistinguishable from the more expensive process of applying the deformation to every pixel."
- §5 Conclusions: fold-back limitation: "our method may suffer from fold-backs like most other space warping approaches. These situations occur when the sign of the Jacobian of $f$ changes." Topology limitation: "our warping technique also deforms the entire plane… without regard to the topology of the shape in the image."
- Table 1: Affine MLS 1.5 ms (7 points), Similarity 2.3 ms, Rigid 2.6 ms on 3 GHz machine with $100 \times 100$ grid.
- `docs/papers/index.yaml` notes stanza: "APAP transplants the moving-weights idea from MLS (Euclidean / similarity / affine) to the projective setting: per-pixel weighted DLT instead of per-pixel weighted least squares." — confirms the APAP conceptual lineage as understood by the atlas maintainer.
