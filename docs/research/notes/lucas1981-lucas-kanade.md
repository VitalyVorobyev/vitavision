---
paper_id: lucas1981-lucas-kanade
title: "An Iterative Image Registration Technique with an Application to Stereo Vision"
authors: ["B. D. Lucas", "T. Kanade"]
year: 1981
url: https://www.ri.cmu.edu/pub_files/pub3/lucas_bruce_d_1981_2/lucas_bruce_d_1981_2.pdf
created: 2026-05-13
relevant_atlas_pages: [shi-tomasi-corner-detector, structure-tensor, image-gradient]
---

# Setting

**Problem class.** Image registration — given two image functions $F(\mathbf{x})$ and $G(\mathbf{x})$ defined on a domain of pixel locations, find a parametric deformation that aligns one onto the other under a chosen photometric error. The paper's running case is *translational* registration: find a disparity vector $\mathbf{h}$ that minimises a measure of $F(\mathbf{x}+\mathbf{h}) - G(\mathbf{x})$ over a region of interest $R$ (§2, eq. before §3). It then generalises to (a) arbitrary linear (affine) warps $G(\mathbf{x}) = F(\mathbf{x}A + \mathbf{h})$ with adjustment matrix $\Delta A$ and offset $\Delta \mathbf{h}$ (§4.6), and (b) linear photometric correction $F = \alpha G + \beta$ (§4.6). The paper closes with an application to stereo (§5) where the unknown is per-feature depth $z$ and/or shared camera parameters $\mathbf{c}$.

**Inputs.** Two grayscale image functions $F, G : \Omega \to \mathbb{R}$, a region of interest $R \subset \Omega$, an initial estimate $\mathbf{h}_0$ of the disparity (or $A_0$, $\beta_0$, $\alpha_0$, $z_0$, $\mathbf{c}_0$ for richer parameterisations). Spatial-intensity gradients $F'(\mathbf{x})$ (or $\partial F / \partial \mathbf{x}$ in N-D) over $R$.

**Outputs.** A refined estimate of the deformation parameters that minimises the $L_2$ pixel-difference error on $R$. For translation: a single $\mathbf{h} \in \mathbb{R}^2$ (or $\mathbb{R}^n$). For the affine generalisation: a $2\times 2$ matrix $A$ plus a translation. For stereo: a per-feature depth $z$ and/or a 5-parameter camera pose $\mathbf{c}$ (azimuth, elevation, pan, tilt, roll; §5.2).

**Guarantees / preconditions.** The method is a Newton-Raphson iteration on the linearised normal equation. It converges only when the linear approximation $F(\mathbf{x}+\mathbf{h}) \approx F(\mathbf{x}) + \mathbf{h}\cdot F'(\mathbf{x})$ (eq 8, §4.2) is adequate over $R$. The paper proves convergence for the sinusoid $F(x)=\sin x$ when the initial misregistration satisfies $|h_0| < \pi$ (i.e. half a wavelength; §4.3). Larger basins are reached via coarse-fine pyramids (§4.3).

# Core idea

Replace the brute-force search over $\mathbf{h}$ with an iteration that uses the *image gradient* to predict the displacement. The first-order Taylor expansion (eq 1, §4.1)

$$F(x+h) \approx F(x) + h\,F'(x)$$

inverted for $h$ gives the pointwise estimate $h \approx [G(x) - F(x)] / F'(x)$ (eq 2). Averaging this estimate over $x \in R$ with a weight $w(x) = 1/|F'(x) - G'(x)|$ that suppresses points where the linear model is poor (eq 5, §4.1) yields the weighted estimate of eq (6).

An alternative derivation (§4.2) substitutes the same linearisation into the $L_2$ error $E = \sum_{x \in R} [F(x+h) - G(x)]^2$ and solves $\partial E / \partial h = 0$. This gives (eq 9):

$$h \;\approx\; \frac{\sum_x F'(x)\,[G(x) - F(x)]}{\sum_x F'(x)^2}.$$

