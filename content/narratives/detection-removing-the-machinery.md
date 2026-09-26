---
title: Detection, Removing the Machinery
summary: "How object detection shed its hand-built machinery one component at a time: the enumerated window, the feature pyramid, the proposal stage, the anchors, and non-maximum suppression, until what remains is a classifier reading the image once."
tagline: Every step deleted something a human had designed.
tags:
  - detection
  - deep-learning
  - classical
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: window-machinery
    label: Window machinery
  - id: proposals-regression
    label: Proposals and regression
  - id: set-prediction
    label: Set prediction
nodes:
  - id: integral-image
    page: integral-image
    area: window-machinery
    role: origin
    takeaway: "A prefix-sum table that returns the pixel sum of any rectangle in four array reads, no matter how large the rectangle: the trick that makes scoring every window of a sliding-window search cheap enough to be practical."
    remark: "First published for texture-map filtering in computer graphics in 1984, then independently rediscovered and renamed for face detection in 2001: the same data structure, two different problems."
  - id: viola-jones-detector
    page: viola-jones-detector
    area: window-machinery
    role: milestone
    takeaway: Scans a fixed 24x24 window across every position and scale of an image and scores each one with a cascade of rectangle features, rejecting most background in the first few tests, real-time face detection built entirely from exhaustive search made cheap.
    remark: "Nothing here is learned about where objects are: the window grid and the pyramid of scales are exhaustive and hand-designed. Only the rectangle features and their combination are trained; every location still gets tested."
  - id: hog-descriptor
    page: hog-descriptor
    area: window-machinery
    role: milestone
    takeaway: Replaces Viola-Jones's rectangle-difference tests with a gradient-orientation histogram computed over the same window, giving pedestrians, whose silhouette, not local contrast, is the reliable cue, a template a linear classifier can score.
    remark: "Still a sliding window over an image pyramid: the search machinery is untouched. Only the per-window feature changes, from pixel-intensity contrasts to gradient-orientation statistics."
  - id: felzenszwalb-deformable-parts
    page: felzenszwalb-deformable-parts
    area: window-machinery
    role: milestone
    takeaway: Keeps the sliding window and the HOG feature pyramid but replaces one rigid template with a root filter plus several parts that can shift independently at a small cost. The window survives; only the template inside it stops being solid.
    remark: "The star-shaped part layout is still hand-designed: a human chose the number of parts and their resolution relative to the root. What is learned is where the parts sit and how the template weights are set."
  - id: faster-rcnn
    page: faster-rcnn
    area: proposals-regression
    role: milestone
    takeaway: "Deletes the exhaustive scan itself: a small trained network proposes a few hundred candidate boxes from shared convolutional features, and only those get classified. The sliding window becomes a learned first stage instead of a fixed grid over the whole image."
    remark: The proposal network still relies on nine hand-chosen anchor-box shapes at every position, so a human-designed prior about typical object sizes and aspect ratios remains baked into the architecture.
  - id: fpn
    page: fpn
    area: proposals-regression
    role: milestone
    takeaway: "Deletes the image pyramid: a top-down pathway with lateral connections builds strong features at every scale from one forward pass of the backbone, and the unchanged proposal and detection heads run on each level."
    remark: "The anchors survive, only redistributed: one anchor scale per pyramid level, fifteen anchors across the pyramid, still chosen by hand."
  - id: yolo-v1
    page: yolo-v1
    area: proposals-regression
    role: milestone
    takeaway: "Discards proposals entirely: one forward pass over the whole image regresses boxes and class scores straight from a coarse grid, trading the two-stage propose-then-classify pipeline for a single-shot read of the picture."
    remark: The grid and its two boxes per cell are still a fixed, hand-set structure, and duplicate detections around the same object still need non-maximum suppression to clean up, box regression per grid cell survives as designed machinery.
  - id: detr
    page: detr
    area: set-prediction
    role: milestone
    takeaway: "Removes the anchor boxes and the non-maximum-suppression step: a transformer decodes a fixed set of one hundred learned queries into class-and-box pairs, with a bipartite match, not a hand-tuned overlap threshold, deciding which prediction owns which ground truth."
    remark: "What looks like the disappearance of matching machinery is really its relocation: the assignment decision that used to run only at test time, as non-maximum suppression, now runs inside every training step instead."
  - id: rf-detr
    page: rf-detr
    area: set-prediction
    role: frontier
    takeaway: "Shows the DETR-style set predictor is no longer a slow, bespoke research architecture: bolted onto a pretrained self-supervised backbone and searched over thousands of sub-network configurations in one training run, it becomes the first real-time detector to pass 60 AP on COCO."
    remark: The query-based decoder from DETR is kept in spirit; what is new is treating the backbone and its size as another dial to search, not something to redesign from scratch per method.
  - id: q-nms-training
    question: Did the transformer detector really delete non-maximum suppression, or did it just move the same box-matching decision from a test-time overlap threshold into the Hungarian loss used during training?
    area: set-prediction
