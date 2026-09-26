---
title: "DINOv3"
date: 2026-08-23
summary: "A 6.7B-parameter self-supervised ViT trained on 1.7B curated images, with gram anchoring to stop dense-feature degradation at scale — one frozen backbone whose patch features match or beat specialized fine-tuned pipelines on detection, segmentation, and depth."
tags: ["deep-learning"]
domain: representation-learning
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "6.7B teacher; distilled ViT-S/S+/B/L/H+ (21M–0.84B) and ConvNeXt-T/S/B/L (29M–198M)"
prerequisites: [dinov2, knowledge-distillation]
failureModes: []
sources:
  primary: simeoni2025-dinov3
  references:
    - oquab2023-dinov2
    - caron2021-dino
implementations:
  - role: official
    repo: https://github.com/facebookresearch/dinov3
    commit: 6876159a11b4df116f30f667f8c9888617df0751
    framework: pytorch
    license: "DINOv3 License (bespoke, non-SPDX)"
    weights_license: "DINOv3 License"
---

# Motivation

Takes an arbitrary RGB image and produces CLS-token and patch-token features from a frozen encoder. No annotations, no captions, and no fine-tuning of the backbone at evaluation time — object detection and segmentation adapters are trained on top of a completely frozen encoder. The target is the same frozen-backbone thesis as [dinov2](/atlas/dinov2), pushed to a much larger model and corpus, and extended until a single self-supervised backbone matches or beats specialized fine-tuned pipelines and weakly-supervised (text-guided) encoders on dense tasks.

Scaling that recipe exposes a specific failure. Over a phase-1 training run, ImageNet-1k linear classification accuracy improves monotonically through 1M iterations, but linear segmentation on Pascal VOC peaks around 200k iterations and then declines, falling below its early level by 1M iterations for the 7B model. Cosine-similarity maps between a reference patch and all other patches are smooth and well-localized at 200k iterations and degrade substantially by 600k iterations, with increasing numbers of spatially distant, semantically irrelevant patches scoring high similarity to the reference. The CLS token's cosine similarity with patch outputs rises over training — patch features lose locality as the model over-indexes on image-level discrimination. This is distinct from the high-norm outlier patch artifact that register tokens address; patch norms stay stable throughout. The degradation appears in longer training runs with models above ViT-Large size (300M parameters), which reduces the usefulness of scaling the DINOv2 recipe directly. Gram anchoring is the mechanism introduced to repair it.

# Architecture

**Family & shape.** The flagship teacher is a custom ViT variant at 6.7B parameters. Its configuration relative to the DINOv2 ViT-g teacher:

| | DINOv2 ViT-g | DINOv3 ViT-7B |
|---|---|---|
| Parameters | 1.1B | 6.7B |
| Blocks | 40 | 40 |
| Embed dim | 1536 | 4096 |
| FFN hidden | 4096 | 8192 |
| Attention heads | 24 | 32 |
| Attention head dim | 64 | 128 |
| Patch size | 14 | 16 |
| Position embedding | learnable | axial RoPE |
| DINO prototypes | 128k | 256k |
| iBOT prototypes | 128k | 96k |

**Pretraining objective.** Phase 1 keeps the DINOv2 recipe: the image-level [dino](/atlas/dino) loss, the patch-level iBOT masked-modeling loss, and a KoLeo uniformity regularizer, with Sinkhorn-Knopp centering on the teacher branch.

$$
\mathcal{L}_{\mathrm{Pre}} = \mathcal{L}_{\mathrm{DINO}} + \mathcal{L}_{\mathrm{iBOT}} + 0.1 \cdot \mathcal{L}_{\mathrm{DKoleo}}
$$

Two changes accompany it. Sinkhorn-Knopp replaces DINO's original centering in both heads. A dedicated layer normalization is applied to backbone outputs before loss computation, worth +0.2 ImageNet-1k kNN accuracy late in training, +1 mIoU on ADE20k, and −0.02 RMSE on NYUv2.

**Position encoding.** Patch coordinates are assigned in a normalized $[-1,1]$ box, and a bias depending on relative patch position is applied inside multi-head attention. The box is randomly rescaled to $[-s, s]$ with $s \in [0.5, 2]$ at each training step — RoPE-box jittering — for robustness to changes in resolution, scale, and aspect ratio.

**Gram anchoring.** The centerpiece. A second training phase regularizes the pairwise-similarity structure of the student's patch features toward that of an earlier checkpoint whose dense properties are superior.

:::definition[Gram anchoring loss]
$X_S$ is the student's $P \times d$ matrix of $\ell_2$-normalized patch features for one image, $X_G$ the same matrix from the Gram teacher — an EMA-teacher snapshot taken from early training, before dense degradation sets in. The loss matches Gram matrices, not features.

$$
\mathcal{L}_{\mathrm{Gram}} = \left\| X_S \cdot X_S^\top - X_G \cdot X_G^\top \right\|_F^2
$$

Local features are free to move provided the structure of similarities remains the same. This is why the term can be applied late, after global features are fully formed, without destroying them. It is computed on global crops only.
:::