This is exactly equivalent to the first derivation but with weight $w(x) = F'(x)^2$ and — crucially — generalises cleanly to higher dimensions. Iterating with $\mathbf{h}_{k+1} = \mathbf{h}_k + \Delta\mathbf{h}_k$ yields a Newton-Raphson scheme (eq 10) that converges in $O(M^2 \log N)$ steps on average — vs $O(M^2 N^2)$ for exhaustive search over an $M\times M$ disparity grid on an $N\times N$ image (§3).

The N-D generalisation (§4.5) replaces $F'$ with the gradient $\partial F / \partial \mathbf{x}$ as a column vector. Setting $\partial E / \partial \mathbf{h} = 0$ produces the $n \times n$ normal equation

$$\mathbf{h} \;\approx\; \Bigl(\sum_x [\partial F/\partial \mathbf{x}]^T[\partial F/\partial \mathbf{x}]\Bigr)^{-1} \sum_x [\partial F/\partial \mathbf{x}]^T [G(x) - F(x)]$$

(§4.5, unnumbered equation after the gradient definition). In 2-D this is the now-familiar $2\times 2$ linear system whose coefficient matrix is the **gradient outer-product sum** — what later authors call the *structure tensor* or *gradient covariance* (cf. Shi-Tomasi 1994 eq 6, Harris 1988 $M$). The paper notes (§4.5) that this requires accumulating five scalar products $(G-F)F_x$, $(G-F)F_y$, $F_x^2$, $F_x F_y$, $F_y^2$ over $R$ per iteration — vs one product for correlation, but evaluated at far fewer trial $\mathbf{h}$.

The affine generalisation (§4.6, eq 11) linearises $F(\mathbf{x}(A+\Delta A) + (\mathbf{h}+\Delta\mathbf{h})) \approx F(\mathbf{x}A+\mathbf{h}) + (\mathbf{x}\Delta A + \Delta\mathbf{h}) \cdot \partial F / \partial \mathbf{x}$ and solves a $(n^2 + n)\times(n^2+n)$ system per iteration — 6 unknowns in 2-D.

The photometric extension (§4.6) absorbs scalar contrast $\alpha$ and brightness $\beta$ into the same quadratic error. Ignoring $A$ recovers normalised cross-correlation maximisation; ignoring $\alpha,\beta$ as well recovers the $L_2$ form.

# Assumptions

1. (hard) **Local linearity of $F$.** The first-order Taylor expansion (eq 1, eq 8, eq 11) must be accurate over the support $R$. Convergence is bounded by the curvature of $F$; the paper's sin-wave analysis (§4.3) gives the canonical $|h_0| < \pi$ basin for a single Fourier component.
2. (hard) **Gradient is non-zero somewhere in $R$.** The N-D normal-equation matrix $\sum_x [\partial F/\partial \mathbf{x}]^T[\partial F/\partial \mathbf{x}]$ is rank-deficient when the gradient is everywhere zero, or when it points everywhere in the same direction (1-D aperture problem). The paper's §4.2 remark — division by zero only when $F'(x)=0$ *everywhere*, vs the §4.1 form which divides by zero anywhere — is the early acknowledgement of this conditioning constraint.
3. (soft) **High spatial frequencies are bounded.** The linearisation captures only the dominant low-frequency component; high frequencies extend convergence proofs only to fractions of a wavelength. Smoothing (lowpass filtering) widens the basin at the cost of accuracy on small detail (§4.3).
4. (hard) **Brightness consistency** between $F$ and $G$, or an explicit photometric model. Without §4.6's $\alpha,\beta$ correction, exposure/gain changes between cameras or frames cause systematic bias.
5. (soft) **Initial estimate within basin of attraction.** Newton-Raphson is local: $\mathbf{h}_0$ must lie inside the convergence basin. Coarse-fine pyramids (§4.3) extend the operating range by initialising from a smoothed/downsampled image.
6. (hard for affine, soft for translation) **Sufficient texture / sufficient unknowns.** For affine ($6$ unknowns in 2-D) $R$ must contain enough non-degenerate texture that the $6\times 6$ system is full-rank. Pure 1-D edges fail; constant patches fail; large areas of repeating texture fail (alias).

# Failure regime

