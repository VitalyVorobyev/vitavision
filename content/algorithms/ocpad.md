---
title: "OCPAD: Occluded Checkerboard Pattern Detection"
date: 2026-04-17
summary: "Recover the largest visible checkerboard subgraph from a partially occluded pattern by running VF2 subgraph isomorphism against a model graph under a binary-search driver over vertex counts, then closing gaps by breadth-first region growing from a quad-density anchor."
tags: ["computer-vision", "calibration", "checkerboard", "graph-matching", "subgraph-isomorphism"]
category: calibration-targets
author: "Vitaly Vorobyev"
difficulty: intermediate
draft: true
relatedAlgorithms: ["shu-topological-grid", "puzzleboard", "laureano-topological-chessboard"]
sources:
  primary: fuersattel2016-ocpad
  references: [placht2014-rochade, cordella2004-vf2]
  notes: |
    Input is a candidate graph G_d produced by an upstream corner-graph
    builder (Placht 2014 ROCHADE: Scharr gradient → magnitude threshold
    → centreline thinning → saddle points → graph). Output is a partial
    mapping M : V_d → V_m onto the checkerboard model graph. Pipeline
    (§4): (1) reject if |V_d| < 0.5 |V_m|; (2) spatial consistency —
    min inter-node distance ≥ subpixel-window size, and stdev of edge
    length < mean edge length; (3) quad filter — keep vertices that lie
    on some 4-cycle; (4) keep only the largest connected component;
    (5) VF2 (Cordella 2004) driven by binary search N_i = round(N_{i-1}
    ± 2^{−i} N) over the N_i nearest-to-anchor vertices in BFS order,
    where the anchor is the vertex of maximum quad-density within
    BFS-depth 3; (6) breadth-first region growing vertex-by-vertex
    around the binary-search result. Algorithm 1 gives the driver.
---

# Goal

Recover a correspondence between a detected corner graph and a checkerboard model graph when the pattern is partially occluded, leaves the field of view, or contains spurious edges from background clutter. Input: a candidate graph $G_d = (V_d, E_d)$ of detected saddle-point corners with edges between grid-neighbour corners, and a checkerboard model graph $G_m = (V_m, E_m)$ of known dimensions. Output: a partial, non-injective, non-surjective mapping $M : V_d \to V_m$ covering as many $V_d$ vertices as possible while tolerating missing and extra vertices and edges.

# Algorithm

Let $G_d = (V_d, E_d)$ denote the candidate graph delivered by an upstream corner-graph builder, and $G_m = (V_m, E_m)$ the checkerboard model graph. Let $N = |V_d|$ and $N_m = |V_m|$. Let $w$ denote the subpixel-refinement window size of the upstream refiner, which doubles as the lower bound on corner-to-corner distance. Let $\mathrm{BFS}_k(v)$ denote the BFS neighbourhood of $v$ out to depth $k$ in $G_d$. For a candidate $v \in V_d$, let $D_a(v)$ denote the BFS distance from an anchor vertex $a$.

:::definition[Quad density]
The number of $\mathrm{BFS}_3$ neighbours of $v$ that belong to at least one $4$-cycle of $G_d$:

$$
\rho(v) \;=\; \bigl|\,\{u \in \mathrm{BFS}_3(v) : u \in \mathrm{quad}(G_d)\}\,\bigr|,
$$

where $\mathrm{quad}(G_d) = \{u : \exists\; \text{4-cycle in } G_d \text{ through } u\}$. The anchor is $a = \arg\max_{v \in V_d} \rho(v)$.
:::

:::definition[Spatial consistency]
A candidate $G_d$ passes the consistency check iff every edge length is at least $w$ and the sample standard deviation of edge lengths is smaller than the sample mean:

$$
\min_{e \in E_d} |e| \geq w \quad\wedge\quad \sigma(|E_d|) < \mu(|E_d|).
$$
:::

:::definition[Quad filter]
The quad filter restricts $V_d$ to vertices that are corners of some $4$-cycle:

$$
V_d' = \{\,v \in V_d : v \in \mathrm{quad}(G_d)\,\}.
$$

Triangles and isolated edges are discarded; the surviving graph may split into several connected components.
:::

:::definition[Nearest-to-anchor subgraph]
Given anchor $a$, the vertices of $V_d$ are totally ordered by BFS distance $D_a$. The first $N_i$ in this order induce

$$
G_i \;=\; G_d[\,\{\,v \in V_d : \mathrm{rank}(D_a(v)) \leq N_i\,\}\,].
$$

Ties in $D_a$ are broken arbitrarily but deterministically.
:::

:::definition[Binary-search update]
On VF2 success or failure at iteration $i$, the subgraph size updates by a halving step:

$$
N_i \;=\; \operatorname{round}\!\left(N_{i-1} \;\pm\; 2^{-i}\,N\right),
$$

where the sign is $+$ when the previous iteration matched and $-$ when it did not.
:::

## Procedure

:::algorithm[OCPAD — occluded checkerboard pattern detection]
::input[Candidate corner graph $G_d = (V_d, E_d)$ from an upstream builder; checkerboard model graph $G_m = (V_m, E_m)$; upstream subpixel-window size $w$.]
::output[Partial mapping $M : V_d \to V_m$, or $\bot$ if the pattern is not recoverable.]

