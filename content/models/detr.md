---
title: "DETR"
date: 2026-05-27
summary: "End-to-end object detector that recasts detection as direct set prediction — CNN backbone (ResNet-50/101) extracts $H/32 \\times W/32$ feature map; transformer encoder-decoder with 6+6 layers and $N=100$ learned object queries outputs (class, box) pairs; bipartite-matching loss via Hungarian algorithm eliminates anchor boxes, region proposals, and NMS. Comparable COCO AP to Faster R-CNN at simpler pipeline; better large-object AP, worse small-object AP, and ~10× slower convergence (300+ epochs)."
tags: ["deep-learning"]
domain: detection
author: "Vitaly Vorobyev"
difficulty: intermediate
arch_family: hybrid
params: "41M (DETR R50), 60M (DETR R101)"
flops: "86 GFLOPs (DETR R50), 152 GFLOPs (DETR R101)"
prerequisites: [convolutional-neural-network, attention-mechanism]
failureModes: []
relations:
  - type: compared_with
    target: faster-rcnn
    confidence: high
    caution: "DETR vs Faster R-CNN is the headline detection comparison; DETR removes hand-designed RPN + anchor boxes + NMS in favour of bipartite matching + transformer decoder at comparable COCO AP."
  - type: feeds_into
    target: sam
    confidence: high
    caution: "SAM's mask decoder two-way cross-attention is inspired by DETR's transformer decoder; SAM 3's concept detector is explicitly DETR-based."
sources:
  primary: carion2020-detr
  references:
    - he2016-resnet
  notes: |
    Architecture (§3.2): CNN backbone (ResNet-50 or -101) extracts feature
    map $f \in \mathbb{R}^{C \times H/32 \times W/32}$ with $C=2048$. 1×1
    conv projects to $d=256$ channels; flatten to $HW/32^2$ tokens; add
    fixed 2D sinusoidal positional encoding. Transformer encoder: 6
    layers of standard multi-head self-attention (8 heads, $d_\text{ff}=2048$).
    Transformer decoder: 6 layers, takes $N=100$ learnable **object
    queries** as positional embeddings; cross-attends to encoder
    output; non-autoregressive (all $N$ queries decoded in parallel).
    Two prediction heads per query: 3-layer MLP for box (cx, cy, w, h
    relative to image); single linear for class (over $K+1$ classes
    including "no object").

    Set-prediction loss (Eq. 1-2, §3.1):
    $$\hat{\sigma} = \arg\min_{\sigma \in \mathfrak{S}_N} \sum_i \mathcal{L}_\text{match}(y_i, \hat{y}_{\sigma(i)})$$
    Hungarian algorithm solves the assignment in $O(N^3)$. Matching
    cost combines class probability + box L1 + box GIoU. Hungarian
    loss applied per matched pair: $-\log \hat{p}_{\hat{\sigma}(i)}(c_i)
    + \mathbb{1}_{c_i \neq \emptyset}[\lambda_\text{L1}\|b_i - \hat{b}_{\hat{\sigma}(i)}\|_1
    + \lambda_\text{GIoU}\mathcal{L}_\text{GIoU}(b_i, \hat{b}_{\hat{\sigma}(i)})]$.
    No-object class weight ×0.1 for class imbalance.

    Training (§4.1): COCO 2017 detection (118k train, 5k val).
    AdamW, transformer LR $10^{-4}$, backbone LR $10^{-5}$, weight
    decay $10^{-4}$, batch size 64 across 16 V100s, 300-epoch schedule
    (or 500 for the "long" config). LR drops ×0.1 at epoch 200 (300
    schedule) or 400 (500 schedule). Augmentation: random horizontal
    flip, random scale, random crop (shortest side 480-800, longest
    1333). Dropout 0.1 in transformer.

    Headline benchmarks (Table 1, §4.2):
    - DETR (R50): 42.0 AP, 20.5 AP_S, 45.8 AP_M, 61.1 AP_L; 41M params,
      86 GFLOPs, 28 FPS.
    - DETR-DC5 (R50, dilated C5 stride-1): 43.3 AP, 22.5 AP_S; 41M
      params, 187 GFLOPs, 12 FPS.
    - DETR (R101): 43.5 AP; 60M params.
    - DETR-DC5 (R101): 44.9 AP; 60M params.
    - Faster R-CNN-R50-FPN (3× schedule): 42.0 AP, 26.6 AP_S, 45.4
      AP_M, 53.4 AP_L; 42M params, 180 GFLOPs.
    - Faster R-CNN-R101-FPN (3× schedule): 44.0 AP, 27.2 AP_S.
    DETR matches Faster R-CNN on overall AP at lower FLOPs; large-object
    AP_L 61.1 vs 53.4 = +7.7 (large-object advantage from global
    attention); small-object AP_S 20.5 vs 26.6 = −6.1 (small-object
    disadvantage from the coarse single-scale feature map).

    Convergence: DETR 300 epochs vs Faster R-CNN 12-36 epochs — 10-25×
    slower convergence (§4.1, Fig. 4). Later work (Deformable DETR)
    reduces this dramatically.

    Panoptic segmentation extension (§5): per-query mask head produces
    binary masks; argmax across queries gives panoptic output. 45.1
    PQ on COCO panoptic val.
