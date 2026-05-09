---
paper_id: bay2006-surf
title: "SURF: Speeded Up Robust Features"
authors: [Herbert Bay, Tinne Tuytelaars, Luc Van Gool]
year: 2006
url: https://link.springer.com/content/pdf/10.1007/11744023_32.pdf
created: 2026-05-09
relevant_atlas_pages:
  - surf
  - sift
  - harris-corner-detector
  - shi-tomasi-corner-detector
  - fast-corner-detector
  - scale-space
  - hessian-saddle-response
  - image-gradient
  - structure-tensor
  - chess-corners
  - duda-radon-corners
  - gao-dual-homography-stitching
  - lin-sva-stitching
  - apap-image-stitching
  - canny-edge-detector
  - superpoint
  - xfeat
---

# Setting

**Problem class:** Local feature detection and description for image correspondence — finding repeatable, distinctive point-pairs across images of the same scene or object under varying scale, rotation, and illumination.

**Inputs:** A single-channel (greyscale) image $I$ of arbitrary resolution. No calibration, no prior correspondences. The approach handles linear photometric change (scale + offset) but not colour or non-linear tone-mapping. Skew, anisotropic scaling, and perspective effects are treated as second-order noise absorbed by the descriptor's overall robustness.

**Outputs:** A set of keypoints $(x, y, \sigma, \theta)$, each paired with a 64-D L2-normalised descriptor vector (or optionally 128-D for SURF-128, or 64-D without orientation for U-SURF). Keypoints are blob-type interest points detected at local maxima of the Hessian determinant in scale-space. Descriptors are unit-normalised Haar-wavelet response histograms. Matching is done externally via Euclidean distance with a nearest-neighbour-ratio threshold (typically 0.7).

# Core idea

SURF has three pillars. First, a **Fast-Hessian detector** approximates the Hessian matrix entries $L_{xx}, L_{yy}, L_{xy}$ via box-filter convolutions $D_{xx}, D_{yy}, D_{xy}$ evaluated on an integral image in $O(1)$ per pixel regardless of filter size. Because the relative lobe weights of the box approximation differ from the true Gaussian second-derivative, a balancing constant is introduced: $\det(\mathcal{H}_\text{approx}) = D_{xx} D_{yy} - (0.9 \, D_{xy})^2$, where $0.9 \approx |L_{xx}(1.2)|_F \, |D_{xy}(9)|_F \, / \, (|L_{xy}(1.2)|_F \, |D_{xx}(9)|_F)$. Second, the **scale-space** is built by upscaling the box-filter size rather than downsampling the image — the initial $9 \times 9$ filter (corresponding to $\sigma = 1.2$) grows through $15 \times 15$, $21 \times 21$, $27 \times 27$, … with the inter-octave step doubling (6, 12, 24 pixels) as scale increases. This lets all octaves be computed at full resolution, in parallel if desired. Third, the **64-D descriptor** divides a $20s \times 20s$ oriented window into a $4 \times 4$ grid of sub-regions; in each sub-region, Haar-wavelet responses $d_x$, $d_y$ at $5 \times 5$ sample points are aggregated into $v = (\sum d_x, \sum |d_x|, \sum d_y, \sum |d_y|)$, giving $4 \times 4 \times 4 = 64$ entries. **Orientation** is assigned by computing Haar-wavelet responses in a circular neighbourhood of radius $6s$ and sliding a $60°$ (i.e. $\pi/3$) angular window over the response vectors, taking the direction of the longest summed vector. The **U-SURF** variant skips orientation assignment for ~28% speed gain at the cost of rotation sensitivity.

# Assumptions

