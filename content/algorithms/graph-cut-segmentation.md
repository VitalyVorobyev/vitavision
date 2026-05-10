---
title: "Graph-Cut Interactive Segmentation"
date: 2026-05-10
summary: "Compute the global minimum of a binary region-and-boundary MRF energy as a single s-t min-cut on a pixel graph; user-marked seeds enter as hard constraints, the output is a binary labelling $A : P \\to \\{\\text{obj}, \\text{bkg}\\}$ with topology-free segments."
tags: ["image-segmentation", "graph-cut", "min-cut-max-flow", "markov-random-field", "interactive-segmentation"]
domain: segmentation
tasks: ["image-segmentation"]
author: "Vitaly Vorobyev"
difficulty: intermediate
prerequisites: []
failureModes: []
sources:
  primary: boykov2001-graph-cut-segmentation
  notes: |
    Energy E(A) = λR(A) + B(A) (Eq. 1). Region term R(A) = Σ_p Rp(Ap) with
    Rp("obj") = −ln Pr(Ip|O) and Rp("bkg") = −ln Pr(Ip|B) learnt from seed
    intensity histograms (§4 preamble). Boundary term B(A) = Σ B_{p,q}·δ
    with B_{p,q} ∝ exp(−(Ip−Iq)²/2σ²)/dist(p,q) (§4 preamble), σ estimated
    as camera noise. Graph (§3): node per pixel plus source S and sink T;
    n-links carry B_{p,q}; t-links carry λRp(·) for unlabelled pixels and
    K for seeds, with K = 1 + max_p Σ_q B_{p,q} so seeds are never severed
    by the minimum cut. Min-cut on this graph equals the global minimum of
    E(A) under the hard seed constraints (Theorem 1, §3). Neighbourhood is
    8-connected in 2D, 26-connected in 3D. On a new seed only the affected
    pixel's t-links change, so the existing flow can be re-augmented.
---

# Goal

An N-dimensional image $I: P \to \mathbb{R}$ and two disjoint user-marked seed sets $O \subset P$ (object) and $B \subset P$ (background) are the inputs. The output is a binary labelling $A: P \to \{\text{obj}, \text{bkg}\}$ that satisfies the hard constraints $\forall p \in O,\, A_p = \text{"obj"}$ and $\forall p \in B,\, A_p = \text{"bkg"}$, and is the global minimum of a combined region-and-boundary MRF energy $E(A)$. The global optimum is computed exactly via a single s-t min-cut on a pixel graph; both segments may consist of multiple disconnected components.

# Algorithm

Let $P$ denote the set of all pixels (or voxels). Let $N$ denote the neighbourhood system — 8-connectivity in 2D, 26-connectivity in 3D. Let $O \subset P$ and $B \subset P$ be the disjoint object and background seed sets. Let $A_p \in \{\text{"obj"}, \text{"bkg"}\}$ be the label assigned to pixel $p$. Let $I_p$ denote the intensity at pixel $p$. Let $\sigma > 0$ be the boundary contrast scale. Let $\lambda \geq 0$ be the scalar weight trading off the region term against the boundary term. Let $K$ be the seed-enforcing capacity. Let $S$ denote the source terminal (object) and $T$ the sink terminal (background).

:::definition[Energy E(A)]
The total energy over a labelling $A$ combines a region term and a boundary term.

$$E(A) = \lambda \cdot R(A) + B(A).$$
:::

:::definition[Region term R(A)]
The region term sums per-pixel log-likelihood penalties under the seed-intensity histograms.

$$R(A) = \sum_{p \in P} R_p(A_p), \qquad R_p(\text{"obj"}) = -\ln \Pr(I_p \mid O), \quad R_p(\text{"bkg"}) = -\ln \Pr(I_p \mid B).$$
:::

:::definition[Boundary term B(A)]
The boundary term accumulates penalties only at label discontinuities.

$$B(A) = \sum_{\{p,q\} \in N} B_{p,q} \cdot \delta(A_p, A_q), \qquad B_{p,q} \propto \frac{\exp\!\left(-\dfrac{(I_p - I_q)^2}{2\sigma^2}\right)}{\mathrm{dist}(p, q)},$$

where $\delta(A_p, A_q) = 1$ if $A_p \neq A_q$, and $0$ otherwise.
:::

:::definition[Seed capacity K]
$K$ is chosen large enough to guarantee that the minimum cut never severs a seed's assigned t-link.

$$K = 1 + \max_{p \in P} \sum_{q:\,\{p,q\} \in N} B_{p,q}.$$
:::

## Procedure

