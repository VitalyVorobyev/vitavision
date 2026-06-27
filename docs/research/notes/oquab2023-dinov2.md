---
paper_id: oquab2023-dinov2
title: "DINOv2: Learning Robust Visual Features without Supervision"
authors: [Maxime Oquab, Timothée Darcet, Théo Moutakanni, et al. (Meta AI Research)]
year: 2023
url: https://arxiv.org/abs/2304.07193
created: 2026-06-27
relevant_atlas_pages: [vit, mae, attention-mechanism, feature-descriptors]
---

# Setting

**Problem class**: Self-supervised pretraining of a universal visual backbone — a frozen encoder whose features are useful across image-level tasks (classification, retrieval) and dense pixel-level tasks (segmentation, monocular depth estimation) without any task-specific finetuning.

**Inputs**: Arbitrary RGB images. No annotations, no text captions, no human supervision.

**Outputs**: A patch-level and CLS-token feature map from a frozen Vision Transformer (ViT). The CLS token encodes holistic image semantics; patch tokens encode local, spatially-grounded information.

**Precondition**: The backbone is used frozen. A simple linear head trained on top is sufficient for most downstream tasks. Finetuning is supported but optional.

# Core idea

DINOv2 combines two discriminative self-supervised objectives — an image-level DINO loss and a patch-level iBOT (masked image modeling) loss — with a KoLeo entropy regularizer, all applied in a student-teacher framework with exponential moving average (EMA) teacher.

**Image-level loss (DINO)**: Both student and teacher ViTs process different crops of the same image. The CLS token from each is fed to a separate MLP projection head ("DINO head") producing prototype scores. The loss is a cross-entropy between teacher and student softmax outputs:

$$L_\text{DINO} = -\sum p_t \log p_s$$

where $p_t$ is the teacher output (softmax + Sinkhorn-Knopp centering) and $p_s$ is the student output (softmax). The teacher weights are an EMA of student weights (momentum cosine schedule from 0.994 to 1.0).

**Patch-level loss (iBOT)**: Some input patches are randomly masked for the student but not for the teacher. A separate MLP "iBOT head" processes the student mask tokens and the corresponding teacher patch tokens. The same softmax/SK-centering recipe applies:

$$L_\text{iBOT} = -\sum_i p_t^i \log p_s^i$$

where $i$ indexes masked patch positions. At scale the DINO and iBOT heads are kept separate (untied); the original iBOT paper shared them but the authors found untying improves stability at large scale.

**KoLeo regularizer**: Encourages uniform distribution of features within a batch by maximising the minimum pairwise distance (Kozachenko-Leonenko entropy estimator):

$$L_\text{koleo} = -\frac{1}{n}\sum_{i=1}^n \log(d_{n,i}), \quad d_{n,i} = \min_{j \neq i} \|x_i - x_j\|$$

applied on $\ell_2$-normalised CLS tokens, weighted 0.1.

**Sinkhorn-Knopp centering**: Replaces the moving-average centering of the original DINO teacher with three iterations of the Sinkhorn-Knopp batch-normalisation from SwAV, applied to the teacher branch only. The student still uses softmax.

**Total loss**: $L = L_\text{DINO} + L_\text{iBOT} + 0.1 \cdot L_\text{koleo}$.

Smaller models (ViT-S, ViT-B, ViT-L distilled) are trained by distillation from the frozen ViT-g teacher rather than from scratch; the same training loop is used but with no masking/stochastic depth and iBOT loss on both global crops.

# Assumptions

1. **Curated, diverse data is necessary.** Uncurated web data trained the same number of iterations produces notably worse features, especially for fine-grained and out-of-domain tasks (Table 2).
2. **Discriminative SSL learns dense features.** The iBOT patch-level loss — not the DINO image-level loss — is the critical ingredient for dense downstream tasks (segmentation, depth) as shown in Table 3b.
3. **Frozen features are general-purpose.** The claim rests on no finetuning of the backbone at evaluation time. The model has not been validated for tasks that require full end-to-end training from different initializations.
4. **Patch size 14 and ViT architecture.** All results use patch size 14, chosen for compute efficiency (embedding dimension per head = 64 or multiples of 64). Tasks needing very fine spatial resolution may require further adaptation.
5. **(Soft) No text required.** Features are learned purely from images. This makes them richer than CLIP-style features at pixel-level tasks but eliminates zero-shot text-based inference.

