---
paper_id: rosten2006-fast
title: "Machine Learning for High-Speed Corner Detection"
authors: ["E. Rosten", "T. Drummond"]
year: 2006
url: https://www.edwardrosten.com/work/rosten_2006_machine.pdf
created: 2026-05-01
relevant_atlas_pages: [fast-corner-detector, chess-corners, laureano-topological-chessboard, harris-corner-detector]
---

# Setting

**Problem class.** Real-time corner detection for tracking, SLAM, augmented-reality label placement, and other vision pipelines where the frontend must consume a small fraction of a frame budget. The paper has two distinct contributions, separable for note-keeping purposes:

1. **Machine-learned decision-tree variant** of the FAST segment-test detector (§2.2). The original FAST detector (Rosten-Drummond 2005, references [2,3] of this paper) was a hand-written cardinal-point + full-segment-test for $n = 12$; this paper trains a decision tree via ID3 to generalise the high-speed pixel-ordering heuristic to arbitrary $n$, including the empirically best $n = 9$.
2. **Repeatability evaluation** on 3D scenes (§3, §4). Extends Schmid's planar-scene criterion to 3D using a hand-aligned surface model. Compares FAST-9, FAST-12, Harris, Shi-Tomasi, DoG, Harris-Laplace, SUSAN, and a random baseline.

The atlas's `fast-corner-detector` page covers the segment-test mechanism (§2.1) and the score-based NMS (§2.3). The decision-tree training (§2.2) is currently flagged as out-of-scope in the page's `sources.notes`. The repeatability findings (§4) are partially reflected in the page's Remarks.

**Inputs.** Grayscale image $I$ on integer pixel domain. Segment-test parameters: ring radius (Bresenham circle of radius 3 producing 16 sample points), threshold $t$ in pixel intensity units, segment length $n$ (typically 9 or 12). Decision-tree variant additionally requires a labelled training set — corners detected on training images by the slow segment-test reference implementation.

**Outputs.** Integer pixel locations of corner candidates passing the segment-test criterion; per-corner score $V$ (eq 8) for non-maximum suppression; final corner set after NMS over $3 \times 3$ neighbourhood.

**Guarantees.** No mathematical guarantee on the corner set — the segment-test criterion is heuristic. The decision tree is "not precisely the same as the segment test detector" because training data has incomplete coverage of all possible 16-pixel ring patterns; the paper acknowledges this and states the tree "very slightly different heuristic to the segment test detector" (§2.2 closing paragraph).

# Core idea

The original FAST classifies a pixel $p$ as a corner if there exist $n$ contiguous samples on the 16-pixel Bresenham ring around it that are all brighter than $I(p) + t$ or all darker than $I(p) - t$. The $n = 12$ choice admits a cheap **high-speed early-rejection test**: examine only the four cardinal points (ring indices 1, 5, 9, 13); if fewer than 3 of them are all-brighter or all-darker, $p$ cannot be a corner under the $n = 12$ criterion (because any 12-arc on a 16-cycle must contain at least 3 of the 4 cardinals).

This paper observes four weaknesses of the hand-written cardinal-point detector (§2.1, verbatim list):

1. The high-speed test does not generalise well for $n < 12$.
2. The choice and ordering of the fast test pixels contains implicit assumptions about the distribution of feature appearance.
3. Knowledge from the first 4 tests is discarded.
4. Multiple features are detected adjacent to one another.

The first three are addressed by training a decision tree on the ternary $\{d, s, b\}$ classification of each ring sample relative to the centre. Each pixel $x \in \{1, \ldots, 16\}$ partitions training pixels $P$ into $P_d, P_s, P_b$. ID3 picks the $x$ that maximises information gain about the corner label $K_p$ (eq 6, 7), then recurses on each subset. The tree compiles to nested if-then-else C code via the standard ID3-to-code translation. The compiled tree asks **2.26 questions per pixel** on average for $n = 9$ (vs 2.8 for the hand-written variant), which makes FAST-9 — the empirically most-repeatable FAST family member — practical at full frame rate. The fourth weakness is addressed by NMS on the score $V$ (§2.3, eq 8):

$$V = \max\!\left(\sum_{x \in S_{\mathrm{bright}}} \lvert I_x - I(p) \rvert - t,\quad \sum_{x \in S_{\mathrm{dark}}} \lvert I(p) - I_x \rvert - t\right)\quad (\text{eq 8}).$$

