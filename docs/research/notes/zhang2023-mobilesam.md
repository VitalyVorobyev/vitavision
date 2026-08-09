---
paper_id: zhang2023-mobilesam
title: "Faster Segment Anything: Towards Lightweight SAM for Mobile Applications"
authors: ["C. Zhang", "D. Han", "Y. Qiao", "J. U. Kim", "S. Bae", "S. Lee", "C. S. Hong"]
year: 2023
url: https://arxiv.org/pdf/2306.14289
created: 2026-05-27
relevant_atlas_pages:
  - ritm-interactive-segmentation
  - mask-rcnn
  - fcn-semantic-segmentation
  - unet-segmentation
  - attention-mechanism
  - convolutional-neural-network
  - grabcut-iterative-segmentation
  - graph-cut-segmentation
  - resnet
  - hrnet
---

# Setting

**Problem class:** Efficient prompt-guided instance segmentation on resource-constrained devices (mobile phones, edge hardware).

**Inputs:** An RGB image of arbitrary resolution + one of {point, bounding box} prompts specifying what to segment. Preconditions: no special calibration requirements; the prompt encoder and mask decoder are frozen SAM weights from Kirillov et al. 2023.

**Outputs:** A binary segmentation mask (+ confidence / quality score) for the prompted object, or a dense mask proposal set when run in "segment everything" mode. Outputs are pixel-aligned and match SAM's original output contract exactly — the only change is the image encoder.

**Key constraint:** The method replaces only the image encoder. The prompt encoder (0.006M params) and mask decoder (<4M params) are kept from the original SAM (ViT-H) unchanged. This preserves full API compatibility with SAM-based toolchains.

# Core idea

SAM's heavyweight ViT-H image encoder (632M parameters) is the bottleneck for mobile deployment; the mask decoder is already lightweight. MobileSAM replaces the encoder with TinyViT (5.78M parameters) using **decoupled knowledge distillation**: the distillation target is the image embedding vector output of ViT-H, not the final segmentation mask. This decoupling is key — the student encoder learns to produce embeddings that are close to the teacher's (MSE loss on embeddings), and because SAM's prompt encoder + mask decoder only care about the image embedding interface, the distilled encoder plugs in as a drop-in replacement without any retraining of downstream components.

The training signal is simple: minimise MSE between student embedding $z_s$ and teacher embedding $z_t$:

$$\mathcal{L} = \|z_s - z_t\|_2^2$$

This avoids the focal + dice loss combination required for end-to-end SAM training. The distillation runs on 1% of SA-1B (≈110K images) for 8 epochs on a **single GPU**, completing in less than one day. By contrast, coupled distillation (retraining the full SAM with a smaller encoder jointly with the mask decoder) required 128 GPUs for 180K iterations on 11M images and still achieved lower mIoU (0.72 coupled vs 0.75 decoupled; Table 2, §3.2).

# Assumptions

1. **Hard:** SAM's image-embedding interface is the sole coupling between encoder and decoder. The paper explicitly states this is the design rationale (§3.1: "the image encoder takes the image as the input and generates an embedding, which is then fed to the mask decoder") and the experiment result confirms it (§3.2: decoupled distillation yields an encoder "automatically compatible with the default mask decoder").
2. **Soft:** The 1% SA-1B subset (≈110K images) is sufficiently representative. More data or longer training continues to improve mIoU (Table 4 ablation, §4.2), so the published checkpoint is not the performance ceiling.
3. **Soft:** TinyViT's architectural stride modification (final downsampling stride set to 1 instead of 2) is necessary to match ViT-H's output spatial resolution. Other efficient encoders can be substituted (§4.1: "Note that other efficient image encoders ... can also be adopted as the image encoder").
4. **Soft:** Mask decoder finetuning on the distilled encoder is optional. The paper reports results without it and notes it would further improve performance (§3.2, §4.1).
5. **Soft:** Performance is evaluated by mIoU against original SAM predictions (not against ground-truth annotations). This is a proxy metric: higher mIoU means the lightweight model agrees with the heavy model, not that absolute quality is maintained on external benchmarks.

# Failure regime

