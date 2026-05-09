---
paper_id: lowe2004-sift
title: "Distinctive Image Features from Scale-Invariant Keypoints"
authors: ["D. G. Lowe"]
year: 2004
url: https://www.cs.ubc.ca/~lowe/papers/ijcv04.pdf
created: 2026-05-05
relevant_atlas_pages: [sift, scale-space, image-gradient, harris-corner-detector, shi-tomasi-corner-detector, fast-corner-detector, gao-dual-homography-stitching, lin-sva-stitching, apap-image-stitching, superpoint, xfeat]
---

# Setting

**Problem class:** Extract locally distinctive, repeatable keypoints and associated descriptors from a single grayscale image so that correct matches can be found across images related by scale change, rotation, moderate affine distortion, illumination change, and noise.

**Inputs:**
- A single grayscale image I(x, y) with pixel values in [0, 1] (assumed at least σ = 0.5 blur to prevent aliasing; §3.3).
- No calibration, no stereo, no motion sequence required.

**Outputs:**
- A set of keypoints, each characterized by: 2D location (x, y), scale σ, dominant orientation θ.
- A 128-dimensional L2-normalized descriptor vector per keypoint, clamped and renormalized for illumination robustness (§6.1).
- Typical yield: ~2000 stable keypoints for a 500×500 pixel image (§1).

**Format contract:** Descriptor is a float vector of length 128 = 4×4 histogram grid × 8 orientation bins (§6.1). Matching is performed via Euclidean distance with ratio test threshold 0.8 (§7.1).

# Core idea

SIFT is a four-stage cascade filter. Stage 1 detects scale-space extrema using the Difference-of-Gaussian (DoG) function D(x, y, σ) = L(x, y, kσ) − L(x, y, σ), which approximates the scale-normalized Laplacian σ²∇²G shown by Lindeberg (1994) to produce the most stable extrema (§3, Eq. 1). Stage 2 refines each candidate keypoint by fitting a 3D quadratic (Taylor expansion through second order) to the DoG volume and rejecting low-contrast responses (|D(x̂)| < 0.03) and edge-like responses via a 2×2 Hessian principal-curvature ratio test (r = 10; §4, Eq. 2–3, 4). Stage 3 assigns one or more orientations by building a 36-bin gradient-orientation histogram over a region with Gaussian weight σ_w = 1.5 × σ_keypoint, selecting peaks within 80% of the dominant peak — about 15% of keypoints get multiple orientations, which increases matching stability (§5). Stage 4 computes the descriptor by sampling image gradients (rotated to the keypoint frame) in a 16×16 neighborhood, accumulating into a 4×4 array of 8-bin orientation histograms with trilinear interpolation, Gaussian weighting (σ_desc = half descriptor window width), L2 normalization, per-element clamping at 0.2, and renormalization (§6.1).

The key insight is that DoG with s = 3 intervals per octave (k = 2^(1/3)) balances repeatability with computational cost: fewer intervals miss unstable extrema; more intervals detect increasingly unstable ones without improving correct-match count (§3.2, Fig. 3).

# Assumptions

1. **Gradual scale change (soft):** The same physical structure appears at scales related by a factor the Gaussian pyramid can bridge across octaves. Extreme scale ratios (>4–5×) may miss the same keypoint entirely.
2. **Sufficient local texture (hard):** Keypoints are detected at DoG extrema; flat or near-flat regions produce no keypoints. Textureless patches yield zero correspondences.
3. **Gradient-based local appearance (hard):** The descriptor encodes gradient magnitude and orientation, not color, depth, or spectral information. Monochrome input only.
4. **Affine illumination approximately holds (soft):** The descriptor normalizes out multiplicative contrast changes; brightness offsets cancel in gradients. Non-linear illumination (saturation, shadows on curved surfaces) is partially mitigated by the 0.2 clamp but not eliminated.
5. **Camera blur ≥ σ = 0.5 at input resolution (soft):** The method assumes this minimum anti-aliasing blur before building the pyramid; if not present, aliasing may cause spurious extrema (§3.3).
6. **Scene is approximately rigid / locally planar (soft):** The Hough transform stage assumes a 4-DOF similarity transform is approximately correct; large non-planar 3D rotation (>30 degrees for non-planar objects, >50 degrees for planar surfaces) degrades recognition (§8).