1. Reject if $|V_d| < 0.5\,|V_m|$.
2. Reject if $G_d$ fails the spatial-consistency check.
3. Apply the quad filter to obtain $V_d'$; restrict $E_d$ accordingly.
4. Keep only the largest connected component of $(V_d', E_d')$; discard the rest.
5. Select the anchor $a = \arg\max_{v} \rho(v)$; compute BFS distances $D_a$ over $V_d'$.
6. Initialise $N_0 = N$, $i = 0$, $M \leftarrow \bot$.
7. Repeat: build $G_i$ from the $N_i$ nearest-to-anchor vertices; call $M_i \leftarrow \operatorname{VF2}(G_i, G_m)$; increment $i$. On success, commit $M \leftarrow M_i$ and set $N_i = \operatorname{round}(N_{i-1} + 2^{-i} N)$. On failure, set $N_i = \operatorname{round}(N_{i-1} - 2^{-i} N)$. Stop when $N_i$ stops moving.
8. If $|M| < |M_{\text{target}}|$, grow the match by BFS from $M$'s frontier: for each unassigned neighbour of a matched vertex, add it to $G_i$, re-run VF2, keep the extension iff it succeeds.
9. Return $M$.
:::

```mermaid
flowchart LR
    A["Candidate graph<br/>G_d"] --> B["50% size<br/>reject"]
    B --> C["Spatial<br/>consistency"]
    C --> D["Quad<br/>filter"]
    D --> E["Largest<br/>component"]
    E --> F["Anchor<br/>max ρ(v)"]
    F --> G["VF2 binary<br/>search on N_i"]
    G --> H["BFS region<br/>growing"]
    H --> I["Mapping M"]
```

# Implementation

The binary-search driver is the algorithmic core — it treats VF2 as a black-box exact-match engine and converges $N_i$ by halving.

```rust
type VertexId = u32;
type Mapping = Vec<(VertexId, VertexId)>;

fn ocpad_match(
    g_d: &Graph, g_m: &Graph,
    anchor: VertexId, order: &[VertexId],
    vf2: &dyn Fn(&Graph, &Graph) -> Option<Mapping>,
) -> Option<Mapping> {
    let n = order.len();
    let mut n_prev = n;
    let mut n_i = n;
    let mut best: Option<Mapping> = None;

    for i in 1.. {
        let g_i = g_d.induce(&order[..n_i]);
        let step = ((n as f64) * 2f64.powi(-(i as i32))).round() as isize;
        match vf2(&g_i, g_m) {
            Some(m) => {
                best = Some(m);
                n_prev = n_i;
                n_i = (n_i as isize + step).clamp(0, n as isize) as usize;
            }
            None => {
                n_i = (n_i as isize - step).clamp(0, n as isize) as usize;
            }
        }
        if n_i >= n_prev && best.is_some() { break; }
        if step == 0 { break; }
    }
    best
}
```

Region growing runs after this converges: for each unassigned neighbour of a matched vertex, the caller extends $G_i$ by one vertex and re-runs VF2, committing the extension only on a valid mapping.

# Remarks

- The algorithm consumes a corner graph and produces only a mapping; it does not detect corners, refine subpixel locations, or estimate intrinsics. Those stages live in the upstream detector and the downstream calibration solver.
- Runtime is dominated by the inner VF2 calls. Because the checkerboard graph is strongly connected, the binary search usually converges in a number of iterations logarithmic in $N$; on fragmented inputs it degenerates to linear region-growing.
- The $50\%$ vertex threshold and the spatial-consistency check are pre-filters that reject garbage before VF2 runs. They do not help a valid partial pattern — they cheapen the rejection of wrong candidates.
- The quad filter excises every triangle and isolated edge, which removes most background clutter before matching. A spurious diagonal inside an otherwise valid quad is tolerated downstream by the error-tolerant driver.
- Failure modes: candidates with fewer than half the model vertices are dropped at step 1; genuine patterns with ambiguous anchor placement (no clear quad-density maximum, e.g. a uniform fragment) yield slower, less reliable matches; multiple disconnected components of the candidate graph are resolved by keeping only the largest, which drops real corners on the smaller side.
- VF2 can be swapped for any exact subgraph-isomorphism routine; the binary-search driver and the region-growing step are independent of the matcher.

# References

1. P. Fürsattel, S. Dotenco, S. Placht, M. Balda, A. Maier, C. Riess. *OCPAD — Occluded Checkerboard Pattern Detector.* IEEE WACV, 2016. DOI: [10.1109/WACV.2016.7477565](https://doi.org/10.1109/WACV.2016.7477565)
2. S. Placht, P. Fürsattel, E. A. Mengue, H. Hofmann, C. Schaller, M. Balda, E. Angelopoulou. *ROCHADE: Robust Checkerboard Advanced Detection for Camera Calibration.* ECCV, 2014. DOI: [10.1007/978-3-319-10593-2_50](https://doi.org/10.1007/978-3-319-10593-2_50)
3. L. P. Cordella, P. Foggia, C. Sansone, M. Vento. *A (Sub)Graph Isomorphism Algorithm for Matching Large Graphs.* IEEE TPAMI, 2004. DOI: [10.1109/TPAMI.2004.75](https://doi.org/10.1109/TPAMI.2004.75)
