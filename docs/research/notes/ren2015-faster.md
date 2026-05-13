---
paper_id: ren2015-faster
title: "Faster R-CNN: Towards Real-Time Object Detection with Region Proposal Networks"
authors: ["S. Ren", "K. He", "R. Girshick", "J. Sun"]
year: 2015
url: https://arxiv.org/pdf/1506.01497
created: 2026-05-13
relevant_atlas_pages: [mask-rcnn, felzenszwalb-deformable-parts, viola-jones-detector, hog-descriptor, resnet, alexnet, vgg]
---

# Setting

General multi-class object detection. Input: an RGB image of any size (no per-image proposal pre-computation required). Output: a set of axis-aligned bounding boxes, each with a class label drawn from a fixed vocabulary and a softmax confidence score in $[0, 1]$.

The system is a unified two-stage pipeline: a Region Proposal Network (RPN) shares the full-image convolutional feature map with a Fast R-CNN detection head. At inference time the RPN generates at most 300 class-agnostic candidate boxes in ~10 ms; the Fast R-CNN head re-scores and refines them using RoI-pooled features from the same shared backbone. No external proposal method (Selective Search, EdgeBoxes) is needed at test time.

Supported backbones in the paper: Zeiler-Fergus (ZF, 5 shareable conv layers) and VGG-16 (13 shareable conv layers). Later benchmarks use ResNet-101 (§4, ILSVRC/COCO 2015 competition results).

# Core idea

A Region Proposal Network is a fully convolutional network that slides a small $3 \times 3$ network over the last shared conv feature map. At each spatial location it regresses $k = 9$ anchor boxes (3 scales × 3 aspect ratios) simultaneously for objectness (fg/bg) and bounding-box deltas, producing proposals relative to translation-invariant anchor templates rather than enumerating image or filter pyramids (§3.1). Each anchor is parameterised by center $(x_a, y_a)$, width $w_a$, and height $h_a$; the RPN predicts log-space scale offsets:

$$t_x = \frac{x - x_a}{w_a}, \quad t_y = \frac{y - y_a}{h_a}, \quad t_w = \log\frac{w}{w_a}, \quad t_h = \log\frac{h}{h_a}$$

(Eq. 2). The RPN loss is a multi-task loss balancing binary log-loss on objectness $L_\text{cls}$ and smooth-L1 regression on box deltas $L_\text{reg}$, activated only for positive anchors:

$$L(\{p_i\}, \{t_i\}) = \frac{1}{N_\text{cls}} \sum_i L_\text{cls}(p_i, p_i^*) + \lambda \frac{1}{N_\text{reg}} \sum_i p_i^* L_\text{reg}(t_i, t_i^*)$$

(Eq. 1). Proposals are ranked by objectness score, deduplicated with NMS at IoU 0.7, and the top 300 are passed to the Fast R-CNN head which shares the same conv weights. Training follows a 4-step alternating optimisation: (1) train RPN from ImageNet init; (2) train Fast R-CNN detector on step-1 proposals; (3) fine-tune RPN with shared conv layers frozen; (4) fine-tune Fast R-CNN unique layers only (§3.2). An approximate joint training (25–50% faster) was later shown to converge to nearly the same accuracy.

# Assumptions

1. **Anchor scale/aspect coverage** (hard): the anchor grid $\{128^2, 256^2, 512^2\} \times \{1{:}1, 1{:}2, 2{:}1\}$ must cover the scale and aspect distribution of objects in the target domain. An object whose size or aspect lies far outside all anchors will produce no positive training signal and will be missed at inference.
2. **Backbone translation equivariance** (soft): the conv feature map must be approximately translation-equivariant so that a single set of anchor templates generalises across spatial positions. Architectures with heavy global pooling or non-local operations before the RPN head violate this assumption.
3. **Single-scale input** (soft): images are resized so the shorter side is $s = 600$ pixels (§3.3). Multi-scale pyramids improve accuracy but hurt the speed-accuracy trade-off; the design assumes this single-scale approximation is sufficient.
4. **ImageNet pre-training** (hard in practice): all conv layers are initialised from an ImageNet-trained model. Training from scratch on small datasets is not evaluated and likely to underfit.
5. **GPU availability** (hard for real-time): the 5 fps figure (VGG-16, K40) and 17 fps figure (ZF, K40) assume GPU execution. CPU inference is not supported at reported speeds (§Table V).
6. **Object non-overlap at NMS boundary** (soft): the NMS threshold of 0.7 for proposal deduplication assumes objects do not heavily overlap. Crowds of same-class objects produce merged or dropped proposals.