- **Quality regression on fine-grained or ambiguous prompts:** The distilled encoder is 100x smaller; subtle encoder-level features (fine texture, small objects, partially occluded instances) that ViT-H captures will be coarser. The paper does not report quality numbers against an independent ground-truth benchmark — all quantitative results are relative to original SAM.
- **Text-guided prompts not evaluated:** The paper explicitly notes (§4.2): "We do not report the results with text prompt because the official GitHub project of SAM does not provide pretrained models for text-guided mask decoder." Whether text-prompted MobileSAM is practical is unverified.
- **Segment-everything mode: acceptable but noisier:** In the qualitative comparison (Figure 6, §4.3), MobileSAM's segment-everything output "aligns surprisingly well" with original SAM. FastSAM is worse, but the paper does not provide quantitative segment-everything metrics.
- **Training data distribution shift:** SA-1B is a natural-image dataset. Performance on domain-specific inputs (medical images, satellite imagery, industrial inspection) is reported by independent works as degraded — this is an SAM-family limitation, not unique to MobileSAM.

# Numerical sensitivity

**Parameter counts (Table 1, Table 3, Table 6):**

| Component | Original SAM (ViT-H) | MobileSAM |
|---|---|---|
| Image encoder | 632M | 5.78M |
| Prompt encoder | 0.006M | 0.006M (frozen) |
| Mask decoder | ~4M | ~4M (frozen) |
| Total (model file size) | ~640M | ~9.66M |

- MobileSAM is ~60x smaller in parameter count than SAM (ViT-H). (§1, §5)
- MobileSAM (9.66M) is ~7x smaller than FastSAM (68M). (Table 6, §4.3)

**Inference speed on single GPU (Table 3, Abstract):**

| Stage | SAM (ViT-H) | MobileSAM |
|---|---|---|
| Image encoder | 452ms | 8ms |
| Mask decoder | ~4ms | ~4ms |
| Total | ~456ms | ~12ms |

- MobileSAM is ~5x faster end-to-end than FastSAM (64ms, Table 6). Note: the abstract states "around 10ms" while Table 6 shows 12ms for end-to-end vs FastSAM's 64ms — minor inconsistency, both from the same paper.

**mIoU against SAM (ViT-H) predictions (Table 7, §4.3):**

MobileSAM achieves mIoU ≈ 0.71–0.74 across 100–500 held-out SA-1B samples (point prompts). FastSAM achieves 0.27–0.41 on the same set — a large gap.

**Decoupled vs coupled distillation mIoU (Table 2, §3.2):**

| Method | mIoU | GPUs | Iterations | Training data |
|---|---|---|---|---|
| Coupled (SAM ViT-B) | 0.72 | 128 | 180k | 11M |
| Decoupled (MobileSAM) | 0.75 | 2 | 55k | 11K |

Decoupled distillation uses <1% of compute and achieves higher mIoU vs coupled distillation against a ViT-B baseline.

**Training details (§4.1):**
- Dataset: 1% of SA-1B (~110K images for 8 epochs)
- Single GPU, < 1 day
- MSE loss on image embeddings (no focal/dice loss)
- Image embeddings pre-saved to speed up distillation (teacher forward pass run once)

# Applicability

- **Use when:** on-device or real-time SAM inference is required; mobile/edge deployment with <10MB model budgets; replacing any SAM-based pipeline with a drop-in lightweight encoder (plug-and-play, zero code change beyond swapping the encoder checkpoint).
- **Don't use when:** ground-truth-grade segmentation quality is required and compute is available; evaluation against external benchmarks (not SAM's own predictions) is needed; text-prompted segmentation is the primary use case (unverified).
- **Compared against:** original SAM (ViT-H, ViT-L, ViT-B), FastSAM (YOLOv8 + YOLACT-based, 68M params, 64ms/image).

# Connections

- **Builds on:** kirillov2023-sam (SAM v1 — encoder/decoder architecture, SA-1B dataset, prompt interface contract)
- **Builds on:** Wu et al. 2022 (TinyViT — the lightweight encoder architecture adopted; pre-saved embedding trick from TinyViT training also reused)
- **Enables:** zhang2023-mobilesamv2 (MobileSAM v2 object-aware prompting strategy, downstream)
- **Concurrent comparison:** FastSAM (Zhao et al. 2023) — different approach (YOLO-based, prompt-free mask proposals), shown to be slower and less accurate on "segment anything" task

# Atlas update plan

## NEW: mobilesam
Type: model
Category: efficient-segmentation
Primary source: this paper (zhang2023-mobilesam)

Relations:
  - { type: extended_by, target: sam, confidence: high, caution: "MobileSAM is a lightweight derivative of Meta's SAM (Kirillov et al. 2023). The `sam` Atlas page does not exist yet and must be authored before this relation target resolves." }
  - { type: compared_with, target: ritm-interactive-segmentation, confidence: medium, caution: "Different sub-paradigms — SAM-family uses foundation-model encoder + prompt; RITM uses iterative-mask refinement. Both are click-prompted interactive segmenters." }

