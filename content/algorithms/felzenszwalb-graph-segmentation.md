---
title: "Felzenszwalb–Huttenlocher Graph-Based Image Segmentation"
date: 2026-05-10
summary: "Partition an image into perceptually coherent regions by a Kruskal-style greedy merge over a pixel graph, accepting an inter-component edge as a non-boundary when its weight does not exceed the components' internal variation plus a size-adaptive threshold $\\tau(C) = k/|C|$; runs in $O(m \\log m)$ time and produces partitions that are simultaneously not too fine and not too coarse."
tags: ["graph-based"]
domain: segmentation
tasks: ["image-segmentation"]
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: [energy-minimization]
failureModes: []
sources:
  primary: felzenszwalb2004-graph-segm
  notes: |
    Three named quantities: Int(C) = max edge in MST(C) (Eq. 1); Dif(C₁,C₂) =
    min cross-boundary edge weight (Eq. 2); MInt = min(Int(Cᵢ) + τ(Cᵢ)) with
    τ(C) = k/|C| (Eqs. 4–5). Boundary predicate D = [Dif > MInt] (Eq. 3).
    Algorithm: sort all edges by weight (non-decreasing), then for each edge
    in order union-find-merge if w ≤ MInt at that moment (Algorithm 1).
    Because edges are visited in sorted order, the merge edge is always the
    minimum-weight edge between the two components — identical to Kruskal's
    MST criterion — so Int updates in O(1) per merge (Section 4.1).
    Two graph constructions: 8-connected grid (m = O(n), runtime
    O(n log n)) and feature-space NN graph on (x, y, r, g, b) with 10
    nearest neighbours (Section 6). Pre-process: Gaussian smoothing with
    σ = 0.8. Recommended k: 150 for 128×128 images, 300 for 320×240+.
    Color: run three independent monochrome segmentations and intersect.
    Theorems: (1) not too fine — every adjacent component pair has a boundary
    edge satisfying D; (2) not too coarse — no proper refinement preserves
    (1); (3) order-independent on equal-weight ties. Theorem 4: replacing
    min in Dif with any K-th quantile makes optimal segmentation NP-hard.
---

# Goal

Partition an image $I: \Omega \to \mathbb{R}$ (or $I: \Omega \to \mathbb{R}^3$ for colour) into perceptually coherent regions without fixing the number of regions. Input: an image $I$; a non-negative dissimilarity weight graph $G = (V, E)$ over pixels (8-connected grid or $k$-nearest-neighbour in feature space); a Gaussian smoothing scale $\sigma$; a scale-of-observation parameter $k$; and an optional minimum component size $m_\text{min}$. Output: a segmentation $S = \{C_1, \ldots, C_r\}$ — a partition of $V$ into connected components — satisfying the formal properties of being *neither too fine nor too coarse*: no neighbouring pair of output components lacks evidence of a boundary (Theorem 1), and no proper refinement of $S$ also satisfies that condition (Theorem 2). The boundary predicate is

$$
D(C_1, C_2) = \bigl[\,\text{Dif}(C_1, C_2) > \text{MInt}(C_1, C_2)\,\bigr],
$$

with the size-adaptive threshold $\tau(C) = k/|C|$ controlling the scale at which evidence accumulates. The greedy Kruskal-style merge runs in $O(m \log m)$ — $O(n \log n)$ for grid graphs where $m = O(n)$.

# Algorithm

Let $G = (V, E)$ denote the graph of pixels and their connections. Let $w(v_i, v_j)$ denote the non-negative dissimilarity weight on edge $(v_i, v_j) \in E$. Let $C \subseteq V$ denote a component (segment). Let $|C|$ denote the number of vertices in $C$. Let $\mathrm{MST}(C, E)$ denote the minimum spanning tree of $C$ using edges in $E$. Let $k > 0$ denote the scale-of-observation parameter. Let $\sigma \geq 0$ denote the Gaussian smoothing scale. Let $m_\text{min}$ denote the optional minimum component size.

