---
paper_id: chen2022-focalclick
title: "FocalClick: Towards Practical Interactive Image Segmentation"
authors: ["X. Chen", "Z. Zhao", "Y. Zhang", "M. Duan", "D. Qi", "H. Zhao"]
year: 2022
url: https://arxiv.org/pdf/2204.02574
created: 2026-05-28
relevant_atlas_pages: [ritm-interactive-segmentation, sam, mobilesam, hrnet]
---

# Setting

**Problem class.** Click-based interactive image segmentation — a user-in-the-loop binary segmentation task where positive and negative clicks define foreground and background. FocalClick specifically addresses two practical gaps that prior work left open: (a) running on low-power devices (CPU laptops, edge hardware, high-volume web services) and (b) refining externally provided, preexisting masks without destroying already-correct regions.

**Inputs.** An RGB image; a history of positive click locations encoded as binary disk maps (radius 2 pixels); a history of negative click locations encoded similarly; and optionally a preexisting binary mask from an upstream model or manual tool. All four are concatenated and passed into the pipeline.

**Outputs.** A refined binary foreground mask for a single target object.

**Key constraints addressed.** Prior full-image inference methods require 400–600 px inputs and use backbones with 30–50 M parameters, making them slow on CPUs (>1 second per click). FocalClick targets two lightweight operating points: S1 (128×128 Segmentor input, for edge devices / browser plugins) and S2 (256×256 Segmentor input, for CPU laptops). It also explicitly models the *Interactive Mask Correction* sub-task — correcting an existing mask while preserving well-segmented regions — for which no prior benchmark or algorithmic solution existed.

# Core idea

FocalClick replaces the expensive whole-image forward pass with a two-stage local inference pipeline triggered by each user click. First, a **Target Crop** (TC) is formed around the bounding box of the previous mask union the new click, expanded by factor $r_{TC} = 1.4$; this crop is downsampled to a small resolution (128×128 or 256×256) and passed through a Segmentor (HRNet+OCR or SegFormer) to produce a coarse mask. Second, a **Focus Crop** (FC) is located by XOR-ing the coarse prediction against the previous mask to form a Difference Mask $M_{xor}$, taking the largest connected component of $M_{xor}$ that contains the new click, and expanding its bounding box by $r_{FC} = 1.4$; a lightweight Refiner then processes this zoom-in patch using RoiAlign-cropped features from the Segmentor plus low-level Xception convolution features to produce a refined output via

$$M_r = \mathrm{Sigmoid}(M_b) \cdot M_d + (1 - \mathrm{Sigmoid}(M_b)) \cdot M_l \tag{1}$$

where $M_b$ is a predicted boundary map, $M_d$ is a predicted detail map, and $M_l$ is the coarse logit RoiAligned into the Focus Crop. **Progressive Merge** (PM) then composites the local refined prediction back onto the global mask: only the largest connected region of the difference between the new binarized (threshold 0.5) prediction and the prior mask that contains the new click is written; all other pixels retain the prior mask. This design means each click refines only a small local patch while the cumulative mask remains globally consistent across rounds.

# Assumptions

1. **(Hard) Single-object, click-guided target.** Each inference round assumes exactly one target object is being refined. Multi-object concurrent annotation is not modelled; each object requires its own click sequence.

2. **(Hard) Click locates the intended change region.** Focus Crop selection uses the largest connected component of $M_{xor}$ that contains the new click. If the click lands outside the changed region (e.g., placed for global context), the Focus Crop may be mislocated and refinement will be applied to the wrong area.

3. **(Hard) Object fits within a single connected crop.** Progressive Merge picks the single max connected region of $M_{xor}$. When a user click targets a region that is structurally disjoint from the largest changed area (e.g., tiny satellite foreground far from the main blob), only the largest component is updated.

4. **(Soft) Object is at moderate scale in the image.** Performance degrades on very small objects (sub-1% image area) because the Focus Crop may not contain sufficient pixel context for the Refiner at the sizes used.

5. **(Soft) Preexisting mask IoU is between 75% and 85%.** The Progressive Merge mode was designed and benchmarked for this quality range (DAVIS-585 benchmark design). Masks with IoU below 75% may be wholesale discarded by annotators, and very high-quality masks (>85%) may not require correction.

