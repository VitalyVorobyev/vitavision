---
paper_id: carion2020-detr
title: "End-to-End Object Detection with Transformers"
authors: ["N. Carion", "F. Massa", "G. Synnaeve", "N. Usunier", "A. Kirillov", "S. Zagoruyko"]
year: 2020
url: https://arxiv.org/pdf/2005.12872
created: 2026-05-27
relevant_atlas_pages:
  - faster-rcnn
  - mask-rcnn
  - resnet
  - vit
  - attention-mechanism
  - sam
  - convolutional-neural-network
  - non-maximum-suppression
---

# Setting

**Problem class.** Instance-level object detection: given an RGB image, predict a set of (class label, axis-aligned bounding box) pairs, one per object instance.

**Inputs.** An RGB image $x_{\rm img} \in \mathbb{R}^{3 \times H_0 \times W_0}$. Batches are zero-padded so all images share the same $H_0, W_0$. No constraint on resolution, but the encoder's quadratic self-attention cost grows with spatial token count (§3.2.2).

**Outputs.** A fixed-size set of $N = 100$ predictions, each a tuple (class-probability vector over $C+1$ classes including $\varnothing$, normalized center $c_x, c_y$, width $w$, height $h$ all in $[0,1]$). At most $N$ of these are non-empty at any image; the rest output $\varnothing$.

**Guarantees.** The bipartite matching loss ensures that each ground-truth object is uniquely assigned to exactly one prediction slot during training; this eliminates duplicate predictions at inference without any post-processing (no NMS, no anchor boxes, no RPN). (§3.1, §3.2)

# Core idea

DETR reframes detection as **set prediction via bipartite matching** and introduces a **transformer encoder-decoder** to produce all predictions in parallel.

**Step 1 — Feature extraction.** A CNN backbone (ResNet-50 or ResNet-101 with ImageNet pretraining) extracts a feature map $f \in \mathbb{R}^{C \times H \times W}$ where $C = 2048$, $H = H_0/32$, $W = W_0/32$. A 1×1 convolution projects channels from $C$ to a smaller model dimension $d$ (default 256), producing $z_0 \in \mathbb{R}^{d \times H \times W}$. (§3.2.1)

**Step 2 — Transformer encoder.** $z_0$ is spatially flattened to a sequence of $HW$ tokens, each of dimension $d$. Fixed 2D sinusoidal positional encodings are added before every self-attention layer. 6 standard transformer encoder layers (multi-head self-attention + FFN) produce contextualised memory tokens of shape $(d, HW)$. (§3.2.2)

**Step 3 — Transformer decoder.** $N = 100$ learned positional embeddings (called **object queries**) serve as the decoder input. The decoder runs 6 layers of multi-head self-attention (between queries) and cross-attention (queries attending to encoder memory). Because decoding is non-autoregressive, all $N$ queries are transformed in parallel, each attending to the full encoder context. (§3.2.3)

**Step 4 — Prediction heads (FFN).** Each decoder output embedding is independently passed to a shared 3-layer MLP (hidden dim $d$, ReLU) that predicts a box $(c_x, c_y, w, h)$ and to a linear layer with softmax predicting a class label. (§3.2.4)

**Training loss.** Let $y$ be the ground-truth set (padded to size $N$ with $\varnothing$) and $\hat{y} = \{\hat{y}_i\}_{i=1}^N$ the predictions. The Hungarian algorithm solves:

$$\hat{\sigma} = \underset{\sigma \in \mathfrak{S}_N}{\operatorname{arg\,min}} \sum_i^N \mathcal{L}_{\rm match}(y_i, \hat{y}_{\sigma(i)}) \tag{Eq. 1}$$

After finding $\hat{\sigma}$, the Hungarian loss is:

$$\mathcal{L}_{\rm Hungarian}(y, \hat{y}) = \sum_{i=1}^N \left[ -\log \hat{p}_{\hat{\sigma}(i)}(c_i) + \mathbf{1}_{c_i \neq \varnothing} \mathcal{L}_{\rm box}(b_i, \hat{b}_{\hat{\sigma}(i)}) \right] \tag{Eq. 2}$$

where $\mathcal{L}_{\rm box}$ is a linear combination of L1 loss and Generalized IoU (GIoU) loss. (§3.1)