1. **(Soft) Approximately planar or low-parallax scenes.** Detectors and descriptors are rotation- and scale-invariant only; affine deformations and perspective are absorbed by robustness margins. Performance degrades with increasing out-of-plane rotation (the Graffiti sequence at 50° viewpoint change being the hardest test in the benchmark).
2. **(Hard) Upright camera or small in-plane rotation for U-SURF.** U-SURF skips orientation and fails silently when in-plane rotation exceeds roughly ±15°; the paper explicitly limits U-SURF to applications where "the camera often only rotates about the vertical axis."
3. **(Soft) Linear photometric model (scale + offset).** Descriptor L2-normalisation handles contrast changes; Haar-wavelet differences cancel additive bias. Non-linear tone changes (HDR, flash, per-channel clipping) degrade distinctiveness gradually.
4. **(Hard) Greyscale input.** The method does not use colour; colour images must be converted. No guidance is given on conversion; implicit assumption is standard luminance or single channel.
5. **(Soft) Sufficient blob-like texture.** The Hessian determinant fires on blob structures. Uniformly textured or edge-dominated regions (e.g. long straight lines) produce few or no keypoints, not an error, but reduced coverage.
6. **(Soft) Image resolution sufficient for the smallest filter (9×9).** Below roughly $20 \times 20$ pixels of content there is no valid scale layer at $\sigma = 1.2$.
7. **(Soft) Integer integral image precision adequate.** For images up to ~1 MP, 32-bit unsigned integer accumulation is sufficient; larger images require 64-bit to avoid overflow in the integral image sum (paper does not address this explicitly — see §Numerical sensitivity).

# Failure regime

- **Large viewpoint / affine change.** The Graffiti benchmark (50° out-of-plane rotation) is the "most challenging" test; SURF's detector is only scale- and rotation-invariant, so repeatability drops relative to affine-invariant detectors at extreme viewpoints (§5 standard evaluation).
- **U-SURF under rotation.** U-SURF achieves the fastest timing (255 ms vs 354 ms for SURF on Graffiti at 800×640) but is explicitly not invariant to in-plane rotation; object recognition drops from 82.6% (SURF) to 83.8% (U-SURF wins here due to discriminative power gain, but only because the test images have limited rotation). For scenes with unknown rotation, U-SURF risks silently mismatching descriptors.
- **Repeated or periodic texture.** Hessian-based blob detection on periodic patterns produces many near-identical responses at every period; NMS suppresses most but leaves ambiguity in the descriptor space. Nearest-neighbour-ratio matching at 0.7 threshold will then accept false positives.
- **JPEG compression.** The "Ubc" JPEG sequence in Mikolajczyk's benchmark is included in descriptor evaluation (Fig. 7); no failure threshold is quantified, but all gradient-based descriptors degrade under block artefacts that introduce spurious high-frequency edges.
- **Image blur.** The "Bikes" and "Trees" blur sequences (Fig. 7) are evaluated; SURF outperforms SIFT, but recall drops with increasing blur as interest point repeatability falls.
- **Very small images.** The museum recognition test uses 320×240 images and is described as "more challenging … as many details get lost" (§5); performance falls to ~83% even for SURF-128.
- **Brightness change.** "Leuven" lighting sequence tested (Fig. 6, Fig. 7); SURF is robust to moderate changes via descriptor normalisation, but extreme illumination change degrades repeatability.

# Numerical sensitivity

- **Hessian balancing constant.** The ratio $|L_{xx}(1.2)|_F \, |D_{xy}(9)|_F / (|L_{xy}(1.2)|_F \, |D_{xx}(9)|_F) = 0.912\ldots \approx 0.9$ (§3, Eq. 2); the approximation is used as $0.9$ in the determinant formula. The squared coefficient in the cross-term weight is $(0.9)^2 = 0.81$. The paper states 0.9 explicitly; implementations should use the exact rounded value or recompute the Frobenius norms to avoid a bias in the determinant scale.
- **Box-filter response normalisation.** Filter responses are normalised with respect to mask size (§3) so that the Frobenius norm is constant across scales — a requirement for scale-normalised detection. Implementations that omit this normalisation will produce scale-biased responses.
- **Integral image precision.** A 32-bit unsigned integer integral image accumulates at most $2^{32} - 1 \approx 4.3 \times 10^9$; for an 8-bit image of width $W$ and height $H$, the maximum sum is $255 \cdot W \cdot H$. Overflow occurs for images larger than approximately $\sqrt{4.3 \times 10^9 / 255} \approx 4100 \times 4100$ pixels. The paper tests 800×640 images; no overflow issues arise there. For modern high-resolution inputs, 64-bit integral images are required (not discussed in paper).
- **Box-filter size quantisation.** Filter sizes (9, 15, 21, 27, …) grow in discrete integer steps; the effective $\sigma$ mapping ($9 \times 9 \to \sigma = 1.2$, $27 \times 27 \to \sigma = 3.6$) is linear. Rounding filter dimensions to odd integers introduces quantisation of about ±0.1 in effective $\sigma$. Sub-pixel scale interpolation via quadratic fit (§3, citing Brown et al.) partially compensates.
- **Descriptor Gaussian weighting.** Orientation step uses Gaussian $\sigma = 2.5s$ over the $6s$-radius neighbourhood; descriptor sub-region weighting uses Gaussian $\sigma = 3.3s$ centred at the keypoint (§4). Incorrect sigma values corrupt the spatial weighting and reduce distinctiveness.
- **Descriptor normalisation.** The 64-D vector is L2-normalised to a unit vector (§4.2) for invariance to contrast (scale factor). Implementations must normalise after accumulating all sub-region sums — not per sub-region.
- **Haar-wavelet filter size.** The wavelet side length for orientation is $4s$ (§4.1); for the descriptor it is $2s$ (§4.2). Mixing these up silently corrupts either orientation assignment or descriptor values.

