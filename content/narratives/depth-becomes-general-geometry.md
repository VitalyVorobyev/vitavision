---
title: Depth Becomes General Geometry
summary: "How monocular depth estimation stopped improving through architecture and started improving through the training signal: a scale-invariant loss, pseudo-labelled unlabelled images, synthetic labels with a large teacher, and finally a depth-and-ray target that any number of views can share."
tagline: The network barely changed. The signal did.
tags:
  - depth
  - 3d-reconstruction
  - deep-learning
  - foundation-models
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: task-and-loss
    label: Task and loss
  - id: features
    label: Features
  - id: scaling-the-signal
    label: Scaling the signal
nodes:
  - id: monocular-depth-estimation
    page: monocular-depth-estimation
    area: task-and-loss
    role: origin
    takeaway: One image fixes geometry only up to an unknown scale and shift; most systems predict relative disparity, not metric distance, unless given camera or supervision to fix that ambiguity.
  - id: midas
    page: midas
    area: task-and-loss
    role: milestone
    takeaway: MiDaS introduces a scale-and-shift-invariant loss that lets datasets with incompatible depth formats, metric, scale-only, stereo, train together in one loop, enabling zero-shot transfer across domains.
    remark: Its Pareto multi-dataset mixing recipe becomes the training template every later model in this story reuses; the architecture itself, a 2019 CNN encoder-decoder, is soon left behind.
  - id: dinov2
    page: dinov2
    area: features
    role: bridge
    takeaway: A self-supervised vision transformer trained on 142 million curated images yields frozen features rich enough to support depth, segmentation, and retrieval without any task-specific fine-tuning.
    remark: Every depth and geometry model later in this story borrows DINOv2's frozen encoder rather than training its own from scratch; features become a shared substrate instead of a per-model choice.
  - id: depth-anything
    page: depth-anything
    area: scaling-the-signal
    role: milestone
    takeaway: "Depth Anything scales training past labeled data entirely: a teacher pseudo-labels 62 million unlabeled images, and a CutMix challenge keeps the student from simply copying the teacher."
    remark: It also borrows DINOv2's frozen features as an alignment target, tying the feature story directly to the scaling story; data breadth, not new architecture, drives the accuracy gain over MiDaS.
  - id: depth-anything-v2
    page: depth-anything-v2
    area: scaling-the-signal
    role: milestone
    takeaway: V2 finds that real labeled images were the bottleneck, not the architecture, so it trains the teacher purely on synthetic images and lets pseudo-labels replace human annotation entirely.
    remark: Pseudo-labels from a synthetic-only teacher beat human-annotated real labels on every measured metric, a stronger and cheaper substitute for ground truth than the ground truth itself.
  - id: vggt
    page: vggt
    area: scaling-the-signal
    role: bridge
    takeaway: VGGT predicts cameras, depth, and point maps for one to hundreds of views in a single feed-forward pass, replacing the pairwise matching and global alignment that multi-view geometry used to require.
    remark: It still leans on a frozen DINOv2 tokenizer for stable patch features, the same substrate the monocular depth models share, so the two tracks are already built from common parts.
  - id: depth-anything-3
    page: depth-anything-3
    area: scaling-the-signal
    role: frontier
    takeaway: Depth Anything 3 predicts one target, depth plus camera rays, from any number of views with or without known poses, so a single model covers both single-image depth and multi-view reconstruction.
    remark: Distilled from Depth Anything V2 as its teacher, it also surpasses V2 on plain monocular depth and outperforms VGGT on multi-view geometry, at which point the two problems are one model apart only in how many images you hand it.
  - id: q-ground-truth
    question: When the labels are synthetic and the teacher is another model, not a sensor, what does ground truth depth still mean?
    area: scaling-the-signal
edges:
  - from: monocular-depth-estimation
    to: midas
    type: prerequisite
  - from: midas
    to: depth-anything
    type: evolution
    label: scales the loss
  - from: dinov2
    to: depth-anything
    type: evolution
    label: supplies encoder
  - from: dinov2
    to: vggt
    type: evolution
  - from: depth-anything
    to: depth-anything-v2
    type: evolution
    label: fixes label noise
  - from: depth-anything-v2
    to: depth-anything-3
    type: evolution
    label: unifies with views
  - from: vggt
    to: depth-anything-3
    type: evolution
    label: surpassed
  - from: depth-anything-3
    to: q-ground-truth
    type: bridge
