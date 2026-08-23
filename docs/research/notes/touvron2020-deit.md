---
paper_id: touvron2020-deit
title: "Training data-efficient image transformers & distillation through attention"
authors: ["H. Touvron", "M. Cord", "M. Douze", "F. Massa", "A. Sablayrolles", "H. Jégou"]
year: 2020
url: https://arxiv.org/pdf/2012.12877
created: 2026-08-23
relevant_atlas_pages: [vit, attention-mechanism, transformer, resnet]
---

# Setting

Problem class: image classification on ImageNet-1k, trained **from ImageNet-1k
alone** (no external/private pretraining corpus). Input: a fixed-size RGB
image, split into $16\times16$ patches exactly as in ViT. Output: a
class-probability distribution over 1000 ImageNet classes. Precondition that
motivates the paper: Dosovitskiy et al.'s ViT needed a large curated
pretraining corpus (JFT-300M, 300M images) to be competitive — "transformers
do not generalize well when trained on insufficient amounts of data" (quoted
from ViT, §1, p.2). DeiT targets the regime where only ImageNet-1k (1.28M
images) is available, trained on a single 8-GPU node in 2–3 days (§1, p.2).

# Core idea

DeiT keeps the ViT architecture byte-for-byte (same patch embedding, class
token, transformer encoder — DeiT-B has an identical architecture to ViT-B,
Table 1, §5.1) and instead changes *how* it is trained: a strong
data-augmentation and regularization stack (Table 9) makes ImageNet-1k-only
training viable, and a new **distillation token** injects knowledge from a
strong teacher (best: a convnet, RegNetY-16GF) directly through the attention
mechanism rather than through a post-hoc loss term alone. The distillation
token is appended to the input sequence alongside the patch tokens and class
token; it interacts with them through self-attention across all layers and,
at the output, is read by a separate linear head trained to reproduce the
teacher's **hard** (argmax) prediction rather than the teacher's soft
probability vector (§4, Fig. 2).

Standard scaled dot-product self-attention (§3, Eq. 1, p.4–5):
$$
\text{Attention}(Q,K,V) = \text{Softmax}(QK^\top/\sqrt{d})V
$$
with $Q \in \mathbb{R}^{N\times d}$, $K,V \in \mathbb{R}^{k\times d}$, unchanged
from Vaswani et al. and from ViT.

Soft distillation loss (§4, Eq. 2, p.6) — the classical Hinton-style KD
objective applied to the transformer student, with teacher logits $Z_t$,
student logits $Z_s$, temperature $\tau$, ground-truth label $y$, softmax
$\psi$, and balancing coefficient $\lambda$:
$$
\mathcal{L}_\text{global} = (1-\lambda)\,\mathcal{L}_\text{CE}(\psi(Z_s), y) + \lambda \tau^2\, \text{KL}(\psi(Z_s/\tau), \psi(Z_t/\tau))
$$

