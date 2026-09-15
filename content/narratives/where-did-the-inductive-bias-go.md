---
title: Where Did the Inductive Bias Go?
summary: How the assumptions that make vision work migrated from the algorithm (Canny, SIFT, HOG) into the architecture (the convolutional network and its scaling lineage) and then into the data and the training objective (ViT, MAE, DINOv2), and why it matters who now gets to change them.
tagline: The assumptions never left. They moved.
tags:
  - deep-learning
  - classical
  - foundation-models
  - representation
date: 2026-09-15
author: Vitaly Vorobyev
walkthrough: focus
areas:
  - id: algorithm
    label: Bias in the Algorithm
  - id: architecture
    label: Bias in the Architecture
  - id: objective
    label: Bias in the Objective
  - id: tasks
    label: Task Systems
nodes:
  - id: canny-edge-detector
    page: canny-edge-detector
    area: algorithm
    role: origin
    takeaway: Canny does not detect edges with a learned rule. The edge model, a Gaussian derivative shaped by an explicit noise and detection tradeoff argument, is the filter itself.
    remark: "Detection and localisation trade off through one parameter, sigma, and the tradeoff is provably unbeatable within this model: no choice of sigma improves both at once."
  - id: sift
    page: sift
    area: algorithm
    role: milestone
    takeaway: "SIFT's invariances are handcrafted into the pipeline: a scale space pyramid supplies scale invariance, a dominant orientation histogram supplies rotation invariance, before any weight is learned."
    remark: The descriptor still needs no training data at all. Everything it treats as stable, a blob at a scale, a gradient histogram, was decided by the authors, not learned from images.
  - id: hog-descriptor
    page: hog-descriptor
    area: algorithm
    role: milestone
    takeaway: "HOG keeps SIFT's idea of local gradient histograms and drops the invariances SIFT worked hardest for: no scale space, no rotation normalization, just dense unsigned gradients on a fixed window."
    remark: Removing prior smoothing and keeping block normalization were not stylistic choices; the paper's own ablations show each one is load bearing for pedestrian detection accuracy.
  - id: convolutional-neural-network
    page: convolutional-neural-network
    area: architecture
    role: bridge
    takeaway: "The convolutional network moves the bias out of hand designed filters and into the architecture itself: local connectivity and weight sharing assume a pattern useful in one place is useful everywhere."
    remark: Nobody designs the filters by hand anymore. What gets designed instead is the constraint the filters must obey, locality and sharing, and training fills in the numbers.
  - id: alexnet
    page: alexnet
    area: architecture
    role: milestone
    takeaway: AlexNet does not introduce a new prior; it proves the convolutional one, trained end to end on GPUs, beats every hand engineered pipeline that came before it by a wide margin.
    remark: "Removing any single middle layer costs about two percent accuracy: the architecture's assumptions are load bearing all the way through, not decorative."
  - id: vgg
    page: vgg
    area: architecture
    role: milestone
    takeaway: VGG keeps AlexNet's architectural bias and varies only depth, showing that stacking small three by three convolutions systematically improves accuracy from eleven to sixteen layers.
    remark: "The same convolutional prior, just applied more times: no new assumption is introduced, which is exactly the point of a controlled scaling experiment."
  - id: resnet
    page: resnet
    area: architecture
    role: milestone
    takeaway: "Depth alone eventually breaks the convolutional recipe: plain stacks degrade past a point unrelated to vanishing gradients. Identity shortcuts remove that ceiling without touching the underlying prior."
    remark: The shortcut does not change what the architecture assumes about images; it changes what is learnable given that assumption, and that turns out to be the harder problem.
  - id: vit
    page: vit
    area: architecture
    role: bridge
    takeaway: "ViT deletes the architectural prior outright: no convolution, no locality, no weight sharing across space, only patches and attention. The bias does not disappear, it becomes a bet on scale."
    remark: Below roughly a hundred million pretraining images the bet loses to ResNet; above it, the lack of a built in assumption stops being a handicap and starts being room to grow.
  - id: mae
    page: mae
    area: objective
    role: milestone
    takeaway: "MAE puts the bias in the training objective instead of the architecture: predict the roughly seventy five percent of an image that is hidden from the fraction that is shown."
    remark: The masking ratio is not a hyperparameter tuned for speed; at seventy five percent it is the single biggest lever on how useful the resulting features turn out to be.
  - id: dinov2
    page: dinov2
    area: objective
    role: milestone
    takeaway: DINOv2 chooses a different objective again, matching a student network's output to a teacher's rather than reconstructing pixels, and gets features that work frozen with no fine-tuning at all.
    remark: "The choice of objective now decides the product: reconstruction gives features good for fine-tuning, self-distillation gives features good for reuse exactly as they are."
  - id: sam
    page: sam
    area: tasks
    role: frontier
    takeaway: "SAM is a task system built on someone else's bias: a masked-autoencoder-pretrained encoder plus a lightweight decoder, with almost nothing in its own architecture that assumes anything about images."
    remark: The hard part, the assumption about what an image is, already happened during pretraining. SAM's own job is just to prompt it well.
  - id: vggt
    page: vggt
    area: tasks
    role: frontier
    takeaway: "VGGT goes further still: a frozen, self-distilled encoder supplies the visual tokens, and one feed-forward pass replaces the optimization loop earlier reconstruction pipelines needed."
    remark: There is no per-scene fitting left, and very little architectural assumption either; nearly everything useful was already decided upstream, during pretraining.
  - id: q-who-chooses-bias
    question: Once the inductive bias lives in training data and objective choice instead of a filter you can read, who actually chooses it, and how would anyone recognize the choice as wrong?
    area: tasks
