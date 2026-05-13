---
paper_id: felzenszwalb2010-detection
title: "Object Detection with Discriminatively Trained Part-Based Models"
authors: ["P. F. Felzenszwalb", "R. B. Girshick", "D. McAllester", "D. Ramanan"]
year: 2010
url: https://cs.brown.edu/people/pfelzens/papers/lsvm-pami.pdf
created: 2026-05-12
relevant_atlas_pages: [hog-descriptor, viola-jones-detector, mask-rcnn]
---

# Setting

Object class detection in still images: given an input colour or greyscale image of arbitrary resolution, locate and bound every instance of a target category (e.g. person, car, bicycle). Output is a ranked list of axis-aligned bounding boxes with associated confidence scores. The method targets the PASCAL VOC benchmark regime: object categories with significant intraclass variability in pose, viewpoint, and aspect ratio; bounding-box-only supervision (no part annotations); evaluation via average precision (AP) at IoU ≥ 0.5. Inputs carry no requirements on resolution or capture conditions; only bounding-box labels are needed during training.

# Core idea

A detection model is a _star-structured deformable part model_: one coarse _root filter_ $F_0$ covering the full object at resolution $l_0$ in a HOG feature pyramid, plus $n$ finer _part filters_ $F_i$ placed $\lambda$ levels deeper in the same pyramid (i.e. at twice the spatial resolution). The score of a complete object hypothesis $z = (p_0, \ldots, p_n)$ is

$$\operatorname{score}(p_0, \ldots, p_n) = \sum_{i=0}^{n} F_i' \cdot \phi(H, p_i) - \sum_{i=1}^{n} d_i \cdot \phi_d(dx_i, dy_i) + b \tag{Eq. 2}$$

where $\phi(H, p)$ is the HOG sub-window feature vector at position $p$, $d_i \in \mathbb{R}^4$ is a learned deformation-cost coefficient vector, and $\phi_d(dx, dy) = (dx, dy, dx^2, dy^2)$ encodes the displacement of part $i$ from its anchor $v_i$ (Eq. 4). The best hypothesis for any root location is found by dynamic programming over a pre-computed _distance-transform_ array $D_{i,l}$ (Eq. 8–9), making inference $O(nk)$ after filter responses are computed.

To handle large intraclass variation the system uses a _mixture model_: $m$ independent star models whose latent variables specify both a component label and a full configuration. Training employs _latent SVM_ (LSVM), a semi-convex reformulation of MI-SVM: the objective $L_D(\beta) = \tfrac{1}{2}\|\beta\|^2 + C\sum_i \max(0, 1 - y_i f_\beta(x_i))$ (Eq. 14) is optimised by coordinate descent alternating between relabelling positive latent values and optimising $\beta$ over a cache of hard negative feature vectors. HOG features are analytically reduced from 36 to 13 dimensions (or a combined 31-dimensional variant) via PCA-derived sparse projections with no loss in detection performance.

# Assumptions

1. **Rigid appearance within parts.** Each part filter is a linear template; the model cannot capture within-part articulation beyond the quadratic deformation penalty. Poses that deform individual parts internally (extreme foreshortening of a limb) violate this.
2. **Star (tree) connectivity.** Parts connect only to the root, not to each other; there are no spring interactions among parts. This simplifies dynamic programming but disallows joint-chain kinematics.
3. **Bounding-box-only supervision (soft).** Part locations are latent; the model infers them automatically. However, LSVM is sensitive to initialisation — a bad initialisation can lead to a poor local optimum.
4. **HOG feature discriminability.** The model assumes that oriented gradient histograms are sufficient to discriminate the category from background at both root and part scales. Categories with very low texture or highly reflective surfaces degrade gracefully.
5. **Sufficient negative coverage (hard).** The data-mining algorithm guarantees convergence to $\beta^*(D)$ only if hard negatives are eventually included in the cache (Theorem 1, Section 4.4). In practice, memory limits cause the algorithm to iterate a fixed number of times rather than run to convergence (Section 5.1).
6. **IoU ≥ 0.5 overlap for positives.** During training, a root location is assigned as a positive example only if its detection window overlaps the ground-truth bounding box by at least 50% (Section 5.1). Labels with very inaccurate bounding boxes therefore produce noisy positives.

# Failure regime

