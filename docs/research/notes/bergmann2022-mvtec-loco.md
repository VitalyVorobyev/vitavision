---
paper_id: bergmann2022-mvtec-loco
title: "Beyond Dents and Scratches: Logical Constraints in Unsupervised Anomaly Detection and Localization"
authors: ["P. Bergmann", "K. Batzner", "M. Fauser", "D. Sattlegger", "C. Steger"]
year: 2022
url: https://mediatum.ub.tum.de/download/1782820/1782820.pdf
created: 2026-08-06
relevant_atlas_pages: [unet-segmentation, convolutional-neural-network, convolution, resnet]
---

# Setting

Problem class: unsupervised (one-class) anomaly detection and pixel-precise
localization in natural/industrial RGB images. Training data is exclusively
anomaly-free; no anomaly labels are available at train time. Input: images
$I \in \mathbb{R}^{w\times h\times n}$ of width $w$, height $h$, and $n$
channels (Sec. 4, p.953). Output: a real-valued anomaly score per pixel (an
anomaly map), and, for image-level classification, the maximum anomaly score
over all pixels of an image (Sec. 5.5). The paper's own contribution is not a
single algorithm but three linked artifacts: (1) the MVTec LOCO AD dataset,
which balances two anomaly classes — structural and logical — for the first
time; (2) the saturated per-region overlap (sPRO) metric, needed because
logical anomalies frequently lack a single well-defined pixel-level ground
truth region; (3) GCAD (Global Context Anomaly Detection), a baseline
two-branch encoder/regression method evaluated on both anomaly classes
(Sec. 4).

# Core idea

Three ideas, tightly coupled:

1. **Structural vs. logical anomaly taxonomy** (Sec. 1, p.948-949). A
   *structural* anomaly is a new, locally confined visual structure absent
   from the anomaly-free training data (a scratch, dent, or contamination —
   something a detector with a small receptive field can, in principle,
   catch). A *logical* anomaly instead violates an underlying constraint of
   the training distribution — e.g. a permissible object present in an
   invalid location, or a required object missing/duplicated — without
   necessarily introducing any new local structure at all. The paper's own
   toy example (Appendix A; Fig. 1): anomaly-free images show exactly one
   black circle on a white background; a colour-altered circle is a
   structural anomaly, a second circle elsewhere in the image is a logical
   anomaly, because no individual local region in that second image is
   locally anomalous — only the joint count is.

2. **sPRO metric.** Ordinary per-region overlap (PRO) requires a method to
   recover the *entire* annotated ground-truth region to score well on that
   region. For many logical defects the ground-truth region is itself an
   envelope of possibility rather than a precise defect outline (e.g. "a
   pushpin is missing from this compartment" is annotated as the whole
   compartment, since the pushpin could have appeared anywhere in it), so
   requiring full-region recovery would unfairly penalize a method that
   segments only the true-sized object within that envelope. sPRO saturates
   each region's contribution to the score once the predicted overlap
   reaches a pre-selected saturation threshold $s_i$, decoupling "solved"
   from "recovered exactly".

3. **GCAD.** Two branches under one architecture, trained jointly: a *local*
   branch (encoder $E_{loc}$, a ResNet-18-distilled dense patch descriptor
   with a small receptive field, matched by a regression network $R_{loc}$)
   that is good at catching brand-new local structure but structurally blind
   to long-range/global relationships; and a *global* branch (encoder
   $E_{glo}$ compressing the whole image through a low-dimensional
   bottleneck, matched by an unconstrained high-capacity regression network
   $R_{glo}$) that is forced to represent the image's global/logical
   consistency because of the bottleneck. Anomaly scores in each branch are
   the regression residual between the encoder and its matching regression
   network; the two are combined after per-branch normalization.

# Assumptions

1. Training data contains only anomaly-free images; the validation set
   (also anomaly-free) is used solely to compute per-branch normalization
   statistics ($\mu_{loc},\sigma_{loc},\mu_{glo},\sigma_{glo}$), not to tune
   anomaly thresholds against labeled anomalies (Sec. 4, p.955-956).
2. Objects are approximately spatially aligned within a category — the
   dataset acquisition mimics a fixed mechanical machine-vision setup
   (Sec. 3.1, p.950-951), which several baselines (e.g. the Variation Model)
   hard-depend on (soft assumption for GCAD, hard for the Variation Model).
