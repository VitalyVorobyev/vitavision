---
paper_id: viola2001-detector
title: "Rapid Object Detection using a Boosted Cascade of Simple Features"
authors: ["P. Viola", "M. Jones"]
year: 2001
url: https://www.cs.cmu.edu/~efros/courses/LBMV07/Papers/viola-cvpr-01.pdf
created: 2026-05-12
relevant_atlas_pages: [surf, orb, brief]
---

# Setting

Object detection in still images. Input: a single grayscale image of arbitrary size (paper demonstrates on 384 × 288 pixel images). Output: bounding rectangles localising all instances of a target object class (demonstrated: frontal, roughly upright human faces) together with a detection confidence sufficient to plot a ROC curve. No depth, no colour, no video differencing required. The method is a sliding-window classifier: a sub-window of fixed base resolution 24 × 24 pixels is scanned at multiple scales and locations; each position is classified as object or background.

# Core idea

Three orthogonal contributions compound to produce a very fast detector.

**1. Integral image.** A precomputed two-dimensional prefix sum allows any axis-aligned rectangular sum over the original image to be retrieved in exactly four array reads, regardless of rectangle size. This makes it practical to evaluate thousands of rectangle features per pixel position in constant time.

**2. AdaBoost feature selection.** Of the ~180,000 possible rectangle features defined over a 24 × 24 sub-window, AdaBoost iteratively selects the single feature with lowest weighted-error at each round and assigns it a log-odds coefficient. After $T$ rounds the result is a strong classifier — a weighted sign threshold over $T$ weak classifiers — that uses only a small fraction of the available features.

**3. Attentional cascade.** A sequence of increasingly complex strong classifiers is arranged so that each stage can quickly reject sub-windows that are clearly non-face. A sub-window passes to stage $k+1$ only if it is accepted by stage $k$. Because negative sub-windows vastly outnumber positives in any real image, the cascade amortises the cost of deep evaluation over the rare positive case. The first two-feature stage alone achieves ~100% detection rate at ~40% false-positive rate; only the small fraction of sub-windows that survive all 38 stages are reported as detections.

The combined system can process a 384 × 288 image in approximately 0.067 seconds on a 700 MHz Pentium III, running at roughly 15 fps.

# Assumptions

1. **Frontal, roughly upright pose (hard).** The classifier is trained on frontal faces aligned to a 24 × 24 pixel template. Profile or strongly rotated faces are not detected; the paper makes no claim of pose invariance.
2. **Grayscale input (hard).** The method works only with luminance. Colour information is not used (and the abstract explicitly notes this as a design constraint).
3. **Sufficient contrast / bounded illumination variation (soft).** Sub-windows are variance-normalised before training and during scanning; without this step, lighting extremes degrade performance. The normalisation itself assumes that the sub-window has non-zero variance.
4. **Fixed sub-window aspect ratio (hard).** Features are defined relative to the 24 × 24 grid; changing aspect ratio would require retraining.
5. **Hard-negative bootstrapping during training (soft).** Subsequent cascade layers are trained on false positives produced by earlier partial-cascade runs over 9,544 non-face images (~350 million sub-windows). Without bootstrapping, later layers cannot achieve their false-positive targets.
6. **Training set must be representative (soft).** 4,916 hand-labelled web-crawled faces are used; systematic bias in the crawl (age, ethnicity, lighting) will degrade detection for underrepresented groups.

# Failure regime

- **Non-frontal pose.** The sub-window classifier is trained on frontal faces only. Occlusion or lateral rotation beyond roughly ±30° degrades performance rapidly; the paper offers no evidence of robustness beyond upright frontal poses.
- **Flat or uniform-texture sub-windows.** Variance normalisation divides by the sub-window standard deviation. If a sub-window is near-uniform (e.g. a clear sky patch) the denominator approaches zero, making normalisation numerically unstable.
- **Very small faces (< 24 px).** Below the base resolution the detector cannot fire at all. Very small faces require a large number of scaling steps to be covered, at proportionally increased cost.
- **Dense-face scenes.** Overlapping detections are merged by averaging bounding-box corners of sub-windows that overlap. Heavy overlap (crowd scenes) can cause merges to drift or split.
- **Adversarial textures or glasses.** Rectangle features are coarse and aligned; thin-framed spectacles or strong horizontal brow textures can push the first few feature responses in unexpected directions, causing early cascade rejection of true faces.

