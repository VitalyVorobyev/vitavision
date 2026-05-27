---
paper_id: carion2025-sam3
title: "SAM 3: Segment Anything with Concepts"
authors: ["N. Carion", "L. Gustafson", "Y. Hu", "S. Debnath", "R. Hu", "D. Suris", "C. K. Ryali", "K. V. Alwala", "H. Khedr", "A. C. Huang", "J. Lei", "T. Ma", "B. Guo", "A. Kalla", "M. D. Marks", "J. Greer", "M. Wang", "P. Sun", "R. Rädle", "T. Afouras", "E. Mavroudi", "K. Xu", "T. Wu", "Y. Zhou", "L. Momeni", "R. Hazra", "S. Ding", "S. Vaze", "F. Porcher", "L. Feng", "S. Li", "A. Kamath", "H. Cheng", "P. Dollár", "N. Ravi", "K. Saenko", "P. Zhang", "C. Feichtenhofer"]
year: 2025
url: https://arxiv.org/pdf/2511.16719
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

**Promptable Concept Segmentation (PCS)** — the core new task introduced by SAM 3.

- **Input:** an image or short video (≤30 s) plus one or more *concept prompts*. A concept prompt is either (a) a short noun phrase (NP) such as "yellow school bus" or "striped cat", (b) one or more image exemplars given as bounding boxes with positive/negative labels, or (c) both simultaneously. NPs are restricted to simple noun + optional modifiers; long referring expressions and reasoning-heavy queries are out of scope (but can be supplied via an MLLM wrapper).
- **Output:** instance segmentation masks and unique object identities for *all* instances matching the concept in every frame of the input. A semantic segmentation head predicts a per-pixel binary label (concept present/absent) as a side output.
- **Critical distinction from SAM 1/2 (Promptable Visual Segmentation, PVS):** PVS yields one object per prompt; PCS yields *all* instances matching a concept. (§1, Abstract)
- SAM 3 also fully retains PVS (point/box/mask prompts, single object), improving over SAM 2 on standard VOS benchmarks. (§6, "PVS" paragraph)

Preconditions: concept described by an atomic visual noun phrase (no compositional reasoning); input video ≤30 s; concept prompts must be internally consistent (mixing "fish" with a tail-only exemplar is undefined behavior). (§2)

# Core idea

SAM 3 extends SAM 2 with a DETR-based concept detector that shares a Perception Encoder (PE) backbone with the SAM 2 tracker. At a high level:

1. **Perception Encoder backbone** — a vision-language aligned encoder (Bolya et al. 2025, cited as "bolya2025PerceptionEncoder") that produces both image features and text embeddings in a shared space.
2. **Concept detector** — follows the DETR paradigm (Carion et al. 2020). Image tokens from PE and text tokens (noun phrase, encoded by PE) and exemplar tokens (encoded by a small exemplar encoder using position embedding + label embedding + ROI-pooled features) are fused via a cross-attention fusion encoder. A DETR-like decoder with learned object queries cross-attends to the conditioned image embedding. Each decoder layer predicts a binary classification logit (object matches concept?) and a bounding-box delta, following Deformable DETR. Box-region-positional bias (PlainDETR) focuses attention. Mask head adapted from MaskFormer. Training uses dual supervision from DAC-DETR + Align loss. (§3 "Detector Architecture")
3. **Presence token (novel)** — a dedicated learned global token that predicts `p(NP is present in input)` independently from the proposal queries. Each proposal query's score is multiplied by the presence score:

   `score(qᵢ) = p(qᵢ is a match | NP is present) × p(NP is present in input)` (§3 "Presence Token")

   This decouples recognition (global) from localization (local), and is especially effective when training with hard negative NPs that should suppress all detections.
4. **Video tracking** — inherits SAM 2's transformer encoder-decoder tracker with memory bank. Per-frame loop:

   ```
   M̂_t = propagate(M_{t-1})
   O_t  = detect(I_t, P)
   M_t  = match_and_update(M̂_t, O_t)
   ```
   (§3 Eq. unnamed, tracker section)

   Matching is IoU-based. A *masklet detection score* (temporal consistency measure) suppresses masklets that are not consistently matched to detections. The detector periodically re-prompts the tracker with high-confidence detections to keep the memory bank fresh. (§3 "Matching and Updating")