- **Symmetric or texture-less objects.** Parts tend to drift to salient patches; the symmetric-axis constraint used during training (Section 5.1) helps but does not eliminate this for objects with bilateral but irregular symmetry.
- **Extreme viewpoint variation beyond mixture count.** Using $m = 2$ components (as in all PASCAL experiments, Section 8) covers frontal/side variation for cars and bicycles, but three-or-more-viewpoint objects (e.g. birds) show very low AP (bird: 0.006 in Table 2).
- **Small objects.** The coarse root filter is defined to cover at most 80% of training box areas (Section 5.2); at scales where the object is smaller than the root filter, detection quality degrades.
- **Crowded scenes.** The non-maximum suppression criterion (≥50% bounding-box coverage, Section 7.2) can suppress genuine nearby instances of the same class.
- **Training with very limited positives.** LSVM coordinate descent with hard-negative mining requires several passes over the training set; with few positives the root filter initialisation via aspect-ratio clustering can produce degenerate components.
- **Runtime is slow by modern standards.** Evaluation takes ~2 seconds per image on an 8-core 2.8 GHz Xeon (Section 8); the method is not suited for real-time use.

# Numerical sensitivity

- **Cell size $k = 8$ pixels** is used for both root and part feature pyramids (Section 6.1.3). Changing this shifts the effective spatial pooling and invariance; the paper does not ablate $k$ but inherits it from Dalal-Triggs [10].
- **Truncation $\alpha = 0.2$** applied component-wise after block normalisation (Eq. 27, Section 6.1.3).
- **Pyramid sampling $\lambda = 5$ during training, $\lambda = 10$ at test time** (Section 3). Fine scale-space sampling is described as "important for obtaining high performance" (Section 3).
- **PCA dimensionality: top 11 eigenvectors** capture essentially all information in the 36-dimensional HOG vector; the analytic approximation uses $9 + 4 = 13$ sparse basis vectors (Section 6.2, Figure 6).
- **Combined feature: 31 dimensions** (9 contrast-insensitive + 18 contrast-sensitive + 4 normalisation-energy) used in final experiments (Section 6.2).
- **Number of parts fixed at 6 per component** during initialisation (Section 5.2). Deformation parameters initialised to $d_i = (0, 0, 0.1, 0.1)$ (Section 5.2); quadratic coefficients constrained to $\geq 0.01$ during gradient descent to keep deformation costs convex (Section 5.1).
- **SVM regularisation constant $C$**: used without specifying the exact value in the PAMI text; inherited from the practical procedure. The data-mining threshold $\delta$ for easy-negative removal is $-\!(1+\delta)$ (Procedure Train, line 13).
- **Positive bounding-box overlap threshold: 50%** for assigning root locations to positive examples (Section 5.1); same threshold as PASCAL VOC evaluation protocol (Section 8).
- **Mixture size $m = 2$** components trained for all PASCAL categories (Section 8).

# Applicability

- **Use when:** you need a strong classical object detector for categories with deformable, articulated structure (people, animals, vehicles); you have only bounding-box annotations; you need an interpretable model whose filters and part placements are directly visualisable; you are building a non-real-time offline detection pipeline.
- **Don't use when:** real-time performance is required (~2 s/image vs. milliseconds for cascade detectors); the category has extreme viewpoint variation that cannot be covered by a small mixture; you have access to a large annotated dataset and a GPU (deep methods dominate). Since ~2014 DPM-style methods are consistently outperformed by R-CNN-family deep detectors on every benchmark.
- **Compared against:** Viola-Jones rigid-template cascade [41] (rigid faces, real-time); Dalal-Triggs HOG sliding window [10] (single-filter, no deformations); bag-of-features methods [44] (no spatial layout). The DPM outperforms all of these on PASCAL VOC 2007/2008 at the cost of much higher inference time.

# Connections

- **Builds on:** [dalal2005-hog] (HOG features, cell size $k=8$, truncation $\alpha=0.2$, normalization blocks — the entire feature representation); [viola2001-detector] (cited as a baseline discriminative cascade detector [41])
- **Enables:** (no downstream paper has been ingested yet — R-CNN line of work and YOLO build on ideas here but their IDs are not yet in the index)
- **Refutes / supersedes:** bag-of-features approaches [44] and single rigid-filter detectors [10] on multi-class deformable categories — DPM achieves state-of-the-art AP on PASCAL VOC 2007/2008 (Tables 2–3, Section 8)