# Failure regime

- **Low-texture or uniform regions:** No DoG extrema → zero keypoints. Examples: sky, painted walls, out-of-focus backgrounds.
- **Repetitive patterns (hard):** Periodic textures (brickwork, fabric, gratings) generate many keypoints that match ambiguously across repetition periods; nearest-neighbor ratio test fails to disambiguate. RANSAC inlier fraction falls well below 50%, violating its assumptions. The paper notes this explicitly as a recognition failure mode (§7.3).
- **Large affine distortion (>50° viewpoint tilt for planar surfaces):** Matching reliability drops below 50% (§6.3, Fig. 9). The scale-invariant stage handles scale change and rotation; it does not estimate a consistent affine frame.
- **Severe non-linear illumination (specular, HDR scene):** The 0.2 clamp reduces but does not eliminate descriptor sensitivity to large gradient-magnitude changes caused by saturation or physically different lighting directions on 3D surfaces (§6.1).
- **Motion blur:** Blurs gradient structure inside the descriptor window; produces wide, flat orientation histograms; degrades peak stability in orientation assignment and descriptor distinctiveness.
- **Very small images or very fine features:** Pyramid downsampling discards sub-σ structure. The image is upsampled 2× before the first octave to partially recover fine features, but below ~4 px the detector produces no reliable response (§3.3).
- **Database size scaling:** Matching reliability decreases logarithmically with database size (Fig. 10). The ratio test and BBF approximate search maintain good performance out to ~100,000 keypoints, but the theoretical distinctiveness limit is not quantified for very large databases.

# Numerical sensitivity

**Contrast threshold (0.03):** All extrema with |D(x̂)| < 0.03 are discarded (§4). Image pixel values must be in [0, 1]; if not renormalized, this threshold is meaningless. Sensitive to image pre-processing decisions.

**Edge-response threshold (r = 10):** The Hessian ratio test rejects keypoints where Tr(H)² / Det(H) ≥ (r+1)²/r = 121/10 = 12.1 (§4.1, Eq. 4). Smaller r = tighter edge rejection; r = 10 was chosen by experiment. Negative Det(H) (saddle points) are always rejected.

**Quadratic interpolation (Eq. 3):** The 3×3 linear system for sub-pixel offset x̂ is solved with finite-difference Hessian and gradient. If x̂ > 0.5 in any dimension, the candidate is shifted to the neighboring sample and the fit re-run. Poorly conditioned (near-flat DoG patch) can cause large offsets — capped implicitly by the contrast threshold on D(x̂).

**σ = 1.6 initial blur (§3.3, Fig. 4):** Chosen to be near-optimal for repeatability in the experimental study. The image is assumed to arrive with σ = 0.5 blur; after 2× upsampling (σ = 1.0), additional smoothing to reach σ = 1.6 requires a Gaussian with σ = √(1.6² − 1.0²) ≈ 1.25 applied to the doubled image.

**Descriptor Gaussian window σ_desc = half descriptor window width (§6.1):** The descriptor window covers 16×16 samples at the keypoint scale. σ_desc ≈ 8 sample spacings. This choice is unstated as an optimized parameter; it follows from the "avoid abrupt boundary effects" rationale.

**Illumination clamp at 0.2 (§6.1):** Determined experimentally on images with controlled illumination change. After clamping, renormalization boosts orientation information at the expense of magnitude accuracy. The 0.2 value is specific to the L2-normalized descriptor; it does not transfer to other normalizations (e.g., L1 or RootSIFT).

**Scales per octave s = 3 (§3.2):** Produces k = 2^(1/3) ≈ 1.26. Requires s+3 = 6 Gaussian-blurred images per octave to ensure extrema detection covers a full octave. Increasing s raises keypoint count but lowers average stability (§3.2, Fig. 3). The paper uses s = 3 throughout.