lenses:
  - id: overview
    title: Overview
    coords:
      monocular-depth-estimation:
        - 0
        - 1
      midas:
        - 1.6
        - 1
      dinov2:
        - 4
        - 2
      depth-anything:
        - 5.6
        - 3
      depth-anything-v2:
        - 7.2
        - 3
      vggt:
        - 8.6
        - 3
      depth-anything-3:
        - 10
        - 3
      q-ground-truth:
        - 11.4
        - 3
steps:
  - title: The ambiguity that never left
    anchor: the-ambiguity-that-never-left
    claim: "Monocular depth is ill-posed: infinite world scales produce the same image, so any single-image depth model must either give up metric scale or add outside information: MiDaS chose to give it up, and built a loss that made five incompatible datasets trainable together instead."
    focus:
      - monocular-depth-estimation
      - midas
  - title: Borrowed features
    anchor: borrowed-features
    claim: DINOv2 was built for image recognition, not depth, yet its frozen features turn out to encode enough scene geometry that every depth and multi-view model in this story later borrows it wholesale instead of training its own encoder.
    focus:
      - dinov2
  - title: Data breadth as training signal
    anchor: data-breadth-as-signal
    claim: "Depth Anything shows the bottleneck was never the network: pseudo-labeling 62 million unlabeled images with a CutMix challenge against trivial copying gives a 40 percent error drop over MiDaS on the same backbone, on data alone."
    focus:
      - depth-anything
  - title: Synthetic teachers beat real labels
    anchor: synthetic-teachers
    claim: Depth Anything V2 removes real labeled images entirely from teacher training, using only synthetic scenes with exact ground truth, and its resulting pseudo-labels beat human-annotated real labels on every measured metric.
    focus:
      - depth-anything-v2
  - title: Depth and multi-view geometry converge
    anchor: geometry-converges
    claim: Depth Anything 3 predicts one target, depth plus camera rays, and reaches this with a single set of weights whether it is given one image or hundreds, at which point it also beats VGGT, the dedicated multi-view model, on multi-view geometry itself.
    focus:
      - vggt
      - depth-anything-3
      - q-ground-truth
---

## The Ambiguity That Never Left

A single image fixes scene geometry only up to degrees of freedom no photometric analysis can resolve. [Monocular Depth Estimation](/atlas/monocular-depth-estimation) states the problem precisely: infinitely many world-scale configurations produce identical pixel values, so no model recovers absolute distance from a photograph alone without camera intrinsics, a physical scale reference, or metric supervision during fine-tuning. Practical systems split into two regimes: relative depth, defined only up to an unknown per-image scale and shift, and metric depth, which carries absolute scale and needs information the image itself does not contain.

[MiDaS](/atlas/midas) commits to the relative regime and turns the concession into a training strategy. It mixes five mutually incompatible datasets, LiDAR-derived metric depth, unknown-baseline stereo disparity, and scale-only structure-from-motion depth, under a scale-and-shift-invariant loss that aligns each prediction to its own ground truth by least squares, then trims the twenty percent largest residuals so annotation outliers never enter back-propagation. A Pareto-optimal criterion governs the mixing, and the resulting model transfers zero-shot to datasets held out entirely from training.

What the loss does not touch is the network carrying it: an encoder pretrained on web images for classification, not depth, and simply the best one available in 2019. Scaling the loss further is one problem; scaling the features underneath it is another, and that is where the story turns next.

## Borrowed Features

[DINOv2](/atlas/dinov2) was built to solve a different problem than depth: general-purpose visual representation. It trains a Vision Transformer through self-supervised distillation on a corpus assembled automatically, with no human annotation anywhere in the pipeline, selecting 142 million images for diversity and domain coverage. The resulting backbone is used frozen at evaluation time, with no finetuning and no task-specific pretraining. Its features match or exceed text-supervised models on classification and retrieval, and decisively outperform them on dense tasks such as semantic segmentation and monocular depth.

