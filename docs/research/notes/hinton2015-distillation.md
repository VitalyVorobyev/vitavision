---
paper_id: hinton2015-distillation
title: "Distilling the Knowledge in a Neural Network"
authors: ["G. E. Hinton", "O. Vinyals", "J. Dean"]
year: 2015
url: https://arxiv.org/pdf/1503.02531
created: 2026-08-23
relevant_atlas_pages: [dinov2, efficientad, uninformed-students, mobilesam, depth-anything]
---

# Setting

Model compression / knowledge transfer for supervised classifiers. Inputs: a
trained "cumbersome" model (a large single net or an ensemble of nets) and a
transfer set of examples (the original training set, a subset of it, or
unlabeled data) — optionally with ground-truth hard labels available for all
or some of the transfer set. Output: a smaller "distilled" model trained to
reproduce the cumbersome model's generalization behavior, not just its
training-set accuracy. The paper frames the goal explicitly as bridging the
gap between the training regime (can be arbitrarily expensive) and the
deployment regime (latency- and resource-constrained) — the insect
larva/adult analogy in the Introduction (lines 34–50).

# Core idea

A softmax classifier converts logit $z_i$ for class $i$ into a probability
via a "temperature" $T$:

$$q_i = \frac{\exp(z_i/T)}{\sum_j \exp(z_j/T)} \qquad (1)$$

$T$ is normally $1$; raising $T$ produces a softer distribution over classes
(§2, lines 113–123). Because a well-trained cumbersome model already assigns
non-trivial relative probability to *wrong* classes (a BMW is far more likely
to be mistaken for a garbage truck than for a carrot — Introduction, lines
66–69), these soft probabilities carry information about how the model
generalizes that a one-hot hard label discards.

Distillation trains the small model on the cumbersome model's soft targets,
produced by running the cumbersome model's softmax at a raised $T$, and using
the *same* raised $T$ in the small model's softmax during this transfer
training; at deployment the small model reverts to $T=1$ (§2, lines 124–127).
When hard labels are available, the paper's preferred recipe (found better
than modifying the soft targets with the hard labels) is a weighted average
of two cross-entropy objectives computed from the same small-model logits:
one against the soft targets at the same high $T$ used to generate them, one
against the hard labels at $T=1$, with a "considerably lower weight" on the
hard-label term (§2, lines 128–136).

Because the gradient magnitude produced by the soft-target term scales as
$1/T^2$ (derived in §2.1, see Eq. 4 below), the soft-target loss must be
multiplied by $T^2$ when it is combined with the hard-label loss at $T=1$ —
otherwise the relative contribution of the two losses shifts whenever $T$ is
changed during meta-parameter search (§2, lines 136–140).

## Matching logits is a special case (§2.1)

For a transfer case, the cross-entropy gradient w.r.t. distilled-model logit
$z_i$, given cumbersome-model logits $v_i$ producing soft targets $p_i$, at
transfer temperature $T$, is:

$$\frac{\partial C}{\partial z_i} = \frac{1}{T}(q_i - p_i) = \frac{1}{T}\left(\frac{e^{z_i/T}}{\sum_j e^{z_j/T}} - \frac{e^{v_i/T}}{\sum_j e^{v_j/T}}\right) \qquad (2)$$

When $T$ is high relative to the logit magnitudes, $e^{x/T} \approx 1 + x/T$,
giving the approximation:

$$\frac{\partial C}{\partial z_i} \approx \frac{1}{T}\left(\frac{1+z_i/T}{N+\sum_j z_j/T} - \frac{1+v_i/T}{N+\sum_j v_j/T}\right) \qquad (3)$$

If logits are additionally zero-meaned per transfer case
($\sum_j z_j = \sum_j v_j = 0$), Eq. 3 collapses to:

$$\frac{\partial C}{\partial z_i} \approx \frac{1}{NT^2}(z_i - v_i) \qquad (4)$$

