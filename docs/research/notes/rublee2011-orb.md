---
paper_id: rublee2011-orb
title: "ORB: An efficient alternative to SIFT or SURF"
authors: ["E. Rublee", "V. Rabaud", "K. Konolige", "G. Bradski"]
year: 2011
url: https://doi.org/10.1109/ICCV.2011.6126544
created: 2026-05-09
relevant_atlas_pages: [fast-corner-detector, brief, harris-corner-detector, sift, surf, superpoint, xfeat]
---

# Setting

Binary feature detection and description for real-time image matching. Input: a greyscale image at a target resolution (benchmarked at 640×480). Output: a set of oriented keypoints (oFAST) and corresponding 256-bit binary descriptors (rBRIEF), ready for Hamming-distance nearest-neighbour matching. No calibration or depth information required. Designed for CPU-only real-time operation on commodity hardware and mobile ARM processors.

# Core idea

ORB = oFAST (detector) + rBRIEF (descriptor). **oFAST**: detect FAST-9 keypoint candidates, rank them by Harris cornerness response, keep the top-N, then assign an orientation via the intensity centroid (IC) of a circular patch of radius r equal to the patch size. The IC orientation θ = atan2(m₀₁, m₁₀) from the first-order image moments (Eq. 3) is discretized to 2π/30 increments (12° step), enabling a precomputed lookup table for rotating the binary test pattern. **rBRIEF**: take the BRIEF binary test on a 31×31 pixel patch (each test comparing the mean intensity of two 5×5 sub-windows from an integral image), steer it using the keypoint's oFAST orientation, then replace the naive steered test table with a learned set of 256 tests that maximizes variance and minimizes pairwise correlation. The learning uses a greedy search over M = 205,590 candidate test pairs drawn from the PASCAL 2006 training set of ~300k keypoints. The resulting 256-bit descriptor is matched via Hamming distance using SSE 4.2 popcount; large-scale retrieval uses multi-probe LSH with a sub-signature-of-bits hash.

# Assumptions

1. Textured scenes: ORB keypoints are corner-like (FAST response); blob-detection scenes (graffiti, monochromatic regions) favour SIFT's scale-space blob detector.
2. In-plane rotation is the dominant viewpoint change; the intensity-centroid orientation is a scalar angle and cannot model 3-D tilt independently.
3. Scale is handled via a discrete image pyramid (5 levels, √2 scale factor); there is no continuous per-keypoint scale estimate from depth or Laplacian.
4. Hard: the 31×31 patch must lie within the image boundary (border handling required at image edges).
5. Soft: Gaussian image noise degrades Harris ranking and IC orientation, but the IC method is more robust than gradient histograms at high noise (Figure 2 of the paper).
6. The learned rBRIEF test table is fixed; if the deployment domain differs drastically from PASCAL 2006, variance/correlation properties may not hold.

# Failure regime

- Graffiti-style monochromatic regions: ORB inlier rate drops relative to SIFT because blob-detection keypoints (SIFT/SURF) localise better on low-texture gradient blobs than FAST corner responses.
- Near-edge keypoints: FAST produces large responses along edges; the Harris filter mitigates but does not eliminate this — at very low threshold settings, edge-adjacent false corners appear.
- Large-scale change beyond the pyramid range: 5 levels at √2 ≈ 4× total range; scenes with extreme zoom (>4× between views) miss keypoint correspondence.
- Repeated texture: Hamming-distance NN matching with LSH is still susceptible to descriptor ambiguity in scenes with periodic texture; RANSAC or PROSAC is required downstream.
- Intensity-centroid instability: when |C| → 0 (flat-intensity patch), the orientation estimate is undefined. The paper notes this is rare with FAST corners in practice.

# Numerical sensitivity

- Patch size wp = 31 pixels and sub-window size wt = 5 pixels are fixed; the N = (wp − wt)² = 676 possible sub-windows, yielding M = 205,590 test pairs after excluding overlapping pairs.
- The greedy correlation threshold is adaptive: raised and retried if 256 uncorrelated tests cannot be found.
- Orientation discretization to 2π/30 (12°) is coarser than SIFT's histogram bin width; finer discretization would increase table size without measurable gain (empirically chosen).
- FAST-9 threshold is a free parameter; the paper sets it low enough to obtain at least N candidate keypoints, then Harris-ranks to keep N.
- Pyramid scale factor √2 and 5 levels: changing either requires re-training the rBRIEF test table if the goal is matched variance statistics.
- 256-bit descriptor: shorter descriptors reduce storage and matching cost but increase false-match rate; longer descriptors may improve recall but the paper does not evaluate beyond 256 bits.

