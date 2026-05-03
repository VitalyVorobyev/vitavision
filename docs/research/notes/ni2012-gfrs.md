---
paper_id: ni2012-gfrs
title: "Fast Radial Symmetry Detection Under Affine Transformations"
authors:
  - Jie Ni
  - Maneesh K. Singh
  - Claus Bahlmann
year: 2012
url: https://ieeexplore.ieee.org/document/6247768/
created: 2026-05-03
relevant_atlas_pages: [loy-fast-radial-symmetry, ni-generalized-fast-radial-symmetry]
---

# Setting

**Problem class:** Detecting points of (elliptical) radial symmetry in images where the viewed object is a circular structure seen under bounded perspective projection. The method directly extends Loy & Zelinsky 2003 FRS (circular radial symmetry) to the affine/perspective case.

**Inputs:** A greyscale or colour image of arbitrary content; optionally, application-specific priors on camera height and viewing angle (to narrow the affine search range). No explicit calibration is assumed.

**Outputs:** A GFRS response map per sampled affine transform $G_i$, combined into a single interest-point map by per-pixel maximisation over the stack. Each surviving interest point is characterised by five ellipse parameters $(c_x, c_y, \theta, a, b)$ and a confidence value derived from the response magnitude.

**Guarantees:** Linear complexity in the number of image pixels $N$ for each sampled $G_i$ (inherited from FRS), though the total cost scales with the number of sampled affine hypotheses (50–200 in the nuclei experiment). No calibrated metric output — the ellipse axes $a, b$ are in image pixels.

# Core idea

FRS votes each pixel $p$ toward two candidate centre pixels

$$p^{+}(p) = p + \operatorname{round}\!\left(\frac{g(p)}{\|g(p)\|} n\right), \quad p^{-}(p) = p - \operatorname{round}\!\left(\frac{g(p)}{\|g(p)\|} n\right) \tag{Eqs 1–2}$$

using the image gradient direction $g(p)$ as a proxy for the inward/outward radial direction; this is only correct for circles. For an ellipse $q(\phi) = G \cdot (p(\phi) - c) + c$ with $G = R \cdot S$ (rotation by $\theta$, anisotropic scale $(a, b)$), the true voting direction toward the ellipse centre is $V_{q(\phi)} = G \cdot N_{p(\phi)}$ (Proposition 2), where $N_{p(\phi)}$ is the normal to the corresponding point on the unit circle. Since the observed tangent at $q(\phi)$ is $\hat{T}_{q(\phi)}$ (estimated from image gradients), and tangent and normal are related by a $90°$ rotation $M = \bigl[\begin{smallmatrix}0&1\\-1&0\end{smallmatrix}\bigr]$, the corrected voting direction is

$$\hat{V}_{q(\phi)} = G \cdot M \cdot G^{-1} \cdot \hat{T}_{q(\phi)} \tag{Eq. 8}$$

In practice the image gradient $g(p)$ already estimates the local normal direction, so Eq. 8 is applied as $\hat{V}_{q(\phi)} = G M G^{-1} M^{-1} g(p)$ (Eq. 9), and the modified votes are

$$p^{+}(p) = p + \operatorname{round}\!\left(\frac{\hat{V}_{q(\phi)}}{\|\hat{V}_{q(\phi)}\|} n\right), \quad p^{-}(p) = p - \operatorname{round}\!\left(\frac{\hat{V}_{q(\phi)}}{\|\hat{V}_{q(\phi)}\|} n\right) \tag{Eqs 10–11}$$

For each sampled $G_i$ from the 3-D parameter space $(\theta, a, b)$ of the constrained affine group $A(2)$, a FRS response map is computed with these warped votes. The stack of maps is reduced by per-pixel max to a single response image. The result captures ellipses of all sampled sizes, shapes, and orientations.

The FRS radial symmetry response is $S_n = F_n * A_n$ (Eq. 3), where

$$F_n(p) = \left(\frac{M_n(p)}{k_n}\right)\!\left(\frac{|\tilde{O}_n(p)|}{k_n}\right)^{\!\alpha}, \quad \tilde{O}_n(p) = \begin{cases} O_n(p), & O_n(p) < k_n \\ k_n, & \text{otherwise} \end{cases} \tag{Eqs 4–5}$$

with $M_n, O_n$ the magnitude and orientation projection images, $A_n$ an isotropic Gaussian, $k_n$ a per-radius normalising factor, and $\alpha$ the radial strictness parameter. GFRS inherits this structure unchanged but adapts $k_n$ and the Gaussian $A_n$ to the current $G_i$ so that the smoothing is anisotropic and consistent with the ellipse shape.

