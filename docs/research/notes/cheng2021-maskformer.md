---
paper_id: cheng2021-maskformer
title: "Per-Pixel Classification is Not All You Need for Semantic Segmentation"
authors: ["B. Cheng", "A. G. Schwing", "A. Kirillov"]
year: 2021
url: https://arxiv.org/pdf/2107.06278
created: 2026-05-27
relevant_atlas_pages:
  - mask-rcnn
  - faster-rcnn
  - detr
  - fcn-semantic-segmentation
  - unet-segmentation
  - deeplab-semantic-segmentation
  - sam
  - ritm-interactive-segmentation
  - attention-mechanism
  - convolutional-neural-network
  - resnet
  - vit
---

# Setting

**Semantic segmentation** (primary task), with the same architecture also applied to **panoptic segmentation** and (by extension) instance segmentation without any modification. Input: an RGB image of size $H \times W$. Output: a set of $N$ (binary mask, class label) pairs $z = \{(p_i, m_i)\}_{i=1}^{N}$, where $p_i \in \Delta^{K+1}$ is a probability distribution over $K$ categories plus a "no object" label $\varnothing$, and $m_i \in [0,1]^{H \times W}$ is a per-pixel mask. For semantic segmentation inference, the $N$ masks are combined via matrix multiplication into a dense per-pixel label map. For panoptic inference, each pixel is assigned to the prediction pair that maximises $p_i(c_i) \cdot m_i[h,w]$.

Datasets evaluated: ADE20K (150 classes), COCO-Stuff-10K (171 classes), ADE20K-Full (847 classes), Cityscapes (19 classes), Mapillary Vistas (65 classes), COCO panoptic (133 categories).

# Core idea

**Replace per-pixel classification with mask classification.** Classical semantic segmenters (FCN, DeepLab) output a per-pixel probability vector $p_i \in \Delta^K$ and minimise cross-entropy at every pixel. MaskFormer instead poses the task as: predict a set of $N$ binary masks, each paired with a single class prediction; supervise with bipartite (Hungarian) matching between predictions and ground-truth segments (same matching as DETR, but applied to masks rather than boxes).

The training loss is (Eq. 1):

$$\mathcal{L}_{\text{mask-cls}}(z, z^{\text{gt}}) = \sum_{j=1}^{N}\!\left[-\log p_{\sigma(j)}(c_j^{\text{gt}}) + \mathbb{1}_{c_j^{\text{gt}} \neq \varnothing}\,\mathcal{L}_{\text{mask}}(m_{\sigma(j)}, m_j^{\text{gt}})\right]$$

where $\sigma$ is the optimal bipartite matching, and $\mathcal{L}_{\text{mask}}$ is a linear combination of focal loss and dice loss (weights $\lambda_{\text{focal}} = 20.0$, $\lambda_{\text{dice}} = 1.0$; Sec. 4.1).

Architecture has three components (Sec. 3.3, Fig. 2):

1. **Pixel decoder** — FPN-style upsampler applied to backbone features. Backbone produces $\mathcal{F} \in \mathbb{R}^{C_{\mathcal{F}} \times H/32 \times W/32}$ (stride $S=32$); decoder progressively 2× upsamples to yield per-pixel embeddings $\mathcal{E}_{\text{pixel}} \in \mathbb{R}^{256 \times H \times W}$. All feature maps in the pixel decoder have 256 channels.

2. **Transformer decoder** — standard Transformer decoder (Vaswani et al. 2017) with $N$ learnable query embeddings (zero-initialised with per-query learnable positional encoding). Queries cross-attend to $\mathcal{F}$ and produce $N$ per-segment embeddings $\mathcal{Q} \in \mathbb{R}^{256 \times N}$. Default: 6 decoder layers, $N = 100$ queries. Loss is applied after each decoder layer (auxiliary losses, same as DETR).

