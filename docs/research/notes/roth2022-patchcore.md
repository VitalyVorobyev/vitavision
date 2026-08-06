---
paper_id: roth2022-patchcore
title: "Towards Total Recall in Industrial Anomaly Detection"
authors: ["K. Roth", "L. Pemula", "J. Zepeda", "B. Schölkopf", "T. Brox", "P. Gehler"]
year: 2022
url: https://arxiv.org/pdf/2106.08265
created: 2026-08-06
relevant_atlas_pages: [resnet, convolutional-neural-network, convolution, feature-descriptors, feature-matching, dinov2, image-pyramid]
---

# Setting

Cold-start (one-class / unsupervised) visual anomaly detection: fit a detector
using **only nominal (defect-free) example images** of a fixed product/scene
category, with no anomalous examples and no fine-tuning on the target domain.
At test time the model must (a) classify a whole image as nominal or
anomalous, and (b) produce a pixel-level anomaly segmentation map.

- Input: RGB images, resized to 256×256 and center-cropped to 224×224 for the
  main MVTec AD experiments (larger 280×280 / 320×320 crops used only for the
  higher-accuracy ensemble configuration in Table 4).
- Output: a scalar image-level anomaly score `s ∈ ℝ` (thresholded for
  classification) and a same-resolution anomaly segmentation map produced by
  bilinear upsampling of per-patch scores followed by Gaussian smoothing with
  kernel width `σ = 4` (not tuned).

# Core idea

PatchCore represents each nominal training image as a dense grid of
**locally aware, mid-level patch features** extracted from an
ImageNet-pretrained CNN backbone (default WideResNet-50, blocks 2 and 3), and
collects every such patch feature, from every nominal training image, into a
single **memory bank** `M`. Because `M` grows with dataset size and becomes
too large to search or store cheaply, PatchCore reduces it via a **greedy
coreset subsampling** step that selects a small subset of `M` which still
covers the same region of patch-feature space (a minimax facility-location /
farthest-point selection), made tractable on high-dimensional CNN features by
first randomly projecting to a lower dimension (Johnson–Lindenstrauss). At
test time, each patch feature of a test image is matched to its nearest
neighbour in the (subsampled) memory bank by L2 distance; the maximum such
distance over all patches is the raw image anomaly score, which is then
**reweighted** by how isolated the matched nominal feature itself is relative
to its own neighbours in the memory bank (rewarding matches to nominal
regions that are themselves rare/borderline). The same per-patch distances,
realigned to their spatial position and upsampled, give the segmentation map.

# Assumptions

1. Nominal training images and test images share scene/object category and
   are captured under roughly comparable framing; the method does no
   explicit cross-image spatial alignment beyond matching patches by
   feature-space nearest neighbour (soft — degrades gracefully, no alignment
   guarantee is stated or tested by the paper).
2. ImageNet-pretrained backbone features transfer usefully to the target
   industrial domain **without further adaptation**. The paper's own
   Limitations section states this directly: *"applicability is generally
   limited by the transferability of the pretrained features leveraged"*
   (soft in principle, but the authors flag it as a real constraint and
   propose feature adaptation as unexplored future work).
3. The chosen patch receptive field (mid-level backbone features, `p = 3`
   local-neighbourhood aggregation) is large enough to capture anomalous
   evidence but not so large/deep that features become dominated by generic
   ImageNet-classification semantics (hard — §3.1 and §4.4.1/Fig. 4 show an
   explicit accuracy optimum on both neighbourhood size and hierarchy depth;
   moving away from it in either direction measurably hurts performance).
4. At least one truly anomalous patch is present anywhere in an anomalous
   test image (hard — the image-level score is a **max** over per-patch
   nearest-neighbour distances, Eq. 6, so an anomaly confined to zero
   sampled patches cannot be detected at the image level by construction).
5. The coreset target size is set large enough to still cover the patch
   feature-space support; going too small loses recall (empirically the
   paper finds this only becomes a problem well below the 1% subsampling
   level it evaluates — §4.4.2, Fig. 5).

# Failure regime

- **Frozen-feature domain gap.** Stated directly by the authors as the
  paper's core limitation: accuracy is bounded by how well ImageNet features
  transfer to the inspected domain; PatchCore does no target-domain
  adaptation of the backbone (§ Limitations).
