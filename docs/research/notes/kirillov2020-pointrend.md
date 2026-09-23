---
paper_id: kirillov2020-pointrend
title: "PointRend: Image Segmentation As Rendering"
authors: ["Alexander Kirillov", "Yuxin Wu", "Kaiming He", "Ross Girshick"]
year: 2020
url: https://arxiv.org/pdf/1912.08193
created: 2026-09-23
relevant_atlas_pages: [pointrend, mask-rcnn, deeplab-semantic-segmentation, fcn-semantic-segmentation, mask2former]
---

# Setting

Refinement of coarse pixel-grid segmentation to a high-resolution label map, for both
instance and semantic segmentation, on top of an existing trained base network. Input:
(1) one or more CNN feature maps $f(x_i,y_i)$ defined over a regular grid, "typically 4×
to 16× coarser than the image grid" (§3, opening paragraph after Fig. 3), and (2) an
existing coarse prediction from that base network — e.g. a 7×7 mask from Mask R-CNN's
box/RoI head for instance segmentation, or a stride-16 feature map's prediction for
semantic segmentation (§3.2, "Coarse prediction features"; §5, "Implementation
details"). Output: point predictions $p(x_i', y_i')$ over a finer, adaptively-selected
grid — up to full input resolution (e.g. 224×224 masks, or 1024×2048 semantic maps) —
composited back onto the regular output grid (§3, §4, §5).

# Core idea

PointRend treats segmentation as a rendering problem borrowed from computer graphics:
rather than densely predicting every pixel of the output grid, it (i) adaptively selects
a small set of real-valued points likely to lie near high-frequency regions (object
boundaries), (ii) extracts a point-wise feature vector at each by bilinear interpolation
of backbone feature maps, and (iii) predicts a label at each point with a shared small
MLP (the "point head") (§3, "the central idea of this paper is to view image
segmentation as a rendering problem," opening of §3).

**Inference (adaptive subdivision).** Starting from a coarse $M_0\times M_0$ prediction,
each step bilinearly upsamples 2× and re-predicts only the $N$ most uncertain points on
the denser grid (uncertainty ≈ closeness to 0.5 for instance masks, §3.1 "Inference";
top-1/top-2 class-probability gap for semantic segmentation, §5). This repeats until the
desired resolution $M\times M$ is reached, requiring "no more than $N\log_2\frac{M}{M_0}$
point predictions" rather than $M\times M$ — e.g. $M_0=7$, $M=224$ gives 5 subdivision
steps, and with $N=28^2$ this is "28²·4.25 points, which is 15 times smaller than
$224^2$" (§3.1).

**Training (non-iterative point sampling).** Because sequential subdivision doesn't
backprop cleanly, training instead samples $N$ points per region via three rules applied
on a fixed coarse prediction: (i) *over-generation* — draw $kN$ candidate points ($k>1$)
uniformly at random; (ii) *importance sampling* — interpolate the coarse prediction at
all $kN$ points, compute a task-specific uncertainty, and keep the $\beta N$ most
uncertain ($\beta\in[0,1]$); (iii) *coverage* — sample the remaining $(1-\beta)N$ points
uniformly (§3.1, "Training"). The paper's default is $k=3$, $\beta=0.75$, $N=14^2$ points
per instance-segmentation region (§4, "Training"); ablations show "a wide range of
parameters $2<k<5$ and $0.75<\beta<1.0$ delivers similar results" but heavily biased
sampling ($k=10,\beta=1.0$) underperforms even uniform/regular-grid sampling (§4.2,
"Point selection during training"; Table 4).

**Point-wise representation and point head.** Each selected point's feature vector
concatenates two sources: *fine-grained features*, bilinearly interpolated from a
backbone map (P2 of FPN for the Mask R-CNN/SemanticFPN instantiations, res2 for
DeepLabV3, §3.2/§5); and *coarse prediction features*, the $K$-class coarse prediction
interpolated at the same point, which supply region-specific context that fine-grained
features alone lack ("the same point overlapped by two instances' bounding boxes will
have the same fine-grained features. Yet, the point can only be in the foreground of one
instance," §3.2, "Coarse prediction features"). A weight-shared MLP — "analogous to a
graph convolution or a PointNet" (§3.2, "Point head") — predicts the $K$-class label
from this concatenated vector independently per point, with ReLU on hidden layers and
sigmoid output.

# Claimed contributions

*(No explicit numbered contribution list; claims below are verbatim/paraphrased from the
Abstract and §3's framing.)*

- C1: A general point-based refinement module — "the PointRend (Point-based Rendering)
  neural network module: a module that performs point-based segmentation predictions at
  adaptively selected locations based on an iterative subdivision algorithm... PointRend
  can be flexibly applied to both instance and semantic segmentation tasks by building on
  top of existing state-of-the-art models" (Abstract).
- C2: Quantitative accuracy gains — "PointRend yields significant gains on COCO and
  Cityscapes, for both instance and semantic segmentation" (Abstract); quantified as
  +0.9 to +2.8 AP for Mask R-CNN (Table 1), +1.2 mIoU for DeepLabV3 (Table 6), +0.9 to
  +1.1 mIoU for SemanticFPN (Table 7).
- C3: Efficiency at high output resolution — "PointRend's efficiency enables output
  resolutions that are otherwise impractical in terms of memory or computation compared
  to existing approaches" (Abstract); quantified in Table 2 (>30× FLOPs reduction at
  224×224 vs. a naively-upsized 4×conv head).
- C4: Sharper qualitative boundaries — "PointRend outputs crisp object boundaries in
  regions that are over-smoothed by previous methods" (Abstract).
- C5: The rendering reframing itself — "The central idea of this paper is to view image
  segmentation as a rendering problem and to adapt classical ideas from computer graphics
  to efficiently 'render' high-quality label maps" (opening of §3).

# Assumptions

1. Requires an existing base segmentation network supplying (a) backbone feature maps
   coarser than the desired output grid and (b) a coarse prediction to seed the process
   (Fig. 3; §3, opening). PointRend is a refinement module, not a standalone segmenter —
   hard dependency.
2. Training's non-iterative random-sampling strategy (over-generation + importance +
   coverage) is assumed to be an adequate surrogate for inference-time sequential
   subdivision (§3.1, "Training": "subdivision introduces sequential steps that are less
   friendly to training... Instead, for training we use a non-iterative strategy"). Soft
   assumption — validated empirically (Table 4 shows biased sampling helps) rather than
   proven equivalent to the inference procedure.
3. Point-wise features from bilinear interpolation of the 4 nearest grid neighbors
   (§3.2, "Fine-grained features") implicitly assume local smoothness of the feature
   maps between grid points is informative for real-valued query locations. Not
   discussed explicitly as an assumption in the paper. ?
4. The point head MLP shares weights across all points and all regions (§3.2, "Point
   head"), assuming a single per-point classifier generalizes across spatial location and
   object instance — an explicit design choice, analogized to PointNet/graph convolution.
5. For instance segmentation, coarse-prediction features are assumed necessary (not just
   fine-grained backbone features) to disambiguate a point shared by two overlapping
   boxes, since "the same point overlapped by two instances' bounding boxes will have the
   same fine-grained features. Yet, the point can only be in the foreground of one
   instance" (§3.2, "Coarse prediction features").

# Failure regime

- Training-time point selection that is *too* aggressively biased toward uncertain
  points degrades accuracy below even uniform or regular-grid sampling: $k=10,\beta=1.0$
  gives COCO AP 34.4 vs. 35.7 (regular grid) / 35.9 (uniform $k=1,\beta=0$) / 36.3
  (mildly biased $k=3,\beta=0.75$) — "indicating the importance of coverage" (§4.2,
  "Point selection during training"; Table 4).
- Standard IoU-based metrics (mask AP, mIoU) are "heavily biased towards object-interior
  pixels and, therefore, less sensitive to boundary quality" (§4.1, discussion of Table
  1), so quantitative gains understate — and quantitative near-saturation can mask —
  real boundary-quality differences; the paper explicitly notes visual improvements
  continue at higher output resolutions even after AP saturates (Table 3 discussion,
  §4.1: "AP also saturates with the number of points sampled... Additional points may
  make predictions in the areas where a coarse prediction is already sufficient. For
  objects with complex boundaries, however, using more points may be beneficial").
- Replacing the all-pairs region-of-interest correlation with the plain interior-only
  regular grid ("regular grid" row, Table 4) performs comparably to uniform sampling but
  worse than biased importance sampling — the gain from adaptivity is modest without
  the biasing toward uncertain/boundary regions.

# Numerical sensitivity

- Training point-selection hyperparameters $k$ (over-generation factor) and $\beta$
  (importance-sampling fraction) have a broad stable range — "a wide range of parameters
  $2<k<5$ and $0.75<\beta<1.0$ delivers similar results" (§4.2) — but degrade sharply
  outside it (Table 4, $k=10,\beta=1.0$).
- Number of training points per region is robust down to a point: "sampling only 49
  points per box still maintains AP, though we observe an increased variance in AP"
  (§4.2, "Point selection during training"), vs. the default $N=14^2$.
- Output resolution / subdivision depth: AP saturates around 112×112–224×224 with
  $N=28^2$ points per subdivision step (Table 3: 36.3/39.7/35.8 AP/AP$^\star$/AP
  unchanged from 112×112 through 224×224, and unchanged further increasing points per
  step from 28² to 112²), while qualitative detail keeps improving for complex objects
  (§4.1).
- Uncertainty measures differ by task and are not on a common scale: instance
  segmentation uses $|\,p - 0.5\,|$ against the coarse sigmoid probability (§3.1,
  "Inference"; §4, "Inference"), while semantic segmentation uses the gap between the
  top-1 and top-2 class probabilities (§5, "Implementation details") — no shared
  normalization is defined between the two uncertainty definitions. ? Not discussed as a
  design tension in the paper; noted here as an inference from the two definitions as
  stated.
- No explicit feature-scale normalization is described for the concatenated
  fine-grained + coarse-prediction point feature vector (§3.2) beyond what training
  induces implicitly.

# Applicability

- Use when: an existing trained segmentation network (Mask R-CNN-style instance head,
  or FCN/DeepLabV3/SemanticFPN-style semantic head) needs cheap, adaptively-sampled
  resolution refinement at inference and/or training time (§1, §4, §5).
- Don't use when: no base segmentation architecture with a coarse prediction + backbone
  feature maps is available — PointRend augments an existing coarse predictor rather
  than replacing the full pipeline (Fig. 3; §3, opening).
- Compared against (paper's own baselines): the default "4× conv" region-wise-FCN mask
  head in Mask R-CNN (Table 1, Table 2); dilated-convolution ("OS-8") upsampling in
  DeepLabV3 (Table 6); plain SemanticFPN at P2-P5/P3-P5 (Table 7); briefly contrasted in
  Related Work with TensorMask's sliding-window design and Marin et al.'s non-uniform
  input subsampling (§2).

# Stated relations

| target (paper-id or slug) | paper's claim (quote + §) | proposed type | confidence | notes |
|---|---|---|---|---|
| mask-rcnn | "Our experiments use Mask R-CNN with a ResNet-50 [20] + FPN [28] backbone. The default mask head in Mask R-CNN is a region-wise FCN, which we denote by '4× conv'... We use this as our baseline for comparison. For PointRend, we make appropriate modifications to this baseline" (§4, "Architecture"); Fig. 1 caption: "When used to replace Mask R-CNN's default mask head [19] (top-left), PointRend yields significantly more detailed results (top-right)." | feeds_into | medium | PointRend's instance-segmentation instantiation directly reuses Mask R-CNN's RoIAlign box-head features (14×14 crop from FPN P2) and its coarse 7×7 prediction as one of its two point-feature inputs (§3.2 "Coarse prediction features"; §4 "Lightweight, coarse mask prediction head") — more than downstream data-flow. But PointRend is explicitly framed as a generic module also applicable to FCN and DeepLabV3 (§1: "can be incorporated into popular meta-architectures... e.g., Mask R-CNN... and semantic segmentation... e.g., FCN"), so "built on Mask R-CNN specifically" is not the paper's own framing — orchestrator should weigh whether this is genuine build-on or the same generic-base-architecture pattern proposed as "no edge" for DeepLabV3/FCN below. |
| deeplab-semantic-segmentation | "We demonstrate that PointRend can benefit two semantic segmentation models: DeeplabV3 [5]... and SemanticFPN [24]" (§5, opening); Table 6 result. | none (Rule: generic interchangeable base architecture) | — | DeepLabV3 is one of two symmetric example base architectures (the other being SemanticFPN) that PointRend is applied on top of; the paper does not frame PointRend as incorporating DeepLabV3's specific idea (atrous convolution) — it only consumes DeepLabV3's res2 features and coarse output as generic inputs (§5, "Implementation details"). Reads as the "A's output can be fed to B" pattern CLAUDE.md excludes from `feeds_into`; a shared concept page (point-based segmentation refinement) would carry this better than a pairwise edge. Fallback if an edge is wanted: `feeds_into`/low. |
| fcn-semantic-segmentation | "PointRend can be incorporated into popular meta-architectures for both instance segmentation (e.g., Mask R-CNN [19]) and semantic segmentation (e.g., FCN [35])" (§1); "Fully convolutional networks (FCNs) [35] are the foundation of modern semantic segmentation approaches" (§2, "Semantic segmentation"). | none (Rule: generic interchangeable base architecture / foundational background citation) | — | Same reasoning as DeepLabV3: FCN is named as a generic example target architecture in §1's abstract framing, and elsewhere cited only as general background lineage for the field (§2), not as a specific incorporated component of PointRend's own design. |
| mask2former | *(this paper does not cite Mask2Former, which postdates it; relation is evidenced from the target's own note.)* cheng2022-mask2former.md, §3.3/"REFS": Mask2Former's "point-sampled mask loss" uses $K=12544$ points with "importance sampling for the final loss, uniform sampling for matching," reducing per-image memory 18GB→6GB, and lists "PointRend (importance sampling)" as the source of this component. | feeds_into | high | Directly matches this paper's training-time point-selection strategy (over-generation + importance sampling + coverage, §3.1 "Training") as a named, adopted internal component of Mask2Former's loss computation — not mere data-flow. Chronology valid: this paper (2019 arXiv / 2020 CVPR) precedes Mask2Former (2022). |

Not committed: pointrend↔deeplab-semantic-segmentation — DeepLabV3 is one of two symmetric example base architectures PointRend is demonstrated on; no incorporated-component claim, only generic coarse-prediction/feature inputs (Rule: generic interchangeable base architecture). Confirmed by user 2026-09-23.
Not committed: pointrend↔fcn-semantic-segmentation — FCN is named only as a generic example target architecture and as general background lineage for the field, not as an incorporated component of PointRend's own design. Confirmed by user 2026-09-23.

# Connections

- Builds on: [he2017-maskrcnn (instance-segmentation base architecture and RoIAlign/box-head feature source, §4), chen2018-deeplab (DeepLabV3, one of two semantic-segmentation base architectures, §5), long2015-fcn (the other named semantic-segmentation base architecture and the historical "FCN as foundation" framing, §1, §2), lin2017-fpn (FPN P2 level supplies fine-grained features for the Mask R-CNN and SemanticFPN instantiations, §4, §5)]
- Enables: [cheng2022-mask2former (point-sampled/importance-sampled mask loss — per cheng2022-mask2former.md's own note, §3.3; not stated in this paper since Mask2Former postdates it)]
- Refutes / supersedes: none claimed — PointRend augments the mask/prediction heads of Mask R-CNN, DeepLabV3, and SemanticFPN rather than replacing their backbones or overall architectures (§4, §5).

# Atlas update plan

## NEW: pointrend
Type: model
Category: segmentation (instance & semantic refinement module)
Primary source: this paper
Bullets per public-page section:
- Motivation: reframes fixed-grid segmentation as a rendering/adaptive-subdivision problem — regular grids oversample smooth interiors and undersample high-frequency object boundaries; classical graphics subdivision techniques (Whitted 1979, cited [48]) inspire an adaptive point-selection scheme instead (§1, opening two paragraphs; §3 opening, C5).
- Architecture: (1) point selection — inference: iterative coarse-to-fine adaptive subdivision, $N=28^2$ most-uncertain points per step, 5 steps from $M_0=7$ to $M=224$ (§3.1 "Inference"; §4 "Inference"); training: non-iterative over-generation ($kN$) + importance sampling ($\beta N$ most uncertain) + coverage ($(1-\beta)N$ uniform), default $k=3,\beta=0.75,N=14^2$ (§3.1 "Training"; §4 "Training"). (2) point-wise features — bilinear-interpolated fine-grained backbone features (FPN P2 for Mask R-CNN/SemanticFPN, res2 for DeepLabV3) concatenated with bilinear-interpolated coarse $K$-class prediction features (§3.2). (3) point head — weight-shared MLP (3 hidden layers × 256 channels for the Mask R-CNN instantiation), ReLU hidden / sigmoid output (§3.2, §4 "PointRend").
- Implementation: lightweight coarse mask head replacing Mask R-CNN's default "4× conv" — 14×14 RoIAlign crop from FPN P2 → stride-2 2×2 conv → 7×7 → 2-hidden-layer MLP → $K$-class 7×7 mask (§4 "Lightweight, coarse mask prediction head"); complexity $N\log_2(M/M_0)$ point predictions vs. $M^2$ dense, e.g. ≈15× fewer than $224^2$ at the paper's default settings (§3.1).
- Assessment: Mask R-CNN+PointRend +0.9 to +2.8 AP over the 4×conv baseline depending on metric/dataset (Table 1); >30× FLOPs reduction at 224×224 output, 0.9B vs. 34B FLOPs (Table 2); DeepLabV3+PointRend +1.2 mIoU on Cityscapes (Table 6); SemanticFPN+PointRend +0.9 to +1.1 mIoU (Table 7); gains hold with larger backbones (R101-FPN, X101-FPN) and a longer 3× schedule (Table 5); ~13 fps unoptimized at 224×224 output (§4.1).
- References: this paper (primary); he2017-maskrcnn, chen2018-deeplab, long2015-fcn, lin2017-fpn (base architectures / feature sources it is evaluated on).

## UPDATE: mask-rcnn
Section: Remarks / Relations
Bullets to add:
- Note PointRend's own positioning: it replaces Mask R-CNN's default "4× conv" region-wise-FCN mask head with an adaptively-sampled point-based head, reusing the box head's RoIAlign features and FPN P2 fine-grained features (§4 "Architecture"; Fig. 1 caption). See Stated relations table above for the proposed `feeds_into` edge (medium confidence, flagged for orchestrator judgment since PointRend is also presented symmetrically as applicable to FCN/DeepLabV3) — not committed here per plan.

Relations:
- { type: feeds_into, target: pointrend, confidence: medium, caution: "PointRend is a generic refinement module; Mask R-CNN is its primary instance-segmentation base, not its only one." }
Confirmed by user 2026-09-23.

## UPDATE: mask2former
Section: Remarks / Relations
Bullets to add:
- cheng2022-mask2former.md's own note (§3.3 / "REFS" list) documents Mask2Former's point-sampled mask loss ($K=12544$ points, importance sampling for the final loss, uniform sampling for the matching cost, 18GB→6GB per-image memory reduction) as adopting this paper's training-time point-selection strategy (over-generation + importance sampling + coverage, §3.1 "Training"). See Stated relations table above for the proposed `feeds_into` edge (pointrend → mask2former, high confidence, chronologically valid: 2019/2020 ≤ 2022) — not committed here per plan.

# Provenance

- 2026-09-23 orchestrator fix: point counts restored to $14^2$ / $28^2$ / $112^2$ — pdftotext dropped the superscripts ("142", "282", "1122"); consistent with the paper's own "$28^2\cdot4.25$ points, 15× smaller than $224^2$" (3332 vs 50176).

- Abstract: headline claims (C1–C4 above); "significant gains on COCO and Cityscapes."
- §1 (Introduction): oversampling/undersampling framing of regular grids; "PointRend can be incorporated into popular meta-architectures for both instance segmentation (e.g., Mask R-CNN [19]) and semantic segmentation (e.g., FCN [35])."
- §2 (Related Work): TensorMask and Marin et al. [36] contrast; "Fully convolutional networks (FCNs) [35] are the foundation of modern semantic segmentation approaches"; encoder-decoder background list including U-Net [44] and HRNet [45] (background citations only, no specific positioning quote).
- §3 (Method, opening): rendering analogy (C5); PointRend module definition, $f(x_i,y_i)$ / $p(x_i',y_i')$ notation.
- §3.1 ("Point Selection for Inference and Training"): inference adaptive-subdivision procedure; complexity bound $N\log_2(M/M_0)$; worked example $M_0=7$, $M=224$, 5 steps, $N=28^2$, "28²·4.25 points, which is 15 times smaller than $224^2$"; training's three-rule sampling (over-generation/importance/coverage).
- §3.2 ("Point-wise Representation and Point Head"): fine-grained vs. coarse-prediction feature definitions; point head MLP description and PointNet/graph-convolution analogy.
- §4 ("Experiments: Instance Segmentation"), "Architecture"/"Lightweight, coarse mask prediction head"/"PointRend"/"Training"/"Inference" subsections: Mask R-CNN ResNet-50+FPN setup; 4×conv baseline definition (footnote 2: 4×3×3 conv layers, 256 channels, deconv to 28×28, 1×1 logits); $k=3,\beta=0.75,N=14^2$ training defaults; $N=28^2$, 5-step inference; ~13 fps runtime.
- §4.1 ("Main Results"): Table 1 (COCO/Cityscapes AP, AP$^\star$); Table 2 (FLOPs/activations at 224×224); Table 3 (subdivision resolution/point-count ablation); discussion of AP saturation vs. qualitative improvement.
- §4.2 ("Ablation Experiments"): "Point selection during training," Table 4 (selection-strategy ablation incl. $k=10,\beta=1.0$ failure case); "$2<k<5$ and $0.75<\beta<1.0$" robust range; 49-point sampling result; Table 5 (larger backbones/longer schedule).
- §5 ("Experiments: Semantic Segmentation"), "Implementation details": DeepLabV3/SemanticFPN setup; res2/P2 fine-grained sources; semantic-segmentation uncertainty definition (top-1/top-2 class-probability gap); $N=8096$ inference points; Table 6 (DeepLabV3 mIoU), Table 7 (SemanticFPN mIoU).
- Appendix A/B: training hyperparameters (SGD, learning rates, schedules) for COCO/Cityscapes instance and semantic experiments — not otherwise used above.
