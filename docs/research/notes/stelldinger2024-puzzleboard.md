---
paper_id: stelldinger2024-puzzleboard
title: "PuzzleBoard: A New Camera Calibration Pattern with Position Encoding"
authors: ["P. Stelldinger", "N. Schönherr", "J. Biermann"]
year: 2024
url: https://arxiv.org/pdf/2409.20127
created: 2026-05-01
relevant_atlas_pages: [puzzleboard]
---

# Setting

**Problem class.** A *self-identifying* checkerboard calibration pattern. Two failure modes of plain checkerboards motivate this work: (1) full visibility is required (any occluded corner makes the entire detection unreliable for calibration); (2) ChArUco fixes occlusion-handling but at the cost of much higher resolution (~25 px per checkerboard edge needed to read the embedded 7×7 ArUco markers). PuzzleBoard combines checkerboard precision with a *lightweight* position encoding that decodes at extreme low resolution (~3.3–5 px/edge) — roughly 5× lower than ChArUco.

**Inputs.** A grayscale image of a printed PuzzleBoard target. The decoder needs the two factor maps $A$ (shape $3 \times 167$) and $B$ ($167 \times 3$) — both binary $(3, 3)_2$ de Bruijn rings. Several PuzzleBoards can co-exist in one image and be decoded independently because each is a different sub-window of the same $501 \times 501$ master pattern.

**Outputs.** For every detected corner: subpixel image position $p_k \in \Omega$ and **absolute integer grid coordinate** $(u_k, v_k) \in \{0, \dots, 500\}^2$ on the master pattern. The decoder also outputs the orientation (one of four) of each detected sub-pattern. The grid coordinates are recoverable from any single $3 \times 3$ window of bits — i.e. local decoding without seeing the pattern boundary.

**Guarantees.**
- **Uniqueness**: every $3 \times 3$ window of 4-ary codes is unique on the master pattern. Proof: two equal $3 \times 3$ windows force equal $A$- and $B$-windows, hence equal indices modulo $(3, 167)$ and $(167, 3)$, hence equal indices modulo $\mathrm{lcm}(3, 167) = 501$.
- **Error correction**: bit values repeat every 3 rows and every 3 columns. After majority voting across visible repetitions, **up to ~40% of raw bits can be corrupted** and the position still decodes correctly. The minimum Hamming distance between the correct alignment and any wrong alignment is 804 of 1002 bits.
- **Geometric placement**: the bit-encoding circle of diameter $L/3$ at each edge midpoint is sized so that under any pinhole-camera projection where the next checkerboard square is in front of the camera, the projected edge midpoint lies inside the imaged circle (paper §3, Figure 4 proof). This makes bit reading a single grayscale comparison at a known subpixel location.

# Core idea

Three coordinated design choices:

1. **Lightweight 4-ary position code from two binary de Bruijn rings**. Place one bit per checkerboard edge: horizontal-edge bits encode factor map $A$ (cyclic, period 3 across, period 167 along), vertical-edge bits encode factor map $B$ (cyclic, period 167 across, period 3 along). The combined 4-ary code per square is the pair $(A, B)$, with master grid period $\mathrm{lcm}(3, 167) = 501$ in both axes. Each $3 \times 3$ window of codes is unique. **Critically: there is no extra space cost** — each checkerboard square already has 4 surrounding edges; PuzzleBoard reuses that geometry rather than adding new symbols. ChArUco, by contrast, embeds full ArUco markers at the cost of needing larger square sizes for marker readability.

2. **Hessian-based saddle response for detection (§4.1)**:

   $$s = f_{xy}^2 - f_{xx} f_{yy} - k\,(f_{xx} + f_{yy})^2,\quad k = 1\ \text{by default}.$$

   First two terms equal $-\det(H)$, which is positive at saddles (eigenvalues of opposite sign). The trace-squared penalty suppresses blob responses (where both eigenvalues have the same sign and trace is non-zero). The paper is explicit that this is **fundamentally different from Harris**, which uses the *structure tensor* $M$ (gradient covariance) and "is unable to distinguish between checkerboard corners and circular blobs, as both appear as local maxima of the autocorrelation function." Harris's $M$ is positive semi-definite by construction; the Hessian $H$ has signed eigenvalues that the saddle test exploits.

