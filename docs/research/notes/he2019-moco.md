---
paper_id: he2019-moco
title: "Momentum Contrast for Unsupervised Visual Representation Learning"
authors: ["K. He", "H. Fan", "Y. Wu", "S. Xie", "R. Girshick"]
year: 2019
url: https://arxiv.org/pdf/1911.05722
created: 2026-08-23
relevant_atlas_pages:
  - mae
  - dinov2
  - vit
---

# Setting

Unsupervised (self-supervised) pretraining of a convolutional image encoder on unlabeled RGB images, using contrastive learning framed as dictionary look-up. Pretraining input: a batch of raw images; two independent random "views" (augmentations) of each image are drawn to form query/key pairs. Pretraining output: an encoder $f_q$ (and a momentum-averaged twin $f_k$) that maps an image to a 128-dimensional, L2-normalized embedding. There is no label and no reconstruction target — the objective is instance discrimination: a query embedding should be close to the embedding of another view of the same image and far from embeddings of all other images.

Downstream use follows two protocols evaluated in the paper: (1) linear classification on frozen features (train a linear classifier on top of a frozen pretrained ResNet, evaluate top-1 accuracy on ImageNet val); (2) fine-tuning transfer to detection/segmentation/keypoint/dense-pose tasks on PASCAL VOC, COCO, LVIS, Cityscapes, and iNaturalist, initializing task networks from the MoCo-pretrained backbone (§4, §4.2).

# Core idea

Contrastive learning is reframed as training an encoder for a dictionary look-up task: an encoded query $q$ should match its single positive key $k_+$ and be dissimilar to all other (negative) keys in a dictionary $\{k_0, k_1, k_2, \dots\}$ (§3.1). The paper's central claim is that a good dictionary for this task should be simultaneously **large** (better samples the underlying continuous high-dimensional visual space) and **consistent** (all keys represented by the same or a similar encoder, so query-key comparisons are meaningful) (§1, abstract). Existing mechanisms trade off one property for the other:

- **End-to-end** (Figure 2a): the dictionary is the current mini-batch; both $f_q$ and $f_k$ are updated by back-propagation every step, so keys are consistently encoded, but dictionary size is coupled to mini-batch size and bounded by GPU memory; large-batch optimization is itself an open, hard problem (§3.2, "Relations to previous mechanisms").
- **Memory bank** (Figure 2b): a table holding a representation for every sample in the dataset; each mini-batch's dictionary is randomly sampled from the bank with no back-propagation, so the dictionary can be arbitrarily large, but a sampled key may have been last updated many epochs ago by a very different version of the encoder — the bank's own momentum update (proposed in [61]) is applied to per-sample representations, not to an encoder, so it does not fix this inconsistency, and per-sample memory banks do not scale to billion-image datasets (§3.2).

MoCo (Figure 2c) decouples dictionary size from batch size using a FIFO **queue** of encoded keys, and preserves consistency by encoding keys with a **momentum-updated** copy of the query encoder rather than by back-propagation or by sampling a stale bank.

**InfoNCE loss.** With similarity measured by dot product, MoCo optimizes InfoNCE (§3.1, Eqn. 1):

$$\mathcal{L}_q = -\log \frac{\exp(q \cdot k_+ / \tau)}{\sum_{i=0}^{K} \exp(q \cdot k_i / \tau)}$$

where $\tau$ is a temperature hyper-parameter (set to $\tau = 0.07$, following [61]) and the sum ranges over one positive key and $K$ negative keys. This is the log loss of a $(K{+}1)$-way softmax classifier trying to classify $q$ as $k_+$.

**Momentum update.** Because gradients cannot practically be back-propagated through every key sitting in the queue, the key encoder's parameters $\theta_k$ are not learned by SGD at all; they are a moving average of the query encoder's parameters $\theta_q$ (§3.2, Eqn. 2):

$$\theta_k \leftarrow m\,\theta_k + (1-m)\,\theta_q$$

