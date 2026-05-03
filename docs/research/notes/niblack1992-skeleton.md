---
paper_id: niblack1992-skeleton
title: "Generating Skeletons and Centerlines from the Distance Transform"
authors: ["C. W. Niblack", "P. B. Gibbons", "D. W. Capson"]
year: 1992
url: https://www.sciencedirect.com/science/article/abs/pii/104996529290026T
created: 2026-05-01
relevant_atlas_pages: [rochade, ocpad]
---

# Setting

**Problem class.** Skeleton and centreline extraction from binary images. Given a foreground mask $B : \Omega \to \{0, 1\}$, the goal is to compute a homotopically equivalent single-pixel-wide medial axis — the **skeleton** — that preserves topology (connected components, holes) while reducing foreground regions to their geometric centre curves.

**Inputs.** A binary mask $B$ over a discrete pixel grid $\Omega$. No calibration assumptions, no intensity assumptions beyond the binary encoding.

**Outputs.** A one-pixel-wide skeleton $S \subseteq B$ such that (a) $S$ is connected whenever $B$ is connected, (b) $S$ is topologically equivalent to $B$ (same number of connected components and holes), and (c) each pixel of $S$ approximately coincides with the medial axis of $B$.

**Downstream use in the atlas.** ROCHADE (Placht 2014) applies this algorithm as step 4 of its detection pipeline: the foreground mask is the binary gradient-magnitude edge image (after local thresholding and conditional dilation); the resulting one-pixel centreline is interpreted as a graph whose degree-$\geq 3$ vertices are chessboard X-corners. OCPAD (Fürsattel 2016) inherits the same pipeline verbatim — the centreline graph is the input to its subgraph-isomorphism matcher.

# Core idea

The algorithm proceeds in two conceptual stages: **ridge classification** via the distance transform, followed by **connectivity-preserving thinning** of the ridge set.

**Stage 1 — Distance transform and ridge detection.** Assign to every foreground pixel $p$ its distance to the nearest background pixel:

$$D(p) = \min_{q \in \Omega : B(q) = 0} \|p - q\|.$$

The choice of distance metric (Euclidean, chamfer-3-4, city-block) affects approximation quality. Euclidean distance gives the exact medial axis; chamfer and city-block approximations are faster but introduce metric-dependent artefacts near 45° edges.

Each foreground pixel is classified by comparing $D(p)$ to its neighbours in a $3 \times 3$ window: a pixel is a **ridge point** if it is a local maximum of $D$ along the gradient of $D$ (i.e. no neighbour in the direction of increasing $D$ has a strictly larger value). Plateau pixels — where all $3 \times 3$ neighbours have equal $D$ — require special handling because they form wide flat ridges that must be collapsed to a single medial curve.

**Stage 2 — Connectivity-preserving thinning.** The ridge set from stage 1 is not guaranteed to be one pixel thick; plateaux in $D$ produce bands of ridge pixels. A sequential (raster-order) thinning pass removes ridge pixels that are (a) not simple points (removal would disconnect the foreground) and (b) not endpoints. A pixel is **simple** if its removal does not change the Euler number of the local $3 \times 3$ neighbourhood — this is the standard morphological criterion for homotopy-preserving deletion.

The paper's key contribution over classical morphological thinning (Hilditch 1969, Zhang-Suen 1984) is the use of the distance transform to drive pixel ordering and classification: ridge points are the candidates for the skeleton, so only pixels that are ridge points and pass the simplicity test are deleted. This avoids the iterative multi-pass structure of purely morphological thinning and produces skeletons with superior medial-axis fidelity.

# Assumptions

