---
paper_id: robinson2025-rf-detr
title: "RF-DETR: Neural Architecture Search for Real-Time Detection Transformers"
authors: ["I. Robinson", "P. Robicheaux", "M. Popov", "D. Ramanan", "N. Peri"]
year: 2025
url: https://arxiv.org/pdf/2511.09554
created: 2026-05-29
relevant_atlas_pages: [detr, vit, mnasnet, yolo-v1]
---

# Setting

**Problem class.** Closed-vocabulary (specialist) real-time object detection and instance segmentation that transfers reliably to out-of-distribution real-world domains without hand-tuned learning-rate or augmentation schedulers.

**Inputs.** RGB images at variable resolution (320–960 px on the short side during training; any resolution reachable by bilinear positional-embedding interpolation at inference). No domain-specific preprocessing beyond horizontal flip and random crop.

**Outputs.** Axis-aligned bounding boxes with class scores (detection) and binary instance masks (segmentation variant). End-to-end set prediction: no non-maximum suppression required. Each inference call selects one operating point on a pre-computed accuracy-latency Pareto curve, returning up to $Q$ detections where $Q \in \{50, 100, 200, 300\}$ is chosen at inference time without retraining.

**Hardware target.** NVIDIA T4 GPU, TensorRT 10.4, CUDA 12.4, FP-16 inference (accuracy verified with the same FP-16 artifact). Latency ceiling: $\leq 40$ ms for real-time designation.

# Core idea

RF-DETR modernises LW-DETR (Chen et al., 2024a) by replacing its CAEv2 ViT backbone with a DINOv2 self-supervised ViT and applying end-to-end weight-sharing neural architecture search (NAS). A single base network is fully trained on the target dataset once. At every training iteration a random sub-network configuration is sampled uniformly from the search space and a gradient update is performed — training thousands of sub-nets in parallel without separate retraining per configuration. This is inspired by OFA (Cai et al., 2019) but is the first end-to-end application to object detection and segmentation. Once training is complete, 6,468 sub-network configurations are evaluated by grid search on the validation set to find the accuracy-latency Pareto frontier; no additional training is needed. The five tunable knobs are: (a) image resolution, (b) ViT patch size (FlexiVIT-style interpolation), (c) number of decoder layers (each supervised independently, so the decoder can be truncated at inference), (d) number of query tokens (lowest-confidence queries dropped at test time), and (e) number of windowed attention blocks per encoder layer. Architecture augmentation — the diversity of configurations seen during training — acts as a regularizer, improving generalisation to out-of-distribution datasets.

# Assumptions

1. **Pre-trained ViT backbone available.** RF-DETR requires a DINOv2 ViT checkpoint (ViT-S or ViT-B) as initialisation; performance degrades substantially if trained from scratch on small datasets.
2. **Target dataset is labeled (closed-vocabulary).** The NAS search is supervised by standard detection loss on the target validation set; open-vocabulary generalization is not the goal.
3. **GPU with TensorRT support at inference.** Latency figures and Pareto curves are measured on NVIDIA T4 with TensorRT; CPU or mobile latency is not characterised.
4. **CUDA graphs applicable.** RF-DETR's latency advantage relies on TensorRT CUDA-graph pre-queuing of kernels, which benefits transformer-style models (RT-DETR, LW-DETR, RF-DETR) but not all architectures.
5. **Soft:** Dataset characteristics loosely correlate with optimal tunable knobs (e.g. objects-per-image with query count, spatial density with window count) but the relationship is noisy; NAS grid search finds the optimal configuration without requiring strong priors.
6. **Hard:** Positional embeddings are pre-allocated for the largest resolution divided by the smallest patch size; extremely large resolutions or extremely small patch sizes outside the training range may produce degraded positional encoding interpolation.

# Failure regime

- **COCO overfitting of baseline architectures.** Prior specialist detectors (YOLOv8, D-FINE) tune learning-rate schedulers, augmentation schedules, and architecture choices to maximise COCO val performance; on RF100-VL, D-FINE underperforms RT-DETR (on which it is built), suggesting hyperparameter overfitting. RF-DETR mitigates this via scheduler-free training (cosine schedule dropped) and minimal augmentation.
- **Power throttling in latency measurement.** GPU overheating causes latency variance and makes published numbers from different papers non-comparable. A 200 ms buffer between forward passes is required for reproducible measurements; without it, YOLOv8 (M) latency drops from 14.8 ms (buffered FP-32) to 5.86 ms (unbuffered, as originally reported).
- **Naive FP-16 quantisation.** D-FINE drops from 55.1 AP to 0.5 AP under naive FP-16 quantisation; fixed by exporting with ONNX opset 17. YOLOv8 and YOLOv11 show 2–3 AP drops under FP-16. RF-DETR is verified to be robust to FP-16 across model sizes.
- **NAS fine-tuning on COCO provides negligible benefit.** Post-NAS fine-tuning without architecture augmentation leads to mild overfitting on COCO (gains < 0.4 AP for N/S/M sizes). On RF100-VL small datasets ($< 100$ epochs to convergence), fine-tuning after NAS provides 0.4–0.8 AP gains.
- **Class-token duplication for windowed attention.** DINOv2's class token must be duplicated for each window; scaling to 4 windows reduces runtime efficiency, so RF-DETR (N/S/M) uses 2 windows — unlike LW-DETR which benefits from 4 windows with its class-token-free CAEv2 backbone.
- **DINOv2-S backbone scaling ceiling.** DINOv2-S RF-DETR surpasses D-FINE at small sizes (+2.3 AP for S) but falls behind at L and XL ($-0.4$, $-1.1$ AP gap). DINOv2-B scales better and RF-DETR (2XL, DINOv2-B) exceeds D-FINE by 0.8 AP on COCO at 60.1 AP.

