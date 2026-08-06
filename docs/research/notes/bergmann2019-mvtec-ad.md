---
paper_id: bergmann2019-mvtec-ad
title: "MVTec AD — A Comprehensive Real-World Dataset for Unsupervised Anomaly Detection"
authors: ["P. Bergmann", "M. Fauser", "D. Sattlegger", "C. Steger"]
year: 2019
url: https://openaccess.thecvf.com/content_CVPR_2019/papers/Bergmann_MVTec_AD_--_A_Comprehensive_Real-World_Dataset_for_Unsupervised_Anomaly_CVPR_2019_paper.pdf
created: 2026-08-06
relevant_atlas_pages: [convolutional-neural-network, convolution, resnet]
---

# Setting

This is a **dataset and benchmark paper**, not an algorithm paper: it does not
propose a new detection method. It defines a problem class — **unsupervised
(one-class) visual anomaly detection for industrial inspection** — and
supplies the data plus an evaluation protocol that the field has since
standardized on.

- **Inputs (train time):** only defect-free ("good") RGB (mostly) or
  grayscale images of a single object/texture category, no anomalous images
  and no anomalous validation images at all (Sec. 3, p. 9595).
- **Inputs (test time):** a mix of defect-free and defective images of the
  same category.
- **Outputs:** (1) a per-image binary classification (anomalous vs.
  anomaly-free) and (2) a per-pixel anomaly segmentation map, evaluated
  against pixel-precise ground-truth defect masks (Sec. 4.3, p. 9598).
- **Preconditions:** high-resolution, well-lit, single-object/single-texture
  images acquired under controlled industrial-camera conditions (Sec. 3,
  p. 9595) — not natural/in-the-wild imagery.

# Core idea

MVTec AD (`MAD`) contributes three things simultaneously: (1) a dataset of
5354 high-resolution images across 15 real-world object/texture categories,
each with genuine (not synthetically rendered) manufacturing defects and
pixel-precise ground-truth masks; (2) a strict **one-class training
protocol** — training sets contain defect-free images only, and even the
hyperparameters/thresholds used at test time must be estimated from
anomaly-free validation images, never from anomalous ones (Sec. 4.3, p.
9598); (3) a first **cross-method benchmark**, evaluating five baseline
families (AnoGAN, two convolutional-autoencoder variants, a CNN
feature-dictionary method, and two classical/traditional methods) on both
classification accuracy and segmentation quality (Sec. 4, pp. 9595–9599).
The headline empirical finding is negative-by-design: no single evaluated
method wins consistently across all 15 categories (Sec. 4.4, p. 9598),
motivating the benchmark's continued use as a discriminating testbed.

# Assumptions

1. **One-class / semi-supervised training** (hard): the training
   distribution is assumed defect-free; the method under test never sees an
   anomalous training example. This is the field-defining constraint every
   benchmarked (and every later) method on MVTec AD inherits (Sec. 3, p.
   9595: "The training set contains only images without defects.").
2. **No anomalous validation data either** (hard): per Sec. 4.3 (p. 9598),
   thresholds/hyperparameters are fit only from "a set of randomly selected
   validation images that we exclude from the training set" — these
   validation images are drawn from the same defect-free pool, not from
   defective test images. A method that tunes on defective examples is not
   playing by the paper's own evaluation protocol.
3. **Single category per model** (soft): each of the 15 categories is
   evaluated independently; nothing in the paper's protocol assumes a model
   generalizes across categories.
4. **Studio-controlled acquisition** (soft/scope-limiting): images were
   acquired with a 2048×2048 industrial RGB sensor and two bilateral
   telecentric lenses under "highly controlled illumination conditions,"
   though illumination was intentionally varied for some object classes
   (Sec. 3, p. 9595). Findings may not transfer directly to uncontrolled,
   handheld, or outdoor imagery.
5. **Defects are real, not synthetic** (methodological strength, stated as
   such): "defects were manually generated with the aim to produce realistic
   anomalies as they would occur in real-world industrial inspection
   scenarios" (Sec. 3, p. 9595) — i.e., physically induced on real
   parts/materials, then photographed, not rendered or pasted-in.

# Failure regime

The paper documents *baseline-method* failure regimes empirically (Sec. 4.4,
pp. 9598–9599), not failure regimes of the dataset itself:

