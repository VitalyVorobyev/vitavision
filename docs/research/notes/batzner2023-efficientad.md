---
paper_id: batzner2023-efficientad
title: "EfficientAD: Accurate Visual Anomaly Detection at Millisecond-Level Latencies"
authors: ["K. Batzner", "L. Heckler", "R. König"]
year: 2023
url: https://arxiv.org/pdf/2303.14535
created: 2026-08-06
relevant_atlas_pages: [convolution, convolutional-neural-network, resnet, unet-segmentation, fcn-semantic-segmentation, mae, dinov2, mobilesam, xfeat, depth-anything, depth-anything-v2, depth-anything-3, mobilenetv2, mobilenetv3, mnasnet, fast-scnn, bisenet]
---

# Setting

Unsupervised (one-class) visual anomaly detection: train only on defect-free
("normal") images of a fixed scene/object category, then at test time flag
both **structural** anomalies (stains, scratches, foreign objects — local,
texture-level deviations) and **logical** anomalies (wrong count, wrong
ordering, wrong combination of otherwise-normal objects — global,
compositional violations) (§1, §2.1).

- **Inputs**: RGB images resized to $256\times256$ (§A.1, comment 3;
  Algorithm 1 signature $I_{train}\in\mathbb{R}^{3\times256\times256}$).
  Precondition: a training set containing only normal images, and (optionally)
  a small held-out validation set of normal images used purely for map
  normalization, not for hyperparameter tuning against defects (§4, "MVTec AD,
  VisA, and MVTec LOCO do not include anomalous images in their training and
  validation sets").
- **Outputs**: a per-pixel anomaly map $M\in\mathbb{R}^{W\times H}$ resized
  back to the original image resolution via bilinear interpolation, and a
  single image-level anomaly score $m_{image}=\max_{i,j}M_{i,j}$ (§3.4,
  Algorithm 2 lines 7–11). No calibrated probability or confidence — the
  score is only meaningful in relative/ranking terms unless a
  dataset-specific threshold is fit downstream (this is why AU-ROC, which is
  threshold- and scale-invariant, is the primary metric; §3.4 explicitly notes
  the normalization destination values 0/0.1 have no effect on AU-ROC).

# Core idea

EfficientAD combines two anomaly-scoring branches, each detecting a different
anomaly class, then normalizes and averages their maps.

1. **Local (structural) branch — student–teacher (S–T) on a lightweight
   patch description network (PDN).** A frozen teacher $T$ (a small 4-layer
   CNN, not a heavy pretrained backbone) is distilled from WideResNet-101
   features (the same backbone PatchCore uses) on ImageNet. A student network
   $S$ with the *same architecture* is trained only on the application's
   normal images to reproduce $T$'s output. Because $S$ never sees anomalies,
   it fails to reproduce $T$ on anomalous patches at test time, and the
   squared teacher–student residual, averaged over channels, is the local
   anomaly map $M^{ST}$ (§3.2). The paper's central trick is a **training
   loss** — not an architecture asymmetry — that suppresses the student's
   ability to generalize to out-of-distribution inputs, described below.
2. **Global (logical) branch — autoencoder distilled into the same feature
   space.** A convolutional autoencoder $A$ is trained to reconstruct the
   teacher's *feature output* (not the raw image) for normal images through a
   64-dimensional bottleneck (§3.3). Because the bottleneck cannot carry
   enough information to encode fine texture, $A$'s reconstructions are
   "flawed... on normal images" too (§3.3) — so the raw AE-vs-teacher
   residual is not directly usable as an anomaly map (it would false-positive
   on background texture, e.g. the background grids in Fig. 5). Instead, the
   student is given **extra output channels** and trained to predict the
   autoencoder's output as well as the teacher's; the anomaly map is the
   squared difference between the autoencoder's output and *this second
   student head* ($M^{AE}$, "global anomaly map"), because the student learns
   the AE's *systematic* reconstruction errors on normal images (which cancel
   out) but not its behavior on unseen logical-anomaly images.
3. **Combination**: both maps are quantile-normalized independently (see
   `# Numerical sensitivity`) then averaged: $M = 0.5\hat{M}^{ST} +
   0.5\hat{M}^{AE}$ (Algorithm 2, line 10).

Because the local branch's receptive field is deliberately tiny (33×33 px,
§3.1), it cannot see global compositional structure, so it is blind to most
logical anomalies (Fig. 5's second-cable example: the student's local head is
"not influenced by the presence of the additional red cable"); the global
branch fills that gap. Conversely, the global branch's 64-dim bottleneck
cannot preserve fine local texture, so structural defects are the local
branch's job. This division of labor is explicit in the paper's own stated
`Limitations` (§5): "The student–teacher model and the autoencoder are
designed to detect anomalies of different types."

# Assumptions

1. **Hard.** Training images contain only normal instances of a fixed
   scene/object category; no anomalous images are available during training
   or for validation-based tuning (§4). Using anomalous test images to tune
   training duration is explicitly called out as invalid protocol (see
   `# Failure regime`).
2. **Hard.** Image content is roughly registered/aligned across the dataset
   in the sense that "normal" composition is well-defined per scenario — this
   is inherited from the MVTec AD / VisA / MVTec LOCO benchmark design, not
   argued from first principles in this paper.