- **False positives** (analysed post-hoc at the F1-optimal threshold,
  Appendix C.4 / Fig. S1, 19 total): dominated by (a) genuine labelling
  ambiguity — image changes that a human annotator could plausibly have
  called either nominal or anomalous, and (b) high nominal variance that
  resembles an anomaly; the authors note (b) is in principle addressable by
  giving the memory bank some domain adaptation, which PatchCore
  deliberately omits.
- **False negatives** (23 total, Fig. S2): most commonly the anomaly *is*
  localized in the per-patch score map but receives insufficient aggregate
  weight to cross the image-level threshold; other causes are high nominal
  variance masking a real anomaly, and fine-grained anomalies that need
  higher input resolution than the evaluated 224×224 to be resolved; one
  isolated case is lost entirely to a preprocessing crop that removed the
  anomalous region.
- **Naive memory-bank reduction degrades badly.** Random subsampling of `M`
  "will lose significant information available in `M`... especially by
  several magnitudes" (§3.2) and visibly misses entire clusters of a
  multi-modal feature distribution (Fig. 3 caption) — this is presented as
  the reason coreset subsampling is necessary, not merely an optimization.
- **Coarser striding loses spatial context.** Increasing the patch-grid
  stride `s` (Eq. 3) to reduce memory-bank size directly costs accuracy:
  image AUROC drops to 97.6% at `s = 2` and 96.8% at `s = 3`, versus the
  default `s = 1` (§4.4.2, last paragraph).
- **Rigid, size-varying inputs.** PaDiM-style patch-position-indexed
  Mahalanobis models cannot be applied directly to the Magnetic Tile Defects
  (MTD) dataset because its images vary in size; PatchCore's shared
  (position-agnostic) memory bank sidesteps this, implying the *inverse*
  failure mode for spatially-rigid competitors rather than for PatchCore
  itself (§4.6).

# Numerical sensitivity

- **Distance metric is raw L2 in CNN feature space**, with no explicit
  normalization step stated in the visible paper text beyond standard
  ImageNet-pretrained-network input preprocessing — feature-scale
  sensitivity to backbone/normalization choice is therefore inherited from
  the backbone, not separately discussed by the authors (`?` — the paper
  does not spell out feature normalization before the L2 comparison, so I
  cannot confirm whether raw or normalized features are actually compared;
  do not assume in downstream page prose without checking the reference
  implementation).
- **Reweighting term uses unstabilized `exp(·)` of raw L2 distances**
  (Eq. 7): `exp‖m^{test,*} − m*‖₂` in the numerator and denominator has no
  stated max-subtraction or clamping, so for backbones/feature scales that
  produce large pairwise distances this is a plausible overflow/precision
  risk in a naive implementation — this is a property directly readable
  from the equation as given, not a claim made by the authors themselves.
- **Coreset selection dimensionality reduction** (Johnson–Lindenstrauss
  random projection `ψ: ℝ^d → ℝ^{d*}`, `d* < d`, §3.2) trades exact coreset
  fidelity for tractable greedy selection time; the paper does not state the
  target dimensionality `d*` or the reweighting neighbourhood size `b` in
  the visible text (`?` — both symbols are defined but never assigned a
  numeric default in the sections/appendix captured here; treat as
  unresolved rather than inferring standard values from outside knowledge).
- **Neighbourhood size `p` and hierarchy depth are both empirically
  optimum-shaped, not monotonic** (§4.4.1, Fig. 4): too small `p` loses
  context, too large dilutes the anomalous signal; too-shallow hierarchy
  loses semantic abstraction, too-deep hierarchy is over-biased toward
  ImageNet classification. Default is `p = 3`, hierarchy levels `j, j+1 =
  2, 3`.
- **Input resolution affects segmentation more than classification**
  (Appendix C.3): varying image size across 288/360/448 px gives only a
  slight, saturating gain in image-level AUROC but a "consistent increase"
  in segmentation accuracy — resolution budget should be spent for
  localization tasks specifically.
- **Domain shift changes the optimal hierarchy depth.** On mSTC (pedestrian
  surveillance video, closer to natural ImageNet statistics than industrial
  texture), the authors switch to deeper hierarchy levels 3+4 instead of the
  industrial default 2+3, with no other hyperparameter retuning (§4.6) —
  the "mid-level" choice is domain-relative, not a universal constant.

# Applicability

