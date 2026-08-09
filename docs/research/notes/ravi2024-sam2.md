---
paper_id: ravi2024-sam2
title: "SAM 2: Segment Anything in Images and Videos"
authors:
  - N. Ravi
  - V. Gabeur
  - Y.-T. Hu
  - R. Hu
  - C. K. Ryali
  - T. Ma
  - H. Khedr
  - R. Rädle
  - C. Rolland
  - L. Gustafson
  - E. Mintun
  - J. Pan
  - K. V. Alwala
  - N. Carion
  - C.-Y. Wu
  - R. Girshick
  - P. Dollár
  - C. Feichtenhofer
year: 2024
url: https://arxiv.org/pdf/2408.00714
created: 2026-05-27
relevant_atlas_pages:
  - ritm-interactive-segmentation
  - mask-rcnn
  - faster-rcnn
  - fcn-semantic-segmentation
  - unet-segmentation
  - deeplab-semantic-segmentation
  - grabcut-iterative-segmentation
  - graph-cut-segmentation
  - attention-mechanism
  - convolutional-neural-network
---

# Setting

**Problem class:** Promptable visual segmentation extended from images to videos — the Promptable Visual Segmentation (PVS) task. Given an input video and one or more interactive prompts (clicks, bounding boxes, or masks) placed on any frame at any time, the model must output a per-frame mask tracking the prompted object across all video frames. The SA image task (SAM v1) is a degenerate single-frame case of PVS.

**Inputs:**
- A video stream (arbitrarily long; frames consumed one at a time in causal order).
- Sparse or dense prompts on one or more frames: positive/negative clicks, bounding boxes, or mask strokes. Prompts may be added interactively mid-video to correct errors.
- Optionally, a first-frame ground-truth mask (semi-supervised VOS setting).

**Outputs:**
- A binary segmentation mask per frame, tracking the prompted object throughout the video.
- An "occlusion score" indicating whether the object is out of view in a given frame.
- Up to 3 candidate masks with confidence scores for ambiguous prompts (inherited from SAM).

**Preconditions:** Single object per model call (multi-object requires independent parallel passes sharing only the per-frame image embeddings). Object must have a valid visual boundary per the SA definition. Causal/online processing: at inference time the model has no access to future frames.

# Core idea

SAM 2 extends the SAM architecture with a **streaming memory mechanism** that enables temporal coherence across video frames. The architecture has four main components: (1) an **image encoder** (MAE pre-trained Hiera, hierarchical ViT) that independently encodes each frame into spatial feature tokens; (2) a **memory attention module** — a stack of `L` transformer blocks that perform self-attention on current-frame features followed by cross-attention to a memory bank containing spatial feature maps from past frames plus object pointer vectors, then an MLP; (3) a **prompt encoder + mask decoder** essentially identical to SAM v1; and (4) a **memory encoder** that converts each frame's predicted mask and image embedding into a compact spatial memory entry.

The memory bank is a FIFO queue of up to **N** recent unprompted frame memories plus up to **M** prompted frame memories (spatial feature maps), and a list of **object pointer** vectors (lightweight high-level semantic summaries derived from mask decoder output tokens). The memory attention module cross-attends to both spatial memories and object pointers, with temporal position embeddings applied to the N recent frame memories.

For image-only inference, the memory is empty and the model reduces exactly to SAM's prompt encoder + mask decoder behaviour.

Training uses a simulated interactive protocol: 8-frame subsequences are sampled, up to 2 frames randomly selected for prompting, with corrective clicks probabilistically sampled from ground-truth masklets during training. Initial prompts are: ground-truth mask (p=0.5), a single positive click (p=0.25), or a bounding box (p=0.25).

# Assumptions

1. **Causal access only (hard).** Frame `t` is processed using only frames `≤ t`. No future frames. Violating this collapses the streaming use case.
2. **Single object per call (soft).** Each model call handles one object. Multi-object segmentation requires one call per object, sharing only cached per-frame image embeddings.
3. **Object remains visually grounded somewhere in the video (soft).** After long occlusion or shot change, re-prompting is required; the model cannot extrapolate through frame gaps where the object is entirely absent.
4. **Object has a valid closed visual boundary (soft).** Inherited from SAM: regions without defined boundaries (e.g., sky, textures) are outside scope.
5. **Static camera or modest motion (soft).** Very fast motion causes fine-detail tracking errors. Significant appearance change from blur, rapid motion, or extreme deformation degrades tracking.

