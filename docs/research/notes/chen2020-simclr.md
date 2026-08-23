---
paper_id: chen2020-simclr
title: "A Simple Framework for Contrastive Learning of Visual Representations"
authors: ["T. Chen", "S. Kornblith", "M. Norouzi", "G. E. Hinton"]
year: 2020
url: https://arxiv.org/pdf/2002.05709
created: 2026-08-23
relevant_atlas_pages:
  - vit
  - mae
  - dinov2
---

# Setting

Self-supervised pretraining of image representations from unlabeled RGB images, evaluated by how well a downstream linear classifier (or a fine-tuned network) performs. Input: unlabeled images, primarily ImageNet-1K (ILSVRC-2012, no labels used during pretraining); CIFAR-10 is used as a secondary confirmation dataset. Output: an encoder $f(\cdot)$ producing a fixed-length representation vector $h \in \mathbb{R}^d$ (2048-d for ResNet-50, taken after the average-pooling layer) for each image; downstream use is either (a) a linear classifier trained on frozen $h$ ("linear evaluation protocol"), (b) end-to-end fine-tuning of $f(\cdot)$ on a labeled subset, or (c) transfer to other classification datasets. There is no architectural constraint on $f(\cdot)$, no memory bank, and no specialized pretext-task network — the framework is a training recipe, not a new architecture (§2.1).

# Core idea

SimCLR maximizes agreement between two randomly-augmented views of the same image via a contrastive loss defined on projected embeddings, using only in-batch negatives (no memory bank). Four components make up the framework (§2.1, Fig. 2):

1. **Stochastic augmentation module $\mathcal{T}$.** Two augmentation functions $t \sim \mathcal{T}$, $t' \sim \mathcal{T}$ are drawn independently and applied to each image $x_k$ in a minibatch, producing a positive pair $\tilde{x}_i, \tilde{x}_j$. The default policy sequentially applies three augmentations: random crop-and-resize (with random horizontal flip), random color distortion, and random Gaussian blur (§2.1, §2.3 "Default setting"). Ablations (§3) establish that no single augmentation suffices, and that the composition of **random crop + random color distortion** is the one pairing that matters most — without composing crop with a non-spatial (appearance) transform, the network can solve the contrastive task by matching color histograms alone, since crops of the same image share color statistics (Fig. 6, §3.1).

2. **Base encoder $f(\cdot)$.** SimCLR uses a standard ResNet-50 (He et al. 2016), $h_i = f(\tilde{x}_i) = \text{ResNet}(\tilde{x}_i) \in \mathbb{R}^d$, taken after global average pooling (§2.1). Depth/width variants (ResNet-50 1×/2×/4×, and shallower/deeper ResNets) are also evaluated.

3. **Projection head $g(\cdot)$.** A small 2-layer MLP maps the representation into the space where the contrastive loss is applied: $z_i = g(h_i) = W^{(2)}\sigma(W^{(1)} h_i)$, with $\sigma$ a ReLU nonlinearity, projecting to a 128-dimensional latent space by default (§2.1, §2.3). The contrastive loss is defined on $z_i$, **not** on $h_i$ — this is deliberate: a nonlinear projection head outperforms a linear one by +3% and outperforms no projection head (identity) by >10% top-1 linear-eval accuracy (Fig. 8, §4.2), and $h$ (pre-projection) is itself >10% better under linear evaluation than $z=g(h)$ (post-projection), regardless of whether $g$ is linear or nonlinear. The explanation offered: $z=g(h)$ is trained to be invariant to the applied data transformation, so $g$ can discard information (color, orientation) that is useless for the contrastive task but useful downstream; $h$ retains that information. This is verified directly by training auxiliary MLPs to predict the applied transformation from $h$ vs. $g(h)$ (Table 3): e.g. predicting rotation from $h$ reaches 67.6% vs. 25.6% from $g(h)$ (random guess 25%); predicting color-vs-grayscale reaches 99.3% from $h$ vs. 97.4% from $g(h)$.

