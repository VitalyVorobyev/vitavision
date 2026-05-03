---
paper_id: shu2009-topological
title: "A topological approach to finding grids in calibration patterns"
authors: ["C. Shu", "A. Brunton", "M. A. Fiala"]
year: 2009
url: https://people.scs.carleton.ca/~c_shu/Publications/find-grids-MVA2010.pdf
created: 2026-05-01
relevant_atlas_pages: [shu-topological-grid, laureano-topological-chessboard]
---

# Setting

**Problem class.** Grid-coordinate assignment for calibration patterns: given a grayscale image of a checkerboard and a set of detected corner positions, assign every corner an integer grid coordinate $(i, j)$ and reject corners that do not belong to the pattern. The method is explicitly positioned as a solution to the first stage of Zhang-style calibration — feature extraction and correspondence — a stage the authors observe has received far less attention than the second-stage numerical optimization.

**Inputs.**
- A grayscale image $I : \Omega \to \mathbb{R}$.
- A set of subpixel corner locations $\{n_k\} \subset \Omega$ produced by Harris corner detection with subpixel refinement (§2). Any corner detector that produces subpixel points on pattern intersections is compatible.
- The calibration pattern includes three circular orientation markers (one black, two white) used to fix the grid origin and x-axis direction after grid labelling (§5).

**Outputs.** A partial map $\Phi : \{n_k\} \to \mathbb{Z}^2$ assigning integer pattern coordinates to corners that lie on the pattern grid. Corners outside the pattern — from the scene background, image noise, or spurious detections — are rejected by topological and geometric filtering. The output feeds directly into Zhang's calibration algorithm.

**Guarantees.** No analytic correctness guarantee is given. Detection success depends on whether Delaunay triangulation edges align with tile diagonals, which holds under the Delaunay empty-circumcircle property for all tiles except at extreme grazing angles (§2.1). All successfully matched frames in the paper's experiments (Table 1) contain enough correspondences for Zhang's homography estimation (minimum four).

---

# Core idea

The key insight is that the Delaunay triangulation of a chessboard corner set has a strong topological property: under any projective image of the pattern (within a practical angle range), each Delaunay triangle has exactly one edge-adjacent triangle with the same interior colour. This makes the pairing unambiguous without any geometric fitting.

The pipeline has five stages (§1, §2–§5):

1. **Harris detection** — corner features $\{n_k\}$ are extracted using Harris's gradient-correlation matrix method with subpixel refinement (§2). Harris is chosen because the checkerboard gives "strong corners."

2. **Delaunay triangulation** — $T = \operatorname{Del}(\{n_k\})$ connects the corners via Watson's algorithm (§2.1). Under the empty-circumcircle property, each projected tile $ABCD$ produces two triangles by diagonalising: triangle $(A,B,C)$ has an empty circumcircle (point $D$ lies outside it), and vice versa for $(A,C,D)$. Therefore Delaunay edges run along tile diagonals rather than between corners of different tiles, except at extreme viewing angles ($\approx 10^\circ$ from pattern plane; §2.1, Fig. 4).