with $m \in [0,1)$ a momentum coefficient and the default $m = 0.999$. Only $\theta_q$ receives gradients. A naïve alternative — copying $\theta_q$ into $\theta_k$ every step (equivalent to $m=0$) — was found to yield poor results: the training loss oscillates and fails to converge (§3.2, §4.1 ablation), because a rapidly changing key encoder makes the keys already enqueued inconsistent with newly enqueued ones.

**Queue mechanics.** The dictionary is maintained as a queue of encoded keys: the current mini-batch's keys are enqueued, the oldest mini-batch in the queue is dequeued (§3.2, "Dictionary as a queue"). This decouples the dictionary size $K$ from the mini-batch size $N$ — $K$ can be set independently and much larger than $N$. The default main-experiment queue size is $K = 65536$ (§4.1, "Comparison with previous results"). Removing the oldest mini-batch is explicitly motivated as beneficial, not just cheap: those keys are the most outdated, hence least consistent with the current query encoder.

**Shuffling BN.** Batch Normalization inside $f_q$/$f_k$ was found to leak information across samples within a mini-batch (intra-batch communication), letting the model "cheat" the instance-discrimination pretext task by finding a low-loss shortcut instead of learning good representations — the same effect reported (and avoided by dropping BN) in [35] (§3.3, "Shuffling BN"). MoCo's fix: train with multiple GPUs, compute BN independently per GPU as usual, but for the key encoder $f_k$ shuffle the sample order of the mini-batch before distributing it across GPUs and un-shuffle after encoding; the query encoder's $f_q$ sample order is left unaltered. This forces the BN statistics used for a query and its positive key to come from two different subsets, closing the leak. It is used for MoCo and for the end-to-end ablation baseline; the memory-bank baseline does not need it since its positive keys already come from different past mini-batches.

# Assumptions

1. (Hard) Positive pairs are defined as two independently augmented views of the *same* image (instance discrimination, following [61], with the two-view formulation following [63, 2]); the method does not use any semantic label (§3.3).
2. (Hard) The key encoder is never updated by back-propagation — only by the EMA rule (Eqn. 2). Removing momentum entirely ($m=0$) causes training to fail to converge (§4.1 ablation).
3. (Soft) A relatively large momentum ($m \in [0.99, 0.9999]$) is required for the queue mechanism to pay off; the paper's own ablation shows accuracy is sensitive to $m$ within this range (§4.1).
4. (Hard) Shuffling BN is required whenever BN is used inside the encoders and the dictionary mechanism reuses keys across steps (queue or memory bank) with in-mini-batch positives; without it, BN leaks cross-sample information and the model "cheats" the pretext task (§3.3).
5. (Soft) Augmentation set follows [61]: 224×224 random-resized crop, random color jitter, random horizontal flip, random grayscale conversion (§3.3, "Technical details"). The paper does not ablate this set itself — it is inherited unchanged from prior work; a follow-up ("MoCo v2" [8], mentioned but not detailed in this paper) reports further gains from changing augmentation and adding a projection head (§4.2 closing remarks) — flagged `?` here since MoCo v2's specifics are outside this paper's own experiments.
6. (Soft) The encoder architecture is unconstrained — any convolutional network works (§3.3) — but all main results use a standard ResNet-50 (and its 2×/4×-wide variants) with no patchified inputs or customized receptive fields, in contrast to some competing contrastive methods (§4.1, closing paragraph).

# Failure regime