# Assumptions

1. **(Hard) Bounded perspective projection.** The method is parameterised over the constrained affine group $A(2) = \{G = RS\}$. Full unconstrained projective homographies (severe foreshortening, out-of-plane tilts beyond the sampled range) are not handled; votes will not converge to the true centre. The paper states "invariant to (bounded) perspective projection" throughout. [Abstract, Sec. 2]
2. **(Hard) Symmetric object has an identifiable elliptical boundary at the chosen scale.** The algorithm requires coherent gradient votes along the ellipse perimeter. Objects that are only weakly symmetric or have heavily fragmented boundaries yield diffuse response maps.
3. **(Soft) Affine search range covers the true distortion.** If the actual $(a, b, \theta)$ of the ellipse falls outside the sampled grid, detection probability degrades gracefully (no hard failure; the nearest sampled $G_i$ may still produce a displaced or attenuated peak).
4. **(Soft) Local image gradients are a reliable proxy for the ellipse tangent.** This is the same assumption as FRS. Severe noise, low contrast, or texture inside the ellipse degrades voting accuracy.
5. **(Soft) No two distinct ellipses of the same size and orientation overlap at the same centre.** Like FRS, GFRS does not explicitly separate overlapping structures; it merely suppresses non-maxima in the combined response map. Touching/overlapping nuclei are handled approximately. [Sec. 3.2]

# Failure regime

- **Out-of-range affine distortion.** When perspective foreshortening or out-of-plane rotation produces an ellipse with $(a, b, \theta)$ outside the sampled subset of $A(2)$, no $G_i$ generates a focussed response; the method silently misses the detection. This is the primary theoretical failure mode. [Sec. 1 / Abstract: "bounded cases of perspective projection"]
- **FRS-inherited gradient diffusion.** The paper states that under perspective projection, FRS gradient voting directions deviate from the true radial vector, causing "diffusion and dispersion of the locus of symmetry in the object space." [Sec. 2.1, citing Yang & Parvin CVPR 2004 [12]]. GFRS corrects this for the sampled $G_i$, but residual diffusion remains for unsampled parameters.
- **Dense sampling combinatorics.** Without application-specific priors, the 3-D search grid (50–200 samples in the nuclei experiment) multiplies the FRS runtime by the same factor, making real-time use impractical. With priors (known camera height / angle), sampling collapses toward the FRS 1-D scale space. [Sec. 3.3]
- **Touching/overlapping nuclei.** The paper observes that GFRS "can effectively detect nuclei … even in challenging cases of touching/overlapping nuclei" but does not claim perfect separation; downstream segmentation is still required. [Sec. 3.2]

# Numerical sensitivity

- **Normalising factor $k_n$** (Eq. 4–5): In FRS, $k_n$ is empirically tuned per radius to compensate for the varying number of perimeter votes as $n$ changes. For GFRS, $k_n$ must be re-determined for each $(a, b)$ pair because the ellipse perimeter length varies with the semi-axes. The paper notes this explicitly but does not give a closed-form formula; the suggestion from [1] (Loy & Zelinsky 2003) is followed. [Sec. 2.2, "Normalizing factor $k_n$"]
- **Anisotropic Gaussian smoothing.** The smoothing kernel in $S_n = F_n * A_n$ is made 2-D and anisotropic, parameterised by $(\theta, a, b)$ of the current $G_i$. The motivation is that under noise the voting location error is proportional to $\|V_{q(\phi)}\|$, which depends on the ellipse axis lengths. Using a circularly symmetric kernel for elongated ellipses over-smooths along the minor axis and under-smooths along the major axis. [Sec. 2.2, "Smoothing"]
- **Radial strictness $\alpha$**: Inherited from FRS (Eq. 4). Higher $\alpha$ penalises pixels with large orientation projection $O_n$ more aggressively; typical values from FRS (integer $\alpha \geq 1$) carry over without re-tuning reported.
- **Timing precision**: The reported ~20 ms per sampled $G_i$ for a $375 \times 250$ image (vs ~16 ms for FRS alone) is a wall-clock figure, hardware unspecified. [Sec. 3.3]

# Applicability