3. $E_{loc}$'s receptive field $p\times p$ must be smaller than the spatial
   extent of a structural defect for that region to be detectable by the
   local branch, and must be varied ($p\in\{17,33\}$ in the paper's own
   model, tested up to 65 in an ablation) and multi-scale-combined because no
   single $p$ is optimal across defect sizes (Sec. 5.2; Sec. 5.4 "Receptive
   Field" paragraph, p.960-961).
4. The global bottleneck dimension $g$ must be small enough that $E_{glo}$
   cannot simply copy input structure through it (hard assumption for the
   global branch's logical-anomaly sensitivity) yet large enough to encode
   meaningful structure — the paper found the practical balance at $g=32$
   for its dataset (Sec. 5.4 "Global Context Dimension" paragraph,
   p.960-961; Fig. 12).
5. Every ground-truth anomalous region has a saturation threshold
   $0 < s_i \le |A_i|$ chosen a priori by a human annotator per defect type
   (89 defect types enumerated in Appendix D) — sPRO's fairness depends on
   this threshold being a reasonable estimate of the "true" defect size, not
   the full ambiguity envelope (Sec. 3.4).

# Failure regime

- GCAD fails on very small anomalies, e.g. a broken pushpin occupying only a
  small fraction of its compartment (Fig. 11, top row; Sec. 5.3, p.961-962).
- GCAD fails to enforce logical constraints on objects that can appear
  almost anywhere in the frame in unpredictable numbers, e.g. an additional
  washer anywhere in a screw bag (Fig. 11, second row; Sec. 5.3).
- GCAD fails on subtle/intricate compositional differences that don't
  disturb overall image statistics much, e.g. the absence of almonds mixed
  into banana chips in one compartment of the breakfast box (Fig. 11, third
  row; Sec. 5.3).
- If $g$ is too small, $E_{glo}$ cannot output meaningful feature maps at all
  and both anomaly types' detection degrades; if $g$ is too large, $E_{glo}$
  starts to "copy parts of its input directly into the latent
  representation" (a bottleneck-bypass failure mode the paper notes is
  shared with other bottleneck architectures such as autoencoders), which
  reduces false positives in the global branch but also reduces its
  sensitivity to logical constraints — logical-anomaly detection declines
  while structural-anomaly localization improves (Sec. 5.4 "Global Context
  Dimension" paragraph, p.960-961).
- Directly comparing $E_{loc}(I)$ to $U(E_{glo}(I))$ (i.e. plain
  reconstruction error instead of the learned regression $R_{glo}$)
  "performed significantly worse" — reconstructing 128-dimensional
  pretrained features through a small bottleneck is hard and produces many
  false positives (Sec. 5.4 "Feature Regression vs. Reconstruction"
  paragraph, p.961-962).
- All baselines *except* GCAD show a pronounced bias toward one anomaly
  class, and the bias direction differs by method family: Student-Teacher
  (small receptive field) detects structural anomalies well (0.756
  structural sPRO-AUC) but is markedly worse on logical ones (0.497) on
  MVTec LOCO AD (Table 5); MNAD's memory module improves structural-anomaly
  detection over plain autoencoders but "impaired the detection of logical
  ones" (Sec. 2.2, p.951; Table 5: MNAD 0.412 structural vs. 0.266 logical —
  the opposite bias direction from S-T).
- The Variation Model requires pixel-precise object alignment; it performs
  poorly on splicing connectors because those objects are not aligned in the
  dataset (Sec. 5.3, p.958-959).
- The paper concedes structural/logical is not always a clean binary: "it is
  not always straightforward to make a clear distinction between structural
  and logical anomalies and corner cases may exist" (Sec. 1, p.948-949).

# Numerical sensitivity

- All branch losses are squared Frobenius norms over feature maps
  (Eqs. 2-4), each normalized by its own feature-map depth before being
  summed into the joint loss
  $L(I) = \frac{1}{d_{loc}}L_{kd}(I) + \frac{1}{d_{glo}}L_{glo}(I) + \frac{1}{d_{loc}}L_{loc}(I)$
  (Eq. 5, Sec. 4 "Combination of the Two Branches", p.955) — without this
  per-term depth normalization, the branch with higher-dimensional features
  would dominate the gradient.
- $E_{loc}$'s output features are explicitly re-normalized before training
  the rest of the model: per-feature-dimension mean and standard deviation
  are computed over the training set and folded into $E_{loc}$'s final layer
  weights so its output features have zero mean / unit variance (Sec. 5.2,
  p.957, paragraph beginning "Prior to training, we normalize the
  features...").
- The combined anomaly map requires per-branch score normalization using
  validation-set statistics:
  $A = \frac{A_{loc}-\mu_{loc}}{\sigma_{loc}} + \frac{A_{glo}-\mu_{glo}}{\sigma_{glo}}$
  (Sec. 4, p.955-956, unlabeled display equation) — without this, the local
  and global branches' raw residual magnitudes are not directly
  comparable/summable.
- $E_{glo}$'s skip-connection weights $(u,v,w,x,y)$ are initialized to 1 and
  linearly decreased to 0 over the first 100 (of 500) training epochs,
  "starting with the upper levels" (Fig. 7 caption; Sec. 5.2, p.957) — this
  progressive schedule, rather than training with the bottleneck alone from
  step 0, was found empirically necessary: "we empirically observed that
  progressively fading out the weights of the skip connections facilitated
  the optimization, yielding lower values of $L_{kd}$" (Sec. 5.2, p.957).
  This is a training-stability finding, not a theoretical guarantee.
- Training is itself staged: only $E_{glo}$, $U$, and $R_{loc}$ are
  optimized for the first 50 of 500 epochs; $R_{glo}$ is added only
  afterward (Sec. 5.2, p.957).
- The evaluation metric has a numerically meaningful cutoff: the area under
  the sPRO curve is computed only up to a false-positive-rate limit
  ($L=0.05$ for the paper's main results), because "anomaly segmentation
  results at large false positive rates are no longer meaningful" and
  should be excluded from the aggregate score (Sec. 3.3, p.952). Table 7
  shows scores rise monotonically and substantially for every method as $L$
  is relaxed from 0.01 to 1.0 (e.g. GCAD: 0.462 → 0.701 → 0.787 → 0.891 →
  0.962), so the reported headline numbers are sensitive to this
  integration-limit choice and are not directly comparable across papers
  using a different $L$.
- sPRO's saturation thresholds are not perfectly precise engineering
  constants: a robustness check re-ran every baseline 10× with thresholds
  resampled uniformly from $[0.5,1.5]\times$ the original value (for
  thresholds not already equal to the full annotated area) and found the
  method ranking stable except in two runs, where two methods swapped
  between 6th and 7th place (Sec. 5.4 "Variation of Saturation Thresholds"
  paragraph, p.962-963).

# Applicability

- Use when: benchmarking or designing an anomaly-detection/-localization
  method that must handle both novel local structure *and* violations of
  counting/positional/compositional constraints (e.g. industrial inspection
  of multi-part assemblies) — and when a fair pixel-level score is needed
  for logical anomalies whose ground truth is inherently an ambiguity
  envelope rather than a precise outline.
- Don't use when: the target application only has structural-type defects
  with unambiguous pixel-level outlines (plain PRO / per-pixel metrics
  remain appropriate and simpler, per the paper's own reduction
  sPRO → PRO when $s_i=|A_i|$, Sec. 3.3), or when there is no natural
  notion of "logical constraint" over the object class (e.g. pure
  texture-surface inspection, cf. Huang et al. 2018 / Carrera et al. 2017
  datasets discussed in Sec. 2.1, which this paper argues are inherently
  unsuited to logical-anomaly evaluation).
- Compared against: deterministic autoencoder (AE), variational autoencoder
  (VAE), MNAD (memory-guided autoencoder), f-AnoGAN, SPADE, Student-Teacher
  (S-T), and the classical Variation Model (Steger et al. 2018,
  Ch. 3.4.1.4) — full results in Table 3/5 (MVTec LOCO AD) and Table 8
  (MVTec AD).

# Connections

- Builds on: [bergmann2019-mvtec-ad (dataset lineage — this paper explicitly
  measures that only 3% of MVTec AD's 1258 test-image anomalies fall outside
  its own structural-anomaly definition, Sec. 2.1, p.950),
  bergmann2020-uninformed-students (the local branch $E_{loc}$/$R_{loc}$
  reuses the Student-Teacher architecture and pretraining protocol
  verbatim, Sec. 4 p.954 and Sec. 5.2 p.956)]
- Enables: batzner2023-efficientad — per its `cites` field in
  `docs/papers/index.yaml`, which explicitly lists `bergmann2022-mvtec-loco`.
  (`roth2022-patchcore`, `rudolph2023-ast`, `zou2022-visa` are registered in
  the same index but their own `cites` fields list only
  `bergmann2019-mvtec-ad` / `bergmann2020-uninformed-students` /
  `roth2022-patchcore` — not `bergmann2022-mvtec-loco` — so they are not
  listed here even though they address the same problem area.)
- Refutes / supersedes: none stated; the paper positions itself as
  complementary (new dataset + new metric + new baseline), not as replacing
  the cited methods, several of which it also uses as MVTec-AD baselines in
  Sec. 6.

# Atlas update plan

## NEW: visual-anomaly-detection
(Planned **survey concept page** — does not exist on disk yet. Per
`docs/README.md` §4 it needs ≥3 surveyed methods with their own research
notes, ≥800 words, and a decision table near the top; this note alone is
insufficient to author it — flagging the plan for when peer notes exist.)

Type: concept
Category (concept `domain` frontmatter field): no existing schema value fits
cleanly — `features` and `segmentation` are the closest currently-used
values. Flag for the page author to either reuse one of those or add a new
`anomaly-detection` domain value. ?

Primary source for the taxonomy/metric sections: this paper
(`bergmann2022-mvtec-loco`). Do **not** attribute the taxonomy to
`bergmann2019-mvtec-ad` — this paper's own Sec. 2.1 retrospectively shows
that the 2019 dataset (via its "(Bergmann et al. 2021)" IJCV extended
citation) is >97% structural-anomaly by composition and contains no
structural/logical distinction, no sPRO, and no GCAD. All three of this
note's headline contributions (taxonomy, sPRO, GCAD) originate in
`bergmann2022-mvtec-loco`, not the 2019 paper.

Bullets for the eventual page body, all sourced from this note:
- **Definition / taxonomy section**: state the structural-vs-logical
  anomaly distinction using this paper's own definitions and its toy
  black-circle example (Appendix A) as the minimal illustrative case — it
  isolates the distinction from real-world domain complexity. Include the
  paper's own caution that the boundary is not always sharp ("corner cases
  may exist", Sec. 1).
- **Why the taxonomy changes the task**: a method can be excellent on one
  class and near-chance on the other. Cite Table 5's per-class breakdown as
  concrete evidence (S-T: 0.756 structural / 0.497 logical; MNAD: 0.412
  structural / 0.266 logical — an *inverted* bias direction from S-T) to
  show the bias is not a fixed direction across method families, and GCAD's
  near-balanced 0.692/0.711 as the contrasting design goal. This motivates
  a decision table split into "structural" and "logical" performance
  columns rather than a single scalar score per method — an aggregate score
  would hide exactly the failure mode this taxonomy exists to expose.
- **Measurement-problem section**: explain why plain per-pixel / PRO
  metrics break down for logical anomalies specifically, because many
  logical ground-truth regions are annotated as an *ambiguity envelope*
  (e.g. "the object could occur anywhere in this compartment") rather than
  a precise outline, using the missing-pushpin example (Sec. 3.2, Fig. 4)
  from this note's sPRO section. Give the sPRO formula (Eq. 1) and the
  saturation-threshold selection rules (Sec. 3.4: structural → $s=|A|$;
  missing object → $s=$ typical object area; additional object → $s=$ area
  of one extraneous instance; other logical violations → $s=$ area of the
  minimal sufficient sub-region, e.g. the cherry-icon example).
- **Decision-table candidates** (for the eventual ≥3-method table): this
  note supplies GCAD's row only — other rows require their own research
  notes, not all present yet. Columns: method name, receptive-field/context
  type (local-only / global-bottleneck / both), structural sPRO-AUC,
  logical sPRO-AUC, mean.
- Once authored, every surveyed algorithm/model page must list
  `visual-anomaly-detection` in its own `prerequisites` per the Atlas
  authoring policy.

## UPDATE: unet-segmentation
Section: Remarks / Where it appears
- GCAD's two regression networks ($R_{loc}$, $R_{glo}$) and its global
  encoder $E_{glo}$ are architecturally similar to U-Net: 5 downsampling
  blocks, 5 upsampling blocks, bottleneck of size $16\times16\times1024$,
  via the public `jvanvugt/pytorch-unet` implementation (Sec. 5.2,
  p.956-957). $E_{glo}$ additionally uses *scheduled* skip-connection
  fade-out (weights $1\to0$ over the first 100 epochs) to force a true
  information bottleneck by the end of training — a deliberate departure
  from standard U-Net's permanently-open skip connections, worth noting as
  a design variant if this page documents U-Net derivatives.

## UPDATE: resnet
Section: Remarks / Where it appears
- $E_{loc}$'s dense patch descriptor is obtained by distilling a ResNet-18
  classifier (He et al. 2016) pretrained on ImageNet into a dense
  patch-descriptor network via fast dense feature extraction (Bailer et al.
  2017); the distilled descriptor network's own architecture and
  pretraining protocol are inherited unchanged from the Student-Teacher
  paper (Sec. 4, p.954).

# Provenance

- Abstract, p.947: overview of the three contributions (dataset, generalized
  metric, GCAD method).
- Sec. 1, p.948-949: structural/logical anomaly definitions; toy
  black-circle motivating example; "corner cases may exist" caveat.
- Fig. 1, p.948: qualitative S-T vs. VAE comparison on the toy dataset.
- Fig. 2, p.949: structural (metal piece) vs. logical (extra pushpin) real
  example contrast.
- Sec. 2.1, p.949-950: dataset survey (Huang et al. 2018 magnetic tiles,
  Carrera et al. 2017 NanoTWICE, Blum et al. 2019 Fishyscapes) and MVTec
  AD's 1258 test images / 73 anomaly types / 97% structural-anomaly
  composition, attributed to "(Bergmann et al. 2021)" — the paper's
  reference list resolves this citation to the 2021 IJCV extended MVTec AD
  paper (Bergmann, Batzner, Fauser, Sattlegger & Steger, IJCV 129:1038-1059),
  which is a *distinct* entry from the registered source
  `bergmann2019-mvtec-ad` (CVPR 2019) in `docs/papers/index.yaml` — flagged,
  not resolved further in this note. ?
- Sec. 2.2, p.950-951: method survey — SPADE (Cohen & Hoshen 2020),
  Student-Teacher (Bergmann et al. 2020), MNAD (Park et al. 2020), f-AnoGAN
  (Schlegl et al. 2019).
- Sec. 3.1, p.951-952 and Table 1, p.952: dataset composition — 1772 train /
  304 validation / 1568 test (575 anomaly-free + 432 structural + 561
  logical) images across 5 categories, 89 total defect types; per-category
  counts and image resolutions as tabulated (Breakfast Box
  351/62/102/90/83/22/1600×1280; Screw Bag 360/60/122/82/137/20/1600×1100;
  Pushpins 372/69/138/81/91/8/1700×1000; Splicing Connectors
  354/59/119/85/108/21/1700×850; Juice Bottle 335/54/94/94/142/18/800×1600).
  Per-category logical-constraint descriptions (breakfast box
  tangerine/nectarine count and position, screw bag part counts,
  pushpin-per-compartment, splicing-connector clamp/cable/mirror-symmetry
  constraints, juice-bottle label/fill-level constraints), p.951-952.
- Fig. 3, p.952: example images per category; structural (middle row) and
  logical (bottom row) defect examples enumerated in prose (p.951-952),
  including the three juice-bottle examples (icon mismatch, misplaced icon,
  excess fill level, p.951).
- Sec. 3.2, p.952: annotation policy — union of all potentially-causal
  regions is the ground truth; a method need not recover the full region to
  score perfectly. PRO defined as thresholded per-region pixel-recall
  averaged over defect regions, attributed as "an established metric
  (Bergmann et al. 2021; Cohen and Hoshen 2020; Napoletano et al. 2018)" —
  this paper does not itself originate PRO, and never writes the
  abbreviation "AU-PRO" anywhere in the text; it always writes "PRO",
  "sPRO", or spells out "area under the sPRO curve" / "area under the PRO
  curve" in full. ? (no literal "AU-PRO" or "AU-sPRO" acronym found anywhere
  in the cached text — confirmed by full-text search of the cache file.)
- Sec. 3.3, p.952-953, Eq. 1: sPRO definition
  $sPRO(P)=\frac{1}{m}\sum_{i=1}^m \min\!\left(\frac{|A_i\cap P|}{s_i},1\right)$,
  with $\{A_1,\dots,A_m\}$ ground-truth defect regions and
  $\{s_1,\dots,s_m\}$ saturation thresholds $0<s_i\le|A_i|$; reduction note
  sPRO(P)=PRO(P) when $s_i=|A_i|$ for all $i$; sPRO curve constructed
  analogously to ROC by sweeping the binarization threshold and plotting
  sPRO against FPR; FPR defined as pixels predicted anomalous but not
  covered by any annotated region; main performance measure = normalized
  area under the sPRO curve up to a limited FPR (motivation: high-FPR
  segmentations are not practically meaningful).
- Fig. 4, p.953: schematic of sPRO saturation with a single ground-truth
  region (the missing-pushpin example).
- Sec. 3.4, p.953: saturation-threshold selection rules per defect category
  (structural → $s=|A|$; missing objects → $s=$ empirically-estimated
  object-area value from the lower end of the observed area distribution;
  additional objects → $s=$ area of the extraneous instance(s), e.g. half
  the annotated region for the two-cable example; other logical violations
  → $s=$ minimal sufficient sub-region, e.g. the cherry-icon example on the
  juice bottle); 89 total defect-type thresholds listed in Appendix D
  (Tables 11-15).
- Sec. 4, p.953-955: GCAD architecture — local branch ($E_{loc}$
  pretrained/frozen ResNet-18-distilled patch descriptor via fast dense
  feature extraction, Bailer et al. 2017; $R_{loc}$ high-capacity
  skip-connection regression network; Eq. 2
  $L_{loc}(I)=\|E_{loc}(I)-R_{loc}(I)\|_F^2$); global branch ($E_{glo}$
  bottleneck-$g$ encoder, distilled from $E_{loc}$ via upsampling network
  $U$ — three 1×1 convolutions with nonlinearities in between — Eq. 3
  $L_{kd}(I)=\|E_{loc}(I)-U(E_{glo}(I))\|_F^2$; $R_{glo}$ unconstrained
  high-capacity skip-connection regression network, Eq. 4
  $L_{glo}(I)=\|E_{glo}(I)-R_{glo}(I)\|_F^2$); combined loss Eq. 5
  $L(I)=\frac{1}{d_{loc}}L_{kd}(I)+\frac{1}{d_{glo}}L_{glo}(I)+\frac{1}{d_{loc}}L_{loc}(I)$;
  scoring $A_{loc}=\|E_{loc}(J)-R_{loc}(J)\|_2$,
  $A_{glo}=\|E_{glo}(J)-R_{glo}(J)\|_2$; combined normalized map
  $A=\frac{A_{loc}-\mu_{loc}}{\sigma_{loc}}+\frac{A_{glo}-\mu_{glo}}{\sigma_{glo}}$
  using validation-set statistics; multi-scale combination by
  pixelwise-averaging $A^{(p)}$ over receptive fields $p\in P$.
- Fig. 5, p.954: schematic overview of GCAD.
- Fig. 6, p.955: qualitative $A_{loc}$/$A_{glo}$ comparison on a structural
  vs. a logical anomaly.
- Fig. 7 and its caption, p.957: $E_{glo}$ architecture — 4×4 stride-2
  convolutions + LeakyReLU, transposed convolutions ("upconv"), 1×1-conv
  skip connections scaled by skip weights, skip weights $u,v,w,x,y$
  initialized to 1 and linearly faded to 0 over the first 100 epochs,
  upper-level-first fade order.
- Sec. 5.2 "Our Method (GCAD)" paragraph, p.956-957: training
  hyperparameters — images zoomed to $256\times256$; Adam, lr $10^{-4}$,
  weight decay $10^{-5}$; 500 epochs; $d_{glo}=10$, $g=32$; $E_{loc}$ reuses
  Bergmann et al. (2020) architecture/protocol, $d_{loc}=128$; receptive
  fields $p\in\{17,33\}$; feature normalization of $E_{loc}$'s output
  folded into its final layer; staged training ($R_{glo}$ added only after
  epoch 50 of 500).
- Sec. 5.2, p.956-957 — quoted verbatim: "the two regression networks
  $R_{loc}$ and $R_{glo}$ have an architecture similar to U-Net
  (Ronneberger et al. 2015). We use a publicly accessible implementation2
  with five downsampling blocks, five upsampling blocks, and a bottleneck of
  size 16 × 16 ×1024." (implementation footnote 2 =
  `github.com/jvanvugt/pytorch-unet`); the AE/VAE baselines are explicitly
  stated to reuse the same base architecture as $E_{glo}$ (Fig. 7).
- Sec. 5.2 (baseline paragraphs), p.957-958: AE/VAE (Adam lr $10^{-4}$,
  weight decay $10^{-5}$, batch 16, latent $g=32$, 500 epochs, skip fade
  over first 100); f-AnoGAN ($64\times64$ grayscale, latent dim 128, Adam
  lr $10^{-4}$ no weight decay batch 64, 100 GAN epochs with 5 discriminator
  steps per generator step, encoder trained with RMSProp lr $5\times10^{-5}$
  for $5\times10^4$ iterations batch 64); MNAD (10 memory items of dim 512,
  image-encoder output dim 32, Adam lr $2\times10^{-5}$ batch 4,
  $\lambda_c=\lambda_s=10^{-1}$, 500 epochs, $256\times256$); SPADE (own
  reimplementation, Wide ResNet50-2 features, $224\times224$, $K=50$
  image-level NN, $\kappa=1$ pixel-level NN, Gaussian smoothing $\sigma=4$);
  Student-Teacher (own reimplementation, $256\times256$, receptive fields
  $p\in\{17,33,65\}$, ensembles of 3 students per field, 9 models/category
  total, Adam lr $10^{-4}$ weight decay $10^{-5}$ batch 1); Variation Model
  (Steger et al. 2018 Ch. 3.4.1.4; per-pixel/per-channel mean+stdev over
  training set; shape-based-matching alignment (Steger 2001, 2002) applied
  to pushpins and juice bottles; screw bags and splicing connectors left
  unaligned; out-of-overlap pixels after alignment set to score 0).
- Sec. 5.1, p.956, Table 2: dataset augmentations per category (vertical/
  horizontal flip, ≤3° rotation, brightness/contrast/saturation jitter);
  applied to GCAD, all 3 autoencoders, and f-AnoGAN; not applied to SPADE,
  Student-Teacher, Variation Model.
- Table 3, p.958: main per-category sPRO-AUC (FPR≤0.05) results — VM
  0.168/0.253/0.254/0.125/0.325/mean 0.225; f-AnoGAN
  0.223/0.348/0.336/0.195/0.569/0.334; MNAD 0.080/0.344/0.357/0.442/
  0.472/0.339; AE 0.189/0.289/0.327/0.479/0.605/0.378; VAE
  0.165/0.302/0.311/0.496/0.636/0.382; SPADE 0.372/0.331/0.234/0.516/
  0.804/0.451; S-T 0.496/0.602/0.523/0.698/0.811/0.626; GCAD
  0.502/0.558/0.739/0.798/0.910/0.701 (columns: Breakfast Box, Screw Bag,
  Pushpins, Splicing Connectors, Juice Bottle, Mean).
- Table 5, p.959: structural/logical/mean sPRO-AUC breakdown — VM
  0.124/0.325/0.225; f-AnoGAN 0.209/0.460/0.334; MNAD 0.412/0.266/0.339; AE
  0.296/0.460/0.378; VAE 0.305/0.459/0.382; SPADE 0.368/0.536/0.451; S-T
  0.756/0.497/0.626; GCAD 0.692/0.711/0.701.
- Fig. 8, p.959: bar-chart rendering of Table 5.
- Sec. 5.3, p.958-959: qualitative discussion (Figs. 9-10), per-method
  failure discussion.
- Fig. 11, p.961, and Sec. 5.3 discussion p.961-962: GCAD's own failure
  cases (small anomalies, hard-to-enforce logical constraints, subtle
  compositional anomalies).
- Sec. 5.4, p.960-963, Figs. 12-14: ablations — global context dimension
  $g$ (best balance at $g=32$; $g=64$ slightly better mean but worse
  logical/structural balance); receptive field $p$ (similar mean at
  $p=17,33$; degraded at large $p$; multi-scale combination improves both);
  local vs. global branch responsibility (Fig. 13 examples of each branch
  compensating for the other); feature regression vs. reconstruction
  comparison (reconstruction via $U\circ E_{glo}$ performs "significantly
  worse"); descriptor dimension $d_{glo}$ sensitivity (robust across values,
  Fig. 14 left); knowledge-distillation target ablation (Eq. 6
  $L_{kd}(I)=\|I-U(E_{glo}(I))\|_F^2$ raw-pixel variant performs worse than
  pretrained-feature distillation, Fig. 14 right).
- Sec. 5.4 "Variation of Saturation Thresholds" paragraph, p.962-963:
  robustness check, thresholds resampled $\times[0.5,1.5]$, ranking stable
  except one rank-swap in two of ten runs.
- Sec. 5.5, p.962-963, Table 6 and Fig. 15 (top): image-level AU-ROC on
  MVTec LOCO AD — VAE 0.548/0.538/0.543; AE 0.565/0.581/0.573; VM
  0.589/0.565/0.577; f-AnoGAN 0.627/0.658/0.642; MNAD 0.702/0.600/0.651;
  SPADE 0.668/0.709/0.689; S-T 0.883/0.664/0.773; GCAD 0.806/0.860/0.833
  (columns: structural, logical, mean).
- Appendix B, p.963-965, Table 7: sPRO-AUC at integration limits
  $L\in\{0.01,0.05,0.1,0.3,1.0\}$ — VM 0.086/0.225/0.314/0.493/0.740;
  f-AnoGAN 0.152/0.334/0.442/0.624/0.827; MNAD 0.176/0.339/0.447/0.643/
  0.853; AE 0.166/0.378/0.499/0.699/0.882; VAE 0.162/0.382/0.506/0.705/
  0.884; SPADE 0.225/0.451/0.587/0.790/0.927; S-T 0.402/0.626/0.717/0.836/
  0.937; GCAD 0.462/0.701/0.787/0.891/0.962. High-FPR discouragement is
  cross-referenced to "Bergmann et al. (2021)" — same unresolved-index
  caveat as above. ?
- Sec. 6, p.962-965: MVTec AD cross-evaluation — test set re-split into
  structural vs. logical subsets; Table 4 (p.963) lists the 37/1258 MVTec AD
  anomalies matching the logical definition (Cable "Cable swap" 12 images
  all, "Combined" 3 images {5,7,9}; Capsule "Faulty imprint" 2 images {4,5};
  Transistor "Cut lead" 10 images all, "Misplaced" 10 images all); Fig. 16
  and Table 8 (p.966): sPRO-AUC — VM 0.240/0.069/0.155; MNAD 0.294/0.032/
  0.163; f-AnoGAN 0.290/0.231/0.261; AE 0.337/0.224/0.281; VAE 0.336/0.215/
  0.276; S-T 0.762/0.417/0.590; SPADE 0.632/0.647/0.640; GCAD 0.716/0.863/
  0.789. Table 9 (p.966), Fig. 15 (bottom): image-level AU-ROC on MVTec AD —
  MNAD 0.709/0.427/0.568; VM 0.690/0.679/0.684; AE 0.761/0.718/0.740;
  f-AnoGAN 0.751/0.751/0.751; VAE 0.766/0.737/0.751; S-T 0.936/0.747/0.842;
  SPADE 0.898/0.906/0.902; GCAD 0.871/0.991/0.931.
- Fig. 17, p.964: qualitative MVTec AD comparison (transistor, cable
  categories).
- Sec. 7 Conclusions, p.964-965: summary; "due to the complexity of our new
  dataset, there is still room for future improvement."
- Declarations, p.965: CC BY 4.0 license; public dataset and evaluation
  code.
- Appendix A, p.965-966: toy black-circle dataset construction —
  $256\times256$ RGB images, circle radius 16 px, background pixel values
  sampled uniform in $[247,255]$ per channel, Gaussian smoothing
  $\sigma=1.5$; 1000 train / 100 validation images; same training protocol
  as the main LOCO experiments.
- Appendix D and Tables 11-15, p.967-968: full per-defect-type sPRO
  saturation-threshold listing for all 5 categories (representative entries
  quoted in the Sec. 3.4 provenance line above; not fully transcribed in
  this note — flagged for a future note extension if exact per-defect
  thresholds become needed for page content). ?