- **Initial disparity outside basin.** Pure translation: $|\mathbf{h}_0| > $ half-wavelength of the dominant spatial frequency in $F$ (§4.3). Iteration drifts to a wrong local minimum or diverges. Fix: coarse-fine pyramid; the paper sketches this in §4.3 and uses it in §5.4 ("Figures 5 and 6 are bandpass-filtered versions").
- **Aperture problem (1-D structure).** A window containing only a single edge produces a rank-deficient $2\times 2$ system; only the gradient-aligned component of $\mathbf{h}$ is recoverable. The paper does not name this failure but it is implicit in §4.5's note that the $n$-D matrix must be invertible to apply the closed-form update.
- **Flat / textureless region.** $\partial F / \partial \mathbf{x} \approx 0$ throughout $R$. Numerator and denominator both go to zero. Update is indeterminate.
- **Aliased / repeated texture.** The error landscape has multiple equally good minima at integer translations of the period. Iteration converges to whichever is closest; no mechanism distinguishes them. Not discussed in the paper; first surfaced by Shi-Tomasi (1994) §7.
- **Photometric drift between $F$ and $G$.** Without §4.6's $\alpha,\beta$ correction, a constant intensity offset shifts all $G - F$ terms by the same amount, biasing $\mathbf{h}$ along the dominant gradient direction.
- **Stereo: occluded or depth-discontinuous features (§5.5).** Listed as future work: "tracking sudden depth changes ... require some set of higher-level heuristics to keep the matching algorithm on track at object boundaries."

# Numerical sensitivity

- **Gradient estimation kernel.** The paper proposes the symmetric forward difference $F'(x) \approx [F(x+\Delta x) - F(x-\Delta x)] / \Delta x$ with $\Delta x$ "appropriately small (e.g. one pixel)" (§4.4). It remarks that more sophisticated estimators "are equivalent to first smoothing the function" and acknowledges this is desirable for other reasons too — the same observation that motivates Sobel/Gaussian-derivative kernels in later work.
- **Normal-equation conditioning.** The $n\times n$ coefficient matrix $\sum_x [\partial F/\partial \mathbf{x}]^T[\partial F/\partial \mathbf{x}]$ has eigenvalues that span the squared singular values of the gradient field over $R$. Small minimum eigenvalue ⇒ aperture problem; tiny condition number ⇒ flat region. The Shi-Tomasi (1994) selection criterion $\min(\lambda_1, \lambda_2) > \tau$ is *directly motivated* by the conditioning of this LK matrix.
- **Iteration count.** §4.3 reports `O(M^2 log N)` average iterations to converge for translation on an $N\times N$ image with $M\times M$ disparity range. The §5.4 stereo demo reports 7 depth-adjustment iterations at the coarsest band and 5 at one octave finer — within an order of magnitude of the asymptotic estimate.
- **Smoothing trade-off (§4.3).** Smoothing widens the basin of attraction (linearisation valid over larger $\mathbf{h}$) but suppresses small features (objects smaller than the kernel are erased and unmatchable). The coarse-fine pyramid trades smoothing scale against detail recovery in a principled way.
- **Floating point.** Not discussed in the paper; in modern implementations the gradient-outer-product sums on 8-bit images need ≥ 32-bit accumulators to avoid overflow on windows of more than ~16² pixels.
- **Weighting function $w(x) = 1/|F'(x) - G'(x)|$ (eq 5).** Goes to infinity where the two gradients match exactly; goes to zero where they differ. The §4.2 derivation replaces this with $w(x) = F'(x)^2$, which is bounded and easier to compute; this is the form universally used by later KLT implementations.

# Applicability

- **Use when:** (a) you have a good initial alignment between $F$ and $G$ (sub-wavelength disparity, or a coarse-fine pyramid that effectively provides one); (b) image gradients are well-defined and not dominated by noise; (c) the parametric deformation model (translation, affine, or affine + photometric) accurately captures the inter-image transformation; (d) sub-pixel precision is required — the Newton-Raphson update is continuous in $\mathbf{h}$.
- **Don't use when:** (a) disparity is unknown to within a pyramid level — use exhaustive search or a feature-based matcher to bootstrap; (b) the inter-image transformation is non-parametric (large non-rigid deformation, occlusion, lighting that violates the linear photometric model); (c) $R$ contains insufficient texture for the normal-equation matrix to be full-rank.
- **Compared against:** exhaustive disparity search (§3 — same accuracy, $O(M^2 N^2)$ vs $O(M^2 \log N)$); hill-climbing (§3 — same Newton-Raphson family but evaluates difference at all 9 neighbours per step rather than using gradient); SSDA (Barnea & Silverman 1972 — early termination of error sums, still $O(M^2 N^2)$ worst case); coarse-fine search (Moravec 1980-ish — orthogonal idea, combinable with LK as §4.3 notes).