So in the high-temperature limit, distillation is equivalent to minimizing
$\tfrac{1}{2}(z_i-v_i)^2$ — i.e. directly regressing the small model's logits
onto the cumbersome model's logits, which is exactly the "matching logits"
technique used by Caruana et al.'s model-compression work (lines 168–172,
citing [1] = Buciluă, Caruana & Niculescu-Mizil 2006). Distillation with a
finite $T$ generalizes this: at lower $T$ the loss pays much less attention
to logits that are very negative relative to the average — logits the
authors argue are both potentially noisy (unconstrained by the cumbersome
model's own training objective) and potentially informative; the paper notes
empirically that when the distilled model is too small to capture all of the
cumbersome model's knowledge, *intermediate* temperatures work best, which
"strongly suggests that ignoring the large negative logits can be helpful"
(lines 171–180).

# Assumptions

1. A trained cumbersome model (single strongly-regularized net, or ensemble)
   is available before distillation begins — distillation is a two-stage
   pipeline, not joint training. Hard.
2. The transfer set overlaps in distribution with what the cumbersome model
   was trained on; it can be the original training set, a subset, or
   unlabeled data, but the soft targets must be produced by running the
   cumbersome model in inference mode on it (lines 80–83, 103–106). Soft —
   degrades if the transfer set is too far off-distribution from the
   cumbersome model's training data.
3. When mixing soft- and hard-label losses, the soft-target loss must be
   scaled by $T^2$ to keep the two terms' relative gradient magnitude
   invariant to the choice of $T$ (lines 136–140). Hard — omitting this
   scaling silently changes the effective loss weighting whenever $T$ is
   retuned.
4. The high-temperature "logit matching" equivalence (Eq. 4) requires logits
   to be zero-meaned per transfer case; without that the simplification to
   Eq. 4 does not hold and only the (still valid) Eq. 2/3 gradients apply
   (lines 164–170).

# Failure regime

- At $T=1$ (no softening) essentially no distillation benefit is observed
  over training on hard labels directly — this is the implicit degenerate
  case of Eq. 1, and is exactly the regime the related speech-distillation
  work by Li et al. operates in, which the paper reports transfers only 28%
  of the large/small error-rate gap versus >80% for the paper's own
  temperature-raised approach on a comparable speech task (lines 275–279).
- Too-small distilled capacity interacts with temperature choice: with 30
  hidden units/layer (vs. 300+), only a narrow $T \in [2.5, 4]$ range worked
  well — too-low or too-high $T$ both degraded results, whereas with ample
  capacity ($\geq 300$ units/layer) "all temperatures above 8 gave fairly
  similar results" (§3, lines 196–198). Distillation is not
  temperature-invariant once the student model is capacity-constrained.
- Held-out class coverage: when the transfer set omits all examples of one
  class, the distilled model's main failure mode is a miscalibrated class
  *bias*, not miscalibrated class *shape* — correctable post hoc by directly
  adjusting the bias term for the missing class rather than needing more
  data (§3, lines 199–207; MNIST digit-3 and digit-7/8-only experiments,
  see Numerical sensitivity below for exact numbers).
- Specialist models (§5) overfit rapidly when trained on a class-enriched
  subset with a small effective dataset size; the paper's mitigation is
  initializing from the generalist's weights and mixing in soft targets for
  non-special classes, an approach the authors describe as still being
  explored rather than fully validated at publication (lines 437–449).

# Numerical sensitivity

- Softmax temperature $T$ is the central hyperparameter and its useful range
  is small-model-capacity-dependent (see Failure regime). Values explicitly
  tried in the paper: $T=20$ for the MNIST regularization-only distillation
  result (line 192); $T \in \{1, 2, 5, 10\}$ for the speech-recognition
  experiment, with a relative weight of $0.5$ on the hard-target
  cross-entropy and an unspecified (bold-in-table, not stated as a number in
  the extracted text) best $T$ used for the headline Table 1 result (lines
  265–267, marked `?` — the specific winning $T$ value is typeset as bold in
  the source table but not restated in body text); $T \in [2.5, 4]$ found
  best for the 30-unit/layer MNIST student; $T > 8$ roughly interchangeable
  for the $\geq 300$-unit/layer MNIST student (lines 196–198).
- Class-bias correction after training on an incomplete transfer set is a
  simple additive shift to the logit bias of the missing class, found by
  optimizing overall test performance: MNIST digit-3-omitted experiment —
  raw distilled model 206 test errors (133 of 1010 test 3s wrong); after
  increasing the learned bias for class 3 by $+3.5$, 109 total errors, only
  14 on 3s (98.6% of test 3s correct despite never seeing a 3 in training)
  (lines 199–204). Symmetric experiment with only 7s and 8s in the transfer
  set: 47.3% test error rate raw, falling to 13.2% after reducing the 7/8
  biases by $-7.6$ (lines 205–207).
- Specialist dustbin-class bias correction: after training a specialist on
  an oversampled subset (half special-class examples, half random), the
  dustbin-class logit is corrected post hoc by adding the log of the
  oversampling proportion (lines 329–331) — an exact, derivable correction,
  not a tuned constant.
- MNIST headline numbers (§3, 60,000 training cases): big net (two hidden
  layers of 1200 ReLU units, dropout + weight-constraint regularization,
  ±2px jitter) — 67 test errors. Small net (two hidden layers of 800 ReLU
  units, unregularized) — 146 test errors. Same small net, regularized only
  by also matching the big net's soft targets at $T=20$ — 74 test errors
  (lines 182–195).
- Speech recognition architecture (§4): 8 hidden layers × 2560 ReLU units,
  final softmax over 14,000 HMM tri-phone-cluster targets; input = 26 frames
  × 40 Mel-scaled filterbank coefficients, 10 ms frame advance, predicting
  the HMM state of the 21st frame; ≈85M parameters; trained on ≈2000 hours
  (≈700M training examples) of spoken English (lines 239–244). Baseline:
  58.9% test frame accuracy, 10.9% WER. Table 1 (lines 249–255):

  | System | Test Frame Accuracy | WER |
  |---|---|---|
  | Baseline | 58.9% | 10.9% |
  | 10×Ensemble | 61.1% | 10.7% |
  | Distilled single model | 60.8% | 10.7% |

  More than 80% of the ensemble's frame-accuracy improvement over baseline
  is transferred to the single distilled model (lines 268–271).
- Soft targets as regularizer under data scarcity (§6, Table 5, lines
  428–434), same 85M-parameter speech model:

  | System & training set | Train Frame Accuracy | Test Frame Accuracy |
  |---|---|---|
  | Baseline (100% of training set) | 63.4% | 58.9% |
  | Baseline (3% of training set) | 67.3% | 44.5% (early-stopped; overfits past this) |
  | Soft Targets (3% of training set) | 65.4% | 57.0% (no early stopping needed; simply converges) |

- JFT specialist-ensemble experiment (§5): JFT = 100M labeled images, 15,000
  labels, internal Google dataset (line 296). 61 specialist models, 300
  classes + 1 dustbin class each (line 404). Top-1 accuracy, Table 3 (lines
  367–370):

  | System | Conditional Test Accuracy | Test Accuracy |
  |---|---|---|
  | Baseline | 43.1% | 25.0% |
  | + 61 specialist models | 45.9% | 26.1% |

  4.4% relative improvement in overall test accuracy from adding specialists
  (line 401). Table 4 (lines 373–384) shows relative top-1 accuracy
  improvement rising monotonically (with noise) from 0.0% (0 specialists
  covering a test example's class) to +14.1% (10+ specialists covering the
  class); e.g. 3 specialists → +8.8%, 6 specialists → +11.3%.
- Specialist inference combines generalist + active specialists' predictions
  by finding the full distribution $q$ minimizing:

  $$KL(p_g, q) + \sum_{m \in A_k} KL(p_m, q) \qquad (5)$$

  where $A_k$ = specialists whose confusable class subset intersects the
  generalist's top-$n$ predictions ($n=1$ used in the paper's experiments);
  no closed form in general, solved per-image by gradient descent on
  $q = \mathrm{softmax}(z)$ at $T=1$ (lines 352–359, 390–394).

