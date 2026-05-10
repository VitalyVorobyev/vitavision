---
paper_id: boykov2001-graph-cut-segmentation
title: "Interactive Graph Cuts for Optimal Boundary & Region Segmentation of Objects in N-D Images"
authors: ["Y. Boykov", "M.-P. Jolly"]
year: 2001
url: https://www.csd.uwo.ca/~yboykov/Papers/iccv01.pdf
created: 2026-05-10
relevant_atlas_pages: ["felzenszwalb-graph-segmentation"]
---

# Setting

**Problem class:** Interactive binary image segmentation — partitioning an N-dimensional image into exactly two segments: "object" and "background".

**Inputs:**
- An N-D image (2D photo, 3D volume, or video treated as a 3D data set) with intensity values at every pixel/voxel p in the set P.
- Two disjoint seed sets provided by the user: O ⊂ P (object seeds) and B ⊂ P (background seeds), where O ∩ B = ∅. Seeds are loosely painted brushstrokes inside the intended regions — they do not need to touch the object boundary.

**Preconditions:**
- At least one object seed and one background seed must exist before the first segmentation run.
- All edge weights in the graph must be non-negative (the paper notes that negative Rp(·) values can always be shifted by a constant without changing the minimum; see footnote 2 of §3).

**Outputs:**
- A binary labelling A : P → {"obj", "bkg"} that satisfies the hard constraints (∀p ∈ O, Ap = "obj"; ∀p ∈ B, Ap = "bkg") and is globally optimal with respect to the MRF energy E(A).
- The segmentation boundary is implicitly defined as the set of pixel pairs {p, q} whose labels differ.

**Topology:** Unrestricted — both "object" and "background" segments may consist of several isolated connected components.

# Core idea

The method casts interactive segmentation as minimisation of an energy E(A) over binary label assignments A, where the energy combines a **region term** R(A) and a **boundary term** B(A):

```
E(A) = λ · R(A) + B(A)                                              (Eq. 1)
```

R(A) = Σ_{p∈P} Rp(Ap) sums per-pixel "region" penalties — how well each pixel's intensity fits the object or background histogram (Eq. 2). B(A) = Σ_{{p,q}∈N} B_{p,q} · δ(Ap, Aq) sums boundary penalties only at label discontinuities (Eq. 3). The scalar λ ≥ 0 trades off region evidence against boundary evidence.

This energy is then mapped to an s-t graph G = ⟨V, E⟩ where every pixel p is a node, the "object" terminal is the source S, and the "background" terminal is the sink T (§3). Two types of undirected edges are added: **n-links** {p, q} ∈ N carrying weights B_{p,q} (boundary penalties), and **t-links** connecting each pixel to each terminal with weights that encode both the region penalties Rp(·) and the hard constraints (Tab. 1 in §3). Seed pixels receive t-links of weight K (a very large constant, defined below) to their assigned terminal and weight 0 to the opposite terminal — enforcing the hard constraints. The globally minimal s-t cut on this graph corresponds exactly to the globally optimal segmentation under E(A) subject to the hard constraints; this equivalence is proved in Theorem 1 (§3).

When a user adds a new seed, only the two t-links at the seeded pixel change, and the max-flow can be warm-started from the prior solution, enabling near-interactive incremental updates (§3, incremental update table).

# Assumptions

1. **Binary segmentation only (hard).** The formulation produces exactly two labels. Multi-label problems (e.g. K > 2 segments) require a different approach such as α-expansion, which is not covered in this paper.

2. **Non-negative edge weights (hard).** Both n-link weights B_{p,q} and t-link weights must be ≥ 0. The paper shows that Rp(·) can always be shifted to satisfy this (footnote 2, §3), but if B_{p,q} were negative the min-cut guarantee would break.

3. **User-supplied seeds for both object and background (hard).** Without at least one seed from each class the graph has no feasible cut that separates the terminals as required.

4. **Fixed neighbourhood system N (soft).** The paper uses 8-connectivity for 2D images and 26-connectivity for 3D volumes (§4 preamble). Other neighbourhood systems are valid but change the geometric bias of the boundary term.

5. **Region term derived from seed intensities (soft).** The default Rp(·) = −ln Pr(Ip | O or B) is estimated from histograms of seed-pixel intensities (§4 preamble). Sparse or biased seeds yield poor histogram estimates. Alternatively, histograms can be learned from historical data (footnote 5, §4).