3. **Segmentation module** — a linear classifier on $\mathcal{Q}$ gives class probabilities $\{p_i\}$; a 2-hidden-layer MLP (256 channels) on $\mathcal{Q}$ gives mask embeddings $\mathcal{E}_{\text{mask}} \in \mathbb{R}^{256 \times N}$. Binary mask $m_i$ is predicted via:

$$m_i[h,w] = \sigma\!\left(\mathcal{E}_{\text{mask}}[:,i]^\top \cdot \mathcal{E}_{\text{pixel}}[:,h,w]\right)$$

(sigmoid, not softmax — masks are allowed to overlap; Sec. 3.3).

This design can be understood as a "box-free DETR": same set-prediction loss and decoder, but predicting masks directly instead of bounding boxes. The shared pixel decoder amortises the per-query upsampling cost across all $N$ queries (DETR's mask head is $N\times$ more expensive because it upsamples independently per query; Sec. 5).

# Assumptions

1. **Hard: $N \geq N^{\text{gt}}$** — the number of predicted segments must exceed the maximum number of ground-truth segments in any image. The bipartite matching pads ground truth with $\varnothing$ tokens to allow one-to-one assignment. If too few queries are used the model is strictly unable to predict all segments (Sec. 3.2).

2. **Soft: $N = 100$ is roughly right across dataset sizes** — ablations (Table in Sec. 4.4) show 100 queries optimally or near-optimally across ADE20K (150 classes), COCO-Stuff (171 classes), and ADE20K-Full (847 classes). Fewer than 20 or more than 300 queries degrade performance. The average number of distinct classes per image is similar across datasets (8.2 for ADE20K, 6.6 for COCO-Stuff, 9.1 for ADE20K-Full), supporting the 100-query default.

3. **Soft: backbone agnosticism** — MaskFormer is compatible with CNN (ResNet-50, ResNet-101, ResNet-101c) and Transformer (Swin-T/S/B/L) backbones without architectural changes.

4. **Soft: "stuff" classes benefit more than "things"** — improvement over per-pixel baselines is larger on PQ_St (stuff) than PQ_Th (things). Bounding-box-based matchers are suboptimal for amorphous stuff categories; mask-based matching addresses this (Sec. 4.3, Table 3).

5. **Soft: mask classification advantage scales with number of classes** — MaskFormer shows no mIoU gain on Cityscapes (19 classes) but gains 3.5 mIoU on ADE20K-Full (847 classes) over the per-pixel baseline. Per-pixel: a single spatial classifier must differentiate all $K$ classes at every pixel; per-mask: each query specialises on a single segment, simplifying fine-grained recognition (Sec. 4.3, Table 2).

# Failure regime

- **Slow training convergence** — inherited from DETR. The Hungarian matching is re-solved at every iteration; mask-based matching has higher cost than box-based matching because the mask loss requires evaluating $\mathcal{L}_{\text{mask}}(m_i, m_j^{\text{gt}})$ for all $N \times N^{\text{gt}}$ prediction-GT pairs. The authors acknowledge this implicitly by noting the training cost prohibits multiple panoptic runs (Sec. 4.2).

- **Pixel-level accuracy (mask quality) is the remaining challenge** — on Cityscapes where class recognition is easy, MaskFormer matches PerPixelBaseline+ in mIoU but underperforms in SQ_St (segmentation quality), indicating that coarse mask predictions are the limiting factor rather than classification. High-resolution mask prediction via a dot product with stride-1 pixel embeddings partially addresses this, but it remains a weaker point compared to dense CRF or dilated conv methods (Sec. 4.3).

- **Single-decoder-layer sufficient for semantic segmentation, but not panoptic** — for instance-level tasks, multiple Transformer decoder layers are required to eliminate duplicate predictions. A single layer is competitive for semantic but fails to produce non-redundant instance masks (Sec. 4.4).

- **Very large query counts degrade performance** — at $N = 1000$ queries, mIoU on ADE20K drops from 44.5 to 35.4, suggesting optimisation instability or capacity misallocation (ablation table, Sec. 4.4).

# Numerical sensitivity

Key numbers from the paper (all from ADE20K val unless noted):

| Config | mIoU (s.s.) | mIoU (m.s.) | #params | FLOPs |
|---|---|---|---|---|
| MaskFormer, R50 | 44.5 ± 0.5 | 46.7 ± 0.6 | 41M | 53G |
| MaskFormer, R101 | 45.5 ± 0.5 | 47.2 ± 0.2 | 60M | 73G |
| MaskFormer, R101c | 46.0 ± 0.1 | 48.1 ± 0.2 | 60M | 80G |
| MaskFormer, Swin-T† | 46.7 ± 0.7 | 48.8 ± 0.6 | 42M | 55G |
| MaskFormer, Swin-S† | 49.8 ± 0.4 | 51.0 ± 0.4 | 63M | 79G |
| MaskFormer, Swin-B† | 51.1–52.7 ± 0.2–0.4 | 52.3–53.9 | 102M | 195G |
| MaskFormer, Swin-L† | 54.1 ± 0.2 | **55.6 ± 0.1** | 212M | 375G |

(Table 1, ADE20K val. † = ImageNet-22K pretrained backbone.)

Panoptic (COCO panoptic val, Table 3):

| Config | PQ | PQ_Th | PQ_St |
|---|---|---|---|
| DETR, R50+6Enc | 43.4 | 48.2 | 36.3 |
| MaskFormer, R50+6Enc | **46.5** | 51.0 | 39.8 |
| MaskFormer, R101+6Enc | 47.6 | 52.5 | 40.3 |
| MaskFormer, Swin-L† | **52.7** | 58.5 | 44.0 |

(52.7 PQ with Swin-L, i.e. the headline number cited in the abstract.)

Default hyperparameters: 6 Transformer decoder layers, $N=100$ queries, AdamW, poly LR schedule, lr $10^{-4}$ (ResNet) / $6 \times 10^{-5}$ (Swin), weight decay $10^{-4}$ / $10^{-2}$, 160k iterations on ADE20K with 8×V100 (Sec. 4.1–4.2).

Loss weights: $\lambda_{\text{focal}} = 20.0$, $\lambda_{\text{dice}} = 1.0$; "no object" class weight $= 0.1$ in cross-entropy (same as DETR). These are not ablated in the paper — treat as fixed design choices.

The 10% parameter reduction and 40% FLOPs reduction vs. Swin-UperNet (prior SOTA) are stated in Sec. 1 (p.1) without per-model breakdown — treat as illustrative, not precisely tabulated.

# Applicability

- **Use when**: unifying semantic + instance + panoptic segmentation in a single model without task-specific heads; when number of categories is large (>50); when "stuff" class accuracy is important.
- **Use when**: a pure mask-level evaluation metric (PQ) is the target — mask classification naturally optimises per-segment quality rather than per-pixel accuracy.
- **Don't use when**: inference latency is critical and only semantic segmentation is needed — DeepLabV3+ / FCN-based models are faster and match quality on small-vocabulary datasets (e.g. Cityscapes 19 classes).
- **Don't use when**: training compute is the bottleneck — DETR-style training with Hungarian matching and auxiliary losses is expensive; FCN-style models converge much faster.
- **Compared against**: DeepLabV3+, SETR, Swin-UperNet (semantic seg); DETR, Max-DeepLab (panoptic seg); PerPixelBaseline / PerPixelBaseline+ (ablation controls).

# Connections

- **Builds on**: carion2020-detr (bipartite matching via Hungarian algorithm, Transformer decoder, DETR architecture as direct baseline); he2016-resnet (ResNet backbone); long2015-fcn (the per-pixel paradigm being challenged); lin2017-fpn? (FPN pixel decoder — cited as [26] but not in index.yaml); liu2021-swin? (Swin backbone — cited as [29]).
- **Enables**: cheng2022-mask2former (Mask2Former directly extends MaskFormer with masked attention in the Transformer decoder, improving efficiency and per-task SOTA); kirillov2023-sam (SAM's lightweight mask decoder shares the per-query mask-via-dot-product philosophy); carion2025-sam3 (SAM 3 explicitly uses a MaskFormer-adapted mask head per the Inputs section).
- **Compared against in paper**: he2017-maskrcnn (Mask R-CNN — dominant per-RoI instance segmenter, used as contrast not direct comparison); carion2020-detr (direct comparison on COCO panoptic, Table 3).

# Atlas update plan

## NEW: mask2former
Type: model
Category: segmentation (mask classification, universal)
Primary source: cheng2022-mask2former (the more canonical reference — this MaskFormer note is the v1 foundation that v2 extends)
Note: this note is the PRIMARY-SOURCE FOUNDATION for the family page; cheng2022-mask2former carries the headline architecture and final benchmarks. To be applied together.

Relations:
  - { type: feeds_into, target: sam, confidence: high, caution: "SAM 3's mask head is adapted from MaskFormer/Mask2Former; this paper establishes the mask-classification-via-set-prediction paradigm that SAM 3 inherits." }
  - { type: compared_with, target: mask-rcnn, confidence: high, caution: "Mask R-CNN is the dominant per-pixel/per-RoI instance segmenter; MaskFormer reframes the same problem as mask classification + set prediction, achieving unified handling of semantic + instance + panoptic." }

Bullets per public-page section:

**Motivation (v1):**
- Replace per-pixel classification (FCN/DeepLab) with **mask classification**: predict a set of $N$ masks, each assigned a single class label; supervised via bipartite matching (DETR-style). Unifies semantic + instance + panoptic segmentation in a single architecture without modifying model, loss, or training procedure.
- Key observation: mask classification advantage grows with vocabulary size — no mIoU gain on Cityscapes (19 classes), +3.5 mIoU on ADE20K-Full (847 classes). Cite: Table 2 / Sec. 4.3.

**Architecture (v1, this paper):**
- Three-module design: (1) pixel decoder — FPN-style upsampler on backbone features producing $\mathcal{E}_{\text{pixel}} \in \mathbb{R}^{256 \times H \times W}$; (2) Transformer decoder — 6 DETR-style decoder layers with $N=100$ learnable queries producing $\mathcal{Q} \in \mathbb{R}^{256 \times N}$; (3) segmentation module — linear classifier for class probs + MLP for mask embeddings + dot-product sigmoid for binary masks.
- Mask prediction: $m_i[h,w] = \sigma\!\left(\mathcal{E}_{\text{mask}}[:,i]^\top \cdot \mathcal{E}_{\text{pixel}}[:,h,w]\right)$ — masks not forced mutually exclusive (sigmoid, not softmax).
- Pixel decoder is shared across all queries (unlike DETR's per-query independent upsampler, which is $N\times$ more expensive). Cite: Sec. 5.

**Training (v1):**
- Bipartite-matching loss (Hungarian) over $N$ predictions: cross-entropy on class + linear combination of focal + dice on binary mask ($\lambda_{\text{focal}}=20$, $\lambda_{\text{dice}}=1$). Auxiliary loss applied after each decoder layer. Cite: Sec. 3.2–3.3, Eq. 1.
- Same data/task for all three tasks: ADE20K semantic, COCO panoptic, no panoptic-specific modifications.

**Assessment — Novelty (v1):**
- First work to show set-prediction (mask classification) beats per-pixel classification for semantic segmentation at scale.
- Unified architecture across semantic / instance / panoptic without task-specific changes.

**Assessment — Strengths (v1):**
- SOTA on ADE20K semantic segmentation: **55.6 mIoU** (Swin-L†, m.s., Table 1), +2.1 over prior Swin-UperNet SOTA.
- SOTA on COCO panoptic segmentation: **52.7 PQ** (Swin-L†, Table 3), +1.6 over prior SOTA.
- Fewer parameters and FLOPs than comparable per-pixel models at same quality level (10% fewer params, 40% fewer FLOPs vs. Swin-UperNet, Sec. 1).

**Assessment — Limitations (v1):**
- Slow training (Hungarian matching cost per iteration; DETR-style convergence).
- Pixel-level mask quality (SQ) lags on small-vocabulary datasets where per-pixel methods excel.
- Very large query counts ($N \gg 100$) hurt performance (query competition artefacts).

**References:** NeurIPS 2021. arXiv:2107.06278.

# Provenance

- Abstract (line 65–67): headline numbers — 55.6 mIoU on ADE20K, 52.7 PQ on COCO.
- Sec. 1 / p.1 (line 97): 55.6 mIoU with Swin backbone, +2.1 vs. prior SOTA, 10% param reduction, 40% FLOPs reduction.
- Sec. 3.1 (line ~123): per-pixel classification formulation — $y = \{p_i | p_i \in \Delta^K\}_{i=1}^{H \cdot W}$.
- Sec. 3.2 (line ~135): mask classification formulation — $z = \{(p_i, m_i)\}_{i=1}^{N}$, $p_i \in \Delta^{K+1}$ (includes $\varnothing$), $N \geq N^{\text{gt}}$ assumption, bipartite matching. Eq. 1: $\mathcal{L}_{\text{mask-cls}}$.
- Sec. 3.3 (line ~168): MaskFormer architecture — backbone stride $S=32$, pixel decoder output $\mathcal{E}_{\text{pixel}} \in \mathbb{R}^{256 \times H \times W}$, Transformer decoder with $N$ queries producing $\mathcal{Q} \in \mathbb{R}^{256 \times N}$, mask prediction equation $m_i[h,w] = \sigma(\mathcal{E}_{\text{mask}}[:,i]^\top \cdot \mathcal{E}_{\text{pixel}}[:,h,w])$, MLP has 2 hidden layers of 256 channels.
- Sec. 4.1 (line ~214): $N=100$ default, 6 decoder layers, AdamW, poly LR, $\lambda_{\text{focal}}=20.0$, $\lambda_{\text{dice}}=1.0$, "no object" weight $=0.1$, pixel/mask embedding dimension $= 256$.
- Sec. 4.2 (line ~260): 8×V100 training, 160k iterations for ADE20K, 64×V100 for COCO panoptic, crop size 512×512 (ADE20K) / 640×640 (COCO panoptic).
- Table 1 (line 272, extracted): ADE20K val mIoU — full per-backbone table including Swin-L† 54.1 (s.s.) / 55.6 (m.s.), 212M params, 375G FLOPs; R50 41M params 53G FLOPs.
- Table 2 (line ~1600): cross-dataset comparison — PerPixelBaseline+ vs. MaskFormer gains of +2.6 (ADE20K), +2.9 (COCO-Stuff), +3.5 (ADE20K-Full), 0.0 (Cityscapes mIoU) with R50.
- Table 3 (line ~1002): COCO panoptic — DETR R50+6Enc 43.4 PQ; MaskFormer R50+6Enc 46.5 PQ; MaskFormer Swin-L† 52.7 PQ / 58.5 PQ_Th / 44.0 PQ_St.
- Table 4 / ablation (line ~1600): per-pixel vs. mask classification — PerPixelBaseline+ 41.9 mIoU; MaskFormer-fixed 43.7; MaskFormer-bipartite 44.2; number of queries table showing 100 optimal.
- Sec. 5 (line ~2060): matching with masks vs. boxes comparison (Table 5); pixel-decoder shared cost argument.
- Sec. 6 (conclusion, line ~2172): "first time unifies semantic- and instance-level segmentation with exact same model, loss, and training pipeline."