Hard-label distillation loss (§4, Eq. 3, p.6) — DeiT's proposed variant, using
the teacher's argmax decision $y_t = \arg\max_c Z_t(c)$ as a second
"ground-truth" target, with equal weight and no temperature/λ to tune:
$$
\mathcal{L}_\text{global}^\text{hardDistill} = \tfrac{1}{2}\mathcal{L}_\text{CE}(\psi(Z_s), y) + \tfrac{1}{2}\mathcal{L}_\text{CE}(\psi(Z_s), y_t)
$$
Hard labels can additionally be label-smoothed ($\varepsilon = 0.1$ throughout
the paper's experiments) when used as the true-label term (§4, p.6).

At inference, DeiT⚗ fuses two classifier heads (one reading the class token,
one reading the distillation token) by late-fusion (softmax-sum) of their
outputs — the paper's referent evaluation protocol (§4, "Classification with
our approach", p.7).

# Claimed contributions

*(§1, p.2, "In summary, our work makes the following contributions:")*

- C1: A convolution-free network competitive with the state of the art on
  ImageNet with **no external data**, trained on a single node with 4 GPUs in
  three days. Two new smaller models, DeiT-S and DeiT-Ti, are introduced as
  "the counterpart of ResNet-50 and ResNet-18" (§1, p.2).
- C2: A new distillation procedure based on a distillation token that "plays
  the same role as the class token, except that it aims at reproducing the
  label estimated by the teacher," interacting with the class/patch tokens
  through attention; claimed to outperform vanilla (classical KD-style)
  distillation "by a significant margin" (§1, p.2).
- C3: "Interestingly, with our distillation, image transformers learn more
  from a convnet than from another transformer with comparable performance"
  (§1, p.2) — later substantiated in Table 2 and the "Convnets teachers"
  paragraph (§5.2, p.9).
- C4: Models pre-trained on ImageNet transfer competitively to downstream
  fine-grained classification tasks (CIFAR-10, CIFAR-100, Flowers-102,
  Stanford Cars, iNaturalist-18/19) (§1, p.2; results in Table 7, §5.4, p.13).

# Assumptions

1. **Architecture is fixed to ViT.** DeiT does not modify the patch
   embedding, positional-embedding scheme, or transformer-block structure —
   only training procedure and (optionally) the extra distillation token
   (§5.1, p.8: "our architecture design is identical to the one proposed by
   Dosovitskiy et al. [15] ... Our only differences are the training
   strategies, and the distillation token"). Hard precondition: any claim
   about DeiT's efficiency gain is a training-recipe claim, not an
   architectural one.
2. **A strong teacher must be available for the distillation variant.** The
   default reference teacher, RegNetY-16GF (84M params, 82.9% top-1),
   requires its own training run with matching data augmentation (§5.2,
   p.9). Soft precondition — DeiT without distillation ("DeiT–", Table 3)
   still trains and reaches competitive numbers alone.
3. **Repeated augmentation and stochastic depth are required for
   convergence at this data scale**, not merely helpful: removing either one
   collapses training (top-1 drops to 3–4% pre-training, ~0.1% after
   fine-tuning — Table 8, rows "Erasing"/next two rows under
   "regularization", §6, p.15). Hard precondition for the recipe as
   published.
4. **Batch-size-scaled learning rate** assumes the linear-scaling rule of
   Goyal et al., with base LR at batch size 512 rather than the 256 used in
   the original rule (§6, "Regularization & Optimizers", p.16):
   $$
   \text{lr}_\text{scaled} = \frac{\text{lr}}{512} \times \text{batchsize}
   $$
5. Reported throughput numbers assume a 16GB V100 GPU, largest feasible batch
   size per model, and the specific reference implementation from the timm
   GitHub repository (Table 5 caption, p.12) — cross-paper throughput
   comparisons outside this setup are not directly comparable.

# Failure regime

- Training collapses (near-chance accuracy, 3.4–4.3% pre-training top-1,
  0.1% after fine-tuning) when either stochastic depth or repeated
  augmentation is disabled while everything else in the default recipe is
  kept (Table 8, §6, p.15, rows marked with `*`: "the model did not train
  well, possibly because hyper-parameters are not adapted").
- Replacing AdamW pre-training with SGD pre-training degrades accuracy sharply
  (74.5% vs 81.8% top-1 at 224px; 77.3% vs 83.1% at 384px after fine-tuning) —
  Table 8, §6, p.15, "optimizer" ablation row.
- Two independently-initialized class tokens (rather than one class + one
  distillation token) converge to the *same* vector during training
  (cos-similarity 0.999) and bring no classification benefit — an ablation
  showing the distillation token's benefit comes specifically from its
  teacher-supervised target, not from merely adding model capacity (§4,
  "Distillation token", p.7).
- Direct positional-embedding rescaling by bilinear interpolation when
  fine-tuning at a different resolution "reduces its $\ell_2$-norm compared
  to its neighbors," producing low-norm vectors poorly matched to the
  pretrained transformer and "a significant drop in accuracy if we ...
  use directly without any form of fine-tuning" (§6, "Fine-tuning at
  different resolution", p.16–17) — bicubic interpolation is used instead
  because it approximately preserves vector norm.

# Numerical sensitivity

- Transformers are stated to be "relatively sensitive to initialization";
  several tested initialization schemes failed to converge before settling on
  a truncated-normal initialization following Hanin & Rolnick (§6,
  "Initialization and hyper-parameters", p.14–15).
- Weight decay is a sensitive hyperparameter distinct from ViT's own setting:
  DeiT uses 0.05 versus ViT-B's reported 0.3, with the paper noting "the
  weight decay reported in the [ViT] paper hurts the convergence in our
  setting" (§6, "Regularization & Optimizers", p.16; Table 9).
- Learning-rate and weight-decay cross-validation grid: LR $\in
  \{5\times10^{-4}, 3\times10^{-4}, 5\times10^{-5}\}$, weight decay $\in
  \{0.03, 0.04, 0.05\}$ (§6, "Regularization & Optimizers", p.16).
- Soft-distillation temperature/coefficient follow Cho & Hariharan's
  recommendation: $\tau = 3.0$, $\lambda = 0.1$ (§6, "Initialization and
  hyper-parameters", p.15). Hard-label distillation is explicitly
  "parameter-free" by comparison (§4, "Hard-label distillation", p.6) — no
  $\tau$/$\lambda$ to tune, which the paper frames as a practical advantage.
- Repeated augmentation with 3 repetitions means only ~1/3 of unique images
  are seen per nominal "epoch"; the paper's "300 epochs" is defined as 100
  true passes × 3 repeats, kept as "300" purely for comparability with
  non-repeated-augmentation runs (§6, "Training time", footnote 3, p.17).

# Applicability

- Use when: training a plain ViT-family classifier from ImageNet-1k-scale
  data only, with a single multi-GPU node and a few days of compute; when a
  strong pretrained convnet is available to use as a distillation teacher.
- Don't use when: JFT-300M-scale (or comparably massive) pretraining data is
  available — the paper's own headline number, DeiT-B⚗↑384/1000ep at 85.2%
  top-1, still trails the paper's cited ViT-H/14 JFT-300M-at-512 SOTA of
  88.55% (§5.2, p.9); don't expect the training recipe (RandAugment, Mixup,
  CutMix, repeated augmentation, stochastic depth) to transfer unmodified to
  non-transformer architectures or to very different dataset scales without
  re-ablating (Table 8 ablations are DeiT-B/ImageNet-1k specific).
- Compared against: ViT (same architecture, JFT-300M-pretrained, §5.2–5.3);
  ResNet-18/50/101/152 and RegNetY-4/8/12/16GF and EfficientNet-B0–B7
  (accuracy/throughput trade-off, Table 5, §5.3, p.11–12).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| dosovitskiy2020-vit / vit | "our architecture design is identical to the one proposed by Dosovitskiy et al. [15] with no convolutions. Our only differences are the training strategies, and the distillation token." (§5.1, p.8); "according to this study [15], a pre-training phase on a large volume of curated data is required ... In our paper we achieve a strong performance without requiring a large training dataset" (§2, p.3–4) | `extended_by` (authored on the **vit** page's forward edges, target=deit) | high | DeiT is architecturally *identical* to ViT-B — this is a training-recipe/head extension, not a different method, and it does not strictly dominate ViT: ViT+JFT-300M still reaches higher absolute accuracy (88.55% ViT-H/14, cited §5.2) than any ImageNet-1k-only DeiT variant (85.2%). Fails the `generalized_by`/Rule-A bar (not "recovers everything + strictly more" — the JFT-pretraining regime is out of DeiT's reach). Rule A's supersession language ("preserved only for lineage") does not apply; ViT keeps independent practical value at large data scale, so `quality: historical` on ViT is NOT warranted. `extended_by` (FRST→RSD pattern: same-family, target builds on this method without replacing it) is the better fit. Author the edge on `vit`'s frontmatter (A=vit → B=deit) per CLAUDE.md's asymmetric-edge convention; this auto-derives `extending` on deit's generated reverse-edge bucket. Orchestrator to confirm before editing vit.md. |
| hinton2015-distillation | "Knowledge Distillation (KD), introduced by Hinton et al. [24], refers to the training paradigm in which a student model leverages 'soft' labels ... In our paper we study the distillation of a transformer student by either a convnet or a transformer teacher. We introduce a new distillation procedure specific to transformers and show its superiority." (§2, p.4–5); "Soft distillation [24, 54] minimizes the Kullback-Leibler divergence ..." (§4, p.6) | `feeds_into` (Hinton→DeiT) | high | DeiT names Hinton's soft-label KD explicitly as the framework it builds on and departs from (hard-label variant + distillation token is a distinct, transformer-specific mechanism, not merely "Hinton's method applied unchanged"). Chronology holds (Hinton 2015 ≤ DeiT 2020). **Not yet actionable as a `relations[]` edge**: `relations[].target` must resolve to an on-disk Atlas page, and no `knowledge-distillation` concept page exists yet (see Connections below) — record as a citation in `sources.references` now; promote to a typed edge once that concept page is authored. |
| he2016-resnet / resnet | "we produce competitive convolution-free transformers by training on Imagenet only ... competitive with convnets for both Imagenet ... and when transferring to other tasks" (Abstract, p.1); explicit accuracy/throughput comparison against ResNet-18/50/101/152 (Table 5, §5.3, p.11–12) | `compared_with` | high | Same problem class (ImageNet-1k classification), peer practitioner choice (transformer backbone vs. convnet backbone) — textbook `compared_with` case, not supersession (DeiT doesn't claim to generalize ResNet, just to be competitive at similar accuracy/throughput). Tiebreaker per CLAUDE.md ("older paper hosts"): he2016-resnet (2016) predates touvron2020-deit (2020), so the `## When to choose X over Y` section would host on **resnet**, not deit — but note DeiT's primary convnet comparisons in the paper are actually against RegNetY and EfficientNet (Table 5), with plain ResNet as one baseline family among several; orchestrator should weigh whether resnet is the most representative comparison target or whether this stays a lighter-weight mention. |
| RegNetY (Radosavovic et al. 2020, "Designing Network Design Spaces") | "the default teacher is a RegNetY-16GF [40] (84M parameters) that we trained with the same data and same data-augmentation as DeiT" (§5.2, p.9); Table 2 teacher-architecture ablation | none — target not registered | — | RegNetY has no `paper_id` in `docs/papers/index.yaml` and no Atlas page. This is DeiT's actual default distillation teacher and arguably its most consequential external dependency (C3 above), but per CLAUDE.md relations require a resolvable on-disk target — do not fabricate an id. Flagged for the orchestrator: registering `radosavovic2020-regnet` would enable a `feeds_into`-shaped edge (RegNetY→DeiT, teacher used as a named component) in a future pass. |

# Connections

- Builds on: [dosovitskiy2020-vit, hinton2015-distillation, he2016-resnet]
  (per `docs/papers/index.yaml` `cites:` list for this entry, and confirmed in
  prose above)
- Enables: knowledge-distillation concept page (planned — not yet authored;
  DeiT's soft-vs-hard distillation formulas above are the natural worked
  example once that page exists) — forward pointer only, no edge yet.
- Enables (forward pointer, not evaluated here): DINO (Caron et al. 2021)
  uses a DeiT-S backbone in its self-supervised ViT experiments — out of
  scope for this note; flag for `paper-ingest` on `caron2021-dino` if/when
  that note is written.

# Atlas update plan

## NEW: deit
Type: model
Category: representation-learning / image-classification (mirrors `vit`'s
`domain`/`tasks` frontmatter)
Primary source: touvron2020-deit
Relations to be confirmed by orchestrator from `# Stated relations` before
drafting (pivot workflow) — do not commit any `relations[]` entry on `deit`
or on `vit` until confirmed.

- **Motivation**: ViT needs JFT-300M-scale pretraining to be competitive;
  DeiT reaches strong ImageNet-1k-only accuracy on a single 8-GPU node in
  2–3 days by pairing the unmodified ViT architecture with a heavier
  augmentation/regularization recipe and a new attention-based distillation
  mechanism (Setting, Core idea above).
- **Architecture**: identical to ViT (patch embedding, class token,
  transformer encoder) plus one added distillation token (Core idea, Fig. 2
  above). Three sizes — DeiT-Ti (192-dim, 3 heads, 5M params, 2536 im/s),
  DeiT-S (384-dim, 6 heads, 22M params, 940 im/s), DeiT-B (768-dim, 12
  heads, 86M params, 292 im/s; = ViT-B) — Table 1, §5.1.
- **Training recipe** (candidate `# Implementation`/config table content):
  Table 9 hyperparameters verbatim — 300 epochs, batch size 1024, AdamW,
  lr $= 0.0005 \times \text{batchsize}/512$, cosine LR decay, weight decay
  0.05, 5 warmup epochs, label smoothing $\varepsilon=0.1$, no dropout,
  stochastic depth 0.1, repeated augmentation on, no gradient clipping,
  RandAugment (magnitude 9, prob 0.5), Mixup prob 0.8, CutMix prob 1.0,
  random erasing prob 0.25 (§6, Table 9, p.16).
- **Distillation**: both loss formulas (Eq. 2 soft, Eq. 3 hard, §4 above);
  distillation-token mechanism (Fig. 2); finding that hard distillation beats
  soft (83.0% vs 81.8% top-1 at DeiT-B/224, Table 3) and that a convnet
  teacher (RegNetY-16GF) beats a transformer teacher of similar accuracy
  (Table 2); class/distillation token cosine similarity 0.06 average, rising
  to 0.93 (still <1) at the final layer (§4, "Distillation token", p.7).
- **Results** (candidate `# Assessment` content): DeiT-B 81.8% / DeiT-B↑384
  83.1% top-1 (no distillation, Table 5); DeiT-B⚗ 83.4% (224) / DeiT-B⚗↑384
  84.5% (300-epoch) / 85.2% (1000-epoch) top-1 (Table 5); ViT-B/16 (JFT-300M
  pretrained, 384px, from Table 5's "Transformers" block, cited from
  Dosovitskiy et al.) 77.9% top-1 — `?` the paper's own "+6.3% top-1 in a
  comparable setting" claim (§5.3, p.11) does not fully disambiguate which
  two specific rows it subtracts (77.9% vs 84.2%/81.8%/83.1% are all
  candidates); do not reuse the "+6.3%" figure in a page without
  re-deriving which pair of rows it refers to. DeiT-B⚗↑384/1000ep (85.2%) beats the cited
  ViT-B/16-JFT300M@384 number (84.15%) by ~1 point while training
  substantially faster (§5.3, p.11). Transfer-learning table (Table 7,
  §5.4): DeiT-B⚗↑384 CIFAR-10 99.2%, CIFAR-100 91.4%, Flowers 98.9%, Cars
  93.9%, iNat-18 80.1%, iNat-19 83.0%.
- **Remarks candidates**: repeated augmentation and stochastic depth are
  load-bearing, not optional (Failure regime above); AdamW required over SGD
  for pretraining (Table 8); bicubic (not bilinear) interpolation required
  for positional-embedding resizing across resolutions (Numerical
  sensitivity above).
- **References**: touvron2020-deit (primary); dosovitskiy2020-vit,
  hinton2015-distillation, he2016-resnet (secondary, per `cites:` in
  `docs/papers/index.yaml`).
- Suggested `prerequisites`: [vit, attention-mechanism] (transformer concept
  page likely subsumed by attention-mechanism as a prerequisite — orchestrator
  to decide whether `transformer` is also needed or is redundant).

## UPDATE: vit
Section: Relations (sidebar) — pending orchestrator confirmation of the
`extended_by` row in `# Stated relations` above. If confirmed, add to vit.md
frontmatter:
```
relations:
  - type: extended_by
    target: deit
    confidence: high
    caution: "Same architecture; DeiT is a training-recipe + distillation-token extension for the ImageNet-1k-only regime, not a strict generalization — ViT+JFT-300M pretraining still yields higher absolute accuracy."
```
No prose-body change needed beyond the frontmatter edge — the renderer
composes the reverse `extending` bucket on deit automatically.

# Provenance

- Abstract, p.1: 86M-param reference ViT, 83.1% top-1 single-crop no external
  data; distillation up to 85.2%.
- §1 Introduction, p.2: "train ... in two to three days (53 hours of
  pre-training, and optionally 20 hours of fine-tuning)"; contributions list
  C1–C4.
- §2 Related work, p.3–5: ViT positioning quote; Hinton KD positioning quote;
  transformer/CNN hybrid background.
- §3 Vision transformer: overview, p.4–6: Eq. 1 (attention); patch/class-token
  description; positional-encoding interpolation discussion (Touvron et al.,
  Fixing the train-test resolution discrepancy).
- §4 Distillation through attention, p.6–8: Eq. 2 (soft distillation), Eq. 3
  (hard-label distillation), Fig. 2 (distillation token diagram), cosine
  similarity numbers (0.06 average, 0.93 final layer, 0.999 two-class-token
  control).
- §5.1 Transformer models, p.8–9: Table 1 (model family dimensions/params/
  throughput).
- §5.2 Distillation, p.9–11: Table 2 (teacher ablation), Table 3
  (distillation-strategy ablation), Table 4 (disagreement analysis), RegNetY
  teacher description and 82.9% top-1.
- §5.3 Efficiency vs accuracy, p.11–12: Table 5 (headline throughput/accuracy
  results incl. ResNet/RegNetY/EfficientNet/ViT/DeiT rows), "+6.3% top-1"
  claim, 85.2% vs 84.15% ViT-B/16-JFT300M@384 comparison, 88.55% ViT-H/14
  JFT-300M@512 SOTA citation.
- §5.4 Transfer learning, p.13–14: Table 6 (datasets), Table 7 (transfer
  results), CIFAR-10-from-scratch comparison (RegNetY-16GF 98.0 / DeiT-B 97.5
  / DeiT-B⚗ 98.5).
- §6 Training details & ablation, p.14–17: initialization discussion; Table 8
  (ablation study); Table 9 (hyperparameters); lr-scaling formula; τ=3.0,
  λ=0.1; stochastic depth, repeated augmentation, EMA discussion; Table 10
  (resolution ablation); training-time paragraph and footnote 3 (repeated-
  augmentation epoch accounting).
- §7 Conclusion, p.17–18: summary framing, open-source release pointer
  (github.com/facebookresearch/deit).
