---
paper_id: zhang2023-mobilesamv2
title: "MobileSAMv2: Faster Segment Anything to Everything"
authors: ["C. Zhang", "D. Han", "S. Zheng", "J. Choi", "T. Kim", "C. S. Hong"]
year: 2023
url: https://arxiv.org/pdf/2312.09579
created: 2026-05-27
relevant_atlas_pages:
  - ritm-interactive-segmentation
  - mask-rcnn
  - faster-rcnn
  - yolo-v1
  - non-maximum-suppression
  - fcn-semantic-segmentation
  - unet-segmentation
  - attention-mechanism
  - felzenszwalb-graph-segmentation
  - convolutional-neural-network
---

# Setting

**Task — Segment Everything (SegEvery):** given an arbitrary image, produce class-agnostic instance masks for every foreground object. No specific object prompt is supplied; the system must discover all objects autonomously.

**Inputs:** an RGB image of arbitrary resolution. No class labels, no bounding-box queries.

**Output:** a set of non-overlapping segmentation masks, one per discovered object. Evaluated as zero-shot object proposals (no class constraint) using mask average recall (mask AR@K) on LVIS.

**Context:** SAM (Kirillov et al., 2023) already solves SegEvery via a grid-search strategy — placing a dense grid of foreground point prompts (up to 64×64 = 4096 points), running the mask decoder once per point, and then filtering duplicates with NMS-style post-processing. This is correct but slow: mask decoding time scales linearly with prompt count, so the 64×64 default costs ~6400 ms of mask-decoder time alone (Figure 1 / Table 1). MobileSAMv2 attacks this bottleneck without changing the encoder or decoder architectures.

# Core idea

The paper replaces SAM's exhaustive grid-search prompt strategy with an **object-aware prompt sampler** in two stages (§4.1):

1. **Object discovery (§4.2):** run a YOLOv8 detector trained on a subset of the SA-1B dataset to obtain candidate bounding boxes. Apply NMS to de-duplicate overlapping boxes. The result is a compact set of ≤320 object-aware box prompts (§6.2, Table 6 — performance saturates at 320; fewer than 4096 grid points).

2. **Prompt-guided mask decoding (§4.3):** feed each surviving bounding box directly to SAM's existing prompt-encoder + mask-decoder (same two-way-attention architecture as the original SAM). The box prompt is preferred over using the box center as a point because it is more informative, reduces granularity ambiguity, and eliminates the need to predict three output masks per prompt (single-mask mode suffices — §4.2).

No NMS post-filtering of masks is needed after decoding because the detector-side NMS already de-duplicates proposals before they enter the mask decoder. This removes the expensive in-memory mask-filtering step that SAM requires.

The approach is compatible with both the original ViT-H image encoder and the distilled TinyViT / EfficientViT-L2 encoders from MobileSAM (§5.2).

# Assumptions

1. **(Hard) Detector recall covers objects of interest.** Objects not detected by the YOLOv8 model are never prompted and thus never segmented. The detector's category-agnostic training on SA-1B mitigates but does not eliminate this gap; highly unusual object types may be missed.

2. **(Soft) Bounding-box center or box boundary falls on the object.** For point-mode operation the center must lie on the foreground pixel; for box mode the box must be a reasonable tight fit. Both hold for most rigid objects; deformable or elongated objects may have off-center detections.

3. **(Soft) Max 320 prompts is sufficient.** The ablation (Table 6) shows performance saturates at 320 box prompts; images with more than 320 distinct objects will miss the lowest-confidence ones.

4. **(Hard) Mask decoder is unchanged.** The method assumes SAM's two-way-attention mask decoder is available — it does not work with prompt-free segmentation architectures that lack this decoder.

5. **(Soft) SA-1B subset training generalises across domains.** The YOLOv8 model is trained on a small SA-1B subset specifically to avoid overfitting to a single domain. Domain shift (medical, satellite, microscopy) may degrade detector recall.

# Failure regime

- **Detector miss → mask miss (hard failure).** Any object the YOLOv8 model fails to detect is silently absent from the output. This is especially pronounced for very small objects (mask AR small score drops from 47.9 to 38.9 when switching to TinyViT, Table 4) and for objects outside the SA-1B appearance distribution.

- **Box over-budget.** When many objects are present (>320), the lowest-confidence detections are dropped. Table 6 shows a significant AR drop as the budget falls below 256 (58.5 → 44.8 at 64 prompts).