- **Zero or near-zero momentum.** At $m=0$ (equivalent to naïvely copying $\theta_q \to \theta_k$ every step) the training loss oscillates and fails to converge — reported as a hard "fail," not just a lower accuracy (§4.1 ablation table).
- **Small but nonzero momentum.** At $m=0.9$, ResNet-50/K=4096 linear-probe accuracy drops to 55.2%, well below the 57.8–59.0% band achieved for $m \in \{0.99, 0.999\}$ (§4.1 ablation table) — a slowly evolving key encoder is necessary, not merely helpful.
- **Memory-bank mechanism under otherwise-identical settings.** With the same pretext task and same InfoNCE loss, the memory-bank mechanism reaches 58.0% linear-probe top-1 vs. MoCo's 60.6% at $K=65536$ — 2.6 points worse — attributed to keys in the bank coming from many different (stale) encoder states across a whole past epoch (§4.1, "Ablation: contrastive loss mechanisms").
- **End-to-end mechanism at large $K$.** End-to-end performs similarly to MoCo only when $K$ is small; its dictionary size is capped by the largest mini-batch a machine can hold (the paper reports 1024 as the largest batch 8×32GB Volta GPUs could afford), and further scaling requires large-batch optimization tricks (linear LR scaling), without which accuracy drops by ~2% at batch 1024 (§4.1, Figure 3 discussion).
- **BN without shuffling.** Standard (non-shuffled) BN combined with in-mini-batch keys lets the model exploit intra-batch statistics as a shortcut, degrading representation quality — described as the model "cheating" the pretext task (§3.3).
- **Task-specific transfer weaknesses.** MoCo does not uniformly beat supervised ImageNet pretraining: on VOC semantic segmentation MoCo underperforms the supervised counterpart by at least 0.8 mIoU point, and on Cityscapes instance segmentation results are roughly on par rather than better (§4.2.3, "Summary").
- **Diminishing returns from more pretraining data.** Scaling unsupervised pretraining data from IN-1M (~1.28M images) to IG-1B (~1B Instagram images) gives a "consistently noticeable but relatively small" improvement across downstream tasks, suggesting the larger-scale data is not fully exploited by the simple instance-discrimination pretext task (§5, Discussion).

# Numerical sensitivity

**Momentum ablation (ResNet-50, $K=4096$, ImageNet-1M linear-probe top-1, §4.1):**

| $m$ | 0 | 0.9 | 0.99 | 0.999 | 0.9999 |
|---|---|---|---|---|---|
| top-1 (%) | fail | 55.2 | 57.8 | **59.0** | 58.9 |

**Dictionary-size trend (Figure 3):** all three mechanisms (end-to-end, memory bank, MoCo) improve as $K$ grows across $\{256, 512, 1024, 4096, 16384, 65536\}$; MoCo reaches 60.4–60.6% at the largest $K$ values plotted, memory bank plateaus around 58.0%.

**Main linear-classification result (Table 1, ResNet-50, $K=65536$, $m=0.999$, 200 epochs, IN-1M pretraining):** **60.6%** top-1, reported as better than all prior contrastive methods of comparable parameter count (~24M): InstDisc 54.0%, LocalAgg 58.8%. Wider MoCo variants: RX50 63.9%, R50w2× 65.4%, R50w4× 68.6%.

**Training hyper-parameters (§3.3, "Training"):** SGD optimizer, weight decay 0.0001, SGD momentum 0.9; IN-1M mini-batch $N=256$ on 8 GPUs, initial learning rate 0.03, 200 epochs with LR ×0.1 at epochs 120 and 160, ~53 hours to train ResNet-50. (IG-1B run: batch 1024 on 64 GPUs, LR 0.12 exponentially decayed ×0.9 every 62.5k iterations, 1.25M iterations ≈1.4 epochs, ~6 days — noted for scale context, not used in the main linear-probe number above.)

**PASCAL VOC detection, trainval07+12 → test2007, R50-C4 backbone (Table 2b):** random init AP50/AP/AP75 = 60.2/33.8/33.1; supervised IN-1M = 81.3/53.5/58.8; MoCo IN-1M = 81.5 (+0.2)/55.9 (+2.4)/62.6 (+3.8); MoCo IG-1B = 82.2 (+0.9)/57.2 (+3.7)/63.7 (+4.9).

**COCO detection+segmentation, Mask R-CNN R50-FPN, 2× schedule (Table 5b):** supervised IN-1M $AP^{bb}$ = 40.6, $AP^{mk}$ = 36.8; MoCo IN-1M = 40.8 (+0.2) / 36.9 (+0.1); MoCo IG-1B = 41.1 (+0.5) / 37.4 (+0.6).