- Use when: the target task is genuinely cold-start (no anomalous training
  examples available or ethically/practically obtainable), many product
  categories must be inspected without a per-category training loop, both
  image-level classification and pixel-level localization are needed, or
  only a small number of nominal training images is available (§4.5 shows
  matching prior SOTA using ~1/5 of the full nominal training set, and
  competitive results down to 1–5 shots).
- Don't use when: the inspected domain is far enough from natural-image
  statistics that frozen ImageNet features carry little useful signal and
  no adaptation stage is acceptable (the paper's own stated limitation); or
  when hard real-time latency well below the ~0.17–0.6 s/image range
  reported (Table 5) is required at large memory-bank scale without adding
  approximate nearest-neighbour search.
- Compared against (within this paper): SPADE, PaDiM (incl. the
  problem-specific-backbone `PaDiM*` variant), PatchSVDD, DifferNet,
  Mahalanobis-AD — none of these currently have Atlas source entries in
  `docs/papers/index.yaml`, so they are named here for context only and are
  not citable as Atlas sources from this note.

# Connections

- Builds on: [bergmann2019-mvtec-ad] (MVTec AD benchmark, the paper's
  primary evaluation dataset and source of the class-average AUROC and PRO
  evaluation protocol used throughout), [bergmann2020-uninformed-students]
  (source of the PRO segmentation metric definition the paper adopts,
  §4.1 "Evaluation Metrics"). Also builds directly on the un-registered
  prior works SPADE and PaDiM, described in the paper as the two most
  closely related predecessors (§2, "Related Works" and "The specific
  components used in PatchCore are most related to SPADE and PaDiM"
  paragraph) — not linkable as Atlas sources since they have no
  `docs/papers/index.yaml` entry.
- Enables (papers already in `docs/papers/index.yaml` that cite this one):
  [rudolph2023-ast], [batzner2023-efficientad].
- Refutes / supersedes: none stated; the paper positions itself as a new
  best-performing method within the same "pretrained-feature memory bank"
  family as SPADE/PaDiM, not as a refutation of them.

# Atlas update plan

## NEW: patchcore
Type: model
Category: anomaly detection
Primary source: this paper

- **Motivation**: cold-start, training-free industrial visual anomaly
  detection — build a memory bank of nominal patch features from a frozen
  ImageNet-pretrained backbone via a single forward pass over nominal data,
  no gradient-based training on the target domain at all. State this
  precisely: "training-free" here means the backbone weights are never
  updated and there is no learned detection head — the only "fitting" step
  is (1) a forward pass to populate the memory bank and (2) the greedy
  coreset selection over that bank, both deterministic/non-gradient
  operations (§1, §3; explicit claim of "without requiring training on the
  dataset at hand" in §1 para 3). Deployment consequence: adding a new
  product/scene category costs one forward pass over its nominal images,
  not a training run — this is PatchCore's central practical argument
  relative to a per-scenario-trained model like EfficientAD.
- **Architecture**: WideResNet-50 backbone (ImageNet-pretrained via
  torchvision / PyTorch Image Models, Appendix A), features aggregated from
  blocks 2 and 3 (mid-level; the paper argues explicitly against the
  deepest level — too ImageNet-classification-biased and loses localized
  information, §3.1 — and the ablation in §4.4.1/Fig. 4 shows both
  shallower and deeper hierarchy choices underperform the mid-level 2+3
  default). Locally aware patch features: adaptive-average-pooled feature
  vector over a `p×p` neighbourhood (`p = 3` default, Eq. 1–2), patch grid
  stride `s = 1` default (Eq. 3). Memory bank = union of all nominal patch
  features (Eq. 4), reduced via greedy minimax-facility-location coreset
  selection (Eq. 5, NP-hard exactly, approximated greedily per Algorithm 1)
  in a Johnson–Lindenstrauss-projected lower-dimensional space for
  tractability. Test-time scoring: max nearest-neighbour patch distance
  (Eq. 6) reweighted by local memory-bank neighbourhood density around the
  matched nominal feature (Eq. 7); segmentation via upsampling + Gaussian
  smoothing (`σ = 4`).
- **Implementations**:
  ```yaml
  implementations:
    - role: official
      repo: https://github.com/amazon-science/patchcore-inspection
      commit: fcaa92f124fb1ad74a7acf56726decd4b27cbcad
      framework: pytorch
      license: Apache-2.0
    - role: community
      repo: https://github.com/open-edge-platform/anomalib
      commit: 091ca6aca92c8d0e416394f79e52f5a3cea3db73
      framework: pytorch
      license: Apache-2.0
  ```
  No `weights_url` — no pretrained memory banks/weights are distributed by
  either repo. The official README's "pretrained PatchCores are hosted
  here" line is an unfilled `__add link__` template placeholder and the
  repo has zero releases; do not set `weights_url` on the page.
- **Assessment**: MVTec AD image-level AUROC up to 99.6% (best ensemble
  config, Table 4: DenseNet-201 + ResNeXt-101 + WideResNet-101, blocks 2+3,
  320 px); single-backbone default 99.1%/99.0%/99.0% at 25%/10%/1% coreset
  subsampling (Table 1), vs. next-best competitor PaDiM* at 97.9% (error
  2.1%→0.9%, a 57% error reduction, quoted verbatim in §4.2). Pixel-level
  AUROC 98.1% (PatchCore-25%) vs. PaDiM 97.5% (Table 2); PRO 93.5%
  (PatchCore-10%) vs. PaDiM 92.1% (Table 3). Inference time 0.17–0.6 s/image
  depending on coreset percentage, faster than SPADE and competitive with
  PaDiM at equal/better accuracy (Table 5). Low-shot: matches prior SOTA
  using ~1/5 of nominal training data (§4.5). Cross-dataset: MTD AUROC 97.9%
  (Table 6), mSTC pixelwise AUROC 91.8% (Table 6). Note the paper's own
  labeling inconsistency between prose and Table 1: §4.2 attributes the
  "2.1% error" figure to "PaDiM" in running text, but Table 1 attributes
  that exact number to "PaDiM*" (the backbone-selected variant), not plain
  PaDiM (4.7% error) — flag this if quoting the 57%-reduction claim on the
  public page, and prefer citing against the Table-1-labeled `PaDiM*` value
  explicitly.
- **References**: primary source `roth2022-patchcore`;
  `bergmann2019-mvtec-ad` (benchmark + evaluation protocol),
  `bergmann2020-uninformed-students` (PRO metric source). SPADE, PaDiM,
  DifferNet, PatchSVDD are the closest related/competing methods discussed
  in the paper but have no Atlas source entry — reference by name only, do
  not fabricate a source id for them.
- **Prerequisites**: this page's own `prerequisites` should list
  `visual-anomaly-detection` — the planned survey concept page that will
  cover PatchCore alongside EfficientAD and other anomaly-detection methods
  once ≥3 surveyed methods have research notes (per the Atlas survey-page
  policy). `visual-anomaly-detection` does **not exist on disk yet** in
  this batch — treat it as a planned page reference, not a resolved link,
  until it is actually authored.
- **Relations**:
  ```
  { type: compared_with, target: efficientad, confidence: high, caution: "Peer choice, not supersession: EfficientAD leads on accuracy and latency, but PatchCore needs no per-scenario training." }
  ```
  `efficientad` is also a **planned page that does not exist on disk yet**
  in this batch — do not treat this relation as resolvable until that page
  is authored; the build's slug-resolution validator will reject it until
  then.
- **Hosts the comparison**: per `docs/README.md` §4's more-authoritative
  tiebreaker (older paper hosts), this page (2022) should host the
  `## When to choose PatchCore over EfficientAD` section once `efficientad`
  (2023) exists; `efficientad`'s page carries only a single back-pointer
  Remarks bullet to this section, never duplicated prose. Sketch of what
  that section should argue, grounded strictly in facts this note
  supports: choose PatchCore when (a) the deployment adds new
  product/scene categories frequently and a per-category training run is
  operationally undesirable — PatchCore's "fit" step is a forward pass +
  coreset selection, not gradient training (§1, §3); (b) only a handful of
  nominal images exist for a new category — PatchCore's low-shot results
  (§4.5) show it matching prior SOTA at ~1/5 of full nominal data and
  remaining competitive down to 1–5 shots; (c) best-in-class MVTec AD
  accuracy is the priority and the ~0.17–0.6 s/image latency (Table 5) is
  acceptable. **The EfficientAD-side numbers needed to complete this
  comparison (its reported latency and accuracy figures) must be sourced
  from the `docs/research/notes/batzner2023-efficientad.md` note, which
  already exists on disk — that note was not read while writing this one**
  (per the file-ownership/hard-rule constraint on this ingestion task); the
  page-authoring step must read it separately before drafting the
  comparison section.

# Provenance

- **Setting / abstract claims**: "cold-start problem: fit a model using
  nominal (non-defective) example images only" — Abstract. "PatchCore
  achieves an image-level anomaly detection AUROC score of up to 99.6%,
  more than halving the error compared to the next best competitor" —
  Abstract.
- **Backbone / hierarchy choice and argument against deep features**:
  "As the features at specific network hierarchies plays an important
  role... j indexes feature maps from ResNet-like architectures, such as
  ResNet-50 or WideResnet-50 [57], with j∈{1,2,3,4}" — §3.1 para 2.
  "One choice for a feature representation would be the last level in the
  feature hierarchy... it loses more localized nominal information [14]...
  very deep and abstract features in ImageNet pretrained networks are
  biased towards the task of natural image classification" — §3.1 paras
  3–4. "We thus propose to use a memory bank M of patch-level features
  comprising intermediate or mid-level feature representations... this
  would refer to e.g. j∈[2,3]" — §3.1 para 5.
- **Local neighbourhood aggregation**: Eq. 1 (neighbourhood set
  `N_p^{(h,w)}`), Eq. 2 (`f_agg` aggregation, "For PatchCore, we use
  adaptive average pooling"), Eq. 3 (patch collection `P_{s,p}`, stride `s`
  "which we set to 1 except for ablation experiments done in §4.4.2") — all
  §3.1. Two-hierarchy combination via bilinear rescaling to match
  cardinalities: §3.1 final paragraph, "computing `P_{s,p}(φ_{i,j+1})` and
  aggregating each element with its corresponding patch feature at the
  lowest hierarchy level used... by bilinearly rescaling" — the exact
  combination operator (concatenation vs. other) is not spelled out in the
  visible text; marked `?` above.
- **Memory bank definition**: Eq. 4, §3.1 final paragraph.
- **Coreset objective and algorithm**: "coreset selection aims to find a
  subset S⊂A such that problem solutions over A can be most closely and
  especially more quickly approximated by those computed over S [1]" —
  §3.2 para 2. "we use a minimax facility location coreset selection...
  M_C* = argmin_{M_C⊂M} max_{m∈M} min_{n∈M_C} ‖m−n‖₂" — Eq. 5, §3.2 para 2.
  "The exact computation of M_C* is NP-Hard [54], we use the iterative
  greedy approximation suggested in [48]" — §3.2 para 3. "we follow [49],
  making use of the Johnson-Lindenstrauss theorem [11] to reduce
  dimensionalities of elements m∈M through random linear projections
  ψ:ℝ^d→ℝ^{d*} with d*<d" — §3.2 para 3. Full pseudocode: Algorithm 1
  ("PatchCore memory bank"), §3.2.
- **Anomaly scoring**: Eq. 6 (raw max-min patch distance `s*`) and Eq. 7
  (reweighted score `s`, with `N_b(m*)` "the b nearest patch-features in M
  for test patch-feature m*") — §3.3. Segmentation upsampling and Gaussian
  smoothing `σ = 4`, "not optimize this parameter" — §3.3 final paragraph.
- **Dataset facts**: "MVTec AD contains 15 sub-datasets with a total of
  5354 images, 1725 of which are in the test set... resized and center
  cropped to 256×256 and 224×224" — §4.1 "Datasets" para 1. MTD: "925
  defect-free and 392 anomalous magnetic tile images... 20% of defect-free
  images are evaluated against at test time" — §4.1 para 2, citing [26],
  [42]. mSTC: "subsampled version of the original STC dataset [32], only
  using every fifth training and test video frame... pedestrian videos from
  12 different scenes... images resized to 256×256" — §4.1 para 3.
- **Table 1 (image-level AUROC/error/misclassifications)**,
  **Table 2 (pixel AUROC)**, **Table 3 (PRO)**, **Table 4 (larger
  backbones/ensemble/image size)**, **Table 5 (inference time)**,
  **Table 6 (mSTC pixelwise AUROC, MTD AUROC)** — §4.2–§4.6, as reproduced
  in the Assessment bullet above with exact figures.
- **57%-error-reduction / labeling note**: "a reduction from an error of
  2.1% (PaDiM) to 0.9% for PatchCore−25% means a reduction of the error by
  57%" — §4.2 para 2; cross-checked against Table 1 where the 2.1%-error
  row is explicitly labeled "PaDiM*" (backbone-selected variant), not
  plain "PaDiM" (4.7% error) — discrepancy is in the source paper's own
  text vs. its own table, not introduced by this note.
- **Ablations**: neighbourhood-size optimum at `p=3` and hierarchy-depth
  optimum — "Results in the top half of Figure 4 show a clear optimum...
  thus motivating the neighbourhood size p=3... features from hierarchy
  level 2 can already achieve state-of-the-art performance, but benefit
  from additional feature maps... (2+3, which is chosen as the default
  setting)" — §4.4.1. Stride ablation: "stride s=2 giving an image anomaly
  detection AUROC of 97.6%, and stride s=3 an AUROC of 96.8%" — §4.4.2
  final paragraph. Subsampling-method ablation (coreset vs. random vs.
  learned proxies, Eq. 8 reconstruction loss) and the "<30% → ~95%"
  memory-bank utilization statistic — §4.4.2, paras 1–3. Resolution
  ablation (288/360/448 px, neighbourhood sizes 3/5/7/9) — Appendix C.3.
- **Low-shot results**: "vary the amount of training samples from 1
  (corresponding to 0.4% of the total nominal training data) to 50 (21%)"
  — §4.5 para 2.
- **Implementation details**: "implemented our models in Python 3.7 [51]
  and PyTorch [37]. Experiments are run on Nvidia Tesla V4 GPUs" —
  Appendix A (note: "Tesla V4" is not an existing Nvidia GPU model name in
  either the ar5iv HTML or pdftotext rendering of this paper; likely a
  LaTeXML/OCR artifact of "V100" or "T4" — marked `?`, do not repeat as
  fact without independent confirmation). "By default... PatchCore uses a
  WideResNet50-backbone [57]... Patch-level features are taken from feature
  map aggregation of the final outputs in blocks 2 and 3. For all nearest
  neighbour retrieval and distance computations, we use faiss [27]" —
  Appendix A.
- **Stated limitations**: "applicability is generally limited by the
  transferability of the pretrained features leveraged. This can be
  addressed by merging the effectiveness of PatchCore with adaptation of
  the utilized features. We leave this interesting extension to future
  work." — § Limitations (final numbered section before Acknowledgements).
- **False positive/negative analysis**: "a total of 19 false-positive and
  23 false-negative errors remain" and per-cause breakdown — Appendix C.4,
  Figs. S1–S2 captions and surrounding prose.
- **Code availability**: "Code: github.com/amazon-research/patchcore-inspection"
  — Abstract footnote. (Task-supplied implementation facts above use the
  `amazon-science` org name and a specific pinned commit/license — those
  were supplied pre-verified by the orchestrator and were not
  independently re-checked by this note.)
- **References used for cross-checking cited method names**: [1] Agarwal
  et al., "Geometric approximation via coresets"; [10] Cohen & Hoshen,
  "Sub-image anomaly detection with deep pyramid correspondences" (SPADE);
  [11] Dasgupta & Gupta, "An elementary proof of a theorem of Johnson and
  Lindenstrauss"; [14] Defard et al., "PaDiM: A patch distribution modeling
  framework..."; [23] He et al., "Deep residual learning for image
  recognition" (ResNet); [26] Huang, Qiu, Yuan, "Surface defect saliency of
  magnetic tile" (MTD); [27] Johnson, Douze, Jégou, "Billion-scale
  similarity search with GPUs" (faiss/IVFPQ); [32] Liu et al., "Future
  frame prediction for anomaly detection – a new baseline" (STC); [42]
  Rudolph, Wandt, Rosenhahn, "Same same but differnet..." (DifferNet); [48]
  Sener & Savarese, "Active learning for convolutional neural networks: A
  core-set approach"; [49] Sinha et al., "Small-GAN: Speeding up GAN
  training using core-sets"; [53] Wightman, "PyTorch image models"; [54]
  Wolsey & Nemhauser, "Integer and Combinatorial Optimization"; [57]
  Zagoruyko & Komodakis, "Wide residual networks" — all from the paper's
  own References list, cross-checked against both the ar5iv HTML and the
  pdftotext `.txt` cache.
