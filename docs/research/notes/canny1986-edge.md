---
paper_id: canny1986-edge
title: "A Computational Approach to Edge Detection"
authors: ["J. Canny"]
year: 1986
url: https://perso.limsi.fr/vezien/PAPIERS_ACS/canny1986.pdf
created: 2026-05-05
relevant_atlas_pages: [image-gradient, harris-corner-detector, shi-tomasi-corner-detector, fast-corner-detector, sift, superpoint, scale-space]
---

# Setting

**Problem class:** Detection of step edges (and, secondarily, ridge and roof edges) in 2D greyscale images.

**Inputs:** A scalar-valued greyscale image $I(x, y)$ plus a chosen operator width $\sigma$ (or a set of widths for the multi-scale extension). No calibration or depth information is assumed.

**Noise model:** Additive white Gaussian noise with mean-squared amplitude $n_0^2$ per unit length (1D formulation) or per unit area (2D). This is a hard assumption: the 1D formulation explicitly begins "We will assume that the image consists of the edge and additive white Gaussian noise" (Section II, p. 680).

**Output:** A thin binary edge map in which marked pixels are local maxima of gradient magnitude along the gradient direction, connected via hysteresis thresholding. Each marked pixel carries an edge-strength value (the magnitude of $\nabla(G * I)$).

**Precondition:** The cross-section of an edge is locally constant in the direction along the edge — i.e., edges are locally straight and have constant profile ("we first consider one-dimensional edge profiles … assuming two-dimensional edges locally have a constant cross-section in some direction", Section II, p. 680). Corners and junctions violate this precondition.

# Core idea

Canny formulates edge detection as a variational optimisation over the impulse response $f(x)$ of a linear filter, subject to three criteria:

1. **Good detection** ($\Sigma$): maximise output signal-to-noise ratio, defined as $\text{SNR} = \frac{|\int_{-W}^{+W} G(-x)f(x)\,dx|}{n_0\bigl(\int_{-W}^{+W} f^2(x)\,dx\bigr)^{1/2}}$ (Eq. 3, p. 681).