4. **Contrastive loss (NT-Xent).** Given a minibatch of $N$ images, the two augmentations of each yield $2N$ views. No negatives are sampled explicitly; for a given positive pair, the other $2(N-1)$ augmented examples in the minibatch serve as negatives — there is no memory bank (§2.1, §2.2). With $\text{sim}(\bm{u},\bm{v}) = \bm{u}^\top \bm{v} / \lVert\bm{u}\rVert\lVert\bm{v}\rVert$ denoting cosine similarity between $\ell_2$-normalized vectors, the loss for a positive pair $(i,j)$ is:

$$
\ell_{i,j} = -\log \frac{\exp(\text{sim}(\bm{z}_i, \bm{z}_j)/\tau)}{\sum_{k=1}^{2N} \mathbb{1}_{[k \neq i]} \exp(\text{sim}(\bm{z}_i, \bm{z}_k)/\tau)}
$$

where $\tau$ is a temperature parameter and $\mathbb{1}_{[k\neq i]} \in \{0,1\}$ excludes self-similarity (§2.1, Eq. 1). The full loss is computed over all positive pairs in both orders, $(i,j)$ and $(j,i)$, in the minibatch: $\mathcal{L} = \frac{1}{2N}\sum_{k=1}^{N}[\ell(2k-1,2k) + \ell(2k,2k-1)]$ (Algorithm 1, §2.1). The paper names this loss NT-Xent ("normalized temperature-scaled cross entropy"); it is not new (it appears in Sohn 2016, Wu et al. 2018, Oord et al. 2018) but the paper is the one that names and systematically studies it (§2.1).

# Assumptions

1. (Hard) Negatives are drawn purely in-batch — the effective number of negatives per positive pair is $2(N-1)$, tied directly to the minibatch size $N$. There is no decoupling mechanism (memory bank / queue) (§2.2).
2. (Hard) Both $\ell_2$ normalization of $z$ (cosine similarity) and an appropriately tuned temperature $\tau$ are required; without normalization, the contrastive task's own accuracy is *higher* but the resulting representation is *worse* under linear evaluation (Table 5, §5.1).
3. (Soft) The augmentation composition matters more than any single augmentation; random-crop + color-distortion is the load-bearing pair (§3.1, Fig. 5–6).
4. (Soft) Large batch sizes (256–8192) and/or long training schedules are needed to realize the framework's advantage; at small epoch counts (e.g. 100), larger batches have a significant edge, but the gap shrinks or disappears with enough training steps, provided batches are randomly resampled each epoch (Fig. 9, §5.2).
5. (Soft) Global batch normalization (aggregating BN statistics across all devices, not per-device) is required for correctness in the multi-device large-batch regime — because positive pairs are computed on the same device, per-device BN lets the model exploit local statistics as a shortcut ("information leakage") without improving the learned representation (§2.2).
6. (Soft) Contrastive learning benefits from stronger data augmentation (esp. color distortion) than supervised training does — the same augmentation strength that helps SimCLR flattens or hurts a supervised baseline trained on the same augmentations (Table 1, §3.2).

# Failure regime

- **Weak/single augmentation.** Any single augmentation (crop alone, color alone, etc.) lets the model nearly perfectly solve the contrastive prediction task while producing a poor representation under linear evaluation (§3.1, Fig. 5) — high contrastive accuracy does not imply good representations.
- **Crop-only, no color distortion.** Because crops of the same source image share similar color histograms, a crop-only policy lets the network shortcut the task via color-histogram matching instead of learning semantic invariances (Fig. 6, §3.1).
- **Unnormalized embeddings / mistuned temperature.** Removing $\ell_2$ normalization or choosing $\tau$ far from the effective range (Table 5 shows $\tau \in \{10, 100\}$ without normalization, or $\tau=1$ with normalization) collapses linear-eval top-1 from ~64% down into the 57–60% range even though the raw contrastive task's own accuracy stays high or even rises (§5.1).
- **No projection head, or linear-only projection head.** Applying the contrastive loss directly on $h$ (identity "head") loses >10% top-1 vs. using a nonlinear head; a linear head underperforms the nonlinear head by ~3% (Fig. 8, §4.2).
- **Small batch + short schedule.** At 100 epochs, batch size 256 reaches only 57.5–62.8% top-1 vs. 64.6–64.8% at batch 4096–8192 (Table B.1) — small-batch, short-schedule runs are substantially handicapped relative to the framework's best-case numbers.
- **AutoAugment does not help.** A sophisticated *supervised*-tuned augmentation policy (AutoAugment) underperforms simple crop + strong color distortion for SimCLR (61.1% vs. 64.5% top-1, Table 1) — augmentation policies tuned for supervised learning do not transfer to the contrastive setting.