# Numerical sensitivity

- **Variance normalisation.** The paper normalises pixel values in each sub-window by the standard deviation: $\sigma = \sqrt{\mu_2 - \mu^2}$, where $\mu_2$ is the mean of squared pixel values and $\mu$ is the mean. Both $\mu$ and $\mu_2$ are computed with integral images (requiring a second integral image over squared pixels). Division by $\sigma$ is unstable when $\sigma \approx 0$; in practice, sub-windows with near-zero variance are safe to reject as non-face.
- **Integral image overflow.** The prefix sum accumulates over all pixels above-left. For a 384 × 288 8-bit image the maximum pixel sum is $384 \times 288 \times 255 \approx 28 \times 10^6$, comfortably within a 32-bit integer. For large high-bit-depth images, 64-bit accumulators may be needed.
- **Scale-step choice.** Results in the paper use a scale factor of 1.25 between successive detector sizes. A step of 1.5 is also tested and described as yielding "significant speedup with only a slight decrease in accuracy" (Section 5, "Scanning the Detector").
- **Location-shift step.** The sub-window is shifted by $\lfloor s \cdot p \rfloor$ pixels at scale $s$, where $p$ is a step parameter. The paper evaluates at $p = 1.0$; larger $p$ trades recall for speed.

# Applicability