# Failure regime

- **Small objects**: the backbone stride of 16 pixels for both ZF and VGG-16 sets a minimum detectable object scale; an object whose box is smaller than roughly one stride unit produces a very weak activation at the RPN head. The COCO experiment adds a $64^2$ anchor scale specifically to address this (§4.2).
- **Extreme aspect ratios**: the three aspect ratios $\{2{:}1, 1{:}1, 1{:}2\}$ do not cover very wide (e.g., $8{:}1$) or very tall objects. The anchor regressor degrades gracefully (mAP drops 3–4% when reduced to a single aspect ratio, Table VIII), but misses become hard when the true shape is completely outside the template set.
- **Crowded instances**: NMS at IoU 0.7 fuses overlapping proposals; the Fast R-CNN head further applies detection NMS. Dense scenes with heavily overlapping same-class objects (typical in pedestrian datasets) generate systematically suppressed detections.
- **Domain shift**: the backbone conv features are tuned for natural ImageNet textures. Aerial, medical, or infrared imagery with different texture statistics degrades proposal recall substantially without domain-specific fine-tuning.
- **Slow convergence and sensitivity to training schedule**: alternating 4-step training is empirically stable but slow (~60k + 20k iterations on PASCAL VOC, §3.1.3). Approximate joint training reduces time by 25–50% but the gradient approximation can cause subtle degradation for very deep backbones.

# Numerical sensitivity

- **Anchor scales and aspect ratios**: $k = 9$ ($3 \times 3$). Reducing to $k = 1$ costs 3–4% mAP; reducing aspect ratios from 3 to 1 while keeping 3 scales costs ~0.1% (Table VIII). The system is robust to moderate anchor over-specification.
- **IoU thresholds**: positive anchor label if IoU $\geq 0.7$ with any GT box; negative if IoU $< 0.3$ for all GT boxes; anchors in $(0.3, 0.7)$ contribute nothing to the loss (§3.1.2). These two thresholds are the most sensitive hyper-parameters in proposal quality.
- **NMS IoU for proposals**: fixed at 0.7 (§3.3). Removing NMS entirely (using all 6000 raw proposals) costs only ~0.5% mAP (Table II), suggesting NMS is more important for speed than accuracy.
- **Loss balance $\lambda$**: default $\lambda = 10$ makes cls and reg terms roughly equal after normalisation by $N_\text{cls} = 256$ (mini-batch size) and $N_\text{reg} \approx 2400$ (number of anchor locations). mAP changes by ~1% across $\lambda \in [1, 100]$ (Table IX); robust to this parameter.
- **Sliding window size**: $n = 3$ (§3.1). Effective receptive field is 171 pixels (ZF) or 228 pixels (VGG-16). The large effective receptive field is why $3 \times 3$ with $512^2$ anchors can produce proposals larger than the direct receptive field.
- **Mini-batch sampling**: 256 anchors per image, up to 128 positive, rest negative (1:1 ratio padded with negatives if fewer than 128 positives, §3.1.3). Biasing toward negatives without this balance causes training divergence.
- **Learning rate schedule** (PASCAL VOC): lr = 0.001 for 60k mini-batches, 0.0001 for 20k; momentum 0.9, weight decay 0.0005 (§3.1.3).
- **Learning rate schedule** (COCO, 8-GPU): lr = 0.003 for 240k iterations, 0.0003 for 80k; effective mini-batch 8 for RPN, 16 for Fast R-CNN (§4.2).
- **Bounding-box parameterisation**: log-space for width and height (Eq. 2) — critical for well-conditioned regression across large scale variation. Linear parameterisation would produce an ill-conditioned loss dominated by large boxes.