# Atlas update plan

## NEW: felzenszwalb-deformable-parts
Type: algorithm
Category: detection
Primary source: felzenszwalb2010-detection

**Goal:** Detect and localise instances of a target object category in arbitrary images by scoring every position and scale with a mixture of multiscale deformable part models. Input: an RGB or greyscale image; bounding-box annotations for training. Output: a ranked list of axis-aligned bounding boxes. The canonical demonstration is multi-class detection on PASCAL VOC (20 categories) with state-of-the-art average precision.

**Algorithm:**
- Build a HOG feature pyramid from the input image at $\lambda$ levels per octave ($\lambda = 10$ at test time). Each level provides a $d$-dimensional feature map ($d = 31$ in the final system) derived from a 31-dimensional analytic projection of HOG (9 contrast-insensitive + 18 contrast-sensitive orientations + 4 energy channels; cell size $k = 8$ px, truncation $\alpha = 0.2$).
- A single-component model $(F_0, P_1, \ldots, P_n, b)$ has a coarse root filter $F_0$ at pyramid level $l_0$ and $n = 6$ finer part models $P_i = (F_i, v_i, d_i)$ placed $\lambda$ levels below ($l_i = l_0 - \lambda$, i.e. at twice the spatial resolution).
- Score of a hypothesis $z = (p_0, \ldots, p_n)$: $$\operatorname{score}(z) = \sum_{i=0}^{n} F_i' \cdot \phi(H, p_i) - \sum_{i=1}^{n} d_i \cdot \phi_d(dx_i, dy_i) + b \quad (\text{Eq.\ 2})$$ where $\phi_d(dx, dy) = (dx, dy, dx^2, dy^2)$ (Eq. 4) and $(dx_i, dy_i)$ is the displacement of part $i$ from anchor $v_i$ (Eq. 3).
- Efficient inference via pre-computed distance transform arrays $D_{i,l}(x,y) = \max_{dx,dy}[R_{i,l}(x+dx, y+dy) - d_i \cdot \phi_d(dx,dy)]$ (Eq. 8), then root score aggregation (Eq. 9); total cost $O(nk)$ after computing filter responses.
- A mixture model with $m = 2$ components (used in all PASCAL experiments) selects the highest-scoring component; latent variables encode component label and configuration.
- **Latent SVM training:** objective $L_D(\beta) = \tfrac{1}{2}\|\beta\|^2 + C\sum_i \max(0, 1 - y_i f_\beta(x_i))$ (Eq. 14) where $f_\beta(x) = \max_{z \in Z(x)} \beta \cdot \Phi(x, z)$ (Eq. 13). Semi-convex: convex for negatives, non-convex for positives.
- Optimisation by coordinate descent: (1) relabel positives by selecting highest-scoring latent configuration $z_i = \arg\max_{z \in Z(x_i)} \beta \cdot \Phi(x_i, z)$; (2) optimise $\beta$ via stochastic gradient descent on the resulting convex problem (Section 4.2–4.3).
- **Hard-negative mining:** data-mining algorithm maintains a cache of feature vectors; iteratively removes easy examples ($y f_\beta(x) > 1$) and adds new hard examples ($y f_\beta(x) < 1$). Theorem 1 guarantees convergence to $\beta^*(D)$ when the cache contains all hard examples (Section 4.4–4.5).
- **3-phase initialisation:** (1) train $m$ root filters by aspect-ratio cluster via standard SVM on warped patches; (2) merge into a mixture with LSVM; (3) initialise part filters from high-energy regions of root filters by interpolating to twice the resolution; $d_i$ initialised to $(0, 0, 0.1, 0.1)$ (Section 5.2).
- **Bounding-box prediction:** predict tighter output bounding boxes from the full configuration $z$ via linear least-squares regression on a $2n+3$-dimensional feature vector (Section 7.1).

**Implementation:** The reference implementation shipped as `voc-release5` (MATLAB/C, open source). No link is guessed here; the paper acknowledges NSF support and the implementation was released by the Chicago group.

