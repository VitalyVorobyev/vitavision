---
paper_id: harris1988-corner
title: "A Combined Corner and Edge Detector"
authors: ["C. Harris", "M. J. Stephens"]
year: 1988
url: https://bmva-archive.org.uk/bmvc/1988/avc-88-023.pdf
created: 2026-04-30
relevant_atlas_pages: [harris-corner-detector, image-gradient, structure-tensor]
---

> **Private — do not publish.** This file is a reasoning substrate for Claude
> and the repo owner. Public Atlas pages are authored by the page-type skills
> using the bullets in "Atlas update plan" below.

# Setting

**Problem class.** Feature-point extraction from monocular image sequences for 3D motion analysis. The paper addresses the joint detection of corners and edges — two distinct feature classes — within a single operator framework so that a vision pipeline can produce both localized corner points and thin directed edges from one pass over the image.

**Inputs.** A grayscale image $I$ of a natural outdoor scene (roads, buildings, bushes). No calibration assumptions. No known camera motion. The paper targets images with diverse texture, curved edges, and low-contrast regions where standard edge filters produce unstable topology.

**Outputs.** Two feature classes in a single 5-level image:
- *Corner pixels*: single pixels where the Harris response $R > 0$ and is an 8-connected local maximum, above a selected threshold.
- *Edge pixels* (edgels): pixels where $R < 0$ and is a local minimum in the dominant gradient direction (x or y, whichever has larger absolute first derivative). Applying hysteresis thresholding to these edgels produces thin, connected edges that terminate at corner regions.

**Guarantees and units.** $R$ has units of gradient-squared (same as eigenvalue products of $M$). The response is rotation-invariant. It is *not* scale-invariant; the spatial scale is set by the Gaussian window parameter $\sigma$. No metric subpixel precision is claimed — corner pixel locations are integer coordinates.

# Core idea

Moravec's corner detector computes the minimum over four discrete-shift directions of the summed squared intensity change $E(x, y) = \sum_{u,v} w_{u,v} [I(x+u+\Delta x, y+v+\Delta y) - I(x+u, y+v)]^2$. Harris observes three defects: (1) it samples only four shift directions (anisotropic), (2) the binary rectangular window amplifies high-frequency noise, and (3) taking only the minimum of $E$ makes it fire on edges.

The fix is to Taylor-expand $E$ for small shifts, yielding $E(x, y) \approx (x, y)\,M\,(x, y)^T$ where

$$
M = \begin{bmatrix} A & C \\ C & B \end{bmatrix},\quad A = I_x^2 \otimes w,\quad B = I_y^2 \otimes w,\quad C = (I_x I_y) \otimes w,
$$

with $w$ a Gaussian window and $I_x, I_y$ approximated by the kernels $(-1, 0, 1)$ and $(-1, 0, 1)^T$. Let $\alpha, \beta$ be the eigenvalues of $M$; both large $\Rightarrow$ corner, one large one small $\Rightarrow$ edge, both small $\Rightarrow$ flat.

Rather than compute $\alpha, \beta$ explicitly, the paper proposes the response

$$
R = \det(M) - k\,\operatorname{tr}(M)^2 = \alpha\beta - k(\alpha + \beta)^2.
$$

$R > 0$ in corner regions (both eigenvalues large relative to $k$ correction), $R < 0$ on edges (one eigenvalue dominates), and $|R|$ small in flat regions. The parameter $k$ is empirically set to 0.04–0.06. Using $\det$ and $\mathrm{tr}$ rather than explicit eigenvalues saves computation and is numerically equivalent for the classification task.

Edge pixels are detected where $R < 0$ and is a local minimum in the dominant-gradient direction; hysteresis thresholding then produces connected thin edges. Corner pixels are detected where $R > 0$ and is an 8-connected local maximum. The two classes together produce a connected edge-vertex graph (Figure 7 of the paper).

# Assumptions

