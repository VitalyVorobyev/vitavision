---
title: "MobileSAM"
date: 2026-05-27
summary: "Lightweight SAM family — replaces SAM's heavy ViT-H image encoder (632M params, ~452 ms on a single GPU) with a distilled TinyViT encoder (5.78M params, ~8 ms), keeping SAM's prompt encoder + mask decoder frozen and unchanged; MobileSAMv2 adds an object-aware prompt sampler (YOLOv8-style detector → bounding-box prompts) that replaces SAM's 32×32 grid-prompt + NMS pipeline for the Segment-Everything task, cutting end-to-end latency from ≈1616 ms to ≈97 ms (>16×) at equivalent mask quality."
tags: ["deep-learning", "dense-prediction", "real-time"]
domain: segmentation
tasks: [image-segmentation]
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: vit
params: "9.66M (MobileSAM total, vs SAM ViT-H 632M)"
prerequisites: [sam, attention-mechanism]
failureModes: []
relations:
  - type: compared_with
    target: focalclick
    confidence: medium
    caution: "Both target lightweight on-device interactive segmentation but from different lineages — MobileSAM distils SAM's foundation-model encoder into TinyViT (zero-shot, no mask correction); FocalClick is a small specialised two-stage network with native preexisting-mask refinement."
sources:
  primary: zhang2023-mobilesam
  references:
    - zhang2023-mobilesamv2
    - kirillov2023-sam
  notes: |
    MobileSAM v1 (zhang2023-mobilesam) — replaces SAM's image encoder only;
    prompt encoder (0.006M) + mask decoder (~4M) kept frozen from SAM
    (Apache-2.0 weights). Total model 9.66M params, ~5MB checkpoint.
    Decoupled distillation: student (TinyViT, 5.78M) learns to produce
    image embeddings matching the ViT-H teacher's output (MSE loss on
    embeddings: $\mathcal{L} = \|z_s - z_t\|_2^2$). Trained on 1% of
    SA-1B with 1 GPU in <1 day. Encoder latency: SAM ViT-H ~452 ms vs
    MobileSAM ~8 ms (a single A100 GPU); mask decoder ~4 ms. Mask
    quality vs SAM (relative mIoU on SA-1B held-out): 0.71–0.74 across
    point/box prompts; vs FastSAM (68M params, 64 ms): 0.27–0.41.
    Architectural detail: TinyViT's final downsampling stride set to 1
    (instead of 2) to preserve 64×64 token-grid output matching SAM's
    interface.

    MobileSAMv2 (zhang2023-mobilesamv2) — object-aware prompt sampler
    for Segment-Everything. Replaces SAM's 32×32 grid-prompt pipeline +
    NMS deduplication (1024 prompts, slow) with a YOLOv8-style detector
    that proposes up to 320 object-aware bounding-box prompts directly.
    Decoder speedup ≥16× (the load-bearing claim). Total pipeline
    (encoder + sampler + decoder) latency on V100: SAM-ViT-H grid 1616
    ms; MobileSAMv2 with original SAM encoder ~480 ms; MobileSAMv2 with
    EfficientViT-L2 encoder ~97 ms (Table 1). Mask quality: AR@1000
    59.3% vs SAM-grid 59.2% (Table 2); average AR@K 42.5% vs 38.9%
    grid baseline (Table 3 / Abstract). Encoder-agnostic — the
    object-aware sampler is compatible with the original SAM encoder,
    the MobileSAM v1 encoder, or any swap-in encoder (EfficientViT-L2
    used in headline benchmarks, ~20 ms vs ViT-H >400 ms; §5.2).
implementations:
  - role: official
    repo: https://github.com/ChaoningZhang/MobileSAM
    commit: f706ad9c4eb7f219c00d9050e46328518ffb65d2
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