3. **Soft.** The teacher's distillation target (WideResNet-101 / PatchCore
   features) is assumed to be a reasonably expressive frozen feature space.
   Appendix C shows performance is only mildly sensitive to swapping the
   distillation backbone (ResNeXt-101, DenseNet-201) — MVTec AD and VisA
   AU-ROC vary by ≤0.6 points; MVTec LOCO varies more (EfficientAD-S: 90.0 /
   90.1 / 90.6 across the three backbones; EfficientAD-M: 90.7 / 89.9 / 88.3;
   Table 9).
4. **Hard.** The student and teacher share the *identical* PDN architecture
   (§3.2, "we use its architecture for the student as well") — the paper's
   contribution is loss-induced, not architectural, asymmetry. If the student
   used a materially different (weaker) architecture the hard-feature-loss
   mechanism as described would not directly transfer (not tested in this
   paper).
5. **Soft.** The quantile-based map normalization (§3.4) assumes normal-image
   validation scores are representative of the "noise floor" of each map type
   in deployment; if the validation set is too small or unrepresentative the
   $q_a,q_b$ estimates are noisy (not directly studied in the paper's main
   ablations, but Table 3 shows AU-ROC is stable to $\pm$ a few points across
   quantile choices, evidence of some **robustness** even under this
   assumption's imprecision — see `# Numerical sensitivity`).

# Failure regime

- **Fine-grained logical anomalies below the branches' resolving power.**
  Stated explicitly in `Limitations` (§5): "a screw that is two millimeters
  too long" is not detectable; the paper says practitioners need "traditional
  metrology methods" for that. This is a hard ceiling, not a tuning issue.
- **Weak response on some logical anomalies even when nominally detected.**
  Appendix F, qualitative discussion: "The strength of its response sometimes
  leaves room for improvement, for example, on the logical anomalies of the
  breakfast box and the box of pushpins" — EfficientAD's own qualitative
  results section, not a competitor's failure.
- **Requires training per scenario**, unlike kNN-style methods (PatchCore):
  "In contrast to kNN-based methods, our approach requires training,
  especially for the autoencoder to learn the logical constraints of normal
  images. This takes twenty minutes in our experimental setup." (§5,
  Limitations). This is a wall-clock/engineering cost, not an accuracy
  failure, but it is a real deployment constraint the paper flags itself.
- **MVTec LOCO logical-anomaly numbers remain the weakest slice of the
  method's own results** even though they lead the field: EfficientAD-S
  scores 85.8 AU-ROC / EfficientAD-M 86.8 AU-ROC on LOCO-Logical (Table 2),
  versus 98.8/99.1 on MVTec AD structural anomalies — the gap between "best
  in class" and "solved" is still large for logical anomalies specifically.
- **Evaluation-protocol pitfall the paper itself documents in a competitor
  (SimpleNet) and corrects for**: SimpleNet's official training procedure
  repeatedly evaluates on all test images during training and reports the
  maximum test score obtained — i.e., **test-time early-stopping tuned on the
  test set itself** — which "overestimates the actual performance of the
  model on unseen images" and "would furthermore require a validation set
  with anomalous images" that the benchmark protocol (MVTec AD/VisA/LOCO)
  does not provide (§4). EfficientAD's own paper disables this technique for
  SimpleNet in its comparison. **This same critique boomerangs onto
  EfficientAD's own headline number**: "With early stopping enabled,
  EfficientAD itself achieves an image-level detection AU-ROC of 99.8 % on
  MVTec AD" (§4) — a number obtained under exactly the protocol the paper
  criticizes SimpleNet for, and therefore **not comparable** to any of the
  method's own Table 1/2/4 numbers (all of which report the early-stopping-
  disabled, methodologically clean protocol: 98.8 % MAD AU-ROC for
  EfficientAD-S, 99.1 % for EfficientAD-M — Table 2). Any future citation of
  "EfficientAD reaches 99.8% on MVTec AD" must carry this caveat or it
  misrepresents the paper's own stricter, headline-Table numbers.

# Numerical sensitivity

- **Quantile-based map normalization dominates over a Gaussian
  (mean/variance) baseline.** Table 5 (isolated ablation, EfficientAD-S):
  removing quantile normalization (replacing it with a mean-0/variance-1
  Gaussian normalization on validation scores) costs $-0.7$ AU-ROC points
  (95.4 → 94.7). The paper's stated reason: raw score distributions vary in
  shape between scenarios, and quantile normalization is distribution-free
  where the Gaussian baseline is not (§4, discussion under Table 5).
- **Choice of the two normalization quantiles $q_a,q_b$ is not very
  sensitive** (Table 3): sweeping $a\in\{0.5,0.8,0.9,0.95,0.98,0.99\}$ (with
  $b$ fixed) moves AU-ROC only in $\{95.8,\dots,96.0\}$; sweeping $b\in
  \{0.95,0.98,0.99,0.995,0.998,0.999\}$ similarly stays in
  $\{95.8,\dots,96.0\}$. Defaults used throughout the paper (bold in Table 3):
  $a=0.9$, $b=0.995$ — confirmed exactly in Algorithm 1 line 56/57:
  "the 0.9-quantile $q_a^{ST}$ and the 0.995-quantile $q_b^{ST}$."
- **The hard-feature-loss mining factor $p_{hard}$ is much more
  consequential** (Table 3, bottom row): $p_{hard}=0$ (i.e. no hard-mining,
  the "original S–T loss") gives 94.9 AU-ROC; increasing to $0.999$ (the
  default used everywhere else in the paper) reaches 96.0; pushing further to
  $0.9999$ or $0.99999$ *degrades* performance slightly back to 95.8/95.7 —
  so there is a real optimum, not a monotone benefit, and $p_{hard}=0.999$ is
  near that optimum without being at the sensitivity boundary.
