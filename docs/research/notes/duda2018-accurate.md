---
paper_id: duda2018-accurate
title: "Accurate Detection and Localization of Checkerboard Corners for Calibration"
authors: ["A. Duda", "U. Frese"]
year: 2018
url: https://bmvc2018.org/contents/papers/0508.pdf
created: 2026-05-01
relevant_atlas_pages: [duda-radon-corners, chess-corners, pyramidal-blur-aware-xcorner, puzzleboard]
---

# Setting

**Problem class.** Per-pixel detection and immediate subpixel localisation of X-junction corners on a planar checkerboard pattern in a single grayscale image, without a separate refinement pass. Calibration is the primary application: the output corner set feeds Zhang-style intrinsic and extrinsic estimation directly.

**Motivation.** In-field calibration (handheld board, outdoor light, motion blur, low contrast) breaks gradient-based detectors. Gradient operations amplify high-frequency noise; Duda-Frese respond by replacing them with integral (box-filter) operations that average noise away. The localized Radon framing arises from this substitution: line integrals, not gradient covariance, are the primitive.

**Inputs.** Single-channel grayscale image of any resolution. No pattern-dimension parameters are required by the corner detector itself (unlike ROCHADE); a downstream grid-growing step (§4.2, cross-ratio expansion from a 3×3 seed) interprets the response map. No prior on square size or camera intrinsics.

**Outputs.** A set of subpixel (x, y) locations and local centreline angles from the response-map peak fit. Angle output distinguishes the two centreline directions, enabling grid-growth without an explicit corner model (§4.2 uses the angles to seed neighbour search in a k-d tree). The response value doubles as a confidence score for thresholding.

**Guaranteed accuracy.** §5 Conclusion: "close to the theoretical limit of 1/100 of a pixel" on crisp synthetic inputs (citing Kiger 2010 as the bound). Under Gaussian noise the method outperforms Förstner's subpixel operator (OpenCV cornerSubPix) at every tested noise level (§4.1, Figs. 5b, 7a).

# Core idea

A checkerboard X-junction is point-symmetric: opposite quadrants share the same intensity (bright–dark–bright–dark at 90° intervals). The localized Radon transform $R_f^{\text{local}}[x,y,\alpha]$ is the sum of pixel values along a ray of length $2m+1$ centred on $(x,y)$ at angle $\alpha$ (§3, Eq. 2):

$$R_f^{\text{local}}[x, y, \alpha] = \sum_{k=-m}^{m} f\!\bigl(x + k\cos\alpha,\; y + k\sin\alpha\bigr).$$

At a true X-junction, point symmetry makes $R_f^{\text{local}}$ a near-sinusoidal function of $\alpha$ with period $\pi/2$ (Fig. 3a): the bright centreline direction gives a maximum and the dark centreline gives a minimum separated by half-period. The detector response is the squared gap:

$$f_c[x, y] = \Bigl[\max_{\alpha \in \mathcal{A}} R_f^{\text{local}} - \min_{\alpha \in \mathcal{A}} R_f^{\text{local}}\Bigr]^2, \quad \mathcal{A} = \{0,\tfrac{\pi}{4},\tfrac{\pi}{2},\tfrac{3\pi}{4}\}.$$

Four discrete angles suffice because point symmetry guarantees the response is near-sinusoidal — sampling two orthogonal pairs $\{0,\pi/2\}$ and $\{\pi/4,3\pi/4\}$ captures the max and min reliably. The gap is squared to keep $f_c \geq 0$ and sharpen peaks.

**Implementation via box filters (§3.1, Eq. 3).** Computing the full Radon transform at every pixel is prohibitive. Instead: rotate the image by $\alpha \in \{0, \pi/4\}$, apply a $1 \times (2m+1)$ horizontal box blur and a $(2m+1) \times 1$ vertical box blur to each rotated copy, rotate back — this yields all four directional line integrals in two image rotations and four box convolutions, each $O(|\Omega|)$ via running sums. Supersample by ×2 before rotation to reduce anti-aliasing artifacts in the bilinear-sampled rotated copies.