- **AnoGAN** (Sec. 4.4.1, p. 9599): prone to GAN mode collapse — the
  generator reproduces "more or less the same image" for all latent samples
  it searches over. Works better on object categories with low pose/shape
  variation (bottle, pill); fails completely on `carpet`, where it cannot
  model the subtle textural variation.
- **L2 / SSIM convolutional autoencoders** (Sec. 4.4.2, p. 9599): stable
  training across all categories but produce blurry reconstructions on
  high-frequency textures (`tile`, `zipper`), which the L2/SSIM
  reconstruction-error map then flags as false-positive anomalous regions
  across the whole image.
- **CNN Feature Dictionary** (Sec. 4.4.3, p. 9599): satisfactory on every
  texture category except `grid`; degrades markedly on objects because the
  method (ResNet-18 patch features + PCA + k-means, no positional encoding)
  discards spatial location information.
- **GMM-based texture inspection** (Sec. 4.4.4, p. 9599): performs well on
  most textures but fails on `grid` — many small defects fall below its
  sensitivity threshold.
- **Variation model** (Sec. 4.4.5, p. 9599): good on `screw`, `toothbrush`,
  `bottle`; bad on `metal nut`, `capsule` — objects whose surface imprint can
  appear at varying locations defeat a per-pixel mean/variance model, since
  the imprint position itself gets flagged as anomalous every time.
- **Cross-cutting observation** (Sec. 4.4, p. 9598–9599): "a high ROC AUC
  does not necessarily coincide with a high per-region overlap of the
  segmentation for the estimated threshold" — a method's anomaly *ranking*
  can be good while its *thresholded segmentation* still fails, evidence
  that threshold selection from anomaly-free-only data (Assumption 2 above)
  is itself hard.

# Numerical sensitivity

Not applicable in the usual sense (no proposed estimator/optimization here),
but the benchmark protocol embeds several sensitivity-relevant design
choices worth carrying forward:

- Threshold estimation (Sec. 4.3, p. 9598) is defined per category *and* per
  method via a "minimum defect area" that must be user-specified per
  category — the threshold is swept up from a validation set until the
  largest anomalous region on validation data falls just below that area.
  This makes reported classification/segmentation numbers sensitive to the
  chosen minimum-defect-area hyperparameter, not just to the underlying
  anomaly-scoring quality (ROC AUC is reported specifically because it is
  threshold-independent, Sec. 4.3, p. 9598).
- Patch/stride choices materially change compute-quality tradeoffs in the
  evaluated baselines: AnoGAN test-time patchwise evaluation uses a
  128-pixel stride specifically because a smaller stride is "not feasible
  due to the relatively long runtimes of AnoGAN's latent-space optimization"
  (Sec. 4.1.1, p. 9596) — i.e., the reported AnoGAN numbers are coarsened by
  a runtime constraint, not a modeling choice.
- SSIM-autoencoder only operates on grayscale (Sec. 4.1.2, p. 9596), so it
  structurally cannot see color-only defects — a modality limitation, not a
  robustness one.

# Applicability

- Use when: benchmarking a new one-class / unsupervised visual anomaly
  detection or segmentation method against a real-world, pixel-annotated,
  multi-category standard; needing defect-free-only training data with
  genuine (non-synthetic) industrial defects.
- Don't use when: the target application has natural-scene (non-industrial)
  imagery, uncontrolled illumination, or requires video/temporal anomaly
  detection — none of which this dataset covers.
- Compared against (contemporary alternatives cited by the paper as
  predecessors it improves on, Sec. 2.1, p. 9593–9594): NanoTWICE (Carrera et
  al., single-texture, 45 grayscale images, no multi-category coverage); the
  DAGM 2007 texture-defect dataset (Wieler & Hahn, artificially generated
  textures, coarse ellipse annotations, low inter-class appearance variance).
  MVTec AD's stated advance over both is being the first "comprehensive,
  multi-object, multi-defect dataset ... that provides pixel-accurate ground
  truth regions and focuses on real-world applications" (Abstract, p. 9592).

# Connections

- Builds on: none registered in `docs/papers/index.yaml` (`cites: []` for
  this entry). The paper's own references to AnoGAN (Schlegl et al.),
  VAEs (Kingma & Welling), GANs (Goodfellow et al.), AlexNet (Krizhevsky et
  al.), and MNIST (LeCun et al.) are not separately registered as Atlas
  sources.