The matching cost $\mathcal{L}_{\rm match}$ is the same combination (classification probability + L1 + GIoU) but uses the raw predicted probability for the ground-truth class without log, ensuring the cost is non-negative for the solver. Auxiliary losses from every decoder layer are added with shared FFN weights, each with its own Hungarian matching. (§3.2.5)

# Assumptions

1. **(Hard) $N$ must exceed the maximum object count per image in the dataset.** The paper uses $N = 100$ for COCO, which has up to 63 instances per image in the training set. Overflow is not handled gracefully — if more than $N$ objects appear, some are silently missed. (§4.0.1)

2. **(Hard) Bipartite matching is non-differentiable**, but the loss evaluated on matched pairs is fully differentiable. The Hungarian solver runs as a non-differentiable pre-pass at each training step. (§3.1)

3. **(Soft) Convergence requires very long training.** The 300-epoch ablation schedule and 500-epoch comparison schedule are 10–25× longer than Faster R-CNN's 12–36-epoch standard. Earlier stopping yields meaningfully lower AP. (§4.0.2)

4. **(Soft) The encoder quadratic cost bounds practical input resolution.** The standard DETR uses stride-32 backbone features. DETR-DC5 uses a dilated C5 stage (stride-16), doubling spatial resolution, but incurring 16× encoder self-attention cost and ~2× total FLOPs, with only modest small-object AP gains. (§4.0.2, Table 1)

5. **(Soft) ImageNet-pretrained ResNet backbone is assumed.** Transformer weights are Xavier-initialised; backbone batchnorm layers are frozen during detection training. (§4.0.2)

# Failure regime

**Small objects (AP_S).** DETR (ResNet-50) achieves AP_S = 20.5, compared to Faster RCNN-FPN's 24.2 and Faster RCNN-DC5's 21.4 (Table 1). The gap to the best augmented Faster RCNN-DC5+ (AP_S = 22.9) and Faster RCNN-FPN+ (AP_S = 26.6) is substantial. The likely cause is the stride-32 feature map: small objects occupy very few tokens in the encoder sequence. DETR-DC5 partially closes the gap (AP_S = 22.5) at 2× compute. (§4.1, Table 1)

**Slow convergence.** After 300 epochs DETR reaches AP = 40.6 (median over last 10 epochs); the 500-epoch schedule adds ~1.5 AP. A comparable Faster R-CNN trains in 12–36 epochs. Convergence failure was the main motivation for Deformable DETR (2020), which achieves competitive accuracy in ~50 epochs via sparse attention. (§4.0.2, §4.1)

**Quadratic encoder cost.** The encoder self-attention is $O((HW)^2)$ in the token count. For DETR-DC5 (stride-16) this is 4× the token count of the standard model, but because attention cost is quadratic, it is 16× higher in that stage, explaining the 2× overall cost increase. Higher-resolution backbones compound this further, limiting throughput. (§4.0.2)

**Duplicate inference slot behavior.** At inference some slots predict $\varnothing$. The paper overrides $\varnothing$-class predictions with the second-highest scoring class, improving AP by 2 points. Without this trick the model leaves AP on the table by wasting slots. (§4.0.2)

# Numerical sensitivity

**Headline numbers (COCO val 2017, Table 1).**

| Model | GFLOPs/FPS | #params | AP | AP_S | AP_M | AP_L |
|---|---|---|---|---|---|---|
| Faster RCNN-FPN (3x) | 180/26 | 42M | 40.2 | 24.2 | 43.5 | 52.0 |
| Faster RCNN-FPN+ (9x) | 180/26 | 42M | 42.0 | 26.6 | 45.4 | 53.4 |
| DETR (R50, 500ep) | 86/28 | 41M | 42.0 | 20.5 | 45.8 | **61.1** |
| DETR-DC5 (R50) | 187/12 | 41M | 43.3 | 22.5 | 47.3 | 61.1 |
| DETR-R101 | 152/20 | 60M | 43.5 | 21.9 | 48.0 | 61.8 |
| DETR-DC5-R101 | 253/10 | 60M | **44.9** | 23.7 | **49.5** | **62.3** |

DETR's AP_L of 61.1 substantially exceeds Faster RCNN-FPN+'s 53.4. (Table 1)

**Architecture constants.**
- Transformer encoder depth: 6 layers. Decoder depth: 6 layers. (Supplement)
- Object queries: $N = 100$.
- Backbone output channels projected to $d = 256$ (model dimension).
- Dropout: 0.1 in all transformer components.
- FFN hidden dimension: $d = 256$ (same as model dimension).

