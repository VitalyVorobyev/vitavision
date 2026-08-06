---
paper_id: bergmann2020-uninformed-students
title: "Uninformed Students: Student-Teacher Anomaly Detection With Discriminative Latent Embeddings"
authors: ["P. Bergmann", "M. Fauser", "D. Sattlegger", "C. Steger"]
year: 2020
url: https://arxiv.org/pdf/1911.02357
created: 2026-08-06
relevant_atlas_pages: [convolutional-neural-network, convolution, resnet, vgg, feature-descriptors, dinov2, unet-segmentation]
---

# Setting

Unsupervised, pixel-precise anomaly segmentation in high-resolution natural
images (industrial inspection is the motivating use case). Input: a training
set $D = \{I_1, I_2, \dots, I_N\}$ of anomaly-free images only — no defect
labels, no defective examples at train time (§3, opening paragraph). At test
time the input is a single image $J \in \mathbb{R}^{w \times h \times C}$.
Output: a dense per-pixel anomaly score map of the same spatial size as the
input (obtained without cropping/striding — a single forward pass through a
fully-convolutional network yields one descriptor per pixel), which is
thresholded downstream to produce a binary anomaly/defect segmentation. No
calibration or camera-model assumptions; this is a pure feature-regression
formulation over RGB (or single/multi-channel, $C$ general) patches.

# Core idea

A **teacher** network $T$ is a fixed, fully-convolutional feature extractor
that outputs a $d$-dimensional descriptor for every pixel of an input image,
where each descriptor summarizes a square receptive-field patch of side
length $p$ centered at that pixel (§3, "each student $S_i$ ... outputs
$S_i(I) \in \mathbb{R}^{w\times h\times d}$"; the teacher $T$ shares the
student architecture but is held constant). $T$ is built from a
patch-classification network $\hat T: \mathbb{R}^{p\times p\times C} \to
\mathbb{R}^d$ by a deterministic "fast dense" network transformation
(patch-net → fully-convolutional net, citing Huang & Ramanan-style
receptive-field tiling — ref [4] in the paper; **the transformation itself is
not re-derived in this paper, only cited** `?`), avoiding strided
patch-by-patch evaluation.

An **ensemble of $M$ students** $S_i$, $i \in \{1,\dots,M\}$, sharing the
teacher's architecture but randomly initialized, are trained **only on
anomaly-free images** to regress the teacher's (normalized) output at every
pixel (§3.2, Eq. 7). Each student's output at a pixel is treated as the mean
of a unit-mixture-weight Gaussian component; averaging the $M$ students'
per-pixel means gives a Gaussian-mixture prediction. Two complementary
per-pixel anomaly signals are derived from this mixture at inference:

1. **Regression error** $e_{(r,c)}$ — squared distance between the mixture
   mean and the (normalized) teacher target (Eq. 8–9). High when all
   students agree but agree *wrongly* — the classic failure mode of an
   ensemble that has not seen the input's local statistics during training.
2. **Predictive variance** $v_{(r,c)}$ — the ensemble's *disagreement* about
   its own prediction, computed as the trace-style mixture variance from
   Kendall et al.'s formula for the variance of a Gaussian mixture with
   equal weights and constant per-component covariance (Eq. 10):
   $v_{(r,c)} = \frac{1}{M}\sum_{i=1}^{M} \lVert \mu^{S_i}_{(r,c)} \rVert_2^2 -
   \lVert \mu_{(r,c)} \rVert_2^2$, where $\mu_{(r,c)} = \frac{1}{M}\sum_{i=1}^M
   \mu^{S_i}_{(r,c)}$ is the mixture mean already used in Eq. 8–9. The paper's
   printed form of Eq. 10 does not carry an explicit $+s$ term for the
   per-student constant covariance $s$ — since $s$ is a scalar constant
   (identical across pixels, students, and the ensemble), including or
   omitting it only adds a uniform offset to every $v_{(r,c)}$ and therefore
   cannot change the per-pixel ranking of scores, nor does it survive the
   z-normalization of Eq. 11 (a constant offset cancels exactly against the
   validation-set mean $v_\mu$). High when students diverge from each other,
   independent of whether their mean is close to the teacher's target.