# Failure regime

- **Domain bias**: Training data (LVD-142M) is curated from largely Western internet sources. Fairness evaluation shows a 25.7% gap between Africa and Europe on Dollar Street; performance on low-income households is ~23% lower than high-income (Table 12). Features are biased toward well-represented visual domains.
- **Temporal / motion reasoning**: Video evaluation on Something-Something v2 (which requires temporal reasoning) shows only 38.3% accuracy with frozen features for ViT-g, compared to 90%+ on UCF-101/K400, suggesting that frozen spatial features transfer poorly to temporal tasks.
- **Very high-resolution dense tasks**: Segmentation with a simple linear head is limited by the native patch-level resolution. The +ms eval (res 640, 4-layer concatenation) recovers much of the gap but still falls short of SOTA pipelines with full finetuning.
- **MAE features after finetuning are competitive**: MAE frozen features are poor (kNN 49.4%), but after supervised finetuning MAE closes the gap substantially. DINOv2's advantage is specifically about frozen, general-purpose features.

# Numerical sensitivity

- **Resolution adaptation matters for dense tasks**: Training at 518×518 for 10k extra iterations (starting from 224-trained weights) yields performance nearly identical to training at high resolution from scratch (Fig. 6), at ~1/3 the compute cost. Skipping this step degrades segmentation and depth mIoU noticeably.
- **KoLeo weight = 0.1**: Applied only to CLS tokens from the first global crop, computed per-GPU without cross-GPU communication. Primarily improves retrieval tasks (>8% mAP on Oxford-M, Table 3a).
- **Sinkhorn-Knopp 3 iterations**: More iterations did not show improvement; ablation runs with moving-average centering (original DINO) gave same kNN/linear numbers at the ablation scale (Table 1), but SK stabilizes large-scale training.
- **Stochastic depth rate = 0.4** for ViT-L and ViT-g from-scratch training. This is high (standard ViT-L uses 0.1-0.2); combined with LayerScale (initial value 1e-5) it prevents NaN losses at scale, at the cost of ~1% linear probe degradation versus no stochastic depth (Table 1).
- **Teacher momentum schedule** from 0.994 → 1.0 cosine over 625k iterations. Low initial momentum (0.994) allows rapid teacher adaptation early in training; raising toward 1.0 stabilizes later.
- **Batch size 3072** for from-scratch training on 128k-prototype heads (DINO + iBOT). Distilled models use batch size 2048.
- **float16 precision** for backbone; DINO/iBOT MLP head gradients reduced in float32 to avoid training instabilities.

# Applicability

- **Use when**: You need a frozen backbone that works across image-level classification, fine-grained retrieval, semantic segmentation, and monocular depth estimation without task-specific pretraining. Particularly valuable when labeled data is scarce or unavailable, or when you need one encoder for multiple disparate tasks.
- **Don't use when**: (a) You need zero-shot text-image matching (use CLIP/OpenCLIP); (b) your primary task requires dense features at very fine resolution (say, sub-pixel); (c) you need temporal/motion features for video tasks where temporal reasoning is central.
- **Compared against**: MAE (he2021-mae) — worse frozen features but competitive after finetuning; original DINO (Caron et al. 2021, trained on INet-1k) — significantly weaker at all tasks; OpenCLIP ViT-G/14 (weakly-supervised with text) — DINOv2-g matches or exceeds on most tasks including dense prediction while OpenCLIP excels on text-aligned zero-shot tasks.

# Connections

- Builds on: [dosovitskiy2020-vit, he2021-mae] — ViT architecture (dosovitskiy2020-vit); contrasts with masked reconstruction approach (he2021-mae); the core losses derive from DINO (Caron et al. 2021) and iBOT (Zhou et al. 2022a), which are not yet in the Atlas index.
- Enables (downstream backbone users): yang2024-depth-anything, yang2024-depth-anything-v2, lin2025-depth-anything-3, wang2025-vggt (note: these slugs are reasoning inferences, not yet validated against on-disk Atlas pages — verify before adding `feeds_into` edges)

