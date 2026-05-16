---
title: "Topological Grid Recovery"
date: 2026-05-02
summary: "Verify candidate calibration-pattern corners by constructing a graph over them (Delaunay triangulation, k-nearest-neighbours, or proximity) and accepting only configurations that match the expected chessboard topology — false positives are eliminated by structural rules rather than per-pixel response thresholds."
tags: ["chessboard", "graph-based"]
author: "Vitaly Vorobyev"
domain: features
difficulty: advanced
prerequisites: []
sources:
  references:
    - shu2009-topological
    - laureano2013-topological
    - fuersattel2016-ocpad
    - stelldinger2024-puzzleboard
---

# Definition

Topological grid recovery is a class of post-detection verification strategies for chessboard corner detectors. The pipeline runs in two phases: a cheap, permissive corner detector first emits candidate locations, then a graph is built over the candidates and only those that participate in a valid chessboard topology survive. The defining property: false positives are pruned by structural rules — counts of same-colour neighbours, alternating-colour cycles, valid quad orderings — rather than by tightening the per-pixel response threshold. This decouples sensitivity (the detector's recall) from specificity (the topology filter's precision), which is the key idea common to four of the chessboard X-corner pipelines in the atlas.

# Mathematical Description

## The shared shape

Let $C \subset \mathbb{Z}^2$ be the set of candidate corner pixels emitted by a per-pixel detector (Harris, ChESS, Hessian saddle, FAST-derived). Build a proximity graph $G = (C, E)$ over the candidates — typically one of:

- **Delaunay triangulation** $\mathrm{Del}(C)$ — the unique triangulation in which no triangle's circumcircle contains another candidate. Used by shu2009 and laureano2013.
- **$k$-nearest-neighbour graph** — each vertex linked to its $k$ closest neighbours. PuzzleBoard uses $k = 9$.
- **Subgraph search target** — a regular $r \times c$ chessboard graph $G^*$ that the detected graph $G$ must contain. Used by OCPAD via the VF2 subgraph-isomorphism algorithm.

A topology filter $\mathcal{F}: G \to G'$ removes vertices and edges that violate the expected chessboard structure. The filter is applied to fixed point: orphan vertices are discarded, and the surviving subgraph carries the integer pattern coordinates.

## Variants — what "topology" means in each method

Each of the four methods picks a different graph model and a different filter:

:::definition[Quad-level filter (Shu 2009)]
The Delaunay graph $\mathrm{Del}(C)$ is reduced to its 4-cycles. A vertex is legal iff every quad incident to it has alternating black-white interior labels (assuming the candidates split into two colour classes from a binarised image). Empirical: at least one same-colour neighbour, at most two — three or more same-colour neighbours indicates the candidate sits at the edge between two black or two white squares, contradicting the X-corner topology.
:::

:::definition[Triangle-level filter (Laureano 2013)]
Same Delaunay graph, but the unit of filtering is the triangle. A triangle is legal iff (i) its three vertices have uniform interior colour after Bradley-Roth adaptive binarisation (§3 of the paper), (ii) it has at least one same-colour neighbouring triangle, (iii) it has at most two same-colour neighbours. Iterate the filter until a fixed point is reached, then drop orphan vertices. Coordinate propagation from a seed triangle pair via reflection across shared edges (§4) carries the pattern indices.
:::

:::definition[Subgraph-isomorphism filter (OCPAD, Fürsattel 2016)]
Build a quad-mesh graph from the candidates. The expected pattern is the regular $r \times c$ checkerboard graph $G^*$. Search for the largest subgraph $G' \subseteq G$ isomorphic to a sub-rectangle of $G^*$ via VF2 (Cordella 2004). Tolerates extra edges, extra vertices, and missing vertices simultaneously — the central differentiator from Shu and Laureano, which require a connected, complete patch.
:::

:::definition[Minimum-spanning-forest filter (PuzzleBoard, Stelldinger 2024)]
Build the 9-NN graph over saddle candidates; disambiguate "direct" (axis-aligned) edges from "diagonal" edges using each vertex's Hessian eigenvector directions. Prune diagonals; run Kruskal's MSF with union-find on the remaining direct-edge graph; absolute pattern coordinates come from cross-correlation against two cyclic binary de-Bruijn maps embedded in the pattern (§4.3).
:::

## Detection–verification decoupling

The four methods share an architectural pattern, even though their graphs and filters differ. In each:

1. The per-pixel detector is configured permissively — high recall, accepting many false positives. ChESS in [Laureano](/atlas/laureano-topological-chessboard); Harris-on-the-Bresenham-ring in [Shu](/atlas/shu-topological-grid); Hessian saddle in [PuzzleBoard](/atlas/puzzleboard) and [OCPAD](/atlas/ocpad)'s underlying detector.
2. The topology filter handles specificity. The filter's parameters are typically robust thresholds (count of same-colour neighbours, $k$ in $k$-NN, distance ratios in VF2's matching condition) — far less sensitive to per-image contrast than the detector's threshold would be.

