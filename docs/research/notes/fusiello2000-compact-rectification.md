---
paper_id: fusiello2000-compact-rectification
title: "A Compact Algorithm for Rectification of Stereo Pairs"
authors: ["A. Fusiello", "E. Trucco", "A. Verri"]
year: 2000
venue: Machine Vision and Applications 12(1):16-22
url: https://fusiello.github.io/papers/mva99.pdf
doi: "10.1007/s001380050120"
created: 2026-07-19
relevant_atlas_pages: [fusiello-compact-rectification]
---

# Setting

**Problem class:** Rectifying a *calibrated* stereo pair — the case where both cameras' intrinsics and extrinsics (pose) are already known from a prior calibration step, as opposed to the "weakly calibrated" case where only point correspondences (equivalently, a fundamental matrix) are available.

**Inputs:**
- The two known perspective projection matrices (PPMs) of the original stereo rig, $\tilde P_{o1}$ and $\tilde P_{o2}$ ("$o$" for "old"), each factorizable as $\tilde P = A[R\mid t]$ (§2, Eq. 2) where $A$ carries the intrinsics ($\alpha_u,\alpha_v,u_0,v_0,\gamma$, Eq. 3) and $[R\mid t]$ the extrinsics. "We assume that the stereo rig is calibrated, i.e., the PPMs $\tilde P_{o1}$ and $\tilde P_{o2}$ are known" (§3, lines 162–164).
- No constraint on rig geometry — general, unconstrained cameras (title/abstract, lines 16–17).

**Outputs:**
- A pair of new ("rectifying") PPMs $\tilde P_{n1}$, $\tilde P_{n2}$ describing virtual cameras obtained by rotating the two original cameras *around their own optical centers* until their focal planes become coplanar and contain the baseline (§3, lines 164–168). This drives both epipoles to infinity, so epipolar lines become parallel; requiring the new $X$-axis parallel to the baseline for both cameras makes the parallel epipolar lines horizontal, and requiring equal intrinsics for both new cameras makes conjugate points share the same row (§3, lines 168–174).
- A pair of $3\times3$ image-plane homographies $T_1, T_2$ that warp the original images into the rectified ones (§4).

**Guarantees:** The paper states no closed-form error bound. Formal proof that the algorithm's construction satisfies the rectification requirements is deferred to a companion technical report: "In [5] we formalize analytically the rectification requirements, and we show that the algorithm given in the present section satisfies those requirements" (lines 179–183). Reference [5] (Fusiello, Trucco & Verri, "Rectification with unconstrained stereo geometry," Heriot-Watt Research Memorandum RM/98/12, 1998) is an unpublished technical report and is **not** registered in `docs/papers/index.yaml`; its proof content is not available to this note (`?`).

# Core idea

The new PPMs keep the **same optical centers** as the old cameras — rectification only re-orients the cameras, it never translates them (§3, lines 196–201; Eq. 9, line 213: $\tilde P_{n1}=A[R\mid -Rc_1]$, $\tilde P_{n2}=A[R\mid -Rc_2]$). The new orientation $R$ is shared by both cameras and is built row-by-row as an orthonormal frame (Eq. 10, lines 156–161: $R=[r_1^\top\; r_2^\top\; r_3^\top]^\top$) from three geometric constraints (§3, lines 166–176):

1. New $X$-axis along the baseline: $r_1=(c_1-c_2)/\lVert c_1-c_2\rVert$.
2. New $Y$-axis orthogonal to $r_1$ and to an arbitrary unit vector $k$: $r_2=k\wedge r_1$. The paper fixes $k$ to the old left camera's $Z$-axis (its viewing direction), "thereby constraining the new $Y$ axis to be orthogonal to both the new $X$ and the old left $Z$" (lines 172–176).
3. New $Z$-axis completing the right-handed frame: $r_3=r_1\wedge r_2$.