# Atlas update plan

## NEW: dinov2
Type: model
Domain: features
arch_family: vit
Primary source: this paper

**Motivation**: Existing SSL backbones (original DINO, MAE) produce either image-level or reconstruction-oriented features that either require finetuning or don't transfer well to dense tasks. The goal is a single frozen encoder competitive with weakly-supervised (text-guided) models across the full range of CV tasks without any annotation.

**Architecture**: ViT backbone with patch size 14, four release sizes:
- ViT-S/14: embed_dim=384, 6 heads, 12 blocks, MLP FFN (distilled)
- ViT-B/14: embed_dim=768, 12 heads, 18 blocks, MLP FFN (distilled)
- ViT-L/14: embed_dim=1024, 16 heads, 24 blocks, SwiGLU FFN (from scratch) / MLP (distilled)
- ViT-g/14: embed_dim=1536, 24 heads, 40 blocks, SwiGLU FFN (from scratch) — **1.1B parameters**
Two separate MLP projection heads: one for DINO (image-level) and one for iBOT (patch-level), 128k prototypes each. No register tokens (those appear in a follow-up paper by Darcet et al.).

**Training**: LVD-142M curated dataset; combined DINO + iBOT + KoLeo loss; Sinkhorn-Knopp centering (3 iterations) on teacher; EMA teacher with cosine momentum schedule 0.994→1.0; AdamW, 625k iterations, batch size 3072 (from-scratch) / 2048 (distilled); high-resolution adaptation phase at 518×518 for 10k iterations. S/B/L models distilled from frozen ViT-g teacher. ~2× faster and ~3× less memory than prior iBOT baseline thanks to FlashAttention, sequence packing, and efficient stochastic depth.

**Key results (frozen backbone)**:
- ImageNet-1k linear: ViT-g/14 86.5%; kNN 83.5% (+4.2% over prior SSL SOTA, on par with EVA-CLIP/OpenCLIP-G)
- ADE-20k segmentation (linear): ViT-g/14 49.0 mIoU; (+ms) 53.0 mIoU ≈ finetuned MAE with Upernet (53.6)
- NYUd depth RMSE (DPT decoder, frozen): ViT-g/14 0.279 (matches BinsFormer SOTA of 0.330 at the time)
- Oxford-Hard retrieval: ViT-g/14 52.3 mAP (+34% vs OpenCLIP-G)
- iNaturalist 2021 classification: ViT-g/14 85.7% (+9.7% vs OpenCLIP-G)

**Implementations**: Official repo `facebookresearch/dinov2` (Apache-2.0 license — confirmed in §5 of paper); PyTorch 2.0; models and training code publicly released.

**Assessment**: DINOv2 is the frozen backbone that powers Depth Anything (yang2024-depth-anything), Depth Anything V2, and VGGT as a frozen feature extractor. Its discriminative SSL with curated large-scale data closes the gap with text-supervised models on dense tasks while requiring no labels. Key limitations: Western-dominant training data bias (25.7% Africa vs Europe gap on Dollar Street), no temporal reasoning in frozen form, no built-in text-image alignment.

**References**: arXiv 2304.07193; published TMLR January 2024; OpenReview https://openreview.net/forum?id=a68SUt6zFt.

# Provenance

