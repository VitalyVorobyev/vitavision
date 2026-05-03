---
paper_id: igarashi2005-arap
title: "As-Rigid-As-Possible Shape Manipulation"
authors: ["T. Igarashi", "T. Moscovich", "J. F. Hughes"]
year: 2005
url: https://www.moscovich.net/papers/rigid2005.pdf
created: 2026-05-02
relevant_atlas_pages: [apap-image-stitching]
---

# Setting

**Problem class.** Interactive 2-D shape deformation under sparse, user-placed handle constraints. The user designates a set of mesh vertices as handles, drags them to new positions, and the system computes the positions of all remaining ("free") vertices in real time.

**Inputs.** A 2-D shape boundary representable as a simple closed polygon (rasterised bitmap or vector drawing). At runtime: xy-coordinates of constrained (handle) vertices $q$. The mesh is pre-computed at import time using a particle-based near-equilateral triangulation (100–300 vertices in the paper's implementation).

**Outputs.** xy-coordinates of free vertices $u$ minimising a quadratic distortion energy. The result is a closed-form, not iterative: every update is a matrix multiply or a pre-factored linear solve.

**Guarantees.** No mathematical guarantee of global rigidity preservation — the algorithm minimises a quadratic *approximation* to the true rigid-deviation measure. The paper proves in Appendix A that no single quadratic function of vertex positions can be minimised exactly by a rigid transform; the two-step decomposition is the constructive workaround.

# Core idea

The shape is decomposed into a triangle mesh. The algorithm seeks vertex positions $u$ such that every triangle deviates as little as possible from a rigid transform of its rest-shape configuration — hence "as-rigid-as-possible." Because true rigidity cannot be captured by a single quadratic (Appendix A), the solve is split into two sequential least-squares steps:

**Step 1 — scale-free (conformal) solve.** Minimise a quadratic error $E_1$ that penalises shearing and non-uniform scaling but freely allows rotation and uniform scaling. The error for each triangle is defined by embedding each vertex relative to its two neighbours using a local coordinate frame, then measuring the displacement of the third vertex from its "desired" location under the fitted similarity transform (eq. 3–4). This is quadratic in $u$, so minimising $E_1 = v'^T G v'$ (eq. 5) over the free-variable block yields:

$$G' u + B q = 0 \quad \Longrightarrow \quad u = -G'^{-1} B q$$

Because $G'^{-1} B$ is precomputed at handle-addition time, each interaction step is a single matrix–vector product over $q$.

**Step 2 — scale adjustment.** The step-1 result can inflate or deflate as handles move. Step 2 recovers scale by (a) rigidly fitting each rest-shape triangle to its step-1 counterpart (fitting by rotation and translation, then scaling to match side length — a 4×4 linear system per triangle, eq. 9–11), producing "fitted triangles," and (b) solving a second global quadratic $E_2 = v''^T H v'' + f v'' + c$ (eq. 12–16) that minimises edge-vector discrepancy between the final triangles and the fitted triangles. $H'$ is pre-LU-factorised; only $f$ changes per frame, so the per-frame cost is one triangular solve.

The two steps run sequentially: 1 → 2, not iterated. The result is an approximation to the true ARAP optimum; iterating the two steps until convergence would recover the solution found by later, more expensive solvers (Sorkine-Horn 2007 ARAP).

**Naming origin.** The authors explicitly cite Alexa et al. (SIGGRAPH 2000) "As-Rigid-As-Possible Shape Interpolation" as the direct predecessor for the phrase and the philosophy. The ARAP principle — choose a nominal rigid transform per cell, penalise deviation — becomes a template for the "as-X-as-possible" naming pattern reused in later work.

# Assumptions

1. (hard) The shape boundary is a simple closed polygon. The mesh is computed from this polygon; no holes or non-manifold structure.
2. (hard) Mesh connectivity is fixed once at import. Handles can be added or removed (triggering "compilation" — re-factorisation of $G'^{-1}B$ and $H'$), but the triangulation itself does not change.
3. (soft) Near-equilateral triangulation. The step-2 scale-adjustment algebra treats all triangles as comparable-sized contributors to $E_2$. Severely stretched triangles in the rest mesh introduce bias; the paper demonstrates robustness to moderate irregularity (Figure 18) but does not characterise extreme cases.
4. (soft) Small deformations per handle movement. Step 1 is scale-free but rotation-permitting; step 2 estimates scale from the step-1 result. Under very large, rapid handle displacements, step 1 can produce heavily scaled intermediates that mislead step 2's fitting (Figure 19 limitation case).
5. (hard) 2-D input. The paper attempts 3-D extension and reports failure: no quadratic error functions equivalent to the 2-D ones were found in 3-D. The ARAP approach for 3-D meshes requires a fundamentally different formulation (Sorkine-Horn 2007).
6. (soft) Mesh size ≤ ~200 vertices for real-time on 2005 hardware. Performance degrades noticeably above ~300 vertices on the test machine (Pentium III 1 GHz, Java 1.4; Table 1). On modern hardware the bound is much higher.

# Failure regime

- **Large extensional deformation.** When handles pull far apart, the step-1 scale-free solve inflates the mesh; step 2 corrects scale per triangle but cannot enforce global volume preservation. The paper identifies this as the main qualitative failure (Figure 19): free vertices translate parallel to the handle-to-handle axis rather than rotating around the body, yielding an implausible result compared with physically-based expectations.
- **Rotation-only manipulation with dense mesh.** Under pure rotation of a rigid sub-region, step 1 (scale-free) reconstructs the rotation accurately; step 2 has little to correct. Performance is good in this regime.
- **Very small mesh fields.** The step-2 fit (eq. 9) degenerates when two triangle vertices coincide in the intermediate result — occurs if step-1 contracts a triangle to a point. No guard is described in the paper.
- **Self-intersection (overlapping regions).** Depth assignment for overlapping mesh regions is unsolved (§5.1); the paper uses a static predefined order with ad-hoc dynamic correction (Figure 7). Results can be visually incorrect under extreme bending.
- **Non-planar or 3-D scenes.** Explicitly out of scope. The 2-D mesh assumption makes ARAP inapplicable to 3-D meshes without redesign.

# Numerical sensitivity

- **Sparsity of $G'$ and $H'$.** Both matrices are sparse with ~12 and ~6 non-zeros per column respectively (§4.1, §4.2.2), owing to the local support of triangle contributions. Sparse LU factorisation (Davis 2003 UMFPACK) is used; the factorisation is $O(m^{1.5})$ for a 2-D mesh of $m$ free vertices in practice.
- **Pre-computation vs per-frame cost.** Registration: $O(m^{1.5})$ LU factorisation of $H'$, $O(m)$ inversion of $F$ per triangle. Compilation (handle change): $O(m \cdot k)$ matrix multiply for $G'^{-1}B$ where $k$ is the handle count. Per-frame: $O(mk)$ for step 1, $O(m)$ for step 2 (Table 1: 0.06–0.16 ms step 1, 2.2–7.5 ms step 2 at 93–287 vertices).
- **Quadratic error metric conditioning.** $G'$ is symmetric positive semi-definite; conditioning degrades if handles are placed at collinear or nearly coincident vertices (reduces rank of the constrained block). No regularisation is described; the paper avoids degenerate handle placements in examples.
- **Step-2 fitting (eq. 9–10) is a 4×4 system.** The matrix $F$ is precomputed and inverted per triangle at registration; it depends only on the rest-shape geometry, not on handle positions. Ill-conditioning occurs if the rest-shape triangle is degenerate (zero area); the particle-based mesher targets near-equilateral triangles to avoid this.
- **Floating point.** Java double-precision throughout. No single-precision concern noted; the mesh coordinates and error functionals are well-scaled to image coordinates (hundreds of pixels), far from floating-point limits.

# Applicability

- Use when: interactive 2-D shape manipulation for drawing or cartoon animation is needed without skeleton or FFD setup. ARAP provides skeleton-free rigidity semantics with real-time performance.
- Use when: a multi-point input device (touchpad, two-finger gesture) is used to simultaneously move, rotate, and deform a shape. ARAP handles multiple simultaneous handle constraints naturally.
- Use when: a coarse mesh (< 200 vertices) is acceptable. The triangle-mesh representation is a deliberate simplification; finer meshes are supported but at higher latency.
- Don't use when: global volume or area preservation is required. ARAP does not preserve area under extensional deformation (§7, "volume preservation" future work).
- Don't use when: the deformation is large and physically accurate (e.g., contact, collision response). ARAP's quadratic approximation produces implausible results under large non-rigid deformation (Figure 19).
- Don't use when: the shape is 3-D. Use a 3-D ARAP variant (Sorkine-Horn 2007) instead.
- Don't use when: convergence to the true ARAP optimum is required. The two-step closed form is an approximation; iterating it converges to the true solution (as later noted in Sorkine-Horn 2007) but the paper uses a single pass for speed.
- Compared against:
  - **Space-warp methods (FFD, thin-plate splines, Twister)** — no skeleton/rig required in either case, but ARAP models internal rigidity of the shape, not of the ambient space; space-warp approaches do not distinguish object from background.
  - **Mass-spring models** — ARAP is closed-form and faster; mass-spring models are more physically expressive but slow to converge and parameter-sensitive.
  - **Sheffer-Kraevoy 2004** — similar goal, iterative (too slow for interactive use at the time).
  - **Sorkine et al. 2004 Laplacian surface editing** — ARAP is a variant; the key difference is that ARAP assigns error functionals to triangles (quadratic in vertex positions) rather than vertices, and adds a scale-preservation pass. The two formulations produce similar results for small deformations.
  - **Schaefer et al. 2006 Moving Least Squares (MLS)** — a sibling "local-fit" deformation primitive. MLS fits a local affine/rigid/similarity to each query point using weighted correspondences; ARAP fits a per-triangle rigid transform globally. MLS is a continuous, mesh-free field; ARAP is a piecewise-triangulated field. Both are cited by Zaragoza 2013 APAP as conceptual predecessors.

# Connections

- Builds on:
  - `alexa2000-arap` (Alexa et al. 2000, SIGGRAPH — "As-Rigid-As-Possible Shape Interpolation") — the direct predecessor for both the name and the triangle-based rigidity idea. Igarashi et al. adapt the "assembly" step from Alexa et al. (eq. 2.236 / §4.2.2 reference) and use the same SVD decomposition for the deformation gradient (§7 / eq. 17).
  - `sorkine2004-laplacian` (Sorkine et al. 2004 — Laplacian Surface Editing) — step 1 of ARAP is described as "the 2-D case of Laplacian editing" (§4.1). ARAP's overall structure (scale-free first pass, then scale adjustment) is motivated as an extension of Sorkine et al.'s method.
  - `sumner2004-transfer` (Sumner-Popovic 2004 — Deformation Transfer) and `yu2004-poisson` (Yu et al. 2004 — Mesh Editing with Poisson) — cited as performing the same "assembly" step as ARAP's step 2.
  - `shoemake1992-polar` (Shoemake-Duff 1992 — Matrix Animation and Polar Decomposition) — cited for the SVD decomposition of the affine transformation matrix $A = R_\gamma \cdot \text{scale}$ used in §7.
- Enables (downstream conceptual successors):
  - **schaefer2006-mls** (sibling, same year cluster) — Moving Least Squares independently solves the same "local-fit deformation" problem with a different formalism. Both ARAP and MLS are predecessors of APAP.
  - **zaragoza2013-apap** (APAP image stitching) — inherits the naming convention and the "as-X-as-possible" philosophy. APAP minimises deviation from a local projective transform per cell exactly as ARAP minimises deviation from a local rigid transform per triangle. The structural homage is explicit in the APAP paper title.
  - **sorkine2007-arap** (Sorkine-Horn 2007 — As-Rigid-As-Possible Surface Modeling, SGP) — iterates the two-step ARAP solve to convergence, replacing the single-pass approximation with a proper alternating optimisation. Establishes ARAP as a rigorous energy minimiser.
- Refutes / supersedes:
  - Space-warp deformation for shape editing in the regime where rigidity of the object (not the ambient space) matters. Directly argued in §1 and §2.

# Atlas update plan

## UPDATE: apap-image-stitching

Section: Remarks
- Add bullet: The "as-projective-as-possible" naming is a structural homage to Igarashi et al. 2005 ("as-rigid-as-possible"). Both papers share the same design philosophy: choose a nominal per-cell transform (rigid in ARAP, projective in APAP), fit it to handle/correspondence constraints, and permit per-cell deviation only to satisfy those constraints while minimising a global quadratic energy. The APAP paper's Moving DLT is the projective analogue of ARAP's triangle-wise rigid fitting; the weight floor $\gamma$ plays the same role as ARAP's global linear system — it propagates information from data-rich to data-poor regions.
- Add bullet: Schaefer et al. 2006 Moving Least Squares (MLS), also listed in `sources.references`, is a sibling "local-fit" primitive contemporaneous with ARAP. MLS fits a local affine/rigid/similarity transform at each *query point* using weighted correspondences from a set of control-point pairs; APAP's Moving DLT is a direct extension of MLS to the projective model class. ARAP (triangle mesh, per-cell rigid) and MLS (continuous field, per-query rigid/similarity) are thus two generative ancestors of APAP's per-cell projective field.

Section: References
- Add: T. Igarashi, T. Moscovich, J. F. Hughes. *As-Rigid-As-Possible Shape Manipulation.* ACM SIGGRAPH, 2005. DOI: [10.1145/1186822.1073323](https://doi.org/10.1145/1186822.1073323)

### Survey concept page flag

ARAP (Igarashi 2005), MLS (Schaefer 2006), and APAP (Zaragoza 2013) constitute a natural three-way survey family: all share the "as-X-as-possible" local-fit deformation primitive, all minimise per-cell deviation from a transform class, and all feed into the same lineage of spatially-varying warp algorithms used in image stitching and shape editing. A survey concept page ("as-x-as-possible-deformation" or similar) would meet the criterion (≥3 surveyed methods; the content — definition, energy formulation, per-cell fitting, comparison table — easily exceeds 800 words). **Prerequisite:** research notes for `schaefer2006-mls` and `zaragoza2013-apap` (primary source of `apap-image-stitching`) must both exist before the concept page is drafted. Currently `schaefer2006-mls.md` is absent; ingest it first.

# Provenance

- Paper full text: `docs/papers/.cache/igarashi2005-arap.txt` (ACM SIGGRAPH 2005, ~10 pages).
- Title and authors (title page): "As-Rigid-As-Possible Shape Manipulation" — Takeo Igarashi (Univ. Tokyo / PRESTO JST), Tomer Moscovich (Brown), John F. Hughes (Brown).
- Abstract (p.1): "minimizing the distortion of each triangle … two-step closed-form algorithm … first step finds an appropriate rotation … second step adjusts its scale … quadratic error metrics so that each minimization problem becomes a system of linear equations."
- §2 Related work (p.1–2): "Similar, we achieve as-rigid-as-possible manipulation by geometrically minimizing the distortion associated with each triangle in a mesh." Direct invocation of the phrase. Alexa et al. 2000 cited as the origin.
- §3 Overview (p.2): triangulation with 100–300 vertices; near-equilateral mesh; registration → compilation → manipulation pipeline.
- §4 Algorithm (p.3–5): step 1 — scale-free conformal solve (eq. 1–8, $G'u + Bq = 0$); step 2.1 — rigid fitting of each rest triangle to intermediate triangle (eq. 9–11, 4×4 system, $F^{-1}C$ per triangle); step 2.2 — final solve (eq. 12–16, $H'u + Dq + f_0 = 0$, pre-LU factorised $H'$).
- §4.3 Algorithm summary (p.5): explicit three-phase pseudo-code (Registration, Compilation, Manipulation), confirming the matrix operations and pre-computation structure.
- §5.2 Weights for rigidity control (p.6): "We currently use a weight of 10000 for the painted triangles and 1 for the others." Confirms that triangle weights enter $E_1$ and $E_2$ multiplicatively — a straightforward extension.
- §7 Limitations (p.7–8): linear nature of the solve produces implausible results for extensional deformation (Figure 19). SVD decomposition of affine matrix (eq. 17) sketched as a path toward true ARAP minimisation.
- §7 also: volume preservation and 3-D extension identified as open problems.
- Table 1 (p.6): per-step runtimes at 93/150/287 vertices — step 2 dominates (2.2 / 3.5 / 7.5 ms per-frame update).
- Appendix A (p.8–9): proof by contradiction that no quadratic function of vertex positions has exactly the congruent-triangle configurations as its minimisers.
- References (p.8): Alexa 2000, Sorkine 2004, Sumner-Popovic 2004, Yu 2004, Shoemake-Duff 1992 — all cited and mapped above.