**Contrastive-loss-mechanism ablation on VOC detection (Table 3, R50-C4, same pretext task, all implemented by the authors):** end-to-end AP50/AP/AP75 = 80.4/54.6/60.3; memory bank = 80.6/54.9/60.6; MoCo = 81.5/55.9/62.6 — MoCo strictly best on every metric under an otherwise-controlled comparison.

**"7 detection/segmentation tasks" claim (§5, footnote 5):** object detection on VOC and COCO, instance segmentation on COCO and LVIS, keypoint detection on COCO, dense pose estimation on COCO, and semantic segmentation on Cityscapes — MoCo (best pretraining source among IN-1M/IN-14M/YFCC-100M/IG-1B per task) surpasses its ImageNet-supervised-pretraining counterpart in all seven; largest single-metric gain reported is COCO dense pose $AP^{dp}_{75}$, +3.7 points (MoCo IN-1M) up to +9.0 points ($AP_{75}$ on VOC, MoCo IG-1B, Table 4).

# Applicability

- Use when: pretraining a convolutional encoder (ResNet family demonstrated) on a large pool of unlabeled images, where the practical constraint is limited per-step batch size (GPU memory) rather than total training compute — the queue buys a large effective dictionary without a large batch.
- Use when: the downstream task is dense prediction (detection, segmentation, keypoints, dense pose) rather than only linear-probe classification; the paper's strongest evidence is fine-tuning transfer, not the linear-classification number alone.
- Don't use when: an end-to-end or projection-head contrastive recipe with a very large batch and heavy TPU/GPU parallelism is already available and batch-size is not a binding constraint — the paper itself shows end-to-end matches MoCo at small $K$ (§4.1, Figure 3 discussion); the queue's advantage is specifically at scale.
- Compared against (within this paper): end-to-end contrastive learning (Figure 2a), memory-bank contrastive learning (Figure 2b/[61]) — both implemented and ablated head-to-head by the authors under an identical pretext task and loss (§4.1, Table 3).

# Connections

- Builds on: instance discrimination pretext task and 128-D L2-normalized output / $\tau=0.07$ temperature convention from Wu et al. memory-bank NCE ([61], cited throughout §3); InfoNCE loss formulation from Oord et al. CPC ([46]); the general contrastive-loss framing from Hadsell/Chopra-style metric learning ([29]).
- Enables: this paper's own footnote states "MoCo v2" [8] extends the preliminary version of this manuscript with augmentation and projection-head changes, reaching 71.1% vs. this paper's 60.6% (§4.2 closing remarks) — noted here only as a forward pointer, since MoCo v2's mechanism is not detailed or ablated in this paper.
- SimCLR (Chen et al. 2020, `chen2020-simclr` — not yet ingested; pointer only, no claims below are sourced from that paper): commonly characterized as an in-batch-negatives contrastive method without a queue or momentum key encoder, instead relying on a large training batch to supply enough negatives `?`. On the survey concept's decision table this sits at the opposite end of the "how do you get enough negatives" axis from MoCo: MoCo decouples negative count from batch size via the queue; SimCLR (as commonly described) does not.
- BYOL (Grill et al. 2020, `grill2020-byol` — not yet ingested; pointer only, no claims below are sourced from that paper): commonly characterized as dropping explicit negative pairs entirely, training a predictor against a momentum-averaged "target" encoder `?`. It reuses MoCo's core mechanism — a momentum-updated encoder producing consistent targets — but removes the InfoNCE contrastive term altogether, which is the axis a future survey concept page should contrast against MoCo's queue-based negatives.
- Refutes / supersedes: within its own ablations, this paper's memory-bank re-implementation (58.0% linear-probe) is presented as an improved version of [61]'s original memory bank, and is itself outperformed by MoCo (60.6%) under identical pretext-task and loss settings (§4.1, footnote 2 and Table 1).