# Failure regime

The paper (§B, Appendix B) enumerates these explicitly:

- **Shot cuts / scene discontinuities:** The model fails to segment objects across shot changes where the spatial context resets — the memory bank contains irrelevant frames from the prior shot.
- **Long occlusions / extended videos:** After a long disappearance, the model can lose the object or confuse it with similar-looking distractors because the FIFO memory window no longer holds useful frames. Mitigation: re-prompt on any frame.
- **Crowded scenes with similar-looking objects:** The memory module can drift toward a nearby object with similar appearance (e.g., multiple identical juggling balls). No inter-object communication occurs in the current design.
- **Thin / fast-moving details:** Fine-structure objects (e.g., thin fingers, rope) tracked at high velocity produce inaccurate mask boundaries. Attributed to limited explicit motion modeling.
- **Topology changes:** Object splitting into parts that separate is not handled; the mask tracks a single connected region.
- **Each object is segmented independently:** SAM 2 processes each object separately; when multiple objects are tracked simultaneously they share per-frame embeddings but have no cross-object reasoning, which limits efficiency and consistency.

# Numerical sensitivity

- **Memory bank depth (N, M):** The FIFO queue length `N` (recent frames) and `M` (prompted frames) are architectural hyperparameters that trade memory footprint for temporal receptive field. Exact default values are described in Appendix C.1 but not highlighted in the main body; the paper notes temporal position embeddings are applied only to the N recent-frame memories.
- **Resolution:** Ablations run at 512px. The paper does not report strong resolution sensitivity but standard VOS datasets vary in resolution.
- **Image benchmark FPS sensitivity to model size:**
  - SAM (ViT-H): 21.7 FPS (Table 15).
  - SAM 2 (Hiera-B+): 130.1 FPS — **~6× faster** than SAM ViT-H (Table 15).
  - SAM 2 (Hiera-L): 61.4 FPS — ~3.4× faster than SAM ViT-H (Table 15).
  - SAM (ViT-B): 76.7 FPS; SAM 2 (Hiera-B+) is ~1.7× faster than SAM ViT-B.
- **Click count sensitivity:** 1-click mIoU is notably lower than 5-click mIoU (e.g., SAM 2 Hiera-B+ on SA-23: 58.9 at 1-click vs 81.7 at 5-click, trained on SA-1B; Table 15).
- **Training data curriculum sensitivity (Table 2):** Adding each data engine phase monotonically improves J&F on SA-V val and 9 zero-shot benchmarks, confirming the data engine quality matters significantly.

# Applicability

- **Use when:**
  - Interactive video object segmentation is the goal — the user provides clicks or boxes on any frame and expects propagation.
  - Zero-shot generalisation across diverse video domains is needed.
  - Real-time or near-real-time throughput matters (Hiera-B+ at 130 FPS on images; video throughput depends on clip length and hardware).
  - Image segmentation is needed at 6× lower latency than SAM v1 with no accuracy loss.
- **Don't use when:**
  - Batch offline processing of pre-recorded video is acceptable and a specialised offline VOS method (e.g. Cutie, XMem) has been tuned — semi-supervised VOS specialists remain competitive on certain benchmarks.
  - The application requires explicit object-level motion modeling (e.g., velocity-aware tracking for autonomous driving).
  - Multiple objects that interact semantically need consistent joint segmentation — SAM 2 processes them independently.
- **Compared against:** SAM v1 (image segmentation); XMem, Cutie, DEVA, SwinB-DeAOT (video segmentation); HQ-SAM (image quality); RITM (interactive image segmentation).

# Connections