**Motivation:**
- SAM's ViT-H encoder (632M params, 452ms/image on GPU) is too heavy for mobile/edge deployment.
- The mask decoder (<4M params) and prompt encoder (0.006M) are already lightweight; the bottleneck is the image encoder exclusively.
- Goal: a mobile-friendly SAM with equivalent API but suitable for on-device inference.

**Architecture (decoupled distillation; image-encoder-only target; TinyViT):**
- Only the image encoder is replaced; prompt encoder and mask decoder are frozen from original SAM.
- Teacher: SAM's ViT-H encoder (632M params). Student: TinyViT (5.78M params).
- Distillation target: image embedding vector output (MSE loss). Mask decoder is not involved during distillation.
- TinyViT architecture: 4 stages; stage 1 uses inverted-residual convolution blocks (MobileNetV2-style); stages 2–4 use transformer blocks. Final downsampling stride modified to 1 (vs default 2 in TinyViT) to match ViT-H's output spatial resolution.
- Training: 1% of SA-1B (~110K images), 8 epochs, single GPU, <1 day. Teacher embeddings pre-saved for efficiency.
- Optional second stage: fine-tuning the mask decoder on the distilled encoder (omitted in this paper version; noted to improve performance further).
- Total model size: 9.66M params (~7x smaller than FastSAM, ~60x smaller than SAM ViT-H).

**Implementations:**
- Official PyTorch repo: https://github.com/ChaoningZhang/MobileSAM (license must be verified at orchestrator step — likely Apache 2.0 or MIT based on SAM lineage, but not confirmed from cache).

**Assessment:**
- mIoU vs SAM (ViT-H): 0.71–0.74 on 500 SA-1B held-out samples (point prompts); vs FastSAM's 0.27–0.41 on same set (Table 7).
- Inference: ~12ms end-to-end on single GPU vs ~456ms for SAM (ViT-H) and ~64ms for FastSAM.
- Decoupled distillation beats coupled (0.75 vs 0.72 mIoU) using <1% of compute (Table 2).
- All quality numbers are relative to SAM's predictions as pseudo-ground-truth, not to independent human annotations.
- Runs on CPU (qualitative demo shown; no quantitative CPU latency reported).
- No text-prompt evaluation.

**References:**
- Primary: zhang2023-mobilesam (this paper), arxiv 2306.14289
- SAM: kirillov2023-sam (Kirillov et al., 2023)
- TinyViT encoder: Wu et al. 2022 (ECCV 2022)
- FastSAM comparison: Zhao et al. 2023

# Provenance

- Abstract: parameter reduction (60x), inference speed (~10ms total: 8ms encoder + 4ms decoder), "performs on par with the original SAM", 5x faster and 7x smaller than FastSAM.
- §1, Table 1: encoder parameter counts — ViT-H 632M, ViT-L 307M, ViT-B 86M; prompt encoder 0.006M.
- §1, p4: "reduces the encoder parameters by 100 times and total parameters by 60 times".
- §3.1: explicit statement that the image-embedding interface is the only coupling ("the image encoder takes the image as the input and generates an embedding, which is then fed to the mask decoder").
- §3.2, Table 2: decoupled vs coupled distillation comparison — mIoU 0.75 vs 0.72; 2 GPUs vs 128 GPUs; 11K vs 11M training images; 55k vs 180k iterations.
- §3.2 (p. "From semi-coupled to decoupled distillation"): MSE loss on embeddings explained; coupled approach uses focal + dice loss.
- §4.1: "we train the lightweight encoder with 1% of the SA-1B dataset for 8 epochs on a single GPU"; stride modification for spatial resolution matching described.
- §4.1, Table 3: encoder parameters — SAM 632M vs MobileSAM 5.78M; encoder speed — SAM 452ms vs MobileSAM 8ms (single GPU).
- §4.2, Table 4: ablation — mIoU improves from 0.7057 (batch 4, 2 epochs, 50k iter) to 0.7447 (batch 8, 8 epochs, 100k iter).
- §4.3, Table 6: FastSAM size 68M vs MobileSAM 9.66M; speed 64ms vs 12ms.
- §4.3, Table 7: mIoU vs original SAM — MobileSAM 0.71–0.74, FastSAM 0.27–0.41 (across 100–500 sample sizes).
- §4.2: "We do not report the results with text prompt because the official GitHub project of SAM does not provide pretrained models for text-guided mask decoder."
- §5 (Conclusion): "plug-and-play for the existing SAM-based projects ... with almost zero effort."