- **Precision**: switching inference from float32 to float16 "does not
  change the anomaly detection results for the 32 anomaly detection
  scenarios evaluated in this paper" (Appendix E) — the method is reported as
  numerically robust to half precision at inference time, and float16 is what
  the reported latency numbers use.
- **Disabling PDN padding** (a latency-only, not accuracy, lever): removing
  padding in the PDN "speeds up the forward pass... by 80 µs without
  impairing the detection of anomalies" (Appendix E) — the reported 2.2 ms /
  4.5 ms latencies for EfficientAD-S/M are measured *without* padding.
- **Backbone-choice sensitivity is asymmetric across dataset collections**
  (Table 9, Appendix C): MVTec AD is nearly backbone-invariant (98.8–99.2
  across WideResNet-101/ResNeXt-101/DenseNet-201), MVTec LOCO is noticeably
  more sensitive (EfficientAD-M: 90.7/89.9/88.3), and PatchCore is *more*
  backbone-sensitive than EfficientAD on MVTec LOCO specifically (80.3/78.9/
  76.5) — the paper frames this as evidence EfficientAD is comparably or more
  robust to the distillation backbone choice than PatchCore is to its own
  feature-extractor choice.

# Applicability

- **Use when**: per-image latency budget is in the low-millisecond range
  (2.2 ms EfficientAD-S / 4.5 ms EfficientAD-M on an RTX A6000, batch size 1;
  Table 1), or high throughput is required (614 / 269 img/s at batch 16;
  Table 1); both structural and logical/compositional anomaly types must be
  covered by one model; training time (~20 min per scenario, §5) is
  acceptable.
