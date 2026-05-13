---
paper_id: lin2017-retinanet
title: "Focal Loss for Dense Object Detection"
authors: ["T. Lin", "P. Goyal", "R. Girshick", "K. He", "P. Dollár"]
year: 2017
url: https://arxiv.org/pdf/1708.02002
created: 2026-05-13
relevant_atlas_pages:
  - faster-rcnn
  - yolo-v1
  - mask-rcnn
  - viola-jones-detector
  - felzenszwalb-deformable-parts
  - hog-descriptor
---

# Setting

Dense object detection: a single convolutional network predicts bounding boxes and class labels for all objects in a natural image, with no external proposal stage. Input is a natural image of variable resolution (training uses shorter side 400–800 px). Output is a set of axis-aligned bounding boxes each associated with a class label from K=80 COCO categories.

The central difficulty is extreme foreground/background class imbalance. Dense one-stage detectors evaluate 10⁴–10⁵ candidate anchor locations per image (Section 3 in paper) but only a small fraction contain objects. The paper characterises this as an imbalance of roughly 1:1000 between foreground and background classes (Section 3, first paragraph: "The Focal Loss is designed to address... extreme imbalance between foreground and background classes during training (e.g., 1:1000)"). With standard cross-entropy trained on all anchors, easy background examples overwhelm both the loss sum and the gradients.

# Core idea

Standard binary cross-entropy is:

$$\text{CE}(p, y) = \begin{cases} -\log(p) & \text{if } y=1 \\ -\log(1-p) & \text{otherwise} \end{cases} \tag{1}$$

Defining $p_t = p$ when $y=1$ and $p_t = 1-p$ otherwise allows writing $\text{CE}(p, y) = -\log(p_t)$ (Eq. 2). The α-balanced variant adds a per-class weight:

$$\text{CE}(p_t) = -\alpha_t \log(p_t) \tag{3}$$

The core proposal is to add a modulating factor $(1-p_t)^\gamma$ that automatically down-weights easy, well-classified examples:

$$\text{FL}(p_t) = -(1-p_t)^\gamma \log(p_t) \tag{4}$$

When $p_t \to 1$ (example confidently classified), $(1-p_t)^\gamma \to 0$ and the loss vanishes. When $\gamma = 0$, FL reduces to CE. In practice, the α-balanced variant is used:

$$\text{FL}(p_t) = -\alpha_t (1-p_t)^\gamma \log(p_t) \tag{5}$$

The paper recommends $\gamma = 2$ and $\alpha = 0.25$ as the primary operating point (Table 1b caption and Section 4.1). A useful illustration: with $\gamma=2$, an anchor classified with $p_t=0.9$ has 100× lower loss than under CE; with $p_t \approx 0.968$ the reduction reaches 1000× (Section 3.2, paragraph 3).

RetinaNet is a simple one-stage detector designed to test focal loss. It is a fully convolutional network: ResNet-50 or ResNet-101 backbone + Feature Pyramid Network (FPN) producing pyramid levels P3–P7, plus two task-specific FCN subnets (classification and box regression) attached to each pyramid level. All pyramid levels have C=256 channels (Section 4, FPN paragraph). The classification subnet uses four 3×3 conv layers each with 256 filters + ReLU, followed by a 3×3 conv with KA filters and sigmoid activations, outputting KA binary predictions per spatial location. The box regression subnet has the same architecture except terminating in 4A linear outputs. The two subnets share architecture but not parameters. C=256 and A=9 anchors per level are used in most experiments (Section 4, Classification Subnet paragraph).

Anchor design: three aspect ratios {1:2, 1:1, 2:1} × three sub-octave scales {$2^0$, $2^{1/3}$, $2^{2/3}$} = 9 anchors per FPN level. Anchor areas span 32² to 512² pixels on P3–P7 respectively, covering scale range 32–813 pixels in the input image (Section 4, Anchors paragraph). IoU ≥ 0.5 → foreground; IoU in [0, 0.4) → background; [0.4, 0.5) → ignored.