- **No improvement for single-object SegAny.** MobileSAMv2 does not touch the image encoder or the single-prompt click workflow. Click-prompt (SegAny) quality is unchanged from baseline SAM — only SegEvery is accelerated.

- **Mask decoder bottleneck only partially solved.** Prompt encoding now consumes ~47 ms for object discovery (Table 1), which is non-trivial compared with the 50 ms mask-decoding time. The paper notes that a faster object-discovery model is left as future work.

# Numerical sensitivity

**Latency (Table 1, §5.1) — measured on GPU:**

| Sampling strategy | Prompt encoding | Mask decoding | Total |
|---|---|---|---|
| Grid-search 32×32 (1024 pts) | 16 ms | 1600 ms | 1616 ms |
| Grid-search 64×64 (4096 pts) | 64 ms | 6400 ms | 6464 ms |
| Object-aware (max 320 boxes) | 47 ms | 50 ms | 97 ms |

Mask-decoder speedup: **at least 16×** vs the 32×32 grid; **>64×** vs the 64×64 grid. Total pipeline speedup (including prompt encoding): ~17× vs 32×32 and ~67× vs 64×64.

Note: image encoder time (~450 ms for ViT-H, ~20 ms for EfficientViT-L2) is common to all and excluded from Table 1.

**Quality (Table 2 / Table 3, §5.1) — LVIS zero-shot object proposal, mask AR@1000:**

| Method | multi-mask | all | small | med. | large |
|---|---|---|---|---|---|
| SAM 64×64 (4096 pts) | true ×3 | 59.2 | 46.6 | 78.7 | 82.4 |
| MobileSAMv2 max-320 boxes | false ×1 | 59.3 | 47.9 | 77.1 | 79.9 |
| MobileSAMv2 max-256 boxes | false ×1 | 58.5 | 46.7 | 77.1 | 79.1 |

Average mask AR@K (K ∈ {10, 100, 1000}): MobileSAMv2 42.5% vs SAM 38.9% — a **3.6% absolute improvement** (§Abstract).

**Encoder ablation (Table 4, §5.2) — mask AR@1000 (all), box prompts:**

| Encoder | AR@1000 (all) |
|---|---|
| ViT-H (original SAM) | 59.3 |
| EfficientViT-L2 (distilled) | 56.3 |
| TinyViT (distilled) | 51.1 |

EfficientViT-L2 runs ~20 ms vs ViT-H >400 ms; modest 3.0% AR drop is the trade-off (§5.2).

**Box prompt budget saturation (Table 6, §6.2):** performance plateau reached at 320 prompts; default is set to 320.

# Applicability

- **Use when:** batch/dataset-scale annotation of natural images where SegEvery throughput matters (annotation pipelines, data curation). Especially effective when paired with EfficientViT-L2 encoder for edge deployments.
- **Don't use when:** the target domain lacks overlap with SA-1B appearance distribution (e.g. satellite imagery, microscopy), where detector recall is uncertain. Also unsuitable when a specific single-object click-prompt (SegAny) is the primary interaction mode — this paper provides no improvement there.
- **Compared against:** SAM grid-search (the baseline); FastSAM / YOLOv8-seg prompt-free approach (Table 5 — lower mask quality, non-smooth boundaries); MobileSAM (orthogonal — faster SegAny, not SegEvery).

# Connections

- **Builds on:** [zhang2023-mobilesam] (MobileSAM v1 — lightweight encoder), [kirillov2023-sam] (SAM architecture; mask decoder and two-way attention unchanged)
- **Detector front-end:** YOLOv8 (Jocher et al.) — provides bounding-box proposals. No explicit citation number for YOLOv8 in this paper's reference list; referred to as SOTA YOLO-family in §4.2.
- **NMS:** used inside the object-aware prompt sampler to de-duplicate detector boxes before they enter the mask decoder (§4.2). NMS is eliminated for masks (no mask-level post-filtering needed).
- **Interactive segmentation connection:** RITM-style click-prompt (SegAny) is the complementary workflow that MobileSAMv2 does not address.
- **Prompt-free alternative:** FastSAM (YOLOv8-seg) is compared in Table 5 — AR@1000 = 49.6 vs MobileSAMv2 59.3; qualitative boundary quality is noticeably inferior (Figure 2).

# Atlas update plan