# Atlas update plan

## NEW: self-supervised-learning
Type: concept
Category: representation learning / survey
Primary source: this paper, alongside `chen2020-simclr` and `grill2020-byol` (both required before drafting; per repo policy this survey concept page needs ≥3 surveyed methods each with a research note before it can be authored)

No typed relations — concept page (approved plan). Survey concept spans SimCLR/MoCo/BYOL/DINO.

Decision-table row this method contributes:
- **Paradigm:** contrastive learning with a momentum-updated key encoder and a FIFO dictionary queue (not in-batch negatives, not negative-free).
- **Negative source:** queue of $K=65536$ past-mini-batch keys, decoupled from training batch size $N=256$.
- **Consistency mechanism:** EMA of query-encoder weights, $\theta_k \leftarrow m\theta_k + (1-m)\theta_q$, $m=0.999$ default (Eqn. 2).
- **Loss:** InfoNCE, $\tau=0.07$ (Eqn. 1).
- **Strengths for the decision table:** decouples dictionary/negative-set size from GPU batch size, so a large effective dictionary is reachable on modest hardware (8 GPUs, batch 256, IN-1M pretraining); demonstrated feasible at billion-image scale (IG-1B) without a per-sample memory bank.
- **Weaknesses for the decision table:** needs the shuffling-BN fix to avoid intra-batch information leakage; introduces an extra hyper-parameter ($m$) that must sit in a fairly narrow effective range (0.99–0.9999 per the ablation) or training degrades or fails outright.
- **Backbone used:** standard ResNet-50 (and 2×/4× width variants), no patchified inputs or custom receptive fields.

## UPDATE: mae
Section: Connections or Remarks
Bullets to add:
- Contrastive queue/momentum pretraining (MoCo, he2019-moco) and masked-image-modeling pretraining (MAE) are two distinct SSL paradigms compared in MAE's own paper (see `he2021-mae.md`, Numerical sensitivity / Applicability sections) — MoCo's 60.6% ResNet-50 linear-probe figure is this paper's own headline number and should not be conflated with MoCo v3's ViT linear-probe figures cited in the MAE note.

## UPDATE: vit / dinov2
Section: Remarks or Relations
Bullets to add:
- Both post-date and build conceptually on the "momentum-updated encoder for consistent targets" mechanism MoCo introduces (Eqn. 2); DINOv2/DINO-style self-distillation and MoCo-style contrastive queues are alternative ways of keeping a moving target consistent, worth contrasting explicitly once the `self-supervised-learning` survey concept page exists. No specific DINOv2 numbers are asserted here — see `oquab2023-dinov2.md` / `caron2021-dino.md` for those.

# Provenance

