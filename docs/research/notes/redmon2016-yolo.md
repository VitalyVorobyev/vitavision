---
paper_id: redmon2016-yolo
title: "You Only Look Once: Unified, Real-Time Object Detection"
authors: ["J. Redmon", "S. Divvala", "R. Girshick", "A. Farhadi"]
year: 2016
url: https://arxiv.org/pdf/1506.02640
created: 2026-05-13
relevant_atlas_pages: [faster-rcnn, felzenszwalb-deformable-parts, hog-descriptor, viola-jones-detector]
---

# Setting

Multi-class object detection on still RGB images. At inference the input is
resized to 448×448 pixels. Outputs are bounding boxes (x, y, w, h), an
objectness confidence score, and per-class probabilities for each of the C
classes. The full pipeline — feature extraction, box regression, and class
prediction — executes in a single forward pass of one CNN with no
region-proposal stage and no post-hoc classifier.

Evaluated primarily on PASCAL VOC 2007 and VOC 2012 (20 classes). Also
evaluated on COCO in passing; main numbers in the paper are VOC 2007 mAP.

# Core idea

Detection is framed as a regression problem rather than a classification
problem over sliding-window proposals. The image is divided into an S×S
spatial grid; each cell is responsible for detecting objects whose center
falls within it.

Each grid cell predicts B bounding boxes. Every box is encoded as
(x, y, w, h, confidence), where (x, y) is the center offset relative to the
cell, w and h are width/height relative to the full image, and confidence is
defined as Pr(Object) × IOU_pred^truth (paper §2, eq. 1). Each cell also
predicts C conditional class probabilities Pr(Class_i | Object), shared
across all B boxes for that cell.

For PASCAL VOC: S=7, B=2, C=20, giving a prediction tensor of
7×7×(2·5+20) = 7×7×30 (paper §2, Figure 2 caption / §2.1).

The backbone is a GoogLeNet-inspired CNN: 24 conv layers + 2 FC layers,
with alternating 1×1 reduction layers followed by 3×3 conv layers (paper §2.1,
Figure 3). Fast YOLO uses 9 conv layers. The final layer uses a linear
activation; all other layers use a leaky ReLU:

  φ(x) = x         if x > 0
          0.1x      otherwise          (paper §2.2, eq. 2)

At test time, per-cell class-specific confidence scores are:
Pr(Class_i) × IOU_pred^truth = Pr(Class_i | Object) × Pr(Object) × IOU_pred^truth
(paper §2, eq. 1)

The multi-part sum-squared-error loss function (paper §2.2, eq. 3) consists of
five terms. Two terms with weight λ_coord=5 penalize box coordinate (x,y) and
size (√w, √h) errors for responsible predictors; one term penalizes
confidence errors for object-containing cells; one term with weight
λ_noobj=0.5 penalizes confidence errors for empty cells; one term penalizes
class probability errors. Width and height are parametrized as √w and √h to
reduce the gradient imbalance between large and small boxes (paper §2.2).

Pretraining uses the first 20 conv layers on ImageNet 224×224, then detection
fine-tuning doubles input resolution to 448×448 (paper §2.1 Figure 3 caption
and §2.2).

# Assumptions

1. **One object per cell** (hard). Each grid cell predicts one set of class
   probabilities regardless of B. Two objects whose centers fall in the same
   cell cannot both be detected. Fails silently on dense-pack scenarios.

2. **Object center falls in exactly one cell** (hard). The responsibility
   assignment is exclusive; no fallback for border-straddle cases. NMS
   handles some multi-cell detections after the fact (paper §2.3 mentions
   NMS adds 2-3% mAP).

3. **Objects have aspect ratios and sizes seen during training** (soft).
   Box predictions generalize poorly to unusual aspect ratios or
   configurations not represented in the training distribution (paper §2.4).

4. **Fixed-resolution input** (hard). The image is resized to exactly 448×448
   before the forward pass. Significant distortion of non-square images
   occurs without padding.

5. **Single class per spatial location** (design constraint). Shared class
   probabilities across B boxes means the model cannot simultaneously assign
   different classes to boxes in the same cell.

# Failure regime

**Localization is the dominant error source.** The error analysis on VOC 2007
(paper §4.2) shows that localization errors account for more of YOLO's total
errors than all other error types combined. In contrast, Fast R-CNN's dominant
error is background false positives (Fast R-CNN makes almost 3× more
background errors than YOLO; paper §4.2).

**Small objects in groups.** YOLO struggles with small objects that appear in
groups, e.g. flocks of birds, because the 7×7 spatial constraint limits
nearby-object capacity to 2 boxes per cell (paper §2.4).

**Unusual aspect ratios.** The model struggles to generalize to object
configurations or aspect ratios not well represented in the training data
(paper §2.4). The coarse 7×7 spatial grid (effective stride 64 pixels on a
448×448 input) limits spatial precision for small-scale objects.