6. **Boundary penalty form (soft).** The paper's ad-hoc B_{p,q} ∝ exp(−(Ip − Iq)² / 2σ²) · 1/dist(p,q) is a sensible default, but other gradient-based criteria work (§1, list after Eq. 3). The choice of σ and the distance weighting are user-set hyperparameters.

7. **Unordered (symmetric) neighbour pairs (soft).** The presentation assumes undirected n-links; directed graphs with asymmetric discontinuity penalties are mentioned as a straightforward extension in footnote 1 of §1.

# Failure regime

- **Shrinking bias.** When λ is too small (boundary term dominates), the MRF tends to prefer short cuts regardless of region evidence, causing the segmented object to shrink towards a small region. This is demonstrated experimentally in the paper's Gestalt example (Fig. 2c): with λ = 0 (boundary only) the optimal cut "shrinks" the object. The shrinking bias of pairwise MRF boundary terms is a well-known property of s-t graph cut energy minimisation.?

- **Dominant region term washes out boundaries.** When λ is too large, isolated segments form for regions with better histogram fits, ignoring weak but real boundaries (Fig. 2d, §4.1).

- **Poor seed coverage of intensity modes.** If the user's seed strokes sample only part of the object's intensity range, the background histogram may absorb unsampled object intensities, causing those areas to be mislabelled. The method is stable "regardless of particular seed positioning within the same image object" only when seeds are representative (§2).

- **Low contrast at boundaries (high σ).** When σ is large relative to the actual gradient at the object boundary, B_{p,q} remains large even across the true boundary, weakening the boundary term. The paper notes σ can be estimated as "camera noise" (§4 preamble), but over-estimation degrades the result.

- **Coupled FG/BG intensity distributions.** When the foreground and background share similar intensity ranges, both region penalties Rp("obj") and Rp("bkg") are nearly equal everywhere, and the energy reduces to the boundary term only — behaving like λ = 0 with its associated shrinking bias.

- **Multi-label segmentation.** The binary formulation cannot directly produce K > 2 labels. Each additional segment requires a separate binary graph cut pass (as demonstrated in the kidney example of §4.3 using three sequential binary cuts).

- **Large 3D volumes without warm-starting.** The paper reports initial segmentation times of "2–3 seconds on smaller volumes (200 × 200 × 10) to a few minutes on bigger ones (512 × 512 × 50)" (§4.2). The global min-cut is not fast enough for true real-time use on large volumes without incremental updates.

# Numerical sensitivity

- **The constant K.** The paper sets K = 1 + max_{p∈P} Σ_{q: {p,q}∈N} B_{p,q} (defined in §3, edge-weight table). This ensures the t-links to seed terminals are strictly heavier than the sum of all adjacent n-links, so a minimum cut will never sever a seed's t-link to its assigned terminal. If K is underestimated, the hard constraint proof (Lemma 1, §3) breaks and seeds may not be respected.

- **Integer vs floating-point edge weights.** The paper relies on any polynomial max-flow algorithm that can handle arbitrary non-negative real weights; it uses the Boykov-Kolmogorov algorithm from [2]. In practice the energy is formulated in floating-point; integer approximations can lose the K-dominance guarantee if rounding reduces K below the required threshold.

- **σ in the boundary penalty.** B_{p,q} ∝ exp(−(Ip−Iq)²/2σ²) / dist(p,q). For σ → 0, all n-links with any intensity difference become nearly zero, and the cut degenerates to the shortest boundary. For σ → ∞, all n-links become large and equal, removing the boundary term discriminability. The paper estimates σ as camera noise (§4 preamble), so it is tightly coupled to the image intensity scale.

- **Intensity scale.** Region penalties Rp(·) = −ln Pr(Ip | O or B) depend on histogram bin resolution. Coarse histograms reduce sensitivity; the number of bins is an implicit hyperparameter not discussed in the paper.

- **λ scale.** Eq. 1 uses λ ≥ 0 as a user-set weight. Its correct value is problem-dependent; the paper demonstrates λ = 7–43 for a Gestalt example (Fig. 2b caption). Because it trades off two unlike terms (log-likelihood sums vs. geometric boundary penalties), λ must be re-tuned when σ or image intensity scale changes.

# Applicability