**Remarks:**
- DPM achieved state-of-the-art on PASCAL VOC 2007/2008, ranking 1st in 9 of 20 categories and 2nd in 8 (Table 3, Section 8), at approximately 2 seconds per image on an 8-core desktop.
- Its primary weakness for modern use is computational cost and the eventual eclipse by R-CNN (Girshick et al. 2014) and subsequent deep detectors, which replaced HOG + LSVM with CNN features and region proposals, achieving far superior accuracy.
- The model remains valuable as a conceptual foundation: the idea of scoring with a root filter plus spatially-constrained part filters, inferring part placements as latent variables, and training with hard-negative mining directly influenced modern anchor-based and anchor-free detection heads.
- Latent SVM is an important technical contribution in its own right, showing that weakly-supervised structured prediction can be made practical via the semi-convexity property and efficient cache-based data mining.

**References:** Primary: [dalal2005-hog] for HOG features; [viola2001-detector] as a key prior discriminative detector.

**Relations:**
- `{ type: compared_with, target: viola-jones-detector, confidence: medium, caution: "Different operational regimes — VJ is real-time cascade for rigid faces; DPM is offline part-based for general deformable objects" }`

---

## UPDATE: hog-descriptor
Section: Remarks

**Bullets to add:**
- DPM (Felzenszwalb et al. 2010) builds directly on HOG: it uses the same $k=8$ cell size, $\alpha=0.2$ truncation, and bilinear orientation binning, then introduces an analytic 13-dimensional reduction of the 36-dimensional HOG vector (Section 6.2) to accelerate the feature pyramid used by its root and part filters.

**Relations to add to hog-descriptor frontmatter:**
- `{ type: feeds_into, target: felzenszwalb-deformable-parts, confidence: high }`

---

## UPDATE: viola-jones-detector
Section: Remarks

**Bullets to add:**
- No new prose is strictly required; the `compared_with` relation authored on the DPM side is symmetric and will surface on this page automatically once the DPM page is live.

**Relations:** None to add — the `compared_with` authored on the DPM side is symmetric and will be mirrored here by the build.

---

## UPDATE: mask-rcnn
Section: Remarks

**Bullets to add:**
- Mask R-CNN (He et al. 2017) is a deep learning replacement for the classical deformable part detection paradigm: where DPM used hand-crafted HOG features, explicit part filters, and a latent SVM, Mask R-CNN uses CNN features, region proposals, and ROI-aligned feature pooling to achieve both detection and instance segmentation far beyond what part-based models could reach.

**Relations to add to mask-rcnn frontmatter:**
- `{ type: learned_alternative_of, target: felzenszwalb-deformable-parts, confidence: medium, caution: "Mask R-CNN's deep features and region proposals replace DPM's HOG + part-filter + latent-SVM pipeline" }`

---

# Provenance

**Setting / problem class:**
- "detecting and localizing generic objects from categories such as people or cars in static images" — Section 1, p. 1.
- "requires bounding boxes for the objects" — Abstract; Section 5, p. 11.
- "PASCAL VOC benchmarks" — Abstract; Section 8, p. 16.

**Star model definition (root + parts):**
- Formal $(F_0, P_1, \ldots, P_n, b)$ model definition — Section 3.1, p. 6.
- "part filters capture features at twice the spatial resolution relative to the features captured by the root filter" — Section 1, p. 3; Section 3.1, p. 6.
- $l_i = l_0 - \lambda$ for parts — Section 3.1, p. 6.

**Score formula (Eq. 2):**
- Equation 2, Section 3.1, p. 6–7. Text: "The score of a hypothesis is given by the scores of each filter at their respective locations (the data term) minus a deformation cost..."

**Deformation feature vector (Eq. 4):**
- $\phi_d(dx, dy) = (dx, dy, dx^2, dy^2)$ — Equation 4, Section 3.1, p. 7.

**Displacement formula (Eq. 3):**
- $(dx_i, dy_i) = (x_i, y_i) - (2(x_0, y_0) + v_i)$ — Equation 3, Section 3.1, p. 7.

**Distance transform inference (Eqs. 8–9):**
- $D_{i,l}(x,y) = \max_{dx,dy}[R_{i,l}(x+dx,y+dy) - d_i \cdot \phi_d(dx,dy)]$ — Equation 8, Section 3.2, p. 7.
- Root score aggregation — Equation 9, Section 3.2, p. 7.
- "taking $O(nk)$ time once filter responses are computed" — Section 3.2, p. 7.