# Numerical sensitivity

**Default training configuration that produces the reported numbers (§2.3):** ResNet-50 encoder; 2-layer MLP projection head → 128-d; NT-Xent loss; LARS optimizer with learning rate $4.8 = 0.3 \times \text{BatchSize}/256$ and weight decay $10^{-6}$; batch size 4096; 100 epochs (ablations) / up to 1000 epochs (best results, §6); linear learning-rate warmup for the first 10 epochs, then cosine decay without restarts. LARS (You et al. 2017) is used specifically because standard SGD/Momentum with linear LR scaling is unstable at large batch sizes (§2.2). Batch size is varied from 256 to 8192 across experiments; a batch of 8192 yields $2 \times 8192 - 2 = 16382$ negative examples per positive pair from both augmented views (§2.2).

**Data augmentation constants (Appendix A):** random (Inception-style) crop area uniform in $[0.08, 1.0]$ of original, aspect ratio in $[3/4, 4/3]$, resized to 224×224, followed by a horizontal flip with 50% probability (removing the flip drops top-1 from 64.5% to 63.4%, ResNet-50, 100 epochs). Color jitter: brightness $\pm 0.8s$, contrast/saturation range $[1-0.8s, 1+0.8s]$, hue $\pm 0.2s$ (default strength $s=1$), applied with probability 0.8, followed by color-drop (grayscale) with probability 0.2. Gaussian blur applied 50% of the time, $\sigma \sim \text{Uniform}[0.1, 2.0]$, kernel size = 10% of image height/width; adding blur improves ResNet-50/100-epoch top-1 from 63.2% to 64.5%.

**Color-distortion strength ablation (Table 1):** SimCLR top-1 rises with strength: 59.6 (1/8) → 61.0 (1/4) → 62.6 (1/2) → 63.2 (1) → 64.5 (1 + blur), while a supervised baseline trained on the same augmentations stays flat or degrades: 77.0 → 76.7 → 76.5 → 75.7 → 75.4. AutoAugment gives SimCLR 61.1 but supervised 77.1.

**Projection head (Fig. 8, §4.2):** nonlinear head beats linear head by +3% top-1 and beats no head (identity) by >10%; performance is similar across output dimensionalities once a nonlinear head is used (evaluated with representation $h$ fixed at 2048-d).

**Loss-function ablation (Table 2, Table 4):** NT-Xent reaches 63.9% top-1 vs. Margin-Triplet 50.9%, NT-Logistic 51.6%, semi-hard-mined Margin 57.5%, semi-hard-mined NT-Logistic 57.9% — i.e. NT-Xent beats even the best semi-hard-negative-mined alternative by ~6 points, attributed to its implicit weighting of negatives by relative hardness through the softmax gradient (no explicit hard-negative mining needed).

