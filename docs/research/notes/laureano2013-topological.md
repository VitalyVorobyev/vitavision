---
paper_id: laureano2013-topological
title: "Topological Detection of Chessboard Pattern for Camera Calibration"
authors: ["G. T. Laureano", "M. S. V. de Paiva", "A. S. da Silva"]
year: 2013
url: https://worldcomp-proceedings.com/proc/p2013/IPC3656.pdf
created: 2026-05-01
relevant_atlas_pages: [laureano-topological-chessboard, shu-topological-grid]
---

# Setting

**Problem class.** Detection and integer-coordinate assignment of X-corner calibration points on a chessboard pattern, with explicit support for partial occlusion. The paper directly targets the feature-extraction stage of Zhang-style calibration (§1, citing [8]) — the same gap that Shu et al. 2009 ([16] in the paper's reference list) address, but with a per-pixel detector front-end instead of Harris.

**Inputs.**
- A grayscale image $I : \Omega \to \mathbb{R}$.
- No explicit resolution or noise model is stated. The paper's experiments use the Bouguet MATLAB database (20 images, unspecified resolution but standard calibration-pattern captures) and two consumer webcams (Philips SPC990NC, Microsoft HD 5000). The algorithm operates on a single image at a time; no temporal integration is used.
- No grid dimensions are required a priori. The coordinate propagation starts from an arbitrary seed triangle pair and flood-fills outward.

**Outputs.** A set of subpixel X-corner positions $\{(x_k + s_k, y_k + t_k)\}$ with integer pattern coordinates $\{(i_k, j_k)\} \subset \mathbb{Z}^2$, where $(s_k, t_k)$ is the Chen-Zhang Hessian subpixel offset from pixel centre $(x_k, y_k)$. Corners outside the pattern — from background clutter, partial occlusion regions, or noise — are discarded by the topological filter.

**Guarantees.** No analytic correctness proof is offered. The paper explicitly positions the topological filter as a threshold-free replacement for manual or response-threshold-based selection: "the sub-pixel location is threshold independent" (Abstract). Detection success depends on the ring-alternation criterion catching X-junctions and the Delaunay triangulation pairing the resulting corner set into the chessboard topology.

---

# Core idea

The detector fuses a per-pixel alternation-count operator on a Bresenham ring (positioned by the authors as a "specification" of Rosten-Drummond FAST [19]) with the topological Delaunay-mesh filtering from Shu et al. 2009 ([16]), replacing Shu's Harris front-end with a chessboard-specific detector and Shu's visual colour comparison with adaptive binarization (Bradley-Roth [25]).

The pipeline has seven stages (§2–§5):

1. **X-corner detection (§2, Eq. 1).** For each pixel $p_c$, sample the $n$-pixel Bresenham ring $V = \{p_1, \ldots, p_n\}$. Compute ring mean $m = \frac{1}{n}\sum I(p_i)$, thresholds $T_l = m - \mathrm{gate}$, $T_h = m + \mathrm{gate}$ with $\mathrm{gate} = 10$ (empirical). Count alternations $N_\mathrm{alt}$ of the ring intensity sequence crossing the threshold pair: a transition is counted whenever $I(p_i) > T_h$ and $I(p_{i-1}) < T_l$ (dark-to-light) or $I(p_i) < T_l$ and $I(p_{i-1}) > T_h$ (light-to-dark). Classify $p_c$ as an X-corner iff $N_\mathrm{alt} = 4$ and $T_l < I(p_c) < T_h$ (the centre pixel must be in the transition zone, not in either dark or light region). The paper uses a Bresenham circle but does not explicitly state $n = 16$; the FAST-16 ring size is implied by the analogy to Rosten-Drummond.

2. **NMS (§2, Eq. 2).** Each candidate X-corner is scored by $R(p_c) = \max\!\left(\sum_{p_i \in \mathrm{dark}} |I(p_i) - m|, \sum_{p_i \in \mathrm{light}} |I(p_i) - m|\right)$ and a non-maximum suppression retains the peak in a local window.

3. **Adaptive binarization (§3).** The full image $I$ is binarized into $B : \Omega \to \{0, 1\}$ using Bradley-Roth integral-image adaptive thresholding [25] — linear-time for any window size, tolerant of illumination gradients. This is the binarization used to assign colour labels to Delaunay triangles; it is **not** used in the detection stage (stage 1 uses its own threshold pair). This step has no counterpart in Shu et al. 2009.

4. **Delaunay triangulation (§3).** Construct $T = \operatorname{Del}(C)$ over the surviving X-corner set $C$. The paper references Guibas-Knuth-Sharir ($O(n \log n)$) [24] as the algorithm. Under the empty-circumcircle property, tile diagonals of a chessboard project to Delaunay edges (same argument as Shu §2.1, justified geometrically); this breaks only at extreme oblique angles.

5. **Topological filter (§3).** Assign each triangle $t$ a colour label from $B$ by reading the shrunk interior (edges excluded, to avoid boundary ambiguity from binarization noise). A triangle is **valid** iff: (i) no colour transition in its interior — uniform $B$ over the interior; (ii) it has at least one edge-adjacent neighbour with the same colour; (iii) it has at most two edge-adjacent neighbours with the same colour. Iterate this filter until no triangle is removed (fixed-point iteration). Then discard vertices belonging to no surviving triangle. This rule differs from Shu et al.'s node-degree filter (degree $> 4$ signals illegal topology): Laureano's filter operates at the triangle level and directly enforces the two-colour regularity of the chessboard, while Shu's filter removes quads with illegal nodes after pairing triangles.

6. **Coordinate propagation (§4).** Select an arbitrary seed pair of same-colour adjacent triangles $(T_1, T_2)$. The vertex of $T_1$ opposite to $T_2$ is assigned the origin $(0, 0)$; the remaining two vertices of $T_1$ are assigned $(1, 0)$ and $(0, 1)$ along the pattern axes. For each unvisited triangle adjacent to a labelled one, compute the unlabelled opposite vertex's coordinates by a reflection rule: if the shared edge includes vertex $v_x$, the opposite vertex gets $\bigl[v_t^{(x)},\ 2v_t^{(y)} - v_y^{(y)}\bigr]^\top$; if the shared edge includes $v_y$, the opposite vertex gets $\bigl[2v_t^{(x)} - v_y^{(x)},\ v_t^{(y)}\bigr]^\top$ (§4, figure 5). The paper states "the algorithm performs recursively for each neighbour triangle to the pair $T_v$ and $T_\mathrm{op}$. It makes the algorithm $O(n/2)$" — effectively $O(n)$ in triangle count.

7. **Chen-Zhang Hessian subpixel refinement (§5, Eq. 3–5).** At each surviving vertex $(x_0, y_0)$ compute the image Hessian $H = \bigl[\begin{smallmatrix} I_{xx} & I_{xy} \\ I_{xy} & I_{yy} \end{smallmatrix}\bigr]$ and the response $S = I_{xx} I_{yy} - I_{xy}^2$ (Eq. 4). X-junctions are saddle points of intensity, so $S < 0$ (product of a positive and a negative eigenvalue). The subpixel offset $(s, t)$ is the critical point of the local quadratic expansion: $s = (I_y I_{xy} - I_x I_{yy}) / (I_{xx} I_{yy} - I_{xy}^2)$, $t = (I_x I_{xy} - I_x I_{xx}) / (I_{xx} I_{yy} - I_{xy}^2)$ (Eq. 5). The paper runs this **only at surviving vertices** after topological filtering — not image-wide — making it efficient. Shu et al. rely on Harris's own subpixel refinement applied before the grid-finding stage; Laureano decouples detection from subpixel refinement and applies the latter only to topologically confirmed corners.

---

# Assumptions

1. (hard) The Bresenham ring around a true X-junction produces exactly $N_\mathrm{alt} = 4$ threshold crossings. This requires the local intensity pattern to alternate cleanly: dark, dark, light, light, dark, dark, light, light around the ring. It fails when the junction is blurred to the point where the ring samples do not reach both $T_l$ and $T_h$ in four separate arcs (low contrast, out-of-focus, or very steep viewing angle).

2. (hard) The centre pixel of a true X-junction has intensity in $(T_l, T_h)$. Junctions with very unequal surrounding quadrant sizes (asymmetric pattern) may place the local ring mean away from the true junction intensity, causing the centre-pixel gate to reject a true corner. This assumption is softer for standard chessboards where quadrants are symmetric.

3. (soft) $\mathrm{gate} = 10$ is appropriate. The paper states "the variable gate has little effect on the final result" because the alternation count $N_\mathrm{alt} = 4$ already provides the primary discrimination; $\mathrm{gate}$ is a secondary contrast gate. On images with very low contrast (Bouguet database images 5 and 18 are mentioned), the gate may eliminate valid corners.

4. (hard) Delaunay triangulation edges follow tile diagonals. This is the same geometric condition as Shu et al. (empty-circumcircle property for moderately projected rectangles). Fails at extreme viewing angles — also the regime where the x-corner detector degrades simultaneously (§6: "high perspective distortion and lack of focus").

5. (hard) The Bradley-Roth binarization correctly assigns interior colours to every Delaunay triangle. If binarization fails in a region (heavy shadow, saturation), triangles in that region will have incorrect or mixed-colour interiors and be dropped by the uniform-interior condition — causing false negatives, not false positives.

6. (soft) A sufficient number of valid triangles survive the topological filter to reach the minimum required for Zhang's calibration (at least 4 visible corners for a homography). The paper reports cases with as few as ~33% success (images 5 and 18; 51/156 and 61/156 corners respectively) that are attributed to steep angles; whether these frame-level outputs are usable depends on the downstream calibration pipeline's minimum-correspondence requirement.

7. (soft) The coordinate propagation seed $(T_1, T_2)$ is selected arbitrarily. The relative integer coordinates are correct regardless of which seed is chosen (the topology determines the relative labelling). No orientation markers (contrast with Shu et al.'s three-circle constraint) are required for within-session consistency, but the absolute origin and axis orientation are undetermined without additional context.

---

# Failure regime

- **Steep viewing angles ($\lesssim 10°$–$15°$ from pattern plane).** Blurring reduces alternation counts below $N_\mathrm{alt} = 4$ and defocuses X-junctions; simultaneously, Delaunay topology breaks. Both failure modes compound. The paper identifies images 5 and 18 in the Bouguet database as exactly this regime: 32.69% and 39.10% detection rate respectively (Table 1). Excluding them, mean accuracy rises from 85.4% to 90.9%.

- **Low-contrast images.** Ring samples fail to clear both $T_l$ and $T_h$ arcs simultaneously; $N_\mathrm{alt}$ remains 0 or 2 rather than 4. The paper notes the Bouguet database "images have low contrast" as a contributing factor to the two outlier failures.

- **Binarization failure in locally dark or bright regions.** If Bradley-Roth adaptive binarization assigns the wrong label to pixels near edges (which it explicitly handles by interior-only sampling), triangles in that region are incorrectly labelled and rejected by condition (i) of the topological filter. This produces false negatives but no false positives.

- **Complex backgrounds with accidental X-like structures.** Corners of non-chessboard origin that satisfy $N_\mathrm{alt} = 4$ enter the candidate set. They are expected to fail the topological filter because background X-corners do not form a regular two-colour tile topology. The paper demonstrates this on §6's "complex backgrounds and partial occlusion" test (Figure 9): no false positives are reported.

- **Partial occlusion / missing border tiles.** Occluded X-corners are simply absent from the Delaunay mesh; the topological filter runs on the surviving set and flood-fills only the connected legal sub-mesh. The paper emphasizes this as the key advantage over OpenCV's findChessboardCorners (Abstract, §6, Figure 9): "the occluded corners do not interfere in the propagation of correct coordinates."

- **Coordinate propagation complexity note.** The paper states complexity $O(n/2)$ for the flood-fill (§4), where $n$ is the triangle count. The implementation is described as recursive — deep recursion on very large meshes (thousands of triangles) can overflow the call stack; an iterative BFS formulation would be safer in practice.

---

# Numerical sensitivity

- **Gate = 10 on blurred input.** The paper uses a "previously blurred image" as the nominal input for the x-corner detector. The blur kernel parameters are not specified. Applying the alternation test to an un-blurred image would reduce false negatives from NMS but increase the sensitivity of $N_\mathrm{alt}$ to noise.

- **Bresenham ring size $n$.** The paper refers to a Bresenham circle neighbourhood but does not explicitly fix $n = 16$ in the text. The FAST-16 equivalence is implied ("specification of the proposed detector in Rosten and Drummond [19]") and the implementation description references $n$ generically. The exact ring radius and pixel count are implementation choices not specified in the paper.

- **Bradley-Roth window size.** Not specified. The reference [25] (Bradley-Roth 2007) describes an integral-image method where the window size is a tuning parameter. The paper inherits this parameter without providing guidance.

- **NMS window size.** Not specified. The cost $R(p_c)$ is computed per candidate, and the NMS window over which the argmax is computed is not given. In practice, the window must be large enough to suppress ring-level duplicates from a single X-junction (the detector "does not guarantee that only one pixel is classified as x-corner in its neighbourhood").

- **Chen-Zhang offsets $(s, t)$ stability.** The Hessian determinant $I_{xx} I_{yy} - I_{xy}^2$ is the denominator of both $s$ and $t$ (Eq. 5). At $S = 0$ (flat or ridge-like intensity surface) the expression is undefined; the paper's selection criterion $S < 0$ (largest negative value) implicitly excludes this case but does not characterize the conditioning as $|S| \to 0$.

- **Coordinate origin arbitrariness.** The seed $(T_1, T_2)$ is chosen arbitrarily, so the absolute pattern coordinates depend on the seed selection. If the detected pattern is a proper subset of the full grid, the coordinates will be relative to the seed sub-region; inter-frame consistency requires matching against the known pattern or aligning frames by detected corner overlap.

---

# Applicability

- Use when: calibrating cameras via Zhang's method with chessboard patterns, especially when partial visibility is common (online streaming, handheld calibration sessions).
- Use when: radial distortion is present but not extreme — the topological filter does not assume straight boundaries.
- Use when: automatic calibration without user-specified grid dimensions is desired. The method does not require $(r, c)$ as input; it labels whatever sub-grid it detects.
- Use when: background clutter is present — the topological filter suppresses non-pattern X-corners without threshold tuning.
- Don't use when: viewing angle is very steep (≲15° from pattern plane). Detection and topology both degrade; the paper's own experiments confirm this as the dominant failure mode.
- Don't use when: pattern contrast is very low (high-compression JPEG artefacts, extreme dynamic-range mismatches). The ring alternation test depends on the centre pixel being distinguishably between the two threshold levels.
- Don't use when: absolute coordinate orientation is required frame-to-frame without additional alignment. The seed is arbitrary; the output coordinate system is determined relative to whichever triangles are found first.
- Compared against:
  - **OpenCV findChessboardCorners** — requires the full pattern to be present; Laureano handles partial occlusion. Both fail at steep angles. (Paper §6, Fig. 9.)
  - **Shu et al. 2009 (shu-topological-grid)** — same Delaunay-mesh topology idea; Laureano replaces Harris with a per-pixel x-corner classifier, replaces triangle interior mean comparison with Bradley-Roth binarization, replaces node-degree filter with a triangle-level iterative filter, and adds Chen-Zhang subpixel refinement. Shu requires three orientation markers; Laureano does not.
  - **ChESS / Bennett et al. 2013 (chess-corners)** — also a per-pixel ring-based X-corner detector (ChESS uses 8-point symmetric patterns); no built-in grid ordering. Laureano combines the per-pixel detection with the full topology-and-ordering pipeline, so it is a self-contained calibration extractor, whereas ChESS is a detector.
  - **ROCHADE / Placht et al. 2014 (rochade)** — successor; replaces Delaunay mesh with a centreline-graph saddle approach; adds cone-filtered bivariate quadratic subpixel refinement; requires full pattern to be present and $(r, c)$ to be known. Stricter but more accurate on full-pattern cases.

---

# Connections

- Builds on:
  - `rosten2006-fast` — the x-corner detection kernel is positioned as a "specification" of Rosten-Drummond FAST (§2, citing [19]); the ring-alternation test is analogous to FAST's segmentation test generalised to four-arc X-junctions rather than two-arc corners.
  - `shu2009-topological` — direct predecessor; the Delaunay-triangulation-plus-topological-filter pipeline (§3–§4) is explicitly based on Shu-Brunton-Fiala 2009 ([16] in paper), which the Laureano paper names "CAMcal." Key differences are documented in §3 and §5: the per-pixel detector replaces Harris, and Chen-Zhang refinement is added.
  - `harris1988-corner` — cited as a comparison baseline in §5; the paper explains why Harris-style detectors (Harris-Stephens [26] and Shi-Tomasi [27]) are less suitable: "Harris corner detection is time consuming, sensible to noise, needs an empirical threshold to select interesting points and does not produce good results to the specific features of the chessboard image" (§1, citing [17]).
  - `shi-tomasi1994-features` — cited in §5 alongside Harris as the class of detectors Laureano's Chen-Zhang step replaces.
  - Chen and Zhang 2005 [4] — the subpixel Hessian detector used in §5, Eq. 3–5. Not yet ingested as a separate research note; referenced as `chen2005-xcorner` in `docs/papers/index.yaml`.
  - Bradley and Roth 2007 [25] — adaptive integral-image binarization. Not yet ingested.
- Enables (in atlas):
  - `laureano-topological-chessboard` — primary source.
  - `shu-topological-grid` — Shu et al. 2009 is the direct predecessor; Laureano's extensions are a natural "what came after" bullet on the Shu page.
- Refutes / supersedes:
  - **OpenCV findChessboardCorners** in the partial-visibility regime — explicitly demonstrated in §6, Fig. 9.
  - **Harris-based full-grid detectors (CAMcal, Shu 2009)** in the per-pixel detection efficiency dimension — the alternation-count test avoids Harris's global threshold and is computationally cheaper per pixel.

---

# Atlas update plan

## UPDATE: laureano-topological-chessboard

The existing public page accurately captures the seven-stage pipeline (frontmatter `sources.notes`, Algorithm section, Procedure, and Remarks). The following targeted additions and clarifications are warranted based on the paper text.

### Section: Algorithm — ring size not explicit in paper

**Clarify:** The Procedure step currently states "Bresenham ring with $n = 16$ samples at radius $r$" — this matches FAST-16 convention and is consistent with the paper's analogy to Rosten-Drummond, but $n = 16$ is not stated in the Laureano paper text. The parameter is an implementation choice. A parenthetical "(FAST-16 convention by analogy to [19]; $n$ not fixed in paper)" would prevent over-interpretation.

### Section: Algorithm — topological filter vs Shu et al.

**Add clarification to the Topological legality definition:** The current page correctly states the three conditions. The contrast with Shu et al. should be surfaced in a comment: Shu's filter operates at the quad level (pairs of triangles) and removes quads with two or more degree-$>4$ nodes; Laureano's filter operates at the triangle level and directly enforces the two-colour neighbourhood condition, then iterates to fixed point. Laureano's three conditions are triangle-level; Shu's single condition is node-degree-based on the quad mesh. The two approaches are complementary, not identical.

### Section: Algorithm — coordinate propagation complexity

**Correct the Remarks bullet:** The page states the propagation is $O(n)$; the paper states $O(n/2)$ (§4). Both are $O(n)$ asymptotically; the paper's claim that the algorithm is "recursive" is worth noting because iterative BFS would be safer on very large meshes.

### Section: Algorithm — seed orientation indeterminacy

**Add Remarks bullet:** The seed triangle pair $(T_1, T_2)$ is "arbitrarily selected" (§4). The resulting integer coordinates are correct relative to the seed but the absolute origin and axis orientation are undetermined. This is in contrast to Shu et al., which uses three orientation marker circles to fix the reference frame. Laureano's approach is parameter-free for detection but may require a post-hoc alignment step if the output must be registered to a fixed pattern reference frame across frames.

### Section: Remarks — comparison with Shu et al.

**Add cross-reference bullet (deferred until shu page hosts comparison):** Per comparison policy (docs/README.md §4), Shu (2009) is older, so `shu-topological-grid` hosts the `## When to choose Shu et al. over Laureano et al.` section. This page should carry a single Remarks bullet pointing to that anchor once it is written. **Precondition met:** both research notes now exist (shu2009-topological.md and laureano2013-topological.md). The comparison can be authored on the shu-topological-grid page.

### Section: Remarks — experimental results

**Add bullet:** The Bouguet database results (Table 1) show mean accuracy 85.4% over 20 images, rising to 90.9% when the two steep-angle outliers (images 5 and 18; 32.7% and 39.1%) are excluded. The two online webcam cameras achieved 97.7% and 98.2% mean accuracy over 14 images each (Table 2). These numbers provide concrete calibration of the "robust even when partially occluded" claim in the Abstract. The current page does not cite specific accuracy figures.

### Section: Remarks — false-positive rate

**Add bullet:** The paper explicitly states "no false positives were identified" in the complex-background and partial-occlusion test (§6, Fig. 9). This is a key property of the topological filter: it produces false negatives (missed corners) but not false positives, because a non-chessboard X-corner cannot accidentally satisfy the two-colour tile regularity condition over a spatially consistent mesh.

### Section: Goal — gate parameter

**Clarify:** The page states "gate = 10 empirical" — correct. The paper adds: "Considering a previously blurred image, the number of alternations imposes large part of the restriction required for a proper classification. Thus the variable gate has little effect on the final result." (§2). This justification for why gate tuning is unimportant is absent from the page and worth a one-sentence addition.

---

## UPDATE: shu-topological-grid (supplementary)

The Shu page already lists the `laureano2013-topological` paper in its coverage of the Laureano comparison (the page's existing content mentions Laureano as a planned cross-reference). **The precondition for comparison authoring is now met** (both research notes exist). The following update is ready to apply:

### Section: Remarks — comparison with Laureano et al.

**Add `## When to choose Shu et al. over Laureano et al.` section** (Shu is older and hosts):

- **When orientation markers are available and absolute coordinate alignment is needed:** Shu's three-circle markers fix the reference frame; Laureano's seed is arbitrary.
- **When no per-pixel detector tuning is acceptable:** Shu uses Harris with standard parametrisation; Laureano's ring detector requires choosing the blur kernel applied before detection (not specified in the paper).
- **When a quad-level topological abstraction is preferred:** Shu merges triangles into quads first, then filters; Laureano filters at the triangle level. The quad representation directly models the chessboard tile topology.
- **When Laureano is preferred over Shu:** partial occlusion support without orientation markers; per-pixel x-corner detector avoids Harris's threshold sensitivity; Chen-Zhang Hessian subpixel refinement is more principled than Harris's own subpixel output; iterative fixed-point filter is more aggressive at removing marginal triangles than Shu's single-pass degree-pruning.

Add `relations: [{ type: compared_with, target: laureano-topological-chessboard, confidence: high }]` to the Shu page frontmatter (Shu is the host).

---

# Provenance

All section/equation citations are to `docs/papers/.cache/laureano2013-topological.txt`.

- **Abstract:** "a corner detection and a topological filter are presented. The correspondence is done using neighboring properties on a geometric mesh and the sub-pixel location is threshold independent. The results show that the algorithm provides a robust detection even when the pattern is partially occluded." — retained verbatim as the paper's canonical framing of its three contributions.

- **§1 (Introduction):** "Harris corner detection is time consuming, sensible to noise, needs an empirical threshold to select interesting points and does not produce good results to the specific features of the chessboard image [17]." — motivation for replacing Harris with the ring detector. Also: Escalera-Armingol method "sensitive to distortions, limiting its use only to cameras with low radial distortion" — positions topological approach as distortion-robust.

- **§2 (X-Corner Detector), Eq. 1:** Alternation count formula — sum over $n$, conditions $(I(p_i) > T_h \wedge I(p_{i-1}) < T_l)$ and $(I(p_i) < T_l \wedge I(p_{i-1}) > T_h)$, $i = 0 \Rightarrow i - 1 = n$. Classification: $N_\mathrm{alt} = 4$ and $T_l < I(p_c) < T_h$.

- **§2, gate justification:** "Considering a previously blurred image, the number of alternations imposes large part of the restriction required for a proper classification. Thus the variable gate has little effect on the final result. In this work gate is defined with 10 empirically." — confirms gate = 10 and explains why it is weakly influential.

- **§2, FAST analogy:** "This detector can be seen as a specification of the proposed detector in Rosten and Drummond [19], which is considered high performance." — direct quote. Note: "specification" means a particular instance/application, not a formal derivation.

- **§2, Eq. 2 (NMS cost):** $\max\!\left(\sum_{p_i \in \mathrm{dark}} |I(p_i) - m|,\; \sum_{p_i \in \mathrm{light}} |I(p_i) - m|\right)$ — the kept corner is "the one with the highest associated cost."

- **§3 (Topological Filter):** Three validity conditions stated verbatim: "(1) those triangles that do not have color transitions in your interior; (2) only those triangles that have a neighbor with the same color; (3) those triangles that have only two neighbors of the same color and different color triangle taken as a reference." Filter is applied "until there are no more invalid triangles"; then "vertices that do not form any triangle are also removed."

- **§3, Bradley-Roth:** "this work uses adaptive binarization described in the work of Bradley and Roth [25]. This algorithm handles well with large variations in illumination and runs in linear time for any window size." — confirms linear time and illumination robustness; window size not specified.

- **§3, interior sampling:** "In practice, verification color transition is made in a region of the innermost triangle, ignoring the edges." — confirms that edges are excluded from the colour-uniformity test to avoid boundary ambiguity.

- **§4 (Point Correspondences):** Seed selection: "First two neighboring triangles of the same color are arbitrarily selected: T1 and T2." Reflection rules for coordinate propagation given in two cases (§4 bullet list). Complexity: "It makes the algorithm $O(n/2)$, where $n$ is the number of triangles in the mesh."

- **§5 (Location Refinement), Eq. 3–5:** Hessian $H$ (Eq. 3), response $S = I_{xx} I_{yy} - I_{xy}^2 = \lambda_1 \lambda_2$ (Eq. 4), subpixel offsets $s$ and $t$ (Eq. 5). Applied "only in regions defined by the valid vertices of triangle mesh" — explicit efficiency rationale.

- **§6 (Experimental Results):** Bouguet database: 20 images, 156 x-corners (12×13 matrix). Mean accuracy 85.38%; images 5 and 18 ("very inclined to the camera") at 32.69% and 39.10%. Excluding these: 90.88%. Online cameras (14 images each): HD 5000 mean 97.68%, SPC900nc mean 98.23% (Table 2). Figure 9: "no false positives were identified, which confirms the robustness of the filter used."

- **§7 (Conclusions):** "The experimental results show that it is possible to detect these patterns in a robust and automatic without the use of thresholds. Furthermore, a low computational cost is achieved, since the refinement of X-corners is directed to specific regions of the image." — direct framing of threshold-independence and efficiency claims.