Empirical claim of the paper: FAST-9 outperforms Harris, Shi-Tomasi, DoG, Harris-Laplace, and SUSAN in repeatability on the box and maze datasets at >200 corners/frame (Figure 6B, C). Under additive Gaussian noise, FAST repeatability degrades sharply; DoG dominates the noisy regime (Figure 6D, §4 conclusions).

# Assumptions

1. (hard) Image noise is moderate. The detector's binary segment criterion does not average noise the way a Gaussian-windowed gradient detector does; high noise produces both false positives and false negatives. The paper explicitly identifies this as a disadvantage in §5.
2. (hard) Features are at the scale of the 16-pixel ring (radius 3 px). The detector has no scale-space adaptation; corners blurred over more than a few pixels are missed and corners thinner than a few pixels can produce 1-pixel-wide line responses (§5, second disadvantage).
3. (soft) Threshold $t$ is appropriately chosen for the image's contrast range. There is no implicit normalization; $t$ is in raw intensity units and must be tuned per-image or per-camera-gain.
4. (hard) For the decision-tree variant: training data covers the corner appearance distribution in the deployment domain. The paper trains on application-specific imagery (real-time tracking, AR) and notes that a tree trained on different imagery will generalise less well.
5. (soft) The ring-radius-3 / 16-sample discretisation is approximately rotation-invariant. The paper does not claim strict rotation invariance; the discrete circle breaks symmetry, and the detector responds differently to identical features at different sub-pixel orientations.

# Failure regime

- **High noise.** The detector's repeatability degrades sharply as additive Gaussian noise increases (Figure 6D). For $\sigma > 30$ on 8-bit images, DoG dominates; FAST drops to baseline. Smoothing the image before FAST partially mitigates but defeats the speed advantage and is not used in standard implementations.
- **One-pixel-wide lines at quantised angles.** Direct quote, §5: "It can respond to 1 pixel wide lines at certain angles, when the quantisation of the circle misses the line." A vertical or horizontal one-pixel line missed by the Bresenham ring at a particular angle can pass the segment test even though geometrically it is an edge, not a corner.
- **Blurred corners.** The 16-pixel ring at radius 3 has no scale adaptation. Heavy motion blur or defocus blur smears the corner across more than ~6 px and the segment-test criterion fails. Pyramid-based extensions (e.g. abeles2021-pyramidal) address this but are not in the original paper.
- **Adjacent corners without NMS.** Without the score-V non-maximum suppression, the segment-test criterion fires at multiple adjacent pixels around a single geometric corner. The paper enumerates this as weakness 4 of the original detector and addresses it with eq (8).
- **Domain shift for the learned tree.** A decision tree trained on imagery from one domain may produce a slightly different corner set than the literal segment-test reference on a different domain. Paper acknowledges this (§2.2) and notes it would be "relatively straightforward to modify the decision tree to ensure that it has the same results as the segment test algorithm" — but this modification is not used.
- **Cardinal-point heuristic for $n < 12$.** The hand-written cardinal-point test does not generalise to $n < 12$ (§2.1, weakness 1). For FAST-9, the cardinal-point geometry only requires $M_9 = 2$ cardinals; this is a much weaker filter than $M_{12} = 3$ and motivates the decision-tree learner. **Implementations that use the hand-written $M_9 = 2$ cardinal-point check are correct but suboptimal — the paper recommends the learned decision tree for $n < 12$.**
- **Subpixel accuracy.** Integer pixel locations only. Calibration pipelines requiring subpixel precision must add a separate refinement step.

# Numerical sensitivity

- **Threshold $t$ in raw intensity units.** Cross-image inconsistency under exposure changes: a fixed $t$ that gives 500 corners/frame on a well-lit image gives many fewer on a darker frame. Adaptive thresholding (target N corners/frame) is standard practice but not described in the paper.
- **Ring sample reads.** 16 reads per candidate, 4 reads for the high-speed reject. On modern hardware these are gather-loads; row-major image layout makes the vertical ring samples potentially cache-unfriendly. The paper's measurements (Table 1) show the Pentium III is more sensitive to this than the Opteron; on modern x86 with deep cache hierarchies the cardinal-point reject dominates the cost.
- **Score V computation.** Eq (8) requires summing absolute differences over the bright set or dark set. Linear in 16. No conditioning concerns; integer arithmetic on 8-bit images stays well within 32-bit int range.
- **Decision-tree depth.** The paper reports an average of 2.26 questions per pixel for $n = 9$ and 2.39 for $n = 12$ — i.e. typical paths are very short. Worst-case depth is bounded by the tree's height (not stated numerically; presumably ≤ 16 since each question reads at most one ring pixel).
- **Floating point not required.** Entire pipeline is integer arithmetic (intensity comparisons + integer score). This is part of why FAST embeds well on minimal-arithmetic hardware.

