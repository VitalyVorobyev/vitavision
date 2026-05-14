---
paper_id: kirillov2023-sam
title: "Segment Anything"
authors: ["A. Kirillov", "E. Mintun", "N. Ravi", "H. Mao", "C. Rolland", "L. Gustafson", "T. Xiao", "S. Whitehead", "A. C. Berg", "W. Lo", "P. Dollár", "R. Girshick"]
year: 2023
url: https://arxiv.org/abs/2304.02643
created: 2026-05-11
relevant_atlas_pages: [mask-rcnn, fcn-semantic-segmentation, unet-segmentation, deeplab-semantic-segmentation, grabcut-iterative-segmentation, graph-cut-segmentation, felzenszwalb-graph-segmentation]
---

# Setting

**Task**: promptable image segmentation as a new paradigm for building a segmentation foundation model. The paper defines a tri-part recipe: task + model + data.

**Inputs**: an RGB image plus a segmentation *prompt*. Prompt types:
- *Sparse*: one or more foreground/background points (click coordinates), a bounding box (axis-aligned rectangle), or free-form text.
- *Dense*: a rough binary mask over the image.
Multiple prompt types can be composed (e.g., point + text) at inference.

**Outputs**: one or more binary segmentation masks (same spatial resolution as input), each paired with a scalar confidence score (estimated IoU). When the prompt is ambiguous, SAM returns 3 candidate masks (whole / part / subpart) rather than a collapsed average.

**Dataset**: SA-1B — 1.1B masks on 11M licensed, privacy-respecting images. Images are high-resolution originals (3300×4950 px on average); released downsampled to shortest-side 1500 px. SA-1B has 400× more masks than Open Images (the prior largest segmentation dataset) and ~100 masks per image on average.

# Core idea

SAM decomposes into three components with deliberately asymmetric compute budgets:

1. **Image encoder** (heavy, amortized): an MAE-pretrained ViT-H [32] minimally adapted for high-resolution inputs via windowed attention and four global attention blocks [60]. Runs once per image; the resulting image embedding is reused for all subsequent prompts. Input images are resized so the longest side is 1024 px; patch size is 16 px, yielding a 64×64 token grid.

2. **Prompt encoder** (lightweight):
   - *Points and boxes*: positional encodings [93] summed with learned type embeddings (foreground point / background point / top-left corner / bottom-right corner).
   - *Masks*: embedded via a small convolutional network; result added element-wise to the image embedding.
   - *Text*: off-the-shelf CLIP [80] text encoder (frozen). Used only in the text-to-mask proof-of-concept; not part of the default training objective.

3. **Mask decoder** (fast, ~50 ms on CPU in a browser): a modified Transformer decoder block [101] with *two-way cross-attention* — prompt tokens attend to image tokens, then image tokens attend to prompt tokens — run for 2 decoder blocks. After the blocks the image embedding is upsampled (2× bilinear, then 2× transposed convolution) and an MLP maps an output token to a dynamic linear classifier, computing mask foreground probability at each spatial location. A separate MLP head produces an IoU confidence score per mask.

**Ambiguity resolution**: the decoder predicts 3 masks simultaneously for a single prompt. During training, loss is computed only on the minimum-loss mask (i.e., the prediction closest to any valid ground truth). This forces the model to commit to one valid interpretation rather than averaging over ambiguous ones. At inference the most-confident mask is returned by default; callers can inspect all 3.

**Training objective**: linear combination of focal loss [63] and dice loss [71], applied to the selected mask. The IoU head is trained with MSE between predicted and true IoU. Training simulates an interactive loop: 11 rounds of random prompt sampling per mask per image, mirroring the data-engine annotation setup.