# Numerical sensitivity

- **Latency variance.** TensorRT compilation is non-deterministic; latency variance is $\leq 0.1$ ms per run, so results are reported to one decimal place only.
- **Patch-size interpolation generalises.** Unseen patch sizes (e.g. 27, 18) track the seen Pareto frontier closely — RF-DETR inherits FlexiVIT-style patch interpolation robustness. For RF-DETR-Seg this does not hold: segmentation features are upsampled to $\frac{1}{4}$ of input resolution, so patch size and resolution jointly determine segmentation feature resolution.
- **Positional embedding interpolation.** $N$ positional embeddings are pre-allocated at largest resolution / smallest patch size; bilinear interpolation covers smaller resolutions or larger patch sizes.
- **Learning rate.** $1 \times 10^{-4}$ (vs. $4 \times 10^{-4}$ in LW-DETR); lower rate preserves DINOv2 pre-trained features. Per-layer multiplicative decay of 0.8 applied to backbone layers.
- **Gradient clipping.** All gradients clipped at 0.1.
- **Spatial locations vs. resolution.** RF-DETR performance correlates with total spatial locations $= \lfloor H / p \rfloor \times \lfloor W / p \rfloor$ rather than resolution $H \times W$ or patch size $p$ independently; models with equal spatial locations but different $(H, p)$ pairs achieve nearly identical mAP.

# Applicability

- **Use when:** you need a single training run that delivers a continuous accuracy-latency Pareto frontier of specialist detectors for a new domain; dataset is labeled; target hardware supports TensorRT; you want to avoid hand-tuning a separate model per latency budget.
- **Use when:** domain is out-of-distribution relative to COCO (e.g. aerial, medical, industrial), where COCO-tuned architectures like YOLOv8 or D-FINE degrade noticeably.
- **Use when:** an instance segmentation variant is needed at similar latency — RF-DETR-Seg (N) at 3.4 ms outperforms YOLOv11 (M-Seg) at 6.9 ms.
- **Don't use when:** a full open-vocabulary or zero-shot detector is required (use GroundingDINO or YOLO-World at the cost of ~20x higher latency).
- **Don't use when:** inference hardware lacks TensorRT (published latency numbers are not transferable to CPU or mobile).
- **Compared against:** D-FINE (nano) — RF-DETR (N) wins by 5.3 AP on COCO at comparable latency (2.3 ms vs 2.1 ms); LW-DETR (T) — RF-DETR (N) wins by >5 AP; GroundingDINO (T) — RF-DETR (2XL) wins by 1.2 AP on RF100-VL while running ~20x faster (15.6 ms vs 309.9 ms PyTorch); YOLOv8/YOLOv11 (M) — RF-DETR (N) matches their mAP at half the latency.

# Connections

- Builds on: LW-DETR (Chen et al., 2024a), DINOv2 (Oquab et al., 2023), OFA weight-sharing NAS (Cai et al., 2019), FlexiVIT patch interpolation (Beyer et al., 2023), DETR set prediction (Carion et al., 2020), Deformable DETR cross-attention (Zhu et al., 2020), RT-DETR real-time DETR framework (Zhao et al., 2024)
- Enables: RF100-VL domain-transfer benchmarking (Robicheaux et al., 2025); future end-to-end NAS for segmentation and other dense prediction tasks
- Refutes / supersedes: LW-DETR on COCO and RF100-VL at all matched latencies (RF-DETR (N) beats LW-DETR (T) by >5 AP; RF-DETR (M) beats LW-DETR (M) by 2.1 AP at equal 4.4 ms)

# Atlas update plan