## UPDATE: mobilesam
Reason: MobileSAMv2 extends the lightweight encoder of MobileSAM with an **object-aware prompt sampler** for the "Segment Everything" task — replacing SAM's slow grid-prompt + NMS pipeline with a YOLOv8-style detector that proposes object bounding-box prompts. Cuts segment-everything mask-decoder latency by at least 16× with equivalent or superior mask quality. Compatible with both the original SAM ViT-H encoder and MobileSAM's distilled encoders.

Sections to extend on the future `mobilesam` page:

- **Architecture.Blocks:** add "object-aware prompt sampler" module: (1) YOLOv8 detector trained on SA-1B subset — outputs bounding boxes; (2) NMS to de-duplicate boxes; (3) surviving boxes fed as box prompts to SAM's unchanged prompt encoder + mask decoder; (4) single-mask decoding mode (no multi-mask ambiguity resolution needed with box prompts).
- **Architecture.Training:** YOLOv8 trained with joint bounding-box + mask supervision on a small SA-1B subset, then fine-tuned with bounding-box loss only (§4.2). Distilled image encoders (EfficientViT-L2, TinyViT) remain from MobileSAM; mask decoder unchanged from SAM.
- **Assessment.Strengths:** segment-everything mask-decoder speedup ≥16× vs SAM 32×32 grid, ≥64× vs 64×64 grid (Table 1). Total pipeline ~97 ms vs 1616 ms / 6464 ms (Table 1). Average mask AR@K improves 3.6% over SAM (42.5% vs 38.9%, Table 3). Box prompts outperform point prompts at equal budget (59.3% vs 53.6%, Table 2). Compatible with faster distilled encoders for fully unified SegAny + SegEvery.
- **Assessment.Limitations:** detector recall is a hard ceiling — objects the YOLOv8 model misses will not be segmented; performance degrades on domains absent from SA-1B training (medical, satellite). Does not improve single-object click-prompt (SegAny) quality. Prompt encoding now takes ~47 ms (object discovery overhead), non-trivial relative to 50 ms mask decoding (Table 1).
- **References:** zhang2023-mobilesamv2 as secondary source (v2-specific contributions).

## REFS:
- zhang2023-mobilesamv2 provides: (1) full latency table for grid-search vs object-aware sampling; (2) mask AR@K comparison tables on LVIS; (3) encoder ablation; (4) prompt-count saturation curve; (5) comparison with FastSAM prompt-free baseline.

# Provenance

- **Abstract:** "reduce the total time on the mask decoder by at least 16 times"; "average performance boost of 3.6% (42.5% v.s. 38.9%) for zero-shot object proposal on the LVIS dataset with the mask AR@K metric."
- **Figure 1 / Table 1:** SAM timing breakdown — SegAny image encoder ~450 ms, mask decoder ~4 ms; SegEvery with 32×32 points mask decoder ~1600 ms; 64×64 points ~6400 ms. Object-aware sampling prompt encoding 47 ms, mask decoding 50 ms, total 97 ms.
- **§1 (Introduction, para 3):** "we adopt YOLOv8 which is a SOTA architecture for efficient detection with bounding boxes ... a subset of SA-1B dataset is chosen."
- **§4.2 (Object-Aware Prompt Sampling):** YOLOv8 trained with joint box+mask supervision, fine-tuned with bounding-box loss only; NMS applied to filter overlapping boxes; box prompts preferred over center-point prompts for ambiguity reasons.
- **§5.1 (Main Results):** Table 2 — SAM 64×64 best: 59.2%; MobileSAMv2 max-320 boxes: 59.3%; MobileSAMv2 max-256 boxes: 58.5%. Table 3 — average AR@K: SAM 38.9%, MobileSAMv2 42.5%.
- **§5.2 (Compatibility with Distilled Encoders):** Table 4 — ViT-H 59.3%, EfficientViT-L2 56.3% (~20 ms), TinyViT 51.1%. "EfficientViT-l2 runs around 20ms which is significantly faster than that of ViT-H (more than 400ms)."
- **§6.1 (Comparison with Prompt-free Approach):** Table 5 — FastSAM AR@1000 all=49.6 vs MobileSAMv2 (ViT-H) 59.3. Figure 2 — qualitative boundary quality comparison.
- **§6.2 (Ablation Study):** Table 6 — performance saturates at 320 box prompts; default set to 320.