edges:
  - from: canny-edge-detector
    to: sift
    type: bridge
    label: gradient lineage
  - from: sift
    to: hog-descriptor
    type: bridge
    label: shared histogram idea
  - from: sift
    to: alexnet
    type: bridge
    label: pipeline displaced
  - from: convolutional-neural-network
    to: alexnet
    type: prerequisite
  - from: alexnet
    to: vgg
    type: evolution
    label: deeper stack
  - from: vgg
    to: resnet
    type: evolution
    label: shortcut fix
  - from: convolutional-neural-network
    to: vit
    type: prerequisite
  - from: resnet
    to: vit
    type: contrast
    label: prior versus scale
  - from: vit
    to: mae
    type: evolution
    label: masked pretraining
  - from: vit
    to: sam
    type: evolution
    label: encoder reuse
  - from: mae
    to: sam
    type: evolution
    label: pretrained weights
  - from: mae
    to: dinov2
    type: contrast
    label: reconstruct or distill
  - from: dinov2
    to: vggt
    type: evolution
    label: frozen tokenizer
  - from: vit
    to: vggt
    type: prerequisite
lenses:
  - id: overview
    title: Overview
    coords:
      canny-edge-detector:
        - 0
        - 0
      sift:
        - 2
        - 0
      hog-descriptor:
        - 3.4
        - 0
      convolutional-neural-network:
        - 4.4
        - 1
      alexnet:
        - 5.8
        - 1
      vgg:
        - 7.2
        - 1
      resnet:
        - 8.6
        - 1
      vit:
        - 10.4
        - 1
      mae:
        - 11.4
        - 2
      dinov2:
        - 12.8
        - 2
      sam:
        - 11.8
        - 3
      vggt:
        - 13.2
        - 3
      q-who-chooses-bias:
        - 14.6
        - 3
  - id: classifier-lineage
    title: Classifier Lineage
    coords:
      convolutional-neural-network:
        - 0
        - 0
      alexnet:
        - 1.4
        - 0
      vgg:
        - 2.8
        - 0
      resnet:
        - 4.2
        - 0
      vit:
        - 6
        - 0
      mae:
        - 7.4
        - 0
      dinov2:
        - 8.8
        - 0
  - id: bias-migration
    title: Bias Migration
    coords:
      canny-edge-detector:
        - 0
        - 0
      sift:
        - 2
        - 0
      hog-descriptor:
        - 3.4
        - 0
      convolutional-neural-network:
        - 4.4
        - 1
      vit:
        - 6
        - 1
      mae:
        - 7.4
        - 1
      dinov2:
        - 8.8
        - 1
      sam:
        - 10.2
        - 1
      vggt:
        - 11.6
        - 1
      q-who-chooses-bias:
        - 13
        - 1