3. **Cross-correlation decoding under unknown rotation**. The factor maps $A$ and $B$ are **not 4-orientable** ($3 \times 3$ sub-windows are not unique under rotation in general). The paper handles this by cross-correlating the observed grid against four sign-rotations of each factor map: $A$, $A'$ (180°), $B$, $B'$. The strongest correlation peak gives both translation and orientation. Position formula:

   $$u = x_A + 167\,[(x_A - x_B) \bmod 3],\quad v = y_B + 167\,[(y_B - y_A) \bmod 3],$$

   reconstructing the full 9-bit-resolved $(u, v)$ from the coarse $\bmod\ 167$ from each map and the fine $\bmod\ 3$ from their disagreement.

The detection pipeline before decoding (§4): Hessian saddle response → centrosymmetric pre-filter → subpixel grayscale-centroid refinement on the 3×3 of non-negative $s$ values → 9-nearest-neighbour graph with Hessian-eigenvector-based direct/diagonal disambiguation → Kruskal MSF on edges weighted by length × endpoint response → bit read at edge midpoints → majority voting → cross-correlation decoding.

# Assumptions

1. (hard) The pattern is a printed PuzzleBoard target whose factor maps $A$ and $B$ are known to the decoder. The decoder is *not* generic — it requires the specific (3, 3)\_2 de Bruijn rings used in the manufactured pattern.
2. (soft) Image is grayscale or convertible to grayscale. Multi-channel inputs are reduced to a single channel before the Hessian computation.
3. (hard) Pinhole-camera-with-perspective projection where the next checkerboard square is in front of the camera. The L/3 edge-midpoint geometric guarantee (§3, Figure 4) explicitly relies on this assumption — extreme oblique poses where the next square is behind the camera plane violate the proof.
4. (soft) Projection angle ≤ 71.955°. Beyond this, the 9-nearest-neighbour assumption (all four direct grid neighbours are among the 9 nearest in image distance) can fail; the decoder then misses some grid edges.
5. (soft) Sufficient pattern visible: at least one $3 \times 3$ window of 18 bits is required for unambiguous position decoding (paper §3). The minimum visible region is therefore ~9 squares = ~3 squares per side.
6. (soft) Image resolution above ~3.3 pixels per checkerboard edge. Below this, both corner detection and bit reading become unreliable; the paper's claim of decoding at 3.33 px/edge depends on error correction picking up the slack.
7. (soft) Edges in the visible region are not heavily masked by specular highlights, blur, or sensor noise. Up to ~40% bit errors are tolerated by majority voting; higher rates fail decoding.
8. (hard) Horizontal and vertical edges are reliably distinguished. The Hessian-eigenvector-direction step (§4.2) drives this; under severe distortion or near-singular Hessians at degenerate corners, the disambiguation fails.

# Failure regime