That last property turns DINOv2 into shared infrastructure rather than a one-off encoder. Depth Anything initialises its encoder directly from DINOv2 checkpoints. Depth Anything V2's synthetic-only teacher is itself built on the same backbone at its largest scale. Depth Anything 3 and VGGT both patchify their input through a frozen DINOv2 tokenizer rather than training one from scratch. None was designed around DINOv2's original classification objective; each simply adopts the frozen backbone.

What DINOv2 supplies is a substrate, not an answer. Its features encode enough scene geometry to be useful for depth, but nothing in a self-supervised run on unlabeled images teaches a network to produce a depth map. That training signal, and how far it can be pushed, is the next constraint.

## Data Breadth as Signal

[Depth Anything](/atlas/depth-anything) keeps MiDaS's loss and DINOv2's encoder fixed and changes only how much data trains the network built on top of them. A teacher trained on six labeled datasets totalling 1.5 million images pseudo-labels 62 million unlabeled images from eight public corpora; a student then trains on labeled and pseudo-labeled data together. Two refinements stop the student from simply copying the teacher. Its inputs are strongly perturbed, including CutMix blending of two unlabeled images at fifty percent probability, forcing it to resolve boundaries neither source image shows on its own: without this step, mean error across evaluation domains does not improve at all with the extra data; the CutMix challenge brings it down measurably, and a further loss aligning student and frozen-encoder features, active only where the two disagree, lowers it again.

The payoff shows on the same backbone MiDaS used: relative-depth error on KITTI drops from 0.127 to 0.076, a forty percent reduction, with no change to the network. Data breadth, not a new model, produced the gain.

The teacher generating all sixty-two million pseudo-labels is itself trained on real sensor, stereo, and structure-from-motion annotations, the kind that carries systematic noise on transparent objects, repetitive textures, and dynamic regions. Scaling the data engine also scales whatever the teacher gets wrong.

## Synthetic Teachers

[Depth Anything V2](/atlas/depth-anything-v2) locates the remaining error in the labels themselves, not the network or the data volume. Sensors fail on transparent glass, stereo matching fails on repetitive textures, and structure-from-motion is unstable around dynamic objects, so a teacher trained on any of these real annotations inherits their mistakes before a single pseudo-label leaves it. V2 removes real images from teacher training entirely: the teacher trains exclusively on synthetic images from five rendered datasets, where every thin structure and reflective surface carries exact, renderer-generated ground truth. Among every backbone family tested for this synthetic-only stage, only the largest DINOv2 variant achieves a satisfying transfer to real-world inference; the rest fail outright.

That synthetic-trained teacher then pseudo-labels the same real unlabeled images Depth Anything used, and the resulting labels beat manual annotation on every measured metric. Ground truth, in this pipeline, is now a model's synthetic-trained output rather than a sensor reading or a human label.

Every model in this lineage, from MiDaS through V2, still takes exactly one image and returns exactly one depth map. How several views of the same scene relate to each other is left to different models entirely, with different training pipelines of their own.

## Geometry Converges

[VGGT](/atlas/vggt) is one such separate pipeline, built for multi-view geometry. It takes a sequence of images ranging from one to hundreds and, in a single forward pass, returns per-frame cameras, depth maps, and point maps in one shared coordinate frame, eliminating the pairwise matching and global alignment earlier methods required. Its patch tokens come from a frozen DINOv2 encoder, the same substrate the monocular depth models share.

[Depth Anything 3](/atlas/depth-anything-3) closes the remaining gap: instead of a depth map alone, it predicts depth plus a per-pixel camera ray map, one target from which a 3D point and, via a lightweight head, a camera pose can both be recovered. The same DINOv2 backbone handles any view count, monocular to thousands of images, through an input-adaptive attention rearrangement, with or without known poses, from one set of weights. Distilled from a Depth Anything V2 teacher, it surpasses that teacher across five depth benchmarks, and on multi-view geometry surpasses VGGT itself, by 44.3 percent in camera pose accuracy and 25.1 percent in geometric accuracy.

The same architecture now handles the single-image case and the any-view case with identical weights, dissolving a boundary that once separated two model families. Across five models the architecture never changed, only the target, the data, or the teacher supplying the label. When the labels are synthetic and the teacher is another model, not a sensor, what does ground truth depth still mean?