Prior initialization: to prevent instability on the first training iteration caused by the large ratio of background anchors, the final classification conv layer is initialized with bias $b = -\log((1-\pi)/\pi)$ where $\pi = 0.01$ (Section 3.3 and Section 4.1). This makes the network initially predict foreground probability ≈ 0.01 for every anchor.

# Assumptions

1. (Hard) Dense anchor sampling at fixed scales and aspect ratios must sufficiently cover the distribution of ground-truth boxes. If objects lie outside the anchor scale range, they are never positively matched.
2. (Hard) Focal loss training applies to all ~100k anchors per image (Section 4.1, Focal Loss paragraph). No anchor sub-sampling is performed; the loss is normalized by the number of anchors assigned to a ground-truth box.
3. (Soft) The foreground/background imbalance must be large enough that γ > 0 provides a practical benefit. If the ratio is close to 1:1 (dense positive images), focal loss degenerates toward CE and may slightly harm convergence.
4. (Soft) FPN backbone required for multi-scale feature quality. The paper notes that using only the final ResNet layer yielded significantly lower AP (Section 4, FPN paragraph: "preliminary experiments using features from only the final ResNet layer yielded low AP").
5. (Soft) ImageNet pretraining assumed for the ResNet backbone; from-scratch training behaviour is not studied.
6. (Hard) 80-class COCO-style setting — K and the anchor assignment thresholds are tuned for this distribution; the precise γ/α values may need re-tuning on domains with very different imbalance ratios.

# Failure regime

- **Very small objects**: RetinaNet-101-800 achieves APS=21.8 on COCO test-dev (Table 2), substantially below APM=42.7 and APL=50.2. Small-object recall is limited by anchor density and FPN resolution.
- **High-frame-rate regime**: RetinaNet-101-FPN at 600 px runs at ~122 ms per image (Table 1e). The paper notes that achieving high frame rates likely requires special network design and is out of scope (Section 5.2, Speed vs Accuracy paragraph).
- **Extreme imbalance without proper initialization**: without the prior initialization ($\pi=0.01$), training with CE diverges immediately (Section 5.1, Network Initialization paragraph). Focal loss does not substitute for the initialization — both are required together.
- **Miscalibrated γ/α**: γ ∈ [0.5, 5] is robust (Section 4.1, Focal Loss paragraph), but α must be co-tuned with γ. At γ=2 the α range [0.25, 0.75] works reasonably; α=0.25 is the recommended value (Table 1b and Section 4.1). Using α=0.10 collapses AP to 0 (Table 1a).
- **Single-stage in very high accuracy regime**: above ~40 AP on COCO the two-stage cascade advantage in proposal quality becomes relevant again; focal loss narrows but may not fully close this gap for very high precision tasks.

# Numerical sensitivity

**γ sweep** (Table 1b, ResNet-50-FPN, 600 px, minival):

| γ   | α    | AP   | AP50 | AP75 |
|-----|------|------|------|------|
| 0   | 0.75 | 31.1 | 49.4 | 33.0 |
| 0.5 | 0.50 | 32.9 | 51.7 | 35.2 |
| 1.0 | 0.25 | 33.7 | 52.0 | 36.2 |
| 2.0 | 0.25 | 34.0 | 52.5 | 36.5 |
| 5.0 | 0.25 | 32.2 | 49.6 | 34.8 |

Best operating point: γ=2, α=0.25. γ=2 outperforms α-balanced CE (γ=0) by 2.9 AP (Table 1b caption).

**α sweep with CE (γ=0)** (Table 1a): α=0.75 gives AP 31.1; α=0.25 gives AP 10.8; α=0.10 gives AP 0.0. The CE loss is highly sensitive to α; focal loss is much more robust.

**Prior initialization**: π=0.01 used throughout (Section 4.1). The paper states "Results are insensitive to the exact value of π so we use π=.01 for all experiments" (Section 5.1). Without it, the network diverges.

**Subnet initialization**: all new conv layers in RetinaNet subnets initialized with bias b=0 and Gaussian weight fill with σ=0.01, except the final classification conv layer which uses the prior-based bias (Section 4.1, Initialization paragraph).