- **Use when:** a high-throughput, low-latency frontal-face (or similarly constrained single-class) detector is needed on grayscale images, with no GPU and limited compute (embedded CPU, FPGA). Still useful as a lightweight first-pass rejection stage feeding a deeper model.
- **Don't use when:** multi-class detection, non-frontal or occluded objects, colour-critical applications, or when training data for the target class is unavailable at scale.
- **Compared against (paper's own evaluation):** Rowley-Baluja-Kanade neural-network detector, Schneiderman-Kanade statistical method, Roth-Yang-Ahuja Winnow-based detector — all on the MIT+CMU frontal face test set (Table 2).

# Connections

- **Builds on:** integral image / summed-area table concept from Crow 1984 [3]; Papageorgiou et al. Haar-feature object detector [10]; Freund & Schapire AdaBoost [6]; Tieu & Viola feature-selection via boosting [2].
- **Enables:** SURF (Bay et al.) reuses integral images for fast Hessian-determinant approximation; ORB uses integral images for patch-moment computation; BRIEF uses box-filter Gaussian approximations that benefit from integral-image efficiency.
- **Refutes / supersedes:** n/a (this is a founding method; not a supersession paper).

# Atlas update plan

## NEW: viola-jones-detector
Type: algorithm
Category: classification-detection
Primary source: viola2001-detector
Relations: none — integral-image reuse captured via sources.references on target pages

**Goal**
- Detect frontal, upright instances of a trained object class (demonstrated: faces) in grayscale images rapidly enough for real-time use on conventional CPUs.
- Output is a set of bounding rectangles; performance measured by detection-rate / false-positive-rate trade-off (ROC curve) on the MIT+CMU frontal face test set (130 images, 507 labelled faces, 75,081,800 sub-windows).

**Algorithm**
- Three interlocking components: integral image, AdaBoost feature selection, attentional cascade.
- **Integral image:** $ii(x,y) = \sum_{x' \le x,\, y' \le y} i(x', y')$, computed in one pass using the recurrences $s(x,y) = s(x,y-1) + i(x,y)$ and $ii(x,y) = ii(x-1,y) + s(x,y)$ (Section 2.1, Eq. 1–2). Any rectangular sum is recovered in four array reads.
- **Rectangle features:** three kinds — two-rectangle (difference of two adjacent same-size rectangles), three-rectangle (two outer minus centre), four-rectangle (difference of diagonal pairs). Base sub-window is 24 × 24 pixels; total rectangle features over this window: >180,000 (Section 2, paragraph 3).
- **AdaBoost weak classifier:** for feature $f_j$, threshold $\theta_j$, and parity $p_j \in \{-1,+1\}$: $h_j(x) = 1$ if $p_j f_j(x) < p_j \theta_j$, else $0$ (Section 3, Table 1).
- **AdaBoost strong classifier:** $H(x) = \text{sign}\!\left(\sum_{t=1}^{T} \alpha_t h_t(x) - \frac{1}{2}\sum_{t=1}^T \alpha_t\right)$, where $\alpha_t = \log(1/\beta_t)$ and $\beta_t = \epsilon_t / (1 - \epsilon_t)$ (Section 3, Table 1).
- **Cascade:** stages are added greedily; each stage is a strong classifier targeting a per-stage minimum detection rate $d_i$ and maximum false-positive rate $f_i$. Overall rates satisfy $D = \prod_i d_i$ and $F = \prod_i f_i$ (Section 4). First two-feature stage: ~100% detection rate, ~40% false-positive rate (Section 4, paragraph after Figure 3).
- Final cascade: 38 layers, 6,061 features total; layers 1–5 contain 1, 10, 25, 25, 50 features respectively (Section 5).

**Implementation**
- Two integral images required during scanning: one over pixel values (for feature evaluation and mean normalisation) and one over squared pixel values (for variance normalisation).
- Variance normalisation: each sub-window is divided by its standard deviation $\sigma = \sqrt{\mu_2 - \mu^2}$ before feature evaluation; equivalent result achieved by post-multiplying feature values rather than pre-multiplying pixels (Section 5, "Image Processing").
- Scale achieved by scaling the detector (feature coordinates), not the image; scales spaced by a factor of 1.25 used in the reported results; step size $p = 1.0$ for full-density scanning, $p = 1.5$ for speedup.
- Multiple overlapping detections are merged by partitioning into overlapping groups and averaging bounding-box corners (Section 5, "Integration of Multiple Detections").
- Speed: 0.067 s per 384 × 288 image on 700 MHz Pentium III (≈15 fps); average 10 feature evaluations per sub-window out of 6,061 (Section 5, "Speed of the Final Detector").

**Remarks**
- The cascade's power comes from fast rejection: on a hard 507-face test set, only ~10 features are evaluated per sub-window on average (Section 5). The asymmetry between cheap early rejection and expensive late verification is the core engineering insight.
- Training requires bootstrapping: false positives from earlier cascade layers are collected as hard negatives for subsequent layers. Without this the later layers cannot meet their false-positive targets.
- The first two features selected by AdaBoost are visually interpretable: (1) the eye region is darker than the upper cheeks; (2) the eyes are darker than the bridge of the nose (Section 3.2, Figure 3).
- Single voting ensemble (three independently trained 38-layer detectors, majority vote) improves detection rate slightly at matched false positives (Table 2).
- Performance on MIT+CMU set (single detector): 76.1% at 10 false detections; 91.4% at 50; 93.9% at 167 false detections (Table 2).

**References**
- P. Viola, M. Jones. "Rapid Object Detection using a Boosted Cascade of Simple Features." CVPR 2001.

## UPDATE: surf
Section: sources.references
Bullets: add `viola2001-detector` to credit the integral-image primitive (used in SURF for Hessian-determinant computation over box-filter approximations at multiple scales).

## UPDATE: orb
Section: sources.references
Bullets: add `viola2001-detector` to credit the integral-image primitive (used in ORB for fast patch-moment integration when computing centroid-based orientation).

## UPDATE: brief
Section: sources.references
Bullets: add `viola2001-detector` to credit the integral-image primitive (used in BRIEF for box-filter Gaussian approximation during patch smoothing prior to binary test comparisons).

# Provenance

All citations are to the CVPR 2001 conference version as rendered in the pdftotext cache.

1. **384 × 288 image resolution, 15 fps, 700 MHz Pentium III** — Abstract, lines 13–15; confirmed Section 5 "Speed of the Final Detector": "the face detector can process a 384 by 288 pixel image in about .067 seconds … on a 700 Mhz Pentium III processor."
2. **>180,000 rectangle features over 24×24 sub-window** — Section 2, paragraph 3: "Given that the base resolution of the detector is 24x24, the exhaustive set of rectangle features is quite large, over 180,000."
3. **Training set: 4,916 hand-labelled faces** — Section 5, paragraph 1: "The face training set consisted of 4916 hand labeled faces scaled and aligned to a base resolution of 24 by 24 pixels."
4. **First cascade stage: ~100% detection, ~40% false-positive rate** — Section 4, paragraph beginning "For example an excellent first stage classifier…": "the threshold can be adjusted to detect 100% of the faces with a false positive rate of 40%."
5. **Final cascade: 38 layers, 6,061 features** — Section 5, paragraph 2: "The total number of features in all layers is 6061." Section 4.2: "The complete face detection cascade has 38 stages with over 6000 features." Section 5 paragraph 1: "A 38 layer cascaded classifier was trained."
6. **Layer feature counts (1, 10, 25, 25, 50)** — Section 5, paragraph 2: "The number of features in the first five layers of the detector is 1, 10, 25, 25 and 50 features respectively."
7. **Average 10 feature evaluations per sub-window, 75,081,800 total sub-windows** — Section 5 "Speed of the Final Detector": "an average of 10 features out of a total of 6061 are evaluated per sub-window … 75,081,800 sub-windows scanned."
8. **MIT+CMU test set: 130 images, 507 faces** — Section 5 "Experiments on a Real-World Test Set": "130 images with 507 labeled frontal faces."
9. **Detection rate table** — Table 2: detection rates at 10, 31, 50, 65, 78, 95, 167 false detections. Single detector: 76.1%, 88.4%, 91.4%, 92.0%, 92.1%, 92.9%, 93.9%.
10. **Integral image definition and recurrences (Eq. 1–2)** — Section 2.1: text surrounding Equations 1 and 2 (pdftotext rendering, lines 156–176). "$ii(x,y)$ … contains the sum of the pixels above and to the left"; recurrences $s(x,y) = s(x,y-1) + i(x,y)$ and $ii(x,y) = ii(x-1,y) + s(x,y)$.
11. **Four array references for rectangular sum** — Section 2.1, Figure 2 caption: "The sum of the pixels within rectangle can be computed with four array references."
12. **Weak classifier form** — Section 3, Table 1: $h_j(x) = 1$ if $p_j f_j(x) < p_j \theta_j$ else $0$.
13. **Strong classifier form** — Section 3, Table 1: sign-and-threshold combining $\alpha_t h_t(x)$ terms.
14. **Cascade rate equations $D = \prod_i d_i$, $F = \prod_i f_i$** — Section 4 (implied by the per-stage multiplicative structure described in Section 4.1; explicit product form stated in Section 4 discussion of overall detection and false-positive rate).
15. **Variance normalisation via squared integral image** — Section 5 "Image Processing": "The sum of squared pixels is computed using an integral image of the image squared (i.e. two integral images are used in the scanning process)."
16. **Scale step 1.25, location step $p$** — Section 5 "Scanning the Detector": "Good results were obtained using a set of scales a factor of 1.25 apart"; step parameter discussion with $p = 1.0$ vs $p = 1.5$.
17. **Two-feature classifier, ~60 microprocessor instructions** — Section 4: "Computation of the two feature classifier amounts to about 60 microprocessor instructions."
18. **First two AdaBoost features described** — Section 3.2, Figure 3 caption: first feature = eye-region darker than upper cheeks; second feature = eye regions darker than bridge of nose.
19. **Non-face training: 9,544 images, ~350 million sub-windows** — Section 5, paragraph 3: "The non-face subwindows used to train the detector come from 9544 images … There are about 350 million subwindows within these non-face images."
20. **15× faster than Rowley-Baluja-Kanade** — Section 5 "Speed of the Final Detector": "This is roughly 15 times faster than the Rowley-Baluja-Kanade detector."