**Orientation histogram bins = 36 (§5):** Covers 360° in 10° increments. Peak interpolated via parabola fit over 3 neighboring bins. Secondary orientations within 80% of the peak height create additional keypoints at that location.

**Descriptor dimension = 128 (§6.1, 6.2):** The 4×4×8 = 128 configuration was determined by sweep over n ∈ {1…5} descriptor widths and r ∈ {4, 8, 16} orientations at 50° viewpoint + 4% noise (§6.2, Fig. 8). Beyond 4×4×8, performance degrades due to increased sensitivity to distortion.

# Applicability

- **Use when:** matching images at different resolutions or under significant (but not extreme) rotation; building feature databases for object recognition or place recognition; panorama assembly where precise pixel correspondence at a uniform scale is unavailable; any pipeline step that needs Euclidean-space feature vectors matching across viewpoints.
- **Don't use when:** scene is textureless (calibration targets with uniform fields); real-time hard constraints below ~30 ms on embedded hardware without SIMD acceleration; matching under extreme affine distortion (>50° tilt) where affine-invariant detectors are required; dense correspondence (every pixel) is needed — SIFT is sparse by design.
- **Compared against:** Harris corner detector (fixed-scale, not scale-invariant; Harris is older and more restricted), Shi-Tomasi (similar to Harris, min-eigenvalue criterion, not scale-invariant), FAST (rotation-insensitive, scale-insensitive, faster but less distinctive), affine-invariant detectors (Harris-Affine, MSER — better for extreme planar tilt but higher cost and lower repeatability for moderate viewpoint change).

# Connections

- **Builds on:**
  - `harris1988-corner` (Harris and Stephens 1988) — introduced the corner detector motivating scale-invariant extension; the Hessian edge-rejection test in §4.1 is adapted directly from Harris; DoG approximates σ²∇²G, which Mikolajczyk (2002) showed outperforms Harris corner function for stable features.
  - Lindeberg 1993/1994 (scale-space theory) — proves Gaussian is the only valid scale-space kernel; motivates scale-normalized Laplacian σ²∇²G; referenced in §3 for scale selection theory.
  - Brown and Lowe 2002 — contributed the quadratic sub-pixel localization (Eq. 2–3) used in §4; also extended SIFT toward panorama stitching.
  - Lowe 1999 (ICCV) — preliminary SIFT; the 2004 paper is the extended, refined publication.
  - Beis and Lowe 1997 — Best-Bin-First (BBF) approximate nearest neighbor used in §7.2.

- **Enables (downstream):**
  - Image panorama stitching (SIFT correspondences → homography estimation) — `gao-dual-homography-stitching`, `lin-sva-stitching`, `apap-image-stitching`
  - Structure-from-Motion pipelines (SIFT → RANSAC → essential/fundamental matrix)
  - Object recognition via Hough clustering (described in §7–8 of this paper)
  - Deep model training sets and evaluation benchmarks — `superpoint`, `xfeat` define learned alternatives against SIFT baseline

- **Refutes / supersedes:** none formally; SIFT positions itself as extending Harris/Schmid-Mohr (1997) to full scale invariance, not as refuting them.

# Atlas update plan

## NEW: sift
Type: algorithm
Category: feature-detection / local-descriptors
Primary source: lowe2004-sift
Prerequisites: [scale-space, image-gradient]

**Goal:**
- Extract scale- and rotation-invariant keypoints with 128-D descriptors from a grayscale image for use in matching, recognition, panorama stitching, and SfM.
- Outputs: (location, scale, orientation, 128-D descriptor) per keypoint; matching via L2 distance with ratio test.

**Algorithm:**
- Stage 1 — DoG scale-space extrema: build Gaussian pyramid with s=3 intervals/octave (k=2^(1/3)), subtract adjacent scales to get DoG D(x,y,σ), detect 26-neighbor local extrema in (x,y,σ) space (§3, Eq. 1).
- Stage 2 — Keypoint localization: fit 3D quadratic via Taylor expansion (§4, Eq. 2–3); reject |D(x̂)| < 0.03 (low contrast); reject Tr(H)²/Det(H) ≥ 12.1 (r=10 edge ratio; §4.1, Eq. 4).
- Stage 3 — Orientation assignment: 36-bin gradient histogram in local Gaussian window (σ_w = 1.5×σ_keypoint); secondary orientations within 80% of peak; parabolic interpolation of peak position (§5).
- Stage 4 — Descriptor: 16×16 sample window → 4×4 grid of 8-bin histograms, trilinear interpolation, Gaussian weighting (σ = half-window), L2-normalize, clamp at 0.2, renormalize → 128-D vector (§6.1).