1. (hard) The image contains meaningful intensity variation at the spatial scale of the Gaussian window $\sigma$. At scale $\sigma$ there is no response to structure finer than $\sigma$ pixels.
2. (hard) Gradients are approximated adequately by $(-1, 0, 1)$ finite differences. No explicit pre-smoothing is described for the gradient step itself; in noisy images this under-smoothing degrades $M$.
3. (soft) The Taylor expansion of $E$ is valid for "small shifts." The quadratic approximation breaks down at large shifts (curved edges, non-planar structure in the window). The detector still fires but the eigenvalue interpretation is approximate.
4. (soft) The Gaussian window is isotropic. The response is rotation-invariant under this assumption. Non-isotropic windows would require directional normalization.
5. (hard) $k$ is treated as a fixed scalar in the range 0.04–0.06. The classification of a pixel as corner vs edge changes with $k$; no principled rule is given for choosing $k$ beyond empirical range. High $k$ suppresses edge responses more aggressively but misses weak corners.
6. (soft) The scene is observed with sufficient contrast that gradient values are well above quantization noise. For 8-bit images, very low-contrast structure yields $I_x, I_y \approx 0$ and $M \approx 0$; the detector produces no response rather than a false positive.

# Failure regime

**Repeated or isotropic texture.** A region of perfectly isotropic texture (equal eigenvalues everywhere) produces a dense field of corners with no meaningful localization. In practice, textured regions produce so many local maxima of $R$ that NMS retains corners spread uniformly across the texture rather than at semantically distinct points. Harris and Stephens explicitly identify this in their outdoor imagery: "many of the corners in the bush are unconnected to edges, as they reside in essentially textural regions."

**Uniform-contrast edges (both eigenvalues large).** When an edge has enough noise that both $\alpha$ and $\beta$ are above the $k$-dependent threshold, the Harris response is positive and the edge is misclassified as a corner. This happens at edges of coarsely sampled or blurred patterns where the effective window sees both orientations simultaneously. Increasing $k$ partially mitigates this at the cost of lost weak corners.

**Scale mismatch.** The detector is tuned to features at scale $\sigma$. A corner smaller than $\sigma$ pixels (subpixel junction) or much larger than $\sigma$ pixels (wide blurry junction) produces a flat or uninformative $M$. Calibration patterns with corners at scales very different from the integration window produce weak or displaced responses.

**Near-parallel edges in the window.** An image patch containing two near-parallel edges (a thin stripe) with their spacing comparable to $\sigma$ yields $A \gg 0$, $B \approx 0$, $C \approx 0$: $M$ is rank-1 and $R < 0$. The interior of the stripe is detected as edge, not corner, even if the stripe endpoints are geometrically a corner. This is the fundamental aperture-problem limitation: $M$ at a single point cannot disambiguate two nearby parallel edges from a single edge.

**k choice sensitivity.** At $k = 0.04$, weak edges ($\beta$ slightly above zero) are suppressed by the $k \cdot \operatorname{tr}^2$ term. At $k = 0.06$, stronger edge responses are also suppressed. There is no principled way to choose $k$ for a given image; values outside 0.04–0.06 are not characterized in the paper. Downstream algorithms that use Harris as a front-end (e.g., RANSAC-based homography) are vulnerable to this ambiguity when the scene contains predominantly edge-like structure.

**No subpixel precision.** The paper reports integer-pixel corners. Calibration pipelines that require $< 0.1$ pixel accuracy must add a separate subpixel refinement step (e.g., iterative centroid, polynomial saddle fit).

# Numerical sensitivity

**Response scaling with contrast.** The paper explicitly analyzes the $(α, β)$ space under contrast scaling: multiplying image intensity by $\rho$ scales $\alpha$ and $\beta$ by $\rho^2$ (because they are gradient-squared quantities). Thus $R$ scales as $\rho^4$. A corner remains a corner and an edge remains an edge under contrast scaling — the classification is contrast-invariant for fixed $k$ — but the *threshold* $\tau$ applied to $R$ must be scaled by $\rho^4$ to maintain the same detection rate. Adaptive thresholding or normalization of $R$ by the image gradient energy is necessary for consistent detection across images of different exposure.

**Integer overflow.** For 8-bit images, $I_x$ spans approximately $[-510, 510]$ (central-difference on raw 8-bit values); $I_x^2$ spans $[0, 260100]$. Accumulating $A = I_x^2 \otimes w$ in 16-bit integers overflows. 32-bit integer or float32 accumulators are required throughout. $R = AB - C^2 - k(A+B)^2$ can overflow further if $A, B$ are large; float32 is adequate for typical window sizes but borderline for very large integration windows ($\sigma > 5$).