**Mixture model:**
- "a mixture model with m components", latent $z$ encodes component label — Section 3.3, p. 7.
- $m = 2$ components used for all PASCAL experiments — Section 8, p. 16.

**Latent SVM objective (Eq. 14):**
- $L_D(\beta) = \tfrac{1}{2}\|\beta\|^2 + C\sum_i \max(0, 1 - y_i f_\beta(x_i))$ — Equation 14, Section 4, p. 9.
- $f_\beta(x) = \max_{z \in Z(x)} \beta \cdot \Phi(x, z)$ — Equation 13, Section 4, p. 9.

**Semi-convexity:**
- "the hinge loss, $\max(0, 1 - y_i f_\beta(x_i))$, is convex in $\beta$ when $y_i = -1$. That is, the loss function is convex in $\beta$ for negative examples. We call this property of the loss function semi-convexity." — Section 4.1, p. 9.

**Coordinate descent optimisation:**
- Two-step procedure (relabel positives, optimise $\beta$) — Section 4.2, p. 9.

**Hard-negative mining convergence theorem:**
- Theorem 1 and proof — Section 4.4, p. 10.

**HOG parameters:**
- $p = 9$ contrast-insensitive orientations, cell size $k = 8$, truncation $\alpha = 0.2$, leading to 36-dimensional HOG — Section 6.1.3, p. 13. "Commonly used HOG features are defined using $p = 9$ contrast insensitive gradient orientations (discretized with $B_2$), a cell size of $k = 8$ and truncation $\alpha = 0.2$."

**PCA dimensionality reduction:**
- "The eigenvalues indicate that the linear subspace spanned by the top 11 eigenvectors captures essentially all the information in a HOG feature" — Section 6.2, p. 14; Figure 6, p. 14.
- 13-dimensional analytic feature (9 orientation + 4 normalisation energy) — Section 6.2, p. 14.
- 31-dimensional combined feature (27 orientation + 4 energy) — Section 6.2, p. 14: "The final feature map has 31-dimensional vectors".

**Number of parts:**
- "We fix the number of parts at six per component" — Section 5.2, p. 12.

**Part deformation initialisation:**
- "$d_i = (0, 0, .1, .1)$" — Section 5.2, p. 12.
- Quadratic coefficient constrained to $\geq 0.01$ — Section 5.1, p. 12.

**Pyramid sampling $\lambda$:**
- "$\lambda = 5$ in training and $\lambda = 10$ at test time" — Section 3, p. 6.

**Positive overlap threshold 50%:**
- "detection window overlaps with $B$ by at least 50%" — Section 5.1, p. 12.
- Same threshold used in PASCAL evaluation — Section 8, p. 16.

**Bounding-box prediction:**
- $g(z)$ is a $2n+3$ dimensional vector; four linear functions trained by least-squares regression — Section 7.1, p. 15.

**PASCAL results (Tables 1–3):**
- Table 1: PASCAL VOC 2006; Table 2: PASCAL VOC 2007; Table 3: PASCAL VOC 2008 — Section 8, pp. 16, 19.
- "best AP score in 9 out of the 20 categories and the second best in 8" — Section 8, p. 17.
- Runtime: "4 hours to train... 3 hours to evaluate... average running time per image is around 2 seconds" on 2.8 GHz 8-core Xeon — Section 8, p. 17.

**Viola-Jones citation as baseline:**
- "the Viola-Jones [41] and Dalal-Triggs [10] detectors" cited as successful discriminative detectors — Section 2 (Related Work), p. 4.
- Reference [41]: P. Viola and M. Jones, "Robust real-time face detection," IJCV vol. 57, no. 2, May 2004 — References, p. 20.

**Dalal-Triggs as primary HOG ancestor:**
- Reference [10]: N. Dalal and B. Triggs, "Histograms of oriented gradients for human detection," CVPR 2005 — References, p. 20. Cited throughout Sections 1, 2, 3, 5, 6.

**LSVM = MI-SVM reformulation:**
- "A latent SVM is a reformulation of MI-SVM in terms of latent variables" — Abstract; Section 2, p. 5; footnote 1, p. 4.
- Reference [3]: S. Andrews et al., "Support vector machines for multiple-instance learning," NIPS 2003 — References, p. 20.