:::algorithm[Graph-cut interactive segmentation]
::input[N-D image $I$; seed sets $O$, $B$; parameters $\sigma$, $\lambda$]
::output[Binary labelling $A: P \to \{\text{"obj"}, \text{"bkg"}\}$ minimising $E(A)$ subject to hard seed constraints]

1. Compute n-link weights $B_{p,q}$ for every neighbour pair $\{p,q\} \in N$.
2. Compute $K = 1 + \max_{p \in P} \sum_{q:\{p,q\}\in N} B_{p,q}$.
3. Build the directed graph $G = (V, E)$ with $V = P \cup \{S, T\}$. Add an n-link edge $\{p, q\}$ with capacity $B_{p,q}$ for every neighbour pair in $N$.
4. For each unlabelled pixel $p \notin O \cup B$, add t-link $\{p, S\}$ with capacity $\lambda \cdot R_p(\text{"bkg"})$ and t-link $\{p, T\}$ with capacity $\lambda \cdot R_p(\text{"obj"})$.
5. For each object seed $p \in O$, add t-link $\{p, S\}$ with capacity $K$ and $\{p, T\}$ with capacity $0$.
6. For each background seed $p \in B$, add t-link $\{p, S\}$ with capacity $0$ and $\{p, T\}$ with capacity $K$.
7. Compute the minimum s-t cut $C^* \subseteq E$ via max-flow. Recover the segmentation: $A_p = \text{"obj"}$ if $\{p, T\} \in C^*$, else $A_p = \text{"bkg"}$.
8. On a new seed, update only the two t-links at the seeded pixel and re-augment from the existing flow.
:::

# Implementation

The graph-construction step in Rust:

```rust
fn build_graph<G: GraphBuilder>(
    graph: &mut G,
    pixels: &[f32],                      // intensity per pixel
    neighbors: &[(usize, usize, f32)],   // (p, q, dist_pq) for each N-link pair
    ln_pr_obj: &[f32],                   // -ln Pr(I_p | O) per pixel
    ln_pr_bkg: &[f32],                   // -ln Pr(I_p | B) per pixel
    seeds_obj: &[usize],
    seeds_bkg: &[usize],
    sigma: f32,
    lambda: f32,
) {
    let n = pixels.len();
    let nodes: Vec<G::NodeId> = (0..n).map(|_| graph.add_node()).collect();
    let s = graph.source();
    let t = graph.sink();

    let mut n_link_sum = vec![0.0_f32; n];
    let mut n_link_caps = Vec::with_capacity(neighbors.len());
    for &(p, q, dist_pq) in neighbors {
        let diff = pixels[p] - pixels[q];
        let cap = (-(diff * diff) / (2.0 * sigma * sigma)).exp() / dist_pq;
        n_link_caps.push((p, q, cap));
        n_link_sum[p] += cap;
        n_link_sum[q] += cap;
    }
    for (p, q, cap) in n_link_caps {
        graph.add_edge(nodes[p], nodes[q], cap, cap);
    }

    let k: f32 = 1.0 + n_link_sum.iter().cloned().fold(f32::NEG_INFINITY, f32::max);

    let mut is_obj = vec![false; n];
    let mut is_bkg = vec![false; n];
    for &p in seeds_obj { is_obj[p] = true; }
    for &p in seeds_bkg { is_bkg[p] = true; }

    for p in 0..n {
        if is_obj[p] {
            graph.add_edge(nodes[p], s, k, 0.0);
            graph.add_edge(nodes[p], t, 0.0, 0.0);
        } else if is_bkg[p] {
            graph.add_edge(nodes[p], s, 0.0, 0.0);
            graph.add_edge(nodes[p], t, k, 0.0);
        } else {
            graph.add_edge(nodes[p], s, lambda * ln_pr_bkg[p], 0.0);
            graph.add_edge(nodes[p], t, lambda * ln_pr_obj[p], 0.0);
        }
    }
}
```

# Remarks

- Globality: a single min-cut yields the global minimum of $E(A)$ subject to the hard seed constraints — failures trace to the energy definition, not to a local minimiser.
- The pairwise boundary term carries a shrinking bias towards short cuts; $\lambda$ requires per-image tuning: too small produces small segments, too large fragments the result through region competition.
- Scope: the formulation is binary. Multi-region segmentation requires repeated binary cuts (sequential foreground/background passes) or different formulations such as $\alpha$-expansion.
- Common extension: GrabCut replaces fixed seed histograms with iterative Gaussian mixture models, reducing seed-placement effort.

# References

1. Y. Boykov, M.-P. Jolly. *Interactive Graph Cuts for Optimal Boundary & Region Segmentation of Objects in N-D Images.* ICCV, 2001. [PDF](https://www.csd.uwo.ca/~yboykov/Papers/iccv01.pdf)