- Related (component used by one evaluated baseline, not a methodological
  dependency of the dataset paper itself): `he2016-resnet` — the CNN Feature
  Dictionary baseline (Sec. 4.1.3, p. 9596) reimplements Napoletano et al.'s
  method using features from the 512-dim avgpool layer of an
  ImageNet-pretrained ResNet-18.
- Enables (per `cites:` fields in `docs/papers/index.yaml`, all use MVTec AD
  as their evaluation benchmark): `bergmann2020-uninformed-students`,
  `bergmann2022-mvtec-loco`, `roth2022-patchcore`, `rudolph2023-ast`,
  `zou2022-visa`, `batzner2023-efficientad`.

# Atlas update plan

## NEW: visual-anomaly-detection
Type: concept
Category: proposed `domain: anomaly-detection` (this domain value does not
yet exist among `content/concepts/*.md` or `content/models/*.md`; the
concept-page skill must decide whether to introduce it or fold under an
existing domain — flagging for that decision, not resolving it here).
Primary source: none single paper — this is a **survey concept page**
(per `docs/README.md` §4: ≥3 surveyed methods, ≥800 words, decision table
near the top). This paper (`bergmann2019-mvtec-ad`) is one of the ≥3 sources
the survey must synthesize; do not attribute the whole page to it.

This paper's specific contributions to the survey page (do not credit these
to sibling sources):

- **Definition section** — contribute the precise one-class problem
  statement: training on defect-free images only, no anomalous validation
  data, test-time classification *and* pixel-level segmentation as the two
  target tasks (Sec. 3–4.3, pp. 9595, 9598). This paper is the origin of the
  now-standard MVTec AD *protocol*, distinct from any specific detection
  method — sibling sources (`bergmann2020-uninformed-students`,
  `roth2022-patchcore`, `batzner2023-efficientad`) contribute the *methods*
  evaluated against this protocol, not the protocol itself.
- **Mathematical Description section** — contribute the paper's two defined
  metrics only: (1) classification accuracy (ratio of correctly classified
  anomaly-free / anomalous images per category, Table 2) and (2) segmentation
  quality via relative per-region overlap at an estimated threshold plus
  ROC AUC (pixel-level TPR/FPR), both defined in Sec. 4.3 (p. 9598). **Do
  not attribute AU-PRO to this paper** — searched the full cache text for
  "AU-PRO" / "PRO" and it does not appear; AU-PRO (integrating per-region
  overlap over a capped false-positive-rate range) belongs to Bergmann et
  al.'s 2021 IJCV extension, a *different* paper not covered by this note or
  its cache. If a sibling source's note defines AU-PRO, cite that note, not
  this one.
- **Numerical Concerns section** — contribute the threshold-estimation
  sensitivity finding: thresholds fit from anomaly-free-only validation data
  can yield high ROC AUC (good ranking) with poor per-region overlap (bad
  thresholded segmentation) (Sec. 4.4, pp. 9598–9599) — a concrete
  illustration of why one-class threshold selection is intrinsically harder
  than supervised threshold selection.
- **Where it appears section** — contribute the structural-defect taxonomy:
  15 categories (5 textures: carpet, grid, leather, tile, wood; 10 objects:
  bottle, cable, capsule, hazelnut, metal nut, pill, screw, toothbrush,
  transistor, zipper), 73 defect types, 1888 annotated defect regions, exact
  counts from Table 1 (p. 9596) — see this note's per-category table below
  for full numbers to lift into the decision table.
- **References section** — `bergmann2019-mvtec-ad` (this paper) as the
  benchmark/protocol source; sibling notes for method sources.

## NEW: efficientad
## NEW: patchcore
## NEW: uninformed-students
(All three: Type: model, planned model pages in this batch, not yet on
disk. This paper's only contribution to those three pages is as the
benchmark they report results on — `sources.references`, not
`sources.primary`. No further bullets from this note; their own primary
sources carry their architecture content.)

# Provenance

- Abstract (p. 9592): "5354 high-resolution color images of different
  object and texture categories," "over 70 different types of defects,"
  "pixel-precise ground truth regions for all anomalies," "first
  comprehensive, multi-object, multi-defect dataset for anomaly detection
  that provides pixel-accurate ground truth regions."