- **Single visible PuzzleBoard square.** Decoding requires at least one full $3 \times 3$ window. A 1×1 or 2×2 visible region cannot be uniquely localised. The paper does not discuss this lower bound but the construction makes it explicit.
- **Pattern viewed off the edge of the master 501×501.** Not a real failure — PuzzleBoard tile sizes (e.g., 7×10, 15×22, 51×71 in the paper's experiments) are sub-windows of the master pattern. But if a single image contains *multiple* sub-patterns from different masters (different factor-map sets), the decoder cannot cross-correlate against the wrong masters and reports nothing.
- **Severely tilted camera** beyond ~72° projection angle. The 9-NN approach to neighbour finding breaks; some direct grid neighbours fall outside the 9 nearest by image distance. The paper does not provide a fallback.
- **Hessian computation at low contrast or under heavy blur.** The second-order derivatives are noisy at low contrast; the saddle response becomes dominated by noise. The cascade pre-filters (centrosymmetric test) and threshold mitigate but do not eliminate this. Below ~3 pixels per edge the corner detection itself becomes unreliable, before decoding is even attempted.
- **>40% bit corruption after majority voting.** The minimum Hamming distance of 804/1002 bounds the error correction budget; above 40% raw bit errors after averaging, the cross-correlation second peak can dominate the correct one and the decoder outputs a wrong position. The paper does not discuss the failure mode (silent wrong decoding).
- **Pure rotational ambiguity for symmetric patches.** $3 \times 3$ windows are not 4-orientable for 0.67% of the master pattern (per paper §3 — "99.33% of all 3×3 such local patterns are unique under orientation"). For these patches, the cross-correlation has two equal peaks and the decoder cannot resolve orientation. Larger ($4 \times 4$) windows are always uniquely orientable; the decoder presumably falls back when sufficient context is visible.
- **Missing edge bits**. If many edges are obscured (specular highlights, partial occlusion at edge level), the bit pattern read is noisy. Within the 40% bit-error budget this is fine; beyond it, decoding fails.
- **Wrong factor-map version**. The PuzzleBoard's master pattern is *not* unique — other (3, 3)\_2 de Bruijn rings exist. A decoder built for one master cannot decode a different master. The paper presents a specific master found by stochastic hill-climbing search; deployment requires fixing the master across detector and printer.

# Numerical sensitivity

- **Hessian-component computation.** First and second-order Gaussian-smoothed derivatives. The smoothing scale is not specified in the paper; presumably implementation-dependent (the BoofCV-like reference uses small Gaussians). Aliasing in the second derivative at low resolution is the dominant noise source — Gaussian smoothing with $\sigma \sim 1$ pixel is a typical compromise.
- **The $k = 1$ trace penalty.** The paper makes this the default. $k = 1$ means $-\det(H) - (f_{xx}+f_{yy})^2 = -\det(H) - \mathrm{tr}(H)^2$. Since $\mathrm{tr}(H) = \lambda_1 + \lambda_2$ and $\det(H) = \lambda_1 \lambda_2$, the response at a perfect saddle ($\lambda_1 = -\lambda_2 = a$) is $a^2 - 0 = a^2$, which is the maximum possible signal. At a perfect blob ($\lambda_1 = \lambda_2 = a$), the response is $-a^2 - 4a^2 = -5a^2 < 0$ — strongly suppressed. The choice $k = 1$ produces a clean rejection of blob responses; smaller $k$ admits more blob false positives.
- **Centroid refinement on a $3 \times 3$ neighborhood.** Refines integer pixel locations to sub-pixel using only non-negative response values. The paper notes this is "a good compromise between precision and algorithmic complexity." Higher-precision alternatives (polynomial saddle fit à la ROCHADE, mean-shift à la pyramidal-blur-aware-xcorner) are listed in §4.1 as drop-in replacements; the paper does not benchmark them.
- **Sorting cost in Kruskal.** Edge weights are sorted before MSF construction; this is the dominant near-linear cost in the corner count.
- **Cross-correlation at sizes $3 \times 167$ and $167 \times 3$.** Eight cross-correlations per detected sub-pattern (each pattern direction × four rotations of each factor map). The paper notes "the dominant cost of the full pipeline is the cross-correlation in step 9"; large detected grids amplify this.
- **Modulo arithmetic for position decoding.** $u = x_A + 167 \cdot [(x_A - x_B) \bmod 3]$ — exact integer arithmetic; no precision concerns. Implementation must use `rem_euclid` (or equivalent) to handle the case $x_A < x_B$ correctly; naive `%` in C semantics produces negative residues.
- **Bit thresholding at edge midpoint.** The bit value is the sign of $I(\text{midpoint}) - \tfrac{1}{2}(I(c_1) + I(c_2))$ — i.e. compare the midpoint grayscale against the average of the two endpoint grayscales. The threshold is *local* — no global threshold needed. Quantisation of pixel intensities introduces no problem at typical 8-bit depth.
- **Hill-climbing-derived factor-map collision rate**. The paper achieves 99.33% rotation uniqueness for $3 \times 3$ windows on the chosen $A, B$ pair. The remaining 0.67% rotation collisions are intrinsic to the chosen factor-map pair; switching to a different pair changes the collision set but not the fundamental impossibility (4-orientable de Bruijn tori at this size are not known to be tractably constructible).

# Applicability

- Use when: calibration in environments with significant occlusion (multi-camera systems with limited field-of-view overlap, robotic arms, hand-held imaging where the pattern is partly outside the frame). PuzzleBoard's local decodability removes the requirement for full pattern visibility.
- Use when: low-resolution cameras (embedded systems, drones, low-power vision) where ChArUco's resolution requirement is prohibitive. PuzzleBoard decodes at ~5 px/edge vs ChArUco's ~25 px/edge.
- Use when: continuous re-calibration is needed — variable-zoom or variable-focus cameras. The faster decoding (~10× the throughput of `findChessboardCornerSB` per the paper's §5 timing) supports real-time recalibration loops.
- Use when: marker-based pose estimation or object localization — sub-windows of the PuzzleBoard work as fiducials. The paper proposes covering "an entire floor with a PuzzleBoard pattern as a localization means for autonomous robots or drones."
- Don't use when: the application requires *no* decoding — a plain checkerboard is simpler. PuzzleBoard's edge-midpoint circles add no detection cost but are unnecessary if absolute identification is not required.
- Don't use when: the printer cannot produce the required spatial precision for the L/3 circles. At low resolution this requirement is mild; at high resolution, normal printing precision suffices.
- Don't use when: the camera is severely fisheye-distorted with projection angles >72°. The 9-NN neighbour search assumption breaks; the paper does not provide a fallback (though the corner detector itself is fine — only the grid construction step degrades).
- Don't use when: extreme robustness to bit-level error matters more than calibration accuracy. Reed-Solomon-coded fiducials (e.g., AprilTag) have stronger error correction than the PuzzleBoard's repetition coding, at the cost of much higher resolution requirements.
- Compared against (paper's own §2 + §5):
  - **Plain checkerboard**: PuzzleBoard adds local position decoding without sacrificing checkerboard precision. Backward compatible — standard checkerboard detectors still work on PuzzleBoards but cannot decode position.
  - **ChArUco** (Garrido 2015, OpenCV): same goal (position-encoded checkerboard), but ChArUco's ArUco markers need ~25 px/edge for marker readability; PuzzleBoard needs ~5 px/edge for the same level of robustness. The paper claims 5× lower resolution requirement.
  - **CALTag** (Atcheson-Heide-Heidrich 2010): higher-precision fiducial markers within a calibration board; same resolution cost as ChArUco.
  - **ArUco** / **ARTag** boards: pure fiducial markers without checkerboard saddles; less position accuracy. PuzzleBoard combines both.
  - **Deltille grid** (Ha et al. 2017): triangular monkey-saddle corners with 10% per-corner accuracy improvement; offset by 30% fewer detected corners at the same resolution — net loss of accuracy in the paper's analysis. PuzzleBoard sticks with checkerboards for the projection-invariant saddle property.
  - **UMF (Uniform Marker Fields, Szentandrási et al.)**: another (sub-)perfect-map pattern, but uses line-fitting that requires undistorted images — unsuitable for camera calibration itself, only for pose estimation under known calibration.
  - **Dothraki** (Schlüsselbauer et al.): de Bruijn torus for tabletop tangible localization; no perspective distortion expected. Different problem class.

# Connections

- Builds on:
  - **harris1988-corner** (already ingested) — explicitly contrasted in §4.1. Harris uses the structure tensor M (gradient covariance) which gives same-sign positive eigenvalues at both corners and blobs. PuzzleBoard uses the Hessian H (second derivatives) which gives opposite-sign eigenvalues at saddles, distinguishable from blobs. Different mathematical object, different problem-class fit.
  - **lucchese2003-saddle** (in `docs/papers/index.yaml`, not yet ingested) — saddle-point detection for subpixel checkerboard corners; PuzzleBoard's Hessian saddle response is in the same family but uses a specific weighted-trace formulation.
  - **bennett2013-chess** (already ingested) — listed in §4.1 as an alternative pattern-based subpixel corner detector that "can be applied to PuzzleBoards as well."
  - **placht2014-rochade** (already ingested) — listed as a Fourier/saddle-fitting alternative ("[57]" in the paper's references is Wu-Zhang 2018 saddle-fit; ROCHADE is [38]). Same applicability note: ROCHADE's subpixel refinement can substitute for the grayscale-centroid step.
  - **abeles2021-pyramidal** (already ingested) — listed as a "pyramid based [1]" alternative subpixel detector substitutable for the corner-detection step.
  - **OpenCV ChArUco** (Garrido 2015, not in atlas as a paper) — direct conceptual competitor; PuzzleBoard is positioned as a low-resolution drop-in replacement.
  - **De Bruijn torus / sub-perfect map literature** — the paper builds on Hurlbert-Isaak (1995, [10]), Mitchell (1995, [24]), Reichardt (1953, [36]), and follow-ups for 2D-perfect-map theory. None of these are in the atlas as papers; their content is at a level of abstraction that does not map directly to a public algorithm page.
  - **Szentandrási et al. UMF** [49] — directly cited as the most similar prior 2D-position-encoding pattern. PuzzleBoard differs in (a) using checkerboard saddles for sub-pixel localization (UMF uses line-fitting), and (b) handling the rotation problem differently (UMF uses true 4-orientable maps from a supercomputer search; PuzzleBoard accepts 99.33% orientation uniqueness from hill-climbing).
- Enables (in the atlas):
  - **puzzleboard** — primary source for the existing canonical page.
  - Future "self-identifying calibration patterns" survey concept page (if one ever covers ChArUco, CALTag, AprilTag, PuzzleBoard, UMF) — three or more methods, decision table, would meet the README §4 criterion.
- Refutes / supersedes:
  - **ChArUco's resolution requirement** in the embedded / low-resolution regime. PuzzleBoard demonstrates that 5× lower resolution is sufficient for the same problem (occlusion-tolerant calibration).

# Atlas update plan

## UPDATE: puzzleboard

The page is comprehensive and well-grounded. The Hessian saddle response, factor-map structure, position-decoding formula, MSF + Kruskal grid reconstruction, cross-correlation decoding, and the L/3 edge-midpoint geometric reasoning are all faithfully captured. The page is currently `draft: true`. Improvements:

Section: Algorithm
- The page's `:::definition[Saddle response (s)]:::` is correct and clearly explains why it differs from Harris. Optional small enhancement: add the eigenvalue analysis at the response extremes — at a perfect saddle ($\lambda_1 = -\lambda_2$), $s = a^2$; at a perfect blob ($\lambda_1 = \lambda_2$), $s = -5a^2 < 0$. This makes the design choice $k = 1$ concrete (it produces a 6:1 ratio between saddle and same-magnitude blob responses).
- The page's `:::definition[Edge-bit encoding]:::` block correctly explains the L/3 circle. The current note "the imaged midpoint of the edge lies within the imaged circle, so reading the bit reduces to a grayscale comparison at a known subpixel location" is accurate. Could be strengthened by referencing Figure 4 of the paper, which gives the geometric proof: under any pinhole-camera projection where the next checkerboard square is in front of the camera plane, the projected edge midpoint divides the projected edge into ratio ≥ 1:1 — i.e., lies in the second third of the edge. This ratio is the precise reason for the L/3 circle size.

Section: Algorithm — Procedure
- Step 5 says "Separate direct grid neighbours from diagonal neighbours using the two Hessian eigenvector directions at $p$, which bisect the black/white sectors." This is correct (paper §4.2). The phrase "bisect the black/white sectors" is the load-bearing geometric insight; could be expanded into a one-sentence explanation: "The Hessian eigenvectors of an X-junction point along the bisectors of the black and white quadrants, which makes them perpendicular to the grid axes; rotating them 45° gives the grid axis directions."

Section: Remarks
- **Strengthen the Harris distinction.** The page says "The saddle response uses the Hessian H rather than the structure tensor." Worth surfacing the *consequence* explicitly: Harris cannot distinguish checkerboard saddles from blobs, because both produce same-sign autocorrelation eigenvalues; PuzzleBoard's Hessian-based response has opposite-sign saddle eigenvalues, which the response exploits via $-\det(H)$. This is the load-bearing reason PuzzleBoard does not use Harris despite Harris being the dominant general-purpose corner detector. Currently captured in the saddle-response definition but worth surfacing in Remarks too.
- **Add bullet — projection-invariant L/3 ratio.** The L/3 edge-circle diameter is *exactly* the right size: any larger and adjacent circles overlap; any smaller and extreme oblique projection can push the imaged midpoint outside the circle. The geometric proof (§3, Figure 4 of the paper) is a closed-form bound, not an empirical heuristic. Worth flagging.
- **Add bullet — backward compatibility direction.** The paper makes two backward-compatibility claims: (1) the PuzzleBoard detector works on standard checkerboards (skipping the bit-decoding pipeline); (2) standard checkerboard detectors still work on PuzzleBoards (at the cost of losing position decoding). The page's existing "Backward compatibility" bullet covers (2); (1) is also true and worth surfacing — it makes PuzzleBoard a strict generalisation of plain checkerboard detection.
- **Add bullet — orientation handling**. The page does not surface that the cross-correlation against four sign-rotations of $A$ and $B$ resolves orientation as a side effect — this is one of the paper's design choices (no truly 4-orientable maps are known at this size, so the algorithm handles rotation via correlation-peak comparison).
- **Optional bullet — multi-pattern detection in one image**. The paper demonstrates simultaneous detection of three different PuzzleBoard sub-patterns in one image (Figure 5 of the paper). This is a useful applicability note for multi-target calibration setups.
- The existing bullet on minimum resolution (5 px / 3.3 px per edge) is correct.
- The existing bullets on complexity, position-encoding locality, error tolerance (40%), backward compatibility are well-grounded.

Section: `relations[]` — relationship-edges audit pass

The page's frontmatter currently has no `relations:` field (the `relatedAlgorithms` / `comparedWith` fields this note originally proposed no longer exist as schema fields on algorithm pages). `sources.references: [harris1988-corner]` is unaffected.

Translated to `relations[]`, with each item re-checked against CLAUDE.md Rule B (cross-domain / different-problem-class pairs get no edge) rather than the old soft `relatedAlgorithms` bucket that no longer exists as an escape hatch:

1. **Status: resolved.** `chess-corners` and puzzleboard are direct competitors in the chessboard X-corner detection problem space. Per `docs/README.md` §4 tiebreaker, chess-corners (2013) hosts the comparison; puzzleboard (2024) carries a Remarks pointer. `content/algorithms/chess-corners.md` now carries `{ type: compared_with, target: puzzleboard, confidence: high }`, and `## When to choose ChESS over PuzzleBoard` is live with the pointer bullet on the puzzleboard page.

2. **`rochade` gets no `relations[]` entry.** ROCHADE (2014) is the immediate predecessor in the chessboard X-corner family with subpixel saddle fitting that the PuzzleBoard paper explicitly mentions as a substitutable alternative for step 4.1 — but this note's own analysis already called out "different problems: full-pattern detection vs self-identifying pattern," which is Rule B. Omit; not a pending task.

3. **`pyramidal-blur-aware-xcorner` gets no `relations[]` entry.** Same reasoning as (2): the PuzzleBoard paper §4.1 lists "pyramid based [1]" subpixel detectors as a substitutable corner-detection step, but this is a shared-component mention, not a same-problem peer relationship — "same family, different sub-problem" is Rule B. Omit.

4. **`ocpad` is the one genuine `compared_with` candidate here — still open.** OCPAD solves the same partial-visibility/occlusion-tolerant checkerboard-detection problem PuzzleBoard solves, but via subgraph matching against a plain pattern rather than bit-encoded self-identification — a real practitioner choice between two occlusion-robust target/detector designs, not a cross-domain pairing. OCPAD (2016) predates PuzzleBoard (2024) → OCPAD hosts: `{ type: compared_with, target: puzzleboard, confidence: medium }` on `content/algorithms/ocpad.md` (medium, not high, because the two papers do not cite each other — this is an editorial inference, not a paper-stated comparison). Not yet applied — `ocpad.md` carries no `relations:` field currently (see the companion `fuersattel2016-ocpad` note, which flags the same open item).

5. **`harris-corner-detector` gets no `relations[]` entry.** The Hessian-vs-structure-tensor distinction in §4.1 is a substantive technical contrast, but it explains a *design choice* (why PuzzleBoard's saddle response doesn't use Harris) rather than a same-problem peer choice — Harris is a general-purpose corner detector, PuzzleBoard is a full pattern-decoding pipeline that uses a Hessian response as one internal stage. This is Rule B, not `compared_with` or `feeds_into` (PuzzleBoard explicitly does *not* build on Harris — it's a rejected alternative, not an incorporated component). The contrast belongs in Remarks prose only, which this note's earlier "Strengthen the Harris distinction" bullet already covers.

# Provenance

- Paper full text: `docs/papers/.cache/stelldinger2024-puzzleboard.txt` (12 pages, arXiv:2409.20127v1, 30 Sep 2024). HTML at `docs/papers/.cache/stelldinger2024-puzzleboard.html`.
- §1 Introduction (lines 19-95): four motivations — (a) higher number of reference points beats higher-accuracy points if a faster algorithm enables more captures, (b) low-resolution operation enables denser patterns and embedded-system use, (c) occlusion handling, (d) backward compatibility with existing pipelines.
- §2 Previous Work (lines 100-176): comprehensive survey. Direct competitors named: ChArUco, CALTag, ArUco, ARTag, Deltille, UMF, Dothraki. Direct quote from §2 on Harris-vs-Hessian for checkerboard: "we look for negative maxima of the determinant det(H) of the Hessian H" — note the *negative* maxima, equivalent to our positive-maxima formulation when the sign is folded into the response.
- §3 Position Encoding (pages 5-7): construction of the (501, 501; 3, 3)\_4 sub-perfect map from two binary $(3, 3)_2$ de Bruijn rings $A$ (shape $3 \times 167$) and $B$ ($167 \times 3$). LCM(3, 167) = 501 grid period. 18 unique bits per $3 \times 3$ window. 99.33% rotation uniqueness for $3 \times 3$ windows; 100% rotation uniqueness for $4 \times 4$ windows (using all 30 bits including repetitions). L/3 edge-circle diameter geometric proof in Figure 4: under pinhole projection where next square is in front of the camera, the imaged midpoint lies in the second third of the imaged edge.
- §4.1 Checkerboard Corner Detection (pages 8-9): Hessian saddle response $s = f_{xy}^2 - f_{xx} f_{yy} - k(f_{xx} + f_{yy})^2$ with default $k = 1$. Direct quote on Harris distinction: "this filter looks similar but is fundamentally different from the commonly used Harris corner detector det(M) − k · trace(M)² [19], which uses the structure tensor M instead of the Hessian H and is unable to distinguish between checkerboard corners and circular blobs." Centrosymmetric pre-filter (cited as [33]); subpixel by grayscale centroid in 3×3 of non-negative response (cited as [44]).
- §4.2 Neighbor Identification and Grid Reconstruction (page 9): 9-NN works for projection angles ≤ 71.955°. Hessian eigenvectors bisect the black/white sectors at corners; rotating ±45° gives grid axis directions. Kruskal MSF on edges weighted by (length, response); union-find guarantees consistent orientation across merged subtrees.
- §4.3 Position Decoding (pages 10-11): bit read by local thresholding at edge midpoint. Cross-correlation against $A, A', B, B'$ at sizes $3 \times 167$ and $167 \times 3$ gives translation + orientation. Position formula in eq 4 (renumbered in note as the position-decoding definition).
- §4.3 Hamming distance analysis: Tables on pages 10-11 give the cross-correlation values. Minimum Hamming distance at wrong rotation: 396 (for $A \to B$). Combined minimum at wrong rotation/position: 804/1002 bits. Bit-error tolerance: 401/1002 ≈ 40% after averaging.
- §5 Experiments (page 11-): three test calibration boards (7×10, 15×22, 51×71 squares — all sub-windows of the master pattern). Resolution claims: full decode at 5 px/edge; ~15% bit errors at 3.33 px/edge but all positions still derivable via majority voting. Comparison: ChArUco needs ≥25 px/edge for reliable 7×7 ArUco marker decoding. Implementation in C++; runtime benchmarked against OpenCV `findChessboardCornerSB`.