- Abstract: "From a perspective on contrastive learning [29] as dictionary look-up, we build a dynamic dictionary with a queue and a moving-averaged encoder." "MoCo can outperform its supervised pre-training counterpart in 7 detection/segmentation tasks."
- §3.1 (Contrastive Learning as Dictionary Look-up): dictionary look-up framing; InfoNCE loss, Eqn. (1): $\mathcal{L}_q = -\log \frac{\exp(q\cdot k_+/\tau)}{\sum_{i=0}^{K}\exp(q\cdot k_i/\tau)}$; "$\tau$ is a temperature hyper-parameter per [61]."
- §3.2 (Momentum Contrast, "Dictionary as a queue"): queue enqueue/dequeue mechanics, decoupling dictionary size from mini-batch size, motivation for discarding the oldest mini-batch.
- §3.2 ("Momentum update"): Eqn. (2) $\theta_k \leftarrow m\theta_k + (1-m)\theta_q$; "a relatively large momentum (e.g., $m=0.999$, our default) works much better than a smaller value (e.g., $m=0.9$)"; naïve copy ($m=0$ equivalent) "yields poor results."
- §3.2 ("Relations to previous mechanisms," Figure 2): end-to-end mechanism limitations (GPU-memory-bounded dictionary size, large-mini-batch optimization difficulty, citing [25]); memory-bank mechanism description and its own momentum update being "on the representations of the same sample, not the encoder," "irrelevant to our method," and memory-inefficiency at billion-scale.
- §3.3 (Pretext Task, "Technical details"): ResNet encoder, 128-D fixed output after global average pooling, L2-normalized; $\tau = 0.07$; augmentation set (224×224 random-resized crop, color jitter, horizontal flip, grayscale conversion) "follows [61]."
- §3.3 ("Shuffling BN"): BN leaking intra-batch information causing the model to "cheat" the pretext task, citing the same effect avoided in [35]; the shuffle/un-shuffle procedure for $f_k$ across GPUs; query encoder order left unaltered; used for MoCo and the end-to-end ablation, not needed for the memory-bank ablation.
- §4 ("Training"): SGD, weight decay 0.0001, SGD momentum 0.9; IN-1M mini-batch $N=256$ on 8 GPUs, initial LR 0.03, 200 epochs, LR ×0.1 at 120/160 epochs, ~53h to train ResNet-50; IG-1B batch 1024 on 64 GPUs, LR 0.12 exponentially decayed ×0.9 every 62.5k iterations, 1.25M iterations (~1.4 epochs), ~6 days.
- §4.1 ("Ablation: contrastive loss mechanisms," Figure 3, footnote 2): memory-bank result "58.0%... 2.6% worse than MoCo"; "58.0% is with InfoNCE and K=65536."
- §4.1 ("Ablation: momentum"), ablation table: $m \in \{0, 0.9, 0.99, 0.999, 0.9999\}$ → accuracy $\{\text{fail}, 55.2, 57.8, 59.0, 58.9\}$ at $K=4096$.
- §4.1 ("Comparison with previous results," Table 1): "$K = 65536$ and $m = 0.999$"; "MoCo with R50 performs competitively and achieves 60.6% accuracy"; R50w4× 68.6%; RX50 63.9%; R50w2× 65.4%; competitor numbers InstDisc 54.0%, LocalAgg 58.8%.
- §4.1 (closing paragraph, "MoCo v2" footnote/remark): "MoCo v2" [8] "achieves 71.1% accuracy with R50 (up from 60.6%)" — cited as a forward pointer, not analyzed further here.
- §4.2, Table 2 (VOC detection, R50-dilated-C5 and R50-C4, trainval07+12→test2007): random init, supervised IN-1M, MoCo IN-1M, MoCo IG-1B rows with AP50/AP/AP75 and bracketed gaps as quoted in Numerical sensitivity above.
- §4.2, Table 3 (contrastive-mechanism ablation on VOC detection, R50-C4): end-to-end 80.4/54.6/60.3, memory bank 80.6/54.9/60.6, MoCo 81.5/55.9/62.6.
- §4.2.1, Table 4 (comparison with previous methods on VOC trainval2007, C4 backbone): "up to +5.2 AP and +9.0 AP75" gains; per-source rows (RelPos, Multi-task, Jigsaw, LocalAgg, MoCo IN-1M/IN-14M/YFCC-100M/IG-1B).
- §4.2.2 / Table 5 (COCO detection+segmentation, Mask R-CNN, FPN and C4 backbones, 1×/2× schedules): rows and bracketed gaps as quoted above (Table 5b).
- §4.2.3 ("More Downstream Tasks," Table 6, "Summary"): COCO keypoint detection, COCO dense pose (+3.7 $AP^{dp}_{75}$), LVIS v0.5 instance segmentation, Cityscapes instance segmentation ("on par"), semantic segmentation (Cityscapes +0.9, VOC "worse by at least 0.8 point"); footnote 5 enumerating the seven tasks MoCo surpasses supervised pretraining on.
- §5 (Discussion and Conclusion): "MoCo's improvement from IN-1M to IG-1B is consistently noticeable but relatively small, suggesting that the larger-scale data may not be fully exploited."