# Connections

- **Builds on:** Newton-Raphson root-finding (classical). Moravec 1980 interest operator (mentioned §5.3 as a feature-locator pipeline component). Gennery 1979 stereo-camera calibration (§5.4 — used to initialise camera parameters).
- **Enables / direct descendants:**
  - Shi-Tomasi 1994 "Good Features to Track" — the KLT framework. Shi-Tomasi (a) derives a feature-selection criterion from the conditioning of LK's $2\times 2$ matrix and (b) extends LK from translation-only to an affine deformation model for long-baseline tracking, matching LK §4.6 in form but with a more careful treatment of conditioning and dissimilarity monitoring.
  - Tomasi-Kanade 1991 "Detection and Tracking of Point Features" — the canonical KLT tracker paper, restating LK §4.5 + §4.6 in tracking terms.
  - Bouguet 2000 "Pyramidal Implementation of the Lucas-Kanade Feature Tracker" — formalises the coarse-fine pyramid sketched in §4.3.
  - Baker-Matthews 2004 "Lucas-Kanade 20 Years On" — a unified survey of forward-additive, inverse-compositional, and inverse-additive variants of LK; the modern reference for parameterisation choices.
- **Parallel / contemporary:** Horn-Schunck 1981 "Determining Optical Flow" — dense optical flow with a global smoothness term (variational regularisation), as opposed to LK's local windowed least-squares. Same year (1981), same problem (image motion), different prior (global smoothness vs local window). Neither supersedes the other; they are the two foundational threads of optical flow.
- **Refutes / supersedes:** Faster than the exhaustive-search and SSDA techniques surveyed in §3; LK is not directly superseded — modern deep-learning optical flow (FlowNet, RAFT, PWC-Net) is a separate paradigm that LK underwrites as a baseline.

# Atlas update plan

## NEW: lucas-kanade
Type: algorithm
Category: motion / optical-flow / image-registration
Primary source: lucas1981-lucas-kanade

**Goal.**
- Iterative gradient-based image registration: given two images $F$, $G$ and an initial disparity estimate $\mathbf{h}_0$, find the parametric warp (translation, affine, or affine + photometric) that minimises the $L_2$ pixel difference, by Newton-Raphson iteration on the linearised normal equation.
- Sub-pixel output; converges in $O(M^2 \log N)$ vs $O(M^2 N^2)$ for exhaustive search on an $N\times N$ image with $M\times M$ disparity range.

**Algorithm (declaration block).**
- Inputs: $F, G: \Omega \to \mathbb{R}$; region $R \subset \Omega$; initial parameter estimate (translation $\mathbf{h}_0$, optionally affine $A_0$ and photometric $\alpha_0, \beta_0$); gradient estimator; convergence tolerance; max iterations.
- Output: refined parameters; per-pixel residual map (optional).
- Form the linearised error $E = \sum_{x\in R} [F(\mathbf{x}+\mathbf{h}) - G(\mathbf{x})]^2$, expand to first order in $\mathbf{h}$ around the current estimate, solve normal equation, update.

**Core math snippet (textbook form).**
1-D scalar update (eq 9): $h \approx \sum_x F'(x)[G(x)-F(x)] \;\big/\; \sum_x F'(x)^2$.
N-D update (§4.5, unnumbered):
$$\Delta\mathbf{h} = \Bigl(\sum_x [\partial F/\partial \mathbf{x}]^T[\partial F/\partial \mathbf{x}]\Bigr)^{-1} \sum_x [\partial F/\partial \mathbf{x}]^T \,[G(\mathbf{x}) - F(\mathbf{x}+\mathbf{h}_k)] .$$
Note the $n\times n$ coefficient matrix is the gradient outer-product sum — same matrix as the structure tensor $M$ in Harris (1988) and gradient covariance $Z$ in Shi-Tomasi (1994).