- **Use when:** The target structure is a circle seen under mild to moderate perspective projection (wheels, coins, cell nuclei in histopathology slides scanned at a fixed magnification). The affine distortion range is either known in advance (camera geometry priors available) or is narrow enough that a small grid of $G_i$ hypotheses suffices.
- **Don't use when:** Severe or unknown perspective distortion places the ellipse parameters outside any tractable search grid. Also avoid when $O(N \cdot |grid|)$ compute is unacceptable and application priors cannot shrink the grid; in that case plain FRS at a slightly larger scale tolerance may suffice.
- **Compared against (nuclei detection, Fig. 5):**
  - FRS (Loy & Zelinsky 2003 [1]) — circular voting, baseline; outperformed by GFRS across the full precision–recall curve.
  - Hessian-matrix-based detection [16] (Bilgin et al. 2010, ECM-aware cell-graph) — outperformed.
  - SVM-based detection [15] (Khurd et al. ISBI 2011, network-cycle features for prostate grading) — outperformed.
  - The paper's headline claim: "at a recall of 95%, only every 13th detection corresponds to a false alarm." None of the other methods achieved comparable performance. [Sec. 3.2]

# Connections

- **Builds on:**
  - `loy2003-frst` (Loy & Zelinsky, PAMI 2003 [1]) — GFRS is a direct parametric extension of FRS.
  - `???` (Cornelius & Loy, ICPR 2006 [8]) — prior work on affine-projection radial symmetry detection; GFRS claims better computational efficiency.
  - `???` (Ballard, Pattern Recognition 1981 [9]) — Generalised Hough Transform, which motivates the voting framework.
  - `???` (Hartley & Zisserman, MVG 2003 [13]) — algebraic basis for the affine group $A(2)$ used to parameterise $G$.
  - `???` (Maybank, IJCV 2007 [14]) — Fisher-Rao metric for ellipse detection; cited to justify restricting $G \in A(2)$ for uniqueness.
  - `???` (Yang & Parvin, CVPR 2004 [12]) — "Perceptual organization of radial symmetries"; cited for the gradient-diffusion failure of FRS under perspective projection.
- **Evaluated against (histopathology baselines, not Atlas pages):**
  - `???` (Khurd et al. ISBI 2011 [15])
  - `???` (Bilgin et al. 2010 [16])
  - `???` (Cosatto et al. ICPR 2008 [17])
- **Enables:** future deep-learning cell-nucleus detectors trained on GFRS-detected interest points (not yet on the Atlas).

# Atlas update plan

## UPDATE: loy-fast-radial-symmetry

Section: frontmatter `relations:`

Bullets:
- Add an entry to `relations:` (create the field if missing — there is none today):
  `{ type: extended_by, target: ni-generalized-fast-radial-symmetry, confidence: high }`.
  Optional `caution:` — leave omitted (the relation is straightforward).

---

## NEW: ni-generalized-fast-radial-symmetry

Type: algorithm
Category: features
Tags: feature-detection, radial-symmetry, affine-invariant
Primary source: ni2012-gfrs

Relations: none manual — the build emits the reverse `extending: [loy-fast-radial-symmetry]` from the `extended_by` entry added above. Do not author a manual `relations[]` on this page that mirrors the FRST entry.

Quality: omitted (default).

### Goal
- Detect points of elliptical radial symmetry in images where circular structures are seen under bounded perspective projection (wheels, coins, cell nuclei in histopathology slides). [Abstract, Sec. 1]
- Output is a response map whose maxima correspond to ellipse centres, together with the five ellipse parameters $(c_x, c_y, \theta, a, b)$ and a confidence score per interest point. [Sec. 3.2]

### Algorithm
- Parameterise the space of perspective-induced ellipses as the constrained affine group $A(2) = \{G = RS \mid R \text{ rotation}, S \text{ anisotropic scale}\}$; each $G$ maps a unit circle to an ellipse of orientation $\theta$ and semi-axes $(a, b)$. [Sec. 2.2, Eq. 7]
- For each sampled $G_i$, correct the FRS gradient-voting direction using Propositions 1–3: the voting direction toward the ellipse centre is $\hat{V} = GMG^{-1}M^{-1}g(p)$ (Eq. 9), replacing the bare gradient direction $g(p)/\|g(p)\|$ used by FRS. [Sec. 2.2, Eqs 8–11]
- Run the full FRS accumulation (orientation projection $O_n$, magnitude projection $M_n$, response $S_n = F_n * A_n$) with the corrected votes and an anisotropic Gaussian kernel matched to the current $G_i$. [Sec. 2.2, Eqs 3–5 + "Smoothing" paragraph]
- Combine the per-$G_i$ response maps by per-pixel maximisation into a single interest-point map; apply non-maximum suppression and threshold to extract candidate ellipses. [Sec. 2.2 + Sec. 3.2]
- Retain linear per-pixel complexity $O(N)$ for each $G_i$; total cost is $O(N \cdot |grid|)$ where $|grid|$ is 50–200 samples in the histopathology application. [Sec. 3.3]