# Applicability

- Use when: a large/ensembled model's accuracy must be transferred into a
  single deployment-sized model without giving up most of the ensemble's
  generalization gain; when labeled data for the target task is scarce
  relative to what full training would need (Table 5 result); when many
  fine-grained, mutually confusable classes make a single very large model
  or true ensemble too expensive to train (motivating the specialist-ensemble
  scheme in §5).
- Don't use when: no cumbersome/teacher model can be trained or obtained at
  all — distillation requires that stage to already exist; or when the
  transfer set is too unlike the teacher's training distribution for its
  soft-target outputs to be meaningful.
- Compared against: Caruana et al.'s logit-matching model compression [1]
  (shown to be the $T\to\infty$, zero-meaned special case of distillation,
  §2.1); Li et al.'s output-distribution-matching small-DNN training [8]
  (distillation at $T=1$ on unlabeled data only, weaker transfer — 28% of
  the error-rate gap vs. this paper's >80% of the accuracy-gap on a
  comparable speech task, lines 275–279); mixtures of experts [6] (§7,
  contrasted with the specialist scheme — MoE's gating network makes joint
  training hard to parallelize; the paper's specialists are trained fully
  independently after a fixed, non-learned cluster assignment).

# Connections

- Builds on: [1] Buciluă, Caruana & Niculescu-Mizil 2006 "Model Compression"
  (logit-matching ancestor, shown as the $T\to\infty$ special case);
  [7] Krizhevsky, Sutskever & Hinton 2012 (AlexNet-style architecture used
  as the JFT baseline convolutional net) — indexed here as
  `krizhevsky2012-alexnet`, matching this repo's `docs/papers/index.yaml`
  `cites:` entry for `hinton2015-distillation`.
