---
title: "DINOv2"
date: 2026-06-27
summary: "A self-supervised ViT trained on a curated 142M-image dataset that yields general-purpose visual features usable frozen — via kNN or linear probes — for classification, dense depth and segmentation without finetuning."
tags: ["deep-learning"]
domain: features
author: "Vitaly Vorobyev"
difficulty: advanced
arch_family: vit
params: "ViT-S/B/L/g; ViT-g ~1.1B"
prerequisites: [vit, mae]
sources:
  primary: oquab2023-dinov2
  references:
    - dosovitskiy2020-vit
    - he2021-mae
relations:
  - type: feeds_into
    target: depth-anything
    confidence: high
  - type: feeds_into
    target: depth-anything-v2
    confidence: high
  - type: feeds_into
    target: depth-anything-3
    confidence: high
  - type: feeds_into
    target: vggt
    confidence: high
implementations:
  - role: official
    repo: https://github.com/facebookresearch/dinov2
    commit: 7764ea0f912e53c92e82eb78a2a1631e92725fc8
    framework: pytorch
    license: Apache-2.0
    weights_license: Apache-2.0
---

# Motivation

Takes an arbitrary RGB image and produces two outputs from a frozen Vision Transformer encoder: a CLS token encoding holistic image semantics, and a spatial field of patch tokens carrying dense, spatially-grounded local information. Neither the backbone nor its projection heads are updated at evaluation time — no finetuning, no task-specific pretraining. The defining property is that discriminative self-supervised training on a curated large-scale corpus yields features that match or exceed weakly-supervised (text-guided) models on image-level classification and retrieval while decisively outperforming them on dense pixel-level tasks (semantic segmentation, monocular depth). This contrasts with MAE's masked reconstruction objective, which produces features that are competitive only after full supervised finetuning, and with the original DINO trained on ImageNet-1k, which is too data-limited to transfer reliably across domains.

# Architecture

**Family & shape.** Pure ViT backbone with patch size 14, used in four released configurations. Encoder input: $H \times W \times 3$ RGB image, where $H$ and $W$ are multiples of 14. Encoder outputs: a sequence of $N+1$ tokens of dimension $D$, where $N = HW / 196$ — the CLS token plus $N$ patch tokens. Pretraining appends two separate MLP projection heads (128k-prototype softmax banks), one for the image-level DINO loss and one for the patch-level iBOT loss; both heads are discarded after pretraining.

**Blocks.** Training combines three objectives in a student-teacher framework with an exponential-moving-average (EMA) teacher.

*Image-level loss (DINO, §4).* Student and teacher ViTs each process multi-scale crops of the same image. CLS tokens are fed to the respective DINO heads; loss is a cross-entropy between teacher and student softmax outputs:

:::definition[DINO image-level loss]
The teacher output $p_t$ uses Sinkhorn-Knopp centering (3 iterations); the student output $p_s$ uses plain softmax. Loss is averaged over all crop pairs processed by the teacher.

$$
L_{\text{DINO}} = -\sum p_t \log p_s
$$
:::

*Patch-level loss (iBOT, §4).* A random subset of patches is masked for the student but not for the teacher. A separate iBOT head processes the student mask tokens and the corresponding teacher patch tokens with the same SK-centering recipe:

:::definition[iBOT patch-level loss]
Index $i$ runs over masked patch positions. Separate (untied) DINO and iBOT heads are used at scale; the original iBOT shared them, but the authors found untying improves stability.

$$
L_{\text{iBOT}} = -\sum_i p_t^i \log p_s^i
$$
:::

*KoLeo regularizer (§4).* Applied on $\ell_2$-normalised CLS tokens from the first global crop, computed per-GPU. It maximises the minimum pairwise distance in the batch (Kozachenko-Leonenko entropy estimator):

$$
L_{\text{koleo}} = -\frac{1}{n}\sum_{i=1}^{n} \log(d_{n,i}), \qquad d_{n,i} = \min_{j \neq i} \| x_i - x_j \|
$$

weighted 0.1 in the total objective (§4): $L = L_{\text{DINO}} + L_{\text{iBOT}} + 0.1 \cdot L_{\text{koleo}}$.

The teacher weights are an EMA of the student with a cosine momentum schedule from 0.994 to 1.0 over 625k iterations (App. B.1/Table 16).

**Training.** The training dataset, LVD-142M, is assembled automatically without human annotation. Starting from a 1.2B-image web crawl, self-deduplication at cosine similarity $> 0.6$ reduces this to 1.1B images; relative deduplication against a curated reference set at cosine similarity $> 0.45$ further reduces to 744M images; a final retrieval step — $k{=}32$ nearest-neighbour retrieval against ImageNet-1k queries using 100,000 clusters — selects 142M images with sufficient diversity and domain coverage (§3 / App. A.3, App. A.4). Ablation on Table 2 shows LVD-142M reaches 85.8% ImageNet-1k linear accuracy versus 83.3% for the uncurated corpus at the same iteration count.

ViT-g/14 and ViT-L/14 are trained from scratch. ViT-S/14, ViT-B/14, and a second ViT-L/14 variant are trained by distillation from a frozen ViT-g/14 teacher — same training loop but without masking, stochastic depth, or the iBOT patch-masking on global crops (§4). A high-resolution adaptation phase fine-tunes all models at 518×518 for 10k extra iterations (App. B.2), which recovers the segmentation and depth performance of full high-resolution training at roughly one-third the cost (Fig. 6).

