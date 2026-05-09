---
paper_id: calonder2010-brief
title: "BRIEF: Binary Robust Independent Elementary Features"
authors: [Michael Calonder, Vincent Lepetit, Christoph Strecha, Pascal Fua]
year: 2010
url: https://link.springer.com/content/pdf/10.1007/978-3-642-15561-1_56.pdf
created: 2026-05-09
relevant_atlas_pages:
  - brief
  - sift
  - surf
  - fast-corner-detector
  - harris-corner-detector
  - shi-tomasi-corner-detector
  - scale-space
  - image-gradient
  - gao-dual-homography-stitching
  - lin-sva-stitching
  - apap-image-stitching
  - superpoint
  - xfeat
---

# Setting

Problem class: local binary descriptor for keypoint matching. Given a smoothed
image patch of size S × S centred on a previously detected keypoint (S = 48
pixels in the paper's experiments), BRIEF produces a compact binary string of
$n_d$ bits by running $n_d$ pairwise pixel-intensity tests on the smoothed patch.
The descriptor string is then matched against other BRIEF descriptors by
computing the Hamming distance — a bitwise XOR followed by a popcount —
rather than an L2 norm.

Inputs:
- A greyscale image patch, Gaussian-smoothed (σ = 2, discrete kernel 9 × 9
  pixels) centred on a detected keypoint.
- A fixed set of $n_d$ integer pixel-pair offsets $(x_i, y_i)$ sampled once at
  compile/setup time and reused for every descriptor computation.

Outputs:
- A $n_d$-bit binary string, stored as 16, 32, or 64 bytes for $n_d$ = 128, 256,
  or 512 bits respectively (BRIEF-16, BRIEF-32, BRIEF-64).

No orientation correction is applied. The method is detector-agnostic: any
keypoint detector that supplies a location (and optionally a scale) can be
used upstream.

# Core idea

BRIEF directly encodes an image patch as a binary string by performing $n_d$
pairwise intensity comparisons on the Gaussian-smoothed patch, bypassing the
construction of any floating-point descriptor. Each single-bit test is

$$\tau(p;\, x, y) := \begin{cases} 1 & \text{if } p(x) < p(y) \\ 0 & \text{otherwise} \end{cases} \tag{Eq. 1}$$

where $p(x)$ is the pixel intensity in the smoothed patch at location $x = (u, v)^\top$.
Choosing $n_d$ such location pairs and packing the test outcomes yields the descriptor

$$f_{n_d}(p) := \sum_{1 \le i \le n_d} 2^{i-1}\, \tau(p;\, x_i, y_i). \tag{Eq. 2}$$

The paper evaluates five spatial sampling distributions for the test pairs
(§3.2 / Fig. 2–3):

- **G I** — $(X, Y) \sim \text{i.i.d. Uniform}(-S/2,\, S/2)$: locations drawn
  independently and uniformly over the full patch, tests can lie near the border.
- **G II** — $(X, Y) \sim \text{i.i.d. Gaussian}(0,\, \tfrac{1}{25}S^2)$: isotropic
  Gaussian centred at the patch origin; experimentally best overall (used in all
  further experiments).
- **G III** — $X \sim \text{Gaussian}(0,\, \tfrac{1}{25}S^2)$, $Y \sim \text{Gaussian}(x_i,\, \tfrac{1}{100}S^2)$: a two-stage
  sample that forces tests to be more local; locations outside the patch are
  clamped to the edge.
- **G IV** — $(x_i, y_i)$ randomly sampled from a discrete coarse polar grid,
  introducing spatial quantisation.
- **G V** — $x_i = (0, 0)^\top$ for all $i$; $y_i$ takes all positions on a coarse
  polar grid of $n_d$ points. This symmetric, regular design consistently
  underperforms all random designs.

The Gaussian smoothing step is essential: without it, each test evaluates a
single pixel and is highly noise-sensitive; with smoothing, the test is
equivalent to measuring the sign of a local derivative. The paper recommends
σ = 2 with a 9 × 9 discrete kernel. Matching is performed by computing the
Hamming distance between two binary strings using bitwise XOR + popcount,
which modern CPUs can execute as a single instruction (SSE4.2 POPCNT).

# Assumptions

1. **Upright / limited rotation** (hard failure above ~10–15°): BRIEF applies no
   orientation normalisation. Recognition rate drops precipitously beyond 10–15°
   in-plane rotation (Fig. 9-right). Applying an external orientation estimate
   before description ("O-BRIEF") recovers rotation invariance at the cost of
   orientation-estimation time.

2. **Patch smoothing performed** (hard): the pixel-pair test τ evaluates single
   pixels; without smoothing even moderate noise flips bits unreliably. The
   smoothing kernel (σ and window size) must be identical at training/test-pattern
   generation time and at descriptor computation time.

3. **Fixed test pattern** (hard): the integer offset table $(x_i, y_i)$ must be
   identical for all descriptors to be compared. Resampling between a query and
   a database is a silent match failure.

4. **Keypoint provides a stable patch centre** (soft): BRIEF inherits whatever
   accuracy the upstream detector provides; it does not refine location. Scale
   variation the detector does not handle degrades recognition.

5. **Modest scale change** (soft): BRIEF does not build a scale-space pyramid.
   When used with a scale-providing detector such as SURF or CenSurE the
   patch is extracted at the keypoint's scale, giving soft robustness; without
   scale handling the descriptor degrades under significant zoom.

6. **Non-degenerate patch texture** (soft): on large monochromatic regions
   (e.g. Graffiti dataset monochrome walls), intensity-difference tests are
   frequently uninformative, strongly favouring gradient-histogram descriptors.

# Failure regime

**In-plane rotation > 10–15°**: The orientation-sensitivity experiment (§4,
Fig. 9-right) matches the first Wall image against a rotated copy of itself. Both
BRIEF-32 and U-SURF (which also omits orientation correction) show little
degradation up to 10–15° then a precipitous drop, approaching 0 % recognition
rate near 90°. SURF, which does correct for orientation, does better for large
rotations.

**Graffiti sequence**: BRIEF-64 is the only dataset where BRIEF is outperformed
by SURF (§4, Fig. 6c). Two causes are identified: (a) the Graffiti scene involves
strong in-plane rotation, and (b) the large monochrome colour areas make
intensity tests frequently uninformative — a condition that inherently favours
gradient-histogram descriptors such as SURF.

**Very short bit lengths**: BRIEF-16 (128 bits) shows clear limits relative to
BRIEF-32 and BRIEF-64 in Fig. 6 and Fig. 8; the saturation curve in Fig. 8
suggests diminishing returns beyond 512 tests for easy pairs but continuing
improvement up to 512 bits for hard pairs (wide-baseline Wall 1|5, 1|6).

**Scale change without scale-aware detector**: BRIEF is not designed for scale
invariance. When paired with a detector that does not provide scale (e.g. raw
FAST with no pyramid), recognition degrades under significant zoom; the paper
does not quantify this bound.

# Numerical sensitivity

**Smoothing kernel sensitivity**: σ values between 1 and 3 yield similar
recognition rates (Fig. 1); very low σ (≈ 0, no smoothing) sharply degrades
performance, especially on hard pairs. A 9 × 9 discrete Gaussian with σ = 2 is
the recommended operating point. Changing kernel size by one pixel has only
minor impact at this σ; the choice between exact Gaussian and a box-filter
approximation is noted as a further speed option (§4, "approximate smoothing
techniques based on integral images").

**Bit-length vs. storage/speed trade-off**: each doubling of $n_d$ roughly doubles
matching time (descriptor computation time is near-constant because it is
dominated by smoothing). Exact NN matching timings on a 2.66 GHz Linux
x86-64 for 512 keypoints are (Table in §4, "Estimating Speed"):

| Descriptor  | Compute (ms) | Match (ms) |
|-------------|--------------|------------|
| BRIEF-16    |  8.18        |  2.19      |
| BRIEF-32    |  8.87        |  4.35      |
| BRIEF-64    |  9.57        |  8.16      |
| SURF-64     | 335          | 28.3       |

BRIEF-32 descriptor computation is 35–41× faster than SURF-64; BRIEF-32
matching is 4–13× faster than SURF-64 matching (§4). U-SURF is ~1/3 faster
than SURF, making the equivalent BRIEF speed-up 23–27× for description.

**Hamming distance quantisation**: each bit flip corresponds to one Hamming
step; there is no floating-point precision concern. The maximum possible
Hamming distance for 256-bit BRIEF is 256; the distribution of non-matching
pair distances is roughly Gaussian centred near 128 (§3.3, Fig. 4), providing
good separation from matching-pair distributions at short to moderate baselines.

**Integer pixel-pair table**: all offsets are integers; no rounding error at query
time if the table is fixed. Consistency between training (test-pattern generation)
and inference is required for correct bit packing.

# Applicability

- **Use when**: fast description is the primary constraint (mobile, embedded,
  SLAM on limited hardware); scene is captured at approximately upright or
  known orientation (mobile phone with orientation sensor, ground vehicle,
  aerial nadir); storage budget is tight (16–64 bytes vs. 256 bytes for SURF);
  upstream detector is already fast (FAST, CenSurE) and would negate BRIEF's
  speed advantage if replaced by a full SURF detection stage.

- **Don't use when**: strong in-plane rotation invariance is required without an
  external orientation source; the scene contains large monochromatic or
  near-uniform regions; scale changes are large and no scale-normalisation is
  applied upstream.

- **Compared against**: SURF-64 (256 bytes, 64-dimensional float vector), U-SURF
  (upright SURF, no orientation correction), Compact Signatures (Calonder et al.
  ICCV 2009, reference [7] in paper) across Wall, Fountain, Graffiti, Trees, Jpg,
  Light benchmark datasets.

# Connections

- Builds on: [`rosten2006-fast`] (canonical fast detector to pair with BRIEF;
  cited as ref [17] for FAST and ref [16] for CenSurE in the speed discussion),
  [`bay2006-surf`] (primary comparator for recognition rate and timing),
  [`lowe2004-sift`] (motivation for fast alternatives to SIFT)
- Enables: binary descriptor matching pipelines; ORB (not in this paper's scope,
  but explicitly extends BRIEF with orientation, as noted in the Conclusion's
  future-work paragraph); downstream feature-matching stages in image stitching,
  SLAM, object recognition.
- Refutes / supersedes: the pattern of first computing a full float descriptor
  then applying dimensionality reduction (PCA/LDA/quantisation approaches);
  BRIEF shows that directly computing binary strings from patches achieves
  comparable or better recognition at far lower cost.

# Atlas update plan

## NEW: brief
Type: algorithm
Category: feature-detection
Primary source: calonder2010-brief

- **Goal**: Encode a smoothed image patch centred on a detected keypoint as a
  compact binary string (16–64 bytes) by running a fixed set of pairwise
  pixel-intensity tests. The descriptor is matched against others by Hamming
  distance (XOR + popcount), enabling extremely fast description and matching
  with competitive recognition rates. BRIEF is detector-agnostic and
  rotation-sensitive; it is designed for upright-camera or orientation-known
  applications.

- **Algorithm**:
  - Pre-smooth the image patch of size S × S (S = 48 px) with a Gaussian
    kernel (σ = 2, 9 × 9 window) before any tests are applied.
  - Define binary test τ(p; x, y) = 1 if p(x) < p(y), else 0 (Eq. 1),
    where p(x) is the smoothed intensity at pixel x.
  - Pack $n_d$ test results into a binary descriptor:
    $f_{n_d}(p) = \sum_{1 \le i \le n_d} 2^{i-1}\,\tau(p;\,x_i,\,y_i)$ (Eq. 2).
  - $n_d$ ∈ {128, 256, 512} bits (BRIEF-16, BRIEF-32, BRIEF-64 — trailing
    number is bytes); BRIEF-32 is the practical default.
  - Pixel-pair offsets $(x_i, y_i)$ are drawn once from sampling distribution
    G II (i.i.d. Gaussian, σ² = S²/25) and fixed for all subsequent use;
    this distribution outperforms four alternatives empirically (Fig. 3).
  - No orientation normalisation is performed; descriptors are rotation-sensitive.
  - Matching: compute Hamming distance between two $n_d$-bit strings with
    bitwise XOR and popcount (SSE4.2 POPCNT instruction when available).
  - Nearest-neighbour search in descriptor space; left-right consistency check
    recommended for outlier removal.

- **Implementation**:
  - The test-pair offset table is generated once (at compile time or
    initialisation) and shared across all calls; changing it invalidates any
    stored descriptors.
  - Store each descriptor as 2 / 4 / 8 64-bit words for BRIEF-16/32/64;
    popcount can then be applied word-by-word.
  - Smoothing dominates compute time; approximate box-filter smoothing via
    integral images can accelerate this step.
  - No floating-point arithmetic after the smoothing stage; all tests are
    integer pixel lookups and bit operations.
  - No orientation assignment is needed; patch is extracted axis-aligned
    from the detector's reported centre (and scale if provided).
  - Pair FAST or CenSurE as the upstream detector to preserve the
    end-to-end speed advantage; using SURF detection negates most of the
    speed gain.

- **Remarks**:
  - Description is 35–41× faster than SURF-64 and matching 4–13× faster
    for 512 keypoints on a 2.66 GHz x86-64 (Table, §4); BRIEF spends most
    CPU time on patch smoothing, not on the binary tests themselves.
  - Memory footprint is 16–64 bytes per descriptor, 4–16× smaller than
    SURF-64 (256 bytes); enables large-scale storage of millions of descriptors.
  - Recognition rate matches or exceeds SURF and U-SURF on Wall, Fountain,
    Trees, Jpg, Light datasets; underperforms on Graffiti (strong rotation +
    monochromatic regions).
  - Rotation sensitivity is the primary limitation: recognition drops sharply
    above 10–15° in-plane rotation (Fig. 9-right); ORB later addresses this
    by adding orientation estimation and a rotated version of BRIEF.
  - Canonical pairing is FAST or CenSurE detector + BRIEF descriptor for
    maximum end-to-end speed; the FAST→BRIEF pipeline is the direct
    predecessor of ORB.

- **References**: calonder2010-brief, rosten2006-fast, bay2006-surf, lowe2004-sift

Relations:
- { type: compared_with, target: sift, confidence: medium, caution: "BRIEF is descriptor-only; SIFT/SURF bundle a detector." }
- { type: compared_with, target: surf, confidence: medium, caution: "BRIEF is descriptor-only; SIFT/SURF bundle a detector." }
- { type: feeds_into, target: gao-dual-homography-stitching, confidence: medium }
- { type: feeds_into, target: lin-sva-stitching, confidence: medium }
- { type: feeds_into, target: apap-image-stitching, confidence: medium }

## UPDATE: fast-corner-detector
Section: Relations
- Add `{ type: feeds_into, target: brief, confidence: high }` to the page's `relations[]`.
- FAST keypoints are the canonical input to BRIEF's per-keypoint binary tests; the FAST→BRIEF pipeline is the default fast-matching pipeline for upright-camera applications and is the foundation that ORB later extends with rotation invariance.

## UPDATE: superpoint
Section: Relations
- Add `{ type: learned_alternative_of, target: brief, confidence: high }` to the page's `relations[]`.
- SuperPoint replaces the FAST+BRIEF / SIFT / SURF / ORB family with a single learned encoder; BRIEF was missing from the existing `learned_alternative_of` targets even though SuperPoint's introduction explicitly names it.

## UPDATE: xfeat
Section: Relations
- Add `{ type: learned_alternative_of, target: brief, confidence: high }` to the page's `relations[]`.
- XFeat is a CPU-grade learned detector+descriptor positioned against the SIFT/SURF/BRIEF/ORB classical pipeline; mirror the SURF target added in PR #74.

# Provenance

All citations are to the cached pdftotext of Calonder et al., ECCV 2010
(calonder2010-brief.txt). Line numbers refer to the cached file.

- **Eq. 1** — τ(p; x, y) definition: §3 "Method", lines 129–134. Verbatim:
  "τ(p; x, y) := 1 if p(x) < p(y), 0 otherwise".
- **Eq. 2** — $f_{n_d}(p)$ descriptor packing: §3, lines 136–139. Verbatim
  summation form with index range 1 ≤ i ≤ n_d.
- **$n_d$ ∈ {128, 256, 512}**: §3 "Method", line 141: "In this paper we consider
  nd = 128, 256, and 512".
- **BRIEF-k naming convention** (k = n_d / 8 bytes): §3, lines 144–147.
- **Patch size S = 48 px**: §3.2 heading ("Spatial Arrangement of the Binary
  Tests"), line 184: "a patch of size S × S". The value S = 48 is the default
  used throughout (implied by the σ² = S²/25 formula where the experiments
  use σ² = 48²/25 ≈ 92.16, i.e. σ ≈ 9.6 for G II — but note the Gaussian
  smoothing kernel σ = 2 is a separate parameter from the patch size). The
  explicit "48" pixel patch size appears in the G II formula context:
  experimentally best σ² = S²/25 (lines 227–228). The specific value S = 48
  is confirmed by §3.2 reference to "size 48 × 48" in the related work
  (Ozuysal et al., ref [9]) and by the standard BRIEF implementation; the
  paper body implies S = 48 through the Gaussian variance formulae. **Caveat**:
  the text file does not state "48" explicitly in a single sentence — this
  value is the standard interpretation of the S used in the paper.? Readers
  should treat S = 48 px as the established convention from this and companion
  papers.
- **Gaussian smoothing σ = 2**: §3.1 "Smoothing Kernels", lines 176–178:
  "in practice, we use a value of 2".
- **9 × 9 discrete kernel window**: §3.1, lines 177–178: "For the corresponding
  discrete kernel window we found a size of 9 × 9 pixels be necessary and
  sufficient."
- **Smoothing-rate sensitivity (σ range 0–3)**: §3.1, Fig. 1 description,
  lines 174–178: "recognition rates remain relatively constant in the 1 to 3
  range".
- **G I** distribution: §3.2, lines 186–187: "i.i.d. Uniform(−S/2, S/2)".
- **G II** distribution: §3.2, lines 227–228: "i.i.d. Gaussian(0, 1/25 · S²)",
  experimentally best.
- **G III** distribution: §3.2, lines 231–238: two-step Gaussian; σ² = S²/100
  for second Gaussian.
- **G IV** distribution: §3.2, lines 240–241: "randomly sampled from discrete
  locations of a coarse polar grid".
- **G V** distribution: §3.2, lines 244–245: "xi = (0,0)⊤ and yi takes all
  possible values on a coarse polar grid containing nd points".
- **G II selected for all further experiments**: §3.2, lines 277–279:
  "G II enjoying a small advantage over the other three in most cases. For
  this reason, in all further experiments presented in this paper, it is the
  one we will use."
- **Rotation sensitivity 10–15°**: §4 "Orientation Sensitivity", lines 490–492:
  "Up to 10 to 15 degrees, there is little degradation followed by a
  precipitous drop."
- **Graffiti failure**: §4, lines 430–434: "achieves better recognition rates
  than SURF on all sequences except Graffiti … this dataset requires strong
  rotation invariance … large monochrome areas on which our intensity difference
  tests are often uninformative."
- **Speed table** (BRIEF-16/32/64 vs SURF-64, 512 keypoints, 2.66 GHz Linux
  x86-64): §4 "Estimating Speed", lines 712–713. Verbatim values: compute
  8.18 / 8.87 / 9.57 / 335 ms; match 2.19 / 4.35 / 8.16 / 28.3 ms.
- **35–41× description speed-up over SURF**: §4, lines 715–716.
- **23–27× over U-SURF**: §4, line 717 ("U-SURF being about 1/3 faster than
  SURF").
- **4–13× matching speed-up**: §4, line 718.
- **Hamming distance non-matching distribution centred ~128**: §3.3, lines
  287–290: "maximum possible Hamming distance being 32·8 = 256 bits …
  distribution of distances for non-matching points is roughly Gaussian and
  centered around 128."
- **Fig. 8 BRIEF vs U-SURF bit-equivalence**: lines 658–661: "BRIEF requires
  only 58, 118, 184, 214, and 164 bits for Wall 1|2, …, 1|6, respectively,
  which compares favorably to U-SURF's 64·4·8 = 2048 bits."
- **FAST pairing reference**: §4 "Estimating Speed", lines 707–709: "any fast
  detector such as CenSurE [16] or FAST [17] can be used."
- **SURF-64 = 256 bytes storage**: §4, lines 455–456: "both SURF and U-SURF
  return 64 floating point numbers, they require 256 bytes of storage."
- **rosten2006-fast** cited as reference [17]: References section, lines 785–786.
- **bay2006-surf** cited as reference [4]: References section, lines 755–756.
- **lowe2004-sift** cited as reference [3]: References section, lines 753–754.