3. **Same-colour merge** — for each triangle $t$, its interior mean intensity $\bar{c}(t)$ is computed over pixels at a small distance from the triangle edges (to avoid boundary ambiguity from radial distortion; §3). Among the three edge-adjacent triangles of $t$, exactly one satisfies $|\bar{c}(t) - \bar{c}(t')| \leq \tau$. That pair is merged into a quadrilateral representing one black or white tile (§3, Fig. 5).

4. **Topological and geometric filtering** — spurious quads from background corners or interior noise are pruned (§4). Topological rule: a quad is illegal if two or more of its four nodes carry edge-degree $> 4$ in the quad mesh (interior nodes of a proper grid have degree exactly 4; boundary nodes degree 2 or 3). Geometric rule: a quad is pruned if the ratio of either pair of opposite edge lengths exceeds 10 (§4). The paper explicitly prioritises topological tests over geometric tests: "topological tests are threshold free" and more reliable (§4). A final pass removes small isolated components.

5. **Coordinate propagation (flood fill)** — starting from an arbitrary seed quad, integer coordinates are assigned to its four nodes, then propagated to all adjacent quads by a BFS/flood-fill. The propagation rule uses the shared edge $(n_s, n_e)$ to fix the orientation: find node index $i$ of $n_s$ in the neighbour quad and assign coordinates cyclically $(n_s.x, n_s.y)$, $(n_s.x+1, n_s.y)$, $(n_s.x+1, n_s.y+1)$, $(n_s.x, n_s.y+1)$ to slots $i, i+1, i+2, i+3$ (mod 4) (§5, Fig. 8). The three orientation markers are then used to transform the relative coordinates into the pattern reference frame.

The overall complexity is $O(n \log n)$ for Delaunay triangulation and $O(n)$ for every subsequent stage, where $n$ is the number of detected corners (§5, §7).

---

# Assumptions

1. (hard) Delaunay triangulation edges coincide with tile diagonals. The empty-circumcircle property guarantees this for reasonable projective distortions. The paper shows it fails at viewing angles $\approx 10^\circ$ from the pattern plane (§2.1, Fig. 4). At such angles the upstream corner detector also fails, so the failure is self-consistent.

2. (hard) Each Delaunay triangle has exactly one same-colour edge-adjacent neighbour. This is a structural property of the regular chessboard pattern (§3). It fails if a spurious interior corner splits a tile's triangle into unequal parts with ambiguous colour.

3. (soft) Interior nodes of the legal quad mesh have edge-degree $\leq 4$. Degree $> 4$ indicates a spurious quad from background or noise. Background clutter that happens to generate a degree-4 structure would survive topological filtering, but the paper notes "the chance of an arbitrary scene that contains feature points with regular grid topology is not very high" (§4).

4. (soft) The aspect-ratio bound $r_{\max} = 10$ is conservative. The paper states "it has to be under extreme low viewing angles that a square has a large distortion" (§4). This threshold can theoretically pass a distorted non-grid quad at moderate oblique angles if it happens to have symmetric edge ratios; in practice, such cases are also caught by topological filtering.

5. (soft) Harris corner detection produces all true chessboard corners. Missed corners leave holes in the Delaunay triangulation; the merge step then fails to pair affected triangles, reducing the located quad count. The paper reports some frames fail with rates as low as 13% (Table 1, Telemax Webcam), often attributable to missing corners under poor lighting.

6. (hard) The pattern includes exactly three orientation-marker circles (one black, two white) in specific positions on the checkerboard (§5). Without them, the integer coordinate labelling is correct up to a 90°/180° rotation ambiguity. The paper defines the origin as the horizontally centred white circle and the x-axis toward the other white circle; the second white circle is redundant and used for double-checking.

7. (soft) Watson's algorithm for Delaunay triangulation is used in the implementation. Watson's worst case is $O(n^2)$ though near-linear in practice. The paper notes that the Guibas et al. $O(n \log n)$ algorithm is available but chooses Watson for implementation simplicity (§2.1).

---

# Failure regime

- **Extreme oblique viewing angle ($\lesssim 10^\circ$ from pattern plane).** The circumcircle of a tile diagonal triangle $(A,B,C)$ is no longer empty when the pattern is seen at a very shallow angle — the foreshortened point $D$ can fall inside the circumcircle, causing the Delaunay triangulation to choose the other diagonal. This produces triangles whose three corners belong to different tiles, breaking the same-colour merge step. The paper shows Fig. 4 at $10^\circ$ and states "corner finding is not reliable either" at this extreme (§2.1). The practical angle range demonstrated is 0°–60° from the pattern normal (§6, Fig. 10).

- **Background corners at degree-4-like topology.** Topological filtering removes quads with two nodes of degree $> 4$, but isolated background structures with regular topology can survive. The geometric filter (aspect ratio $> 10$) provides a second line of defence. Sequences with many background features show lower success rates in Table 1.

- **Noisy interior corner / misdetection inside a tile.** A spurious corner inside a white or black tile causes two false quads (Fig. 7a). Both have a node of degree 5 from the spurious point. Topological filtering removes them (Fig. 7b). This is the explicit example given in §4.

- **Partial pattern occlusion.** The quad mesh simply has fewer connected quads; the flood-fill labels only what survives filtering. The paper explicitly contrasts this with OpenCV's grid finder, which "fails in this situation" (§6, Fig. 9). Partial occlusion is thus a soft failure: fewer correspondences, but no incorrect ones.

- **Low contrast / poor lighting.** Harris detection degrades; fewer corners are found; the Delaunay mesh is incomplete. Table 1 shows sequences with success rates as low as 13–19% (Telemax Webcam, Intel EasyCam C, Wireless/IPro sequences) under poor conditions.

- **Small isolated components.** Quads surviving topological and geometric filtering but forming a small disconnected component are discarded (§4, §5). This catches accidental pattern-like structures in the background without requiring a minimum size threshold — a minimum count criterion suffices.

---

# Numerical sensitivity

- **Harris corner threshold.** The paper uses Harris corner detection "with subpixel accuracy" (§2) but does not characterise sensitivity to the response threshold. Threshold affects the number of detected corners $n$ and hence Delaunay triangulation density; under-thresholding admits background corners; over-thresholding misses true corners.

- **Same-colour tolerance $\tau$.** The triangle interior mean test $|\bar{c}(t) - \bar{c}(t')| \leq \tau$ uses a fixed tolerance. The paper does not specify its numerical value, stating only that "in practice, we check for triangles with similar average colors" (§3). The robustness of this test is improved by ignoring pixels near triangle edges to avoid boundary confusion from radial distortion.

- **Edge-distance margin $\delta$.** The interior colour average excludes pixels at distance $< \delta$ from the triangle edge (§3). No value is given; it is described as "a small distance." Sensitivity: too small and edge pixels corrupt the colour test; too large and the interior sample becomes unstable for small triangles.

- **Aspect-ratio threshold $r_{\max} = 10$.** Explicitly described as "conservative" (§4); the paper reports "experimental experiences" validate this choice. At the 10° viewing angle shown in Fig. 4, the Delaunay structure breaks before the aspect ratio would reach 10.

- **Watson vs Guibas-Knuth-Sharir Delaunay.** Watson's algorithm (§2.1, [12]) has $O(n^2)$ worst case vs $O(n \log n)$ for Guibas et al. [11]. For the corner counts in Table 2 (35–63 corners per frame), this is irrelevant; for dense high-resolution calibration patterns with hundreds of corners the choice matters. The implemented timing on a Pentium III desktop: Delaunay triangulation averages 1.6 ms per frame (Table 3), by far the fastest stage.

- **Processing time breakdown.** Table 3 (Pentium III, 320–640 px): Harris = 29.5 ms, triangle merging = 15.9 ms, topological filtering = 19.2 ms, ordering quads = 16.9 ms, total = 83.1 ms (≈12 fps). Harris dominates at 35% of total time. Delaunay at 1.6 ms is negligible.

---

# Applicability

- Use when: calibrating cameras with Zhang's method (or any homography-based method) requiring grid correspondences, including partial-pattern scenarios where OpenCV's grid finder fails.
- Use when: radial lens distortion causes curved chessboard edges that defeat edge-fitting and line-intersection approaches. The topological pipeline operates in image space without any straightness assumption.
- Use when: multiple cameras at a range of poses (0°–60° from pattern normal) must be calibrated from a single sequence.
- Use when: real-time performance is required on modest hardware — the $O(n)$ post-Delaunay stages are fast; the bottleneck is Harris corner detection.
- Don't use when: viewing angle is $\lesssim 10°$ from the pattern plane. Both corner detection and Delaunay topology degrade simultaneously.
- Don't use when: the pattern grid dimensions are completely unknown — the method propagates coordinates from a seed but does not auto-discover grid size; the three orientation circles must be present to fix the reference frame.
- Don't use when: a per-pixel corner detector (e.g. ChESS, FAST-based x-corner) is desired without grid-structure inference. Shu et al. operate at the grid level, not the per-pixel level.
- Compared against:
  - **OpenCV cvFindChessBoardCornerGuesses** — full-pattern-presence required; fails under occlusion and severe distortion. Shu et al. explicitly outperform it on partial-occlusion scenarios (§6, Fig. 9).
  - **Edge-fit + line-intersection approaches** — fail under radial distortion because edges are curved. Shu et al. use topology which is distortion-invariant.
  - **Attributed relational graph matching (Soh et al. [8])** — earlier approach to grid ordering; Shu et al. cite it but do not give a direct quantitative comparison.
  - **Laureano et al. 2013 (laureano-topological-chessboard)** — a later method that shares the Delaunay-triangulation + topological-filtering structure but operates on a per-pixel x-corner detector rather than Harris, adds Bradley-Roth adaptive binarization for triangle colouring, uses a different topological filter rule (triangle-level: ≥1 and ≤2 same-colour edge-neighbours; iterative to fixpoint), and adds Chen-Zhang Hessian subpixel refinement. Shu (2009) hosts the comparison because it is the earlier paper. Both research notes are required before authoring comparison content.

---

# Connections

- Builds on:
  - `harris1988-corner` — Harris corner detector used as the detection front-end (§2, [10]).
  - Watson (1981) [12] — Delaunay triangulation implementation. Not in `docs/papers/index.yaml`.
  - Tell and Carlsson ECCV 2002 [9] — topological approach to wide-baseline matching; cited as inspiration for combining appearance and topology. Not in `docs/papers/index.yaml`.
  - Fiala and Shu 2008 [7] — self-identifying calibration pattern context. Not in `docs/papers/index.yaml`.
- Enables (in atlas):
  - `shu-topological-grid` — primary source.
  - `laureano-topological-chessboard` — cites this paper in `sources.references`; Laureano et al. 2013 explicitly extend the Shu et al. pipeline with a per-pixel detector and a refined topological filter.
- Refutes / supersedes:
  - **OpenCV cvFindChessBoardCornerGuesses** (not in atlas as a separate page) — requires full pattern visibility; Shu et al. handle partial occlusion.
  - **Edge-fit + line-intersection approaches** — assume straight edges; Shu et al. bypass the straightness assumption.

---

# Atlas update plan

## UPDATE: shu-topological-grid

The existing page is accurate and well-grounded. The pipeline structure, definitions (same-colour merge, topological legality, geometric legality, coordinate propagation), procedure, Rust implementation sketch, and Remarks bullets all faithfully match the paper. The following targeted additions and corrections are warranted.

### Section: Algorithm — Delaunay justification

**Add or clarify:** The page states "The detector fails at extreme viewing angles (roughly ≤10° from the pattern plane) where Delaunay triangulation crosses tile boundaries." This matches the paper's Fig. 4 and §2.1 text. The angle bound in the Remarks should be attributed explicitly to the paper's Fig. 4 caption: "viewing angle is about 10° from the pattern plane" — the paper does not derive a closed-form bound; the 10° is an empirical observation. A parenthetical `(paper §2.1, Fig. 4 — empirical, not a derived bound)` would prevent future readers from over-interpreting the threshold.

**Add:** The paper explicitly notes that the angle regime where Delaunay fails is also the regime where Harris corner detection is unreliable (§2.1: "the corner finding is not reliable either, and therefore these images should not be used for calibration"). The page's current Remarks bullet does not connect these two failure modes. Adding "at such angles the upstream corner detector is also unreliable" makes the failure self-consistent rather than appearing as a distinct algorithmic limitation.

### Section: Algorithm — topological filter priority

**Add bullet to Remarks:** The paper makes a design principle explicit: "Whenever possible, we perform topological tests ahead of geometric tests, because topological tests are noise free. Determining topological information from geometric and appearance information always involves the use of thresholds which are difficult to choose. Different lighting conditions and different cameras may require different thresholds" (§4). This motivates the ordering (degree test before aspect-ratio test) and is absent from the page. It is worth surfacing as a design rationale, not just a pipeline detail.

### Section: Algorithm — same-colour merge numerical detail

**Add to the :::definition[Same-colour merge]::** The paper notes the triangle interior is sampled excluding "pixels with a small distance from the triangle edges" to avoid boundary ambiguity from radial distortion (§3). The page already implies this ("averaged over pixels at a small distance from the triangle edges" in the Algorithm section intro), but the :::definition block's formula does not mention it. A clarifying sentence — "pixels within a margin $\delta$ of each edge are excluded; $\delta$ is not specified by the paper" — makes the approximation visible.

### Section: Remarks — partial occlusion

**Add bullet:** The paper demonstrates explicit partial-occlusion handling (§6, Fig. 9), explicitly contrasting with OpenCV: "Note that our method works when the pattern is partially occluded in the images. The OpenCV grid finder fails in this situation. In fact, it fails to locate the grids in every frame in Fig. 9 due to either pattern occlusion or missing corners." The page's current Remarks do not mention partial occlusion as a capability. This is the most practically significant differentiator versus OpenCV.

### Section: Remarks — Watson's Delaunay vs O(n log n)

**Add footnote or bullet:** The paper uses Watson's algorithm (O(n²) worst case, near-linear in practice) for implementation simplicity, not Guibas et al. (O(n log n)). Table 3 shows Delaunay averages 1.6 ms per frame vs Harris at 29.5 ms — Delaunay is not the bottleneck. For large patterns (>200 corners), replacing Watson with an O(n log n) implementation is straightforward. Worth a single Remarks bullet.

### Section: Remarks — processing time

**Add bullet:** Table 3 gives timing on a Pentium III: Harris = 29.5 ms, Delaunay = 1.6 ms, triangle merging = 15.9 ms, topological filtering = 19.2 ms, ordering = 16.9 ms, total = 83.1 ms. Harris is the dominant cost (35%); all subsequent stages are sub-Harris. On modern hardware this is real-time at resolutions well above the 320–640 px used in the paper.

### Section: Remarks — orientation markers

**Add or clarify:** The three circular markers (one black, two white) are integral to the pattern design and required for reference-frame alignment (§5). The page mentions them in step 10 of the Procedure but does not explain that the second white circle is redundant and used for correctness verification: "we need only to find the black circle and the white circle that lies on the same grid line. The second white circle is redundant but we use it for double checking the correctness of the labeling" (§5). This is worth noting in Remarks for anyone adapting the pattern.

### Section: Remarks — Delaunay not projective-invariant

**Strengthen existing bullet:** The page correctly notes "Delaunay triangulation is not projective-invariant in general." The paper's conclusion (§7) adds that finding the theoretical angle bound at which Delaunay triangulation is invariant under projective transformation is an open problem: "We are currently investigating this problem." The ~60° demonstrated range (Fig. 10) is empirical, not a guarantee. Flagging this explicitly prevents the bullet from being read as a theoretical bound.

### No changes needed

- The same-colour merge formula, topological legality definition ($< 2$ nodes with degree $> 4$), geometric legality ($r_{\max} = 10$), coordinate propagation equations, Procedure steps 1–10, Mermaid flowchart, and Rust implementation all correctly reflect the paper.
- The flood-fill complexity ($O(|Q|)$, each quad visited once) is correctly stated.

---

## UPDATE: laureano-topological-chessboard

This page lists `shu2009-topological` in `sources.references`. The page is accurate about the Shu-versus-Laureano relationship. No immediate content updates are required. The following is recorded for a future authoring pass:

### Section: Remarks — comparison with Shu et al.

The page should carry a cross-reference bullet pointing to the shu-topological-grid comparison anchor once that comparison is authored. Per comparison policy (docs/README.md §4): Shu (2009) is older, so shu-topological-grid hosts the `## When to choose Shu et al. over Laureano et al.` section. Laureano-topological-chessboard carries only a single Remarks bullet pointing to that anchor. **Precondition:** the `laureano2013-topological` research note must be ingested before comparison content can be authored (agentic discipline rule, docs/README.md §4, "Both research notes required"). The `laureano2013-topological` note does not yet exist in `docs/research/notes/`.

Key technical contrasts to record when that note is written:
- Shu: Harris corner detector front-end (global, not per-pixel for x-corners). Laureano: per-pixel x-corner alternation-count classifier (FAST-ring based), adapted to chessboard topology.
- Shu: triangle interior mean colour comparison for same-colour merge. Laureano: Bradley-Roth adaptive binarization of the full image, then direct triangle label lookup.
- Shu: topological filter — quads with two degree->4 nodes are pruned. Laureano: triangle-level filter — iterative to fixpoint; triangles without ≥1 and ≤2 same-colour edge-neighbours are pruned.
- Shu: no subpixel refinement beyond Harris's own. Laureano: Chen-Zhang Hessian saddle refinement at surviving corners.
- Shu: full-pattern orientation markers (three circles) required. Laureano: no special markers; partial pattern support built into the filter-to-fixpoint logic.

---

# Provenance

All citations are to the paper text in `docs/papers/.cache/shu2009-topological.txt`.

- **Abstract (p. 949):** "Corner features located by a corner detector are connected using Delaunay triangulation. Pairs of neighboring triangles are combined into quadrilaterals, which are then topologically filtered and ordered." — retained verbatim for the Core idea section because the condensed structure is the method's canonical statement.
- **§2 (p. 950):** "Here, we use Harris' corner detector [10], which is based on thresholding on the eigenvalues of a gradient correlation matrix at each pixel. The checkerboard pattern gives strong corners." — justification for Harris choice.
- **§2.1 (p. 950–951):** Delaunay empty-circumcircle argument for tile diagonals: "The circumcircle of the triangle (A, B, C) does not contain other feature points. In fact, with the exception of point D, other feature points are quite far away from the circumcircle." — Fig. 3 and surrounding text.
- **§2.1 (p. 951):** Failure angle: "Only in extreme cases, when the camera is pointed to the calibration pattern at a very small angle, the Delaunay triangulation may make triangles with their three corners belong to different tiles. In these cases, the corner finding is not reliable either, and therefore these images should not be used for calibration. Figure 4 shows an example of this case where the viewing angle is about 10° from the pattern plane."
- **§2.1 (p. 951):** Watson's algorithm: "We use an early algorithm by Watson [12]. Although its worst case performance is O(n²), in practice it runs close to linear time. We choose Watson's algorithm because its implementation is simple."
- **§3 (p. 951–952):** Same-colour merge rule and boundary exclusion: "Due to distortions, the pixels covered by a triangle may not be the same color. Since this situation always happens near the boundary of the triangle, we can simply ignore pixels with a small distance from the triangle edges."
- **§4 (p. 952–953):** Topological filter rule: "a proper node in a regular grid mesh has edge-degree of 2, 3, or 4. If a node has edge-degree more than 4, it is an illegal node. A quadrilateral that has two illegal nodes is removed from the mesh."
- **§4 (p. 952):** Design rationale: "Whenever possible, we perform topological tests ahead of geometric tests, because topological tests are noise free. Determining topological information from geometric and appearance information always involves the use of thresholds which are difficult to choose. Different lighting conditions and different cameras may require different thresholds."
- **§4 (p. 953):** Geometric filter: "quads that significantly deviate from parallelogram are pruned. In our implementation, we examine the lengths of the opposing edges. If the ratio between the longer edge and the shorter edge is greater than 10, we prune away the quad. Our experimental experiences show this is a conservative threshold."
- **§5 (p. 953):** Coordinate propagation: explicit N[i].x = ns.x, N[(i+1)mod4].x = ns.x+1, etc. equations. Flood-fill complexity: "Since every quad is visited exactly once, the algorithm is O(n), where n is the number of the quads which is linear to the number of corners."
- **§5 (p. 253):** Orientation markers: "we need only to find the black circle and the white circle that lies on the same grid line. The second white circle is redundant but we use it for double checking the correctness of the labeling."
- **§6 (p. 954):** Partial-occlusion advantage over OpenCV: "Note that our method works when the pattern is partially occluded in the images. The OpenCV grid finder fails in this situation."
- **§6 (p. 354):** Angle range: "Figure 10 shows the results of grid finding under a variety of camera orientations. The camera is moved between 0° and 60° relative to the normal of the pattern plane."
- **Table 1 (p. 954):** Detection rates across 28 sequences / 12 cameras — range from 13% (Telemax Webcam) to 100% (Color Dragonfly B, Greyscale Dragonfly B, Intel EasyCam A). Majority of sequences >75%.
- **Table 3 (p. 437 in text flow / p. 956 in paper):** Processing time per stage: Harris 29.5 ms, Delaunay 1.6 ms, triangle merging 15.9 ms, topological filtering 19.2 ms, ordering quads 16.9 ms, total 83.1 ms.
- **§7 Conclusions (p. 956):** Open problem: "Although Delaunay triangulation is not projective invariant in general, in practice it is not a significant limitation, as our experiments have shown. However, finding out the theoretical angle bound at which Delaunay triangulation is invariant under projective triangulation is an interesting problem. We are currently investigating this problem."
