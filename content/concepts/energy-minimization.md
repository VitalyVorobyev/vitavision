---
title: "Energy Minimization"
date: 2026-05-16
summary: "The framework that poses image labelling and segmentation as minimising an objective combining a per-pixel data term and a pairwise smoothness term over a graph of pixels."
tags: ["graph-based"]
author: "Vitaly Vorobyev"
domain: segmentation
difficulty: intermediate
prerequisites: []
sources:
  primary: boykov2001-graph-cut-segmentation
  references:
    - rother2004-grabcut
    - felzenszwalb2004-graph-segm
---

# Definition

Energy minimization is the framework in which an image labelling or segmentation problem is posed as finding the assignment of labels to pixels — or to graph nodes representing pixels — that minimises a scalar objective combining per-element fidelity to observed data and pairwise penalties for labelling discontinuities between neighbouring elements.

:::definition[MRF energy for image labelling]
Given a pixel set $\mathcal{P}$, a neighbourhood system $\mathcal{N} \subseteq \mathcal{P} \times \mathcal{P}$, a discrete label set $\mathcal{L}$, and a labelling $\mathbf{f} : \mathcal{P} \to \mathcal{L}$, the Markov-random-field (Gibbs) energy is

$$E(\mathbf{f}) = \sum_{p \in \mathcal{P}} D_p(f_p) + \sum_{(p,q) \in \mathcal{N}} V_{pq}(f_p, f_q).$$

Input: an image or feature array over $\mathcal{P}$, a label set $\mathcal{L}$, and cost functions $D_p$, $V_{pq}$. Output: the labelling $\mathbf{f}^\star = \arg\min_{\mathbf{f}} E(\mathbf{f})$.
:::

The data term $D_p(f_p)$ measures how well label $f_p$ fits the observed evidence at pixel $p$ — typically a negative log-likelihood under an appearance model. The smoothness term $V_{pq}(f_p, f_q)$ penalises label disagreement between neighbouring pixels, encoding the prior that labels vary slowly except at real boundaries.

# Mathematical Description

## Data and smoothness decomposition

In Boykov-Jolly interactive binary segmentation, the label set is $\mathcal{L} = \{\text{obj}, \text{bkg}\}$ and the energy separates into a region term and a boundary term,

$$E(\mathbf{A}) = \lambda \cdot R(\mathbf{A}) + B(\mathbf{A}), \qquad R(\mathbf{A}) = \sum_{p} R_p(A_p), \quad B(\mathbf{A}) = \sum_{\{p,q\} \in \mathcal{N}} B_{pq} \cdot \delta(A_p \neq A_q),$$

where $\lambda \geq 0$ trades region evidence against boundary evidence. The region penalty is a seed-histogram log-likelihood, $R_p(\text{obj}) = -\ln\Pr(I_p \mid O)$; the boundary penalty $B_{pq} \propto \exp(-(I_p - I_q)^2 / 2\sigma^2)\,/\,\mathrm{dist}(p,q)$ is large at low-contrast pixel pairs and small across strong edges.

GrabCut generalises this to colour images: each appearance model is a $K = 5$-component full-covariance Gaussian mixture in RGB, and the Gibbs energy over binary opacities $\alpha$, component assignments $k$, and parameters $\theta$ is $E(\alpha, k, \theta, z) = U(\alpha, k, \theta, z) + V(\alpha, z)$ with smoothness term

$$V(\alpha, z) = \gamma \sum_{(m,n) \in \mathcal{C}} [\alpha_n \neq \alpha_m]\,\exp\!\bigl(-\beta \|z_m - z_n\|^2\bigr),$$

where $\beta = \bigl(2\langle (z_m - z_n)^2 \rangle\bigr)^{-1}$ is estimated per image from all neighbouring pixel pairs and $\gamma = 50$ is a fixed constant.

## Graph-cut solution for binary labels

For binary labellings the energy is minimised globally by mapping it to an s-t graph: every pixel is a node, a source $S$ represents the object terminal and a sink $T$ the background terminal. Undirected n-links between neighbours carry the boundary weights $B_{pq}$; directed t-links to $S$ and $T$ carry the region penalties. Seed pixels receive a t-link weight $K = 1 + \max_p \sum_{q} B_{pq}$, large enough that cutting a seed's t-link always costs more than cutting all its n-links, so hard constraints are never violated.

The max-flow / min-cut theorem guarantees that the globally minimum s-t cut is computable in polynomial time and corresponds exactly to the globally optimal labelling subject to the hard constraints. This is the tractability result at the heart of the framework: for **submodular** two-label energies, the global optimum is obtained exactly by the min-cut.

## GrabCut iterative formulation

GrabCut minimises the joint objective over $(\alpha, k, \theta)$ by coordinate descent: (1) assign each unknown pixel to the mixture component minimising its data term; (2) re-estimate each component's mean, covariance, and weight from its assigned pixels; (3) minimise over $\alpha$ by a global graph min-cut; (4) repeat until $E$ stops decreasing. Each sub-step minimises $E$ over one group of variables, so $E$ decreases monotonically — convergence to a local minimum is guaranteed, global optimality of the joint objective is not.