6. **(Soft) Iterative training click simulation matches test distribution.** The model is trained with the iterative training strategy from RITM; mismatch between training click patterns and real user behavior is a universal assumption for this problem class.

# Failure regime

- **Tiny structures.** FocalClick-B3-S2 fails to annotate thin structures (e.g., a parachute rope) within 20 clicks; the best available correction is manual brush zoom-in. Quantitatively, row 5 in Fig. 5 shows 20-click IoU of only 23.7% on such a case.
- **Multi-region edits.** Progressive Merge applies at most one connected update region per click. When a user click is intended to simultaneously modify spatially disjoint foreground regions, only the largest connected change component is written; the secondary regions are silently ignored.
- **Correct-region destruction under dense clicks from scratch.** Progressive Merge is not active until click 10 when annotating from scratch. In the first 10 clicks, the model behaves like a standard global predictor and can overwrite well-annotated details.
- **Large 4K images.** Image loading, zoom, and visualization overhead becomes the latency bottleneck at 4K resolution; FocalClick's computation savings are masked by I/O and display costs.
- **Boundary-heavy errors in preexisting masks.** The DAVIS-585 benchmark assigns boundary errors a probability of 0.65; internal TN errors at 0.10 probability are the rarest failure mode, and the network was tuned against the boundary-error distribution. Masks dominated by large interior false-negatives may be harder to correct than the benchmark suggests.

# Numerical sensitivity

**FLOPs and parameters (Table 3):**
- B0-S1: Segmentor 3.72 MB params, 0.43 G FLOPs; Refiner 0.016 MB params, 0.17 G FLOPs. Seg inference 41 ms, Ref inference 59 ms on a 2.4 GHz 4×Intel Core i5 CPU laptop.
- B0-S2: Segmentor 3.72 MB, 1.77 G FLOPs; Refiner 0.016 MB, 0.17 G FLOPs. Seg 140 ms, Ref 60 ms.
- B3-S2: Segmentor 45.6 MB, 12.72 G FLOPs; Refiner 0.025 MB, 0.20 G FLOPs. Seg 634 ms, Ref 72 ms.
- hrnet18s-S1: Segmentor 4.22 MB, 0.91 G FLOPs; Refiner 0.011 MB, 0.15 G FLOPs. Seg 80 ms, Ref 50 ms.
- hrnet18s-S2: Segmentor 4.22 MB, 3.66 G FLOPs; Refiner 0.011 MB, 0.16 G FLOPs. Seg 213 ms, Ref 51 ms.
- hrnet32-S2: Segmentor 30.95 MB, 16.92 G FLOPs; Refiner 0.025 MB, 0.20 G FLOPs. Seg 650 ms, Ref 51 ms.
- B0-S1 is 15× smaller FLOPs than the lightest RITM (hrnet18s-400, 8.96 G FLOPs) and 360× smaller than FCANet (resnet101-512, 216.55 G FLOPs + 58 ms refiner).

**Crop expansion ratios.** $r_{TC} = r_{FC} = 1.4$ (default, following f-BRS and RITM). Table 7 shows robustness: varying ratios from 1.2 to 1.8 changes NoC80 by ≤0.3 clicks; the last row (no Focus Crop) degrades NoC80 from ~5.1 to ~5.5–6.6, confirming FC is the larger contributor.

**Crop area statistics (Table 6):** Focus Crop covers on average 8.76% (DAVIS-585) to 54.15% (GrabCut) of the full image area; Target Crop covers 28.93% (DAVIS-585) to 89.34% (GrabCut). The small Focus Crop fraction on diverse benchmarks explains the efficiency gain.

**Training scale.** Segmentor and Refiner are trained end-to-end. Training crops: Segmentor input simulated as 256×256 random crops; Focus Crop simulated as random local crops with size 0.2–0.5 of the object length, with random expansion 1.1–2.0. Max positive/negative clicks: 24, with probability decay 0.8.

**Optimizer.** Adam, $\beta_1 = 0.9$, $\beta_2 = 0.999$, initial lr $5 \times 10^{-4}$, reduced ×10 at epochs 190 and 220, trained for 230 epochs (1 epoch = 30 000 images). Training on 2 V100 GPUs with batch size 32 (~24 hours).

**Boundary weight in loss.** $L_{bnfl}$ applies boundary weight 1.5 on the NFL loss for the refined prediction. Total loss: $L = L_{bce} + L_{nfl} + L_{bnfl}$ (Eq. 2).