5. **Four training stages:** (1) PE pre-training, (2) detector pre-training, (3) detector fine-tuning, (4) tracker training with frozen backbone. (§3 "Training Stages")

# Assumptions

1. **(Hard) Concept = atomic noun phrase.** The model was trained exclusively on noun + optional-modifier phrases. Long grounding expressions or queries requiring multi-step reasoning fail without an MLLM front-end. (§1, §2)
2. **(Hard) Concept prompt is internally consistent.** Text phrase and any exemplar boxes must describe the same category level. Mixing granularities (e.g., "fish" + tail-only box) produces undefined behaviour. (§2)
3. **(Soft) Short video.** The paper defines PCS over videos ≤30 s. Longer videos may work but are not evaluated. (§2)
4. **(Soft) Closed-vocabulary floor.** The underlying PE backbone was pre-trained on aligned image-text data; very rare or highly technical concepts (not visually groundable) degrade gracefully rather than fail hard, because the presence head can output low confidence. (§2)
5. **(Soft) Single concept per inference call.** SAM 3 is prompted with one NP at a time in all reported benchmarks; handling many concepts jointly is not evaluated and may reduce calibration. (§6 "Image PCS with Text")

# Failure regime

1. **Polysemy.** "Mouse" (device vs. animal) is explicitly cited as an ambiguous phrase whose interpretation is dataset-context-dependent. The model has an "ambiguity module" (details in §App) but correctness is not guaranteed. (§2)
2. **Subjectivity and vagueness.** Adjectives like "cozy" or "large" have no stable visual referent; the model may hallucinate or produce inconsistent instance sets across images. (§2)
3. **Boundary ambiguity.** Whether "mirror" includes the frame is annotator-dependent; the benchmark collects 3 annotations per phrase for this reason, and evaluates against oracle (best of 3). (§2, §5 "Handling Ambiguity")
4. **Long-tail and fine-grained concepts.** The presence head boosts negative suppression, but at zero-shot, rare concepts unseen in SA-Co training still underperform; exemplar prompts partially recover. (§6 "Image PCS with Text" — SA-Co/Gold is 74% of human; SA-Co/Bio domain presumably lower)
5. **Crowded scenes with many similar objects.** Video matching uses IoU; dense crowds of nearly-identical objects cause incorrect identity assignment. Temporal re-prompting mitigates but does not eliminate this. (§3 "Matching and Updating")
6. **Poor mask quality after ≥4 interactive refinements.** PCS cgF1 plateaus after 4 exemplar clicks; exemplar prompts generalise to similar objects but cannot repair bad masks. Switching to PVS after 4 clicks is recommended ("hybrid" strategy). (§6 "PCS with K Exemplars")
7. **Latency scales with object count in video.** 30 ms for a single image with 100+ objects on H200; video latency scales with concurrent objects, near-real-time only for ~5 concurrent objects. (§1)

# Numerical sensitivity

**Main metric — cgF1 (classification-gated F1):**

```
cgF1 = 100 × pmF1 × IL_MCC
```

where `pmF1` = positive micro F1 on image-phrase pairs with ≥1 ground-truth mask, and `IL_MCC` = image-level Matthews Correlation Coefficient for binary presence detection (range [−1, 1]). Predictions below confidence 0.5 are excluded before evaluation, enforcing calibration. (§5 "Metrics")

**Headline numbers (Table 1, §6):**
- LVIS zero-shot mask AP: SAM 3 = **48.5** vs. prior best (DINO-X) = 38.5
- LVIS cgF1: SAM 3 = **37.2** vs. OWLv2 = 20.1
- SA-Co/Gold cgF1 (instance seg): SAM 3 = **54.1**; human = 72.8; OWLv2★ = 24.6 (SAM 3 is 2.2× stronger than best baseline, 74% of human)
- SA-Co/Silver cgF1: SAM 3 = **49.6**; SA-Co/Bronze: **42.6**; SA-Co/Bio: **55.4** (Table 1)
- Semantic segmentation: ADE-847 mIoU = **13.8**; PC-59 mIoU = **60.8**; Cityscapes mIoU = **65.2** (Table 1)