- Enables (downstream, by later citation, not asserted from this paper's own
  text): the general "teacher-student" training pattern this paper names
  and formalizes recurs across later Atlas-relevant work as a compositional
  building block rather than a single technique — worth tracking as a
  concept page rather than duplicating per-method:
  - Vision Transformer training later added a *distillation token* concept
    (DeiT, Touvron et al. 2020) that consumes a teacher's soft/hard signal
    through a dedicated attention token rather than an extra loss term —
    noted here only as a forward pointer; not yet an Atlas page in this
    repo, so no `content/` link is made.
  - Self-distillation without any external teacher or labels (DINO family,
    `dinov2` in this repo's model register) generalizes the teacher/student
    split in this paper — where the teacher was a separately, fully trained
    cumbersome model — to a teacher that is an exponential-moving-average
    copy of the student itself, updated online during the same training run.
  - The visual anomaly-detection student-teacher line
    (`uninformed-students`, `efficientad` in this repo's model register)
    reuses the soft-target regression idea in a different objective: instead
    of matching a teacher's *class* soft targets, the student regresses the
    teacher's *dense feature embeddings*, and the student/teacher output
    discrepancy itself becomes the anomaly score rather than a training-time
    compression signal.
  - Distillation is also used purely for deployment-size compression of
    otherwise-unrelated large vision foundation models — e.g. MobileSAM
    (`mobilesam`) distills SAM's heavy image encoder into a lightweight one,
    and monocular depth foundation models (`depth-anything`) use a
    teacher-labeled large unlabeled corpus to train smaller student depth
    models — both closer in spirit to this paper's original "compress a big
    model into a deployable one" motivation than to the self-supervised
    self-distillation branch above.
- Refutes / supersedes: none identified — this paper positions itself as a
  generalization of, not a refutation of, Caruana et al.'s compression
  approach.

# Atlas update plan

## NEW: knowledge-distillation

Type: concept
Category: deep-learning / model-compression & self-supervised training
Primary source: this paper (`hinton2015-distillation`)

- **Definition**: Define distillation as training a smaller model to match a
  larger (or ensembled) model's output distribution rather than only its
  hard labels, using a temperature-raised softmax to expose the "dark
  knowledge" encoded in the relative magnitudes of non-max class
  probabilities. State the teacher/cumbersome-model, student/distilled-model
  vocabulary and note this paper is the origin of the standard "distillation"
  term (as opposed to Caruana's earlier "model compression" framing).
- **Mathematical Description**: Reproduce Eq. 1 (temperature softmax), the
  combined soft/hard weighted cross-entropy loss with the required $T^2$
  gradient rescaling, and the Eq. 2→3→4 derivation showing the
  high-temperature, zero-meaned-logit limit reduces to direct logit
  regression (Caruana's method as a special case).
- **Numerical Concerns**: Cover the $T$-vs-student-capacity interaction
  (narrow effective $T$ range for small students, wide/insensitive range for
  large-capacity students — MNIST 30-unit vs. 300-unit results); the
  necessity of the $T^2$ loss-rescaling to keep hard/soft loss weighting
  invariant under $T$ retuning; and the class-bias correction trick for
  transfer sets with missing/undersampled classes.
- **Where it appears**: Link forward to `dinov2` (self-distillation, no
  external teacher), `uninformed-students` and `efficientad`
  (feature-level student-teacher discrepancy used as an anomaly signal
  rather than a compression objective), `mobilesam` and `depth-anything`
  (distillation for pure deployment-size compression of a foundation
  model). No typed relations — concept page; dependents will list it in
  prerequisites (approved plan).
- **References**: `hinton2015-distillation` as primary; cite
  `krizhevsky2012-alexnet` (JFT baseline architecture) as a supporting
  reference per this paper's own citation graph.

# Provenance

- Eq. 1 (temperature softmax): `docs/papers/.cache/hinton2015-distillation.txt`
  §2, lines 113–118 ("qi = exp(zi/T) / Σj exp(zj/T)").
- $T$ normally 1, higher $T$ softens distribution: same file, lines 120–123.
- Combined soft/hard weighted cross-entropy recipe and preference for
  weighted-average-of-two-objectives over modifying soft targets: §2, lines
  128–136.
- $T^2$ gradient-rescaling requirement: §2, lines 136–140 ("magnitudes of the
  gradients produced by the soft targets scale as 1/T²... multiply them by
  T² when using both hard and soft targets").
- Eq. 2 (exact transfer-set gradient): §2.1, lines 144–153.
- Eq. 3 (high-$T$ approximation): §2.1, lines 158–162.
- Eq. 4 (zero-meaned-logit simplification, $\partial C/\partial z_i \approx
  (z_i-v_i)/(NT^2)$) and its equivalence to $\tfrac12(z_i-v_i)^2$ /
  Caruana logit matching: §2.1, lines 164–172.
- Intermediate-$T$-helps-when-student-too-small claim: §2.1, lines 177–180.
- MNIST big/small/distilled-net error counts (67 / 146 / 74) and $T=20$:
  §3, lines 182–195.
- $T>8$ interchangeable at 300+ units, $T\in[2.5,4]$ best at 30 units: §3,
  lines 196–198.
- Digit-3-omitted experiment (206 errors, 133/1010 threes wrong, bias +3.5 →
  109 errors / 14 on 3s / 98.6% correct): §3, lines 199–204.
- 7s/8s-only transfer set (47.3% → 13.2% after bias −7.6): §3, lines
  205–207.
- Speech acoustic-model architecture (8×2560 ReLU, 14,000-label softmax,
  26×40 Mel filterbank input, 10ms advance, 21st-frame target, ≈85M params,
  ≈2000h / ≈700M examples): §4, lines 239–244.
- Baseline 58.9% frame accuracy / 10.9% WER: §4, lines 245–246.
- Table 1 (Baseline / 10×Ensemble / Distilled single model — frame accuracy
  and WER): lines 249–255.
- Distillation temperatures $[1,2,5,10]$, hard-target relative weight 0.5,
  bold-marked best $T$ not restated as a number in extracted text (marked
  `?`): §4.1, lines 265–267.
- >80% of ensemble's frame-accuracy gain transferred: §4.1, lines 268–271.
- Comparison to Li et al. [8] ($T=1$, unlabeled data, 28% of error-rate gap
  closed): §4.1, lines 275–279.
- JFT dataset size (100M images, 15,000 labels): §5.1, line 296.
- Specialist training (300 classes + dustbin, half special/half random
  sampling, initialized from generalist weights): §5.2, lines 321–331.
- Dustbin-logit bias correction (add log of oversampling proportion): §5.2,
  lines 329–331.
- Specialist-cluster assignment via online K-means on generalist prediction
  covariance matrix: §5.3, lines 339–343.
- Step 1/Step 2 inference procedure, $n=1$: §5.4, lines 350–356.
- Eq. 5 (KL-divergence combination objective) and no-closed-form /
  gradient-descent-per-image solving at $T=1$: §5.4, lines 356–359, 390–394.
- Table 3 (Baseline vs. +61 specialists, conditional/test accuracy): §5.5,
  lines 367–370.
- 4.4% relative overall improvement: §5.5, line 401.
- Table 4 (specialist-count coverage vs. relative accuracy change,
  including the +14.1% at 10+ specialists): §5.5, lines 373–384.
- Table 5 (100%/3%-data baseline vs. soft-target train/test frame accuracy,
  early-stopping behavior): §6, lines 419–434.
- Soft targets to prevent specialist overfitting (proposed, described as
  ongoing work at publication): §6.1, lines 437–449.
- Mixtures-of-experts comparison (§7): lines 451–468.
- Citation [1] = Buciluă, Caruana & Niculescu-Mizil, "Model Compression",
  KDD 2006; citation [7] = Krizhevsky, Sutskever & Hinton, "ImageNet
  Classification with Deep Convolutional Neural Networks", NeurIPS 2012
  (matches `krizhevsky2012-alexnet` in `docs/papers/index.yaml`, listed as a
  `cites:` entry for this paper): References list, lines 490–514.