implementations:
  - role: official
    repo: https://github.com/facebookresearch/detr
    commit: 29901c51d7fe8712168b8d0d64351170bc0f83e0
    framework: pytorch
    license: Apache-2.0
draft: false
---

# Motivation

Direct **set prediction** for object detection — the model outputs a fixed-size set of $N$ (class, box) pairs in one forward pass, supervised by a bipartite-matching loss; eliminates hand-designed components (anchor boxes, region proposal network, non-maximum suppression) that prior detectors required. Input: RGB image $x_{\rm img} \in \mathbb{R}^{3 \times H_0 \times W_0}$ (variable size, batches zero-padded to a shared spatial extent). Output: a fixed-size set of $N = 100$ predictions, each a tuple of a class-probability vector over $C+1$ classes (including the special "no-object" class $\varnothing$) and a normalized box $(c_x, c_y, w, h) \in [0,1]^4$; predictions matched to $\varnothing$ for unfilled slots.

# Architecture

**Family & shape.** Hybrid (CNN + transformer encoder-decoder). A ResNet-50 or ResNet-101 backbone extracts a feature map $f \in \mathbb{R}^{C \times H \times W}$ where $C = 2048$, $H = H_0/32$, $W = W_0/32$ (§3.2.1). A 1×1 convolution projects channels from $C$ to model dimension $d = 256$, producing $z_0 \in \mathbb{R}^{d \times H \times W}$. The spatial map is flattened to a sequence of $HW$ tokens, augmented with fixed 2D sinusoidal positional encodings, and passed through a 6-layer transformer encoder. A 6-layer transformer decoder then takes $N = 100$ learned object queries as input and produces one (class, box) prediction per query in parallel.

**Blocks.** Five named components constitute the pipeline: backbone, 1×1 conv projection, transformer encoder, transformer decoder, and prediction heads (§3.2). The encoder applies standard multi-head self-attention + FFN over all $HW$ spatial tokens; fixed sinusoidal positional encodings are added before every self-attention layer (§3.2.2). The novel architectural element is the **transformer decoder with object queries**: the queries are $N = 100$ learnable positional embeddings that initialize the decoder input. Each query attends to all encoder tokens via cross-attention and to all other queries via self-attention; decoding is **non-autoregressive** — all $N$ queries are transformed in parallel across 6 decoder layers (§3.2.3). Auxiliary decoding losses are applied at every decoder layer with shared FFN weights (§3.2.5).

The DETR decoder layer in PyTorch:

```python
import torch.nn as nn


class DETRDecoderLayer(nn.Module):
    """One decoder layer: object queries self-attend, then cross-attend to
    encoder features. Sec. 3.2.3 of DETR (Carion et al. 2020).
    """

    def __init__(self, d: int = 256, n_heads: int = 8, mlp: int = 2048):
        super().__init__()
        self.self_attn = nn.MultiheadAttention(d, n_heads, batch_first=True)
        self.cross_attn = nn.MultiheadAttention(d, n_heads, batch_first=True)
        self.mlp = nn.Sequential(nn.Linear(d, mlp), nn.ReLU(), nn.Linear(mlp, d))
        self.n1, self.n2, self.n3 = (nn.LayerNorm(d) for _ in range(3))

    def forward(self, queries, query_pos, memory, memory_pos):
        # queries: [B, N, d]; memory: [B, HW, d]
        q = queries + query_pos
        queries = queries + self.self_attn(q, q, queries)[0]
        queries = self.n1(queries)
        q = queries + query_pos
        k = memory + memory_pos
        queries = queries + self.cross_attn(q, k, memory)[0]
        queries = self.n2(queries)
        queries = queries + self.mlp(queries)
        return self.n3(queries)
```

Each decoder output embedding is passed independently to two prediction heads: a shared 3-layer MLP (hidden dimension $d = 256$, ReLU activations) predicts a normalized bounding box $(c_x, c_y, w, h)$ via a sigmoid output, and a linear layer with softmax predicts the class label over $K + 1$ classes including the special "no-object" class $\varnothing$ for unmatched slots (§3.2.4).

**Training.** Dataset: COCO 2017 object detection. The loss has two parts — first, the Hungarian algorithm finds the optimal permutation matching predictions to ground-truth objects; then a per-matched-pair loss is applied:

:::definition[Bipartite-matching set-prediction loss]
Given $N$ predictions and the ground-truth set padded to size $N$ with $\varnothing$, find the permutation $\hat{\sigma}$ minimising a pairwise matching cost; then apply a per-matched-pair Hungarian loss combining negative-log class probability with L1 and GIoU box terms.

$$
\hat{\sigma} = \underset{\sigma \in \mathfrak{S}_N}{\operatorname{arg\,min}} \sum_{i=1}^{N} \mathcal{L}_{\rm match}\!\left(y_i,\, \hat{y}_{\sigma(i)}\right)
$$

$$
\mathcal{L}_{\rm Hungarian} = \sum_{i=1}^{N} \Bigl[ -\log \hat{p}_{\hat{\sigma}(i)}(c_i) + \mathbb{1}_{c_i \neq \varnothing}\left( \lambda_{\rm L1} \|b_i - \hat{b}_{\hat{\sigma}(i)}\|_1 + \lambda_{\rm GIoU}\, \mathcal{L}_{\rm GIoU}(b_i,\, \hat{b}_{\hat{\sigma}(i)}) \right) \Bigr]
$$
:::

Optimiser: AdamW with transformer LR $10^{-4}$, backbone LR $10^{-5}$, weight decay $10^{-4}$. Batch size 64 across 16 V100 GPUs. The default schedule trains for 300 epochs with a ×0.1 LR drop at epoch 200 (~3 days on 16 V100s); an extended 500-epoch schedule drops at epoch 400 and adds ~1.5 AP. Augmentation: random horizontal flip, random scale (shortest side 480–800 px, longest $\leq$ 1333 px), random crop (+1 AP). Dropout 0.1 in all transformer components (§4.0.2). Headline metric on COCO val: DETR-R50 reaches **42.0 AP** at 500 epochs, matching Faster R-CNN-R50-FPN+ at 42.0 AP (Table 1, §4.2).

**Complexity.** DETR-R50: 41 M params, 86 GFLOPs, 28 FPS. DETR-R101: 60 M params, 152 GFLOPs, 20 FPS. DETR-DC5 (dilated C5, stride 16 instead of 32): 41 M params, 187 GFLOPs, 12 FPS — doubles spatial token count, incurs ~16× encoder self-attention cost and ~2× total FLOPs, raises small-object AP by ~2 points (Table 1, §4.0.2).