**Implementation notes.**
- Gradient kernel: central differences (eq in §4.4) or Sobel; in practice Gaussian-derivative for smoothness ↔ basin trade-off.
- Coarse-fine pyramid (§4.3): apply LK at the coarsest level, upsample $\mathbf{h}$ to the next level, repeat. Extends usable disparity to ~half the image width.
- Weighting (eq 5): use $w(x) = F'(x)^2$ (the §4.2 form) — bounded, and natural least-squares weighting.
- Affine variant (§4.6): solve a $6\times 6$ system per iteration in 2-D; uses 21 weighted sums vs 5 for the translation case.
- Photometric correction (§4.6): solve jointly for $\alpha, \beta$ when exposure/gain differs between $F$ and $G$.

**Remarks.**
- Foundational paper for gradient-based image registration. The translation-only 2-D form is what most readers encounter as "Lucas-Kanade optical flow".
- The §4.5 normal-equation matrix is identical to the structure tensor $M$; this is why the Shi-Tomasi (1994) selection criterion $\min(\lambda_1, \lambda_2) > \tau$ is correctly motivated — it asserts the LK linear system is solvable.
- The §4.6 affine extension is rarely used directly; it is the foundation Shi-Tomasi (1994) §4–5 builds on for long-baseline tracking with monitoring.
- The §5 stereo application is historically important but not the modern use case — readers will recognise LK from sparse optical-flow trackers in OpenCV (`calcOpticalFlowPyrLK`), not from stereo.
- Convergence basin proof for $F=\sin x$: $|h_0| < \pi$ (§4.3) — directly motivates pyramidal implementation.

**Prerequisites.** `image-gradient`, `structure-tensor`.

**Relations.**
- { type: extended_by, target: shi-tomasi-corner-detector, confidence: high, caution: "Shi-Tomasi derives the feature-selection criterion from LK's normal-equation conditioning and adds an affine deformation model with dissimilarity monitoring; LK remains the basic translation-update primitive." }

(Other natural relations — `parallel_foundation_with` Horn-Schunck 1981, `feeds_into` from corner detectors, `learned_alternative_of` from RAFT/PWC-Net — point to slugs that do not yet exist on disk. Add them when those pages are authored.)

**References.**
- Primary: lucas1981-lucas-kanade
- Background cited in the paper: Moravec 1980 interest operator (§5.3); Gennery 1979 stereo calibration (§5.4); Barnea-Silverman 1972 SSDA (§3); Marr-Poggio 1979 stereo (§3, ref 5). None of these are currently in `docs/papers/index.yaml`; add when they become Atlas-relevant.

## UPDATE: structure-tensor
Section: "Where it appears"
- Convert the current parenthetical "These algorithms are not yet registered on this site" (line 126) into a live link to the new `lucas-kanade` algorithm page once authored. The structure tensor is *exactly* the coefficient matrix of the LK N-D normal equation (§4.5 of the paper); state this connection explicitly: "Lucas-Kanade (1981) §4.5 derives the same matrix from the Newton-Raphson update for image registration. In Lucas-Kanade the matrix's invertibility is a precondition for the iteration; in Shi-Tomasi (1994) the smaller eigenvalue is repurposed as a feature-selection score."

## UPDATE: image-gradient
Section: "Where it appears" / final paragraph
- Replace the bare mention "Lucas-Kanade optical flow" (lines 22, 102) with a link to the `lucas-kanade` algorithm page once authored. Optionally add one sentence: "The gradient enters Lucas-Kanade as both (a) the rate of intensity change per unit displacement — directly linearising the registration error — and (b) the outer-product sum over the window, which forms the normal-equation matrix."

