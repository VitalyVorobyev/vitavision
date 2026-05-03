---
paper_id: bennett2013-chess
title: "ChESS — Quick and Robust Detection of Chess-board Features"
authors: ["S. Bennett", "J. Lasenby"]
year: 2013
url: https://arxiv.org/pdf/1301.5491v1
created: 2026-05-01
relevant_atlas_pages: [chess-corners, pyramidal-blur-aware-xcorner, ccdn-checkerboard-detector]
---

# Setting

**Problem class.** Detection of inner X-junction vertices on a chessboard pattern projected or printed onto a (possibly non-planar) surface. Two driving applications: (1) camera calibration, where the chessboard is the standard target and inner-corner localisation determines calibration accuracy; (2) structured-light 3D reconstruction (the authors' specific use case), where a projected chessboard is observed by one or more cameras and per-frame vertex detection drives both extrinsic calibration and surface reconstruction.

**Inputs.** Single-channel 8-bit grayscale image at moderate resolution (the paper uses 640 × 480 VGA). No prior on the chessboard's extent, orientation, perspective, or square count. The detector tolerates strong perspective distortion, projection onto a curved surface (cylinder), and noticeable image noise. No pre-thresholding or binarisation.

**Outputs.** A continuous response map $R$ over the image; positions where $R$ is positive and locally maximal are candidate X-junctions. Crucially, the response is "similar in output to the much-used Harris and Stephens detector in the same problem-space" — a strength measure, not a binary corner/non-corner decision. This deferral of the inclusion threshold to downstream consumers is one of the paper's design contributions; PTAM-style detectors that emit a binary map cannot be subpixel-refined as easily.

**Guarantees.** No mathematical guarantee. The response is *designed* so that ideal X-junctions produce strong positive responses and the most common false-positive classes (straight edges, narrow stripes) produce zero or negative responses, but this is a designed-in property verified empirically rather than a theorem. Subpixel localisation is *not* part of the base detector; the paper describes 5 × 5 centre-of-mass refinement as a fast post-processing step but flags more sophisticated refinement strategies (e.g. those used downstream of Harris) as compatible.

# Core idea

A chessboard X-junction has the property that two pairs of points sampled on a small ring around the centre, taken 90° apart, will straddle opposite "colours" of the pattern: one pair samples two black squares, the other samples two white squares. Sampling 16 points on a radius-5 ring (the FAST-16 sampling pattern scaled to $r = 5$, with angular spacing alternating $21.8°/23.2°$ — close to the ideal $22.5°$) gives enough resolution to detect this property at any rotation while remaining cheap. Three carefully designed responses combine to reject the dominant false-positive classes:

1. **Sum response (SR, eq 1)** — large at vertices.
   $$\mathrm{SR} = \sum_{n=0}^{3} \bigl|(I_n + I_{n+8}) - (I_{n+4} + I_{n+12})\bigr|.$$
   The terms $(I_n + I_{n+8}) - (I_{n+4} + I_{n+12})$ measure the difference between two opposite-pair sums and two orthogonal-opposite-pair sums; this is large only when one orthogonal pair is bright and the other is dark.

2. **Diff response (DR, eq 2)** — large on edges.
   $$\mathrm{DR} = \sum_{n=0}^{7} |I_n - I_{n+8}|.$$
   Sums the absolute differences of opposite ring samples. Large when the ring straddles a single edge (one half bright, one half dark).

3. **Mean response (MR, eq 3)** — separates X-junctions from narrow stripes.
   $$\mathrm{MR} = |\mu_n - \mu_\ell|,$$
   where $\mu_\ell$ averages a 5-pixel cross at the candidate centre and $\mu_n$ averages all 16 ring samples. On a stripe (where, e.g., $I_n$ and $I_{n+8}$ are bright and the rest dark), the ring's mean is mid-grey but the centre cross is dark — large MR. On a true X-junction, both means are mid-grey — small MR.

The combined response (eq 4):

$$R = \mathrm{SR} - \mathrm{DR} - 16 \cdot \mathrm{MR}.$$

The factor 16 is chosen so that the degenerate "narrow stripe" case (only $I_n$, $I_{n+8}$ bright; $\mu_\ell \approx 0$, $\mu_n = 1/16$) yields exactly $R = 0$, not a false positive. This is a design — not a derivation — but is verified by inspection.

A second contribution (§4.1) interprets SR and DR via the 1-D DFT of the linearised ring vector: SR is approximately the magnitude of the second DFT coefficient (two-cycle cosine matching, akin to a vertex template), and DR is approximately the magnitude of the first DFT coefficient (one-cycle cosine matching, akin to an edge template). The detector is therefore a discrete spectral filter that retains the second harmonic and suppresses the first.

# Assumptions

1. (hard) The chessboard squares span enough pixels that a radius-5 ring fits inside one square's worth of distance from the vertex without crossing into a non-adjacent square. The paper notes the ring radius must be "minimized (to avoid aliasing on to other grid squares ... but big enough to escape the central region of blurriness)" — radius 5 is the recommended VGA default; radius 10 is the recommended high-blur variant.
2. (soft) The image has been roughly Gaussian-blurred or is naturally blurred by the camera optics so that the central pixels at the vertex have intermediate intensities (between black-square and white-square levels). The MR criterion depends on this — without blur, the 5-pixel cross at a vertex can read pure-black or pure-white instead of mid-grey, producing a false MR.
3. (soft) Image noise is moderate. With high noise, the optional 5 × 5 Gaussian pre-blur (σ ≈ 1.04, kernel $\frac{1}{16}[1, 4, 6, 4, 1]$ in two 1-D passes) is recommended; the paper shows pre-blur extends the noise-tolerance range by approximately 2× in additive Gaussian variance (§7.1.2).
4. (hard) The pattern is composed of squares of two distinct intensities. Greyscale gradient targets, blurred-out edges, and out-of-focus pattern regions all attenuate the response; the paper does not claim graceful degradation under such conditions.
5. (soft) The detector is approximately rotation-invariant. The angular spacing of 21.8°/23.2° (vs ideal 22.5°) introduces small rotation-dependent variation in $R$; the paper Figure 8 shows responses are visually symmetric and slowly periodic in 22.5°.
6. (soft) The chessboard need not be planar — the paper validates the detector on a cylindrical projection surface (§7.2.2). Strong perspective distortion of an individual square is tolerated as long as the local ring still captures the alternating pattern.

# Failure regime

- **Under-blurred images.** If the central pixels of an X-junction read pure black or pure white instead of mid-grey, the MR term becomes spuriously large and $R$ is suppressed below zero. The paper's recommendation is the optional pre-blur; in pipelines with already-blurred input (most real cameras at moderate resolution) this is not necessary.
- **Squares smaller than ~5 pixels per side.** A radius-5 ring will sample non-adjacent squares — aliasing. Use a smaller ring (the paper does not characterise sub-r=5 rings) or upsample. For very large blur (e.g. low-resolution distant chessboards), use radius 10.
- **Pure 2-D edges.** Correctly handled by DR — straight bright-dark edges produce large DR which cancels SR. But "thick" edges (two parallel edges close together, e.g. one row of pattern) can produce false vertex-like responses that pass SR and DR; the MR term is the final filter.
- **Pure narrow stripes.** Specifically targeted by the MR term and the factor 16. Without this term, a narrow black stripe on white background produces SR ≈ DR/2 and would pass; with MR · 16, the stripe is reliably rejected.
- **Single isolated bright pixel.** Would pass SR and would have small DR. The MR term saves the day: the centre cross is bright while the ring is dark, so MR is large and $R < 0$.
- **Non-rectangular intersections.** T-junctions, Y-junctions, and three-square corners do not satisfy the four-quadrant alternation pattern. They are correctly rejected.
- **Severe perspective distortion of a single square.** When perspective makes one square contribute to many ring samples and the opposite square contribute to none, the SR amplitude weakens; the response is "not claimed to be perspective-invariant" (§4 closing paragraph). Detection still works but with attenuated $R$.
- **Very low contrast.** No intensity normalisation — the response amplitude scales linearly with image contrast. Per-image threshold tuning required, or use the relative-magnitude neighbourhood-comparison filter (§5).
- **Subpixel accuracy.** Base detector returns integer pixel locations only. Centre-of-mass refinement on a 5 × 5 patch is the paper's lightweight recommendation; the documented error on synthetic pixel-grid-aligned data (zero-rotation, low noise) is sub-pixel.

# Numerical sensitivity

- **Integer arithmetic throughout.** The 16 ring reads, the 5 cross reads, and the SR/DR/MR sums are all integer operations on 8-bit pixel values. No square roots, no trigonometry. Accumulators must hold the maximum possible response; for 8-bit pixels, $\mathrm{SR} \leq 4 \cdot 2 \cdot 255 = 2040$, $\mathrm{DR} \leq 8 \cdot 255 = 2040$, $16 \cdot \mathrm{MR} \leq 16 \cdot 255 = 4080$. A signed 16-bit accumulator is just enough; signed 32-bit is safer.
- **Mean computation.** $\mu_n$ is a sum-over-16 divided by 16; $\mu_\ell$ is a sum-over-5 divided by 5. To stay integer-only, scale the difference by 5 · 16 = 80 and absorb the constant into the threshold: $\mathrm{MR}_{\text{scaled}} = |16 \cdot \sum I_\ell - 5 \cdot \sum I_n|$. Implementations vary on whether to do this or use float division.
- **No discriminant or square-root issues.** Unlike Harris/Shi-Tomasi, no eigenvalue computation; conditioning concerns absent.
- **Threshold scaling.** $R$ scales linearly with image contrast (vs $\rho^4$ for Harris). Under intensity scaling $I \to \rho I$, all three of SR, DR, $16\cdot\mathrm{MR}$ scale as $\rho$, and so does $R$. Adaptive thresholding is therefore simpler than for Harris — a fixed fraction of the maximum positive response (the paper uses ~1.5% in §7.1.2 for the PTAM comparison) is robust across exposures.
- **Pre-blur cost.** A 5 × 5 separable Gaussian via two 1-D passes of $\frac{1}{16}[1, 4, 6, 4, 1]$ adds ~10–15% to the detector runtime (per the paper, §7.3.1). For noisy data the precision improvement is worth it; for clean data it is optional.
- **SIMD-friendly.** All operations are short integer additions and absolute differences — well-suited to vector instructions. The paper's reference implementation reaches >700 VGA fps with SIMD.

# Applicability

- Use when: the input is known to contain a chessboard pattern (calibration target, structured-light projection) and X-junction selectivity is desirable. ChESS rejects the false-positive classes that plague general-purpose corner detectors on chessboard imagery.
- Use when: real-time processing constraints dominate. The detector is integer-only, branch-free, and SIMD-friendly; in the paper's measurements, ChESS is ~40% faster than Harris and ~25% faster than the PTAM detector on commodity 2010-era hardware.
- Use when: a continuous strength measure is needed for downstream filtering (the deliberate design contrast vs PTAM's binary output). Subpixel refinement, application-specific thresholding, and connectivity filtering all benefit from $R$ rather than a {0, 1} mask.
- Don't use when: the input is not a chessboard pattern — the SR template assumes the four-quadrant alternation. Generic feature tracking, descriptor matching, and natural-image SLAM frontends should use Harris, Shi-Tomasi, FAST, or learned detectors.
- Don't use when: features span more than ~10 pixels (heavy blur, low resolution) and the radius-10 variant is also insufficient. A pyramidal extension (e.g. abeles2021-pyramidal) is required.
- Don't use when: subpixel accuracy below ~0.1 pixels is required and the application cannot afford a separate refinement pass. Centre-of-mass on a 5 × 5 patch is the cheap baseline; saddle-fitting (e.g. ROCHADE's polynomial saddle, Chen-Zhang Hessian) is the higher-accuracy alternative.
- Don't use when: lighting is severely uneven across the chessboard such that one side reads black-on-grey and the other grey-on-white — no intensity normalisation in the detector. Pre-process with adaptive thresholding or work on locally-normalised tiles.
- Compared against (paper's own comparisons in §7):
  - **Harris (1988)** with 5 × 5 Sobel + 3 × 3 box filter, $k = 0.04$: ChESS performs as well or better at all noise levels and rotations on synthetic data (§7.1.2, Figure 11). On real flat-plate reconstruction, ChESS produces tighter plane fits than Harris (§7.2.1, Figure 18). The Harris detector's accuracy varies with rotation; ChESS does not.
  - **SUSAN** with default brightness threshold 20: poor at all noise levels in the synthetic test (low threshold makes noise dominate). Even at threshold 40, SUSAN underperforms Harris and ChESS. The paper effectively dismisses SUSAN as a chessboard detector.
  - **PTAM detector** (binary output, FAST-16 ring with mean-distance thresholding): worse than ChESS as noise increases. The PTAM detector's binary output also makes subpixel refinement awkward. ChESS at threshold ≈1.5% of maximum positive response gives a fairer comparison; ChESS still dominates under noise.
  - **Sun et al. layer scheme**: the paper critiques this extensively in §2 — multiple concentric layers with binarisation and morphological operations; slow and threshold-sensitive. ChESS deliberately departs from this.

# Connections

- Builds on: **rosten2006-fast** (provides the 16-pixel Bresenham ring sample geometry; ChESS reuses the FAST-16 pattern scaled to radius 5, "RING5"). The paper explicitly cites Rosten-Drummond 2005/2006 in §3 when justifying the ring approach. The angular spacing argument and the 16-sample lower bound are inherited.
- Builds on: **harris1988-corner** (referenced as the comparison baseline; the strength-measure output is deliberately Harris-like, "in the same problem-space", §1).
- Builds on: PTAM (Klein-Murray 2007, not in `docs/papers/index.yaml`; it is the unpublished closest predecessor — uses FAST-16 with a thresholded-transition-count test on the ring, no continuous response).
- Builds on: Sun et al. 2008 (multi-layer ring scheme; not in the index — the paper explicitly departs from this approach).
- Enables (in the atlas):
  - **chess-corners** — primary source for the existing canonical page.
  - **pyramidal-blur-aware-xcorner** — abeles2021-pyramidal cites ChESS as one of the prior x-corner detectors and extends the idea to a multi-scale pyramid.
  - **ccdn-checkerboard-detector** — chen2023-ccdn cites ChESS as a classical baseline against which the deep-learning approach is compared.
  - **rochade**, **ocpad**, **puzzleboard**, **laureano-topological-chessboard** — all subsequent X-corner detectors that compete with or extend ChESS. None of these papers is yet ingested as a research note (as of 2026-05-01); when ingested, their connection to ChESS will be the most direct comparison axis.
- Refutes / supersedes: PTAM detector (continuous response replaces binary), Sun et al. layer scheme (single-pass detector replaces multi-layer thresholded scheme).

# Atlas update plan

## UPDATE: chess-corners

The page is well-grounded and substantial. The Goal, Algorithm definitions (RING5, $\mu_\ell$, $\mu_n$, SR, DR, MR, R), Procedure, and Implementation faithfully follow the paper. The Remarks already cover orientation ambiguity, the radius-10 variant, and the subpixel centre-of-mass extension. Improvements:

Section: Algorithm
- The page's "$\mathrm{MR}$" definition is correct, but the page does not surface the **factor 16's role** as clearly as the paper. The paper explicitly chooses 16 to make $R = 0$ in the degenerate single-stripe case ($I_n = I_{n+8} = 1$, all others 0). The current definition block says "The factor 16 zeros out the degenerate case where only $I_n$ and $I_{n+8}$ are bright — a narrow stripe — making $R \leq 0$ there" which is correct. No change needed; this is already well-stated.
- The page does not currently mention the **DFT interpretation** (§4.1 of the paper). Worth adding as a Remarks bullet or a short Note callout: SR is approximately the magnitude of the second DFT coefficient of the linearised ring vector, DR the magnitude of the first. This grounds the detector design in spectral terms — vertices are second-harmonic, edges are first-harmonic — and explains *why* SR and DR work as templates rather than just stating that they do.

Section: Procedure / Implementation
- The page's Procedure faithfully reflects §5 of the paper. No gaps.
- The Rust implementation is correct. One minor note: the integer overflow analysis in this research note's *Numerical sensitivity* section ($\mathrm{SR}, \mathrm{DR} \leq 2040$, $16\cdot\mathrm{MR} \leq 4080$) could justify a future comment in the implementation about accumulator sizing — low priority.

Section: Remarks
- **Add bullet — DFT interpretation (§4.1).** SR ≈ second DFT coefficient of the linearised ring vector (two-cycle cosine matching, vertex template); DR ≈ first DFT coefficient (one-cycle cosine matching, edge template). The detector is a discrete spectral filter retaining the second harmonic.
- **Add bullet — pre-blur recommendation.** The paper recommends an optional 5 × 5 Gaussian pre-blur (kernel $\frac{1}{16}[1, 4, 6, 4, 1]$ in two 1-D passes, $\sigma \approx 1.04$) for noisy data. Pre-blur approximately doubles the noise-variance threshold at which the detector remains accurate (§7.1.2, Figure 12). Cost is ~10–15% of detector runtime.
- **Strengthen orientation bullet.** The current bullet says "Orientation is recovered post-detection by maximizing the signed measure $M_n = (I_n + I_{n+8}) - (I_{n+4} + I_{n+12})$ over the eight discrete directions." The paper actually computes a 3-tap *averaged* measure $3\,\mathrm{AM}_n = M_{n-1} + M_n + M_{n+1}$ (with sign flip on cyclic wrap), then $i = \arg\max_n |\mathrm{AM}_n|$, then bins by $\mathrm{sign}(M_i)$ to give 8 orientation bins at $22.5°$ spacing (§6). The simpler "maximize $M_n$" formulation in the page is a simplification; the actual paper formulation is slightly more robust to per-sample noise. Update the bullet to reference $\mathrm{AM}_n$ rather than $M_n$, or note that the simpler form is an approximation.
- **Optional bullet — contrast scaling.** $R$ scales linearly with image contrast (vs $\rho^4$ for Harris). Threshold adaptation across exposures is therefore much simpler than for Harris — a fraction of the maximum positive response is robust. Worth mentioning if the page eventually discusses adaptive thresholding.

Section: When to choose chess-corners over X (preparation, defer)

The page's `comparedWith` field lists `[rochade, pyramidal-blur-aware-xcorner, puzzleboard]`. ChESS is older than all three; per `docs/README.md` §4, the chess-corners page is the host for the corresponding `## When to choose ChESS over X` sections. **None of these comparisons can be authored yet** — the comparison-authoring policy requires research notes for both sides, and the rochade, abeles2021-pyramidal, stelldinger2024-puzzleboard notes have not been ingested. Defer to a future comparison-writing pass after those papers are ingested.

When the comparisons are written, dimensions to cover (paper §7 + later-paper data):
- ChESS vs rochade: ChESS is faster and integer-only; ROCHADE is more accurate at subpixel via polynomial saddle fitting. ChESS detects, ROCHADE detects + refines.
- ChESS vs pyramidal-blur-aware-xcorner: ChESS works at one scale (r=5 or r=10); pyramidal handles arbitrary blur via per-corner pyramid level selection. Pyramidal is heavier.
- ChESS vs puzzleboard: ChESS is for chessboards; puzzleboard handles aperiodic patterns. Different problem class — this comparison may belong on chess-corners only as a "different problem" note rather than a `## When to choose` section.

Section: References
- Already correct (Bennett-Lasenby + Rosten-Drummond). No change.

## UPDATE: pyramidal-blur-aware-xcorner (supplementary)

Page already lists `bennett2013-chess` in `sources.references` and the page body discusses the X-corner detection lineage. No content gap. When that page eventually documents its prior-art context in a Remarks bullet, naming ChESS as the canonical single-scale x-corner detector that the pyramidal approach extends would be appropriate. Defer to a pyramidal-page completeness pass.

## UPDATE: ccdn-checkerboard-detector (supplementary)

Page already lists `bennett2013-chess` in `sources.references` as one of the classical baselines against which the CCDN deep-learning detector is compared. The page's `sources.notes` already describe the comparison structure. No content gap. The model page is a draft; revisit when the page graduates from draft.

# Provenance

- Paper full text: `docs/papers/.cache/bennett2013-chess.txt` (12 pages, arXiv:1301.5491v1, 23 Jan 2013). Also available as ar5iv HTML at `docs/papers/.cache/bennett2013-chess.html`.
- Abstract: "Chess-board Extraction by Subtraction and Summation" (ChESS) explicitly motivates the subtraction (DR, MR) and summation (SR) operations of eq 4. Output is "a measure of strength similar in output to the much-used Harris and Stephens [1988] corner detector in the same problem-space" — direct quote retained because this is the paper's own framing of how the response should be consumed.
- §3 Sampling strategy: the four-point lower bound (Figure 2a), the eight-point lower bound (Figure 2c), and the design choice of 16 samples on a radius-5 ring with $21.8°/23.2°$ angular spacing (close to ideal $22.5°$). Two listed considerations driving the radius: (1) close to the centre, pixels are likely to lie on edges due to subtended angle and pixel quantisation; (2) too far from the centre, samples lie in non-adjacent squares. The radius-10 variant is mentioned as appropriate "in the case of highly blurred images."
- §4 Detection algorithm (page 4-5): equations (1) SR, (2) DR, (3) MR, (4) R = SR − DR − 16·MR. The factor 16 is justified by the single-stripe degenerate case: "the factor of sixteen ensures a zero overall response in the undesirable case; that where say samples $I_n$ and $I_{n+8}$ have value one and $I_{n+4}$ and $I_{n+12}$ have value zero, as does the mean of the pixels centred in the circle."
- §4.1 DFT-based interpretation: SR is "a two cycle cosine-like match" (akin to second DFT coefficient); DR is "akin to one matching a single cycle cosine over eight phases" (first DFT coefficient).
- §5 Feature selection: enumerated post-processing — positive response threshold, non-maximum suppression, response connectivity, neighbourhood comparison. The neighbourhood comparison "compensates for the lack of intensity/contrast normalization in the detector" — direct phrasing.
- §6 Orientation labelling: $\mathrm{AM}_n = \frac{1}{3}(M_{n-1} + M_n + M_{n+1})$ with cyclic wrap and sign-flip handling; $i = \arg\max_n |\mathrm{AM}_n|$; bin by $\mathrm{sign}(M_i)$ to yield 8 orientation bins at $22.5°$ spacing. The averaging step is what the existing chess-corners page omits.
- §7.1.2 Synthetic results (Figure 11, 12): ChESS performs as well or better than Harris (5 × 5 Sobel, $k = 0.04$) at all noise levels and rotations. Harris accuracy "varies depending on rotation – it is noticeably better at zero rotation than when closer to 45° rotation." SUSAN with default threshold 20: poor; with threshold 40: marginally worse than smoothed Harris. Pre-blur (kernel $\frac{1}{16}[1, 4, 6, 4, 1]$ two 1-D passes, $\sigma \approx 1.04$): "approximately double the noise variance before significant errors occur."
- §7.2.1 Flat-plate reconstruction (Figure 18, 19): ChESS produces tighter plane fits than Harris on both clean and noisy data. Reference values: ChESS-no-blur clean = 0.131 µrad mean axis distance, .0335 µrad² variance, 6.70 mm² SSE per 100-point patch.
- §7.2.2 Cylinder reconstruction: similar pattern; ChESS+blur dominates on noisy data.
- §7.3 Computational efficiency (Table 1): ChESS ~40% less time than Harris (5 × 5 Sobel, 3 × 3 box filter, $k = 0.04$), ~25% less than PTAM. SIMD implementation reaches "over 700 VGA resolution frames per second." Pre-blur cost: ~15% of the C implementation, ~10% of the SIMD implementation.
- §8 Discussion: explicitly positions ChESS for use beyond planar chessboards — non-planar surfaces, structured-light reconstruction. References Sun et al. and Dao-Sugimoto for downstream applications.
