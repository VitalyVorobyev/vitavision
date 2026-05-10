---
paper_id: felzenszwalb2004-graph-segm
title: "Efficient Graph-Based Image Segmentation"
authors: [Pedro F. Felzenszwalb, Daniel P. Huttenlocher]
year: 2004
url: https://cs.brown.edu/people/pfelzens/papers/seg-ijcv.pdf
created: 2026-05-10
relevant_atlas_pages: [felzenszwalb-graph-segmentation]
---

# Setting

**Problem class:** Unsupervised image segmentation — partition an image's pixels into
perceptually meaningful regions without requiring prior knowledge of scene content or
a fixed number of regions.

**Input:** A graph $G = (V, E)$ where each vertex $v_i \in V$ is an image pixel (or
feature point), each edge $(v_i, v_j) \in E$ connects neighboring elements, and each
edge carries a non-negative dissimilarity weight $w((v_i, v_j))$. For grid graphs the
neighborhood is 8-connected; for feature-space graphs it is the $k$-nearest neighbors
in feature space. The image is optionally pre-smoothed with a Gaussian of $\sigma =
0.8$ to suppress digitisation artifacts.

**Output:** A segmentation $S$ — a partition of $V$ into connected components $C \in S$
— satisfying the formal properties of being **neither too fine nor too coarse** (see §
Algorithm). Number of output components is data-driven; there is no fixed-$K$
requirement.

**Guarantees (theoretical):** The output segmentation satisfies Properties (Theorems
1–3): (i) not too fine — no neighboring pair of output components lacks evidence of a
boundary; (ii) not too coarse — no proper refinement of the output also satisfies (i);
(iii) the result is invariant to the tie-breaking order used when sorting equal-weight
edges.

**No preconditions on:** pixel intensity distribution, region count, region shape,
spatial connectivity of regions (when using nearest-neighbour graphs).

---

# Core idea

The central insight is that a boundary between two regions is **perceptually
meaningful only when the cross-boundary dissimilarity is large relative to the internal
variability of at least one of the regions**. A purely global threshold (Zahn 1971)
fails because a high-variability region's internal differences can exceed the boundary
differences to its neighbours.

The algorithm operationalises this via three quantities:

$$
\text{Int}(C) = \max_{e \in \mathrm{MST}(C, E)} w(e) \tag{Eq. 1}
$$

$$
\text{Dif}(C_1, C_2) = \min_{\substack{v_i \in C_1,\; v_j \in C_2 \\ (v_i,v_j) \in E}} w(v_i, v_j) \tag{Eq. 2}
$$

$$
\text{MInt}(C_1, C_2) = \min\!\bigl(\text{Int}(C_1) + \tau(C_1),\; \text{Int}(C_2) + \tau(C_2)\bigr) \tag{Eq. 4}
$$

$$
\tau(C) = \frac{k}{|C|} \tag{Eq. 5}
$$

The **boundary predicate** $D(C_1, C_2)$ is true (boundary exists) when:

$$
D(C_1, C_2) = \bigl[\text{Dif}(C_1, C_2) > \text{MInt}(C_1, C_2)\bigr] \tag{Eq. 3}
$$

The **algorithm** (Algorithm 1) is a greedy, Kruskal-style MST merge:

1. Sort all $m$ edges by non-decreasing weight: $\pi = (o_1, \ldots, o_m)$.
2. Initialise: each vertex in its own component.
3. For each edge $o_q = (v_i, v_j)$ in order: if $v_i$ and $v_j$ are in distinct
   components $C_i^{q-1}$, $C_j^{q-1}$ and
   $w(o_q) \leq \text{MInt}(C_i^{q-1}, C_j^{q-1})$, merge them; otherwise do nothing.
4. Return $S^m$.

Because edges are considered in non-decreasing order, the merge-triggering edge for
any component pair is always the **minimum weight edge** between those components —
identical to Kruskal's MST criterion. $\text{Int}(C)$ is therefore maintained in O(1)
per merge: it is simply the weight of the most recent merge edge.