**Subpixel refinement.** No separate refinement stage; subpixel accuracy is intrinsic to the pipeline. After box-smoothing the response map $f_c$ with a $k \times k$ filter to suppress discretisation noise, a Gaussian peak fit is applied to the neighbourhood of each local maximum (§3, §4.1). Fitting the peak of $f_c$ rather than a gradient saddle or polynomial is the key departure from Förstner-family refinement.

# Assumptions

1. (hard) The target has point-symmetric X-junctions at its inner corners. The response $f_c$ is maximised by construction at such junctions and is non-discriminating on non-checkerboard content. Non-square corners (e.g. deltille triangular junctions) produce a different angular periodicity that the four-angle approximation does not model.
2. (soft) The corner's angular diameter is well matched by the box-filter half-length $m$. The paper fixes $m = 4$ (blur kernel $1 \times 9$) throughout all evaluations. Small $m$ truncates the integral inside one sector; large $m$ crosses into adjacent junctions. No adaptive $m$ selection is described.
3. (soft) The ×2 supersample is applied before rotation. Omitting it roughly doubles the subpixel error (§4.1, Fig. 7b discussion) but halves the runtime; the trade-off is stated but the no-supersample path is not characterised for the worst-case error distribution.
4. (soft) Gaussian peak fit is valid at local maxima of $f_c$. The fit assumes $f_c$ has a Gaussian shape near the peak, which is a good approximation when the response is unimodal. The approximation degrades at image boundaries or when two nearby corners produce overlapping responses.
5. (hard) The image is grayscale (single channel). Color images must be converted; no per-channel policy is given.
6. (soft) The Gaussian peak fit for subpixel localisation converges stably. For very small $m$ (e.g. $m = 1$, blur $1 \times 3$) or very low contrast, the response map may be flat near the peak and the fit may be poorly conditioned. The paper does not characterise this regime.
7. (soft) Image noise is approximately white (Gaussian). Box-filter averaging attenuates noise by $\sqrt{2m+1}$; spatially correlated noise (camera ISP demosaic artifacts, JPEG blocking) would not be attenuated at the same rate. Not explicitly characterised.

# Failure regime

- **Strong Gaussian blur.** The paper's Fig. 5a shows that Förstner's subpixel operator (OpenCV) outperforms the Duda-Frese detector under large Gaussian blur ($\sigma_b > 2$ px). At $\sigma_b = 5$, the Förstner error is roughly half that of the proposed method. The paper's box-filter approach reaches its best accuracy on crisp images and degrades gracefully under moderate blur, but Förstner's gradient-weight implicit Gaussian downsamples the corner more aggressively and becomes more accurate under heavy blur. This is the primary accuracy inversion.
- **Intermediate angles between discrete samples.** The four-angle approximation degrades when the true centreline angle falls midway between adjacent angles in $\mathcal{A}$ (i.e., near 22.5°, 67.5°, etc.). The response is reduced because neither angle exactly aligns with the bright-sector centreline. The paper does not quantify this angular sensitivity; it is visible as the "Rotation Angle in degree" plot in Fig. 6a, where the proposed method's error is modestly higher than Förstner's at certain rotations.
- **Non-square X-junctions.** A corner where the two centreline angles are not 90° apart (oblique perspective distortion) does not produce the expected sinusoidal periodicity. The four-angle approximation assumes orthogonal pairs; at large viewing angles, the periodic structure breaks down. Fig. 6b shows both detectors degrade above ~60° viewing angle; the relative advantage of the proposed method narrows.
- **Very low contrast or near-zero image gradient.** The box-filter sum differs from a noise floor only when there is sufficient intensity variation between bright and dark sectors. The paper states the method is "robust to low contrast" but does not specify a minimum contrast threshold.
- **Periodic texture masquerading as X-junctions.** The response $f_c = (\max - \min)^2$ over four angles is not a structured discriminator against all symmetric patterns. A uniformly lit square tile boundary at 45° or a circular gradient blob could produce a high $f_c$ value. The downstream NMS and thresholding suppress spurious responses, but the false-positive rate on non-checkerboard imagery is not characterised.
- **No full-pattern verification.** Unlike ROCHADE (which verifies $rc$ saddles with grid topology) and ChESS (which is used with a grid-growing wrapper), the Duda-Frese corner detector is a per-pixel filter. False positives must be removed by the downstream grid-growing step (§4.2, cross-ratio expansion). The paper's evaluation on real images implicitly relies on this downstream filter; the detector alone has no rejection criterion.