:::definition[Internal variation]
The maximum edge weight in the minimum spanning tree of component $C$ — the heaviest link that must be cut to split the component:

$$
\text{Int}(C) = \max_{e \in \mathrm{MST}(C, E)} w(e). \tag{Eq. 1}
$$
:::

:::definition[Pairwise difference]
The minimum weight over all edges crossing the boundary between $C_1$ and $C_2$ — the cheapest available bridge:

$$
\text{Dif}(C_1, C_2) = \min_{\substack{(v_i, v_j) \in E \\ v_i \in C_1,\; v_j \in C_2}} w(v_i, v_j). \tag{Eq. 2}
$$
:::

:::definition[Minimum internal difference]
The smaller of the two components' internal variations, each inflated by a size-adaptive prior $\tau(C) = k/|C|$:

$$
\text{MInt}(C_1, C_2) = \min\!\bigl(\text{Int}(C_1) + \tau(C_1),\; \text{Int}(C_2) + \tau(C_2)\bigr), \tag{Eq. 4}
$$

where

$$
\tau(C) = \frac{k}{|C|}. \tag{Eq. 5}
$$

For a singleton component $\text{Int}(C) = 0$; the prior $\tau$ supplies the minimum required cross-boundary gap before the component is kept separate. As $|C|$ grows, $\tau \to 0$ and the criterion approaches a bare MST-weight comparison. The parameter $k$ sets the scale of observation but is not a minimum component size — a small component survives when the boundary evidence is strong.
:::

The boundary predicate $D(C_1, C_2)$ is true (a boundary exists between $C_1$ and $C_2$) when:

$$
D(C_1, C_2) = \bigl[\,\text{Dif}(C_1, C_2) > \text{MInt}(C_1, C_2)\,\bigr]. \tag{Eq. 3}
$$

## Graph constructions

**Grid graph.** Each pixel $p_i$ is a vertex; edges connect each pixel to its 8 spatial neighbours with weight $w(v_i, v_j) = |I(p_i) - I(p_j)|$. The edge count is $m = O(n)$, giving $O(n \log n)$ total runtime. Components formed by this construction are spatially connected.

**Feature-space (nearest-neighbour) graph.** Each pixel is embedded as the five-dimensional point $(x, y, r, g, b)$ with L2 distance as edge weight. Edges connect each pixel to its 10 nearest neighbours; an approximate nearest-neighbour structure builds the graph in sub-quadratic time. This construction permits spatially disjoint but texturally coherent regions to be co-segmented.

## Procedure

:::algorithm[Felzenszwalb–Huttenlocher graph segmentation]
::input[Image $I$; graph $G = (V, E)$ with $m = |E|$ edges carrying non-negative weights; parameters $\sigma$, $k$, $m_\text{min}$.]
::output[Segmentation $S$ — a partition of $V$ into components satisfying $D$ neither too fine nor too coarse (Theorems 1–2). Each component labelled by its union-find representative.]

1. **Smooth.** Apply a Gaussian of scale $\sigma = 0.8$ to $I$ to suppress digitisation noise. For grid graphs, compute edge weights $w(v_i, v_j) = |I(p_i) - I(p_j)|$ on the smoothed image. For feature-space graphs, compute L2 distances in the $(x, y, r, g, b)$ embedding.
2. **Sort edges.** Produce the ordered sequence $\pi = (o_1, o_2, \ldots, o_m)$ of all edges in non-decreasing order of weight. For 8-bit integer weights, counting sort achieves this in $O(m)$.
3. **Initialise.** Assign each vertex $v_i \in V$ to its own singleton component; set $\text{Int}(C_i^0) = 0$ for all $i$. Use a union-find structure with path compression and union by rank.
4. **Greedy merge.** For $q = 1, \ldots, m$ in order: let $o_q = (v_i, v_j)$. If $v_i$ and $v_j$ belong to distinct components $C_i^{q-1}$ and $C_j^{q-1}$, and $w(o_q) \leq \text{MInt}(C_i^{q-1}, C_j^{q-1})$, then merge $C_i^{q-1}$ and $C_j^{q-1}$ into a single component; update $\text{Int}$ of the merged component to $w(o_q)$ in $O(1)$ (Lemma 1 — the merge edge is the maximum-weight MST edge of the merged component). Otherwise leave the partition unchanged.
5. **Post-filter (optional).** For each edge $(v_i, v_j)$ whose endpoints lie in different components: if $\min(|C_i|, |C_j|) < m_\text{min}$, merge those two components unconditionally.
6. **Return** the final partition $S^m$.
:::