Key hyperparameters (App. B.1/Table 16–17): AdamW, weight decay cosine 0.04→0.2, LR warmup 100k iterations, backbone in float16 with DINO/iBOT head gradients in float32, stochastic depth rate 0.4 for ViT-L and ViT-g from-scratch (stabilised by LayerScale initial value 1e-5), batch size 3072 (from-scratch) / 2048 (distilled). The four released model configs (App. B.1/Table 17):

| Variant | Embed dim | Heads | Blocks | FFN |
|---|---|---|---|---|
| ViT-S/14 | 384 | 6 | 12 | MLP |
| ViT-B/14 | 768 | 12 | 18 | MLP |
| ViT-L/14 | 1024 | 16 | 24 | SwiGLU (scratch) / MLP (distil) |
| ViT-g/14 | 1536 | 24 | 40 | SwiGLU |

Note that ViT-B/14 uses 18 blocks, not the standard 12, so its parameter count is non-standard and not explicitly stated in the paper.

**Complexity.** ViT-g/14 has 1.1B parameters (§5). Full from-scratch training of ViT-g/14 consumes 22,016 A100-hours (9.7 MWh, 3.7 tCO₂ eq, Table 14). The implementation is approximately 2× faster and requires 3× less memory than the prior iBOT baseline at the same scale (§1), achieved via FlashAttention, sequence packing, and efficient stochastic depth.

# Implementations

Official PyTorch release from Facebook AI Research; ships training code, model configs, and pretrained checkpoints for all four sizes under Apache-2.0.

# Assessment

**Novelty.**

- Discriminative self-supervised learning (DINO + iBOT combined objective) produces **frozen-usable features** competitive with text-supervised models on dense tasks — a capability that neither MAE (reconstruction-based, features are weak frozen) nor original DINO (trained only on ImageNet-1k) demonstrated.
- The **LVD-142M automatic data curation pipeline** — multi-stage web crawl deduplication followed by retrieval-based image selection, entirely without human annotation — shows that data quality at 142M scale is decisive: the curated set outperforms the uncurated 1.1B-image corpus by 2.5% ImageNet-1k linear accuracy (Table 2).
- **Large-to-small model distillation**: ViT-S/B/L are trained by distillation from the frozen ViT-g/14 teacher rather than from scratch, improving quality on small models while reusing the curated features from the expensive flagship run.
- **Untied DINO and iBOT projection heads** at scale — the original iBOT shared heads, but the authors found that separating them improves training stability at 128k-prototype scale (§4).

**Strengths.**

- Frozen ImageNet-1k linear probe: ViT-g/14 86.5%; kNN 83.5% (Table 4, §7.1) — on par with EVA-CLIP/OpenCLIP-G at 86.4%/83.5%, with no text supervision.
- Frozen ADE-20k semantic segmentation: ViT-g/14 49.0 mIoU (linear head), 53.0 mIoU (+ms, res 640, 4-layer concatenation) — approaching finetuned MAE UperNet at 53.6 mIoU (Table 10, §7.4). The iBOT patch-level loss is the critical enabler: ablation shows +2.9 mIoU on ADE-20k from the patch-level loss alone (44.2 → 47.1, Table 3b, §6.4).
- Frozen NYUd depth estimation (DPT decoder): ViT-g/14 RMSE 0.279 — below the BinsFormer SOTA of 0.330 at publication time (Table 11, §7.4).
- Frozen instance retrieval: Oxford-Hard mAP 52.3 (+34% relative vs OpenCLIP-G); iNaturalist-2021 85.7% (+9.7 pp vs OpenCLIP-G) (§7.2–7.3). KoLeo regularisation accounts for most of the retrieval improvement (>8 mAP on Oxford-M, Table 3a).
- Adopted as the frozen backbone in Depth Anything 3 and VGGT, validating the frozen-feature quality on real downstream systems.

**Limitations.**

- **Compute and data-curation cost**: ViT-g/14 training requires 22,016 A100-hours (Table 14); reproducing the full LVD-142M pipeline requires access to a large-scale web image crawl and significant deduplication compute. Smaller variants benefit from distillation but still require the teacher run.
- **Geographic and socioeconomic bias**: LVD-142M is curated from largely Western internet sources. Dollar Street fairness evaluation shows a 25.7% accuracy gap between Africa (74.0%) and Europe (89.7%), and a 23.1% gap between low-income (67.4%) and high-income (90.5%) households (Table 12, §8.1).
- **No temporal reasoning**: frozen ViT-g/14 features reach only 38.3% accuracy on Something-Something v2 (temporal reasoning benchmark), versus 90%+ on UCF-101 / Kinetics-400 where static appearance is sufficient (§8.2). DINOv2 is not a substitute for video-specific or motion-aware encoders.
- **No text-image alignment**: features are image-only — zero-shot text-driven inference (CLIP-style) is not supported.
- **ViT-S/B/L parameter counts not stated in the paper**: only ViT-g/14 at 1.1B is explicit (§5); ViT-B/14 has 18 blocks (not the standard 12), so standard ViT-B estimates (~86M) do not apply.

# References

1. Oquab, M., Darcet, T., Moutakanni, T., et al. (Meta AI Research). *DINOv2: Learning Robust Visual Features without Supervision.* TMLR, 2024. [arXiv 2304.07193](https://arxiv.org/abs/2304.07193)
2. Dosovitskiy, A. et al. *An Image is Worth 16x16 Words: Transformers for Image Recognition at Scale.* ICLR, 2021. [arXiv 2010.11929](https://arxiv.org/abs/2010.11929)
3. He, K., Chen, X., Xie, S., Li, Y., Dollár, P., & Girshick, R. *Masked Autoencoders Are Scalable Vision Learners.* CVPR, 2022. [arXiv 2111.06377](https://arxiv.org/abs/2111.06377)