# Applicability

- Use when: real-time local feature matching on CPU without GPU; mobile or embedded platforms; SLAM / visual odometry pipelines; BSD-licensed deployments (SIFT and SURF were patent-restricted at publication time).
- Don't use when: strong affine or perspective distortion (ORB's planar patch orientation does not model full affine tilt); blob-only scenes; tasks requiring sub-pixel scale precision.
- Compared against: SIFT (two orders of magnitude slower, comparable inlier rate on textured scenes, better on graffiti), SURF (~15× slower, comparable or lower inlier rate), BRIEF+FAST (no rotation invariance, falls off sharply beyond ~10°).

# Connections

- Builds on: [rosten2006-fast, calonder2010-brief, harris1988] — FAST-9 detector, BRIEF binary tests, Harris cornerness ranking
- Enables: downstream SLAM/SfM pipelines, object recognition with PROSAC+EPnP pose estimation (§6.2), real-time phone tracking (§6.3)
- Refutes / supersedes: plain BRIEF (rotation-sensitive; ORB directly replaces it as the descriptor in the same pipeline)

# Atlas update plan

## NEW: orb
Type: algorithm
Category: local-features
Primary source: rublee2011-orb

**Goal**
- Detect rotation-invariant oriented keypoints (oFAST) and compute 256-bit binary descriptors (rBRIEF) for real-time local feature matching on CPU.
- Input: greyscale image. Output: list of (x, y, θ, scale-level) keypoints with 256-bit descriptors. Matched by Hamming distance.
- Designed for SLAM, visual odometry, object detection, and patch tracking; handles in-plane rotation and modest scale change.
- BSD-licensed at release (2011); reference implementation in OpenCV 2.3+.

**Algorithm**
- oFAST: run FAST-9 at each of 5 pyramid levels (scale factor √2); rank candidates by Harris cornerness; keep top-N per level. Assign orientation θ = atan2(m₀₁, m₁₀) from the intensity centroid of a circular patch of radius r equal to the 31-pixel patch half-width (Eq. 3).
- rBRIEF: smooth patch via integral image; each binary test compares mean intensity of two 5×5 sub-windows within the 31×31 patch. Steer the test set Sθ = Rθ S using the discretized orientation (lookup table at 2π/30 resolution, 30 bins). Use the learned 256-test table rather than random BRIEF to maximise variance and minimise pairwise correlation.
- Greedy learning (§4.3): evaluate M = 205,590 candidate test pairs on ~300k keypoints from PASCAL 2006; greedily select 256 tests with mean near 0.5 and absolute pairwise correlation below threshold.
- Matching: Hamming distance via bitwise XOR + SSE 4.2 popcount; large-scale retrieval via multi-probe LSH (sub-signature-of-bits hash, 16-bit sub-signature, 4–20 hash tables).

**Implementation**
- Benchmark: 640×480, Intel i7 2.8 GHz, single thread — Pyramid: 4.43 ms, oFAST: 8.68 ms, rBRIEF: 2.12 ms, total ≈ 15.3 ms (Table, §6.1).
- Same dataset, ~1000 features: ORB 15.3 ms, SURF 217.3 ms, SIFT 5228.7 ms (§6.1).
- Cellphone (1 GHz ARM, 512 MB RAM, ~400 points): ORB 66.6 ms, Matching 72.8 ms, H-fit 20.9 ms → ~7 Hz at 640×480 (§6.3).
- Integral image smoothing replaces per-pixel Gaussian; area-based interpolation for pyramid decimation.
- Scale factor √2 and 5 levels; FAST-9 threshold set adaptively to yield at least N candidates.

**Remarks**
- rBRIEF recovers the variance lost by naively steering BRIEF (steered BRIEF eigenvalue spectrum collapses — Fig. 4); the learned 256 tests show better diversity and lower pairwise correlation (Fig. 6).
- ORB outperforms SIFT and SURF on the outdoor Boat dataset (45.8% vs 28.6% vs 30.2% inlier rate — Table, §4.4); comparable on indoor Magazines.
- BRIEF degrades steeply beyond ~10° in-plane rotation (Fig. 7); ORB maintains >70% inliers at all rotation angles under Gaussian noise = 10.
- Patent-free at time of publication; SIFT (Lowe) and SURF (Bay et al.) were patent-restricted.
- Scale invariance is acknowledged as incomplete (§7); future work includes per-keypoint scale from depth cues and GPU/SSE optimisation.