**VOC 2012 vs. 2007 gap.** On VOC 2012 test, YOLO scores 57.9% mAP, notably
lower than the 63.4% on VOC 2007. Small-object categories (bottle, sheep,
tv/monitor) are 8–10% below R-CNN or Feature Edit (paper §4.4).

# Numerical sensitivity

- **λ_coord = 5**: upweights coordinate loss relative to classification loss
  to prevent the model from being dominated by the many empty-cell confidence
  terms (paper §2.2).
- **λ_noobj = 0.5**: downweights empty-cell confidence loss to stabilize
  training (paper §2.2).
- **sqrt(w), sqrt(h) parametrization**: partials of √w with respect to w
  diverge as w→0, which can cause gradient spikes for very small ground-truth
  boxes. The motivation is to reduce the absolute gradient disparity between
  large and small boxes, but it also introduces a numerical instability regime
  at very small box sizes (paper §2.2).
- **Learning rate schedule** (paper §2.2, training paragraph): warmup from
  10⁻³ → 10⁻² over first epochs, then 10⁻² for 75 epochs, 10⁻³ for 30
  epochs, 10⁻⁴ for 30 epochs. Starting at 10⁻² directly causes gradient
  divergence.
- **Batch size 64, momentum 0.9, weight decay 0.0005** (paper §2.2).
- **Dropout rate 0.5** after the first FC layer to prevent co-adaptation
  (paper §2.2).
- **Data augmentation**: random scaling/translations ±20%, exposure/saturation
  jitter ×1.5 in HSV (paper §2.2).
- **ImageNet top-5 pretraining accuracy**: 88% on validation set, comparable
  to GoogLeNet (paper §2.2).

# Applicability

- **Use when**: real-time detection is required (target: 45 fps on Titan X for
  base YOLO; 155 fps for Fast YOLO at 52.7% mAP); global image context
  matters for reducing false positives; deployment in novel domains (artwork,
  non-photographic imagery) where proposal-based methods degrade.
- **Don't use when**: small-object precision is critical (e.g. drone
  surveillance of pedestrian crowds); objects appear in dense packs within
  single grid cells; tight localization accuracy is required — Faster R-CNN VGG
  achieves 73.2% vs YOLO 63.4% mAP on VOC 2007 (paper §4.1, Table 1).
- **Compared against**: Fast YOLO (52.7% mAP, 155 fps), Fast R-CNN (70.0%
  mAP, 0.5 fps), Faster R-CNN VGG-16 (73.2% mAP, 7 fps), Fastest DPM
  (30.4% mAP, 15 fps) — all VOC 2007 test (paper §4.1, Table 1).

# Connections

- **Builds on**: szegedy2015-inception (GoogLeNet architecture inspiration,
  paper §2.1), simonyan2014-vgg (YOLO VGG-16 variant, paper §4.1)
- **Compared against**: ren2015-faster (Faster R-CNN, paper §4.1 Table 1),
  felzenszwalb2010-detection (DPM, paper §3, §4.1), dalal2005-hog (HOG
  features as context, paper §3)
- **Downstream**: SSD, YOLOv2/v3/v4/v5/v8 (follow-on work, not in this paper)
- **Refutes / supersedes**: does not strictly supersede DPM or R-CNN family —
  reframes detection as regression, occupying a different accuracy/speed
  operating point

---

# Atlas update plan

## NEW: yolo-v1
Type: model
Category: object-detection
Primary source: this paper

**Goal**
- Predict bounding boxes and class probabilities from a full image in a single
  CNN forward pass, framing detection as regression rather than classification
  over region proposals.
- Target: real-time throughput (≥30 fps) while maintaining competitive mAP
  on multi-class detection benchmarks.

**Architecture**
- S×S grid (S=7 for VOC), B=2 boxes per cell, C=20 classes → 7×7×30 output
  tensor.
- 24 conv layers + 2 FC layers; alternating 1×1 reduction + 3×3 conv blocks
  (GoogLeNet-inspired, no Inception modules).
- Fast YOLO variant: 9 conv layers, same output head.
- Confidence score: Pr(Object) × IOU_pred^truth; class-specific score at test
  time: Pr(Class_i) × IOU_pred^truth.
- Multi-part SSE loss with λ_coord=5, λ_noobj=0.5; box size parametrized as
  (√w, √h) for scale-balanced gradients.
- Leaky ReLU (slope 0.1 for x≤0) on all layers except final linear layer.
- Pretraining at 224×224 (ImageNet, 20 conv layers + avg pool + FC, top-5
  88%), fine-tuning at 448×448 with full detection head.

**Implementations**
- Darknet (original framework, C; authors): https://github.com/pjreddie/darknet
- PyTorch reimplementations: multiple community versions (license varies —
  verify before use).

