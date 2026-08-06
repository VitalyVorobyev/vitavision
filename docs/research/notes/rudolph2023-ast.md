---
paper_id: rudolph2023-ast
title: "Asymmetric Student-Teacher Networks for Industrial Anomaly Detection"
authors: ["M. Rudolph", "T. Wehrbein", "B. Rosenhahn", "B. Wandt"]
year: 2023
url: https://arxiv.org/pdf/2210.07829
created: 2026-08-06
relevant_atlas_pages: [resnet, convolutional-neural-network, convolution, feature-descriptors]
---

# Setting

Problem class: semi-supervised (one-class) visual anomaly detection for
industrial defect inspection. Training set contains defect-free examples
only; test set contains both normal and defective examples (§1, §4.1).

Inputs: RGB images from MVTec AD ("MVT2D" in the paper's own shorthand),
side length 700–1024 px, resized to 768×768 px; optionally paired 3D depth
scans from MVTec 3D-AD ("MVT3D"), RGB side length 400–800 px, with a
per-pixel depth value in centimeters used as the only 3D signal (x, y
coordinates are discarded) (§4.1, §4.2.2, Table 1).

Outputs: an image-level anomaly score (used to compute AUROC) and,
secondarily, a per-pixel anomaly-score map usable for defect localization
(pixel-level AUROC). No calibrated probability is produced — the score is
a raw student–teacher L2 distance, meaningful only for ranking/thresholding
within one trained model (§3.2, §4.3).

# Core idea

Two networks share the same frozen-feature input pipeline (ImageNet-pretrained
EfficientNet-B5 features, optional depth channels, sinusoidal positional
encoding) but play different roles:

- **Teacher** `f_t`: a conditional normalizing flow (Real-NVP-style), trained
  by maximum-likelihood density estimation on normal data only — a *pretext
  task*, not used directly for scoring (§3, §3.1).
- **Student** `f_s`: a conventional (non-bijective) fully convolutional
  residual network, trained *after* the teacher is fixed, to regress the
  teacher's per-pixel output on the same normal training data by squared L2
  loss (§3.2, Eq. 4).

At test time the same per-pixel L2 distance between student and teacher
outputs is reused as the anomaly score, aggregated to image level by the
max (if a foreground mask is available) or the mean (RGB-only) over pixels
(§3.2, §4.2.4).

The paper's central architectural claim (quoted, §1): "A student with
similar architecture tends to undesired generalization, such that it
extrapolates similar outputs as the teacher for inputs that are out of the
training distribution, which, in turn, gives an undesired low anomaly
score." The proposed fix, also quoted (§1): "The bijectivity of the
normalizing flow enforces a divergence of teacher outputs for anomalies
compared to normal data. Outside the training distribution the student
cannot imitate this divergence due to its fundamentally different
architecture." In other words: asymmetry is enforced **architecturally**.
A bijective map is, by construction, injective and surjective on its
domain/codomain, so it has no freedom to collapse out-of-distribution
inputs toward in-distribution outputs; an ordinary CNN has no such
guarantee and — the paper's toy 1-D experiment demonstrates (Figure 2) —
empirically tends to interpolate toward the teacher's behavior on
out-of-distribution inputs when it shares the teacher's architecture.

A second motivation layered on top: normalizing-flow likelihoods are
by themselves an unreliable anomaly score. The paper cites Le & Dinh 2021
(their ref [28], "Perfect density models cannot guarantee anomaly
detection") and argues that the student–teacher distance is more robust
than the raw likelihood because student regression *compensates* for
teacher misestimation in both directions: "If a low likelihood of being
normal is incorrectly assigned to normal data, this output can be
predicted by the student, thus still resulting in a small anomaly score.
If a high likelihood of being normal is incorrectly assigned to anomalous
data, this output cannot be predicted by the student, again resulting in a
high anomaly score." (§1, paragraph beginning "The advantage to using a
normalizing flow itself...").

## The normalizing-flow teacher (§3.1)

Real-NVP-based conditional normalizing flow, 4 coupling blocks (§4.2.3).
Input `x ∈ R^(w×h×n_feat)` (feature maps). Within each coupling block the
channels of `x` are split evenly into `x_1`, `x_2` after a random, then
fixed, channel permutation. Each part is concatenated with a static
positional-encoding condition `c` and fed through per-block subnetworks
`s_i`, `t_i` to produce scale/shift parameters for an affine transform of
the other part:

```
y_2 = x_2 ⊙ e^{s_1([x_1,c])} + t_1([x_1,c])          (Eq. 1, line 1)
y_1 = x_1 ⊙ e^{s_2([x_2,c])} + t_2([x_2,c])           (Eq. 1, line 2)
```

(`⊙` = element-wise product, `[·,·]` = concatenation.) Block output is the
concatenation of `y_1`, `y_2`; dimensionality is preserved by construction.
Each `(s_i, t_i)` pair is implemented as one shallow convolutional
subnetwork `r_i` with a single hidden layer and ReLU activations, output
split into the scale and shift components (§4.2.3).

Density objective via the change-of-variables formula, with `z` the flow's
final output:

```
p_X(x) = p_Z(z) · |det(∂z/∂x)|                         (Eq. 2)
```

with `p_Z = N(0, I)`. The teacher minimizes the mean, over (foreground)
pixels `(i,j)`, of the per-pixel negative log likelihood:

```
L^t_ij = -log p_X(x_ij) = ||z_ij||_2^2 / 2 - log|det(∂z_ij/∂x_ij)|   (Eq. 3)
```

Training stabilizers: alpha-clamping of the affine-coupling scale
coefficients (method from Ardizzone et al., their ref [4]) and the
"gamma-trick" (from the same authors' own prior CS-Flow paper, ref [39])
(§3.1). Positional encoding: sinusoidal (Vaswani et al. attention-style,
ref [50]) over the spatial dimensions, 32 channels, used as the flow's
conditioning input `c`, "similar to" Gudovskiy et al.'s CFlow-AD (ref
[22]) — purpose stated as relating "the occurrence of a feature... to its
position to detect anomalies such as misplaced objects" (§3, last
paragraph before Figure 3).

## The student (§3.2)

Conventional (non-injective, non-surjective) fully convolutional network
with residual blocks (Figure 4). Each residual block: two sequences of
3×3 conv → batch normalization → leaky-ReLU. First/last layers are plain
convolutions that change the feature dimensionality to match the teacher's
output shape, enabling pixel-wise distance computation. Regression loss,
per pixel:

```
L^s_ij = ||f_s(x)_ij - f_t(x)_ij||_2^2                  (Eq. 4)
```

averaged over (foreground) pixels for the training objective, and reused
unaveraged/aggregated (max or mean pooling, per §3.2) as the anomaly score
at test time.

## Foreground masking (3D only) (§4.2.2)

When 3D data is available, a binary foreground mask `M` (from a fitted
background plane, §4.2.2) is downsampled to feature-map resolution via
bilinear interpolation `f↓` then binarized, and used to zero out the loss
on background pixels:

```
L^masked_ij = L_ij  if f↓(M)_ij > 0,  else 0             (Eq. 5)
```

applied to both the teacher's NLL loss and the student's regression loss
(§4.2.2, immediately preceding Eq. 5).

# Assumptions

1. The frozen ImageNet-pretrained feature extractor (EfficientNet-B5,
   layer 36) yields an embedding in which normal/anomalous separability
   survives — soft, degrades gracefully with domain gap from ImageNet
   (§3, §4.2.1).
2. Training data is defect-free only (the semi-supervised/one-class
   premise) — hard, standard across the whole student–teacher family
   (§3, §4.1).
3. When 3D data is used, the background is assumed static/planar so a
   foreground mask can be obtained by fitting a plane through the depth
   image's 4 corner pixels — hard for the 3D pipeline; the paper states
   this is "reasonable whenever the background is static or planar, which
   is the case for almost all real applications" (§3, §4.2.2).
4. Normal examples in the target domain are "similar to each other and to
   defective products" (§1) — this is presented as the property
   distinguishing industrial inspection from general one-class
   classification, and the method is tuned to that regime.
5. The teacher must remain strictly bijective end-to-end; this is an
   architectural hard constraint (not a training heuristic) because the
   entire asymmetry argument depends on it (§1, §3.1).

# Failure regime

- **Symmetric student–teacher pair** (identical architecture for student
  and teacher) underperforms AST by 1–2 AUROC points on MVT3D 3D and
  3D+RGB inputs, and by much more on RGB: Table 5 reports "NF student
  (symm.)" at 81.8 / 76.0 / 88.9 (3D / RGB / 3D+RGB) versus AST's 83.3 /
  88.0 / 93.7 (§4.4.2, Table 5).
- **Deepening a still-bijective NF student** (doubling coupling blocks to
  8, "NF student (deeper)" in Table 5) only partially recovers
  performance — 81.8 / 76.7 / 92.7 — confirming that asymmetry from added
  depth alone is weaker than asymmetry from a structurally different
  (non-bijective) architecture (§4.4.2, Table 5).
- **Localization** trails PatchCore on MVT2D pixel-level AUROC: AST 95.0 ±
  0.03 vs PatchCore 98.4 (Table 4). The paper is explicit that this is a
  secondary objective: "Despite image-level detection is the focus of this
  work, our method is able to localize defects for practical purposes with
  an AUROC of 95% or 97.6%" (Table 4 caption).
- On MVT2D "objects," PatchCore edges out AST on the category average
  (99.2 vs AST's 99.1, Table 2); the paper concedes this directly: "we
  outperform previous work by a comparatively large margin of 0.9%,
  except for PatchCore" (§4.4.1).
- Weakest individual MVT3D classes for AST, per modality (Table 3, column
  order verified against the source table markup): 3D-only — Cable Gland
  57.6 ± 6.9, Tire 61.1 ± 3.4; RGB-only — Potato 61.3 ± 2.4; RGB+3D —
  Tire 79.7 ± 1.0. Tire is the weakest or near-weakest category in every
  modality; Potato is a striking RGB-only outlier (61.3) that recovers to
  98.1 once 3D is added, showing this method's per-category variance is
  large and modality-dependent rather than uniform.
- **Foreground masking is load-bearing, not optional**: on 3D-only input
  without a mask, teacher AUROC is 59.4 and AST is 67.2; with the mask,
  82.2 and 83.3 respectively (Table 7) — roughly a 20-point swing from
  masking alone.
- **Positional encoding** gives +1.4 points on 3D-only AST when the
  foreground mask is also on: 81.9 (no pos-enc, mask on) → 83.3 (pos-enc
  on, mask on), matching the paper's own stated figure — "positional
  encoding improves the detection by 1.4% of our AST-pair when trained
  with 3D data as the only input" (§4.4.2, Table 7). The effect is
  reported to vanish once RGB and 3D are combined: with the mask on,
  AST is 93.8 without pos-enc vs 93.7 with pos-enc in the 3D+RGB rows —
  flat to within noise (Table 7) — the paper still recommends always
  including it since the cost is "just 32 additional channels" (§4.4.2).

# Numerical sensitivity

- Alpha-clamping of the flow's affine-coupling scale coefficients (method
  of Ardizzone et al. [4]) is stated as necessary "to stabilize training"
  (§3.1); the clamp value is dataset-dependent: `α=3` for MVT2D, `α=1.9`
  for MVT3D (§4.2.3) — no principled rule is given for choosing it beyond
  per-dataset tuning.
- The "gamma-trick" (from the authors' own prior CS-Flow work, ref [39])
  is invoked alongside alpha-clamping for stabilization (§3.1); this note
  cannot find a gamma value stated in this paper — mark uncertain (`?`).
- The channel-split permutation inside each coupling block is "randomly
  choosing a permutation that remains fixed" (§3.1) — a fixed random
  hyperparameter realization per training run, not learned or explicitly
  seeded/reported.
- Teacher hidden channel width differs sharply by dataset: 1024 for
  MVT2D vs 64 for MVT3D (§4.2.3) — no stated justification beyond dataset
  differences; treat as empirically tuned (`?` on the underlying reason).
- Student depth/width tradeoff is characterized quantitatively (Table 6,
  measured on MVT3D 3D+RGB, NVIDIA RTX 1080 Ti):

  | `n_st_blocks` | AUROC [%] | Params [M] | Inference time [ms] |
  |---|---|---|---|
  | 1 | 92.8 | 26.0 | 3.4 |
  | 2 | 93.3 | 44.8 | 6.1 |
  | 4 (default) | 93.7 | 82.6 | 10.4 |
  | 8 | 93.7 | 151.1 | 19.8 |
  | 12 | 93.8 | 233.6 | 29.4 |
  | teacher only | 90.9 | 3.8 | 4.5 |

  The paper's own read: performance is "almost saturated after 4 blocks,"
  and since "the remaining potential in detection performance is not in
  relation to the linearly increasing additional computational effort per
  block," 4 blocks is chosen as the default (§4.4.2). This table is **the
  only inference-time/throughput data this paper reports** — see the note
  on latency evidence below.
- Depth preprocessing constants (§4.2.2): missing-depth fill by
  8-connected-neighborhood averaging over 3 iterations; background
  modeled as a plane interpolated from the 4 depth-image corner pixels;
  foreground threshold at 7 mm from that background plane; masks resized
  to 192×192 via bilinear downsampling, then pixel-unshuffled with factor
  `d=8` to match the 24×24 feature-map grid; foreground mask dilated with
  an 8×8 square structuring element; per-sample mean-foreground-depth
  subtraction, background pixels then set to exactly 0. All of these are
  absolute physical/pixel constants (mm, pixel counts), not scale-free —
  sensitivity to depth-sensor calibration or a different sensor's noise
  floor is not discussed in the paper (`?`).

# Applicability

- Use when: only defect-free training images are available (semi-supervised
  / one-class industrial inspection), RGB and/or aligned 3D depth is
  available, and image-level anomaly *detection* — not precise pixel-level
  *segmentation* — is the priority.
- Don't use when: pixel-precise localization is the primary deliverable
  (PatchCore beats AST on segmentation AUROC, Table 4); the domain lacks
  the "normal examples similar to each other and to defects" structure
  the paper assumes (§1); or the deployment budget cannot afford both a
  Real-NVP teacher pass and a ≥4-block CNN student pass per image (Table 6
  gives concrete params/latency to budget against, on a specific GPU).
- Compared against (all in Tables 2–4): PatchCore (nearest-neighbor memory
  bank, ref [36]), CS-Flow (density-only normalizing flow, ref [39]),
  CFlow-AD (conditional normalizing flow with position-conditioned
  density, ref [22]), Uninformed Students (symmetric-architecture
  student-teacher, ref [7]), STFPM (feature-pyramid student-teacher, ref
  [51]), PaDiM (Mahalanobis-distance patch modeling, ref [12]), DifferNet
  (normalizing-flow likelihood scoring, ref [38]).

# Connections

- Builds on: [bergmann2020-uninformed-students]  — the student-teacher AD
  framing this paper critiques and extends; cited as ref [7] and used
  directly as an evaluation baseline (§2.1, Table 2, Table 3).
- Builds on: [bergmann2019-mvtec-ad]  — MVTec AD is the primary 2D
  benchmark (Table 1, Table 2).
- Compared against (peer, not lineage): [roth2022-patchcore]  — PatchCore
  beats AST on the MVT2D objects average and on MVT2D pixel-level AUROC
  (Table 2, Table 4); AST beats PatchCore on MVT3D across all modalities
  (Table 3).
- Downstream, per this repo's paper index (not verified from within this
  paper, since AST predates it): [batzner2023-efficientad]  — EfficientAD
  names AST as a direct rival in the same student-teacher family; see
  Atlas update plan below for what this note can and cannot support about
  that relationship.

Not linked (not registered in `docs/papers/index.yaml`, so omitted from
typed Connections despite being cited extensively as comparison baselines
throughout §2 and Tables 2–4): CFlow-AD (Gudovskiy et al., ref [22]),
CS-Flow (Rudolph et al., ref [39] — a prior paper by this paper's own
first author), STFPM (Wang et al., ref [51]), PaDiM (Defard et al., ref
[12]). Flagging in case any of these gets registered later (`?`).

# Atlas update plan

This paper is ingested as a **supplementary source only** — it does not
receive its own Atlas page in this batch. AST is the direct architectural
rival to EfficientAD within the student–teacher family, so its role here
is to ground the student-teacher-family discussion on pages planned
elsewhere in this batch. All three pages named below are **planned, not
yet on disk** (`ls content/{algorithms,models,concepts}/` confirms none of
`visual-anomaly-detection.md`, `efficientad.md`, `uninformed-students.md`
exist as of this note) — nothing here should be read as a resolved
Atlas link, and no `relations[]` entries are proposed, since the Atlas
authoring policy requires relation targets to already resolve to a
non-draft on-disk page.

- **`visual-anomaly-detection`** (planned survey concept page): this note
  supplies the **architectural-vs-loss-induced asymmetry** axis as a
  genuine decision dimension for that page's decision table. AST's
  position, precisely: student-teacher pairs with identical/similar
  architectures fail because the student generalizes to anomalies (quoted
  above, §1); the fix is to make the teacher a *bijective* normalizing
  flow and the student a *non-bijective* conventional CNN, so asymmetry is
  architectural and provable — bijectivity forces the teacher to diverge
  on out-of-distribution inputs, and the student is structurally unable to
  follow. This paper does **not** discuss or claim a loss-induced
  alternative; any claim that EfficientAD instead achieves asymmetry
  through its loss function is sourced from the outer task's framing of
  EfficientAD, not from this paper, and must be verified against
  EfficientAD's own text when that note/page is authored.
- **`efficientad`** (planned model page): supplies (a) the mechanism
  contrast above, and (b) the only latency/throughput evidence this paper
  itself reports — the student-depth/inference-time sweep in Table 6
  (measured on an NVIDIA RTX 1080 Ti): 3.4 ms at 1 residual block up to
  29.4 ms at 12 blocks, with the paper's chosen default (4 blocks) at
  10.4 ms; the teacher alone measured separately at 4.5 ms. **This paper
  reports no single end-to-end/full-pipeline throughput or FPS figure**,
  and — because AST (WACV 2023, submitted based on the arXiv timestamp
  before EfficientAD) predates EfficientAD — it makes no comparison to
  EfficientAD at all. Any "24× latency reduction" claim attributed to
  EfficientAD over AST must be sourced from EfficientAD's own paper, not
  this one; this note only supplies AST's self-reported baseline numbers
  for that future comparison to be checked against.
- **`uninformed-students`** (planned model page, Bergmann et al. 2020,
  registered as `bergmann2020-uninformed-students`): supplies the direct
  lineage and the concrete performance gap AST reports against it. AST
  identifies Uninformed Students as exhibiting exactly the undesired
  generalization failure motivating this paper (§1, §2.1) and cites it as
  ref [7]; as an MVT2D detection baseline, Uninformed Students scores a
  93.2 mean AUROC versus AST's 99.2 (Table 2) — AST calls this out as "a
  significant improvement of 6%" specifically against the two prior
  student-teacher approaches (§4.4.1). AST (2023) and EfficientAD (2023)
  are two different architectural answers to the failure mode Uninformed
  Students (2020) exposed; when the `uninformed-students` page is
  authored, it can cite this note for both the mechanism critique and the
  Table 2 per-category numbers.

# Provenance

- Abstract: overall claim (asymmetric student-teacher networks, Real-NVP
  teacher + conventional student), state-of-the-art claim on MVTec AD /
  MVTec 3D-AD.
- §1 (Introduction), paragraph 4 ("Several approaches try to solve..."):
  student-teacher framing, refs [5,7,19,51,53]; the undesired-generalization
  critique quote ("A student with similar architecture...").
- §1, paragraph 6 ("These problems motivate us..."): the asymmetry fix
  quote ("The bijectivity of the normalizing flow enforces...").
- §1, paragraph on the density-estimation pretext task ("As a pretext
  task..."): maximum-likelihood framing, citation of Le & Dinh [28]
  ("Perfect density models cannot guarantee anomaly detection"), and the
  compensation argument quote ("The advantage to using a normalizing flow
  itself...").
- §1, contributions bullets: code availability (GitHub,
  github.com/marco-rudolph/ast, footnote 1).
- §2.1 (Student-Teacher Networks): prior work summary — Bergmann et al.
  [7] (ensemble of students, ImageNet-distilled or metric-learned
  teacher), Wang et al. [51] (feature-pyramid regression), Bergmann &
  Sattlegger [5] (point-cloud adaptation), Xiao et al. [53] (transform
  classification); closing claim that all prior work uses identical
  conventional-network architectures for student and teacher.
- §2.2 (Density Estimation): Mahalanobis-distance baseline framing
  [12,35]; normalizing-flow AD lineage [14,22,38,39,41,44]; bijectivity
  property [3,15,34,52]; Rudolph et al. [38,39] (this paper's own prior
  work — vector-based then feature-map-based flows, "cross-convolutions");
  Gudovskiy et al. [22] (CFlow-AD, position-conditioned local density);
  training-instability caveat [4]; Le & Dinh [28] density-parameterization
  caveat.
- §3 (Method), opening paragraphs: two-phase training description
  (teacher first, student second); feature-extractor-as-input framing,
  citing [7,22,39]; 3D-channel concatenation and pixel-unshuffling [56];
  foreground-masking rationale and planar-background assumption;
  positional-encoding citation of Gudovskiy et al. [22] and Vaswani et al.
  [50].
- §3.1 (Teacher): full coupling-block description, Eq. 1 (both lines),
  Eq. 2 (change-of-variables), Eq. 3 (per-pixel NLL loss); alpha-clamping
  citation [4]; gamma-trick citation [39].
- Figure 2: 1-D toy-MLP illustration of symmetric vs. asymmetric
  student-teacher generalization on anomalous data (caption paraphrased
  in Core idea).
- Figure 3: pipeline overview diagram (teacher/student inputs, positional
  encoding, masked losses) — caption paraphrased in Core idea / Setting.
- Figure 4: architecture diagram for teacher (Real-NVP conditional flow)
  and student (convolutional residual network) — caption paraphrased in
  Core idea.
- §3.2 (Student): residual-block composition (two 3×3 conv + batchnorm +
  leaky-ReLU sequences, first/last conv layers for dimension matching);
  Eq. 4 (squared-L2 student loss / anomaly score); max/mean aggregation
  rule for image-level score.
- Table 1: dataset overview (MVT2D vs MVT3D — modality, category count,
  image side length, train/test sample counts, defect-type counts).
- §4.1 (Datasets): MVT2D/MVT3D descriptions, category counts (15 vs 10),
  73 total MVT2D defect types, MVT2D image side length 700–1024 px,
  MVT3D RGB side length 400–800 px.
- §4.2.1 (Image Preprocessing): EfficientNet-B5 layer-36 feature
  extractor citation [47], frozen during training, ImageNet pretraining
  citation [13]; 768×768 resize; resulting 24×24×304 feature maps.
- §4.2.2 (3D Preprocessing): x/y-coordinate discard, cm-scale depth z;
  8-connected-neighborhood fill over 3 iterations; background-plane
  interpolation from 4 corner pixels; 7 mm foreground threshold; mask
  resize to 192×192 via bilinear downsampling; pixel-unshuffling [56]
  with `d=8`; 8×8 square dilation structuring element; per-sample
  mean-foreground-depth subtraction, background set to 0; Eq. 5 (masked
  loss).
- §4.2.3 (Teacher): 4 coupling blocks; 32-channel positional-encoding
  condition; single-hidden-layer subnetworks with ReLU; hidden channel
  size 1024 (MVT2D) / 64 (MVT3D); `α=3` (MVT2D) / `α=1.9` (MVT3D); 240
  epochs (MVT2D) / 72 epochs (MVT3D); Adam optimizer citation [26],
  `β1=0.9`, `β2=0.999`, learning rate `2·10⁻⁴`, weight decay `10⁻⁵`.
- §4.2.4 (Student): `n_st_blocks=4` residual blocks; leaky-ReLU slope 0.2;
  hidden channel size `n_hidden=1024`; epochs/optimizer inherited from
  teacher; max-aggregation with foreground mask, mean-aggregation
  otherwise (RGB only).
- §4.3 (Evaluation Metrics): image-level and pixel-level AUROC definitions.
- Table 2: MVT2D per-category and averaged detection AUROC (textures,
  objects, overall) for AST and 10 baselines (ARNet, DRÆM, GAN, Rippel,
  PatchCore, DifferNet, PaDiM, CFlow, CS-Flow, Uninformed Students,
  STFPM*); AST overall mean 99.2 ± 0.04%; PaDiM average-only note; STFPM*
  reimplementation note.
- Table 3: MVT3D per-category detection AUROC by modality (3D, RGB,
  3D+RGB) for AST and baselines (Voxel GAN/AE/VM, Depth GAN/AE/VM, 1-NN
  FPFH, 3D-ST128, PatchCore, DifferNet, PADiM*, CS-Flow, STFPM*,
  PatchCore+FPFH); AST means 83.3 ± 0.8 (3D), 88.0 ± 0.6 (RGB), 93.7 ±
  0.2 (3D+RGB); ☎-marked entries are unpublished results obtained by
  request from original authors; PatchCore numbers taken from ref [24].
- §4.4.1 (Detection): narrative interpretation of Tables 2–3 — 99.2%
  MVT2D SOTA claim; 0.9%-margin-except-PatchCore statement; 6%/3.6%
  improvement over the two prior student-teacher methods; MVT3D
  improvement margins (5.1% 3D, 5% RGB, 7.2% 3D+RGB); "state-of-the-art in
  21 of 30 cases" claim; 99.1% (MVT2D) vs 86.5% (MVT3D best-prior-work)
  difficulty comparison; PatchCore/FPFH 11% RGB gap statement.
- Table 4: mean pixel-level AUROC (segmentation) over all classes, AST
  95.0 ± 0.03% (MVT2D) / 97.6 ± 0.02% (MVT3D RGB+3D), vs. AE-SSIM (87.0,
  MVT2D only), PatchCore (98.4, MVT2D), PatchCore+FPFH (99.2, MVT3D).
- Figure 5: histogram of AST distances (normal vs. anomalous, class
  "peach," MVT3D) and orthographic-projection visualization of student/
  teacher output pairs — caption paraphrased where relevant.
- §4.4.2 (Ablation Studies): Table 5 setup description (teacher-only
  likelihood scoring vs. symmetric vs. deeper-symmetric vs. AST); Table 6
  setup (student depth vs. AUROC/params/inference-time, RTX 1080 Ti,
  MVT3D 3D+RGB) and the "almost saturated after 4 blocks" reasoning;
  Table 7 setup (positional encoding × foreground mask ablation) and
  interpretation paragraphs.
- Table 5: teacher-only 82.2/69.8/90.9; NF-student-symmetric
  81.8/76.0/88.9; NF-student-deeper 81.8/76.7/92.7; AST 83.3/88.0/93.7
  (3D/RGB/3D+RGB, AUROC %).
- Table 6: `n_st_blocks` ∈ {1,2,4,8,12} → AUROC {92.8, 93.3, 93.7, 93.7,
  93.8}, params[M] {26.0, 44.8, 82.6, 151.1, 233.6}, inference time[ms]
  {3.4, 6.1, 10.4, 19.8, 29.4}; teacher-only row: AUROC 90.9, params
  3.8M, inference time 4.5 ms; hardware stated as NVIDIA RTX 1080 Ti
  (Table 6 caption).
- Table 7: positional-encoding/mask on/off combinations × 3D/RGB/3D+RGB
  inputs, teacher and AST AUROC values as tabulated. Verified row-by-row
  against the source table markup (three rows per input group; RGB has no
  pos-enc+mask combination since masks derive from 3D data, hence "n.a."):
  3D — (no pos-enc, mask): 78.4/81.9; (pos-enc, no mask): 59.4/67.2;
  (pos-enc, mask): 82.2/83.3. RGB — (no pos-enc, no mask): 69.3/87.8;
  (pos-enc, no mask): 69.8/88.0; (pos-enc, mask): n.a./n.a. 3D+RGB —
  (no pos-enc, mask): 90.9/93.8; (pos-enc, no mask): 66.2/84.0; (pos-enc,
  mask): 90.9/93.7 (values are teacher/AST AUROC %).
- §5 (Conclusion): summary claim and future-work statement ("Future work
  could extend the approach to more data domains and improve the
  localization resolution.").
- References list: [4] Ardizzone et al. (alpha-clamping/conditional
  INN), [7] Bergmann et al. 2020 (Uninformed Students), [22] Gudovskiy et
  al. (CFlow-AD), [26] Kingma & Ba (Adam), [28] Le & Dinh (density models
  cannot guarantee AD), [36] Roth et al. (PatchCore), [38],[39] Rudolph
  et al. (DifferNet, CS-Flow), [47] Tan & Le (EfficientNet), [50] Vaswani
  et al. (positional encoding / attention), [51] Wang et al. (STFPM),
  [56] Zhang et al. (pixel-unshuffling / FFDNet).