- **Builds on:** [kirillov2023-sam] — SAM v1 is the direct predecessor; the prompt encoder and mask decoder are reused with minor modifications. Hiera image encoder (Ryali et al. 2023; Bolya et al. 2023) replaces SAM's plain ViT.
- **Enables:** [carion2025-sam3] — concept-aware SAM 3 (planned) builds on the SAM 2 base. SAM 2 also enables lightweight derivatives (MobileSAM family, SAM 2.1 fine-tunes).
- **Refutes / supersedes:** SAM v1 for image segmentation in speed-accuracy trade-off (6× faster at equal or better accuracy on SA-23; Abstract, Table 15). Does not supersede VOS specialists in all settings.

# Atlas update plan

## UPDATE: sam
Reason: this paper introduces SAM 2 — extending the SAM paradigm from images to videos via a memory-attention mechanism and per-frame interactive segmentation. The existing kirillov2023-sam research note covers v1; this note covers v2's new contributions (memory module, video segmentation, SA-V dataset). To be applied together with the existing kirillov2023-sam note and the future carion2025-sam3 note in a single `sam` family page.

Relations: (defer to page-author time — will be `extended_by` from `sam` to `sam-2` if v2 is given its own page; for now the page-shape decision is one `sam` family page)

Sections to extend (with bullets):
- **Motivation:** SAM v1 is image-only; real-world applications (AR/VR, robotics, autonomous vehicles, video editing) require temporal localisation. Videos introduce additional challenges: motion blur, occlusion, appearance change over time, lower per-frame quality, and the need to process arbitrarily long sequences efficiently.
- **Architecture.Family & shape:** Transformer-based encoder–decoder with streaming memory. Four modules: MAE pre-trained Hiera image encoder (hierarchical ViT), memory attention stack, SAM-compatible prompt encoder + mask decoder, lightweight memory encoder.
- **Architecture.Blocks:**
  - *Memory attention:* L transformer blocks; each block = self-attention on current-frame tokens → cross-attention to memory bank (spatial frame memories + object pointer vectors) → MLP.
  - *Memory bank:* FIFO queue of N recent unprompted frame memories + M prompted frame memories (spatial feature maps); plus a list of object pointer vectors (lightweight semantic summaries from mask decoder output tokens).
  - *Memory encoder:* lightweight convolutional network that downsamples the predicted mask and sums it element-wise with the image encoder embedding, then applies convolutional fusion layers to produce the memory entry.
  - *Video-as-image-sequence:* video frames are consumed one at a time (streaming); image encoder runs once per frame; when memory is empty the model is identical to SAM v1.
- **Architecture.Training:**
  - Joint image + video training. 8-frame subsequences sampled per step; up to 2 frames randomly selected for interactive prompting; corrective clicks sampled from ground-truth masklet using model predictions during training.
  - SA-V dataset: 50.9K videos, 642.6K masklets (190.9K manually annotated + ~451.7K auto-generated), 35.5M masks total — 53× more masks than any prior VOS dataset (Table 3 / §5.2).
  - Three data engine phases: Phase 1 — SAM per frame (37.8 s/frame); Phase 2 — SAM 2 + tracking + annotator correction; Phase 3 — SAM 2 fully in the loop with reduced annotation time (4.5 s/frame, Table 1). Engine is 8.4× faster than model-assisted approaches at comparable quality (§5.1).
- **Assessment.Strengths:**
  - New capability: interactive video object segmentation with memory; no prior foundation model covered this.
  - Image segmentation: SAM 2 Hiera-B+ achieves 130.1 FPS vs SAM ViT-H 21.7 FPS — **~6× faster** with equal or better accuracy on SA-23 benchmark (Table 15, §6.2 / Appendix).
  - VOS (semi-supervised): SAM 2 (Hiera-L) achieves J&F = 77.2 (MOSE val), 91.6 (DAVIS 2017 val), 76.1 (LVOS val), 77.6 (SA-V test) — outperforming Cutie-base+ (71.7, 88.1, -, 62.8) and DEVA (Table 7).
  - Interactive video: 3× fewer interactions needed than prior approaches (Abstract) to achieve comparable accuracy.
  - Zero-shot generalisation: 17 video segmentation benchmarks + 37 image benchmarks evaluated (§6).