### Implementation
- Nuclei detector affine grid: $a \in \{6,8,10,12,14,16\}$ pixels, $b \in \{4,6,8\}$ pixels, $\theta = i\pi/8, i=0,\dots,7$ — yielding up to $6 \times 3 \times 8 = 144$ hypotheses. [Sec. 3.2]
- Test images: $512 \times 512$ patches from H&E-stained "virtual slides" at 0.47 µm/pixel (40× objective scan resolution). Ground truth: 2555 manually annotated nuclei centroids from 5 images. [Sec. 3.2]
- Reported runtime: ~20 ms per sampled $G_i$ for a $375 \times 250$ image (cf. ~16 ms for FRS alone); highly parallelisable across the $G_i$ grid. [Sec. 3.3]
- Re-determine the normalising factor $k_n$ per $(a,b)$ pair (not just per radius $n$) to compensate for varying ellipse perimeter length. [Sec. 2.2, "Normalizing factor $k_n$"]
- The smoothing Gaussian $A_n$ should be anisotropic, aligned to the current $G_i$, because voting errors scale with $\|\hat{V}_{q(\phi)}\|$ which depends on axis length. [Sec. 2.2, "Smoothing"]

### Remarks
- FRS without the affine correction shows "diffusion and dispersion of the locus of symmetry" under perspective, while GFRS correctly focuses all $\hat{V}$ vectors at the ellipse centre — demonstrated qualitatively in Figures 2–3 (wheels, coins, tomatoes). [Sec. 2.1, Sec. 3.1]
- With camera geometry priors (known height and viewing angle), the 3-D grid collapses to near the FRS 1-D scale space, making GFRS almost as fast as FRS in constrained settings such as surveillance cameras. [Sec. 3.3]
- GFRS is not an invariant detector in the SIFT/Harris-Affine sense; it is a hypothesis-search detector over a discrete grid of affine transforms. Coverage depends entirely on grid design. [Sec. 1.1 — explicitly contrasted with Cornelius & Loy 2006]
- Quantitative comparison in Fig. 5: at 95% recall, only 1 in 13 GFRS detections is a false alarm on the nuclei dataset; FRS, Hessian, and SVM detectors all fall substantially below this operating point. [Sec. 3.2]

### References
- Primary: Ni, Singh, Bahlmann, CVPR 2012 (this paper).
- Extends: Loy & Zelinsky, PAMI 2003 [1] — FRS; the `sources.primary` entry for the FRST algorithm page (`loy2003-frst`).
- Closely related prior: Cornelius & Loy, ICPR 2006 [8] — earlier affine-projection radial symmetry via SIFT matching; GFRS claims lower computational cost.
- Framework: Ballard GHT 1981 [9]; Hartley & Zisserman MVG 2003 [13].

# Provenance

- Eqs 1–2: Sec. 2.1 (FRS voting, as reviewed by GFRS paper).
- Eqs 3–5: Sec. 2.1 (FRS response map definition).
- Eq. 6: Sec. 2.2 (circle parametrisation).
- Eq. 7: Sec. 2.2 (affine transform $G = RS$ for ellipse).
- Propositions 1–3 + proofs: Sec. 2.2.
- Eq. 8: Sec. 2.2 (unbiased voting direction estimator).
- Eq. 9: Sec. 2.2 (practical gradient-correction formula).
- Eqs 10–11: Sec. 2.2 (corrected GFRS vote locations).
- $k_n$ discussion: Sec. 2.2, paragraph "Normalizing factor $k_n$".
- Anisotropic smoothing: Sec. 2.2, paragraph "Smoothing".
- Affine grid values $(a, b, \theta)$: Sec. 3.2.
- Dataset specs ($512 \times 512$, 0.47 µm/pixel, 2555 nuclei, 5 images): Sec. 3.2.
- Runtime (~20 ms per $G_i$, $375 \times 250$, 50–200 samples): Sec. 3.3.
- ROC headline (95% recall, 1-in-13 false alarm): Sec. 3.2.
- Competitors listed (FRS [1], Hessian [16], SVM [15]): Sec. 3.2 + Fig. 5.
- "Bounded perspective projection" scope claim: Abstract + Sec. 1.
- Gradient diffusion failure of FRS: Sec. 2.1, citing [12].
- Parallelisability claim: Sec. 3.3.
