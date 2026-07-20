---
paper_id: geiger2012-automatic
title: "Automatic Camera and Range Sensor Calibration using a Single Shot"
authors: ["Andreas Geiger", "Frank Moosmann", "Ömer Car", "Bernhard Schuster"]
year: 2012
url: https://www.cvlibs.net/publications/Geiger2012ICRA.pdf
created: 2026-05-02
relevant_atlas_pages: []
---

# Setting

**Problem class.** Joint intrinsic + extrinsic calibration of multiple cameras and one or more range sensors (3D lidar or RGB-D), using a single shot — one image per camera and one range scan — with multiple planar checkerboard targets placed at different locations in the scene. The paper decomposes the problem into two sequential stages:

1. **Camera-to-camera calibration** (Sec. III): detect checkerboard corners in each camera image, match them across views, and recover per-camera intrinsics and inter-camera extrinsics.
2. **Camera-to-range calibration** (Sec. IV): given calibrated camera geometry, align the checkerboard planes triangulated from camera images against planar segments extracted from the range point cloud.

The corner-detection subsystem (Sec. III-A/B) is self-contained and re-usable outside the full calibration pipeline. It is this subsystem that abeles2021-pyramidal cites as "Geiger [18]" — the second-best F1 (0.92) in the benchmark.

**Inputs.** 
- Camera side: a single grayscale image per camera. Unknown number and location of checkerboards; the method discovers them automatically. Required: physical inner-corner spacing for scale resolution. No prior on $(r, c)$ for individual boards.
- Range side: an unordered 3D point cloud (Velodyne HDL-64E or Microsoft Kinect depth). No initial pose estimate.

**Outputs.**
- Camera side: all visible checkerboard corner sets, with subpixel coordinates. Intrinsic parameters (10 DoF: $f_u, f_v, c_u, c_v, \alpha, k_1, \ldots, k_5$) per camera; extrinsic parameters (6 DoF per camera pair).
- Range side: the 6-DoF rigid transformation $\theta = (r_x, r_y, r_z, t_x, t_y, t_z)^T$ aligning camera and sensor frames.

**Guarantees.** No mathematical guarantee on corner detection. Calibration accuracy is empirically validated (Table I): mean reprojection error 0.18 pixels across 10 settings. Camera-to-range accuracy degrades under high lidar noise and when checkerboards do not span sufficient orientation diversity (Fig. 7). When the calibration configuration is ambiguous (orthogonal boards), multiple solutions are returned and rendered for manual disambiguation (Fig. 6).

# Core idea

## Corner detection (Sec. III-A)

In order to locate checkerboard corners in a grayscale image $I$, the method computes a **corner likelihood map** $C$ at each pixel by convolving the image with two $n \times n$ prototype templates:

- Prototype 1: axis-aligned X-junction ($0°/90°$ orientation).
- Prototype 2: $45°$-rotated X-junction.

Each prototype consists of four filter kernels $\{A, B, C, D\}$ covering the four quadrants around a candidate corner. For an ideal corner, quadrants $A$ and $B$ should be on the bright side (response above the four-quadrant mean $\mu$) and $C$, $D$ on the dark side, or vice versa. The corner likelihood $c$ at each pixel is:

$$c = \max(s_1^1, s_1^2, s_2^1, s_2^2) \tag{1}$$

$$s_i^1 = \min\!\bigl(\min(f_A^i, f_B^i) - \mu,\; \mu - \min(f_C^i, f_D^i)\bigr)$$

$$s_i^2 = \min\!\bigl(\mu - \min(f_A^i, f_B^i),\; \min(f_C^i, f_D^i) - \mu\bigr)$$

$$\mu = 0.25\,(f_A^i + f_B^i + f_C^i + f_D^i)$$

Taking the minimum of the two "bright" quadrant responses and the minimum of the two "dark" quadrant responses suppresses responses where any one quadrant is weak — a deliberate design to exclude non-checkerboard-style corners. A pixel scores high only when all four quadrants simultaneously exhibit the expected contrast pattern.