# Applicability

- Use when: real-time / embedded constraint dominates and image noise is moderate. The detector's per-pixel cost is a small constant number of reads and comparisons, and it embeds on hardware without floating-point support.
- Use when: the downstream stage tolerates integer-pixel locations (tracking with optical flow refinement, descriptor-based matching with subpixel localisation done elsewhere).
- Use when: $n = 9$ is the right choice — the most repeatable FAST family member per Figure 6A. Use the decision-tree variant for $n = 9$; the cardinal-point heuristic does not generalise to $n < 12$.
- Don't use when: image noise is high. FAST's repeatability collapses under additive Gaussian noise; DoG or Harris is preferred. The paper identifies this in §4 and §5.
- Don't use when: features span more than a few pixels (heavy blur, low resolution). The fixed-radius ring has no scale adaptation. Use a pyramidal extension (e.g. abeles2021-pyramidal) or DoG.
- Don't use when: subpixel accuracy below 0.5 pixels is required. Same as Harris and Shi-Tomasi.
- Don't use when: the input is a calibration target. Specialized X-corner detectors (ChESS, ROCHADE, OCPAD) exploit 4-fold symmetry; ChESS in particular reuses the FAST-16 ring pattern at scale 5 (RING5) for the same reason — the geometric argument for the ring sample positions is the same — but with X-junction-specific response functions.
- Compared against (paper's own comparisons in §4):
  - **Harris (1988):** different mechanism (continuous gradient response over a Gaussian-weighted window vs binary segment test). FAST is ~10–100× faster on commodity 2006-era hardware. Harris is more noise-tolerant. FAST-9 has higher repeatability on box and maze datasets at >200 corners/frame.
  - **Shi-Tomasi (1994):** different mechanism (smaller eigenvalue of structure tensor). On bas-relief (non-affine deformation), Harris outperforms Shi-Tomasi (paper §4) — a finding worth flagging because popular narrative usually presents Shi-Tomasi as strictly better.
  - **DoG / SIFT (2004):** scale-invariant, much slower. DoG dominates under noise; FAST dominates under speed.
  - **SUSAN (1997):** intermediate speed, intermediate noise tolerance. The conceptual ancestor of the segment-test idea (USAN = univalue segment assimilating nucleus).
  - **Trajkovic-Hedley (1998):** the closest predecessor — uses a Bresenham circle and a min-of-diameter-pair response. The FAST segment test is a binary, contiguous-arc generalisation.

# Connections

- Builds on: trajkovic-hedley 1998 (Bresenham-circle response, not in `docs/papers/index.yaml`), smith-brady 1997 SUSAN (segment-of-similar-pixels idea, not in index), the original FAST n=12 (Rosten-Drummond 2005, references [2,3] of this paper, not in index — these are the technical-report predecessors).
- Builds on: harris1988-corner (cited as the canonical alternative), shi-tomasi1994-features (cited as the structure-tensor-based alternative). Both are explicit comparison baselines in §4.
- Enables (in the atlas):
  - fast-corner-detector — primary source.
  - chess-corners — RING5 = FAST-16 scaled to r=5; the geometric ring pattern is reused for X-corner detection.
  - laureano-topological-chessboard — positions itself as "a specification of FAST" (per the page's `sources.notes`); reuses the 16-pixel ring with a sign-alternation count instead of a contiguous-arc check.
  - pyramidal-blur-aware-xcorner — abeles2021-pyramidal uses a pyramid of FAST-style ring evaluations to handle blur (page already cites rosten2006-fast as a reference).
- Enables (outside the atlas, not actionable here): every modern visual-SLAM and structure-from-motion frontend that uses FAST or its variants — ORB-SLAM, ORB feature detector (FAST + Harris score), SVO, DSO frontends.
- Refutes / supersedes: the original FAST n=12 detector (improved by the decision-tree generalisation to n=9). SUSAN (older segment-of-similar-pixels approach, slower).

# Atlas update plan

## UPDATE: fast-corner-detector

The page is well-grounded. The 16-pixel ring offset table, the segment-test criterion, the cardinal-point high-speed test, the score $V$ for NMS, and the choice between $n = 9$ and $n = 12$ are all correctly captured. Improvements:

Section: Algorithm
- The page presents the cardinal-point test for both FAST-9 (`M_9 = 2`) and FAST-12 (`M_{12} = 3`) as if both are the recommended high-speed reject. **The paper explicitly says the cardinal-point heuristic does not generalise to $n < 12$** (§2.1, weakness 1) and motivates the decision-tree learner as the replacement for FAST-9. The page's `M_9 = 2` formulation is mathematically correct (it is the geometric minimum) but the paper's recommended high-speed mechanism for FAST-9 is the learned decision tree, not the cardinal-point check. Add one clarifying sentence in the Cardinal-point definition or the Procedure step 2: "The cardinal-point heuristic is recommended for $n \geq 12$ only; for $n < 12$, the paper trains a decision tree (§2.2) that subsumes the cardinal-point reject and the full segment test in a single sequence of ~2.3 questions per pixel on average."

Section: Remarks
- **Add bullet — original FAST vs learned FAST.** The decision-tree variant trained via ID3 reads on average 2.26 ($n = 9$) or 2.39 ($n = 12$) ring samples per pixel before deciding, vs 2.8 for the hand-written detector. This is the practical reason FAST-9 — the most repeatable FAST family member — runs at full frame rate. Currently the page mentions the decision tree only in the `sources.notes` block as out-of-scope; a one-line Remarks bullet would surface the relationship for readers who use FAST-9.
- **Add bullet — repeatability evidence.** Paper §4 shows FAST-9 outperforms Harris, DoG, Shi-Tomasi, Harris-Laplace, and SUSAN in repeatability on box and maze datasets at >200 corners/frame (Figure 6B–C). The current Remarks list mentions "FAST-9 has the highest repeatability of the FAST family" but does not surface the cross-detector comparison, which is the load-bearing claim of the paper.
- **Caveat to add or strengthen — noise sensitivity.** The current page already mentions FAST is sensitive to noise indirectly. The paper's §4 result is sharper: under additive Gaussian noise, DoG dominates and FAST drops toward baseline (Figure 6D). One bullet: "FAST repeatability degrades sharply under additive image noise (paper §4, Figure 6D); DoG or Harris is preferred when noise dominates."

Section: References
- Already correct (single Rosten-Drummond reference). No change.

## UPDATE: chess-corners (supplementary)

Page already lists `rosten2006-fast` in `sources.references`. The `sources.notes` block correctly identifies RING5 as the FAST-16 sampling pattern scaled to radius 5. No content gap.

Optional: the Algorithm section's prose could explicitly attribute the ring sample geometry to FAST (currently the connection is in the `notes` block but not the page body). Low priority — defer to a chess-corners completeness pass.

## UPDATE: laureano-topological-chessboard (supplementary)

Page already lists `rosten2006-fast` in `sources.references` and the `sources.notes` block correctly identifies the Laureano detector as "a specification of FAST" — i.e. a FAST specialization for chessboard X-corners with sign-alternation count replacing the contiguous-arc criterion. No content gap.

## UPDATE: harris-corner-detector (preparation for comparison)

Per `docs/README.md` §4, the Harris page hosts the `## When to choose Harris over FAST` section (Harris is older and more general). The FAST page would carry only a Remarks bullet pointing to that comparison anchor.

This update plan does **not** authorise applying the comparison content yet. Bullets recorded here for the eventual comparison-writing pass:

Section: When to choose Harris over FAST (new subsection inside `# Remarks` or as a final subsection of `# Algorithm`)
- Different mechanism. Harris computes a continuous gradient response over a Gaussian-weighted window; FAST applies a binary segment-test on a 16-pixel ring with no smoothing.
- Cost. FAST is roughly 10–100× faster on commodity hardware (paper §4 Table 1: Harris ~120% of PAL frame budget on 2006 Opteron; FAST-9 ~7%). Harris requires three Gaussian convolutions; FAST requires four reads + comparisons for non-corners and ~16 reads for candidates.
- Noise robustness. Harris averages noise via the integration window; FAST does not. FAST repeatability degrades sharply under additive Gaussian noise (paper §4, Figure 6D). For noisy imagery, Harris (or DoG) is preferred.
- Repeatability under viewpoint change. FAST-9 outperforms Harris on the box and maze datasets at >200 corners/frame (paper §4, Figure 6B-C). On bas-relief (non-affine deformation), the comparison is more nuanced — Harris outperforms Shi-Tomasi in the same regime, suggesting gradient-based detectors handle non-affine warps better.
- Subpixel accuracy. Both are integer-only; both require a separate refinement step.
- Scale handling. Neither is scale-invariant. Harris is typically used in a Gaussian pyramid; FAST is typically used at one scale (or via FAST + pyramid as in BRISK / ORB).
- Threshold semantics. Both have an integer threshold controlling recall/precision. FAST's $t$ is in pixel-intensity units; Harris's $\tau$ is in response units which scale as $\rho^4$ under intensity scaling (see Harris page).
- Output. Harris produces both corner and edge pixels in a single signed response map; FAST is corner-only by construction.
- Recommendation: prefer FAST when real-time / embedded constraints dominate and image noise is moderate. Prefer Harris when noise is high, when continuous response is needed for downstream subpixel refinement, or when corner/edge dual output is useful.

The corresponding Remarks bullet on the fast-corner-detector page (added when the comparison is authored):

```markdown
- Compared with Harris: see [When to choose Harris over FAST](/atlas/harris-corner-detector#when-to-choose-harris-over-fast). The Harris page hosts the comparison.
```

# Provenance

- Paper full text: `docs/papers/.cache/rosten2006-fast.txt` (14 pages, ECCV 2006).
- Abstract (lines 9-30): two contributions named — "machine learning can be used to derive a feature detector" and "a comparison [of] corner detectors based on this criterion applied to 3D scenes."
- §1 Previous work (lines 39-180): comprehensive survey of prior corner detectors. Equation (1) restates Harris's $H$ matrix; equation (2) restates Harris's $C = |H| - k\,\mathrm{trace}(H)^2$; equation (3) restates Shi-Tomasi's $C = \min(\lambda_1, \lambda_2)$.
- §2.1 FAST: Features from Accelerated Segment Test (lines 192-220, page 4-5): the original FAST $n=12$ is reviewed; "examines only the four pixels at 1, 5, 9 and 13... at least three of these must all be brighter than $I_p + t$ or darker than $I_p - t$." Four weaknesses enumerated: (1) high-speed test does not generalise to $n < 12$; (2) implicit assumptions in pixel ordering; (3) discarded knowledge from first 4 tests; (4) adjacent multiple detections.
- §2.2 Machine learning a corner detector (lines 222-280): ID3 decision-tree training. Equation (5) defines the ternary classification $S_{p \to x} \in \{d, s, b\}$ with thresholds $I_p \pm t$. Equations (6)-(7) define entropy and information gain. Compiled to nested if-else C code. Tree is "very slightly different heuristic to the segment test detector" because of training-data coverage.
- §2.3 Non-maximal suppression (lines 282-310): three intuitive scores $V$ enumerated; the closed-form sum is selected for speed (eq 8). $V$ is "the maximum value of $t$ for which $p$ still passes the segment test" approximately, computed by the closed-form sum.
- §2.4 Timing results (Table 1, page 7): FAST-9 NMS = 6.65% PAL budget on 2.6GHz Opteron; Harris = 120%; DoG = 301%; SUSAN = 37.9%. Decision tree asks 2.26 questions/pixel for $n=9$, 2.39 for $n=12$, vs 2.8 for hand-written.
- §3 Comparison of detector repeatability: extends Schmid's planar-scene criterion to 3D using a hand-aligned surface model. Three datasets — box (planar textures), maze (projective + textural), bas-relief (non-affine).
- §4 Results and Discussion: "the FAST feature detectors, despite being designed only for speed, outperform the other feature detectors on these images (provided that more than about 200 corners are needed per frame)." Bas-relief result: "the Harris detector outperforms Shi and Tomasi detector in this case" because the affine assumption underlying Shi-Tomasi does not hold. "FAST, however, is not very robust to the presence of noise."
- §5 Conclusions: explicit list of advantages and disadvantages. Disadvantages: not robust to noise, can respond to one-pixel-wide lines at quantised angles, threshold-dependent.