MobileSAM is a lightweight derivative of Meta's Segment Anything Model (SAM) designed for real-time and mobile inference. Its input and output contract are identical to SAM: an RGB image resized to 1024 px on the longest side plus a geometric prompt (point or bounding box) in, up to 3 candidate binary masks with per-mask IoU confidence scores out. The defining change in v1 is encoder replacement: SAM's ViT-H image encoder (632 M parameters, ~452 ms per image on a single GPU) is swapped for a TinyViT student (5.78 M parameters, ~8 ms) trained by decoupled image-embedding distillation, while SAM's prompt encoder and mask decoder remain frozen at their published weights. MobileSAMv2 adds a second orthogonal contribution: an object-aware prompt sampler that replaces SAM's dense 32×32 grid-prompt enumeration followed by NMS for the Segment-Everything task, replacing it with up to 320 bounding-box proposals from a YOLOv8-style detector. Because the v2 sampler operates on any SAM-compatible encoder, both contributions are encoder-agnostic and can be composed freely with the original SAM ViT-H, the distilled TinyViT, or any compatible replacement.

# Architecture

**Family & shape.** ViT-based encoder feeding a lightweight prompt-conditioned decoder — the same three-component topology as SAM v1 (image encoder, prompt encoder, mask decoder). The sole architectural change in v1 is the image encoder swap (ViT-H → TinyViT). MobileSAMv2 inserts a new pipeline stage — the object-aware prompt sampler — upstream of the mask decoder for the Segment-Everything task; it does not modify the encoder or decoder. Input: $H \times W \times 3$ RGB image padded/resized to 1024 px on the longest side (matching SAM). Output: up to 3 candidate binary masks plus an IoU confidence score per prompt. TinyViT's final downsampling stride is set to 1 (instead of its default 2) to produce a 64×64 token grid that matches SAM's frozen decoder interface.

**Blocks.** Three load-bearing elements added or replaced relative to SAM v1:

- **TinyViT image encoder (v1).** Lightweight ViT that replaces ViT-H. Four stages: stage 1 uses inverted-residual convolution blocks (MobileNetV2-style); stages 2–4 use transformer blocks. Total: 5.78 M parameters. Trained by decoupled knowledge distillation from the ViT-H teacher; the only component that receives gradient during distillation training.

- **Object-aware prompt sampler (v2).** A YOLOv8-style detector trained on a subset of SA-1B outputs up to 320 bounding-box proposals. NMS de-duplicates overlapping boxes before they enter SAM's prompt encoder. Surviving boxes are fed directly as box prompts, single-mask mode, to the unchanged SAM mask decoder — eliminating the 1024-prompt grid enumeration and the post-hoc mask-level NMS that SAM requires in Segment-Everything mode.

:::definition[Decoupled image-embedding distillation]
The student image encoder $f_s$ is trained to reproduce the teacher's image embedding $z_t = f_t(I)$ on input image $I$, using an L2 (MSE) loss on the embedding vectors. The prompt encoder and mask decoder are kept frozen from SAM throughout training — only the encoder weights are updated.

$$
\mathcal{L} = \|f_s(I) - f_t(I)\|_2^2.
$$
:::

The decoupled distillation training step in PyTorch:

```python
import torch
import torch.nn as nn


def decoupled_distillation_step(student_encoder: nn.Module,
                                 teacher_encoder: nn.Module,
                                 image: torch.Tensor,
                                 optimizer: torch.optim.Optimizer) -> float:
    """One training step of decoupled image-encoder distillation.
    Only the student encoder receives gradient; prompt encoder + mask
    decoder are kept frozen from the SAM teacher and are not touched.
    Sec. 3.2 of MobileSAM (Zhang et al. 2023).
    """
    student_encoder.train()
    teacher_encoder.eval()

    with torch.no_grad():
        z_teacher = teacher_encoder(image)  # [B, C, 64, 64]

    z_student = student_encoder(image)
    loss = nn.functional.mse_loss(z_student, z_teacher)

    optimizer.zero_grad()
    loss.backward()
    optimizer.step()

    return loss.item()
```