The $\tau(C) = k/|C|$ term provides a **size-adaptive prior**: small components (where
$\text{Int}(C)$ is an unreliable estimate of internal variability, and equals 0 for a
singleton) require a larger cross-boundary gap before being kept separate. As $|C|$
grows, $\tau \to 0$ and the criterion approaches a pure MST-weight comparison. The
parameter $k$ sets the scale of observation — larger $k$ biases toward fewer, larger
components — but it is **not** a minimum component size; small components survive
when the boundary evidence is strong.

---

# Assumptions

1. **Edge weights are a faithful proxy for perceptual dissimilarity** (hard). The
   method's correctness proofs are graph-theoretic and make no claim about which
   weight function to use. A poor weight function (e.g., ignoring texture) can produce
   trivially-correct-but-useless segmentations.

2. **Grid neighbourhood is sufficient for grid-graph mode** (soft). Using an
   8-connected grid yields $m = O(n)$ edges and $O(n \log n)$ runtime. Larger
   neighbourhoods are valid but increase $m$ and thus runtime.

3. **Dif uses the minimum cross-boundary edge** (design choice with hardness
   consequence). The paper shows that replacing the minimum with any quantile $K >
   0$ of inter-component edges makes finding an optimal segmentation NP-hard (Theorem
   4, Appendix). This hardness result is exact: the min-edge variant is the unique
   tractable case in this predicate family.

4. **Image is smoothed with $\sigma = 0.8$ before computing weights** (soft). This
   suppresses digitisation noise without visibly altering the image (Section 5). For
   synthetic images or pre-denoised data, $\sigma = 0$ is used (Section 6, Figure 6).

5. **Color images treated as three independent monochrome segmentations** (design
   choice). The three RGB component segmentations are intersected: two pixels are
   co-segmented only if they are co-segmented in all three planes. The paper notes
   this gave better empirical results than a single run on a combined color-space edge
   weight (Section 5).

6. **For nearest-neighbour graph mode:** each pixel is embedded as $(x, y, r, g, b)$
   with L2 distance as edge weight; 10 nearest neighbours per pixel are used (Section
   6). The ANN algorithm [1] is used to build the graph in sub-quadratic time.

---

# Failure regime

**Single cheap bridge (chaining).** $\text{Dif}(C_1, C_2)$ uses only the minimum
cross-boundary edge. A single low-weight edge between two otherwise distinct regions
suffices to suppress boundary detection. The paper acknowledges this explicitly
(Section 7): "our algorithm will merge two regions even if there is a single low weight
edge between them." In practice this appears in images with narrow transition zones
(one or two pixels wide at mid-intensity), which can be absorbed into a spurious
"boundary region" component (Section 5, Figure 4 — jacket/shirt edge artefact).

**Sensitivity to $k$ relative to image resolution.** Because $\tau(C) = k/|C|$, the
effect of $k$ depends on the pixel count of the image. The paper uses $k = 150$ for
$128 \times 128$ images and $k = 300$ for $320 \times 240$ or larger (Sections 5, 6).
There is no automatic scale normalisation: the same $k$ on a 4 MP image and a
$128 \times 128$ thumbnail will behave very differently.

**Spatially disconnected regions in grid-graph mode.** The grid graph can only form
spatially connected components. Texturally coherent but spatially disjoint regions
(e.g., a field of red flowers) cannot be captured with the grid graph (Section 6). The
nearest-neighbour graph variant addresses this but introduces spatial non-locality that
can merge visually unrelated regions of similar colour.

**Quantile Dif is NP-hard.** If one tries to make the boundary predicate more robust
by using the $K$-th quantile of cross-boundary edge weights (Eq. 6), finding an
optimal segmentation becomes NP-hard (reduction from min-ratio-cut with uniform
capacities and demands, Appendix, Lemma 2 and Theorem 4). This forecloses the
obvious robustness improvement.