The $O(1)$ per-merge update of $\text{Int}$ follows from the sorted edge order: because edges are visited in non-decreasing weight, the merge-triggering edge for any pair is always the minimum-weight edge between those components, and therefore the maximum-weight edge in the resulting component's MST.

# Implementation

The greedy merge loop in Rust:

```rust
struct UnionFind {
    parent: Vec<usize>,
    rank:   Vec<usize>,
    size:   Vec<usize>,
    int:    Vec<f32>,   // Int(C): max MST edge weight
}

impl UnionFind {
    fn new(n: usize) -> Self {
        Self {
            parent: (0..n).collect(),
            rank:   vec![0; n],
            size:   vec![1; n],
            int:    vec![0.0; n],
        }
    }

    fn find(&mut self, x: usize) -> usize {
        if self.parent[x] != x { self.parent[x] = self.find(self.parent[x]); }
        self.parent[x]
    }

    fn merge(&mut self, a: usize, b: usize, w: f32) {
        let (ra, rb) = (self.find(a), self.find(b));
        let (root, child) = if self.rank[ra] >= self.rank[rb] { (ra, rb) } else { (rb, ra) };
        self.parent[child] = root;
        if self.rank[root] == self.rank[child] { self.rank[root] += 1; }
        self.size[root]  += self.size[child];
        self.int[root]    = w;              // merge edge is max MST edge (Lemma 1)
    }
}

/// `edges`: sorted (weight, u, v) triples. `k`: scale parameter. `min_size`: 0 to skip.
fn segment(n: usize, edges: &[(f32, usize, usize)], k: f32, min_size: usize) -> UnionFind {
    let mut uf = UnionFind::new(n);
    for &(w, u, v) in edges {
        let (ru, rv) = (uf.find(u), uf.find(v));
        if ru == rv { continue; }
        let mint = (uf.int[ru] + k / uf.size[ru] as f32)
            .min(uf.int[rv] + k / uf.size[rv] as f32);
        if w <= mint { uf.merge(ru, rv, w); }
    }
    if min_size > 0 {
        for &(w, u, v) in edges {
            let (ru, rv) = (uf.find(u), uf.find(v));
            if ru != rv && (uf.size[ru] < min_size || uf.size[rv] < min_size) {
                uf.merge(ru, rv, w);
            }
        }
    }
    uf
}
```

The equivalent merge loop in Python with a minimal union-find:

```python
import numpy as np

class UF:
    def __init__(self, n):
        self.p    = list(range(n))
        self.rank = [0] * n
        self.size = [1] * n
        self.int_ = [0.0] * n          # Int(C)

    def find(self, x):
        while self.p[x] != x:
            self.p[x] = self.p[self.p[x]]
            x = self.p[x]
        return x

    def union(self, a, b, w):
        a, b = self.find(a), self.find(b)
        if self.rank[a] < self.rank[b]: a, b = b, a
        self.p[b] = a
        if self.rank[a] == self.rank[b]: self.rank[a] += 1
        self.size[a] += self.size[b]
        self.int_[a]  = w              # Lemma 1: merge edge is max MST edge

def felzenszwalb(n, edges_sorted, k, min_size=0):
    """edges_sorted: array of (w, u, v) sorted by w ascending."""
    uf = UF(n)
    for w, u, v in edges_sorted:
        ru, rv = uf.find(u), uf.find(v)
        if ru == rv: continue
        mint = min(uf.int_[ru] + k / uf.size[ru], uf.int_[rv] + k / uf.size[rv])
        if w <= mint:
            uf.union(ru, rv, w)
    if min_size:
        for w, u, v in edges_sorted:
            ru, rv = uf.find(u), uf.find(v)
            if ru != rv and min(uf.size[ru], uf.size[rv]) < min_size:
                uf.union(ru, rv, w)
    return uf
```