**Training.**
- Optimizer: AdamW. Transformer LR $10^{-4}$, backbone LR $10^{-5}$, weight decay $10^{-4}$.
- Batch size: 64 (16 V100 GPUs × 4 images/GPU).
- 300-epoch schedule: LR drop by 10× at epoch 200. ~3 days on 16 V100s.
- 500-epoch schedule: LR drop at epoch 400. Adds ~1.5 AP over 300-epoch.
- Scale augmentation: shortest side 480–800 px, longest ≤ 1333 px; random crops with probability 0.5 during training (+1 AP). (§4.0.2)

**Box loss weights.** The paper reports the loss as a weighted sum of L1 and GIoU. Exact loss coefficients are given in Appendix §0.A.4 (not extracted here due to HTML parsing limitations — treat as reference to supplementary material).

**Backbone feature map dimensions.** Standard: stride 32 → $H = H_0/32$, $W = W_0/32$, $C = 2048$ before projection. DC5: stride 16 → $H = H_0/16$, $W = W_0/16$ (dilated last ResNet stage). (§3.2.1, §4.0.2)

# Applicability

- **Use when:** pipeline simplicity is valued (no anchor tuning, no NMS, no RPN); large-object detection dominates the use-case (AP_L is DETR's clear strength); the task extends naturally to set-prediction outputs (panoptic segmentation, scene graphs); the model will serve as a pretrained backbone for downstream tasks like SAM-style mask decoders.
- **Don't use when:** training budget is constrained (Faster R-CNN converges 10–25× faster); small-object detection is critical (AP_S deficit ~5 points vs FPN variants); inference throughput at real-time rates is required with DETR-DC5 (187 GFLOPs/12 FPS vs 180/26 for Faster RCNN-FPN).
- **Compared against:** Faster R-CNN (with FPN and DC5 variants; multiple training schedules). No comparison against YOLO or SSD in this paper.

# Connections

- **Builds on:** ResNet (CNN backbone, He et al. 2016); Transformer / attention mechanism (Vaswani et al. 2017); Faster R-CNN / RPN detection pipeline (Ren et al. 2015); Hungarian algorithm for bipartite matching (Kuhn 1955); GIoU loss (Rezatofighi et al. 2019).
- **Enables:** Deformable DETR (Zhu et al. 2020 — sparse attention, faster convergence); Conditional DETR; DAB-DETR; DN-DETR; Mask2Former (DETR decoder for mask classification); SAM mask decoder (two-way cross-attention directly inspired by DETR decoder); SAM 3 concept detector (explicitly DETR-based).
- **Extends / generalises:** Panoptic segmentation via a small segmentation head trained on top of frozen DETR (§5).

# Atlas update plan

## NEW: detr
Type: model
Category: detection (end-to-end set prediction)
Primary source: this paper (carion2020-detr)
Bullets per public-page section:

**Motivation:**
- Conventional detectors require hand-designed anchors, region proposal networks, and non-maximum suppression — components that encode domain prior knowledge and complicate the pipeline.
- DETR treats detection as direct set prediction: predict all objects in one forward pass, supervised by a bipartite matching loss, with no post-processing. (§1)

**Architecture:**
- CNN backbone (ResNet-50 or ResNet-101, ImageNet-pretrained, frozen BN) → 1×1 conv to project $C=2048$ channels to model dim $d=256$ → flatten to $HW$ spatial tokens + add fixed 2D sinusoidal positional encoding → 6-layer transformer encoder.
- 6-layer transformer decoder takes $N=100$ learned object queries (positional embeddings) as input; each query attends to encoder memory via cross-attention and to other queries via self-attention, all in parallel (non-autoregressive).
- Per-query FFN head: 3-layer MLP predicts normalized box $(c_x, c_y, w, h)$; linear + softmax predicts class. (§3.2)
- Auxiliary decoding losses: prediction FFNs and Hungarian loss applied at every decoder layer; weights shared. (§3.2.5)

**Implementations:**
- Official: `facebookresearch/detr` (PyTorch, Apache-2.0). Inference demo in <50 lines of PyTorch. Pretrained checkpoints included. (§4, §3.2)

**Assessment:**
- Novelty: first competitive end-to-end detector without NMS, anchors, or RPN; bipartite matching loss as the training objective; transformer encoder-decoder applied to detection.
- Strengths: AP on COCO val comparable to Faster R-CNN (42.0 DETR vs 42.0 Faster RCNN-FPN+, Table 1); AP_L strongly exceeds Faster R-CNN (61.1 vs 53.4); naturally extends to panoptic segmentation.
- Limitations: AP_S = 20.5 (≈5 points below Faster RCNN-FPN+); requires 300–500 epochs (vs 12–36 for Faster R-CNN); encoder quadratic cost limits high-resolution use.

**Relations:**
- `{ type: compared_with, target: faster-rcnn, confidence: high, caution: "DETR vs Faster R-CNN is the headline comparison; DETR removes RPN+anchors+NMS via bipartite matching + transformer, achieving comparable COCO AP with lower AP_S and higher AP_L." }`
- `{ type: feeds_into, target: sam, confidence: high, caution: "SAM's mask decoder two-way cross-attention is inspired by DETR's transformer decoder; SAM 3's concept detector is explicitly DETR-based." }`

**References:** carion2020-detr (primary).

## REFS:
The following papers are directly cited and relevant to Atlas pages or future ingestion:
- Vaswani et al. 2017 "Attention Is All You Need" — Transformer foundation.
- He et al. 2016 "Deep Residual Learning" — ResNet backbone.
- Ren et al. 2015 "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks" — Faster R-CNN baseline being replaced.
- Rezatofighi et al. 2019 "Generalized Intersection over Union" — GIoU loss component.
- Zhu et al. 2020 "Deformable DETR" — direct follow-on addressing convergence speed.

# Provenance

- **§1 (Abstract, Introduction):** "streamlines the detection pipeline, effectively removing the need for many hand-designed components like a non-maximum suppression procedure or anchor generation." AR5iv HTML line 80-81.
- **§3.1 (Set prediction loss):** $N = $ fixed set size "set to be significantly larger than the typical number of objects in an image" (line 195); COCO has up to 63 instances (§4.0.1, line 351-352); ground truth padded to size $N$ with $\varnothing$ (line 199-200).
- **Eq. 1 (Matching):** $\hat{\sigma} = \operatorname{arg\,min}_{\sigma \in \mathfrak{S}_N} \sum_i^N \mathcal{L}_{\rm match}(y_i, \hat{y}_{\sigma(i)})$ — HTML lines 202-209, `alttext` attribute of `S3.E1.m1.2`.
- **§3.2.1 (Backbone):** $C = 2048$, $H = H_0/32$, $W = W_0/32$ — lines 279-281.
- **§3.2.2 (Encoder):** 1×1 conv to reduce to $d$, flatten to $d \times HW$, fixed positional encodings, multi-head self-attention + FFN — lines 287-292.
- **§3.2.3 (Decoder):** $N$ object queries (learned positional embeddings), parallel non-autoregressive decoding, self-attention + cross-attention — lines 298-302.
- **§3.2.4 (FFN):** 3-layer perceptron with ReLU, hidden dim $d$; linear layer + softmax for class; "no object" class $\varnothing$ for unmatched slots — lines 308-313.
- **§3.2.5 (Auxiliary losses):** "We add prediction FFNs and Hungarian loss after each decoder layer. All predictions FFNs share their parameters." Lines 320-324.
- **§4.0.2 (Training details):** AdamW; transformer LR $10^{-4}$, backbone LR $10^{-5}$, weight decay $10^{-4}$; dropout 0.1; 300-epoch schedule (LR drop at 200, 3 days on 16 V100s, batch 64); 500-epoch schedule (LR drop at 400, +1.5 AP); scale augmentation 480-800/1333; random crops +1 AP; DETR-DC5 16× encoder cost, 2× total FLOPs — lines 362-384.
- **Table 1 (COCO val results):** DETR AP=42.0/AP_S=20.5/AP_L=61.1 (86 GFLOPs, 41M params); DETR-DC5 AP=43.3/AP_S=22.5 (187 GFLOPs); DETR-DC5-R101 AP=44.9; Faster RCNN-FPN+ AP=42.0/AP_S=26.6/AP_L=53.4 — HTML lines 490-532.
- **§4.1 (Comparison):** "DETR demonstrates significantly better performance on large objects... lower performances on small objects" — HTML line 117.
- **Implementation URL:** `https://github.com/facebookresearch/detr` — HTML lines 87, 341.