- Introduction, contribution bullets (p. 9593): "5354 high-resolution
  images of five unique textures and ten unique objects," "73 different
  types of anomalies," "1888 in total" ground-truth regions, "hyperparameters
  that are estimated without the knowledge of any anomalous images."
- Sec. 2.1.1–2.1.2 Related Work (pp. 9593–9594): NanoTWICE (Carrera et al.
  [6], 45 grayscale images, single texture); DAGM 2007 dataset (Wieler &
  Hahn [28], 10 artificial texture classes, 1000 defect-free + 150 defective
  patches per class, ellipse annotations).
- Sec. 3 Dataset Description (p. 9595): "15 categories with 3629 images for
  training and validation and 1725 images for testing. The training set
  contains only images without defects." Five textures (carpet, grid) =
  regular, (leather, tile, wood) = random; ten object categories, some rigid
  (bottle, metal nut), some deformable (cable) or naturally varying
  (hazelnut); acquisition via 2048×2048 industrial RGB sensor + bilateral
  telecentric lenses (1:5 and 1:1 magnification); output resolutions
  700×700–1024×1024; grid/screw/zipper are grayscale-only; "73 different
  defect types," "on average five per category"; "defects were manually
  generated with the aim to produce realistic anomalies."
- **Table 1** (p. 9596, columns: Category, #Train, #Test-good,
  #Test-defective, #Defect groups, #Defect regions, Image side length —
  this table parsed cleanly from pdftotext, cross-checked against prose
  totals):
  Carpet 280/28/89/5/97/1024; Grid 264/21/57/5/170/1024; Leather
  245/32/92/5/99/1024; Tile 230/33/84/5/86/840; Wood 247/19/60/5/168/1024;
  Bottle 209/20/63/3/68/900; Cable 224/58/92/8/151/1024; Capsule
  219/23/109/5/114/1000; Hazelnut 391/40/70/4/136/1024; Metal Nut
  220/22/93/4/132/700; Pill 267/26/141/7/245/800; Screw 320/41/119/5/135/1024;
  Toothbrush 60/12/30/1/66/1024; Transistor 213/60/40/4/44/1024; Zipper
  240/32/119/7/177/1024; **Total** 3629/467/1258/73/1888/–. Total images
  = 3629+467+1258 = 5354, matching Abstract. Total defect groups = 73,
  matching Introduction. Total defect regions = 1888, matching Introduction.
