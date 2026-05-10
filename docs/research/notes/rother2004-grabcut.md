---
paper_id: rother2004-grabcut
title: "GrabCut: Interactive Foreground Extraction using Iterated Graph Cuts"
authors: ["C. Rother", "V. Kolmogorov", "A. Blake"]
year: 2004
url: https://doi.org/10.1145/1015706.1015720
created: 2026-05-10
relevant_atlas_pages: [graph-cut-segmentation]
---

# Setting

**Problem class:** Interactive foreground/background segmentation of still colour
images. The user supplies a bounding rectangle (or optionally a lasso) around the
object; GrabCut returns a binary alpha matte plus a border alpha strip with
sub-pixel transitions.

**Inputs:**
- RGB image array $z = (z_1, \dots, z_N)$, $z_n \in \mathbb{R}^3$.
- A user-defined rectangle whose exterior pixels form the initial background
  region $T_B$. Everything inside is $T_U$ (unknown); $T_F = \emptyset$ at
  initialisation (incomplete trimap).
- Optional subsequent hard-constraint brush strokes to fix pixels as firm
  foreground ($\alpha_n = 1$) or firm background ($\alpha_n = 0$).

**Outputs:**
- Binary opacity array $\alpha \in \{0,1\}^N$ (hard segmentation).
- After border matting: continuous $\alpha_n \in [0,1]$ in a narrow ribbon of
  width $\pm w$ pixels (paper uses $w = 6$) around the hard boundary, with
  simultaneously estimated foreground colours free of background bleeding.

**Guarantees:** Energy $E$ decreases monotonically across iterative minimisation
steps (see §Convergence). No global minimum guarantee — convergence is to a
local minimum at best.

# Core idea

GrabCut extends Boykov–Jolly 2001 graph-cut segmentation in three coupled
directions:

1. **GMM colour model instead of grey histograms.** Each side (foreground /
   background) is modelled as a full-covariance $K$-component Gaussian Mixture
   Model (GMM) in RGB. The paper fixes $K = 5$ (Fig. 4 caption).

2. **Iterative rather than one-shot minimisation.** A coordinate-descent loop
   alternates: (a) assign each pixel in $T_U$ to its nearest GMM component
   (hard assignment, not soft EM — footnote 1 justifies this as
   computationally cheaper with negligible quality loss); (b) re-estimate GMM
   parameters (mean, covariance, weight) from newly labelled pixels; (c) global
   min-cut to re-infer $\alpha$. Each sub-step minimises $E$ in one group of
   variables, so $E$ strictly decreases per full pass.

3. **Border matting** with a regularised 1-D $\alpha$-profile fitted by dynamic
   programming along the contour, followed by foreground-pixel stealing to
   eliminate colour bleeding.

The Gibbs energy over $(α, k, θ, z)$ is:

$$E(\alpha, k, \theta, z) = U(\alpha, k, \theta, z) + V(\alpha, z)$$

with data term

$$U(\alpha, k, \theta, z) = \sum_n D(\alpha_n, k_n, \theta, z_n)$$

$$D(\alpha_n, k_n, \theta, z_n) = -\log \pi(\alpha_n, k_n) + \tfrac{1}{2}\log\det\Sigma(\alpha_n,k_n) + \tfrac{1}{2}[z_n - \mu(\alpha_n,k_n)]^\top \Sigma(\alpha_n,k_n)^{-1}[z_n - \mu(\alpha_n,k_n)]$$

and smoothness term

$$V(\alpha,z) = \gamma \sum_{(m,n)\in C} [\alpha_n \neq \alpha_m] \exp\!\bigl(-\beta \|z_m - z_n\|^2\bigr)$$

where $\beta = \bigl(2\langle (z_m - z_n)^2 \rangle\bigr)^{-1}$ is set from
the image statistics so the exponential switches between high and low contrast
appropriately ($\beta$ definition from Boykov–Jolly 2001, cited by eq. 5
here). The contrast-weighting constant $\gamma = 50$ was optimised on a
15-image training set.