After computing $C$, conservative NMS is applied (parameters $n_\text{nms}$, $\tau_\text{nms}$), followed by **gradient-distribution verification**: a weighted 32-bin orientation histogram of Sobel responses is computed in a local $n \times n$ neighbourhood. The two dominant gradient modes $\alpha_1, \alpha_2$ are found by mean shift. An expected gradient template $T$ is constructed from these orientations; the product $T \ast \|\nabla I\|_2$ times $c$ gives the corner score, thresholded by $\tau_\text{corner}$ to produce the final candidate list.

In practice the filter is run at **three scales** ($4 \times 4$, $8 \times 8$, $12 \times 12$ pixel windows) and the maximum of the three scores is taken — a coarse multi-scale strategy to improve robustness to blur (paper §V-A).

abeles2021-pyramidal notes that this likelihood function has "many more logical branches making it expensive to compute" compared to the `xscore` formulation, but credits it as one of the foundational X-corner response functions in the calibration literature.

## Sub-pixel corner and orientation refinement (Sec. III-B)

For each detected corner candidate $c_0 \in \mathbb{R}^2$, the subpixel position is found by requiring that image gradients $g_p$ at neighbouring pixels $p \in N_I(c_0)$ are orthogonal to $(p - c)$:

$$c = \arg\min_{c'} \sum_{p \in N_I(c')} \bigl(g_p^T (p - c')\bigr)^2 \tag{2}$$

This is solved in closed form by an $11 \times 11$ neighbourhood:

$$c = \left(\sum_p g_p g_p^T\right)^{-1} \sum_p (g_p g_p^T) p \tag{3}$$

Gradients are automatically weighted by $\|g_p\|$ because $g_p g_p^T$ scales with squared magnitude. This is an eigenvalue / weighted-least-squares formulation: the corner is the point where the (gradient-weighted) mean squared deviation of gradient directions from the line through $c$ is minimised. 

Edge orientation vectors $e_1, e_2$ are refined separately by minimising the squared deviation of gradient normals:

$$e_i = \arg\min_{e_i'} \sum_{p \in M_i} (g_p^T e_i')^2 \quad \text{s.t. } e_i'^T e_i' = 1 \tag{4}$$

where $M_i = \{p \mid p \in N_I, |m_i^T g_p| < 0.25\}$ selects pixels whose gradient is approximately aligned with mode $m_i$ from the orientation histogram. The solution is the eigenvector of the $2 \times 2$ scatter matrix corresponding to the smallest eigenvalue (eq. 5 in the paper).

## Structure recovery (Sec. III-C)

The checkerboard structure is recovered by minimising an energy:

$$E(\mathcal{X}, \mathcal{Y}) = E_\text{corners}(\mathcal{Y}) + E_\text{struct}(\mathcal{X}, \mathcal{Y}) \tag{6}$$

$E_\text{corners} = -|\{y \mid y \neq O\}|$ rewards explaining more corners (maximise non-outlier count). $E_\text{struct}$ measures how well triples of consecutive corners in a row/column satisfy the collinearity/spacing constraint (eq. 7). The discrete optimisation is greedy: start from a seed corner, expand the 2 × 2 initial hypothesis by adding one row or column at a time, choosing the expansion that reduces $E$ the most. Repeated for each seed; duplicates removed greedily. This recovers **multiple unknown checkerboards** from a single image — the key single-shot property.

## Camera-to-range calibration (Sec. IV)

Range sensor planes are segmented by region-growing on normal-vector similarity (eq. 8). Camera checkerboard planes are converted to disc-shaped surfaces. Three surfaces from each modality are randomly selected; the rotation is found by aligning normals (SVD, eq. 10); the translation minimises point-to-plane distances (eq. 11). Each hypothesis is scored by the distance from transformed camera points to their nearest neighbours in the point cloud (eq. 12). Fine registration uses ICP (eq. 13). Non-maxima suppression on the transformation set yields either a unique solution or multiple solutions for ambiguous configurations (reported to the user).

# Assumptions

1. (hard) All sensors share a common field of view. Camera-to-range calibration requires that camera checkerboard planes are visible to the range sensor.
2. (hard) The physical inner-corner spacing is known (required for scale resolution in the 3D reconstruction step).
3. (soft) The four-quadrant contrast assumption: a valid X-corner has two bright and two dark quadrants. Non-checkerboard patterns with four-quadrant structure can produce false positives.
4. (soft) The two dominant gradient directions at a corner can be identified by mean shift on a 32-bin orientation histogram. Cluttered backgrounds or heavy blur can produce spurious modes.
5. (soft) Multi-scale robustness via three fixed window sizes ($4 \times 4$, $8 \times 8$, $12 \times 12$) provides partial blur tolerance. Only three fixed scales — not a full pyramid. Severe blur at a scale that falls between these window sizes may be missed.
6. (soft) Structure recovery assumes approximately collinear triples along rows and columns. Strong fisheye distortion violates this locally; the energy function uses a local collinearity term that partially accommodates distorted patterns (paper §III-C: "we gain flexibility and also allow for strongly distorted patterns").
7. (hard) The calibration setup requires multiple checkerboards at sufficient orientation and distance diversity for the camera-to-range calibration to be well-constrained. Single-board configurations lead to high errors (paper §V-C, Fig. 7 conclusion: "Only configurations where the checkerboards cover most parts of the image and they are presented at various distances and orientations" yield low errors).
8. (soft) Camera-to-range calibration assumes the camera intrinsics are already solved. Errors in intrinsics propagate into the extrinsic estimate.

# Failure regime

- **Heavy blur at intermediate scales.** Three fixed filter scales ($4 \times 4$, $8 \times 8$, $12 \times 12$) provide limited scale coverage. Blur that peaks between these scales produces weak responses at all three. By contrast, the pyramidal approach (abeles2021-pyramidal) selects continuously across levels. In the abeles benchmark, Geiger's F1 degrades in challenging scenarios (motion blur, large shadows) while maintaining F1 = 0.92 overall vs. 0.97 for the pyramidal detector.
- **Cast shadows and outdoor lighting.** Settings 7 and 8 in Table I are outdoor and produce the largest calibration errors. The corner detector is gradient-based and does not compensate for low-contrast shadow regions.
- **Cluttered backgrounds.** The gradient-distribution verification step suppresses non-checkerboard corners, but the likelihood function (eq. 1) can still fire on textured backgrounds with approximately four-quadrant contrast patterns. The paper claims outperformance over Harris, Ha et al., and Kassir et al. in terms of recall on the 126-image test set (Fig. 5), but does not characterise false-positive rate on highly cluttered backgrounds.
- **Degenerate checkerboard constellations for range calibration.** When all checkerboards are co-planar or parallel-planar, the normal-vector alignment (eq. 10) under-constrains the rotation. The paper handles this by returning multiple solutions; the user selects manually (Fig. 6).
- **Known inner-corner spacing required.** Without this, scale is unresolved and the 3D reconstruction step fails silently.
- **Very small checkerboards (few pixels per field).** The smallest filter window is $4 \times 4$. Below ~5–6 pixels per field, even the smallest-scale response is unreliable.
- **Single-scan range data.** A single lidar shot may miss parts of the checkerboard due to lidar line spacing; the paper uses Velodyne HDL-64E (dense) and Kinect (dense), which avoids the sparse-scan problem. Rotating SICK or low-line-count lidars would require a different approach.

# Numerical sensitivity

- **Filter window size $n$.** Empirically set to $4 \times 4$, $8 \times 8$, $12 \times 12$ for multi-scale response. The paper keeps these fixed across all 10 calibration settings (§V): "As parameters, we empirically picked..." This is a strong usability claim but untested sensitivity.
- **NMS parameters $n_\text{nms}$, $\tau_\text{nms}$, $\tau_\text{corner}$.** All set to 0.02 empirically and fixed. Conservative NMS is chosen deliberately to avoid false suppressions at the cost of more candidates to verify.
- **Gradient neighbourhood $11 \times 11$ pixels.** The subpixel refinement integrates over 121 pixels — larger than many alternatives (Harris uses 5–9 px, ROCHADE's cone window is $2\kappa + 1$ with $\kappa = 2$–$5$). Larger neighbourhood reduces sensitivity to single-pixel noise but can cross checkerboard edges if the field is small.
- **Gradient weighting.** The squared-gradient weighting $g_p g_p^T$ in eq. (3) down-weights low-gradient pixels automatically. This is numerically well-conditioned as long as at least one gradient direction is strong in the neighbourhood; pathological cases where all four quadrants are uniformly bright/dark yield an ill-conditioned $2 \times 2$ matrix.
- **Orientation histogram binning (32 bins).** Mean-shift peak finding in a 32-bin circular histogram. Two modes separated by $< 360/32 \approx 11°$ cannot be resolved. On strongly distorted patterns, the two edge directions at a corner deviate further from $90°$ and can collapse into one apparent mode in a $32$-bin histogram at low resolution.
- **Camera-to-range scoring ($\tau_\text{score}$, $\tau_\text{comb}$).** Set to 1.5 and 25 respectively. These control the trade-off between generating enough transformation hypotheses and terminating early. The paper notes dependence on checkerboard constellation quality — parameter sensitivity is absorbed by the robust scoring function.
- **ICP fine registration.** Uses point-to-point distance (eq. 13). Sensitive to the quality of the initial alignment from global registration. The paper reports good robustness: rotation errors under ~2° for Velodyne at $\sigma = 0.05$ m noise (Fig. 7).

# Applicability

- Use when: multi-sensor calibration (camera + lidar or RGB-D) is required without extensive manual target manipulation — the single-shot property eliminates the need for synchronized multi-pose captures.
- Use when: calibrating an unknown number of checkerboards in a single scene simultaneously. The energy-function structure recovery finds all boards in one pass.
- Use when: baseline corner detection for checkerboard-based calibration in moderately difficult conditions. The method outperforms Harris and older multi-scale Harris approaches in both precision and recall (Fig. 5 in the paper).
- Don't use when: severe blur or high-resolution images are expected. The three fixed scales do not cover the full range; the pyramidal detector (abeles2021-pyramidal) is the current state of the art for this regime.
- Don't use when: a partial pattern (occluded checkerboard) must be recovered. The structure-recovery energy function assumes a connected checkerboard graph; OCPAD or other partial-pattern detectors are more appropriate.
- Don't use when: real-time constraint is tight and only camera calibration (no range sensor) is needed. The overhead of running three filter scales, mean-shift orientation estimation, and structure recovery per image exceeds single-scale alternatives. The paper quotes "less than one minute per calibration scenario" as a positive property — not suited for embedded/real-time use.
- Don't use when: lidar-to-camera calibration with a rotating SICK or low-line-count scanner. The range segmentation assumes dense 3D point clouds.
- Compared against:
  - **Harris (Shi-Tomasi criterion)**: lower recall in the paper's 126-image corner-detection test (Fig. 5). Harris is a per-pixel detector without a checkerboard-specific response function.
  - **Ha et al. [9]** (Geiger's [9], Ha 2009): uses multi-scale Harris plus a region-based classifier. Geiger's corner likelihood (eq. 1) directly outperforms this in recall.
  - **Kassir et al. [4]**: more robust than OpenCV, uses multi-scale Harris; Geiger outperforms in precision-recall (Fig. 5).
  - **chess-corners (bennett2013-chess)**: different response formulation (SR/DR/MR); single-scale unless wrapped in a pyramid; no built-in subpixel refinement or structure recovery.
  - **rochade (placht2014-rochade)**: graph-based centreline detector with cone-filtered quadratic subpixel refinement; higher subpixel accuracy on clean data but requires the full pattern and does not do range calibration.
  - **pyramidal-blur-aware-xcorner (abeles2021-pyramidal)**: successor in the per-pixel x-corner detector family; full image pyramid; F1 = 0.97 vs Geiger's 0.92 in the abeles benchmark; faster.

# Connections

- Builds on:
  - **harris1988-corner** — Harris/Shi-Tomasi corners are the baseline that Geiger's likelihood function explicitly improves upon (paper §III-A and §V-A). The four-quadrant filter is motivated by the inadequacy of Harris in cluttered calibration scenes.
  - **shi-tomasi1994-features** — cited as a common choice for junction localisation before the Geiger likelihood was proposed (paper §III-A: "Harris points [8] or Shi-Tomasi corners [17] are a common choice... However, we found that the following procedure gives more robust results").
  - **lucchese2003-saddle** — cited [20] in the references for the benefit of subpixel-accurate corner localisation in calibration (paper §III-B footnote: "It is well-known that calibration benefits from sub-pixel accurate corner locations [20], [21], [2]").
  - **rufli2008-blurred** — cited [7] as an extension of OpenCV's checkerboard detector that Geiger notes cannot be directly compared because it returns a single checkerboard per image.
  - **zhang2000-flexible** — cited [24] as the Zhang calibration method; Geiger extends the Matlab Camera Calibration Toolbox (Bouguet, [1]) for multi-camera use.
- Enables (in the atlas):
  - **pyramidal-blur-aware-xcorner** — abeles2021-pyramidal benchmarks Geiger's detector as "Geiger [18]", second-best F1 = 0.92. The `xscore` design in the pyramidal paper is informed by the Geiger likelihood: "Geiger et al. ... uses a likelihood function [with] many more logical branches making it expensive to compute" (abeles2021-pyramidal §II).
  - Potentially **geiger-chessboard-detector** (new atlas page — see Atlas update plan).
- Refutes / supersedes:
  - **Harris / Shi-Tomasi in the calibration X-corner context**: the paper's precision-recall plot (Fig. 5) shows a large gap. Geiger's checkerboard-specific likelihood (eq. 1) is not a general corner detector improvement — it is specifically calibrated to the four-quadrant intensity pattern.

# Atlas update plan

## NEW: geiger-chessboard-detector

**Justification.** No existing atlas page covers this detector. The detector is:
- A foundational X-corner response function in the calibration literature (ICRA 2012, Karlsruhe Institute of Technology).
- The origin of the libcbdetect / libomnical open-source implementation referenced in subsequent works.
- Cited as a direct competitor in abeles2021-pyramidal (the existing `pyramidal-blur-aware-xcorner` page), where it ranks second overall (F1 = 0.92 vs 0.97).
- Technically distinct from all existing pages: neither a graph-based detector (rochade, ocpad), nor a single-scale ring-intensity detector (chess-corners), nor a full pyramid detector (pyramidal). It uses a four-kernel prototype filter + multi-scale maximum at three fixed scales + gradient-orientation verification + gradient-orthogonality subpixel refinement.
- Referenced by abeles2021-pyramidal, which is the primary source of the existing `pyramidal-blur-aware-xcorner` page → already satisfies ≥1 reference; the new page would in turn carry `relations[type=compared_with]` entries to `chess-corners`, `rochade`, and `pyramidal-blur-aware-xcorner`, establishing bidirectional graph edges.

The page warrants creation. Suggested slug: `geiger-chessboard-detector`.

**Status: page created** (`content/algorithms/geiger-chessboard-detector.md`, non-draft). Of the three comparisons proposed below, only Geiger↔Pyramidal is currently authored on the page; the Geiger↔ChESS and Geiger↔ROCHADE comparisons remain open (see the per-page UPDATE sections below).

**Caution.** The paper `geiger2012-automatic` is not yet in `docs/papers/index.yaml`. It must be added (via `bun papers:fetch-meta` or manual entry) before `sources.primary: geiger2012-automatic` can pass build validation. The `algo-page` skill must refuse until this is resolved.

### Suggested frontmatter

```yaml
title: "Geiger Chessboard Corner Detector"
date: 2026-05-02
summary: "Detect checkerboard X-corners by computing a four-quadrant corner likelihood at each pixel using axis-aligned and 45°-rotated prototype filters, verifying candidates by gradient orientation statistics, and refining to subpixel accuracy via gradient-orthogonality weighted least squares."
tags: ["calibration", "chessboard", "corner-detection"]
category: corner-detection
author: "Vitaly Vorobyev"
difficulty: intermediate
draft: true
prerequisites: [image-gradient]
relations:
  - type: compared_with
    target: chess-corners
    confidence: high
  - type: compared_with
    target: rochade
    confidence: high
  - type: compared_with
    target: pyramidal-blur-aware-xcorner
    confidence: high
failureModes: []
sources:
  primary: geiger2012-automatic
  references: [harris1988-corner, shi-tomasi1994-features, lucchese2003-saddle, rufli2008-blurred, zhang2000-flexible]
```

### Suggested page sections

**Goal.** Detect inner X-junction corners of an unknown number of planar checkerboard patterns in a single grayscale camera image, with subpixel accuracy, for use in camera calibration and camera-to-range sensor calibration.

**Algorithm.**
- Section III-A, Corner Detection:
  - Four-kernel prototype filter (axis-aligned + $45°$-rotated, each composed of $\{A, B, C, D\}$ quadrant kernels).
  - Corner likelihood (eq. 1): minimum of two bright-quadrant responses, minimum of two dark-quadrant responses, mean-normalised, max over two prototypes and two flippings. Low if any quadrant is weak — designed to suppress non-checkerboard corners.
  - Conservative NMS on the likelihood map.
  - Gradient-distribution verification: 32-bin Sobel orientation histogram, mean-shift peak finding, template $T$ of expected gradient directions, score = $T \ast \|\nabla I\|_2 \cdot c$.
  - Multi-scale maximum: repeat at $4 \times 4$, $8 \times 8$, $12 \times 12$ pixel windows, take max score per pixel.
- Section III-B, Sub-pixel Refinement:
  - Gradient-orthogonality optimisation over $11 \times 11$ neighbourhood (eq. 2/3): weighted least squares, closed-form.
  - Edge orientation refinement via smallest-eigenvalue of gradient scatter matrix restricted to aligned pixels (eq. 4/5).
- Section III-C, Structure Recovery:
  - Energy minimisation $E = E_\text{corners} + E_\text{struct}$ (eq. 6/7) over corner label assignments.
  - Greedy expansion from seed corners; multiple checkerboards recovered; duplicate removal by shared-corner criterion.

**Implementation.** Open-source: libcbdetect (C++), libomnical (extended for omnidirectional cameras) from Geiger's Karlsruhe lab (www.cvlibs.net). The toolbox also implements the range calibration pipeline (Sec. IV).

**Remarks.**
- The corner likelihood (eq. 1) is structurally similar to the `xscore` in the pyramidal detector (abeles2021-pyramidal), but uses two full quadrant-kernel convolutions rather than 16 ring samples. abeles2021-pyramidal notes the Geiger likelihood has "many more logical branches making it expensive to compute" but credits it as the foundational design.
- The multi-scale approach (three fixed window sizes) provides limited blur tolerance compared to a full image pyramid; it is sufficient for typical indoor calibration conditions but degrades under severe blur or high-resolution images.
- The gradient-orthogonality subpixel refinement (eq. 3) integrates over 121 pixels — a large neighbourhood that reduces noise sensitivity at the cost of potential bias near small checkerboard fields or pattern boundaries. 
- The single-shot joint calibration capability (multiple cameras + range sensor, one image each) was a significant practical advance over multi-pose toolboxes (Bouguet Matlab toolbox, OpenCV) at the time of publication; it remains the design model for modern calibration rigs using multiple cameras and one lidar.
- **Comparison with ChESS (`chess-corners`)**: Geiger's likelihood uses four rectangular quadrant kernels (not a fixed ring pattern); applies at three scales; includes gradient verification. ChESS uses 16 ring offsets, is single-scale (or multi-scale only via external pyramid), and does not include a built-in structure-recovery step. ChESS is faster for per-pixel scoring; Geiger's full pipeline produces a structured checkerboard grid. See the `chess-corners` page for the hosted comparison section.
- **Comparison with ROCHADE (`rochade`)**: Geiger detects corners per-pixel, then grows a grid graph from seed points; ROCHADE extracts a centreline graph and detects saddle points. ROCHADE provides tighter subpixel accuracy via cone-filtered quadratic fitting; Geiger's gradient-orthogonality refinement is simpler and larger-neighbourhood. ROCHADE requires all pattern corners to be visible; Geiger's energy minimisation can handle partially discovered boards.
- **Comparison with pyramidal (`pyramidal-blur-aware-xcorner`)**: the pyramidal detector is the successor in the per-pixel x-corner family. Full pyramid vs three fixed scales; `xscore` vs four-quadrant prototypes; blur-aware edge spacing vs fixed spacing. F1 comparison: 0.97 vs 0.92 (abeles2021 benchmark). See the `pyramidal-blur-aware-xcorner` page for the hosted comparison section (pyramidal is the more recent paper and hosts).

## UPDATE: pyramidal-blur-aware-xcorner

Section: Remarks / Comparisons
- **Status: resolved.** `geiger-chessboard-detector.md` carries `relations: [{ type: compared_with, target: pyramidal-blur-aware-xcorner, confidence: high }]` (Geiger is the older paper and hosts) and the page has a live `## When to choose Geiger over Pyramidal` section. The design contrast this note proposed — Geiger's three-fixed-scale multi-scale vs pyramidal's full pyramid, plus the "many more logical branches" quote from abeles2021-pyramidal §II as the motivation for the `xscore` design — should be checked against that section's actual content on a future completeness pass; not re-verified here.

## UPDATE: chess-corners

Section: Remarks / Comparisons — **still open**

Per comparison policy, the more-authoritative tiebreaker is "older paper hosts": Geiger 2012 predates ChESS 2013, so **`geiger-chessboard-detector`** hosts the "When to choose Geiger over ChESS" comparison section, not `chess-corners`. (Correcting an internal inconsistency in this note's original draft, which stated the Geiger-hosts conclusion in one sentence and then instructed adding the edge to `chess-corners.comparedWith` — i.e. chess-corners hosting — in the next; the "older paper hosts" rule the note itself invokes means Geiger hosts.)

Translated to `relations[]`: add `{ type: compared_with, target: chess-corners, confidence: high }` to `content/algorithms/geiger-chessboard-detector.md` (already reflected in the frontmatter sketch above), and a single pointer Remarks bullet on `chess-corners.md` — e.g. "Compared with Geiger: see [When to choose Geiger over ChESS](/atlas/geiger-chessboard-detector#when-to-choose-geiger-over-chess) on the Geiger page, which hosts the comparison per the older-paper-hosts rule." **Not yet applied** — `chess-corners.md` currently has no Geiger entry in its Remarks, and `geiger-chessboard-detector.md` currently has no `compared_with` entry targeting `chess-corners`.

# Provenance

- Paper text: `docs/papers/.cache/geiger2012-automatic.txt` (8 pages, ICRA 2012, IEEE). All authors: Geiger, Moosmann, Car, Schuster; affiliation Karlsruhe Institute of Technology. Primary contact: `{geiger,frank.moosmann}@kit.edu`.
- Title (p. 1, line 1): "Automatic Camera and Range Sensor Calibration using a single Shot" (capitalisation as in paper).
- Abstract (p. 1): "fully automatic camera-to-camera and camera-to-range calibration ... a single image and range scan proves sufficient for most calibration scenarios ... the proposed checkerboard corner detector significantly outperforms current state-of-the-art."
- §III-A (pp. 2–3, lines 101–159): corner likelihood equation (1) and four-kernel prototype definition; NMS; gradient-distribution verification; "Harris points or Shi-Tomasi corners are a common choice... However, we found that the following procedure gives more robust results with respect to image clutter, blurring artifacts and localization accuracy."
- §III-B (p. 3, lines 161–197): subpixel refinement eq. (2)–(5). Neighbourhood $11 \times 11$ pixels. Quote: "It is well-known that calibration benefits from sub-pixel accurate corner locations [20], [21], [2]."
- §III-C (pp. 3–4, lines 198–217): energy function eq. (6)–(7). "We gain flexibility and also allow for strongly distorted patterns as imaged by fisheye lenses, for instance."
- §V-A (p. 5, lines 395–401): "To obtain a modest level of scale invariance and robustness with respect to blur, we detect corners using $4 \times 4$, $8 \times 8$, and $12 \times 12$ pixel windows in Sec. III-A and take the maximum of the three scores." Parameters: $n_\text{nms} = 3$, $\tau_\text{nms} = \tau_\text{corner} = 0.02$.
- §V-A (p. 5, Fig. 5): "Our method significantly outperforms all baselines, especially in terms of recall."
- §V-B (p. 5): mean reprojection error 0.18 pixels across all 10 calibration settings.
- §V-C (p. 6, Fig. 7): camera-to-range errors "highly dependent on the calibration setting: Only configurations where the checkerboards cover most parts of the image... lead to low errors."
- §VI (p. 6): "The main limiting assumption of our approach is a common field of view of the camera and range sensors."
- References: [8] Harris 1988, [17] Shi-Tomasi 1994, [19] Comaniciu-Meer mean shift, [20] Lucchese-Mitra 2003, [24] Zhang 1999, [25] Besl-McKay ICP.
- abeles2021-pyramidal §II (from research note): "Geiger et al. ... uses a likelihood function ... [with] many more logical branches making it expensive to compute." Benchmark result: Geiger second-best F1 = 0.92.