- **Use when:** Interactive segmentation with user brushstrokes is acceptable; the target is a binary FG/BG partition; the image is N-D (including 3D medical volumes and video treated as 3D); globally optimal energy minimisation under the MRF model is required; incremental re-segmentation as seeds are added is needed.
- **Don't use when:** Fully unsupervised segmentation is required (no seeds available); more than two labels are needed without sequential binary cuts; real-time throughput is required on large volumes without warm-starting infrastructure; the boundary and region terms are unsuitable for the image modality.

**Compared against (in paper):**
- *Intelligent scissors / live wire* (Mortensen & Barrett [15], Falcão et al. [6]): boundary-only, requires accurate boundary-pixel clicks, does not generalise to 3D — graph cuts add a region term and accept loose interior seeds.
- *Region growing* (Chapter 10 in Haralick & Shapiro [11]): no clear cost function, prone to leaking at blurry boundaries — graph cuts provide a global optimum under a clear energy.
- *Snakes / active contours* (Kass et al. [14], Cohen [4]): local optimisation in 2D only, no hard constraints — graph cuts give a global minimum in N-D.
- *Normalised cuts* (Shi & Malik [18]): NP-hard optimisation, approximation only, fully unsupervised — graph cuts solve the binary case exactly in polynomial time.
- *Felzenszwalb 2004 (felzenszwalb-graph-segmentation):* fully unsupervised superpixel/region decomposition without user constraints — a different problem class (no seeds, multi-region, no MRF energy minimisation). Not directly compared in this paper.

# Connections

- **Builds on:**
  - Greig, Porteous & Seheult 1989 [9] — first showed that a binary MAP-MRF for image restoration can be solved globally via s-t min-cut; this paper extends their approach to add hard seed constraints.
  - Ford & Fulkerson 1962 [7] — max-flow / min-cut duality (polynomial-time algorithm used as the solver substrate).
  - Goldberg & Tarjan 1988 [8] — push-relabel max-flow, another solver option cited.
  - Boykov & Kolmogorov 2001 [2] — the new max-flow algorithm actually used in the implementation; appears as a concurrent EMMCVPR workshop paper.
  - Kass, Witkin & Terzopoulos 1988 [14] — snakes, cited as the prior interactive segmentation lineage that the graph-cut approach outperforms in generality.

- **Enables (not in index.yaml — marked `?`):**
  - Boykov & Kolmogorov, TPAMI 2004 — the definitive BK max-flow algorithm paper that became the standard graph-cut solver; directly enabled by this work's solver requirements.?
  - Rother, Kolmogorov & Blake, "GrabCut" (SIGGRAPH 2004) — extends interactive graph cuts with iterative Gaussian mixture models, removing the need for hand-crafted histograms.?
  - Li et al., "Lazy Snapping" (SIGGRAPH 2004) — uses pre-segmented superpixels as the graph nodes to speed up interactive graph cuts.?
  - Boykov, Veksler & Zabih 2001 [3] / Kolmogorov & Zabih — multi-label α-expansion and α-β-swap algorithms that generalise the binary MRF to K labels using graph cuts as a subroutine.?

# Atlas update plan

## NEW: graph-cut-segmentation
Type: algorithm
Category: segmentation
Primary source: boykov2001-graph-cut-segmentation

**Goal:**
- Interactive binary segmentation of N-D images (2D photos, 3D medical volumes, video).
- User marks object and background seed pixels; the algorithm computes the globally optimal binary labelling that satisfies those hard constraints and minimises a combined region-and-boundary MRF energy.
- Output is a binary mask; topology is unrestricted (multi-blob segments are allowed).

**Algorithm:**
- Energy E(A) = λ · R(A) + B(A) over binary assignments A : P → {obj, bkg} (Eq. 1).
- Region term R(A) = Σ_p Rp(Ap) uses per-pixel log-likelihoods Rp("obj") = −ln Pr(Ip|O), Rp("bkg") = −ln Pr(Ip|B) from seed-intensity histograms (§4 preamble).
- Boundary term B(A) = Σ_{{p,q}∈N} B_{p,q} · δ(Ap, Aq) with B_{p,q} ∝ exp(−(Ip−Iq)²/2σ²)/dist(p,q) (§4 preamble).
- Graph G = ⟨V, E⟩: one node per pixel plus source S ("object") and sink T ("background"). N-links carry B_{p,q} weights. T-links carry region penalties for unlabelled pixels; seed pixels receive weight K to their assigned terminal and 0 to the other.
- K = 1 + max_p Σ_{q:{p,q}∈N} B_{p,q} guarantees seeds are never violated by the minimum cut (§3, edge table).
- Min-cut on G (computed via max-flow) is provably equivalent to the global minimum of E(A) under the hard seed constraints (Theorem 1, §3).
- Incremental update: when a new seed is added, only two t-link weights change; the existing max-flow solution can be augmented from its current state without recomputing from scratch (§3, incremental tables).