steps:
  - title: The Bias Starts in the Filter
    anchor: bias-in-the-filter
    claim: Canny does not guess a filter; he derives one from three explicit criteria, detection, localisation and a single response per edge, under one noise model, and then adopts the Gaussian derivative as a separable approximation to that optimum. Changing the assumption means rederiving the filter, not retuning a threshold.
    focus:
      - canny-edge-detector
  - title: The Bias Moves Into the Descriptor
    anchor: bias-in-the-descriptor
    claim: SIFT hand-designs scale and rotation invariance into a keypoint pipeline; HOG then drops both invariances on purpose, keeping only oriented-gradient histograms, because pedestrian detection needs speed and density more than SIFT's generality.
    focus:
      - sift
      - hog-descriptor
  - title: The Bias Becomes an Architecture
    anchor: bias-becomes-architecture
    claim: Convolutional weight sharing and local connectivity encode the same translation assumption SIFT and HOG encoded by hand, and AlexNet is the first system to prove that assumption, trained end to end, beats every handcrafted pipeline at scale.
    focus:
      - convolutional-neural-network
      - alexnet
  - title: A Decade of Scaling One Prior
    anchor: scaling-one-prior
    claim: VGG and ResNet leave the convolutional assumption untouched; VGG scales its depth and ResNet removes the depth ceiling that plain convolutional stacks hit, so a decade of headline progress runs on one unchanged architectural bet.
    focus:
      - vgg
      - resnet
  - title: The Prior Moves Into the Objective
    anchor: prior-moves-to-objective
    claim: ViT removes the convolutional assumption and only wins once pretraining data is large enough; MAE and DINOv2 then relocate the remaining bias into what the network is trained to predict, masked pixels or a teacher's output, rather than into its wiring.
    focus:
      - vit
      - mae
      - dinov2
  - title: Task Systems Inherit the Choice
    anchor: task-systems-inherit
    claim: SAM and VGGT build working systems, promptable segmentation and single-pass 3D reconstruction, on encoders whose defining assumptions were already fixed during someone else's pretraining, which raises the question of who is actually deciding what these systems assume.
    focus:
      - sam
      - vggt
      - q-who-chooses-bias
---

## Bias in the Filter

Canny frames edge detection as an optimization problem, not a guess at a plausible filter shape. Three explicit criteria pin down the solution: a detection signal-to-noise ratio, a localisation precision, and a constraint on the spacing between adjacent noise-driven responses that keeps a single edge from producing multiple detections. Under an additive white Gaussian noise model for a step edge, these three criteria fix one filter shape up to a spatial scale factor. Changing the assumption about the noise or the edge profile means rederiving the optimum, not adjusting a threshold.

The first derivative of a Gaussian is adopted as the working filter, chosen for its separability into two one-dimensional convolutions rather than for exact optimality: it reaches roughly 20% below the criteria's optimal detection-localisation product. Detection and localisation trade off through the single smoothing parameter sigma, and the tradeoff is provably unbeatable within this model: no choice of sigma improves both at once. [Canny Edge Detector](/atlas/canny-edge-detector) states the bias plainly, inside the filter's own derivation, for one edge type under one noise model. It says nothing about what happens when the same scene is viewed at a different scale or rotation, the two invariances the next generation of hand-designed methods has to add explicitly.

## Bias in the Descriptor

[SIFT](/atlas/sift) inherits Canny's reliance on gradients but adds two invariances by explicit construction rather than derivation from a noise model. Scale invariance comes from searching for extrema across a Difference-of-Gaussian pyramid built over multiple octaves; rotation invariance comes from assigning each keypoint the dominant peak of a local gradient-orientation histogram and sampling the descriptor in that rotated frame. Every one of these choices, the pyramid, the histogram peak, the 128-dimensional gradient layout, is fixed by the paper's authors before a single weight is trained.

[HOG](/atlas/hog-descriptor) keeps the local gradient-orientation histogram and removes both invariances SIFT built. There is no scale-space search and no per-window rotation normalisation, just a dense grid of 8×8-pixel cells with unsigned orientation bins on a single fixed detection window. The choice is not stylistic: prior Gaussian smoothing before the gradient step, which SIFT effectively performs through its scale space, cuts pedestrian-detection recall from 89% to 80% at a fixed false-positive rate, and removing block normalisation costs a comparable margin. Density and speed on a fixed window matter more to HOG's target than the generality SIFT was built for. Both descriptors still commit their invariances, or the deliberate absence of them, at design time, separate from the classifier that consumes the vector. The next generation of methods drops that separation and folds the assumption into the layer that produces the features.

## Bias Becomes Architecture

Convolution encodes the same assumption SIFT and HOG hand-built: a pattern useful in one part of an image is useful everywhere. Weight sharing convolves a single learned kernel across every spatial position, and local connectivity restricts each unit's input to a small neighbourhood rather than the whole feature map; the two constraints, not any single filter, are what the designer now specifies, and training fills in the numbers left free. [Convolutional Neural Network](/atlas/convolutional-neural-network) states this explicitly: the priors cut free parameters by orders of magnitude relative to a fully connected network and encode the translation symmetry that SIFT and HOG each encoded by hand.