## NEW: rf-detr
Type: model
Domain: detection    (arch_family: hybrid — DINOv2/ViT backbone + DETR-style transformer decoder; tasks: match the detr page's convention, the page author will verify)
Primary source: this paper (robinson2025-rf-detr)
Prerequisites: (suggest) attention-mechanism, convolutional-neural-network  (page author verifies slugs)

Relations (feeds_into authored ON THE ANTECEDENT pages — A->B, chronology A<=B holds; applied when the rf-detr page is authored):
- { type: feeds_into, target: rf-detr, confidence: high, caution: "RF-DETR is a DETR-family set-prediction detector; built on the DETR paradigm via its parents LW-DETR/Deformable-DETR." }   [author on the detr page]
- { type: feeds_into, target: rf-detr, confidence: medium, caution: "RF-DETR's backbone is a DINOv2 self-supervised ViT." }   [author on the vit page]

Explicitly NOT linked (record as rationale, do NOT create edges): mnasnet (RF-DETR's weight-sharing NAS differs from MnasNet's RL-reward NAS — different method; express shared 'NAS' lineage via a future concept page, not a feeds_into edge); yolo-v1 (RF-DETR competes with modern real-time detectors like D-FINE / modern YOLO, not the 2016 original — no edge).

**Motivation.** Specialist detectors (D-FINE, YOLOv8) overfit to COCO via bespoke schedules and augmentations, generalising poorly to RF100-VL domains (aerial, medical, industrial). Open-vocabulary VLMs (GroundingDINO) generalise but are ~20x slower. RF-DETR closes this gap by combining DINOv2 internet-scale pre-training with end-to-end weight-sharing NAS, yielding a single training run that covers all latency budgets ≤40 ms while outperforming VLMs on out-of-distribution detection.

**Architecture.** LW-DETR-style encoder-decoder with DINOv2 ViT backbone (ViT-S or ViT-B, 12 encoder layers, patch size 14 default but searched); windowed + non-windowed attention blocks interleaved in the encoder (blocks {0,1,3,4,6,7,9,10} are windowed); bilinear multi-scale projector (layer norm, not batch norm, for consumer-GPU compatibility); deformable cross-attention decoder with up to 6 layers; 300 object queries (default); detection head (class + box per decoder layer); optional lightweight instance segmentation head (pixel embedding map at $\frac{1}{4}$ input resolution, dot product with query token embeddings). Training uses Objects-365 pre-training (pseudo-labeled with SAM2 for segmentation). Weight-sharing NAS samples one configuration per training step uniformly across 11 resolutions × 7 patch sizes × 6 decoder-layer depths × 3 window counts × 1 query count = training grid; inference grid extends to 7 decoder depths × 4 query counts, evaluating 6,468 configurations total.

**NAS tunable knobs** (Section 3, Figure 3):
- Patch size: searched over {8, 10, 12, 16, 20, 24, 32}; FlexiVIT bilinear interpolation of patch embeddings; smaller patch → higher accuracy, higher latency.
- Number of decoder layers: {0, 1, 2, 3, 4, 5, 6}; each layer supervised at training time; decoder can be dropped entirely at inference (resembles single-stage detector without NMS, -10% latency at -2 mAP).
- Number of query tokens: {50, 100, 200, 300}; queries dropped by ascending confidence of encoder output logit — no retraining required.
- Image resolution: {320, 384, 448, 512, 576, 640, 704, 768, 832, 896, 960}; positional embeddings pre-allocated and interpolated.
- Number of windows per windowed attention block: {1, 2, 4}; correlates with spatial density of target dataset.

**Implementations.** Official Roboflow repo: https://github.com/roboflow/rf-detr (license: verify on the page). Code includes stand-alone TensorRT latency benchmarking tool. Training and inference code released publicly.

**Assessment.**
- Novelty: first end-to-end weight-sharing NAS for object detection and segmentation; first real-time detector to exceed 60 AP on COCO (RF-DETR (2XL): 60.1 AP, 17.2 ms); architecture augmentation as regularizer is an emergent benefit of the NAS training procedure.
- Strengths: single training run yields continuous Pareto curve covering N/S/M/L/XL/2XL/Max sizes; strong OOD generalization (63.5 AP on RF100-VL vs 62.3 for GroundingDINO at ~20x lower latency); scheduler-free training (no cosine warmup, no COCO-tuned augmentation schedules); interpolates gracefully to unseen patch sizes and resolutions.
- Limitations: larger backbone sizes (DINOv2-B) needed for COCO XL/2XL parity; DINOv2-S backbone does not scale as well as D-FINE's hand-designed backbone at large sizes; ~2-4x training cost vs. non-NAS baseline (estimated 10,000 GPU-hours on T4 for NAS search); latency measurements tied to TensorRT and GPU hardware — not transferable to CPU/mobile.

**References.** Robinson et al. (2025), arXiv 2511.09554 (ICLR 2026). LW-DETR (Chen et al., 2024a). DINOv2 (Oquab et al., 2023). OFA (Cai et al., 2019). DETR (Carion et al., 2020). FlexiVIT (Beyer et al., 2023). RT-DETR (Zhao et al., 2024). RF100-VL (Robicheaux et al., 2025). D-FINE (Peng et al., 2024).

# Provenance

1. **Abstract** (p. 1): weight-sharing NAS description; RF-DETR (nano) 48.0 AP on COCO, D-FINE (nano) gap of 5.3 AP; RF-DETR (2x-large) beats GroundingDINO (tiny) by 1.2 AP on RF100-VL while 20× faster; first real-time detector to surpass 60 AP on COCO.
2. **Section 1, para "Incorporating Internet-Scale Priors"** (p. 3–4): CAEv2 replaced by DINOv2; DINOv2 has 12 layers vs CAEv2 10 layers; layer norm instead of batch norm for consumer-GPU training.
3. **Section 3, "End-to-End Neural Architecture Search"** (p. 5): five tunable knobs enumerated with mechanism; 6,468 configurations; uniform sampling per training step; architecture augmentation as regularizer; no fine-tuning needed after NAS on COCO (reference to Appendix G).
4. **Section 3, Figure 3** (p. 5): NAS search space visual — patch size, decoder layers, query tokens, resolution, window count.
5. **Section 2 / Related Works** (p. 2–3): distinction between RF-DETR weight-sharing NAS (no reward signal; decoupled train-and-search inspired by OFA) vs. MnasNet/hardware-aware NAS (RL reward, must repeat per hardware platform); LW-DETR lineage; DETR/Deformable-DETR heritage.
6. **Table 1** (p. 7): standardized latency benchmarking; 200 ms buffer; RF-DETR (M) 54.7 AP at 4.4 ms (FP-16 buffered).
7. **Table 2** (p. 7): COCO detection results; RF-DETR (N): 30.5M params, 31.9 GFLOPs, 2.3 ms, 48.0 AP; D-FINE (N): 3.8M, 7.3 GFLOPs, 2.1 ms, 42.7 AP; RF-DETR (2XL): 126.9M, 438.4 GFLOPs, 17.2 ms, 60.1 AP.
8. **Table 4** (p. 8): RF100-VL results; RF-DETR (2XL): 123.5M, 410.2 GFLOPs, 15.6 ms, 63.3 AP; GroundingDINO (T): 173.0M, 1008.3 GFLOPs, 309.9 ms (PyTorch), 62.3 AP — gap: +1.0 AP for RF-DETR, ~20x faster; RF-DETR (2XL) w/ fine-tuning: 63.5 AP.
9. **Table 5** (p. 9): NAS ablation; DINOv2 backbone contributes +2% over CAEv2 baseline; weight-sharing NAS adds further +0.3% to 54.6 AP (M).
10. **Table 6** (p. 10): backbone ablation; DINOv2 ViT/S-14 achieves 54.3 AP, CAEv2 ViT/S-16 achieves 52.3 AP (gap 2.4%); SigLIPv2 ViT/B-32 only 50.4 AP despite larger size.
11. **Table 7 / Appendix A** (p. 15): Pareto-optimal COCO detection configurations per model size; all DINOv2-S (N/S/M/L) and DINOv2-B (XL/2XL/Max); inference evaluates 6,468 configs (11×7×7×3×4); training cost ~10,000 GPU-hours.
12. **Appendix B** (p. 16): query dropping mechanism — ordered by max sigmoid of class logit at encoder output; removing lowest-confidence 100 queries reduces latency modestly.
13. **Appendix F / Section 3** (p. 5, 18): sub-nets not seen during training still achieve high performance — generalisation to unseen patch sizes (patch 27, 18 at fixed resolution 640 achieve nearly identical mAP to Pareto-optimal family).
14. **Appendix G** (p. 19–20): fine-tuning after NAS on COCO provides ≤0.4 AP gain for N/S/M; fine-tuning on RF100-VL gives 0.4–0.8 AP for small datasets; larger models do not improve.
15. **Appendix I / Table 18** (p. 21–22): fixed-architecture transfer — COCO-optimised RF-DETR (L) architecture achieves best real-time performance on RF100-VL without dataset-specific NAS, validating robustness of the approach.
16. **Section 4, "Standardizing Latency Benchmarking"** (p. 6): D-FINE reported LW-DETR latency 25% faster than originally reported; attributed to GPU power throttling; 200 ms buffer standardises measurements; ONNX opset 17 fix for D-FINE FP-16 degradation (0.5 AP).
17. **Table 3** (p. 8): segmentation; RF-DETR-Seg (N) 40.3 AP at 3.4 ms vs FastInst (R50) 34.9 AP at 39.6 ms — beats by 5.4% while ~10x faster; RF-DETR-Seg (M) 45.3 AP at 5.9 ms vs MaskDINO (R50) 46.3 AP at 242 ms.