## Greedy region merging as a contrast

Felzenszwalb-Huttenlocher segmentation operates on the same dissimilarity-weighted pixel graph but follows a different principle: it minimises no global energy. It applies a greedy Kruskal-style merge governed by a pairwise boundary predicate,

$$D(C_1, C_2) = \bigl[\mathrm{Dif}(C_1, C_2) > \mathrm{MInt}(C_1, C_2)\bigr], \quad \mathrm{MInt}(C_1, C_2) = \min\bigl(\mathrm{Int}(C_1) + \tfrac{k}{|C_1|},\; \mathrm{Int}(C_2) + \tfrac{k}{|C_2|}\bigr),$$

where $\mathrm{Int}(C)$ is the largest edge in a component's minimum spanning tree and $\mathrm{Dif}$ the minimum edge crossing two components. Edges are visited in non-decreasing weight order and two components merge only when no boundary evidence separates them. The output satisfies formal "neither too fine nor too coarse" properties but is not the minimiser of any scalar energy.

# Numerical Concerns

**Submodularity as the tractability condition.** The exact graph-cut guarantee holds only for submodular binary energies — $V_{pq}(\ell,\ell) + V_{pq}(\ell',\ell') \le V_{pq}(\ell,\ell') + V_{pq}(\ell',\ell)$. The Potts smoothness term with non-negative weights is automatically submodular; non-submodular terms cannot in general be solved exactly by min-cut.

**Multi-label NP-hardness.** For $|\mathcal{L}| > 2$ the energy minimisation is NP-hard. Alpha-expansion approximates the solution by a sequence of binary graph cuts — at each step every pixel may switch to a single target label — yielding a strong local minimum with a multiplicative bound for metric smoothness terms.

**The seed constant and edge precision.** The constant $K$ must strictly exceed the largest pixel n-link sum. If floating-point edge weights are rounded to integers for a faster integer max-flow solver, rounding can drop the effective $K$ below the threshold and break the hard-constraint guarantee.

**The smoothness weight and its units.** In the Boykov-Jolly energy, $\lambda$ trades log-likelihoods (units of nats) against geometric boundary penalties; the ratio has no natural scale and must be re-tuned when $\sigma$, intensity scale, or neighbourhood size changes. GrabCut sidesteps this for the boundary weight by estimating $\beta$ adaptively from the image, which makes the fixed $\gamma = 50$ robust across images.

**Sensitivity of the data term.** Region penalties depend on histogram resolution or mixture quality; sparse or biased seeds mis-initialise the model. GrabCut's iterative re-estimation partially repairs initial error, but camouflage — foreground and background sharing a colour distribution — drives both models to the same incorrect state.

**Convergence of the GrabCut alternation.** The coordinate-descent loop decreases $E$ monotonically because each sub-step minimises $E$ over one variable group; convergence is to a local minimum that depends on the bounding-box initialisation, with no guarantee on the joint objective.

# Where it appears

Energy minimization in the MRF sense organises the three registered segmentation pages, each instantiating the framework differently in label set, appearance model, and minimisation strategy.

- [graph-cut-segmentation](/atlas/graph-cut-segmentation) — the direct implementation of binary MRF energy minimisation via s-t graph cut. The user supplies seed pixels; the algorithm returns the globally optimal labelling under $E(\mathbf{A}) = \lambda R(\mathbf{A}) + B(\mathbf{A})$ subject to hard seed constraints. Any labelling error is a consequence of the cost-function design, not of the minimiser.
- [grabcut-iterative-segmentation](/atlas/grabcut-iterative-segmentation) — extends the binary energy with RGB Gaussian-mixture appearance models and replaces one-shot min-cut with iterative coordinate descent over opacity, component assignment, and model parameters. The user supplies only a bounding rectangle; the alternation decreases energy monotonically to a local minimum.
- [felzenszwalb-graph-segmentation](/atlas/felzenszwalb-graph-segmentation) — operates on the same dissimilarity-weighted pixel graph but minimises no global energy. Its boundary predicate is a local greedy criterion; the method is unsupervised, produces a variable-count multi-region partition, and belongs to this framework only by shared graph vocabulary, not by optimisation principle.

# References

1. Y. Boykov, M.-P. Jolly. *Interactive Graph Cuts for Optimal Boundary & Region Segmentation of Objects in N-D Images.* IEEE ICCV, 2001.
2. C. Rother, V. Kolmogorov, A. Blake. *GrabCut: Interactive Foreground Extraction using Iterated Graph Cuts.* ACM SIGGRAPH, 2004.
3. P. F. Felzenszwalb, D. P. Huttenlocher. *Efficient Graph-Based Image Segmentation.* International Journal of Computer Vision, 59(2):167–181, 2004.
4. D. M. Greig, B. T. Porteous, A. H. Seheult. *Exact Maximum A Posteriori Estimation for Binary Images.* Journal of the Royal Statistical Society B, 51(2):271–279, 1989.
5. Y. Boykov, O. Veksler, R. Zabih. *Fast Approximate Energy Minimization via Graph Cuts.* IEEE TPAMI, 23(11):1222–1239, 2001.