**Binarization threshold.** Progressive Merge uses threshold 0.5 to binarize the new prediction before morphological analysis.

**Click representation.** Binary disks with radius 2 pixels (Fig. 3 caption).

**Minimum mask size filter.** DAVIS-585 filters out masks under 300 pixels.

**DAVIS-585 IOU range.** Simulated initial masks have IoU between 75% and 85% by construction (Algorithm 1: maxIOU=0.85, minIOU=0.75). Error type probability: boundary 0.65, external FP 0.25, internal TN 0.10.

# Applicability

- **Use when:** annotating/correcting object masks on CPU or edge devices where per-click latency must be under 300 ms; refining preexisting masks from another segmentation tool while preserving correct detail; annotation pipelines that mix intelligent segmentation with manual brush/polygon tools and need clean transitions.
- **Don't use when:** the target structure is tiny or filamentary (e.g., hair, wires, parachute ropes) and requires extreme boundary precision; the use case demands simultaneous multi-object mask refinement in one click; 4K image annotation without a tiling strategy.
- **Compared against:** RITM (hrnet18s, hrnet32), f-BRS-B (resnet50, hrnet32), EdgeFlow-hrnet18, CDNet-resnet50, 99%AccuracyNet, FCANet (SIS). On the DAVIS-585 mask-correction benchmark, FocalClick-hrnet18s-S1 achieves NoC85=2.72 (vs RITM-hrnet18s 3.71) and NoC90=3.82 (vs RITM-hrnet18s 5.96) starting from initial masks; FocalClick-B3-S2 achieves NoC85=2.00, NoC90=2.76. On the standard DAVIS benchmark from scratch, FocalClick-segformerB3-S2 trained on Large Dataset achieves NoC85=2.92, NoC90=4.52.

# Connections