2. **Good localisation** ($\Lambda$): minimise the root-mean-squared distance of the marked edge from the true edge centre. The localisation criterion is $\text{Localization} = \frac{|\int_{-W}^{+W} G'(-x)f'(x)\,dx|}{n_0\bigl(\int_{-W}^{+W} f'^2(x)\,dx\bigr)^{1/2}}$ (Eq. 9, p. 681).

3. **Single response** ($x_\text{max}$): prevent multiple responses to one edge by constraining the mean distance between adjacent maxima in the noise response: $x_\text{max}(f) = 2x_\text{zc}(f) = kW$ (Eq. 13, p. 682), where $k$ is a fixed fraction controlling the expected number of noise maxima $N_n = 2W/x_\text{max} = 2/k$ (Eq. 14, p. 682).

The composite criterion is the product $\Sigma \cdot \Lambda$ (Eq. 10, p. 681), subject to the $x_\text{max}$ constraint (Eq. 13). A key result from the variational analysis (Section IV) is that for step edges there is a single optimal filter shape (up to spatial scaling): the **first derivative of a Gaussian** $G'(x) = -\frac{x}{\sigma^2}\exp\!\bigl(-\frac{x^2}{2\sigma^2}\bigr)$ (Eq. 42, p. 688), which is an efficient approximation to the numerically derived optimal operator (filter 6, Fig. 4/5).

The four-stage pipeline is: (1) smooth the image with a Gaussian of width $\sigma$; (2) compute gradient magnitude $|\nabla(G * I)|$ and direction $\hat{n} = \nabla(G*I)/|\nabla(G*I)|$ (Eq. 46, p. 691); (3) non-maximum suppression (NMS) — keep only pixels that are local maxima along $\hat{n}$ (Eq. 47, p. 691); (4) hysteresis double-thresholding with a low threshold $T_l$ and high threshold $T_h$ ($T_h/T_l$ in the range 2–3, Section VI, p. 690) to output connected contours above $T_h$ that do not fall below $T_l$.

An important finding is the **uncertainty principle**: improving detection (wider $\sigma$, better $\Sigma$) degrades localisation (worse $\Lambda$), since $\Sigma(f_w) = w\,\Sigma(f)$ and $\Lambda(f_w) = \frac{1}{w}\Lambda(f)$ (Eq. 21, p. 685). The product $\Sigma \cdot \Lambda$ is therefore invariant under spatial scaling, and the design problem has a single unique solution (up to scale).

# Assumptions

1. **(Hard) Additive white Gaussian noise.** The noise model is $n(x)$ with power spectral density $n_0^2$. Non-Gaussian noise (shot noise, fixed-pattern noise) invalidates the SNR derivation.
2. **(Hard) Step-edge profile.** The 1D analysis assumes $G(x) = A\,u_{-1}(x)$ (Eq. 16, p. 684). Ridge and roof profiles can be handled by numerical optimisation (Sections III, Figs. 2–3) but require separate operators.
3. **(Hard) Locally straight edges.** The 2D extension assumes the edge has locally constant cross-section along its direction (Section II, p. 680). Corners and highly curved edges violate this.
4. **(Soft) Scalar-valued image.** The formulation is for greyscale images. Colour images require per-channel or luminance reduction before applying Canny; no multi-channel extension is given.
5. **(Soft) Single $\sigma$ per run.** A single operator width is assumed in the basic detector. The multi-scale extension (Section VIII) relaxes this but requires feature synthesis heuristics and a secondary decision procedure.
6. **(Soft) $k$ fixed (multiple response constraint).** The choice of $k$ determines the expected false-response rate (Eq. 14). Canny suggests choosing $k$ so that the probability of a multiple response error $p_m$ equals the probability of a false-detection error $p_f$ (Section IV, Eq. 39–40, p. 688).
7. **(Soft) Threshold ratio $T_h/T_l \in [2, 3]$.** This is an implementation recommendation, not a derived result (Section VI, p. 690). The optimal ratio depends on image statistics.
8. **(Soft) Isotropy for the basic detector.** The simple detector uses a circular Gaussian support. The paper separately develops directional (elongated) operators (Section IX) that improve performance for long straight edges, using 6 orientations in the reference implementation (Section IX, p. 696).

# Failure regime

1. **Corners and junctions.** The locally-straight-edge assumption fails at corners. NMS along the gradient direction smears the corner response across several pixels; the exact junction location is not recovered. The paper notes that the criteria could in principle be extended to two-dimensional feature design (Conclusions, p. 697), but provides no implementation.
2. **Curved edges.** The directional derivative NMS is biased for curved contours: the gradient direction deviates from the true edge normal by an amount proportional to local curvature, causing localisation error. The directional operators (Section IX) help but suppress response when variance of the 5-sample goodness-of-fit test is too high (Section IX, p. 695–696).
3. **Single-scale misses multi-scale structure.** A single $\sigma$ either misses fine detail (large $\sigma$) or generates excessive false responses in texture (small $\sigma$). The feature synthesis scheme (Section VIII) partially addresses this but is acknowledged as an open problem in the Conclusions.
4. **Texture and clutter.** In textured regions the noise model breaks down (texture acts as coloured noise). Canny sketches a correction — replace $n_0^2$ with the power spectrum of texture, leading to a whitened filter — but notes "for good discrimination between known texture types, a better approach would involve a Markov image model" (Section V, p. 765).
5. **Low-contrast edges with poor threshold selection.** If the high threshold $T_h$ is too high, genuine low-contrast edges are dropped entirely; if $T_l$ is too low, noise chains are connected to real contours. The noise-estimation scheme (Wiener filtering + global histogram percentile, Section VI) is sensitive to the density and strength of edges (Section VI, p. 789–790 in the text).
6. **Non-Gaussian noise (impulse, quantisation).** Shot noise or quantisation artifacts produce large derivative responses not modelled by the white Gaussian assumption, causing false edges or missed edges.
7. **Performance of the first-derivative-of-Gaussian approximation.** The FDoG (filter 6) achieves only $r \approx 0.51$ (multiple-response criterion value) vs. the ideal $r = 1$ (Section V, p. 729), and the $\Sigma\Lambda$ product is about 20% below optimal (Eq. 44–45, Section V, p. 724, 729). This is acceptable in practice but not optimal.

# Numerical sensitivity

**$\sigma$ vs. SNR trade-off.** The output SNR scales as $\Sigma(f_w) = w\,\Sigma(f)$ (Eq. 21, p. 685), i.e. doubling $\sigma$ doubles SNR but halves localisation precision. The practical rule is to use the smallest $\sigma$ whose output SNR exceeds a threshold (Section VIII, p. 951–952 in the text). Canny provides no closed-form formula for $\sigma$ in terms of noise level; it must be set empirically or via the noise-estimation scheme.

**The constant $k$.** The multiple-response constraint (Eq. 13) is parameterised by $k$, which sets the expected number of noise maxima per operator support ($N_n = 2/k$, Eq. 14). Canny's implementation chooses $k$ so that $p_m = p_f$ (Eq. 40, p. 622), yielding $|f'(0)|/\sigma_s = E$ where $E$ is determined by the threshold probability. The constraint $|f'(0)|/\sigma_s = r\,E$ with $r \approx 1$ is used in practice; the optimal filters achieve $r \leq 0.576$ (filter 6, Fig. 4, p. 687).

**First-derivative-of-Gaussian integrals.** The performance terms for the FDoG operator (Eq. 43, p. 636 in text) are:
$$\int_0^\infty f(x)\,dx = 1, \quad \int_{-\infty}^{+\infty} f^2(x)\,dx = \frac{1}{\sqrt{2}\sigma}, \quad \int_{-\infty}^{+\infty} f'^2(x)\,dx = \frac{1}{4\sigma^3}, \quad \int_{-\infty}^{+\infty} f''^2(x)\,dx = \frac{1}{8\sigma^5}.$$

This yields the composite criterion value $\Sigma\Lambda = 0.92/(3\sigma)$ (Eq. 44, p. 723–724) and $r \approx 0.51$ (Eq. 45, p. 729–730).

**Separability.** The 2D Gaussian $G(x,y) = \exp\!\bigl(-\frac{x^2+y^2}{2\sigma^2}\bigr)$ is separable, so the 2D convolution decomposes into two 1D passes (one horizontal, one vertical), giving $O(N\sigma)$ cost per pixel for an image of $N$ pixels (Section VII, p. 893).

**Threshold ratio.** The paper gives $T_h/T_l \in [2, 3]$ as an empirical guideline (Section VI, p. 822). No derivation is provided; this range is reported from experiments on the reference implementation.

**Directional operator parameters.** The reference implementation uses $d/\sigma \approx 1.4$ (sample spacing to $\sigma$ ratio) and 6 mask orientations, giving a worst-case angle of 15° and an output fall-off to ~85% of maximum (Section IX, p. 1120–1123 in text). Each directional mask requires 5 samples, so 5 multiplications per operator per point.

# Applicability

- **Use when:** You need thin, well-localised edge contours in greyscale images with approximately Gaussian noise. Canny is the standard baseline for boundary detection in calibration patterns (e.g., detecting edges of calibration squares), photogrammetry, and stereo preprocessing. It is well-suited to moderate-SNR images with smooth, elongated edges.
- **Don't use when:** The image contains significant non-Gaussian noise (JPEG artifacts, salt-and-pepper); you need corner or junction localisation (Canny smears corners); edges are very short (less than ~$3\sigma$ in length, where the elongated projection-function advantage disappears); or you need invariant-scale detection without explicit multi-scale bookkeeping.
- **Compared against (Canny explicitly compares):**
  - *Difference of boxes (Rosenfeld–Thurston 1971, [25]):* Optimal by the first two criteria alone (Schwarz inequality bound, p. 681–682) but produces many noise maxima near step edges (multiple response failure) because it has very high bandwidth.
  - *Marr–Hildreth Laplacian-of-Gaussian (LoG, [18]):* The 1D Marr–Hildreth detector (zero-crossings of LoG) is "almost identical" to the FDoG operator because gradient maxima correspond to LoG zero-crossings (Section V, p. 742–748). In 2D, however, Canny's directional derivative outperforms LoG in both detection and localisation because the Laplacian adds a second-derivative component along the edge direction that contributes noise without contributing signal (Section VII, p. 900–910). Canny also adds hysteresis thresholding whereas Marr–Hildreth does not use thresholding (Section V, p. 757–758).
  - *Sobel/Prewitt operators:* Not explicitly discussed by Canny in the body text; the paper compares implicitly via the difference-of-boxes analysis. Sobel/Prewitt are finite-difference approximations to gradient magnitude with no multi-response control.

# Connections

- **image-gradient** — Knowledge prerequisite and primary formalisation context. Canny's SNR (Eq. 3) and localisation (Eq. 9) criteria are defined over the impulse response of a linear gradient-like filter. The output of the detector is the gradient magnitude $|\nabla(G*I)|$ after smoothing. Canny is the canonical optimisation-based derivation of gradient-magnitude edge detection.
- **scale-space** — Closely related framework. The Gaussian smoothing step $G * I$ is the canonical scale-space representation; varying $\sigma$ moves through scale space. The multi-scale extension (Section VIII, feature synthesis) is an early instance of scale-space edge integration.
- **harris-corner-detector** — Downstream consumer. Harris (1988) uses gradient magnitudes and directions computed at the Canny-style gradient stage to build the structure tensor $M$. Canny edges are a natural front-end for Harris and related feature detectors.
- **shi-tomasi-corner-detector** — Same gradient pipeline dependency as Harris. Shi–Tomasi also relies on the image gradient computation that Canny formalises.
- **fast-corner-detector** — Contrasting approach: FAST avoids gradient computation entirely, using pixel-ring intensity comparisons. It addresses the same downstream need (feature points for tracking) but from an orthogonal direction; no direct dependency on Canny, but both sit in the `features` domain.
- **sift** — SIFT's DoG pyramid approximates the Laplacian of Gaussian (which Canny explicitly compares against). SIFT also uses gradient magnitude and orientation (Canny's output space) for its descriptor. Canny's SNR/localisation framework influenced the broader design philosophy of gradient-based keypoint detection.
- **superpoint** — Deep-learning replacement for classical interest-point and edge pipelines. SuperPoint's detector head learns to detect Canny-like junctions and edges end-to-end; it is a learned_alternative_of the classical gradient-magnitude + NMS paradigm that Canny formalises.

# Atlas update plan

## NEW: canny-edge-detector
Type: algorithm
Category: features (domain: features — consistent with harris-corner-detector, fast-corner-detector, sift, etc.)
Primary source: this paper

Prerequisites: [image-gradient]
Relations: (none — defer to algo-page time per orchestrator decision)

Goal:
- Detect thin, well-localised step edges in greyscale images by optimally combining signal-to-noise ratio, localisation precision, and single-response criteria
- Output: connected binary edge contour map with sub-pixel quality localisation, one pixel wide
- Canonical algorithm for gradient-based edge detection; basis for many downstream feature pipelines

Algorithm:
- **Smoothing:** convolve image $I$ with isotropic Gaussian $G_\sigma$ to suppress noise; effective because Gaussian is separable (two 1D passes)
- **Gradient computation:** compute gradient magnitude $|\nabla(G_\sigma * I)|$ and direction $\hat{n} = \nabla(G_\sigma * I)/|\nabla(G_\sigma * I)|$ via finite differences (e.g., Sobel approximation to FDoG)
- **Non-maximum suppression (NMS):** for each pixel, suppress if not a local maximum along the gradient direction $\hat{n}$; in practice, $\hat{n}$ is quantised to 4 or 8 discrete directions; equivalent to finding zero-crossings of the directional second derivative (Eq. 47)
- **Hysteresis double-thresholding:** pixels above $T_h$ are immediately accepted as edge points; pixels between $T_l$ and $T_h$ are accepted only if connected (8-connectivity or BFS) to a pixel above $T_h$; ratio $T_h/T_l \in [2, 3]$ (Section VI, p. 822)
- Output: thin, connected edge map

Implementation:
- Gaussian can be applied separably ($O(N\sigma)$ per image); typical implementation computes $I_x = \frac{\partial}{\partial x}(G_\sigma * I)$ and $I_y = \frac{\partial}{\partial y}(G_\sigma * I)$ as two separable 1D convolutions per axis
- NMS quantises gradient direction to 8 or 4 directions for efficiency; bilinear interpolation of gradient magnitude along $\hat{n}$ gives sub-pixel accuracy
- Hysteresis implemented via union-find or BFS/DFS flood-fill from above-$T_h$ seeds; connected components below $T_l$ are discarded
- Multi-scale variant: run at multiple $\sigma$ values; use feature synthesis (Section VIII) to merge, suppressing large-$\sigma$ responses that are predicted by small-$\sigma$ responses

Remarks:
- **Optimality criteria precisely defined:** $\Sigma$ (detection SNR, Eq. 3), $\Lambda$ (localisation, Eq. 9), $x_\text{max}$ (single-response spacing, Eq. 13). Their product $\Sigma\Lambda$ is scale-invariant (Eq. 22), giving a unique operator shape
- **Uncertainty principle:** $\Sigma(f_w) = w\,\Sigma(f)$ and $\Lambda(f_w) = \frac{1}{w}\Lambda(f)$ (Eq. 21); detection and localisation trade off via $\sigma$; there is no free lunch
- **FDoG approximation:** the first derivative of Gaussian achieves $\Sigma\Lambda = 0.92/(3\sigma)$ (Eq. 44) and $r \approx 0.51$ (Eq. 45) — about 20% below the optimal operator in $\Sigma\Lambda$ and 10% below in $r$ — but is far more computationally efficient in 2D because of Gaussian separability
- **Marr–Hildreth comparison:** in 1D the two detectors are almost identical (gradient maxima ↔ LoG zero-crossings); in 2D, Canny's directional derivative suppresses the edge-parallel noise component that LoG includes, giving better detection and localisation (Section VII, p. 900–910)
- **Hysteresis over single thresholding:** eliminates streaking; a contour must fluctuate below $T_l$ (not just below $T_h$) to be broken, greatly reducing false breaks (Section VI, p. 810–822)
- **Multi-scale feature synthesis:** the paper proposes running operators at multiple $\sigma$ and suppressing large-scale responses already predicted by small-scale ones (Section VIII); most edges in practice come from the smallest channel (Section VIII, p. 951–955)
- **Corner limitation:** the method localises edges but not corners; corners require a 2D extension of the criteria (noted in Conclusions, p. 697), which Canny did not implement

# Provenance

| Claim / constant | Location |
|---|---|
| Three criteria definition (good detection, good localisation, single response) | Section II, pp. 680–681 |
| Noise model: additive white Gaussian, $n_0^2$ per unit length | Section II, p. 680 |
| SNR criterion $\Sigma$, Eq. 3 | Section II.A, p. 681 |
| Localisation criterion $\Lambda$, Eq. 9 | Section II.A, p. 681 |
| Single-response constraint $x_\text{max} = kW$, Eq. 13 | Section II.B, p. 682 |
| Expected noise maxima $N_n = 2/k$, Eq. 14 | Section II.B, p. 682 |
| Composite criterion = product of $\Sigma$ and $\Lambda$, Eq. 10 | Section II.A, p. 681 |
| Uncertainty principle: $\Sigma(f_w) = w\Sigma(f)$, $\Lambda(f_w) = \Lambda(f)/w$, Eq. 21 | Section IV, p. 685 |
| Optimal step edge: unique shape up to scaling | Section IV, pp. 685–686 |
| FDoG as efficient approximation, $G'(x)$, Eq. 42 | Section V, p. 688 |
| FDoG integrals ($\int f=1$, $\int f^2=1/\sqrt{2}\sigma$, etc.), Eq. 43 | Section V, p. 636 (text line) |
| FDoG composite criterion value $\Sigma\Lambda = 0.92/(3\sigma)$, Eq. 44 | Section V, p. 723–724 |
| FDoG multiple-response value $r \approx 0.51$, Eq. 45 | Section V, p. 729–730 |
| FDoG ~20% below optimal in $\Sigma\Lambda$, ~10% below in $r$ | Section V, p. 722–730 |
| Largest achievable $r$ from constrained optimisation $\approx 0.576$ (filter 6) | Section IV, p. 638–639 |
| NMS as zero-crossing of directional second derivative, Eq. 47 | Section VII, p. 886 |
| Gradient direction estimate $\hat{n} = \nabla(G*I)/|\nabla(G*I)|$, Eq. 46 | Section VII, p. 866 |
| Edge strength = $|\nabla(G*I)|$, Eq. 48 | Section VII, p. 890 |
| 2D Gaussian separable into n 1D convolutions | Section VII, p. 892–894; Conclusions, p. 1206–1209 |
| Threshold ratio $T_h/T_l \in [2, 3]$ | Section VI, p. 822 |
| Hysteresis: broken contour must fall below $T_l$ (not just $T_h$) | Section VI, p. 810–822 |
| Comparison with Marr–Hildreth LoG: 1D near-identical, 2D Canny better | Section V, pp. 742–752; Section VII, pp. 899–910 |
| Difference of boxes optimal by $\Sigma\Lambda$ alone but fails multiple-response | Section II.B, pp. 681–683 |
| Marr–Hildreth does not use thresholding; Canny adds hysteresis | Section V, p. 757–758 |
| Corners: criteria could extend to 2D features; not implemented | Conclusions, p. 697 |
| Feature synthesis multi-scale scheme | Section VIII, pp. 927–956 |
| Directional operators: 6 orientations, $d/\sigma \approx 1.4$, 5 samples | Section IX, pp. 1120–1132 |
| Worst-case directional operator fall-off: 15°, ~85% of max | Section IX, p. 1120–1123 |
| Filter parameter table (Fig. 4): $r, \Sigma\Lambda, a, \omega$ for filters 1–7 | Section IV, p. 687 (Fig. 4) |
| Step edge model $G(x) = Au_{-1}(x)$, Eq. 16 | Section IV, p. 684 |
| Setting: edges locally constant cross-section | Section II, p. 680 |
| Probability of multiple response $p_m = p_f$ design choice, Eqs. 38–40 | Section IV, pp. 601–622 |
| Global histogram percentile for noise estimation | Section VI, p. 788–790 |