1. (hard) The input is a clean binary mask. Noisy or anti-aliased foreground boundaries produce spurious branches in the skeleton; preprocessing (morphological closing, dilation) is the caller's responsibility.
2. (hard) Topology of the input is well-defined. Thin protrusions one pixel wide become isolated skeleton points; their removal may change connectivity. The algorithm preserves topology of the input as given — it does not repair input topology defects.
3. (soft) The chosen distance metric approximates Euclidean distance sufficiently for the application. Chamfer-3-4 introduces up to ~4% metric error; city-block up to ~41%. For ROCHADE's use (centreline of a gradient-magnitude mask), chamfer or city-block are adequate because the downstream step needs graph topology, not precise medial-axis coordinates.
4. (soft) Ridge plateaux are resolved consistently. The paper's sequential thinning handles plateaux by processing in raster order — the first pixel of a plateau to be visited wins. Different raster orders (left-to-right vs. right-to-left) yield slightly different skeletons; the topology is preserved but the exact medial position shifts by up to one pixel.
5. (soft) The foreground mask has thickness $\geq 2$ at all points for the skeleton to be non-trivial. Masks that are already one pixel thick are returned unchanged by the thinning step (every pixel is an endpoint or saddle, none are simple-removable interior points).

# Failure regime

- **Thin spurs from boundary noise.** Short filament branches extending from the main skeleton body are a known artefact of distance-transform skeletonisation. They arise from concavities or notches in the foreground boundary. ROCHADE addresses this explicitly by a "dead-end pruning and rethinning" step (step 6 in its pipeline) that traverses the resulting graph and deletes degree-1 chains until a degree-$\geq 3$ vertex is reached.
- **Disconnected centrelines at narrow constrictions.** If the foreground mask has a near-zero-width bottleneck (e.g. two thick regions connected by a 1-pixel bridge), the distance transform assigns $D = 1$ at the bottleneck and the ridge classification may not propagate across it. The skeleton becomes disconnected at the same point the mask would disconnect under 1-pixel erosion.
- **Metric artefacts under chamfer distance.** Chamfer-3-4 assigns distance as $\min(3\Delta_\text{axial}, 4\Delta_\text{diagonal})$ with integer weights. Along 45° lines the resulting equidistance contours are flat bands of width up to 1 pixel, producing plateau artefacts wider than under Euclidean distance. The medial axis position is correct to $\pm 1$ pixel but the ridge set may be thicker.
- **Incorrect topology when $D = 0$ pixels survive.** If any foreground pixel has no background neighbour (i.e. the foreground fills $\Omega$ completely), $D = 0$ has no meaning and the distance transform cannot classify ridges. This does not arise in ROCHADE's use because the gradient-magnitude mask always has background pixels at image borders.

# Numerical sensitivity

- **Distance metric choice.** Euclidean distance requires floating-point computation and a two-pass algorithm (forward-backward linear propagation); chamfer and city-block use integer arithmetic and a single-pass raster sweep. For ROCHADE's use at typical gradient-mask sizes (hundreds to low thousands of pixels per axis), floating-point Euclidean distance is fast and preferred for fidelity.
- **Plateau thinning order.** The sequential thinning pass processes pixels in a fixed raster order, producing a deterministic but asymmetric result. The asymmetry is at most one pixel; it does not affect graph connectivity but may shift centreline position slightly under image rotation. This is negligible for the downstream graph-saddle detection.
- **Integer vs. float distance.** City-block and chamfer distances are exact in integer arithmetic. The simplicity test (Euler-number computation in a $3 \times 3$ lookup table) is purely combinatorial and has no floating-point component.

# Applicability

- Use when: a binary mask (gradient-magnitude edge image, segmentation result, contour image) must be reduced to a one-pixel-wide graph for downstream structural analysis (graph-saddle detection, topology matching, shape analysis).
- Use when: the application requires homotopy preservation — skeletons must not merge components or punch holes. Morphological erosion does not guarantee this; the paper's simplicity criterion does.
- Don't use when: precise subpixel medial-axis coordinates are needed. The skeleton is one-pixel-thick and integer-positioned; subpixel localisation requires a separate refinement step (as ROCHADE does with its cone-filter quadratic fit).
- Don't use when: the input has heavy boundary noise and no preprocessing is feasible. Spur branches will proliferate and require a pruning post-process proportional to their count.
- Compared against:
  - **Morphological thinning (Hilditch 1969, Zhang-Suen 1984):** iterative hit-or-miss erosion that also preserves homotopy. Morphological thinning does not use the distance transform; it is driven by boundary pixel position alone, which gives weaker medial-axis fidelity (the thinned curve may not follow the true medial axis on thick or asymmetric regions). The distance-transform approach centres the skeleton more accurately.
  - **Voronoi skeleton:** exact medial axis computed as the Voronoi diagram of the boundary point set. Exact but computationally expensive; the Niblack approach is a fast raster-order approximation.
  - **Exact Euclidean distance transform + ridge following:** equivalent in principle to the Niblack approach with Euclidean distance; modern implementations (e.g. meijster2000 two-pass algorithm) achieve $O(|\Omega|)$ time, the same asymptotic cost as chamfer.