# Implementations

Official PyTorch release from Facebook AI; the reference repository ships pretrained checkpoints for DETR-R50, DETR-R101, DETR-DC5, and the COCO panoptic head.

# Assessment

**Novelty.**

- **Bipartite-matching set-prediction loss** eliminates NMS at inference: each prediction is supervised only by its uniquely assigned ground-truth instance via the Hungarian algorithm, so the model learns to produce diverse, non-duplicate predictions without any post-processing. This replaces the anchor-matching and NMS pipeline of Faster R-CNN, Mask R-CNN, and the one-stage detector family (YOLO, SSD, RetinaNet).
- **Transformer encoder-decoder applied to detection as a complete end-to-end pipeline** — not merely as an attention module bolted onto CNN features. The decoder uses $N = 100$ learnable object queries decoded non-autoregressively (all queries in parallel), a structural departure from autoregressive transformers used in language modelling.
- **Zero spatial hyperparameters**: no anchors, no region proposals, no IoU thresholds, no scale or aspect-ratio priors — the object queries learn implicit spatial distributions from data (§3.1).
- **Natural extension to panoptic segmentation** via a small segmentation head trained on top of frozen DETR (§5) — the same set-prediction interface accommodates instance + stuff segmentation without architectural redesign.

**Strengths.**

- COCO val AP: DETR-R50 42.0 (500 ep, 86 GFLOPs) vs Faster R-CNN-R50-FPN+ 42.0 (180 GFLOPs) — comparable accuracy at 2.1× fewer FLOPs (Table 1).
- Large-object AP: DETR-R50 AP$_{\rm L}$ 61.1 vs Faster R-CNN-R50-FPN+ 53.4 — a 7.7-point absolute lead, attributed to global encoder self-attention where every spatial token attends to every other (§4.1).
- Conceptual simplicity: the detector is fully end-to-end differentiable from image pixels to (class, box) set, with no anchor boxes, no NMS, no RPN, and no IoU-threshold hyperparameters.
- Direct extensibility to other set-prediction tasks (panoptic segmentation, instance segmentation, 3D detection) by replacing the per-query prediction head, with no changes to the encoder or decoder.

**Limitations.**

- **Slow training convergence**: DETR requires 300–500 epochs vs 12–36 for Faster R-CNN (§4.0.2, §4.1) — 10–25× more wall-clock training compute to reach equal accuracy. Deformable DETR (2020) was motivated specifically by this deficit and achieves competitive AP in ~50 epochs via sparse attention.
- **Small-object AP underperforms Faster R-CNN**: DETR-R50 AP$_{\rm S}$ 20.5 vs Faster R-CNN-FPN+ 26.6 — a 6.1-point absolute deficit (Table 1). The stride-32 feature map gives small objects very few spatial tokens in the encoder; DETR-DC5 partially closes the gap (AP$_{\rm S}$ 22.5) at the cost of doubled compute.
- **Quadratic encoder self-attention cost** $O((HW)^2)$: DETR-DC5's stride-16 backbone quadruples the token count, producing 16× higher encoder attention cost and 2× total FLOPs, making very-high-resolution inputs impractical without windowed-attention variants (§4.0.2).
- **Fixed cap of $N = 100$ predictions per image**: images with more than $N$ objects will silently miss detections. COCO has up to 63 instances per image (§4.0.1), leaving the current cap adequate for that dataset but not for dense-scene applications.

# References

1. Carion, N., Massa, F., Synnaeve, G., Usunier, N., Kirillov, A., & Zagoruyko, S. *End-to-End Object Detection with Transformers.* ECCV, 2020. [arxiv](https://arxiv.org/abs/2005.12872)
2. He, K., Zhang, X., Ren, S., & Sun, J. *Deep Residual Learning for Image Recognition.* CVPR, 2016. [arxiv](https://arxiv.org/abs/1512.03385)