## UPDATE: shi-tomasi-corner-detector
Section: `relations:` frontmatter / "Remarks" body
- Add a forward relation entry `{ type: extends, target: lucas-kanade, ... }` — but note that `extends` is *not* in the relations-field vocabulary. Instead, the `lucas-kanade` page authors the forward edge `extended_by: shi-tomasi-corner-detector` and the build derives the reverse `extending` on the Shi-Tomasi page automatically. **No frontmatter change needed on Shi-Tomasi.**
- Optional body addition (Remarks): one sentence noting that Shi-Tomasi's eq (8) acceptance criterion is conditioning of the Lucas-Kanade normal equation (eq from §4.5 of the LK paper) — making explicit the lineage that is currently only implicit in §3 prose.

# Provenance

- §2, paragraph 1: definition of translational registration $F(\mathbf{x}+\mathbf{h})$ vs $G(\mathbf{x})$; $L_1$, $L_2$, negative-normalised-correlation as candidate error measures.
- §3, paragraph 3: complexity bound $O(M^2 N^2)$ for exhaustive search on $N\times N$ image with $M\times M$ disparity range.
- §3, paragraph 6: average-case complexity $O(M^2 \log N)$ for the LK iteration.
- §4.1, eq (1), eq (2): first-order Taylor expansion $F(x+h) \approx F(x) + hF'(x)$ and the pointwise estimate $h \approx [G(x)-F(x)]/F'(x)$.
- §4.1, eq (3): naive average over $R$ of the pointwise estimate.
- §4.1, eq (5): weighting $w(x) = 1/|F'(x) - G'(x)|$.
- §4.1, eq (6): weighted average; eq (7) iterated Newton-Raphson form.
- §4.2, eq (8): linearisation rewritten as $F(x+h) = F(x) + hF'(x)$.
- §4.2, eq (9): closed-form weighted least-squares update $h \approx \sum F'[G-F] / \sum F'^2$ — the canonical 1-D LK update.
- §4.2, eq (10): iterated form with weighting.
- §4.3, "$|h| < \pi$" for $F=\sin x$: half-wavelength convergence basin.
- §4.3, smoothing/coarse-fine trade-off paragraph: smoothing widens the basin but suppresses small detail.
- §4.4, $F'(x) \approx [F(x+\Delta x) - F(x-\Delta x)]/\Delta x$: gradient estimator; remark that better estimators "are equivalent to first smoothing the function".
- §4.5, gradient column-vector definition + unnumbered N-D normal equation: $\mathbf{h} \approx (\sum [\partial F/\partial \mathbf{x}]^T[\partial F/\partial \mathbf{x}])^{-1} \sum [\partial F/\partial \mathbf{x}]^T (G-F)$. Lists the five required weighted products $(G-F)F_x$, $(G-F)F_y$, $F_x^2$, $F_x F_y$, $F_y^2$.
- §4.6, eq (11): affine linearisation $F(\mathbf{x}(A+\Delta A) + \mathbf{h}+\Delta\mathbf{h}) \approx F(\mathbf{x}A+\mathbf{h}) + (\mathbf{x}\Delta A + \Delta\mathbf{h})\cdot \partial F/\partial \mathbf{x}$.
- §4.6, photometric extension paragraph: $F = \alpha G + \beta$; joint minimisation over $A, \mathbf{h}, \alpha, \beta$ recovers normalised correlation when $A$ is ignored.
- §5.2, paragraph 1: camera-parameter vector $\mathbf{c}$ — azimuth, elevation, pan, tilt, roll.
- §5.3, eq (12): chain rule for $\partial F/\partial z = (\partial F/\partial \mathbf{q})(\partial \mathbf{q}/\partial \mathbf{p})(\partial \mathbf{p}/\partial z)$.
- §5.3, $\Delta z$ closed form: $\Delta z = \sum (G-F)(\partial F/\partial z) / \sum (\partial F/\partial z)^2$.
- §5.4, "7 depth-adjustment iterations" at coarse band, "5 ... at one octave higher": empirical iteration counts on the demo stereo pair.
- §5.4, recovered depths "6.05 for object 1 and 5.86 for object 2" (units: camera baseline) after 7 iterations from initial estimate 7.0.
- References list, items 1-6 in the paper: Baker 1980 edge-based stereo; Barnea-Silverman 1972 SSDA; Dudewicz 1976 probability textbook; Gennery 1979 stereo-camera calibration; Marr-Poggio 1979 human stereo theory; Moravec 1980 interest operator. None currently in `docs/papers/index.yaml`.