- **§1 / Abstract**: "gathered a small but diverse corpus of 142M images" (LVD-142M dataset size)
- **§1**: "around 2× faster and require 3× less memory than similar discriminative self-supervised methods"
- **§3**: 1.2B unique images from web crawl before deduplication; after deduplication 1.1B images; after relative deduplication 744M (App. A.3)
- **§4**: $L_\text{DINO} = -\sum p_t \log p_s$ (image-level cross-entropy between student and EMA teacher)
- **§4**: $L_\text{iBOT} = -\sum_i p_t^i \log p_s^i$ (patch-level masked image modeling)
- **§4**: $L_\text{koleo} = -(1/n)\sum_{i=1}^n \log(d_{n,i})$ with $d_{n,i} = \min_{j\neq i}\|x_i - x_j\|$ (KoLeo regularizer from Sablayrolles et al. 2019)
- **§4**: "3 iterations" for Sinkhorn-Knopp; student uses plain softmax
- **§4**: "untying head weights" finding — at scale, separate heads outperform shared
- **§4 / App. B.2**: 518×518 resolution for final 10k training iterations
- **§5**: "ViT-g backbone counts 1.1B parameters"; embedding dimension 1536 with 24 heads (64 dim/head) — custom architecture vs Zhai et al. (2022) ViT-g which uses 1408 dim / 16 heads (88 dim/head)
- **§5**: Apache 2.0 license; footnote 1: `https://github.com/facebookresearch/dinov2`
- **§5**: AdamW optimizer; 4 model replicas (student, teacher, first/second moments); FSDP sharding; backbone gradients in float16, DINO heads in float32
- **§6.1 / Table 1**: Stochastic depth rate 0.4; KoLeo +2.3% kNN; ablation table showing cumulative improvements from iBOT baseline (72.9 kNN) to DINOv2 (82.0 kNN) on ViT-L
- **§6.2 / Table 2**: LVD-142M vs uncurated data ablation; uncurated gives 83.3% INet-1k (vs 85.8% for LVD-142M)
- **§6.4 / Table 3b**: iBOT patch-level loss "critical for dense prediction tasks, leading to almost 3% improvement" (ADE-20k mIoU 44.2 → 47.1)
- **§7.1 / Table 4**: ImageNet-1k linear / kNN numbers; ViT-g/14 86.5 linear, 83.5 kNN; EVA-CLIP 86.4/83.5
- **§7.1 / Table 5**: Finetuning improves ViT-g/14 by 2.0% at res 224 (86.5 → 88.5); 2.2% at res 448 (86.7 → 88.9)
- **§7.4 / Table 10**: Segmentation ADE-20k ViT-g/14 linear=49.0, +ms=53.0; SOTA (Wang et al. 2022) = 62.9
- **§7.4 / Table 11**: Depth NYUd RMSE: ViT-g/14 lin.1=0.344, lin.4=0.298, DPT=0.279; SOTA reference 0.330
- **§8.1 / Table 12**: Dollar Street fairness: Africa 74.0% vs Europe 89.7% (−25.7%); low income 67.4% vs high income 90.5% (−23.1%)
- **§9 / Table 14**: DINOv2-g training: 22,016 A100-hours, 9.7 MWh, 3.7 tCO2 eq
- **App. B.1 / Table 16**: Training hyperparameters — 625k iterations, AdamW, weight decay cosine 0.04→0.2, LR warmup 100k iterations, teacher momentum cosine 0.994→1.0, float16 precision
- **App. B.1 / Table 17**: Architecture details: ViT-S/14 (384, 6 heads, 12 blocks, MLP); ViT-B/14 (768, 12 heads, 18 blocks, MLP); ViT-L/14 (1024, 16 heads, 24 blocks, SwiGLU for scratch / MLP for distill); ViT-g/14 (1536, 24 heads, 40 blocks, SwiGLU)
- **App. A.4**: k=4 nearest neighbours for sample-based retrieval (ImageNet-22k / GL); k=32 for the main LVD-142M ImageNet-1k retrieval; cluster-based retrieval uses 100,000 clusters
- **App. A.3**: deduplication thresholds: self-dedup cosine >0.6 (1.3B → 1.1B); relative dedup cosine >0.45 (1.1B → 744M)

**Uncertain / not confirmed** (?):
- ViT-S/B/L parameter counts in millions (~22M/~86M/~307M) are standard estimates; the paper only explicitly states "1.1B" for ViT-g (§5). The distilled ViT-B has 18 blocks (Table 17) — not the standard 12 — so its parameter count is non-standard and should not be assumed.
- Downstream slugs (yang2024-depth-anything, wang2025-vggt etc.) inferred from research context, not confirmed in this paper. The paper discusses future work of plugging features into a language-enabled system but does not name these later projects.