**High-variability regions adjacent to smooth regions can pull the smooth region in.**
The baseball player example (Figure 3) shows the grassy region merging with part of
the wall because the slow change in intensity across the grass-wall boundary is
comparable in magnitude to the internal variation of the grassy region.

---

# Numerical sensitivity

**Sorting dominates.** For general real-valued weights, sorting costs $O(m \log m)$.
For integer-valued weights (e.g., 8-bit intensity differences, $w \in [0, 255]$),
counting sort achieves linear time. The union-find operations (Steps 1–3) cost
$O(m\,\alpha(m, n))$ where $\alpha$ is the inverse Ackermann function — effectively
$O(m)$ in practice (Section 4.1).

**$\text{Int}(C)$ maintenance is exact and free.** Because Lemma 1 guarantees that
the merge edge is always the minimum weight edge between the merging components
(and therefore the maximum-weight edge in the resulting component's MST), $\text{Int}$
can be updated in O(1) per merge without any floating-point accumulation (Section
4.1).

**Weight function precision.** The paper uses absolute intensity differences $w(v_i,
v_j) = |I(p_i) - I(p_j)|$ — integer-valued for 8-bit images, naturally bounded. For
feature-space mode with L2 distance on $(x, y, r, g, b)$, the spatial coordinates
$(x, y)$ have much larger dynamic range than the colour channels $(r, g, b) \in
[0, 255]$; no normalisation or whitening is described. The effect of this imbalance is
not analysed in the paper.

**Gaussian smoothing.** $\sigma = 0.8$ is described as producing "no visible change to
the image" (Section 5). Since it is applied before weight computation, its effect on
integer weights is to introduce sub-pixel interpolation; the implementation presumably
uses floating-point intermediate values.

---

# Applicability

- **Use when:** fast ($O(n \log n)$) segmentation of natural images is needed without
  fixing the region count; when regions have widely varying internal variability;
  as a preprocessing step for higher-level tasks (stereo support regions, object
  proposals, superpixels). The paper cites use in large-scale image database
  retrieval [13].
- **Use nearest-neighbour graph mode when:** spatially disjoint but texturally
  coherent regions (e.g., repeated objects of the same colour) must be co-segmented.
- **Don't use when:** precise boundary localisation is required (the min-edge Dif can
  cause chaining); when the region count must be fixed; when robustness to a single
  outlier edge is critical (quantile Dif is NP-hard); when $k$ cannot be tuned to
  image resolution.
- **Compared against:** Zahn 1971 MST-break [19] (no adaptive threshold — fails on
  high-variability regions); Urquhart 1982 [15] (normalises by smallest incident edge
  weight — insufficient for image segmentation); Shi-Malik 2000 normalised cuts [14]
  (captures non-local properties but requires eigenvector computation, $O(n^{1.5})$+
  approximations, and is too slow for video-rate use); Comaniciu-Meer 1999 mean-shift
  [4] (feature-space clustering with fixed dilation radius, closely related to the
  nearest-neighbour variant of this paper but lacks adaptive radius).

---

# Connections

- **Builds on:**
  - Zahn 1971 [19] — original MST-based graph segmentation; this paper's greedy merge is structurally the same but with an adaptive stopping criterion.
  - Urquhart 1982 [15] — normalised MST edge weights; predecessor that the paper explicitly improves upon.
  - Wu-Leahy 1993 [18] — minimum graph cut for image segmentation; identified the small-component bias that Shi-Malik addressed.
  - Shi-Malik 2000 [14] — normalised cuts; establishes the non-local property goal; this paper achieves comparable non-locality with $O(n \log n)$ vs. $O(n^{1.5}+)$.
  - Comaniciu-Meer 1997/1999 [3, 4] — mean-shift / feature-space clustering; closely related to the nearest-neighbour graph variant (Section 6 explicitly draws the connection).
  - Cormen-Leiserson-Rivest [6] — Kruskal's MST algorithm and union-find; the algorithm is essentially Kruskal with a modified merge condition.