**References**
- Rublee et al. 2011 (rublee2011-orb), Calonder et al. 2010 (calonder2010-brief), Rosten & Drummond 2006 (rosten2006-fast), Harris & Stephens 1988.

**Relations (to author on the respective pages — not on the ORB page itself)**
- brief: `{ type: extended_by, target: orb, confidence: high }` — rBRIEF extends BRIEF with orientation steering and learned uncorrelated tests.
- fast-corner-detector: `{ type: feeds_into, target: orb, confidence: high }` — FAST-9 is the primary keypoint detector in oFAST.
- harris-corner-detector: `{ type: feeds_into, target: orb, confidence: medium, caution: "Used only as a corner-strength filter to rank FAST keypoints, not as a detector." }`
- sift: `{ type: compared_with, target: orb, confidence: high }` — symmetric; mirrors onto ORB.
- surf: `{ type: compared_with, target: orb, confidence: high }` — symmetric; mirrors onto ORB.
- superpoint: `{ type: learned_alternative_of, target: orb, confidence: high }` — SuperPoint is the canonical learned replacement.
- xfeat: `{ type: learned_alternative_of, target: orb, confidence: high }` — XFeat targets ORB-class deployment budgets.

Quality: omit (ORB remains a live default in many SLAM/SfM pipelines).

---

## UPDATE: brief
Section: Remarks (and Relations)

- Add Relations entry: `{ type: extended_by, target: orb, confidence: high, caution: "rBRIEF steers BRIEF via a 30-bin orientation LUT and replaces the random test table with 256 learned, low-correlation tests selected on PASCAL 2006." }`
- In Remarks: ORB rotates the BRIEF test set Sθ = Rθ S using the keypoint orientation discretized to 12° increments (2π/30 lookup table), then replaces the Gaussian-random offset table with 256 tests learned by greedy search over ~205,590 candidates on ~300k PASCAL 2006 keypoints; this recovers the variance that naive steering destroys (Fig. 4 of Rublee et al. 2011).
- Note: the 31×31 patch and 5×5 sub-window sizes in ORB differ from BRIEF's 48×48 patch; the two are not bit-for-bit compatible.

---

## UPDATE: fast-corner-detector
Section: Remarks (and Relations)

- Add Relations entry: `{ type: feeds_into, target: orb, confidence: high }`
- In Remarks: oFAST = FAST-9 + Harris cornerness ranking + intensity-centroid orientation (IC); this is the canonical consumer of FAST in binary-descriptor pipelines. The Harris response orders FAST candidates and selects top-N; the IC assigns a scalar orientation θ = atan2(m₀₁, m₁₀) to each kept keypoint, enabling rotation-invariant description.
- ORB runs FAST-9 at 5 pyramid levels (√2 scale factor) with adaptive threshold to yield at least N candidates per level.

---

## UPDATE: harris-corner-detector
Section: Remarks (and Relations)

- Add Relations entry: `{ type: feeds_into, target: orb, confidence: medium, caution: "Used only as a corner-strength filter to rank FAST keypoints, not as a detector." }`
- In Remarks: ORB uses the Harris cornerness response to rank FAST keypoints and select the top-N per pyramid level; Harris is not used as a stand-alone detector. This two-stage approach (FAST speed + Harris quality) avoids the quadratic per-pixel cost of the full Harris detector while retaining its edge-rejection properties.

---

## UPDATE: sift
Section: Remarks (and Relations)

- Add Relations entry: `{ type: compared_with, target: orb, confidence: high }`
- In Remarks: ORB is approximately two orders of magnitude faster than SIFT on the same 640×480 Pascal frames (15.3 ms vs 5228.7 ms, §6.1 of Rublee et al. 2011). Inlier rates are comparable on textured scenes; SIFT's blob detector has an advantage on graffiti-style monochromatic regions where FAST corner responses are sparse. ORB was BSD-licensed at publication; SIFT was patent-restricted at the time.

---

## UPDATE: surf
Section: Remarks (and Relations)

- Add Relations entry: `{ type: compared_with, target: orb, confidence: high }`
- In Remarks: ORB is approximately 14× faster than SURF on the same 640×480 Pascal frames (15.3 ms vs 217.3 ms, §6.1 of Rublee et al. 2011). Inlier rates are comparable or favour ORB on outdoor scenes (Boat: 45.8% ORB vs 28.6% SURF, §4.4). SURF was also patent-restricted at the time; ORB's BSD license made it the practical real-time alternative.