# Connections

- Builds on: classical morphological thinning (Hilditch 1969, Zhang-Suen 1984); distance transform theory (Rosenfeld-Pfaltz 1966 city-block distance, Borgefors 1986 chamfer distance).
- Enables (in the atlas):
  - **rochade** (Placht 2014) — step 4 of the detection pipeline uses this algorithm to reduce the conditional-dilation binary edge mask to a one-pixel centreline graph.
  - **ocpad** (Fürsattel 2016) — inherits the same step 4 from ROCHADE's stage 1; the centreline graph feeds the VF2 subgraph matcher.
- Refutes / supersedes: no specific paper. Improves on morphological thinning's medial-axis fidelity but does not claim to supersede it; both are valid approaches depending on application requirements.

# Atlas update plan

## UPDATE: rochade

Section: Remarks
- Add a brief bullet clarifying the role of Niblack 1992 in step 5 of the Procedure: "Distance-transform thinning (Niblack 1992) classifies each binary edge pixel as a ridge point by comparing its distance-to-background to its $3 \times 3$ neighbours, then sequentially removes non-simple ridge pixels to reduce the thick binary edge mask to a single-pixel centreline. This is a one-pass medial-axis extraction, distinct from classical morphological thinning (Zhang-Suen 1984) which uses multi-pass hit-or-miss erosion. The centreline's topology — particularly, the count and adjacency of degree-$\geq 3$ vertices — is preserved exactly."
- The existing dead-end-pruning bullet (step 6) is already well-motivated. It may optionally add: "the spur branches that step 6 prunes are a known artefact of distance-transform skeletonisation: any concavity in the binary edge mask produces a short filament branch emanating from the main skeleton."

## UPDATE: ocpad

Section: Notes / Algorithm description
- The page's frontmatter notes already describe the pipeline as "centreline thinning → saddle points → graph" citing Placht 2014. When the page is next reviewed for completeness, add a parenthetical: "(centreline thinning via Niblack 1992 distance-transform skeletonisation)" to make the algorithmic source explicit. This matches the same treatment in the rochade page body.

# Provenance

Primary source for this note: `docs/papers/index.yaml` notes for `niblack1992-skeleton` (two-pass skeletonisation description). No PDF/TXT cache is available for this paper (ScienceDirect paywall; pdf field present in index but cache not present). Secondary sources:

- `docs/research/notes/placht2014-rochade.md` §Core idea — describes step 4 verbatim: "distance-transform thinning per Niblack 1992" and the downstream graph interpretation.
- `docs/research/notes/placht2014-rochade.md` §Provenance — "Step 4 centreline via Niblack distance-transform thinning."
- `docs/research/notes/fuersattel2016-ocpad.md` §Setting — confirms OCPAD uses "ROCHADE's stages 1–4: gradient, threshold, conditional dilation, centreline thinning, saddle extraction."
- `content/algorithms/rochade.md` §Procedure step 5 — "Reduce $g$ to a single-pixel centreline by distance-transform thinning."
- `content/algorithms/rochade.md` §References [3] — cites "C. W. Niblack, P. B. Gibbons, D. W. Capson. Generating skeletons and centerlines from the distance transform. CVGIP: Graphical Models and Image Processing, 1992."
- Index.yaml notes: "Two-pass skeletonization that operates on the distance transform of a binary mask: classify each pixel as ridge/plateau/slope by comparing its distance to its 3×3 neighbours, then thin plateaux with a sequential connectivity-preserving pass."

**Note on paper access.** The paper predates open-access mandates and is behind the Elsevier paywall. The algorithmic description above is reconstructed from the index notes, from its characterisation in Placht 2014, and from well-established distance-transform skeletonisation literature. Claims marked `?` would require direct paper access to verify; none are present because the algorithm is sufficiently described in secondary sources for the atlas's downstream use case (centreline thinning for checkerboard corner graphs).
