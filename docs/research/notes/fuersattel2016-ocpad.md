---
paper_id: fuersattel2016-ocpad
title: "OCPAD — Occluded Checkerboard Pattern Detector"
authors: ["P. Fürsattel", "S. Dotenco", "S. Placht", "M. Balda", "A. Maier", "C. Riess"]
year: 2016
url: https://www5.informatik.uni-erlangen.de/Forschung/Publikationen/2016/Fuersattel16-OCP.pdf
created: 2026-05-01
relevant_atlas_pages: [ocpad]
---

# Setting

**Problem class.** Detection of a checkerboard pattern on a graph that is **partially occluded** or **extends beyond the field of view**. The paper explicitly notes (§1) that occlusion and out-of-frame can be "treated identically" from the algorithm's perspective — both reduce the visible saddle count below $rc$ in ways that defeat ROCHADE's strict full-pattern check.

The downstream motivation is **lens-distortion estimation at image borders**. Full-pattern detectors force the user to keep the entire pattern centred in the frame; this leaves the outer image regions (where lens distortion is largest) without correspondences. Allowing partial patterns lets correspondences populate the outer regions, reducing radial reprojection error there by up to 50% in the paper's experiments (§5.3, Figure 6).

**Inputs.** A *candidate graph* $G_d = (V_d, E_d)$ from an upstream corner-graph builder (in the paper's reference implementation, ROCHADE's stages 1–4: gradient, threshold, conditional dilation, centreline thinning, saddle extraction). A *model graph* $G_m = (V_m, E_m)$ specifying the checkerboard's known $r \times c$ topology. The upstream detector's subpixel-window size $w$ — also doubles as the lower bound on inter-corner distance.

**Outputs.** A partial, non-injective, non-surjective mapping $M : V_d \to V_m$ covering as many candidate vertices as possible while tolerating missing or extra vertices and edges, or $\bot$ if the candidate is unrecoverable.

**Guarantees.** No mathematical guarantee on the size of $M$. The binary-search driver is *not* a complete search — it commits to a sequence of subgraph sizes and may miss a larger valid subgraph that the search did not visit. The paper acknowledges (§4.1, last paragraph): "the binary search may fail before the full number of nodes is found" — the BFS region-growing step is the safety net for this case.