- Sec. 4.1.1 AnoGAN (p. 9596): implementation from
  github.com/LeeDoYup/AnoGAN; latent dim 64; generated image size 128×128;
  50 training epochs, initial LR 0.0002; 300 test-time latent-search
  iterations, initial LR 0.02; anomaly map = per-pixel ℓ2 comparison;
  objects zoomed to 128×128; textures zoomed to 512×512 with 128×128
  training patches; test-time patchwise stride 128 px ("not feasible" to go
  smaller "due to the relatively long runtimes of AnoGAN's latent-space
  optimization").
- Sec. 4.1.2 L2/SSIM Autoencoder (p. 9596): CAE architecture per Bergmann et
  al. [4] (VISAPP 2019, ref [4], p. 9599–9600 — not separately registered
  in `docs/papers/index.yaml`); texture patches 128×128; SSIM window
  11×11 px; latent dim 100 ("larger latent space dimensions do not yield
  significant improvements... lower dimensions lead to degenerate
  reconstructions"); objects processed at 256×256 via an added conv layer;
  texture reconstruction stride 30 px, maps averaged; SSIM-AE trained/
  evaluated on grayscale only.
- Sec. 4.1.3 CNN Feature Dictionary (p. 9596–9597): reimplementation of
  Napoletano et al. [18]; ResNet-18 avgpool layer (512-dim) features,
  ImageNet-pretrained; PCA retaining 95% variance (→ "around 100
  components"); k-means with 10 cluster centers; patch size 16×16;
  objects at 256×256, textures at 512×512; evaluation stride 4 px;
  grayscale inputs triplicated to 3 channels for ResNet.
- Sec. 4.1.4 GMM-Based Texture Inspection (p. 9597): Böttger & Ulrich [5]
  method, HALCON implementation; texture images downscaled to 400×400;
  4-layer image pyramid; patch size 7×7 per level; 10 randomly selected
  training images; anomaly map = per-pixel negative log-likelihood under
  the trained GMM; "automatically provides a threshold" (the only baseline
  that does, per Sec. 4.3).
- Sec. 4.1.5 Variation Model (p. 9597): Steger et al. [26, Ch. 3.4.1.4];
  alignment via shape-based matching [24, 25]; restricted to a subset of
  objects since "near pixel-accurate alignment is not possible for every
  object"; 30 randomly selected training images per object, original size,
  grayscale; per-pixel mean/std-dev model; test-time deviation test against
  a threshold.
- Sec. 4.2 Data Augmentation (p. 9598): random rotated rectangular crops
  for textures; random translation + rotation (+ mirroring "where the
  object permits it") for objects; augmented to "10000 training patches"
  per category, applied only to the deep-architecture baselines.
- Sec. 4.3 Evaluation Metric (p. 9598): two tasks (classification,
  segmentation); classification = accuracy of correctly classified
  anomaly-free/anomalous images; segmentation = "relative per-region
  overlap" at an estimated threshold + ROC AUC (TPR = % pixels correctly
  classified anomalous, FPR = % pixels wrongly classified anomalous, both
  computed per category); threshold estimation procedure = sweep increasing
  thresholds on the anomaly-free validation set until the largest detected
  region falls just below a user-defined minimum defect area, per category
  per method; only the GMM-based method provides a threshold "out of the
  box."
- Sec. 4.4–4.4.5 Results discussion (pp. 9598–9599): all qualitative
  per-method findings in the Failure regime section above are drawn
  verbatim/paraphrased from this section's prose (not from Tables 2/3 — see
  caveat below).
- Sec. 5 Conclusions (p. 9599): "there is still considerable room for
  improvement" — framed as a statement about evaluated *methods*, not a
  self-assessed limitation of the dataset. **The paper has no dedicated
  "Limitations" section discussing what the dataset itself does not cover**;
  the scope constraints in Applicability/Assumptions above (studio-controlled
  acquisition, no video/temporal data, industrial-inspection framing only)
  are inferred from Sec. 3's acquisition description, not from an explicit
  self-critique — flagged `?` accordingly, not stated as the authors' own
  claim.
- References [4]–[28] used for method attribution: [4] Bergmann, Löwe,
  Fauser, Sattlegger, Steger, VISAPP 2019 (SSIM-AE precursor); [5] Böttger &
  Ulrich, Pattern Recognition and Image Analysis 26(1), 2016 (GMM texture
  inspection); [11] He, Zhang, Ren, Sun, CVPR 2016 (ResNet, registered as
  `he2016-resnet`); [18] Napoletano, Piccoli, Schettini, Sensors 18(1),
  2018 (CNN feature dictionary); [23] Schlegl et al., IPMI 2017 (AnoGAN);
  [26] Steger, Ulrich, Wiedemann, *Machine Vision Algorithms and
  Applications*, 2nd ed., Wiley-VCH, 2018 (variation model, Ch. 3.4.1.4,
  telecentric lens description Ch. 2.2.4.2).
- `docs/papers/index.yaml` lines 1434–1442 (`bergmann2019-mvtec-ad` entry,
  `cites: []`) and downstream entries with `cites: [..., bergmann2019-mvtec-ad,
  ...]` at lines 1423–1496 (`batzner2023-efficientad`,
  `bergmann2020-uninformed-students`, `bergmann2022-mvtec-loco`,
  `roth2022-patchcore`, `rudolph2023-ast`, `zou2022-visa`) — used only for
  the Connections section's citation-graph facts, not for paper content.

**Caveat on Tables 2 and 3 (per-category classification/segmentation
results, pp. 9596–9598):** pdftotext's linearization of these two-column,
multi-row tables interleaves category labels, numeric cells, and
surrounding body-text lines in an order that does not reliably map each
numeric cell back to its (category, method, good/defective) triple — e.g.
category labels appear offset by one visual row from data rows, and
prose fragments from the facing column are interspersed between rows of
the same category. Rather than risk mis-attributing a number to the wrong
category/method, this note deliberately omits per-category numeric
transcription from Tables 2/3 and relies only on the cleanly-extracted
prose summary in Sec. 4.4 for method-level findings (see Failure regime
above). Table 1 (dataset composition, p. 9596) did **not** exhibit this
problem — its rows parsed cleanly and its Total row cross-checks against
three independent prose statements (Abstract image count, Introduction
defect-type count, Introduction defect-region count), so it is trusted
verbatim.