**Assessment**
- VOC 2007 test mAP: YOLO 63.4% at 45 fps; Fast YOLO 52.7% at 155 fps
  (Table 1).
- Dominant error: localization (not background FP — contrast with Fast R-CNN).
- Weaknesses: small objects in groups, unusual aspect ratios, lower
  localization precision than Faster R-CNN VGG (73.2% at 7 fps).
- Generalizes better than proposal-based methods to artwork / out-of-domain
  images (§4.5).
- YOLO + Fast R-CNN rescoring ensemble reaches 75.0% mAP on VOC 2007 (§4.3).

**References**
- Primary: redmon2016-yolo (this paper)
- Architecture basis: szegedy2015-inception
- Comparisons: ren2015-faster, felzenszwalb2010-detection

**Relations (for public page frontmatter)**
```yaml
relations:
  - type: compared_with
    target: faster-rcnn
    confidence: high
    caution: "YOLO trades localization accuracy and small-object recall for ~3× throughput; same era, different design point."
  - type: learned_alternative_of
    target: felzenszwalb-deformable-parts
    confidence: high
    caution: "Replaces sliding-window deformable templates with single-pass CNN regression; reframes detection as regression rather than classification of proposals."
```

---

## SKIPPED: mask-rcnn
Mask R-CNN extends Faster R-CNN with a segmentation head and was published in
2017, after YOLO v1. The YOLO paper does not discuss or compare against Mask
R-CNN. No meaningful cross-link to author on the yolo-v1 page.

## SKIPPED: hog-descriptor
HOG is a feature descriptor used as input to classifiers, not an end-to-end
detector. The YOLO paper cites HOG only in passing as an example of classical
feature extraction (§3). The architectural relationship is too weak to warrant
a typed relation entry — HOG's learned-alternative story is already covered by
DPM's own page.

## SKIPPED: viola-jones-detector
Viola-Jones is a single-class face/object detector using Haar features and
cascaded classifiers — a different problem class (single-class, frontal-sensor
specific) from YOLO's general multi-class detection. Per Rule B, cross-domain
methods should not be linked. No relation entry is warranted.

---

# Provenance

- §1 (Abstract / Introduction): 45 fps base YOLO, 155 fps Fast YOLO; YOLO
  makes fewer background errors than Fast R-CNN; outperforms DPM and R-CNN on
  artwork generalization.
- §2 (Unified Detection): S×S grid; B boxes per cell; confidence =
  Pr(Object)×IOU; 5 predictions per box (x,y,w,h,confidence); C conditional
  class probabilities per cell, shared across B; final tensor 7×7×30 for
  S=7, B=2, C=20 (confirmed in §2 para and Figure 2 caption).
- §2.1 (Network Design): 24 conv + 2 FC layers; GoogLeNet-inspired; 1×1
  reduction layers; 224×224 pretraining then 448×448 detection (Figure 3
  caption); Fast YOLO = 9 conv layers.
- §2.2 (Training): λ_coord=5, λ_noobj=0.5 (inline math, para 3); √w,√h
  parametrization (para 4); loss eq. 3; leaky ReLU slope 0.1 (eq. 2); LR
  schedule 10⁻³→10⁻²→75ep@10⁻²→30ep@10⁻³→30ep@10⁻⁴; batch 64, momentum
  0.9, weight decay 0.0005; dropout 0.5 after first FC; data aug ±20%
  scale/translate, ×1.5 HSV jitter.
- §2.3 (Inference): 98 bounding boxes per image; NMS adds 2-3% mAP.
- §2.4 (Limitations): small objects in groups (flocks of birds); unusual
  aspect ratios; dominant error = incorrect localization.
- §3 (Comparison to Other Detection Systems): DPM sliding window; R-CNN
  multi-stage pipeline; HOG mentioned as classical feature.
- §4.1 (Comparison to Real-Time Systems) + Table 1: Fast YOLO 52.7% / 155fps;
  YOLO 63.4% / 45fps; Fast R-CNN 70.0% / 0.5fps; Faster R-CNN VGG-16 73.2%
  / 7fps; Fastest DPM 30.4% / 15fps — all VOC 2007 test.
- §4.2 (VOC 2007 Error Analysis): YOLO localization errors dominant; Fast
  R-CNN ~3× more background false positives than YOLO.
- §4.3 (Combining Fast R-CNN and YOLO): Fast R-CNN 71.8% alone → 75.0% with
  YOLO rescoring on VOC 2007 test.
- §4.4 (VOC 2012 Results): YOLO 57.9% mAP; struggles on bottle/sheep/
  tv-monitor (8-10% gap vs R-CNN).
- §4.5 (Generalizability): YOLO degrades less than R-CNN on Picasso/People-Art
  artwork benchmarks.