- **Builds on:** sofiiuk2021-ritm (RITM iterative training protocol, normalized focal loss, previous-mask-as-input design, target-crop strategy — FocalClick follows RITM's feature-fusion approach of two conv layers after stem layers); wang2020-hrnet (HRNet backbone for the Segmentor in hrnet18s/hrnet32 variants); xie2021-segformer (SegFormer backbone for B0/B3 Segmentor variants); jang2019-brs, sofiiuk2020-fbrs (prior interactive seg baselines); chollet2017-xception (Xception depthwise convs used in the Refiner)
- **Enables:** downstream annotation pipelines that interleave FocalClick with manual tools; the DAVIS-585 benchmark for interactive mask correction evaluation
- **Refutes / supersedes:** the assumption that interactive segmentation must process the full image uniformly on every click; the claim that preexisting masks cannot be preserved during click-based refinement

# Atlas update plan

## NEW: focalclick

Type: model
Category: deep-learning model for interactive segmentation
Primary source: chen2022-focalclick

**Motivation.** Two practical gaps in click-based interactive segmentation: (1) SOTA methods require large backbones and high-resolution full-image passes, making them too slow for CPU laptops and edge devices; (2) no method could reliably refine a preexisting mask without overwriting correctly-annotated regions. FocalClick addresses both by restricting all inference to small local crops and introducing a morphological compositing step.

**Architecture.**
- Input: RGB image + positive-click binary disk map (radius 2) + negative-click binary disk map + optional previous mask; all four channels passed into each inference stage.
- Stage 1 — Segmentor: any encoder–decoder (HRNet18s+OCR, HRNet32+OCR, SegFormer-B0, SegFormer-B3) operating on the Target Crop resized to 128×128 (S1) or 256×256 (S2). Click maps fused after stem layers via two conv layers (following RITM).
- Stage 2 — Refiner: lightweight module (~0.011–0.025 MB params) using Xception depthwise convs on the cropped image plus RoiAlign-cropped Segmentor features. Two heads predict a Detail Map $M_d$ and Boundary Map $M_b$; refined logits are $M_r = \sigma(M_b) M_d + (1 - \sigma(M_b)) M_l$.
- Progressive Merge: morphological compositing step that writes only the largest connected update region containing the new click; all other pixels inherit the prior mask.

**Training.**
- Dataset: COCO+LVIS (primary), SBD (secondary), Large Dataset (ablation upper bound). Iterative click simulation following RITM. Max 24 positive + 24 negative clicks per sample, probability decay 0.8.
- Loss: $L = L_{bce} + L_{nfl} + L_{bnfl}$ (BCE on boundary head; normalized focal loss on coarse head; boundary-weighted NFL on refined head with weight 1.5).
- Optimizer: Adam ($\beta_1=0.9$, $\beta_2=0.999$), lr $5\times10^{-4}$, decay ×10 at epochs 190 and 220, 230 epochs total. Batch 32, 2×V100, ~24 h.

**Performance.**
- From initial masks on DAVIS-585: hrnet18s-S1 NoC85=2.72, NoC90=3.82; hrnet32-S2 NoC85=2.32, NoC90=3.09; segformerB3-S2 NoC85=2.00, NoC90=2.76 (Table 4). RITM-hrnet32 baseline: NoC85=3.68, NoC90=5.57.
- Standard DAVIS (from scratch, COCO+LVIS): hrnet18s-S2 NoC85=3.90, NoC90=5.25; segformerB3-S2 NoC85=3.61, NoC90=4.90 (Table 2).
- Efficiency: B0-S1 uses 0.43+0.17=0.60 G FLOPs total (Segmentor+Refiner), 15× lower than lightest RITM competitor (Table 3). Refiner adds only 0.011–0.025 MB params.

**Implementations.** Open-source code released at https://github.com/XavierCHEN34/ClickSEG (noted in abstract). License not stated in the paper; verify before use.

**Assessment.** FocalClick's primary contribution is a deployability improvement over RITM: smaller FLOPs without large accuracy loss and genuine preexisting-mask compatibility. The Progressive Merge mechanism is simple and parameter-free. The main weakness is the single-connected-component assumption in Focus Crop and Progressive Merge, which fails on spatially disjoint or tiny targets. The DAVIS-585 benchmark is a useful contribution for future comparison.

**References.** chen2022-focalclick (primary); sofiiuk2021-ritm; wang2020-hrnet; xie2021-segformer.

**Relations:**
- Inverse of `extended_by` authored on RITM's page: `{ type: extended_by, target: focalclick, confidence: high, caution: "FocalClick adds Focus View + Progressive Merge for CPU-feasible mask correction; RITM remains the foundational feedforward click-based reference." }` — this edge is authored ON `ritm-interactive-segmentation`; the FocalClick page sees the reverse bucket automatically.

---

## UPDATE: ritm-interactive-segmentation

Section: Relations

Bullet: Add `{ type: extended_by, target: focalclick, confidence: high, caution: "FocalClick adds Focus View + Progressive Merge for CPU-feasible mask correction; RITM remains the foundational feedforward click-based reference." }` to RITM's `relations[]`. FocalClick directly inherits RITM's iterative training protocol, normalized focal loss, previous-mask-as-input design, and target-crop strategy, then extends the pipeline with a second local-refinement stage and Progressive Merge compositing.

---

## UPDATE: sam

Section: References / Remarks

Bullet: FocalClick (CVPR 2022, chen2022-focalclick) represents the practical lightweight end of click-based interactive segmentation — specialized small networks (0.43–12.72 G FLOPs, sub-300 ms on CPU) designed for mask correction workflows. SAM (2023) takes the opposite design point: a large promptable foundation model (~635 M params) with zero-shot generalization via point, box, or mask prompts but requiring GPU for real-time use. Readers comparing paradigms should note: FocalClick requires iterative-training fine-tuning per domain and cannot zero-shot generalize, while SAM cannot natively incorporate a prior mask for correction. Neither supersedes the other.

---

## UPDATE: mobilesam

Section: References / Remarks

Bullet: FocalClick (chen2022-focalclick) and MobileSAM share the motivation of lightweight, on-device interactive segmentation, but differ in approach and lineage. FocalClick is a small specialized network (~4–46 MB Segmentor + ~0.01–0.025 MB Refiner) trained for click-based mask correction via two-stage local inference; it does not generalize zero-shot. MobileSAM distils SAM's ViT-H image encoder into ViT-Tiny while preserving the SAM mask decoder, enabling zero-shot segment-anything with a 60× faster encoder. FocalClick is preferable when precise iterative mask correction from preexisting masks is needed on CPUs without GPU; MobileSAM is preferable when zero-shot versatility and promptable segmentation matter on mobile hardware.

---

## UPDATE: hrnet

Section: Where it appears

Bullet: FocalClick (chen2022-focalclick, CVPR 2022) uses HRNet18s+OCR and HRNet32+OCR as the Segmentor backbone in its hrnet18s-S1, hrnet18s-S2, and hrnet32-S2 model variants. The Segmentor operates on small crops (128×128 or 256×256), making HRNet practical for CPU deployment; hrnet18s-S2 achieves 213 ms per Segmentor call on a 2.4 GHz i5 laptop. SegFormer-B0/B3 variants are also provided as alternatives to HRNet for the Segmentor.

# Provenance

- **Abstract (HTML line 66–70 / TXT lines 13–42):** Problem statement (efficiency on low-power devices; working with preexisting masks); two contributions (Focus View pipeline; Progressive Merge); GitHub URL `github.com/XavierCHEN34/ClickSEG`.
- **Sec. 3.1 / HTML §S3.SS1 / TXT lines 160–213:** $r_{TC} = 1.4$ (Target Crop expansion ratio); $r_{FC} = 1.4$ (Focus Crop expansion ratio); binary disk radius 2 (Fig. 3 caption); Xception convs in Refiner; Eq. 1 ($M_r = \sigma(M_b)M_d + (1-\sigma(M_b))M_l$); Eq. 2 ($L = L_{bce}+L_{nfl}+L_{bnfl}$); boundary weight 1.5 on $L_{bnfl}$; Progressive Merge threshold 0.5; Progressive Merge activated after 10 clicks from scratch.
- **Sec. 4.1 (TXT lines 286–318 / Table 1):** S1 Segmentor input 128×128, S2 Segmentor input 256×256, Refiner input 256×256 for both. Training: Adam $\beta_1=0.9$, $\beta_2=0.999$; lr $5\times10^{-4}$; decay at epochs 190 and 220; 230 epochs; epoch = 30 000 images; batch 32; 2×V100; ~24 h. Training crops: 256×256 for Segmentor simulation, 0.2–0.5 object length for Focus Crop, random expansion 1.1–2.0. Max clicks 24, probability decay 0.8.
- **Table 3 (TXT lines 360–382):** All FLOPs/params/speed numbers for B0-S1/S2, B3-S2, hrnet18s-S1/S2, hrnet32-S2 and SOTA baselines; CPU speed measured on 2.4 GHz 4×Intel Core i5. "B0-S1 is 15 times smaller than lightest RITM, 360 times smaller than FCANet" (TXT line 299–301).
- **Table 2 (TXT lines 322–353):** NoC85/90 on GrabCut/Berkeley/SBD/DAVIS for all FocalClick variants and baselines.
- **Table 4 (TXT lines 395–407):** NoC85/90/95 and NoF on DAVIS-585 from initial mask and from scratch for FocalClick variants and RITM baselines.
- **Table 5 (TXT lines 410–422):** Ablation (TC, FC, PM components) on DAVIS and DAVIS-585; Naive-B0-S1 baseline NoC85=10.70 on DAVIS; full FocalClick-B0-S1 NoC85=5.13.
- **Table 6 (TXT lines 428–435):** Focus Crop ratio to image: 8.76% (DAVIS-585), 54.15% (GrabCut); Target Crop ratio: 28.93% (DAVIS-585), 89.34% (GrabCut).
- **Table 7 (TXT lines 410–433):** Sensitivity of crop ratios 1.2–1.8; without FC: NoC80 ~5.56–6.56; without TC: ~6.19–10.70.
- **Sec. 3.2 (TXT lines 218–256 / HTML §S3.SS2):** DAVIS-585 benchmark: 30 videos × 10 images = 300 frames, 585 samples after filtering masks <300 px; initial mask IoU range 75%–85%; defect type probabilities [0.65, 0.25, 0.10] for boundary/external FP/internal TN.
- **Sec. 5 (TXT lines 487–511):** Failure cases: tiny structures (parachute rope, Fig. 5 row 5, 20-click IoU 23.7%); 4K image loading bottleneck.
- **Fig. 5 qualitative (TXT lines 462–483):** Selected IoU values: row 1 (1-click 92.1%, 3-click 95.2%); row 3 (initial 81.3%, 1-click 85.9%, 3-click 98.5%); row 5 (initial 75.6%, 1-click 70.1%, 20-click 23.7%).