---

## UPDATE: superpoint
Section: Remarks (and Relations)

- Add Relations entry: `{ type: learned_alternative_of, target: orb, confidence: high }` (author on the SuperPoint page)
- In Remarks: ORB is the canonical classical FAST-detector + binary-descriptor bundle that SuperPoint replaces; SuperPoint learns a joint detector-descriptor in a single homography-adapted self-supervised network, whereas ORB combines hand-crafted detection (oFAST), orientation (IC), and description (rBRIEF) stages.

---

## UPDATE: xfeat
Section: Remarks (and Relations)

- Add Relations entry: `{ type: learned_alternative_of, target: orb, confidence: high }` (author on the XFeat page)
- In Remarks: XFeat explicitly targets ORB-class deployment budgets — mobile, real-time, low-power — with a lightweight learned descriptor that replaces the hand-crafted rBRIEF binary string with a compact float descriptor; it is a direct learned alternative for pipelines that currently use ORB.

---

# Provenance

**§3.1 (oFAST — FAST Detector, p. 2)**
- FAST-9: "We use FAST-9 (circular radius of 9)."
- Harris ranking: "We employ a Harris corner measure [11] to order the FAST keypoints."
- Multi-scale: "We employ a scale pyramid of the image, and produce FAST features (filtered by Harris) at each level in the pyramid."

**§3.2 (Orientation by Intensity Centroid, p. 2–3)**
- Eq. 1: moment definition m_pq = Σ_{x,y} x^p y^q I(x,y).
- Eq. 2: centroid C = (m₁₀/m₀₀, m₀₁/m₀₀).
- Eq. 3: θ = atan2(m₀₁, m₁₀).
- Patch radius r = patch size (31 pixels), so x, y ∈ [−r, r].

**§4 intro / §4.1 (BRIEF overview, p. 3)**
- Eq. 4: τ(p; x, y) = 1 if p(x) < p(y), else 0.
- Eq. 5: fn(p) = Σ_{1≤i≤n} 2^{i-1} τ(p; xᵢ, yᵢ).
- Descriptor length n = 256 bits.
- Smoothing via integral image; each test point is a 5×5 sub-window of a 31×31 pixel patch.

**§4.1 (Steered BRIEF, p. 3–4)**
- Eq. 6 (steered operator): g_n(p, θ) = f_n(p) | (xᵢ, yᵢ) ∈ Sθ, where Sθ = Rθ S.
- Angle discretized to 2π/30 (12°) increments; lookup table of precomputed BRIEF patterns.

**§4.3 (Learning Good Binary Features, p. 4–5)**
- Training set: ~300k keypoints from PASCAL 2006 [8].
- Patch: 31×31 pixels; sub-window: 5×5.
- N = (wp − wt)² = (31 − 5)² = 676 possible sub-windows.
- M = 205,590 valid (non-overlapping) test pairs.
- Greedy search selects 256 tests maximising variance and minimising pairwise correlation.

**§6.1 (Benchmarks, p. 6)**
- Frame size: 640×480; processor: Intel i7 2.8 GHz; single thread.
- Pyramid: 4.43 ms; oFAST: 8.68 ms; rBRIEF: 2.12 ms.
- Detector comparison table: ORB 15.3 ms, SURF 217.3 ms, SIFT 5228.7 ms (24 images, ~1000 features, same scales).
- Pyramid: 5 levels, scale factor √2; area-based interpolation.

**§4.4 (Evaluation table, p. 5)**
- Magazines: ORB 36.180% inliers / 548.50 points; SURF 38.305% / 513.55; SIFT 34.010% / 584.15.
- Boat: ORB 45.8% / 789; SURF 28.6% / 795; SIFT 30.2% / 714.

**§6.3 (Embedded real-time feature tracking, p. 7)**
- Cellphone: 1 GHz ARM, 512 MB RAM; ~400 points per image; 640×480 at ~7 Hz.
- ORB 66.6 ms, Matching 72.8 ms, H-fit 20.9 ms.

**§5.1–5.3 (LSH matching, p. 6)**
- Multi-probe LSH; sub-signature of bits (16-bit sub-signature); SSE 4.2 popcount.
- 4–20 hash tables for rBRIEF; compared against 1–3 kd-trees for SIFT (FLANN).

**§7 (Conclusion, p. 7)**
- BSD-licensed implementation contributed to OpenCV 2.3.
- Scale invariance acknowledged as incomplete; future work: per-keypoint scale from depth, GPU/SSE optimisation.