**Implementation:**
- Initial image upsampled 2× before first octave to recover fine-scale features; input assumed σ≥0.5 blur; target σ=1.6 achieved by convolving with σ≈1.25 after doubling (§3.3).
- s+3=6 blurred images per octave; extrema detected only in the middle s=3 DoG images to ensure complete octave coverage.
- Matching: ratio test (nearest/second-nearest < 0.8) discards ~90% false matches with <5% correct-match loss (§7.1, Fig. 11); BBF approximate k-d tree for large databases (§7.2).
- Do NOT use for dense correspondence or textureless targets.

**Remarks:**
- Harris corner detector hosts the `## When to choose SIFT over Harris` comparison section (Harris 1988 is older); this page carries one bullet: "See [harris-corner-detector §When to choose SIFT over Harris](#when-to-choose-sift-over-harris) for a practitioner comparison."
- Shi-Tomasi (1994) hosts the `## When to choose SIFT over Shi-Tomasi` comparison section (Shi-Tomasi 1994 is older than SIFT 2004); one Remarks bullet pointing there.
- SIFT page hosts `## When to choose SIFT over FAST` (SIFT 2004 is older than FAST 2006 Rosten).
- SuperPoint and XFeat are learned alternatives; the build derives `hasLearnedAlternative` from their `learned_alternative_of: sift` entries — no manual entry needed on the SIFT page.
- Descriptor is monochrome only; color extensions exist (RootSIFT, ColorSIFT) but are not part of this paper.
- Real-time performance (~2000 keypoints from 500×500 image in <0.3s on 2004 hardware) established SIFT as practical; modern GPU/SIMD implementations are significantly faster.

**References:**
- Primary: lowe2004-sift (this paper)
- Prerequisites (knowledge): scale-space, image-gradient
- See also: lowe1999 (preliminary version); harris1988-corner (motivating detector)

Relations:
- { type: compared_with, target: harris-corner-detector, confidence: high }
- { type: compared_with, target: shi-tomasi-corner-detector, confidence: high }
- { type: compared_with, target: fast-corner-detector, confidence: high }
- { type: feeds_into, target: gao-dual-homography-stitching, confidence: high, caution: "SIFT correspondences are the standard input to dual-homography stitching" }
- { type: feeds_into, target: lin-sva-stitching, confidence: high }
- { type: feeds_into, target: apap-image-stitching, confidence: high }

## UPDATE: scale-space
Section: Where it appears
Bullets to add:
- **SIFT** (`sift`) — the canonical worked example of DoG scale-space extrema detection. SIFT uses s=3 intervals/octave (k=2^(1/3)), σ=1.6 initial blur, and constructs a complete Gaussian pyramid before differencing adjacent levels. The scale-space concept page can reference SIFT as the definitive practical instantiation of Lindeberg's scale-normalized Laplacian theory.

## UPDATE: image-gradient
Section: Where it appears
Bullets to add:
- **SIFT** (`sift`) — gradient magnitude and orientation are the fundamental inputs to both orientation assignment (36-bin histogram, σ_w=1.5×σ_keypoint; §5) and descriptor construction (4×4 array of 8-bin histograms; §6.1). SIFT is one of the most cited downstream consumers of image gradient computation.

## UPDATE: harris-corner-detector
Section: Relations (build will mirror the symmetric `compared_with` automatically)
Note: No direct edit to the harris page is required for the relation — the build mirrors `compared_with` from the SIFT side onto harris-corner-detector automatically. However, per comparison-authoring discipline, Harris is older (1988 < 2004) so the Harris page hosts the `## When to choose SIFT over Harris` section. Record this decision so the harris page author knows to add it.
Action: When authoring or updating `harris-corner-detector`, add a `## When to choose SIFT over Harris` section covering: (1) Harris detects at a single fixed scale — use SIFT when scale change between images is expected; (2) Harris has no canonical descriptor — use SIFT when you need a matchable feature vector; (3) Harris is faster for single-scale tracking — use Harris for real-time applications with controlled scale.