The refinement objective combines it with the phase-1 terms:

$$
\mathcal{L}_{\mathrm{Ref}} = w_D \mathcal{L}_{\mathrm{DINO}} + \mathcal{L}_{\mathrm{iBOT}} + w_{DK} \mathcal{L}_{\mathrm{DKoleo}} + w_{\mathrm{Gram}} \mathcal{L}_{\mathrm{Gram}}
$$

with $w_{\mathrm{Gram}} = 2$. Numeric values for $w_D$ and $w_{DK}$ are not stated in the paper text; they are referenced as living in the released config files. The phase starts only after the 1M-iteration phase-1 schedule, for efficiency — the mechanism can be applied earlier. The Gram teacher is refreshed every 10k steps, at which point it is reset to the current main EMA teacher, for a maximum of three updates, giving a refinement phase of roughly 30k iterations.

A high-resolution variant, $\mathcal{L}_{\mathrm{HRef}}$, feeds images to the Gram teacher at 2× the normal resolution and downsamples the resulting feature map 2× with bicubic interpolation before computing $X_G$. Ablation over the Gram-teacher choice, with ImageNet-1k linear accuracy, ADE20k mIoU, and NYU RMSE:

| Configuration | IN1k linear | ADE20k mIoU | NYU RMSE |
|---|---|---|---|
| Baseline (no Gram anchoring) | 88.2 | 50.3 | 0.307 |
| Gram teacher 200k, ×1 | 88.0 | 53.6 | 0.285 |
| Gram teacher 200k, ×2 | 88.0 | 55.7 | 0.281 |
| Gram teacher 100k, ×2 | 87.9 | 55.7 | 0.284 |
| Gram teacher 1M, ×2 | 88.1 | 54.9 | 0.290 |

The high-resolution teacher adds a further +2 mIoU on ADE20k over plain $\mathcal{L}_{\mathrm{Ref}}$. A Gram teacher drawn from 1M iterations is worse than one from 200k because its own patch-level consistency is inferior. Gram anchoring significantly influences the iBOT loss, causing it to decrease more rapidly, while leaving the DINO loss largely unaffected.

**Data.** LVD-1689M holds 1,689 million images, curated from an initial pool of approximately 17 billion images. Curation combines 5-level hierarchical k-means clustering — 200M, 8M, 800k, 100k, and 25k clusters from lowest to highest level — with retrieval-based curation and raw ImageNet-1k, ImageNet-22k, and Mapillary data. 10% of training batches are homogeneous ImageNet-1k-only batches; the rest mix the curated, retrieval, and raw components.

**Optimization.** Constant hyperparameters replace DINOv2's cosine schedules, motivated by the difficulty of assessing the interplay between model capacity and data complexity a priori: learning rate 0.0004 with a linear warmup over 100k iterations, weight decay 0.04, per-layer learning-rate decay factor 0.98, stochastic depth 0.4, EMA teacher momentum 0.999. Total batch size is 4096 images across 256 GPUs, with 2 global crops at 256px and 8 local crops at 112px per image, for a total sequence length of 3.7M tokens per batch.

**High-resolution adaptation.** A separate post-training step of 10k additional iterations, drawing global crop sizes from {512, 768} and local crop sizes from {112, 168, 224, 336}, with crop-resolution triples sampled empirically at (512,112,768)@0.3, (768,112,1152)@0.3, (768,168,1152)@0.3, (768,224,1152)@0.05, (768,336,1152)@0.05. This phase also uses Gram anchoring, with the 7B teacher itself as Gram teacher. The component is essential — without it, dense-prediction performance degrades significantly at the higher resolutions.

**Distilled family.** A single fixed 7B teacher supplies targets for all released variants in one multi-student procedure that shares teacher-inference cost across students.

| Variant | Parameters |
|---|---|
| ViT-S | 21M |
| ViT-S+ (custom) | 29M |
| ViT-B | 86M |
| ViT-L | 0.3B |
| ViT-H+ (custom) | 0.84B |
| ViT-7B | 6.716B |
| ConvNeXt-Tiny | 29M |
| ConvNeXt-Small | 50M |
| ConvNeXt-Base | 89M |
| ConvNeXt-Large | 198M |

Students train for 1M iterations, then 250k iterations of learning-rate cooldown, then the high-resolution phase without Gram anchoring. Gram anchoring is not applied during distillation at all: patch-level consistency issues are not observed against a fixed, non-EMA teacher. A text encoder, `dino.txt`, is trained separately on top of a frozen ViT-L following the LiT paradigm, with two transformer layers on the frozen backbone and the mean-pooled patch embeddings concatenated with the CLS token before matching to text embeddings.

# Implementations

Official PyTorch release from Meta AI Research, shipping the distilled ViT and ConvNeXt checkpoints alongside the flagship teacher. Code and weights are released under Meta's bespoke DINOv3 License rather than a standard open-source license; the paper text itself states no license terms.

# Assessment

## What v3 introduced