# Numerical sensitivity

- **Box-filter half-length $m$.** Fixed at $m = 4$ (kernel $1 \times 9$) throughout all evaluations (§4.1). The effective support window is $9 \times 9$ px at the supersampled resolution (18 × 18 at input resolution, since ×2 supersample applies first). Corners significantly smaller than 9 px are underresolved; corners significantly larger than 9 px are over-averaged. There is no adaptive-$m$ mechanism in the paper.
- **Supersampling factor.** Fixed at ×2. The paper reports that omitting it roughly doubles the subpixel error but roughly halves the runtime (Fig. 7b). The ×2 choice is empirical; no theoretical analysis of the anti-aliasing benefit at other scales is given.
- **Response-smoothing box size $k$.** A $k \times k$ box filter is applied to the response map before peak detection to suppress discretisation noise. The paper does not specify $k$ explicitly — it is implied by the procedure description. For the supersampled image, the smoothing half-size must match the expected discretisation artifact scale.
- **Gaussian peak fit.** Applied to the response map in a small neighbourhood of each local maximum. The fit is equivalent to computing the subpixel centroid of a Gaussian-approximated peak. At ×2 supersampling, the output coordinates are then divided by 2. Floating-point precision is adequate; the limiting factor is the discrete angle sampling error (up to ~0.05 px peak-position bias at intermediate angles).
- **Rotation bilinear interpolation.** Image rotation introduces bilinear-sampled values at non-integer positions. Errors here propagate into the line integrals. The ×2 supersampling mitigates this by doubling the effective pixel density before rotation.
- **Computational cost.** $O(|\Omega|)$ per image, dominated by two image rotations plus four box blurs plus the response combination. Processing time on a 2.3 GHz Intel Core i7 (one core) is roughly 0.15 s for 2 MP with anti-aliasing, 0.05 s without (Fig. 7b). The checkerboard detector wrapper (grid growing + subpixel fit) adds roughly 3–5 s at 4 MP (Fig. 8b), compared to 5–6 s for the OpenCV findChessboardCorners pipeline at the same size. The paper asserts that "the proposed method is also mostly linear in the number of processed pixels."
- **Integer vs floating-point.** The box filter operations are integer-compatible (sum of integer pixel values) but bilinear rotation and the Gaussian peak fit require floating-point arithmetic. The paper uses 32-bit float throughout; no precision sensitivity analysis is given.

# Applicability