- **Enables:** downstream selective-search style object proposals (this paper is a
  standard ingredient); superpixel-based pre-processing for detectors; region-based
  stereo support region estimation.

- **Refutes / supersedes:** None claimed by the authors. This paper offers a
  complementary point in the design space — tractable and fast — rather than
  superseding any prior work.

---

# Atlas update plan

This paper opens the **image segmentation** branch of the Atlas. A new algorithm page is warranted.

## NEW: felzenszwalb-graph-segmentation
Type: algorithm
Category: segmentation (new top-level category — first member; future siblings: mean-shift, normalised cuts, watershed, SLIC superpixels, etc.)
Primary source: this paper (`felzenszwalb2004-graph-segm`)

### Goal
- Partition an image into perceptually coherent regions in $O(n \log n)$ time, without fixing the region count, by greedily merging components when the inter-component dissimilarity is small relative to each component's internal variability.
- Inputs: image (grayscale or RGB); a graph $G=(V,E)$ over pixels with non-negative dissimilarity weights; parameters $\sigma$ (Gaussian smoothing), $k$ (scale-of-observation prior), $m_\text{min}$ (optional post-filter min component size).
- Outputs: a segmentation $S$ — a partition of $V$ into connected components — that satisfies the formal "neither too fine nor too coarse" properties (Theorems 1–2 of the paper).

### Algorithm
- Define $\text{Int}(C) = \max_{e \in \mathrm{MST}(C,E)} w(e)$, $\text{Dif}(C_1,C_2) = \min_{(v_i,v_j)\in E,\,v_i\in C_1,v_j\in C_2} w(v_i,v_j)$, and the size-adaptive threshold $\tau(C) = k/|C|$.
- Boundary predicate: $D(C_1,C_2) = [\text{Dif}(C_1,C_2) > \min(\text{Int}(C_1)+\tau(C_1),\,\text{Int}(C_2)+\tau(C_2))]$.
- Algorithm 1: sort all $m$ edges in non-decreasing order; initialise each pixel to its own component; for each edge $(v_i,v_j)$ in order, merge the two components if and only if the edge weight does not exceed $\text{MInt}$ at that moment. Maintain components with union-find (path compression + union by rank). Because edges are visited in order, $\text{Int}$ updates in $O(1)$ per merge — it is just the weight of the most recent merge edge.
- Two graph constructions: (a) **grid graph** with 8-connected neighbours, weight $w(v_i,v_j) = |I(p_i) - I(p_j)|$, $m = O(n)$ edges, runtime $O(n \log n)$; (b) **feature-space (NN) graph** embedding each pixel as $(x,y,r,g,b)$ with L2 distance, top-10 nearest neighbours per pixel, captures spatially disjoint texturally-coherent regions.
- Pre-process: smooth image with Gaussian $\sigma = 0.8$ (no visible change but suppresses digitisation noise). Post-process: optionally merge any component below a min-size threshold $m_\text{min}$ into its closest neighbour.
- Color: run three independent monochrome segmentations on R, G, B and intersect (better than a single combined-channel weight, per the paper).

### Implementation
- Reference C++ implementation by Felzenszwalb is the canonical baseline; widely re-implemented (Python skimage `felzenszwalb`, OpenCV `ximgproc::createGraphSegmentation`, etc.).
- For Vitavision: a WASM port is feasible but currently out of scope. Defer the implementation snippet to a Rust/WASM port in `vision-metrology` if/when added. For the page, show pseudocode of Algorithm 1 with the union-find merge step.
- Note `quality:` field: omit (default published page).