**Data engine**: three-stage human-in-the-loop collection. Stage 1 (assisted-manual): annotators use SAM interactively; 4.3M masks from 120k images, annotation time reduced from 34 s to 14 s/mask as the model improved; image encoder scaled from ViT-B → ViT-H across 6 retraining rounds. Stage 2 (semi-automatic): automatically prefill confident masks, annotators label remaining; 10.2M masks total from 300k images. Stage 3 (fully automatic): 32×32 grid of point prompts per image; NMS deduplication + stability filter ($\delta = 0.5$ threshold perturbation); ~100 masks per image; all 11M images processed yielding 1.1B masks (99.1% of SA-1B generated automatically).

# Assumptions

1. **Natural-image RGB input** (hard). SAM was trained on natural photographs; domain shifts to medical imaging, satellite imagery, or highly synthetic data degrade performance without fine-tuning.
2. **Geometrically meaningful prompts** (soft). Points and boxes must spatially overlap the target object. Completely out-of-region prompts produce valid-but-wrong masks.
3. **Ambiguity is resolvable into at most 3 nested levels** (soft). The 3-mask output covers whole/part/subpart hierarchies. Semantically flat but visually multi-modal ambiguities (two separate objects equidistant from a point) are not handled.
4. **Image encoder is run first** (hard for amortized use). The ~50 ms decoder latency assumes the image embedding is precomputed. End-to-end latency including ViT-H encoding is significantly higher (not real-time on CPU).
5. **Text prompts are weakly supported** (hard). The text-to-mask variant requires retraining SAM with CLIP image embeddings as proxy supervision; it is described as a "proof of concept" and is not production-quality.
6. **No category output** (hard). SAM is class-agnostic; pairing with an external classifier is required for any task needing semantic labels.

# Failure regime

- **Fine structures**: thin/wiry objects (cables, hair, plant tendrils) are under-resolved at the ViT-H patch size of 16 px. SAM explicitly acknowledges it misses fine structures and produces less crisp boundaries than "zoom-in" methods such as FocalClick [17].
- **Hallucinated disconnected components**: small spurious blobs appear at times, particularly for complex-shaped objects.
- **Semantic / panoptic segmentation**: the paper notes it is "unclear how to design simple prompts that implement semantic and panoptic segmentation" — these tasks require category labels that SAM cannot produce alone.
- **Domain-specific tools**: biomedical image analysis (e.g., ilastik [7]) and other specialist domains are expected to outperform SAM without fine-tuning.
- **Multi-point regime**: as the number of points increases beyond 1, the gap over supervised interactive segmenters (SimpleClick, FocalClick) shrinks, and SAM is explicitly not optimized for the high-IoU interactive regime.
- **Automatic-metric vs. perceptual quality mismatch**: on datasets like DRAM and IBD, SAM scores below RITM on mIoU but receives higher human quality ratings, indicating metric sensitivity to ground-truth ambiguity rather than true quality failure.
- **Text-to-mask robustness**: text prompting is exploratory; failures require an additional point click to recover (§6.2).

# Numerical sensitivity

- **Input resolution**: images resized to longest-side 1024 px before encoding. Shorter-side padding to square; patch grid is 64×64. Objects smaller than ~1–2 patches (16–32 px) lose spatial precision.
- **Stability filter**: a mask is "stable" if thresholding the probability map at $0.5 - \delta$ and $0.5 + \delta$ yields similar masks; used in fully-automatic stage to filter ambiguous low-confidence predictions.
- **Loss weights**: focal + dice combination; specific $\alpha$ and $\gamma$ for focal loss and the relative weighting between focal and dice are stated in the full appendix §B (not in the ICCV open-access pages) — marked `?` here pending full arXiv appendix check.
- **IoU head**: trained with MSE loss. Predicted IoU is the primary ranking signal for multi-mask selection.
- **Mask area threshold for text training**: CLIP image embeddings are only extracted for manually collected masks with area > $100^2$ px (§6.2); smaller masks are excluded from text-prompt training.
- **Mask quality metric**: 94% of auto-generated masks achieve > 90% IoU vs. professional corrections; inter-annotator baseline is 85–91% IoU.

# Applicability