## UPDATE: superpoint
Section: Relations
Bullets to add:
- Add `{ type: learned_alternative_of, target: sift, confidence: high }` to relations[] — SuperPoint is a learned keypoint detector+descriptor that replaces SIFT's hand-crafted pipeline with a self-supervised deep model.

## UPDATE: xfeat
Section: Relations
Bullets to add:
- Add `{ type: learned_alternative_of, target: sift, confidence: high }` to relations[] — XFeat is a lightweight learned feature extractor designed as a practical alternative to SIFT on resource-constrained devices.

# Provenance

| Claim | Location in paper |
|---|---|
| DoG definition D(x,y,σ) = L(x,y,kσ) − L(x,y,σ) | §3, Eq. 1 |
| DoG approximates scale-normalized Laplacian (k−1)σ²∇²G | §3, derivation via heat equation after Eq. 1 |
| σ = 1.6 initial Gaussian blur chosen for near-optimal repeatability | §3.3, Fig. 4 |
| s = 3 scales per octave; k = 2^(1/s) | §3.2, Fig. 3 caption |
| s+3 blurred images per octave required | §3, text after Eq. 1 |
| 26-neighbor comparison for extrema detection (8 same scale + 9 above + 9 below) | §3.1 |
| Quadratic Taylor expansion for sub-pixel localization, Eq. D(x) = D + (∂D/∂x)ᵀx + ½xᵀ(∂²D/∂x²)x | §4, Eq. 2 |
| Sub-pixel offset x̂ = −(∂²D/∂x²)⁻¹(∂D/∂x) | §4, Eq. 3 |
| Contrast threshold |D(x̂)| < 0.03 rejects low-contrast keypoints | §4, text after Eq. 3 |
| Edge rejection via Hessian: Tr(H)²/Det(H) < (r+1)²/r, r = 10 → threshold = 12.1 | §4.1, Eq. 4 |
| Orientation histogram: 36 bins, σ_w = 1.5 × keypoint scale, parabolic peak interpolation | §5 |
| Secondary orientation threshold: within 80% of dominant peak | §5 |
| ~15% of keypoints assigned multiple orientations | §5 |
| Descriptor: 4×4 grid of 8-bin histograms = 128 dimensions | §6.1, §6.2 |
| Descriptor Gaussian window σ = half the descriptor window width | §6.1 |
| Trilinear interpolation for boundary continuity (weight 1−d per dimension) | §6.1 |
| Illumination normalization: L2-normalize → clamp at 0.2 → renormalize | §6.1 |
| 0.2 clamp value determined experimentally | §6.1 |
| 4×4×8 chosen as optimal by sweep over n∈{1…5} × r∈{4,8,16} at 50° + 4% noise | §6.2, Fig. 8 |
| Ratio test threshold 0.8: eliminates 90% false matches, <5% correct-match loss | §7.1, Fig. 11 |
| BBF: search capped at 200 nearest-bin candidates; ~2 orders of magnitude speedup vs exact NN | §7.2 |
| Hough bins: 30° orientation, factor-of-2 scale, 0.25 × max projected dimension for location | §7.3 |
| Minimum cluster size for recognition: 3 features | §7.3, §7.4 |
| Acceptance probability threshold for object hypothesis: 0.98 | §7.4 |
| Typical yield: ~2000 stable keypoints from a 500×500 image | §1 |
| Image upsampled 2× before first octave; assumed input blur σ = 0.5 → σ = 1.0 after doubling | §3.3 |
| Input image pixel values assumed in [0, 1] | §4 (stated after contrast threshold) |
| Affine matching reliable out to ~50° viewpoint for planar surfaces | §6.3, Fig. 9 |
| ~0.3 s total recognition time on 2GHz Pentium 4 | §8 |