**Training.** v1 trains on a 1% subset of SA-1B (~110K images) for 8 epochs on a single GPU, completing in less than one day. The loss is MSE on image embeddings; teacher embeddings are pre-saved so the teacher forward pass runs only once. No focal or dice loss is used — the mask decoder is never touched during distillation. Mask quality on a SAM held-out evaluation (relative mIoU against original SAM ViT-H): 0.71–0.74 across point and box prompts (Table 7, §4.3 of v1). FastSAM, a contemporaneous 68 M-parameter baseline, reaches only 0.27–0.41 on the same samples. Decoupled distillation also outperforms the coupled variant: 0.75 mIoU versus 0.72 for a ViT-B coupled baseline trained with 128 GPUs, 180K iterations, and 11M images (Table 2, §3.2 of v1).

v2 trains a YOLOv8-style detector with joint bounding-box and mask supervision on a small SA-1B subset, then fine-tunes with bounding-box loss only. The underlying encoder is unchanged. Headline quality metric for v2 on zero-shot object-proposal on LVIS: mask AR@1000 59.3% (MobileSAMv2, ≤320 box prompts) versus 59.2% (SAM 32×32 grid), and average AR@K (K ∈ {10, 100, 1000}) 42.5% versus 38.9% — a 3.6% absolute improvement (Table 3, §5.1 of v2).

**Complexity.** Per-component comparison, v1 (Table 1 and Table 3, §4.1 of v1):

| Component | SAM (ViT-H) | MobileSAM |
|---|---|---|
| Image encoder params | 632 M | 5.78 M |
| Prompt encoder params | 0.006 M | 0.006 M (frozen) |
| Mask decoder params | ~4 M | ~4 M (frozen) |
| Total params | ~636 M | **9.66 M** |
| Encoder latency (single GPU) | ~452 ms | ~8 ms |
| Decoder latency | ~4 ms | ~4 ms |

For v2 Segment-Everything end-to-end pipeline (Table 1, §5.1 of v2, measured on GPU):

| Configuration | Prompt encoding | Mask decoding | Total |
|---|---|---|---|
| SAM ViT-H, 32×32 grid (1024 pts) | 16 ms | 1600 ms | **1616 ms** |
| SAM ViT-H, 64×64 grid (4096 pts) | 64 ms | 6400 ms | 6464 ms |
| MobileSAMv2, object-aware (≤320 boxes) | 47 ms | 50 ms | **97 ms** |

The mask-decoder phase speeds up by at least 16× versus the 32×32 grid and more than 64× versus the 64×64 grid (Abstract and §5.1 of v2). Image encoder time (~452 ms for ViT-H, ~20 ms for EfficientViT-L2) is shared across configurations and excluded from the table above.

# Implementations

Official PyTorch repository from MobileSAM's first author Chaoning Zhang covers both v1 and v2; weights for the distilled TinyViT encoder and the YOLOv8-style object-aware detector are bundled in the same release.

# Assessment

**Novelty.**

- v1 introduces **decoupled image-embedding distillation** for SAM's encoder: only the image encoder is distilled while the prompt encoder and mask decoder remain frozen at SAM's published weights. This works because SAM's prompt encoder and decoder interact with the encoder solely through the image-embedding interface — they are indifferent to which encoder produced it.
- v1 demonstrates that a **100× encoder compression** (ViT-H, 632 M → TinyViT, 5.78 M) is achievable without end-to-end retraining, using less than one GPU-day on 1% of SA-1B — in contrast to coupled distillation, which required 128 GPUs and 11M images for a weaker ViT-B baseline.
- v2 replaces SAM's **grid-prompt + NMS Segment-Everything pipeline** with an object-aware bounding-box sampler drawn from a YOLOv8-style detector, eliminating the enumeration of 1024 grid prompts and the expensive post-hoc mask-level NMS. Box prompts also allow single-mask decoding mode, removing the three-mask ambiguity resolution overhead.
- v2 is **encoder-agnostic** by construction: the object-aware sampler converts bounding boxes to SAM-compatible prompts, making it compatible with the original SAM ViT-H, MobileSAM's TinyViT, or EfficientViT-L2.