- **Use when**: zero-shot interactive segmentation of arbitrary objects; preprocessing pipeline for instance segmentation when paired with an object detector; automatic mask generation for dataset annotation; any application where category labels are not required and a human or upstream model can provide a geometric prompt.
- **Don't use when**: semantic or panoptic segmentation without an external classifier; fine-detail boundary accuracy is critical (e.g., matting); domain-specific imagery (medical, satellite) without fine-tuning; real-time end-to-end inference on CPU (ViT-H encoding is the bottleneck).
- **Compared against**: RITM [90] (strongest single-point interactive segmenter; SAM outperforms on 16/23 datasets with the oracle resolving ambiguity wins on all 23); SimpleClick [65] and FocalClick [17] (gap shrinks at >1 point; SAM not designed for high-IoU multi-click regime).

# Connections

- **Builds on**: MAE (ViT-H initialization) [46], ViT [32], windowed ViT for high-res [60], DETR-style transformer decoder [13, 19], focal loss [63], dice loss [71], Fourier positional encodings [93], CLIP [80] (text encoder for text-prompt variant).
- **Interactive segmentation lineage**: adapts the iterative prompt simulation of [107, 68, 90], extending it to the ambiguous-prompt regime.
- **Enables**: composable systems where SAM segments and a downstream classifier labels (instance segmentation pipeline); 3D reconstruction from single RGB-D [104]; gaze-driven wearable segmentation applications.
- **Supersedes (as practitioner default)**: classical interactive segmentation via graph-cut energy minimization (GrabCut, graph-cut, Felzenszwalb) when a pretrained model is available and prompts are geometric.

# Atlas update plan

## NEW: sam-segment-anything
Type: model
Category: segmentation
Primary source: this paper

- **Goal**: class-agnostic promptable segmentation foundation model; accepts points, boxes, masks, or text as prompts; outputs up to 3 valid binary masks per prompt with IoU confidence scores; designed for zero-shot transfer and composability.
- **Architecture**: three-component pipeline — (i) heavy MAE-pretrained ViT-H image encoder (run once per image, 1024 px longest-side input, 16 px patches, 64×64 token grid); (ii) lightweight prompt encoder (positional encodings for points/boxes, convolutional embedding for mask prompts, CLIP text encoder for text); (iii) fast two-way cross-attention mask decoder producing 3 candidate masks + IoU scores; ~50 ms decoder latency in-browser on CPU with precomputed image embedding.
- **Training**: focal + dice loss on minimum-loss mask of 3 predictions; IoU head trained with MSE; 11 rounds of random prompt simulation per mask; SA-1B (1.1B masks, 11M images) as training data, collected via a three-stage human-in-the-loop data engine.
- **Implementation**: MAE ViT-H [He et al. CVPR 2022] backbone; two-way transformer decoder blocks inspired by DETR [Carion et al. ECCV 2020]; Apache 2.0 license; released at segment-anything.com.
- **Remarks**: zero-shot performance competitive with or exceeding fully supervised models on 16/23 diverse segmentation benchmarks; does not output category labels; text prompting is exploratory and weaker than geometric prompts; fine-structure boundaries are a known limitation.

Relations:
- { type: learned_alternative_of, target: grabcut-iterative-segmentation, confidence: high }
- { type: learned_alternative_of, target: graph-cut-segmentation, confidence: high }
- { type: learned_alternative_of, target: felzenszwalb-graph-segmentation, confidence: high }
- { type: compared_with, target: mask-rcnn, confidence: medium, caution: "Different problem classes — Mask R-CNN is instance-detection with category labels; SAM is class-agnostic promptable segmentation" }

# Provenance