The matching is **error-tolerant** in three senses, all explicit in §4.1:
1. Missing vertices (occlusion / out-of-frame).
2. Extra vertices (background clutter that survived preprocessing).
3. Extra edges (e.g. a spurious diagonal in a quad — the paper's Figure 3 example).

# Core idea

Treat checkerboard detection as **largest-common-subgraph matching** between a candidate graph and a checkerboard model graph. The candidate graph is whatever the upstream stage produced — a noisy, possibly disconnected graph that may have spurious edges and missing vertices. The model graph is exact — an $r \times c$ grid with degree-2/3/4 vertices at corners/edges/interiors of the rectangular layout.

VF2 (Cordella 2004) is the inner exact-match engine. It is *not* error-tolerant on its own — given the candidate of Figure 3 with one spurious diagonal edge, VF2 returns no match for the full graph. Error tolerance is achieved by **searching over subgraph sizes**: start by trying to match the full $G_d$ to $G_m$ (which fails on any garbage candidate); on failure, halve and try a smaller subgraph; on success, increase the subgraph size by half the previous step. Binary search converges to the largest $N_i$ for which an exact subgraph of $G_d$ matches $G_m$. The subgraph is selected by **proximity to an anchor vertex** chosen for high quad density.

The five-stage cascade (§4):

1. **Size pre-filter:** reject if $|V_d| < 0.5\,|V_m|$. Below 50%, calibration becomes unreliable regardless.
2. **Spatial consistency:** every edge length $\geq w$, and $\sigma(|E_d|) < \mu(|E_d|)$. Cheap rejection of garbage before the costly matcher.
3. **Quad filter:** retain only vertices on some 4-cycle. Removes triangles (background clutter that pretends to be checkerboard structure but lacks the four-quadrant alternation) and isolated edges.
4. **Largest component:** keep only the largest connected component of the quad-filtered graph. Removes ambiguous secondary components.
5. **Subgraph match:** the binary-search driver of Algorithm 1, followed by BFS region-growing.

**Anchor selection** (§4.1 second paragraph): the anchor is the vertex of maximum **quad density** — the count of $\mathrm{BFS}_3$ neighbours that lie on at least one 4-cycle. The paper considered alternatives (centre-of-mass vertex, minimum-shortest-distance-sum vertex) and found quad-density empirically best, "effectively reducing the influence of non-checkerboard vertices."

**Binary-search update rule** (Algorithm 1):

$$N_i = \operatorname{round}\!\left(N_{i-1} \pm 2^{-i}\,N\right),$$

with sign $+$ on previous-iteration success, $-$ on failure. Termination: $N_i \geq N_{i-1}$ (search has converged) or step size = 0.

**BFS region growing** runs after binary-search convergence: for each unassigned neighbour of a matched vertex, add it to the candidate, re-run VF2, commit only on success. This handles cases where the binary search prematurely converged short of the maximum recoverable subgraph.

# Assumptions

1. (hard) An upstream corner-graph builder has produced a candidate graph $G_d$. OCPAD does *not* detect corners — it consumes a graph and emits a mapping. The paper's reference implementation chains it after ROCHADE's stages 1–4 (after Figure 1e of the OCPAD paper).
2. (hard) Pattern dimensions $(r, c)$ are known in advance. OCPAD does not auto-discover the grid size; the model graph $G_m$ encodes it.
3. (hard) The visible portion of the pattern contains at least 50% of the model's vertices. The pre-filter rejects below this; the paper's argument is that calibration is unreliable on smaller fragments.
4. (soft) The candidate graph is connected enough that one connected component contains most of the visible pattern. After the quad filter, OCPAD takes only the largest component — patterns split across multiple components by graph-builder errors lose the smaller halves.
5. (soft) The anchor's quad-density-3 region overlaps the true pattern. If the candidate graph contains background quads that happen to score higher quad density than any pattern region, the anchor is misplaced and the binary search wastes iterations. The paper does not characterise how often this happens; presumably rare on indoor calibration imagery.
6. (soft) VF2 finds the exact subgraph match if one exists. VF2 is well-established and complete on planar graphs of the size encountered (typical $r c \leq 200$). Larger patterns would push VF2's worst-case cost.
7. (soft) The 50% threshold, the quad-density depth-3 BFS, and the binary-search starting point $N_0 = N$ are all empirically chosen constants. No sensitivity analysis is provided.

# Failure regime

- **Tiny visible fragments (< 50% of model).** Hard rejection at step 1. The paper does not provide a way to recover patterns with very few visible corners — the user must capture more.
- **Strongly fragmented candidate graph.** When the quad filter and largest-component selection drop a substantial fraction of true corners, OCPAD outputs a mapping over the surviving fragment only. The paper's Figure 4d (heavily distorted GoPro example) detects 25 of 26 visible corners; in worse fragmentation, the surviving fragment is smaller.
- **Wrongly merged saddle points.** Figure 4a in the paper shows two checkerboard X-junctions merged into one vertex during preprocessing. ROCHADE rejects (wrong vertex count); OCPAD detects 42 of 54 corners by treating the merged vertex as an extra to be matched around.
- **Anchor placed in a non-pattern region.** If background quads dominate the quad-density score, the binary search starts in the wrong place and may fail to find the pattern. The paper does not characterise this; would manifest as a low-corner-count mapping.
- **Multiple disconnected candidate components, each containing a real fragment.** OCPAD takes only the largest. If the pattern is split into two roughly equal halves (e.g. by a thin foreground occlusion), the smaller half is silently dropped.
- **Spurious extra edge through valid quad.** Example: Figure 3 shows a diagonal added to a $3 \times 5$ subgraph. VF2 fails on the full graph; binary search excludes the diagonal-bearing vertex at smaller $N_i$ and finds a valid match. This works if the diagonal is at the edge of the candidate; deeply embedded spurious edges may take more iterations.
- **Symmetric model graphs.** A square $r \times r$ checkerboard has 4-fold symmetry — multiple valid mappings exist. The paper acknowledges (§4 step 4): "matching this subgraph to the model graph may also lead to non-unique solutions" — but argues this does not matter because the calibration solver only needs *a* valid topology mapping, not *the* one.
- **Pattern at extreme scale relative to lens distortion.** Very small visible pattern at the edge of a fisheye lens: the spatial-consistency check ($\sigma(|E_d|) < \mu(|E_d|)$) can fail if the per-edge distortion variation exceeds the mean edge length, dropping the candidate before matching.

# Numerical sensitivity

- **VF2 worst-case cost.** Subgraph isomorphism is NP-hard in general. VF2 is heuristic but on planar graphs of moderate size (say $r c \leq 200$) it runs in practice in milliseconds per call. The binary search invokes VF2 $O(\log N)$ times when checkerboard graphs are strongly connected (typical case); fragmented inputs degrade to linear region-growing.
- **Anchor BFS depth = 3.** Empirical choice. Smaller depths concentrate the anchor on highly local quad density (susceptible to single-quad noise); larger depths smear the score and fail to discriminate between centre and edge of the pattern. The paper does not justify the value of 3 beyond "works best in practice."
- **Binary search step size $2^{-i} N$.** The factor $N$ in the step size makes the schedule scale-aware; for a $10 \times 10$ pattern the first step is $\pm 50$ vertices, for a $5 \times 5$ pattern $\pm 12$. The schedule converges in $\log_2 N + O(1)$ iterations once the search basin is hit.
- **Round-to-nearest in the update.** Subtle: the `round()` ensures integer subgraph sizes but introduces a small bias that can stall the search at $N_i = N_{i-1}$ for non-power-of-2 $N$. The termination condition $N_i \geq N_{i-1}$ on success catches this.
- **Spatial-consistency thresholds.** The minimum edge length is set to $w$ (the upstream subpixel-window size, typically 5 px) — coupling between the upstream detector and OCPAD's pre-filter. The $\sigma < \mu$ check is dimensionless and self-calibrating to the pattern's apparent size. No tuning required.
- **Largest-component arbitrariness.** Ties in component size are broken implicitly; the paper does not specify. With the quad-filter pre-stage, ties are rare in practice.
- **VF2 implementation choice.** OCPAD is **VF2-agnostic at the algorithmic level**. Any exact subgraph-isomorphism routine satisfying the same interface can replace VF2; the binary-search driver and region-growing layer are independent. This is useful because newer subgraph matchers (e.g. RI, LAD) may be faster on specific graph classes — but the paper does not benchmark alternatives.

# Applicability

- Use when: the calibration setup forces partial-pattern visibility — wide-angle lenses, large patterns at close range, structured-light projection where parts fall off the surface, multi-camera setups where one camera necessarily sees only a fragment.
- Use when: lens-distortion estimation at image borders is critical. The paper's headline calibration result (§5.3) is up-to-50% reduction in radial reprojection error in the outer image regions when partial-pattern correspondences populate them.
- Use when: ROCHADE works for full-pattern detection in your pipeline. OCPAD plugs in as a drop-in replacement for ROCHADE's step 7, inheriting the rest of ROCHADE's robust preprocessing.
- Don't use when: the pattern is reliably fully visible. The full-pattern path through ROCHADE is simpler and slightly faster (no graph-matching overhead). The paper notes (§5.4, Table 2) that OCPAD adds only modest runtime over OCamCalib on full patterns but is *substantially* faster on challenging data due to the binary-search short-circuit.
- Don't use when: the upstream graph builder is unreliable — OCPAD presumes a roughly correct candidate graph. Garbage in, garbage out (modulo the size and spatial-consistency pre-filters).
- Don't use when: pattern dimensions are unknown. Use a self-identifying pattern detector (CharUco, ArUco grid) or a topological detector that auto-discovers grid size (kumar2014-grac, laureano2013-topological).
- Don't use when: high-resolution clean imagery is the only operating regime. OCamCalib and OCPAD are essentially tied on the IDS uEye benchmark (§5.2). The complexity of OCPAD pays off only when partial-pattern handling is required.
- Compared against (paper's own §5):
  - **ROCHADE** (placht2014-rochade): OCPAD's parent. Uses ROCHADE's stages 1–4 verbatim and replaces step 7. ROCHADE rejects partial patterns; OCPAD recovers them. On full patterns OCPAD adds modest cost but is more robust to graph errors (Figure 4a's wrongly-merged-vertex case: ROCHADE fails, OCPAD recovers 42/54).
  - **OCamCalib** (Scaramuzza-Rufli toolbox): another partial-pattern detector. Tied with OCPAD on most clean datasets; OCPAD wins on low-resolution challenging data. The paper notes OCamCalib's runtime varies wildly (69 ms to 12.4 s across datasets) while OCPAD is consistently <500 ms.
  - **PTAM** (Klein-Murray): camera-tracking system with a calibration mode. The paper's Table 1 shows PTAM detects very few patterns on the challenging datasets (0 on Mesa SR4000 at 100% threshold) — included for completeness but not competitive.

# Connections

- Builds on:
  - **placht2014-rochade** (already ingested) — OCPAD inherits ROCHADE's preprocessing stages 1–4 verbatim; only stage 7 is replaced. The relationship is "extends" / "replaces a stage of," not "competes with."
  - **cordella2004-vf2** (in `docs/papers/index.yaml`, not yet ingested) — VF2 subgraph-isomorphism algorithm. OCPAD is VF2-agnostic at the algorithmic level but uses VF2 in the reference implementation. Worth ingesting if a graph-matching concept page is ever drafted.
  - **bennett2013-chess** (already ingested) — referenced in §2 as "reliably detect[ing] checkerboard crossings" but lacking full-board recovery. Positioned as a *corner detector* rather than a *full-pattern detector*; OCPAD addresses the latter. Different problem class.
  - **niblack1992-skeleton** (in index, not yet ingested) — used inside ROCHADE's preprocessing; OCPAD inherits the dependency.
- Enables (in the atlas):
  - **ocpad** — primary source.
  - Implicitly enables any calibration pipeline that requires lens-distortion estimation at image borders. The paper demonstrates this empirically on multiple lens models (Brown, Kannala-Brandt) and shows the reprojection-error improvement is model-independent.
- Refutes / supersedes:
  - **ROCHADE's strict full-pattern requirement.** OCPAD's existence motivates the relaxation. ROCHADE remains valid for full-pattern detection; OCPAD is the partial-pattern extension.

# Atlas update plan

## UPDATE: ocpad

The page is comprehensive and well-structured. The five-stage cascade, the binary-search update rule, the anchor selection by quad density, the BFS region-growing fallback, and the failure-mode reasoning are all faithfully captured. The page is a draft (`draft: true`) — most of the content below applies whether or not the page is graduated to non-draft.

Section: Goal
- The phrasing is accurate but does not surface OCPAD's load-bearing motivation: lens-distortion estimation at image borders. Consider adding one sentence: "The downstream motivation is calibration accuracy in the outer image regions where lens distortion is largest — full-pattern detectors force the user to keep the entire pattern centred, leaving the high-distortion edges uncovered." This is the paper's headline applicability claim and currently absent from the Goal.

Section: Algorithm
- Definitions and procedure are correct. One small refinement: the existing `:::definition[Binary-search update]:::` block is mathematically correct and matches Algorithm 1 of the paper. Optional: add a sentence noting that the schedule converges in $\log_2 N + O(1)$ iterations on strongly-connected checkerboard graphs (this is in the existing Remarks but could move closer to the definition).
- The page's `Quad density` definition correctly uses BFS depth 3 and counts neighbours on quad cycles. Consistent with paper §4.1 second paragraph.
- The page's procedure step 5 anchor selection is correct.

Section: Remarks
- **Add bullet — calibration accuracy improvement.** OCPAD's most consequential downstream effect (paper §5.3) is the reduction of radial reprojection error in outer image regions by up to 50%, achieved by including partial-pattern correspondences in highly distorted edge regions. This claim is **model-independent** — the paper validates it under both Brown's polynomial lens model and the Kannala-Brandt generic lens model (§5.3). This is the load-bearing applicability claim of the paper and is currently absent from the page.
- **Add bullet — error-tolerance dimensions.** OCPAD tolerates three distinct types of graph error that ROCHADE rejects: (1) extra edges (e.g. spurious diagonal — Figure 3 example), (2) extra vertices (background clutter that survived preprocessing), (3) missing edges/vertices (occlusion or out-of-frame). The error tolerance comes from binary-search-over-VF2: VF2 is an *exact* matcher, so OCPAD finds an exact subgraph match by trying decreasing subgraph sizes until the wrong elements are excluded. Worth surfacing because it explains *how* partial-pattern detection actually works.
- **Add bullet — VF2 substitutability.** OCPAD is VF2-agnostic at the algorithmic level; any exact subgraph-isomorphism routine can replace it. The binary-search driver and region-growing are independent of the matcher. This is relevant for implementations targeting platforms where VF2 is not available or where alternative subgraph matchers (RI, LAD) are faster.
- **Strengthen — anchor selection rationale.** The page mentions quad-density anchor selection but does not justify the depth-3 BFS choice. Paper §4.1 second paragraph: "We obtain this density for every vertex by counting the number of adjacent vertices which are part of a quad cycle via breadth-first search down to a depth of 3." The paper considered alternatives (centre-of-mass, sum-of-shortest-distances) and found quad-density empirically best. Worth a one-line note.
- **Optional — runtime characteristic shape.** Per the page's existing "logarithmic in N" Remarks bullet, the binary search converges fast on strongly-connected graphs. Strengthen by noting that fragmented inputs degrade to linear region-growing — this is the paper's §4.1 last paragraph observation.

Section: `relations[]` — for the relationship-edges audit pass (still pending; not yet applied to `content/algorithms/ocpad.md`, which currently carries no `relations:` field at all)

The page's frontmatter currently has:
- no `relations:` field
- `sources.references: [placht2014-rochade, cordella2004-vf2]`

Three observations for the future relationship-edges audit, translated to the `relations[]` vocabulary:

1. **Add `{ type: feeds_into, target: ocpad, confidence: high }` to the `rochade` page.** OCPAD's stage 1 *is* ROCHADE's stage 1 (Scharr gradient → threshold → centreline → saddle graph), reused verbatim; OCPAD then swaps ROCHADE's strict $rc$-saddle verification (step 7) for VF2 subgraph isomorphism to handle partial visibility — a distinct method that incorporates ROCHADE's stage 1 as a named component, not the same method incrementally improved. That is `feeds_into`, not `extended_by` (per CLAUDE.md's own distinguishing rule: `extended_by` = same method improved, `feeds_into` = different method using A as a component). Chronology holds (rochade 2014 ≤ ocpad 2016). `feeds_into` is authored on the earlier page (A → B, i.e. on `rochade`, not `ocpad`) — see `harris-corner-detector.md`/`fast-corner-detector.md` → `orb` for the established pattern. Currently this relationship lives only in `sources.references`, which is for paper citations, not the page-graph; it deserves to surface in the on-page relationship panel.

2. **`chess-corners` gets no `relations[]` entry at all.** ChESS and OCPAD both target chessboard X-corners but solve different sub-problems (per-pixel detection vs full-pattern matching) — this is exactly CLAUDE.md Rule B ("cross-domain methods are not comparable... omit the link entirely"), now that the legacy soft-touch `relatedAlgorithms` bucket no longer exists on algorithm pages. Not `compared_with`, and there is no other type that fits a "same family, different sub-problem" pairing. Omit.

3. **`compared_with` candidates against `puzzleboard` or `shu-topological-grid` are now unblocked** (both `docs/research/notes/stelldinger2024-puzzleboard.md` and `docs/research/notes/shu2009-topological.md` exist as of this update) but still **not yet authored** — neither `content/algorithms/puzzleboard.md` nor `content/algorithms/shu-topological-grid.md` carries an OCPAD edge, and `ocpad.md` carries no `relations:` field. The companion `stelldinger2024-puzzleboard` note has since worked out the OCPAD↔PuzzleBoard case: `{ type: compared_with, target: puzzleboard, confidence: medium }` on `ocpad.md` (OCPAD 2016 hosts, predating PuzzleBoard 2024; medium confidence because the papers don't cite each other — an editorial inference, not a paper-stated comparison). The Shu case is not yet analysed — a future pass should decide `compared_with` vs Rule-B omission there (topological grid recovery from a candidate corner set vs subgraph-isomorphism partial-pattern matching may turn out to be a different-problem-class pairing too; do not default to `compared_with` without checking).

Section: References
- Already correct (3 entries — paper, ROCHADE, VF2). No change.

# Provenance

- Paper full text: `docs/papers/.cache/fuersattel2016-ocpad.txt` (8 pages, IEEE WACV 2016, doi:10.1109/WACV.2016.7477565).
- Abstract: motivation framed as "low-resolution images, images with high lens distortion, and partial occlusion." Headline result: ROCHADE reprojection error reduced by up to 50% in outer image regions.
- §3 ROCHADE summary (recap, p. 2-3): "The detector searches for a connected component with the same number of nodes as the checkerboard ... ROCHADE can only detect fully visible checkerboards."
- §4 Pipeline (p. 3): five stages — 50% size pre-filter, spatial consistency, quad filter, largest component, subgraph matching. Direct quote on the size pre-filter: "Hence, we require that the candidate graph must consist of at least 50% of the nodes of the model graph." Spatial consistency: "minimum inter-node distance" set to "the same value as the window size in Sec. 3.2" (the upstream subpixel window) and "the standard deviation of the length of the edges is smaller than the average length."
- §4.1 Subgraph matching (p. 3-4): VF2 [Cordella 2004] as the exact-match engine. Explicit acknowledgment: "the VF2 algorithm is limited to finding exact matches of a subgraph, instead of finding the largest common subgraph." Two-stage matching strategy: binary search + region growing. Algorithm 1 specifies the binary-search update $N_i = \mathrm{round}(N_{i-1} \pm 2^{-i}\,N)$ with sign + on success, − on failure, termination $N_i \geq N_{i-1}$.
- §4.1 anchor selection (p. 4): "We examined multiple ways to find the anchor vertex, for example the vertex which is closest to the center of mass of the detected graph (in image domain) or the vertex where the sum of all shortest distance to all other vertices is minimal. In practice we found that a different approach based on the quad density works best. We obtain this density for every vertex by counting the number of adjacent vertices which are part of a quad cycle via breadth-first search down to a depth of 3."
- §4.1 region growing (p. 4): "if `Ni` is found to converge to a value smaller than the maximum reachable, ... we continue to add single vertices in a breadth-first manner with respect to the anchor point, and iteratively match the obtained graph to the model."
- §5.2 detection rates (Table 1): Mesa SR4000 (206 images) — OCPAD 200/206 vs ROCHADE 195 vs OCamCalib 131 vs PTAM 0 at 100% threshold. Full Boards (162) — OCPAD 162 vs ROCHADE 153 vs OCamCalib 155 vs PTAM 3. Full + Partial Boards (162) — OCPAD 44/162 at 100% (very tough), 128/162 at 75%.
- §5.3 calibration accuracy (Figure 6): Brown's lens model and Kannala-Brandt generic lens model both show "considerably lower" radial reprojection error when partial boards are included. Up-to-50% improvement quoted in the abstract.
- §5.4 runtime (Table 2): OCPAD 367–477 ms across all datasets, OCamCalib 69 ms (low-res Mesa) to 12.4 s (high-res GoPro), PTAM 437 ms to 7.3 s.
- §6 Conclusion: future work — "The current graph matching algorithm ... does not yet exploit all properties of planar graphs that occur in two-dimensional calibration patterns." Suggests subsequent work on planar-graph-specialised subgraph matching.