**Gradient approximation quality.** The $(-1, 0, 1)$ kernel has frequency response $2i\sin(\omega)$, which underestimates high-frequency gradient content. For images with significant energy above $0.3\,\mathrm{cycles/pixel}$ (sharp calibration edges), the Sobel or Scharr kernel is more accurate. This is a quantization, not a correctness, issue — the response $R$ will be slightly lower at sharp features than the theoretical value.

**Window size vs scale.** The Gaussian window should be truncated at $\sim 3\sigma$ pixels; a $3\sigma$-half-width window captures 99.7% of the Gaussian mass. Using a smaller window introduces frequency aliasing in the $w$-convolution step. The paper does not specify $\sigma$ numerically; empirically $\sigma \in [1, 3]$ pixels is typical.

# Applicability

- Use when: you need a fast, parameter-light feature-point detector for general-purpose tracking or homography estimation in scenes with well-separated, high-contrast corners.
- Use when: you want simultaneous corner and edge output from a single response map, e.g., to build an edge-vertex graph for structural scene description.
- Don't use when: subpixel accuracy < 0.5 pixels is required — the detector is integer-only without a separate refinement step.
- Don't use when: the input is a calibration pattern (checkerboard, ChArUco) — domain-specific X-corner detectors (ROCHADE, ChESS, Duda & Frese) exploit the 4-fold symmetry and produce subpixel accuracy at 1/10 the false-positive rate.
- Don't use when: images have highly variable exposure or contrast — the $R$ threshold must be re-tuned per image without normalization.
- Don't use when: real-time performance on embedded hardware is the primary constraint — FAST replaces the 3-convolution structure tensor with a ring-pixel comparison at much lower arithmetic cost.
- Compared against: Beaudet (1978) — uses $\det(\text{Hessian of image})$ as a rotationally invariant corner measure, equivalent to the "rotationally invariant" operator Harris critiques for edge over-response. Kitchen & Rosenfeld (1982) — uses a different curvature measure. Shi-Tomasi (1994) replaces $R$ with $\min(\alpha, \beta)$ for better tracking quality. Förstner (1987) uses $\det(M)/\operatorname{tr}(M)$ (harmonic mean) as the response, which normalizes for overall gradient energy.

# Connections