# Assumptions

1. **Colour discriminability (soft).** The foreground and background colour
   distributions must differ enough for GMM modelling to separate them. The
   algorithm degrades gracefully as distributions overlap; it fails in heavy
   camouflage.
2. **Object is wholly inside the rectangle (hard).** Background outside the
   rectangle is taken as firm $T_B$. Any foreground cropped by the rectangle
   will be misclassified and requires manual correction strokes.
3. **Object boundary is compact (soft).** Border matting assumes a smooth,
   closed contour. Smoke, hair, and highly diffuse transparency are modelled
   only in the narrow $\pm w = 6$ pixel ribbon; full-image soft transparency is
   out of scope.
4. **Background pixels outside rectangle are representative (soft).** The
   background GMM is initialised from the rectangle exterior. If background
   material inside the rectangle is not adequately represented there (e.g.
   partly occluded background), the model is biased.
5. **GMM components are Gaussian (soft).** Each component is full-covariance
   Gaussian in RGB. Strongly multi-modal distributions within a single GMM
   component degrade quality.
6. **8-connected pixel graph (design choice, not assumption).** Pixels are
   neighbours horizontally, vertically, and diagonally (8-connectivity).

# Failure regime

Three failure modes are explicitly enumerated in §5:

1. **Low contrast boundary (i).** When the transition from foreground to
   background is low-contrast (e.g. black part of butterfly wing, Fig. 8), the
   smoothness term cannot distinguish the boundary and misclassifies edges.