edges:
  - from: integral-image
    to: viola-jones-detector
    type: prerequisite
    label: makes scan cheap
  - from: viola-jones-detector
    to: hog-descriptor
    type: contrast
    label: same window
  - from: viola-jones-detector
    to: felzenszwalb-deformable-parts
    type: contrast
  - from: hog-descriptor
    to: felzenszwalb-deformable-parts
    type: evolution
    label: adds parts
  - from: felzenszwalb-deformable-parts
    to: faster-rcnn
    type: evolution
    label: learns proposals
  - from: viola-jones-detector
    to: faster-rcnn
    type: evolution
  - from: faster-rcnn
    to: fpn
    type: evolution
    label: pyramid moves inside
  - from: felzenszwalb-deformable-parts
    to: fpn
    type: contrast
    label: image vs feature pyramid
  - from: faster-rcnn
    to: yolo-v1
    type: contrast
    label: drops proposals
  - from: felzenszwalb-deformable-parts
    to: yolo-v1
    type: evolution
  - from: faster-rcnn
    to: detr
    type: contrast
    label: drops anchors+NMS
  - from: detr
    to: rf-detr
    type: evolution
    label: adds pretrain+search
  - from: detr
    to: q-nms-training
    type: bridge
lenses:
  - id: overview
    title: Overview
    coords:
      integral-image:
        - 0.5
        - 0
      viola-jones-detector:
        - 2.5
        - 0
      hog-descriptor:
        - 4.2
        - 0
      felzenszwalb-deformable-parts:
        - 5.8
        - 0
      faster-rcnn:
        - 7.5
        - 1
      yolo-v1:
        - 9
        - 1
      fpn:
        - 10.4
        - 1
      detr:
        - 11.3
        - 2
      rf-detr:
        - 12.6
        - 2
      q-nms-training:
        - 13.9
        - 2
steps:
  - title: A table that makes exhaustive search cheap
    anchor: table-makes-exhaustive-search-cheap
    claim: Viola-Jones tests roughly ten of six thousand possible rectangle features per window on average, and it can only afford that because Crow's 1984 running-sum table turns a rectangle of any size into four array lookups. The search stays exhaustive, but each test becomes nearly free.
    focus:
      - integral-image
      - viola-jones-detector
  - title: Better templates, same window
    anchor: better-templates-same-window
    claim: HOG swaps rectangle-intensity differences for gradient-orientation histograms and wins pedestrian detection by an order of magnitude in false positives; the deformable parts model then lets six part filters shift independently around a root template. Both still slide the same fixed window across the same image pyramid Viola-Jones used.
    focus:
      - hog-descriptor
      - felzenszwalb-deformable-parts
  - title: The window learns to look fewer places
    anchor: window-learns-fewer-places
    claim: Faster R-CNN cuts candidate generation from about 1.5 seconds of hand-tuned Selective Search to a 10 ms learned pass, and FPN then moves the image pyramid inside the network. Both still propose from a human-chosen grid of anchor sizes and aspect ratios.
    focus:
      - faster-rcnn
      - fpn
  - title: One pass, then no proposals at all
    anchor: one-pass-then-no-proposals
    claim: YOLO regresses boxes and classes from a single 7x7 grid in one forward pass, deleting the propose-then-classify split entirely; DETR then deletes the grid's anchors and its non-maximum-suppression clean-up too, training a fixed set of one hundred queries so each claims at most one object.
    focus:
      - yolo-v1
      - detr
  - title: Where did the machinery actually go
    anchor: where-machinery-actually-went
    claim: RF-DETR pairs a self-supervised pretrained backbone with a search over thousands of sub-network configurations to become the first real-time detector past 60 AP on COCO, but the assignment problem non-maximum suppression used to solve at test time is still being solved, now inside the training loss, by the Hungarian algorithm.
    focus:
      - rf-detr
      - q-nms-training
---

## Table Makes Exhaustive Search Cheap

[Integral Image](/atlas/integral-image) is Crow's 1984 summed-area table: an entry at every pixel holds the running sum of everything above and to its left, so the pixel sum of any rectangle reduces to four table reads and three additions, independent of the rectangle's size. Viola and Jones renamed the identical structure in 2001 and built [Viola-Jones Object Detector](/atlas/viola-jones-detector) directly on top of it: a fixed 24 × 24 pixel window scans every position and scale of an image, and each window is scored against a cascade drawn from more than 180,000 candidate rectangle features. AdaBoost selects which of those features enter each stage and in what order; the first stage alone reaches close to 100% detection rate at roughly 40% false-positive rate, and on the MIT+CMU benchmark an average of 10 features out of a total of 6,061 are evaluated per sub-window.