**Normalization/temperature ablation (Table 5, contrastive distribution over 4096 examples):** with $\ell_2$ normalization: $\tau=0.05 \to$ top-1 59.7 (entropy 1.0); $\tau=0.1 \to$ top-1 64.4 (entropy 4.5) — the best value shown; $\tau=0.5 \to$ top-1 60.7 (entropy 8.2); $\tau=1 \to$ top-1 58.0 (entropy 8.3). Without normalization: $\tau=10 \to$ top-1 57.2; $\tau=100 \to$ top-1 57.0 — contrastive-task accuracy is *higher* here (91.7–92.1%) but downstream representation quality is worse. (Note: this ImageNet ablation table implies $\tau=0.1$ is the strongest tested setting with normalization, but the paper does not restate this as an explicit "default $\tau$" sentence in the main text — flagging with `?`. Separately, on CIFAR-10 (Appendix B.9), the optimal temperature among $\{0.1, 0.5, 1.0\}$ is reported as 0.5 when trained to convergence (>300 epochs), though performance at $\tau=0.1$ improves as batch size grows — this CIFAR-10 finding should not be conflated with the ImageNet default.)

**Batch size / training length (Fig. 9, Table B.1, Appendix B.1):** at 100 epochs, batch 256 → 57.5% top-1 (linear LR scaling) vs. batch 8192 → 64.8%; by 800 epochs the gap narrows to 66.6% (256) vs. 69.0% (8192). Square-root LR scaling ($\text{LR} = 0.075\sqrt{\text{BatchSize}}$) outperforms linear scaling for small batches / few epochs; the two scalings coincide at batch 4096 (the default). Performance saturates around batch 8192 (Appendix B.1, Fig. B.2); training longer (up to 3200 epochs, batch up to 32768) continues to help.