### Remarks
- **Sensitivity to $k$ relative to image size.** Because $\tau(C) = k/|C|$, the same $k$ behaves differently on a thumbnail vs a full-resolution image. The paper uses $k = 150$ for $128\times128$ and $k = 300$ for $320\times240$+; rescale $k$ proportionally to pixel count for new image sizes.
- **The min-edge $\text{Dif}$ is fragile.** A single low-weight edge between two distinct regions chains them together. Any quantile-based variant ($K$-th smallest cross-boundary weight) makes optimal segmentation NP-hard (Theorem 4) — there is no easy robust replacement.
- **Order-independence (Theorem 3).** Tie-breaking on equal-weight edges does not affect the final segmentation. Useful for reproducibility on integer weights.
- **Grid mode produces only spatially-connected components**, which suits most natural-image use cases but blocks "all the red flowers" type segmentation. Use NN-graph mode for that.
- **Use cases beyond direct segmentation:** selective-search-style object proposals, superpixel preprocessing for detection/recognition, stereo support regions.

### References
- Primary: `felzenszwalb2004-graph-segm`.
- Related (paper's prior art): Zahn 1971 graph-clustering MST, Urquhart 1982 normalised MST, Wu-Leahy 1993 minimum graph cuts, Shi-Malik 2000 normalised cuts, Comaniciu-Meer 1999/2002 mean-shift. None currently in the Atlas — register them on demand if a sibling page is added.

### Relations
None at present. Once sibling segmentation pages are added (mean-shift, normalised cuts, watershed, SLIC), populate `relations[]` with `parallel_foundation_with` (peer foundational segmentation methods of similar era) and `compared_with` (practitioner-choice peers). For now, the page stands alone in the segmentation category.

---

# Provenance

All constants, equations, and symbols below are traceable to specific locations in
the cache file (`felzenszwalb2004-graph-segm.txt`):

| Claim / Symbol | Source location |
|---|---|
| $\text{Int}(C) = \max_{e \in \mathrm{MST}(C,E)} w(e)$ | Section 3.1, Equation (1), lines 257–258 |
| $\text{Dif}(C_1, C_2) = \min w(v_i, v_j)$ over cross-boundary edges | Section 3.1, Equation (2), lines 265–266 |
| $D(C_1, C_2) = [\text{Dif}(C_1,C_2) > \text{MInt}(C_1,C_2)]$ | Section 3.1, Equation (3), lines 283–285 |
| $\text{MInt}(C_1, C_2) = \min(\text{Int}(C_1)+\tau(C_1), \text{Int}(C_2)+\tau(C_2))$ | Section 3.1, Equation (4), lines 290–291 |
| $\tau(C) = k/|C|$ | Section 3.1, Equation (5), lines 298–300 |
| $k$ is not a minimum component size | Section 3.1, lines 303–304 |
| Algorithm 1 (sort → initialise → greedy merge) | Section 4, Algorithm 1 box, lines 371–381 |
| Theorems 1–3 (not too fine, not too coarse, order-independent) | Section 4, lines 410–467 |
| Union-find with path compression + union by rank; Steps 1–3 cost $O(m\,\alpha(m,n))$ | Section 4.1, lines 477–490 |
| Overall runtime $O(m \log m)$ | Section 4, line 363; Section 7, line 681 |
| $O(n \log n)$ for grid graphs ($m = O(n)$) | Section 5, lines 500–501 |
| $\sigma = 0.8$ Gaussian smoothing | Section 5, lines 508–509 |
| $k = 150$ for $128 \times 128$; $k = 300$ for $320 \times 240$+ | Section 5, lines 525–527 |
| Color: intersect three per-channel segmentations | Section 5, lines 511–516 |
| Feature space $(x,y,r,g,b)$ with L2 distance; 10 nearest neighbours | Section 6, lines 585–588, 634–635 |
| Quantile Dif → NP-hard (Theorem 4) | Appendix, lines 791–792 |
| Reduction from min-ratio-cut with uniform capacities | Appendix, Lemma 2, lines 761–785 |
| Single cheap bridge acknowledged as limitation | Section 7, lines 683–686 |
| Narrow "boundary region" artefact (jacket/shirt) | Section 5, lines 558–563 |