1. **1.1B masks, 11M images** — Abstract (p. 4015); Fig. 2 caption (p. 4017); §5 "Masks" paragraph (p. 4020).
2. **SA-1B has 400× more masks than Open Images** — §5 "Mask properties" (p. 4021); Fig. 6 legend (p. 4021).
3. **~100 masks per image on average** — Fig. 2 caption (p. 4017); §4 fully automatic stage (p. 4019).
4. **3 mask outputs (whole / part / subpart)** — §3 "Resolving ambiguity" (p. 4019): "nested masks are often at most three deep: whole, part, and subpart."
5. **~50 ms prompt encoder + decoder in browser on CPU** — §3 "Efficiency" (p. 4019): "the prompt encoder and mask decoder run in a web browser, on CPU, in ~50ms."
6. **ViT-H image encoder, MAE pretraining** — §3 "Image encoder" (p. 4019); §6 "Implementation" (p. 4021): "SAM uses an MAE [46] pre-trained ViT-H [32] image encoder."
7. **1024 px longest-side input, 16 px patches** — §3 "Image encoder" references [60]; confirmed in §6 "Implementation" pointing to §B (appendix, not in ICCV open-access pages).
8. **Focal loss [63] + dice loss [71] combination** — §3 "Losses and training" (p. 4019): "We supervise mask prediction with the linear combination of focal loss [63] and dice loss [71] used in [13]."
9. **11 rounds of random prompt sampling per mask** — §3 "Losses and training" (p. 4019): "randomly sampling prompts in 11 rounds per mask."
10. **Minimum-loss backprop over 3 masks** — §3 "Resolving ambiguity" (p. 4019): "During training, we backprop only the minimum loss [14, 44, 62] over masks."
11. **IoU confidence head** — §3 "Resolving ambiguity" (p. 4019): "the model predicts a confidence score (i.e., estimated IoU) for each mask."
12. **Prompt encoder: positional encodings for points/boxes** — §3 "Prompt encoder" (p. 4019): "We represent points and boxes by positional encodings [93] summed with learned embeddings for each prompt type."
13. **CLIP text encoder** — §3 "Prompt encoder" (p. 4019): "free-form text with an off-the-shelf text encoder from CLIP [80]."
14. **Dense mask prompts via convolution** — §3 "Prompt encoder" (p. 4019): "Dense prompts (i.e., masks) are embedded using convolutions and summed element-wise with the image embedding."
15. **Two-way cross-attention in decoder** — §3 "Mask decoder" (p. 4019): "uses prompt self-attention and cross-attention in two directions (prompt-to-image embedding and vice-versa)."
16. **Data engine stage 1: 4.3M masks from 120k images, 6 retraining rounds, 34→14 s/mask** — §4 "Assisted-manual stage" (p. 4019–4020).
17. **Data engine stage 2: 10.2M masks from 300k images, 5 retraining rounds** — §4 "Semi-automatic stage" (p. 4020).
18. **32×32 grid of points in fully automatic stage** — §4 "Fully automatic stage" (p. 4020): "we prompted the model with a 32×32 regular grid of points."
19. **Stability filter: threshold perturbation δ = 0.5** — §4 "Fully automatic stage" (p. 4020): "we consider a mask stable if thresholding the probability map at 0.5−δ and 0.5+δ results in similar masks."
20. **99.1% of SA-1B masks generated automatically** — §5 "Masks" (p. 4020).
21. **Mask quality: 94% of pairs >90% IoU vs. professional corrections** — §5 "Mask quality" (p. 4020).
22. **SAM outperforms RITM on 16/23 datasets** — §6.1 "Results" (p. 4022): "SAM yields higher results on 16 of the 23 datasets."
23. **Text training: mask area > 100² px threshold** — §6.2 "Approach" (p. 4023): "for each manually collected mask with area larger than 100² we extract the CLIP image embedding."
24. **Limitations (fine structures, disconnected components, boundary crispness)** — §7 "Limitations" (p. 4023).
25. **Apache 2.0 license release** — §1 "Release" (p. 4016): "making SAM available under a permissive open license (Apache 2.0)."
26. **Image resolution: 3300×4950 px average, downsampled to shortest-side 1500 px** — §5 "Images" (p. 4020).
