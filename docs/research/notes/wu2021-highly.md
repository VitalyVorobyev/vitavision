---
paper_id: wu2021-highly
title: "A highly accurate and robust deep checkerboard corner detector"
authors: ["Hao Wu", "Yi Wan"]
year: 2021
url: https://onlinelibrary.wiley.com/doi/pdfdirect/10.1049/ell2.12056
created: 2026-05-02
relevant_atlas_pages:
  - chessboard-x-corner-detection
  - mate-checkerboard-detector
  - ccdn-checkerboard-detector
  - geiger-chessboard-detector
  - harris-corner-detector
  - zhang-planar-calibration
---

# Setting

**Problem class.** Detecting the inner X-corners of a planar checkerboard calibration target to sub-pixel accuracy, for use in camera calibration pipelines (intrinsics + distortion via Zhang's method).

**Inputs.** Greyscale checkerboard image of arbitrary resolution; no prior calibration assumed. The method internally slides a 15 × 15 pixel patch window over the full image.

**Outputs.** A set of pixel-integer corner locations (x, y) in image coordinates. Sub-pixel positions from competing methods are rounded to nearest integer for fair comparison in the paper's evaluation protocol. The pipeline can be naturally extended to produce sub-pixel positions by using the confidence map peak directly or applying a sub-pixel refinement step after NMS.

**Guarantees.** Evaluated on synthetic data (100 images, 16,511 corner points) and two real datasets (Mono 1072×712; GoPro resampled to 1200×900, 800×600, 400×300). CDR = 1.0 (full recall) achieved on every real dataset and on all synthetic noise levels tested. Zero false positives and zero failed detections reported on the synthetic test set across all noise levels.

# Core idea

The method addresses two root problems in prior work: (1) classical detectors (Harris, Geiger, ROCHADE) fail under extreme noise/blur because their response operators rely on local image gradients; (2) learning-based detectors (MATE, CCDN) are trained on real images with manually labelled corners that carry labelling error.

The solution is a fully synthetic training pipeline that simulates the real imaging process geometrically and radiometrically, yielding training images with **exact** sub-pixel corner ground truth. The imaging model places an ideal analog checkerboard at depth $z_0 = 6$, applies a rigid body transform $\text{Rt}(\cdot)$ (rotation + translation), projects through a pinhole operator $\text{Ph}(\mathbf{p}) = [x/z,\, y/z,\, 1]$, and resamples onto a discrete grid using a Gaussian kernel with $\sigma = w_p / 6$ where $w_p = 1/N$ is the pixel pitch in normalised coordinates. Blur (5×5 Gaussian, $\sigma_b \in [0, 1.6]$) and additive Gaussian noise ($\sigma_n \in [0, 8]$) are then applied stochastically. The full pipeline summarises as:

$$I_2 = \text{Ph}(\text{Rt}(I_0)), \qquad I = \text{Blur}(G_i(I_2)) + \text{Noise}. \tag{5}$$

Trained on this synthetic dataset, a small five-layer CNN (one 3×3 conv, one 3×3 residual block, two fully-connected layers, one sigmoid) scores every 15×15 patch with the confidence that its centre is a checkerboard corner. Sliding this window with stride 1 over the image produces a $(H-7) \times (W-7)$ confidence map. A 7×7 NMS with threshold 0.2 converts the map to a binary detection image.

# Assumptions

1. **Planar checkerboard target.** The method models corner points as $[m, n, z_0]$ with $m, n \in \mathbb{Z}$; it does not generalise to non-checkerboard patterns or non-planar targets. (Hard assumption; fails silently on ArUco or ring-grid targets.)
2. **Greyscale input.** The network takes a single-channel 15×15 patch. Colour images must be converted; no explicit colour model is trained. (Soft assumption; the radiometric part of the training pipeline uses intensity-only.)
3. **Sufficient patch context.** Corners within 7 pixels of the image border are excluded from evaluation ("border regions of the images of seven pixels wide do not participate in the experiments"). (Hard: border corners cannot be scored by the sliding window.)
4. **Checkerboard visible as square-wave intensity pattern.** The training procedure places black intensity in $[0, 0.3]$ and white intensity in $[0.7, 1.0]$. Very low-contrast targets (e.g., grayscale-printed boards) may fall outside this range.
5. **Integer-pixel output suffices or sub-pixel refinement is applied separately.** The network directly predicts peak positions; the paper rounds competitors' sub-pixel results for comparison, implying the primary output is integer-pixel. Sub-pixel accuracy requires a downstream refinement step not described in the paper.
6. **Pinhole camera model.** The synthetic pipeline uses $\text{Ph}(\mathbf{p}) = [x/z, y/z, 1]$ with no distortion in the image-formation model. The paper notes this is "only an approximation to the real imaging process" yet reports CDR = 1.0 on the GoPro dataset which has "slight lens distortion."

# Failure regime

- **CCDN collapses at all real datasets tested.** CDR = 0 on every real dataset (Mono, GoPro1200, GoPro800, GoPro400) and MERE = Infinity. The authors attribute this to labelling error in CCDN's training data. This is a comparison datapoint, not a failure of this method.
- **Moderate noise tolerance, but degrades.** MELE rises from 0.024 px at $\sigma_n = 0$ to 0.057 px at $\sigma_n = 8$ on the synthetic test set — a ~2.4× increase. CDR remains 1.0 throughout, so localisation accuracy degrades without detection failures.
- **Fixed receptive field (15×15).** Very small corners (e.g., distant, low-resolution boards) or very large corners (close-up, high-resolution) may be suboptimally handled; the patch size is fixed and chosen for a "resolution N = 360" training regime.
- **Integer-pixel output only (in this paper's formulation).** Competing detectors' sub-pixel results are rounded before comparison, so the MELE advantage (0.024 px vs. Matlab 0.044 px at $\sigma_n = 0$) reflects the network's learned sub-pixel localisation without explicit sub-pixel outputs — but this comparison is necessarily noisy.
- **Ha et al. CDR 0.9999 at $\sigma_n = 4$** is surprisingly close to this method's 1.0. At $\sigma_n = 8$, Ha et al.'s CDR drops to 0.7798 with 22 failed detections, while this method remains at CDR = 1.0, zero FD.

# Numerical sensitivity

- **Gaussian resampling kernel standard deviation:** $\sigma = w_p / 6$ where $w_p = 1/N$ and $N = 360$ for training. This means $\sigma \approx 4.6 \times 10^{-4}$ in normalised coordinates. The choice of $N/6$ is a design constant that determines how many analog samples fall within one Gaussian sigma.
- **Training noise range:** Gaussian blur $\sigma_b \in [0, 1.6]$ pixels, additive Gaussian noise $\sigma_n \in [0, 8]$ intensity units (on a [0, 255] or [0, 1] scale — the text states intensity normalised to [0, 1], and $\sigma_n$ values 0, 2, 4, 8 match the evaluation tables).
- **NMS threshold:** 0.2 (confidence). The text states "for every pixel with value greater than 0.2, we set it to 1.0." Too high a threshold would suppress valid corners; too low would increase false positives. No ablation is provided.
- **NMS window size:** 7×7 pixels. Sets the minimum resolvable inter-corner distance at 7 pixels.
- **Training schedule:** batch size 16, cosine-annealing learning rate from $1 \times 10^{-3}$ to $1 \times 10^{-6}$, warm restart period $1 \times 10^6$ batches, total $4 \times 10^6$ batches, Adam optimiser, L2 loss.
- **Training dataset size:** 2000 images (1800 train, 100 val, 100 test), ~160 corners each, all at $N = 360$ resolution.
- **Four balanced patch classes:** (a) centre is a corner, (b) centre is adjacent to a corner, (c) centre is on a border line, (d) centre is in a smooth region — 25% each.
- **Network parameters:** 64-channel conv + residual block, then FC(255) + FC(1) + sigmoid. Very small model; leaky ReLU slope = 0.1.

# Applicability

- **Use when:** High accuracy checkerboard corner detection is needed on images with moderate noise and blur; CDR = 1.0 is required even at moderate noise ($\sigma_n \leq 8$); training data annotation cost is a concern (synthetic data sidesteps it).
- **Don't use when:** Sub-pixel accuracy is required as a first-class output without additional downstream refinement; target patterns are not planar checkerboards; very high-resolution images where 15×15 patches may be too small relative to corner features; corners are within 7 pixels of the image border.
- **Compared against:** OpenCV (`goodFeaturesToTrack` + `cornerSubPix`), Matlab Camera Calibration Toolbox, Ha et al. (Deltille grids / monkey saddle), CCDN (Ben et al. 2018). Note: MATE (Donné et al., reference [8]) is cited in the introduction but is **not** included in the quantitative experiments — only CCDN ([9]) represents the deep-learning comparison. Geiger et al. ([3]) and ROCHADE ([4]) are cited in the introduction but also absent from the quantitative comparison tables.

# Connections

- Builds on: [harris1988-corner, geiger2012-automatic, placht2014-rochade, donne2016-mate, chen2023-ccdn, zhang2000-flexible]
- Enables: [] (no downstream citation in the atlas yet)
- Refutes / supersedes: [chen2023-ccdn] (CCDN CDR = 0 on all real datasets vs. this method's CDR = 1.0)

# Atlas update plan

**Atlas role: UPDATE-only (no new page warranted at this time).**

Electronics Letters is a 4-page rapid-communication format. The paper makes a genuinely useful contribution — the synthetic data generation pipeline and the clean five-layer architecture — but the contribution density is below the bar for a standalone model page. The architecture description occupies roughly half a column; there is no published code, no followup citation network, and the quantitative evaluation is limited (one synthetic dataset, two real datasets, four competitors, only two with CDR = 1.0). The method is also currently referenced by zero pages in `content/`. A stub model page would be misleading about its significance relative to CCDN and MATE, which are fuller contributions. Revisit if the paper accumulates citations or if its synthetic pipeline is reused by a later work that we ingest.

The appropriate Atlas action is two UPDATE bullets: one in the survey concept page (`chessboard-x-corner-detection`) to register this method in the survey, and one in each of the two deep-learning competitor pages (`ccdn-checkerboard-detector`, `mate-checkerboard-detector`) to note the comparison context.

## UPDATE: chessboard-x-corner-detection

Section: surveyed methods table / deep learning section
- Add Wu & Wan (2021) as a third deep-learning entry alongside MATE and CCDN.
- Key distinguishing point: the only method in the survey that uses **fully synthetic** training data (no manual labelling), enabling exact sub-pixel ground-truth corner coordinates.
- Architecture: 5-layer CNN (one 3×3 conv + one 3×3 residual block + FC(255) + FC(1) + sigmoid), input 15×15 greyscale patch, output scalar confidence; 7×7 NMS with threshold 0.2.
- Reported MELE on synthetic data: 0.024 px ($\sigma_n = 0$), 0.057 px ($\sigma_n = 8$); CDR = 1.0 on all tested noise levels and real datasets.
- CCDN CDR = 0 on all real datasets tested in this paper; Wu et al. attribute this to labelling noise in CCDN's training data.

## UPDATE: ccdn-checkerboard-detector

Section: Remarks
- Add bullet: Wu & Wan (2021) report that CCDN achieves CDR = 0 on Mono and all GoPro resolutions and MERE = Infinity on all real datasets, while achieving CDR = 0.75 at $\sigma_n = 0$ on synthetic data (vs. this paper's CDR = 1.0). The authors attribute the gap to labelling error in CCDN's real-image training data. Source: Tables 2–4, 6–7 of wu2021-highly.

## UPDATE: mate-checkerboard-detector

Section: Remarks
- Add bullet: Wu & Wan (2021) cite MATE (as reference [8] / Donné et al. 2017) as a representative deep-learning baseline but do **not** include it in their quantitative experiments. Only CCDN (reference [9]) is evaluated among deep-learning methods. The exclusion may reflect MATE's focus on adaptive template fitting vs. the pixel-patch classification approach used here. Source: Introduction and Experiments sections of wu2021-highly.

# Provenance

All citations below reference the .txt cache file line numbers from `docs/papers/.cache/wu2021-highly.txt`.

- **Eq. (1)** — exact image coordinates of a checkerboard corner: $c = \text{Ph}(\text{Rt}(c))$. Lines 35–36 and line 125.
- **Eq. (2)** — centre position of pixel (i, j) in image $I_3$: $[c_i, c_j]^T = [(i+0.5) \times w_p - 0.5,\; (j+0.5) \times w_p - 0.5]^T$. Lines 59–60.
- **Eq. (3)** — discrete pixel value as Gaussian-weighted sum over analog samples: $I_3(i,j) = \sum_{p \in A(i,j)} k(x_p - c_i, y_p - c_j) \times I_2(p) \;/\; \sum_{p \in A(i,j)} k(x_p - c_i, y_p - c_j)$. Lines 66–70.
- **Eq. (4)** — Gaussian kernel with $\sigma = w_p / 6$: $k(u,v) = \frac{1}{2\pi\sigma^2} e^{-\frac{u^2+v^2}{2\sigma^2}}$. Lines 77–79.
- **Eq. (5)** — full synthetic pipeline summary: $I_2 = \text{Ph}(\text{Rt}(I_0))$; $I = \text{Blur}(G_i(I_2)) + \text{Noise}$. Lines 125–127.
- **Network architecture** — "64-channel 3×3 convolutional layer, a 64-channel 3×3 residual block, two linear layers which have 255 and 1 nodes respectively, and a sigmoid layer. The leaky ReLU unit uses the slope of 0.1." Lines 135–138.
- **Input patch size** — 15×15 greyscale image. Lines 98–99, 103–104, 138–141.
- **Confidence map dimensions** — $(H-7) \times (W-7)$. Lines 141–143.
- **NMS window and threshold** — 7×7 NMS, threshold 0.2. Lines 146–148.
- **Training dataset** — 2000 images ($N = 360$), 1800/100/100 split, ~160 corners each. Lines 98–100.
- **Training schedule** — batch size 16, cosine-annealing LR from $1 \times 10^{-3}$ to $1 \times 10^{-6}$, warm restart period $1 \times 10^6$ batches, $4 \times 10^6$ total batches, Adam, L2 loss. Lines 108–111.
- **Four patch classes** — 25% each: corner centre, adjacent to corner, border line, smooth area. Lines 105–107.
- **Lighting simulation** — intensity uniform in $[0, 0.3]$ (black) and $[0.7, 1]$ (white). Lines 41–42 (image).
- **Blur/noise simulation** — Gaussian blur 5×5 window, $\sigma_b \in [0, 1.6]$; Gaussian noise $\sigma_n \in [0, 8]$. Lines 118–121.
- **Synthetic test set** — 100 images, 16,511 corner points. Lines 124–125.
- **$z_0 = 6$** — depth of analog checkerboard plane. Line 43 (image); also lines 44–45 in .txt ("Fixing $z_0 = 6$").
- **Sampling density** — "intervals of 0.001 in both x and y directions." Lines 43–45 (image).
- **CDR definition** — $N_1/N_0$ where $N_1$ detected within 3×3 neighbourhood. Lines 130–131.
- **MELE definition** — mean distance between $N_1$ detected corners and their ground truths. Lines 131–132.
- **Table 1** — MELE on synthetic data at $\sigma_n \in \{0,2,4,8\}$: Ours = 0.024, 0.029, 0.039, 0.057 px. Lines 152–165.
- **Table 2** — Results at $\sigma_n = 0$: Ours MELE = 0.024, CDR = 1, FP = 0, FD = 0. Lines 170–178.
- **Table 3** — Results at $\sigma_n = 4$: CCDN CDR = 0.0234, FP = 300, FD = 91. Lines 182–195.
- **Table 4** — Results at $\sigma_n = 8$: Ha et al. CDR = 0.7798, FD = 22; Ours CDR = 1, FP = 0, FD = 0. Lines 202–214.
- **Table 6** — MERE on real datasets: CCDN = Infinity on all; Ours = 0.4028 (Mono), 0.3983 (GoPro1200), 0.3806 (GoPro800), 0.3713 (GoPro400). Lines 169–176.
- **Table 7** — CDR on real datasets: CCDN = 0 on all; Ours = 1 on all. Lines 184–196.
- **Reference [8] = MATE** — "Donné, S., et al.: Mate: Machine learning for adaptive calibration template detection. Sensors 16, 1858 (2017)." Lines 243–245.
- **Reference [9] = CCDN** — "Ben, C., Cai, H.X., Zhang, Q.: CCDN: Checkerboard corner detection network for robust camera calibration. ICIRA 2018, pp. 324–334." Lines 245–249.
- **Reference [14] = Zhang calibration** — "Zhang, Z.Y.: A flexible new technique for camera calibration. IEEE Trans. PAMI 22(11), 1330–1334 (2000)." Lines 261–262.
- **GoPro resize** — "Using the Matlab function imresize, we resize GoPro to 1200×900, 800×600 and 400×300." Lines 146–148 (image).
- **Border exclusion** — "border regions of the images of seven pixels wide do not participate in the experiments." Lines 117–118.
- **MATE absent from experiments** — MATE cited as [8] in Introduction (line 50–53) and Implementation Details (line 93–94) as a method trained on real datasets; it does not appear in Tables 1–7.