What AdaBoost trains is which rectangle-intensity test to run and in what order, not whether to test a given window at all. The 24 × 24 window and the pyramid of scales it slides across stay a fixed, exhaustive enumeration, and the vocabulary of tests available to score each window is still limited to sums and differences of rectangle intensities.

## Better Templates, Same Window

[HOG: Histograms of Oriented Gradients](/atlas/hog-descriptor) keeps the sliding window and replaces that vocabulary with gradient-orientation histograms: each cell casts votes into orientation bins, and overlapping blocks of cells are locally normalised before the result is fed to a linear classifier. A pedestrian's silhouette contrast, not local pixel-intensity contrast, is the reliable cue, and on that cue HOG-based detection outperforms Haar-wavelet-based detectors by more than an order of magnitude in false-positives-per-window on INRIA.

[Deformable Part Models](/atlas/felzenszwalb-deformable-parts) keeps the same HOG feature pyramid and the same sliding window but stops treating the object as one rigid template. A coarse root filter covers the whole object, and the number of parts is fixed at six per component, each part filter sitting at twice the root's spatial resolution and free to shift under a quadratic deformation penalty. Both detectors still slide the identical window across the identical pyramid of scales that Viola-Jones used: nothing yet decides where to look before every position is tested.

## Window Learns Fewer Places

[Faster R-CNN](/atlas/faster-rcnn) removes the exhaustive scan itself. Generating candidate object locations had meant roughly 1.5 s of hand-tuned Selective Search computation on a CPU; Faster R-CNN's Region Proposal Network shares convolutional features with the detection head and turns candidate generation into a 10 ms learned forward pass on the same GPU-resident features. This is the first removal of the search, not merely of the feature computed inside each window.

The image pyramid goes next, still inside the two-stage family. [Feature Pyramid Networks](/atlas/fpn) build the multi-scale representation from the network's own feedforward hierarchy: a top-down pathway upsamples the coarsest map and adds each finer backbone stage through a $1\times1$ lateral connection, so every level from stride 4 to stride 32 carries strong semantics without the input ever being rescaled. The region-proposal and detection heads are reattached unchanged to each level, and proposal recall rises from 48.3 to 56.3 over the single-scale baseline. The pyramid that Viola-Jones, HOG and the deformable parts model enumerated over the image is now computed once, inside the network.

What either network proposes from is still a fixed, hand-chosen prior — FPN only redistributes it, one anchor scale per level: $k = 9$ anchors are placed at every spatial location, three scales crossed with three aspect ratios, and only boxes near one of those nine templates get refined into a detection. The pipeline also keeps a two-stage split: one network proposes, a second classifies and refines. Both the anchor grid and the propose-then-classify division are the next machinery to go.

## One Pass, Then No Proposals

[YOLOv1](/atlas/yolo-v1) discards the propose-then-classify split entirely. A single forward pass over the whole image regresses boxes and class probabilities directly from a 7×7 spatial grid, each cell predicting two bounding boxes and responsible for objects whose center falls inside it. The grid and its two boxes per cell are still a fixed, hand-set structure, and NMS adds 2–3% mAP by cleaning up the duplicate detections that structure produces around the same object.

[DETR](/atlas/detr) removes the anchor boxes and that non-maximum-suppression step together. A transformer decoder takes $N = 100$ learned object queries and decodes them in parallel into class-and-box pairs; a bipartite match, not a hand-tuned overlap threshold, decides which query is responsible for which ground-truth object, via the Hungarian algorithm, during training rather than at inference. What this removal does not touch is the cost of reaching it: DETR requires 300–500 epochs against 12–36 for Faster R-CNN, 10–25× more wall-clock training compute to reach equal accuracy, before its query-based decoder converges at all.

## Where Machinery Actually Went

[RF-DETR](/atlas/rf-detr) shows that a DETR-style set predictor no longer needs to be a slow, from-scratch research architecture. A DINOv2 self-supervised ViT backbone supplies pretrained features, and a single training run performs weight-sharing neural architecture search, training thousands of sub-networks jointly without separate retraining per configuration and then grid-searching 6,468 sub-network configurations on the validation set with no additional training. The result, RF-DETR (2x-large), reaches 60.1 AP on COCO, the first real-time detector to surpass 60 AP.

The query-based decoder survives from DETR largely unchanged; what changed is treating the backbone and its size as another dial to search, not something to redesign from scratch per method. Non-maximum suppression is still absent at inference. But the assignment problem it used to solve at test time is still being solved: the Hungarian algorithm now runs inside every training step instead of after every inference pass. Did the transformer detector really delete non-maximum suppression, or did it just move the same box-matching decision from a test-time overlap threshold into the Hungarian loss used during training?