This decoupling is what makes these pipelines competitive on degraded inputs (motion blur, low contrast, partial occlusion) where pure response-threshold detectors collapse.

## Comparison summary

| Method | Graph | Filter unit | Tolerates partial board? | Recovers absolute index? |
|---|---|---|---|---|
| [Shu](/atlas/shu-topological-grid) | Delaunay | 4-cycle | Yes (locally) | Requires three-circle markers |
| [Laureano](/atlas/laureano-topological-chessboard) | Delaunay | Triangle | Yes (locally) | Reflection from seed triangle |
| [OCPAD](/atlas/ocpad) | Quad-mesh + reference graph | Subgraph isomorphism | Yes (globally, via VF2) | After matching to $G^*$ |
| [PuzzleBoard](/atlas/puzzleboard) | 9-NN | MSF on direct edges | Yes (any local window) | From cross-correlation against de-Bruijn map |

# Numerical Concerns

**Delaunay degeneracy at small angles.** The Delaunay triangulation is well-defined only when no four candidates are co-circular and no three are collinear. Under heavy projective distortion or very densely packed corners (low-resolution boards), near-degenerate configurations occur and the resulting triangulation is unstable — a small perturbation flips edges. Shu reports that the topology filter remains effective up to $\sim 60°$ Delaunay-rotation invariance (Fig. 4) but no theoretical bound exists; this is an open problem in the chessboard-detection literature.

**Same-colour-neighbour boundary.** Both Shu and Laureano use a "same-colour neighbour" predicate that depends on a binarisation of the image. At pattern boundaries, the binarisation can label an external square inconsistently. A small inset margin $\delta$ (Shu: 5 px) excludes pixels within $\delta$ of the candidate edge from the colour test.

**Subgraph isomorphism complexity.** VF2 is worst-case exponential; OCPAD bounds the search via depth-3 BFS anchor-selection (the most-connected node serves as the search root). For pattern sizes up to $\sim 10 \times 7$ on commodity hardware, end-to-end OCPAD runs in single-digit milliseconds (§4 of paper). Larger patterns or denser candidate sets push the cost; alternative subgraph algorithms (RI, LAD) are valid drop-ins.

**Iterative filter convergence.** Triangle-level (Laureano) and quad-level (Shu) filters are applied iteratively: removing one orphan vertex can promote its neighbour to an orphan in the next iteration. Convergence is monotone (the candidate set only shrinks) and terminates in at most $|C|$ iterations; in practice 3–5 iterations suffice on full boards.

**Anchor-vertex sensitivity.** OCPAD's subgraph search starts from a single anchor candidate (the highest-degree node within a depth-3 BFS). If the anchor is itself a false positive, the search returns nothing — but the cost of trying an alternative anchor is small and OCPAD does so on failure.

**Cross-correlation decoding window.** PuzzleBoard's absolute-position recovery requires a sub-window of the 501×501 grid aligned with the detected MSF; the cross-correlation operates on $167 \times 333$ and $333 \times 167$ binary de-Bruijn maps. For a too-small detected window (fewer than $\sim 5 \times 5$ corners), the correlation peak is ambiguous and absolute decoding fails — though local detection still succeeds.

# Where it appears

The four methods listed above are the atlas instances; ChESS itself does not include topological recovery (it's a pure per-pixel detector), which is one reason it is often paired with one of the topology filters as a downstream verifier in larger pipelines. The Hillen 2023 GP-enhancement (forthcoming page once the index is updated) is a non-topological alternative — it predicts missing corners via Gaussian-process regression rather than verifying via graph rules. The two approaches are complementary: topology filters reject false positives via structure; GP enhancement extrapolates true positives via smoothness.

# References

1. C. Shu et al. *Topological Grid Finding* (2009). Quad-level Delaunay topology filter.
2. C. Laureano, V. Murino. *Chessboard Detection via X-Corners and Topology* (2013). Triangle-level Delaunay filter; Chen-Zhang Hessian subpixel refinement at surviving vertices.
3. P. Fürsattel et al. *OCPAD: Occluded Checkerboard Pattern Detection* (2016). Subgraph-isomorphism filter via VF2.
4. P. Stelldinger, N. Lanwer. *PuzzleBoard: A New Camera Calibration Pattern with Position Encoding.* DAGM-GCPR 2024. (MSF on 9-NN; cross-correlation against de-Bruijn map.)
5. L. Cordella et al. *A (sub)graph isomorphism algorithm for matching large graphs.* IEEE TPAMI 26(10):1367–1372, 2004. (VF2 algorithm used by OCPAD.)