**Strengths.**

- v1 encoder latency: ~8 ms versus SAM ViT-H's ~452 ms on a single GPU — approximately 56× faster encoder forward pass; total model: 9.66 M parameters versus SAM's ~636 M (Table 3 and Table 6, §4.1 and §4.3 of v1).
- v1 mask quality: 0.71–0.74 relative mIoU against SAM ViT-H on held-out SA-1B samples, across point and box prompts — substantially higher than FastSAM's 0.27–0.41 at a similar parameter budget (Table 7, §4.3 of v1).
- v2 Segment-Everything latency: 97 ms end-to-end (with EfficientViT-L2 encoder) versus 1616 ms for SAM ViT-H grid + NMS — a greater-than-16× total pipeline speedup at equivalent or better recall (AR@1000 59.3% vs 59.2%; average AR@K 42.5% vs 38.9%) (Table 1 and Table 3, §5.1 of v2).
- Training cost: v1 converges in less than one GPU-day on 1% of SA-1B (~110K images); v2's detector training adds modest overhead. Both are reproducible without large-scale compute infrastructure.
- Decoupled distillation outperforms the coupled baseline (0.75 vs 0.72 mIoU) while using a fraction of the coupled regime's training images and compute (2 GPUs, 55K iterations, 11K images vs 128 GPUs, 180K iterations, 11M images) (Table 2, §3.2 of v1).

**Limitations.**

- Mask quality is **measured only against SAM's own outputs** as a proxy ground truth (relative mIoU on SA-1B held-out). The 0.71–0.74 figure is agreement with SAM, not with an independent human annotation benchmark. Quality on fine-structure boundaries, small objects, and out-of-distribution imagery is presumed lower than SAM's by the same margin, but is not separately characterised.
- v2's object-aware sampler inherits the YOLOv8 detector's recall ceiling: objects the detector fails to detect are silently absent from output, regardless of what SAM's grid-prompt enumeration would have found. This is especially pronounced for very small objects; mask AR small drops from 47.9% to 38.9% when switching from ViT-H to TinyViT (Table 4, §5.2 of v2).
- Prompt count budget is capped at 320 boxes; images with more than 320 distinct objects will miss the lowest-confidence detections. Performance degrades substantially below 256 prompts (AR@1000 drops from 59.3% to 58.5% at 256, and further to 44.8% at 64) (Table 6, §6.2 of v2).
- The TinyViT encoder is 100× smaller than ViT-H; subtle encoder-level features (fine texture, partially occluded instances) that ViT-H captures will be coarser. Text-prompt segmentation — already exploratory in SAM v1 — is not evaluated for MobileSAM.
- v1 does not ablate the effect of the TinyViT stride modification (final downsampling stride set to 1 instead of 2); the 64×64 token-grid match is a hard constraint from SAM's frozen decoder, but the impact of alternative encoder topologies on distillation quality is uncharacterised.

# References

1. Zhang, C., Han, D., Qiao, Y., Kim, J. U., Bae, S., Lee, S., & Hong, C. S. *Faster Segment Anything: Towards Lightweight SAM for Mobile Applications.* arXiv 2306.14289, 2023. [arxiv](https://arxiv.org/abs/2306.14289)
2. Zhang, C., Han, D., Zheng, S., Choi, J., Kim, T., & Hong, C. S. *MobileSAMv2: Faster Segment Anything to Everything.* arXiv 2312.09579, 2023. [arxiv](https://arxiv.org/abs/2312.09579)
3. Kirillov, A. et al. *Segment Anything.* ICCV, 2023. [arxiv](https://arxiv.org/abs/2304.02643)