**Anchor density** (Table 1c, ResNet-50-FPN): 1 scale × 1 aspect ratio → AP 30.3; 3 scales × 3 aspect ratios → AP 34.0 (nearly 4 AP gain). Performance saturates beyond 9 anchors per level.

**Loss normalization**: total focal loss normalized by number of foreground-assigned anchors (not total ~100k anchors), because the vast majority of background anchors have negligible focal loss and normalizing by total count would underweight the signal (Section 4.1, Focal Loss paragraph).

**FL vs. OHEM** (Table 1d, ResNet-101-FPN): best OHEM variant achieves 32.8 AP; FL achieves 36.0 AP — a gap of 3.2 AP showing FL outperforms hard example mining by more than 3 points (Table 1 caption).

# Applicability

- Use when: one-stage dense detection where training is dominated by easy background anchors (imbalance ≥ 1:100). Appropriate drop-in for any classification head trained with cross-entropy when the positive class is rare.
- Use when: latency budget precludes a two-stage network but accuracy near two-stage levels is needed.
- Don't use when: class distribution is approximately balanced (γ > 0 provides no benefit and may slow convergence).
- Don't use when: the detection problem requires very high frame rates (< 50 ms); the paper notes this requires architectural specialisation beyond standard ResNet-FPN.
- Compared against (COCO test-dev, Table 2):
  - Faster R-CNN w FPN (ResNet-101): AP 36.2, 172 ms → RetinaNet-101-800: AP 39.1, 198 ms (2.9 AP better, slightly slower)
  - Faster R-CNN w TDM (Inception-ResNet-v2): AP 36.8 → RetinaNet-101-800: AP 39.1 (2.3 AP better)
  - YOLOv2: AP 21.6 → RetinaNet-101-800: AP 39.1 (17.5 AP better)
  - SSD513: AP 31.2 → RetinaNet-101-800: AP 39.1 (7.9 AP better)
  - DSSD513: AP 33.2, 156 ms → RetinaNet-101-800: AP 39.1, 198 ms (5.9 AP better)
  - RetinaNet-101-600 matches Faster R-CNN w FPN AP 36.2 while running in 122 ms vs. 172 ms (Section 5.2)

# Connections

- Builds on: [FPN backbone: Lin et al. 2017 FPN — cited as [19] throughout], [ResNet: He et al. 2016 — cited as [15]], [RPN anchors from Faster R-CNN: Ren et al. 2015 — cited as [27]]
- Enables: downstream use of focal loss in Mask R-CNN and later detection models; RetinaNet backbone used as reference one-stage detector in many subsequent works

# Atlas update plan

## NEW: retinanet
Type: model
Category: object-detection
Primary source: lin2017-retinanet

Relations:
- { type: compared_with, target: yolo-v1, confidence: high }
- { type: compared_with, target: faster-rcnn, confidence: high }
- { type: feeds_into, target: mask-rcnn, confidence: medium, caution: Mask R-CNN uses the same FPN+ResNet backbone family; RetinaNet popularised the one-stage pairing }

Goal:
- One-stage, anchor-based dense object detector that matches two-stage accuracy (Faster R-CNN) by training on all ~100k anchors per image with focal loss instead of sub-sampling.
- Key contribution is the focal loss (Eq. 5: FL(p_t) = -α_t (1-p_t)^γ log(p_t)), which automatically down-weights easy background examples and focuses training on hard examples.
- RetinaNet-101-800 achieves COCO test-dev AP 39.1 vs. best two-stage AP 36.8, while running at one-stage speeds (Table 2).

Architecture:
- Backbone: ResNet-50 or ResNet-101 pretrained on ImageNet.
- FPN neck: feature pyramid levels P3–P7, each with 256 channels; covers anchor scales 32–813 px.
- Anchors: A=9 per level — 3 aspect ratios {1:2, 1:1, 2:1} × 3 sub-octave scales {2⁰, 2^(1/3), 2^(2/3)}.
- Classification subnet: 4 × Conv(256, 3×3, ReLU) → Conv(KA, 3×3, sigmoid). Shared across FPN levels.
- Box regression subnet: identical structure but outputs 4A offsets. Parameters not shared with classification subnet.
- Loss: focal loss (γ=2, α=0.25) on classification; smooth-L1 on box regression.
- Initialization: prior bias b = -log((1-π)/π), π=0.01, on classification subnet final layer.