- **Gram anchoring** — a refinement phase that regularizes the student's patch-pairwise-similarity matrix toward an early, dense-consistent Gram teacher. It repairs dense-feature degradation that long schedules and large models otherwise cause, and it is applied after the main schedule is complete rather than throughout it.
- **Scale** — a custom 6.7B-parameter ViT teacher and LVD-1689M, 1.689B curated images distilled from a 17-billion-image pool.
- **A distilled family from one teacher** — ViT-S/S+/B/L/H+ and four ConvNeXt sizes trained in parallel against a single fixed 7B teacher, sharing teacher-inference cost across students. See [knowledge-distillation](/atlas/knowledge-distillation).
- **Supporting changes** — axial RoPE with box jittering in place of learnable position embeddings, constant hyperparameter schedules over 1M iterations in place of cosine schedules, a dedicated backbone output layer norm, and a high-resolution adaptation phase that itself depends on Gram anchoring.

**Strengths.**

- COCO object detection with a fully frozen backbone and a Plain-DETR decoder at 100M trainable parameters: mAP 66.1, ahead of EVA-02 + Co-DETR (65.9 with TTA, 300M trainable) and PEspatial + DETA (66.0 with TTA, 2B trainable). The paper describes this as the first competitive detection model to use a frozen backbone.
- ADE20k segmentation with a frozen backbone and a Mask2Former/ViT-Adapter decoder: mIoU 62.6, or 63.0 with TTA — matching ONE-PEACE at 63.0 and ahead of InternImage-H (62.9) and BEiT-3 (62.8).
- Dense linear probing, ViT-7B: ADE20k 55.9 mIoU against [dinov2](/atlas/dinov2) at 49.5, PEspatial 49.3, and SigLIP 2 42.7; Cityscapes 81.1 mIoU; VOC 86.6 mIoU; NYUv2 depth RMSE 0.309 against DINOv2 0.372 and SigLIP 2 0.494.
- 3D geometric correspondence on NAVI: recall 64.4, +4.3 points over DINOv2 at 60.1, and far ahead of the weakly-supervised SigLIP 2 (49.4) and PEcore (39.9). Semantic correspondence on SPair: 58.7 against DINOv2's 56.1.
- ImageNet-1k linear probe, ViT-7B: 88.4 validation accuracy against DINOv2's 87.3, with the best corruption robustness in its comparison set (ImageNet-C 19.6), and +10% on ImageNet-R, +6% on Sketch, and +13% on ObjectNet over DINOv2.
- Unsupervised object discovery with TokenCut: CorLoc 66.1 / 69.5 / 55.1 on VOC07 / VOC12 / COCO, a 5.9 CorLoc improvement on VOC 2007 over predecessors.
- Distillation fidelity: ViT-H+ at 840M parameters, roughly one eighth of the teacher, comes close to the 6.7B teacher across ImageNet-ReaL, ObjectNet, ADE20k, and Cityscapes.
- The same recipe transfers to satellite imagery, pre-trained on SAT-493M — 493 million 512×512 images sampled from Maxar RGB ortho-rectified imagery at 0.6 m resolution.

**Limitations.**

- Released as a technical report, not a peer-reviewed publication.
- Compute and data scale place reproduction out of reach for most: a 6.7B-parameter teacher, batch size 4096 across 256 GPUs, 1M iterations, and a curation pipeline over a 17-billion-image pool.
- Two of the four refinement-loss weights, $w_D$ and $w_{DK}$, have no numeric values in the paper text — they are referenced only as being in the released config files.
- The Gram-teacher choice is load-bearing and not free. A teacher taken at 1M iterations rather than 200k gives 54.9 mIoU and 0.290 RMSE versus 55.7 and 0.281, because its own patch-level consistency is inferior.
- Text alignment trails the best weakly-supervised models on global tasks: `dino.txt` on ViT-L reaches 82.3 ImageNet-1k zero-shot against SigLIP 2 at 83.1 and PE at 83.5. It leads decisively on open-vocabulary dense segmentation — ADE20k 24.7 mIoU against 10.8 and 17.6 — but zero-shot classification and retrieval are not where the local-feature advantage pays.
- Temporal reasoning remains outside its strengths: on Something-Something V2, the dedicated video model V-JEPA 2 reaches 73.8 single-clip top-1 against DINOv3's 70.1.
- Raw ImageNet-1k validation accuracy is still 0.7–0.9 points behind SigLIP 2 and Perception Encoder, despite the corruption-robustness lead.

# References

1. Siméoni, O., Vo, H. V., Seitzer, M., Baldassarre, F., Oquab, M., et al. (Meta AI Research). *DINOv3.* Technical report, 2025. [arXiv 2508.10104](https://arxiv.org/abs/2508.10104)
2. Oquab, M., Darcet, T., Moutakanni, T., et al. (Meta AI Research). *DINOv2: Learning Robust Visual Features without Supervision.* TMLR, 2024. [arXiv 2304.07193](https://arxiv.org/abs/2304.07193)
3. Caron, M., Touvron, H., Misra, I., Jégou, H., Mairal, J., Bojanowski, P., & Joulin, A. *Emerging Properties in Self-Supervised Vision Transformers.* ICCV, 2021. [arXiv 2104.14294](https://arxiv.org/abs/2104.14294)