- Builds on: [rosten2006-fast] (cited in the paper's context as a background contrast detector, indirectly; actually Moravec 1980 is the upstream, not in the paper index — no valid ID exists for Moravec)
- Enables: [shi-tomasi1994-features] (directly supersedes Harris by replacing the response function), [shu2009-topological] (uses Harris as the first pipeline stage — §2), [abeles2021-pyramidal] (extends Harris-based corner detection to scale-space), [stelldinger2024-puzzleboard] (Hessian-based saddle detector in §4.1 is a direct variant of the Harris structure-tensor idea), [duda2018-accurate] (cites Harris as the baseline corner model in §3), [sinzinger2007-model-based] (cites Harris as the gradient-based corner model it contrasts), [laureano2013-topological] (uses Harris pipeline as one of the baseline detectors)
- Refutes / supersedes: Moravec 1980 corner detector (not in paper index)

# Atlas update plan

## UPDATE: harris-corner-detector

Section: Goal
- The page correctly states the output is integer pixel locations. Consider adding a one-line note that the paper also produces edge pixels (negative-R local minima in the dominant gradient direction), making the output a combined corner/edge response — the page's current Goal omits this second output class. This is low priority unless the page eventually covers edge detection, but it is a genuine gap versus the paper.

Section: Algorithm
- The existing page accurately states all equations and the Gaussian window. One addition worth considering: explicitly name the gradient kernel the paper uses ($(-1, 0, 1)$) — the paper specifies it as "approximated by $X = I \otimes (-1, 0, 1)$" (p. 149, col. 2). The page currently says "central differences or Sobel operators" which is correct but slightly broader than the paper specifies. Minor.
- The page does not describe the edge-pixel detection path ($R < 0$, local minimum in dominant gradient direction, hysteresis). This is part of the original algorithm. Whether to add it depends on whether the page scope covers edge output. Currently scoped to corners only — that is reasonable for an algorithms page titled "Harris Corner Detector", but it is worth flagging as a deliberate narrowing.

Section: Remarks
- Add a remark on the contrast-scaling behavior: $R$ scales as $\rho^4$ under intensity scaling $I \to \rho I$, so thresholds must be adapted per-image. This is mentioned in the paper (p. 150, col. 1: "increase of image contrast by a factor of $p$ will increase $\alpha$ and $\beta$ proportionately by $p^2$") and is an important practical note absent from the current page.
- The page is already accurate and well-grounded. The existing five sections cover the core method correctly. The above bullets are improvements, not corrections.

## UPDATE: structure-tensor

Section: Relation to the autocorrelation surface
- The page's existing content is accurate: "Harris's original motivation was to find pixels where $E$ has large curvature in all directions, justifying the trace and determinant formulation." The paper's derivation (Taylor expansion of $E$ to yield the quadratic form $(x,y)M(x,y)^T$) is already reflected.
- One minor addition: the paper explicitly labels the three cases (flat / edge / corner) as cases A, B, C in both the original Moravec discussion and again in the $(\alpha, \beta)$ analysis (pp. 149–150). The page uses the same three-case classification in the eigenvalue classification definition — this is already good.
- Nothing substantive to add; the concept page is well-grounded.

## UPDATE: image-gradient

Section: Where it appears
- The page already lists harris-corner-detector with the correct description ("builds the structure tensor from $I_x^2$, $I_x I_y$, $I_y^2$"). No content gap.
- The page does not note the specific gradient kernel Harris uses (the $(-1, 0, 1)$ approximation), but this is an implementation detail more appropriate for the algorithm page than the concept page. No change needed.
- The concept page is well-grounded relative to the Harris paper. No update bullets warranted beyond the single algorithm-page improvement above.

# Provenance

- Paper full text: `docs/papers/.cache/harris1988-corner.txt`, 5 pages (AVC 1988, doi:10.5244/C.2.23).
- Section "MORAVEC REVISITED" (p. 149, col. 1): The three cases A/B/C classifying flat/edge/corner behavior. The windowed shift energy $E(x,y) = \sum_{u,v} w_{u,v}[I(x+u+\Delta x, y+v+\Delta y) - I(x+u,y+v)]^2$; Moravec uses $w = 1$ within a rectangle, shifts $\{(1,0),(1,1),(0,1),(-1,1)\}$.
- Section "AUTO-CORRELATION DETECTOR" (p. 149, col. 2): Analytic expansion yielding $E \approx Ax^2 + 2Cxy + By^2$ where $A = X^2 \otimes w$, $B = Y^2 \otimes w$, $C = (XY) \otimes w$, $X = I \otimes (-1,0,1)$. "The change, E, for the small shift (x,y) can be concisely written as $E(x,y) = (x,y)M(x,y)^T$" — direct quote, p. 149, col. 2.
- Section "CORNER/EDGE RESPONSE FUNCTION" (p. 150, col. 1): $R = \text{Det} - k\,\text{Tr}^2$; "$k$ is an empirical sensitivity constant" — direct quote. "R is positive in the corner region, negative in the edge regions, and small in the flat region." Figure 5 caption: "Auto-correlation principal curvature space — heavy lines give corner/edge/flat classification, fine lines are equi-response contours."
- Contrast-scaling argument (p. 150, col. 1): "increase of image contrast by a factor of $p$ will increase $\alpha$ and $\beta$ proportionately by $p^2$" — direct quote used verbatim above because paraphrasing this would risk misrepresenting the quadratic vs quartic scaling.
- Edge detection path (p. 150, col. 2): "edge region pixels are deemed to be edgels if their responses are both negative and local minima in either the x or y directions, according to whether the magnitude of the first gradient in the x or y direction respectively is the larger."
- Failure mode (textural regions, p. 150, col. 2): "many of the corners in the bush are unconnected to edges, as they reside in essentially textural regions" — direct quote retained.
- k range: Not stated as a numerical range in the paper itself; "0.04–0.06" appears in downstream literature (Shi-Tomasi 1994, and the `docs/papers/index.yaml` notes for harris1988-corner). The paper says only "empirical sensitivity constant"; the range 0.04–0.06 is empirical convention, not from the paper.