# Applicability

- **Use when:** Fast keypoint detection and description are required on a CPU with no GPU available; scenes have blob-like structure (not purely edge-dominated); moderate rotation and scale invariance suffices; 64-D descriptors reduce memory and matching cost relative to SIFT's 128-D; camera is approximately upright (for U-SURF). Shown competitive with SIFT and GLOH on the Mikolajczyk benchmark; ~3× faster than DoG detection alone, ~3× faster end-to-end than SIFT (354 ms vs 1036 ms, Table 2).
- **Don't use when:** Full affine invariance is required (large viewpoint, tilted surfaces); colour information is needed; deep-learning alternatives (SuperPoint, XFeat) are acceptable and a GPU is available; very high matching precision matters more than speed (SURF-128 is slower to match and still less distinctive than GLOH at 128-D).
- **Compared against (from paper's eval):** DoG (Lowe SIFT detector), Harris-Laplace, Hessian-Laplace (detection, §5 Table 1); SIFT, GLOH, PCA-SIFT (descriptor, §5 Fig. 4 and Fig. 7).

# Connections

- **Builds on:** `lowe2004-sift` (SIFT detector and descriptor design, scale-space via DoG approximation, nearest-neighbour-ratio matching strategy — cited as [2] throughout), `harris1988-corner` (Harris corner detector, cited as [10] for Hessian-based lineage)
- **Enables:** downstream image stitching, object recognition, SLAM front-ends that consume SURF keypoints/descriptors (not direct paper citations, but the stitching pages in `relevant_atlas_pages` use SURF correspondences as input)
- **Refutes / supersedes:** none (SURF positions itself as faster-but-comparable to SIFT, not a supersession)

# Atlas update plan

## NEW: surf
Type: algorithm
Category: feature-detection
Primary source: bay2006-surf

- **Goal:** Detect scale- and rotation-invariant interest points in a greyscale image using an approximated Hessian-determinant response on integral images, then describe each keypoint with a 64-D Haar-wavelet response histogram robust to moderate illumination and geometric change. The primary goal is to match or exceed SIFT's distinctiveness and repeatability while being significantly faster to compute and match.

- **Algorithm:**
  - Build an integral image $I_\Sigma(x, y) = \sum_{i \le x, j \le y} I(i, j)$ (§2, citing Viola & Jones [23]); any rectangular sum reduces to 4 additions regardless of size.
  - Approximate Hessian matrix entries at each pixel and scale with box filters $D_{xx}$, $D_{yy}$, $D_{xy}$; compute $\det(\mathcal{H}_\text{approx}) = D_{xx} D_{yy} - (0.9 \, D_{xy})^2$ (§3, Eq. 2). The factor 0.9 balances the relative Frobenius norms of the box-filter lobes vs. true Gaussian derivatives.
  - Build scale-space by increasing box-filter size rather than subsampling: the first octave uses filter sizes $9 \times 9$, $15 \times 15$, $21 \times 21$, $27 \times 27$; subsequent octaves double the size increment (steps of 6, 12, 24 pixels) (§3). The $9 \times 9$ filter corresponds to $\sigma = 1.2$.
  - Apply non-maximum suppression in a $3 \times 3 \times 3$ neighbourhood (image + scale) and interpolate to sub-pixel and sub-scale accuracy using a 3D quadratic fit (Brown et al. [27]) (§3).
  - **Orientation assignment (full SURF):** compute Haar-wavelet responses $d_x$, $d_y$ in a circular neighbourhood of radius $6s$ (wavelet side $4s$), weight with Gaussian $\sigma = 2.5s$, slide a $60°$ window and take the longest summed response vector as the dominant orientation (§4.1). U-SURF skips this step.
  - **Descriptor extraction:** align a $20s \times 20s$ square window to the dominant orientation; split into a $4 \times 4$ grid of sub-regions; at $5 \times 5$ sample points per sub-region compute Haar responses $d_x$, $d_y$ (filter size $2s$), weight by Gaussian $\sigma = 3.3s$, accumulate $v = (\sum d_x, \sum |d_x|, \sum d_y, \sum |d_y|)$ per sub-region (§4.2). Concatenate to 64-D; L2-normalise to unit vector.
  - Store the sign of the Laplacian (trace of the Hessian) per keypoint for fast reject during matching: only compare keypoints with the same contrast polarity (§4.2).

- **Implementation:**
  - Use 32-bit unsigned integer integral image for images up to approximately $4100 \times 4100$ pixels; use 64-bit for larger inputs to avoid overflow.
  - Box-filter sizes must be odd integers; normalise each filter response by mask area before computing the determinant to maintain constant Frobenius norm across scales (§3).
  - Descriptor sub-region Gaussian weight ($\sigma = 3.3s$) and orientation neighbourhood Gaussian weight ($\sigma = 2.5s$) use different sigmas — do not conflate them.
  - Matching: apply nearest-neighbour-ratio test at threshold 0.7 (§5); early-reject keypoint pairs with differing Laplacian signs before computing descriptor distance (§4.2, §5).
  - SURF-128: split $\sum d_x$ and $\sum |d_x|$ by sign of $d_y$, and $\sum d_y$ and $\sum |d_y|$ by sign of $d_x$, doubling to 128-D — more distinctive but slower to match (§4.2).

- **Remarks:**
  - End-to-end SURF is ~3× faster than SIFT: 354 ms vs. 1036 ms on the Graffiti 800×640 image (Pentium IV 3 GHz, Table 2). U-SURF reaches 255 ms by skipping orientation.
  - SURF outperforms SIFT and GLOH in descriptor recall-precision on the Mikolajczyk benchmark for nearly all sequences; SURF-128 performs best overall (85.7% museum recognition vs 78.1% SIFT, §5).
  - The 64-D descriptor halves matching cost vs. SIFT's 128-D; the Laplacian-sign index provides an additional cheap pre-filter. Together these make SURF competitive for real-time pipelines on 2006-era hardware.
  - U-SURF trades rotation invariance for discriminative power and speed — valid when the camera stays approximately upright (mobile robots, tourist guiding, etc.) but risky when in-plane rotation is unknown.
  - The Hessian-determinant detector is more selective than Harris-based detectors: it fires on blobs rather than corners, producing fewer elongated or ill-localised detections (§2). This reduces the number of unstable keypoints at the cost of missing corner-type structure.

- **References:** `bay2006-surf`, `lowe2004-sift`, `harris1988-corner`

Relations:
- { type: alternative_formulation_of, target: sift, confidence: high }
- { type: compared_with, target: fast-corner-detector, confidence: medium, caution: "FAST is detector-only; SURF bundles a descriptor." }
- { type: compared_with, target: harris-corner-detector, confidence: medium }
- { type: compared_with, target: shi-tomasi-corner-detector, confidence: medium }
- { type: feeds_into, target: gao-dual-homography-stitching, confidence: high }
- { type: feeds_into, target: lin-sva-stitching, confidence: high }
- { type: feeds_into, target: apap-image-stitching, confidence: high }

## UPDATE: superpoint
Section: Relations
- Add `{ type: learned_alternative_of, target: surf, confidence: high }` to the page's `relations[]`.
- SuperPoint's joint detect+describe CNN explicitly positions itself as a learned replacement for the classical SIFT/SURF/ORB family; SURF was missing from the existing `learned_alternative_of` targets.

## UPDATE: xfeat
Section: Relations
- Add `{ type: learned_alternative_of, target: surf, confidence: high }` to the page's `relations[]`.
- XFeat is a CPU-grade lightweight learned detector+descriptor positioned against SIFT/SURF; mirror the SURF target alongside whatever SuperPoint already lists.

# Provenance

All citations are to the `.txt` cache of Bay, Tuytelaars, Van Gool (2006) LNCS proceedings paper.

| Claim | Source location |
|---|---|
| $\det(\mathcal{H}_\text{approx}) = D_{xx} D_{yy} - (0.9 \, D_{xy})^2$ | §3, Eq. 2 |
| Balancing constant $0.912\ldots \approx 0.9$ computed as $\|L_{xx}(1.2)\|_F \|D_{xy}(9)\|_F / (\|L_{xy}(1.2)\|_F \|D_{xx}(9)\|_F)$ | §3, between Eq. 1 and Eq. 2 (cache lines 208–212) |
| $9 \times 9$ box filter corresponds to $\sigma = 1.2$; filters grow to $15 \times 15$, $21 \times 21$, $27 \times 27$ in the first octave | §3 (cache lines 227–228) |
| Filter size increment doubles per octave: step sizes 6, 12, 24 | §3 (cache line 230) |
| $27 \times 27$ filter corresponds to $\sigma = 3.6$ | §3 (cache line 233–234) |
| Non-maximum suppression in $3 \times 3 \times 3$ neighbourhood | §3 (cache line 237) |
| Sub-pixel/sub-scale interpolation via Brown et al. [27] | §3 (cache lines 238–239) |
| Orientation: Haar-wavelet responses in circular neighbourhood of radius $6s$, sampling step $s$, wavelet side $4s$ | §4.1 (cache lines 276–284) |
| Orientation: Gaussian weighting with $\sigma = 2.5s$ | §4.1 (cache line 285) |
| Sliding orientation window of $\pi/3$ (60°) | §4.1 (cache lines 289–291) |
| U-SURF skips orientation step | §4.1 (cache line 296); §1 (cache lines 70–74) |
| Descriptor window size $20s$ | §4.2 (cache line 302) |
| $4 \times 4$ sub-region grid with $5 \times 5$ sample points per sub-region | §4.2 (cache lines 304–306) |
| Haar filter size $2s$ for descriptor | §4.2 (cache line 308) |
| Descriptor Gaussian weighting $\sigma = 3.3s$ | §4.2 (cache line 311) |
| $v = (\sum d_x, \sum |d_x|, \sum d_y, \sum |d_y|)$ per sub-region → 64-D vector | §4.2 (cache lines 313–323) |
| L2-normalisation to unit vector for contrast invariance | §4.2 (cache line 323) |
| Laplacian sign for fast matching index | §4.2 (cache lines 379–386) |
| SURF-128: split sums by sign of $d_y$ / $d_x$, doubling to 128-D | §4.2 (cache lines 366–372) |
| Timing: Fast-Hessian 120 ms, Hessian-Laplace 650 ms, DoG 400 ms (800×640 Graffiti, Pentium IV 3 GHz) | §5, Table 1 |
| Timing: U-SURF 255 ms, SURF 354 ms, SURF-128 391 ms, SIFT 1036 ms | §5, Table 2 |
| Fast-Hessian >3× faster than DoG, >5× faster than Hessian-Laplace | §5 (cache lines 416–418) |
| Nearest-neighbour-ratio threshold 0.7 | §5 (cache lines 484–486) |
| Museum recognition rates: SURF-128 85.7%, U-SURF 83.8%, SURF 82.6%, GLOH 78.3%, SIFT 78.1%, PCA-SIFT 72.3% | §5 (cache lines 491–493) |
| Integral image definition $I_\Sigma(x) = \sum_{i \le x, j \le y} I(i,j)$; 4 additions for any rectangle | §2 / introduction to integral images (cache lines 159–163), citing Viola & Jones [23] |
| Harris corner detector cited as prior work [10] | §2 (cache lines 86–88) and References (cache lines 549) |
| SIFT cited as prior art and descriptor baseline [2] | §1 intro and §2 (cache lines 99–124) and References (cache lines 527–528) |
| Graffiti sequence "most challenging" with out-of-plane + in-plane rotation + brightness | §5 (cache lines 374–377) |
| Descriptor evaluation sequences: Graffiti, Wall, Boat, Leuven, Bikes, Trees, Ubc | §5 (cache lines 399–402, Fig. 7 caption lines 589–591) |
| SURF outperforms SIFT/GLOH by sometimes >10% recall at same precision | §5 (cache lines 437–439) |