**Headline linear-evaluation results, ImageNet (Table 6, §6):** SimCLR ResNet-50 (1×, 24M params): 69.3% top-1 / 89.0% top-5. SimCLR ResNet-50 (2×, 94M): 74.2% / 92.0%. SimCLR ResNet-50 (4×, 375M): **76.5% / 93.2%** — a 7% relative improvement over the prior state of the art (Hénaff et al. 2019, CPC v2, ResNet-161(\*): 71.5% top-1), matching the accuracy of a supervised ResNet-50 (the abstract's headline claim); the 4× self-supervised model is only 1.8% below its supervised counterpart in absolute terms, vs. a 6.8% gap for the 1× model (Appendix B.8/§6 discussion).

**Semi-supervised fine-tuning, ImageNet (Table 7, top-5; Table B.4, top-1):** supervised baseline (ResNet-50, class-balanced 1%/10% label subsets): 48.4/80.4 top-5, 25.4/56.4 top-1. SimCLR ResNet-50: 75.5/87.8 top-5, 48.3/65.6 top-1. SimCLR ResNet-50 (2×): 83.0/91.2 top-5, 58.5/71.7 top-1. SimCLR ResNet-50 (4×): **85.8%/92.6% top-5**, 63.0/74.4 top-1 — the abstract's "85.8% top-5 on 1% labels" figure is the ResNet-50 (4×) row. Fine-tuning protocol (Appendix B.5): Nesterov momentum optimizer, batch 4096, momentum 0.9, LR $=0.8=0.05\times\text{BatchSize}/256$, no warmup, no weight decay; only random crop+flip+resize-to-224 augmentation; 60 epochs for 1% labels, 30 epochs for 10% labels; inference resizes to 256 then center-crops 224.

**Transfer learning (Table 8, ResNet-50 4×, 12 datasets):** fine-tuned SimCLR outperforms the supervised baseline on 5/12 datasets, is statistically tied on 5, and loses on 2 (Pets, Flowers); e.g. fine-tuned SimCLR reaches 78.2% on Birdsnap vs. supervised 77.8%, and 68.1% on SUN397 vs. supervised 67.0%.

**Broader augmentation set (Appendix B.2):** adding Sobel filtering, extra color distortion (equalize, solarize) and motion blur to the default policy further improves linear-eval top-1: ResNet-50 70.0 (+0.7), ResNet-50 (2×) 74.4 (+0.2), ResNet-50 (4×) 76.8 (+0.3). Fine-tuned on 100% labels with this broader policy, ResNet-50 (4×) reaches 80.4% top-1/95.4% top-5, vs. 78.4%/94.2% for the same architecture trained from scratch with the same augmentations.

# Applicability

- Use when: labels are scarce or absent and a standard convolutional (or, per later work, transformer) backbone is being pretrained on a large unlabeled image corpus; the recipe requires no architectural specialization.
- Use when: multi-device / multi-TPU training with large aggregate batch size is available — the method's advantage is largest with batch sizes in the thousands and hundreds of training epochs.
- Don't use when: only small batch sizes are feasible and a memory-bank/queue-based alternative (decoupling negative-set size from batch size) is available instead.
- Don't use when: compute budget cannot support 100+ epochs of large-batch pretraining with LARS and global batch normalization across devices.
- Compared against (within paper): MoCo, PIRL, CPC v2, CMC, AMDIM, BigBiGAN, Local Aggregation, Instance Discrimination, Rotation prediction (Table 6, §6) — all evaluated under the same linear-evaluation protocol on ImageNet.

# Connections

- Builds on: ResNet (He et al. 2016) as base encoder; NT-Xent-family losses from Sohn 2016, Wu et al. 2018 (memory-bank instance discrimination), Oord et al. 2018 (CPC); LARS optimizer (You et al. 2017); linear-evaluation protocol (Zhang et al. 2016; Oord et al. 2018; Bachman et al. 2019; Kolesnikov et al. 2019) (§2.1, §7).
- Enables / relevant to: ViT-based self-supervised pretraining lines that also rely on augmentation-invariance objectives (this note's `relevant_atlas_pages` list includes `vit`, `mae`, `dinov2` as the connected Atlas pages; the specific typed relationship, if any, is left to the Atlas update plan below rather than asserted here).
- **Pointer (not read for this note) — MoCo (He et al. 2019).** MoCo decouples the negative-set size from the training batch size by maintaining a large FIFO memory queue of negative keys, encoded by a momentum-averaged copy of the encoder, rather than relying on in-batch negatives. This is the structural point of contrast with SimCLR's "no memory bank, just a big batch" design (§2.2 of this paper explicitly frames SimCLR against memory-bank approaches including MoCo). No claims about MoCo's numerical results are made here — see a dedicated `he2019-moco` research note when authored.
- **Pointer (not read for this note) — BYOL (Grill et al. 2020).** BYOL is understood (from the broader self-supervised-learning literature this paper's related-work section gestures at, §7) to remove negative pairs from the objective entirely, instead using an asymmetric online/target-network + predictor architecture trained with a momentum-updated target to avoid representational collapse. This is the structural point of contrast with SimCLR's explicit in-batch-negative NT-Xent loss. No claims about BYOL's numerical results are made here — see a dedicated `grill2020-byol` research note when authored.

# Atlas update plan

## NEW: self-supervised-learning
Type: concept
Category: representation learning / self-supervised pretraining
Primary source: this paper contributes one row of a multi-method survey; do not treat chen2020-simclr as the page's sole primary source once MoCo/BYOL/DINO notes exist.

Decision-table row this method contributes (paradigm = **contrastive learning with in-batch negatives**, no memory bank, no momentum encoder):

- **Mechanism:** two stochastically-augmented views per image; NT-Xent loss over cosine similarity of MLP-projected embeddings; negatives = all other views in the same minibatch.
- **Negative source:** in-batch only — negative-set size is tied directly to batch size ($2N-2$ negatives per positive pair), unlike MoCo's decoupled memory queue or BYOL/DINO's negative-free objectives.
- **Architectural requirement:** a projection head (2-layer MLP) is necessary at train time and discarded at inference — the pre-projection representation $h$ is reported as the better feature for downstream use, not $z=g(h)$.
- **Strengths:** conceptually simple (no specialized architecture, no memory bank); strong linear-probe accuracy (76.5% top-1, ResNet-50 4×, ImageNet); strong semi-supervised fine-tuning from as little as 1% of labels (85.8% top-5, ResNet-50 4×); benefits more from bigger/wider encoders than supervised training does.
- **Costs:** requires very large batch sizes (thousands) or very long training schedules to be competitive — the batch-size dependence is a direct consequence of the in-batch-negative design; needs LARS (not vanilla SGD) at large batch, and global (cross-device) batch normalization to avoid a same-device shortcut; needs a carefully composed, comparatively aggressive augmentation policy (crop + color distortion is load-bearing).
- **When this row would win a comparison:** compute/TPU-rich settings where large-batch multi-device training is already standard and no ready-made large negative-queue infrastructure exists.

No typed relations — concept page (approved plan). Survey concept spans SimCLR/MoCo/BYOL/DINO.

## UPDATE: vit
Section: Remarks or Relations (tentative — verify current page structure before applying)
Bullets to add:
- Pointer to the `self-supervised-learning` survey concept page once written, if ViT-based self-supervised pretraining is discussed on that page.

## UPDATE: mae
Section: Relations (tentative — verify current page structure before applying)
Bullets to add:
- Pointer to the `self-supervised-learning` survey concept page as the contrastive counterpoint to MAE's masked-reconstruction paradigm, once the concept page exists. No specific relations-field edge is proposed here; MAE and SimCLR address the same problem (label-free pretraining) via different paradigms (masked reconstruction vs. contrastive), which is exactly what a survey concept page — not a `relations[]` entry — should carry.

## UPDATE: dinov2
Section: Relations (tentative — verify current page structure before applying)
Bullets to add:
- Pointer to the `self-supervised-learning` survey concept page once written, for readers wanting the historical contrastive-learning context (SimCLR) behind DINO-family self-distillation methods.

# Provenance

- Abstract: "76.5% top-1 accuracy, which is a 7% relative improvement over previous state-of-the-art"; "matching the performance of a supervised ResNet-50"; "85.8% top-5 accuracy" fine-tuned on 1% labels; "outperforming AlexNet with 100× fewer labels."
- §2.1 (framework definition, Fig. 2 caption): four components — augmentation module, base encoder $f(\cdot)$, projection head $g(\cdot)$, contrastive loss; $h_i = f(\tilde{x}_i) = \text{ResNet}(\tilde{x}_i)$; $z_i = g(h_i) = W^{(2)}\sigma(W^{(1)}h_i)$; "we find it beneficial to define the contrastive loss on $z_i$'s rather than $h_i$'s."
- §2.1, Eq. 1 (also HTML math id `S2.E1.m1`): $\ell_{i,j} = -\log\frac{\exp(\text{sim}(z_i,z_j)/\tau)}{\sum_{k=1}^{2N}\mathbb{1}_{[k\neq i]}\exp(\text{sim}(z_i,z_k)/\tau)}$; $\text{sim}(u,v)=u^\top v/\lVert u\rVert\lVert v\rVert$ (HTML math id `S2.SS1.p2.m4`); "we term it NT-Xent."
- Algorithm 1 (§2.1): full pseudocode, including $\mathcal{L} = \frac{1}{2N}\sum_{k=1}^N[\ell(2k-1,2k)+\ell(2k,2k-1)]$.
- §2.2 ("Training with Large Batch Size", "Global BN"): batch size varied 256–8192; "batch size of 8192 gives us 16382 negative examples per positive pair"; LARS optimizer used because "training with large batch size may be unstable when using standard SGD/Momentum with linear learning rate scaling"; global BN aggregation rationale ("the model can exploit the local information leakage").
- §2.3 ("Default setting"): augmentation policy (crop+flip+resize, color distortion, Gaussian blur); ResNet-50 base encoder; 2-layer MLP → 128-d projection; NT-Xent + LARS, LR $4.8 = 0.3\times\text{BatchSize}/256$, weight decay $10^{-6}$; batch 4096, 100 epochs; 10-epoch linear warmup + cosine decay.
- §3, §3.1 (Fig. 4, Fig. 5, Fig. 6): augmentation catalogue; "no single transformation suffices to learn good representations"; "one composition of augmentations stands out: random cropping and random color distortion"; color-histogram shortcut argument.
- §3.2, Table 1 (footnote 5): color-distortion-strength ablation numbers for SimCLR vs. supervised; AutoAugment comparison (61.1 vs. 77.1).
- §4.1, Fig. 7: "unsupervised contrastive learning benefits (more) from bigger models"; gap-shrinks-with-model-size claim; also restated numerically in the §6/Appendix B.8 discussion ("6.8% worse... only 1.8% worse").
- §4.2, Fig. 8, Table 3: projection-head ablation (+3% nonlinear vs. linear, >10% vs. none); $h$ vs. $g(h)$ transformation-prediction accuracies (rotation 67.6/25.6, random 25; color-vs-grayscale 99.3/97.4, random 80; orig-vs-corrupted 99.5/59.6; orig-vs-Sobel 96.6/56.3).
- §5.1, Table 2, Table 4: NT-Xent vs. NT-Logistic vs. Margin-Triplet, gradient forms and top-1 numbers (63.9 vs. 51.6/50.9, semi-hard 57.9/57.5).
- §5.1, Table 5: $\ell_2$-norm / temperature ablation numbers (entropy, contrastive accuracy, top-1) for $\tau \in \{0.05,0.1,0.5,1,10,100\}$; contrastive distribution over 4096 examples.
- §5.2, Fig. 9, Appendix B.1, Table B.1, Fig. B.2: batch-size/epoch interaction; square-root vs. linear LR scaling; saturation around batch 8192; longer training helps further (up to 3200 epochs).
- §6, Table 6: linear-evaluation ImageNet numbers for SimCLR ResNet-50 1×/2×/4× and competing methods (MoCo, PIRL, CPC v2, CMC, AMDIM, BigBiGAN, Rotation, Local Agg.).
- §6, Table 7: semi-supervised top-5 numbers (1%/10% labels) for SimCLR variants and baselines (Pseudo-label, VAT+Entropy Min., UDA, FixMatch, S4L, InstDisc, BigBiGAN, PIRL, CPC v2).
- §6, Table 8: transfer-learning results across 12 datasets, linear-eval and fine-tuned, SimCLR ResNet-50 (4×) vs. supervised vs. random-init.
- §7 (Related Work): explicit framing against memory-bank approaches (Wu et al. 2018; Tian et al. 2019; He et al. 2019 = MoCo; Misra & van der Maaten 2019) and in-batch-negative approaches (Doersch & Zisserman 2017; Ye et al. 2019; Ji et al. 2019); mutual-information framing debate (Tschannen et al. 2019).
- Appendix A: augmentation implementation constants — crop area $[0.08,1.0]$, aspect ratio $[3/4,4/3]$, resize to 224×224, flip $p=0.5$ (ablation: 64.5%→63.4% without flip); color jitter $0.8s/0.8s/0.8s/0.2s$ params, $p=0.8$ jitter / $p=0.2$ grayscale; Gaussian blur $p=0.5$, $\sigma\sim\text{Uniform}[0.1,2.0]$, kernel = 10% of image size (ablation: 63.2%→64.5% with blur).
- Appendix B.2, Table B.2: broader-augmentation-set numbers (Sobel, equalize/solarize, motion blur) — linear-eval +0.7/+0.2/+0.3 for 1×/2×/4×; fine-tuned 100%-label numbers 80.4/95.4 vs. from-scratch 78.4/94.2.
- Appendix B.5, Table B.4: fine-tuning protocol (Nesterov momentum, batch 4096, momentum 0.9, LR $0.8=0.05\times\text{BatchSize}/256$, no warmup, no regularization, 60/30 epochs for 1%/10% labels, inference resize 256 + center-crop 224); top-1 semi-supervised numbers.
- Appendix B.9, Fig. B.7–B.8: CIFAR-10 confirmation experiments; "optimal temperature in {0.1, 0.5, 1.0} is 0.5" when trained to convergence; "performance with $\tau=0.1$ improves as batch size increases" (marked `?` in Numerical sensitivity above as CIFAR-10-specific, not necessarily the ImageNet default).