[AlexNet](/atlas/alexnet) is the proof the bet pays off at scale. Trained end to end on two GPUs across roughly 1.2 million labelled images, its eight learned layers reach a top-5 error of 15.3% on ILSVRC-2012, against 26.2% for the second-place entry, and 37.5%/17.0% top-1/top-5 on ILSVRC-2010 against a prior best of 45.7%/25.7% from a SIFT-and-Fisher-Vector pipeline. That margin displaces the hand-engineered pipelines the previous chapter described. The architecture is not decorative: removing any single middle convolutional layer costs about 2% top-1 accuracy, so every constraint it imposes is load-bearing. What it does not yet answer is how far the same convolutional bet can be pushed before its benefits stop compounding with depth.

## Scaling One Prior

[VGG](/atlas/vgg) answers with a controlled experiment: hold the convolutional assumption fixed, change only depth. Every configuration uses exclusively 3×3 convolutions; the family spans eleven to nineteen weight layers, and top-5 error decreases systematically across that range before saturating at the deepest configuration. No new assumption enters the design, which is exactly what makes the depth ablation informative: the gain is attributable to depth alone.

Depth eventually breaks the recipe on its own terms. A 34-layer plain convolutional network reaches a higher validation error than an 18-layer one, 28.54% against 27.94% top-1, a degradation distinct from vanishing gradients since batch-normalised plain networks still show healthy gradients while getting worse. [ResNet](/atlas/resnet) removes that ceiling with an identity shortcut, $y = \mathcal{F}(x, \{W_i\}) + x$, that lets a block default to passing its input through unchanged rather than having to learn the identity mapping from nonlinear layers. The shortcut does not touch what the network assumes about images; it only changes what depth is learnable given that assumption, enabling systematic scaling from AlexNet's eight layers and VGG's nineteen to a hundred and fifty-two. A decade of headline progress on ImageNet ran on one architectural bet made steadily more trainable. The bet itself, that locality and shared weights are the right prior for any image, was never the thing under test.

## Prior Moves to Objective

[ViT](/atlas/vit) is the test. It deletes the convolutional prior outright, replacing stacked local kernels with fixed-size patches fed to a standard transformer encoder with no built-in locality and no weight sharing across space. The bias does not vanish; it becomes a bet on pretraining scale: on ImageNet-1k alone the pure transformer loses to convolutional backbones with their built-in spatial inductive bias, and only wins decisively once pretraining data crosses roughly a hundred million images. Below that crossover the missing assumption is a handicap; above it, the absence of a built-in constraint becomes room to keep improving.

[MAE](/atlas/mae) and [DINOv2](/atlas/dinov2) relocate the remaining bias again, out of the architecture and into the training objective. MAE masks a large majority of an image's patches, roughly three-quarters, chosen by uniform random sampling, and trains the network to predict them from the small visible remainder; the masking ratio turns out to be the single largest lever on how useful the resulting features are, not a knob tuned only for speed. DINOv2 chooses a different objective again: a student network's output is trained to match a slower-moving teacher's, with no pixel reconstruction at all, and the resulting features work directly, frozen, on dense tasks that MAE's reconstruction objective supports only after full fine-tuning. Two networks with near-identical patch-based architectures now differ almost entirely in what they were trained to predict, not in how they are wired.

## Task Systems Inherit

[SAM](/atlas/sam) and [VGGT](/atlas/vggt) build working systems on top of that choice rather than making it themselves. SAM's image encoder is an MAE-pretrained ViT-H, resized so the longest side is 1024 pixels and patchified into a 64×64 token grid; SAM's own contribution is a lightweight prompt encoder and a fast two-way cross-attention decoder trained on 1.1 billion masks, not a new assumption about what an image is. Almost nothing in SAM's own architecture encodes a prior about images; the assumption that makes the encoder useful was already fixed during someone else's pretraining.

VGGT goes further still. Each input image is patchified by a frozen DINOv2 encoder, and a transformer backbone that alternates frame-wise and cross-frame self-attention processes every view at once, replacing the pairwise reconstruction and global-alignment optimisation earlier feed-forward geometry pipelines needed. There is no per-scene optimisation loop left, and little architectural assumption left either. What the model treats as a plausible surface or camera motion was decided upstream, during DINOv2's training objective, not VGGT's own design.

The two systems make concrete the migration this chain has traced: the assumption that once sat in a hand-derived filter, then a descriptor, then a convolutional layer, now sits inside a training objective chosen once and reused downstream. Once the inductive bias lives in training data and objective choice instead of a filter you can read, who actually chooses it, and how would anyone recognize the choice as wrong?