**Implementation hints:**
- Use the Boykov-Kolmogorov max-flow algorithm for typical vision graph sizes; it outperforms standard Ford-Fulkerson and push-relabel on these dense grids (cited as [2] in the paper).
- Set K strictly greater than the max pixel n-link sum; a safe formula is given in §3.
- Neighbourhood: 8-connected for 2D, 26-connected for 3D.
- Estimate σ as estimated camera noise for the boundary term (§4 preamble).
- Seeds drive both hard constraints and histogram learning simultaneously; the same brushstroke does both (§4 preamble).
- For multi-region segmentation, apply sequential binary graph cut passes (as in the three-step kidney example in §4.3).

**Remarks:**
- The method provides a global optimum — imperfections in the result are directly traceable to the cost function, not to the minimiser. This is a key advantage over local methods (snakes, region growing).
- The shrinking bias of pairwise boundary terms means λ must be tuned: too small → over-smooth, small objects; too large → fragmented by region competition.
- Fully unsupervised graph segmentation (Felzenszwalb 2004) solves a different problem: no seeds, no MRF energy, produces multi-region over-segmentation. The two methods are complementary.
- GrabCut (2004) is the natural next step: replaces fixed histograms with iterative Gaussian mixture models, removing the need for careful seed placement.

**References:**
- Primary: boykov2001-graph-cut-segmentation
- Greig et al. 1989 (MAP-MRF binary min-cut foundation)
- Ford & Fulkerson 1962 (max-flow / min-cut)
- Boykov & Kolmogorov 2001 (BK max-flow implementation used)

# Provenance

- **E(A) = λ · R(A) + B(A)** — §1 / §3, Eq. (1).
- **R(A) = Σ_{p∈P} Rp(Ap)** — §1, Eq. (2).
- **B(A) = Σ_{{p,q}∈N} B_{p,q} · δ(Ap, Aq)** — §1, Eq. (3); δ definition immediately following Eq. (3).
- **Hard constraints ∀p∈O Ap="obj", ∀p∈B Ap="bkg"** — §3, Eqs. (4) and (5).
- **Graph node and edge structure V = P ∪ {S,T}; E = N ∪ {{p,S},{p,T}}** — §3, definitions after Eqs. (4–5).
- **Edge weight table (n-links = B_{p,q}; t-links to S/T for seeds = K/0; t-links for unlabelled = λRp("bkg")/λRp("obj"))** — §3, edge-weight table.
- **K = 1 + max_{p∈P} Σ_{q:{p,q}∈N} B_{p,q}** — §3, definition immediately following the edge-weight table.
- **Segmentation from cut: Ap(C) = "obj" if {p,T}∈C, "bkg" if {p,S}∈C** — §3, Eq. (6).
- **Theorem 1 (global optimality of the min-cut segmentation)** — §3, Theorem 1 and proof.
- **Lemma 1 (feasibility of the minimum cut)** — §3, Lemma 1 and proof.
- **Incremental update — new object seed at pixel p** — §3, first incremental table (initial vs new t-link costs).
- **Incremental update — new object seed via capacity increase** — §3, second incremental table (add / new cost columns).
- **Rp("obj") = −ln Pr(Ip|O); Rp("bkg") = −ln Pr(Ip|B) from seed histograms** — §4 preamble (text before §4.1); footnote 5.
- **B_{p,q} ∝ exp(−(Ip−Iq)²/2σ²) · 1/dist(p,q)** — §4 preamble (ad-hoc boundary function definition).
- **σ estimated as camera noise** — §4 preamble ("σ can be estimated as 'camera noise'").
- **8-connectivity (2D) and 26-connectivity (3D)** — §4 preamble ("we use an 8-neighborhood system in 2D examples and 26-neighborhood system in 3D examples").
- **Runtime: < 1 second for 2D (up to 512×512); 2–3 s to a few minutes for 3D** — §4.2.
- **Gestalt example λ values (λ = 7–43, 0, 60)** — §4.1, Fig. 2 caption.
- **Sequential binary cuts for multi-region (three kidney regions)** — §4.3.