# Remarks

- **Complexity.** The overall runtime is $O(m \log m)$ dominated by the edge sort. For grid graphs ($m = O(n)$) this reduces to $O(n \log n)$; for 8-bit integer weights, counting sort lowers the sort to $O(m)$. Union-find operations (steps 3–4) cost $O(m\,\alpha(m, n))$ where $\alpha$ is the inverse Ackermann function, effectively $O(m)$.
- **$k$ scales with image resolution.** Because $\tau(C) = k/|C|$, the same numeric value of $k$ produces coarser segmentation on larger images. The paper uses $k = 150$ for $128 \times 128$ images and $k = 300$ for $320 \times 240$ or larger; rescale $k$ proportionally to pixel count when applying to new image sizes.
- **Single cheap bridge causes chaining.** $\text{Dif}(C_1, C_2)$ uses only the minimum cross-boundary edge. A single low-weight edge between two otherwise distinct regions suppresses boundary detection for the entire pair. No simple robustness fix is available: replacing the minimum with any quantile $K > 0$ of inter-component edge weights makes finding an optimal segmentation NP-hard (Theorem 4 — reduction from min-ratio-cut with uniform capacities and demands).
- **Grid mode produces only spatially connected components.** Texturally coherent but spatially disjoint regions (e.g., repeated objects of the same colour) cannot be captured with the 8-connected grid graph. The feature-space nearest-neighbour graph mode addresses this, embedding each pixel as $(x, y, r, g, b)$ with L2 distance and 10 nearest neighbours per pixel.
- **Colour images run three independent monochrome segmentations and intersect.** The R, G, and B channel segmentations are intersected: two pixels are co-segmented only if they co-segment in all three planes. This yields better results than a single segmentation on a combined-channel weight.
- **Order-independence.** Tie-breaking on equal-weight edges does not affect the final segmentation (Theorem 3), which aids reproducibility on integer-weight graphs.

# References

1. Felzenszwalb, P. F., & Huttenlocher, D. P. *Efficient Graph-Based Image Segmentation.* International Journal of Computer Vision, 59(2):167–181, 2004. [paper](https://cs.brown.edu/people/pfelzens/papers/seg-ijcv.pdf)
2. Zahn, C. T. *Graph-Theoretical Methods for Detecting and Describing Gestalt Clusters.* IEEE Transactions on Computers, 20(1):68–86, 1971. (MST-based graph segmentation antecedent; this paper uses the same greedy merge structure with an adaptive stopping criterion in place of a global threshold.)

<!-- TODO figure: τ(C) = k/|C| curves for k ∈ {150, 300, 600} on a log-scaled |C| axis, with annotated regions for "merge threshold dominated by τ" (small |C|) vs "dominated by Int" (large |C|). Generated SVG via py/generate_felzenszwalb-graph-segmentation_tau_curves.py modeled on py/generate_harris_eigenvalue_regions.py. -->

<!-- TODO figure: side-by-side schematic of grid (8-connected) vs feature-space (10-NN on (x,y,r,g,b)) graph modes — small lattice with neighbour edges, then a colour scatter with NN edges drawn. Hand-authored SVG under content/images/felzenszwalb-graph-segmentation/. -->