**Few-shot with 1 image exemplar (Table 3, §6):**
- COCO AP+: SAM 3 = **76.8** (I) / **78.1** (T+I) vs. T-Rex2 = 58.5 (I) — +18.3 gap
- LVIS AP+: SAM 3 = **76.0** (I) / **78.4** (T+I) vs. T-Rex2 = 65.8 (I) — +10.3 gap
- ODinW AP+: SAM 3 = **82.2** (I) / **81.8** (T+I) vs. T-Rex2 = 61.8 (I) — +20.5 gap

**PVS / VOS (Table 5, §6):**
- MOSEv1 J&F: SAM 3 = **78.4** vs. SAM 2.1 L = 77.9
- MOSEv2 J&F: SAM 3 = **60.3** vs. SAM 2.1 L = 47.9† (+6.5 net improvement; 12.4 absolute gap)
- DAVIS17: SAM 3 = **92.2** vs SAM 2.1 L = 90.7
- LVOSv2: SAM 3 = **88.5** vs SAM 2.1 L = 79.6

**Interactive image segmentation avg mIoU at 3 clicks:** SAM 3 = 81.3 vs SAM 2.1 L = 80.3 (Table 6 / Tab. 5 in paper)

**Object counting (Table 3a):**
- CountBench: SAM 3 MAE = **0.12**, Acc = **93.8%** (best among OWLv2, Gemini 2.5 Pro, Molmo-72B)
- PixMo-Count: SAM 3 MAE = **0.21**, Acc = **86.2%**

**SA-Co training dataset size (§5):**
- SA-Co/HQ: 5.2M images, 4M unique NPs, 52M masks (Phase 1–4 combined)
- SA-Co/SYN (synthetic): 38M unique NPs, 1.4B masks
- SA-Co/VIDEO: 52.5K videos, 24.8K unique NPs, 134K video-NP pairs, avg 84.1 frames at 6 fps
- Phase 1 alone produced 4.3M image-NP pairs; Phase 2 added 122M; Phase 3 added 19.5M

**SA-Co benchmark size (§5):**
- 207K unique phrases, 121K images+videos, >3M media-phrase pairs with hard negative labels
- >50× more concepts than existing benchmarks

# Applicability

- **Use when:** you need to enumerate *all* instances of a visually groundable noun-phrase concept in an image or short video; open-vocabulary object detection with masks; few-shot adaptation to new domains with 1–10 exemplars; object counting with segmentation output.
- **Don't use when:** a single-object click-based refinement suffices (SAM 2 PVS is faster at 93 FPS vs SAM 3's ~30 ms/image); the concept requires reasoning over spatial relationships or compositional language ("the dog to the left of the red ball"); very long video (>30 s) or real-time object-dense video (>5 concurrent objects at near-real-time).
- **Compared against:** OWLv2, GroundingDINO-Tiny, LLMDet-L, APE-D, DINO-X, Gemini 2.5 Flash/Pro (image PCS); GLEE, T-Rex2 (video/exemplar); SAMURAI, SAM2Long, SeC, SAM 2.1 L (VOS).

# Connections

- Builds on: [ravi2024-sam2, kirillov2023-sam] — upstream architecture and promptable segmentation paradigm
- Enables: open-vocabulary instance segmentation at scale; data engines for concept-labelled segmentation
- Refutes / supersedes: [kirillov2023-sam, ravi2024-sam2] — single-object-per-prompt is no longer the only promptable paradigm; SAM 3 strictly improves SAM 2 on PVS (VOS J&F) while adding concept-level capability

# Atlas update plan