- **Don't use when**: anomalies are defined by sub-millimeter dimensional
  tolerances that require metrology-grade measurement rather than
  appearance-based scoring (§5); a kNN/no-training deployment model is
  required (PatchCore-style); anomalous *validation* examples are available
  and could be used for genuinely valid early-stopping (in that regime the
  paper's own early-stopped 99.8% MVTec-AD number suggests more headroom
  exists, though it is not evaluated under the paper's own protocol).
- **Compared against** (Table 1, official implementations where available):
  GCAD [`bergmann2022-mvtec-loco`, not yet ingested], SimpleNet
  [`liu2023-simplenet`, not yet ingested], S–T
  [`bergmann2020-uninformed-students`, not yet ingested], FastFlow
  [`yu2021-fastflow`, not yet ingested], DSR [`zavrtanik2022-dsr`, not yet
  ingested], PatchCore / PatchCore$_{Ens}$ [`roth2022-patchcore`, not yet
  ingested], AST (Asymmetric Student-Teacher) [`rudolph2023-ast`, not yet
  ingested] — AST is explicitly named "the second-best method" in the
  conclusion (§5), with EfficientAD-S reducing latency by a factor of 24 and
  increasing throughput by a factor of 15 relative to it.

# Connections

- **Builds on**: student–teacher anomaly detection framework
  (`bergmann2020-uninformed-students`, not yet ingested — cited as the
  originating S–T method [10] the paper repeatedly contrasts itself with);
  PatchCore's WideResNet-101 feature space, which EfficientAD's PDN is
  distilled *from* (`roth2022-patchcore`, not yet ingested); MVTec LOCO's own
  GCAD baseline and its recommendation to use an autoencoder for logical
  constraints (`bergmann2022-mvtec-loco`, not yet ingested); Online Hard
  Example Mining, which the hard feature loss is explicitly analogized to
  (§3.2: "Similar to Online Hard Example Mining [61], we therefore restrict
  the student's loss to the most relevant parts of an image" —
  `shrivastava2016-ohem`, not yet ingested); AST's architectural-asymmetry
  idea, which this paper replaces with loss-induced asymmetry while keeping
  AST as the closest competitor (`rudolph2023-ast`, not yet ingested).
- **Enables**: the paper's own conclusion frames the PDN as reusable
  plumbing beyond this paper — "Its efficient patch description network, for
  instance, can be used as a feature extractor in other anomaly detection
  methods as well to reduce their latency" (§5).
- **Refutes / supersedes**: none in the Atlas's `generalized_by` sense —
  EfficientAD is presented as a new Pareto point (accuracy *and* latency),
  not a strict generalization of any single prior method; it does not
  subsume PatchCore's no-training kNN deployment property, for example.

**Distillation-vocabulary honesty note (per authoring instructions):**
EfficientAD's PDN is trained via feature distillation from a WideResNet-101
teacher (§3.1, §A.2) — the same *word* ("distillation") used by the
model-compression-for-general-purpose-features cluster on this Atlas
(`dinov2`, `mobilesam`, `xfeat`, `depth-anything`, `depth-anything-v2`,
`depth-anything-3`). But the **mechanism and purpose are different**. In that
cluster, distillation exists to compress a large general-purpose model into a
smaller one that reproduces the *same downstream task* (segmentation,
matching, depth) more cheaply — the teacher–student residual is a training
signal that is discarded after training; only the compressed student ships.
In EfficientAD, the teacher–student residual is not discarded — it **is the
anomaly score at test time**. Both teacher and student ship into production
and run at inference; the entire method depends on the residual staying
informative on anomalous inputs, which is precisely the opposite goal of
compression-style distillation (there, you *want* the student to match the
teacher everywhere, including out-of-distribution; here, EfficientAD's whole
training-loss contribution is designed to make the student generalize *less*
well beyond normal images). A future page must not describe EfficientAD as
"in the same distillation family as DINOv2/MobileSAM/XFeat/Depth Anything" —
the vocabulary overlaps, the mechanism does not.

**Efficiency-cluster honesty note:** the efficiency-oriented models
(`mobilenetv2`, `mobilenetv3`, `mnasnet`, `fast-scnn`, `bisenet`) share only
the high-level accuracy-vs-latency framing with EfficientAD (Figure 1's
AU-ROC-vs-latency plot is structurally the same kind of chart MobileNet-family
papers use for accuracy-vs-latency) and the general engineering move of
"downsample early to cut runtime" (§3.1 cites this design principle in the
same breath as classification architectures, referencing He et al. ResNet
[23] for the general point, not any one of these five specifically). None of
these five appear as citations, baselines, or architectural components in
this paper. Do not draw a `relations[]` edge to any of them beyond the shared
`relevant_atlas_pages` co-tagging for discoverability — there is no textual
warrant for feeds_into/compared_with/etc. to this cluster.

**resnet connection — read the direction carefully.** EfficientAD does not
build on ResNet directly; its distillation teacher is a **WideResNet-101**
(`zagoruyko2016-wideresnet`, not yet ingested — [70] in this paper's
reference list, cited at §3.1 and §A.2), which is a width-scaled variant of
ResNet, not ResNet itself. Per the authoring instructions for this note, the
`feeds_into` edge (resnet → efficientad) is to be recorded on the **`resnet`
page**, not here, with a caution flagging that the actual teacher is the wide
variant. See `# Atlas update plan` below.

## Not yet ingested (suggested for future ingestion)

**These are SUGGESTIONS only — none of the IDs below are registered in
`docs/papers/index.yaml`, none have a research note, and no downstream skill
should treat them as resolvable `sources:` references until they are
actually ingested via `paper-ingest` (or `sources:fetch-repo` /
`sources:fetch-doc` for non-paper kinds) and added to the index.** Verified
by grep against `docs/papers/index.yaml` on 2026-08-06: no match for any of
these IDs.

Core (evaluation baselines / dataset papers directly load-bearing for this
paper's claims):

- `bergmann2019-mvtec-ad` — "MVTec AD — A Comprehensive Real-World Dataset
  for Unsupervised Anomaly Detection", Bergmann et al., CVPR 2019. arxiv: ?.
  Why it matters: source of the primary MVTec AD benchmark this paper reports
  results on (ref [9]).
- `bergmann2021-mvtec-ad-ijcv` — "The MVTec Anomaly Detection Dataset: A
  Comprehensive Real-World Dataset for Unsupervised Anomaly Detection",
  Bergmann et al., IJCV 2021. arxiv: ?. Why it matters: journal extension of
  MVTec AD and the cited source (ref [7]) of the AU-PRO metric and its 30% FPR
  cutoff convention used throughout this paper's Table 1/2/12.
- `bergmann2022-mvtec-loco` — "Beyond Dents and Scratches: Logical
  Constraints in Unsupervised Anomaly Detection and Localization", Bergmann
  et al., IJCV 2022. arxiv: ?. Why it matters: introduces MVTec LOCO, the
  GCAD baseline architecture this paper adapts and re-benchmarks, the AU-sPRO
  metric, and the logical-vs-structural anomaly taxonomy this paper's Table 2
  split is built on (ref [8]).
- `bergmann2020-uninformed-students` — "Uninformed Students: Student-Teacher
  Anomaly Detection With Discriminative Latent Embeddings", Bergmann et al.,
  CVPR 2020. arxiv: ?. Why it matters: the original S–T anomaly-detection
  framework this paper directly extends with loss-induced (rather than
  architectural) asymmetry (ref [10]).
- `roth2022-patchcore` — "Towards Total Recall in Industrial Anomaly
  Detection", Roth et al., CVPR 2022. arxiv: ?. Why it matters: source of the
  WideResNet-101 feature space distilled into the PDN, and the strongest
  no-training kNN baseline this paper compares against (ref [51]).
- `rudolph2023-ast` — "Asymmetric Student-Teacher Networks for Industrial
  Anomaly Detection", Rudolph et al., WACV 2023. arxiv: ?. Why it matters:
  explicitly named "the second-best method" in this paper's conclusion; the
  architectural-asymmetry idea this paper's loss-induced asymmetry is
  positioned against (ref [54]).
- `zou2022-visa` — "SPot-the-Difference Self-Supervised Pre-training for
  Anomaly Detection and Segmentation" (the VisA dataset paper), Zou et al.,
  ECCV 2022. arxiv: ?. Why it matters: source of the VisA dataset collection,
  one of the three benchmarks this paper's every table is averaged over
  (ref [74]).
- `yu2021-fastflow` — "FastFlow: Unsupervised Anomaly Detection and
  Localization via 2D Normalizing Flows", Yu et al., arXiv 2021. arxiv:
  2111.07677 (verified against cached text, ref [69]: "arXiv preprint
  arXiv:2111.07677v1"). Why it matters: a normalizing-flow baseline included
  in every comparison table.
- `zavrtanik2022-dsr` — "DSR — A Dual Subspace Re-Projection Network for
  Surface Anomaly Detection", Zavrtanik et al., ECCV 2022. arxiv: ?. Why it
  matters: reconstruction-based baseline using synthetic anomalies in a
  pretrained autoencoder's latent space, included in every comparison table
  (ref [71]).
- `liu2023-simplenet` — "SimpleNet: A Simple Network for Image Anomaly
  Detection and Localization", Liu et al., CVPR 2023. arxiv: ?. Why it
  matters: baseline this paper explicitly critiques for test-time
  early-stopping tuned on test-set scores — the evaluation-protocol
  discussion in `# Failure regime` above depends on this paper's design
  (ref [36]).

Context (cited for architectural or methodological background, not
re-benchmarked as a headline baseline):

- `zagoruyko2016-wideresnet` — "Wide Residual Networks", Zagoruyko &
  Komodakis, BMVC 2016. arxiv: ?. Why it matters: the actual distillation
  teacher backbone (WideResNet-101) — see the resnet-connection honesty note
  above (ref [70]).
- `shrivastava2016-ohem` — "Training Region-based Object Detectors with
  Online Hard Example Mining", Shrivastava et al., CVPR 2016. arxiv: ?. Why
  it matters: the explicit analogy the hard feature loss is framed against
  (ref [61]).
- `wang2021-st-fpm` — "Student-Teacher Feature Pyramid Matching for Anomaly
  Detection", Wang et al., BMVC 2021. arxiv: ?. Why it matters: cited (ref
  [66]) as a prior S–T variant using a pyramid of feature layers, one of the
  techniques EfficientAD's lightweight S–T pair deliberately forgoes for
  latency.
- `akcay2022-anomalib` — "Anomalib: A Deep Learning Library for Anomaly
  Detection", Akcay et al., ICIP 2022. arxiv: ?. Why it matters: the FastFlow
  implementation used for this paper's FastFlow baseline is Intel Anomalib's
  (ref [1], §B.3).
- `russakovsky2015-imagenet` — "ImageNet Large Scale Visual Recognition
  Challenge", Russakovsky et al., IJCV 2015. arxiv: ?. Why it matters: the
  pretraining dataset for both the PDN distillation (Algorithm 3) and the
  student's pretraining-penalty loss $L_{ST}$ (§3.2) (ref [55]).
- `huang2017-densenet` — "Densely Connected Convolutional Networks", Huang
  et al., CVPR 2017. arxiv: ?. Why it matters: Figure 3's contrastive
  long-range-dependency analysis of the PDN's restricted receptive field uses
  DenseNet feature maps as one of the two counter-examples (alongside
  WideResNet) (ref [25]).

Optional (methods mentioned in Related Work but not directly compared or
architecturally reused):

- `gudovskiy2022-cflow-ad` — "CFLOW-AD: Real-Time Unsupervised Anomaly
  Detection With Localization via Conditional Normalizing Flows", Gudovskiy
  et al., WACV 2022. arxiv: ?. (ref [22]).
- `defard2021-padim` — "PaDiM: A Patch Distribution Modeling Framework for
  Anomaly Detection and Localization", Defard et al., ICPR Workshops 2021.
  arxiv: ?. (ref [16]).
- `cohen2020-deep-pyramid` — "Sub-Image Anomaly Detection with Deep Pyramid
  Correspondences", Cohen & Hoshen, arXiv 2020. arxiv: 2005.02357 (verified
  against cached text, ref [14]: "arXiv preprint arXiv:2005.02357v1"). 
- `rudolph2021-differnet` — "Same Same But DifferNet: Semi-Supervised Defect
  Detection with Normalizing Flows", Rudolph et al., WACV 2021. arxiv: ?.
  (ref [52]).
- `rudolph2022-csflow` — "Fully Convolutional Cross-Scale-Flows for
  Image-based Defect Detection", Rudolph et al., WACV 2022. arxiv: ?.
  (ref [53]).
- `bergmann2019-ssim-autoencoder` — "Improving Unsupervised Defect
  Segmentation by Applying Structural Similarity to Autoencoders", Bergmann
  et al., VISAPP 2019. arxiv: ?. Why it matters: cited (ref [12]) alongside
  the general claim that "autoencoders generally struggle with reconstructing
  fine-grained patterns" (§3.3), the premise motivating EfficientAD's
  student-predicts-the-autoencoder design.

# Atlas update plan

## NEW: efficientad
Type: model
Category: anomaly-detection (proposed domain value; does not currently exist
in `domainValues` — see blocker below, this is the load-bearing reason this
page cannot be authored yet)
Primary source: this paper

- **Motivation**: real-time / high-throughput industrial visual inspection
  where per-image latency in the low-millisecond range and coverage of both
  structural *and* logical (compositional) anomaly types are both required;
  motivate with Figure 1's AU-ROC-vs-latency plot and the concrete economic
  framing in §1 (metal objects entering a combine harvester; a machine
  operator's limb near a blade; production-rate-driven runtime limits).
- **Architecture**: two-branch design —
  - PDN teacher/student (Table 6 for -S, Table 7 for -M): 4 conv + 2
    strided-avg-pool layers (-S) / 6 conv + 2 strided-avg-pool + two extra
    1×1 convs (-M); teacher outputs 384 channels, student outputs 768
    channels (384 for the local S–T head + 384 for the global AE-matching
    head), both with a 33×33 receptive field per output neuron and a
    fully-convolutional forward pass over the whole image in a single pass.
  - Autoencoder (Table 8): 6-layer strided-conv encoder to a 64-dim
    bottleneck, then a bilinear-upsample + conv decoder with dropout 0.2 per
    stage, back up to a 384-channel feature-space reconstruction (not
    pixel-space) matching the teacher's output shape. **No skip connections
    — confirmed not a U-Net; see the U-Net question resolved in `# Setting`
    text above / provenance below.**
  - Losses: hard feature loss $L_{hard}$ ($p_{hard}=0.999$ quantile mining,
    analogized to OHEM), pretraining penalty on $L_{ST}$ (random ImageNet
    image per step, penalizes student's norm of output on out-of-distribution
    input), $L_{AE}$ (teacher-feature reconstruction) and $L_{STAE}$
    (student's second head predicting the AE's output) — total loss is the
    unweighted sum of all three loss types (Algorithm 1 line 38).
  - Map normalization: two independent quantile-based linear rescalings
    ($q_a=0.9\to0$, $q_b=0.995\to0.1$) fit per anomaly-map type on held-out
    normal validation images, then averaged 0.5/0.5.
  - S vs M variant table: params 8M / 21M, latency 2.2 ms / 4.5 ms, FLOPs
    76G / 235G, GPU memory 100MB / 161MB (Table 16, RTX A6000).
- **Implementations**: no official open-source repo is cited in this paper
  (unlike its baselines, which do link official repos in Appendix B
  footnotes 3–7) — mark `noPublicImpl: true` unless a third-party
  reimplementation with a verified license is separately found; do not
  invent a repo URL.
- **Assessment**: reproduce Table 1 (AU-ROC/AU-PRO/latency/throughput vs.
  7 baselines), Table 2 (per-collection breakdown + LOCO logical/structural
  split), Table 4 (cumulative ablation: PDN alone 93.2 → +map-norm 94.0 →
  +hard-feature-loss 95.0 → +pretraining-penalty 95.4 = EfficientAD-S; +M
  variant 96.0), and the early-stopping evaluation-protocol caveat (99.8%
  MVTec-AD number is not comparable to the Table 1/2/4 numbers — see
  `# Failure regime`). State hardware (RTX A6000) for every latency number
  quoted.
- **References**: this paper as primary; `zagoruyko2016-wideresnet` (teacher
  backbone) once ingested; MVTec AD / VisA / MVTec LOCO dataset papers once
  ingested.

Relations:
  { type: feeds_into, target: resnet, confidence: medium, caution: "EfficientAD distils its PDN from a WideResNet-101 teacher; the ResNet page's subject is ResNet proper, not the wide variant." }

(This entry is authored on the **`resnet`** page as `resnet → efficientad`,
per the project's authored-forward-edges convention — it therefore requires
a `## UPDATE: resnet` action at page-authoring time to add this
`relations[]` entry to `content/models/resnet.md`. That UPDATE action is
deliberately **not** written as a separate block in this note, since
`efficientad` does not exist on disk yet for the edge to resolve against;
the page-authoring skill must add it when `content/models/efficientad.md` is
created.)

**Blockers — verified against `src/lib/content/schema.ts` lines 90–127
(read directly, 2026-08-06):**

- `domainValues` (lines 91–101) is a closed enum with exactly these members:
  `"image-formation", "features", "geometry", "targets", "calibration",
  "stitching", "depth", "detection", "segmentation"`. No anomaly-detection
  value exists.
- `taskValues` (lines 114–126) is a closed enum with exactly these members:
  `"camera-calibration", "chessboard-detection", "corner-detection",
  "feature-detection", "fundamental-matrix-estimation",
  "hand-eye-calibration", "image-classification", "image-segmentation",
  "image-stitching", "local-feature-matching", "stereo-rectification"`. No
  anomaly-detection or defect-segmentation value exists.
- Both `domain` and `tasks` are `.optional()` on `modelFrontmatterSchema`
  (confirmed at lines 266–267), so a page *could* technically be authored
  today by omitting both fields entirely — but that would leave the page
  untagged for domain/task-based discovery/filtering, which defeats the
  purpose of the taxonomy. The correct fix is to extend both enums (e.g. add
  `"anomaly-detection"` to `domainValues`, and `"anomaly-detection"` and/or
  `"defect-segmentation"` to `taskValues`) and keep `content/tasks.yaml` in
  sync, since the schema comment (lines 111–112) states that file, not the
  enum, is the documented source of truth and the enum is only "the
  validation enforcer."
- **This would be the first anomaly-detection page in the Atlas** — grepping
  the current `domainValues`/`taskValues` enums and the 17-slug
  `relevant_atlas_pages` list above confirms no existing Atlas page covers
  this domain today.

# Provenance

- Abstract, p.1: headline claims (32 datasets, 3 collections, 2ms latency,
  600 img/s throughput, PDN <1ms).
- §1 Introduction, p.1–2: motivation (combine harvester / operator-limb
  examples), contributions list, GCAD/autoencoder framing.
- §2.1, p.2: MVTec AD / VisA / MVTec LOCO dataset-collection definitions;
  "dataset collections" terminology; pixel-precise segmentation masks claim.
- §2.2, p.2–3: related-work anomaly-detection-method taxonomy (density
  estimation on frozen-CNN features, PatchCore's kNN-on-clustered-features,
  S–T framework, AST's architectural asymmetry, autoencoder/GAN generative
  methods, GCAD, DSR, SimpleNet).
- §3.1 "Efficient Patch Descriptors", p.3–4: PDN description, "four
  convolutional layers", "33×33 pixels" receptive field, "patch description
  network (PDN)" naming, fully-convolutional single-forward-pass claim,
  Figure 2 architecture diagram, "<800 µs on an NVIDIA RTX A6000 GPU" claim.
  Same section: the U-Net/GCAD sentence — **direct quote**: "Yet, executing a
  single network takes longer and requires more memory in our experiments
  than a U-Net [50] with 31 million parameters, an architecture used by the
  GCAD method [8]." This is the *only* place "U-Net" appears in the paper's
  body text; it is unambiguously about GCAD's architecture, contrasted with
  the S–T method's small-but-slow networks — not a description of
  EfficientAD's own autoencoder.
- §3.1, p.4, distillation description: "we distill a deep pretrained
  classification network into it... we use the same pretrained features as
  PatchCore [51] from a WideResNet-101." Figure 3 and its caption:
  gradient/receptive-field visualization contrasting PDN vs. DenseNet vs.
  WideResNet; "The feature maps of the DenseNet [25] and the WideResNet
  exhibit strong artifacts" (long-range-dependency claim).
- §3.2 "Lightweight Student–Teacher", p.4–5: hard feature loss definition
  and equations ($D_{c,w,h}=(T(I)_{c,w,h}-S(I)_{c,w,h})^2$, $p_{hard}$-
  quantile $d_{hard}$, $L_{hard}$ = mean of $D_{c,w,h}\ge d_{hard}$);
  "Similar to Online Hard Example Mining [61]"; "we set $p_{hard}$ to 0.999,
  which corresponds to using, on average, ten percent of the values"; anomaly
  score map $M_{w,h}=C^{-1}\sum_c D_{c,w,h}$; pretraining-penalty loss
  $L_{ST}=L_{hard}+(CWH)^{-1}\sum_c\|S(P)_c\|_F^2$.
- §3.3 "Logical Anomaly Detection", p.5: autoencoder loss
  $L_{AE}=(CWH)^{-1}\sum_c\|T(I)_c-A(I)_c\|_F^2$; **direct quote**: "We use a
  standard convolutional autoencoder comprising strided convolutions in the
  encoder and bilinear upsampling in the decoder." This is the paper's own
  description of its autoencoder — plain conv-autoencoder language, no
  mention of skip connections or "U-Net" anywhere in this section; "encode
  and decode the complete image through a bottleneck of 64 latent
  dimensions"; student's extra-channel design and $L_{STAE}$ equation;
  $L_{total}=L_{AE}+L_{ST}+L_{STAE}$.
- Figure 5 caption and surrounding text, p.5: local/global map combination
  narrative, "Diff" definition, bilinear-interpolation resizing of anomaly
  maps to input resolution.
- §3.4 "Anomaly Map Normalization", p.5–6: quantile-normalization procedure,
  $q_a\to0$, $q_b\to0.1$ linear mapping; AU-ROC scale-invariance argument.
- §4 Experiments, p.6: baseline list and evaluation protocol; PatchCore
  76.6%-crop-disabling rationale ("99.9 % of the defects lie fully or
  partially within this cropped area"); FastFlow WideResNet-50-2 choice;
  Anomalib implementation source; **direct quote on SimpleNet's protocol
  critique**: "SimpleNet tunes the training duration on the test images of a
  scenario. During training, the model is repeatedly evaluated on all test
  images and the maximum of all obtained test scores is reported after
  training. We disable this technique, since it overestimates the actual
  performance of the model on unseen images."; **direct quote on
  EfficientAD's own early-stopped number**: "With early stopping enabled,
  EfficientAD itself achieves an image-level detection AU-ROC of 99.8 % on
  MVTec AD."; AU-ROC/AU-PRO(30% FPR)/AU-sPRO metric definitions and
  citations [7],[8]; per-collection weighting explanation ("roughly
  one-sixth and five-sixths").
- Table 1, p.6: AU-ROC / AU-PRO / latency(ms) / throughput(img/s) for GCAD,
  SimpleNet, S–T, FastFlow, DSR, PatchCore, PatchCore$_{Ens}$, AST,
  EfficientAD-S (95.4/92.5/2.2/614, ±0.06/±0.05/±0.01/±2), EfficientAD-M
  (96.0/93.3/4.5/269, ±0.09/±0.04/±0.01/±1).
- Table 2, p.7: per-collection AU-ROC (MAD/LOCO/VisA/Mean) and LOCO
  logical/structural split for all 10 methods — verbatim numbers transcribed
  in `# Failure regime` and `# Assessment` above.
- Table 3, p.7: sensitivity sweep over $a$, $b$, $p_{hard}$ with AU-ROC per
  setting; bold defaults.
- Table 4, p.8: cumulative ablation (PDN 93.2 → +map-norm 94.0(+0.8) →
  +hard-feature-loss 95.0(+1.0) → +pretraining-penalty 95.4(+0.4) =
  EfficientAD-S 95.4/2.2ms; EfficientAD-M 96.0(+0.6)/4.5ms).
- Table 5, p.8: isolated per-component ablation on EfficientAD-S (without
  map-norm 94.7(−0.7), without hard-feature-loss 94.7(−0.7), without
  pretraining-penalty 95.0(−0.4)).
- §5 Conclusion / Limitations, p.8: **direct quotes**: "The student–teacher
  model and the autoencoder are designed to detect anomalies of different
  types... Fine-grained logical anomalies, however, remain a challenge – for
  example a screw that is two millimeters too long... In contrast to
  kNN-based methods, our approach requires training, especially for the
  autoencoder to learn the logical constraints of normal images. This takes
  twenty minutes in our experimental setup." Also: "Its efficient patch
  description network, for instance, can be used as a feature extractor in
  other anomaly detection methods as well to reduce their latency."
- References list [1]–[74], p.9–11: used to cross-check every "not yet
  ingested" candidate's title/authors/venue in the list above, and to verify
  arXiv ids for FastFlow (ref [69]: "arXiv preprint arXiv:2111.07677v1") and
  Cohen & Hoshen (ref [14]: "arXiv preprint arXiv:2005.02357v1") — the only
  two candidates with a directly-quoted arXiv id in this paper's own
  reference list.
- Appendix A.1 "Training and Inference", p.12–14: Algorithm 1
  (EfficientAD-S training) and Algorithm 2 (inference) — full training loop,
  70000 iterations, Adam lr $10^{-4}$ / weight decay $10^{-5}$, learning-rate
  decay to $10^{-5}$ after iteration 66500, batch size 1 (explicit comment:
  "We use a batch size of one."), channel-normalization ($\mu,\sigma$)
  precompute step, augmentation (brightness/contrast/saturation, coefficient
  $\lambda\sim U(0.8,1.2)$, applied only to the autoencoder branch's input),
  ImageNet pretraining-image sampling procedure (resize 512×512, grayscale
  w.p. 0.3, center-crop 256×256), torchvision normalization constants
  (mean 0.485/0.456/0.406, std 0.229/0.224/0.225), quantile computation
  ($q_a=0.9$, $q_b=0.995$) on validation images.
- Table 6, p.13: EfficientAD-S PDN architecture (Conv-1 4×4/128/pad3/ReLU,
  AvgPool-1 2×2/128/pad1, Conv-2 4×4/256/pad3/ReLU, AvgPool-2 2×2/256/pad1,
  Conv-3 3×3/256/pad1/ReLU, Conv-4 4×4/384/pad0/no-activation); student
  identical but 768 kernels in Conv-4.
- Table 7, p.13: EfficientAD-M PDN architecture (6 conv layers + 2
  avg-pools, final channel count 384/teacher, 768/student in the last two
  layers) — exact per-layer stride/kernel/channels/padding/activation as
  transcribed in `# Atlas update plan` above.
- Table 8, p.14: autoencoder architecture — 6 EncConv strided-conv layers
  (32/32/64/64/64/64 channels, all stride 2×2 except EncConv-6 at 1×1 with
  8×8 kernel and 0 padding), then 6 Bilinear-resize + DecConv (all 64
  channels, ReLU, dropout 0.2) stages, then DecConv-7 (64ch) and DecConv-8
  (384ch, no activation, the final feature-space output). No skip-connection
  layers listed anywhere in this table — confirms the "not a U-Net" reading.
- §A.2 "Distillation", p.14–16: Algorithm 3 (distillation training), 60000
  iterations, batch size 16, Adam lr $10^{-4}$/weight decay $10^{-5}$,
  feature-extractor $\Psi:\mathbb{R}^{3\times512\times512}\to
  \mathbb{R}^{384\times64\times64}$, PatchCore's official implementation and
  commit hash cited in a footnote, grayscale-conversion probability 0.1
  during distillation (vs. 0.3 for pretraining-penalty sampling in
  Algorithm 1 — these are two different grayscale probabilities for two
  different purposes; do not conflate).
- Appendix B, p.16–17: per-baseline implementation notes (§B.1–B.7), incl.
  reproduction gaps (AST: paper reports 99.2% vs. this paper's reproduced
  98.9%) and official-repo footnotes 3–7 (all GitHub URLs pinned to specific
  commit hashes).
- Appendix C, p.17–18, Table 9: backbone-robustness ablation (WideResNet-101
  / ResNeXt-101 / DenseNet-201) for PatchCore vs. EfficientAD-S/M across
  MVTec AD / MVTec LOCO / VisA — verbatim numbers transcribed in
  `# Numerical sensitivity` above.
- Appendix D, p.18–20, Tables 10–15: additional metrics (AU-PRC, AU-PRO at
  5% FPR, pixel-AU-ROC at 5% FPR, pixel-AU-PRC) — used only to confirm Table
  1/2 numbers are consistent across metric choices, not separately
  transcribed in full above.
- Appendix E "Timing Methodology", p.20–23, Table 16 (parameter counts,
  FLOPs, GPU memory) and Table 17 (latency across 5 GPUs: RTX A6000, RTX
  A5000, Tesla V100, RTX 3080, RTX 2080 Ti) and Figure 6/8: full timing
  protocol ("we perform 1000 forward passes as warm up and report the mean
  runtime of the following 1000 forward passes"; "throughput... dividing
  16000 by the sum of the runtimes of 1000 forward passes with a batch size
  of 16"), float16 precision note, PDN-padding-disabled 80µs speedup note,
  PatchCore parameter-counting caveat (kNN database size depends on training
  set; benchmarked on VisA's "cashew" scenario, 450 training images).
- Appendix F "Qualitative Results", p.23–27: per-method qualitative
  strengths/weaknesses discussion (S–T's 65×65 receptive field limit
  explicitly contrasted with AST's whole-image receptive field), Figures
  9–11 (not independently verifiable from pdftotext beyond captions/prose —
  figure content itself is images, not transcribable text).