2. **Camouflage (ii).** When the true foreground and background colour
   distributions overlap in RGB (e.g. soldier's helmet, Fig. 5), the GMM
   unary term provides no discriminative gradient. Graph-cut then follows the
   smoothness term alone and can trace an arbitrary path.
3. **Unrepresented background inside rectangle (iii).** If the background
   material visible within the bounding box is not present in the exterior
   background strip $T_B$, the background GMM is initialised incorrectly. This
   can be partially remedied by using a lasso instead of a rectangle to provide
   tighter background coverage.

Additional: full transparency (smoke, hair, trees) beyond the border strip is
acknowledged as out of scope (§1.2). Matting brush from [Chuang et al. 2001]
is suggested as a supplement.

# Numerical sensitivity

- **$\beta$ (smoothness contrast weight):** Set adaptively per image as
  $\beta = (2\langle(z_m - z_n)^2\rangle)^{-1}$, Eq. (5). Averaging is over
  all neighbouring pixel pairs in the image. This self-normalisation makes
  $\gamma = 50$ robust across a wide range of images.
- **$\gamma = 50$:** Fixed constant calibrated on 15 training images. Not
  tuned per image; described as "a versatile setting for a wide variety of
  images."
- **$K = 5$ GMM components:** Fixed for both foreground and background. Fig. 4
  caption explicitly states "K = 5 mixture components were used for both
  background (red) and foreground (blue)." Too few components → underfitting of
  complex distributions; too many → data starvation per component.
- **Border matting DP parameters:** $\lambda_1 = 50$, $\lambda_2 = 10^3$
  (Eq. 13). $\Delta_t$ discretised to 30 levels, $\sigma_t$ to 10 levels.
  Neighbourhood patch for Gaussian parameter estimation: $L = 41$ pixels
  (so $S_t$ is a $41 \times 41$ square centred on contour point $t$).
- **Border matting width:** $w = 6$ pixels either side of contour.
- **Convergence detection:** Automatic termination when $E$ ceases to decrease
  significantly (no fixed iteration count given; llama example converges in
  ~12 iterations, Fig. 4a).
- **Runtime (2004 hardware):** 450×300-pixel target rectangle → 0.9 s for
  initial segmentation, 0.12 s per subsequent brush stroke, on 2.5 GHz CPU
  with 512 MB RAM.

# Applicability

- **Use when:** Interactive foreground extraction from a single image where the
  user can supply a bounding rectangle. Foreground and background have
  reasonably distinct colour distributions. Boundary is smooth enough for a
  closed contour model.
- **Don't use when:** Heavy camouflage; full alpha transparency (smoke, hair)
  required over the entire object; real-time or video settings without
  specialised flow-reuse tricks; boundary precision matters at the pixel level
  everywhere (use a trimap-based matting tool like Bayes Matting instead for
  high-quality alpha throughout).
- **Compared against (paper, §5):** Magic Wand, Intelligent Scissors (Magnetic
  Lasso), Bayes Matting [Chuang et al. 2001], Knockout 2, one-shot Graph Cut
  [Boykov and Jolly 2001]. GrabCut vs. Graph Cut error rates on 50-image
  ground truth: 2.13 ± 0.19% vs. 1.36 ± 0.18% (Graph Cut used full trimap
  with both inner and outer lassos; GrabCut used a single outer rectangle).

# Connections

- Builds on: [boykov2001-graph-cut-segmentation] (one-shot graph cut + smoothness term
  definition; $\beta$ formula Eq. 5 is attributed here to Boykov–Jolly 2001)
- Builds on (unregistered, do not add to public sources.references): Ruzon &
  Tomasi 2000 alpha estimation, Chuang et al. 2001 Bayesian matting (basis for
  Eqs. 14–15 mean/covariance formula for mixed pixels)
- Builds on (unregistered): Mortensen & Barrett 1999 toboggan-based scissors
  (alpha-profile step-function model used for border matting; DP-based contour
  parameterisation)
- Enables: subsequent learned interactive segmentation methods (DIOS, RITM,
  SimpleClick, SAM prompt-encoder design) which adopt box-prompt initialisation
  from GrabCut's incomplete-trimap concept.

# Atlas update plan

## NEW: grabcut-iterative-segmentation
Type: algorithm
Category: image-segmentation
Primary source: rother2004-grabcut

**Goal:**
- Extract a foreground object from a colour still image using a bounding
  rectangle as the sole required input. Outputs a binary segmentation mask
  plus a border alpha strip for smooth edge transitions, with minimal user
  effort beyond the initial rectangle.
- Extends Boykov–Jolly 2001 graph-cut segmentation by replacing grey-level
  histograms with RGB GMMs and replacing one-shot min-cut with an iterative
  coordinate-descent loop.

**Algorithm:**
- Initialise: pixels outside the rectangle are hard background ($T_B$);
  pixels inside are unknown ($T_U$); $\alpha_n = 0$ for $T_B$, $\alpha_n = 1$
  for $T_U$. Background and foreground GMMs ($K = 5$ full-covariance Gaussians
  each) are initialised from the two initial label sets.
- Iterative minimisation (Fig. 3):
  1. **Assign** each $T_U$ pixel $n$ to the GMM component $k_n$ minimising
     $D(\alpha_n, k_n, \theta, z_n)$ (hard assignment, not soft EM).
  2. **Learn** GMM parameters: for each component $k$ in each model, compute
     sample mean $\mu$, covariance $\Sigma$, and weight $\pi = |F(k)|/\sum_k|F(k)|$
     from the pixels currently assigned to that component.
  3. **Min-cut**: minimise $E(\alpha, k, \theta, z) = U + V$ over $\alpha$ via
     global graph min-cut [Boykov–Jolly 2001; Kolmogorov–Zabih 2002].
  4. Repeat until $E$ ceases to decrease.
- Energy: $E = U + V$ where $U$ is the negative log-likelihood under the GMM
  (Eqs. 7–9) and $V$ is a contrast-weighted boundary penalty
  $\gamma \sum_{(m,n)\in C}[\alpha_n\neq\alpha_m]\exp(-\beta\|z_m-z_n\|^2)$
  with $\beta = (2\langle(z_m-z_n)^2\rangle)^{-1}$ (Eqs. 11, 5) and $\gamma = 50$.
- Convergence: each step minimises $E$ over one variable group; therefore $E$
  decreases monotonically — guaranteed convergence to a local minimum.
- User editing (optional): hard-constrain misclassified pixels with foreground /
  background brush strokes, then re-run step 3 (single min-cut) or full
  iterative loop ("refine").
- Border matting (§4): fit a soft step-function $\alpha$-profile
  $g(r_n; \Delta_{t(n)}, \sigma_{t(n)})$ along contour $C$ using DP with
  smoothness regulariser (Eqs. 12–13, $\lambda_1 = 50, \lambda_2 = 10^3$,
  $w = 6$). Then steal foreground pixel colours from $T_F$ to eliminate
  background bleeding (§4.2).

**Implementation:**
- $K = 5$ Gaussian components per side; each component tracks mean (3-D),
  full $3\times3$ covariance, and mixture weight. Storage per side: $K$
  covariances + means + weights = 5 × (9 + 3 + 1) = 65 floats.
- $\beta$ must be computed per image from all neighbouring pixel pairs before
  constructing the graph.
- Graph construction: $N$-link (pixel–pixel, 8-connected) weights from $V$;
  $T$-link (pixel–source/sink) weights from $U$. Firm labels are implemented
  as infinite $T$-links.
- Optimal flow from Graph Cut can be reused across user edit steps (§3.3),
  reducing edit latency (0.12 s vs. 0.9 s initial, 2.5 GHz 2004 CPU).
- Border matting DP: $\Delta_t$ at 30 discrete levels, $\sigma_t$ at 10
  levels. Two DP passes approximate the exact closed-contour solution. The
  paper cites a distance-transform technique from Rucklidge 1996 here; that
  paper is not registered in `docs/papers/index.yaml`.
- Initialisation of GMMs: directly from the initial rectangle exterior / interior
  label assignment (no k-means pre-step is mentioned; the paper says GMMs are
  "initialised from sets $\alpha_n = 0$ and $\alpha_n = 1$ respectively").

**Remarks:**
- The bounding-box prior (incomplete trimap) is the key UX reduction relative
  to classical graph cut: the user need not trace foreground at all initially.
- The iterative scheme reduces edit effort by letting newly labelled $T_U$
  pixels update the colour model across passes — a form of online EM without
  soft assignments.
- Failure cases enumerated in §5: (i) low-contrast boundary, (ii) camouflage,
  (iii) background inside rectangle not represented in exterior strip.
- Error rate 2.13 ± 0.19% vs. Graph Cut's 1.36 ± 0.18% on a 50-image ground
  truth (Graph Cut used a full double-lasso trimap; GrabCut only a rectangle).
- Full soft transparency (hair, smoke) over the entire image is out of scope;
  border matting covers only the $\pm 6$-pixel boundary strip.

**References:** rother2004-grabcut (primary); boykov2001-graph-cut-segmentation
(reference). Chuang Bayes-matte and Ruzon-Tomasi alpha estimation are cited in
the paper but not registered in `docs/papers/index.yaml`; do not add them to
the public page's `sources.references[]` — only the two IDs above are valid.

## UPDATE: graph-cut-segmentation
Section: Remarks
- GrabCut (Rother et al. 2004) is the most widely adopted extension of
  Boykov–Jolly graph cut for interactive use. It makes three coupled changes:
  (a) replaces grey-level histogram unaries with full-covariance $K = 5$
  Gaussian Mixture Models per side in RGB; (b) replaces the one-shot min-cut
  with an iterative coordinate-descent — assign GMM components → re-estimate
  GMM parameters → min-cut — guaranteed to decrease energy monotonically;
  (c) reduces required user input from a full trimap (inner + outer lasso) to a
  single bounding rectangle by initialising $T_F = \emptyset$ and letting the
  iterative loop recover the foreground. A border matting strip ($\pm 6$
  pixels) with a regularised 1-D $\alpha$-profile handles blur and mixed pixels
  at object boundaries. See `grabcut-iterative-segmentation`.

Relations:
{ type: extended_by, target: grabcut-iterative-segmentation, confidence: high }

# Provenance

| Claim | Location |
|---|---|
| Problem statement — interactive foreground extraction, alpha matte | Abstract; §1 |
| Trimap notation $T = \{T_B, T_U, T_F\}$ and grey-value segmentation | §2.1 |
| Boykov–Jolly Gibbs energy Eq. (2): $E(\alpha,\theta,z)=U+V$ | §2.2, Eq. (2) |
| Data term Eq. (3): $U = \sum_n -\log h(z_n;\alpha_n)$ (grey, histogram) | §2.2, Eq. (3) |
| Smoothness term Eq. (4): contrast-weighted boundary | §2.2, Eq. (4) |
| $\beta = (2\langle(z_m-z_n)^2\rangle)^{-1}$ definition and attribution | §2.2, Eq. (5); attributed to [Boykov and Jolly 2001] |
| $\gamma = 50$ from training on 15 images | §2.2 ("optimizing performance against ground truth over a training set of 15 images") |
| RGB GMM replaces histograms; $K$ components per side | §3.1 ("typically $K=5$"); Fig. 4 caption ("$K=5$ mixture components") |
| Component assignment vector $k = \{k_1,\dots,k_N\}$, $k_n\in\{1,\dots,K\}$ | §3.1 |
| Full GrabCut Gibbs energy Eq. (7): $E(\alpha,k,\theta,z) = U+V$ | §3.1, Eq. (7) |
| Data term $D(\alpha_n,k_n,\theta,z_n)$ — log-Gaussian (Eqs. 8–9) | §3.1, Eqs. (8)–(9) |
| Model parameters $\theta$ — weights $\pi$, means $\mu$, covariances $\Sigma$ | §3.1, Eq. (10) |
| Smoothness term in colour (Euclidean distance in RGB) | §3.1, Eq. (11) |
| Iterative minimisation steps 1–4 (Fig. 3) | §3.2, Fig. 3 |
| Hard assignment vs. soft EM justification | Footnote 1 |
| GMM parameter estimation: sample mean, covariance, weights $\pi = |F(k)|/\sum_k|F(k)|$ | §3.2 |
| Convergence: each step minimises $E$ w.r.t. one group → monotone decrease | §3.2 ("each of steps 1 to 3 … can be shown to be a minimisation … in turn") |
| Convergence in ~12 iterations (llama example) | §3.2, Fig. 4a |
| Incomplete trimap — $T_F = \emptyset$, rectangle exterior = $T_B$ | §3.3 |
| User editing: brush strokes → single step 3 or full refine | §3.3, Fig. 3 "User editing" block |
| Border matting: ribbon $\pm w = 6$ px, contour $C$ | §4.1 |
| $\alpha$-profile: soft step function $g(r_n; \Delta_t, \sigma_t)$ | §4.1, Fig. 6c |
| Border matting energy Eqs. (12)–(13): DP with smoothness regulariser | §4.1, Eqs. (12)–(13) |
| $\lambda_1 = 50$, $\lambda_2 = 10^3$; $\Delta_t$ 30 levels, $\sigma_t$ 10 levels | §4.1 |
| $L = 41$ pixel neighbourhood for Gaussian parameter estimation | §4.1 |
| Border matting data term Eqs. (14)–(15): Gaussian with $(\mu_t, \Sigma_t)$ | §4.1–4.2, Eqs. (14)–(15) |
| Foreground colour estimation by pixel stealing from $T_F$ | §4.2 |
| Failure cases (i) low contrast, (ii) camouflage, (iii) unrepresented background | §5 |
| Error rates: GrabCut 2.13 ± 0.19%, Graph Cut 1.36 ± 0.18% (50 images) | §5 |
| Runtime: 0.9 s initial, 0.12 s per brush stroke at 2.5 GHz, 512 MB RAM | §5 |