The new intrinsic matrix $A$ is shared by both rectified cameras and, per the paper, "can be chosen arbitrarily (see MATLAB code)" (lines 216–217); the reference MATLAB implementation's specific choice is the average of the two old intrinsic matrices with skew forced to zero: `A = (A1 + A2)./2; A(1,2)=0; % no skew` (lines 280–283). Once $\tilde P_{n1}$, $\tilde P_{n2}$ are fixed, rectifying an image reduces to a **per-image $3\times3$ projective warp** (a plain resampling, not a re-triangulation): "the sought transformation is the collinearity given by the $3\times 3$ matrix $T_1=Q_{n1}Q_{o1}^{-1}$" (§4, lines 191–194), derived from the optical-ray equations (Eq. 12, lines 206–210) under the constraint that rectification does not move the optical center, giving $\tilde m_{n1}=\lambda\, Q_{n1}Q_{o1}^{-1}\tilde m_{o1}$ (Eq. 13, lines 213–215) where $\lambda$ is an arbitrary homogeneous scale factor. The MATLAB code computes this as `T1 = Pn1(1:3,1:3) * inv(Po1(1:3,1:3))` (lines 291–293), i.e. $T_1=Q_{n1}Q_{o1}^{-1}$ using the leading $3\times3$ blocks of the new/old PPMs. Applying $T_1$ to the original left image produces the rectified image; "the pixels (integer-coordinate positions) of the rectified image correspond, in general, to non-integer positions on the original image plane. Therefore, the gray levels of the rectified image are computed by bilinear interpolation" (lines 222–227). 3-D reconstruction by triangulation can then be performed directly from the rectified images using the new PPMs $P_{n1},P_{n2}$ (lines 229–230).

# Assumptions