- **Assessment.Limitations:**
  - Fails across shot changes; loses track after long occlusion in extended videos; confuses similar-looking nearby objects.
  - Per-object processing without inter-object communication reduces efficiency when many objects are tracked simultaneously.
  - Fine-detail tracking on fast-moving thin structures (hair, rope) is inaccurate.
  - No explicit motion modeling — velocity or flow priors could help but are absent.
- **References:** cite ravi2024-sam2 for all v2 content.

## REFS:
- `ritm-interactive-segmentation` — RITM (Sofiiuk et al. 2022) cited as prior interactive segmentation work; SAM 2 training simulation follows similar iterative click protocol (§4 Training).
- `attention-mechanism` — memory attention uses self-attention + cross-attention; vanilla attention with efficient kernels (FlashAttention, Dao 2023) (§4 Memory attention).
- `convolutional-neural-network` — memory encoder uses convolutional layers for mask downsampling and feature fusion (§4 Memory encoder).
- `unet-segmentation` — FPN-style multiscale feature fusion in the mask decoder (Appendix C.1) echoes U-Net skip connections; Lin et al. 2017 FPN cited explicitly.
- `mask-rcnn` — Mask R-CNN's two-stage detect-then-segment paradigm forms historical context for instance segmentation; SAM 2 is interactive rather than fully automatic.

# Provenance

| Claim | Source |
|---|---|
| "6× faster than SAM (ViT-H)" on image segmentation | Abstract; confirmed in Table 15 (FPS: 21.7 vs 130.1) |
| "3× fewer interactions than prior approaches" in video segmentation | Abstract |
| SA-V: 50.9K videos, 642.6K masklets (190.9K manual + auto), 35.5M masks | §5.2 text; Table 3 row "SA-V Manual+Auto" |
| SA-V is 53× more masks than any prior VOS dataset (15× without auto) | §5.2 text; Table 3 caption |
| Data engine Phase 3 annotation time: 4.5 s/frame | Table 1 |
| Phase 1 annotation time: 37.8 s/frame (SAM per frame, no tracking) | §5.1 text |
| Data engine 8.4× faster than prior model-assisted approaches | §5.1 text |
| SA-V video statistics: 54% indoor / 46% outdoor, avg 14 s duration | §5.2 text |
| SA-V disappearance rate: 42.5% (manual) | Table 3 |
| >88% of SA-V masks have normalised mask area < 0.1 | §5.2 text |
| Training: 8-frame subsequences, ≤2 prompted frames, p=0.5 GT mask / p=0.25 click / p=0.25 box | §4 Training |
| Memory bank: FIFO queue of N recent frames + M prompted frames | §4 Memory bank |
| Memory attention: L transformer blocks, self-attn → cross-attn to memory bank → MLP | §4 Memory attention |
| Image encoder: MAE pre-trained Hiera (Ryali et al. 2023; Bolya et al. 2023) | §4 Image encoder |
| VOS benchmark SAM 2 (Hiera-L): MOSE val 77.2, DAVIS 2017 val 91.6, LVOS val 76.1, SA-V test 77.6 (J&F) | Table 7 |
| VOS benchmark SAM 2 (Hiera-B+): MOSE val 75.8, DAVIS 2017 val 90.9 (J&F) | Table 7 |
| Image benchmark SAM 2 Hiera-B+ SA-23 1-click mIoU: 58.9 (SA-1B), 61.9 (our mix) | Table 15 |
| Image benchmark SAM 2 Hiera-L SA-23 1-click mIoU: 60.0 (SA-1B), 63.5 (our mix) | Table 15 |
| SAM (ViT-H) SA-23 1-click mIoU: 58.1; FPS: 21.7 | Table 15 |
| Limitations: shot changes, long occlusions, crowded similar objects, thin fast-moving objects | Appendix B |
| Multiple objects processed independently without inter-object communication | Appendix B |
| FPN used to fuse stride-16 and stride-32 features from Hiera stages 3 & 4 | Appendix C.1 |
| Zero-shot evaluation: 17 video segmentation + 37 image segmentation benchmarks | §6 intro |