These two terms are separately z-normalized over a held-out anomaly-free
validation set and summed (Eq. 11) to give a single combined score per pixel;
combined scores from ensembles trained at multiple receptive-field sizes $p$
are then averaged again (Eq. 12) to produce the final multi-scale anomaly
map. The teacher itself is obtained by a three-term loss combining knowledge
distillation from a pretrained classification network, optional triplet
metric learning, and a decorrelation ("descriptor compactness") term (§3.1,
Eq. 1–6) — no anomaly-detection-specific data is used at any point in
teacher training; the teacher never sees the target domain's images (paper
explicitly notes it "has not observed images of the evaluated datasets during
pretraining to avoid an unfair bias").

# Assumptions

1. **Anomaly-free training data available.** Both teacher pretraining (on
   ImageNet crops, unrelated to the target domain) and student ensemble
   training (on the target domain's defect-free images) require this; the
   students never see anomalies. Hard: if the "anomaly-free" training set is
   contaminated with undetected defects, the students will learn to regress
   the teacher correctly on those regions too, silently suppressing the
   anomaly signal there.
2. **Anomalies manifest as local descriptor shifts the ensemble has not
   generalized to.** The method's entire signal (both $e$ and $v$) hinges on
   students failing to generalize outside the anomaly-free manifold (§3,
   "Our intuition is that students will generalize poorly outside the
   manifold of anomaly-free training data"). This is an empirical
   assumption about CNN generalization behavior, not a proven guarantee —
   soft assumption, degrades gracefully as generalization improves/worsens.
3. **Receptive field size $p$ must be commensurate with the anomaly's
   spatial scale.** A single fixed $p$ under- or over-segments anomalies
   whose size differs strongly from $p$ (§3.3, and Fig. 5's worked example of
   a small scratch vs. a missing imprint). Hard within a single scale; the
   paper's own mitigation is to train multiple $(S,T)$ pairs at different
   $p$ and average (Eq. 12) — an architectural workaround, not a relaxation
   of the assumption.
4. **Teacher and students share identical network architecture** (§3,
   "possess the identical network architecture as the teacher $T$"); the
   ensemble members differ only in random initialization, not capacity or
   depth.
5. **Constant, scalar output covariance $s \in \mathbb{R}$** is assumed for
   each student's per-pixel Gaussian ($\mathcal{N}(y \mid \mu^{S_i}_{(r,c)},
   s)$, §3.2) — this constant-variance assumption is what collapses the
   Gaussian negative-log-likelihood training criterion down to the plain
   squared-$\ell_2$ regression loss of Eq. 7 (the paper states this
   simplification explicitly: "The log-likelihood training criterion ...
   then simplifies to the squared $\ell_2$-distance in feature space").

# Failure regime

- **Scale mismatch** (empirically shown, Table 3 / Fig. 5): a receptive
  field too small relative to the anomaly under-detects it because the
  extracted descriptor is dominated by anomaly-free context within the
  patch (§3.3, "the extracted feature vector predominantly describes
  anomaly-free traits of the local image region. Consequently, the
  descriptor can be predicted well by the students and anomaly detection
  performance will decrease"); a receptive field too large loses spatial
  precision for small anomalies. Table 3's per-category numbers show
  category-dependent, sometimes opposite, sensitivity to $p$: e.g. Wood
  drops from 0.943 ($p=17$) to 0.725 ($p=65$), while Cable rises from 0.671
  to 0.865 over the same range — no single scale dominates.
- **High false-positive-rate regime is not meaningfully evaluable** — the
  paper's own PRO-based metric is explicitly capped at an average per-pixel
  false-positive rate of 30% because "for high false-positive rates, large
  parts of the input images would be wrongly labeled as anomalous and even
  perfect PRO values would no longer be meaningful" (§4.2). This is a
  measurement-validity boundary, not strictly a model failure, but it bounds
  what the reported numbers can be trusted to say.
- **1-NN baseline beats the proposed method on small, low-diversity
  datasets** (MNIST/CIFAR-10, Table 2): "for 1-NN, every single training
  vector can be stored, it performs exceptionally well on these small
  datasets" — i.e., when the anomaly-free class's variability is small
  enough to memorize by nearest-neighbor lookup, the ensemble-regression
  approach's generalization advantage is not needed and a much simpler
  baseline wins on that axis (still loses on the harder/larger MVTec AD
  set, Table 1).
- **No formal "Limitations" or "Discussion of failure modes" section
  exists in the paper** — the above are drawn from ablation-table trends and
  incidental remarks in §3.3/§4, not a dedicated limitations discussion.
  `?` (could not locate an explicit limitations paragraph beyond the
  brief Conclusion, §5).

# Numerical sensitivity

- **Per-pixel z-normalization is load-bearing for combining the two score
  types and multiple scales.** Eq. 11 requires validation-set statistics
  $e_\mu, v_\mu, e_\sigma, v_\sigma$ computed over "a validation set of
  anomaly-free images" (§3.2) — without this normalization the error and
  variance terms are not on comparable numerical scales (regression error
  is a squared-$\ell_2$ quantity in normalized-teacher-feature space;
  variance is an ensemble second-moment quantity) and summing them directly
  would let whichever term has larger raw magnitude dominate.
- **Teacher-descriptor normalization precedes everything downstream.**
  Component-wise mean $\mu \in \mathbb{R}^d$ and std $\sigma \in
  \mathbb{R}^d$ over all training descriptors are computed once (§3.2,
  before Eq. 7) and used to whiten the teacher's target
  $(y^T_{(r,c)} - \mu)\,\mathrm{diag}(\sigma)^{-1}$ inside both the training
  loss (Eq. 7) and both anomaly-score terms (Eq. 8/9, Eq. 10 implicitly via
  the trained $\mu^{S_i}$). A miscalibrated or unrepresentative training
  set for computing $\mu,\sigma$ would bias every downstream score.
- **Descriptor-compactness (decorrelation) loss term is only a soft
  regularizer**, not a hard-normalized whitening step; Table 2's ablation
  shows it consistently helps (e.g. $\mathcal{L}_k+\mathcal{L}_c$: 0.9935
  MNIST vs. $\mathcal{L}_k$ alone: 0.9917) but the paper gives no
  sensitivity analysis of the loss weight $\lambda_c$ itself beyond
  on/off ($\lambda \in \{0,1\}$ in the ablation, §4.1: "$\checkmark$
  corresponds to setting the respective loss weight to 1, otherwise it is
  set to 0"). No continuous sweep of $\lambda_k, \lambda_m, \lambda_c$ is
  reported. `?`
- **Multi-scale averaging (Eq. 12) is unweighted** (simple arithmetic mean
  over $L$ scales) — no scale-adaptive weighting is proposed or tested.

# Applicability

- Use when: anomaly-free training data is abundant, the anomaly's spatial
  scale is roughly known or can be swept via multi-scale ensembles, and a
  dense, high-resolution segmentation (not just an image-level flag) is
  needed.
- Don't use when: only a handful of anomaly-free training images exist
  (favors non-parametric baselines like 1-NN, per the MNIST/CIFAR-10
  result), or when compute for training $M$ full CNN ensembles per
  receptive-field scale is prohibitive.
- Compared against (paper's own Table 1/2 baselines): 1-NN, OC-SVM,
  K-Means, deterministic $\ell_2$-autoencoder, VAE (reconstruction
  probability), SSIM-Autoencoder, AnoGAN, CNN-Feature Dictionary, OCGAN.

# Connections

- Builds on: teacher pretraining combines knowledge distillation from a
  pretrained ResNet-18 classifier (paper cites this as effectively
  transfer learning, no specific `paper_id` resolvable in this repo's
  index — not linked), triplet-based self-supervised metric learning
  (paper ref [12], not in this repo's index `?`), and a descriptor
  decorrelation/compactness technique attributed to "Vassileios et al."
  (paper ref [35], appears in the bibliography as Balntas et al. — not in
  this repo's index `?`). None of these upstream techniques currently have
  a `paper_id` entry in `docs/papers/index.yaml` as far as this note's
  author could verify without a network fetch (out of scope for this
  extraction task).
- Enables: `efficientad` (2023) — a later paper (not yet ingested in this
  repo as of this note) that keeps the student-teacher principle but
  replaces this paper's pretrained-backbone ensemble with a single
  distilled patch-description network and loss-induced asymmetry. See
  Atlas update plan below for the planned typed relation.
- Refutes / supersedes: none identified within this paper's own scope (it
  positions itself as outperforming prior generative/shallow baselines,
  not superseding a specific single prior method).

# Atlas update plan

## NEW: uninformed-students

Type: model
Category: anomaly-detection (deep-learning model register entry, per
`content/models/*.md` conventions)
Primary source: this paper (`bergmann2020-uninformed-students`)

**Motivation**
- Frame as: unsupervised, pixel-precise anomaly segmentation trained purely
  on anomaly-free data by regressing a fixed teacher's dense per-pixel
  feature output with an ensemble of students; anomalies are wherever the
  ensemble fails to generalize (regression error) or disagrees with itself
  (predictive variance).
- Contrast with prior shallow-ML-on-pretrained-features pipelines (1-NN,
  OC-SVM, K-Means, PCA+clustering) and generative reconstruction-error
  methods (AE, VAE, GAN) that this paper's Table 1/2 benchmarks against and
  outperforms on MVTec AD.
- State clearly that the teacher is pretrained entirely off-domain (ImageNet
  patch crops) and never observes the evaluated datasets, to avoid bias
  (paper's own explicit claim, §4 intro).

**Architecture**
- Teacher $T$: fully-convolutional descriptor network, built from a
  patch-classification network $\hat T$ via a deterministic dense-evaluation
  transform; outputs $d=128$-dim descriptors per pixel (§4, "Each teacher
  network outputs descriptors of dimension $d=128$").
- Teacher training loss (Eq. 1–6): knowledge distillation
  $\mathcal{L}_k(\hat T) = \lVert D(\hat T(p)) - P(p)\rVert^2$ (distilling
  a pretrained ResNet-18, 512-dim FC-layer features, into $\hat T$ via a
  decoder $D$); optional triplet metric-learning loss
  $\mathcal{L}_m(\hat T) = \max\{0, \delta + \delta^+ - \delta^-\}$; and a
  descriptor-decorrelation/compactness loss
  $\mathcal{L}_c(\hat T) = \sum_{i\neq j} c_{ij}$ (correlation-matrix
  off-diagonal sum). Combined as $\mathcal L(\hat T) = \lambda_k
  \mathcal L_k + \lambda_m \mathcal L_m + \lambda_c \mathcal L_c$ (Eq. 6);
  best config on MNIST/CIFAR-10 and used for MVTec AD is $\lambda_k =
  \lambda_c = 1$, $\lambda_m = 0$.
- Student ensemble: $M=3$ students (MVTec AD experiments) or $M=5$ (MNIST/
  CIFAR-10), identical architecture to teacher, randomly initialized,
  trained with squared-$\ell_2$ regression loss (Eq. 7) against the
  z-normalized teacher target.
- Scoring: regression error $e_{(r,c)}$ (Eq. 8/9) + predictive variance
  $v_{(r,c)}$ (Eq. 10, Kendall-et-al. mixture-variance form) → z-normalized
  over a validation set and summed (Eq. 11) → averaged across $L$
  receptive-field scales (Eq. 12).
- Multi-scale: receptive fields $p \in \{17, 33, 65\}$ pixels used in MVTec
  AD experiments (Table 3, Table 5, Table 4 for $p=65$ architecture
  detail).
- Training setup (verbatim numbers, §4): Adam optimizer; teacher
  pretraining — initial LR $2\times10^{-4}$, weight decay $10^{-5}$, batch
  size 64, $5\times10^4$ iterations; MVTec AD student/full pipeline — input
  zoomed to $256\times256$, 100 epochs, batch size 1 (paper notes this is
  "equivalent to training on a large number of patches per batch due to the
  limited size of the networks' receptive field"), Adam initial LR
  $10^{-4}$, weight decay $10^{-5}$. Activation: leaky ReLU, slope
  $5\times10^{-3}$, throughout.

**Assessment**
- Metric used: **normalized area under the per-region-overlap (PRO) curve**,
  integrated up to an average per-pixel false-positive rate of 30%, then
  normalized to a max achievable value of 1 (§4.2). This paper does **not**
  use the term "AU-PRO" (that later terminology is not present in this
  text) and does **not** report ROC-AUC on MVTec AD (ROC-AUC is used only
  for MNIST/CIFAR-10 one-class experiments, Table 2/6/7). Do not conflate
  the two metrics when writing the Atlas page.
- MVTec AD results (Table 1, $p=65$, verbatim, "Ours" column vs. best
  baselines): Carpet 0.695, Grid 0.819, Leather 0.819, Tile 0.912, Wood
  0.725, Bottle 0.918, Cable 0.865, Capsule 0.916, Hazelnut 0.937, Metal
  nut 0.895, Pill 0.935, Screw 0.928, Toothbrush 0.863, Transistor 0.701,
  Zipper 0.933, **Mean 0.857** — vs. baseline means (Table 1's full column
  set, verbatim): 1-NN 0.640, OC-SVM 0.479, K-Means 0.423, $\ell_2$-AE
  0.790, VAE 0.639, SSIM-AE 0.694, AnoGAN 0.443, CNN-Feature-Dictionary
  0.515. Note the deterministic $\ell_2$-autoencoder (0.790) clearly
  outperforms the VAE (0.639) among the baselines — do not conflate the
  two when writing the Atlas page.
- Multi-scale ablation (Table 3): mean PRO $p=17$: 0.866, $p=33$: 0.900,
  $p=65$: 0.857, **multiscale: 0.914** — combining scales beats every
  single scale on average, though not on every category (e.g. Leather:
  $p=33$ alone, 0.956, beats multiscale 0.945).
- MNIST/CIFAR-10 one-class ROC-AUC (Table 2): best config (loss
  $\mathcal L_k + \mathcal L_c$, i.e. distillation + compactness, no
  metric-learning term) reaches 0.9935 / 0.8196 mean, vs. 1-NN 0.9753 /
  0.8189, $\ell_2$-AE 0.9832 / 0.7898, OCGAN 0.9750 / 0.6566.
- `noPublicImpl: true` is required for this page. MVTec released no
  official code. The most-starred third-party reimplementation
  (`denguir/student-teacher-anomaly-detection`, 186 stars) has no LICENSE
  file at all, so its licence field cannot be populated. The only
  MIT-licensed option (`LuyaooChen/uninformed-students-pytorch`, 37 stars)
  is unmaintained and low-traction. Citing either would put an unverifiable
  or dead implementation on a reference page.
- Do not conflate this paper with anomalib's `stfpm` model — that
  implements Wang et al., "Student-Teacher Feature Pyramid Matching"
  (BMVC 2021), a DIFFERENT paper that descends from this one. anomalib
  carries no Uninformed Students implementation.

**Implementations**
- None to list (see `noPublicImpl: true` note above under Assessment —
  repeated here per the standard model-page section grouping).

**References**
- Primary: this paper (`bergmann2020-uninformed-students`).
- Kendall et al. — cited (paper ref [14]) as the source of the predictive-
  uncertainty/mixture-variance formula used in Eq. 10; not verified against
  this repo's `docs/papers/index.yaml` in this extraction pass. `?`

**Relations** (planned, to add to the page's frontmatter when drafted):
```
Relations:
  { type: extended_by, target: efficientad, confidence: high, caution: "EfficientAD keeps the student-teacher principle but replaces the pretrained-backbone ensemble with a single distilled patch description network and loss-induced asymmetry." }
```
Note: `efficientad` is a planned page in this same authoring batch and does
NOT exist on disk yet — this relation cannot be validated against an
on-disk page right now. That is expected; do not attempt to validate it
until `efficientad`'s page exists.

**Survey membership (prerequisites, not relations)**
A planned survey concept page `visual-anomaly-detection` will list this
model. Per repo convention, survey membership is expressed through
`prerequisites`, not `relations[]`. When the `uninformed-students` page is
drafted, its `prerequisites` field should include `visual-anomaly-detection`.
As of this note, `visual-anomaly-detection` does NOT exist on disk yet
either — this is a forward reference to reconcile once that survey page is
authored, per the batch-authoring forward-reference workflow.

# Provenance

- Title, authors, venue self-identification: HTML `<h1 class="ltx_title...">`
  line 55; author block lines ~56–63.
- Abstract framing (student-teacher, unsupervised, pixel-precise,
  MVTec AD): `.txt` lines 1–20.
- §3 opening (problem statement, $D$, $S_i$, $T$, $y_{(r,c)} \in
  \mathbb{R}^d$, receptive field $p$): `.txt` lines ~154–176 (section
  "3. Student–Teacher Anomaly Detection").
- §3.1 "Learning Local Patch Descriptors": teacher construction from
  $\hat T$ via deterministic transform (cites ref [4]), ImageNet-crop
  training data: `.txt` lines ~178–200.
- Eq. 1 (knowledge distillation loss $\mathcal L_k$): `.txt` line ~211
  ("$\mathcal{L}_k(\hat T) = \lVert D(\hat T(p)) - P(p)\rVert^2$" — labeled
  "(1)"); confirmed present, decoder $D$ defined immediately after.
- "Knowledge Distillation" subsubsection header: HTML line 178.
- "Metric Learning" subsubsection header: HTML line 195; Eq. 2–4
  (triplet loss $\mathcal L_m = \max\{0,\delta+\delta^+-\delta^-\}$,
  $\delta^+ = \lVert \hat T(p)-\hat T(p^+)\rVert_2$,
  $\delta^- = \min\{\lVert\hat T(p)-\hat T(p^-)\rVert^2,
  \lVert\hat T(p^+)-\hat T(p^-)\rVert^2\}$): `.txt` lines ~220–228.
- "Descriptor Compactness" subsubsection header: HTML line 229; Eq. 5
  ($\mathcal L_c(\hat T) = \sum_{i\neq j} c_{ij}$) verified directly in
  HTML `<math>`/MathML block at HTML line 237 (`id="S3.E5.m1.2"`,
  `application/x-tex` annotation reads exactly
  `\mathcal{L}_{c}(\hat{T})=\sum_{i\neq j}c_{ij},`), matching `.txt` line
  ~236; $c_{ij}$ definition (correlation-matrix entries, no explicit
  formula for $c_{ij}$ itself given in the paper — verified absent by
  searching the HTML around this passage, only the prose gloss "denotes
  the entries of the correlation matrix computed over all descriptors
  $\hat T(p)$ in the current minibatch" is present, HTML line 242):
  `.txt` lines ~236–237.
- Eq. 6 (combined teacher loss
  $\mathcal L(\hat T) = \lambda_k \mathcal L_k + \lambda_m \mathcal L_m +
  \lambda_c \mathcal L_c$): `.txt` lines ~213–216.
- §3.2 "Ensemble of Student Networks for Deep Anomaly Detection": $\mu,
  \sigma$ normalization stats, $M \geq 1$ students, Gaussian
  $\mathcal N(y \mid \mu^{S_i}_{(r,c)}, s)$ with constant scalar covariance
  $s$: `.txt` lines ~230–256.
- Eq. 7 (student regression loss, squared $\ell_2$ after normalization):
  `.txt` lines ~254–258.
- "Scoring Functions for Anomaly Detection" subsubsection header: `.txt`
  line ~258 ("Scoring Functions for Anomaly Detection." inline) / HTML
  line 1288.
- Eq. 8/9 (regression error $e_{(r,c)}$, expanded mixture-mean form):
  `.txt` lines ~262–268; Eq. 9 cross-verified directly against HTML MathML
  block at HTML line ~1304 (`id="S3.E9.m1.7"`, matches
  `\frac{1}{M}\sum_{i=1}^{M}\bm{\mu}^{S_i}_{(r,c)} -
  (\textbf{y}^T_{(r,c)}-\bm{\mu})\mathrm{diag}(\bm{\sigma})^{-1}` inside a
  squared-$\ell_2$ norm) — confirms the `.txt` transcription is faithful,
  not reconstructed from a generic-autoencoder template.
- Eq. 10 (predictive variance $v_{(r,c)}$, citing Kendall et al. [14] for
  the mixture-variance form): `.txt` lines ~274–281.
- Eq. 10 exact expression cross-verified directly against HTML MathML block
  at HTML lines 1313–1317 (`id="S3.E10"`, `application/x-tex` annotation
  `id="S3.E10.m1.7c"` reads exactly
  `v_{(r,c)}=\frac{1}{M}\sum_{i=1}^{M}||\bm{\mu}_{(r,c)}^{S_{i}}||_{2}^{2}-||\bm{\mu}_{(r,c)}||_{2}^{2}.`,
  §3.2 "Ensemble of Student Networks for Deep Anomaly Detection" →
  "Scoring Functions for Anomaly Detection") — no additive $+s$ (constant
  per-student covariance) term appears in the printed equation; $s$ is used
  earlier (§3.2, before Eq. 7) only to justify collapsing the Gaussian
  log-likelihood training criterion to the squared-$\ell_2$ loss, and does
  not reappear in Eq. 8, 9, 10, or 11.
- Eq. 11 (z-normalization and summation of $e$, $v$ scores; validation-set
  statistics $e_\mu, v_\mu, e_\sigma, v_\sigma$): `.txt` lines ~283–290.
- §3.3 "Multi-Scale Anomaly Segmentation": scale-dependent under/over-
  segmentation discussion, Eq. 12 (multi-scale averaging over $L$ scales):
  `.txt` lines ~293–312.
- Fig. 5 caption (worked example: $p=17$ segments small scratch well, larger
  $p$ needed for missing-imprint defect; multiscale mitigates): `.txt`
  lines ~326–329.
- §4 "Experiments" intro, teacher-domain-independence claim ("the teacher
  has not observed images of the evaluated datasets during pretraining to
  avoid an unfair bias"): `.txt` lines ~333–345.
- Training/hyperparameter details ($p \in \{17,33,65\}$, leaky ReLU slope
  $5\times10^{-3}$, ResNet-18 512-dim distillation target, Adam
  $2\times10^{-4}$ LR / $10^{-5}$ weight decay / batch 64 / $5\times10^4$
  iterations for teacher pretraining, $d=128$ output dim): `.txt` lines
  ~330–366.
- Table 4 ($p=65$ architecture): `.txt` lines ~369–381 (layer-by-layer
  output sizes/kernels/strides).
- Table 5a/5b ($p=33$, $p=17$ architectures): `.txt` lines ~460–473.
- §4.1 "MNIST and CIFAR-10": $M=5$ students, patch size $p=33$ for this
  subsection, ROC-AUC metric: `.txt` lines ~382–420.
- Table 2 (MNIST/CIFAR-10 ROC-AUC, ablation over $\mathcal L_k,\mathcal
  L_m,\mathcal L_c$): `.txt` lines ~397–413.
- Table 6, Table 7 (per-class ROC-AUC breakdowns for MNIST, CIFAR-10):
  `.txt` lines ~556–575 (Table 6 fully visible; Table 7 header visible,
  remainder beyond read window — not needed for this note's claims).
- §4.2 "MVTec Anomaly Detection Dataset": $w=h=256$ input zoom, 100 epochs,
  batch size 1, Adam LR $10^{-4}$/weight decay $10^{-5}$, $\lambda_k=
  \lambda_c=1, \lambda_m=0$, $M=3$ students, PCA retaining 95% variance
  for shallow-model baselines, PRO metric definition and 30%-FPR cap and
  normalization-to-1: `.txt` lines ~421–451.
- Table 1 (MVTec AD per-category results, "Ours" $p=65$ vs. all baselines):
  `.txt` lines ~229–246 (table appears mid-document in the pdftotext
  linearization, immediately after Eq. 9, ahead of its own discussion
  text — a pdftotext layout artifact; content verified consistent with the
  Table 1 caption text "the normalized area under the PRO-curve up to an
  average false positive rate per-pixel of 30%" at `.txt` lines ~247–249).
- Table 3 (per-category results at $p\in\{17,33,65\}$ and multiscale):
  `.txt` lines ~382–396.
- §4.2 results discussion (per-category scale sensitivity, e.g. bottle/
  cable favor larger $p$, wood/toothbrush favor smaller $p$): `.txt` lines
  ~452–459.
- §5 "Conclusion" (brief; no dedicated limitations subsection found):
  `.txt` lines ~475–484.
- Appendix C "Experiments on MVTec AD" — shallow-model hyperparameters
  (1-NN: 5000-vector dictionary; other shallow classifiers: 50,000 samples;
  K-Means: 10 clusters; OC-SVM: RBF kernel), deep-learning-baseline
  hyperparameters ($\ell_2$-AE/VAE: 100 epochs, Adam LR $10^{-4}$/weight
  decay $10^{-5}$, batch of 512 sampled vectors, VAE reconstruction
  probability via 5 forward passes), CNN-Feature-Dictionary adaptation
  (patches $p=65$, stride 4): `.txt` lines ~485–520.
- Appendix B hyperparameters (autoencoder architecture 128–64–32–10,
  leaky ReLU slope $5\times10^{-3}$, Adam LR $10^{-2}$, batch 64, weight
  decay $10^{-5}$, 100 epochs; used for MNIST/CIFAR-10 baselines, distinct
  from the MVTec AD baseline hyperparameters in Appendix C): `.txt` lines
  ~503–517.
- Search performed for "AU-PRO"/"AUPRO" terminology: zero matches in the
  full `.txt` (`grep -ni "au-pro\|AUPRO"`) — confirms the paper predates and
  does not use that later term; it reports "normalized area under the
  PRO-curve" only.
- Search performed for "limitation"/"fail"/"drawback"/"weakness": no
  dedicated limitations discussion found; all "fail" occurrences are
  either the core-idea framing ("students will generalize poorly ...") or
  unrelated prior-work descriptions ("unimodal Gaussian distributions will
  fail to model...").