# Applicability

- Use when: end-to-end learned multi-class object detection is required; GPU inference budget is 200–400 ms/image; training data is natural-image-domain (or fine-tuning from ImageNet pre-trained weights is viable); a small number of proposals (300) per image is acceptable.
- Don't use when: latency budget is below 30 ms per image and accuracy is non-negotiable (consider one-stage detectors: SSD, YOLO, RetinaNet); classes are heavily out-of-distribution from ImageNet natural images without large domain-specific datasets for fine-tuning; CPU-only deployment is required (sliding-window detectors or lightweight models are preferable).
- Compared against: Selective Search + Fast R-CNN (the direct baseline; SS takes ~1.5 s/image CPU vs. RPN 10 ms GPU), EdgeBoxes + Fast R-CNN (similar mAP, slower proposals), OverFeat one-stage sliding-window detection (4.8% mAP gap in favour of Faster R-CNN's two-stage cascade on PASCAL VOC 2007 with ZF, Table X).

# Connections

- Builds on:
  - SPPnet (He et al., ECCV 2014) — spatial pyramid pooling, shared conv features concept; not in index
  - Fast R-CNN (Girshick, ICCV 2015) — RoI pooling, multi-task loss, end-to-end detector training; not in index
  - `krizhevsky2012-alexnet` — ImageNet pre-training paradigm; ZF net is an AlexNet-family architecture
  - `simonyan2014-vgg` — VGG-16 is the primary backbone in experiments
  - Selective Search (Uijlings et al., IJCV 2013) — the proposal method replaced; not in index
  - FCN (Long et al., CVPR 2015) — fully convolutional formulation that the RPN adopts; not in index
  - R-CNN (Girshick et al., CVPR 2014) — two-stage object detection precursor; not in index

- Enables:
  - `he2017-maskrcnn` — Mask R-CNN adds a mask branch on top of the exact Faster R-CNN (RPN + RoI align) substrate
  - `he2016-resnet` — ResNet-101 backbone was plugged into Faster R-CNN for the COCO/ILSVRC 2015 competition wins; the ResNet paper's detection numbers come from this combination
  - Feature Pyramid Networks (Lin et al., CVPR 2017) — FPN introduces a multi-scale neck atop the Faster R-CNN framework; not yet in index
  - RetinaNet (Lin et al., ICCV 2017) — inherits the two-stage insight but folds proposals into a one-stage focal-loss detector; not yet in index
  - Cascade R-CNN (Cai & Vasconcelos, CVPR 2018) — multi-stage refinement of Faster R-CNN IoU thresholds; not yet in index

- Refutes / supersedes:
  - Classical sliding-window + HOG/DPM detection pipelines (Felzenszwalb et al. [8] is cited explicitly as the DPM baseline)
  - Selective Search as an external proposal module (the entire motivation: §1, §Abstract)

# Atlas update plan

## NEW: faster-rcnn
Type: model
Category: object-detection
Primary source: ren2015-faster

Goal: End-to-end two-stage object detector that introduces a Region Proposal Network (RPN) sharing convolutional features with a Fast R-CNN detection head, enabling near-real-time multi-class object detection with state-of-the-art accuracy.

Architecture:
- Shared backbone: ZF (5 conv layers, 256-d feature) or VGG-16 (13 conv layers, 512-d feature); later extended to ResNet-101.
- RPN head: $3 \times 3$ conv → two parallel $1 \times 1$ conv branches (cls: $2k$ outputs; reg: $4k$ outputs); $k = 9$ anchors per location.
- Anchor grid: scales $\{128^2, 256^2, 512^2\}$ px, aspect ratios $\{1{:}1, 1{:}2, 2{:}1\}$.
- RoI pooling on Fast R-CNN head takes top-300 RPN proposals (after objectness-ranked NMS at IoU 0.7).
- Joint multi-task loss (Eq. 1): cls log-loss + $\lambda \cdot$ smooth-L1 regression; $\lambda = 10$ by default.
- Training: 4-step alternating optimisation; approximate joint training ~25–50% faster with negligible accuracy cost.

Implementations:
- MATLAB reference: https://github.com/shaoqingren/faster_rcnn
- Python reference: https://github.com/rbgirshick/py-faster-rcnn

Results:
- VGG-16 + PASCAL VOC 2007: 69.9% mAP (300 proposals, VOC07 trainval); 73.2% (07+12); 78.8% (COCO+07+12). (Table III/VI)
- VGG-16 inference: 198 ms total on K40 GPU = 5 fps (Table V).
- ZF inference: 59 ms total on K40 GPU = 17 fps (Table V).
- VGG-16 + COCO test-dev: 42.1% mAP@0.5, 21.5% mAP@[.5,.95] (Table XI).
- ResNet-101 (competition): 48.4%/27.2% COCO val mAP — 1st place ILSVRC & COCO 2015 detection.

Remarks:
- Faster R-CNN is the canonical two-stage detector baseline in 2026; it remains the substrate for Mask R-CNN, FPN, and Cascade R-CNN.
- The RPN anchor parameterisation in log-space (Eq. 2) and the positive IoU threshold of 0.7 are the most-copied hyperparameters in subsequent detection literature.
- One-stage detection (dense sliding windows, same ZF backbone) trails by 4.8% mAP (Table X), establishing the empirical case for two-stage cascades.

Relations:
- { type: learned_alternative_of, target: felzenszwalb-deformable-parts, confidence: high }
- { type: learned_alternative_of, target: viola-jones-detector, confidence: medium, caution: "Viola-Jones targets real-time face detection on CPUs; Faster R-CNN is general multi-class detection on GPUs — replacement is paradigm-level, not drop-in." }
- { type: extended_by, target: mask-rcnn, confidence: high }

## UPDATE: mask-rcnn
Section: References
- Add `ren2015-faster` to `sources.references` (currently cited throughout the Mask R-CNN paper as the two-stage substrate).
Section: Architecture
- Where the Mask R-CNN body references the Faster R-CNN RPN + RoI Align substrate, link to the new `faster-rcnn` Atlas page.

## UPDATE: resnet
Section: Remarks / References
- The ResNet paper's detection benchmark (48.4% COCO val mAP@0.5 with ResNet-101 in Faster R-CNN) now has a direct Atlas page (`faster-rcnn`). Add a cross-link: "Faster R-CNN detection benchmarks referenced here — see [Faster R-CNN](faster-rcnn)."

## UPDATE: felzenszwalb-deformable-parts
Section: Remarks
- Faster R-CNN is the canonical learned alternative to DPM-style sliding-window detection. Add: "The end-to-end learned replacement for DPM in general object detection is Faster R-CNN (`faster-rcnn`), which supersedes the handcrafted HOG + DPM pipeline with a shared-conv RPN + Fast R-CNN head." (The page may already cite Mask R-CNN as a downstream descendant; Faster R-CNN is the more direct replacement.)

## UPDATE: viola-jones-detector
Section: Remarks
- Faster R-CNN represents the paradigm-level transition from hand-engineered real-time face detectors to learned multi-class GPU detectors. Add a note: "At the deep-learning paradigm level, Faster R-CNN (`faster-rcnn`) replaces the Viola-Jones cascade with an RPN-based approach — though the two address different constraints: Viola-Jones runs on CPU for faces only, while Faster R-CNN requires GPU and detects 20–80 general categories."

## UPDATE: hog-descriptor
Section: Remarks
- Faster R-CNN (`faster-rcnn`) is the canonical end-to-end learned alternative to HOG-based detection pipelines (DPM, R-CNN with HOG features). Add a sentence: "The HOG + sliding-window detection pipeline was superseded for general object detection by Faster R-CNN, which replaces handcrafted features with shared conv features and the RPN proposal stage."

# Provenance

| Claim | Source location |
|---|---|
| Abstract: 5 fps VGG-16 on K40, 300 proposals | Abstract; Table V |
| $k = 9$ anchors (3 scales × 3 ratios) | §3.1.1; §3.3 |
| Anchor scales: $128^2, 256^2, 512^2$ px | §3.3 |
| Anchor aspect ratios: 1:1, 1:2, 2:1 | §3.3 |
| Sliding window size $n = 3$ | §3.1 |
| ZF feature dimension 256-d, VGG 512-d | §3.1 |
| Effective receptive fields 171 px (ZF), 228 px (VGG) | §3.1 |
| Eq. 1: multi-task loss | §3.1.2, Eq. (1) |
| Eq. 2: bounding-box parameterisation | §3.1.2, Eq. (2) |
| $N_\text{cls} = 256$ (mini-batch size) | §3.1.2 |
| $N_\text{reg} \approx 2400$ (anchor location count) | §3.1.2 |
| $\lambda = 10$ default | §3.1.2 |
| Positive IoU threshold: 0.7 | §3.1.2 |
| Negative IoU threshold: 0.3 | §3.1.2 |
| 256 sampled anchors per image, up to 128 positive | §3.1.3 |
| LR 0.001 → 0.0001 (60k → 20k iters, PASCAL) | §3.1.3 |
| Momentum 0.9, weight decay 0.0005 | §3.1.3 |
| 4-step alternating training | §3.2 |
| Approx. joint training 25–50% faster | §3.2 |
| Input shorter side $s = 600$ px | §3.3 |
| Backbone stride 16 px | §3.3 |
| ~20 000 total anchors on $1000 \times 600$ image | §3.3 |
| ~6000 non-boundary anchors per training image | §3.3 |
| NMS IoU 0.7 → ~2000 proposals; top 300 used | §3.3 |
| RPN takes 10 ms on K40 (VGG) | §1; Table V |
| SS takes ~1.5 s (CPU) | §1; Table V |
| Table II: 59.9% mAP RPN+ZF shared (PASCAL VOC 2007) | Table II |
| Table III: 69.9% mAP RPN+VGG shared 07 | Table III |
| Table III: 73.2% mAP RPN+VGG shared 07+12 | Table III |
| Table V: VGG 198 ms total, ZF 59 ms total | Table V |
| Table VIII: single-anchor mAP 65.8–66.7%, 3×3 = 69.9% | Table VIII |
| Table IX: $\lambda$ sensitivity 67.2–69.9% | Table IX |
| Table X: one-stage 53.9% vs two-stage 58.7% | Table X |
| Table XI: COCO 42.1% mAP@0.5, 21.5% mAP@[.5,.95] | Table XI |
| ResNet-101 COCO val 48.4%/27.2% | §4, ILSVRC/COCO 2015 paragraph |
| COCO training: LR 0.003 → 0.0003 (240k → 80k iters, 8 GPU) | §4.2 |
| COCO: 4 anchor scales (adds $64^2$) | §4.2 |
| COCO: negative IoU range $[0, 0.5)$ | §4.2 |
| DPM reference [8]: Felzenszwalb et al. TPAMI 2010 | §3.1.1; References [8] |
| FCN reference [7]: Long et al. CVPR 2015 | §3.1; References [7] |
| Fast R-CNN reference [2]: Girshick ICCV 2015 | Abstract; References [2] |
| SPPnet reference [1]: He et al. ECCV 2014 | Abstract; References [1] |
| Selective Search reference [4]: Uijlings et al. IJCV 2013 | §1; References [4] |
| R-CNN reference [5]: Girshick et al. CVPR 2014 | §2; References [5] |
| Mask R-CNN precursor [15]: Dai et al. arXiv:1512.04412 | §1; References [15] |
| ResNet competition paper [18]: He et al. arXiv:1512.03385 | §4; References [18] |