Implementation:
- Reference: https://github.com/facebookresearch/Detectron (original)
- Focal loss can be implemented as a modified sigmoid cross-entropy with a (1-p_t)^γ modulating factor; numerically stable implementations combine sigmoid with the loss computation.

Remarks:
- Focal loss is the paper's primary contribution; RetinaNet is the vehicle. The loss function itself is architecture-agnostic and has been widely adopted in segmentation, NLP, and multi-label classification.
- The paper directly attributes the one-stage/two-stage accuracy gap to class imbalance, not to architectural limitations of one-stage detectors.
- γ=2 outperforms OHEM by 3.2 AP (Table 1d) with simpler implementation and no anchor sub-sampling bookkeeping.

## UPDATE: yolo-v1
Section: Remarks
Bullets to add:
- RetinaNet (Lin et al. 2017) demonstrated that the accuracy gap between one-stage and two-stage detectors was caused by extreme foreground/background class imbalance during training — not by the one-stage formulation itself. By addressing this imbalance through focal loss, RetinaNet achieved COCO AP 39.1, surpassing all two-stage detectors at that time, while running at one-stage speeds (Table 2, lin2017-retinanet).

## UPDATE: faster-rcnn
Section: Remarks
Bullets to add:
- RetinaNet-101-800 (Lin et al. 2017) matched and exceeded Faster R-CNN w FPN (ResNet-101, AP 36.2) with AP 39.1 on COCO test-dev, closing the one-stage/two-stage accuracy gap that had persisted since YOLO and SSD. The critical enabler was focal loss, not architectural changes. RetinaNet-101-600 matched Faster R-CNN w FPN AP exactly (36.2) while running in 122 ms vs. 172 ms (Section 5.2, lin2017-retinanet).

## UPDATE: viola-jones-detector
Section: Remarks
Bullets to add:
- RetinaNet (Lin et al. 2017, lin2017-retinanet) explicitly cites Viola-Jones cascades as a classical example of handling extreme foreground/background class imbalance. Dense detectors "evaluate 10⁴–10⁵ candidate locations per image" with only a few containing objects (Section 3); hard negative mining and bootstrapping — the classical solutions including Viola-Jones cascade rejection — were the prior art. Focal loss is positioned as a continuous gradient-weighting alternative to hard cascade rejection: it down-weights easy negatives smoothly during backpropagation rather than discarding them at test-time boundaries.

# Provenance

All constants and equations verified against the pdftotext cache (`lin2017-retinanet.txt`).