## UPDATE: sam
Reason: this paper introduces SAM 3 — generalising the SAM prompt paradigm to *concepts* (free-form text + visual exemplars), enabling open-vocabulary segmentation. Builds on SAM 2's video infrastructure. The new task is "Promptable Concept Segmentation" (PCS). To be applied together with kirillov2023-sam (v1) and ravi2024-sam2 (v2) in a single `sam` family page.

Relations: (defer to page-author time — likely `feeds_into: ravi2024-sam2 → carion2025-sam3` and `extends: ravi2024-sam2`)

Sections to extend (bullets specific to SAM 3's unique contribution):

**Motivation:**
- SAM 1/2 segment one object per prompt (PVS); SAM 3 adds "Promptable Concept Segmentation" (PCS) — detecting and segmenting *all* instances of a free-form noun-phrase concept in images and videos.
- Motivation is open-vocabulary enumeration at dataset-annotation scale, powering robotics, AR, content creation.

**Architecture.Family & shape:**
- SAM 3 = DETR-based concept detector + SAM 2 memory-based tracker sharing a single aligned Perception Encoder (PE) backbone (Bolya et al. 2025).
- Detector adds a text/exemplar prompt path on top of PE; tracker inherits SAM 2's prompt encoder + mask decoder + memory bank, trained separately with frozen PE.

**Architecture.Blocks:**
- *Presence token:* a dedicated learned global query that predicts binary concept-presence probability. Per-instance scores are multiplied by presence score, decoupling recognition (global) from localisation (local). This is SAM 3's key architectural novelty.
- *Exemplar encoder:* encodes image exemplar boxes as position embedding + label (pos/neg) embedding + ROI-pooled features, concatenated and processed by a small transformer; output concatenated to text prompt tokens.
- *Fusion encoder:* cross-attends unconditioned image features from PE to the combined text+exemplar prompt tokens.
- *Mask head:* adapted from MaskFormer; predicts instance masks. Separate semantic segmentation head predicts per-pixel binary presence label.

**Architecture.Training:**
- Four-stage training: (1) PE pre-training, (2) detector pre-training, (3) detector fine-tuning with hard negatives, (4) tracker training on frozen PE.
- Data engine produces SA-Co/HQ (5.2M images, 4M unique NPs, 52M masks) + SA-Co/SYN (38M NPs, 1.4B masks) + SA-Co/VIDEO (52.5K videos).
- Data engine iterates model + AI verifiers (Llama 3.2 fine-tuned on MV/EV task) + human annotators over 4 phases; AI verifiers double throughput vs. human-only.
- SA-Co ontology: 22.4M-node Wikidata-based ontology (17 top-level, 72 sub-categories) used to mine long-tail concepts.

**Assessment.Novelty:**
- First model to frame open-vocabulary segmentation as promptable concept enumeration (find all instances of a free-form NP), with a unified image + video capability.
- The presence-head decoupling idea is a clean architectural insight applicable beyond this specific model.

**Assessment.Strengths:**
- LVIS zero-shot mask AP 48.5 vs. prior best 38.5 (DINO-X); 2× stronger than OWLv2 on SA-Co/Gold cgF1 (54.1 vs. 24.6); 74% of human.
- 1-exemplar COCO AP+ 76.8 vs T-Rex2 58.5 (+18.3); LVIS AP+ 76.0 vs 65.8 (+10.3).
- Simultaneously improves PVS: MOSEv2 J&F 60.3 vs. SAM 2.1 L 47.9 (+12.4); DAVIS17 92.2 vs. 90.7.
- Object counting: CountBench MAE 0.12, Acc 93.8% (best of all reported models).
- 30 ms/image with 100+ objects on H200; near-real-time video for ~5 concurrent objects.

**Assessment.Limitations:**
- Concept must be an atomic noun phrase; long or reasoning-requiring queries need MLLM wrapper.
- Concept-level enumeration plateaus at ~4 interactive exemplar clicks for mask quality.
- Video near-real-time only for ~5 concurrent objects; latency scales with object count.
- Open-vocabulary failure modes: polysemy, subjective descriptors, ungroundable concepts.

## REFS:
- kirillov2023-sam — direct v1 predecessor (promptable visual segmentation, image-only)
- ravi2024-sam2 — direct v2 predecessor (video PVS + memory bank)
- Bolya et al. 2025, "Perception Encoder" — backbone providing aligned image-text features (not yet in index; register if a page is authored)
- Carion et al. 2020, "DETR" — detector architecture family (end-to-end object detection with transformers)
- Minderer et al. 2024, "OWLv2" — primary open-vocabulary detection baseline
- Cheng et al. 2021, "MaskFormer" — mask head architecture

# Provenance

- **Abstract:** quote "4M unique concept labels", "doubles the accuracy", "SA-Co benchmark", "open source SAM 3" — Abstract paragraph.
- **PCS task definition:** §2, first paragraph: "≤30 secs", "detect, segment and track all instances", "simple noun phrases (NPs) consisting of a noun and optional modifiers".
- **Ambiguity cases (polysemy, subjectivity, boundary):** §2, "Our vocabulary includes any simple noun phrase groundable..." paragraph.
- **Architecture overview (detector + tracker + PE):** §3, opening paragraph; Fig. 4 caption.
- **Detector architecture details:** §3 "Detector Architecture" paragraphs; references to DETR, Deformable DETR, PlainDETR, DAC-DETR, Align loss, MaskFormer.
- **Presence token math:** §3 "Presence Token", `p(NP is present in input)` and `p(qᵢ is a match | NP is present)` — inline equations.
- **Video tracking loop equation:** §3 "Tracker and Video Architecture", unnumbered display equation for propagate/detect/match_and_update.
- **Matching and re-prompting:** §3 "Matching and Updating Based on Detections".
- **Training stages:** §3 "Training Stages" — four-stage description.
- **Data engine phases (1–4):** §4, subsections Phase 1–4.
- **SA-Co/HQ stats (5.2M images, 4M NPs, 52M masks):** §5 "Training Data", first paragraph.
- **SA-Co/VIDEO stats (52.5K videos, 134K pairs):** §5 "Training Data", first paragraph; §4 Phase 4 gives 52.5K videos and 467K masklets (slightly different counting — masklet vs. NP pair).
- **SA-Co benchmark stats (207K unique phrases, 121K images+videos, >3M pairs):** §5 "SA-Co Benchmark".
- **cgF1 metric formula:** §5 "Metrics", `cgF1 = 100 × pmF1 × IL_MCC`.
- **Headline LVIS numbers (48.5 mask AP, 37.2 cgF1):** Table 1, SAM 3 row, §6.
- **SA-Co/Gold numbers (54.1 cgF1; human 72.8; OWLv2★ 24.6):** Table 1.
- **Semantic segmentation (ADE-847 13.8, PC-59 60.8, Cityscapes 65.2):** Table 1 SAM 3 row.
- **Few-shot 1-exemplar numbers (COCO 76.8, LVIS 76.0, ODinW 82.2):** Table 3 (AP+ columns, I row, SAM 3).
- **T-Rex2 baseline for comparison:** Table 3, T-Rex2 row (COCO I AP+ = 58.5, LVIS I = 65.8, ODinW I = 61.8).
- **PVS / VOS numbers:** Table 5 (SAM 3 vs. SAM 2.1 L).
- **Interactive segmentation mIoU:** Table 6 (right side), SAM 3 3-clicks = 81.3 vs SAM 2.1 L = 80.3.
- **Object counting:** Table 3a (CountBench MAE 0.12 / Acc 93.8%; PixMo-Count 0.21 / 86.2%).
- **Latency (30 ms / ~5 objects):** §1 last paragraph.
- **Interactive PCS convergence (plateau after 4 clicks, +21.6 after 3):** §6 "PCS with K Exemplars".
- **Phase 2 dataset size (122M image-NP pairs):** §4 "Phase 2".
- **Phase 3 dataset size (19.5M image-NP pairs) + ontology (22.4M nodes):** §4 "Phase 3".
- **AI verifier doubles throughput:** §4 "Phase 2", "roughly doubles the data engine's throughput".