1. **Stereo rig is calibrated** (hard): both old PPMs $\tilde P_{o1},\tilde P_{o2}$ must be known from a prior calibration; the method has no mechanism to work from point correspondences alone (§3, lines 162–164).
2. **Pinhole camera model** (hard): the derivation relies on the standard perspective-projection factorization $\tilde P=A[R\mid t]$ (§2, Eq. 2) and the optical-ray parametrization $w=c+\lambda Q^{-1}\tilde m$ (§2, Eq. 8, referenced at line 202 of the cache's §2 discussion).
3. **Optical axis not parallel to the baseline** (hard, degenerate failure): "This algorithm fails when the optical axis is parallel to the baseline, i.e., when there is a pure forward motion" (lines 177–178) — under pure forward motion, $k$ (the old left camera's $Z$-axis) is parallel to $r_1$ (the baseline direction), so $r_2=k\wedge r_1\to 0$ and the new $Y$-axis is undefined.
4. **Both cameras end up sharing the same intrinsics** (soft, method-imposed rather than physically necessary): required "to have a proper rectification" so that conjugate points share the same row (lines 170–174); the specific shared-$A$ choice (average of old intrinsics, skew zeroed) is an implementation choice, not a derived necessity — the paper explicitly says $A$ "can be chosen arbitrarily" (lines 216–217).
5. **$k$ is chosen as the old left camera's viewing direction** (soft, arbitrary by construction): "In point 2, $k$ is an arbitrary unit vector, that fixes the position of the new $Y$ axis in the plane orthogonal to $X$" (lines 172–174) — any other unit vector not parallel to the baseline would also produce a valid (if differently-oriented) rectified frame; the paper's specific choice keeps the rectified cameras looking roughly in the original left-camera viewing direction.

# Failure regime

- **Pure forward motion (optical axis ∥ baseline):** the algorithm fails outright — the cross product defining the new $Y$-axis degenerates to the zero vector (lines 177–178). No fallback or regularization is described in the cache.
- **Near-degenerate geometry (optical axis nearly parallel to the baseline):** not explicitly discussed in the paper (`?`), but by the same construction $\lVert r_2\rVert=\lVert k\wedge r_1\rVert\to 0$ as the angle between $k$ and the baseline shrinks, so the normalized axis `v2'/norm(v2)` (lines 274–276) becomes numerically ill-conditioned before the hard failure point is reached.
- **Weakly-calibrated / uncalibrated rigs:** out of scope by construction — the method requires known PPMs; it does not degrade gracefully to the point-correspondence-only case. The paper explicitly distinguishes this from concurrent work solving the weakly-calibrated problem (lines 26–32, discussed in Applicability below).
- **Restrictive-geometry priors in prior work, avoided here:** the paper notes competing methods "assume a very restrictive geometry (parallel vertical axes of the camera reference frames)" (lines 27–29, referring to [11], not registered) as a failure mode of *other* algorithms that this method's general-geometry construction avoids.

# Numerical sensitivity

- **PPM factorization via `art()`:** the reference implementation factors an old PPM as $Q=\mathrm{inv}(P(1{:}3,1{:}3))$, `[U,B] = qr(Q)`, then $R=U^{-1}$, $t=Bt_{col}$, $A=B^{-1}$, normalized by `A = A ./ A(3,3)` (lines 224–233). This is an RQ-via-QR-of-the-inverse trick; conditioning depends on how well-conditioned $P(1{:}3,1{:}3)$ is. The paper does not discuss numerical conditioning of this step (`?`).
- **Scale normalization:** `A = A ./A(3,3)` (line 233) removes the arbitrary homogeneous scale factor by fixing $A_{33}=1$; this is required because PPMs are only defined up to scale (Eq. 1, $\lambda\tilde m=\tilde P\tilde w$).
- **Axis normalization / division by a possibly-small norm:** `R = [v1'/norm(v1); v2'/norm(v2); v3'/norm(v3)]` (lines 274–276) — `norm(v1)` is the baseline length (safe unless the two optical centers coincide) but `norm(v2)` shrinks toward zero as the rig approaches the pure-forward-motion degeneracy described above, amplifying numerical noise in the new $Y$/$Z$ axes near that regime.
- **Shared new intrinsics forcing skew to zero:** `A(1,2)=0; % no skew` (line 282) is an implementation choice, not derived from either camera's actual calibrated skew; if the true cameras have non-negligible skew this substitution is a modeling approximation rather than an exact match to either camera's intrinsics (paper does not quantify the resulting error — `?`).
- **Resampling by bilinear interpolation:** rectified-pixel gray levels are always interpolated from non-integer source coordinates (lines 224–227); the paper does not discuss interpolation error or anti-aliasing beyond stating that bilinear interpolation is used.
- **Ad hoc recentring offset in the reported experiment:** in the "Sport" stereo-pair experiment (image size $768\times576$), the authors add a manual principal-point shift, `A(1,3) = A(1,3) + 160`, "to keep the rectified image in the center of the $768\times576$ window" (lines 372–376) — this constant is specific to that dataset/window size, not a general formula; readers must re-derive an analogous offset for their own image dimensions.

# Applicability

- **Use when:** the stereo rig is already calibrated (both cameras' intrinsics and extrinsics known), the rig geometry is general/unconstrained (no assumption of parallel or near-parallel optical axes), and a simple, compact, easily-reproducible rectification routine is wanted — the paper's own framing emphasizes this: "given the shortage of easily reproducible, easily accessible and clearly stated algorithms we have made the code available on the Web" (lines 59–62), and the abstract advertises it as "compact (22-line MATLAB code) and easily reproducible" (lines 19–20). Also use when subsequent 3-D reconstruction must be performed directly from the rectified images/PPMs, since the paper reports negligible accuracy loss from doing so (see below).
- **Don't use when:** only point correspondences between the two images are available (no metric calibration) — this method has no fallback to the weakly-calibrated case; use a projective-rectification method instead (see "Compared against"). Also don't use when the optical axis is parallel to the baseline (pure forward motion; hard failure, lines 177–178).
- **Compared against:** Ayache & Lustman 1991 [ref 1 in the paper's bibliography; not registered in `docs/papers/index.yaml`] — the direct predecessor this paper explicitly "improves and extends," criticized in the introduction for hand-crafting "a matrix satisfying a number of constraints" where "the distinction between necessary and arbitrary constraints is unclear" (lines 22–26). Also compared/contrasted, as concurrent "weakly calibrated" alternatives solving a different-input-availability problem: Hartley 1999 "Theory and practice of projective rectification" (registered as `hartley1999-projective-rectification`; cited both among the "weakly calibrated" algorithms at lines 29–32 and again among "latest work" at lines 46–48), Loop & Zhang 1999 "Computing rectifying homographies for stereo vision" (registered as `loop1999-rectifying-homographies`; lines 46–48), and Pollefeys, Koch & Van Gool 1999 "A simple and efficient rectification method for general motion" (registered as `pollefeys1999-polar-rectification`; lines 46–48). The paper states it does not address rectified-image distortion minimization, which some of this concurrent work targets, "partially because distortion is less severe than in the weakly calibrated case" (lines 51–54).

**Editorial aside — not a citable primary source in this repo.** Jean-Yves Bouguet's related calibrated-rectification approach (used in the OpenCV / Camera Calibration Toolbox lineage) splits the rectifying rotation half-and-half between the two cameras — each camera rotates by half the angle needed to align them, rather than one camera's frame (here, the old left camera's $Z$-axis) anchoring the shared new orientation as Fusiello et al. do. Splitting the rotation halves the maximum per-camera reprojection distortion relative to rotating only one camera fully to match the other. Bouguet's toolbox also exposes an `alpha` parameter trading off between showing all original pixels (with black borders introduced) and showing no black borders (with some source pixels cropped) — a valid-ROI/scaling concern this Fusiello paper does not address at all (its own experiments instead manually crop and shift the output window, see Numerical sensitivity above). This paragraph is background, not a citable primary source in this repo — no `bouguet-*` entry exists in `docs/papers/index.yaml`; do not cite it in Provenance; do not add it to Connections' Builds-on/Enables lists. It is general CV-community knowledge, not sourced from the Fusiello paper itself.

# Connections

- Builds on: [] — Ayache & Lustman 1991 (reference [1] in the paper's own bibliography) is the explicit predecessor ("Our work improves and extends [1]," lines 57–58) but has no registered `paper_id` in `docs/papers/index.yaml` as of this writing, so it cannot be listed here.
- Enables: [] — no paper currently registered in `docs/papers/index.yaml` lists `fusiello2000-compact-rectification` in its `cites:` field as of this writing.
- Refutes / supersedes: [] — this is not a supersession relationship. The paper positions itself as a more compact, reproducible alternative to Ayache & Lustman's hand-crafted calibrated-rectification algorithm, and as complementary to (not competing with, since the input assumptions differ) the concurrent weakly-calibrated/projective-rectification methods of Hartley 1999, Loop & Zhang 1999, and Pollefeys et al. 1999 — see Applicability above and the `compared_with` relation to `hartley-projective-rectification` in the Atlas update plan below.

Note for the future page-author: none of `hartley-projective-rectification`, `stereo-rectification` (concept), or `fusiello-compact-rectification` (the new page this note proposes) currently exist on disk under `content/**` (verified by filesystem check at note-authoring time). This is expected — they are planned pages, not an error.

# Atlas update plan

## NEW: fusiello-compact-rectification

Type: algorithm
Category/tasks: [stereo-rectification]
Tags: ["stereo", "two-view-geometry", "classical"]
Domain: geometry
Difficulty: intermediate
Primary source: fusiello2000-compact-rectification
Prerequisites: [stereo-rectification, pinhole-camera-model, pose-estimation, epipolar-geometry]
Sources:
  primary: fusiello2000-compact-rectification
  references: [hartley1999-projective-rectification, loop1999-rectifying-homographies, pollefeys1999-polar-rectification]
Relations:
  - { type: compared_with, target: hartley-projective-rectification, confidence: high, caution: "Requires known projection matrices; the 1999 uncalibrated methods need only F." }

**Goal:**
Given a calibrated stereo rig — two known perspective projection matrices $\tilde P_{o1}$, $\tilde P_{o2}$ obtained by prior calibration — compute a pair of rectifying projection matrices $\tilde P_{n1}$, $\tilde P_{n2}$ describing virtual cameras that share the same optical centers as the originals but a common orientation and common intrinsics, chosen so both new image planes are coplanar, contain the baseline, and have their (shared) $X$-axis parallel to the baseline. The result: epipoles at infinity, conjugate epipolar lines parallel and horizontal, and conjugate points sharing the same row — so dense stereo correspondence search reduces to a 1-D horizontal search. The whole construction is expressible in 22 lines of MATLAB, and reconstructing 3-D points by triangulation directly from the rectified images introduces no appreciable accuracy loss versus reconstructing from the originals.

**Algorithm:**
1. Factor each old PPM into intrinsics/extrinsics: $\tilde P_o = A[R\mid t]$; recover the optical center $c=-Q^{-1}\tilde q$ (old cameras' positions are reused unchanged).
2. Build the new shared rotation $R=[r_1^\top\;r_2^\top\;r_3^\top]^\top$ from: $r_1=(c_1-c_2)/\lVert c_1-c_2\rVert$ (new $X$-axis, along the baseline); $r_2=k\wedge r_1$ with $k$ the old left camera's $Z$-axis (new $Y$-axis, orthogonal to the baseline and to the old viewing direction); $r_3=r_1\wedge r_2$ (new $Z$-axis, completing the right-handed frame).
3. Choose a shared new intrinsic matrix $A$ for both rectified cameras (the reference implementation averages the two old intrinsic matrices and zeroes the skew term).
4. Form the new PPMs with unchanged optical centers: $\tilde P_{n1}=A[R\mid -Rc_1]$, $\tilde P_{n2}=A[R\mid -Rc_2]$.
5. Compute the per-image rectifying homography $T=Q_nQ_o^{-1}$ (leading $3\times3$ blocks of new/old PPM) and warp each original image with it, using bilinear interpolation to resample non-integer source coordinates.

The algorithm fails when the optical axis is parallel to the baseline (pure forward motion), because step 2's cross product for $r_2$ degenerates to zero.

**Implementation:**
The paper's own reference implementation ("rectify.m", quoted in full in §5) factors each PPM via an RQ-via-QR-of-the-inverse trick (`art.m`: `Q=inv(P(1:3,1:3)); [U,B]=qr(Q); R=inv(U); t=B*P(1:3,4); A=inv(B); A=A./A(3,3)`), then computes the optical centers directly as `c = -inv(Po(:,1:3))*Po(:,4)`, builds the three new axis vectors and normalizes them, averages the two old intrinsic matrices with skew forced to zero for the shared new $A$, forms `Pn = A*[R -R*c]`, and derives the rectifying transform as `T = Pn(1:3,1:3) * inv(Po(1:3,1:3))`. Applying $T$ warps the original image; because rectified pixel positions generally map to non-integer source coordinates, gray levels are resampled by bilinear interpolation. In experiments, the authors additionally applied an arbitrary translation and crop to keep the rectified output inside a fixed window matching the input image size.

**Remarks:**
The paper positions this method as a more compact and clearly-derived alternative to Ayache & Lustman's earlier calibrated-rectification algorithm, whose constraint matrix was hand-crafted with an unclear boundary between necessary and arbitrary constraints. It is explicitly *not* a substitute for the weakly-calibrated / uncalibrated rectification methods published around the same time — Hartley's projective rectification, Loop & Zhang's rectifying homographies, and Pollefeys, Koch & Van Gool's general-motion rectification all solve the case where only point correspondences (no metric calibration) are available. See `## When to choose Fusiello over Hartley projective rectification` on this page for the practitioner decision between the calibrated and uncalibrated branches.

**References:**
- Fusiello, A., Trucco, E., Verri, A. "A Compact Algorithm for Rectification of Stereo Pairs." *Machine Vision and Applications* 12(1):16–22, 2000. DOI: 10.1007/s001380050120
- Hartley, R.I. "Theory and practice of projective rectification." *International Journal of Computer Vision* 35(2):1–16, 1999.
- Loop, C., Zhang, Z. "Computing rectifying homographies for stereo vision." *CVPR99*, pp. I:125–131, 1999.
- Pollefeys, M., Koch, R., Van Gool, L. "A simple and efficient rectification method for general motion." *ICCV99*, pp. 496–501, 1999.

# Provenance

> **Note on cache extraction:** `docs/papers/.cache/fusiello2000-compact-rectification.txt` is a `pdftotext` extraction of a two-column journal layout; the left and right columns are frequently interleaved line-by-line in the plain-text output (visible e.g. around lines 196–233, where prose about the rectifying transform and the `art()` MATLAB function are printed on alternating lines). Citations below give the visible cache line range for each claim; where columns interleave, the range spans both columns and is noted.

- **Abstract, "22-line MATLAB code" and "compact" framing:** Abstract, lines 19–20: "It is compact (22-line MATLAB code) and easily reproducible."
- **Abstract, negligible accuracy loss claim:** Abstract, lines 21–23: "...as well as the negligible decrease of the accuracy of 3-D reconstruction performed from the rectified images directly."
- **Ayache 1991 critique (unclear necessary vs. arbitrary constraints):** §1, lines 22–26: "Ayache [1] introduced a rectification algorithm, in which a matrix satisfying a number of constraints is hand-crafted. The distinction between necessary and arbitrary constraints is unclear."
- **"Improves and extends [1]" / compactness claim / code-availability rationale:** §1, lines 55–62 (right column): "This paper presents a novel algorithm rectifying a calibrated stereo rig of unconstrained geometry and mounting general cameras. Our work improves and extends [1]. We obtain basically the same results, but in a more compact and clear way. The algorithm is simple and detailed. Moreover, given the shortage of easily reproducible, easily accessible and clearly stated algorithms we have made the code available on the Web."
- **Weakly-calibrated prior work reference (restrictive geometry, [11]; weakly-calibrated algorithms [6,14,8]):** §1, lines 26–32.
- **"Latest work... includes [10, 9, 12]" and distortion-minimization scope note:** §1, lines 46–54.
- **Calibrated-rig assumption:** §3, lines 162–164: "We assume that the stereo rig is calibrated, i.e., the PPMs $\tilde P_{o1}$ and $\tilde P_{o2}$ are known."
- **Rectification construction (coplanar focal planes containing baseline; equal intrinsics for row alignment):** §3, lines 164–176.
- **Rotation matrix definition, Eq. (10):** §3, lines 156–161.
- **New-axis construction (points 1–3: $r_1$, $r_2=k\wedge r_1$, $r_3=r_1\wedge r_2$; choice of $k$ = old left camera's $Z$-axis):** §3, lines 166–176.
- **Pure-forward-motion failure mode:** §3, lines 177–178: "This algorithm fails when the optical axis is parallel to the baseline, i.e., when there is a pure forward motion."
- **Reference to companion tech report [5] for formal proof (unregistered, content unavailable):** §3, lines 179–183.
- **PPMs share old optical centers, differ only in orientation/intrinsics, Eq. (9):** §3, lines 196–213 (interleaved columns): "In summary: positions (i.e, optical centers) of the new PPMs are the same as the old cameras..." and $\tilde P_{n1}=A[R\mid -Rc_1]$, $\tilde P_{n2}=A[R\mid -Rc_2]$ (line 213).
- **Shared intrinsic matrix "chosen arbitrarily":** §3, lines 216–217: "The intrinsic parameters matrix A is the same for both PPMs, and can be chosen arbitrarily (see MATLAB code)."
- **Rectifying transformation $T_1=Q_{n1}Q_{o1}^{-1}$:** §4, lines 191–195.
- **Optical-ray equations under "rectification does not move the optical center", Eq. (11)–(12):** §4, lines 196–212 (interleaved columns).
- **$\tilde m_{n1}=\lambda Q_{n1}Q_{o1}^{-1}\tilde m_{o1}$, Eq. (13), arbitrary homogeneous scale $\lambda$:** §4, lines 213–218.
- **Bilinear interpolation for non-integer resampled coordinates:** §4, lines 222–227.
- **Triangulation directly from rectified images using $P_{n1},P_{n2}$:** §4, lines 229–230.
- **`art()` MATLAB factorization (QR of $Q^{-1}$, scale normalization by $A_{33}$):** §5 code listing, lines 223–233 (right column, interleaved with left-column prose about §4/§5).
- **"22 lines" self-description in Section 5, code-availability sentence:** §5, lines 236–243.
- **`rectify()` MATLAB body — optical centers, new axes, rotation assembly:** §5 code listing, lines 250–276.
- **Shared new intrinsics = average of old intrinsics, skew zeroed:** §5 code listing, lines 280–283: `A = (A1 + A2)./2; A(1,2)=0; % no skew`.
- **Rectifying transform computed as `T = Pn(1:3,1:3) * inv(Po(1:3,1:3))`:** §5 code listing, lines 291–293.
- **Correctness-test geometries (roll/pitch/yaw, translations for Figs. 3–4):** §6 "Correctness", lines 249–263 (interleaved columns): nearly-rectified case translation $-[100\ 2\ 3]$ mm, roll=1.5°, pitch=2°, yaw=1°; general case translation $-[100\ 20\ 30]$ mm, roll=19°, pitch=32°, yaw=5°.
- **"Sport" stereo pair, image size $768\times576$, manual recentring offset `A(1,3) = A(1,3) + 160`:** §6, lines 372–376.
- **Accuracy-experiment description (synthetic noisy point clouds, Gaussian-perturbed image coordinates and calibration parameters, Linear-Eigen triangulation method, 100 trials per point in Figs. 7–8):** §6 "Accuracy", lines 374–394 (interleaved columns).
- **No single numeric accuracy-loss figure found in the cache text (`?`):** the paper reports the result only graphically (Figs. 7–8, relative-error-vs-noise curves comparing rectified-image reconstruction against unrectified-image reconstruction) and qualitatively in the conclusion — "Our tests show that reconstructing from the rectified image does not introduce appreciable errors compared with reconstructing from the original images" (§7, lines 469–471) — no specific percentage or numeric threshold is stated anywhere in the extracted text; do not attribute one to this paper.
- **Reference-list cross-check against `docs/papers/index.yaml` (for `Sources.references` curation):** checked the full References section (cache lines 397–489) for author names matching registered paper ids (searched for "Zhang", "Hartley", "Tsai", "Faugeras", "Ayache", "Robert", "Pollefeys", "Loop"). Findings:
  - "Zhang" appears exactly once, in reference [10]: "C. Loop and Z. Zhang. Computing rectifying homographies for stero vision. In CVPR99, pages I:125–131, 1999" (line 442 area) — this is **not** `zhang2000-flexible` ("A Flexible New Technique for Camera Calibration," Zhang, 2000); it is the distinct paper registered as `loop1999-rectifying-homographies`. The orchestrator's default suggestion of `zhang2000-flexible` is therefore **not supported by this paper's bibliography** and was dropped.
  - Reference [8], "R.I. Hartley. Theory and practice of projective rectification. International Journal of Computer Vision, 35(2):1–16, 1999" (lines 430–438), matches the registered id `hartley1999-projective-rectification` exactly (same title, author, year, venue, page range).
  - Reference [12], "M. Pollefeys, R. Koch, and L. VanGool. A simple and efficient rectification method for general motion. In ICCV99, pages 496–501, 1999" (lines 452–457), matches the registered id `pollefeys1999-polar-rectification` exactly (same title, authors, year, venue).
  - "Tsai", "Faugeras" (as sole/first author), "Ayache" (beyond reference [1], which is not registered), and "Robert" (references [13], [14]) produced no matches against any registered id in `docs/papers/index.yaml` — none of Ayache & Lustman 1991, Faugeras's 1993 book, Robert 1996, or Robert et al. 1997 are registered as papers in this repo.
  - Final curated `Sources.references`: `[hartley1999-projective-rectification, loop1999-rectifying-homographies, pollefeys1999-polar-rectification]` — all three are genuine bibliography citations of this paper (confirmed above) and all three exist as registered ids in `docs/papers/index.yaml`.