- Use when: in-field calibration conditions prevail (outdoor light, motion blur, low contrast, low signal-to-noise). The box-filter approach suppresses noise; gradient-based methods amplify it. On real outdoor data (§4.2, Tables 1–2), the proposed method achieves mean residual 0.0459 px vs 0.0738 px for OpenCV Förstner.
- Use when: calibration accuracy on crisp images is paramount and no additional refinement pass is desired. The method achieves ~1/100 px accuracy on crisp synthetic corners (§4.1, Fig. 4b) without any separate subpixel step.
- Use when: GPU or SIMD parallelism is available. The operations (rotate, box blur, max/min) are all data-parallel with no data dependencies between pixels; the paper notes this as a design motivation.
- Don't use when: image blur is the dominant degradation and a gradient-based refinement (Förstner / cornerSubPix) is also feasible. Under strong Gaussian blur ($\sigma_b > 2$), Förstner outperforms the proposed method (§4.1, Fig. 5a).
- Don't use when: the full checkerboard must be verified as present. The Duda-Frese detector is a per-pixel filter; full-pattern verification requires the downstream grid-growing wrapper from §4.2. ROCHADE provides integrated full-pattern verification.
- Don't use when: corner-angle uniformity matters. The four-angle discretisation introduces modest error at intermediate rotation angles; gradient saddle fits (Förstner) do not have this angular sensitivity.
- Compared against (paper's own §4):
  - **Förstner / OpenCV cornerSubPix** (Eq. 1, §4): the sole baseline throughout all synthetic tests. The proposed method is strictly better under Gaussian noise (Figs. 5b, 6a at all rotations, 6b at moderate viewing angles) and on real outdoor data (Tables 1–2). Förstner is strictly better under strong Gaussian blur (Fig. 5a, $\sigma_b > 2$). On indoor controlled data, both are nearly tied (Table 1, residuals 0.0332 vs 0.0391 px).

# Connections

- Builds on:
  - **harris1988-corner** — cited as the canonical gradient-based corner detector ($R_C = \det M - k \cdot \text{trace}^2 M$). Duda-Frese explicitly position their work against Harris as the gradient-based alternative; the sector/centreline model (citing Sinzinger 2008) is the conceptual departure.
  - **sinzinger2007-model-based** (in index, not yet ingested) — provides the sector/centreline junction model (Fig. 2a) that the Radon framing implements. Sinzinger's "radial energy" uses concentric ring integrals; Duda-Frese replace rings with radial rays.
  - **rufli2008-blurred** — OpenCV's blurred-and-distorted checkerboard extension; Duda-Frese cite it as a prior approach to robustness and use OpenCV's pipeline as the checkerboard-level comparison baseline.
  - **zhang2000-flexible** (in index, already ingested note not required here) — the calibration use case, implicit in the problem framing.
  - Maire 2009 (not in index) — cited for the rotation + 1-D box blur trick used to approximate steerable filters; Duda-Frese apply the same approach to the Radon integral.
- Enables (in the atlas):
  - **duda-radon-corners** — primary source for the existing atlas page.
  - **pyramidal-blur-aware-xcorner** — abeles2021-pyramidal §III-D explicitly states: "the spoke pass is conceptually similar to the approximated Radon transform in [19]" where [19] is this paper. The pyramidal spoke filtering is a direct descendant of the Duda-Frese box-filter Radon approximation, extended to multi-scale and pyramidal corner localisation.
  - **puzzleboard** — Stelldinger 2024 §4.1 lists Duda-Frese's detection as one of the substitutable subpixel corner-detection steps for PuzzleBoard corner localisation (the atlas note records this).
  - **chess-corners** — indirectly: the Duda-Frese method competes in the same X-corner detection problem space as ChESS (Bennett 2013), though neither cites the other. The comparison axis (ring sampling vs. ray sampling) is the most technically distinctive pairing in this family.
- Refutes / supersedes:
  - **OpenCV cornerSubPix (Förstner)** under image noise and in-field degradation conditions. The paper demonstrates strict dominance on noisy synthetic data and on real outdoor calibration (§4.1–4.2). The superiority under blur is reversed (Förstner wins above $\sigma_b = 2$).

# Atlas update plan

## UPDATE: duda-radon-corners

The existing atlas page (`content/algorithms/duda-radon-corners.md`) is accurate and well-structured: the localized Radon definition, four-angle approximation, box-filter implementation, procedure steps, and Rust code correctly reflect the paper. The frontmatter sources are correct. The following targeted improvements are warranted:

Section: Algorithm — Core rationale

- **Add: noise-robustness argument as a first-principle.** The page states $f_c$ at a true X-junction is maximised where "the bright-sector integral is largest and the dark-sector integral is smallest" but does not surface *why* box filters are used instead of gradient filters. The paper's first-principle (§1, §3): gradient operations amplify additive noise by differentiation; box-filter sums attenuate it by a factor $\sim\sqrt{2m+1}$. This should appear early — it is the architectural motivation, not a Remarks footnote.
- **Add: four-angle justification from point symmetry.** The Remarks note says "the four-angle discretisation is justified by point symmetry." The Algorithm section should state this more precisely: at a true X-junction, $R_f^{\text{local}}[x,y,\alpha]$ is near-sinusoidal in $\alpha$ with period $\pi/2$, so two orthogonal pairs $\{0,\pi/2\}$ and $\{\pi/4,3\pi/4\}$ capture the max and min of one full period (§3, Fig. 3a). Currently the Algorithm section defines $\mathcal{A}$ without explaining why four angles and not more.

Section: Procedure

- **Add: centreline angle output.** Step 8 of the existing Procedure says "Gaussian peak fit to $f_c$." The paper §4.2 notes that the blurred directional images can also be fused to estimate *per-corner centreline angles* (both directions), enabling the downstream grid-growing step to use the angles to search for neighbour corners in the k-d tree. This output is currently absent from the Procedure description; it is the mechanism by which the grid-growing wrapper works without explicit checkerboard geometry.
- **Add: checkerboard detector wrapper.** The Procedure describes the corner-detector pipeline but not the full checkerboard detection (§4.2): cross-ratio growth from a random 3×3 seed using angles stored in the k-d tree. This is the "implementation" that the paper evaluates against OpenCV `findChessboardCorners`. Either add a separate Procedure block or a Remarks bullet explaining that the corner detector is wrapped by this grid-growing step in the paper's evaluation.

Section: Remarks

- **Add bullet — Gaussian blur accuracy inversion.** Under strong Gaussian blur ($\sigma_b > 2$ px), the Förstner/OpenCV subpixel operator outperforms the Duda-Frese method (§4.1, Fig. 5a). The page's Remarks do not mention this limitation. It is the primary regime where the method does not dominate.
- **Add bullet — empirical accuracy numbers.** Table 1 (indoor controlled): proposed mean residual 0.0332 px vs OpenCV 0.0391 px. Table 2 (outdoor in-field): 0.0459 px vs 0.0738 px. Currently absent; gives readers a calibrated sense of accuracy and the magnitude of the advantage.
- **Revise "Kernel half-length" bullet.** Current text says $m \in \{1, \dots, 4\}$ (i.e. $1 \times 3$ to $1 \times 9$ blurs). The paper fixes $m = 4$ ($1 \times 9$) throughout all evaluations (§4.1: "blur kernel size of 1x9 pixel is fixed"). The range hint is correct in principle but may imply adaptivity that the paper does not demonstrate. Should note the paper's fixed-$m$ policy.
- **Add bullet — GPU/SIMD affinity.** The paper's §5 notes "due to the usage of simple image processing primitives such as blur and rotate, it can be easily implemented on GPUs and embedded systems." Currently absent.

Section: `relations[]` — relationship-edge audit

The `duda-radon-corners` page's frontmatter has no `relations:` field (the `relatedAlgorithms: [chess-corners, harris-corner-detector, rochade, pyramidal-blur-aware-xcorner]` / `comparedWith: []` this note originally proposed no longer exist as schema fields).

Comments for the audit, translated to `relations[]`:

1. **Status: resolved.** ChESS (2013) and Duda-Frese (2018) are direct competitors in the X-corner detection space (same problem, different mechanisms: ring-sampling vs ray-sampling). Neither cites the other, but the comparison axis is technically well-defined and the "Comparison bullets" below were applied. Per `docs/README.md` §4 tiebreaker: chess-corners is older → chess-corners hosts. `content/algorithms/chess-corners.md` now carries `{ type: compared_with, target: duda-radon-corners, confidence: high }`, and `## When to choose ChESS over Duda-Radon` is live (no pointer-back Remarks bullet has been checked on the duda-radon-corners page itself — verify on a completeness pass).

2. **`pyramidal-blur-aware-xcorner` — still open, and the type is `feeds_into`, not `compared_with`.** Abeles' own paper describes the spoke pass as "conceptually similar to the approximated Radon transform" in Duda-Frese — both use directional line-integral sampling around a candidate corner, and Abeles names it as a distinct pipeline stage (the spoke pass) built on that idea, not a peer detector chosen instead of Duda-Radon. That is `feeds_into` (A=duda-radon-corners → B=pyramidal-blur-aware-xcorner; chronology 2018 ≤ 2021 holds), authored on `content/algorithms/duda-radon-corners.md`: `{ type: feeds_into, target: pyramidal-blur-aware-xcorner, confidence: medium, caution: "Abeles describes the spoke pass as only 'conceptually similar to' the Radon-transform approximation, not an explicit adoption — treat as intellectual influence, not confirmed direct incorporation." }`. Medium, not high, because the evidence is a single hedged phrase in the source paper rather than an explicit build-on statement. Not yet applied to either page.

3. **`rochade` — still open, `compared_with`.** Different architectural approach (graph-saddle vs Radon-response) but the same problem class (chessboard X-corner detection) — a genuine practitioner choice, not a Rule-B cross-domain pairing. Rochade (2014) predates duda-radon-corners (2018) → rochade hosts: `{ type: compared_with, target: duda-radon-corners, confidence: medium }` on `content/algorithms/rochade.md`. Medium rather than high (unlike item 1) because this note's own analysis here is a single sentence with no worked comparison-bullets section, versus the multi-paragraph, table-grounded treatment behind the ChESS↔Duda-Radon edge. Not yet applied — `rochade.md` currently carries only a `compared_with` edge to `pyramidal-blur-aware-xcorner`.

## UPDATE: chess-corners (comparison preparation)

**Status: resolved.** The `bennett2013-chess` research note (already ingested) deferred all comparison content pending ingestion of the counterpart notes. Now that `duda2018-accurate` is ingested, `content/algorithms/chess-corners.md` carries `relations: [{ type: compared_with, target: duda-radon-corners, confidence: high }, ...]` (superseding the legacy `comparedWith: []` this note originally referenced) and a live `## When to choose ChESS over Duda-Radon` section, per the tiebreaker below.

**Preconditions that were met for the ChESS ↔ Duda-Radon comparison:**
- `docs/research/notes/bennett2013-chess.md` — exists.
- `docs/research/notes/duda2018-accurate.md` — this file.
- Per `docs/README.md` §4: chess-corners is older (2013) → chess-corners hosts the `## When to choose ChESS over Duda-Radon` section.

**Comparison bullets applied to the `## When to choose ChESS over Duda-Radon` section on the chess-corners page** (recorded here for provenance of the original editorial reasoning; not re-verified against the live page text):

- **Sampling geometry.** ChESS samples a *ring* of 16 pixels at radius $r$ (RING5, $r = 5$), computing four subtraction-summation differences (DR, MR, SR). Duda-Radon integrates *rays* through the centre pixel at four discrete angles. Ring sampling tests whether the full perimeter alternates bright-dark; ray sampling tests whether the intensities along opposite spokes differ. Ring sampling is more sensitive to the checkerboard's repeating structure at one specific scale; ray sampling is more noise-robust because the line integral averages more pixels.
- **Noise robustness.** Duda-Radon box-filter sums attenuate noise by $\sim\sqrt{2m+1}$; ChESS uses point samples on the ring, which do not attenuate additive noise. On noisy images, Duda-Radon is more accurate (demonstrated in §4.1, Fig. 5b against Förstner as proxy; ChESS is not directly tested but is architecturally gradient-like in its ring-sampling).
- **Blur.** Under strong Gaussian blur ($\sigma_b > 2$ px), Förstner outperforms Duda-Radon (§4.1, Fig. 5a); ChESS is also blur-sensitive but in a different way (the ring at radius $r$ blurs into the adjacent quadrants). Neither method excels under severe blur; the Abeles pyramidal approach is the preferred solution in that regime.
- **Scale.** ChESS works at one ring radius ($r = 5$ or $r = 10$ px). Duda-Radon works at one box-filter length ($2m+1 = 9$ px). Neither is multi-scale in the paper's evaluation. The Abeles pyramidal approach solves the scale problem for both.
- **Integer / SIMD friendliness.** ChESS is integer-only (16 point samples, integer subtraction/summation); Duda-Radon requires floating-point rotation and box blur. ChESS is SIMD-friendly and reaches >700 VGA fps (§7.3 of bennett2013-chess); Duda-Radon is not characterised at SIMD speed.
- **Per-pixel vs response-map output.** Both methods produce a per-pixel response map; the downstream wrapper handles full-pattern detection. The interfaces are equivalent from a pipeline perspective.
- **Recommendation.** Use ChESS when runtime is dominant (embedded, real-time at VGA) or when the corner radius is well-known and fixed; use Duda-Radon when calibration accuracy under noise or in-field conditions is dominant. When severe blur is the constraint, prefer Abeles pyramidal.

## UPDATE: pyramidal-blur-aware-xcorner (supplementary)

The abeles2021-pyramidal note already flags the Duda-Frese spoke analogy and recommends adding `duda2018-accurate` to `sources.references` on that page. The specific note: "the spoke pass is conceptually similar to the approximated Radon transform in [19]." This is a citation gap, not a content gap. When the pyramidal page is reviewed for completeness, add `duda2018-accurate` to its `sources.references`.

## UPDATE: puzzleboard (supplementary)

Stelldinger 2024 §4.1 lists Duda-Frese detection as a substitutable corner-detection primitive. The atlas note records this but no `sources.references` gap exists — the puzzleboard page currently references `harris1988-corner` only, and the detection substitutability is already noted in the atlas note. No urgent page edit; defer to a puzzleboard completeness pass.

# Provenance

- Paper full text: `docs/papers/.cache/duda2018-accurate.txt` (10 pages, BMVC 2018).
- Abstract: "a new checkerboard corner detector based on a localized Radon transform implemented by large box filters making it robust to low contrast, image noise, and blur while maintaining high subpixel accuracy." — direct quote retained as the primary applicability framing.
- §1 Introduction: motivation for box filters over gradients — "box filters suppressing noise, instead of gradient filters amplifying it." The contrast of integration vs differentiation is the paper's primary rhetorical move.
- §2 Related Work: Harris [10] as gradient-based canonical; Förstner [6] / cornerSubPix as gradient-based subpixel refinement; OpenCV findChessboardCorners [1] (Rufli-Scaramuzza extension [14]) as the full-pipeline baseline. Sinzinger [15] cited for the sector/centreline junction model. Maire [13] cited for the rotate-and-blur steerable-filter technique.
- §3 Corner Detection and Localization, Eq. 2: $R_f^{\text{local}}[x,y,\alpha] = \sum_{k=-m}^{m} f(x + k\cos\alpha, y + k\sin\alpha)$; $f_c[x,y] = [\max_\alpha R - \min_\alpha R]^2$. Restriction to $\mathcal{A} = \{0, \pi/4, \pi/2, 3\pi/4\}$: "due to the point symmetry of checkerboard corners generating a function similar to a sine or cosine after the localized Radon transform is applied."
- §3.1 Implementation, Eq. 3: $f_r[x,y,\alpha] \propto \mathrm{rot}_\alpha(f_{\text{blur}}(\mathrm{rot}_{-\alpha}(I)))[x,y]$. Procedure: greyscale → ×2 supersample → rotate by 0 and $\pi/4$ → blur each direction h and v → rotate back → join via $(max - min)^2$ → $k \times k$ smooth → local maxima + threshold + NMS → Gaussian peak fit.
- §4.1 Synthetic dataset: base corner 200×200 px; test region 16×16 px; blur kernel $1 \times 9$ ($m = 4$); Förstner window $9 \times 9$, ≥20 iterations. Fig. 4b: proposed ≈ 0.025 px localization error across all subpixel positions; OpenCV shows elevated error near $\pm 0.25$ px fractions. Fig. 5a: blur comparison — proposed method reaches error minimum at crisp input and degrades at $\sigma_b > 2$; Förstner degrades more slowly under blur, crossing over at $\sigma_b \approx 2$. Fig. 5b: noise comparison — proposed method consistently below Förstner at all noise levels tested ($\sigma_n = 0$ to $18\%$). Figs. 6a–6b: rotation 0–90° and viewing angle 10–70°; proposed method mostly superior or tied. Fig. 7a: adding pre-blur ($\sigma = 3$) to Förstner improves it on noise-free images but degrades it under noise — confirms the gradient-vs-box-filter noise amplification asymmetry. Fig. 7b: processing time linear in image size; ×2 supersample doubles cost; ~0.15 s for 2 MP with anti-aliasing, ~0.07 s without.
- §4.2 Checkerboard images: grid growing via cross-ratio + angle-guided k-d tree search from a random 3×3 seed. Processing time for full checkerboard detection linear in pixel count (Fig. 8b); proposed faster than OpenCV pipeline. Real datasets: indoor controlled (Fig. 9a, Table 1): proposed 0.0332 px residual vs OpenCV 0.0391 px. Outdoor (Fig. 9b, Table 2): proposed 0.0459 px vs OpenCV 0.0738 px; OpenCV detection failures (negative residual in plot) absent in proposed.
- §5 Conclusion: accuracy claim "close to the theoretical limit of 1/100 of a pixel [11]" — reference [11] is Kiger 2010, particle image velocimetry precision analysis. GPU/embedded affinity: "easily implemented on GPUs and embedded systems."