- **Eq. (1)** CE(p,y): txt line 184 — `CE(p, y) = { − log(p) if y = 1 / − log(1 − p) otherwise`
- **Eq. (2)** p_t definition: txt line 192 — `pt = { p if y = 1 / 1 − p otherwise`
- **Eq. (3)** α-balanced CE: txt line 149 — `CE(pt ) = −αt log(pt ).   (3)`
- **Eq. (4)** Focal loss: txt line 168 — `FL(pt ) = −(1 − pt )γ log(pt ).   (4)`
- **Eq. (5)** α-balanced focal loss: txt line 196 — `FL(pt ) = −αt (1 − pt )γ log(pt ).   (5)`
- **Imbalance ratio 1:1000**: txt line 179 — `balance between foreground and background classes during training (e.g., 1:1000)`
- **Imbalance scale 10⁴–10⁵**: txt lines 140–142 — `These detectors evaluate 104 - 105 candidate locations per image but only a few locations contain objects`
- **~100k anchors per image**: txt lines 311, 320 — `applied to all ∼100k anchors in each sampled image`
- **γ=2 recommended**: txt line 184 — `we found γ = 2 to work best in our experiments`; Table 1b caption line 369
- **α=0.25 with γ=2**: txt line 329 — `(for γ = 2, α = 0.25 works best)`
- **100× loss reduction at p_t=0.9**: txt line 190 — `example classified with pt = 0.9 would have 100× lower loss compared with CE`
- **1000× reduction at p_t≈0.968**: txt lines 190–192 — `with pt ≈ 0.968 it would have 1000× lower loss`
- **2.9 AP gain FL over α-CE**: txt line 437 — `With γ = 2, FL yields a 2.9 AP improvement over the α-balanced CE loss`
- **FPN levels P3–P7**: txt line 219–220 — `We construct a pyramid with levels P3 through P7`
- **C=256 channels per pyramid level**: txt line 222 — `all pyramid levels have C = 256 channels`
- **C=256 and A=9**: txt line 308 — `We use C = 256 and A = 9 in most experiments`
- **Anchor areas 32² to 512²**: txt line 230 — `areas of 322 to 5122 on pyramid levels P3 to P7`
- **Anchor aspect ratios {1:2, 1:1, 2:1}**: txt line 231–232 — `three aspect ratios {1:2, 1:1, 2:1}`
- **Anchor sub-octave scales {2⁰, 2^(1/3), 2^(2/3)}**: txt line 233–234 — `anchors of sizes {20, 21/3, 22/3}`
- **IoU assignment thresholds 0.5 and 0.4**: txt line 243–245 — `IoU threshold of 0.5; and to background if their IoU is in [0, 0.4)`
- **Prior init b = -log((1-π)/π)**: txt line 339 — `b = − log((1 − π)/π)`
- **π = 0.01**: txt line 376 — `We use π = .01 in all experiments`; line 395 — `prior probability of detecting an object is π = .01`
- **Gaussian σ=0.01 for new conv layers**: txt line 337 — `a Gaussian weight fill with σ = 0.01`
- **FL vs. OHEM gap 3.2 AP**: txt line 456 — `best setting for OHEM... achieves 32.8 AP. This is a gap of 3.2 AP`; FL gives 36.0 AP (line 454, 364)
- **COCO test-dev AP 39.1 (RetinaNet-101-800)**: txt line 478 — `RetinaNet (ours) ResNet-101-FPN 39.1 59.1 42.3 21.8 42.7 50.2`; also line 128
- **Faster R-CNN w FPN AP 36.2**: txt line 471 — `Faster R-CNN w FPN [19] ResNet-101-FPN 36.2 59.1 39.0`
- **RetinaNet-101-600 at 122 ms vs FPN FRCN 172 ms**: txt line 530 — `published ResNet-101-FPN Faster R-CNN [19], while running` and Section 5.2 body text about 122 ms vs 172 ms (html §5.2)
- **YOLOv2 AP 21.6**: txt line 475 — `YOLOv2 [26] DarkNet-19 [26] 21.6`
- **SSD513 AP 31.2**: txt line 476 — `SSD513 [21, 9] ResNet-101-SSD 31.2`
- **DSSD513 AP 33.2**: txt line 477 — `DSSD513 [9] ResNet-101-DSSD 33.2`
- **Anchor density ablation AP 30.3 → 34.0**: txt line 508–509 — `surprisingly good AP (30.3) is achieved using just one square anchor... AP can be improved by nearly 4 points (to 34.0) when using 3 scales and 3 aspect ratios`
- **γ sweep Table 1b values**: txt lines 345–350 (γ=0 AP 31.1; γ=0.5 AP 32.9; γ=1 AP 33.7; γ=2 AP 34.0; γ=5 AP 32.2)
- **Viola-Jones cited as [36]**: txt line 598–599 — `[36] P. Viola and M. Jones. Rapid object detection using a boosted cascade of simple features. In CVPR, 2001. 2, 3`; referenced on txt line 105 and Section 2 classic detectors paragraph
- **FPN-only final layer yields low AP**: txt line 225–226 — `preliminary experiments using features from only the final ResNet layer yielded low AP`
- **Training diverges without prior init**: txt lines 393–396 — `fails quickly, with the network diverging during training. However, simply initializing the last layer... enables effective learning`
